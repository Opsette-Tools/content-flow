import { theme as antdTheme, type ThemeConfig } from "antd";

const sharedToken = {
  colorPrimary: "#3F4A5B",
  colorInfo: "#3F4A5B",
  colorSuccess: "#5C7A5A",
  colorLink: "#B86E3C",
  colorLinkHover: "#C8814E",
  colorLinkActive: "#9A5A2F",
  borderRadius: 8,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

// Canonical Opsette dark/light surface palette per HEADER_BAR.md.
// Page bg goes near-pitch in dark; surfaces (header/sider) sit at #141414.

export const lightTheme: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...sharedToken,
    colorBgLayout: "#ffffff",
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      siderBg: "#ffffff",
      bodyBg: "#ffffff",
    },
    Menu: {
      itemBg: "transparent",
      itemSelectedBg: "rgba(63, 74, 91, 0.12)",
      itemSelectedColor: "#3F4A5B",
      itemActiveBg: "rgba(63, 74, 91, 0.06)",
    },
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...sharedToken,
    colorBgLayout: "#000000",
  },
  components: {
    Layout: {
      headerBg: "#141414",
      siderBg: "#141414",
      bodyBg: "#000000",
    },
    Menu: {
      darkItemBg: "transparent",
      darkItemSelectedBg: "rgba(184, 110, 60, 0.18)",
      darkItemSelectedColor: "#E0A878",
      darkItemHoverBg: "rgba(184, 110, 60, 0.08)",
    },
  },
};
