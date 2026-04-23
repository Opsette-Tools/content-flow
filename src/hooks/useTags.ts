import { useCallback, useEffect, useState } from "react";
import { tagsRepo } from "@/db";
import type { Tag } from "@/db/types";

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setTags(await tagsRepo.list());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tags, loading, refresh };
}
