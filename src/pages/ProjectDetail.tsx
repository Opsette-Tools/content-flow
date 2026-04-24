import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Grid,
  Input,
  List,
  Result,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useContent } from "@/hooks/useContent";
import { useProjects } from "@/hooks/useProjects";
import { useTags } from "@/hooks/useTags";
import {
  CONTENT_STATUSES,
  FUNNEL_COLORS,
  FUNNEL_STAGES,
  MEDIUMS,
  type ContentItem,
  type ContentStatus,
  type FunnelStage,
  type Medium,
} from "@/db/types";
import ContentEditorDrawer from "@/components/ContentEditorDrawer";
import ContentRow from "@/components/ContentRow";
import ProjectEditModal from "@/components/ProjectEditModal";
import StatusTag from "@/components/StatusTag";
import MediumIcon from "@/components/MediumIcon";
import TagChips from "@/components/TagChips";
import CadenceCard from "@/components/dashboard/CadenceCard";
import { filterContent } from "@/utils/filterContent";
import { useHeaderActions } from "@/layout/HeaderSlots";

const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, refresh: refreshProjects } = useProjects();
  const { items, refresh: refreshItems } = useContent();
  const { tags } = useTags();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const project = useMemo(() => projects.find((p) => p.id === id) ?? null, [projects, id]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | null>(null);
  const [mediumFilter, setMediumFilter] = useState<Medium | null>(null);
  const [funnelFilter, setFunnelFilter] = useState<FunnelStage | null>(null);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editProjectOpen, setEditProjectOpen] = useState(false);

  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const tagsMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const filtered = useMemo(
    () =>
      filterContent(items, {
        projectId: id ?? null,
        search,
        status: statusFilter,
        medium: mediumFilter,
        funnelStage: funnelFilter,
        tagIds: tagFilter,
        dateRange,
        tagsMap,
      }),
    [items, id, search, statusFilter, mediumFilter, funnelFilter, tagFilter, dateRange, tagsMap],
  );

  if (!project) {
    return (
      <div className="app-page">
        <Result
          status="404"
          title="Project not found"
          subTitle="This project may have been deleted or the link is incorrect."
          extra={
            <Button type="primary" onClick={() => navigate("/projects")}>
              Back to projects
            </Button>
          }
        />
      </div>
    );
  }

  const openEditor = (itemId: string | null) => {
    setEditId(itemId);
    setEditorOpen(true);
  };

  const handleChanged = () => {
    refreshItems();
  };

  useHeaderActions(
    project ? (
      <Space>
        <Button icon={<EditOutlined />} onClick={() => setEditProjectOpen(true)}>
          Edit project
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor(null)}>
          New
        </Button>
      </Space>
    ) : null,
  );

  const desktopTable = (
    <Table
      rowKey="id"
      dataSource={filtered}
      pagination={{ pageSize: 20, hideOnSinglePage: true }}
      onRow={(r) => ({ onClick: () => openEditor(r.id), style: { cursor: "pointer" } })}
      columns={[
        {
          title: "Title",
          dataIndex: "title",
          render: (t: string, r: ContentItem) => (
            <Space direction="vertical" size={0}>
              <Typography.Text strong>{t}</Typography.Text>
              {r.slugOrRoute && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {r.slugOrRoute}
                </Typography.Text>
              )}
            </Space>
          ),
        },
        {
          title: "Medium",
          dataIndex: "medium",
          render: (m: Medium) => (
            <Space size={4}>
              <MediumIcon medium={m} />
              <span>{m}</span>
            </Space>
          ),
        },
        {
          title: "Funnel",
          dataIndex: "funnelStage",
          render: (s: FunnelStage) =>
            s && s !== "None" ? (
              <Tag color={FUNNEL_COLORS[s]}>{s}</Tag>
            ) : (
              <Typography.Text type="secondary">—</Typography.Text>
            ),
        },
        {
          title: "Tags",
          dataIndex: "tags",
          render: (ids: string[]) => <TagChips tagIds={ids ?? []} tagsMap={tagsMap} max={3} />,
        },
        {
          title: "Publish",
          dataIndex: "publishDate",
          sorter: (a: ContentItem, b: ContentItem) =>
            (a.publishDate || "").localeCompare(b.publishDate || ""),
          render: (d: string | null) =>
            d ? dayjs(d).format("MMM D, YYYY") : <Typography.Text type="secondary">—</Typography.Text>,
        },
        {
          title: "Status",
          dataIndex: "status",
          render: (s: ContentStatus) => <StatusTag status={s} />,
        },
      ]}
    />
  );

  const mobileList = (
    <List
      dataSource={filtered}
      renderItem={(i) => (
        <ContentRow
          key={i.id}
          item={i}
          projectsMap={projMap}
          tagsMap={tagsMap}
          onClick={(it) => openEditor(it.id)}
        />
      )}
    />
  );

  return (
    <div className="app-page">
      {(project.description || project.cadenceTarget) && (
        <Card className="app-section">
          {project.description && (
            <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
              {project.description}
            </Typography.Paragraph>
          )}
          {project.cadenceTarget && (
            <div style={{ marginTop: project.description ? 16 : 0, maxWidth: 420 }}>
              <CadenceCard project={project} items={items} />
            </div>
          )}
        </Card>
      )}

      <Card size="small" className="app-section">
        <Row gutter={[8, 8]}>
          <Col xs={24} md={6}>
            <Input.Search
              allowClear
              placeholder="Search title, keyword, slug, tags"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              allowClear
              placeholder="Status"
              value={statusFilter ?? undefined}
              onChange={(v) => setStatusFilter((v as ContentStatus) ?? null)}
              style={{ width: "100%" }}
              options={CONTENT_STATUSES.map((s) => ({ label: s, value: s }))}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              allowClear
              placeholder="Medium"
              value={mediumFilter ?? undefined}
              onChange={(v) => setMediumFilter((v as Medium) ?? null)}
              style={{ width: "100%" }}
              options={MEDIUMS.map((m) => ({ label: m, value: m }))}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              allowClear
              placeholder="Funnel"
              value={funnelFilter ?? undefined}
              onChange={(v) => setFunnelFilter((v as FunnelStage) ?? null)}
              style={{ width: "100%" }}
              options={FUNNEL_STAGES.map((s) => ({ label: s, value: s }))}
            />
          </Col>
          <Col xs={12} md={3}>
            <Select
              allowClear
              mode="multiple"
              maxTagCount={1}
              placeholder="Tags"
              value={tagFilter}
              onChange={(v) => setTagFilter(v)}
              style={{ width: "100%" }}
              options={tags.map((t) => ({ label: t.name, value: t.id }))}
            />
          </Col>
          <Col xs={24} md={3}>
            <RangePicker
              style={{ width: "100%" }}
              value={dateRange as never}
              onChange={(v) => setDateRange(v as never)}
            />
          </Col>
        </Row>
      </Card>

      <Card size="small">
        {filtered.length ? (
          isMobile ? mobileList : desktopTable
        ) : (
          <Empty description="No content in this project yet">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor(null)}>
              Create first item
            </Button>
          </Empty>
        )}
      </Card>

      <ContentEditorDrawer
        open={editorOpen}
        itemId={editId}
        projects={projects}
        tags={tags}
        defaultProjectId={project.id}
        onClose={() => setEditorOpen(false)}
        onChanged={handleChanged}
      />

      <ProjectEditModal
        open={editProjectOpen}
        editing={project}
        onClose={() => setEditProjectOpen(false)}
        onSaved={() => refreshProjects()}
      />
    </div>
  );
}
