"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent, CardHeader } from "./ui/card"
import { Badge } from "./ui/badge"
import { X, Send, MessageCircle, Bot, User, Minimize2, Maximize2, Sparkles, Clock } from "lucide-react"
import { useIsMobile } from "../hooks/use-mobile"

type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
  timestamp?: Date
}

interface ChatbotProps {
  open: boolean
  onClose: () => void
}

export default function Chatbot({ open, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm ChatBotEduBridge, your AI assistant for international education. How can I help you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  // Auto-scroll to bottom whenever a new message is added
  useEffect(() => {
    if (open && !isMinimized) {
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        })
      }, 100)
    }
  }, [messages, isLoading, open, isMinimized])

  if (!open) return null

  const send = async () => {
    if (!input.trim()) return

    const userMsg: ChatMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    // Add user message immediately
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMsg: ChatMessage = {
          role: "assistant",
          content: "I'm sorry, I'm experiencing some technical difficulties. Please try again in a moment.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMsg])
        setIsLoading(false)
        return
      }

      const { reply } = data
      const assistantMsg: ChatMessage = {
        ...reply,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (e) {
      console.error(e)
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please check your internet connection and try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const quickActions = [
    "How do I apply for a student visa?",
    "What are the academic requirements?",
    "Tell me about housing options",
    "How can I improve my language skills?",
  ]

  return (
    <div
      className={`
        fixed z-50 transition-all duration-300 ease-in-out
        ${isMobile ? "inset-0" : "bottom-4 right-4"}
        ${isMobile ? "w-full h-full" : "w-96"}
        ${isMinimized && !isMobile ? "h-25" : isMobile ? "h-full" : "h-[675px]"}
      `}
    >
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <CardHeader className="p-0">
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-teal-600 text-white">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h3 className="font-semibold text-lg">ChatBotEduBridge</h3>
                <p className="text-xs text-blue-100">AI Education Assistant</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-white hover:bg-white/20 p-2"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20 p-2">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Status Bar */}
          {!isMinimized && (
            <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <div className="flex items-center justify-between text-xs">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                  Online
                </Badge>
                <span className="text-gray-500">Powered by AI</span>
              </div>
            </div>
          )}
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-full">
            {/* Messages Container */}
            <div
              ref={containerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white"
              style={{ maxHeight: isMobile ? "calc(100vh - 200px)" : "400px" }}
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 ${
                    message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-500 to-blue-600"
                        : "bg-gradient-to-r from-purple-500 to-purple-600"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className="flex-1 max-w-[80%]">
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
                          : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                    {message.timestamp && (
                      <p
                        className={`text-xs text-gray-400 mt-1 ${message.role === "user" ? "text-right" : "text-left"}`}
                      >
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatTime(message.timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {messages.length === 1 && !isLoading && (
                <div className="space-y-3">
                  <div className="text-center">
                    <Badge variant="outline" className="bg-white/80 backdrop-blur-sm">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Quick Questions
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setInput(action)}
                        className="text-left justify-start h-auto p-3 bg-white/80 backdrop-blur-sm hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
                      >
                        <MessageCircle className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="text-sm">{action}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <Input
                    placeholder="Ask me anything about international education..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        send()
                      }
                    }}
                    className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl resize-none"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={send}
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white rounded-xl px-4 py-2 transition-all duration-200 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">Press Enter to send • Powered by AI</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
