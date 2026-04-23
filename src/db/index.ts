import { openDB, type IDBPDatabase } from "idb";
import type { AppSettings, ContentItem, Medium, Project, Tag } from "./types";
import { DEFAULT_CHECKLIST, TAG_COLORS } from "./types";

const DB_NAME = "content-planner";
const DB_VERSION = 2;

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
    return project;
  },
  async update(id: string, patch: Partial<Project>): Promise<Project> {
    const db = await getDb();
    const existing = (await db.get("projects", id)) as Project;
    const updated = { ...existing, ...patch, id, updatedAt: now() };
    await db.put("projects", updated);
    return updated;
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete("projects", id);
    // Detach content items
    const items = (await db.getAll("content")) as ContentItem[];
    const tx = db.transaction("content", "readwrite");
    for (const it of items) {
      if (it.projectId === id) {
        await tx.store.put({ ...it, projectId: null, updatedAt: now() });
      }
    }
    await tx.done;
  },
};

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
      checklist: data.checklist ?? checklist,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.put("content", item);
    return item;
  },
  async update(id: string, patch: Partial<ContentItem>): Promise<ContentItem> {
    const db = await getDb();
    const existing = (await db.get("content", id)) as ContentItem;
    const updated = { ...existing, ...patch, id, updatedAt: now() };
    await db.put("content", updated);
    return updated;
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete("content", id);
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
    return copy;
  },
};

const DEFAULT_SETTINGS: AppSettings = {
  id: "app",
  theme: "light",
  globalProjectFilter: null,
  seeded: false,
};

export const settingsRepo = {
  async get(): Promise<AppSettings> {
    const db = await getDb();
    const s = (await db.get("settings", "app")) as AppSettings | undefined;
    if (!s) {
      await db.put("settings", DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
    return s;
  },
  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    const db = await getDb();
    const cur = await settingsRepo.get();
    const next = { ...cur, ...patch, id: "app" as const };
    await db.put("settings", next);
    return next;
  },
};

export async function seedIfEmpty() {
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
