import { create } from "zustand";
import type { ProgressEvent, ProgressPort } from "../ports/ProgressPort";

interface InstallState {
  readonly tasks: Readonly<Record<string, ProgressEvent>>;
  attach(progress: ProgressPort): () => void;
}

export const useInstallStore = create<InstallState>((set) => ({
  tasks: {},

  attach(progress) {
    return progress.subscribe((event) => {
      set((state) => {
        // Only `downloading`/`awaiting-browser` carry `message` (the mod id) — later phases for
        // the same task don't repeat it, so carry the last known one forward instead of losing
        // the label the moment a task moves past its first phase.
        const prevMessage = state.tasks[event.taskId]?.message;
        return {
          tasks: { ...state.tasks, [event.taskId]: { ...event, message: event.message ?? prevMessage } },
        };
      });
    });
  },
}));
