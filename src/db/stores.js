// ─── IndexedDB configuration ──────────────────────────────────────────────────
// Central place for all database and store name constants.
// Values are pulled from Vite env vars so they can differ per environment.

export const DB_NAME = import.meta.env.VITE_DB_NAME ?? "SupaNotesDB";
export const DB_VERSION = Number(import.meta.env.VITE_DB_VERSION ?? 2);

/** Object store that holds serialised BlockNote document content, keyed by note id. */
export const STORE_NOTES = import.meta.env.VITE_STORE_NOTES ?? "notes";

/** Object store that holds app-level metadata (file list, theme preference). */
export const STORE_META = import.meta.env.VITE_STORE_META ?? "meta";
