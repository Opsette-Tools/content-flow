import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { projectsRepo } from "@/db";
import { PROJECT_COLORS, type Project } from "@/db/types";
import { useProjects } from "@/hooks/useProjects";

interface FormValues {
  name: string;
  description?: string;
  color: string;
  cadenceCount?: number | null;
  cadencePeriod?: "week" | "month";
}

export default function Projects() {
  const { projects, refresh } = useProjects();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form] = Form.useForm<FormValues>();

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ color: PROJECT_COLORS[0], cadencePeriod: "week" });
    setOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    form.setFieldsValue({
      name: p.name,
      description: p.description,
      color: p.color,
      cadenceCount: p.cadenceTarget?.count ?? null,
      cadencePeriod: p.cadenceTarget?.period ?? "week",
    });
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    const payload = {
      name: values.name,
      description: values.description,
      color: values.color,
      cadenceTarget:
        values.cadenceCount && values.cadenceCount > 0
          ? { count: values.cadenceCount, period: values.cadencePeriod ?? "week" }
          : null,
    };
    if (editing) {
      await projectsRepo.update(editing.id, payload);
      message.success("Project updated");
    } else {
      await projectsRepo.create(payload);
      message.success("Project created");
    }
    setOpen(false);
    refresh();
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
                title={<Tag color={p.color}>{p.name}</Tag>}
                extra={
                  <Space>
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

      <Modal
        open={open}
        title={editing ? "Edit project" : "New project"}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText="Save"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Opsette" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional" />
          </Form.Item>
          <Form.Item name="color" label="Color tag" rules={[{ required: true }]}>
            <ColorPicker />
          </Form.Item>
          <Form.Item label="Publishing cadence (optional)" tooltip="Set a target — the dashboard will track your pace.">
            <Space>
              <Form.Item name="cadenceCount" noStyle>
                <InputNumber min={0} max={99} placeholder="0" style={{ width: 80 }} />
              </Form.Item>
              <span>per</span>
              <Form.Item name="cadencePeriod" noStyle>
                <Select
                  style={{ width: 110 }}
                  options={[
                    { label: "week", value: "week" },
                    { label: "month", value: "month" },
                  ]}
                />
              </Form.Item>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  return (
    <Space wrap>
      {PROJECT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange?.(c)}
          aria-label={c}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: c,
            border: value === c ? "3px solid #000" : "2px solid transparent",
            cursor: "pointer",
          }}
        />
      ))}
    </Space>
  );
}
