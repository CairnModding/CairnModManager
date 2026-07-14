export type ProgressPhase =
  | "downloading"
  | "extracting"
  | "installing"
  | "awaiting-browser"
  | "done"
  | "error";

export interface ProgressEvent {
  readonly taskId: string;
  readonly phase: ProgressPhase;
  /** 0-1, when known; undefined for indeterminate phases. */
  readonly fraction?: number;
  readonly message?: string;
  /** Set once the download finishes (on the `extracting` event) — the archive's byte size. */
  readonly sizeBytes?: number;
  /** Set on `awaiting-browser` — the Nexus mod page the user needs to click "Mod Manager
   * Download" on. `NxmHandoffService` already opened it in the system browser; this is a
   * fallback link in case that didn't come to the front. */
  readonly webUrl?: string;
}

/** A small in-process emitter services push progress into; the log-tail/install stores
 * subscribe. Kept as an explicit port rather than threading callbacks through every service
 * method. */
export interface ProgressPort {
  emit(event: ProgressEvent): void;
  subscribe(handler: (event: ProgressEvent) => void): () => void;
}
