// ─── NoteEditor ───────────────────────────────────────────────────────────────
// One BlockNote editor instance per open tab.
// Loads note content from IndexedDB on mount and auto-saves on every change.

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import {
  BlockNoteSchema,
  createCodeBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import {
  useCreateBlockNote,
  FormattingToolbarController,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { createHighlighter } from "shiki";
import { useEffect, useRef } from "react";

import { getRecord, putRecord } from "../../db/operations";
import { STORE_NOTES } from "../../db/stores";
import { Toolbar } from "../Toolbar/Toolbar";

// ── BlockNote schema with syntax-highlighted code blocks ──────────────────────

const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    codeBlock: createCodeBlockSpec({
      defaultLanguage: "typescript",
      supportedLanguages: {
        typescript: { name: "TypeScript", aliases: ["ts"] },
        javascript: { name: "JavaScript", aliases: ["js"] },
        python: { name: "Python", aliases: ["py"] },
        java: { name: "Java" },
      },
      createHighlighter: async () =>
        createHighlighter({
          themes: ["github-dark", "github-light"],
          langs: ["typescript", "javascript", "python", "java"],
        }),
    }),
  },
});

/** Auto-save debounce delay in milliseconds. */
const AUTO_SAVE_DELAY_MS = 800;

/**
 * @param {{
 *   noteId: string,
 *   theme: "dark" | "light",
 *   fileInputRef: React.RefObject,
 * }} props
 */
export function NoteEditor({ noteId, theme, fileInputRef }) {
  const editor = useCreateBlockNote({ schema: editorSchema });
  const hasLoadedRef = useRef(false);
  const autoSaveTimerRef = useRef(null);

  // ── Load note content from IndexedDB on mount ────────────────────────────

  useEffect(() => {
    let isCancelled = false;
    (async () => {
      const rawContent = await getRecord(STORE_NOTES, noteId);
      if (isCancelled || hasLoadedRef.current) return;
      hasLoadedRef.current = true;
      if (rawContent) {
        try {
          editor.replaceBlocks(editor.document, JSON.parse(rawContent));
        } catch {
          // Corrupt data — start with a blank document
        }
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, [noteId]);

  // ── Auto-save on content change (debounced) ──────────────────────────────

  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        putRecord(STORE_NOTES, noteId, JSON.stringify(editor.document));
      }, AUTO_SAVE_DELAY_MS);
    });
    return () => {
      unsubscribe?.();
      clearTimeout(autoSaveTimerRef.current);
    };
  }, [editor, noteId]);

  // ── Handle image file upload from the hidden input ───────────────────────

  const handleImageFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const lastBlock = editor.document[editor.document.length - 1];
      editor.insertBlocks(
        [{ type: "image", props: { url: reader.result } }],
        lastBlock,
        "after"
      );
    };
    reader.readAsDataURL(file);
  };

  // ────────────────────────────────────────────────────────────────────────

  return (
    <>
      <input
        type="file"
        hidden
        accept="image/*"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFileUpload(file);
          e.target.value = "";
        }}
      />
      <BlockNoteView
        editor={editor}
        theme={theme}
        formattingToolbar={false}
        editableProps={{
          spellCheck: false,
          autoCorrect: "off",
          autoCapitalize: "off",
        }}
      >
        <FormattingToolbarController
          formattingToolbar={() => (
            <Toolbar editor={editor} fileInputRef={fileInputRef} />
          )}
        />
      </BlockNoteView>
    </>
  );
}
