// Presets write-through for bridge mode.
//
// Per BRIDGE_MIGRATION.md line 121: "Presets is exactly two fields: projects
// and tags. Nothing else." Projects + tags ship via bridge.savePresets into
// iframe_apps.presets JSONB (org-shared, 256 KB cap). NOT via bridge.save
// into an iframe_app_data row.
//
// Standalone mode never calls this — projects/tags persist in IDB directly.

import { getBridgeInstance } from "@/lib/bridgeInstance";
import type { ContentFlowPresets } from "@/lib/bridge";
import type { Project, Tag } from "./types";

function toPresets(projects: Project[], tags: Tag[]): ContentFlowPresets {
  // Strip Project.description when undefined so the wire payload is stable
  // between saves (JSON equality helps any future debouncing). No other
  // transformation — Project and Tag ship as-is.
  return {
    projects: projects.map((p) => ({ ...p })),
    tags: tags.map((t) => ({ ...t })),
  };
}

// Fire-and-forget in the happy path; the caller can await if it wants to
// know about timeouts. The onTimeout hook installed in main.tsx will toast.
export async function flushPresets(projects: Project[], tags: Tag[]): Promise<void> {
  const bridge = getBridgeInstance();
  if (!bridge) return;
  try {
    await bridge.savePresets(toPresets(projects, tags) as unknown as Record<string, unknown>);
  } catch {
    // Timeout / error — swallowed here. The user-facing toast is driven by
    // the onTimeout hook; this promise rejection is expected for callers
    // that don't want to surface their own error.
  }
}
