import type { InstalledMod } from "../../domain/installedMod";
import type { SourceId } from "../../domain/modRef";
import { stripMarkup } from "../../domain/stripMarkup";
import { Modal } from "../primitives/Modal";
import { Button } from "../primitives/Button";
import { Badge } from "../primitives/Badge";
import { useModDetail, useModVersions } from "../../state/useModSources";
import { useContainer } from "../../state/ContainerContext";
import { DependencyList } from "./DependencyList";
import { BBCodeContent } from "./BBCodeContent";
import "./components.css";

export function ModDetailModal({
  sourceId,
  modId,
  installed,
  installDisabled,
  onInstall,
  onClose,
}: {
  sourceId: SourceId;
  modId: string | undefined;
  installed?: InstalledMod;
  installDisabled?: boolean;
  onInstall: () => void;
  onClose: () => void;
}) {
  const container = useContainer();
  const { data: mod } = useModDetail(sourceId, modId ?? "");
  const { data: versions } = useModVersions(sourceId, modId ?? "");
  const latest = versions?.[0];

  return (
    <Modal
      open={Boolean(modId)}
      title={mod?.name ?? "Loading…"}
      onClose={onClose}
      footer={
        installed ? (
          <Badge variant="success">Installed v{installed.version}</Badge>
        ) : (
          <Button variant="primary" onClick={onInstall} disabled={installDisabled}>
            Install
          </Button>
        )
      }
    >
      {mod && modId && (
        <div className="cm-mod-detail">
          {mod.pictureUrl && <img className="cm-mod-detail__image" src={mod.pictureUrl} alt="" />}
          <div className="cm-mod-detail__meta">
            <span className="cm-mod-detail__meta-left">
              <span>by {mod.author}</span>
              <span>v{mod.latestVersion}</span>
            </span>
            <span className="cm-mod-detail__meta-right">
              {mod.downloadCount !== undefined && <span>⬇ {mod.downloadCount.toLocaleString()}</span>}
              {mod.endorsementCount !== undefined && <span>👍 {mod.endorsementCount.toLocaleString()}</span>}
            </span>
          </div>
          <div className="cm-mod-detail__requires">
            <DependencyList sourceId={sourceId} modId={modId} />
          </div>
          <BBCodeContent
            source={mod.description && mod.description.trim().length > 0 ? mod.description : mod.summary}
            onOpenLink={(url) => container.process.openExternalUrl(url)}
          />
          {latest?.changelog && (
            <div className="cm-mod-detail__changelog">
              <h3 className="cm-mod-detail__changelog-title">Latest changelog</h3>
              <p className="cm-mod-detail__changelog-text">{stripMarkup(latest.changelog)}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
