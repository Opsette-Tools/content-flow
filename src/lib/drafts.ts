import type { ContentItem } from "@/db/types";

const KEY = "content-flow.drafts.v1";

type DraftMap = Record<string, Partial<ContentItem>>;

function readAll(): DraftMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as DraftMap;
    }
  } catch {
    // ignore parse / storage errors
  }
  return {};
}

function writeAll(map: DraftMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore parse / storage errors
  }
}

export function getDraft(id: string): Partial<ContentItem> | undefined {
  const all = readAll();
  return all[id];
}

export function setDraft(id: string, patch: Partial<ContentItem>): void {
  const all = readAll();
  all[id] = patch;
  writeAll(all);
}

export function clearDraft(id: string): void {
  const all = readAll();
  if (!(id in all)) return;
  delete all[id];
  writeAll(all);
}

export function getAllDrafts(): DraftMap {
  return readAll();
}
