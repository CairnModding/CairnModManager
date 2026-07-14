import type { ProgressEvent, ProgressPort } from "../../ports/ProgressPort";

/** In-process pub-sub — no Tauri event system needed since progress only ever needs to reach
 * this same webview's Zustand stores, not another window or the Rust side. */
export function createProgressAdapter(): ProgressPort {
  const handlers = new Set<(event: ProgressEvent) => void>();
  return {
    emit(event) {
      for (const handler of handlers) handler(event);
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
}
