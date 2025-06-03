// components/Chatbot.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { X } from "lucide-react";
import Logo from "./Logo";
import { useIsMobile } from "../hooks/use-mobile";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

interface ChatbotProps {
  open: boolean;
  onClose: () => void;
}

export default function Chatbot({ open, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi, I'm ChatBotEduBridge. How can I help you?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Auto–scroll to bottom whenever a new message (או placeholder) מתווספת
  useEffect(() => {
    if (open) {
      containerRef.current?.scrollTo(0, containerRef.current.scrollHeight);
    }
  }, [messages, isLoading, open]);

  if (!open) return null;

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user" as const, content: input };
    // מוסיפים מיד את הודעת המשתמש ל־messages
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    // מתחילים “לחשוב”
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Chatbot error. Please try again later.");
        setIsLoading(false);
        return;
      }
      const { reply } = data;
      // מוסיפים את התגובה האמיתית
      setMessages((prev) => [...prev, reply]);
    } catch (e) {
      console.error(e);
      alert("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`
        fixed z-50
        ${isMobile ? "inset-0 bg-white" : "top-16 right-4"}
        flex flex-col
        ${isMobile ? "w-full h-full" : "w-full max-w-sm h-[600px]"}
        shadow-xl rounded-lg overflow-hidden
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-800 to-teal-500">
        <div className="flex items-center space-x-2">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 bg-blue-800 rounded-full opacity-70 transform -translate-x-1 -translate-y-1"></div>
            <div className="absolute inset-0 bg-teal-500 rounded-full opacity-70 transform translate-x-1 translate-y-1"></div>
          </div>
          <span className="text-lg font-bold text-white">ChatBotEduBridge</span>
        </div>
        <X
          className="cursor-pointer text-white hover:text-gray-200"
          onClick={onClose}
        />
      </div>

      {/* Messages container */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto p-4 space-y-3 ${
          isMobile ? "bg-gray-50" : "bg-gray-100"
        }`}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`
              max-w-[80%] px-3 py-2 rounded-lg 
              ${
                m.role === "user"
                  ? "bg-blue-500 text-white self-end"
                  : "bg-gray-200 text-gray-800 self-start"
              }
            `}
          >
            {m.content}
          </div>
        ))}

        {/* אם הבוט “חושב” – מציגים בועת placeholder */}
        {isLoading && (
          <div className="max-w-[60%] px-3 py-2 rounded-lg bg-gray-200 text-gray-600 self-start animate-pulse">
            Thinking…
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t bg-white flex items-center gap-2">
        <Input
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="flex-1"
        />
        <Button onClick={send} className="px-4 py-1 text-white">
          Send
        </Button>
      </div>
    </div>
  );
}
