import { useEffect, useState } from "react";
import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import { getVersion } from "@tauri-apps/api/app";
import { Panel } from "../primitives/Panel";
import { Field } from "../primitives/Field";
import { Button } from "../primitives/Button";
import { Badge } from "../primitives/Badge";
import { useContainer } from "../../state/ContainerContext";
import { useSettingsStore } from "../../state/settingsStore";
import { useGameRunning } from "../../state/gameRunningStore";
import { useAppUpdateStore } from "../../state/appUpdateStore";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import "./settings.css";

type SettingsAction = "detect" | "browse" | "melonloader" | "apikey" | "update-check" | "update-install";

export function Settings() {
  const container = useContainer();
  const { settings, autoDetectGameDir, setGameDir, setNexusApiKey } = useSettingsStore();
  const gameRunning = useGameRunning();
  const { run, isBusy } = useAsyncAction<SettingsAction>();
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [melonLoaderInstalled, setMelonLoaderInstalled] = useState<boolean>();
  const [appVersion, setAppVersion] = useState<string>();
  const appUpdateStatus = useAppUpdateStore((s) => s.status);
  const appUpdateInfo = useAppUpdateStore((s) => s.info);
  const appUpdateFraction = useAppUpdateStore((s) => s.fraction);
  const checkAppUpdate = useAppUpdateStore((s) => s.checkNow);
  const installAppUpdate = useAppUpdateStore((s) => s.installNow);

  useEffect(() => {
    if (!settings?.gameDir) return;
    container.melonLoader.isInstalled(settings.gameDir).then(setMelonLoaderInstalled);
  }, [container, settings?.gameDir]);

  useEffect(() => {
    getVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    setApiKeyDraft(settings?.nexusApiKey ?? "");
  }, [settings?.nexusApiKey]);

  function handleAutoDetect() {
    return run("detect", async () => {
      const found = await autoDetectGameDir(container.settingsService, container.gameDetection);
      if (!found) throw new Error("Cairn wasn't found in any detected Steam library. Use Browse… instead.");
    });
  }

  function handleBrowse() {
    return run("browse", async () => {
      const selected = await openFolderDialog({ directory: true, multiple: false });
      if (typeof selected === "string") await setGameDir(container.settingsService, selected);
    });
  }

  function handleInstallMelonLoader() {
    return run("melonloader", async () => {
      if (!settings?.gameDir) return;
      await container.processLock.assertGameNotRunning();
      await container.melonLoader.install(settings.gameDir, crypto.randomUUID());
      setMelonLoaderInstalled(true);
    });
  }

  function handleSaveApiKey() {
    return run("apikey", () => setNexusApiKey(container.settingsService, apiKeyDraft));
  }

  function handleCheckForUpdates() {
    return run("update-check", async () => {
      await checkAppUpdate(container.appUpdate);
      if (useAppUpdateStore.getState().status === "error") {
        throw new Error("Couldn't check for updates. Try again later.");
      }
    });
  }

  function handleRestartAndUpdate() {
    return run("update-install", async () => {
      await installAppUpdate(container.appUpdate);
      if (useAppUpdateStore.getState().status === "ready") {
        await container.appUpdate.relaunch();
      } else {
        throw new Error("Couldn't install the update. Try again later.");
      }
    });
  }

  return (
    <div className="cm-settings">
      <Panel title="Game directory">
        <Field label="Path" value={settings?.gameDir ?? "Not set"} readOnly />
        <div className="cm-settings__actions">
          <Button variant="primary" onClick={handleAutoDetect} disabled={isBusy("detect")}>
            {isBusy("detect") ? "Detecting…" : "Auto-detect"}
          </Button>
          <Button onClick={handleBrowse} disabled={isBusy("browse")}>
            Browse…
          </Button>
        </div>
      </Panel>

      <Panel title="MelonLoader">
        {!settings?.gameDir ? (
          <p className="cm-settings__hint">Set a game directory above first.</p>
        ) : (
          <>
            <div className="cm-settings__status-row">
              {melonLoaderInstalled === undefined ? (
                <Badge variant="neutral">Checking…</Badge>
              ) : melonLoaderInstalled ? (
                <Badge variant="success">Installed</Badge>
              ) : (
                <Badge variant="warning">Not installed</Badge>
              )}
              {gameRunning && <Badge variant="info">Close Cairn to change this</Badge>}
            </div>
            <Button
              variant="primary"
              onClick={handleInstallMelonLoader}
              disabled={gameRunning || isBusy("melonloader")}
              title={gameRunning ? "Close Cairn first — MelonLoader is loaded into the running process." : undefined}
            >
              {isBusy("melonloader")
                ? "Installing…"
                : melonLoaderInstalled
                  ? "Reinstall / update"
                  : "Install"}{" "}
              MelonLoader
            </Button>
          </>
        )}
      </Panel>

      <Panel title="Nexus Mods">
        <div className="cm-settings__inline-field">
          <Field
            label="Personal API key"
            type="password"
            value={apiKeyDraft}
            onChange={(e) => setApiKeyDraft(e.target.value)}
          />
          <Button
            variant="primary"
            onClick={handleSaveApiKey}
            disabled={isBusy("apikey") || apiKeyDraft === (settings?.nexusApiKey ?? "")}
          >
            {isBusy("apikey") ? "Saving…" : "Save key"}
          </Button>
        </div>
        <p className="cm-settings__hint">
          Generate a personal key at nexusmods.com → Settings → API Keys. Non-premium accounts can
          browse and search freely; downloading requires clicking "Mod Manager Download" on the
          mod's Nexus page, which this app receives via the <code>nxm://</code> link handler.
        </p>
      </Panel>

      <Panel title="App">
        <div className="cm-settings__status-row">
          <span className="cm-settings__hint">Version {appVersion ?? "…"}</span>
          {appUpdateStatus === "available" && <Badge variant="info">Update available</Badge>}
        </div>
        {appUpdateStatus === "available" || appUpdateStatus === "downloading" ? (
          <Button variant="primary" onClick={handleRestartAndUpdate} disabled={isBusy("update-install")}>
            {appUpdateStatus === "downloading"
              ? `Downloading… ${appUpdateFraction !== undefined ? Math.round(appUpdateFraction * 100) : 0}%`
              : `Restart & update to v${appUpdateInfo?.version}`}
          </Button>
        ) : (
          <Button onClick={handleCheckForUpdates} disabled={isBusy("update-check")}>
            {isBusy("update-check") ? "Checking…" : "Check for updates"}
          </Button>
        )}
      </Panel>
    </div>
  );
}
