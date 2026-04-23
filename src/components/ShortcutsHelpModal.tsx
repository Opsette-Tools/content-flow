import { Modal, Typography } from "antd";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ROWS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl/Cmd", "K"], label: "Open command palette" },
  { keys: ["N"], label: "New content item" },
  { keys: ["/"], label: "Focus content search" },
  { keys: ["C"], label: "Go to Calendar" },
  { keys: ["G", "D"], label: "Go to Dashboard" },
  { keys: ["G", "P"], label: "Go to Projects" },
  { keys: ["G", "I"], label: "Go to Inbox" },
  { keys: ["?"], label: "Show this help" },
];

const keyBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 4,
  border: "1px solid rgba(128,128,128,0.4)",
  background: "rgba(128,128,128,0.08)",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 12,
  lineHeight: "18px",
  minWidth: 22,
  textAlign: "center",
};

export default function ShortcutsHelpModal({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Keyboard shortcuts"
      width={480}
    >
      <Typography.Paragraph type="secondary">
        These shortcuts work globally on any page — you don't need to open the command palette
        first. Just press the key while focused on the page (not inside an input).
      </Typography.Paragraph>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ROWS.map((r) => (
          <div
            key={r.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 0",
            }}
          >
            <Typography.Text>{r.label}</Typography.Text>
            <span style={{ display: "flex", gap: 4 }}>
              {r.keys.map((k, i) => (
                <span key={i} style={keyBadgeStyle}>
                  {k}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12 }}>
        Single-letter shortcuts are ignored when a text field has focus. Chord sequences
        (like G then D) have a 1-second window between keys.
      </Typography.Paragraph>
    </Modal>
  );
}
