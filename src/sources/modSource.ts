import type { SourceId } from "../domain/modRef";
import type { Dependency, Mod, ModVersion } from "../domain/modVersion";
import type { NxmRef } from "../domain/nxm";

export type DownloadResolution =
  | { readonly kind: "direct"; readonly url: string }
  /** Nexus's non-premium gate: the caller must send the user to the mod's web page to click
   * "Mod Manager Download", then retry `resolveDownload` with the resulting `nxmRef`. */
  | { readonly kind: "requires-handoff"; readonly webUrl: string };

/** The one real DI seam in this app — Nexus is a full implementation today, Thunderstore is a
 * stub until they add Cairn support, and nothing else in the codebase changes when it lands. */
export interface ModSource {
  readonly id: SourceId;
  search(query: string): Promise<Mod[]>;
  getMod(modId: string): Promise<Mod>;
  getVersions(modId: string): Promise<ModVersion[]>;
  /** Fetched lazily, per version, only when actually installing — not baked into every
   * `getVersions()` listing, since resolving dependencies is its own network round trip
   * (Nexus: a mod-file-version lookup plus a materialized-dependencies call). */
  getDependencies(version: ModVersion): Promise<Dependency[]>;
  resolveDownload(version: ModVersion, nxmRef?: NxmRef): Promise<DownloadResolution>;
}
