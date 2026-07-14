import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import type { PlatformPort } from "../../ports/PlatformPort";

export function createPlatformAdapter(): PlatformPort {
  return {
    async steamRoot(): Promise<string> {
      return invoke<string>("read_steam_path");
    },
    async appDataDir(): Promise<string> {
      return appDataDir();
    },
    async grantGameDirAccess(path: string): Promise<void> {
      await invoke("grant_game_dir", { path });
    },
  };
}
