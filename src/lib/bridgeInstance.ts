import type { Bridge } from "./bridge";

// Module-level singleton so non-React code (repos, localStorage helpers,
// markUnsynced paths) can check bridge mode without threading React context.
// Set once during the main.tsx bootstrap; B3 consumes it.

let instance: Bridge | null = null;

// Ids the parent has acknowledged (either in init.items or via a successful
// save ack). Used to decide whether bridge.delete should fire — if the parent
// has never heard of an id, there's nothing to delete upstream.
const parentKnownIds = new Set<string>();

export function setBridgeInstance(b: Bridge | null): void {
  instance = b;
}

export function getBridgeInstance(): Bridge | null {
  return instance;
}

export function isBridgeMode(): boolean {
  return instance !== null;
}

export function markParentKnown(id: string): void {
  parentKnownIds.add(id);
}

export function isParentKnown(id: string): boolean {
  return parentKnownIds.has(id);
}

export function resetParentKnown(ids: Iterable<string>): void {
  parentKnownIds.clear();
  for (const id of ids) parentKnownIds.add(id);
}

export function forgetParentKnown(id: string): void {
  parentKnownIds.delete(id);
}
