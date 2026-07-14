import type { InstalledMod, Profile } from "./installedMod";

const DISABLED_SUFFIX = ".disabled";
const MODS_DIR = "Mods";

function baseName(fileName: string): string {
  return fileName.replace(/\.dll(\.disabled)?$/i, "");
}

/** This app's own installs are tracked in `Profile`, but nothing stops a mod DLL from landing in
 * `Mods/` some other way — this user's own dev pipeline (`wm build-install`) deploys straight to
 * the game dir, bypassing the manager entirely. Reconciling against the folder on every load is
 * what makes "Installed mods" show the game's actual state instead of just this app's install
 * history. Pure: given the profile and a listing of `Mods/`, returns the profile with untracked
 * `.dll`/`.dll.disabled` files added as `unmanaged` entries (unknown version, no source to check
 * updates/dependencies against — enable/disable/uninstall only need the file path). */
export function reconcileInstalledMods(profile: Profile, modsDirEntries: readonly string[]): Profile {
  const tracked = new Set(profile.mods.flatMap((m) => m.files).map((f) => f.toLowerCase()));

  const discovered: InstalledMod[] = [];
  for (const entry of modsDirEntries) {
    if (!/\.dll(\.disabled)?$/i.test(entry)) continue;

    const enabled = !entry.toLowerCase().endsWith(DISABLED_SUFFIX);
    const canonicalFile = `${MODS_DIR}/${enabled ? entry : entry.slice(0, -DISABLED_SUFFIX.length)}`;
    if (tracked.has(canonicalFile.toLowerCase())) continue;

    discovered.push({
      ref: { source: "unmanaged", id: baseName(entry) },
      version: "unknown",
      enabled,
      files: [canonicalFile],
      installedAt: profile.mods[0]?.installedAt ?? new Date(0).toISOString(),
    });
  }

  if (discovered.length === 0) return profile;
  return { ...profile, mods: [...profile.mods, ...discovered] };
}
