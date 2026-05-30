// ─── GeneralChat API ──────────────────────────────────────────────────────────
// Stateful chat session with Gemini. Maintains the full conversation history
// so the model has context of every prior message in the session.
// Call `createChatSession()` to get a session, then `session.send(text)` to
// stream a reply. Call `session.clear()` when the chat is closed.

import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `You are a helpful, intelligent, and conversational AI assistant embedded inside a note-taking app.

Your goals:
- Understand user intent accurately.
- Give clear, practical, and helpful responses.
- Adapt explanations based on user knowledge level.
- Be concise unless detailed explanation is requested.

Behavior:
- Be natural and conversational.
- Avoid unnecessary verbosity.
- Ask clarifying questions only when truly required.
- Prioritize usefulness and accuracy.

Rules:
- Do not hallucinate facts.
- Admit uncertainty when needed.
- Structure complex answers clearly.
- Explain technical concepts simply when appropriate.

For coding questions:
- Prefer practical examples.
- Write clean, production-quality code when requested.
- Explain tradeoffs clearly.

For note-taking and productivity:
- Be structured and organized.
- Use bullet points or numbered lists when it aids clarity.`;

/**
 * Creates a new stateful chat session.
 * The session accumulates the full message history so every call to `send()`
 * includes all prior turns as context.
 *
 * @returns {{ send: (text: string) => AsyncGenerator<string>, clear: () => void }}
 */
export function createChatSession() {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  /** @type {Array<{ role: "user" | "model", parts: Array<{ text: string }> }>} */
  const history = [];

  /**
   * Sends a message and streams the model's reply.
   * Appends both the user message and the completed model reply to history.
   * @param {string} userText
   * @returns {AsyncGenerator<string>}
   */
  async function* send(userText) {
    // Append user turn to history before sending
    history.push({ role: "user", parts: [{ text: userText }] });

    const response = await ai.models.generateContentStream({
      model: "gemma-4-26b-a4b-it",
      config: { systemInstruction: SYSTEM_PROMPT },
      contents: history,
    });

    // Collect the full reply so we can append it to history after streaming
    let fullReply = "";

    for await (const chunk of response) {
      if (chunk.text) {
        fullReply += chunk.text;
        yield chunk.text;
      }
    }

    // Append completed model turn to history for next round
    history.push({ role: "model", parts: [{ text: fullReply }] });
  }

  /** Wipes the conversation history — call when the chat popup is closed. */
  function clear() {
    history.length = 0;
  }

  return { send, clear };
}
