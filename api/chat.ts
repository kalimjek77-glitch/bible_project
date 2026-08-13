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

    // Convert previous messages into text
    let conversation = "";

    if (Array.isArray(history)) {
      conversation = history
        .map((item: any) => {
          const speaker =
            item.role === "assistant"
              ? "April"
              : "User";

          return `${speaker}: ${item.content}`;
        })
        .join("\n\n");
    }

    // Add the current message
    conversation += `\n\nUser: ${message}`;

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",

      system_instruction:
        systemInstruction ||
        `You are April, a helpful AI Bible Assistant.

You should:
- Answer Bible questions clearly.
- Use Scripture references when appropriate.
- Understand follow-up questions.
- Use the previous conversation to understand what the user means.
- Be respectful and patient.
- Do not pretend to be a human.
- If the user asks about something unrelated to the Bible, still answer helpfully.
`,

      input: conversation,
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