import type { Profile } from "./installedMod";
import { findInstalled } from "./installedMod";
import { modRefKey, type ModRef } from "./modRef";
import type { Dependency } from "./modVersion";
import type { ModVersion } from "./modVersion";
import { versionSatisfiesMin } from "./version";

/** Available versions per mod, newest first — the caller has already fetched these from a
 * ModSource; this function stays pure and only reasons over the data it's handed. */
export type Catalog = ReadonlyMap<string, readonly ModVersion[]>;

export interface DependencyPlanItem {
  readonly modRef: ModRef;
  readonly version: ModVersion;
  readonly reason: "requested" | "required";
}

export interface DependencyPlan {
  readonly toInstall: readonly DependencyPlanItem[];
  /** Dependencies that exist in the profile but don't meet a required minimum version. */
  readonly unsatisfied: readonly { modRef: ModRef; required: string; installed: string }[];
  /** Dependencies with no version available in the catalog at all. */
  readonly missing: readonly ModRef[];
}

function latestSatisfying(
  catalog: Catalog,
  ref: ModRef,
  minVersion: string | undefined,
): ModVersion | undefined {
  const versions = catalog.get(modRefKey(ref));
  if (!versions) return undefined;
  if (!minVersion) return versions[0];
  return versions.find((v) => versionSatisfiesMin(v.version, minVersion));
}

/**
 * Resolves the requested mod's own direct dependencies against what's installed and what's
 * available, adding whatever isn't already satisfied. Does not mutate the profile — the caller
 * (InstallService) turns this plan into actual installs.
 *
 * Deliberately ONE LEVEL only — it does not walk a dependency's own dependencies transitively.
 * Fetching a mod's dependency data is a network call per mod (see `ModSource.getDependencies`),
 * so a full transitive walk would need to become async I/O, not a pure function. In practice
 * Cairn's dependency chains are one level deep (a mod requires CairnAPI; CairnAPI requires
 * nothing), so this covers the real cases. If a genuinely transitive chain shows up, this needs
 * to move into a service-level async BFS instead of growing into an I/O-performing "pure"
 * function.
 */
export function resolveDependencies(
  requested: ModVersion,
  requestedDependencies: readonly Dependency[],
  profile: Profile,
  catalog: Catalog,
): DependencyPlan {
  const toInstall: DependencyPlanItem[] = [
    { modRef: requested.modRef, version: requested, reason: "requested" },
  ];
  const unsatisfied: { modRef: ModRef; required: string; installed: string }[] = [];
  const missing: ModRef[] = [];

  for (const dep of requestedDependencies) {
    const installed = findInstalled(profile, dep.modRef);
    if (installed && (!dep.minVersion || versionSatisfiesMin(installed.version, dep.minVersion))) {
      continue;
    }

    const satisfying = latestSatisfying(catalog, dep.modRef, dep.minVersion);
    if (!satisfying) {
      if (installed && dep.minVersion) {
        unsatisfied.push({
          modRef: dep.modRef,
          required: dep.minVersion,
          installed: installed.version,
        });
      } else {
        missing.push(dep.modRef);
      }
      continue;
    }

    toInstall.push({ modRef: dep.modRef, version: satisfying, reason: "required" });
  }

  return { toInstall, unsatisfied, missing };
}
