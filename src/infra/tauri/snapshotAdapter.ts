import { appDataDir, join } from "@tauri-apps/api/path";
import type { FileSystemPort } from "../../ports/FileSystemPort";
import type { SnapshotPort } from "../../ports/SnapshotPort";
import type { SnapshotPlan } from "../../domain/snapshotPlan";

interface Manifest {
  readonly gameDir: string;
  readonly entries: SnapshotPlan["entries"];
}

async function backupsRoot(): Promise<string> {
  return join(await appDataDir(), "backups");
}

/** Built on FileSystemPort rather than any Tauri API directly — snapshot/restore is pure file
 * copying, so this stays a thin composition instead of a second Tauri touchpoint. */
export function createSnapshotAdapter(fs: FileSystemPort): SnapshotPort {
  return {
    async capture(gameDir: string, plan: SnapshotPlan): Promise<void> {
      const dir = await join(await backupsRoot(), plan.timestamp);
      await fs.mkdir(dir);

      for (const entry of plan.entries) {
        if (!entry.existed) continue;
        const source = await join(gameDir, entry.targetPath);
        const dest = await join(dir, entry.targetPath);
        const segments = entry.targetPath.split("/");
        segments.pop();
        if (segments.length > 0) await fs.mkdir(await join(dir, ...segments));
        await fs.copyFile(source, dest);
      }

      const manifest: Manifest = { gameDir, entries: plan.entries };
      await fs.writeTextFile(await join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
    },

    async restore(gameDir: string, timestamp: string): Promise<void> {
      const dir = await join(await backupsRoot(), timestamp);
      const manifestText = await fs.readTextFile(await join(dir, "manifest.json"));
      const manifest = JSON.parse(manifestText) as Manifest;

      for (const entry of manifest.entries) {
        const target = await join(gameDir, entry.targetPath);
        if (entry.existed) {
          const backup = await join(dir, entry.targetPath);
          await fs.copyFile(backup, target);
        } else {
          if (await fs.exists(target)) await fs.remove(target);
        }
      }
    },

    async list(): Promise<string[]> {
      const root = await backupsRoot();
      if (!(await fs.exists(root))) return [];
      return fs.readDir(root);
    },
  };
}
