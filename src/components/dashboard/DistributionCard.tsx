import { useMemo } from "react";
import { Card, Empty, Space, Typography, theme } from "antd";
import type { ContentItem, Medium } from "@/db/types";

const PALETTE = [
  "colorPrimary",
  "colorSuccess",
  "colorWarning",
  "colorInfo",
  "colorError",
] as const;

interface Props {
  items: ContentItem[];
}

export default function DistributionCard({ items }: Props) {
  const { token } = theme.useToken();

  const segments = useMemo(() => {
    const counts = new Map<Medium, number>();
    items.forEach((i) => {
      counts.set(i.medium, (counts.get(i.medium) ?? 0) + 1);
    });
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const total = sorted.reduce((s, [, n]) => s + n, 0);
    return { sorted, total };
  }, [items]);

  return (
    <Card size="small" title="What you're making" style={{ height: "100%" }}>
      {segments.total === 0 ? (
        <Empty description="No content yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={8}>
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 14,
              borderRadius: 4,
              overflow: "hidden",
              background: token.colorFillSecondary,
            }}
          >
            {segments.sorted.map(([medium, count], idx) => {
              const pct = (count / segments.total) * 100;
              const colorKey = PALETTE[idx % PALETTE.length];
              const bg = (token as unknown as Record<string, string>)[colorKey];
              return (
                <div
                  key={medium}
                  title={`${medium}: ${count}`}
                  style={{ width: `${pct}%`, background: bg }}
                />
              );
            })}
          </div>
          <Space size={[8, 4]} wrap>
            {segments.sorted.map(([medium, count], idx) => {
              const colorKey = PALETTE[idx % PALETTE.length];
              const bg = (token as unknown as Record<string, string>)[colorKey];
              return (
                <Space key={medium} size={4}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: bg,
                    }}
                  />
                  <Typography.Text style={{ fontSize: 12 }}>
                    {medium} ({count})
                  </Typography.Text>
                </Space>
              );
            })}
          </Space>
        </Space>
      )}
    </Card>
  );
}
