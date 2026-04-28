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

export type Medium =
  | "Article"
  | "Video"
  | "Short / Reel"
  | "Podcast"
  | "Newsletter"
  | "Email"
  | "Social Post"
  | "Landing Page"
  | "Guide"
  | "Webinar"
  | "Other";

export const MEDIUMS: Medium[] = [
  "Article",
  "Video",
  "Short / Reel",
  "Podcast",
  "Newsletter",
  "Email",
  "Social Post",
  "Landing Page",
  "Guide",
  "Webinar",
  "Other",
];

// Lucide icon name per medium (kebab-case names from lucide-react)
export const MEDIUM_ICONS: Record<Medium, string> = {
  Article: "file-text",
  Video: "video",
  "Short / Reel": "clapperboard",
  Podcast: "mic",
  Newsletter: "newspaper",
  Email: "mail",
  "Social Post": "message-square",
  "Landing Page": "layout",
  Guide: "book-open",
  Webinar: "presentation",
  Other: "file",
};

export type FunnelStage =
  | "None"
  | "Awareness"
  | "Consideration"
  | "Decision"
  | "Retention";

export const FUNNEL_STAGES: FunnelStage[] = [
  "None",
  "Awareness",
  "Consideration",
  "Decision",
  "Retention",
];

export const FUNNEL_COLORS: Record<FunnelStage, string> = {
  None: "default",
  Awareness: "cyan",
  Consideration: "geekblue",
  Decision: "magenta",
  Retention: "green",
};

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export const TAG_COLORS = [
  "magenta",
  "red",
  "volcano",
  "orange",
  "gold",
  "lime",
  "green",
  "cyan",
  "blue",
  "geekblue",
  "purple",
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
  cadenceTarget?: { count: number; period: "week" | "month" } | null;
  createdAt: number;
  updatedAt: number;
}

export interface ContentItem {
  id: string;
  projectId: string | null;
  title: string;
  slugOrRoute: string;
  contentType: ContentType;
  medium: Medium;
  funnelStage: FunnelStage;
  tags: string[]; // tag ids
  primaryKeyword: string;
  secondaryKeywords: string[];
  publishDate: string | null; // ISO date (YYYY-MM-DD) or null
  status: ContentStatus;
  briefNotes: string;
  // Planned length for the piece. Null when the user hasn't set a target.
  // Existing items pre-feature also read as null (missing key on the wire).
  targetWordCount: number | null;
  // Where the draft is written (Google Doc, Notion, Opsette doc, etc).
  // Optional. Pre-feature items read as null.
  draftUrl: string | null;
  // The live, published URL. Set once the post is live. Pre-feature items
  // read as null.
  publishedUrl: string | null;
  checklist: Record<string, boolean>;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  id: "app";
  theme: "light" | "dark";
  globalProjectFilter: string | null;
  seeded: boolean;
  recentItemIds: string[];
}
