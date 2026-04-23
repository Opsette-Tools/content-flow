import { theme as antdTheme, type ThemeConfig } from "antd";

const sharedToken = {
  colorPrimary: "#1677ff",
  borderRadius: 8,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

export const lightTheme: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...sharedToken,
    colorBgLayout: "#f7f8fa",
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      siderBg: "#ffffff",
      bodyBg: "#f7f8fa",
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
    colorBgLayout: "#0f1115",
  },
  components: {
    Layout: {
      headerBg: "#141821",
      siderBg: "#141821",
      bodyBg: "#0f1115",
    },
  },
};
