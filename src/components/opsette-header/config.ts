// Opsette Header — per-app configuration for Content Flow.
// See ../../../_shared/opsette-header/INTEGRATION.md.

import type { OpsetteHeaderConfig } from "./config.template";

export type { OpsetteHeaderConfig };

export const opsetteHeaderConfig: OpsetteHeaderConfig = {
  toolName: "Content Flow",
  brandIconPaths: `
    <rect x="40" y="40" width="176" height="176" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
    <line x1="176" y1="24" x2="176" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
    <line x1="80" y1="24" x2="80" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
    <line x1="40" y1="88" x2="216" y2="88" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
  `,
};
