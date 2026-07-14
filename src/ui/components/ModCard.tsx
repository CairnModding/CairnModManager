import type { MouseEvent } from "react";
import type { Mod } from "../../domain/modVersion";
import type { InstalledMod } from "../../domain/installedMod";
import { Button } from "../primitives/Button";
import { DependencyList } from "./DependencyList";
import "./components.css";

export function ModCard({
  mod,
  installed,
  installDisabled,
  onInstall,
  onOpenDetails,
}: {
  mod: Mod;
  installed?: InstalledMod;
  installDisabled?: boolean;
  onInstall: () => void;
  onOpenDetails: () => void;
}) {
  function handleInstallClick(e: MouseEvent) {
    e.stopPropagation();
    onInstall();
  }

  return (
    <article className="cm-list-row cm-mod-card" onClick={onOpenDetails} role="button" tabIndex={0}>
      {mod.pictureUrl && <img className="cm-mod-card__thumb" src={mod.pictureUrl} alt="" />}
      <div className="cm-mod-card__body">
        <h3 className="cm-list-row__name">{mod.name}</h3>
        <p className="cm-mod-card__summary">{mod.summary}</p>
        <div className="cm-list-row__meta">
          <span>{mod.author}</span>
          <span>v{mod.latestVersion}</span>
        </div>
        <div className="cm-mod-card__stats">
          {mod.downloadCount !== undefined && <span>⬇ {mod.downloadCount.toLocaleString()}</span>}
          {mod.endorsementCount !== undefined && <span>👍 {mod.endorsementCount.toLocaleString()}</span>}
          <DependencyList sourceId={mod.ref.source} modId={mod.ref.id} />
        </div>
      </div>
      <div className="cm-list-row__actions">
        {installed ? (
          <span className="cm-mod-card__installed">Installed v{installed.version}</span>
        ) : (
          <Button variant="primary" onClick={handleInstallClick} disabled={installDisabled}>
            Install
          </Button>
        )}
      </div>
    </article>
  );
}
