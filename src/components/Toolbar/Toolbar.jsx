// ─── Toolbar ──────────────────────────────────────────────────────────────────
// Custom formatting toolbar rendered inside BlockNote's FormattingToolbarController.

import { useState, useRef, useCallback } from "react";
import {
  RiBold, RiItalic, RiUnderline, RiStrikethrough,
  RiListUnordered, RiLinkM, RiImageLine,
  RiClipboardLine, RiFileCopyLine, RiRobot2Line,
} from "react-icons/ri";
import { SiChangedetection as RephraseIcon } from "react-icons/si";
import { MdOutlineSummarize as SummarizeIcon } from "react-icons/md";

import { rephraseText } from "../../apis/Rephrase";
import { summarizeText } from "../../apis/Summarize";
import { createChatSession } from "../../apis/GeneralChat";
import { AiPopup } from "../AiPopup/AiPopup";
import { ChatPopup } from "../ChatPopup/ChatPopup";
import "./Toolbar.css";

/**
 * @param {{ editor: import("@blocknote/core").BlockNoteEditor, fileInputRef: React.RefObject }} props
 */
export function Toolbar({ editor, fileInputRef }) {
  // ── AI popup state ───────────────────────────────────────────────────────
  const [popup, setPopup] = useState(null);
  const abortRef = useRef(false);

  // ── Chat session state ───────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState("");
  const chatSessionRef = useRef(null);

  // ── Inline style toggle (reversible) ────────────────────────────────────

  const toggleInlineStyle = (styleKey) => {
    const activeStyles = editor.getActiveStyles();
    if (activeStyles[styleKey]) {
      editor.removeStyles([styleKey]);
    } else {
      editor.addStyles({ [styleKey]: true });
    }
  };

  // ── Block insertion helpers ──────────────────────────────────────────────

  const insertBulletListItem = () => {
    const cursorPosition = editor.getTextCursorPosition();
    editor.insertBlocks(
      [{ type: "bulletListItem", content: "List item" }],
      cursorPosition.block,
      "after"
    );
  };

  const insertLink = () => {
    const url = prompt("Enter URL");
    if (!url) return;
    const selectedText = editor.getSelectedText();
    editor.insertInlineContent([
      { type: "link", href: url, content: selectedText || url },
    ]);
  };

  const insertImageFromUrl = () => {
    const url = prompt("Enter image URL");
    if (!url) return;
    const lastBlock = editor.document[editor.document.length - 1];
    editor.insertBlocks([{ type: "image", props: { url } }], lastBlock, "after");
  };

  // ── Clipboard helpers ────────────────────────────────────────────────────

  const copySelectedText = async () => {
    const selectedText = editor.getSelectedText();
    await navigator.clipboard.writeText(selectedText);
  };

  const copyAllAsMarkdown = async () => {
    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    await navigator.clipboard.writeText(markdown);
  };

  // ── AI streaming helper ──────────────────────────────────────────────────

  const runAiAction = useCallback(async (title, action, streamFn) => {
    console.log("running AI action...")
    const selectedText = editor.getSelectedText();
    if (!selectedText?.trim()) {
      alert("Select some text first.");
      return;
    }

    abortRef.current = false;
    setPopup({ title, result: "", isLoading: true, error: null, action });

    try {
      const stream = streamFn(selectedText);
      for await (const chunk of stream) {
        if (abortRef.current) break;
        setPopup((prev) => prev ? { ...prev, result: prev.result + chunk } : prev);
      }
      setPopup((prev) => prev ? { ...prev, isLoading: false } : prev);
    } catch (err) {
      const message = err?.message ?? "";
      const userMessage = message.includes("429")
        ? "Rate limit reached. Wait a moment and try again."
        : message.includes("401") || message.includes("403")
          ? "Invalid API key. Check your VITE_GEMINI_API_KEY in .env."
          : message.includes("fetch") || message.includes("network")
            ? "Network error. Check your internet connection."
            : "Something went wrong. Try again.";

      setPopup((prev) =>
        prev ? { ...prev, isLoading: false, error: userMessage } : prev
      );
    }
  }, [editor]);

  const handleRephrase = () =>
    runAiAction("Rephrase", "rephrase", rephraseText);

  const handleSummarize = () =>
    runAiAction("Summarize", "summarize", summarizeText);

  // ── Retry: re-run the same action ───────────────────────────────────────

  const handleRetry = () => {
    if (!popup) return;
    if (popup.action === "rephrase") handleRephrase();
    else handleSummarize();
  };

  // ── Replace selected text with AI result ────────────────────────────────

  const handleReplace = () => {
    if (!popup?.result) return;
    editor.insertInlineContent([popup.result]);
    setPopup(null);
  };

  // ── Close popup ──────────────────────────────────────────────────────────

  const handleClose = () => {
    abortRef.current = true;
    setPopup(null);
  };

  // ── Open chat ────────────────────────────────────────────────────────────

  const handleAskAi = () => {
    const selectedText = editor.getSelectedText();
    // Create a fresh session each time the chat is opened
    chatSessionRef.current = createChatSession();
    setChatContext(selectedText ?? "");
    setChatOpen(true);
  };

  const handleChatClose = () => {
    // clear() wipes the history — session is discarded on close
    chatSessionRef.current?.clear();
    chatSessionRef.current = null;
    setChatOpen(false);
    setChatContext("");
  };

  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="custom-toolbar">
      <div className="toolbar-group">
        {/* Text formatting — all toggleable */}
        <button title="Bold (Ctrl+B)" onClick={() => toggleInlineStyle("bold")}>
          <RiBold />
        </button>
        <button title="Italic (Ctrl+I)" onClick={() => toggleInlineStyle("italic")}>
          <RiItalic />
        </button>
        <button title="Underline (Ctrl+U)" onClick={() => toggleInlineStyle("underline")}>
          <RiUnderline />
        </button>
        <button title="Strikethrough" onClick={() => toggleInlineStyle("strike")}>
          <RiStrikethrough />
        </button>

        <div className="toolbar-divider" />

        {/* Block insertion */}
        <button title="Bullet list" onClick={insertBulletListItem}>
          <RiListUnordered />
        </button>
        <button title="Insert link" onClick={insertLink}>
          <RiLinkM />
        </button>

        <div className="toolbar-divider" />

        {/* Image insertion */}
        <button title="Upload image" onClick={() => fileInputRef.current?.click()}>
          <RiImageLine />
        </button>
        <button title="Image from URL" onClick={insertImageFromUrl} className="btn-text">
          IMG URL
        </button>

        <div className="toolbar-divider" />

        {/* Clipboard */}
        <button title="Copy selection" onClick={copySelectedText}>
          <RiClipboardLine />
        </button>
        <button title="Copy all as markdown" onClick={copyAllAsMarkdown}>
          <RiFileCopyLine />
        </button>
      </div>

      {/* AI action buttons */}
      <div className="toolbar-btns">
        <button
          className={popup?.action === "rephrase" ? "active" : ""}
          onClick={handleRephrase}
          title="Rephrase selected text"
        >
          <RephraseIcon /> Rephrase
        </button>
        <button
          className={popup?.action === "summarize" ? "active" : ""}
          onClick={handleSummarize}
          title="Summarize selected text"
        >
          <SummarizeIcon /> Summarize
        </button>
        <button
          className={chatOpen ? "active" : ""}
          onClick={handleAskAi}
          title="Ask AI about selected text"
        >
          <RiRobot2Line /> Ask AI
        </button>
      </div>

      {/* Streaming result popup */}
      {popup && (
        <AiPopup
          title={popup.title}
          result={popup.result}
          isLoading={popup.isLoading}
          error={popup.error}
          onClose={handleClose}
          onReplace={handleReplace}
          onRetry={handleRetry}
        />
      )}

      {/* Chat popup */}
      {chatOpen && chatSessionRef.current && (
        <ChatPopup
          session={chatSessionRef.current}
          initialContext={chatContext}
          onClose={handleChatClose}
        />
      )}
    </div>
  );
}
