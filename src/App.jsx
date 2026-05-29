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

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";

import {
  RiAddLine,
  RiDeleteBinLine,
  RiSunLine,
  RiMoonLine,
  RiFileLine,
  RiMenuLine,
  RiCloseLine,
  RiBold,
  RiItalic,
  RiUnderline,
  RiStrikethrough,
  RiListUnordered,
  RiLinkM,
  RiImageLine,
  RiClipboardLine,
  RiFileCopyLine,
  RiCheckLine,
  RiPencilLine,
} from "react-icons/ri";

import "./App.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const DB_NAME = "SupaNotesDB";
const STORE_NOTES = "notes";
const STORE_META = "meta";
const DB_VERSION = 2;

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        db.createObjectStore(STORE_NOTES);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store, key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── BlockNote schema (shared, stable) ───────────────────────────────────────

const schema = BlockNoteSchema.create({
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

// ─── NoteEditor ───────────────────────────────────────────────────────────────
// One editor instance per open tab, mounted/unmounted as tabs switch.

function NoteEditor({ noteId, theme, fileInputRef }) {
  const editor = useCreateBlockNote({ schema });
  const loadedRef = useRef(false);
  const saveTimerRef = useRef(null);

  // Load note content on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await dbGet(STORE_NOTES, noteId);
      if (cancelled || loadedRef.current) return;
      loadedRef.current = true;
      if (raw) {
        try {
          editor.replaceBlocks(editor.document, JSON.parse(raw));
        } catch {
          // corrupt data — start fresh
        }
      }
    })();
    return () => { cancelled = true; };
  }, [noteId]);

  // Auto-save on content change (debounced 800ms)
  useEffect(() => {
    const unsubscribe = editor.onChange(() => {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        dbPut(STORE_NOTES, noteId, JSON.stringify(editor.document));
      }, 800);
    });
    return () => {
      unsubscribe?.();
      clearTimeout(saveTimerRef.current);
    };
  }, [editor, noteId]);

  // ── Toolbar helpers ──────────────────────────────────────────────────────

  const toggleStyle = (key) => {
    const styles = editor.getActiveStyles();
    if (styles[key]) editor.removeStyles([key]);
    else editor.addStyles({ [key]: true });
  };

  const insertBullet = () => {
    const pos = editor.getTextCursorPosition();
    editor.insertBlocks(
      [{ type: "bulletListItem", content: "List item" }],
      pos.block,
      "after"
    );
  };

  const insertLink = () => {
    const url = prompt("Enter URL");
    if (!url) return;
    const text = editor.getSelectedText();
    editor.insertInlineContent([{ type: "link", href: url, content: text || url }]);
  };

  const insertImageURL = () => {
    const url = prompt("Enter image URL");
    if (!url) return;
    editor.insertBlocks(
      [{ type: "image", props: { url } }],
      editor.document[editor.document.length - 1],
      "after"
    );
  };

  const uploadImage = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      editor.insertBlocks(
        [{ type: "image", props: { url: reader.result } }],
        editor.document[editor.document.length - 1],
        "after"
      );
    };
    reader.readAsDataURL(file);
  };

  const copyAll = async () => {
    const text = await editor.blocksToMarkdownLossy(editor.document);
    await navigator.clipboard.writeText(text);
  };

  // ── Custom Toolbar ───────────────────────────────────────────────────────

  const CustomToolbar = () => (
    <div className="custom-toolbar">
      <div className="toolbar-group">
        <button title="Bold" onClick={() => toggleStyle("bold")}><RiBold /></button>
        <button title="Italic" onClick={() => toggleStyle("italic")}><RiItalic /></button>
        <button title="Underline" onClick={() => toggleStyle("underline")}><RiUnderline /></button>
        <button title="Strikethrough" onClick={() => toggleStyle("strike")}><RiStrikethrough /></button>
        <div className="toolbar-divider" />
        <button title="Bullet list" onClick={insertBullet}><RiListUnordered /></button>
        <button title="Insert link" onClick={insertLink}><RiLinkM /></button>
        <div className="toolbar-divider" />
        <button title="Upload image" onClick={() => fileInputRef.current?.click()}><RiImageLine /></button>
        <button title="Image from URL" onClick={insertImageURL} className="btn-text">IMG URL</button>
        <div className="toolbar-divider" />
        <button
          title="Copy selection"
          onClick={async () => {
            const text = editor.getSelectedText();
            await navigator.clipboard.writeText(text);
          }}
        >
          <RiClipboardLine />
        </button>
        <button title="Copy all as markdown" onClick={copyAll}><RiFileCopyLine /></button>
      </div>
    </div>
  );

  return (
    <>
      <input
        type="file"
        hidden
        accept="image/*"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file);
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
        <FormattingToolbarController formattingToolbar={() => <CustomToolbar />} />
      </BlockNoteView>
    </>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [files, setFiles] = useState([]); // [{ id, name }]
  const [openTabs, setOpenTabs] = useState([]); // [id]
  const [activeTab, setActiveTab] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef(null);
  const renameInputRef = useRef(null);

  // ── Load file list from IndexedDB on mount ─────────────────────────────

  useEffect(() => {
    (async () => {
      const raw = await dbGet(STORE_META, "files");
      const themeRaw = await dbGet(STORE_META, "theme");
      if (themeRaw) setTheme(themeRaw);

      if (raw) {
        const parsed = JSON.parse(raw);
        setFiles(parsed);
        if (parsed.length > 0) {
          setOpenTabs([parsed[0].id]);
          setActiveTab(parsed[0].id);
        }
      } else {
        // First launch — create a welcome note
        const id = crypto.randomUUID();
        const initial = [{ id, name: "Welcome" }];
        setFiles(initial);
        setOpenTabs([id]);
        setActiveTab(id);
        await dbPut(STORE_META, "files", JSON.stringify(initial));
      }
    })();
  }, []);

  // ── Persist file list whenever it changes ─────────────────────────────

  const persistFiles = useCallback(async (list) => {
    await dbPut(STORE_META, "files", JSON.stringify(list));
  }, []);

  // ── Create new file ────────────────────────────────────────────────────

  const createFile = async () => {
    const id = crypto.randomUUID();
    const name = `Note ${files.length + 1}`;
    const updated = [...files, { id, name }];
    setFiles(updated);
    await persistFiles(updated);
    openTab(id);
  };

  // ── Open a tab ─────────────────────────────────────────────────────────

  const openTab = (id) => {
    if (!openTabs.includes(id)) {
      setOpenTabs((prev) => [...prev, id]);
    }
    setActiveTab(id);
    // On mobile, close sidebar after opening a file
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  // ── Close a tab ────────────────────────────────────────────────────────

  const closeTab = (id, e) => {
    e.stopPropagation();
    const idx = openTabs.indexOf(id);
    const newTabs = openTabs.filter((t) => t !== id);
    setOpenTabs(newTabs);
    if (activeTab === id) {
      setActiveTab(newTabs[Math.max(0, idx - 1)] ?? null);
    }
  };

  // ── Delete a file ──────────────────────────────────────────────────────

  const deleteFile = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this note?")) return;
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    await persistFiles(updated);
    await dbDelete(STORE_NOTES, id);
    const newTabs = openTabs.filter((t) => t !== id);
    setOpenTabs(newTabs);
    if (activeTab === id) {
      setActiveTab(newTabs[newTabs.length - 1] ?? null);
    }
  };

  // ── Rename ─────────────────────────────────────────────────────────────

  const startRename = (id, currentName, e) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentName);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const commitRename = async () => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const updated = files.map((f) =>
      f.id === renamingId ? { ...f, name: renameValue.trim() } : f
    );
    setFiles(updated);
    await persistFiles(updated);
    setRenamingId(null);
  };

  // ── Theme ──────────────────────────────────────────────────────────────

  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await dbPut(STORE_META, "theme", next);
  };

  // ── Helpers ────────────────────────────────────────────────────────────

  const getFileName = (id) => files.find((f) => f.id === id)?.name ?? "Untitled";

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={`app ${theme}`}>
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="18" height="18" viewBox="0 0 48 46" fill="none">
              <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" />
            </svg>
            <span className="sidebar-title">supa notes</span>
          </div>
          <div className="sidebar-actions">
            <button className="icon-btn" title="New note" onClick={createFile}>
              <RiAddLine />
            </button>
            <button className="icon-btn" title="Toggle theme" onClick={toggleTheme}>
              {theme === "dark" ? <RiSunLine /> : <RiMoonLine />}
            </button>
          </div>
        </div>

        <div className="file-list">
          {files.length === 0 && (
            <p className="empty-hint">No notes yet. Hit + to create one.</p>
          )}
          {files.map((file) => (
            <div
              key={file.id}
              className={`file-item ${activeTab === file.id ? "active" : ""}`}
              onClick={() => openTab(file.id)}
            >
              <RiFileLine className="file-icon" />
              {renamingId === file.id ? (
                <input
                  ref={renameInputRef}
                  className="rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="file-name">{file.name}</span>
              )}
              <div className="file-actions">
                <button
                  className="icon-btn small"
                  title="Rename"
                  onClick={(e) => startRename(file.id, file.name, e)}
                >
                  <RiPencilLine />
                </button>
                <button
                  className="icon-btn small danger"
                  title="Delete"
                  onClick={(e) => deleteFile(file.id, e)}
                >
                  <RiDeleteBinLine />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="main">
        {/* ── Top bar ── */}
        <div className="topbar">
          <button
            className="icon-btn menu-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            title="Toggle sidebar"
          >
            {sidebarOpen ? <RiCloseLine /> : <RiMenuLine />}
          </button>

          {/* Tabs */}
          <div className="tabs">
            {openTabs.map((id) => (
              <div
                key={id}
                className={`tab ${activeTab === id ? "active" : ""}`}
                onClick={() => setActiveTab(id)}
              >
                <RiFileLine className="tab-icon" />
                <span className="tab-name">{getFileName(id)}</span>
                <button
                  className="tab-close"
                  onClick={(e) => closeTab(id, e)}
                  title="Close tab"
                >
                  <RiCloseLine />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Editor pane ── */}
        <div className="editor-pane">
          {activeTab ? (
            openTabs.map((id) => (
              <div
                key={id}
                className="editor-wrapper"
                style={{ display: id === activeTab ? "block" : "none" }}
              >
                <NoteEditor
                  noteId={id}
                  theme={theme}
                  fileInputRef={fileInputRef}
                />
              </div>
            ))
          ) : (
            <div className="empty-state">
              <svg width="48" height="46" viewBox="0 0 48 46" fill="none">
                <path fill="#863bff" opacity="0.4" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" />
              </svg>
              <p>Open a note from the sidebar or create a new one.</p>
              <button className="btn-primary" onClick={createFile}>
                <RiAddLine /> New Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay to close sidebar */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
