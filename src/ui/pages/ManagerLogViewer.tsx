import { Panel } from "../primitives/Panel";
import { LogPane } from "../components/LogPane";
import { useAppLogStore } from "../../state/appLogStore";

export function ManagerLogViewer() {
  const lines = useAppLogStore((s) => s.lines);
  const formatted = lines.map((l) => `[${l.time}] ${l.level === "error" ? "ERROR" : "INFO"}: ${l.message}`);

  return (
    <Panel title="Manager log" fill>
      <LogPane lines={formatted} />
    </Panel>
  );
}
