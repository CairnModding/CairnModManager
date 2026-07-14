export interface AppUpdateInfo {
  readonly version: string;
  readonly notes?: string;
}

/** The app's own self-update, distinct from `ModSource`/`UpdateService` (which update installed
 * mods). Backed by Tauri's updater plugin against the release CI's `latest.json`. */
export interface AppUpdatePort {
  check(): Promise<AppUpdateInfo | null>;
  downloadAndInstall(onProgress?: (fraction: number) => void): Promise<void>;
  relaunch(): Promise<void>;
}
