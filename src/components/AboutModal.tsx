import { Modal, Typography } from "antd";
import { OpsetteFooterLogo } from "@/components/opsette-share";

const { Paragraph, Title, Text } = Typography;

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

const kbdStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 11,
  padding: "1px 6px",
  border: "1px solid var(--ant-color-border, #d9d9d9)",
  borderRadius: 4,
  background: "var(--ant-color-bg-container, #fafafa)",
};

function Kbd({ children }: { children: React.ReactNode }) {
  return <span style={kbdStyle}>{children}</span>;
}

export default function AboutModal({ open, onClose }: AboutModalProps) {
  const mod =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
  return (
    <Modal open={open} onCancel={onClose} footer={null} title="About Content Flow">
      <Title level={5} style={{ marginTop: 0 }}>A business tool from Opsette Marketplace</Title>
      <Paragraph>
        Content Flow is a local-first content planner and editorial calendar for solo operators —
        writers, creators, and marketers running their own publishing cadence.
      </Paragraph>
      <Paragraph>
        Track every piece from idea to published, organize by project, and keep your cadence honest
        with a dashboard that shows gaps before they become droughts.
      </Paragraph>

      <Title level={5} style={{ marginBottom: 6 }}>Keyboard shortcuts</Title>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 13 }}>
        <div><Kbd>{mod}</Kbd> + <Kbd>K</Kbd></div>
        <div><Text type="secondary">Open command palette</Text></div>
        <div><Kbd>n</Kbd></div>
        <div><Text type="secondary">New content item</Text></div>
        <div><Kbd>/</Kbd></div>
        <div><Text type="secondary">Focus search</Text></div>
        <div><Kbd>?</Kbd></div>
        <div><Text type="secondary">Full shortcut list</Text></div>
      </div>

      <OpsetteFooterLogo />
    </Modal>
  );
}
