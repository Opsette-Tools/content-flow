import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { CopyOutlined, DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { contentRepo, settingsRepo, tagsRepo } from "@/db";
import { useSettings } from "@/hooks/useSettings";
import { clearDraft, getDraft, setDraft } from "@/lib/drafts";
import { clearUnsynced, markUnsynced } from "@/lib/unsynced";
import {
  CONTENT_STATUSES,
  DEFAULT_CHECKLIST,
  FUNNEL_STAGES,
  MEDIUMS,
  type ContentItem,
  type ContentStatus,
  type ContentType,
  type FunnelStage,
  type Medium,
  type Project,
  type Tag,
} from "@/db/types";
import ContentChecklist from "./ContentChecklist";
import MediumIcon from "./MediumIcon";

interface Props {
  open: boolean;
  itemId: string | null;
  projects: Project[];
  tags?: Tag[];
  defaultProjectId?: string | null;
  defaultDate?: string | null;
  onClose: () => void;
  onChanged: () => void;
}

interface DraftState {
  title: string;
  projectId: string | null;
  slugOrRoute: string;
  contentType: ContentType;
  medium: Medium;
  funnelStage: FunnelStage;
  tags: string[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  publishDate: string | null;
  status: ContentStatus;
  briefNotes: string;
  checklist: Record<string, boolean>;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyChecklist(): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  DEFAULT_CHECKLIST.forEach((label) => (m[label] = false));
  return m;
}

function itemToDraft(item: ContentItem): DraftState {
  return {
    title: item.title,
    projectId: item.projectId,
    slugOrRoute: item.slugOrRoute,
    contentType: item.contentType,
    medium: item.medium,
    funnelStage: item.funnelStage,
    tags: [...item.tags],
    primaryKeyword: item.primaryKeyword,
    secondaryKeywords: [...item.secondaryKeywords],
    publishDate: item.publishDate,
    status: item.status,
    briefNotes: item.briefNotes,
    checklist: { ...item.checklist },
  };
}

function blankDraft(defaultProjectId: string | null, defaultDate: string | null): DraftState {
  return {
    title: "",
    projectId: defaultProjectId,
    slugOrRoute: "",
    contentType: "Article",
    medium: "Article",
    funnelStage: "None",
    tags: [],
    primaryKeyword: "",
    secondaryKeywords: [],
    publishDate: defaultDate,
    status: "Idea",
    briefNotes: "",
    checklist: emptyChecklist(),
  };
}

function draftsEqual(a: DraftState, b: DraftState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function ContentEditorDrawer({
  open,
  itemId,
  projects,
  tags = [],
  defaultProjectId,
  defaultDate,
  onClose,
  onChanged,
}: Props) {
  const [form] = Form.useForm();
  const [persisted, setPersisted] = useState<ContentItem | null>(null);
  const [draft, setDraftState] = useState<DraftState | null>(null);
  // Tentative id for a brand-new item — stable from drawer-open until close/save,
  // so the draft key survives a refresh mid-edit.
  const [tentativeId, setTentativeId] = useState<string | null>(null);
  const [localTags, setLocalTags] = useState<Tag[]>(tags);
  const [saving, setSaving] = useState(false);
  const draftWriteRef = useRef<number | null>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const { refresh: refreshSettings } = useSettings();

  const activeId = itemId ?? tentativeId;
  const isNew = !itemId;

  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  // Hydrate on open / id change.
  useEffect(() => {
    let active = true;
    async function load() {
      if (!open) return;
      const fresh = await tagsRepo.list();
      if (!active) return;
      setLocalTags(fresh);

      if (itemId) {
        const it = await contentRepo.get(itemId);
        if (!active || !it) return;
        setPersisted(it);
        setTentativeId(null);
        settingsRepo.pushRecentItem(itemId).then(() => {
          if (active) refreshSettings();
        }).catch(() => {});
        const base = itemToDraft(it);
        const stored = getDraft(itemId);
        const merged = stored ? { ...base, ...stored } : base;
        setDraftState(merged);
      } else {
        const id = uid();
        if (!active) return;
        setPersisted(null);
        setTentativeId(id);
        const base = blankDraft(defaultProjectId ?? null, defaultDate ?? null);
        const stored = getDraft(id);
        const merged = stored ? { ...base, ...stored } : base;
        setDraftState(merged);
      }
    }
    load();
    return () => {
      active = false;
      if (draftWriteRef.current) {
        window.clearTimeout(draftWriteRef.current);
        draftWriteRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId]);

  // Keep antd Form values in sync with draft state (hydration + external patches).
  useEffect(() => {
    if (!draft) return;
    form.setFieldsValue({
      title: draft.title,
      projectId: draft.projectId,
      slugOrRoute: draft.slugOrRoute,
      medium: draft.medium,
      funnelStage: draft.funnelStage,
      tags: draft.tags,
      status: draft.status,
      primaryKeyword: draft.primaryKeyword,
      secondaryKeywords: draft.secondaryKeywords,
      publishDate: draft.publishDate ? dayjs(draft.publishDate) : null,
      briefNotes: draft.briefNotes,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft ? activeId : null]);

  const baseline: DraftState | null = useMemo(() => {
    if (!draft) return null;
    if (persisted) return itemToDraft(persisted);
    return blankDraft(defaultProjectId ?? null, defaultDate ?? null);
  }, [persisted, defaultProjectId, defaultDate, draft]);

  const isDirty = useMemo(() => {
    if (!draft || !baseline) return false;
    return !draftsEqual(draft, baseline);
  }, [draft, baseline]);

  // Persist draft to localStorage (debounced) whenever it differs from baseline.
  useEffect(() => {
    if (!draft || !baseline || !activeId) return;
    if (draftWriteRef.current) window.clearTimeout(draftWriteRef.current);
    draftWriteRef.current = window.setTimeout(() => {
      if (draftsEqual(draft, baseline)) {
        clearDraft(activeId);
      } else {
        setDraft(activeId, draft as Partial<ContentItem>);
      }
    }, 300);
    return () => {
      if (draftWriteRef.current) {
        window.clearTimeout(draftWriteRef.current);
        draftWriteRef.current = null;
      }
    };
  }, [draft, baseline, activeId]);

  const patchDraft = (patch: Partial<DraftState>) => {
    setDraftState((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const onValuesChange = (_changed: Record<string, unknown>, all: Record<string, unknown>) => {
    const publish = all.publishDate as dayjs.Dayjs | null | undefined;
    patchDraft({
      title: (all.title as string) ?? "",
      projectId: (all.projectId as string) ?? null,
      slugOrRoute: (all.slugOrRoute as string) ?? "",
      medium: all.medium as Medium,
      funnelStage: all.funnelStage as FunnelStage,
      tags: (all.tags as string[]) ?? [],
      status: all.status as ContentStatus,
      primaryKeyword: (all.primaryKeyword as string) ?? "",
      secondaryKeywords: (all.secondaryKeywords as string[]) ?? [],
      publishDate: publish ? publish.format("YYYY-MM-DD") : null,
      briefNotes: (all.briefNotes as string) ?? "",
    });
  };

  const onChecklistChange = (v: Record<string, boolean>) => {
    patchDraft({ checklist: v });
  };

  // Inline-create tags still commits to IDB immediately (tags are a B3 concern).
  // But the draft's tags array is updated locally; nothing else persists until Save.
  const handleTagsChange = async (next: string[]) => {
    const known = new Set(localTags.map((t) => t.id));
    const ids: string[] = [];
    let createdAny = false;
    for (const v of next) {
      if (known.has(v)) {
        ids.push(v);
      } else {
        const tag = await tagsRepo.create(v);
        ids.push(tag.id);
        createdAny = true;
      }
    }
    if (createdAny) {
      setLocalTags(await tagsRepo.list());
    }
    form.setFieldsValue({ tags: ids });
    patchDraft({ tags: ids });
  };

  const handleSave = async () => {
    if (!draft || !activeId) return;
    try {
      await form.validateFields(["title"]);
    } catch {
      return;
    }
    const title = draft.title.trim() || "Untitled";

    setSaving(true);
    try {
      let saved: ContentItem;
      if (persisted) {
        saved = await contentRepo.update(persisted.id, {
          title,
          projectId: draft.projectId,
          slugOrRoute: draft.slugOrRoute,
          contentType: draft.contentType,
          medium: draft.medium,
          funnelStage: draft.funnelStage,
          tags: draft.tags,
          primaryKeyword: draft.primaryKeyword,
          secondaryKeywords: draft.secondaryKeywords,
          publishDate: draft.publishDate,
          status: draft.status,
          briefNotes: draft.briefNotes,
          checklist: draft.checklist,
        });
      } else {
        // Brand-new item — create using the tentative id so the draft key matches
        // the eventually-persisted row. Fall back to a repo-generated id if
        // contentRepo.create doesn't honor a provided id (it doesn't today, so
        // we post-hoc reconcile the draft key).
        const created = await contentRepo.create({
          title,
          projectId: draft.projectId,
          slugOrRoute: draft.slugOrRoute,
          contentType: draft.contentType,
          medium: draft.medium,
          funnelStage: draft.funnelStage,
          tags: draft.tags,
          primaryKeyword: draft.primaryKeyword,
          secondaryKeywords: draft.secondaryKeywords,
          publishDate: draft.publishDate,
          status: draft.status,
          briefNotes: draft.briefNotes,
          checklist: draft.checklist,
        });
        saved = created;
        // Move the draft/unsynced keys off the tentative id if they differ.
        if (activeId !== created.id) {
          clearDraft(activeId);
          clearUnsynced(activeId);
        }
      }
      markUnsynced(saved);
      clearDraft(saved.id);
      message.success("Saved");
      onChanged();
      onClose();
    } catch (err) {
      console.error("[content-flow] Save failed:", err);
      message.error("Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!persisted) return;
    const copy = await contentRepo.duplicate(persisted.id);
    if (copy) markUnsynced(copy);
    message.success("Duplicated");
    onChanged();
    onClose();
  };

  const handleDelete = async () => {
    if (!persisted) return;
    await contentRepo.remove(persisted.id);
    clearDraft(persisted.id);
    clearUnsynced(persisted.id);
    message.success("Deleted");
    onChanged();
    onClose();
  };

  const checklistDone = Object.values(draft?.checklist ?? {}).filter(Boolean).length;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={persisted ? "Edit content" : "New content"}
      placement={isMobile ? "bottom" : "right"}
      width={isMobile ? "100%" : 520}
      height={isMobile ? "92%" : undefined}
      destroyOnClose
      extra={
        <Space>
          {persisted && (
            <Button icon={<CopyOutlined />} onClick={handleDuplicate}>
              Duplicate
            </Button>
          )}
          {persisted && (
            <Popconfirm
              title="Delete this item?"
              onConfirm={handleDelete}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      }
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>Close</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={!isDirty && !!persisted}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      }
    >
      {isDirty && (
        <Alert
          type="warning"
          showIcon
          message="Unsaved changes — only stored on this device until you click Save."
          style={{ marginBottom: 16 }}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onValuesChange={onValuesChange}
        initialValues={{
          medium: "Article",
          funnelStage: "None",
          status: "Idea",
          secondaryKeywords: [],
          tags: [],
        }}
      >
        <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title is required" }]}>
          <Input placeholder="e.g. How to plan content" />
        </Form.Item>
        <Form.Item name="projectId" label="Project">
          <Select
            allowClear
            placeholder="Select a project"
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Form.Item>
        <Form.Item name="slugOrRoute" label="Slug / Route">
          <Input placeholder="/blog/my-post" />
        </Form.Item>
        <Form.Item name="medium" label="Medium">
          <Select
            options={MEDIUMS.map((m) => ({
              value: m,
              label: (
                <Space size={6}>
                  <MediumIcon medium={m} />
                  <span>{m}</span>
                </Space>
              ),
            }))}
          />
        </Form.Item>
        <Form.Item name="funnelStage" label="Funnel stage">
          <Select options={FUNNEL_STAGES.map((s) => ({ label: s, value: s }))} />
        </Form.Item>
        <Form.Item name="tags" label="Tags">
          <Select
            mode="tags"
            placeholder="Add tags (type to create)"
            tokenSeparators={[","]}
            onChange={handleTagsChange}
            options={localTags.map((t) => ({ label: t.name, value: t.id }))}
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select options={CONTENT_STATUSES.map((s) => ({ label: s, value: s }))} />
        </Form.Item>
        <Form.Item name="primaryKeyword" label="Primary keyword">
          <Input placeholder="primary keyword" />
        </Form.Item>
        <Form.Item name="secondaryKeywords" label="Secondary keywords">
          <Select mode="tags" placeholder="Type and press enter" tokenSeparators={[","]} />
        </Form.Item>
        <Form.Item name="publishDate" label="Publish date">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="briefNotes" label="Brief / notes">
          <Input.TextArea rows={4} placeholder="Outline, angle, references…" />
        </Form.Item>

        <Typography.Title level={5} style={{ marginTop: 8 }}>
          Checklist{" "}
          {checklistDone > 0 && (
            <Typography.Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>
              ({checklistDone}/{DEFAULT_CHECKLIST.length})
            </Typography.Text>
          )}
        </Typography.Title>
        <ContentChecklist value={draft?.checklist ?? emptyChecklist()} onChange={onChecklistChange} />
      </Form>
    </Drawer>
  );
}
