// ─── useTabs ──────────────────────────────────────────────────────────────────
// Manages the list of open editor tabs and which one is currently active.
// Tabs are identified by note id strings.

import { useState, useCallback } from "react";

/**
 * Provides open-tab state and actions for opening, closing, and switching tabs.
 *
 * @returns {{
 *   openTabIds: string[],
 *   activeTabId: string | null,
 *   openTab: (id: string) => void,
 *   closeTab: (id: string, event: React.MouseEvent) => void,
 *   setActiveTabId: React.Dispatch<React.SetStateAction<string | null>>,
 *   removeTabsForDeletedNote: (deletedId: string) => void,
 * }}
 */
export function useTabs() {
  const [openTabIds, setOpenTabIds] = useState([]); // ordered list of open tab ids
  const [activeTabId, setActiveTabId] = useState(null);

  // ── Open a tab (or just focus it if already open) ────────────────────────

  const openTab = useCallback(
    (id) => {
      setOpenTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setActiveTabId(id);
    },
    []
  );

  // ── Close a tab and move focus to the nearest remaining tab ──────────────

  const closeTab = useCallback(
    (id, event) => {
      event.stopPropagation();
      setOpenTabIds((prev) => {
        const index = prev.indexOf(id);
        const remaining = prev.filter((tabId) => tabId !== id);
        setActiveTabId((currentActive) => {
          if (currentActive !== id) return currentActive;
          // Focus the tab to the left, or the new last tab, or null
          return remaining[Math.max(0, index - 1)] ?? null;
        });
        return remaining;
      });
    },
    []
  );

  // ── Remove tabs when a note is deleted from the sidebar ──────────────────

  const removeTabsForDeletedNote = useCallback((deletedId) => {
    setOpenTabIds((prev) => {
      const index = prev.indexOf(deletedId);
      const remaining = prev.filter((tabId) => tabId !== deletedId);
      setActiveTabId((currentActive) => {
        if (currentActive !== deletedId) return currentActive;
        return remaining[Math.max(0, index - 1)] ?? null;
      });
      return remaining;
    });
  }, []);

  return {
    openTabIds,
    activeTabId,
    openTab,
    closeTab,
    setActiveTabId,
    removeTabsForDeletedNote,
  };
}
