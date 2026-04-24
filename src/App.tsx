import { useEffect, useState } from "react";
import { App as AntApp, ConfigProvider } from "antd";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { darkTheme, lightTheme } from "@/theme/tokens";
import { seedIfEmpty } from "@/db";
import { pruneOrphanDrafts } from "@/lib/cleanup";
import { useSettings } from "@/hooks/useSettings";
import AppLayout from "@/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ContentList from "@/pages/ContentList";
import CalendarView from "@/pages/CalendarView";
import Inbox from "@/pages/Inbox";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import { AppCommandsProvider } from "@/app/AppCommands";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

const App = () => {
  const { settings } = useSettings();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedIfEmpty()
      .then(() => pruneOrphanDrafts())
      .finally(() => setReady(true));
  }, []);

  const isDark = settings?.theme === "dark";

  if (!ready || !settings) return null;

  return (
    <ConfigProvider theme={isDark ? darkTheme : lightTheme}>
      <AntApp>
        <BrowserRouter basename={basename}>
          <AppCommandsProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/content" element={<ContentList />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="/index.html" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppCommandsProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
