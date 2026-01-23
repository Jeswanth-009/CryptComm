import { getUser, getUserPublicInfo, type UserPublicInfo } from './users.js';

export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  participantIds: Set<string>;
  isEncrypted: boolean;
  expiresAt: Date | null;
}

export interface RoomPublicInfo {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  participantCount: number;
  participants: UserPublicInfo[];
  isEncrypted: boolean;
  expiresAt: Date | null;
}

// Store rooms
const rooms = new Map<string, Room>();
const roomNameToId = new Map<string, string>();

/**
 * Create a new room
 */
export function createRoom(
  id: string,
  name: string,
  createdBy: string,
  expiresInMinutes?: number
): Room {
  const expiresAt = expiresInMinutes
    ? new Date(Date.now() + expiresInMinutes * 60 * 1000)
    : null;

  const room: Room = {
    id,
    name,
    createdAt: new Date(),
    createdBy,
    participantIds: new Set(),
    isEncrypted: true,
    expiresAt,
  };

  rooms.set(id, room);
  roomNameToId.set(name.toLowerCase(), id);

  return room;
}

/**
 * Get room by ID
 */
export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

/**
 * Get room by name
 */
export function getRoomByName(name: string): Room | undefined {
  const roomId = roomNameToId.get(name.toLowerCase());
  if (roomId) {
    return rooms.get(roomId);
  }
  return undefined;
}

/**
 * Check if room name is taken
 */
export function isRoomNameTaken(name: string): boolean {
  return roomNameToId.has(name.toLowerCase());
}

/**
 * Get all rooms
 */
export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}

/**
 * Get room public info
 */
export function getRoomPublicInfo(room: Room): RoomPublicInfo {
  const participants = Array.from(room.participantIds)
    .map((id) => getUser(id))
    .filter((user): user is NonNullable<typeof user> => user !== undefined)
    .map(getUserPublicInfo);

  return {
    id: room.id,
    name: room.name,
    createdAt: room.createdAt,
    createdBy: room.createdBy,
    participantCount: room.participantIds.size,
    participants,
    isEncrypted: room.isEncrypted,
    expiresAt: room.expiresAt,
  };
}

/**
 * Get all rooms' public info
 */
export function getAllRoomsPublicInfo(): RoomPublicInfo[] {
  return getAllRooms().map(getRoomPublicInfo);
}

/**
 * Add participant to room
 */
export function addParticipant(roomId: string, userId: string): boolean {
  const room = rooms.get(roomId);
  if (room) {
    room.participantIds.add(userId);
    return true;
  }
  return false;
}

/**
 * Remove participant from room
 */
export function removeParticipant(roomId: string, userId: string): boolean {
  const room = rooms.get(roomId);
  if (room) {
    room.participantIds.delete(userId);
    return true;
  }
  return false;
}

/**
 * Get all participants in a room
 */
export function getRoomParticipants(roomId: string): string[] {
  const room = rooms.get(roomId);
  if (room) {
    return Array.from(room.participantIds);
  }
  return [];
}

/**
 * Check if user is in room
 */
export function isUserInRoom(roomId: string, userId: string): boolean {
  const room = rooms.get(roomId);
  if (room) {
    return room.participantIds.has(userId);
  }
  return false;
}

/**
 * Get participant count
 */
export function getParticipantCount(roomId: string): number {
  const room = rooms.get(roomId);
  if (room) {
    return room.participantIds.size;
  }
  return 0;
}

/**
 * Delete room
 */
export function deleteRoom(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (room) {
    roomNameToId.delete(room.name.toLowerCase());
    rooms.delete(roomId);
    return true;
  }
  return false;
}

/**
 * Check whether a room is expired
 */
export function isRoomExpired(room: Room, now: Date = new Date()): boolean {
  return !!room.expiresAt && room.expiresAt.getTime() <= now.getTime();
}

/**
 * Remove all expired rooms and return the affected room IDs with participants
 */
export function removeExpiredRooms(now: Date = new Date()): Array<{ roomId: string; participantIds: string[]; name: string }> {
  const removed: Array<{ roomId: string; participantIds: string[]; name: string }> = [];

  // Collect first to avoid mutating during iteration
  const toDelete: Room[] = [];
  for (const room of rooms.values()) {
    if (isRoomExpired(room, now)) {
      toDelete.push(room);
    }
  }

  toDelete.forEach((room) => {
    removed.push({ roomId: room.id, participantIds: Array.from(room.participantIds), name: room.name });
    deleteRoom(room.id);
  });

  return removed;
}

/**
 * Get room count
 */
export function getRoomCount(): number {
  return rooms.size;
}

/**
 * Get rooms for a specific user
 */
export function getUserRooms(userId: string): Room[] {
  return getAllRooms().filter((room) => room.participantIds.has(userId));
}

/**
 * Get rooms for a specific user (public info)
 */
export function getUserRoomsPublicInfo(userId: string): RoomPublicInfo[] {
  return getUserRooms(userId).map(getRoomPublicInfo);
}
