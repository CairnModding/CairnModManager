import type { DownloadRecord } from "../../domain/downloadRecord";
import type { ProgressPhase } from "../../ports/ProgressPort";
import { formatBytes } from "../../domain/formatBytes";
import { ProgressBar } from "../primitives/ProgressBar";
import "./components.css";

const PHASE_LABEL: Record<ProgressPhase, string> = {
  downloading: "Downloading",
  extracting: "Extracting",
  installing: "Installing",
  "awaiting-browser": "Waiting for your browser",
  done: "✓ Installed",
  error: "✕ Failed",
};

export function DownloadRow({ record }: { record: DownloadRecord }) {
  const finished = record.phase === "done" || record.phase === "error";
  const variant = record.phase === "done" ? "done" : record.phase === "error" ? "error" : undefined;

  return (
    <div className={`cm-list-row cm-download-row ${variant ? `cm-download-row--${variant}` : ""}`}>
      {record.pictureUrl ? (
        <img className="cm-mod-card__thumb" src={record.pictureUrl} alt="" />
      ) : (
        <div className="cm-mod-card__thumb cm-mod-card__thumb--placeholder" aria-hidden="true" />
      )}
      <div className="cm-mod-card__body">
        <h3 className="cm-list-row__name">{record.name}</h3>
        <div className="cm-list-row__meta">
          <span>v{record.version}</span>
          {record.sizeBytes !== undefined && <span>{formatBytes(record.sizeBytes)}</span>}
          <span>{new Date(record.finishedAt ?? record.startedAt).toLocaleString()}</span>
        </div>
        {!finished && <ProgressBar fraction={record.fraction} label={record.phase} />}
      </div>
      <div className="cm-list-row__actions">
        <span className="cm-download-row__status">{PHASE_LABEL[record.phase]}</span>
      </div>
    </div>
  );
}
