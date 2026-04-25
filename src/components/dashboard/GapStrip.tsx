import { useMemo, useState } from "react";
import { Alert } from "antd";
import dayjs from "dayjs";
import type { ContentItem, Project } from "@/db/types";

interface Props {
  items: ContentItem[];
  projects: Project[];
}

export default function GapStrip({ items, projects }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { staleProjects, noUpcoming } = useMemo(() => {
    const today = dayjs().startOf("day");
    const weekEnd = today.add(7, "day");

    const upcoming = items.filter(
      (i) =>
        i.publishDate &&
        dayjs(i.publishDate).isAfter(today.subtract(1, "day")) &&
        dayjs(i.publishDate).isBefore(weekEnd) &&
        i.status !== "Archived",
    );

    const stale: { project: Project; days: number }[] = [];
    projects.forEach((p) => {
      if (!p.cadenceTarget) return;
      const lastPublished = items
        .filter(
          (i) =>
            i.projectId === p.id &&
            i.status === "Published" &&
            i.publishDate,
        )
        .sort((a, b) => (a.publishDate! < b.publishDate! ? 1 : -1))[0];
      if (!lastPublished?.publishDate) return;
      const days = today.diff(dayjs(lastPublished.publishDate), "day");
      if (days >= 30) stale.push({ project: p, days });
    });

    const hasAnyContent = items.some((i) => i.status !== "Archived");

    return {
      staleProjects: stale,
      noUpcoming: hasAnyContent && upcoming.length === 0,
    };
  }, [items, projects]);

  const showStale = staleProjects.length > 0 && !dismissed.has("stale");
  const showNoUpcoming = noUpcoming && !dismissed.has("no-upcoming");

  if (!showStale && !showNoUpcoming) return null;

  const staleText =
    staleProjects.length === 1
      ? `${staleProjects[0].project.name} hasn't published in ${staleProjects[0].days} days.`
      : `${staleProjects.length} projects haven't published in 30+ days: ${staleProjects
          .map((s) => s.project.name)
          .join(", ")}.`;

  return (
    <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      {showStale && (
        <Alert
          type="info"
          showIcon
          closable
          message={staleText}
          onClose={() => setDismissed((prev) => new Set(prev).add("stale"))}
          style={{ background: "transparent" }}
        />
      )}
      {showNoUpcoming && (
        <Alert
          type="info"
          showIcon
          closable
          message="No content scheduled for the next 7 days."
          onClose={() => setDismissed((prev) => new Set(prev).add("no-upcoming"))}
          style={{ background: "transparent" }}
        />
      )}
    </div>
  );
}
