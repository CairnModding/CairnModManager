import type { NxmRef } from "../domain/nxm";

/** Event-shaped, not request/response — `nxm://` links arrive whenever the user clicks
 * "Mod Manager Download" on the Nexus website, cold-launch or warm-launch alike. */
export interface DeepLinkPort {
  onNxmUrl(handler: (ref: NxmRef) => void): () => void;
}
