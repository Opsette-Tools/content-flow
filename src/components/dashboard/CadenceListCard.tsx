import { useMemo } from "react";
import { Card, Empty, Progress, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { ContentItem, Project } from "@/db/types";

interface Props {
  projects: Project[];
  items: ContentItem[];
}

interface Row {
  project: Project;
  published: number;
  target: number;
  percent: number;
  statusLabel: string;
  statusColor: string;
  periodLabel: string;
}

export default function CadenceListCard({ projects, items }: Props) {
  const rows = useMemo<Row[]>(() => {
    const now = dayjs();
    return projects
      .filter((p) => p.cadenceTarget)
      .map((p) => {
        const target = p.cadenceTarget!;
        const start = target.period === "week" ? now.startOf("week") : now.startOf("month");
        const end = target.period === "week" ? now.endOf("week") : now.endOf("month");

        const count = items.filter(
          (i) =>
            i.projectId === p.id &&
            i.status === "Published" &&
            i.publishDate &&
            dayjs(i.publishDate).isAfter(start.subtract(1, "day")) &&
            dayjs(i.publishDate).isBefore(end.add(1, "day")),
        ).length;

        const elapsedRatio =
          (now.valueOf() - start.valueOf()) / (end.valueOf() - start.valueOf());
        const expected = target.count * elapsedRatio;

        let statusLabel = "On track";
        let statusColor = "default";
        if (count >= target.count) {
          statusLabel = "Complete";
          statusColor = "green";
        } else if (count < expected - 0.5) {
          statusLabel = "Behind";
          statusColor = "default";
        } else if (count > expected + 0.5) {
          statusLabel = "Ahead";
          statusColor = "green";
        }

        return {
          project: p,
          published: count,
          target: target.count,
          percent: Math.min(100, Math.round((count / target.count) * 100)),
          statusLabel,
          statusColor,
          periodLabel: target.period === "week" ? "this week" : "this month",
        };
      });
  }, [projects, items]);

  return (
    <Card size="small" title="Cadence" style={{ height: "100%" }}>
      {rows.length === 0 ? (
        <Empty
          description="No cadence targets set"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          {rows.map((r) => (
            <div key={r.project.id} style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <Space size={6} style={{ minWidth: 0, flex: 1 }}>
                  <Tag color={r.project.color} style={{ marginRight: 0 }}>
                    {r.project.name}
                  </Tag>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {r.published} of {r.target} {r.periodLabel}
                  </Typography.Text>
                </Space>
                <Tag color={r.statusColor} style={{ marginRight: 0 }}>
                  {r.statusLabel}
                </Tag>
              </div>
              <Progress percent={r.percent} showInfo={false} size="small" />
            </div>
          ))}
        </Space>
      )}
    </Card>
  );
}
