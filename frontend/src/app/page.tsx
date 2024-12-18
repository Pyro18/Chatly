"use client";

import { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, MessageSquare, Video, Users } from 'lucide-react';
import ChatPage from './_components/text';
import { type Socket, io} from 'socket.io-client';

interface OnlineStats {
  total: number;
  chatting: number;
  waiting: number;
}

export default function Page() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [interests, setInterests] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [onlineStats, setOnlineStats] = useState<OnlineStats>({ total: 0, chatting: 0, waiting: 0 });

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001');

    newSocket.on('stats', (stats: OnlineStats) => {
      setOnlineStats(stats);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleStartTextChat = useCallback(() => {
    setShowChat(true);
  }, []);

  const handleReturnToHome = useCallback(() => {
    setShowChat(false);
  }, []);

  const handleInterestsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInterests(e.target.value);
  }, []);

  if (showChat && socket) {
    return <ChatPage socket={socket} onReturnToHome={handleReturnToHome} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 bg-gradient-to-b from-blue-100 to-white">
      <header className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={handleReturnToHome}>
          <div className="w-10 h-10 bg-blue-500 rounded-full"></div>
          <h1 className="text-3xl font-bold text-blue-500">Chatly</h1>
        </div>
        <p className="text-2xl font-semibold text-gray-700">Talk to strangers!</p>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg">
            <Users className="text-blue-500" />
            <div className="text-sm">
              <span className="font-semibold text-blue-600">{onlineStats.total}</span> online
              {onlineStats.chatting > 0 && (
                <>
                  <span className="mx-2">•</span>
                  <span className="font-semibold text-green-600">{onlineStats.chatting}</span> chatting
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8 space-y-6">
        <p className="text-gray-600">
          You dont need an app to use Omegle on your phone or tablet! The web site works great on mobile.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm text-gray-700">
            Omegle (oh·meg·ull) is a great way to meet new friends. When you use Omegle, we pick someone
            else at random and let you talk one-on-one. To help you stay safe, chats are anonymous unless you
            tell someone who you are (not suggested!), and you can stop a chat at any time.
          </p>
        </div>

        <div className="space-y-4">
          <Label htmlFor="interests">What do you wanna talk about?</Label>
          <Input
            id="interests"
            placeholder="Add your interests (optional)"
            value={interests}
            onChange={handleInterestsChange}
          />
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded flex items-start space-x-3">
          <AlertCircle className="text-yellow-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-yellow-700">Video is monitored. Keep it clean!</p>
            <p className="text-sm text-yellow-600">18+ | (Adult) | (Unmoderated Section)</p>
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <Button
            className="w-32 bg-blue-500 hover:bg-blue-600"
            onClick={handleStartTextChat}
          >
            <MessageSquare className="mr-2 h-4 w-4" /> Text
          </Button>
          <Button className="w-32 bg-blue-500 hover:bg-blue-600" disabled>
            <Video className="mr-2 h-4 w-4" /> Video
          </Button>
        </div>
      </main>

      <footer className="mt-8 text-center text-sm text-gray-500">
        By using Omegle, you accept the terms at the bottom. You must be 18+ or 13+ with parental permission.
      </footer>
    </div>
  );
}