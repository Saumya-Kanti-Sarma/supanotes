// ─── Toolbar ──────────────────────────────────────────────────────────────────
// Custom formatting toolbar rendered inside BlockNote's FormattingToolbarController.
// Receives the editor instance and a ref for the hidden file-upload input.

import {
  RiBold,
  RiItalic,
  RiUnderline,
  RiStrikethrough,
  RiListUnordered,
  RiLinkM,
  RiImageLine,
  RiClipboardLine,
  RiFileCopyLine,
} from "react-icons/ri";

/**
 * @param {{ editor: import("@blocknote/core").BlockNoteEditor, fileInputRef: React.RefObject }} props
 */
export function Toolbar({ editor, fileInputRef }) {
  // ── Inline style helpers ─────────────────────────────────────────────────

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

  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="custom-toolbar">
      <div className="toolbar-group">
        {/* Text formatting */}
        <button title="Bold" onClick={() => toggleInlineStyle("bold")}>
          <RiBold />
        </button>
        <button title="Italic" onClick={() => toggleInlineStyle("italic")}>
          <RiItalic />
        </button>
        <button title="Underline" onClick={() => toggleInlineStyle("underline")}>
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
    </div>
  );
}
