// frontend/src/app/_components/text.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { type Socket } from 'socket.io-client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";


const generateMessageId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

type Message = {
    id: string;
    text: string;
    sender: "You" | "Stranger" | "System";
};

interface ServerMessage {
    text: string;
    sender: string;
}

interface ChatPageProps {
    socket: Socket;
    onReturnToHome: () => void;
}


export default function ChatPage({ socket, onReturnToHome }: ChatPageProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setIsConnected(true);
        socket.emit('findMatch');
        addMessage("Connecting to server...", "System");

        const handleMatched = () => {
            addMessage("You're now chatting with a stranger!", "System");
        };

        const handleMessage = (data: ServerMessage) => {
            addMessage(data.text, data.sender === socket.id ? "You" : "Stranger");
        };
        
        const handlePartnerTyping = (isTyping: boolean) => {
            setIsPartnerTyping(isTyping);
            // Reset typing status after 3 seconds if no updates
            if (isTyping) {
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }
                typingTimeoutRef.current = setTimeout(() => {
                    setIsPartnerTyping(false);
                }, 3000);
            }
        };

        const handlePartnerDisconnected = () => {
            setIsPartnerTyping(false); // Reset typing state on disconnect
            addMessage("Stranger has disconnected.", "System");
        };

        socket.on('matched', handleMatched);
        socket.on('message', handleMessage);
        socket.on('partnerTyping', handlePartnerTyping);
        socket.on('partnerDisconnected', handlePartnerDisconnected);

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            socket.off('matched', handleMatched);
            socket.off('message', handleMessage);
            socket.off('partnerTyping', handlePartnerTyping);
            socket.off('partnerDisconnected', handlePartnerDisconnected);
        };
    }, [socket]);

    const addMessage = (text: string, sender: "You" | "Stranger" | "System") => {
        setMessages(prev => [...prev, {
            id: generateMessageId(),
            text,
            sender
        }]);
    };

    const handleSendMessage = () => {
        if (inputMessage.trim() && socket) {

            addMessage(inputMessage.trim(), "You");
            socket.emit('sendMessage', { message: inputMessage.trim() });
            setInputMessage("");
        }
    };

    let typingTimer: NodeJS.Timeout;
    const handleTyping = (value: string) => {
        setInputMessage(value);
        
        socket?.emit('typing', true);

        clearTimeout(typingTimer);
        
        typingTimer = setTimeout(() => {
            socket?.emit('typing', false);
        }, 1000);
    };

    const handleDisconnect = () => {
        setMessages([]);
        onReturnToHome();
    };

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages]);

    socket?.on('disconnect', () => {
        setTimeout(() => {
            socket?.connect();
        }, 1000);
    });

    return (
        <div className="flex min-h-screen flex-col bg-gray-100">
            <header className="bg-white p-4 shadow-sm">
                <div className="mx-auto flex max-w-4xl items-center justify-between">
                    <div className="flex cursor-pointer items-center space-x-4" onClick={onReturnToHome}>
                        <div className="h-8 w-8 rounded-full bg-blue-500"></div>
                        <h1 className="text-2xl font-bold text-blue-500">Chatly</h1>
                    </div>
                </div>
            </header>

            <main className="mx-auto my-8 flex w-full max-w-2xl flex-grow flex-col overflow-hidden rounded-lg bg-white shadow-lg">
                <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
                    {messages.map((message) => (
                        <div key={message.id} className="mb-2">
                            <span className={`font-bold ${message.sender === "Stranger" ? "text-red-500" :
                                message.sender === "System" ? "text-gray-500" :
                                    "text-blue-500"
                                }`}>
                                {message.sender}:
                            </span>{" "}
                            <span className="text-gray-800">{message.text}</span>
                        </div>
                    ))}
                    {isPartnerTyping && (
                        <div className="text-sm text-gray-500">Stranger is typing...</div>
                    )}
                </ScrollArea>

                <div className="flex space-x-2 border-t p-4">
                    <Button variant="outline" onClick={handleDisconnect} className="w-28">
                        Disconnect
                    </Button>
                    <Input
                        value={inputMessage}
                        onChange={(e) => handleTyping(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-grow"
                        onKeyPress={(e: React.KeyboardEvent) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage}>Send</Button>
                </div>
            </main>
        </div>
    );
}