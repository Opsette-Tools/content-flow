// Device-local settings slice for bridge mode.
//
// Per BRIDGE_MIGRATION.md (lines 121-131, 181-183): theme, globalProjectFilter,
// recentItemIds, seeded, and the standalone-banner-dismissed flag all stay on
// the device. They are never synced to the parent — not in presets, not in any
// iframe_app_data row. Bridge mode reads/writes these via this module.
//
// Standalone mode keeps using IDB (settings store) as before. This module is
// only consulted when isBridgeMode() is true.

const KEY = "content-flow.device.v1";

export interface DeviceState {
  theme: "light" | "dark";
  globalProjectFilter: string | null;
  recentItemIds: string[];
  // seeded is not tracked in bridge mode — parent is truth, no local seeding.
  // standaloneBannerDismissed is a B5 concern.
}

const DEFAULT: DeviceState = {
  theme: "light",
  globalProjectFilter: null,
  recentItemIds: [],
};

function read(): DeviceState {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT };
    const merged: DeviceState = {
      theme: parsed.theme === "dark" ? "dark" : "light",
      globalProjectFilter:
        typeof parsed.globalProjectFilter === "string" ? parsed.globalProjectFilter : null,
      recentItemIds: Array.isArray(parsed.recentItemIds)
        ? parsed.recentItemIds.filter((x: unknown): x is string => typeof x === "string")
        : [],
    };
    return merged;
  } catch {
    return { ...DEFAULT };
  }
}

function write(state: DeviceState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function getDeviceState(): DeviceState {
  return read();
}

export function patchDeviceState(patch: Partial<DeviceState>): DeviceState {
  const next = { ...read(), ...patch };
  write(next);
  return next;
}
