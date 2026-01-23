"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Hash,
  Plus,
  Users,
  Lock,
  Loader2,
  Clock3,
} from 'lucide-react';
import { useChat } from '@/lib/chat-context';
import { cn } from '@/lib/utils';
import type { Room } from '@/types';

interface RoomItemProps {
  room: Room;
  isActive: boolean;
  onClick: () => void;
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry';

  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(diffMs)) return 'No expiry';
  if (diffMs <= 0) return 'Expired';

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes} min left`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr left`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
}

function RoomItem({ room, isActive, onClick }: RoomItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted text-foreground'
      )}
    >
      <Hash className="h-4 w-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{room.name}</div>
        <div className={cn(
          'text-xs truncate',
          isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
        )}>
          {room.participantCount || 0} {room.participantCount === 1 ? 'user' : 'users'} · {formatExpiry(room.expiresAt ?? null)}
        </div>
      </div>
      {room.isEncrypted && (
        <Lock className={cn(
          'h-3 w-3 flex-shrink-0',
          isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
        )} />
      )}
    </button>
  );
}

export function RoomList() {
  const { state, joinRoom, createRoom } = useChat();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDuration, setNewRoomDuration] = useState<number>(60);
  const [isCreating, setIsCreating] = useState(false);

  const DURATION_OPTIONS = [
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '4 hours', value: 240 },
    { label: '24 hours', value: 1440 },
    { label: '7 days', value: 10080 },
  ];

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

    setIsCreating(true);
    try {
      createRoom(newRoomName.trim(), newRoomDuration);
      setNewRoomName('');
      setNewRoomDuration(60);
      setIsCreateDialogOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (room: Room) => {
    if (state.currentRoom?.id !== room.id) {
      joinRoom(room.id);
    }
  };

  return (
    <div className="flex flex-col h-full border-r bg-muted/30">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">Rooms</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Create new room</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Room</DialogTitle>
                <DialogDescription>
                  Create a secure encrypted chat room for your team.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g., Project Alpha"
                  className="mt-2"
                  maxLength={50}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateRoom();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  3-50 characters. Letters, numbers, spaces, and hyphens allowed.
                </p>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="roomDuration">Room Duration</Label>
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                    <select
                      id="roomDuration"
                      value={newRoomDuration}
                      onChange={(e) => setNewRoomDuration(Number(e.target.value))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {DURATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rooms auto-expire after the selected duration.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  disabled={!newRoomName.trim() || newRoomName.length < 3 || isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Create Room
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>All rooms are encrypted</span>
        </div>
      </div>

      {/* Room List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {state.rooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No rooms yet</p>
              <p className="text-xs mt-1">Create one to get started</p>
            </div>
          ) : (
            state.rooms.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                isActive={state.currentRoom?.id === room.id}
                onClick={() => handleJoinRoom(room)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer - User info */}
      <Separator />
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {state.username || 'Not connected'}
            </div>
            {state.shortFingerprint && (
              <div className="text-xs text-muted-foreground font-mono truncate">
                {state.shortFingerprint}
              </div>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            <Lock className="h-3 w-3 mr-1" />
            E2E
          </Badge>
        </div>
      </div>
    </div>
  );
}
