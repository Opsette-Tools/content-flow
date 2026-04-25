import { Card, theme, Typography } from "antd";

export type StatTone = "neutral" | "info" | "warning" | "ready" | "success";

interface Props {
  label: string;
  value: number | string;
  tone?: StatTone;
}

export default function StatCard({ label, value, tone = "neutral" }: Props) {
  const { token } = theme.useToken();

  const accent: Record<StatTone, string> = {
    neutral: token.colorTextTertiary,
    info: token.colorInfo,
    warning: token.colorWarning,
    ready: token.colorPrimary,
    success: token.colorSuccess,
  };

  return (
    <Card
      size="small"
      style={{
        height: "100%",
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
        borderTop: `3px solid ${accent[tone]}`,
      }}
      styles={{ body: { padding: "14px 16px" } }}
    >
      <Typography.Title
        level={2}
        style={{
          margin: 0,
          lineHeight: 1.1,
          color: accent[tone],
          fontWeight: 600,
        }}
      >
        {value}
      </Typography.Title>
      <Typography.Text
        type="secondary"
        style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}
      >
        {label}
      </Typography.Text>
    </Card>
  );
}
