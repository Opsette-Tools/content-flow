import { Tag } from "antd";
import type { Project } from "@/db/types";

export default function ProjectTag({ project }: { project?: Project | null }) {
  if (!project) return <Tag>—</Tag>;
  return <Tag color={project.color}>{project.name}</Tag>;
}
