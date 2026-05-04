import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Empty,
  Grid,
  List,
  Modal,
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
import FilterSheet, { FilterField, type FilterChip } from "@/components/FilterSheet";
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
  const isMobile = !screens.lg;

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
    <Button type="primary" icon={<PlusOutlined />} onClick={() => open(null)} aria-label="New content">
      {!isMobile && "New"}
    </Button>
  );

  useHeaderActions(headerNode);

  const handleQuickStatus = async (id: string, status: ContentStatus) => {
    await contentRepo.update(id, { status });
    message.success("Status updated");
    refresh();
  };

  const handleDuplicate = async (id: string) => {
    await contentRepo.duplicate(id);
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

  const projectName = projectFilter ? projects.find((p) => p.id === projectFilter)?.name : null;
  const tagNames = tagFilter
    .map((id) => tags.find((t) => t.id === id)?.name)
    .filter((n): n is string => !!n);

  const activeChips: FilterChip[] = [];
  if (projectFilter) {
    activeChips.push({
      key: "project",
      label: `Project: ${projectName ?? projectFilter}`,
      onRemove: () => setProjectFilter(null),
    });
  }
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
    setProjectFilter(null);
    setStatusFilter(null);
    setMediumFilter(null);
    setFunnelFilter(null);
    setTagFilter([]);
    setDateRange(null);
  };

  const filterControls = (
    <>
      <FilterField label="Project">
        <Select
          allowClear
          placeholder="Any project"
          value={projectFilter ?? undefined}
          onChange={(v) => setProjectFilter(v ?? null)}
          style={{ width: "100%" }}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
        />
      </FilterField>
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

  const filtersBar = (
    <Card size="small" className="app-section">
      <FilterSheet
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search title, keyword, slug, tags"
        searchRef={searchRef}
        activeChips={activeChips}
        onClearAll={clearAllFilters}
        rightSlot={
          isMobile ? (
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
          ) : null
        }
      >
        {filterControls}
      </FilterSheet>
    </Card>
  );

  const desktopTable = (
    <Table
      rowKey="id"
      dataSource={filtered}
      pagination={{ pageSize: 20, hideOnSinglePage: true }}
      scroll={{ x: 1100 }}
      tableLayout="fixed"
      rowSelection={{
        selectedRowKeys: selectedIds,
        onChange: (keys) => setSelectedIds(keys as string[]),
      }}
      onRow={(r) => ({ onClick: () => open(r.id), style: { cursor: "pointer" } })}
      columns={[
        {
          title: "Title",
          dataIndex: "title",
          width: 320,
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
          title: "Project",
          dataIndex: "projectId",
          width: 140,
          ellipsis: true,
          render: (id: string | null) => <ProjectTag project={id ? projMap.get(id) : null} />,
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
            s && s !== "None" ? <Tag color={FUNNEL_COLORS[s]}>{s}</Tag> : <Typography.Text type="secondary">—</Typography.Text>,
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
          sorter: (a: ContentItem, b: ContentItem) => (a.publishDate || "").localeCompare(b.publishDate || ""),
          render: (d: string | null) => (d ? dayjs(d).format("MMM D, YYYY") : <Typography.Text type="secondary">—</Typography.Text>),
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
    <div className="app-page app-page--wide">
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
