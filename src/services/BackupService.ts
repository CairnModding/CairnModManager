import type { SnapshotPort } from "../ports/SnapshotPort";

export interface BackupService {
  listBackups(): Promise<string[]>;
  /**
   * Restores files from a snapshot taken before an install/update. Known gap: this reverts the
   * files on disk but not the Profile's installed-mod metadata (version/files list) — the
   * profile record and the game dir can disagree after a revert until the user re-syncs
   * (re-install or manually adjust). Acceptable for v1; a full undo would need the snapshot to
   * also capture the pre-change Profile JSON, not just game-dir files.
   */
  revert(gameDir: string, timestamp: string): Promise<void>;
}

export function createBackupService(snapshot: SnapshotPort): BackupService {
  return {
    listBackups: () => snapshot.list(),
    revert: (gameDir, timestamp) => snapshot.restore(gameDir, timestamp),
  };
}
