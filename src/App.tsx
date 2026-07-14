import { useEffect, useState } from "react";
import { Settings } from "./ui/pages/Settings";
import { ModBrowser } from "./ui/pages/ModBrowser";
import { InstalledMods } from "./ui/pages/InstalledMods";
import { Downloads } from "./ui/pages/Downloads";
import { LogPage } from "./ui/pages/LogPage";
import { LaunchBar } from "./ui/components/LaunchBar";
import { ErrorToastHost } from "./ui/components/ErrorToastHost";
import { useContainer } from "./state/ContainerContext";
import { useInstallStore } from "./state/installStore";
import { useDownloadHistoryStore } from "./state/downloadHistoryStore";
import { useSettingsStore } from "./state/settingsStore";
import { useProfileStore } from "./state/profileStore";
import { useAppLogStore, logAppError, logAppInfo } from "./state/appLogStore";
import { useLogTabStore } from "./state/logTabStore";
import { useGameRunningStore, useGameRunning } from "./state/gameRunningStore";
import "./App.css";

const TABS = [
  { id: "browse", label: "Browse", wide: false, render: () => <ModBrowser /> },
  { id: "installed", label: "Installed", wide: false, render: () => <InstalledMods /> },
  { id: "downloads", label: "Downloads", wide: false, render: () => <Downloads /> },
  { id: "log", label: "Log", wide: true, render: () => <LogPage /> },
  { id: "settings", label: "Settings", wide: false, render: () => <Settings /> },
] as const;

function isActiveDownloadPhase(phase: string): boolean {
  return phase !== "done" && phase !== "error";
}

function App() {
  const container = useContainer();
  const attach = useInstallStore((s) => s.attach);
  const attachDownloadHistory = useDownloadHistoryStore((s) => s.attach);
  const startDownloadRecord = useDownloadHistoryStore((s) => s.start);
  const refreshSettings = useSettingsStore((s) => s.refresh);
  const logAppEvent = useAppLogStore((s) => s.log);
  const setLogSubTab = useLogTabStore((s) => s.setSubTab);
  const startGameRunningPoll = useGameRunningStore((s) => s.start);
  const gameRunning = useGameRunning();
  const activeDownloads = useInstallStore(
    (s) => Object.values(s.tasks).filter((t) => isActiveDownloadPhase(t.phase)).length,
  );
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("browse");

  useEffect(() => attach(container.progress), [container.progress, attach]);
  useEffect(
    () => attachDownloadHistory(container.progress),
    [container.progress, attachDownloadHistory],
  );
  // Polls once here, shared across every page via useGameRunning() — every page that would
  // otherwise fail with GameRunningError disables itself pre-emptively off this one poll.
  useEffect(
    () => startGameRunningPoll(container.processLock),
    [container.processLock, startGameRunningPoll],
  );
  // Install/MelonLoader progress (downloading, extracting, awaiting-browser, errors, ...) is
  // otherwise only visible as a transient meter on the Browse tab — mirror it into the durable
  // app log too.
  useEffect(
    () =>
      container.progress.subscribe((event) => {
        const message = event.message ? `${event.phase} — ${event.message}` : event.phase;
        logAppEvent(event.phase === "error" ? "error" : "info", message);
      }),
    [container.progress, logAppEvent],
  );
  // Settings (gameDir, activeProfile, etc.) are read by nearly every page — loaded once here at
  // startup instead of as a side effect of visiting the Settings tab, so e.g. Installed Mods
  // renders correctly on first visit.
  useEffect(() => {
    refreshSettings(container.settingsService);
  }, [container.settingsService, refreshSettings]);
  // An `nxm://` link the user clicked directly on nexusmods.com — not via this app's Install
  // button — has no pending `requestDownload()` waiting on it (see `NxmHandoffService`). Drive
  // the install from scratch using the ref's own modId/fileId; reads settings/profile fresh off
  // their stores rather than from this effect's closure, since they can change after mount.
  useEffect(() => {
    return container.nxmHandoff.onUnsolicited((ref) => {
      void (async () => {
        try {
          const settings = useSettingsStore.getState().settings;
          if (!settings?.gameDir) {
            throw new Error("Can't install from nxm:// link — set a game directory in Settings first.");
          }
          const sources = await container.loadSources();
          const source = sources.get("nexus");
          if (!source) throw new Error("Can't install from nxm:// link — set a Nexus API key in Settings first.");

          const [versions, mod] = await Promise.all([
            source.getVersions(ref.modId),
            source.getMod(ref.modId).catch(() => undefined),
          ]);
          const version = versions.find((v) => v.fileId === ref.fileId);
          if (!version) throw new Error(`Nexus file ${ref.fileId} for mod ${ref.modId} wasn't found.`);
          const displayName = mod?.name ?? version.modRef.id;

          const taskId = crypto.randomUUID();
          startDownloadRecord({
            taskId,
            modRef: version.modRef,
            name: displayName,
            pictureUrl: mod?.pictureUrl,
            version: version.version,
            startedAt: new Date().toISOString(),
          });
          try {
            const currentProfile = await container.profileService.load(settings.activeProfile);
            const installedMods = await container.installService.install(
              source,
              version,
              settings.gameDir,
              currentProfile,
              taskId,
              ref,
              displayName,
            );
            const nextProfile = {
              ...currentProfile,
              mods: [
                ...currentProfile.mods.filter((m) => !installedMods.some((n) => n.ref.id === m.ref.id)),
                ...installedMods,
              ],
            };
            useProfileStore.getState().setProfile(nextProfile);
            await useProfileStore.getState().save(container.profileService);
            logAppInfo(`Installed ${displayName} v${version.version} from nxm:// link.`);
          } catch (err) {
            container.progress.emit({ taskId, phase: "error", message: displayName });
            throw err;
          }
        } catch (err) {
          logAppError(err instanceof Error ? err.message : String(err));
        }
      })();
    });
  }, [container, startDownloadRecord]);

  const active = TABS.find((t) => t.id === tab)!;

  return (
    <main className="cm-app">
      <LaunchBar />
      {gameRunning && (
        <div className="cm-global-banner">
          Cairn is running — you can still install new mods, but enabling, updating, or uninstalling one
          needs the game closed first.
        </div>
      )}
      <div className="cm-app__body">
        <nav className="cm-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`cm-tabs__item ${t.id === tab ? "cm-tabs__item--active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === "downloads" && activeDownloads > 0 ? ` (${activeDownloads})` : ""}
            </button>
          ))}
        </nav>
        <div className={`cm-app__content ${active.wide ? "" : "cm-app__content--narrow"}`}>
          {active.render()}
        </div>
      </div>
      <ErrorToastHost
        onViewLog={() => {
          setLogSubTab("manager");
          setTab("log");
        }}
      />
    </main>
  );
}

export default App;
