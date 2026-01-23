"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Key, Loader2, AlertCircle } from 'lucide-react';
import { useChat } from '@/lib/chat-context';
import { useToast } from '@/components/ui/use-toast';

export function LoginForm() {
  const { connect } = useChat();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUsername = /^[a-zA-Z0-9_-]{3,20}$/.test(username);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidUsername) {
      setError('Username must be 3-20 characters (letters, numbers, _, -)');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await connect(username);
      toast({
        title: 'Connected successfully',
        description: 'Your encryption keys have been generated.',
      });
    } catch (err) {
      setError((err as Error).message);
      toast({
        title: 'Connection failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-3 sm:p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3 sm:space-y-4">
          <div className="mx-auto mb-2 sm:mb-4 w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">CryptComm</CardTitle>
          <CardDescription className="text-sm">
            End-to-end encrypted secure messaging
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                disabled={isLoading}
                maxLength={20}
                autoComplete="username"
                autoFocus
                className="text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground">
                3-20 characters. Letters, numbers, underscores, and hyphens only.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="rounded-lg bg-muted p-4 space-y-3">
              <h4 className="font-medium text-sm">Security Features</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  <span>RSA-2048 key pair generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>AES-256-GCM message encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Private keys never leave your device</span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={!isValidUsername || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Keys...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Connect Securely
                </>
              )}
            </Button>
          </CardFooter>
        </form>

        <div className="px-6 pb-6">
          <p className="text-xs text-center text-muted-foreground">
            By connecting, you agree to use this platform responsibly.
            <br />
            Your private key is generated locally and never transmitted.
          </p>
        </div>
      </Card>
    </div>
  );
}
