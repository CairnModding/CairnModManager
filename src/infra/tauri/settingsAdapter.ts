import { load } from "@tauri-apps/plugin-store";
import type { AppSettings, SettingsPort } from "../../ports/SettingsPort";

const STORE_FILE = "settings.json";

const DEFAULTS: AppSettings = {
  nxmHandlerRegistered: false,
  activeProfile: "default",
};

export function createSettingsAdapter(): SettingsPort {
  return {
    async load(): Promise<AppSettings> {
      const store = await load(STORE_FILE, { autoSave: false, defaults: {} });
      const gameDir = await store.get<string>("gameDir");
      const nexusApiKey = await store.get<string>("nexusApiKey");
      const nxmHandlerRegistered = await store.get<boolean>("nxmHandlerRegistered");
      const activeProfile = await store.get<string>("activeProfile");
      return {
        gameDir: gameDir ?? undefined,
        nexusApiKey: nexusApiKey ?? undefined,
        nxmHandlerRegistered: nxmHandlerRegistered ?? DEFAULTS.nxmHandlerRegistered,
        activeProfile: activeProfile ?? DEFAULTS.activeProfile,
      };
    },
    async save(settings: AppSettings): Promise<void> {
      const store = await load(STORE_FILE, { autoSave: false, defaults: {} });
      // The Tauri IPC layer drops `undefined`-valued args entirely before they reach the plugin-store
      // command, which then rejects with "missing required key value" — coerce to null so unset
      // optional fields still serialize.
      await store.set("gameDir", settings.gameDir ?? null);
      await store.set("nexusApiKey", settings.nexusApiKey ?? null);
      await store.set("nxmHandlerRegistered", settings.nxmHandlerRegistered);
      await store.set("activeProfile", settings.activeProfile);
      await store.save();
    },
  };
}
