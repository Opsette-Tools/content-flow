import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useContent } from "@/hooks/useContent";
import { useProjects } from "@/hooks/useProjects";
import { useTags } from "@/hooks/useTags";
import { useSettings } from "@/hooks/useSettings";
import ContentEditorDrawer from "@/components/ContentEditorDrawer";
import CommandPalette from "@/components/CommandPalette";

export type PaletteMode = "navigation" | "capture";

interface AppCommandsValue {
  openEditor: (itemId: string | null) => void;
  openPalette: (mode?: PaletteMode) => void;
  focusSearchRef: React.MutableRefObject<(() => void) | null>;
  // Derived, but exposed for the Recent sidebar section
  recentItemIds: string[];
}

const AppCommandsContext = createContext<AppCommandsValue | null>(null);

export function useAppCommands() {
  const ctx = useContext(AppCommandsContext);
  if (!ctx) throw new Error("useAppCommands must be used within AppCommandsProvider");
  return ctx;
}

export function AppCommandsProvider({ children }: { children: ReactNode }) {
  const { items, refresh: refreshContent } = useContent();
  const { projects, refresh: refreshProjects } = useProjects();
  const { tags, refresh: refreshTags } = useTags();
  const { settings } = useSettings();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<PaletteMode>("navigation");

  // Shared ref: ContentList registers a function here to focus its search input
  const focusSearchRef = useRef<(() => void) | null>(null);

  const openEditor = useCallback((itemId: string | null) => {
    setEditId(itemId);
    setEditorOpen(true);
  }, []);

  const openPalette = useCallback((mode: PaletteMode = "navigation") => {
    setPaletteMode(mode);
    setPaletteOpen(true);
  }, []);

  const handleChanged = useCallback(() => {
    refreshContent();
    refreshProjects();
    refreshTags();
  }, [refreshContent, refreshProjects, refreshTags]);

  const value = useMemo<AppCommandsValue>(
    () => ({
      openEditor,
      openPalette,
      focusSearchRef,
      recentItemIds: settings?.recentItemIds ?? [],
    }),
    [openEditor, openPalette, settings?.recentItemIds],
  );

  return (
    <AppCommandsContext.Provider value={value}>
      {children}

      <CommandPalette
        open={paletteOpen}
        mode={paletteMode}
        onMode={setPaletteMode}
        onClose={() => setPaletteOpen(false)}
        items={items}
        projects={projects}
        onOpenItem={(id) => {
          setPaletteOpen(false);
          openEditor(id);
        }}
        onNewItem={() => openEditor(null)}
        onCreatedItem={() => {
          setPaletteOpen(false);
          handleChanged();
        }}
      />

      <ContentEditorDrawer
        open={editorOpen}
        itemId={editId}
        projects={projects}
        tags={tags}
        onClose={() => setEditorOpen(false)}
        onChanged={handleChanged}
      />
    </AppCommandsContext.Provider>
  );
}
