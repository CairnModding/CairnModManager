import { create } from "zustand";
import { pushToast } from "./toastStore";

export type AppLogLevel = "info" | "error";

export interface AppLogLine {
  readonly time: string;
  readonly level: AppLogLevel;
  readonly message: string;
}

const MAX_LINES = 500;

interface AppLogState {
  readonly lines: readonly AppLogLine[];
  log(level: AppLogLevel, message: string): void;
}

/** Every error this app surfaces anywhere in the UI (install, enable/disable, uninstall, settings,
 * auto-detect) also lands here — the durable record, so it's still visible after you navigate
 * away. Error-level entries also raise a toast (see `toastStore`) as the transient, in-the-moment
 * surface; this store is never rendered inline into a page itself. */
export const useAppLogStore = create<AppLogState>((set) => ({
  lines: [],
  log(level, message) {
    set((state) => ({
      lines: [
        ...state.lines,
        { time: new Date().toLocaleTimeString(), level, message },
      ].slice(-MAX_LINES),
    }));
    if (level === "error") pushToast(message, "error");
  },
}));

export function logAppError(message: string): void {
  useAppLogStore.getState().log("error", message);
}

export function logAppInfo(message: string): void {
  useAppLogStore.getState().log("info", message);
}
