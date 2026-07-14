import { unzipSync, strFromU8 } from "fflate";
import type { ArchivePort, UnzippedArchive } from "../../ports/ArchivePort";

/** Pure-JS zip handling via fflate — no Rust zip crate. MelonLoader and Nexus mod zips are
 * small, standard DEFLATE, unencrypted; fflate's lack of ZIP64/encryption support is irrelevant
 * at this scale (see architecture plan). */
export function createArchiveAdapter(): ArchivePort {
  return {
    unzip(archive: Uint8Array): UnzippedArchive {
      const files = unzipSync(archive);
      const entries = Object.keys(files).map((path) => ({
        path,
        isDirectory: path.endsWith("/"),
      }));
      return {
        entries,
        readEntry(path: string): Uint8Array {
          const bytes = files[path];
          if (!bytes) throw new Error(`Archive entry not found: ${path}`);
          return bytes;
        },
      };
    },
  };
}

// Re-exported for callers that need text decoding of a single small entry (e.g. a manifest).
export { strFromU8 };
