import { useEffect, useState } from "react";
import { Layout, Menu, Button, Drawer, Space, Switch, Typography, Grid } from "antd";
import {
  DashboardOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  SettingOutlined,
  MenuOutlined,
  BulbOutlined,
  BulbFilled,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";

const { Sider, Header, Content } = Layout;
const { useBreakpoint } = Grid;

const items = [
  { key: "/", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "/content", icon: <UnorderedListOutlined />, label: "Content" },
  { key: "/calendar", icon: <CalendarOutlined />, label: "Calendar" },
  { key: "/projects", icon: <AppstoreOutlined />, label: "Projects" },
  { key: "/settings", icon: <SettingOutlined />, label: "Settings" },
];

export default function AppLayout() {
  const { settings, update } = useSettings();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const dark = settings?.theme === "dark";

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={items.map((i) => ({ ...i, label: <Link to={i.key}>{i.label}</Link> }))}
      style={{ borderInlineEnd: "none" }}
      onClick={(e) => navigate(e.key)}
    />
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
          {menu}
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
        {menu}
      </Drawer>
    </Layout>
  );
}
