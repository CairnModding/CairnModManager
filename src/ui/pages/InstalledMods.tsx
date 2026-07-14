import { useEffect, useState } from "react";
import { Panel } from "../primitives/Panel";
import { InstalledModCard } from "../components/InstalledModCard";
import { InstalledModDetailModal } from "../components/InstalledModDetailModal";
import { useContainer } from "../../state/ContainerContext";
import { useProfileStore } from "../../state/profileStore";
import { useSettingsStore } from "../../state/settingsStore";
import { useGameRunning } from "../../state/gameRunningStore";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import "../components/components.css";

const GAME_RUNNING_REASON = "Close Cairn first to enable, disable, or uninstall mods.";

export function InstalledMods() {
  const container = useContainer();
  const { profile, load, loadReconciled, setProfile, save } = useProfileStore();
  const { settings } = useSettingsStore();
  const gameRunning = useGameRunning();
  const { run, isBusy } = useAsyncAction();
  const [detailRefId, setDetailRefId] = useState<string>();

  useEffect(() => {
    const profileName = settings?.activeProfile ?? "default";
    if (settings?.gameDir) {
      loadReconciled(container.profileService, profileName, settings.gameDir);
    } else {
      load(container.profileService, profileName);
    }
  }, [container, load, loadReconciled, settings?.activeProfile, settings?.gameDir]);

  function toggleEnabled(refId: string) {
    return run(refId, async () => {
      if (!profile || !settings?.gameDir) return;
      const mod = profile.mods.find((m) => m.ref.id === refId);
      if (!mod) return;

      await container.processLock.assertGameNotRunning();
      const dllPath = mod.files.find((f) => f.toLowerCase().endsWith(".dll"));
      if (!dllPath) return;

      if (mod.enabled) {
        await container.melonLoader.disableModFile(settings.gameDir, dllPath);
      } else {
        await container.melonLoader.enableModFile(settings.gameDir, `${dllPath}.disabled`);
      }

      setProfile({
        ...profile,
        mods: profile.mods.map((m) => (m.ref.id === refId ? { ...m, enabled: !m.enabled } : m)),
      });
      await save(container.profileService);
    });
  }

  function uninstall(refId: string) {
    return run(refId, async () => {
      if (!profile || !settings?.gameDir) return;
      const mod = profile.mods.find((m) => m.ref.id === refId);
      if (!mod) return;

      await container.processLock.assertGameNotRunning();
      for (const file of mod.files) {
        const path = `${settings.gameDir}/${file}`;
        if (await container.fs.exists(path)) await container.fs.remove(path);
      }

      setProfile({ ...profile, mods: profile.mods.filter((m) => m.ref.id !== refId) });
      await save(container.profileService);
    });
  }

  if (!profile) return <Panel title="Installed mods">Loading…</Panel>;

  const detailMod = detailRefId ? profile.mods.find((m) => m.ref.id === detailRefId) : undefined;

  return (
    <div className="cm-page">
      <Panel title="Installed mods">
        {profile.mods.length === 0 && <p className="cm-empty-state">No mods installed yet.</p>}
      </Panel>
      <Panel fill>
        <div className="cm-installed-list">
          {profile.mods.map((mod) => (
            <InstalledModCard
              key={mod.ref.id}
              mod={mod}
              busy={isBusy(mod.ref.id)}
              disabled={gameRunning}
              disabledReason={GAME_RUNNING_REASON}
              onToggleEnabled={() => toggleEnabled(mod.ref.id)}
              onUninstall={() => uninstall(mod.ref.id)}
              onOpenDetails={() => setDetailRefId(mod.ref.id)}
            />
          ))}
        </div>
      </Panel>
      <InstalledModDetailModal
        mod={detailMod}
        gameDir={settings?.gameDir}
        busy={detailRefId ? isBusy(detailRefId) : false}
        disabled={gameRunning}
        disabledReason={GAME_RUNNING_REASON}
        onToggleEnabled={() => detailRefId && toggleEnabled(detailRefId)}
        onUninstall={() => {
          if (!detailRefId) return;
          uninstall(detailRefId).then(() => setDetailRefId(undefined));
        }}
        onClose={() => setDetailRefId(undefined)}
      />
    </div>
  );
}
