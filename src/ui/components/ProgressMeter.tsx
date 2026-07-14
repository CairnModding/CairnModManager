import type { ProgressEvent } from "../../ports/ProgressPort";
import { ProgressBar } from "../primitives/ProgressBar";
import "./components.css";

const PHASE_LABEL: Record<ProgressEvent["phase"], string> = {
  downloading: "Downloading",
  extracting: "Extracting",
  installing: "Installing",
  "awaiting-browser": "Waiting for your browser",
  done: "Installed",
  error: "Failed",
};

export function ProgressMeter({ event }: { event: ProgressEvent }) {
  if (event.phase === "awaiting-browser") {
    return (
      <div className="cm-progress-meter cm-progress-meter--handoff">
        <div className="cm-progress-meter__label">
          Opened {event.message} on Nexus — click "Mod Manager Download" there to continue.
        </div>
        {event.webUrl && (
          <a href={event.webUrl} target="_blank" rel="noreferrer" className="cm-progress-meter__link">
            Didn't open? Click here
          </a>
        )}
      </div>
    );
  }

  if (event.phase === "done") {
    return (
      <div className="cm-progress-meter cm-progress-meter--done">
        <div className="cm-progress-meter__label">
          <span className="cm-progress-meter__icon">✓</span>
          Installed {event.message ?? "mod"}
        </div>
      </div>
    );
  }

  if (event.phase === "error") {
    return (
      <div className="cm-progress-meter cm-progress-meter--error">
        <div className="cm-progress-meter__label">
          <span className="cm-progress-meter__icon">✕</span>
          {event.message ? `${event.message} failed to install` : "Install failed"}
        </div>
      </div>
    );
  }

  return (
    <div className="cm-progress-meter">
      <div className="cm-progress-meter__label">
        {PHASE_LABEL[event.phase]}
        {event.message ? ` — ${event.message}` : ""}
      </div>
      <ProgressBar fraction={event.fraction} label={event.phase} />
    </div>
  );
}
