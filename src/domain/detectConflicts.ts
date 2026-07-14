import type { Profile } from "./installedMod";
import { modRefEquals, type ModRef } from "./modRef";

export interface FileConflict {
  readonly path: string;
  readonly owner: ModRef;
}

/** Pure file-path collision check: would installing `candidateFiles` for `candidateRef`
 * overwrite a file another installed mod owns? Excludes the candidate's own prior install
 * (an update overwriting its own files isn't a conflict). */
export function detectConflicts(
  candidateRef: ModRef,
  candidateFiles: readonly string[],
  profile: Profile,
): FileConflict[] {
  const conflicts: FileConflict[] = [];
  const candidateSet = new Set(candidateFiles.map((p) => p.toLowerCase()));

  for (const installed of profile.mods) {
    if (modRefEquals(installed.ref, candidateRef)) continue;
    for (const path of installed.files) {
      if (candidateSet.has(path.toLowerCase())) {
        conflicts.push({ path, owner: installed.ref });
      }
    }
  }

  return conflicts;
}
