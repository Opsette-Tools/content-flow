import type { ReactNode } from "react";
import { Switch, Button } from "antd";
import {
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { OpsetteHeader } from "@/components/opsette-header";

interface AppHeaderProps {
  isDark: boolean;
  onToggleDark: (v: boolean) => void;
  onOpenPalette: () => void;
  onOpenMobileDrawer: () => void;
  isMobile: boolean;
  headerActions?: ReactNode;
}

export default function AppHeader({
  isDark,
  onToggleDark,
  onOpenPalette,
  onOpenMobileDrawer,
  isMobile,
  headerActions,
}: AppHeaderProps) {
  const rightExtra = (
    <>
      {isMobile && (
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onOpenMobileDrawer}
          aria-label="Open menu"
        />
      )}
      {headerActions}
      <Button
        type="text"
        icon={<SearchOutlined />}
        onClick={onOpenPalette}
        title="Open command palette (Ctrl/Cmd+K)"
        aria-label="Open command palette"
      />
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
    </>
  );

  return (
    <OpsetteHeader
      theme={isDark ? "dark" : "light"}
      rightExtra={rightExtra}
      className="no-print"
    />
  );
}
