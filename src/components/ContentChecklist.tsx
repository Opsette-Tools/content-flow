import { Checkbox, Progress, Space, Typography } from "antd";
import { DEFAULT_CHECKLIST } from "@/db/types";

interface Props {
  value: Record<string, boolean>;
  onChange: (v: Record<string, boolean>) => void;
}

export default function ContentChecklist({ value, onChange }: Props) {
  const labels = DEFAULT_CHECKLIST;
  const completed = labels.filter((l) => value[l]).length;
  const pct = Math.round((completed / labels.length) * 100);

  return (
    <Space direction="vertical" size="small" style={{ width: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Typography.Text type="secondary">
          {completed}/{labels.length} complete
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {pct}%
        </Typography.Text>
      </Space>
      <Progress percent={pct} showInfo={false} size="small" />
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        {labels.map((label) => (
          <Checkbox
            key={label}
            checked={!!value[label]}
            onChange={(e) => onChange({ ...value, [label]: e.target.checked })}
          >
            {label}
          </Checkbox>
        ))}
      </Space>
    </Space>
  );
}
