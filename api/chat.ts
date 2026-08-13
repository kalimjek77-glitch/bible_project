import type { VercelRequest, VercelResponse } from "@vercel/node";

const MODEL = "gemini-2.5-flash";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured on Vercel."
    });
  }

  try {
    const { message, systemInstruction, history } = req.body ?? {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item: any) =>
              item &&
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string"
          )
          .slice(-30)
      : [];

    const contents = safeHistory.map((item: any) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }]
    }));

    // Ensure the current message is present even if the client history is stale.
    if (
      contents.length === 0 ||
      contents[contents.length - 1]?.parts?.[0]?.text !== message
    ) {
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text:
                typeof systemInstruction === "string"
                  ? systemInstruction
                  : "You are April, a helpful Bible study assistant."
            }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data: any = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ||
        `Gemini API returned HTTP ${response.status}.`;
      return res.status(response.status).json({ error: message });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text || "")
        .join("")
        .trim();

    if (!reply) {
      return res.status(502).json({
        error: "Gemini returned an empty response."
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Gemini API error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected server error."
    });
  }
}
