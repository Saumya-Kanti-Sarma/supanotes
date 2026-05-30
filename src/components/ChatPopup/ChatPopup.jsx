// ─── ChatPopup ────────────────────────────────────────────────────────────────
// Full chat interface rendered in a portal. Maintains its own message list and
// streams model replies chunk by chunk. Closing the popup clears the session.

import { createPortal } from "react-dom";
import { useState, useRef, useEffect, useCallback } from "react";
import { RiCloseLine, RiSendPlaneFill, RiRobot2Line, RiUserLine, RiStopCircleLine } from "react-icons/ri";
import "./ChatPopup.css";

/**
 * @param {{
 *   session: { send: (text: string) => AsyncGenerator<string>, clear: () => void },
 *   initialContext?: string,   ← selected text pre-seeded as first user message
 *   onClose: () => void,
 * }} props
 */
export function ChatPopup({ session, initialContext, onClose }) {
  const [messages, setMessages] = useState([]); // [{ role: "user"|"model", text: string, streaming?: boolean }]
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const hasSeededRef = useRef(false);

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Seed with selected text context on first open
  useEffect(() => {
    if (initialContext && !hasSeededRef.current) {
      hasSeededRef.current = true;
      sendMessage(
        `I have the following text selected in my note:\n\n"${initialContext}"\n\nWhat can you tell me about it?`
      );
    }
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleClose = useCallback(() => {
    abortRef.current = true;
    session.clear();
    onClose();
  }, [session, onClose]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    abortRef.current = false;
    setIsStreaming(true);

    // Add user message
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);

    // Add empty model message that we'll stream into
    setMessages((prev) => [...prev, { role: "model", text: "", streaming: true }]);

    try {
      const stream = session.send(trimmed);
      for await (const chunk of stream) {
        if (abortRef.current) break;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "model") {
            updated[updated.length - 1] = { ...last, text: last.text + chunk };
          }
          return updated;
        });
      }
    } catch (err) {
      const msg = err?.message ?? "";
      const friendly = msg.includes("429")
        ? "Rate limit reached. Wait a moment and try again."
        : msg.includes("401") || msg.includes("403")
          ? "Invalid API key."
          : "Something went wrong. Try again.";

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "model") {
          updated[updated.length - 1] = { ...last, text: friendly, error: true };
        }
        return updated;
      });
    } finally {
      // Mark streaming done
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "model") {
          updated[updated.length - 1] = { ...last, streaming: false };
        }
        return updated;
      });
      setIsStreaming(false);
    }
  }, [session, isStreaming]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleStop = () => {
    abortRef.current = true;
  };

  const popup = (
    <div className="chat-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="chat-popup" role="dialog" aria-label="Ask AI">

        {/* ── Header ── */}
        <div className="chat-popup__header">
          <div className="chat-popup__header-left">
            <RiRobot2Line className="chat-popup__robot-icon" />
            <div>
              <span className="chat-popup__title">Ask AI</span>
              {initialContext && (
                <span className="chat-popup__subtitle">
                  Context: "{initialContext.slice(0, 48)}{initialContext.length > 48 ? "…" : ""}"
                </span>
              )}
            </div>
          </div>
          <button className="chat-popup__icon-btn" title="Close (Esc)" onClick={handleClose}>
            <RiCloseLine />
          </button>
        </div>

        {/* ── Messages ── */}
        <div className="chat-popup__messages">
          {messages.length === 0 && (
            <div className="chat-popup__empty">
              <RiRobot2Line className="chat-popup__empty-icon" />
              <p>Ask anything. I have context of your selected text.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg chat-msg--${msg.role} ${msg.error ? "chat-msg--error" : ""}`}>
              <div className="chat-msg__avatar">
                {msg.role === "user" ? <RiUserLine /> : <RiRobot2Line />}
              </div>
              <div className="chat-msg__bubble">
                <span className="chat-msg__text">
                  {msg.text}
                  {msg.streaming && msg.text.length > 0 && (
                    <span className="chat-msg__cursor" />
                  )}
                </span>
                {/* Skeleton while waiting for first chunk */}
                {msg.streaming && msg.text.length === 0 && (
                  <div className="chat-msg__skeleton">
                    <div className="chat-msg__skeleton-line" style={{ width: "88%" }} />
                    <div className="chat-msg__skeleton-line" style={{ width: "72%" }} />
                    <div className="chat-msg__skeleton-line" style={{ width: "55%" }} />
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <form className="chat-popup__input-row" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="chat-popup__input"
            placeholder="Ask anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          {isStreaming ? (
            <button
              type="button"
              className="chat-popup__send-btn chat-popup__send-btn--stop"
              onClick={handleStop}
              title="Stop"
            >
              <RiStopCircleLine />
            </button>
          ) : (
            <button
              type="submit"
              className="chat-popup__send-btn"
              disabled={!input.trim()}
              title="Send (Enter)"
            >
              <RiSendPlaneFill />
            </button>
          )}
        </form>
      </div>
    </div>
  );

  return createPortal(popup, document.body);
}
