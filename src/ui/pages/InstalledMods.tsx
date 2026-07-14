import { useEffect, useState } from "react";
import { Panel } from "../primitives/Panel";
import { Field } from "../primitives/Field";
import { InstalledModCard } from "../components/InstalledModCard";
import { InstalledModDetailModal } from "../components/InstalledModDetailModal";
import { useContainer } from "../../state/ContainerContext";
import { useProfileStore } from "../../state/profileStore";
import { useSettingsStore } from "../../state/settingsStore";
import { useGameRunning } from "../../state/gameRunningStore";
import { useDownloadHistoryStore } from "../../state/downloadHistoryStore";
import { useInstalledModNames, useAvailableUpdates } from "../../state/useModSources";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { modRefKey, modRefEquals } from "../../domain/modRef";
import "../components/components.css";

const GAME_RUNNING_REASON = "Close Cairn first to enable, disable, or uninstall mods.";

export function InstalledMods() {
  const container = useContainer();
  const { profile, load, loadReconciled, setProfile, save } = useProfileStore();
  const { settings } = useSettingsStore();
  const gameRunning = useGameRunning();
  const { run, isBusy } = useAsyncAction();
  const [detailRefId, setDetailRefId] = useState<string>();
  const [query, setQuery] = useState("");
  const names = useInstalledModNames(profile?.mods.map((m) => m.ref) ?? []);
  const updates = useAvailableUpdates(profile);
  const startDownloadRecord = useDownloadHistoryStore((s) => s.start);

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
      const dllPaths = mod.files.filter((f) => /\.dll$/i.test(f));
      if (dllPaths.length === 0) {
        throw new Error("This mod has no .dll file to enable or disable.");
      }

      for (const dllPath of dllPaths) {
        if (mod.enabled) {
          await container.melonLoader.disableModFile(settings.gameDir, dllPath);
        } else {
          await container.melonLoader.enableModFile(settings.gameDir, `${dllPath}.disabled`);
        }
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
        // `files` records the canonical `.dll` path, but a disabled mod's file on disk is
        // `.dll.disabled` — remove whichever exists, or the mod resurrects as `unmanaged` on the
        // next reconcile.
        for (const path of [`${settings.gameDir}/${file}`, `${settings.gameDir}/${file}.disabled`]) {
          if (await container.fs.exists(path)) await container.fs.remove(path);
        }
      }

      setProfile({ ...profile, mods: profile.mods.filter((m) => m.ref.id !== refId) });
      await save(container.profileService);
    });
  }

  function updateMod(refId: string) {
    return run(refId, async () => {
      if (!profile || !settings?.gameDir) return;
      const mod = profile.mods.find((m) => m.ref.id === refId);
      if (!mod) return;
      const available = updates.get(modRefKey(mod.ref));
      if (!available) return;

      await container.processLock.assertGameNotRunning();
      const sources = await container.loadSources();
      const gameDir = settings.gameDir;
      const wasDisabled = !mod.enabled;

      const taskId = crypto.randomUUID();
      const displayName = names.get(modRefKey(mod.ref)) ?? mod.ref.id;
      startDownloadRecord({
        taskId,
        modRef: mod.ref,
        name: displayName,
        version: available.latestVersion,
        startedAt: new Date().toISOString(),
      });

      try {
        const installedMods = await container.updateService.applyUpdate(
          available,
          sources,
          gameDir,
          profile,
          taskId,
          displayName,
        );

        const primary = installedMods.find((m) => modRefEquals(m.ref, mod.ref));

        // Remove files the OLD version shipped that the new one dropped — the update only writes
        // the new file set, so anything the previous version left behind would otherwise linger as
        // dead files (and reappear as `unmanaged` on the next reconcile). Covers both the enabled
        // path and a disabled mod's `.dll.disabled` variant.
        const newFiles = new Set((primary?.files ?? []).map((f) => f.toLowerCase()));
        for (const file of mod.files.filter((f) => !newFiles.has(f.toLowerCase()))) {
          for (const path of [`${gameDir}/${file}`, `${gameDir}/${file}.disabled`]) {
            if (await container.fs.exists(path)) await container.fs.remove(path);
          }
        }

        // An update always writes the new version to the enabled `.dll` path. If the mod was
        // disabled, put it back to disabled: re-disable the freshly written dlls (clearing the
        // now-stale old `.dll.disabled` first, since rename won't overwrite it) and mark the
        // profile entry to match, so a disabled mod doesn't silently switch on when updated.
        let resultMods = installedMods;
        if (wasDisabled) {
          for (const dll of (primary?.files ?? []).filter((f) => /\.dll$/i.test(f))) {
            const stale = `${gameDir}/${dll}.disabled`;
            if (await container.fs.exists(stale)) await container.fs.remove(stale);
            await container.melonLoader.disableModFile(gameDir, dll);
          }
          resultMods = installedMods.map((m) =>
            modRefEquals(m.ref, mod.ref) ? { ...m, enabled: false } : m,
          );
        }

        setProfile({
          ...profile,
          mods: [
            ...profile.mods.filter((m) => !resultMods.some((n) => n.ref.id === m.ref.id)),
            ...resultMods,
          ],
        });
        await save(container.profileService);
      } catch (err) {
        container.progress.emit({ taskId, phase: "error", message: displayName });
        throw err;
      }
    });
  }

  if (!profile) return <Panel title="Installed mods">Loading…</Panel>;

  const detailMod = detailRefId ? profile.mods.find((m) => m.ref.id === detailRefId) : undefined;
  const needle = query.trim().toLowerCase();
  const filteredMods = needle
    ? profile.mods.filter((mod) =>
        (names.get(modRefKey(mod.ref)) ?? mod.ref.id).toLowerCase().includes(needle),
      )
    : profile.mods;

  return (
    <div className="cm-page">
      <Panel title="Installed mods">
        {profile.mods.length > 0 && (
          <Field label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
        {profile.mods.length === 0 && <p className="cm-empty-state">No mods installed yet.</p>}
        {profile.mods.length > 0 && filteredMods.length === 0 && (
          <p className="cm-empty-state">No installed mods match "{query}".</p>
        )}
      </Panel>
      <Panel fill>
        <div className="cm-installed-list">
          {filteredMods.map((mod) => (
            <InstalledModCard
              key={mod.ref.id}
              mod={mod}
              update={updates.get(modRefKey(mod.ref))}
              busy={isBusy(mod.ref.id)}
              disabled={gameRunning}
              disabledReason={GAME_RUNNING_REASON}
              onToggleEnabled={() => toggleEnabled(mod.ref.id)}
              onUninstall={() => uninstall(mod.ref.id)}
              onUpdate={() => updateMod(mod.ref.id)}
              onOpenDetails={() => setDetailRefId(mod.ref.id)}
            />
          ))}
        </div>
      </Panel>
      <InstalledModDetailModal
        mod={detailMod}
        update={detailMod ? updates.get(modRefKey(detailMod.ref)) : undefined}
        gameDir={settings?.gameDir}
        busy={detailRefId ? isBusy(detailRefId) : false}
        disabled={gameRunning}
        disabledReason={GAME_RUNNING_REASON}
        onToggleEnabled={() => detailRefId && toggleEnabled(detailRefId)}
        onUninstall={() => {
          if (!detailRefId) return;
          uninstall(detailRefId).then(() => setDetailRefId(undefined));
        }}
        onUpdate={() => detailRefId && updateMod(detailRefId)}
        onClose={() => setDetailRefId(undefined)}
      />
    </div>
  );
}
