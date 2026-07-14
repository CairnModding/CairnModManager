import { computeUpdateSet, type AvailableUpdate } from "../domain/computeUpdateSet";
import { modRefKey } from "../domain/modRef";
import type { InstalledMod, Profile } from "../domain/installedMod";
import type { ModVersion } from "../domain/modVersion";
import type { SourceId } from "../domain/modRef";
import type { ModSource } from "../sources/modSource";
import type { InstallService } from "./InstallService";

export interface UpdateService {
  checkForUpdates(profile: Profile, sources: ReadonlyMap<SourceId, ModSource>): Promise<AvailableUpdate[]>;
  applyUpdate(
    update: AvailableUpdate,
    sources: ReadonlyMap<SourceId, ModSource>,
    gameDir: string,
    profile: Profile,
    taskId: string,
    label?: string,
  ): Promise<InstalledMod[]>;
}

export function createUpdateService(installService: InstallService): UpdateService {
  return {
    async checkForUpdates(profile, sources): Promise<AvailableUpdate[]> {
      const catalog = new Map<string, readonly ModVersion[]>();
      for (const installed of profile.mods) {
        const source = sources.get(installed.ref.source);
        if (!source) continue;
        const versions = await source.getVersions(installed.ref.id);
        catalog.set(modRefKey(installed.ref), versions);
      }
      return computeUpdateSet(profile, catalog);
    },

    async applyUpdate(update, sources, gameDir, profile, taskId, label): Promise<InstalledMod[]> {
      const source = sources.get(update.modRef.source);
      if (!source) throw new Error(`No source registered for ${update.modRef.source}`);

      const versions: ModVersion[] = await source.getVersions(update.modRef.id);
      const target = versions.find((v) => v.version === update.latestVersion);
      if (!target) throw new Error(`Version ${update.latestVersion} disappeared from ${update.modRef.source}`);

      // Writes the new version's file set. Files the OLD version shipped that this one drops are
      // pruned by the caller, which holds the pre-update file list to diff against (see the update
      // handler in the Installed Mods page).
      return installService.install(source, target, gameDir, profile, taskId, undefined, label);
    },
  };
}
