import { useMemo, useState } from "react";
import { Alert, Space } from "antd";
import dayjs from "dayjs";
import type { ContentItem, Project } from "@/db/types";

interface Props {
  items: ContentItem[];
  projects: Project[];
}

export default function GapStrip({ items, projects }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const messages = useMemo(() => {
    const msgs: { key: string; text: string }[] = [];
    const today = dayjs().startOf("day");
    const weekEnd = today.add(7, "day");

    const upcoming = items.filter(
      (i) =>
        i.publishDate &&
        dayjs(i.publishDate).isAfter(today.subtract(1, "day")) &&
        dayjs(i.publishDate).isBefore(weekEnd) &&
        i.status !== "Archived",
    );
    if (upcoming.length === 0) {
      msgs.push({
        key: "no-upcoming",
        text: "No content scheduled for the next 7 days.",
      });
    }

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
      const lastDate = lastPublished?.publishDate
        ? dayjs(lastPublished.publishDate)
        : null;
      if (!lastDate || today.diff(lastDate, "day") >= 30) {
        msgs.push({
          key: `stale-${p.id}`,
          text: `${p.name} hasn't published in ${
            lastDate ? today.diff(lastDate, "day") + " days" : "a while"
          }.`,
        });
      }
    });

    return msgs.filter((m) => !dismissed.has(m.key));
  }, [items, projects, dismissed]);

  if (!messages.length) return null;

  return (
    <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }} size={8}>
      {messages.map((m) => (
        <Alert
          key={m.key}
          type="warning"
          showIcon
          closable
          message={m.text}
          onClose={() =>
            setDismissed((prev) => new Set(prev).add(m.key))
          }
        />
      ))}
    </Space>
  );
}
