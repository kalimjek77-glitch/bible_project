import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "v1",
  },
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      message,
      systemInstruction,
      history = [],
    } = req.body || {};

    if (!message) {
      return res.status(400).json({
        error: "Message is required.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured in Vercel.",
      });
    }

    const conversation = [
      ...(Array.isArray(history)
        ? history.map((item: any) => ({
            role: item.role === "assistant" ? "model" : "user",
            content: item.content,
          }))
        : []),
      {
        role: "user",
        content: message,
      },
    ];

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",

      system_instruction:
        systemInstruction ||
        "You are a helpful AI assistant.",

      input: conversation.map((item) => ({
        role: item.role,
        content: item.content,
      })),
    });

    return res.status(200).json({
      reply:
        interaction.output_text ||
        "I couldn't generate a response.",
    });
  } catch (error: any) {
    console.error("Gemini error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Failed to generate Gemini response.",
    });
  }
}