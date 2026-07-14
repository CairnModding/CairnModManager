import type { ModSource } from "./modSource";

export class NotSupportedError extends Error {
  constructor(action: string) {
    super(`Thunderstore has no Cairn support yet — ${action} is unavailable`);
    this.name = "NotSupportedError";
  }
}

/** Stub — Thunderstore has confirmed Cairn support is coming but isn't live yet. Wired into
 * sourceRegistry now so turning this on later is a swap-in, not new plumbing. */
export function createThunderstoreSource(): ModSource {
  return {
    id: "thunderstore",
    async search() {
      throw new NotSupportedError("search");
    },
    async getMod() {
      throw new NotSupportedError("getMod");
    },
    async getVersions() {
      throw new NotSupportedError("getVersions");
    },
    async getDependencies() {
      throw new NotSupportedError("getDependencies");
    },
    async resolveDownload() {
      throw new NotSupportedError("resolveDownload");
    },
  };
}
