"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Lock, Loader2 } from 'lucide-react';
import { useChat } from '@/lib/chat-context';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export function MessageInput() {
  const { state, sendMessage, setTyping } = useChat();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const canSend = message.trim().length > 0 && state.currentRoom && !isSending;

  // Focus input when room changes
  useEffect(() => {
    if (state.currentRoom) {
      inputRef.current?.focus();
    }
  }, [state.currentRoom?.id]);

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const content = message.trim();
    setMessage('');
    setIsSending(true);

    try {
      await sendMessage(content);
      setTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Failed to send message',
        description: (error as Error).message,
        variant: 'destructive',
      });
      // Restore message on error
      setMessage(content);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [canSend, message, sendMessage, setTyping, toast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setMessage(value);
      
      if (value.length > 0) {
        setTyping(true);
      } else {
        setTyping(false);
      }
    },
    [setTyping]
  );

  if (!state.currentRoom) {
    return (
      <div className="border-t p-2 sm:p-4 bg-muted/30">
        <div className="flex gap-2">
          <Input
            disabled
            placeholder="Select a room to start chatting..."
            className="flex-1 text-sm"
          />
          <Button disabled size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Get typing users in current room
  const typingUsers = state.typingUsers.get(state.currentRoom.id) || [];
  const otherTyping = typingUsers.filter((id) => id !== state.userId);
  const typingUsernames = otherTyping
    .map((id) => state.users.get(id)?.username)
    .filter(Boolean);

  return (
    <div className="border-t p-2 sm:p-4 bg-background">
      {/* Typing indicator */}
      {typingUsernames.length > 0 && (
        <div className="text-xs text-muted-foreground mb-2 animate-pulse">
          {typingUsernames.length === 1
            ? `${typingUsernames[0]} is typing...`
            : typingUsernames.length === 2
            ? `${typingUsernames.join(' and ')} are typing...`
            : `${typingUsernames.length} people are typing...`}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a secure message..."
            disabled={isSending}
            maxLength={10000}
            className="pr-10 text-sm sm:text-base"
          />
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className={cn(
            'transition-colors h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0',
            canSend && 'bg-primary hover:bg-primary/90'
          )}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Character count for long messages */}
      {message.length > 500 && (
        <div className="text-xs text-muted-foreground mt-1 text-right">
          {message.length}/10000
        </div>
      )}
    </div>
  );
}
