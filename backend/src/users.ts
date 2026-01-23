import type { WebSocket } from 'ws';

export interface User {
  id: string;
  username: string;
  publicKey: string;
  fingerprint: string;
  socket: WebSocket;
  roomIds: Set<string>;
  isOnline: boolean;
  lastSeen: Date;
  connectedAt: Date;
}

export interface UserPublicInfo {
  id: string;
  username: string;
  publicKey: string;
  fingerprint: string;
  isOnline: boolean;
  lastSeen: Date;
}

// Store users by their connection
const users = new Map<string, User>();
const usernameToId = new Map<string, string>();

/**
 * Create a new user
 */
export function createUser(
  id: string,
  username: string,
  publicKey: string,
  fingerprint: string,
  socket: WebSocket
): User {
  const user: User = {
    id,
    username,
    publicKey,
    fingerprint,
    socket,
    roomIds: new Set(),
    isOnline: true,
    lastSeen: new Date(),
    connectedAt: new Date(),
  };

  users.set(id, user);
  usernameToId.set(username.toLowerCase(), id);

  return user;
}

/**
 * Get user by ID
 */
export function getUser(userId: string): User | undefined {
  return users.get(userId);
}

/**
 * Get user by username
 */
export function getUserByUsername(username: string): User | undefined {
  const userId = usernameToId.get(username.toLowerCase());
  if (userId) {
    return users.get(userId);
  }
  return undefined;
}

/**
 * Check if username is taken
 */
export function isUsernameTaken(username: string): boolean {
  return usernameToId.has(username.toLowerCase());
}

/**
 * Get all online users
 */
export function getOnlineUsers(): User[] {
  return Array.from(users.values()).filter((user) => user.isOnline);
}

/**
 * Get user public info (without sensitive data like socket)
 */
export function getUserPublicInfo(user: User): UserPublicInfo {
  return {
    id: user.id,
    username: user.username,
    publicKey: user.publicKey,
    fingerprint: user.fingerprint,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
  };
}

/**
 * Get multiple users' public info
 */
export function getUsersPublicInfo(userIds: string[]): UserPublicInfo[] {
  return userIds
    .map((id) => users.get(id))
    .filter((user): user is User => user !== undefined)
    .map(getUserPublicInfo);
}

/**
 * Update user's last seen timestamp
 */
export function updateLastSeen(userId: string): void {
  const user = users.get(userId);
  if (user) {
    user.lastSeen = new Date();
  }
}

/**
 * Add room to user's room list
 */
export function addUserToRoom(userId: string, roomId: string): boolean {
  const user = users.get(userId);
  if (user) {
    user.roomIds.add(roomId);
    return true;
  }
  return false;
}

/**
 * Remove room from user's room list
 */
export function removeUserFromRoom(userId: string, roomId: string): boolean {
  const user = users.get(userId);
  if (user) {
    user.roomIds.delete(roomId);
    return true;
  }
  return false;
}

/**
 * Get all room IDs for a user
 */
export function getUserRooms(userId: string): string[] {
  const user = users.get(userId);
  if (user) {
    return Array.from(user.roomIds);
  }
  return [];
}

/**
 * Set user offline (but keep in memory for reconnection)
 */
export function setUserOffline(userId: string): void {
  const user = users.get(userId);
  if (user) {
    user.isOnline = false;
    user.lastSeen = new Date();
  }
}

/**
 * Set user online
 */
export function setUserOnline(userId: string, socket: WebSocket): void {
  const user = users.get(userId);
  if (user) {
    user.isOnline = true;
    user.socket = socket;
    user.lastSeen = new Date();
  }
}

/**
 * Remove user completely
 */
export function removeUser(userId: string): boolean {
  const user = users.get(userId);
  if (user) {
    usernameToId.delete(user.username.toLowerCase());
    users.delete(userId);
    return true;
  }
  return false;
}

/**
 * Get user count
 */
export function getUserCount(): number {
  return users.size;
}

/**
 * Get online user count
 */
export function getOnlineUserCount(): number {
  return getOnlineUsers().length;
}

/**
 * Clean up inactive users (offline for more than 24 hours)
 */
export function cleanupInactiveUsers(): number {
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let removed = 0;

  for (const [userId, user] of users) {
    if (!user.isOnline && user.lastSeen < cutoffTime) {
      removeUser(userId);
      removed++;
    }
  }

  return removed;
}
