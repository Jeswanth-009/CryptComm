"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Shield,
  Wifi,
  WifiOff,
  Lock,
  LogOut,
  Hash,
  Users,
  Loader2,
} from 'lucide-react';
import { useChat } from '@/lib/chat-context';
import { cn } from '@/lib/utils';

export function ChatHeader() {
  const { state, leaveRoom, disconnect } = useChat();

  const getConnectionBadge = () => {
    switch (state.connectionStatus) {
      case 'connected':
        return (
          <Badge variant="success\" className="gap-1">
            <Wifi className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="warning" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="secondary" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Disconnected
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Error
          </Badge>
        );
    }
  };

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4">
      {/* Left section - Room info */}
      <div className="flex items-center gap-4">
        {state.currentRoom ? (
          <>
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-muted-foreground" />
              <h1 className="font-semibold text-lg">{state.currentRoom.name}</h1>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Encrypted</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{state.currentRoom.participants?.length || 0} users</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">CryptComm</h1>
            <span className="text-sm text-muted-foreground">Secure Messaging</span>
          </div>
        )}
      </div>

      {/* Right section - Status and actions */}
      <div className="flex items-center gap-3">
        {getConnectionBadge()}

        {state.currentRoom && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => leaveRoom(state.currentRoom!.id)}
                >
                  Leave Room
                </Button>
              </TooltipTrigger>
              <TooltipContent>Leave current room</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {state.userId && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={disconnect}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Disconnect</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </header>
  );
}
