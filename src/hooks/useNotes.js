// ─── useNotes ─────────────────────────────────────────────────────────────────
// Manages the full list of notes: loading from IndexedDB on mount, creating,
// deleting, and renaming notes, and persisting every change back to the DB.

import { useState, useCallback, useRef } from "react";
import { getRecord, putRecord, deleteRecord } from "../db/operations";
import { STORE_META, STORE_NOTES } from "../db/stores";

/**
 * @typedef {{ id: string, name: string }} NoteEntry
 */

/**
 * Provides note list state and all CRUD operations.
 * Persistence is handled internally — callers just call the returned actions.
 *
 * @returns {{
 *   notes: NoteEntry[],
 *   renamingId: string | null,
 *   renameValue: string,
 *   renameInputRef: React.RefObject,
 *   loadNotes: () => Promise<NoteEntry[]>,
 *   createNote: () => Promise<string>,
 *   deleteNote: (id: string, event: React.MouseEvent) => Promise<void>,
 *   startRename: (id: string, currentName: string, event: React.MouseEvent) => void,
 *   commitRename: () => Promise<void>,
 *   cancelRename: () => void,
 *   setRenameValue: (value: string) => void,
 *   getNoteTitle: (id: string) => string,
 * }}
 */
export function useNotes() {
  const [notes, setNotes] = useState([]); // [{ id, name }]
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef(null);

  // ── Persist the note list to IndexedDB ──────────────────────────────────

  const persistNoteList = useCallback(async (noteList) => {
    await putRecord(STORE_META, "files", JSON.stringify(noteList));
  }, []);

  // ── Load notes from IndexedDB (call once on mount) ───────────────────────

  const loadNotes = useCallback(async () => {
    const raw = await getRecord(STORE_META, "files");
    if (raw) {
      const parsed = JSON.parse(raw);
      setNotes(parsed);
      return parsed;
    }
    // First launch — seed a welcome note
    const welcomeId = crypto.randomUUID();
    const initialNotes = [{ id: welcomeId, name: "Welcome" }];
    setNotes(initialNotes);
    await persistNoteList(initialNotes);
    return initialNotes;
  }, [persistNoteList]);

  // ── Create a new note ────────────────────────────────────────────────────

  const createNote = useCallback(async () => {
    const id = crypto.randomUUID();
    const name = `Note ${notes.length + 1}`;
    const updatedNotes = [...notes, { id, name }];
    setNotes(updatedNotes);
    await persistNoteList(updatedNotes);
    return id;
  }, [notes, persistNoteList]);

  // ── Delete a note ────────────────────────────────────────────────────────

  const deleteNote = useCallback(
    async (id, event) => {
      event.stopPropagation();
      if (!confirm("Delete this note?")) return;
      const updatedNotes = notes.filter((note) => note.id !== id);
      setNotes(updatedNotes);
      await persistNoteList(updatedNotes);
      await deleteRecord(STORE_NOTES, id);
    },
    [notes, persistNoteList]
  );

  // ── Start inline rename ──────────────────────────────────────────────────

  const startRename = useCallback((id, currentName, event) => {
    event.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentName);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  }, []);

  // ── Commit the rename ────────────────────────────────────────────────────

  const commitRename = useCallback(async () => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const updatedNotes = notes.map((note) =>
      note.id === renamingId ? { ...note, name: renameValue.trim() } : note
    );
    setNotes(updatedNotes);
    await persistNoteList(updatedNotes);
    setRenamingId(null);
  }, [renameValue, notes, renamingId, persistNoteList]);

  // ── Cancel rename without saving ────────────────────────────────────────

  const cancelRename = useCallback(() => {
    setRenamingId(null);
  }, []);

  // ── Utility: get a note's display title by id ────────────────────────────

  const getNoteTitle = useCallback(
    (id) => notes.find((note) => note.id === id)?.name ?? "Untitled",
    [notes]
  );

  return {
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
  };
}
