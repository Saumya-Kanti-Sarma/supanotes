// ─── App ──────────────────────────────────────────────────────────────────────
// Root component. Wires together the three custom hooks and renders the layout.
// All business logic lives in the hooks; this file is purely structural.

import { useEffect, useRef, useState } from "react";
import { RiAddLine, RiFileLine, RiMenuLine, RiCloseLine } from "react-icons/ri";

import { useNotes } from "./hooks/useNotes";
import { useTheme } from "./hooks/useTheme";
import { useTabs } from "./hooks/useTabs";

import { Sidebar } from "./components/Sidebar/Sidebar";
import { NoteEditor } from "./components/NoteEditor/NoteEditor";

import "./App.css";

export default function App() {
  const { theme, loadTheme, toggleTheme } = useTheme();

  const {
    notes,
    renamingId,
    renameValue,
    renameInputRef,
    loadNotes,
    createNote,
    deleteNote,
    startRename,
    commitRename,
    cancelRename,
    setRenameValue,
    getNoteTitle,
  } = useNotes();

  const {
    openTabIds,
    activeTabId,
    openTab,
    closeTab,
    setActiveTabId,
    removeTabsForDeletedNote,
  } = useTabs();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const fileInputRef = useRef(null);

  // ── Bootstrap: load persisted data on first render ───────────────────────

  useEffect(() => {
    (async () => {
      await loadTheme();
      const loadedNotes = await loadNotes();
      if (loadedNotes.length > 0) {
        openTab(loadedNotes[0].id);
      }
    })();
  }, []);

  // ── Create a new note and open it in a tab ───────────────────────────────

  const handleCreateNote = async () => {
    const newNoteId = await createNote();
    openTab(newNoteId);
  };

  // ── Delete a note and clean up its tab ───────────────────────────────────

  const handleDeleteNote = async (id, event) => {
    await deleteNote(id, event);
    removeTabsForDeletedNote(id);
  };

  // ── Open a note: focus its tab and close sidebar on mobile ───────────────

  const handleOpenNote = (id) => {
    openTab(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className={`app ${theme}`}>
      {/* ── Sidebar ── */}
      <Sidebar
        isOpen={isSidebarOpen}
        theme={theme}
        notes={notes}
        activeTabId={activeTabId}
        renamingId={renamingId}
        renameValue={renameValue}
        renameInputRef={renameInputRef}
        onOpenNote={handleOpenNote}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onStartRename={startRename}
        onCommitRename={commitRename}
        onCancelRename={cancelRename}
        onRenameValueChange={setRenameValue}
        onToggleTheme={toggleTheme}
      />

      {/* ── Main area ── */}
      <div className="main">
        {/* ── Top bar with sidebar toggle + tabs ── */}
        <div className="topbar">
          <button
            className="icon-btn menu-btn"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            title="Toggle sidebar"
          >
            {isSidebarOpen ? <RiCloseLine /> : <RiMenuLine />}
          </button>

          <div className="tabs">
            {openTabIds.map((id) => (
              <div
                key={id}
                className={`tab ${activeTabId === id ? "active" : ""}`}
                onClick={() => setActiveTabId(id)}
              >
                <RiFileLine className="tab-icon" />
                <span className="tab-name">{getNoteTitle(id)}</span>
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
          {activeTabId ? (
            openTabIds.map((id) => (
              <div
                key={id}
                className="editor-wrapper"
                style={{ display: id === activeTabId ? "block" : "none" }}
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
                <path
                  fill="#863bff"
                  opacity="0.4"
                  d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
                />
              </svg>
              <p>Open a note from the sidebar or create a new one.</p>
              <button className="btn-primary" onClick={handleCreateNote}>
                <RiAddLine /> New Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay — tap to close sidebar */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
