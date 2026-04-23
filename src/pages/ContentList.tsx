import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Empty,
  Grid,
  Input,
  List,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { CopyOutlined, DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useContent } from "@/hooks/useContent";
import { useProjects } from "@/hooks/useProjects";
import { contentRepo } from "@/db";
import { CONTENT_STATUSES, CONTENT_TYPES, type ContentItem, type ContentStatus, type ContentType } from "@/db/types";
import StatusTag from "@/components/StatusTag";
import ProjectTag from "@/components/ProjectTag";
import ContentEditorDrawer from "@/components/ContentEditorDrawer";

const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

export default function ContentList() {
  const { items, refresh } = useContent();
  const { projects } = useProjects();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContentStatus | null>(null);
  const [typeFilter, setTypeFilter] = useState<ContentType | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (projectFilter && i.projectId !== projectFilter) return false;
      if (statusFilter && i.status !== statusFilter) return false;
      if (typeFilter && i.contentType !== typeFilter) return false;
      if (dateRange && i.publishDate) {
        const d = dayjs(i.publishDate);
        if (d.isBefore(dateRange[0], "day") || d.isAfter(dateRange[1], "day")) return false;
      }
      if (dateRange && !i.publishDate) return false;
      if (q) {
        const hay = `${i.title} ${i.primaryKeyword} ${i.slugOrRoute}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, projectFilter, statusFilter, typeFilter, dateRange]);

  const open = (id: string | null) => {
    setEditId(id);
    setEditorOpen(true);
  };

  const handleQuickStatus = async (id: string, status: ContentStatus) => {
    await contentRepo.update(id, { status });
    message.success("Status updated");
    refresh();
  };

  const handleDuplicate = async (id: string) => {
    await contentRepo.duplicate(id);
    refresh();
  };

  const handleDelete = async (id: string) => {
    await contentRepo.remove(id);
    message.success("Deleted");
    refresh();
  };

  const rowActions = (item: ContentItem) => (
    <Dropdown
      menu={{
        items: [
          { key: "edit", icon: <EditOutlined />, label: "Edit", onClick: () => open(item.id) },
          { key: "dup", icon: <CopyOutlined />, label: "Duplicate", onClick: () => handleDuplicate(item.id) },
          { type: "divider" },
          ...CONTENT_STATUSES.map((s) => ({
            key: `s-${s}`,
            label: `Set: ${s}`,
            onClick: () => handleQuickStatus(item.id, s),
          })),
          { type: "divider" },
          { key: "del", icon: <DeleteOutlined />, danger: true, label: "Delete", onClick: () => handleDelete(item.id) },
        ],
      }}
      trigger={["click"]}
    >
      <Button type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
    </Dropdown>
  );

  const filtersBar = (
    <Card size="small" className="app-section">
      <Row gutter={[8, 8]}>
        <Col xs={24} md={8}>
          <Input.Search allowClear placeholder="Search title, keyword, slug" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Col>
        <Col xs={12} md={4}>
          <Select
            allowClear
            placeholder="Project"
            value={projectFilter ?? undefined}
            onChange={(v) => setProjectFilter(v ?? null)}
            style={{ width: "100%" }}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
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
            placeholder="Type"
            value={typeFilter ?? undefined}
            onChange={(v) => setTypeFilter((v as ContentType) ?? null)}
            style={{ width: "100%" }}
            options={CONTENT_TYPES.map((t) => ({ label: t, value: t }))}
          />
        </Col>
        <Col xs={24} md={4}>
          <RangePicker
            style={{ width: "100%" }}
            value={dateRange as never}
            onChange={(v) => setDateRange(v as never)}
          />
        </Col>
      </Row>
    </Card>
  );

  const desktopTable = (
    <Table
      rowKey="id"
      dataSource={filtered}
      pagination={{ pageSize: 20, hideOnSinglePage: true }}
      onRow={(r) => ({ onClick: () => open(r.id), style: { cursor: "pointer" } })}
      columns={[
        {
          title: "Title",
          dataIndex: "title",
          render: (t: string, r: ContentItem) => (
            <Space direction="vertical" size={0}>
              <Typography.Text strong>{t}</Typography.Text>
              {r.slugOrRoute && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.slugOrRoute}</Typography.Text>}
            </Space>
          ),
        },
        {
          title: "Project",
          dataIndex: "projectId",
          render: (id: string | null) => <ProjectTag project={id ? projMap.get(id) : null} />,
        },
        { title: "Type", dataIndex: "contentType", render: (t: string) => <Tag>{t}</Tag> },
        { title: "Primary keyword", dataIndex: "primaryKeyword" },
        {
          title: "Publish",
          dataIndex: "publishDate",
          sorter: (a: ContentItem, b: ContentItem) => (a.publishDate || "").localeCompare(b.publishDate || ""),
          render: (d: string | null) => (d ? dayjs(d).format("MMM D, YYYY") : <Typography.Text type="secondary">—</Typography.Text>),
        },
        { title: "Status", dataIndex: "status", render: (s: ContentStatus) => <StatusTag status={s} /> },
        { title: "", key: "actions", width: 56, render: (_: unknown, r: ContentItem) => rowActions(r) },
      ]}
    />
  );

  const mobileList = (
    <List
      dataSource={filtered}
      renderItem={(i) => (
        <List.Item
          key={i.id}
          onClick={() => open(i.id)}
          style={{ cursor: "pointer", background: "var(--ant-color-bg-container, transparent)" }}
        >
          <List.Item.Meta
            title={
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <span>{i.title}</span>
                <StatusTag status={i.status} />
              </Space>
            }
            description={
              <Space size={6} wrap>
                <ProjectTag project={i.projectId ? projMap.get(i.projectId) : null} />
                <Tag>{i.contentType}</Tag>
                {i.publishDate && <Tag>{dayjs(i.publishDate).format("MMM D")}</Tag>}
                {i.primaryKeyword && <Tag color="geekblue">{i.primaryKeyword}</Tag>}
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );

  return (
    <div className="app-page">
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }} wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>Content</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => open(null)}>New</Button>
      </Space>
      {filtersBar}
      <Card size="small">
        {filtered.length ? (isMobile ? mobileList : desktopTable) : <Empty description="No content matches filters" />}
      </Card>

      <ContentEditorDrawer
        open={editorOpen}
        itemId={editId}
        projects={projects}
        onClose={() => setEditorOpen(false)}
        onChanged={refresh}
      />
    </div>
  );
}
