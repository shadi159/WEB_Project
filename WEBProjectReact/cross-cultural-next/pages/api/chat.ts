// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

type ChatMsg = { role: "user"|"assistant"|"system"; content: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end();
  }

  const { messages } = req.body as { messages: ChatMsg[] };
  if (!messages) return res.status(400).json({ error: "No messages" });

  // Convert chat messages to Gemini format
  const convertToGeminiFormat = (msgs: ChatMsg[]) => {
    const systemMessage = msgs.find(m => m.role === "system")?.content || "";
    const conversationHistory = msgs
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

    return {
      systemInstruction: systemMessage ? { parts: [{ text: systemMessage }] } : undefined,
      contents: conversationHistory
    };
  };

  try {
    const geminiData = convertToGeminiFormat(messages);
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...geminiData,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error:", errorData);
      
      if (response.status === 429) {
        return res.status(503).json({
          error: "Daily quota exceeded. Try again tomorrow or upgrade to a paid plan."
        });
      }
      
      return res.status(500).json({
        error: "AI service temporarily unavailable. Please try again later."
      });
    }

    const data = await response.json();
    const reply = {
      role: "assistant",
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response."
    };

    return res.status(200).json({ reply });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      error: "Unexpected error. Please try again later."
    });
  }
}