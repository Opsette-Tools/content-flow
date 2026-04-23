import { useMemo, useState } from "react";
import { Badge, Button, Calendar, Card, Drawer, Empty, Grid, List, Space, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useContent } from "@/hooks/useContent";
import { useProjects } from "@/hooks/useProjects";
import { STATUS_COLORS, type ContentItem } from "@/db/types";
import ContentEditorDrawer from "@/components/ContentEditorDrawer";
import StatusTag from "@/components/StatusTag";
import ProjectTag from "@/components/ProjectTag";

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

export default function CalendarView() {
  const { items, refresh } = useContent();
  const { projects } = useProjects();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(null);

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
    if (!list.length) return null;
    if (isMobile) {
      return <Badge count={list.length} style={{ backgroundColor: "#1677ff" }} />;
    }
    return (
      <ul className="calendar-cell-badges">
        {list.slice(0, 3).map((i) => (
          <li key={i.id}>
            <Badge status={badgeStatusFor(STATUS_COLORS[i.status]) as never} text={i.title} />
          </li>
        ))}
        {list.length > 3 && <li><Typography.Text type="secondary" style={{ fontSize: 12 }}>+{list.length - 3} more</Typography.Text></li>}
      </ul>
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

  const dayItems = selectedDate ? itemsByDate.get(selectedDate.format("YYYY-MM-DD")) ?? [] : [];

  return (
    <div className="app-page">
      <Card>
        <Calendar
          fullscreen={!isMobile}
          cellRender={(value, info) => (info.type === "date" ? dateCellRender(value) : null)}
          onSelect={onSelect}
        />
      </Card>

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
                  title={i.title}
                  description={
                    <Space size={6} wrap>
                      <ProjectTag project={i.projectId ? projMap.get(i.projectId) : null} />
                      <Tag>{i.contentType}</Tag>
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
        defaultDate={defaultDate}
        onClose={() => setEditorOpen(false)}
        onChanged={refresh}
      />
    </div>
  );
}
