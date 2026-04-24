import { useState } from "react";
import { Alert, Button, Space } from "antd";
import { CloudOutlined, ExportOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { dismissBanner, isBannerDismissed } from "@/lib/device";
import { isBridgeMode } from "@/lib/bridgeInstance";

// Standalone-only. Not rendered inside the Opsette iframe where data
// already persists to Supabase via the bridge. Dismissal is sticky across
// reloads via content-flow.banner-dismissed.v1 in localStorage.
export default function DataLossBanner() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => isBannerDismissed());

  if (isBridgeMode() || dismissed) return null;

  const handleDismiss = () => {
    dismissBanner();
    setDismissed(true);
  };

  return (
    <Alert
      type="info"
      showIcon
      closable
      onClose={handleDismiss}
      style={{ margin: "12px 24px 0" }}
      message="Your content lives in this browser"
      description={
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <span>
            Content Flow stores everything locally. Clearing your browser data or using a
            different device means starting over.
          </span>
          <Space size={8} wrap>
            <Button
              size="small"
              icon={<ExportOutlined />}
              onClick={() => navigate("/settings")}
            >
              Export backup
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<CloudOutlined />}
              href="https://opsette.io"
              target="_blank"
              rel="noreferrer"
            >
              Sync with Opsette
            </Button>
          </Space>
        </Space>
      }
    />
  );
}
