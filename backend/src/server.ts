import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

import {
  createUser,
  getUser,
  isUsernameTaken,
  setUserOffline,
  removeUserFromRoom,
  getUserRooms,
  addUserToRoom,
  getOnlineUsers,
  getUserPublicInfo,
  cleanupInactiveUsers,
  type User,
} from './users.js';

import {
  createRoom,
  getRoom,
  isRoomNameTaken,
  addParticipant,
  removeParticipant,
  getRoomParticipants,
  getAllRoomsPublicInfo,
  getRoomPublicInfo,
  isUserInRoom,
  isRoomExpired,
  removeExpiredRooms,
} from './rooms.js';

import {
  validatePayload,
  connectPayloadSchema,
  joinRoomPayloadSchema,
  createRoomPayloadSchema,
  sendMessagePayloadSchema,
  typingPayloadSchema,
  webSocketMessageSchema,
  sanitizeUsername,
  sanitizeRoomName,
} from './validation.js';

import { checkRateLimit, cleanupBuckets } from './rateLimit.js';

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 60000; // 60 seconds

// Create Express app for health checks
const app = express();
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: wss.clients.size,
  });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store socket to user ID mapping
const socketToUser = new Map<WebSocket, string>();

// Heartbeat tracking
const heartbeats = new Map<WebSocket, boolean>();

/**
 * Send message to a specific socket
 */
function send(socket: WebSocket, type: string, payload: unknown): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({
        type,
        payload,
        timestamp: Date.now(),
      })
    );
  }
}

/**
 * Broadcast message to all participants in a room
 */
function broadcastToRoom(
  roomId: string,
  type: string,
  payload: unknown,
  excludeUserId?: string
): void {
  const participantIds = getRoomParticipants(roomId);

  for (const participantId of participantIds) {
    if (participantId === excludeUserId) continue;

    const user = getUser(participantId);
    if (user && user.isOnline) {
      send(user.socket, type, payload);
    }
  }
}

/**
 * Broadcast message to all connected clients
 */
function broadcastToAll(
  type: string,
  payload: unknown,
  excludeUserId?: string
): void {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    const userId = socketToUser.get(client);
    if (userId && userId !== excludeUserId) {
      send(client, type, payload);
    }
  }
}

/**
 * Handle user connection
 */
function handleConnect(
  socket: WebSocket,
  payload: unknown
): void {
  const validation = validatePayload(connectPayloadSchema, payload);
  if (!validation.success) {
    send(socket, 'error', { code: 'INVALID_PAYLOAD', message: validation.error });
    return;
  }

  const { username, publicKey, fingerprint } = validation.data;
  const sanitizedUsername = sanitizeUsername(username);

  // Check rate limit
  const rateLimitKey = socket.url || 'unknown';
  const rateLimit = checkRateLimit(rateLimitKey, 'connection');
  if (!rateLimit.allowed) {
    send(socket, 'error', {
      code: 'RATE_LIMITED',
      message: 'Too many connection attempts. Please try again later.',
    });
    return;
  }

  // Check if username is taken
  if (isUsernameTaken(sanitizedUsername)) {
    send(socket, 'error', {
      code: 'USERNAME_TAKEN',
      message: 'This username is already taken.',
    });
    return;
  }

  // Create user
  const userId = uuidv4();
  const user = createUser(userId, sanitizedUsername, publicKey, fingerprint, socket);

  // Store socket mapping
  socketToUser.set(socket, userId);

  // Send success response
  send(socket, 'connected', {
    userId,
    username: sanitizedUsername,
    fingerprint,
    rooms: getAllRoomsPublicInfo(),
  });

  // Broadcast user joined to all
  broadcastToAll('user_online', {
    user: getUserPublicInfo(user),
  }, userId);

  console.log(`User connected: ${sanitizedUsername} (${userId})`);
}

/**
 * Handle room creation
 */
function handleCreateRoom(
  socket: WebSocket,
  userId: string,
  payload: unknown
): void {
  const validation = validatePayload(createRoomPayloadSchema, payload);
  if (!validation.success) {
    send(socket, 'error', { code: 'INVALID_PAYLOAD', message: validation.error });
    return;
  }

  // Check rate limit
  const rateLimit = checkRateLimit(userId, 'room_create');
  if (!rateLimit.allowed) {
    send(socket, 'error', {
      code: 'RATE_LIMITED',
      message: 'Too many room creation attempts. Please try again later.',
    });
    return;
  }

  const { roomName } = validation.data;
  const expiresInMinutes = validation.data.expiresInMinutes;
  const sanitizedRoomName = sanitizeRoomName(roomName);

  // Check if room name is taken
  if (isRoomNameTaken(sanitizedRoomName)) {
    send(socket, 'error', {
      code: 'ROOM_EXISTS',
      message: 'A room with this name already exists.',
    });
    return;
  }

  // Create room
  const roomId = uuidv4();
  const room = createRoom(roomId, sanitizedRoomName, userId, expiresInMinutes);

  // Add creator as participant
  addParticipant(roomId, userId);
  addUserToRoom(userId, roomId);

  const user = getUser(userId);

  // Send success response
  send(socket, 'room_created', {
    room: getRoomPublicInfo(room),
  });

  // Broadcast new room to all users
  broadcastToAll('room_list_updated', {
    rooms: getAllRoomsPublicInfo(),
  });

  console.log(`Room created: ${sanitizedRoomName} by ${user?.username}`);
}

/**
 * Handle joining a room
 */
function handleJoinRoom(
  socket: WebSocket,
  userId: string,
  payload: unknown
): void {
  const validation = validatePayload(joinRoomPayloadSchema, payload);
  if (!validation.success) {
    send(socket, 'error', { code: 'INVALID_PAYLOAD', message: validation.error });
    return;
  }

  const { roomId } = validation.data;
  const room = getRoom(roomId);

  if (!room) {
    send(socket, 'error', {
      code: 'ROOM_NOT_FOUND',
      message: 'Room not found.',
    });
    return;
  }

  // Reject joins to expired rooms
  if (isRoomExpired(room)) {
    // Remove expired rooms and clean user references
    const expiredRooms = removeExpiredRooms();
    expiredRooms.forEach(({ roomId: expiredId, participantIds }) => {
      participantIds.forEach((participantId) => removeUserFromRoom(participantId, expiredId));
    });

    broadcastToAll('room_list_updated', {
      rooms: getAllRoomsPublicInfo(),
    });

    send(socket, 'error', {
      code: 'ROOM_EXPIRED',
      message: 'This room has expired.',
    });
    return;
  }

  // Check if already in room
  if (isUserInRoom(roomId, userId)) {
    send(socket, 'error', {
      code: 'ALREADY_IN_ROOM',
      message: 'You are already in this room.',
    });
    return;
  }

  // Add user to room
  addParticipant(roomId, userId);
  addUserToRoom(userId, roomId);

  const user = getUser(userId);

  // Send room info to joining user
  send(socket, 'room_joined', {
    room: getRoomPublicInfo(room),
  });

  // Broadcast to other room participants
  if (user) {
    broadcastToRoom(roomId, 'user_joined_room', {
      roomId,
      user: getUserPublicInfo(user),
    }, userId);
  }

  console.log(`User ${user?.username} joined room ${room.name}`);
}

/**
 * Handle leaving a room
 */
function handleLeaveRoom(
  socket: WebSocket,
  userId: string,
  payload: unknown
): void {
  const validation = validatePayload(joinRoomPayloadSchema, payload);
  if (!validation.success) {
    send(socket, 'error', { code: 'INVALID_PAYLOAD', message: validation.error });
    return;
  }

  const { roomId } = validation.data;
  const room = getRoom(roomId);
  const user = getUser(userId);

  if (!room || !user) {
    send(socket, 'error', {
      code: 'ROOM_NOT_FOUND',
      message: 'Room not found.',
    });
    return;
  }

  // Remove user from room
  removeParticipant(roomId, userId);
  removeUserFromRoom(userId, roomId);

  // Notify user
  send(socket, 'room_left', { roomId });

  // Broadcast to other room participants
  broadcastToRoom(roomId, 'user_left_room', {
    roomId,
    userId,
    username: user.username,
  });

  console.log(`User ${user.username} left room ${room.name}`);
}

/**
 * Handle message sending
 */
function handleMessage(
  socket: WebSocket,
  userId: string,
  payload: unknown
): void {
  const validation = validatePayload(sendMessagePayloadSchema, payload);
  if (!validation.success) {
    send(socket, 'error', { code: 'INVALID_PAYLOAD', message: validation.error });
    return;
  }

  // Check rate limit
  const rateLimit = checkRateLimit(userId, 'message');
  if (!rateLimit.allowed) {
    send(socket, 'error', {
      code: 'RATE_LIMITED',
      message: 'You are sending messages too quickly. Please slow down.',
    });
    return;
  }

  const { roomId, encryptedContent, encryptedKeys, iv, type } = validation.data;
  const room = getRoom(roomId);
  const user = getUser(userId);

  if (!room || !user) {
    send(socket, 'error', {
      code: 'ROOM_NOT_FOUND',
      message: 'Room not found.',
    });
    return;
  }

  // Block messages to expired rooms
  if (isRoomExpired(room)) {
    send(socket, 'error', {
      code: 'ROOM_EXPIRED',
      message: 'This room has expired.',
    });

    // Cleanup expired room state for participants
    const expiredRooms = removeExpiredRooms();
    expiredRooms.forEach(({ roomId: expiredId, participantIds }) => {
      participantIds.forEach((participantId) => removeUserFromRoom(participantId, expiredId));
    });

    broadcastToAll('room_list_updated', {
      rooms: getAllRoomsPublicInfo(),
    });
    return;
  }

  // Check if user is in room
  if (!isUserInRoom(roomId, userId)) {
    send(socket, 'error', {
      code: 'NOT_IN_ROOM',
      message: 'You are not in this room.',
    });
    return;
  }

  // Create message object
  const messageId = uuidv4();
  const message = {
    id: messageId,
    roomId,
    senderId: userId,
    senderUsername: user.username,
    senderFingerprint: user.fingerprint,
    encryptedContent,
    encryptedKeys,
    iv,
    type,
    timestamp: Date.now(),
  };

  // Broadcast message to all room participants (including sender for confirmation)
  broadcastToRoom(roomId, 'message', message);

  console.log(`Message sent in room ${room.name} by ${user.username}`);
}

/**
 * Handle typing indicator
 */
function handleTyping(
  socket: WebSocket,
  userId: string,
  payload: unknown
): void {
  const validation = validatePayload(typingPayloadSchema, payload);
  if (!validation.success) {
    return; // Silently ignore invalid typing payloads
  }

  // Check rate limit
  const rateLimit = checkRateLimit(userId, 'typing');
  if (!rateLimit.allowed) {
    return; // Silently ignore rate-limited typing events
  }

  const { roomId, isTyping } = validation.data;
  const user = getUser(userId);

  if (!user || !isUserInRoom(roomId, userId)) {
    return;
  }

  // Broadcast typing status to other room participants
  broadcastToRoom(roomId, 'typing', {
    roomId,
    userId,
    username: user.username,
    isTyping,
  }, userId);
}

/**
 * Handle user disconnection
 */
function handleDisconnect(socket: WebSocket): void {
  const userId = socketToUser.get(socket);
  if (!userId) return;

  const user = getUser(userId);
  if (!user) return;

  // Get user's rooms before cleanup
  const userRooms = getUserRooms(userId);

  // Remove user from all rooms
  for (const roomId of userRooms) {
    removeParticipant(roomId, userId);
    
    // Notify room participants
    broadcastToRoom(roomId, 'user_left_room', {
      roomId,
      userId,
      username: user.username,
    });
  }

  // Mark user as offline
  setUserOffline(userId);

  // Remove socket mapping
  socketToUser.delete(socket);
  heartbeats.delete(socket);

  // Broadcast user offline
  broadcastToAll('user_offline', {
    userId,
    username: user.username,
  });

  console.log(`User disconnected: ${user.username}`);
}

/**
 * Handle WebSocket connection
 */
wss.on('connection', (socket: WebSocket) => {
  console.log('New connection established');

  // Initialize heartbeat
  heartbeats.set(socket, true);

  // Handle pong (heartbeat response)
  socket.on('pong', () => {
    heartbeats.set(socket, true);
  });

  // Handle messages
  socket.on('message', (data: Buffer) => {
    try {
      const rawMessage = JSON.parse(data.toString());
      
      // Validate message structure
      const messageValidation = validatePayload(webSocketMessageSchema, rawMessage);
      if (!messageValidation.success) {
        send(socket, 'error', {
          code: 'INVALID_MESSAGE',
          message: 'Invalid message format.',
        });
        return;
      }

      const { type, payload } = messageValidation.data;
      const userId = socketToUser.get(socket);

      // Handle different message types
      switch (type) {
        case 'connect':
          handleConnect(socket, payload);
          break;

        case 'create_room':
          if (!userId) {
            send(socket, 'error', { code: 'NOT_CONNECTED', message: 'Please connect first.' });
            return;
          }
          handleCreateRoom(socket, userId, payload);
          break;

        case 'join_room':
          if (!userId) {
            send(socket, 'error', { code: 'NOT_CONNECTED', message: 'Please connect first.' });
            return;
          }
          handleJoinRoom(socket, userId, payload);
          break;

        case 'leave_room':
          if (!userId) {
            send(socket, 'error', { code: 'NOT_CONNECTED', message: 'Please connect first.' });
            return;
          }
          handleLeaveRoom(socket, userId, payload);
          break;

        case 'message':
          if (!userId) {
            send(socket, 'error', { code: 'NOT_CONNECTED', message: 'Please connect first.' });
            return;
          }
          handleMessage(socket, userId, payload);
          break;

        case 'typing':
          if (!userId) return;
          handleTyping(socket, userId, payload);
          break;

        case 'ping':
          send(socket, 'pong', { timestamp: Date.now() });
          break;

        default:
          send(socket, 'error', { code: 'UNKNOWN_TYPE', message: 'Unknown message type.' });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      send(socket, 'error', {
        code: 'PARSE_ERROR',
        message: 'Failed to parse message.',
      });
    }
  });

  // Handle connection close
  socket.on('close', () => {
    handleDisconnect(socket);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
    handleDisconnect(socket);
  });
});

// Heartbeat interval to detect dead connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((socket) => {
    if (heartbeats.get(socket) === false) {
      // Connection is dead
      socket.terminate();
      return;
    }

    heartbeats.set(socket, false);
    socket.ping();
  });
}, HEARTBEAT_INTERVAL);

// Cleanup interval
const cleanupInterval = setInterval(() => {
  const removedUsers = cleanupInactiveUsers();
  const activeUserIds = new Set(socketToUser.values());
  const removedBuckets = cleanupBuckets(activeUserIds);
  const expiredRooms = removeExpiredRooms();

  if (expiredRooms.length > 0) {
    // Remove room references from users
    expiredRooms.forEach(({ roomId, participantIds, name }) => {
      participantIds.forEach((participantId) => removeUserFromRoom(participantId, roomId));
      console.log(`Room expired and removed: ${name} (${roomId})`);
    });

    broadcastToAll('room_list_updated', {
      rooms: getAllRoomsPublicInfo(),
    });
  }

  if (removedUsers > 0 || removedBuckets > 0) {
    console.log(`Cleanup: removed ${removedUsers} inactive users, ${removedBuckets} rate limit buckets`);
  }
}, 60000); // Every minute

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  
  clearInterval(heartbeatInterval);
  clearInterval(cleanupInterval);
  
  wss.close(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`CryptComm WebSocket server running on port ${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
});
