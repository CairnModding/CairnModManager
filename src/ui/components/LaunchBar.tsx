import { Button } from "../primitives/Button";
import { useContainer } from "../../state/ContainerContext";
import { useSettingsStore } from "../../state/settingsStore";
import { useGameRunning } from "../../state/gameRunningStore";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { CAIRN_STEAM_APP_ID } from "../../services/GameDetectionService";
import "./components.css";

const LAUNCH_KEY = "launch";

/** Fixed top bar, present on every tab — launching the game is the one action you want reachable
 * no matter what else you're doing in the manager. Reflects whether Cairn is already running
 * instead of always inviting a redundant "Launch" click. */
export function LaunchBar() {
  const container = useContainer();
  const { settings } = useSettingsStore();
  const gameRunning = useGameRunning();
  const { run, isBusy, error } = useAsyncAction();

  function handleLaunch() {
    return run(LAUNCH_KEY, () => container.process.launchViaSteam(CAIRN_STEAM_APP_ID));
  }

  return (
    <header className="cm-launchbar">
      <span className="cm-launchbar__title">Cairn Mod Manager</span>
      {error && <span className="cm-launchbar__error">{error}</span>}
      {gameRunning ? (
        <Button className="cm-launchbar__button cm-launchbar__button--running" disabled>
          Cairn is running
        </Button>
      ) : (
        <Button
          variant="primary"
          className="cm-launchbar__button"
          onClick={handleLaunch}
          disabled={isBusy(LAUNCH_KEY) || !settings?.gameDir}
          title={!settings?.gameDir ? "Set a game directory in Settings first" : undefined}
        >
          {isBusy(LAUNCH_KEY) ? "Launching…" : "Launch Cairn"}
        </Button>
      )}
    </header>
  );
}
