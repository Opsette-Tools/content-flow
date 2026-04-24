import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// Two contexts — one for setters (stable across renders, never causes
// a re-render in consumers) and one for values (changes when the header
// content changes, only consumed by the header itself).
//
// Before this split, pages that called useHeaderActions(<Button .../>) would
// subscribe to the same context that held the node values, so every set
// triggered a re-render of the page, producing a new inline element, which
// triggered another set. Maximum update depth exceeded.

interface HeaderSettersContextValue {
  setCenter: (node: ReactNode) => void;
  clearCenter: () => void;
  setActions: (node: ReactNode) => void;
  clearActions: () => void;
}

interface HeaderNodesContextValue {
  centerNode: ReactNode;
  actionsNode: ReactNode;
}

const HeaderSettersContext = createContext<HeaderSettersContextValue | null>(null);
const HeaderNodesContext = createContext<HeaderNodesContextValue>({ centerNode: null, actionsNode: null });

export function HeaderSlotsProvider({ children }: { children: ReactNode }) {
  const [centerNode, setCenterNode] = useState<ReactNode>(null);
  const [actionsNode, setActionsNode] = useState<ReactNode>(null);

  const setCenter = useCallback((node: ReactNode) => setCenterNode(node), []);
  const clearCenter = useCallback(() => setCenterNode(null), []);
  const setActions = useCallback((node: ReactNode) => setActionsNode(node), []);
  const clearActions = useCallback(() => setActionsNode(null), []);

  const setters = useMemo<HeaderSettersContextValue>(
    () => ({ setCenter, clearCenter, setActions, clearActions }),
    [setCenter, clearCenter, setActions, clearActions],
  );
  const nodes = useMemo<HeaderNodesContextValue>(
    () => ({ centerNode, actionsNode }),
    [centerNode, actionsNode],
  );

  return (
    <HeaderSettersContext.Provider value={setters}>
      <HeaderNodesContext.Provider value={nodes}>{children}</HeaderNodesContext.Provider>
    </HeaderSettersContext.Provider>
  );
}

function useHeaderSetters(): HeaderSettersContextValue {
  const ctx = useContext(HeaderSettersContext);
  if (!ctx) throw new Error("useHeaderSetters must be used inside HeaderSlotsProvider");
  return ctx;
}

export function useHeaderSlotNodes() {
  return useContext(HeaderNodesContext);
}

// `node` is new on every render of the caller. We can't dep-track it, so
// we stash it in a ref and flush on every render. Because the setter's
// context no longer re-renders the caller, the loop is broken.
export function useHeaderCenter(node: ReactNode) {
  const { setCenter, clearCenter } = useHeaderSetters();
  const ref = useRef(node);
  ref.current = node;
  useEffect(() => {
    setCenter(ref.current);
    return clearCenter;
  });
}

export function useHeaderActions(node: ReactNode) {
  const { setActions, clearActions } = useHeaderSetters();
  const ref = useRef(node);
  ref.current = node;
  useEffect(() => {
    setActions(ref.current);
    return clearActions;
  });
}
