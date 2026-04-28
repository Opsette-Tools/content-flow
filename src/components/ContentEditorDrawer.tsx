import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Collapse,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  DownCircleOutlined,
  ExportOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { contentRepo, settingsRepo, tagsRepo } from "@/db";
import { useSettings } from "@/hooks/useSettings";
import { clearDraft, getDraft, setDraft } from "@/lib/drafts";
import { clearUnsynced } from "@/lib/unsynced";
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
  targetWordCount: number | null;
  draftUrl: string | null;
  publishedUrl: string | null;
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
    targetWordCount: item.targetWordCount ?? null,
    draftUrl: item.draftUrl ?? null,
    publishedUrl: item.publishedUrl ?? null,
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
    targetWordCount: null,
    draftUrl: null,
    publishedUrl: null,
    checklist: emptyChecklist(),
  };
}

function draftsEqual(a: DraftState, b: DraftState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function readingMinutes(words: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.round(words / 200));
}

function trimToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed : null;
}

// Soft URL check — accepts http(s), notion://, file paths, etc. Only used to
// flag obviously-broken paste, never to block save.
function looksLikeUrl(v: string | null): boolean {
  if (!v) return true; // empty is fine
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) || v.startsWith("/");
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

  // Drawer width (desktop only). Persisted across sessions so re-opening the
  // editor keeps your preferred width. Min 420 (form fields stop wrapping
  // weirdly), max 80% of viewport.
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 520;
    const stored = Number(localStorage.getItem("content-flow.editorDrawerWidth.v1"));
    if (Number.isFinite(stored) && stored >= 480) return stored;
    return 520;
  });
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragStateRef.current = { startX: e.clientX, startWidth: drawerWidth };
    const onMove = (ev: MouseEvent) => {
      const s = dragStateRef.current;
      if (!s) return;
      // Drag handle is on the left edge, so dragging left grows the drawer.
      const next = s.startWidth + (s.startX - ev.clientX);
      const max = Math.round(window.innerWidth * 0.8);
      const clamped = Math.max(480, Math.min(max, next));
      setDrawerWidth(clamped);
    };
    const onUp = () => {
      dragStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      try {
        localStorage.setItem(
          "content-flow.editorDrawerWidth.v1",
          String(drawerWidthRef.current),
        );
      } catch {
        // localStorage quota / privacy mode — width just won't persist
      }
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Keep a ref of the latest width so the dragend handler doesn't see a stale
  // closure value when persisting.
  const drawerWidthRef = useRef(drawerWidth);
  useEffect(() => {
    drawerWidthRef.current = drawerWidth;
  }, [drawerWidth]);

  // Section open/close state for the collapsible groups. "basics" is always
  // shown; the others remember their last-open state across sessions.
  const [openSections, setOpenSections] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["basics", "classification"];
    try {
      const raw = localStorage.getItem("content-flow.editorSections.v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === "string");
      }
    } catch {
      // ignore
    }
    return ["basics", "classification"];
  });
  useEffect(() => {
    try {
      localStorage.setItem(
        "content-flow.editorSections.v1",
        JSON.stringify(openSections),
      );
    } catch {
      // ignore
    }
  }, [openSections]);

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
      targetWordCount: draft.targetWordCount,
      draftUrl: draft.draftUrl ?? "",
      publishedUrl: draft.publishedUrl ?? "",
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
      targetWordCount:
        typeof all.targetWordCount === "number" && all.targetWordCount > 0
          ? Math.round(all.targetWordCount)
          : null,
      draftUrl: trimToNull(all.draftUrl),
      publishedUrl: trimToNull(all.publishedUrl),
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
          targetWordCount: draft.targetWordCount,
          draftUrl: draft.draftUrl,
          publishedUrl: draft.publishedUrl,
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
          targetWordCount: draft.targetWordCount,
          draftUrl: draft.draftUrl,
          publishedUrl: draft.publishedUrl,
          checklist: draft.checklist,
        });
        saved = created;
        // Move the draft/unsynced keys off the tentative id if they differ.
        // contentRepo.create has already marked the real id as unsynced; only
        // the tentative ghost needs cleaning up.
        if (activeId !== created.id) {
          clearDraft(activeId);
          clearUnsynced(activeId);
        }
      }
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
    await contentRepo.duplicate(persisted.id);
    message.success("Duplicated");
    onChanged();
    onClose();
  };

  const handleDelete = async () => {
    if (!persisted) return;
    await contentRepo.remove(persisted.id);
    // contentRepo.remove clears drafts/unsynced internally.
    message.success("Deleted");
    onChanged();
    onClose();
  };

  const checklistDone = Object.values(draft?.checklist ?? {}).filter(Boolean).length;
  const targetWordCount = draft?.targetWordCount ?? null;
  const targetReadMin = readingMinutes(targetWordCount ?? 0);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={persisted ? "Edit content" : "New content"}
      placement={isMobile ? "bottom" : "right"}
      width={isMobile ? "100%" : drawerWidth}
      height={isMobile ? "92%" : undefined}
      destroyOnClose
      classNames={{ body: "cf-editor-drawer-body" }}
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
      {!isMobile && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize editor"
          className="cf-drawer-resize-handle"
          onMouseDown={onResizeStart}
        />
      )}
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
        {/* Basics — always visible at the top, no Collapse wrapper. The
            common-case fields the user touches every time. */}
        <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title is required" }]}>
          <Input placeholder="e.g. How to plan content" />
        </Form.Item>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Form.Item name="projectId" label="Project">
            <Select
              allowClear
              placeholder="Select a project"
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={CONTENT_STATUSES.map((s) => ({ label: s, value: s }))} />
          </Form.Item>
          <Form.Item name="publishDate" label="Publish date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="targetWordCount"
            label={
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>Target word count</span>
                {targetReadMin > 0 && (
                  <Typography.Text type="secondary" style={{ fontWeight: 400, fontSize: 12 }}>
                    ~{targetReadMin} min read
                  </Typography.Text>
                )}
              </span>
            }
          >
            <InputNumber
              min={0}
              step={100}
              placeholder="e.g. 1500"
              style={{ width: "100%" }}
            />
          </Form.Item>
        </div>

        <Collapse
          ghost
          activeKey={openSections}
          onChange={(keys) =>
            setOpenSections(Array.isArray(keys) ? keys : [keys].filter(Boolean) as string[])
          }
          expandIcon={({ isActive }) => (
            <DownCircleOutlined
              rotate={isActive ? 0 : -90}
              style={{ fontSize: 16 }}
            />
          )}
          items={[
            {
              key: "classification",
              label: <span className="cf-section-title">Classification</span>,
              children: (
                <>
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
                </>
              ),
            },
            {
              key: "seo",
              label: <span className="cf-section-title">SEO</span>,
              children: (
                <>
                  <Form.Item name="slugOrRoute" label="Slug / Route">
                    <Input placeholder="/blog/my-post" />
                  </Form.Item>
                  <Form.Item name="primaryKeyword" label="Primary keyword">
                    <Input placeholder="primary keyword" />
                  </Form.Item>
                  <Form.Item name="secondaryKeywords" label="Secondary keywords">
                    <Select mode="tags" placeholder="Type and press enter" tokenSeparators={[","]} />
                  </Form.Item>
                </>
              ),
            },
            {
              key: "brief",
              label: <span className="cf-section-title">Brief / notes</span>,
              children: (
                <Form.Item name="briefNotes" noStyle>
                  <Input.TextArea rows={5} placeholder="Outline, angle, references…" />
                </Form.Item>
              ),
            },
            {
              key: "links",
              label: <span className="cf-section-title">Links</span>,
              children: (
                <>
                  <Form.Item
                    name="draftUrl"
                    label="Draft URL"
                    tooltip="Where the draft is being written — Google Doc, Notion, etc."
                    validateStatus={
                      draft?.draftUrl && !looksLikeUrl(draft.draftUrl) ? "warning" : undefined
                    }
                    help={
                      draft?.draftUrl && !looksLikeUrl(draft.draftUrl)
                        ? "Doesn't look like a URL — saved anyway."
                        : undefined
                    }
                  >
                    <Input
                      placeholder="https://docs.google.com/…"
                      suffix={
                        draft?.draftUrl ? (
                          <a
                            href={draft.draftUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open draft URL"
                            style={{ color: "inherit", display: "inline-flex" }}
                          >
                            <ExportOutlined />
                          </a>
                        ) : null
                      }
                    />
                  </Form.Item>
                  <Form.Item
                    name="publishedUrl"
                    label="Published URL"
                    tooltip="The live page once it's published."
                    validateStatus={
                      draft?.publishedUrl && !looksLikeUrl(draft.publishedUrl)
                        ? "warning"
                        : undefined
                    }
                    help={
                      draft?.publishedUrl && !looksLikeUrl(draft.publishedUrl)
                        ? "Doesn't look like a URL — saved anyway."
                        : undefined
                    }
                  >
                    <Input
                      placeholder="https://example.com/blog/post"
                      suffix={
                        draft?.publishedUrl ? (
                          <a
                            href={draft.publishedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open published URL"
                            style={{ color: "inherit", display: "inline-flex" }}
                          >
                            <ExportOutlined />
                          </a>
                        ) : null
                      }
                    />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />

        <Divider style={{ margin: "8px 0 12px" }} />
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="cf-section-title">Checklist</span>
          {checklistDone > 0 && (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              ({checklistDone}/{DEFAULT_CHECKLIST.length})
            </Typography.Text>
          )}
        </div>
        <ContentChecklist
          value={draft?.checklist ?? emptyChecklist()}
          onChange={onChecklistChange}
        />
      </Form>
    </Drawer>
  );
}
