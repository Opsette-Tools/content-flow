import { useEffect, useMemo, useState } from "react";
import { Alert } from "antd";
import dayjs from "dayjs";
import type { ContentItem, Project } from "@/db/types";

interface Props {
  items: ContentItem[];
  projects: Project[];
}

const DISMISS_KEY = "content-flow.gapstrip.dismissed.v1";
// 2.5x the cadence period before we call a project "stale". So a 1/week
// project flags at ~17d, a 1/month project flags at ~75d. For multi-count
// cadences the per-publish window shrinks proportionally.
const STALE_MULTIPLIER = 2.5;
const NO_UPCOMING_KEY = "__no_upcoming__";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((v) => typeof v === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissed(set: Set<string>): void {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...set]));
  } catch {
    // Ignore quota / privacy-mode failures; dismissal degrades to in-memory.
  }
}

function staleThresholdDays(target: { count: number; period: "week" | "month" }): number {
  const periodDays = target.period === "week" ? 7 : 30;
  const perPublish = periodDays / Math.max(target.count, 1);
  return Math.round(perPublish * STALE_MULTIPLIER);
}

export default function GapStrip({ items, projects }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());

  const dismiss = (key: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      persistDismissed(next);
      return next;
    });
  };

  const { staleProjects, noUpcoming, noUpcomingKey } = useMemo(() => {
    const today = dayjs().startOf("day");
    const weekEnd = today.add(7, "day");

    const upcoming = items.filter(
      (i) =>
        i.publishDate &&
        dayjs(i.publishDate).isAfter(today.subtract(1, "day")) &&
        dayjs(i.publishDate).isBefore(weekEnd) &&
        i.status !== "Archived",
    );

    const stale: { project: Project; days: number; threshold: number; lastDate: string; key: string }[] = [];
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
      const threshold = staleThresholdDays(p.cadenceTarget);
      if (days < threshold) return;
      stale.push({
        project: p,
        days,
        threshold,
        lastDate: lastPublished.publishDate,
        key: `stale:${p.id}:${lastPublished.publishDate}`,
      });
    });

    const hasAnyContent = items.some((i) => i.status !== "Archived");

    return {
      staleProjects: stale,
      noUpcoming: hasAnyContent && upcoming.length === 0,
      // Bucket "no upcoming" dismissal into a 7-day window so it auto-resets
      // each week instead of staying dismissed forever. Uses days-since-epoch
      // / 7 to avoid the isoWeek plugin (not loaded).
      noUpcomingKey: `${NO_UPCOMING_KEY}:${Math.floor(today.valueOf() / (7 * 24 * 60 * 60 * 1000))}`,
    };
  }, [items, projects]);

  // Garbage-collect stale dismissal keys whose underlying state has changed
  // (e.g. project published since dismissal). Keeps localStorage from growing.
  useEffect(() => {
    const liveKeys = new Set<string>([
      noUpcomingKey,
      ...staleProjects.map((s) => s.key),
    ]);
    let changed = false;
    const next = new Set<string>();
    dismissed.forEach((key) => {
      const isManagedKey = key.startsWith("stale:") || key.startsWith(NO_UPCOMING_KEY);
      if (!isManagedKey || liveKeys.has(key)) {
        next.add(key);
      } else {
        changed = true;
      }
    });
    if (changed) {
      setDismissed(next);
      persistDismissed(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noUpcomingKey, staleProjects.map((s) => s.key).join("|")]);

  const visibleStale = staleProjects.filter((s) => !dismissed.has(s.key));
  const showNoUpcoming = noUpcoming && !dismissed.has(noUpcomingKey);

  if (visibleStale.length === 0 && !showNoUpcoming) return null;

  const staleText =
    visibleStale.length === 1
      ? `${visibleStale[0].project.name} hasn't published in ${visibleStale[0].days} days (target: ${visibleStale[0].threshold}d).`
      : `${visibleStale.length} projects are behind cadence: ${visibleStale
          .map((s) => `${s.project.name} (${s.days}d)`)
          .join(", ")}.`;

  // When there's exactly one stale project, its key drives dismissal.
  // When there are several, dismiss them all together.
  const onDismissStale = () => {
    visibleStale.forEach((s) => dismiss(s.key));
  };

  return (
    <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      {visibleStale.length > 0 && (
        <Alert
          type="info"
          showIcon
          closable
          message={staleText}
          onClose={onDismissStale}
          style={{ background: "transparent" }}
        />
      )}
      {showNoUpcoming && (
        <Alert
          type="info"
          showIcon
          closable
          message="No content scheduled for the next 7 days."
          onClose={() => dismiss(noUpcomingKey)}
          style={{ background: "transparent" }}
        />
      )}
    </div>
  );
}
