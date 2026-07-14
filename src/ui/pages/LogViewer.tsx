import { useEffect } from "react";
import { Panel } from "../primitives/Panel";
import { LogPane } from "../components/LogPane";
import { useContainer } from "../../state/ContainerContext";
import { useSettingsStore } from "../../state/settingsStore";
import { useLogTailStore } from "../../state/logTailStore";

export function LogViewer() {
  const container = useContainer();
  const { settings } = useSettingsStore();
  const { lines, start, clear } = useLogTailStore();

  useEffect(() => {
    if (!settings?.gameDir) return;
    let stop: (() => void) | undefined;
    start(container.fs, settings.gameDir).then((fn) => {
      stop = fn;
    });
    return () => {
      stop?.();
      clear();
    };
  }, [container.fs, settings?.gameDir, start, clear]);

  if (!settings?.gameDir) {
    return <Panel title="MelonLoader log">Set a game directory in Settings first.</Panel>;
  }

  return (
    <Panel title="MelonLoader log" fill>
      <LogPane lines={lines} />
    </Panel>
  );
}
