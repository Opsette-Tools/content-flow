import { Tag } from "antd";
import { STATUS_COLORS, type ContentStatus } from "@/db/types";

export default function StatusTag({ status }: { status: ContentStatus }) {
  return <Tag color={STATUS_COLORS[status]}>{status}</Tag>;
}
