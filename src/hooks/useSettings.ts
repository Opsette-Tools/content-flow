import { useCallback, useEffect, useState } from "react";
import { settingsRepo } from "@/db";
import type { AppSettings } from "@/db/types";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const refresh = useCallback(async () => {
    setSettings(await settingsRepo.get());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = await settingsRepo.update(patch);
      setSettings(next);
    },
    [],
  );

  return { settings, update, refresh };
}
