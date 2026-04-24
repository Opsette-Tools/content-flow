import { getDraft } from "./drafts";
// import { getUnsyncedIds } from "./unsynced"; // TODO: B3 activate once bridge exists

export function isItemDirty(id: string): boolean {
  const draft = getDraft(id);
  return draft !== undefined && Object.keys(draft).length > 0;
  // TODO: B3 — also consider getUnsyncedIds().has(id) once bridge is live.
  // Activating unsynced here in B1 would put a dot on every saved item, because
  // there's no bridge ack path to clear it. Drafts-only is the right B1 signal.
}
