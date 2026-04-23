import { useMemo } from "react";
import { Card, Progress, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { ContentItem, Project } from "@/db/types";

interface Props {
  project: Project;
  items: ContentItem[];
}

export default function CadenceCard({ project, items }: Props) {
  const target = project.cadenceTarget;

  const { published, percent, statusLabel, statusColor, periodLabel } = useMemo(() => {
    if (!target) {
      return { published: 0, percent: 0, statusLabel: "", statusColor: "default", periodLabel: "" };
    }
    const now = dayjs();
    const start = target.period === "week" ? now.startOf("week") : now.startOf("month");
    const end = target.period === "week" ? now.endOf("week") : now.endOf("month");

    const count = items.filter(
      (i) =>
        i.projectId === project.id &&
        i.status === "Published" &&
        i.publishDate &&
        dayjs(i.publishDate).isAfter(start.subtract(1, "day")) &&
        dayjs(i.publishDate).isBefore(end.add(1, "day")),
    ).length;

    const elapsedRatio =
      (now.valueOf() - start.valueOf()) / (end.valueOf() - start.valueOf());
    const expected = target.count * elapsedRatio;

    let label = "On track";
    let color = "blue";
    if (count >= target.count) {
      label = "Complete";
      color = "green";
    } else if (count < expected - 0.5) {
      label = "Behind";
      color = "red";
    } else if (count > expected + 0.5) {
      label = "Ahead";
      color = "green";
    }

    return {
      published: count,
      percent: Math.min(100, Math.round((count / target.count) * 100)),
      statusLabel: label,
      statusColor: color,
      periodLabel: target.period === "week" ? "this week" : "this month",
    };
  }, [target, items, project.id]);

  if (!target) return null;

  return (
    <Card size="small">
      <Space direction="vertical" style={{ width: "100%" }} size={4}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Tag color={project.color}>{project.name}</Tag>
          <Tag color={statusColor}>{statusLabel}</Tag>
        </Space>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {published} of {target.count} published {periodLabel}
        </Typography.Text>
        <Progress percent={percent} showInfo={false} size="small" />
      </Space>
    </Card>
  );
}
