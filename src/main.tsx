import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { connectBridge } from "@/lib/bridge";
import { setBridgeInstance } from "@/lib/bridgeInstance";

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
// B3 consumes the instance via getBridgeInstance() / isBridgeMode().
connectBridge().then((bridge) => {
  setBridgeInstance(bridge);
  if (import.meta.env.DEV) {
    (window as unknown as { __bridge?: unknown }).__bridge = bridge;
  }
  createRoot(document.getElementById("root")!).render(<App />);
});
