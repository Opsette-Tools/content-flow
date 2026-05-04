import { Card, theme, Typography } from "antd";

export type StatTone = "neutral" | "info" | "warning" | "ready" | "success";

interface Props {
  label: string;
  value: number | string;
  tone?: StatTone;
  variant?: "card" | "inline";
}

function useAccents(): Record<StatTone, string> {
  const { token } = theme.useToken();
  return {
    neutral: token.colorTextTertiary,
    info: token.colorInfo,
    warning: token.colorWarning,
    ready: token.colorPrimary,
    success: token.colorSuccess,
  };
}

export default function StatCard({ label, value, tone = "neutral", variant = "card" }: Props) {
  const accents = useAccents();

  if (variant === "inline") {
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "0 4px", whiteSpace: "nowrap" }}>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: accents[tone],
            transform: "translateY(-1px)",
          }}
        />
        <Typography.Text strong style={{ fontSize: 18, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12, letterSpacing: 0.3 }}>
          {label}
        </Typography.Text>
      </div>
    );
  }

  return (
    <Card
      size="small"
      style={{ height: "100%" }}
      styles={{ body: { padding: "10px 12px" } }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: accents[tone],
          }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
          {label}
        </Typography.Text>
      </div>
      <Typography.Text strong style={{ fontSize: 22, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography.Text>
    </Card>
  );
}
