import { useCallback, useEffect, useState } from "react";
import { contentRepo } from "@/db";
import type { ContentItem } from "@/db/types";

type Listener = (items: ContentItem[]) => void;
const listeners = new Set<Listener>();
let cached: ContentItem[] | null = null;

function broadcast(items: ContentItem[]) {
  cached = items;
  listeners.forEach((l) => l(items));
}

export function useContent() {
  const [items, setItems] = useState<ContentItem[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const fresh = await contentRepo.list();
    broadcast(fresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    listeners.add(setItems);
    if (cached === null) {
      refresh();
    }
    return () => {
      listeners.delete(setItems);
    };
  }, [refresh]);

  return { items, loading, refresh };
}
