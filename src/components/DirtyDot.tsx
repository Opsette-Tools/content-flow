interface Props {
  size?: number;
  title?: string;
}

export default function DirtyDot({ size = 6, title = "Unsaved changes on this device" }: Props) {
  return (
    <span
      aria-label={title}
      title={title}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#faad14",
        flexShrink: 0,
      }}
    />
  );
}
