import { useMemo, useState } from "react";
import { Badge, Button, Calendar, Card, Drawer, Empty, Grid, List, Space, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useContent } from "@/hooks/useContent";
import { useProjects } from "@/hooks/useProjects";
import { useTags } from "@/hooks/useTags";
import { contentRepo } from "@/db";
import { STATUS_COLORS, type ContentItem } from "@/db/types";
import ContentEditorDrawer from "@/components/ContentEditorDrawer";
import StatusTag from "@/components/StatusTag";
import ProjectTag from "@/components/ProjectTag";
import MediumIcon from "@/components/MediumIcon";

const { useBreakpoint } = Grid;

const badgeStatusFor = (color: string) => {
  // map antd tag color names to badge status
  switch (color) {
    case "blue":
      return "processing";
    case "gold":
      return "warning";
    case "green":
      return "success";
    case "purple":
      return "default";
    default:
      return "default";
  }
};

function DraggableItem({ item }: { item: ContentItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: "grab",
        touchAction: "none",
      }}
    >
      <Badge status={badgeStatusFor(STATUS_COLORS[item.status]) as never} text={item.title} />
    </li>
  );
}

function DroppableCell({ dateKey, children }: { dateKey: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  return (
    <div
      ref={setNodeRef}
      className={isOver ? "calendar-day-droppable calendar-day-droppable--over" : "calendar-day-droppable"}
      style={{ minHeight: 24 }}
    >
      {children}
    </div>
  );
}

export default function CalendarView() {
  const { items, refresh } = useContent();
  const { projects } = useProjects();
  const { tags } = useTags();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(null);

  // PointerSensor with 5px activation — under 5px of movement stays a click,
  // preserving the day-drawer open behavior.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ContentItem[]>();
    items.forEach((i) => {
      if (!i.publishDate) return;
      if (!map.has(i.publishDate)) map.set(i.publishDate, []);
      map.get(i.publishDate)!.push(i);
    });
    return map;
  }, [items]);

  const dateCellRender = (value: Dayjs) => {
    const key = value.format("YYYY-MM-DD");
    const list = itemsByDate.get(key) ?? [];

    if (isMobile) {
      // Mobile: badge-count only, no drag, no droppable wrapper
      if (!list.length) return null;
      return <Badge count={list.length} style={{ backgroundColor: "#1677ff" }} />;
    }

    // Desktop: every cell is a droppable, even empty ones
    return (
      <DroppableCell dateKey={key}>
        {list.length > 0 && (
          <ul className="calendar-cell-badges">
            {list.slice(0, 3).map((i) => (
              <DraggableItem key={i.id} item={i} />
            ))}
            {list.length > 3 && (
              <li>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  +{list.length - 3} more
                </Typography.Text>
              </li>
            )}
          </ul>
        )}
      </DroppableCell>
    );
  };

  const onSelect = (date: Dayjs) => {
    setSelectedDate(date);
    setDayDrawerOpen(true);
  };

  const openEditor = (id: string | null) => {
    setEditId(id);
    setDefaultDate(selectedDate ? selectedDate.format("YYYY-MM-DD") : null);
    setEditorOpen(true);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const itemId = String(e.active.id);
    const newDate = e.over?.id ? String(e.over.id) : null;
    if (!newDate) return;

    const item = items.find((i) => i.id === itemId);
    if (!item || item.publishDate === newDate) return;

    try {
      await contentRepo.update(itemId, { publishDate: newDate });
      refresh();
      message.success(`Rescheduled to ${dayjs(newDate).format("MMM D")}`);
    } catch {
      message.error("Failed to reschedule");
    }
  };

  const dayItems = selectedDate ? itemsByDate.get(selectedDate.format("YYYY-MM-DD")) ?? [] : [];

  return (
    <div className="app-page">
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <Card>
          <Calendar
            fullscreen={!isMobile}
            cellRender={(value, info) => (info.type === "date" ? dateCellRender(value) : null)}
            onSelect={onSelect}
          />
        </Card>
      </DndContext>

      <Drawer
        open={dayDrawerOpen}
        onClose={() => setDayDrawerOpen(false)}
        title={selectedDate ? selectedDate.format("dddd, MMM D, YYYY") : ""}
        placement={isMobile ? "bottom" : "right"}
        width={isMobile ? "100%" : 420}
        height={isMobile ? "70%" : undefined}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setDayDrawerOpen(false); openEditor(null); }}>
            Add for this date
          </Button>
        }
      >
        {dayItems.length ? (
          <List
            dataSource={dayItems}
            renderItem={(i) => (
              <List.Item
                key={i.id}
                onClick={() => { setDayDrawerOpen(false); setEditId(i.id); setEditorOpen(true); }}
                style={{ cursor: "pointer" }}
                actions={[<StatusTag key="s" status={i.status} />]}
              >
                <List.Item.Meta
                  title={
                    <Space size={6}>
                      <MediumIcon medium={i.medium} />
                      <span>{i.title}</span>
                    </Space>
                  }
                  description={
                    <Space size={6} wrap>
                      <ProjectTag project={i.projectId ? projMap.get(i.projectId) : null} />
                      <Tag>{i.medium}</Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No content scheduled" />
        )}
      </Drawer>

      <ContentEditorDrawer
        open={editorOpen}
        itemId={editId}
        projects={projects}
        tags={tags}
        defaultDate={defaultDate}
        onClose={() => setEditorOpen(false)}
        onChanged={refresh}
      />
    </div>
  );
}
