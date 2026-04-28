import { useMemo, useState } from "react";
import { Button, Card, Col, Grid, List, Row, Space, Tag, Tooltip, Typography } from "antd";
import { ExportOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useContent } from "@/hooks/useContent";
import { useProjects } from "@/hooks/useProjects";
import { useTags } from "@/hooks/useTags";
import StatusTag from "@/components/StatusTag";
import ProjectTag from "@/components/ProjectTag";
import ContentEditorDrawer from "@/components/ContentEditorDrawer";
import PublishingHeatmap from "@/components/dashboard/PublishingHeatmap";
import CadenceListCard from "@/components/dashboard/CadenceListCard";
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

  const unscheduled = items.filter((i) => !i.publishDate && i.status !== "Published" && i.status !== "Archived");

  const recent = items.slice(0, 6);

  const projectsWithCadence = projects.filter((p) => p.cadenceTarget);

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
              <StatCard label={s.label} value={s.value} tone={s.tone} />
            </div>
          ))}
        </div>
      ) : (
        <Row gutter={[12, 12]} className="app-section">
          {statEntries.map((s, idx) => (
            <Col xs={12} sm={8} md={idx === 0 ? 4 : 5} key={s.label}>
              <StatCard label={s.label} value={s.value} tone={s.tone} />
            </Col>
          ))}
        </Row>
      )}

      <GapStrip items={items} projects={projects} />

      <Row gutter={[16, 16]} className="app-section">
        {projectsWithCadence.length > 0 && (
          <Col xs={24} md={12}>
            <CadenceListCard projects={projectsWithCadence} items={items} />
          </Col>
        )}
        <Col xs={24} md={projectsWithCadence.length > 0 ? 12 : 24}>
          <DistributionCard items={items} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="app-section">
        <Col xs={24}>
          <PublishingHeatmap items={items} />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title="Upcoming this week"
            size="small"
            style={{ height: "100%" }}
            styles={{ body: { minHeight: 220 } }}
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
            styles={{ body: { minHeight: 220 } }}
          >
            {overdue.length ? (
              <List dataSource={overdue} renderItem={(i) => renderItem(i, true)} />
            ) : (
              <Typography.Text type="secondary">Nothing overdue</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title="Unscheduled ideas"
            size="small"
            style={{ height: "100%" }}
            styles={{ body: { minHeight: 220 } }}
          >
            {unscheduled.length ? (
              <List dataSource={unscheduled} renderItem={(i) => renderItem(i)} />
            ) : (
              <Typography.Text type="secondary">No unscheduled items</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title="Recently updated"
            size="small"
            style={{ height: "100%" }}
            styles={{ body: { minHeight: 220 } }}
          >
            {recent.length ? (
              <List dataSource={recent} renderItem={(i) => renderItem(i)} />
            ) : (
              <Typography.Text type="secondary">No content yet</Typography.Text>
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
