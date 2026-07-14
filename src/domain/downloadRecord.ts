import type { ModRef } from "./modRef";
import type { ProgressPhase } from "../ports/ProgressPort";

/** One entry in the Downloads tab's history — the mod-display metadata (`name`, `pictureUrl`,
 * `version`) the UI layer already has in hand before calling `InstallService.install`, merged
 * over time with the live `phase`/`fraction`/`sizeBytes` `ProgressEvent`s for the same taskId. */
export interface DownloadRecord {
  readonly taskId: string;
  readonly modRef: ModRef;
  readonly name: string;
  readonly pictureUrl?: string;
  readonly version: string;
  readonly sizeBytes?: number;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly phase: ProgressPhase;
  readonly fraction?: number;
}
