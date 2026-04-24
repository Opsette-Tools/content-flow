import { useMemo, useState } from "react";
import {
  Button,
  Divider,
  Dropdown,
  InputNumber,
  Popconfirm,
  Popover,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import {
  CalendarOutlined,
  CloseOutlined,
  DeleteOutlined,
  FolderOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import { contentRepo, tagsRepo } from "@/db";
import {
  CONTENT_STATUSES,
  type ContentItem,
  type ContentStatus,
  type Project,
  type Tag,
} from "@/db/types";

interface Props {
  selectedIds: string[];
  items: ContentItem[];
  projects: Project[];
  tags: Tag[];
  onClear: () => void;
  onChanged: () => void | Promise<void>;
  onTagsChanged: () => void | Promise<void>;
}

const UNDO_KEY = "bulk-undo";

export default function BulkActionsToolbar({
  selectedIds,
  items,
  projects,
  tags,
  onClear,
  onChanged,
  onTagsChanged,
}: Props) {
  const [shiftDays, setShiftDays] = useState<number>(1);
  const [addTagPickerOpen, setAddTagPickerOpen] = useState(false);
  const [addTagValue, setAddTagValue] = useState<string | null>(null);
  const [removeTagPickerOpen, setRemoveTagPickerOpen] = useState(false);
  const [removeTagValue, setRemoveTagValue] = useState<string | null>(null);
  const [shiftPopoverOpen, setShiftPopoverOpen] = useState(false);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.includes(i.id)),
    [items, selectedIds],
  );

  const count = selectedIds.length;

  const snapshot = (): ContentItem[] =>
    selectedItems.map((i) => ({
      ...i,
      checklist: { ...i.checklist },
      tags: [...i.tags],
      secondaryKeywords: [...i.secondaryKeywords],
    }));

  const showUndoToast = (verb: string, snaps: ContentItem[], extra?: string) => {
    message.destroy(UNDO_KEY);
    const n = snaps.length;
    const text = `${verb} ${n} item${n === 1 ? "" : "s"}${extra ? " " + extra : ""}`;
    message.open({
      key: UNDO_KEY,
      type: "success",
      duration: 6,
      content: (
        <Space>
          <span>{text}</span>
          <Button
            type="link"
            size="small"
            onClick={async () => {
              message.destroy(UNDO_KEY);
              await contentRepo.restore(snaps);
              await onChanged();
              message.success("Undone");
            }}
          >
            Undo
          </Button>
        </Space>
      ),
    });
  };

  const applyStatus = async (status: ContentStatus) => {
    const snaps = snapshot();
    await Promise.allSettled(selectedIds.map((id) => contentRepo.update(id, { status })));
    await onChanged();
    showUndoToast("Changed status for", snaps);
  };

  const applyProject = async (projectId: string | null) => {
    const snaps = snapshot();
    await Promise.allSettled(selectedIds.map((id) => contentRepo.update(id, { projectId })));
    await onChanged();
    showUndoToast("Reassigned", snaps);
  };

  const applyShift = async () => {
    const n = shiftDays;
    if (!Number.isFinite(n) || n === 0) {
      setShiftPopoverOpen(false);
      return;
    }
    const withDate = selectedItems.filter((i) => !!i.publishDate);
    const skipped = selectedItems.length - withDate.length;
    if (withDate.length === 0) {
      message.info("No selected items have a publish date to shift");
      setShiftPopoverOpen(false);
      return;
    }
    const snaps = snapshot();
    await Promise.allSettled(
      withDate.map((i) =>
        contentRepo.update(i.id, {
          publishDate: dayjs(i.publishDate!).add(n, "day").format("YYYY-MM-DD"),
        }),
      ),
    );
    await onChanged();
    const extra =
      `by ${n} day${Math.abs(n) === 1 ? "" : "s"}` +
      (skipped > 0 ? ` (skipped ${skipped} with no date)` : "");
    message.destroy(UNDO_KEY);
    message.open({
      key: UNDO_KEY,
      type: "success",
      duration: 6,
      content: (
        <Space>
          <span>{`Shifted ${withDate.length} item${withDate.length === 1 ? "" : "s"} ${extra}`}</span>
          <Button
            type="link"
            size="small"
            onClick={async () => {
              message.destroy(UNDO_KEY);
              await contentRepo.restore(snaps);
              await onChanged();
              message.success("Undone");
            }}
          >
            Undo
          </Button>
        </Space>
      ),
    });
    setShiftPopoverOpen(false);
  };

  const applyAddTag = async () => {
    if (!addTagValue) return;
    const known = new Set(tags.map((t) => t.id));
    let tagId = addTagValue;
    if (!known.has(addTagValue)) {
      const created = await tagsRepo.create(addTagValue);
      tagId = created.id;
      await onTagsChanged();
    }
    const snaps = snapshot();
    await Promise.allSettled(
      selectedItems.map((i) => {
        if (i.tags.includes(tagId)) return Promise.resolve(i);
        return contentRepo.update(i.id, { tags: [...i.tags, tagId] });
      }),
    );
    await onChanged();
    showUndoToast("Added tag to", snaps);
    setAddTagValue(null);
    setAddTagPickerOpen(false);
  };

  const applyRemoveTag = async () => {
    if (!removeTagValue) return;
    const snaps = snapshot();
    await Promise.allSettled(
      selectedItems.map((i) => {
        if (!i.tags.includes(removeTagValue)) return Promise.resolve(i);
        return contentRepo.update(i.id, { tags: i.tags.filter((t) => t !== removeTagValue) });
      }),
    );
    await onChanged();
    showUndoToast("Removed tag from", snaps);
    setRemoveTagValue(null);
    setRemoveTagPickerOpen(false);
  };

  const applyDelete = async () => {
    const snaps = snapshot();
    // contentRepo.remove handles drafts/unsynced cleanup + bridge.delete
    // (when the id is parent-known) per-item.
    await Promise.allSettled(selectedIds.map((id) => contentRepo.remove(id)));
    await onChanged();
    onClear();
    showUndoToast("Deleted", snaps);
  };

  const statusMenu: MenuProps = {
    items: CONTENT_STATUSES.map((s) => ({
      key: `status-${s}`,
      label: s,
      onClick: () => applyStatus(s),
    })),
  };

  const projectMenu: MenuProps = {
    items: [
      { key: "no-project", label: "No project", onClick: () => applyProject(null) },
      { type: "divider" as const },
      ...projects.map((p) => ({
        key: `project-${p.id}`,
        label: p.name,
        onClick: () => applyProject(p.id),
      })),
    ],
  };

  const shiftContent = (
    <Space direction="vertical" size={8} style={{ minWidth: 200 }}>
      <Typography.Text>Shift by (days)</Typography.Text>
      <InputNumber
        value={shiftDays}
        onChange={(v) => setShiftDays(Number(v ?? 0))}
        style={{ width: "100%" }}
      />
      <Button type="primary" block onClick={applyShift}>
        Apply
      </Button>
    </Space>
  );

  const addTagContent = (
    <Space direction="vertical" size={8} style={{ minWidth: 240 }}>
      <Typography.Text>Pick or create a tag</Typography.Text>
      <Select
        mode="tags"
        maxCount={1}
        allowClear
        value={addTagValue ? [addTagValue] : []}
        onChange={(vals: string[]) => setAddTagValue(vals[0] ?? null)}
        placeholder="Choose or type a new tag"
        style={{ width: "100%" }}
        optionFilterProp="label"
        options={tags.map((t) => ({ label: t.name, value: t.id }))}
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Picks an existing tag by name; new names become new tags.
      </Typography.Text>
      <Button type="primary" block onClick={applyAddTag} disabled={!addTagValue}>
        Add tag
      </Button>
    </Space>
  );

  const tagsOnSelection = useMemo(() => {
    const ids = new Set<string>();
    for (const i of selectedItems) for (const t of i.tags) ids.add(t);
    return tags.filter((t) => ids.has(t.id));
  }, [selectedItems, tags]);

  const removeTagContent = (
    <Space direction="vertical" size={8} style={{ minWidth: 240 }}>
      <Typography.Text>Remove which tag?</Typography.Text>
      {tagsOnSelection.length === 0 ? (
        <Typography.Text type="secondary">Selected items have no tags.</Typography.Text>
      ) : (
        <>
          <Select
            showSearch
            allowClear
            value={removeTagValue ?? undefined}
            onChange={(v) => setRemoveTagValue(v ?? null)}
            placeholder="Pick a tag to remove"
            style={{ width: "100%" }}
            optionFilterProp="label"
            options={tagsOnSelection.map((t) => ({ label: t.name, value: t.id }))}
          />
          <Button type="primary" block onClick={applyRemoveTag} disabled={!removeTagValue}>
            Remove tag
          </Button>
        </>
      )}
    </Space>
  );

  return (
    <Space size={8} wrap>
      <Typography.Text strong>{count} selected</Typography.Text>
      <Divider type="vertical" />

      <Dropdown menu={statusMenu} trigger={["click"]}>
        <Button>Status</Button>
      </Dropdown>

      <Dropdown menu={projectMenu} trigger={["click"]}>
        <Button icon={<FolderOutlined />}>Project</Button>
      </Dropdown>

      <Popover
        trigger="click"
        open={shiftPopoverOpen}
        onOpenChange={setShiftPopoverOpen}
        content={shiftContent}
        title="Shift publish date"
        destroyTooltipOnHide
      >
        <Button icon={<CalendarOutlined />}>Shift date</Button>
      </Popover>

      <Popover
        trigger="click"
        open={addTagPickerOpen}
        onOpenChange={(o) => {
          setAddTagPickerOpen(o);
          if (!o) setAddTagValue(null);
        }}
        content={addTagContent}
        title="Add tag"
        destroyTooltipOnHide
      >
        <Button icon={<PlusCircleOutlined />}>Add tag</Button>
      </Popover>

      <Popover
        trigger="click"
        open={removeTagPickerOpen}
        onOpenChange={(o) => {
          setRemoveTagPickerOpen(o);
          if (!o) setRemoveTagValue(null);
        }}
        content={removeTagContent}
        title="Remove tag"
        destroyTooltipOnHide
      >
        <Button icon={<MinusCircleOutlined />}>Remove tag</Button>
      </Popover>

      <Popconfirm
        title={`Delete ${count} item${count === 1 ? "" : "s"}? This can be undone via toast.`}
        onConfirm={applyDelete}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <Button danger icon={<DeleteOutlined />}>
          Delete
        </Button>
      </Popconfirm>

      <Divider type="vertical" />

      <Button type="text" icon={<CloseOutlined />} onClick={onClear}>
        Clear
      </Button>
    </Space>
  );
}
