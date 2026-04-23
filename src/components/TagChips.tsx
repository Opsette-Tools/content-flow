import { Tag as AntTag } from "antd";
import type { Tag } from "@/db/types";

interface Props {
  tagIds: string[];
  tagsMap: Map<string, Tag>;
  max?: number;
  size?: "small" | "default";
}

export default function TagChips({ tagIds, tagsMap, max }: Props) {
  if (!tagIds?.length) return null;
  const visible = max ? tagIds.slice(0, max) : tagIds;
  const overflow = max ? tagIds.length - visible.length : 0;
  return (
    <>
      {visible.map((id) => {
        const t = tagsMap.get(id);
        if (!t) return null;
        return (
          <AntTag key={id} color={t.color} style={{ marginInlineEnd: 4 }}>
            {t.name}
          </AntTag>
        );
      })}
      {overflow > 0 && <AntTag>+{overflow}</AntTag>}
    </>
  );
}
