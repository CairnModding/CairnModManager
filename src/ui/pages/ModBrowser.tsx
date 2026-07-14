import { useEffect, useState } from "react";
import { Panel } from "../primitives/Panel";
import { Field } from "../primitives/Field";
import { ModCard } from "../components/ModCard";
import { ModDetailModal } from "../components/ModDetailModal";
import { ProgressMeter } from "../components/ProgressMeter";
import { useContainer } from "../../state/ContainerContext";
import { useModSearch } from "../../state/useModSources";
import { useProfileStore } from "../../state/profileStore";
import { useSettingsStore } from "../../state/settingsStore";
import { useInstallStore } from "../../state/installStore";
import { useDownloadHistoryStore } from "../../state/downloadHistoryStore";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { findInstalled } from "../../domain/installedMod";
import { logAppError } from "../../state/appLogStore";

export function ModBrowser() {
  const container = useContainer();
  const [query, setQuery] = useState("");
  const { data: mods, isLoading, error } = useModSearch("nexus", query);
  const { profile, load, setProfile, save } = useProfileStore();
  const { settings } = useSettingsStore();
  const { tasks } = useInstallStore();
  const startDownloadRecord = useDownloadHistoryStore((s) => s.start);
  const [activeTaskId, setActiveTaskId] = useState<string>();
  const [detailModId, setDetailModId] = useState<string>();
  const { run, isBusy } = useAsyncAction();

  useEffect(() => {
    if (error) logAppError(error instanceof Error ? error.message : String(error));
  }, [error]);

  function handleInstall(modId: string) {
    return run(modId, async () => {
      if (!settings?.gameDir) throw new Error("Set a game directory in Settings first.");
      if (!profile) await load(container.profileService, settings.activeProfile);

      const sources = await container.loadSources();
      const source = sources.get("nexus")!;
      const versions = await source.getVersions(modId);
      const latest = versions[0];
      if (!latest) return;

      const taskId = crypto.randomUUID();
      setActiveTaskId(taskId);
      const mod = mods?.find((m) => m.ref.id === modId);
      const modName = mod?.name;
      startDownloadRecord({
        taskId,
        modRef: latest.modRef,
        name: modName ?? modId,
        pictureUrl: mod?.pictureUrl,
        version: latest.version,
        startedAt: new Date().toISOString(),
      });

      try {
        const currentProfile = profile ?? (await container.profileService.load(settings.activeProfile));
        const installedMods = await container.installService.install(
          source,
          latest,
          settings.gameDir,
          currentProfile,
          taskId,
          undefined,
          modName,
        );
        const nextProfile = {
          ...currentProfile,
          mods: [
            ...currentProfile.mods.filter((m) => !installedMods.some((n) => n.ref.id === m.ref.id)),
            ...installedMods,
          ],
        };
        setProfile(nextProfile);
        await save(container.profileService);
        setDetailModId(undefined);
      } catch (err) {
        // Otherwise a failed install just freezes the meter on whatever step it died at
        // (downloading, extracting, ...) with no visible end state.
        container.progress.emit({ taskId, phase: "error", message: modName ?? modId });
        throw err;
      }
    });
  }

  const activeEvent = activeTaskId ? tasks[activeTaskId] : undefined;
  const detailInstalled = profile && detailModId ? findInstalled(profile, { source: "nexus", id: detailModId }) : undefined;

  if (!settings?.nexusApiKey) {
    return (
      <div className="cm-page cm-page--centered">
        <Panel title="Nexus API key required">
          <p>Set a personal API key in Settings to browse and install mods from Nexus.</p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="cm-page">
      <Panel title="Browse mods (Nexus)">
        <Field label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        {activeEvent && <ProgressMeter event={activeEvent} />}
        {isLoading && <p>Loading…</p>}
      </Panel>
      <Panel fill>
        {mods?.map((mod) => (
          <ModCard
            key={mod.ref.id}
            mod={mod}
            installed={profile ? findInstalled(profile, mod.ref) : undefined}
            installDisabled={isBusy(mod.ref.id)}
            onInstall={() => handleInstall(mod.ref.id)}
            onOpenDetails={() => setDetailModId(mod.ref.id)}
          />
        ))}
      </Panel>
      <ModDetailModal
        sourceId="nexus"
        modId={detailModId}
        installed={detailInstalled}
        installDisabled={detailModId ? isBusy(detailModId) : false}
        onInstall={() => detailModId && handleInstall(detailModId)}
        onClose={() => setDetailModId(undefined)}
      />
    </div>
  );
}
