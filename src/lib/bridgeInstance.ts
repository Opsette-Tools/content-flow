import type { Bridge } from "./bridge";

// Module-level singleton so non-React code (repos, localStorage helpers,
// markUnsynced paths) can check bridge mode without threading React context.
// Set once during the main.tsx bootstrap; B3 consumes it.

let instance: Bridge | null = null;

export function setBridgeInstance(b: Bridge | null): void {
  instance = b;
}

export function getBridgeInstance(): Bridge | null {
  return instance;
}

export function isBridgeMode(): boolean {
  return instance !== null;
}
