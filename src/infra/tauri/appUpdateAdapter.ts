import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { AppUpdateInfo, AppUpdatePort } from "../../ports/AppUpdatePort";

export function createAppUpdateAdapter(): AppUpdatePort {
  let pendingUpdate: Awaited<ReturnType<typeof check>> | null = null;

  return {
    async check(): Promise<AppUpdateInfo | null> {
      pendingUpdate = await check();
      if (!pendingUpdate) return null;
      return { version: pendingUpdate.version, notes: pendingUpdate.body ?? undefined };
    },

    async downloadAndInstall(onProgress): Promise<void> {
      if (!pendingUpdate) throw new Error("No update pending — call check() first.");
      let contentLength = 0;
      let downloaded = 0;
      await pendingUpdate.downloadAndInstall((event) => {
        if (event.event === "Started") {
          contentLength = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (onProgress && contentLength > 0) onProgress(downloaded / contentLength);
        } else if (event.event === "Finished") {
          onProgress?.(1);
        }
      });
    },

    async relaunch(): Promise<void> {
      await relaunch();
    },
  };
}
