"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, MessageSquare, Users, Shield, Globe2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import io, { Socket } from "socket.io-client"

export default function ChatPlatform() {
  const [interests, setInterests] = useState("")
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isChatting, setIsChatting] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [messages, setMessages] = useState<Array<{text: string, fromSelf: boolean}>>([])
  const [currentMessage, setCurrentMessage] = useState("")

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
      setIsChatting(false)
      setMessages(prev => [...prev, {
        text: "Il partner ha lasciato la chat",
        fromSelf: false
      }])
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  const startTextChat = () => {
    if (!socket) return
    setIsSearching(true)
    socket.emit("start_search")
  }

  const sendMessage = (text: string) => {
    if (!socket || !text.trim()) return
    socket.emit("send_message", text)
    setCurrentMessage("")
  }

  const leaveChat = () => {
    if (!socket) return
    socket.emit("leave_chat")
    setIsChatting(false)
    setMessages([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 text-white p-2 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Chatly
              </h1>
              <p className="text-sm text-muted-foreground">Connect with the world</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">
              {onlineCount}
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto mt-12 space-y-8">
          {!isChatting ? (
            <>
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">
                  Meet New People Who Share Your Interests
                </h2>
                <p className="text-lg text-muted-foreground">
                  Join millions of people discovering meaningful connections through shared passions
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Globe2 className="w-5 h-5 text-blue-500 mt-1" />
                    <div>
                      <h3 className="font-medium">Global Connections</h3>
                      <p className="text-sm text-muted-foreground">
                        Chat with people from around the world
                      </p>
                    </div>
                  </div>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertTriangle className="w-4 h-4 text-blue-500" />
                  <AlertDescription className="text-sm text-blue-700">
                    Chats are monitored for safety. Keep it friendly and appropriate.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <label className="block text-sm font-medium">
                    What would you like to talk about?
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

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500"
                    onClick={startTextChat}
                    disabled={!isConnected || isSearching}
                  >
                    <MessageSquare className="w-4 h-4" />
                    {isSearching ? "Searching..." : "Start Text Chat"}
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full gap-2 border-2"
                    disabled={true}
                  >
                    <Camera className="w-4 h-4" />
                    Start Video Chat
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-lg space-y-4">
              <div className="h-[400px] overflow-y-auto border rounded-lg p-4 space-y-2">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg max-w-[80%] ${
                      msg.fromSelf
                        ? "bg-blue-500 text-white ml-auto"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage(currentMessage)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button onClick={() => sendMessage(currentMessage)}>Send</Button>
                <Button variant="destructive" onClick={leaveChat}>
                  Leave
                </Button>
              </div>
            </div>
          )}

          <footer className="text-center text-sm text-muted-foreground space-x-4">
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
        </main>
      </div>
    </div>
  )
}