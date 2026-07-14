import { create } from "zustand";
import { joinPath } from "../domain/paths";
import type { FileSystemPort } from "../ports/FileSystemPort";

const MAX_LINES = 2000;
const LOG_RELATIVE_PATH = "MelonLoader/Latest.log";

interface LogTailState {
  readonly lines: readonly string[];
  readonly watching: boolean;
  start(fs: FileSystemPort, gameDir: string): Promise<() => void>;
  clear(): void;
}

export const useLogTailStore = create<LogTailState>((set) => ({
  lines: [],
  watching: false,

  async start(fs, gameDir) {
    set({ watching: true, lines: [] });
    const path = joinPath(gameDir, LOG_RELATIVE_PATH);
    const unwatch = await fs.watchTail(path, (line) => {
      set((state) => ({ lines: [...state.lines, line].slice(-MAX_LINES) }));
    });
    return () => {
      unwatch();
      set({ watching: false });
    };
  },

  clear() {
    set({ lines: [] });
  },
}));
