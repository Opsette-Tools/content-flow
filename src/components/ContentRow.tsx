import type { ReactNode } from "react";
import { Checkbox, List, Space, Tag } from "antd";
import dayjs from "dayjs";
import { FUNNEL_COLORS, type ContentItem, type Project, type Tag as TagType } from "@/db/types";
import { isItemDirty } from "@/lib/dirty";
import DirtyDot from "./DirtyDot";
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
  actions?: ReactNode;
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
  actions,
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              width: "100%",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
                flex: 1,
              }}
            >
              <MediumIcon medium={item.medium} />
              {isItemDirty(item.id) && <DirtyDot />}
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
                title={item.title}
              >
                {item.title}
              </span>
            </div>
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
              <StatusTag status={item.status} />
              {actions}
            </div>
          </div>
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
