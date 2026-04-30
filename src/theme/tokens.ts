import { theme as antdTheme, type ThemeConfig } from "antd";

const sharedToken = {
  colorPrimary: "#1677ff",
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
    colorBgLayout: "#f5f5f5",
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      siderBg: "#ffffff",
      bodyBg: "#f5f5f5",
    },
    Menu: {
      itemBg: "transparent",
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
  },
};
