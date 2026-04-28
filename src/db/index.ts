import { openDB, type IDBPDatabase } from "idb";
import type { AppSettings, ContentItem, Medium, Project, Tag } from "./types";
import { DEFAULT_CHECKLIST, TAG_COLORS } from "./types";
import {
  getBridgeInstance,
  isBridgeMode,
  isParentKnown,
  markParentKnown,
  forgetParentKnown,
  resetParentKnown,
} from "@/lib/bridgeInstance";
import type { Bridge } from "@/lib/bridge";
import { clearDraft } from "@/lib/drafts";
import { clearUnsynced, getAllUnsyncedRecords, markUnsynced } from "@/lib/unsynced";
import { getDeviceState, isMigrated, markMigrated, patchDeviceState } from "@/lib/device";
import { flushPresets } from "./presetsRepo";

const DB_NAME = "content-planner";
const DB_VERSION = 3;
const RECENT_ITEMS_MAX = 8;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains("projects")) {
          db.createObjectStore("projects", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("content")) {
          const s = db.createObjectStore("content", { keyPath: "id" });
          s.createIndex("projectId", "projectId");
          s.createIndex("publishDate", "publishDate");
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("tags")) {
          db.createObjectStore("tags", { keyPath: "id" });
        }
        // Migrate existing content rows from v1 -> v2: add medium, funnelStage, tags
        if (oldVersion < 2 && db.objectStoreNames.contains("content")) {
          const store = tx.objectStore("content");
          store.openCursor().then(async function next(cursor) {
            if (!cursor) return;
            const v = cursor.value as Partial<ContentItem> & {
              contentType?: string;
            };
            if (!v.medium) {
              v.medium = mapTypeToMedium(v.contentType);
            }
            if (!v.funnelStage) v.funnelStage = "None";
            if (!Array.isArray(v.tags)) v.tags = [];
            await cursor.update(v);
            const nextCursor = await cursor.continue();
            return next(nextCursor);
          });
        }
        // v2 -> v3: add recentItemIds to settings
        if (oldVersion < 3 && db.objectStoreNames.contains("settings")) {
          const store = tx.objectStore("settings");
          store.get("app").then(async (existing) => {
            if (existing && !Array.isArray((existing as AppSettings).recentItemIds)) {
              await store.put({ ...existing, recentItemIds: [] });
            }
          });
        }
      },
    });
  }
  return dbPromise;
}

function mapTypeToMedium(t: string | undefined): Medium {
  switch (t) {
    case "Article":
      return "Article";
    case "Guide":
      return "Guide";
    case "Landing Page":
      return "Landing Page";
    case "Update":
      return "Article";
    case "Resource":
      return "Guide";
    case "FAQ":
      return "Article";
    default:
      return "Other";
  }
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const now = () => Date.now();

// Helper: read current projects + tags from IDB and fire bridge.savePresets.
// Cheap — both tables stay tiny (< 200 entries in practice). Called from
// every project/tag mutation in bridge mode.
async function flushPresetsFromIdb(): Promise<void> {
  if (!isBridgeMode()) return;
  const db = await getDb();
  const [projects, tags] = await Promise.all([
    db.getAll("projects") as Promise<Project[]>,
    db.getAll("tags") as Promise<Tag[]>,
  ]);
  await flushPresets(projects, tags);
}

export const projectsRepo = {
  async list(): Promise<Project[]> {
    const db = await getDb();
    const all = (await db.getAll("projects")) as Project[];
    return all.sort((a, b) => a.name.localeCompare(b.name));
  },
  async get(id: string): Promise<Project | undefined> {
    const db = await getDb();
    return (await db.get("projects", id)) as Project | undefined;
  },
  async create(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> {
    const db = await getDb();
    const project: Project = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
    await db.put("projects", project);
    await flushPresetsFromIdb();
    return project;
  },
  async update(id: string, patch: Partial<Project>): Promise<Project> {
    const db = await getDb();
    const existing = (await db.get("projects", id)) as Project;
    const updated = { ...existing, ...patch, id, updatedAt: now() };
    await db.put("projects", updated);
    await flushPresetsFromIdb();
    return updated;
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete("projects", id);
    // Detach content items locally + collect affected for bridge re-save.
    const items = (await db.getAll("content")) as ContentItem[];
    const tx = db.transaction("content", "readwrite");
    const affected: ContentItem[] = [];
    for (const it of items) {
      if (it.projectId === id) {
        const next = { ...it, projectId: null, updatedAt: now() };
        await tx.store.put(next);
        affected.push(next);
      }
    }
    await tx.done;
    // Presets flush + per-item saves fire in parallel in bridge mode.
    await Promise.allSettled([
      flushPresetsFromIdb(),
      ...affected.map((item) => persistItem(item)),
    ]);
  },
  // Used by hydrateFromBridge. Never call from UI.
  async putRaw(project: Project): Promise<void> {
    const db = await getDb();
    await db.put("projects", project);
  },
};

// Write-path for a content item. Marks unsynced locally FIRST (both modes),
// then in bridge mode fires bridge.save and clears the unsynced flag on ack.
// Standalone mode leaves the unsynced flag set — B3 has no bridge to ack it,
// but the B1 helpers predate this and still work fine (dirty-dot UI is
// drafts-driven, not unsynced-driven, per src/lib/dirty.ts).
async function persistItem(item: ContentItem): Promise<void> {
  markUnsynced(item);
  const bridge = getBridgeInstance();
  if (!bridge) return;
  try {
    await bridge.save(item.id, item);
    markParentKnown(item.id);
    clearDraft(item.id);
    clearUnsynced(item.id);
  } catch {
    // Timeout or parent error. Unsynced keys already hold the record; user
    // can retry. onTimeout hook in main.tsx surfaces the toast.
  }
}

export const contentRepo = {
  async list(): Promise<ContentItem[]> {
    const db = await getDb();
    const all = (await db.getAll("content")) as ContentItem[];
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async get(id: string): Promise<ContentItem | undefined> {
    const db = await getDb();
    return (await db.get("content", id)) as ContentItem | undefined;
  },
  async create(
    data: Partial<ContentItem> & { title: string },
  ): Promise<ContentItem> {
    const db = await getDb();
    const checklist: Record<string, boolean> = {};
    DEFAULT_CHECKLIST.forEach((label) => (checklist[label] = false));
    const item: ContentItem = {
      id: uid(),
      projectId: data.projectId ?? null,
      title: data.title,
      slugOrRoute: data.slugOrRoute ?? "",
      contentType: data.contentType ?? "Article",
      medium: data.medium ?? mapTypeToMedium(data.contentType ?? "Article"),
      funnelStage: data.funnelStage ?? "None",
      tags: data.tags ?? [],
      primaryKeyword: data.primaryKeyword ?? "",
      secondaryKeywords: data.secondaryKeywords ?? [],
      publishDate: data.publishDate ?? null,
      status: data.status ?? "Idea",
      briefNotes: data.briefNotes ?? "",
      targetWordCount: data.targetWordCount ?? null,
      draftUrl: data.draftUrl ?? null,
      publishedUrl: data.publishedUrl ?? null,
      checklist: data.checklist ?? checklist,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.put("content", item);
    await persistItem(item);
    return item;
  },
  async update(id: string, patch: Partial<ContentItem>): Promise<ContentItem> {
    const db = await getDb();
    const existing = (await db.get("content", id)) as ContentItem;
    const updated = { ...existing, ...patch, id, updatedAt: now() };
    await db.put("content", updated);
    await persistItem(updated);
    return updated;
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete("content", id);
    clearDraft(id);
    clearUnsynced(id);
    // Drop from recent-viewed list if present (in either storage layer)
    if (isBridgeMode()) {
      const dev = getDeviceState();
      if (dev.recentItemIds.includes(id)) {
        patchDeviceState({ recentItemIds: dev.recentItemIds.filter((x) => x !== id) });
      }
    } else {
      const s = (await db.get("settings", "app")) as AppSettings | undefined;
      if (s && Array.isArray(s.recentItemIds) && s.recentItemIds.includes(id)) {
        await db.put("settings", { ...s, recentItemIds: s.recentItemIds.filter((x) => x !== id) });
      }
    }
    // Bridge delete: only if the parent has ever heard of this id. Items
    // created and deleted within one bridge session without an ack are
    // unknown upstream — nothing to delete there.
    const bridge = getBridgeInstance();
    if (bridge && isParentKnown(id)) {
      forgetParentKnown(id);
      bridge.delete(id).catch(() => {
        // Optimistic UI already advanced. onTimeout surfaces the toast.
      });
    }
  },
  async restore(items: ContentItem[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction("content", "readwrite");
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
    // Bridge mode: each restored item re-fires save. Used by bulk-edit undo.
    const bridge = getBridgeInstance();
    if (bridge) {
      await Promise.allSettled(items.map((item) => persistItem(item)));
    }
  },
  async duplicate(id: string): Promise<ContentItem | undefined> {
    const db = await getDb();
    const existing = (await db.get("content", id)) as ContentItem | undefined;
    if (!existing) return undefined;
    const copy: ContentItem = {
      ...existing,
      id: uid(),
      title: `${existing.title} (copy)`,
      status: "Idea",
      createdAt: now(),
      updatedAt: now(),
    };
    await db.put("content", copy);
    await persistItem(copy);
    return copy;
  },
  // Used by hydrateFromBridge. Writes a single content row to IDB without
  // firing any bridge message. Never call from UI.
  async putRaw(item: ContentItem): Promise<void> {
    const db = await getDb();
    await db.put("content", item);
  },
};

const DEFAULT_SETTINGS: AppSettings = {
  id: "app",
  theme: "light",
  globalProjectFilter: null,
  seeded: false,
  recentItemIds: [],
};

// In bridge mode the settings row lives in content-flow.device.v1 localStorage.
// Per BRIDGE_MIGRATION.md lines 121-131: theme, globalProjectFilter,
// recentItemIds, seeded, and the banner-dismissed flag are device-local —
// they never ship to the parent via presets or any iframe_app_data row.
// `seeded` has no meaning in bridge mode (parent is truth, no auto-seed).
function settingsFromDevice(): AppSettings {
  const dev = getDeviceState();
  return {
    id: "app",
    theme: dev.theme,
    globalProjectFilter: dev.globalProjectFilter,
    seeded: true, // bridge mode treats the app as always "seeded" — no local seed
    recentItemIds: dev.recentItemIds,
  };
}

export const settingsRepo = {
  async get(): Promise<AppSettings> {
    if (isBridgeMode()) return settingsFromDevice();
    const db = await getDb();
    const s = (await db.get("settings", "app")) as AppSettings | undefined;
    if (!s) {
      await db.put("settings", DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
    // Self-heal for records predating v3
    if (!Array.isArray(s.recentItemIds)) {
      const patched = { ...s, recentItemIds: [] };
      await db.put("settings", patched);
      return patched;
    }
    return s;
  },
  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    if (isBridgeMode()) {
      // Only forward fields that exist in DeviceState. Ignore seeded.
      const devicePatch: Parameters<typeof patchDeviceState>[0] = {};
      if (patch.theme !== undefined) devicePatch.theme = patch.theme;
      if (patch.globalProjectFilter !== undefined)
        devicePatch.globalProjectFilter = patch.globalProjectFilter;
      if (patch.recentItemIds !== undefined) devicePatch.recentItemIds = patch.recentItemIds;
      patchDeviceState(devicePatch);
      return settingsFromDevice();
    }
    const db = await getDb();
    const cur = await settingsRepo.get();
    const next = { ...cur, ...patch, id: "app" as const };
    await db.put("settings", next);
    return next;
  },
  async pushRecentItem(itemId: string): Promise<AppSettings> {
    const cur = await settingsRepo.get();
    const existing = Array.isArray(cur.recentItemIds) ? cur.recentItemIds : [];
    const next = [itemId, ...existing.filter((id) => id !== itemId)].slice(0, RECENT_ITEMS_MAX);
    return settingsRepo.update({ recentItemIds: next });
  },
};

export const tagsRepo = {
  async list(): Promise<Tag[]> {
    const db = await getDb();
    const all = (await db.getAll("tags")) as Tag[];
    return all.sort((a, b) => a.name.localeCompare(b.name));
  },
  async create(name: string, color?: string): Promise<Tag> {
    const db = await getDb();
    const trimmed = name.trim();
    // Reuse if already exists by name (case-insensitive)
    const existing = ((await db.getAll("tags")) as Tag[]).find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;
    const tag: Tag = {
      id: uid(),
      name: trimmed,
      color: color ?? TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)],
      createdAt: now(),
    };
    await db.put("tags", tag);
    await flushPresetsFromIdb();
    return tag;
  },
  async update(id: string, patch: Partial<Tag>): Promise<Tag> {
    const db = await getDb();
    const existing = (await db.get("tags", id)) as Tag;
    const updated = { ...existing, ...patch, id };
    await db.put("tags", updated);
    await flushPresetsFromIdb();
    return updated;
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete("tags", id);
    // Remove tag id from any content items locally + collect for bridge re-save.
    const items = (await db.getAll("content")) as ContentItem[];
    const tx = db.transaction("content", "readwrite");
    const affected: ContentItem[] = [];
    for (const it of items) {
      if (it.tags?.includes(id)) {
        const next = {
          ...it,
          tags: it.tags.filter((t) => t !== id),
          updatedAt: now(),
        };
        await tx.store.put(next);
        affected.push(next);
      }
    }
    await tx.done;
    await Promise.allSettled([
      flushPresetsFromIdb(),
      ...affected.map((item) => persistItem(item)),
    ]);
  },
  // Used by hydrateFromBridge. Never call from UI.
  async putRaw(tag: Tag): Promise<void> {
    const db = await getDb();
    await db.put("tags", tag);
  },
};

export async function seedIfEmpty() {
  // Per BRIDGE_MIGRATION.md line 147: "Child renders the empty state. No
  // seeded demo data is fired off (the IDB-mode seeder is explicitly skipped
  // under bridge)." First iframe visit gets a clean empty state; user creates
  // their first item manually and it fires a real save.
  if (isBridgeMode()) return;
  // Also skip if this device has ever been in bridge mode. Otherwise a user
  // who signs out of Opsette and returns to the standalone URL would see
  // demo content reseeded on top of their (now-cleared) IDB, which is worse
  // than the empty state they'd expect.
  if (isMigrated()) return;
  const settings = await settingsRepo.get();
  if (settings.seeded) return;
  const projects = await projectsRepo.list();
  if (projects.length === 0) {
    const p1 = await projectsRepo.create({
      name: "Opsette",
      description: "Marketing site & guides",
      color: "#1677ff",
    });
    const p2 = await projectsRepo.create({
      name: "DeeBuilt",
      description: "Portfolio & case studies",
      color: "#52c41a",
    });
    const today = new Date();
    const inDays = (d: number) => {
      const x = new Date(today);
      x.setDate(x.getDate() + d);
      return x.toISOString().slice(0, 10);
    };
    await contentRepo.create({
      title: "Welcome to your content planner",
      projectId: p1.id,
      slugOrRoute: "/welcome",
      contentType: "Update",
      primaryKeyword: "content planner",
      secondaryKeywords: ["planning", "calendar"],
      publishDate: inDays(2),
      status: "Planned",
      briefNotes: "Intro post explaining the planner.",
    });
    await contentRepo.create({
      title: "How to write a great brief",
      projectId: p1.id,
      slugOrRoute: "/blog/great-brief",
      contentType: "Guide",
      primaryKeyword: "content brief",
      secondaryKeywords: ["editorial", "outline"],
      publishDate: inDays(7),
      status: "Drafting",
      briefNotes: "",
    });
    await contentRepo.create({
      title: "Idea: roundup of planning tools",
      projectId: p2.id,
      slugOrRoute: "",
      contentType: "Article",
      primaryKeyword: "",
      secondaryKeywords: [],
      publishDate: null,
      status: "Idea",
      briefNotes: "Possible roundup post.",
    });
  }
  await settingsRepo.update({ seeded: true });
}

export async function exportAllJson(): Promise<string> {
  const [projects, content, settings, tags] = await Promise.all([
    projectsRepo.list(),
    contentRepo.list(),
    settingsRepo.get(),
    tagsRepo.list(),
  ]);
  return JSON.stringify(
    { version: 2, exportedAt: new Date().toISOString(), projects, content, settings, tags },
    null,
    2,
  );
}

export async function importAllJson(json: string) {
  const parsed = JSON.parse(json);
  const db = await getDb();
  const tx = db.transaction(["projects", "content", "settings", "tags"], "readwrite");
  await tx.objectStore("projects").clear();
  await tx.objectStore("content").clear();
  await tx.objectStore("tags").clear();
  for (const p of parsed.projects ?? []) await tx.objectStore("projects").put(p);
  for (const c of parsed.content ?? []) {
    // Tolerate missing v2 fields
    if (!c.medium) c.medium = mapTypeToMedium(c.contentType);
    if (!c.funnelStage) c.funnelStage = "None";
    if (!Array.isArray(c.tags)) c.tags = [];
    await tx.objectStore("content").put(c);
  }
  for (const t of parsed.tags ?? []) await tx.objectStore("tags").put(t);
  if (parsed.settings) await tx.objectStore("settings").put(parsed.settings);
  await tx.done;
}

export async function resetAll() {
  const db = await getDb();
  const tx = db.transaction(["projects", "content", "settings", "tags"], "readwrite");
  await tx.objectStore("projects").clear();
  await tx.objectStore("content").clear();
  await tx.objectStore("settings").clear();
  await tx.objectStore("tags").clear();
  await tx.done;
}

// Called once from main.tsx right after connectBridge resolves with a live
// Bridge. Clears IDB content/projects/tags (parent is truth — abandon
// standalone data per BRIDGE_MIGRATION.md option (c)), then seeds from
// init.presets + init.items. Preserves the IDB settings row so any leftover
// standalone recentItemIds aren't wiped from the device on first iframe
// visit (bridge mode reads recentItemIds from content-flow.device.v1 so
// this mostly doesn't matter, but the no-op keeps the migration safe).
export async function hydrateFromBridge(bridge: Bridge): Promise<void> {
  // One-way door marker. Written BEFORE any IDB destructive operation so
  // that if this function throws mid-hydration, a subsequent standalone
  // visit still treats the device as migrated and won't reseed demo
  // content over half-cleared IDB.
  if (!isMigrated()) markMigrated();

  const db = await getDb();

  // Clear shared-authoritative stores.
  const tx = db.transaction(["projects", "content", "tags"], "readwrite");
  await tx.objectStore("projects").clear();
  await tx.objectStore("content").clear();
  await tx.objectStore("tags").clear();
  await tx.done;

  // Seed projects + tags from init.presets. The wire type is ContentFlowPresets
  // (see src/lib/bridge.ts) — stripped of any extra keys, projects/tags are
  // arrays of domain objects.
  const presets = bridge.init.presets as { projects?: Project[]; tags?: Tag[] } | undefined;
  if (presets) {
    const seedTx = db.transaction(["projects", "tags"], "readwrite");
    for (const p of presets.projects ?? []) {
      await seedTx.objectStore("projects").put(p);
    }
    for (const t of presets.tags ?? []) {
      await seedTx.objectStore("tags").put(t);
    }
    await seedTx.done;
  }

  // Seed content items from init.items.
  const itemRows = bridge.init.items;
  const itemIds: string[] = [];
  if (itemRows.length > 0) {
    const seedTx = db.transaction("content", "readwrite");
    for (const row of itemRows) {
      const value = row.value as ContentItem | null | undefined;
      if (!value || typeof value !== "object") continue;
      // Tolerate partial/missing fields from old rows, same as importAllJson.
      const item: ContentItem = {
        ...value,
        id: row.data_id,
        medium: value.medium ?? mapTypeToMedium(value.contentType),
        funnelStage: value.funnelStage ?? "None",
        tags: Array.isArray(value.tags) ? value.tags : [],
      };
      await seedTx.objectStore("content").put(item);
      itemIds.push(item.id);
    }
    await seedTx.done;
  }

  // Seed parentKnownIds from the hydrated item list.
  resetParentKnown(itemIds);

  // Overlay unsynced records — items the user created locally but that
  // never reached the parent must survive a reload. Only keep records
  // whose ids are NOT already in the hydrated set (otherwise we'd
  // clobber the parent's authoritative copy with stale local data).
  const unsyncedRecords = getAllUnsyncedRecords();
  const hydrated = new Set(itemIds);
  const overlayEntries = Object.entries(unsyncedRecords).filter(
    ([id]) => !hydrated.has(id),
  );
  if (overlayEntries.length > 0) {
    const overlayTx = db.transaction("content", "readwrite");
    for (const [, record] of overlayEntries) {
      await overlayTx.objectStore("content").put(record);
    }
    await overlayTx.done;
  }
}
