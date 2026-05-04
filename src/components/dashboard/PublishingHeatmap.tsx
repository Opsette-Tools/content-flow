import { useMemo } from "react";
import { Card, Tooltip, Typography, theme } from "antd";
import dayjs from "dayjs";
import type { ContentItem } from "@/db/types";

const WEEKS = 16;
const DAYS = 7;

interface Props {
  items: ContentItem[];
  showAxisLabels?: boolean;
}

export default function PublishingHeatmap({ items, showAxisLabels = false }: Props) {
  const { token } = theme.useToken();

  const { grid, max } = useMemo(() => {
    const counts = new Map<string, ContentItem[]>();
    items.forEach((i) => {
      if (!i.publishDate) return;
      const arr = counts.get(i.publishDate) ?? [];
      arr.push(i);
      counts.set(i.publishDate, arr);
    });

    // End at the end of the current week (Sunday-based grid; we use Monday-start).
    const today = dayjs().startOf("day");
    // Find the most recent Sunday for column alignment (col = week, row = day)
    const lastDay = today;
    const start = lastDay.subtract(WEEKS * DAYS - 1, "day");

    const cells: { date: string; count: number; titles: string[] }[] = [];
    for (let i = 0; i < WEEKS * DAYS; i++) {
      const d = start.add(i, "day").format("YYYY-MM-DD");
      const list = counts.get(d) ?? [];
      cells.push({
        date: d,
        count: list.length,
        titles: list.map((x) => x.title),
      });
    }

    let maxCount = 0;
    cells.forEach((c) => {
      if (c.count > maxCount) maxCount = c.count;
    });
    return { grid: cells, max: maxCount };
  }, [items]);

  const intensity = (count: number) => {
    if (!count) return 0;
    if (max <= 1) return 1;
    const ratio = count / max;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
  };

  const opacityFor = (level: number) =>
    [0, 0.18, 0.36, 0.6, 0.9][level] ?? 0;

  return (
    <Card
      size="small"
      title="Publishing activity"
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          last {WEEKS} weeks
        </Typography.Text>
      }
    >
      <div style={{ overflowX: "auto", paddingBottom: 4, display: "flex", gap: 8 }}>
        {showAxisLabels && (
          <div
            aria-hidden
            style={{
              display: "grid",
              gridTemplateRows: `repeat(${DAYS}, 14px)`,
              gap: 3,
              fontSize: 10,
              color: token.colorTextTertiary,
              textAlign: "right",
              minWidth: 18,
            }}
          >
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} style={{ lineHeight: "14px" }}>
                {i % 2 === 1 ? d : ""}
              </span>
            ))}
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateRows: `repeat(${DAYS}, 14px)`,
            gridTemplateColumns: `repeat(${WEEKS}, 14px)`,
            gridAutoFlow: "column",
            gap: 3,
            minWidth: WEEKS * 17,
          }}
        >
          {grid.map((cell) => {
            const lvl = intensity(cell.count);
            const bg =
              lvl === 0
                ? token.colorFillSecondary
                : token.colorPrimary;
            return (
              <Tooltip
                key={cell.date}
                title={
                  <div>
                    <div>{dayjs(cell.date).format("ddd, MMM D")}</div>
                    <div>
                      {cell.count
                        ? `${cell.count} item${cell.count > 1 ? "s" : ""}`
                        : "No items"}
                    </div>
                    {cell.titles.slice(0, 4).map((t) => (
                      <div key={t} style={{ fontSize: 11, opacity: 0.85 }}>
                        • {t}
                      </div>
                    ))}
                    {cell.titles.length > 4 && (
                      <div style={{ fontSize: 11, opacity: 0.85 }}>
                        +{cell.titles.length - 4} more
                      </div>
                    )}
                  </div>
                }
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: bg,
                    opacity: lvl === 0 ? 1 : opacityFor(lvl),
                  }}
                />
              </Tooltip>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
