import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { Mod, ModVersion } from "../domain/modVersion";
import { modRefKey, type ModRef, type SourceId } from "../domain/modRef";
import type { Profile } from "../domain/installedMod";
import type { AvailableUpdate } from "../domain/computeUpdateSet";
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

/** Which installed mods have a newer version on their source, keyed by `modRefKey`. Backgrounds
 * `UpdateService.checkForUpdates` (one `getVersions` per managed mod) behind TanStack Query, keyed
 * on the installed set + versions so it refetches after an install/update but not on every render.
 * `unmanaged` mods have no source to check, so they never appear here. */
export function useAvailableUpdates(profile: Profile | undefined): ReadonlyMap<string, AvailableUpdate> {
  const container = useContainer();
  const sources = useSourceRegistry();
  const managed = profile?.mods.filter((m) => m.ref.source !== "unmanaged") ?? [];
  const signature = managed.map((m) => `${modRefKey(m.ref)}@${m.version}`).sort();

  const query = useQuery({
    queryKey: ["updates", signature],
    queryFn: () => container.updateService.checkForUpdates(profile!, sources!),
    enabled: Boolean(profile) && Boolean(sources) && managed.length > 0,
  });

  return useMemo(() => {
    const map = new Map<string, AvailableUpdate>();
    for (const update of query.data ?? []) map.set(modRefKey(update.modRef), update);
    return map;
  }, [query.data]);
}

/** Every installed mod's display name, keyed by `modRefKey` — for search/filter over a list that
 * otherwise only has bare `ModRef`s. Shares its query key (`["mods", sourceId, "detail", modId]`)
 * with `useModDetail`, so this doesn't duplicate the fetch each `InstalledModCard` already makes
 * for its own picture/summary — TanStack Query dedupes by key. "unmanaged" refs have no source to
 * query, so they're skipped; callers fall back to the raw id for those. */
export function useInstalledModNames(refs: readonly ModRef[]): ReadonlyMap<string, string> {
  const sources = useSourceRegistry();

  const results = useQueries({
    queries: refs.map((ref) => {
      const source = ref.source === "unmanaged" ? undefined : sources?.get(ref.source);
      return {
        queryKey: ["mods", ref.source, "detail", ref.id],
        queryFn: () => source!.getMod(ref.id),
        enabled: Boolean(source) && Boolean(ref.id),
      };
    }),
  });

  return useMemo(() => {
    const names = new Map<string, string>();
    refs.forEach((ref, i) => {
      const name = results[i]?.data?.name;
      if (name) names.set(modRefKey(ref), name);
    });
    return names;
  }, [refs, results]);
}
