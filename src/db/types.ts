export type ContentType =
  | "Article"
  | "Guide"
  | "Landing Page"
  | "Update"
  | "Resource"
  | "FAQ"
  | "Other";

export const CONTENT_TYPES: ContentType[] = [
  "Article",
  "Guide",
  "Landing Page",
  "Update",
  "Resource",
  "FAQ",
  "Other",
];

export type ContentStatus =
  | "Idea"
  | "Planned"
  | "Drafting"
  | "Ready"
  | "Published"
  | "Archived";

export const CONTENT_STATUSES: ContentStatus[] = [
  "Idea",
  "Planned",
  "Drafting",
  "Ready",
  "Published",
  "Archived",
];

export const STATUS_COLORS: Record<ContentStatus, string> = {
  Idea: "default",
  Planned: "blue",
  Drafting: "gold",
  Ready: "green",
  Published: "purple",
  Archived: "default",
};

export const PROJECT_COLORS = [
  "#1677ff",
  "#52c41a",
  "#faad14",
  "#eb2f96",
  "#722ed1",
  "#13c2c2",
  "#fa541c",
  "#2f54eb",
];

export const DEFAULT_CHECKLIST = [
  "Title finalized",
  "Route / slug set",
  "Primary keyword chosen",
  "Secondary keywords added",
  "Outline / brief ready",
  "Internal links planned",
  "Metadata considered",
  "Ready to draft",
  "Ready to publish",
];

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface ContentItem {
  id: string;
  projectId: string | null;
  title: string;
  slugOrRoute: string;
  contentType: ContentType;
  primaryKeyword: string;
  secondaryKeywords: string[];
  publishDate: string | null; // ISO date (YYYY-MM-DD) or null
  status: ContentStatus;
  briefNotes: string;
  checklist: Record<string, boolean>;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  id: "app";
  theme: "light" | "dark";
  globalProjectFilter: string | null;
  seeded: boolean;
}
