import type { PlannedFile } from "./extractionPlan";

export interface SnapshotEntry {
  readonly targetPath: string;
  /** False when the file doesn't exist yet — nothing to back up, but the plan still records it
   * so a rollback knows to delete it (rather than restore a nonexistent original). */
  readonly existed: boolean;
}

export interface SnapshotPlan {
  readonly timestamp: string;
  readonly entries: readonly SnapshotEntry[];
}

/** Pure plan for what a pre-install backup needs to cover: only the files about to be
 * overwritten, not the whole Mods folder. `existingPaths` is the set of target paths the caller
 * has already confirmed exist on disk (checked via FileSystemPort before calling this). */
export function planSnapshot(
  timestamp: string,
  files: readonly PlannedFile[],
  existingPaths: ReadonlySet<string>,
): SnapshotPlan {
  return {
    timestamp,
    entries: files.map((f) => ({
      targetPath: f.targetPath,
      existed: existingPaths.has(f.targetPath),
    })),
  };
}
