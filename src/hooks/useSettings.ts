import { useCallback, useEffect, useState } from "react";
import { settingsRepo } from "@/db";
import type { AppSettings } from "@/db/types";

type Listener = (s: AppSettings) => void;
const listeners = new Set<Listener>();
let cached: AppSettings | null = null;

function broadcast(s: AppSettings) {
  cached = s;
  listeners.forEach((l) => l(s));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(cached);

  const refresh = useCallback(async () => {
    const s = await settingsRepo.get();
    broadcast(s);
  }, []);

  useEffect(() => {
    listeners.add(setSettings);
    if (!cached) {
      refresh();
    }
    return () => {
      listeners.delete(setSettings);
    };
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = await settingsRepo.update(patch);
      broadcast(next);
    },
    [],
  );

  return { settings, update, refresh };
}
