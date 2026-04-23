import dayjs from "dayjs";
import type {
  ContentItem,
  ContentStatus,
  FunnelStage,
  Medium,
  Tag,
} from "@/db/types";

export interface ContentFilterOptions {
  search?: string;
  projectId?: string | null;
  status?: ContentStatus | null;
  medium?: Medium | null;
  funnelStage?: FunnelStage | null;
  tagIds?: string[];
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
  tagsMap?: Map<string, Tag>;
}

export function filterContent(items: ContentItem[], opts: ContentFilterOptions): ContentItem[] {
  const q = opts.search?.trim().toLowerCase() ?? "";
  const tagIds = opts.tagIds ?? [];
  return items.filter((i) => {
    if (opts.projectId && i.projectId !== opts.projectId) return false;
    if (opts.status && i.status !== opts.status) return false;
    if (opts.medium && i.medium !== opts.medium) return false;
    if (opts.funnelStage && i.funnelStage !== opts.funnelStage) return false;
    if (tagIds.length && !tagIds.every((t) => i.tags?.includes(t))) return false;
    if (opts.dateRange && i.publishDate) {
      const d = dayjs(i.publishDate);
      if (d.isBefore(opts.dateRange[0], "day") || d.isAfter(opts.dateRange[1], "day")) return false;
    }
    if (opts.dateRange && !i.publishDate) return false;
    if (q) {
      const tagNames = opts.tagsMap
        ? (i.tags ?? []).map((id) => opts.tagsMap!.get(id)?.name ?? "").join(" ")
        : "";
      const hay = `${i.title} ${i.primaryKeyword} ${i.slugOrRoute} ${tagNames}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
