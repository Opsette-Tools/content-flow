import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import { CopyOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { contentRepo, tagsRepo } from "@/db";
import {
  CONTENT_STATUSES,
  DEFAULT_CHECKLIST,
  FUNNEL_STAGES,
  MEDIUMS,
  type ContentItem,
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
  const [item, setItem] = useState<ContentItem | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [localTags, setLocalTags] = useState<Tag[]>(tags);
  const debounceRef = useRef<number | null>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!open) return;
      // Refresh tags list on open
      const fresh = await tagsRepo.list();
      if (active) setLocalTags(fresh);

      if (itemId) {
        const it = await contentRepo.get(itemId);
        if (!active || !it) return;
        setItem(it);
        setChecklist(it.checklist);
        form.setFieldsValue({
          title: it.title,
          projectId: it.projectId,
          slugOrRoute: it.slugOrRoute,
          medium: it.medium,
          funnelStage: it.funnelStage,
          tags: it.tags,
          status: it.status,
          primaryKeyword: it.primaryKeyword,
          secondaryKeywords: it.secondaryKeywords,
          publishDate: it.publishDate ? dayjs(it.publishDate) : null,
          briefNotes: it.briefNotes,
        });
      } else {
        const created = await contentRepo.create({
          title: "Untitled",
          projectId: defaultProjectId ?? null,
          publishDate: defaultDate ?? null,
        });
        if (!active) return;
        setItem(created);
        setChecklist(created.checklist);
        form.setFieldsValue({
          title: created.title,
          projectId: created.projectId,
          slugOrRoute: created.slugOrRoute,
          medium: created.medium,
          funnelStage: created.funnelStage,
          tags: created.tags,
          status: created.status,
          primaryKeyword: created.primaryKeyword,
          secondaryKeywords: created.secondaryKeywords,
          publishDate: created.publishDate ? dayjs(created.publishDate) : null,
          briefNotes: created.briefNotes,
        });
        onChanged();
      }
    }
    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId]);

  const persist = useMemo(
    () => (patch: Partial<ContentItem>) => {
      if (!item) return;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(async () => {
        const updated = await contentRepo.update(item.id, patch);
        setItem(updated);
        onChanged();
      }, 350);
    },
    [item, onChanged],
  );

  const onValuesChange = (_changed: Record<string, unknown>, all: Record<string, unknown>) => {
    if (!item) return;
    const publish = all.publishDate as dayjs.Dayjs | null | undefined;
    persist({
      title: (all.title as string) || "Untitled",
      projectId: (all.projectId as string) ?? null,
      slugOrRoute: (all.slugOrRoute as string) || "",
      medium: all.medium as ContentItem["medium"],
      funnelStage: all.funnelStage as ContentItem["funnelStage"],
      tags: (all.tags as string[]) || [],
      status: all.status as ContentItem["status"],
      primaryKeyword: (all.primaryKeyword as string) || "",
      secondaryKeywords: (all.secondaryKeywords as string[]) || [],
      publishDate: publish ? publish.format("YYYY-MM-DD") : null,
      briefNotes: (all.briefNotes as string) || "",
    });
  };

  const onChecklistChange = (v: Record<string, boolean>) => {
    setChecklist(v);
    if (item) {
      contentRepo.update(item.id, { checklist: v }).then(onChanged);
    }
  };

  const handleDuplicate = async () => {
    if (!item) return;
    await contentRepo.duplicate(item.id);
    message.success("Duplicated");
    onChanged();
    onClose();
  };

  const handleDelete = async () => {
    if (!item) return;
    await contentRepo.remove(item.id);
    message.success("Deleted");
    onChanged();
    onClose();
  };

  // Create tag inline when user types a new value in the multi-select
  const handleTagsChange = async (next: string[]) => {
    const known = new Set(localTags.map((t) => t.id));
    const created: Tag[] = [];
    const ids: string[] = [];
    for (const v of next) {
      if (known.has(v)) {
        ids.push(v);
      } else {
        // v is a new tag name
        const tag = await tagsRepo.create(v);
        created.push(tag);
        ids.push(tag.id);
      }
    }
    if (created.length) {
      setLocalTags(await tagsRepo.list());
    }
    form.setFieldsValue({ tags: ids });
    if (item) {
      const updated = await contentRepo.update(item.id, { tags: ids });
      setItem(updated);
      onChanged();
    }
  };

  const checklistDone = Object.values(checklist).filter(Boolean).length;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={item ? "Edit content" : "New content"}
      placement={isMobile ? "bottom" : "right"}
      width={isMobile ? "100%" : 520}
      height={isMobile ? "92%" : undefined}
      destroyOnClose
      extra={
        <Space>
          <Button icon={<CopyOutlined />} onClick={handleDuplicate}>
            Duplicate
          </Button>
          <Popconfirm title="Delete this item?" onConfirm={handleDelete} okText="Delete" okButtonProps={{ danger: true }}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={onValuesChange}
        initialValues={{ medium: "Article", funnelStage: "None", status: "Idea", secondaryKeywords: [], tags: [] }}
      >
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
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
          Checklist {checklistDone > 0 && <Typography.Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>({checklistDone}/{DEFAULT_CHECKLIST.length})</Typography.Text>}
        </Typography.Title>
        <ContentChecklist value={checklist} onChange={onChecklistChange} />
      </Form>
    </Drawer>
  );
}
