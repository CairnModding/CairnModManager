import type { ArchiveEntry } from "./modVersion";

export type ArchiveKind = "melonloader" | "mod";

export interface PlannedFile {
  readonly archivePath: string;
  readonly targetPath: string;
}

/** Decides where each archive entry lands on disk. This is deliberately not "mirror the zip
 * tree" — MelonLoader's release zip extracts flat onto the game root (it carries its own
 * `MelonLoader/`, `version.dll`, etc. at the archive root), while mod zips vary: some are a bare
 * `.dll`, some wrap `Mods/<name>.dll`, some ship `UserLibs/`. A bare `.dll` with no path
 * separator is assumed to belong in `Mods/` — the common case for a single-file mod release. */
export function planExtraction(entries: readonly ArchiveEntry[], kind: ArchiveKind): PlannedFile[] {
  const files = entries.filter((e) => !e.isDirectory);

  if (kind === "melonloader") {
    return files.map((e) => ({ archivePath: e.path, targetPath: e.path }));
  }

  return files.map((e) => {
    const hasDirectory = e.path.includes("/") || e.path.includes("\\");
    const targetPath = hasDirectory ? e.path : `Mods/${e.path}`;
    return { archivePath: e.path, targetPath };
  });
}
