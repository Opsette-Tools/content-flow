import { useEffect, useMemo, useRef, useState } from "react";
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
  Modal,
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
import { useTags } from "@/hooks/useTags";
import { contentRepo } from "@/db";
import { clearDraft } from "@/lib/drafts";
import { clearUnsynced, markUnsynced } from "@/lib/unsynced";
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
import StatusTag from "@/components/StatusTag";
import ProjectTag from "@/components/ProjectTag";
import MediumIcon from "@/components/MediumIcon";
import TagChips from "@/components/TagChips";
import ContentEditorDrawer from "@/components/ContentEditorDrawer";
import ContentRow from "@/components/ContentRow";
import BulkActionsToolbar from "@/components/BulkActionsToolbar";
import DirtyDot from "@/components/DirtyDot";
import { isItemDirty } from "@/lib/dirty";
import { useAppCommands } from "@/app/AppCommands";
import { filterContent } from "@/utils/filterContent";
import { useHeaderActions } from "@/layout/HeaderSlots";
import type { InputRef } from "antd";

const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

export default function ContentList() {
  const { items, refresh } = useContent();
  const { projects } = useProjects();
  const { tags, refresh: refreshTags } = useTags();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContentStatus | null>(null);
  const [mediumFilter, setMediumFilter] = useState<Medium | null>(null);
  const [funnelFilter, setFunnelFilter] = useState<FunnelStage | null>(null);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);

  const searchRef = useRef<InputRef>(null);
  const { focusSearchRef } = useAppCommands();
  useEffect(() => {
    focusSearchRef.current = () => searchRef.current?.focus({ cursor: "end" });
    return () => {
      focusSearchRef.current = null;
    };
  }, [focusSearchRef]);

  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const tagsMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const filtered = useMemo(
    () =>
      filterContent(items, {
        search,
        projectId: projectFilter,
        status: statusFilter,
        medium: mediumFilter,
        funnelStage: funnelFilter,
        tagIds: tagFilter,
        dateRange,
        tagsMap,
      }),
    [items, search, projectFilter, statusFilter, mediumFilter, funnelFilter, tagFilter, dateRange, tagsMap],
  );

  // Prune selection to only items still visible after filter changes.
  useEffect(() => {
    if (!selectedIds.length) return;
    const visible = new Set(filtered.map((i) => i.id));
    const pruned = selectedIds.filter((id) => visible.has(id));
    if (pruned.length !== selectedIds.length) setSelectedIds(pruned);
  }, [filtered, selectedIds]);

  const open = (id: string | null) => {
    setEditId(id);
    setEditorOpen(true);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectMode(false);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const hasSelection = selectedIds.length > 0;

  const headerNode = hasSelection ? (
    <BulkActionsToolbar
      selectedIds={selectedIds}
      items={items}
      projects={projects}
      tags={tags}
      onClear={clearSelection}
      onChanged={async () => {
        await refresh();
      }}
      onTagsChanged={async () => {
        await refreshTags();
      }}
    />
  ) : (
    <Button type="primary" icon={<PlusOutlined />} onClick={() => open(null)}>
      New
    </Button>
  );

  useHeaderActions(headerNode);

  const handleQuickStatus = async (id: string, status: ContentStatus) => {
    const updated = await contentRepo.update(id, { status });
    markUnsynced(updated);
    message.success("Status updated");
    refresh();
  };

  const handleDuplicate = async (id: string) => {
    const copy = await contentRepo.duplicate(id);
    if (copy) markUnsynced(copy);
    refresh();
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
        clearDraft(item.id);
        clearUnsynced(item.id);
        message.success("Deleted");
        refresh();
      },
    });
  };

  const handleChanged = () => {
    refresh();
    refreshTags();
  };

  const rowActions = (item: ContentItem) => {
    // Wrap each menu-item handler to stop the click from bubbling up to the
    // row's onClick (which would open the drawer after a delete/duplicate).
    const stop = <T,>(fn: (arg: T) => void) => (info: { domEvent: React.MouseEvent | React.KeyboardEvent }) => {
      info.domEvent.stopPropagation();
      fn(undefined as unknown as T);
    };
    return (
      <Dropdown
        menu={{
          items: [
            { key: "edit", icon: <EditOutlined />, label: "Edit", onClick: stop(() => open(item.id)) },
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

  const filtersBar = (
    <Card size="small" className="app-section">
      <Row gutter={[8, 8]} align="middle">
        <Col xs={24} md={6}>
          <Input.Search ref={searchRef} allowClear placeholder="Search title, keyword, slug, tags" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Col>
        <Col xs={12} md={3}>
          <Select
            allowClear
            placeholder="Project"
            value={projectFilter ?? undefined}
            onChange={(v) => setProjectFilter(v ?? null)}
            style={{ width: "100%" }}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Col>
        <Col xs={12} md={3}>
          <Select
            allowClear
            placeholder="Status"
            value={statusFilter ?? undefined}
            onChange={(v) => setStatusFilter((v as ContentStatus) ?? null)}
            style={{ width: "100%" }}
            options={CONTENT_STATUSES.map((s) => ({ label: s, value: s }))}
          />
        </Col>
        <Col xs={12} md={3}>
          <Select
            allowClear
            placeholder="Medium"
            value={mediumFilter ?? undefined}
            onChange={(v) => setMediumFilter((v as Medium) ?? null)}
            style={{ width: "100%" }}
            options={MEDIUMS.map((m) => ({ label: m, value: m }))}
          />
        </Col>
        <Col xs={12} md={3}>
          <Select
            allowClear
            placeholder="Funnel"
            value={funnelFilter ?? undefined}
            onChange={(v) => setFunnelFilter((v as FunnelStage) ?? null)}
            style={{ width: "100%" }}
            options={FUNNEL_STAGES.map((s) => ({ label: s, value: s }))}
          />
        </Col>
        <Col xs={24} md={3}>
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
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <RangePicker
              style={{ flex: 1 }}
              value={dateRange as never}
              onChange={(v) => setDateRange(v as never)}
            />
            {isMobile && (
              <Button
                type={selectMode ? "primary" : "default"}
                onClick={() => {
                  if (selectMode) {
                    clearSelection();
                  } else {
                    setSelectMode(true);
                  }
                }}
              >
                {selectMode ? "Done" : "Select"}
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const desktopTable = (
    <Table
      rowKey="id"
      dataSource={filtered}
      pagination={{ pageSize: 20, hideOnSinglePage: true }}
      rowSelection={{
        selectedRowKeys: selectedIds,
        onChange: (keys) => setSelectedIds(keys as string[]),
      }}
      onRow={(r) => ({ onClick: () => open(r.id), style: { cursor: "pointer" } })}
      columns={[
        {
          title: "Title",
          dataIndex: "title",
          render: (t: string, r: ContentItem) => (
            <Space direction="vertical" size={0}>
              <Space size={6}>
                {isItemDirty(r.id) && <DirtyDot />}
                <Typography.Text strong>{t}</Typography.Text>
              </Space>
              {r.slugOrRoute && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.slugOrRoute}</Typography.Text>}
            </Space>
          ),
        },
        {
          title: "Project",
          dataIndex: "projectId",
          render: (id: string | null) => <ProjectTag project={id ? projMap.get(id) : null} />,
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
            s && s !== "None" ? <Tag color={FUNNEL_COLORS[s]}>{s}</Tag> : <Typography.Text type="secondary">—</Typography.Text>,
        },
        {
          title: "Tags",
          dataIndex: "tags",
          render: (ids: string[]) => <TagChips tagIds={ids ?? []} tagsMap={tagsMap} max={3} />,
        },
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

  const mobileSelectable = selectMode || selectedIds.length > 0;

  const mobileList = (
    <List
      dataSource={filtered}
      renderItem={(i) => (
        <ContentRow
          key={i.id}
          item={i}
          projectsMap={projMap}
          tagsMap={tagsMap}
          onClick={(it) => open(it.id)}
          selectable={mobileSelectable}
          selected={selectedIds.includes(i.id)}
          onToggleSelect={handleToggleSelect}
        />
      )}
    />
  );

  return (
    <div className="app-page">
      {filtersBar}
      <Card size="small">
        {filtered.length ? (isMobile ? mobileList : desktopTable) : <Empty description="No content matches filters" />}
      </Card>

      <ContentEditorDrawer
        open={editorOpen}
        itemId={editId}
        projects={projects}
        tags={tags}
        onClose={() => setEditorOpen(false)}
        onChanged={handleChanged}
      />
    </div>
  );
}
