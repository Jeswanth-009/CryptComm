"use client";

import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Users,
  ShieldCheck,
  Shield,
  Copy,
  Hash,
  Lock,
} from 'lucide-react';
import { useChat } from '@/lib/chat-context';
import { cn, getInitials, generateAvatarColor, copyToClipboard } from '@/lib/utils';
import { shortenFingerprint } from '@/lib/encryption';
import { useToast } from '@/components/ui/use-toast';
import type { User } from '@/types';

interface UserItemProps {
  user: User;
  isCurrentUser: boolean;
}

function UserItem({ user, isCurrentUser }: UserItemProps) {
  const { toast } = useToast();
  
  const shortFingerprint = shortenFingerprint(user.fingerprint);
  
  const handleCopyFingerprint = async () => {
    const success = await copyToClipboard(user.fingerprint);
    if (success) {
      toast({
        title: 'Fingerprint copied',
        description: 'You can share this to verify identity out-of-band.',
      });
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted cursor-pointer',
              isCurrentUser && 'bg-muted/50'
            )}
            onClick={handleCopyFingerprint}
          >
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className={cn(
                    'text-xs text-white',
                    generateAvatarColor(user.username)
                  )}
                >
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background',
                  user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                )}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium truncate">
                  {user.username}
                  {isCurrentUser && ' (you)'}
                </span>
                {user.isVerified ? (
                  <ShieldCheck className="h-3 w-3 text-green-500 flex-shrink-0" />
                ) : (
                  <Shield className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                )}
              </div>
              <div className="text-xs text-muted-foreground font-mono truncate">
                {shortFingerprint}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        
        <TooltipContent side="left" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">{user.username}</div>
            <div className="text-xs text-muted-foreground">
              Click to copy full fingerprint
            </div>
            <div className="text-xs font-mono break-all">
              {user.fingerprint}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function UserList() {
  const { state } = useChat();

  if (!state.currentRoom) {
    return (
      <div className="flex flex-col h-full border-l bg-muted/30 w-64">
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Participants
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Select a room to see participants
        </div>
      </div>
    );
  }

  const participants = state.currentRoom.participants || [];
  const onlineCount = participants.filter((p) => p.isOnline).length;

  return (
    <div className="flex flex-col h-full border-l bg-muted/30 w-64">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-1">
          <Hash className="h-4 w-4" />
          <h2 className="font-semibold truncate">{state.currentRoom.name}</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>End-to-end encrypted</span>
        </div>
      </div>

      {/* Participants Header */}
      <div className="px-4 py-2 bg-muted/50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Participants</span>
          <Badge variant="secondary" className="text-xs">
            {onlineCount} online
          </Badge>
        </div>
      </div>

      {/* Participant List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {participants.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No participants yet
            </div>
          ) : (
            participants.map((participant) => (
              <UserItem
                key={participant.id}
                user={participant}
                isCurrentUser={participant.id === state.userId}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Security Info */}
      <Separator />
      <div className="p-3">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-green-500" />
            <span>Verified: Identity confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-yellow-500" />
            <span>Unverified: Compare fingerprints</span>
          </div>
          <div className="flex items-center gap-2">
            <Copy className="h-3 w-3" />
            <span>Click user to copy fingerprint</span>
          </div>
        </div>
      </div>
    </div>
  );
}
