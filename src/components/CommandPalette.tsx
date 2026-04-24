import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Typography, message, theme as antdTheme } from "antd";
import { Command } from "cmdk";
import {
  AppstoreOutlined,
  BulbOutlined,
  CalendarOutlined,
  DashboardOutlined,
  InboxOutlined,
  PlusOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  ThunderboltOutlined,
  FolderAddOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { contentRepo } from "@/db";
import { markUnsynced } from "@/lib/unsynced";
import { useSettings } from "@/hooks/useSettings";
import MediumIcon from "./MediumIcon";
import type { ContentItem, Project } from "@/db/types";

type Mode = "navigation" | "capture";

interface Props {
  open: boolean;
  mode: Mode;
  onMode: (m: Mode) => void;
  onClose: () => void;
  items: ContentItem[];
  projects: Project[];
  onOpenItem: (id: string) => void;
  onCreatedItem: () => void;
  onNewItem: () => void;
}

const PAGES: { path: string; label: string; icon: React.ReactNode }[] = [
  { path: "/", label: "Dashboard", icon: <DashboardOutlined /> },
  { path: "/content", label: "Content", icon: <UnorderedListOutlined /> },
  { path: "/calendar", label: "Calendar", icon: <CalendarOutlined /> },
  { path: "/projects", label: "Projects", icon: <AppstoreOutlined /> },
  { path: "/inbox", label: "Inbox", icon: <InboxOutlined /> },
  { path: "/settings", label: "Settings", icon: <SettingOutlined /> },
];

export default function CommandPalette({
  open,
  mode,
  onMode,
  onClose,
  items,
  projects,
  onOpenItem,
  onCreatedItem,
  onNewItem,
}: Props) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const { token } = antdTheme.useToken();

  useEffect(() => {
    if (open) {
      setQuery("");
      onMode("navigation");
      // Autofocus after modal mount
      const t = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(t);
    }
  }, [open, onMode]);

  const matchingItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items.filter((i) => i.title.toLowerCase().includes(q)).slice(0, 12);
  }, [items, query]);

  const matchingProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects.slice(0, 5);
    return projects.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [projects, query]);

  const matchingPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAGES;
    return PAGES.filter((p) => p.label.toLowerCase().includes(q));
  }, [query]);

  const hasAnyMatches =
    matchingItems.length > 0 || matchingProjects.length > 0 || matchingPages.length > 0;

  const quickCapture = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const created = await contentRepo.create({
      title: trimmed,
      status: "Idea",
      publishDate: null,
      projectId: settings?.globalProjectFilter ?? null,
    });
    markUnsynced(created);
    message.success("Idea captured — view in Inbox");
    onCreatedItem();
    setQuery("");
  };

  const openItem = (id: string) => onOpenItem(id);

  const goToProject = (id: string) => {
    navigate(`/projects/${id}`);
    onClose();
  };

  const goToPage = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && e.shiftKey && query.trim() && mode === "navigation") {
      e.preventDefault();
      quickCapture(query);
    } else if (e.key === "Enter" && mode === "capture") {
      e.preventDefault();
      quickCapture(query);
    } else if (e.key === "Enter" && mode === "navigation" && !hasAnyMatches && query.trim()) {
      // Auto-capture when no matches + Enter
      e.preventDefault();
      quickCapture(query);
    }
  };

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    color: token.colorText,
  };

  const groupHeadingStyle: React.CSSProperties = {
    fontSize: 12,
    color: token.colorTextTertiary,
    padding: "10px 12px 6px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    border: "none",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    outline: "none",
    fontSize: 15,
    background: "transparent",
    color: token.colorText,
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={620}
      destroyOnClose
      styles={{
        body: { padding: 0 },
        content: { padding: 0, overflow: "hidden" },
      }}
      style={{ top: 80 }}
    >
      <Command
        label="Command palette"
        className="cf-cmd"
        shouldFilter={false}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <style>{`
          .cf-cmd [cmdk-item][data-selected="true"] {
            background: ${token.colorFillTertiary};
          }
          .cf-cmd [cmdk-item]:hover {
            background: ${token.colorFillQuaternary};
          }
        `}</style>
        <Command.Input
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          onKeyDown={handleInputKeyDown}
          placeholder={
            mode === "capture"
              ? "Capture an idea — press Enter to save"
              : "Search items, projects, pages… (Shift+Enter to capture)"
          }
          style={inputStyle}
        />
        <Command.List style={{ maxHeight: 460, overflow: "auto", padding: 6 }}>
          {mode === "navigation" && (
            <>
              <Command.Item
                value="new-idea-quick-capture"
                onSelect={() => onMode("capture")}
                style={itemStyle}
              >
                <ThunderboltOutlined style={{ color: token.colorPrimary }} />
                <span>New idea (quick capture)</span>
              </Command.Item>

              {matchingItems.length > 0 && (
                <Command.Group heading="Content" style={groupHeadingStyle}>
                  {matchingItems.map((it) => (
                    <Command.Item
                      key={`item-${it.id}`}
                      value={`item-${it.id}-${it.title}`}
                      onSelect={() => openItem(it.id)}
                      style={itemStyle}
                    >
                      <MediumIcon medium={it.medium} />
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {it.title}
                      </span>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {it.status}
                      </Typography.Text>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {matchingProjects.length > 0 && (
                <Command.Group heading="Projects" style={groupHeadingStyle}>
                  {matchingProjects.map((p) => (
                    <Command.Item
                      key={`proj-${p.id}`}
                      value={`proj-${p.id}-${p.name}`}
                      onSelect={() => goToProject(p.id)}
                      style={itemStyle}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: p.color,
                        }}
                      />
                      <span>{p.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {matchingPages.length > 0 && (
                <Command.Group heading="Pages" style={groupHeadingStyle}>
                  {matchingPages.map((p) => (
                    <Command.Item
                      key={`page-${p.path}`}
                      value={`page-${p.path}-${p.label}`}
                      onSelect={() => goToPage(p.path)}
                      style={itemStyle}
                    >
                      {p.icon}
                      <span>{p.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              <Command.Group heading="Actions" style={groupHeadingStyle}>
                <Command.Item
                  value="action-new-item"
                  onSelect={() => {
                    onClose();
                    onNewItem();
                  }}
                  style={itemStyle}
                >
                  <PlusOutlined />
                  <span>New item</span>
                </Command.Item>
                <Command.Item
                  value="action-new-project"
                  onSelect={() => {
                    navigate("/projects?new=1");
                    onClose();
                  }}
                  style={itemStyle}
                >
                  <FolderAddOutlined />
                  <span>New project</span>
                </Command.Item>
                <Command.Item
                  value="action-toggle-theme"
                  onSelect={() => {
                    update({ theme: settings?.theme === "dark" ? "light" : "dark" });
                  }}
                  style={itemStyle}
                >
                  <BulbOutlined />
                  <span>Toggle theme</span>
                </Command.Item>
                <Command.Item
                  value="action-go-dashboard"
                  onSelect={() => {
                    navigate("/");
                    onClose();
                  }}
                  style={itemStyle}
                >
                  <DashboardOutlined />
                  <span>Go to dashboard</span>
                </Command.Item>
              </Command.Group>

              {!hasAnyMatches && query.trim() && (
                <Command.Empty style={{ padding: 16, color: token.colorTextSecondary, fontSize: 13 }}>
                  No matches. Press <b>Enter</b> to capture "{query.trim()}" as an idea.
                </Command.Empty>
              )}
            </>
          )}

          {mode === "capture" && (
            <div style={{ padding: 16, color: token.colorTextSecondary, fontSize: 13 }}>
              Type a title and press <b>Enter</b>. The item lands in the Inbox with status "Idea".
            </div>
          )}
        </Command.List>
      </Command>
    </Modal>
  );
}
