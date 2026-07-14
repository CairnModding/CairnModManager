import type { MouseEvent } from "react";
import type { InstalledMod } from "../../domain/installedMod";
import { Button } from "../primitives/Button";
import { StatusDot } from "../primitives/StatusDot";
import { useModDetail } from "../../state/useModSources";
import "./components.css";

export function InstalledModCard({
  mod,
  busy,
  disabled,
  disabledReason,
  onToggleEnabled,
  onUninstall,
  onOpenDetails,
}: {
  mod: InstalledMod;
  busy: boolean;
  disabled: boolean;
  disabledReason?: string;
  onToggleEnabled: () => void;
  onUninstall: () => void;
  onOpenDetails: () => void;
}) {
  const unmanaged = mod.ref.source === "unmanaged";
  const { data: source } = useModDetail(mod.ref.source, unmanaged ? "" : mod.ref.id);

  function stopAnd(action: () => void) {
    return (e: MouseEvent) => {
      e.stopPropagation();
      action();
    };
  }

  return (
    <div className="cm-list-row cm-installed-card" onClick={onOpenDetails} role="button" tabIndex={0}>
      {source?.pictureUrl ? (
        <img className="cm-mod-card__thumb" src={source.pictureUrl} alt="" />
      ) : (
        <div className="cm-mod-card__thumb cm-mod-card__thumb--placeholder" aria-hidden="true" />
      )}
      <div className="cm-mod-card__body">
        <h3 className="cm-list-row__name">
          <StatusDot on={mod.enabled} title={mod.enabled ? "Mod is enabled" : "Mod is disabled"} />
          {source?.name ?? mod.ref.id}
        </h3>
        {source?.summary && <p className="cm-mod-card__summary">{source.summary}</p>}
        <div className="cm-list-row__meta">
          <span>{unmanaged ? "Manually installed" : `v${mod.version}`}</span>
        </div>
      </div>
      <div className="cm-list-row__actions" title={disabled ? disabledReason : undefined}>
        <Button onClick={stopAnd(onToggleEnabled)} disabled={disabled || busy}>
          {busy ? "Working…" : mod.enabled ? "Disable" : "Enable"}
        </Button>
        <Button variant="danger" onClick={stopAnd(onUninstall)} disabled={disabled || busy}>
          Uninstall
        </Button>
      </div>
    </div>
  );
}
