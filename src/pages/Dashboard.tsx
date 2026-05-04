import { useMemo, useState } from "react";
import { Button, Card, Col, Grid, List, Row, Space, Tag, Tooltip, Typography, theme } from "antd";
import { ExportOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useContent } from "@/hooks/useContent";
import { useProjects } from "@/hooks/useProjects";
import { useTags } from "@/hooks/useTags";
import StatusTag from "@/components/StatusTag";
import ProjectTag from "@/components/ProjectTag";
import ContentEditorDrawer from "@/components/ContentEditorDrawer";
import PublishingHeatmap from "@/components/dashboard/PublishingHeatmap";
import DistributionCard from "@/components/dashboard/DistributionCard";
import GapStrip from "@/components/dashboard/GapStrip";
import StatCard, { type StatTone } from "@/components/StatCard";
import { useHeaderActions } from "@/layout/HeaderSlots";

const { useBreakpoint } = Grid;

export default function Dashboard() {
  const { items, refresh } = useContent();
  const { projects, refresh: refreshProjects } = useProjects();
  const { tags, refresh: refreshTags } = useTags();
  const screens = useBreakpoint();
  const isCompact = !screens.md;
  const { token } = theme.useToken();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const stats = useMemo(() => {
    const s = { total: items.length, Planned: 0, Drafting: 0, Ready: 0, Published: 0 };
    items.forEach((i) => {
      if (i.status in s) (s as Record<string, number>)[i.status]++;
    });
    return s;
  }, [items]);

  const today = dayjs().startOf("day");
  const weekEnd = today.add(7, "day");

  const upcoming = items
    .filter((i) => i.publishDate && dayjs(i.publishDate).isAfter(today.subtract(1, "day")) && dayjs(i.publishDate).isBefore(weekEnd) && i.status !== "Published" && i.status !== "Archived")
    .sort((a, b) => (a.publishDate! < b.publishDate! ? -1 : 1));

  const overdue = items
    .filter((i) => i.publishDate && dayjs(i.publishDate).isBefore(today) && i.status !== "Published" && i.status !== "Archived")
    .sort((a, b) => (a.publishDate! < b.publishDate! ? -1 : 1));

  const open = (id: string | null) => {
    setEditId(id);
    setEditorOpen(true);
  };

  const handleChanged = () => {
    refresh();
    refreshTags();
    refreshProjects();
  };

  useHeaderActions(
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => open(null)}
      aria-label="New content"
    >
      {!isCompact && "New"}
    </Button>,
  );

  const renderItem = (i: typeof items[number], showOverdue = false) => (
    <List.Item
      key={i.id}
      onClick={() => open(i.id)}
      style={{ cursor: "pointer" }}
      actions={[
        ...(i.publishedUrl
          ? [
              <Tooltip key="pub" title="Open published page">
                <a
                  href={i.publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Open published page"
                  style={{ color: "inherit", opacity: 0.6, display: "inline-flex" }}
                >
                  <ExportOutlined />
                </a>
              </Tooltip>,
            ]
          : []),
        <StatusTag key="s" status={i.status} />,
      ]}
    >
      <List.Item.Meta
        title={i.title}
        description={
          <Space size={6} wrap>
            <ProjectTag project={i.projectId ? projMap.get(i.projectId) : null} />
            {i.publishDate && (
              <Tag color={showOverdue ? "red" : "default"}>{dayjs(i.publishDate).format("MMM D")}</Tag>
            )}
          </Space>
        }
      />
    </List.Item>
  );

  const statEntries: Array<{ label: string; value: number; tone: StatTone }> = [
    { label: "Total", value: stats.total, tone: "neutral" },
    { label: "Planned", value: stats.Planned, tone: "info" },
    { label: "Drafting", value: stats.Drafting, tone: "warning" },
    { label: "Ready", value: stats.Ready, tone: "ready" },
    { label: "Published", value: stats.Published, tone: "success" },
  ];

  return (
    <div className="app-page">
      {isCompact ? (
        <div className="stat-carousel app-section">
          {statEntries.map((s) => (
            <div key={s.label} className="stat-carousel-item">
              <StatCard label={s.label} value={s.value} tone={s.tone} variant="card" />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="app-section"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "12px 20px",
            borderRadius: 10,
            background: token.colorFillTertiary,
            boxShadow: `inset 0 1px 3px ${token.colorFill}, inset 0 -1px 0 ${token.colorBorderSecondary}`,
            overflowX: "auto",
          }}
        >
          {statEntries.map((s, idx) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
              {idx > 0 && (
                <span
                  aria-hidden
                  style={{
                    width: 1,
                    height: 18,
                    background: token.colorBorderSecondary,
                    margin: "0 12px",
                  }}
                />
              )}
              <StatCard label={s.label} value={s.value} tone={s.tone} variant="inline" />
            </div>
          ))}
        </div>
      )}

      <GapStrip items={items} projects={projects} />

      <Row gutter={[16, 16]} className="app-section">
        <Col xs={24} md={16}>
          <PublishingHeatmap items={items} />
        </Col>
        <Col xs={24} md={8}>
          <DistributionCard items={items} />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title="Upcoming this week"
            size="small"
            style={{ height: "100%" }}
            styles={{ body: { minHeight: 180 } }}
          >
            {upcoming.length ? (
              <List dataSource={upcoming} renderItem={(i) => renderItem(i)} />
            ) : (
              <Typography.Text type="secondary">Nothing scheduled this week</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={<span>Overdue {overdue.length > 0 && <Tag color="red">{overdue.length}</Tag>}</span>}
            size="small"
            style={{ height: "100%" }}
            styles={{ body: { minHeight: 180 } }}
          >
            {overdue.length ? (
              <List dataSource={overdue} renderItem={(i) => renderItem(i, true)} />
            ) : (
              <Typography.Text type="secondary">Nothing overdue</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <ContentEditorDrawer
        open={editorOpen}
        itemId={editId}
        projects={projects}
        tags={tags}
        onClose={() => setEditorOpen(false)}
        onChanged={handleChanged}
      />

      {!items.length && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
          Tip: use <b>New</b> in the header to create your first item.
        </Typography.Paragraph>
      )}
    </div>
  );
}
