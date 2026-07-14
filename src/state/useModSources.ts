import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Mod, ModVersion } from "../domain/modVersion";
import type { SourceId } from "../domain/modRef";
import type { ModSource } from "../sources/modSource";
import { useContainer } from "./ContainerContext";

/** Loads the source registry (needs the Nexus API key from settings, hence async) once and
 * reuses it — all mod-browsing reads go through TanStack Query on top of this. */
export function useSourceRegistry(): ReadonlyMap<SourceId, ModSource> | undefined {
  const container = useContainer();
  const [sources, setSources] = useState<ReadonlyMap<SourceId, ModSource>>();

  useEffect(() => {
    let cancelled = false;
    container.loadSources().then((loaded) => {
      if (!cancelled) setSources(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [container]);

  return sources;
}

export function useModSearch(sourceId: SourceId, query: string): UseQueryResult<Mod[]> {
  const sources = useSourceRegistry();
  const source = sources?.get(sourceId);

  return useQuery({
    queryKey: ["mods", sourceId, "search", query],
    queryFn: () => source!.search(query),
    enabled: Boolean(source),
  });
}

export function useModDetail(sourceId: SourceId, modId: string): UseQueryResult<Mod> {
  const sources = useSourceRegistry();
  const source = sources?.get(sourceId);

  return useQuery({
    queryKey: ["mods", sourceId, "detail", modId],
    queryFn: () => source!.getMod(modId),
    enabled: Boolean(source) && Boolean(modId),
  });
}

export function useModVersions(sourceId: SourceId, modId: string): UseQueryResult<ModVersion[]> {
  const sources = useSourceRegistry();
  const source = sources?.get(sourceId);

  return useQuery({
    queryKey: ["mods", sourceId, "versions", modId],
    queryFn: () => source!.getVersions(modId),
    enabled: Boolean(source) && Boolean(modId),
  });
}
