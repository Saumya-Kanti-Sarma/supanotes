// ─── Rephrase API ─────────────────────────────────────────────────────────────
// Streams a rephrased version of the provided text using Gemini.
// Yields text chunks as they arrive so the UI can render progressively.

import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `You are a professional AI writing assistant specialized in rephrasing and rewriting text.

Your task:
- Rewrite the user's text while preserving the original meaning.
- Improve clarity, grammar, readability, and flow.
- Maintain natural human-like writing.
- Avoid robotic or repetitive phrasing.
- Avoid use of the em dash symbol — and emoji unless they appear in the provided text.

Rules:
- Never change the factual meaning.
- Keep tone consistent unless the user asks otherwise.
- Preserve important technical terms.
- Remove awkward wording.
- Avoid overcomplicated vocabulary unless requested.
- If no tone is specified, use clean modern natural English.

Output:
- Return only the rewritten text.
- Do not explain the rewrite.`;

/**
 * Streams a rephrased version of the given text.
 * @param {string} text - The text to rephrase.
 * @returns {AsyncGenerator<string>} Yields text chunks as they stream in.
 */
export async function* rephraseText(text) {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const response = await ai.models.generateContentStream({
    model: "gemma-4-26b-a4b-it",
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
    contents: [
      {
        role: "user",
        parts: [{ text }],
      },
    ],
  });

  for await (const chunk of response) {
    if (chunk.text) yield chunk.text;
  }
}
