import { useEffect, useMemo, useState } from "react";
import { Layout, Menu, Button, Drawer, Space, Switch, Typography, Grid } from "antd";
import {
  DashboardOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  InboxOutlined,
  SettingOutlined,
  MenuOutlined,
  BulbOutlined,
  BulbFilled,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { useContent } from "@/hooks/useContent";
import { useAppCommands } from "@/app/AppCommands";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import MediumIcon from "@/components/MediumIcon";
import ShortcutsHelpModal from "@/components/ShortcutsHelpModal";

const { Sider, Header, Content } = Layout;
const { useBreakpoint } = Grid;

const items = [
  { key: "/", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "/content", icon: <UnorderedListOutlined />, label: "Content" },
  { key: "/calendar", icon: <CalendarOutlined />, label: "Calendar" },
  { key: "/inbox", icon: <InboxOutlined />, label: "Inbox" },
  { key: "/projects", icon: <AppstoreOutlined />, label: "Projects" },
  { key: "/settings", icon: <SettingOutlined />, label: "Settings" },
];

export default function AppLayout() {
  const { settings, update } = useSettings();
  const { items: allContent } = useContent();
  const { openEditor, openPalette, recentItemIds } = useAppCommands();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useKeyboardShortcuts({ onOpenHelp: () => setHelpOpen(true) });

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const dark = settings?.theme === "dark";

  const contentById = useMemo(
    () => new Map(allContent.map((c) => [c.id, c])),
    [allContent],
  );
  const recentItems = useMemo(
    () =>
      recentItemIds
        .map((id) => contentById.get(id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [recentItemIds, contentById],
  );

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={items.map((i) => ({ ...i, label: <Link to={i.key}>{i.label}</Link> }))}
      style={{ borderInlineEnd: "none" }}
      onClick={(e) => navigate(e.key)}
    />
  );

  const recentSection = recentItems.length > 0 && !collapsed ? (
    <div style={{ padding: "8px 16px", marginTop: 8 }}>
      <Typography.Text
        type="secondary"
        style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}
      >
        Recent
      </Typography.Text>
      <div style={{ marginTop: 4 }}>
        {recentItems.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => openEditor(it.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 8px",
              marginBlock: 2,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              borderRadius: 6,
              textAlign: "left",
              fontSize: 13,
            }}
            className="cf-recent-row"
            title={it.title}
          >
            <MediumIcon medium={it.medium} size={14} />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {it.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const sidebarBody = (
    <>
      {menu}
      {recentSection}
    </>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={220}
          breakpoint="lg"
        >
          <div style={{ padding: 16, fontWeight: 600, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden" }}>
            {collapsed ? "CP" : "Content Planner"}
          </div>
          {sidebarBody}
        </Sider>
      )}
      <Layout>
        <Header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
          <Space>
            {isMobile && (
              <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} />
            )}
            <Typography.Text strong>
              {items.find((i) => i.key === location.pathname)?.label ?? "Content Planner"}
            </Typography.Text>
          </Space>
          <Space>
            <Button
              type="text"
              icon={<ThunderboltOutlined />}
              onClick={() => openPalette("navigation")}
              title="Open command palette (Ctrl/Cmd+K)"
            >
              {!isMobile && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Ctrl K
                </Typography.Text>
              )}
            </Button>
            <Switch
              checked={dark}
              checkedChildren={<BulbFilled />}
              unCheckedChildren={<BulbOutlined />}
              onChange={(v) => update({ theme: v ? "dark" : "light" })}
            />
          </Space>
        </Header>
        <Content>
          <Outlet />
        </Content>
      </Layout>

      <Drawer
        open={drawerOpen}
        placement="left"
        onClose={() => setDrawerOpen(false)}
        title="Content Planner"
        width={260}
        styles={{ body: { padding: 0 } }}
      >
        {sidebarBody}
      </Drawer>

      <ShortcutsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Layout>
  );
}
