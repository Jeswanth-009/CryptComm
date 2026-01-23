import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ChatProvider } from "@/lib/chat-context";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CryptComm - Secure Messaging",
  description: "End-to-end encrypted real-time communication platform",
  keywords: ["encrypted", "messaging", "secure", "chat", "e2e"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <TooltipProvider>
          <ChatProvider>
            {children}
            <Toaster />
          </ChatProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
