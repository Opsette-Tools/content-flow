import { useState, type ReactNode } from "react";
import { Badge, Button, Drawer, Grid, Input, Space, Tag, Typography } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import type { InputRef } from "antd";

const { useBreakpoint } = Grid;

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface Props {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  searchRef?: React.Ref<InputRef>;
  activeChips: FilterChip[];
  onClearAll: () => void;
  children: ReactNode;
  rightSlot?: ReactNode;
}

export default function FilterSheet({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
  searchRef,
  activeChips,
  onClearAll,
  children,
  rightSlot,
}: Props) {
  const [open, setOpen] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const activeCount = activeChips.length;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Input.Search
            ref={searchRef}
            allowClear
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ flex: 1, minWidth: 0 }}
          />
          <Badge count={activeCount} size="small" offset={[-4, 4]}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setOpen(true)}
              aria-label="Open filters"
            >
              Filters
            </Button>
          </Badge>
          {rightSlot}
        </div>

        {activeChips.length > 0 && (
          <Space size={[4, 4]} wrap>
            {activeChips.map((c) => (
              <Tag
                key={c.key}
                closable
                onClose={(e) => {
                  e.preventDefault();
                  c.onRemove();
                }}
                style={{ marginRight: 0 }}
              >
                {c.label}
              </Tag>
            ))}
            {activeChips.length > 1 && (
              <Button type="link" size="small" onClick={onClearAll} style={{ padding: 0, height: "auto" }}>
                Clear all
              </Button>
            )}
          </Space>
        )}
      </div>

      <Drawer
        title="Filters"
        placement={isMobile ? "bottom" : "right"}
        height={isMobile ? "80%" : undefined}
        width={isMobile ? undefined : 400}
        open={open}
        onClose={() => setOpen(false)}
        extra={
          activeCount > 0 ? (
            <Button
              type="link"
              size="small"
              onClick={() => {
                onClearAll();
              }}
              style={{ padding: 0 }}
            >
              Reset
            </Button>
          ) : null
        }
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={() => setOpen(false)}>
              Apply
            </Button>
          </div>
        }
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {children}
        </Space>
      </Drawer>
    </>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ width: "100%" }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
        {label}
      </Typography.Text>
      {children}
    </div>
  );
}
