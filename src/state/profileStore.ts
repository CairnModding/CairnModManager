import { create } from "zustand";
import type { Profile } from "../domain/installedMod";
import type { ProfileService } from "../services/ProfileService";

interface ProfileState {
  readonly profile: Profile | undefined;
  load(profileService: ProfileService, name: string): Promise<void>;
  /** Like `load`, but also reconciles against `<gameDir>/Mods` — use whenever the installed-mods
   * view needs to reflect the game's actual state, not just this app's install history. */
  loadReconciled(profileService: ProfileService, name: string, gameDir: string): Promise<void>;
  save(profileService: ProfileService): Promise<void>;
  setProfile(profile: Profile): void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: undefined,

  async load(profileService, name) {
    set({ profile: await profileService.load(name) });
  },

  async loadReconciled(profileService, name, gameDir) {
    set({ profile: await profileService.loadReconciled(name, gameDir) });
  },

  async save(profileService) {
    const { profile } = get();
    if (profile) await profileService.save(profile);
  },

  setProfile(profile) {
    set({ profile });
  },
}));
