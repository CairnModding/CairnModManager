import type { Profile } from "./installedMod";
import { modRefKey, type ModRef } from "./modRef";
import { isNewerVersion } from "./version";
import type { Catalog } from "./resolveDependencies";

export interface AvailableUpdate {
  readonly modRef: ModRef;
  readonly installedVersion: string;
  readonly latestVersion: string;
}

/** Which installed mods have a newer version available in the catalog. Pure — the catalog is
 * assumed already fetched and sorted newest-first per mod. */
export function computeUpdateSet(profile: Profile, catalog: Catalog): AvailableUpdate[] {
  const updates: AvailableUpdate[] = [];
  for (const installed of profile.mods) {
    const versions = catalog.get(modRefKey(installed.ref));
    const latest = versions?.[0];
    if (latest && isNewerVersion(latest.version, installed.version)) {
      updates.push({
        modRef: installed.ref,
        installedVersion: installed.version,
        latestVersion: latest.version,
      });
    }
  }
  return updates;
}
