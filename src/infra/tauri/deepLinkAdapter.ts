import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { parseNxmUrl } from "../../domain/nxm";
import type { DeepLinkPort } from "../../ports/DeepLinkPort";

function dispatch(urls: string[], handler: Parameters<DeepLinkPort["onNxmUrl"]>[0]): void {
  for (const url of urls) {
    const ref = parseNxmUrl(url);
    if (ref) handler(ref);
  }
}

export function createDeepLinkAdapter(): DeepLinkPort {
  return {
    onNxmUrl(handler) {
      let unlisten: (() => void) | undefined;
      let cancelled = false;

      // Cold launch: the URL that started this process, if any.
      getCurrent().then((urls) => {
        if (urls) dispatch(urls, handler);
      });

      // Warm launch (already running) and any subsequent click: single-instance forwards the
      // new process's argv into this same onOpenUrl stream.
      onOpenUrl((urls) => dispatch(urls, handler)).then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      });

      return () => {
        cancelled = true;
        unlisten?.();
      };
    },
  };
}
