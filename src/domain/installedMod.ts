import type { ModRef } from "./modRef";

export interface InstalledMod {
  readonly ref: ModRef;
  readonly version: string;
  readonly enabled: boolean;
  /** Paths (relative to the game dir) this mod's install placed on disk — the basis for
   * conflict detection, disable/enable, and uninstall. */
  readonly files: readonly string[];
  readonly installedAt: string;
}

export interface Profile {
  readonly name: string;
  readonly mods: readonly InstalledMod[];
}

export function findInstalled(profile: Profile, ref: ModRef): InstalledMod | undefined {
  return profile.mods.find((m) => m.ref.source === ref.source && m.ref.id === ref.id);
}
