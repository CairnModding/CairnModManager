import type { NxmRef } from "../domain/nxm";
import type { DeepLinkPort } from "../ports/DeepLinkPort";
import type { ProcessPort } from "../ports/ProcessPort";

export interface NxmHandoffService {
  /** Sends the user to the mod's Nexus page and resolves with the `nxm://` ref their "Mod
   * Manager Download" click produces — cold or warm launch, `DeepLinkPort` handles both. */
  requestDownload(webUrl: string): Promise<NxmRef>;
  /** Fires for an `nxm://` link that arrives with no `requestDownload()` waiting on it — the
   * user clicked "Mod Manager Download" on nexusmods.com without going through this app's
   * Install button first. The ref carries its own modId/fileId, enough to drive an install
   * from scratch. */
  onUnsolicited(handler: (ref: NxmRef) => void): () => void;
}

/** One persistent subscription to `DeepLinkPort` for the app's whole lifetime — not one per
 * `requestDownload()` call. Every arriving ref is routed to the oldest pending
 * `requestDownload()` waiter if one exists (the in-app-Install-initiated browser round trip);
 * otherwise it's unsolicited and goes to `onUnsolicited` listeners instead. Without this
 * single-dispatch point, a second independent subscription (e.g. for unsolicited links) would
 * double-handle every ref that arrives while a `requestDownload()` is also pending. */
/** How long a browser round trip may sit pending before it's abandoned. Without this a user who
 * closes the Nexus tab (or never clicks "Mod Manager Download") leaves the install stuck in
 * `awaiting-browser` forever AND leaves a dead resolver at the head of the queue that swallows the
 * next arriving link — even one for a different mod. */
const HANDOFF_TIMEOUT_MS = 5 * 60_000;

export function createNxmHandoffService(deepLink: DeepLinkPort, process: ProcessPort): NxmHandoffService {
  const pendingResolvers: Array<(ref: NxmRef) => void> = [];
  const unsolicitedHandlers = new Set<(ref: NxmRef) => void>();

  deepLink.onNxmUrl((ref) => {
    const resolve = pendingResolvers.shift();
    if (resolve) resolve(ref);
    else for (const handler of unsolicitedHandlers) handler(ref);
  });

  return {
    requestDownload(webUrl: string): Promise<NxmRef> {
      return new Promise((resolve, reject) => {
        let settled = false;
        const entry = (ref: NxmRef) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(ref);
        };
        pendingResolvers.push(entry);
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          const i = pendingResolvers.indexOf(entry);
          if (i >= 0) pendingResolvers.splice(i, 1);
          reject(
            new Error(
              'Timed out waiting for the Nexus "Mod Manager Download" click. Start the install again when you\'re ready.',
            ),
          );
        }, HANDOFF_TIMEOUT_MS);
        void process.openExternalUrl(webUrl);
      });
    },
    onUnsolicited(handler) {
      unsolicitedHandlers.add(handler);
      return () => unsolicitedHandlers.delete(handler);
    },
  };
}
