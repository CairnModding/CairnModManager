import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Mod } from "../domain/modVersion";
import type { SourceId } from "../domain/modRef";
import { useSourceRegistry } from "./useModSources";

/** The mods a mod's latest version depends on, resolved to full `Mod` records (not just refs) so
 * callers can render a human name — `Dependency` only carries a `modRef`/`minVersion`. */
export function useModDependencies(sourceId: SourceId, modId: string): UseQueryResult<Mod[]> {
  const sources = useSourceRegistry();
  const source = sources?.get(sourceId);

  return useQuery({
    queryKey: ["mods", sourceId, "dependencies", modId],
    queryFn: async () => {
      const versions = await source!.getVersions(modId);
      const latest = versions[0];
      if (!latest) return [];
      const dependencies = await source!.getDependencies(latest);
      return Promise.all(dependencies.map((dep) => source!.getMod(dep.modRef.id)));
    },
    enabled: Boolean(source) && Boolean(modId),
  });
}
