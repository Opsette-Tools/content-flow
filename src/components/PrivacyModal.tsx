import { Modal, Typography } from "antd";

const { Paragraph, Title } = Typography;

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ open, onClose }: PrivacyModalProps) {
  return (
    <Modal open={open} onCancel={onClose} footer={null} title="Privacy">
      <Title level={5} style={{ marginTop: 0 }}>Your data stays on your device</Title>
      <Paragraph>
        All projects, content items, tags, and settings are stored locally in your browser via
        IndexedDB. Nothing is sent to a server.
      </Paragraph>
      <Paragraph>
        No cookies, no tracking, no analytics, no account required. Use Export to keep your own
        backup — we can't restore it for you because we never see it.
      </Paragraph>
      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Learn more at <a href="https://opsette.io" target="_blank" rel="noopener noreferrer">opsette.io</a>
      </Paragraph>
    </Modal>
  );
}
