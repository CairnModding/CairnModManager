import { create } from "zustand";
import type { ProcessLockService } from "../services/ProcessLockService";

const POLL_INTERVAL_MS = 3000;

interface GameRunningState {
  readonly running: boolean;
  /** Starts polling; returns an unsubscribe. Call once at the composition root (App.tsx) —
   * every page reads the shared result via `useGameRunning()` instead of polling itself. */
  start(processLock: ProcessLockService): () => void;
}

export const useGameRunningStore = create<GameRunningState>((set) => ({
  running: false,

  start(processLock) {
    let cancelled = false;

    async function poll() {
      const running = await processLock.isGameRunning();
      if (!cancelled) set({ running });
    }

    void poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  },
}));

/** Whether Cairn.exe is currently running — every action that would hit `GameRunningError`
 * (install, enable/disable, uninstall, MelonLoader install) reads this to disable itself
 * pre-emptively instead of letting the user click into a guaranteed failure. */
export function useGameRunning(): boolean {
  return useGameRunningStore((s) => s.running);
}
