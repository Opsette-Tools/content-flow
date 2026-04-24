import { contentRepo } from "@/db";
import { clearDraft, getAllDrafts } from "./drafts";

// One-shot cleanup of drafts whose id no longer maps to an IDB item.
// Does NOT touch content-flow.unsyncedRecords.v1 — B3 needs those to survive
// even when the parent has never seen the id.
export async function pruneOrphanDrafts(): Promise<void> {
  try {
    const draftIds = Object.keys(getAllDrafts());
    if (draftIds.length === 0) return;
    const items = await contentRepo.list();
    const valid = new Set(items.map((i) => i.id));
    for (const id of draftIds) {
      if (!valid.has(id)) clearDraft(id);
    }
  } catch {
    // Non-fatal: drafts cleanup is best-effort.
  }
}
