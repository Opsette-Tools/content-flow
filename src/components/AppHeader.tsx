import { Layout, Typography, Switch, Space, Button } from "antd";
import {
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

const { Header: AntHeader } = Layout;
const { Title } = Typography;

interface AppHeaderProps {
  isDark: boolean;
  onToggleDark: (v: boolean) => void;
  onOpenPalette: () => void;
  onOpenMobileDrawer: () => void;
  isMobile: boolean;
}

export default function AppHeader({
  isDark,
  onToggleDark,
  onOpenPalette,
  onOpenMobileDrawer,
  isMobile,
}: AppHeaderProps) {
  return (
    <AntHeader
      className="no-print"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: 60,
        background: isDark ? "#141414" : "#ffffff",
        borderBottom: `1px solid ${isDark ? "#303030" : "#EAEAEA"}`,
      }}
    >
      <div style={{ width: 80, display: "flex", alignItems: "center" }}>
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onOpenMobileDrawer}
            aria-label="Open menu"
          />
        )}
      </div>

      <Space align="center" size={10}>
        <img
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          alt=""
          width={22}
          height={22}
          style={{ display: "block" }}
        />
        <Title
          level={3}
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Content Flow
        </Title>
      </Space>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
        }}
      >
        <Button
          type="text"
          icon={<ThunderboltOutlined />}
          onClick={onOpenPalette}
          title="Open command palette (Ctrl/Cmd+K)"
          aria-label="Open command palette"
        >
          {!isMobile && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Ctrl K
            </Typography.Text>
          )}
        </Button>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <SunOutlined
            style={{
              opacity: isDark ? 0.4 : 1,
              fontSize: 13,
              color: isDark ? "#94A3B8" : "#64748B",
            }}
          />
          <Switch checked={isDark} onChange={onToggleDark} size="small" />
          <MoonOutlined
            style={{
              opacity: isDark ? 1 : 0.4,
              fontSize: 13,
              color: isDark ? "#E4C49A" : "#94A3B8",
            }}
          />
        </div>
      </div>
    </AntHeader>
  );
}
