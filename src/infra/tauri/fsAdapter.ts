import {
  readFile,
  readTextFile,
  writeFile,
  writeTextFile,
  readDir,
  exists,
  stat,
  mkdir,
  remove,
  copyFile,
  rename,
  watch,
} from "@tauri-apps/plugin-fs";
import type { FileStat, FileSystemPort } from "../../ports/FileSystemPort";

export function createFsAdapter(): FileSystemPort {
  return {
    async readFile(path) {
      return readFile(path);
    },
    async readTextFile(path) {
      return readTextFile(path);
    },
    async writeFile(path, data) {
      await writeFile(path, data);
    },
    async writeTextFile(path, contents) {
      await writeTextFile(path, contents);
    },
    async readDir(path) {
      const entries = await readDir(path);
      return entries.map((e) => e.name).filter((n): n is string => Boolean(n));
    },
    async exists(path) {
      return exists(path);
    },
    async stat(path): Promise<FileStat> {
      const info = await stat(path);
      return { isDirectory: info.isDirectory, size: info.size };
    },
    async mkdir(path) {
      await mkdir(path, { recursive: true });
    },
    async remove(path) {
      await remove(path, { recursive: true });
    },
    async copyFile(from, to) {
      await copyFile(from, to);
    },
    async rename(from, to) {
      await rename(from, to);
    },
    async watchTail(path, onLine) {
      let offset = 0;
      if (await exists(path)) {
        const bytes = await readFile(path);
        offset = bytes.length;
        for (const line of new TextDecoder().decode(bytes).split(/\r?\n/)) {
          if (line.length > 0) onLine(line);
        }
      }
      const unwatch = await watch(path, async () => {
        const size = (await stat(path)).size;
        if (size <= offset) {
          offset = size;
          return;
        }
        const bytes = await readFile(path);
        const chunk = new TextDecoder().decode(bytes.slice(offset));
        offset = size;
        for (const line of chunk.split(/\r?\n/)) {
          if (line.length > 0) onLine(line);
        }
      });
      return unwatch;
    },
  };
}
