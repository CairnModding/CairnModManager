import { joinPath } from "../domain/paths";
import type { Profile } from "../domain/installedMod";
import { reconcileInstalledMods } from "../domain/reconcileInstalledMods";
import type { FileSystemPort } from "../ports/FileSystemPort";
import type { PlatformPort } from "../ports/PlatformPort";

export interface ProfileService {
  load(name: string): Promise<Profile>;
  /** Loads the profile, then reconciles it against the actual contents of `<gameDir>/Mods` —
   * catches mods placed there by something other than this app (see reconcileInstalledMods). */
  loadReconciled(name: string, gameDir: string): Promise<Profile>;
  save(profile: Profile): Promise<void>;
  list(): Promise<string[]>;
}

function emptyProfile(name: string): Profile {
  return { name, mods: [] };
}

export function createProfileService(fs: FileSystemPort, platform: PlatformPort): ProfileService {
  async function profilesDir(): Promise<string> {
    return joinPath(await platform.appDataDir(), "profiles");
  }

  async function profilePath(name: string): Promise<string> {
    return joinPath(await profilesDir(), `${name}.json`);
  }

  async function load(name: string): Promise<Profile> {
    const path = await profilePath(name);
    if (!(await fs.exists(path))) return emptyProfile(name);
    return JSON.parse(await fs.readTextFile(path)) as Profile;
  }

  return {
    load,

    async loadReconciled(name: string, gameDir: string): Promise<Profile> {
      const profile = await load(name);
      const modsDir = joinPath(gameDir, "Mods");
      if (!(await fs.exists(modsDir))) return profile;
      return reconcileInstalledMods(profile, await fs.readDir(modsDir));
    },

    async save(profile: Profile): Promise<void> {
      const dir = await profilesDir();
      if (!(await fs.exists(dir))) await fs.mkdir(dir);
      await fs.writeTextFile(await profilePath(profile.name), JSON.stringify(profile, null, 2));
    },

    async list(): Promise<string[]> {
      const dir = await profilesDir();
      if (!(await fs.exists(dir))) return [];
      return (await fs.readDir(dir))
        .filter((name) => name.endsWith(".json"))
        .map((name) => name.replace(/\.json$/, ""));
    },
  };
}
