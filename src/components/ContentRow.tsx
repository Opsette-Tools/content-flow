import { List, Space, Tag } from "antd";
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
}

export default function ContentRow({ item, projectsMap, tagsMap, onClick, maxTags = 2 }: Props) {
  return (
    <List.Item
      onClick={() => onClick?.(item)}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
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
