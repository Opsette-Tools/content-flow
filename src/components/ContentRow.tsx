import { Checkbox, List, Space, Tag } from "antd";
import dayjs from "dayjs";
import { FUNNEL_COLORS, type ContentItem, type Project, type Tag as TagType } from "@/db/types";
import MediumIcon from "./MediumIcon";
import ProjectTag from "./ProjectTag";
import StatusTag from "./StatusTag";
import TagChips from "./TagChips";

interface Props {
  item: ContentItem;
  projectsMap: Map<string, Project>;
  tagsMap: Map<string, TagType>;
  onClick?: (item: ContentItem) => void;
  maxTags?: number;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function ContentRow({
  item,
  projectsMap,
  tagsMap,
  onClick,
  maxTags = 2,
  selectable = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const handleClick = () => {
    if (selectable) {
      onToggleSelect?.(item.id);
    } else {
      onClick?.(item);
    }
  };

  const clickable = selectable || !!onClick;

  return (
    <List.Item
      onClick={handleClick}
      style={{ cursor: clickable ? "pointer" : "default" }}
    >
      {selectable && (
        <Checkbox
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect?.(item.id)}
          style={{ marginInlineEnd: 12 }}
        />
      )}
      <List.Item.Meta
        title={
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space size={6}>
              <MediumIcon medium={item.medium} />
              <span>{item.title}</span>
            </Space>
            <StatusTag status={item.status} />
          </Space>
        }
        description={
          <Space size={6} wrap>
            <ProjectTag project={item.projectId ? projectsMap.get(item.projectId) : null} />
            {item.funnelStage && item.funnelStage !== "None" && (
              <Tag color={FUNNEL_COLORS[item.funnelStage]}>{item.funnelStage}</Tag>
            )}
            <TagChips tagIds={item.tags ?? []} tagsMap={tagsMap} max={maxTags} />
            {item.publishDate && <Tag>{dayjs(item.publishDate).format("MMM D")}</Tag>}
          </Space>
        }
      />
    </List.Item>
  );
}
