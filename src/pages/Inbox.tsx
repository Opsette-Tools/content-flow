import { useMemo } from "react";
import { Button, Card, Empty, List, Space, Typography } from "antd";
import { InboxOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useContent } from "@/hooks/useContent";
import { useProjects } from "@/hooks/useProjects";
import { useTags } from "@/hooks/useTags";
import ContentRow from "@/components/ContentRow";
import { useAppCommands } from "@/app/AppCommands";

export default function Inbox() {
  const { items } = useContent();
  const { projects } = useProjects();
  const { tags } = useTags();
  const { openEditor, openPalette } = useAppCommands();

  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const tagsMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const ideas = useMemo(
    () =>
      items
        .filter((i) => i.status === "Idea")
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [items],
  );

  return (
    <div className="app-page">
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }} wrap>
        <Space>
          <InboxOutlined style={{ fontSize: 20 }} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            Idea Inbox
          </Typography.Title>
          <Typography.Text type="secondary">
            {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
          </Typography.Text>
        </Space>
        <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => openPalette("capture")}>
          Capture idea
        </Button>
      </Space>

      <Card size="small">
        {ideas.length ? (
          <List
            dataSource={ideas}
            renderItem={(i) => (
              <ContentRow
                key={i.id}
                item={i}
                projectsMap={projMap}
                tagsMap={tagsMap}
                onClick={(it) => openEditor(it.id)}
              />
            )}
          />
        ) : (
          <Empty description="No ideas captured yet">
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => openPalette("capture")}>
              Capture your first idea
            </Button>
          </Empty>
        )}
      </Card>
    </div>
  );
}
