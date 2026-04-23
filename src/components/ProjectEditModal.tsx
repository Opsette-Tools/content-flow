import { useEffect } from "react";
import {
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  message,
} from "antd";
import { projectsRepo } from "@/db";
import { PROJECT_COLORS, type Project } from "@/db/types";

interface FormValues {
  name: string;
  description?: string;
  color: string;
  cadenceCount?: number | null;
  cadencePeriod?: "week" | "month";
}

interface Props {
  open: boolean;
  editing: Project | null;
  onClose: () => void;
  onSaved: (project: Project) => void;
}

export default function ProjectEditModal({ open, editing, onClose, onSaved }: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        description: editing.description,
        color: editing.color,
        cadenceCount: editing.cadenceTarget?.count ?? null,
        cadencePeriod: editing.cadenceTarget?.period ?? "week",
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ color: PROJECT_COLORS[0], cadencePeriod: "week" });
    }
  }, [open, editing, form]);

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
    const saved = editing
      ? await projectsRepo.update(editing.id, payload)
      : await projectsRepo.create(payload);
    message.success(editing ? "Project updated" : "Project created");
    onSaved(saved);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={editing ? "Edit project" : "New project"}
      onCancel={onClose}
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
