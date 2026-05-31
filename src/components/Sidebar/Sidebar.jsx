// ─── Sidebar ──────────────────────────────────────────────────────────────────
// Displays the note list with create, rename, and delete actions.
// All state and logic come from the parent via props (driven by useNotes / useTheme).

import {
  RiAddLine,
  RiDeleteBinLine,
  RiSunLine,
  RiMoonLine,
  RiPencilLine,
} from "react-icons/ri";
import "./Sidebar.css";

/**
 * @param {{
 *   isOpen: boolean,
 *   theme: "dark" | "light",
 *   notes: Array<{ id: string, name: string }>,
 *   activeTabId: string | null,
 *   renamingId: string | null,
 *   renameValue: string,
 *   renameInputRef: React.RefObject,
 *   onOpenNote: (id: string) => void,
 *   onCreateNote: () => void,
 *   onDeleteNote: (id: string, event: React.MouseEvent) => void,
 *   onStartRename: (id: string, name: string, event: React.MouseEvent) => void,
 *   onCommitRename: () => void,
 *   onCancelRename: () => void,
 *   onRenameValueChange: (value: string) => void,
 *   onToggleTheme: () => void,
 * }} props
 */
export function Sidebar({
  isOpen,
  theme,
  notes,
  activeTabId,
  renamingId,
  renameValue,
  renameInputRef,
  onOpenNote,
  onCreateNote,
  onDeleteNote,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onRenameValueChange,
  onToggleTheme,
}) {

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      {/* ── Header ── */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={theme === "dark" ? "/favicon.svg" : "/favicon-white.svg"} alt="" />
          <span className="sidebar-title">supa notes</span>
        </div>

        <div className="sidebar-actions">
          <button className="icon-btn" title="New note" onClick={onCreateNote}>
            <RiAddLine />
          </button>
          <button className="icon-btn" title="Toggle theme" onClick={onToggleTheme}>
            {theme === "dark" ? <RiSunLine /> : <RiMoonLine />}
          </button>
        </div>
      </div>

      {/* ── Note list ── */}
      <div className="file-list">
        {notes.length === 0 && (
          <p className="empty-hint">No notes yet. Hit + to create one.</p>
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className={`file-item ${activeTabId === note.id ? "active" : ""}`}
            onClick={() => onOpenNote(note.id)}
            tabIndex={0}
            onKeyDown={(e) => {
              console.log(e.key);
              if (e.key === 'F2') onStartRename(note.id, note.name, e);
              if (e.key === 'Delete') onDeleteNote(note.id, e);
            }}
          >
            <img src="/note.svg" height={16} />

            {renamingId === note.id ? (
              <input
                ref={renameInputRef}
                className="rename-input"
                value={renameValue}
                onChange={(e) => onRenameValueChange(e.target.value)}
                onBlur={onCommitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCommitRename();
                  if (e.key === "Escape") onCancelRename();
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="file-name">{note.name}</span>
            )}

            <div className="file-actions">
              <button
                className="icon-btn small"
                title="Rename (f2)"
                onClick={(e) => onStartRename(note.id, note.name, e)}
              >
                <RiPencilLine />
              </button>
              <button
                className="icon-btn small danger"
                title="Delete (Del)"
                onClick={(e) => onDeleteNote(note.id, e)}
              >
                <RiDeleteBinLine />
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
