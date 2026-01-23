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
  Menu,
} from 'lucide-react';
import { useChat } from '@/lib/chat-context';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  onMenuClick?: () => void;
}

export function ChatHeader({ onMenuClick }: ChatHeaderProps) {
  const { state, leaveRoom, disconnect } = useChat();

  const getConnectionBadge = () => {
    switch (state.connectionStatus) {
      case 'connected':
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <Wifi className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="secondary" className="gap-1 bg-yellow-500">
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
    <header className="h-14 sm:h-16 border-b bg-background flex items-center justify-between px-2 sm:px-4">
      {/* Left section - Menu button and Room info */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex-shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {state.currentRoom ? (
          <>
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
              <h1 className="font-semibold text-sm sm:text-lg truncate">{state.currentRoom.name}</h1>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Encrypted</span>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{state.currentRoom.participants?.length || 0} users</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <h1 className="font-semibold text-sm sm:text-lg truncate">CryptComm</h1>
            <span className="hidden sm:inline text-sm text-muted-foreground">Secure Messaging</span>
          </div>
        )}
      </div>

      {/* Right section - Status and actions */}
      <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
        <div className="hidden sm:block">
          {getConnectionBadge()}
        </div>

        {state.currentRoom && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => leaveRoom(state.currentRoom!.id)}
                  className="hidden sm:flex"
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
                  className="text-muted-foreground hover:text-destructive h-8 w-8 sm:h-10 sm:w-10"
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
