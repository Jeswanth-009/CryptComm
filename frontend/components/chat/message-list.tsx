"use client";

import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Shield, ShieldCheck } from 'lucide-react';
import { useChat } from '@/lib/chat-context';
import { cn, formatTime, formatDate, getInitials, generateAvatarColor } from '@/lib/utils';
import type { DecryptedMessage } from '@/types';

interface MessageGroupProps {
  messages: DecryptedMessage[];
  showDate: boolean;
  dateLabel: string;
}

function MessageGroup({ messages, showDate, dateLabel }: MessageGroupProps) {
  const firstMessage = messages[0];
  const isOwn = firstMessage.isOwn;
  const isSystem = firstMessage.type === 'system';

  if (isSystem) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        {showDate && (
          <div className="text-xs text-muted-foreground">{dateLabel}</div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full"
          >
            {message.content}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3 py-2', isOwn && 'flex-row-reverse')}>
      {!isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback
            className={cn(
              'text-xs text-white',
              generateAvatarColor(firstMessage.senderUsername)
            )}
          >
            {getInitials(firstMessage.senderUsername)}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn('flex flex-col gap-1 max-w-[70%]', isOwn && 'items-end')}>
        {showDate && (
          <div className="text-xs text-muted-foreground text-center w-full mb-2">
            {dateLabel}
          </div>
        )}
        
        {!isOwn && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-medium">{firstMessage.senderUsername}</span>
            {firstMessage.isVerified ? (
              <ShieldCheck className="h-3 w-3 text-green-500" />
            ) : (
              <Shield className="h-3 w-3 text-yellow-500" />
            )}
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              'flex items-end gap-2',
              isOwn && 'flex-row-reverse'
            )}
          >
            <div
              className={cn(
                'px-4 py-2 rounded-2xl max-w-full break-words',
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted rounded-bl-md',
                index === 0 && !isOwn && 'rounded-tl-2xl',
                index === 0 && isOwn && 'rounded-tr-2xl'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
              <Lock className="h-3 w-3" />
              <span>{formatTime(message.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex gap-3 py-2">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-64 rounded-2xl" />
      </div>
    </div>
  );
}

export function MessageList() {
  const { state } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = state.currentRoom
    ? state.messages.get(state.currentRoom.id) || []
    : [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!state.currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a room to start chatting</p>
          <p className="text-sm mt-2">All messages are end-to-end encrypted</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
          <p>No messages yet</p>
          <p className="text-sm mt-2">
            Start the conversation! Messages are encrypted with AES-256-GCM
          </p>
        </div>
      </div>
    );
  }

  // Group messages by sender and date
  const groupedMessages: Array<{
    messages: DecryptedMessage[];
    showDate: boolean;
    dateLabel: string;
  }> = [];

  let currentGroup: DecryptedMessage[] = [];
  let currentSender = '';
  let currentDate = '';

  messages.forEach((message, index) => {
    const messageDate = formatDate(message.timestamp);
    const showDate = messageDate !== currentDate;
    
    if (showDate) {
      currentDate = messageDate;
    }

    if (
      message.senderId !== currentSender ||
      message.type === 'system' ||
      showDate
    ) {
      if (currentGroup.length > 0) {
        groupedMessages.push({
          messages: currentGroup,
          showDate: false,
          dateLabel: '',
        });
      }
      currentGroup = [message];
      currentSender = message.senderId;
      
      if (showDate) {
        groupedMessages.push({
          messages: [message],
          showDate: true,
          dateLabel: messageDate,
        });
        currentGroup = [];
        currentSender = '';
      }
    } else {
      currentGroup.push(message);
    }
  });

  if (currentGroup.length > 0) {
    groupedMessages.push({
      messages: currentGroup,
      showDate: false,
      dateLabel: '',
    });
  }

  return (
    <ScrollArea className="flex-1 px-4" ref={scrollRef}>
      <div className="py-4">
        {/* Room encryption info */}
        <div className="flex justify-center mb-6">
          <Badge variant="outline" className="gap-2">
            <Lock className="h-3 w-3" />
            Messages are end-to-end encrypted
          </Badge>
        </div>

        {/* Messages */}
        {groupedMessages
          .filter((group) => group.messages.length > 0)
          .map((group, index) => (
            <MessageGroup
              key={`${group.messages[0]?.id || index}`}
              messages={group.messages}
              showDate={group.showDate}
              dateLabel={group.dateLabel}
            />
          ))}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
