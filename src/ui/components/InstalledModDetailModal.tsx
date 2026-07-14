import { useEffect, useState } from "react";
import type { InstalledMod } from "../../domain/installedMod";
import type { CfgDocument } from "../../domain/melonPreferences";
import { Modal } from "../primitives/Modal";
import { Button } from "../primitives/Button";
import { StatusDot } from "../primitives/StatusDot";
import { useContainer } from "../../state/ContainerContext";
import { PreferenceField } from "./PreferenceField";
import "./components.css";

export function InstalledModDetailModal({
  mod,
  gameDir,
  busy,
  disabled,
  disabledReason,
  onToggleEnabled,
  onUninstall,
  onClose,
}: {
  mod: InstalledMod | undefined;
  gameDir: string | undefined;
  busy: boolean;
  disabled: boolean;
  disabledReason?: string;
  onToggleEnabled: () => void;
  onUninstall: () => void;
  onClose: () => void;
}) {
  const container = useContainer();
  const [doc, setDoc] = useState<CfgDocument>();

  useEffect(() => {
    setDoc(undefined);
    if (!mod || !gameDir) return;
    container.configEditor.load(gameDir).then(setDoc);
  }, [container, gameDir, mod]);

  // MelonPreferences sections are keyed by the mod's internal Name, which for a manually-deployed
  // (unmanaged) mod is the same string as its ref id (the DLL's base filename) — a Nexus-installed
  // mod's ref id is a numeric Nexus mod id instead, so this match only succeeds for the former.
  const section = mod && doc?.sections.find((s) => s.toLowerCase() === mod.ref.id.toLowerCase());
  const entries = doc && section ? container.configEditor.listSectionEntries(doc, section) : undefined;

  return (
    <Modal
      open={Boolean(mod)}
      title={mod?.ref.id ?? ""}
      onClose={onClose}
      footer={
        mod && (
          <>
            <Button onClick={onToggleEnabled} disabled={disabled || busy} title={disabled ? disabledReason : undefined}>
              {busy ? "Working…" : mod.enabled ? "Disable" : "Enable"}
            </Button>
            <Button
              variant="danger"
              onClick={onUninstall}
              disabled={disabled || busy}
              title={disabled ? disabledReason : undefined}
            >
              Uninstall
            </Button>
          </>
        )
      }
    >
      {mod && gameDir && (
        <div className="cm-installed-detail">
          <div className="cm-installed-detail__meta">
            <StatusDot on={mod.enabled} title={mod.enabled ? "Mod is enabled" : "Mod is disabled"} />
            <span>{mod.ref.source === "unmanaged" ? "Manually installed" : `v${mod.version}`}</span>
          </div>
          <h3 className="cm-installed-detail__settings-title">Settings</h3>
          {!doc ? (
            <p className="cm-installed-detail__hint">Loading…</p>
          ) : !section || !entries || entries.length === 0 ? (
            <p className="cm-installed-detail__hint">No MelonPreferences settings found for this mod.</p>
          ) : (
            entries.map(({ key, value }) => (
              <PreferenceField
                key={key}
                entryKey={key}
                value={value}
                onCommit={async (newValue) => {
                  const updated = await container.configEditor.setValue(gameDir, doc, section, key, newValue);
                  setDoc(updated);
                }}
              />
            ))
          )}
        </div>
      )}
    </Modal>
  );
}
