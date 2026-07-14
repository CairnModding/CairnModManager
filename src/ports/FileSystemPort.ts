export interface FileStat {
  readonly isDirectory: boolean;
  readonly size: number;
}

/** The filesystem seam every service depends on instead of touching `@tauri-apps/plugin-fs`
 * directly — lets InstallService/BackupService/etc. run under Vitest with a fake. */
export interface FileSystemPort {
  readFile(path: string): Promise<Uint8Array>;
  readTextFile(path: string): Promise<string>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  writeTextFile(path: string, contents: string): Promise<void>;
  readDir(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FileStat>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  copyFile(from: string, to: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  /** Streams new lines appended to `path` — used for the MelonLoader log tail. Returns an
   * unsubscribe function. */
  watchTail(path: string, onLine: (line: string) => void): Promise<() => void>;
}
