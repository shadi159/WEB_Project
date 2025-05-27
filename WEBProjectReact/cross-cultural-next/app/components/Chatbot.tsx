// components/Chatbot.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { X } from "lucide-react";
import Logo from "./Logo";

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
      content: "Hi I'm ChatBotEduBridge how can I help you?"
    }
  ]);  const [input, setInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // auto-scroll when new messages arrive
  useEffect(() => {
    if (open) {
      containerRef.current?.scrollTo(0, containerRef.current.scrollHeight);
    }
  }, [messages, open]);

  // if not open, render nothing
  if (!open) return null;

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user" as const, content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, userMsg] }),
    });
    
    const data = await res.json();
    if (!res.ok) {
        // show the error to the user
        alert(data.error || "Chatbot error. Please try again later.");
        return;
    }
    // Fix: don't call res.json() again, use the data we already parsed
    const { reply } = data;
    setMessages((m) => [...m, reply]);
  };

  return (
    <div className="fixed top-15 right-0 h-222 w-90 bg-background shadow-xl flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="relative w-8 h-8">
        <div className="absolute inset-0 bg-blue-800 rounded-full opacity-70 transform -translate-x-1 -translate-y-1"></div>
        <div className="absolute inset-0 bg-teal-500 rounded-full opacity-70 transform translate-x-1 -translate-y-1"></div>
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-blue-800 to-teal-500 bg-clip-text text-transparent">
        ChatBot
        </span>
        <span className="text-lg font-bold text-blue-800">
        Edu<span className="text-lg font-bold text-teal-500">Bridge</span>
        </span>
        <X className="cursor-pointer" onClick={onClose} />
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded px-3 py-2 ${
              m.role === "user" ? "bg-blue-500 self-end text-white" : "bg-muted"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>
      <div className="p-4 border-t flex gap-2">
        <Input
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button className="text-white" onClick={send}>Send</Button>
      </div>
    </div>
  );
}