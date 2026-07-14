import { useEffect, useState } from "react";
import { Settings } from "./ui/pages/Settings";
import { ModBrowser } from "./ui/pages/ModBrowser";
import { InstalledMods } from "./ui/pages/InstalledMods";
import { Downloads } from "./ui/pages/Downloads";
import { LogPage } from "./ui/pages/LogPage";
import { LaunchBar } from "./ui/components/LaunchBar";
import { ErrorToastHost } from "./ui/components/ErrorToastHost";
import { useContainer } from "./state/ContainerContext";
import { useAppUpdateStore } from "./state/appUpdateStore";
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

const DISCORD_INVITE = "https://discord.gg/fnhvPzRhtA";

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="cm-tabs__discord-icon">
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
    </svg>
  );
}

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
  const appUpdateStatus = useAppUpdateStore((s) => s.status);
  const appUpdateInfo = useAppUpdateStore((s) => s.info);
  const appUpdateFraction = useAppUpdateStore((s) => s.fraction);
  const checkAppUpdate = useAppUpdateStore((s) => s.checkNow);
  const installAppUpdate = useAppUpdateStore((s) => s.installNow);
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
  // Silent, one-shot check against the release CI's `latest.json` — surfaces as the banner below
  // if newer, no user action needed to discover an update exists.
  useEffect(() => {
    void checkAppUpdate(container.appUpdate);
  }, [container.appUpdate, checkAppUpdate]);
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

  async function handleAppUpdateClick() {
    try {
      await installAppUpdate(container.appUpdate);
      if (useAppUpdateStore.getState().status === "ready") await container.appUpdate.relaunch();
      else throw new Error();
    } catch {
      logAppError("Couldn't install the update. Try again from Settings.");
    }
  }

  return (
    <main className="cm-app">
      <LaunchBar />
      {gameRunning && (
        <div className="cm-global-banner">
          Cairn is running — you can still install new mods, but enabling, updating, or uninstalling one
          needs the game closed first.
        </div>
      )}
      {/* A failed background check is never shown here — it's silent by design, the user never
          asked for it and shouldn't be alarmed by it. Only a REAL available update, or a download
          the user themselves started, is worth a banner. */}
      {(appUpdateStatus === "available" || appUpdateStatus === "downloading") && (
        <div className="cm-global-banner">
          A new version of Cairn Mod Manager is available
          {appUpdateInfo ? ` — v${appUpdateInfo.version}` : ""}.{" "}
          <button className="cm-global-banner__action" onClick={handleAppUpdateClick} disabled={appUpdateStatus === "downloading"}>
            {appUpdateStatus === "downloading"
              ? `Downloading… ${appUpdateFraction !== undefined ? Math.round(appUpdateFraction * 100) : 0}%`
              : "Restart & update"}
          </button>
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
          <button
            className="cm-tabs__item cm-tabs__discord"
            onClick={() => void container.process.openExternalUrl(DISCORD_INVITE)}
          >
            <DiscordIcon />
            Discord
          </button>
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
