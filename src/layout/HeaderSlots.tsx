import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface HeaderSlotsContextValue {
  centerNode: ReactNode;
  actionsNode: ReactNode;
  setCenter: (node: ReactNode) => void;
  clearCenter: () => void;
  setActions: (node: ReactNode) => void;
  clearActions: () => void;
}

const HeaderSlotsContext = createContext<HeaderSlotsContextValue | null>(null);

export function HeaderSlotsProvider({ children }: { children: ReactNode }) {
  const [centerNode, setCenterNode] = useState<ReactNode>(null);
  const [actionsNode, setActionsNode] = useState<ReactNode>(null);

  const setCenter = useCallback((node: ReactNode) => setCenterNode(node), []);
  const clearCenter = useCallback(() => setCenterNode(null), []);
  const setActions = useCallback((node: ReactNode) => setActionsNode(node), []);
  const clearActions = useCallback(() => setActionsNode(null), []);

  const value = useMemo(
    () => ({ centerNode, actionsNode, setCenter, clearCenter, setActions, clearActions }),
    [centerNode, actionsNode, setCenter, clearCenter, setActions, clearActions],
  );

  return <HeaderSlotsContext.Provider value={value}>{children}</HeaderSlotsContext.Provider>;
}

function useHeaderSlots(): HeaderSlotsContextValue {
  const ctx = useContext(HeaderSlotsContext);
  if (!ctx) throw new Error("useHeaderSlots must be used inside HeaderSlotsProvider");
  return ctx;
}

export function useHeaderSlotNodes() {
  const { centerNode, actionsNode } = useHeaderSlots();
  return { centerNode, actionsNode };
}

export function useHeaderCenter(node: ReactNode) {
  const { setCenter, clearCenter } = useHeaderSlots();
  useEffect(() => {
    setCenter(node);
    return clearCenter;
  }, [node, setCenter, clearCenter]);
}

export function useHeaderActions(node: ReactNode) {
  const { setActions, clearActions } = useHeaderSlots();
  useEffect(() => {
    setActions(node);
    return clearActions;
  }, [node, setActions, clearActions]);
}
