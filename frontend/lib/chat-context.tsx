"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type {
  User,
  Room,
  DecryptedMessage,
  EncryptedMessage,
  KeyPair,
  ExportedKeyPair,
  ConnectionStatus,
} from '@/types';
import { getWebSocketClient, WebSocketClient } from '@/lib/websocket';
import {
  initializeEncryption,
  encryptForRecipients,
  decryptFromSender,
  importPublicKey,
  shortenFingerprint,
} from '@/lib/encryption';

// State interface
interface ChatState {
  userId: string | null;
  username: string | null;
  fingerprint: string | null;
  shortFingerprint: string | null;
  keyPair: KeyPair | null;
  exportedKeyPair: ExportedKeyPair | null;
  connectionStatus: ConnectionStatus;
  currentRoom: Room | null;
  rooms: Room[];
  messages: Map<string, DecryptedMessage[]>;
  users: Map<string, User>;
  publicKeys: Map<string, CryptoKey>;
  typingUsers: Map<string, string[]>;
  error: string | null;
  isInitialized: boolean;
}

// Action types
type ChatAction =
  | { type: 'SET_USER'; payload: { userId: string; username: string; fingerprint: string } }
  | { type: 'SET_KEYS'; payload: { keyPair: KeyPair; exportedKeyPair: ExportedKeyPair; fingerprint: string } }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_ROOMS'; payload: Room[] }
  | { type: 'ADD_ROOM'; payload: Room }
  | { type: 'SET_CURRENT_ROOM'; payload: Room | null }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: Partial<User> & { id: string } }
  | { type: 'REMOVE_USER'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: { roomId: string; message: DecryptedMessage } }
  | { type: 'ADD_PUBLIC_KEY'; payload: { userId: string; publicKey: CryptoKey } }
  | { type: 'SET_TYPING'; payload: { roomId: string; userId: string; isTyping: boolean } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'RESET' };

// Initial state
const initialState: ChatState = {
  userId: null,
  username: null,
  fingerprint: null,
  shortFingerprint: null,
  keyPair: null,
  exportedKeyPair: null,
  connectionStatus: 'disconnected',
  currentRoom: null,
  rooms: [],
  messages: new Map(),
  users: new Map(),
  publicKeys: new Map(),
  typingUsers: new Map(),
  error: null,
  isInitialized: false,
};

// Reducer
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        userId: action.payload.userId,
        username: action.payload.username,
        fingerprint: action.payload.fingerprint,
        shortFingerprint: shortenFingerprint(action.payload.fingerprint),
      };

    case 'SET_KEYS':
      return {
        ...state,
        keyPair: action.payload.keyPair,
        exportedKeyPair: action.payload.exportedKeyPair,
        fingerprint: action.payload.fingerprint,
        shortFingerprint: shortenFingerprint(action.payload.fingerprint),
      };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'SET_ROOMS':
      return { ...state, rooms: action.payload };

    case 'ADD_ROOM': {
      const existingIndex = state.rooms.findIndex((r) => r.id === action.payload.id);
      if (existingIndex >= 0) {
        const newRooms = [...state.rooms];
        newRooms[existingIndex] = action.payload;
        return { ...state, rooms: newRooms };
      }
      return { ...state, rooms: [...state.rooms, action.payload] };
    }

    case 'SET_CURRENT_ROOM':
      return { ...state, currentRoom: action.payload };

    case 'ADD_USER': {
      const newUsers = new Map(state.users);
      newUsers.set(action.payload.id, action.payload);
      return { ...state, users: newUsers };
    }

    case 'UPDATE_USER': {
      const user = state.users.get(action.payload.id);
      if (user) {
        const newUsers = new Map(state.users);
        newUsers.set(action.payload.id, { ...user, ...action.payload });
        return { ...state, users: newUsers };
      }
      return state;
    }

    case 'REMOVE_USER': {
      const newUsers = new Map(state.users);
      newUsers.delete(action.payload);
      return { ...state, users: newUsers };
    }

    case 'ADD_MESSAGE': {
      const newMessages = new Map(state.messages);
      const roomMessages = newMessages.get(action.payload.roomId) || [];
      newMessages.set(action.payload.roomId, [...roomMessages, action.payload.message]);
      return { ...state, messages: newMessages };
    }

    case 'ADD_PUBLIC_KEY': {
      const newPublicKeys = new Map(state.publicKeys);
      newPublicKeys.set(action.payload.userId, action.payload.publicKey);
      return { ...state, publicKeys: newPublicKeys };
    }

    case 'SET_TYPING': {
      const newTypingUsers = new Map(state.typingUsers);
      const roomTyping = newTypingUsers.get(action.payload.roomId) || [];
      
      if (action.payload.isTyping) {
        if (!roomTyping.includes(action.payload.userId)) {
          newTypingUsers.set(action.payload.roomId, [...roomTyping, action.payload.userId]);
        }
      } else {
        newTypingUsers.set(
          action.payload.roomId,
          roomTyping.filter((id) => id !== action.payload.userId)
        );
      }
      
      return { ...state, typingUsers: newTypingUsers };
    }

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// Context
interface ChatContextValue {
  state: ChatState;
  connect: (username: string) => Promise<void>;
  disconnect: () => void;
  createRoom: (roomName: string, expiresInMinutes?: number) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// Provider component
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket client
  useEffect(() => {
    wsClientRef.current = getWebSocketClient();

    // Status change handler
    const unsubStatus = wsClientRef.current.onStatusChange((status) => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
    });

    return () => {
      unsubStatus();
    };
  }, []);

  // Set up message handlers
  useEffect(() => {
    const ws = wsClientRef.current;
    if (!ws) return;

    const handlers: Array<() => void> = [];

    // Connected handler
    handlers.push(
      ws.on('connected', (msg) => {
        const payload = msg.payload as {
          userId: string;
          username: string;
          fingerprint: string;
          rooms: Room[];
        };
        dispatch({
          type: 'SET_USER',
          payload: {
            userId: payload.userId,
            username: payload.username,
            fingerprint: payload.fingerprint,
          },
        });
        dispatch({ type: 'SET_ROOMS', payload: payload.rooms });
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      })
    );

    // Room created handler
    handlers.push(
      ws.on('room_created', (msg) => {
        const payload = msg.payload as { room: Room };
        dispatch({ type: 'ADD_ROOM', payload: payload.room });
        dispatch({ type: 'SET_CURRENT_ROOM', payload: payload.room });
      })
    );

    // Room list updated handler
    handlers.push(
      ws.on('room_list_updated', (msg) => {
        const payload = msg.payload as { rooms: Room[] };
        dispatch({ type: 'SET_ROOMS', payload: payload.rooms });
      })
    );

    // Room joined handler
    handlers.push(
      ws.on('room_joined', async (msg) => {
        const payload = msg.payload as { room: Room };
        dispatch({ type: 'ADD_ROOM', payload: payload.room });
        dispatch({ type: 'SET_CURRENT_ROOM', payload: payload.room });
        
        // Import public keys for all participants (await all to complete)
        const keyImportPromises = (payload.room.participants || []).map(async (participant: User) => {
          try {
            const publicKey = await importPublicKey(participant.publicKey);
            dispatch({
              type: 'ADD_PUBLIC_KEY',
              payload: { userId: participant.id, publicKey },
            });
            dispatch({ type: 'ADD_USER', payload: participant });
          } catch (error) {
            console.error('Failed to import public key:', error);
          }
        });
        
        // Wait for all keys to be imported before allowing messages
        await Promise.all(keyImportPromises);
      })
    );

    // User joined room handler
    handlers.push(
      ws.on('user_joined_room', async (msg) => {
        const payload = msg.payload as { roomId: string; user: User };
        dispatch({ type: 'ADD_USER', payload: payload.user });
        
        try {
          const publicKey = await importPublicKey(payload.user.publicKey);
          dispatch({
            type: 'ADD_PUBLIC_KEY',
            payload: { userId: payload.user.id, publicKey },
          });
        } catch (error) {
          console.error('Failed to import public key:', error);
        }

        // Add system message
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            roomId: payload.roomId,
            message: {
              id: `system-${Date.now()}`,
              roomId: payload.roomId,
              senderId: 'system',
              senderUsername: 'System',
              content: `${payload.user.username} joined the room`,
              timestamp: new Date(),
              type: 'system',
              isOwn: false,
              isVerified: true,
            },
          },
        });
      })
    );

    // User left room handler
    handlers.push(
      ws.on('user_left_room', (msg) => {
        const payload = msg.payload as { roomId: string; userId: string; username: string };
        
        // Add system message
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            roomId: payload.roomId,
            message: {
              id: `system-${Date.now()}`,
              roomId: payload.roomId,
              senderId: 'system',
              senderUsername: 'System',
              content: `${payload.username} left the room`,
              timestamp: new Date(),
              type: 'system',
              isOwn: false,
              isVerified: true,
            },
          },
        });
      })
    );

    // Message handler
    handlers.push(
      ws.on('message', async (msg) => {
        const payload = msg.payload as EncryptedMessage & { senderFingerprint: string };
        
        // Decrypt the message
        try {
          if (!state.keyPair?.privateKey || !state.userId) {
            console.error('Cannot decrypt: missing keys or user ID');
            return;
          }

          const encryptedKey = payload.encryptedKeys[state.userId];
          if (!encryptedKey) {
            console.error('No encrypted key for this user');
            return;
          }

          const content = await decryptFromSender(
            payload.encryptedContent,
            encryptedKey,
            payload.iv,
            state.keyPair.privateKey
          );

          const decryptedMessage: DecryptedMessage = {
            id: payload.id,
            roomId: payload.roomId,
            senderId: payload.senderId,
            senderUsername: payload.senderUsername,
            content,
            timestamp: new Date(payload.timestamp),
            type: payload.type,
            isOwn: payload.senderId === state.userId,
            isVerified: true, // Could be verified by fingerprint comparison
          };

          dispatch({
            type: 'ADD_MESSAGE',
            payload: { roomId: payload.roomId, message: decryptedMessage },
          });
        } catch (error) {
          console.error('Failed to decrypt message:', error);
        }
      })
    );

    // Typing handler
    handlers.push(
      ws.on('typing', (msg) => {
        const payload = msg.payload as { roomId: string; userId: string; isTyping: boolean };
        dispatch({ type: 'SET_TYPING', payload });
      })
    );

    // User online handler
    handlers.push(
      ws.on('user_online', async (msg) => {
        const payload = msg.payload as { user: User };
        dispatch({ type: 'ADD_USER', payload: { ...payload.user, isOnline: true } });
        
        try {
          const publicKey = await importPublicKey(payload.user.publicKey);
          dispatch({
            type: 'ADD_PUBLIC_KEY',
            payload: { userId: payload.user.id, publicKey },
          });
        } catch (error) {
          console.error('Failed to import public key:', error);
        }
      })
    );

    // User offline handler
    handlers.push(
      ws.on('user_offline', (msg) => {
        const payload = msg.payload as { userId: string };
        dispatch({ type: 'UPDATE_USER', payload: { id: payload.userId, isOnline: false } });
      })
    );

    // Error handler
    handlers.push(
      ws.on('error', (msg) => {
        const payload = msg.payload as { code: string; message: string };
        dispatch({ type: 'SET_ERROR', payload: payload.message });
        console.error('WebSocket error:', payload);
      })
    );

    // Cleanup
    return () => {
      handlers.forEach((unsub) => unsub());
    };
  }, [state.keyPair, state.userId]);

  // Connect to server
  const connect = useCallback(async (username: string) => {
    try {
      // Initialize encryption keys
      const { keyPair, exportedKeyPair, fingerprint } = await initializeEncryption();
      dispatch({ type: 'SET_KEYS', payload: { keyPair, exportedKeyPair, fingerprint } });

      // Connect WebSocket
      const ws = wsClientRef.current;
      if (!ws) throw new Error('WebSocket client not initialized');

      ws.connect();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
        
        const unsub = ws.onStatusChange((status) => {
          if (status === 'connected') {
            clearTimeout(timeout);
            unsub();
            resolve();
          } else if (status === 'error') {
            clearTimeout(timeout);
            unsub();
            reject(new Error('Connection failed'));
          }
        });
      });

      // Send connect message
      ws.sendConnect({
        username,
        publicKey: exportedKeyPair.publicKey,
        fingerprint,
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      throw error;
    }
  }, []);

  // Disconnect from server
  const disconnect = useCallback(() => {
    wsClientRef.current?.disconnect();
    dispatch({ type: 'RESET' });
  }, []);

  // Create a new room
  const createRoom = useCallback((roomName: string, expiresInMinutes?: number) => {
    wsClientRef.current?.sendCreateRoom({ roomName, expiresInMinutes });
  }, []);

  // Join a room
  const joinRoom = useCallback((roomId: string) => {
    wsClientRef.current?.sendJoinRoom({ roomId });
  }, []);

  // Leave a room
  const leaveRoom = useCallback((roomId: string) => {
    wsClientRef.current?.sendLeaveRoom({ roomId });
    dispatch({ type: 'SET_CURRENT_ROOM', payload: null });
  }, []);

  // Send an encrypted message
  const sendMessage = useCallback(async (content: string) => {
    if (!state.currentRoom || !state.keyPair) {
      throw new Error('Not in a room or keys not initialized');
    }

    // Get public keys for all room participants
    const recipientKeys = new Map<string, CryptoKey>();
    const missingKeys: string[] = [];
    
    // Include self
    if (state.userId && state.keyPair.publicKey) {
      recipientKeys.set(state.userId, state.keyPair.publicKey);
    }

    // Include other participants
    for (const participant of state.currentRoom.participants || []) {
      const publicKey = state.publicKeys.get(participant.id);
      if (publicKey) {
        recipientKeys.set(participant.id, publicKey);
      } else {
        missingKeys.push(participant.username);
      }
    }

    // Warn if any keys are missing
    if (missingKeys.length > 0) {
      console.warn(`Missing public keys for: ${missingKeys.join(', ')}`);
      // Still send the message to available recipients
    }

    // Encrypt the message
    const { encryptedContent, encryptedKeys, iv } = await encryptForRecipients(
      content,
      recipientKeys
    );

    // Send the encrypted message
    wsClientRef.current?.sendMessage({
      roomId: state.currentRoom.id,
      encryptedContent,
      encryptedKeys,
      iv,
      type: 'text',
    });
  }, [state.currentRoom, state.keyPair, state.userId, state.publicKeys]);

  // Set typing indicator
  const setTyping = useCallback((isTyping: boolean) => {
    if (!state.currentRoom) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    wsClientRef.current?.sendTyping({
      roomId: state.currentRoom.id,
      isTyping,
    });

    // Auto-clear typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        wsClientRef.current?.sendTyping({
          roomId: state.currentRoom!.id,
          isTyping: false,
        });
      }, 3000);
    }
  }, [state.currentRoom]);

  const value: ChatContextValue = {
    state,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    setTyping,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// Hook to use chat context
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
