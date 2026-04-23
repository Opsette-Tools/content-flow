import { useMemo, useState } from "react";
import { Button, Card, Col, Empty, List, Row, Space, Statistic, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useContent } from "@/hooks/useContent";
import { useProjects } from "@/hooks/useProjects";
import { useTags } from "@/hooks/useTags";
import StatusTag from "@/components/StatusTag";
import ProjectTag from "@/components/ProjectTag";
import ContentEditorDrawer from "@/components/ContentEditorDrawer";
import PublishingHeatmap from "@/components/dashboard/PublishingHeatmap";
import CadenceCard from "@/components/dashboard/CadenceCard";
import DistributionCard from "@/components/dashboard/DistributionCard";
import GapStrip from "@/components/dashboard/GapStrip";

export default function Dashboard() {
  const { items, refresh } = useContent();
  const { projects, refresh: refreshProjects } = useProjects();
  const { tags, refresh: refreshTags } = useTags();
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

  const renderItem = (i: typeof items[number], showOverdue = false) => (
    <List.Item
      key={i.id}
      onClick={() => open(i.id)}
      style={{ cursor: "pointer" }}
      actions={[<StatusTag key="s" status={i.status} />]}
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

  return (
    <div className="app-page">
      <Row gutter={[12, 12]} className="app-section">
        <Col xs={12} sm={8} md={4}>
          <Card><Statistic title="Total" value={stats.total} /></Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card><Statistic title="Planned" value={stats.Planned} /></Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card><Statistic title="Drafting" value={stats.Drafting} /></Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card><Statistic title="Ready" value={stats.Ready} /></Card>
        </Col>
        <Col xs={24} sm={8} md={5}>
          <Card><Statistic title="Published" value={stats.Published} /></Card>
        </Col>
      </Row>

      <GapStrip items={items} projects={projects} />

      <Row gutter={[16, 16]} className="app-section">
        {projectsWithCadence.length > 0 && (
          <Col xs={24} md={projectsWithCadence.length > 1 ? 16 : 12}>
            <Row gutter={[12, 12]}>
              {projectsWithCadence.map((p) => (
                <Col xs={24} sm={12} key={p.id}>
                  <CadenceCard project={p} items={items} />
                </Col>
              ))}
            </Row>
          </Col>
        )}
        <Col xs={24} md={projectsWithCadence.length > 1 ? 8 : projectsWithCadence.length === 1 ? 12 : 24}>
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
          <Card title="Upcoming this week" size="small">
            {upcoming.length ? (
              <List dataSource={upcoming} renderItem={(i) => renderItem(i)} />
            ) : (
              <Empty description="Nothing scheduled this week" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={<span>Overdue {overdue.length > 0 && <Tag color="red">{overdue.length}</Tag>}</span>} size="small">
            {overdue.length ? (
              <List dataSource={overdue} renderItem={(i) => renderItem(i, true)} />
            ) : (
              <Empty description="Nothing overdue" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Unscheduled ideas" size="small">
            {unscheduled.length ? (
              <List dataSource={unscheduled} renderItem={(i) => renderItem(i)} />
            ) : (
              <Empty description="No unscheduled items" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Recently updated" size="small">
            {recent.length ? (
              <List dataSource={recent} renderItem={(i) => renderItem(i)} />
            ) : (
              <Empty description="No content yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      <Button
        className="fab"
        type="primary"
        size="large"
        shape="round"
        icon={<PlusOutlined />}
        onClick={() => open(null)}
      >
        Quick add
      </Button>

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
          Tip: tap <b>Quick add</b> to create your first content item.
        </Typography.Paragraph>
      )}
    </div>
  );
}
