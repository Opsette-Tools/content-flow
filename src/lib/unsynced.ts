import type { ContentItem } from "@/db/types";

const IDS_KEY = "content-flow.unsynced.v1";
const RECORDS_KEY = "content-flow.unsyncedRecords.v1";

function readIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((x): x is string => typeof x === "string"));
    }
  } catch {
    // ignore parse / storage errors
  }
  return new Set();
}

function writeIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore parse / storage errors
  }
}

function readRecords(): Record<string, ContentItem> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, ContentItem>;
    }
  } catch {
    // ignore parse / storage errors
  }
  return {};
}

function writeRecords(map: Record<string, ContentItem>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(map));
  } catch {
    // ignore parse / storage errors
  }
}

export function markUnsynced(item: ContentItem): void {
  const ids = readIds();
  ids.add(item.id);
  writeIds(ids);
  const records = readRecords();
  records[item.id] = item;
  writeRecords(records);
}

// Used by B3 when a bridge ack lands. Not called from B1.
export function clearUnsynced(id: string): void {
  const ids = readIds();
  if (ids.delete(id)) writeIds(ids);
  const records = readRecords();
  if (id in records) {
    delete records[id];
    writeRecords(records);
  }
}

export function getUnsyncedIds(): Set<string> {
  return readIds();
}

export function getUnsyncedRecord(id: string): ContentItem | undefined {
  return readRecords()[id];
}

export function getAllUnsyncedRecords(): Record<string, ContentItem> {
  return readRecords();
}
