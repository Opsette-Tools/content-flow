import { useEffect, useMemo, useState } from "react";
import { Layout, Menu, Drawer, Typography, Grid, Space } from "antd";
import {
  DashboardOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  InboxOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { useContent } from "@/hooks/useContent";
import { useAppCommands } from "@/app/AppCommands";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import DirtyDot from "@/components/DirtyDot";
import MediumIcon from "@/components/MediumIcon";
import ShortcutsHelpModal from "@/components/ShortcutsHelpModal";
import { isItemDirty } from "@/lib/dirty";
import AppHeader from "@/components/AppHeader";
import AppBreadcrumb from "@/components/AppBreadcrumb";
import AboutModal from "@/components/AboutModal";
import PrivacyModal from "@/components/PrivacyModal";
import { HeaderSlotsProvider, useHeaderCenter, useHeaderSlotNodes } from "@/layout/HeaderSlots";

const { Sider, Content, Footer } = Layout;
const { useBreakpoint } = Grid;

const items = [
  { key: "/", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "/content", icon: <UnorderedListOutlined />, label: "Content" },
  { key: "/calendar", icon: <CalendarOutlined />, label: "Calendar" },
  { key: "/inbox", icon: <InboxOutlined />, label: "Inbox" },
  { key: "/projects", icon: <AppstoreOutlined />, label: "Projects" },
  { key: "/settings", icon: <SettingOutlined />, label: "Settings" },
];

function BreadcrumbCenterBinder() {
  const breadcrumb = useMemo(() => <AppBreadcrumb />, []);
  useHeaderCenter(breadcrumb);
  return null;
}

export default function AppLayout() {
  const { settings, update } = useSettings();
  const { items: allContent } = useContent();
  const { openEditor, openPalette, recentItemIds } = useAppCommands();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
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
      theme={dark ? "dark" : "light"}
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
            {isItemDirty(it.id) && <DirtyDot />}
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

  const siderHeader = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 10,
        padding: collapsed ? "16px 0" : "16px",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      <img
        src={`${import.meta.env.BASE_URL}favicon.svg`}
        alt=""
        width={20}
        height={20}
        style={{ display: "block", flexShrink: 0 }}
      />
      {!collapsed && (
        <Typography.Text strong style={{ fontSize: 14 }}>
          Content Flow
        </Typography.Text>
      )}
    </div>
  );

  const sidebarBody = (
    <>
      {menu}
      {recentSection}
    </>
  );

  return (
    <HeaderSlotsProvider>
      <Layout style={{ minHeight: "100vh" }}>
        {!isMobile && (
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            width={220}
            breakpoint="lg"
            theme={dark ? "dark" : "light"}
          >
            {siderHeader}
            {sidebarBody}
          </Sider>
        )}
        <Layout>
          <HeaderWithSlots
            isDark={dark}
            onToggleDark={(v) => update({ theme: v ? "dark" : "light" })}
            onOpenPalette={() => openPalette("navigation")}
            onOpenMobileDrawer={() => setDrawerOpen(true)}
            isMobile={isMobile}
          />
          <Content>
            <BreadcrumbCenterBinder />
            <Outlet />
            <Footer
              className="no-print"
              style={{
                textAlign: "center",
                background: "transparent",
                padding: "16px 20px",
                fontSize: 13,
                color: dark ? "#64748B" : "#94A3B8",
              }}
            >
              <Space split={<span style={{ color: dark ? "#475569" : "#CBD5E1" }}>·</span>}>
                <button
                  onClick={() => setAboutOpen(true)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "inherit",
                    fontSize: "inherit",
                    padding: 0,
                  }}
                >
                  About
                </button>
                <button
                  onClick={() => setPrivacyOpen(true)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "inherit",
                    fontSize: "inherit",
                    padding: 0,
                  }}
                >
                  Privacy
                </button>
                <span>
                  By{" "}
                  <a
                    href="https://opsette.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "underline" }}
                  >
                    Opsette
                  </a>
                </span>
              </Space>
            </Footer>
          </Content>
        </Layout>

        <Drawer
          open={drawerOpen}
          placement="left"
          onClose={() => setDrawerOpen(false)}
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img
                src={`${import.meta.env.BASE_URL}favicon.svg`}
                alt=""
                width={20}
                height={20}
                style={{ display: "block" }}
              />
              <span>Content Flow</span>
            </div>
          }
          width={260}
          styles={{ body: { padding: 0 } }}
        >
          {sidebarBody}
        </Drawer>

        <ShortcutsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
        <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
        <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      </Layout>
    </HeaderSlotsProvider>
  );
}

interface HeaderWithSlotsProps {
  isDark: boolean;
  onToggleDark: (v: boolean) => void;
  onOpenPalette: () => void;
  onOpenMobileDrawer: () => void;
  isMobile: boolean;
}

function HeaderWithSlots(props: HeaderWithSlotsProps) {
  const { centerNode, actionsNode } = useHeaderSlotNodes();
  return <AppHeader {...props} headerCenter={centerNode} headerActions={actionsNode} />;
}
