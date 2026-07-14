import type { SnapshotPlan } from "../domain/snapshotPlan";

/** Executes a `SnapshotPlan` (a pure plan from `domain/snapshotPlan.ts`) against real files:
 * copies whatever exists into `$APPDATA/backups/<timestamp>/`, and records deletions-on-revert
 * for entries that didn't exist yet. */
export interface SnapshotPort {
  capture(gameDir: string, plan: SnapshotPlan): Promise<void>;
  restore(gameDir: string, timestamp: string): Promise<void>;
  list(): Promise<string[]>;
}
