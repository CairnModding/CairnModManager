import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { ProcessPort } from "../../ports/ProcessPort";

export function createProcessAdapter(): ProcessPort {
  return {
    async isRunning(executableName: string): Promise<boolean> {
      return invoke<boolean>("is_process_running", { processName: executableName });
    },
    async launchViaSteam(appId: string): Promise<void> {
      await openUrl(`steam://rungameid/${appId}`);
    },
    async openExternalUrl(url: string): Promise<void> {
      await openUrl(url);
    },
  };
}
