// ─── useTheme ─────────────────────────────────────────────────────────────────
// Manages the active colour theme ("dark" | "light"), loads the saved preference
// from IndexedDB on mount, and persists every toggle back to the DB.

import { useState, useCallback } from "react";
import { getRecord, putRecord } from "../db/operations";
import { STORE_META } from "../db/stores";

/** @typedef {"dark" | "light"} Theme */

/**
 * Provides theme state and a toggle action.
 *
 * @returns {{
 *   theme: Theme,
 *   loadTheme: () => Promise<void>,
 *   toggleTheme: () => Promise<void>,
 * }}
 */
export function useTheme() {
  const [theme, setTheme] = useState(/** @type {Theme} */("dark"));

  // ── Load saved theme from IndexedDB (call once on mount) ─────────────────

  const loadTheme = useCallback(async () => {
    const savedTheme = await getRecord(STORE_META, "theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
  }, []);

  // ── Toggle between dark and light, then persist ──────────────────────────

  const toggleTheme = useCallback(async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    await putRecord(STORE_META, "theme", nextTheme);
  }, [theme]);

  return { theme, loadTheme, toggleTheme };
}
