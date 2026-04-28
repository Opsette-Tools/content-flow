import type { ReactNode } from "react";
import { Layout, Typography, Switch, Button } from "antd";
import {
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { ShareAppButton } from "@/components/opsette-share";

const { Header: AntHeader } = Layout;

interface AppHeaderProps {
  isDark: boolean;
  onToggleDark: (v: boolean) => void;
  onOpenPalette: () => void;
  onOpenMobileDrawer: () => void;
  isMobile: boolean;
  headerCenter?: ReactNode;
  headerActions?: ReactNode;
}

export default function AppHeader({
  isDark,
  onToggleDark,
  onOpenPalette,
  onOpenMobileDrawer,
  isMobile,
  headerCenter,
  headerActions,
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
        padding: isMobile ? "0 12px" : "0 20px",
        height: 60,
        background: isDark ? "#141414" : "#ffffff",
        borderBottom: `1px solid ${isDark ? "#303030" : "#EAEAEA"}`,
        gap: isMobile ? 6 : 16,
      }}
    >
      <div style={{ width: isMobile ? 40 : 0, display: "flex", alignItems: "center", flexShrink: 0 }}>
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onOpenMobileDrawer}
            aria-label="Open menu"
          />
        )}
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {headerCenter}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 4 : 12,
          flexShrink: 0,
        }}
      >
        <Button
          type="text"
          icon={<SearchOutlined />}
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
        {isMobile ? (
          <Button
            type="text"
            icon={isDark ? <MoonOutlined /> : <SunOutlined />}
            onClick={() => onToggleDark(!isDark)}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          />
        ) : (
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
        )}
        <ShareAppButton size={32} />
        {headerActions}
      </div>
    </AntHeader>
  );
}
