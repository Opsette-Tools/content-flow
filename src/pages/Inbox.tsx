import { useMemo } from "react";
import { Button, Card, Empty, Grid, List } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import { useContent } from "@/hooks/useContent";
import { useProjects } from "@/hooks/useProjects";
import { useTags } from "@/hooks/useTags";
import ContentRow from "@/components/ContentRow";
import { useAppCommands } from "@/app/AppCommands";
import { useHeaderActions } from "@/layout/HeaderSlots";

const { useBreakpoint } = Grid;

export default function Inbox() {
  const { items } = useContent();
  const { projects } = useProjects();
  const { tags } = useTags();
  const { openEditor, openPalette } = useAppCommands();
  const screens = useBreakpoint();
  const isCompact = !screens.md;

  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const tagsMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const ideas = useMemo(
    () =>
      items
        .filter((i) => i.status === "Idea")
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [items],
  );

  useHeaderActions(
    <Button
      type="primary"
      icon={<ThunderboltOutlined />}
      onClick={() => openPalette("capture")}
      aria-label="Capture idea"
    >
      {!isCompact && "Capture idea"}
    </Button>,
  );

  return (
    <div className="app-page">
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
