import { create } from "zustand";
import type { ProgressPort } from "../ports/ProgressPort";
import type { DownloadRecord } from "../domain/downloadRecord";

interface DownloadHistoryState {
  readonly records: Readonly<Record<string, DownloadRecord>>;
  /** Seeds a record with the display metadata (name/picture/version) that only the UI layer has
   * before `InstallService.install` is called — must be called before `install`, so `attach`'s
   * progress events below always have a record to merge into. */
  start(record: Omit<DownloadRecord, "phase" | "fraction">): void;
  attach(progress: ProgressPort): () => void;
}

export const useDownloadHistoryStore = create<DownloadHistoryState>((set) => ({
  records: {},

  start(record) {
    set((state) => ({
      records: { ...state.records, [record.taskId]: { ...record, phase: "downloading" } },
    }));
  },

  attach(progress) {
    return progress.subscribe((event) => {
      set((state) => {
        const prev = state.records[event.taskId];
        if (!prev) return state;
        const finished = event.phase === "done" || event.phase === "error";
        return {
          records: {
            ...state.records,
            [event.taskId]: {
              ...prev,
              phase: event.phase,
              fraction: event.fraction,
              sizeBytes: event.sizeBytes ?? prev.sizeBytes,
              finishedAt: finished ? new Date().toISOString() : prev.finishedAt,
            },
          },
        };
      });
    });
  },
}));
