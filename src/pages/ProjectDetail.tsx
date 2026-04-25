import { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Empty,
  Grid,
  List,
  Modal,
  Result,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useContent } from "@/hooks/useContent";
import { useProjects } from "@/hooks/useProjects";
import { useTags } from "@/hooks/useTags";
import { contentRepo } from "@/db";
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
import DirtyDot from "@/components/DirtyDot";
import ProjectEditModal from "@/components/ProjectEditModal";
import StatusTag from "@/components/StatusTag";
import MediumIcon from "@/components/MediumIcon";
import TagChips from "@/components/TagChips";
import FilterSheet, { FilterField, type FilterChip } from "@/components/FilterSheet";
import { isItemDirty } from "@/lib/dirty";
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
  const isMobile = !screens.lg;

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

  const openEditor = (itemId: string | null) => {
    setEditId(itemId);
    setEditorOpen(true);
  };

  const handleChanged = () => {
    refreshItems();
  };

  useHeaderActions(
    project ? (
      <Space size={isMobile ? 4 : 8}>
        <Button
          icon={<EditOutlined />}
          onClick={() => setEditProjectOpen(true)}
          aria-label="Edit project"
        >
          {!isMobile && "Edit project"}
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openEditor(null)}
          aria-label="New content"
        >
          {!isMobile && "New"}
        </Button>
      </Space>
    ) : null,
  );

  const handleQuickStatus = async (itemId: string, status: ContentStatus) => {
    await contentRepo.update(itemId, { status });
    message.success("Status updated");
    refreshItems();
  };

  const handleDuplicate = async (itemId: string) => {
    await contentRepo.duplicate(itemId);
    refreshItems();
  };

  const handleDelete = (item: ContentItem) => {
    Modal.confirm({
      title: "Delete this item?",
      content: (
        <span>
          <strong>{item.title}</strong> will be removed. This can't be undone.
        </span>
      ),
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        await contentRepo.remove(item.id);
        message.success("Deleted");
        refreshItems();
      },
    });
  };

  const rowActions = (item: ContentItem) => {
    const stop = <T,>(fn: (arg: T) => void) => (info: { domEvent: React.MouseEvent | React.KeyboardEvent }) => {
      info.domEvent.stopPropagation();
      fn(undefined as unknown as T);
    };
    return (
      <Dropdown
        menu={{
          items: [
            { key: "edit", icon: <EditOutlined />, label: "Edit", onClick: stop(() => openEditor(item.id)) },
            { key: "dup", icon: <CopyOutlined />, label: "Duplicate", onClick: stop(() => handleDuplicate(item.id)) },
            { type: "divider" },
            ...CONTENT_STATUSES.map((s) => ({
              key: `s-${s}`,
              label: `Set: ${s}`,
              onClick: stop(() => handleQuickStatus(item.id, s)),
            })),
            { type: "divider" },
            { key: "del", icon: <DeleteOutlined />, danger: true, label: "Delete", onClick: stop(() => handleDelete(item)) },
          ],
        }}
        trigger={["click"]}
      >
        <Button type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
      </Dropdown>
    );
  };

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

  const desktopTable = (
    <Table
      rowKey="id"
      dataSource={filtered}
      pagination={{ pageSize: 20, hideOnSinglePage: true }}
      scroll={{ x: 1040 }}
      tableLayout="fixed"
      onRow={(r) => ({ onClick: () => openEditor(r.id), style: { cursor: "pointer" } })}
      columns={[
        {
          title: "Title",
          dataIndex: "title",
          width: 340,
          ellipsis: { showTitle: true },
          render: (t: string, r: ContentItem) => (
            <Space direction="vertical" size={0} style={{ width: "100%", minWidth: 0 }}>
              <Space size={6} style={{ width: "100%", minWidth: 0 }}>
                {isItemDirty(r.id) && <DirtyDot />}
                <Typography.Text strong ellipsis={{ tooltip: t }} style={{ flex: 1, minWidth: 0 }}>
                  {t}
                </Typography.Text>
              </Space>
              {r.slugOrRoute && (
                <Typography.Text
                  type="secondary"
                  ellipsis={{ tooltip: r.slugOrRoute }}
                  style={{ fontSize: 12, width: "100%" }}
                >
                  {r.slugOrRoute}
                </Typography.Text>
              )}
            </Space>
          ),
        },
        {
          title: "Medium",
          dataIndex: "medium",
          width: 130,
          ellipsis: true,
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
          width: 110,
          ellipsis: true,
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
          width: 180,
          ellipsis: true,
          render: (ids: string[]) => <TagChips tagIds={ids ?? []} tagsMap={tagsMap} max={3} />,
        },
        {
          title: "Publish",
          dataIndex: "publishDate",
          width: 130,
          sorter: (a: ContentItem, b: ContentItem) =>
            (a.publishDate || "").localeCompare(b.publishDate || ""),
          render: (d: string | null) =>
            d ? dayjs(d).format("MMM D, YYYY") : <Typography.Text type="secondary">—</Typography.Text>,
        },
        {
          title: "Status",
          dataIndex: "status",
          width: 110,
          render: (s: ContentStatus) => <StatusTag status={s} />,
        },
        { title: "", key: "actions", width: 56, fixed: "right", render: (_: unknown, r: ContentItem) => rowActions(r) },
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
          actions={rowActions(i)}
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

      {(() => {
        const tagNames = tagFilter
          .map((id) => tags.find((t) => t.id === id)?.name)
          .filter((n): n is string => !!n);

        const activeChips: FilterChip[] = [];
        if (statusFilter) {
          activeChips.push({
            key: "status",
            label: `Status: ${statusFilter}`,
            onRemove: () => setStatusFilter(null),
          });
        }
        if (mediumFilter) {
          activeChips.push({
            key: "medium",
            label: `Medium: ${mediumFilter}`,
            onRemove: () => setMediumFilter(null),
          });
        }
        if (funnelFilter) {
          activeChips.push({
            key: "funnel",
            label: `Funnel: ${funnelFilter}`,
            onRemove: () => setFunnelFilter(null),
          });
        }
        tagNames.forEach((name, idx) => {
          activeChips.push({
            key: `tag-${tagFilter[idx]}`,
            label: `Tag: ${name}`,
            onRemove: () => setTagFilter((prev) => prev.filter((id) => id !== tagFilter[idx])),
          });
        });
        if (dateRange) {
          activeChips.push({
            key: "date",
            label: `${dateRange[0].format("MMM D")} – ${dateRange[1].format("MMM D")}`,
            onRemove: () => setDateRange(null),
          });
        }

        const clearAllFilters = () => {
          setStatusFilter(null);
          setMediumFilter(null);
          setFunnelFilter(null);
          setTagFilter([]);
          setDateRange(null);
        };

        const filterControls = (
          <>
            <FilterField label="Status">
              <Select
                allowClear
                placeholder="Any status"
                value={statusFilter ?? undefined}
                onChange={(v) => setStatusFilter((v as ContentStatus) ?? null)}
                style={{ width: "100%" }}
                options={CONTENT_STATUSES.map((s) => ({ label: s, value: s }))}
              />
            </FilterField>
            <FilterField label="Medium">
              <Select
                allowClear
                placeholder="Any medium"
                value={mediumFilter ?? undefined}
                onChange={(v) => setMediumFilter((v as Medium) ?? null)}
                style={{ width: "100%" }}
                options={MEDIUMS.map((m) => ({ label: m, value: m }))}
              />
            </FilterField>
            <FilterField label="Funnel stage">
              <Select
                allowClear
                placeholder="Any stage"
                value={funnelFilter ?? undefined}
                onChange={(v) => setFunnelFilter((v as FunnelStage) ?? null)}
                style={{ width: "100%" }}
                options={FUNNEL_STAGES.map((s) => ({ label: s, value: s }))}
              />
            </FilterField>
            <FilterField label="Tags">
              <Select
                allowClear
                mode="multiple"
                placeholder="Any tags"
                value={tagFilter}
                onChange={(v) => setTagFilter(v)}
                style={{ width: "100%" }}
                options={tags.map((t) => ({ label: t.name, value: t.id }))}
              />
            </FilterField>
            <FilterField label="Publish date">
              <RangePicker
                style={{ width: "100%" }}
                value={dateRange as never}
                onChange={(v) => setDateRange(v as never)}
              />
            </FilterField>
          </>
        );

        return (
          <Card size="small" className="app-section">
            <FilterSheet
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title, keyword, slug, tags"
              activeChips={activeChips}
              onClearAll={clearAllFilters}
            >
              {filterControls}
            </FilterSheet>
          </Card>
        );
      })()}

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
