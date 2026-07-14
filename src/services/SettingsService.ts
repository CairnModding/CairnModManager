import type { AppSettings, SettingsPort } from "../ports/SettingsPort";
import type { PlatformPort } from "../ports/PlatformPort";

export interface SettingsService {
  get(): Promise<AppSettings>;
  /** Persists the game dir AND grows the fs plugin's runtime scope to cover it — the two must
   * happen together or later file operations against the dir 403 on scope. */
  setGameDir(path: string): Promise<void>;
  setNexusApiKey(key: string): Promise<void>;
  setActiveProfile(name: string): Promise<void>;
  setNxmHandlerRegistered(registered: boolean): Promise<void>;
}

export function createSettingsService(settings: SettingsPort, platform: PlatformPort): SettingsService {
  async function update(patch: Partial<AppSettings>): Promise<void> {
    const current = await settings.load();
    await settings.save({ ...current, ...patch });
  }

  return {
    get: () => settings.load(),

    async setGameDir(path: string): Promise<void> {
      await platform.grantGameDirAccess(path);
      await update({ gameDir: path });
    },

    setNexusApiKey: (key) => update({ nexusApiKey: key }),
    setActiveProfile: (name) => update({ activeProfile: name }),
    setNxmHandlerRegistered: (registered) => update({ nxmHandlerRegistered: registered }),
  };
}
