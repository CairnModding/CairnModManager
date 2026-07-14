import { create } from "zustand";
import type { AppSettings } from "../ports/SettingsPort";
import type { SettingsService } from "../services/SettingsService";
import type { GameDetectionService } from "../services/GameDetectionService";

interface SettingsState {
  readonly settings: AppSettings | undefined;
  refresh(settingsService: SettingsService): Promise<void>;
  autoDetectGameDir(
    settingsService: SettingsService,
    gameDetection: GameDetectionService,
  ): Promise<string | undefined>;
  setGameDir(settingsService: SettingsService, path: string): Promise<void>;
  setNexusApiKey(settingsService: SettingsService, key: string): Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: undefined,

  async refresh(settingsService) {
    set({ settings: await settingsService.get() });
  },

  async autoDetectGameDir(settingsService, gameDetection) {
    const detected = await gameDetection.detectGameDir();
    if (detected) {
      await settingsService.setGameDir(detected);
      await get().refresh(settingsService);
    }
    return detected;
  },

  async setGameDir(settingsService, path) {
    await settingsService.setGameDir(path);
    await get().refresh(settingsService);
  },

  async setNexusApiKey(settingsService, key) {
    await settingsService.setNexusApiKey(key);
    await get().refresh(settingsService);
  },
}));
