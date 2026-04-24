import { createRoot } from "react-dom/client";
import { message } from "antd";
import App from "./App.tsx";
import "./index.css";
import { connectBridge } from "@/lib/bridge";
import { setBridgeInstance } from "@/lib/bridgeInstance";
import { hydrateFromBridge } from "@/db";

// PWA / Service Worker guard — never run inside Lovable preview or iframe.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app") ||
  window.location.hostname === "localhost";

if (isPreviewHost || isInIframe) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
} else {
  // Production registration (GitHub Pages etc.)
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* PWA optional */
    });
}

// Bridge handshake gate. In standalone (window.parent === window) this
// resolves to null in <1ms; inside an iframe it awaits init for up to 1s.
// When bridge-mode boots, hydrate IDB from init.presets + init.items BEFORE
// rendering so repos return the right data on first render.
connectBridge().then(async (bridge) => {
  setBridgeInstance(bridge);
  if (import.meta.env.DEV) {
    (window as unknown as { __bridge?: unknown }).__bridge = bridge;
  }
  if (bridge) {
    // Debounced toast: multiple timeouts in a 1s window collapse to a
    // single message, so a bulk-save that fails 3x doesn't spam.
    let lastToastAt = 0;
    bridge.onTimeout(() => {
      const nowMs = Date.now();
      if (nowMs - lastToastAt < 1000) return;
      lastToastAt = nowMs;
      message.error("Couldn't save — try again");
    });
    try {
      await hydrateFromBridge(bridge);
    } catch (err) {
      console.error("[content-flow] hydrateFromBridge failed:", err);
    }
  }
  createRoot(document.getElementById("root")!).render(<App />);
});
