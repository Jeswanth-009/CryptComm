// User types
export interface User {
  id: string;
  username: string;
  publicKey: string;
  fingerprint: string;
  isOnline: boolean;
  isVerified: boolean;
  lastSeen?: Date;
}

// Room types
export interface Room {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  participants: User[];
  participantCount?: number;
  isEncrypted: boolean;
  expiresAt: string | null;
}

// Message types
export interface EncryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  encryptedContent: string;
  encryptedKeys: Record<string, string>; // userId -> encrypted AES key
  iv: string;
  timestamp: Date;
  type: 'text' | 'system' | 'file';
}

export interface DecryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'file';
  isOwn: boolean;
  isVerified: boolean;
}

// Encryption types
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ExportedKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptionResult {
  encryptedContent: string;
  encryptedKeys: Record<string, string>;
  iv: string;
}

// WebSocket message types
export type WebSocketMessageType =
  | 'connect'
  | 'disconnect'
  | 'join_room'
  | 'leave_room'
  | 'create_room'
  | 'message'
  | 'typing'
  | 'user_joined'
  | 'user_left'
  | 'room_created'
  | 'room_list'
  | 'user_list'
  | 'error'
  | 'key_exchange'
  | 'verify_identity'
  | 'pong';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: unknown;
  timestamp: number;
}

export interface ConnectPayload {
  username: string;
  publicKey: string;
  fingerprint: string;
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface CreateRoomPayload {
  roomName: string;
  expiresInMinutes?: number;
}

export interface SendMessagePayload {
  roomId: string;
  encryptedContent: string;
  encryptedKeys: Record<string, string>;
  iv: string;
  type: 'text' | 'file';
}

export interface TypingPayload {
  roomId: string;
  isTyping: boolean;
}

export interface KeyExchangePayload {
  targetUserId: string;
  publicKey: string;
}

export interface VerifyIdentityPayload {
  userId: string;
  fingerprint: string;
}

// Connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// UI State types
export interface ChatState {
  currentRoom: Room | null;
  rooms: Room[];
  messages: Map<string, DecryptedMessage[]>;
  users: Map<string, User>;
  typingUsers: Map<string, string[]>; // roomId -> userIds
  connectionStatus: ConnectionStatus;
  error: string | null;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

// Rate limit info
export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  isLimited: boolean;
}
