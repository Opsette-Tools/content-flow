// Content Flow → Opsette iframe bridge (v1.1 postMessage protocol).
// Ported from c:\Opsette Tools\script-builder\src\lib\bridge.ts. Mirror the
// Script Builder shape as closely as possible — same envelope, same timeouts,
// same Promise<Bridge | null> contract. Content Flow consumes it in B3.
//
// Two intentional differences from Script Builder are called out inline:
//   1. `savePresets` is exported and documented — Content Flow uses it for
//      shared projects + tags (Script Builder never calls it).
//   2. Value types are Content Flow-specific (`ContentFlowItemValue` /
//      `ContentFlowMetaValue`) but the bridge keeps them `unknown` on the
//      wire — the parent treats blobs as opaque.

import type { AppSettings, ContentItem, Project, Tag } from "@/db/types";

// In dev builds we additionally trust http://localhost:8080, the Content Flow
// dev-server origin, so the bridge harness at /bridge-harness.html can post a
// mock init. Stripped from prod builds by Vite's dead-code elimination when
// import.meta.env.DEV is false.
const TRUSTED_ORIGINS = (
  import.meta.env.DEV
    ? (["https://opsette.io", "http://localhost:8081", "http://localhost:8080"] as const)
    : (["https://opsette.io", "http://localhost:8081"] as const)
);
const PROTOCOL_SOURCE = "opsette";
const PROTOCOL_VERSION = 1;
const HANDSHAKE_TIMEOUT_MS = 1000;
const REQUEST_TIMEOUT_MS = 5000;

// The value shipped inside a content-item iframe_app_data row.
export type ContentFlowItemValue = ContentItem;

// The value shipped inside the "meta" iframe_app_data row. Projects + tags +
// the small slice of settings that syncs. recentItemIds / seeded / dismissed
// flags stay device-local (BRIDGE_MIGRATION.md, Presets shape section).
export type ContentFlowMetaValue = {
  projects: Project[];
  tags: Tag[];
  settings: Pick<AppSettings, "theme" | "globalProjectFilter">;
};

export interface InitItem {
  data_id: string;
  value: unknown;
}

export interface InitPayload {
  presets: Record<string, unknown>;
  items: InitItem[];
}

export interface Bridge {
  init: InitPayload;
  save: (data_id: string, value: unknown) => Promise<{ updated_at?: string }>;
  // Difference from Script Builder: Content Flow uses savePresets for shared
  // projects + tags. Script Builder exposes it but never calls it.
  savePresets: (presets: Record<string, unknown>) => Promise<{ updated_at?: string }>;
  delete: (data_id: string) => Promise<void>;
  onTimeout: (handler: () => void) => () => void;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeoutId: number;
}

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function isTrustedOrigin(origin: string): boolean {
  return (TRUSTED_ORIGINS as readonly string[]).includes(origin);
}

function isValidEnvelope(
  msg: unknown,
): msg is { source: string; version: number; type: string; [k: string]: unknown } {
  if (!msg || typeof msg !== "object") return false;
  const m = msg as Record<string, unknown>;
  return m.source === PROTOCOL_SOURCE && m.version === PROTOCOL_VERSION && typeof m.type === "string";
}

function postToAllowedOrigins(message: Record<string, unknown>): void {
  for (const origin of TRUSTED_ORIGINS) {
    try {
      window.parent.postMessage(message, origin);
    } catch {
      // Browser drops wrong-origin deliveries silently; ignore thrown errors.
    }
  }
}

export function connectBridge(): Promise<Bridge | null> {
  if (typeof window === "undefined" || window.parent === window) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const pending = new Map<string, PendingRequest>();
    const timeoutHandlers = new Set<() => void>();
    const state = { handshakeSettled: false, handshakeTimeoutId: 0 };

    const handleMessage = (event: MessageEvent) => {
      if (!isTrustedOrigin(event.origin)) return;
      if (!isValidEnvelope(event.data)) return;

      const msg = event.data;

      if (!state.handshakeSettled && msg.type === "init") {
        state.handshakeSettled = true;
        window.clearTimeout(state.handshakeTimeoutId);

        const presets =
          msg.presets && typeof msg.presets === "object"
            ? (msg.presets as Record<string, unknown>)
            : {};
        const items = Array.isArray(msg.items) ? (msg.items as InitItem[]) : [];

        resolve(buildBridge({ presets, items }, pending, timeoutHandlers));
        return;
      }

      if (!state.handshakeSettled) return;

      const requestId = typeof msg.request_id === "string" ? msg.request_id : null;
      if (!requestId) return;

      const req = pending.get(requestId);
      if (!req) return;

      window.clearTimeout(req.timeoutId);
      pending.delete(requestId);

      if (msg.type === "saved") {
        req.resolve({ updated_at: msg.updated_at });
      } else if (msg.type === "presets_saved") {
        req.resolve({ updated_at: msg.updated_at });
      } else if (msg.type === "deleted") {
        req.resolve(undefined);
      } else if (msg.type === "error") {
        const message = typeof msg.message === "string" ? msg.message : "Unknown bridge error";
        req.reject(new Error(message));
      }
    };

    window.addEventListener("message", handleMessage);

    state.handshakeTimeoutId = window.setTimeout(() => {
      if (state.handshakeSettled) return;
      state.handshakeSettled = true;
      window.removeEventListener("message", handleMessage);
      resolve(null);
    }, HANDSHAKE_TIMEOUT_MS);

    postToAllowedOrigins({
      source: PROTOCOL_SOURCE,
      version: PROTOCOL_VERSION,
      type: "ready",
    });
  });
}

function buildBridge(
  init: InitPayload,
  pending: Map<string, PendingRequest>,
  timeoutHandlers: Set<() => void>,
): Bridge {
  const sendRequest = <T>(payload: Record<string, unknown>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const requestId = newRequestId();

      const timeoutId = window.setTimeout(() => {
        if (!pending.has(requestId)) return;
        pending.delete(requestId);
        timeoutHandlers.forEach((h) => {
          try {
            h();
          } catch {
            // swallow — one bad handler shouldn't break the others
          }
        });
        reject(new Error("Request timed out"));
      }, REQUEST_TIMEOUT_MS);

      pending.set(requestId, { resolve: resolve as (v: unknown) => void, reject, timeoutId });

      postToAllowedOrigins({
        source: PROTOCOL_SOURCE,
        version: PROTOCOL_VERSION,
        request_id: requestId,
        ...payload,
      });
    });
  };

  return {
    init,
    save: (data_id, value) => sendRequest({ type: "save", data_id, value }),
    savePresets: (presets) => sendRequest({ type: "save_presets", presets }),
    delete: (data_id) => sendRequest({ type: "delete", data_id }),
    onTimeout: (handler) => {
      timeoutHandlers.add(handler);
      return () => {
        timeoutHandlers.delete(handler);
      };
    },
  };
}
