import type { ProcessPort } from "../ports/ProcessPort";

export class GameRunningError extends Error {
  constructor() {
    super("Close Cairn first — mods can't be enabled, disabled, updated, or uninstalled while the game is running.");
    this.name = "GameRunningError";
  }
}

const CAIRN_EXECUTABLE = "Cairn.exe";

export interface ProcessLockService {
  /** Gates enable/disable/uninstall and any install that overwrites an already-installed mod's
   * files — those may be loaded into the running game's process, which holds them open for its
   * whole lifetime. A fresh install of a not-yet-installed mod writes new files only, so it's
   * not gated by this. */
  assertGameNotRunning(): Promise<void>;
  isGameRunning(): Promise<boolean>;
}

export function createProcessLockService(process: ProcessPort): ProcessLockService {
  return {
    async isGameRunning(): Promise<boolean> {
      return process.isRunning(CAIRN_EXECUTABLE);
    },
    async assertGameNotRunning(): Promise<void> {
      if (await process.isRunning(CAIRN_EXECUTABLE)) {
        throw new GameRunningError();
      }
    },
  };
}
