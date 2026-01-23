"use client";

import { ChatHeader } from './chat-header';
import { RoomList } from './room-list';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { UserList } from './user-list';
import { LoginForm } from './login-form';
import { useChat } from '@/lib/chat-context';
import { Loader2, Shield } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="text-center">
        <Shield className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
        <h1 className="text-2xl font-bold mb-2">CryptComm</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Initializing secure connection...</span>
        </div>
      </div>
    </div>
  );
}

export function ChatContainer() {
  const { state } = useChat();

  // Show login if not connected
  if (!state.userId) {
    if (state.connectionStatus === 'connecting') {
      return <LoadingScreen />;
    }
    return <LoginForm />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <ChatHeader />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Room List Sidebar */}
        <aside className="w-64 flex-shrink-0 hidden md:block">
          <RoomList />
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <MessageList />
          <MessageInput />
        </main>

        {/* User List Sidebar */}
        <aside className="flex-shrink-0 hidden lg:block">
          <UserList />
        </aside>
      </div>
    </div>
  );
}
