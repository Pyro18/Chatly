"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageCircle, SkipForward, Send, SmilePlus, ImagePlus, Moon, Sun, Shield, Flag } from "lucide-react"
import Link from "next/link"
import io, { Socket } from "socket.io-client"

export default function ChatPlatform() {
  const [interests, setInterests] = useState("")
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isChatting, setIsChatting] = useState(false)
  const [showPreChat, setShowPreChat] = useState(true)
  const [onlineCount, setOnlineCount] = useState(0)
  const [messages, setMessages] = useState<Array<{text: string, fromSelf: boolean, system?: boolean}>>([])
  const [currentMessage, setCurrentMessage] = useState("")
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const newSocket = io("http://localhost:3001", {
      transports: ["websocket"]
    })

    newSocket.on("connect", () => {
      setIsConnected(true)
      console.log("Connected to server")
    })

    newSocket.on("online_count", (count) => {
      setOnlineCount(count)
      console.log("Online count:", count)
    })

    newSocket.on("chat_started", ({ roomId }) => {
      setIsSearching(false)
      setIsChatting(true)
      setMessages([])
      console.log("Chat started in room:", roomId)
    })

    newSocket.on("receive_message", ({ senderId, message }) => {
      setMessages(prev => [...prev, {
        text: message,
        fromSelf: senderId === newSocket.id
      }])
    })

    newSocket.on("partner_left", () => {
      setMessages(prev => [...prev, {
        text: "Your chat partner left. You'll be connected with someone new soon...",
        fromSelf: false,
        system: true
      }])
      
      // Automatically start searching for a new partner
      startTextChat()
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle("dark")
  }

  const startTextChat = () => {
    if (!socket) return
    setShowPreChat(false)
    setIsSearching(true)
    socket.emit("start_search")
  }

  const skipToNextChat = () => {
    if (!socket) return
    socket.emit("leave_chat")
    setMessages(prev => [...prev, {
      text: "Looking for a new chat partner...",
      fromSelf: false,
      system: true
    }])
    setIsSearching(true)
    socket.emit("start_search")
  }

  const sendMessage = (text: string) => {
    if (!socket || !text.trim()) return
    socket.emit("send_message", text)
    setCurrentMessage("")
  }

  const returnToHomepage = () => {
    if (!socket) return
    socket.emit("leave_chat")
    setIsChatting(false)
    setMessages([])
    setShowPreChat(true)
  }

  // Pre-chat page with rules
  if (showPreChat) {
    return (
      <div className={`min-h-screen ${darkMode ? "dark" : ""} bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800`}>
        <div className="flex flex-col h-screen">
          {/* Header */}
          <header className="flex items-center justify-between py-3 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 text-white p-2 rounded-lg">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  Chatly
                </h1>
                <p className="text-xs text-muted-foreground">Connect with the world</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">
                  {onlineCount} online
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </header>

          {/* Pre-chat Rules */}
          <main className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">
                  Welcome to Chatly
                </h2>
                <p className="text-lg text-muted-foreground">
                  Please read the rules below before starting
                </p>
              </div>

              <div className="bg-background p-6 rounded-2xl shadow-lg space-y-6">
                <div className="space-y-4">
                  <Alert className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900">
                    <AlertDescription className="text-sm text-red-700 dark:text-red-300 font-bold">
                      You must be 18 or older to use this service
                    </AlertDescription>
                  </Alert>
                  
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span>No inappropriate content or conversations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span>Be respectful to all users</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span>Do not share personal information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span>Breaking any rules results in a permanent ban</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium">
                    What would you like to talk about? (optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Add your interests (optional)"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    className="w-full"
                  />

                  {interests && (
                    <div className="flex gap-2 flex-wrap">
                      {interests.split(",").map((interest, i) => (
                        <Badge key={i} variant="secondary">
                          {interest.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500"
                    onClick={startTextChat}
                    disabled={!isConnected}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Start Chat
                  </Button>
                </div>
              </div>
            </div>
          </main>

          {/* Footer is controlled by the isChatting state as requested */}
        </div>
      </div>
    )
  }

  // Chat Interface
  return (
    <div className={`min-h-screen ${darkMode ? "dark" : ""} bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800`}>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="flex items-center justify-between py-3 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 text-white p-2 rounded-lg">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Chatly
              </h1>
              <p className="text-xs text-muted-foreground">Connect with the world</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">
                {onlineCount} online
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {/* Chat Status Bar */}
        <div className="border-b p-2 bg-background/90">
          <div className="rounded-lg bg-muted/50 p-2 text-center text-sm">
            {isSearching ? (
              <p>Looking for someone to chat with...</p>
            ) : (
              <p>You&apos;re now chatting with a random stranger</p>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.fromSelf ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.system 
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-center w-full" 
                    : message.fromSelf 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="border-t bg-background p-3">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                size="sm" 
                className="flex items-center gap-1" 
                onClick={returnToHomepage}
              >
                Stop
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex items-center gap-1" 
                onClick={skipToNextChat}
                disabled={isSearching}
              >
                <SkipForward className="w-4 h-4" />
                Skip
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
              >
                <Flag className="w-4 h-4" />
                Report
              </Button>
            </div>
            
            <div className="flex-1 flex items-center gap-2 rounded-full bg-muted px-4 py-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-transparent focus:outline-none"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(currentMessage)}
                disabled={isSearching}
              />
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" disabled={isSearching}>
                  <SmilePlus className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" disabled={isSearching}>
                  <ImagePlus className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <Button 
              onClick={() => sendMessage(currentMessage)} 
              className="rounded-full" 
              size="sm"
              disabled={isSearching}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Footer - Only shown when not chatting as requested */}
        {!isChatting && (
          <footer className="py-3 text-center text-sm text-muted-foreground space-x-4 border-t">
            <Link href="#" className="hover:text-blue-500 transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-blue-500 transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-blue-500 transition-colors">
              Safety Tips
            </Link>
            <Link href="#" className="hover:text-blue-500 transition-colors">
              FAQ
            </Link>
          </footer>
        )}
      </div>
    </div>
  )
}