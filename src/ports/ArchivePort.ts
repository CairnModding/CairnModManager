import type { ArchiveEntry } from "../domain/modVersion";

export interface UnzippedArchive {
  readonly entries: readonly ArchiveEntry[];
  readEntry(path: string): Uint8Array;
}

export interface ArchivePort {
  /** Decompresses once; callers list entries and pull individual file bytes from the same
   * in-memory result rather than re-decompressing per file. */
  unzip(archive: Uint8Array): UnzippedArchive;
}
