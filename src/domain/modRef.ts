/** "unmanaged" marks a mod file found on disk that this app didn't install itself — e.g. one
 * copied in by hand or by an external build pipeline. It has no source to query for updates or
 * dependencies; enable/disable/uninstall still work since those only need the file path. */
export type SourceId = "nexus" | "thunderstore" | "unmanaged";

/** Identifies a mod within a specific source — the unit every other domain type keys off. */
export interface ModRef {
  readonly source: SourceId;
  /** Source-native mod id (Nexus: numeric mod id as a string; Thunderstore: package full name). */
  readonly id: string;
}

export function modRefKey(ref: ModRef): string {
  return `${ref.source}:${ref.id}`;
}

export function modRefEquals(a: ModRef, b: ModRef): boolean {
  return a.source === b.source && a.id === b.id;
}
