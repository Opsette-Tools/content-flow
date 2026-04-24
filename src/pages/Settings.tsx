import { useRef } from "react";
import { Button, Card, Popconfirm, Space, Switch, Typography, message } from "antd";
import { useSettings } from "@/hooks/useSettings";
import { contentRepo, exportAllJson, importAllJson, projectsRepo, resetAll, tagsRepo } from "@/db";
import { contentToCsv, downloadFile } from "@/utils/csv";

export default function Settings() {
  const { settings, update } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExportJson = async () => {
    const json = await exportAllJson();
    downloadFile(`content-planner-${new Date().toISOString().slice(0, 10)}.json`, json, "application/json");
  };

  const handleExportCsv = async () => {
    const [items, projects, tags] = await Promise.all([
      contentRepo.list(),
      projectsRepo.list(),
      tagsRepo.list(),
    ]);
    const csv = contentToCsv(items, projects, tags);
    downloadFile(`content-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      await importAllJson(text);
      message.success("Imported successfully. Reloading…");
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      message.error("Import failed: invalid JSON");
    }
  };

  const handleReset = async () => {
    await resetAll();
    message.success("All data cleared. Reloading…");
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="app-page">
      <Card title="Appearance" size="small" style={{ marginBottom: 12 }}>
        <Space>
          <span>Dark mode</span>
          <Switch
            checked={settings?.theme === "dark"}
            onChange={(v) => update({ theme: v ? "dark" : "light" })}
          />
        </Space>
      </Card>

      <Card title="Data" size="small" style={{ marginBottom: 12 }}>
        <Space wrap>
          <Button onClick={handleExportJson}>Export all (JSON)</Button>
          <Button onClick={handleExportCsv}>Export content (CSV)</Button>
          <Button onClick={() => fileRef.current?.click()}>Import JSON…</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
          <Popconfirm
            title="Reset all data?"
            description="This permanently deletes all projects and content."
            onConfirm={handleReset}
            okText="Delete everything"
            okButtonProps={{ danger: true }}
          >
            <Button danger>Reset all data</Button>
          </Popconfirm>
        </Space>
      </Card>

      <Card title="About" size="small">
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Content Flow stores everything locally in your browser via IndexedDB. No accounts, no servers.
          Export your data regularly to keep a backup.
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
