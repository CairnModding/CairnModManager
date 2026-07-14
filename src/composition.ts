import { createArchiveAdapter } from "./infra/tauri/archiveAdapter";
import { createDeepLinkAdapter } from "./infra/tauri/deepLinkAdapter";
import { createProgressAdapter } from "./infra/tauri/events";
import { createFsAdapter } from "./infra/tauri/fsAdapter";
import { createHttpAdapter } from "./infra/tauri/httpAdapter";
import { createPlatformAdapter } from "./infra/tauri/platformAdapter";
import { createProcessAdapter } from "./infra/tauri/processAdapter";
import { createSettingsAdapter } from "./infra/tauri/settingsAdapter";
import { createSnapshotAdapter } from "./infra/tauri/snapshotAdapter";
import { createBackupService } from "./services/BackupService";
import { createConfigEditorService } from "./services/ConfigEditorService";
import { createGameDetectionService } from "./services/GameDetectionService";
import { createInstallService } from "./services/InstallService";
import { createMelonLoaderService } from "./services/MelonLoaderService";
import { createNxmHandoffService } from "./services/NxmHandoffService";
import { createProcessLockService } from "./services/ProcessLockService";
import { createProfileService } from "./services/ProfileService";
import { createSettingsService } from "./services/SettingsService";
import { createUpdateService } from "./services/UpdateService";
import { createSourceRegistry } from "./sources/sourceRegistry";
import type { SourceId } from "./domain/modRef";
import type { ModSource } from "./sources/modSource";

/** The one place every port gets a concrete Tauri-backed implementation and every service gets
 * its dependencies. Nothing outside this file (besides the `infra/tauri/*` adapters themselves)
 * imports `@tauri-apps/*`. */
export function createAppContainer() {
  const fs = createFsAdapter();
  const http = createHttpAdapter();
  const archive = createArchiveAdapter();
  const process_ = createProcessAdapter();
  const deepLink = createDeepLinkAdapter();
  const settingsPort = createSettingsAdapter();
  const platform = createPlatformAdapter();
  const progress = createProgressAdapter();
  const snapshotPort = createSnapshotAdapter(fs);

  const processLock = createProcessLockService(process_);
  const gameDetection = createGameDetectionService(fs, platform);
  const melonLoader = createMelonLoaderService(http, fs, archive, progress);
  const nxmHandoff = createNxmHandoffService(deepLink, process_);
  const installService = createInstallService(
    http,
    fs,
    archive,
    snapshotPort,
    progress,
    processLock,
    nxmHandoff,
  );
  const updateService = createUpdateService(installService);
  const profileService = createProfileService(fs, platform);
  const settingsService = createSettingsService(settingsPort, platform);
  const configEditor = createConfigEditorService(fs);
  const backupService = createBackupService(snapshotPort);

  /** Sources need the Nexus API key, which only exists once settings load — callers must await
   * `settingsService.get()` before this resolves to a registry with a real Nexus adapter. */
  async function loadSources(): Promise<ReadonlyMap<SourceId, ModSource>> {
    const settings = await settingsService.get();
    return createSourceRegistry(http, settings.nexusApiKey ?? "");
  }

  return {
    fs,
    http,
    archive,
    process: process_,
    deepLink,
    platform,
    progress,
    processLock,
    gameDetection,
    melonLoader,
    installService,
    updateService,
    profileService,
    settingsService,
    configEditor,
    backupService,
    nxmHandoff,
    loadSources,
  };
}

export type AppContainer = ReturnType<typeof createAppContainer>;
