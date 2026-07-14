import { create } from "zustand";
import type { AppUpdateInfo, AppUpdatePort } from "../ports/AppUpdatePort";

type AppUpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

interface AppUpdateState {
  readonly status: AppUpdateStatus;
  readonly info: AppUpdateInfo | undefined;
  readonly fraction: number | undefined;
  readonly error: string | undefined;
  checkNow(port: AppUpdatePort): Promise<void>;
  installNow(port: AppUpdatePort): Promise<void>;
}

export const useAppUpdateStore = create<AppUpdateState>((set) => ({
  status: "idle",
  info: undefined,
  fraction: undefined,
  error: undefined,

  async checkNow(port) {
    set({ status: "checking", error: undefined });
    try {
      const info = await port.check();
      set(info ? { status: "available", info } : { status: "idle", info: undefined });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },

  async installNow(port) {
    set({ status: "downloading", fraction: 0, error: undefined });
    try {
      await port.downloadAndInstall((fraction) => set({ fraction }));
      set({ status: "ready" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },
}));
