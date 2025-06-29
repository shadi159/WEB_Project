// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

type ChatMsg = { role: "user"|"assistant"|"system"; content: string };

// System prompt that restricts the AI to only answer questions about your platform
const SYSTEM_PROMPT = `You are an AI assistant for an International Student Education Platform. You should ONLY answer questions related to:

1. This educational platform for international students
2. The resources and journey steps provided in this platform
3. How to use or navigate this web application
4. Questions about the features, functionality, or content of this platform

AVAILABLE PLATFORM DATA:

RESOURCES:
- Understanding Different Academic Systems (Guide)
- Writing Academic Papers in Western Universities (Article) 
- Managing Culture Shock in a New Academic Environment (Video)
- Financial Aid Options for International Students (Guide)
- Student Visa Application Checklist (Checklist)
- Housing Options for International Students (Guide)
- Language Proficiency Test Preparation (Video)
- Building a Social Network in a New Country (Article)
- Understanding Healthcare Systems for International Students (Guide)
- Academic Calendar Comparison Tool (Tool)
- Working While Studying: Rules and Regulations (Article)
- Preparing for Graduate Studies Abroad (Guide)

JOURNEY STEPS:
1. Research & Decision Making - Research educational systems and make informed decisions
2. Application Process - Complete applications for institutions and programs
3. Pre-Departure Preparation - Prepare for relocation with practical and cultural considerations
4. Arrival & Orientation - Navigate arrival and orientation at new institution
5. Academic Integration - Adapt to new academic environment and excel in studies

CATEGORIES AVAILABLE: Academic Systems, Cultural Differences, Academic Writing, Study Skills, Cultural Adjustment, Mental Health, Financial Planning, Practical Resources, Visa & Immigration, Accommodation, Language Skills, Social Integration, Healthcare, Planning, Employment, Legal Rights, Graduate Education, Academic Planning

DO NOT answer questions about:
- General topics unrelated to this platform
- Personal advice not related to using this educational platform
- Technical programming help (unless specifically about this platform's code)
- Topics outside the scope of international student education resources

If a user asks something outside this scope, politely redirect them to ask questions about the platform's resources, journey steps, or how to use the application.

Always be helpful, informative, and focused on helping international students navigate their educational journey using this platform.`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end();
  }

  const { messages } = req.body as { messages: ChatMsg[] };
  if (!messages) return res.status(400).json({ error: "No messages" });

  // Convert chat messages to Gemini format with restricted system prompt
  const convertToGeminiFormat = (msgs: ChatMsg[]) => {
    // Always use our restricted system prompt, ignore any system messages from the client
    const conversationHistory = msgs
      .filter(m => m.role !== "system") // Remove any system messages from client
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

    return {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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