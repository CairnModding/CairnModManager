import type { Mod } from "./modVersion";

export type ModSortKey = "updated" | "name" | "downloads" | "endorsements";

export const MOD_SORT_OPTIONS: ReadonlyArray<{ readonly key: ModSortKey; readonly label: string }> = [
  { key: "updated", label: "Recently updated" },
  { key: "name", label: "Name (A–Z)" },
  { key: "downloads", label: "Most downloaded" },
  { key: "endorsements", label: "Most endorsed" },
];

/** Missing numeric/date fields sort last regardless of direction — a mod with no download count
 * shouldn't out-rank one with zero downloads, and shouldn't win a stable-sort tiebreak either. */
function byDescending<T extends string | number>(
  getValue: (mod: Mod) => T | undefined,
): (a: Mod, b: Mod) => number {
  return (a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    if (va === undefined && vb === undefined) return 0;
    if (va === undefined) return 1;
    if (vb === undefined) return -1;
    return va > vb ? -1 : va < vb ? 1 : 0;
  };
}

const COMPARATORS: Record<ModSortKey, (a: Mod, b: Mod) => number> = {
  updated: byDescending((mod) => mod.updatedAt),
  name: (a, b) => a.name.localeCompare(b.name),
  downloads: byDescending((mod) => mod.downloadCount),
  endorsements: byDescending((mod) => mod.endorsementCount),
};

export function sortMods(mods: readonly Mod[], key: ModSortKey): Mod[] {
  return [...mods].sort(COMPARATORS[key]);
}
