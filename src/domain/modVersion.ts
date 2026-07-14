import type { ModRef } from "./modRef";

/** A dependency on another mod, optionally pinned to a minimum version — e.g. most Cairn mods
 * require a minimum CairnAPI version. */
export interface Dependency {
  readonly modRef: ModRef;
  readonly minVersion?: string;
}

/** One archive entry inside a mod's downloadable file, before it's placed on disk. */
export interface ArchiveEntry {
  readonly path: string;
  readonly isDirectory: boolean;
}

export interface ModVersion {
  readonly modRef: ModRef;
  readonly version: string;
  /** Source-native file id used to resolve a download (Nexus fileId, Thunderstore version string). */
  readonly fileId: string;
  readonly releasedAt?: string;
  readonly changelog?: string;
}

export interface Mod {
  readonly ref: ModRef;
  readonly name: string;
  readonly summary: string;
  /** Long-form description — BBCode on Nexus, so render through `stripMarkup`, never as raw HTML. */
  readonly description?: string;
  readonly author: string;
  readonly tags: readonly string[];
  readonly latestVersion: string;
  readonly downloadCount?: number;
  readonly endorsementCount?: number;
  readonly pictureUrl?: string;
  readonly updatedAt?: string;
}
