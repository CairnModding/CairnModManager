/** Minimal semver-lite comparator — MelonLoader mods use plain `x.y.z`, not full semver
 * pre-release/build-metadata syntax, so this stays deliberately small. */

export interface ParsedVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export function parseVersion(raw: string): ParsedVersion {
  const cleaned = raw.trim().replace(/^v/i, "");
  const [major = 0, minor = 0, patch = 0] = cleaned
    .split(".")
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0);
  return { major, minor, patch };
}

export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}

export function versionSatisfiesMin(version: string, minVersion: string): boolean {
  return compareVersions(version, minVersion) >= 0;
}

export function isNewerVersion(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0;
}
