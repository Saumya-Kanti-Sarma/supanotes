// ─── useTheme ─────────────────────────────────────────────────────────────────
// Manages the active colour theme ("dark" | "light"), loads the saved preference
// from IndexedDB on mount, and persists every toggle back to the DB.
// Applies the theme class directly to <html> so CSS variables are available
// globally — including inside portals rendered outside the app root.

import { useState, useCallback, useEffect } from "react";
import { getRecord, putRecord } from "../db/operations";
import { STORE_META } from "../db/stores";

/** @typedef {"dark" | "light"} Theme */

/** Syncs the theme class on <html> whenever the theme value changes. */
function applyThemeToHtml(theme) {
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(theme);
}

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

  // Keep <html> class in sync whenever theme state changes
  useEffect(() => {
    applyThemeToHtml(theme);
  }, [theme]);

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
