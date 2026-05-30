// ─── AiPopup ──────────────────────────────────────────────────────────────────
// Floating popup that streams AI-generated text (rephrase / summarize).
// Rendered via a React portal so it escapes BlockNote's overflow:hidden containers.
// Shows a skeleton loader while waiting for the first chunk, then streams text in.

import { createPortal } from "react-dom";
import { RiCloseLine, RiFileCopyLine, RiCheckLine, RiRefreshLine } from "react-icons/ri";
import { useState, useEffect, useRef } from "react";
import "./AiPopup.css";

/**
 * @param {{
 *   title: string,
 *   result: string,
 *   isLoading: boolean,
 *   error: string | null,
 *   onClose: () => void,
 *   onReplace: () => void,
 *   onRetry: () => void,
 * }} props
 */
export function AiPopup({ title, result, isLoading, error, onClose, onReplace, onRetry }) {
  const [copied, setCopied] = useState(false);
  const popupRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // True skeleton: no chunks received yet and still loading
  const showSkeleton = isLoading && result.length === 0;

  const popup = (
    <div className="ai-popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ai-popup" ref={popupRef} role="dialog" aria-label={title}>

        {/* ── Header ── */}
        <div className="ai-popup__header">
          <div className="ai-popup__title-row">
            {isLoading && <span className="ai-popup__spinner" />}
            <span className="ai-popup__title">{title}</span>
          </div>
          <div className="ai-popup__header-actions">
            {!isLoading && (
              <button className="ai-popup__icon-btn" title="Retry" onClick={onRetry}>
                <RiRefreshLine />
              </button>
            )}
            <button className="ai-popup__icon-btn" title="Close (Esc)" onClick={onClose}>
              <RiCloseLine />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="ai-popup__body">
          {error ? (
            <p className="ai-popup__error">{error}</p>
          ) : showSkeleton ? (
            // Skeleton lines while waiting for first chunk
            <div className="ai-popup__skeleton">
              <div className="ai-popup__skeleton-line" style={{ width: "92%" }} />
              <div className="ai-popup__skeleton-line" style={{ width: "78%" }} />
              <div className="ai-popup__skeleton-line" style={{ width: "85%" }} />
              <div className="ai-popup__skeleton-line" style={{ width: "60%" }} />
            </div>
          ) : (
            <p className="ai-popup__text">
              {result}
              {isLoading && <span className="ai-popup__cursor" />}
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        {!isLoading && !error && result && (
          <div className="ai-popup__footer">
            <button className="ai-popup__btn" onClick={handleCopy}>
              {copied ? <RiCheckLine /> : <RiFileCopyLine />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button className="ai-popup__btn ai-popup__btn--primary" onClick={onReplace}>
              Replace selection
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(popup, document.body);
}
