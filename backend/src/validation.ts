import { z } from 'zod';
import xss from 'xss';

// Username validation: 3-20 alphanumeric characters, underscores, and hyphens
const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;

// Room name validation: 3-50 characters, alphanumeric, spaces, underscores, and hyphens
const roomNameRegex = /^[a-zA-Z0-9 _-]{3,50}$/;

// Message length limits
const MAX_MESSAGE_LENGTH = 10000;
const MAX_PUBLIC_KEY_LENGTH = 2000;

// Allowed room durations (in minutes)
export const ALLOWED_ROOM_DURATIONS = [30, 60, 240, 1440, 10080] as const;

// Validation schemas
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(usernameRegex, 'Username can only contain letters, numbers, underscores, and hyphens');

export const roomNameSchema = z
  .string()
  .min(3, 'Room name must be at least 3 characters')
  .max(50, 'Room name must be at most 50 characters')
  .regex(roomNameRegex, 'Room name can only contain letters, numbers, spaces, underscores, and hyphens');

export const publicKeySchema = z
  .string()
  .min(100, 'Invalid public key')
  .max(MAX_PUBLIC_KEY_LENGTH, 'Public key too long');

export const fingerprintSchema = z
  .string()
  .regex(/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/, 'Invalid fingerprint format');

export const encryptedContentSchema = z
  .string()
  .min(1, 'Message cannot be empty')
  .max(MAX_MESSAGE_LENGTH * 2, 'Encrypted content too long');

export const ivSchema = z
  .string()
  .min(16, 'Invalid IV')
  .max(100, 'Invalid IV');

export const encryptedKeysSchema = z.record(z.string(), z.string());

// Message type schemas
export const connectPayloadSchema = z.object({
  username: usernameSchema,
  publicKey: publicKeySchema,
  fingerprint: fingerprintSchema,
});

export const joinRoomPayloadSchema = z.object({
  roomId: z.string().uuid(),
});

export const createRoomPayloadSchema = z.object({
  roomName: roomNameSchema,
  expiresInMinutes: z
    .number()
    .int('Duration must be a whole number of minutes')
    .positive('Duration must be positive')
    .refine((val) => ALLOWED_ROOM_DURATIONS.includes(val as (typeof ALLOWED_ROOM_DURATIONS)[number]), 'Invalid duration')
    .optional(),
});

export const sendMessagePayloadSchema = z.object({
  roomId: z.string().uuid(),
  encryptedContent: encryptedContentSchema,
  encryptedKeys: encryptedKeysSchema,
  iv: ivSchema,
  type: z.enum(['text', 'file']),
});

export const typingPayloadSchema = z.object({
  roomId: z.string().uuid(),
  isTyping: z.boolean(),
});

export const keyExchangePayloadSchema = z.object({
  targetUserId: z.string().uuid(),
  publicKey: publicKeySchema,
});

export const verifyIdentityPayloadSchema = z.object({
  userId: z.string().uuid(),
  fingerprint: fingerprintSchema,
});

// WebSocket message schema
export const webSocketMessageSchema = z.object({
  type: z.enum([
    'connect',
    'disconnect',
    'join_room',
    'leave_room',
    'create_room',
    'message',
    'typing',
    'key_exchange',
    'verify_identity',
    'ping',
  ]),
  payload: z.unknown(),
  timestamp: z.number(),
});

// Sanitization functions
export function sanitizeUsername(username: string): string {
  return xss(username.trim());
}

export function sanitizeRoomName(roomName: string): string {
  return xss(roomName.trim());
}

export function sanitizeMessage(message: string): string {
  return xss(message);
}

// Type exports
export type ConnectPayload = z.infer<typeof connectPayloadSchema>;
export type JoinRoomPayload = z.infer<typeof joinRoomPayloadSchema>;
export type CreateRoomPayload = z.infer<typeof createRoomPayloadSchema>;
export type SendMessagePayload = z.infer<typeof sendMessagePayloadSchema>;
export type TypingPayload = z.infer<typeof typingPayloadSchema>;
export type KeyExchangePayload = z.infer<typeof keyExchangePayloadSchema>;
export type VerifyIdentityPayload = z.infer<typeof verifyIdentityPayloadSchema>;
export type WebSocketMessage = z.infer<typeof webSocketMessageSchema>;

// Validation helper
export function validatePayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors.map((e) => e.message).join(', '),
  };
}
