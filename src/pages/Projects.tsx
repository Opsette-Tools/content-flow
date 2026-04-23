import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Popconfirm,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { projectsRepo } from "@/db";
import { type Project } from "@/db/types";
import { useProjects } from "@/hooks/useProjects";
import ProjectEditModal from "@/components/ProjectEditModal";

export default function Projects() {
  const { projects, refresh } = useProjects();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const navigate = useNavigate();

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setOpen(true);
  };

  const remove = async (id: string) => {
    await projectsRepo.remove(id);
    message.success("Project deleted");
    refresh();
  };

  return (
    <div className="app-page">
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }} wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>Projects</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>New project</Button>
      </Space>

      {projects.length ? (
        <Row gutter={[12, 12]}>
          {projects.map((p) => (
            <Col xs={24} sm={12} md={8} key={p.id}>
              <Card
                size="small"
                hoverable
                onClick={() => navigate(`/projects/${p.id}`)}
                style={{ cursor: "pointer" }}
                title={<Tag color={p.color}>{p.name}</Tag>}
                extra={
                  <Space onClick={(e) => e.stopPropagation()}>
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(p)} />
                    <Popconfirm title="Delete this project?" description="Content items will become unassigned." onConfirm={() => remove(p.id)} okButtonProps={{ danger: true }}>
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                }
              >
                <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
                  {p.description || "No description"}
                </Typography.Paragraph>
                {p.cadenceTarget && (
                  <Tag color="blue">
                    Goal: {p.cadenceTarget.count} / {p.cadenceTarget.period}
                  </Tag>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="No projects yet" />
      )}

      <ProjectEditModal
        open={open}
        editing={editing}
        onClose={() => setOpen(false)}
        onSaved={() => refresh()}
      />
    </div>
  );
}
