import type { ContentItem, Project } from "@/db/types";

function escape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function contentToCsv(items: ContentItem[], projects: Project[]): string {
  const projMap = new Map(projects.map((p) => [p.id, p.name]));
  const headers = [
    "Title",
    "Project",
    "Type",
    "Status",
    "Primary Keyword",
    "Secondary Keywords",
    "Slug/Route",
    "Publish Date",
    "Brief",
  ];
  const rows = items.map((i) =>
    [
      i.title,
      i.projectId ? projMap.get(i.projectId) ?? "" : "",
      i.contentType,
      i.status,
      i.primaryKeyword,
      i.secondaryKeywords.join("; "),
      i.slugOrRoute,
      i.publishDate ?? "",
      i.briefNotes,
    ]
      .map(escape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export function downloadFile(filename: string, content: string, mime = "application/octet-stream") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
