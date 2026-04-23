import { useMemo } from "react";
import { Breadcrumb } from "antd";
import { Link, useLocation } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";

interface Crumb {
  label: React.ReactNode;
  to?: string;
}

const STATIC_ROUTES: Record<string, string> = {
  "/": "Dashboard",
  "/content": "Content",
  "/calendar": "Calendar",
  "/inbox": "Inbox",
  "/projects": "Projects",
  "/settings": "Settings",
};

function capitalizePath(pathname: string): string {
  const segment = pathname.replace(/^\/+/, "").split("/")[0] ?? "";
  if (!segment) return "Home";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export default function AppBreadcrumb() {
  const location = useLocation();
  const { projects, loading } = useProjects();

  const crumbs: Crumb[] = useMemo(() => {
    const path = location.pathname;

    if (path in STATIC_ROUTES) {
      return [{ label: STATIC_ROUTES[path] }];
    }

    const projectMatch = path.match(/^\/projects\/([^/]+)\/?$/);
    if (projectMatch) {
      const id = projectMatch[1];
      const project = projects.find((p) => p.id === id);
      const name = project?.name ?? (loading ? "…" : id);
      return [
        { label: "Projects", to: "/projects" },
        { label: name },
      ];
    }

    return [{ label: capitalizePath(path) }];
  }, [location.pathname, projects, loading]);

  return (
    <Breadcrumb
      items={crumbs.map((c, idx) => {
        const isLast = idx === crumbs.length - 1;
        if (!isLast && c.to) {
          return { title: <Link to={c.to}>{c.label}</Link> };
        }
        return { title: c.label };
      })}
    />
  );
}
