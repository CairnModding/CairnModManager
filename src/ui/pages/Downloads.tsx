import { Panel } from "../primitives/Panel";
import { DownloadRow } from "../components/DownloadRow";
import { useDownloadHistoryStore } from "../../state/downloadHistoryStore";

/** Every install this session, across every page that started one — Browse's Install button, an
 * unsolicited `nxm://` link, a future Update button — each with the mod's picture, version,
 * download size, and start/finish time, not just a bare progress bar. */
export function Downloads() {
  const records = useDownloadHistoryStore((s) => s.records);
  const list = Object.values(records);

  return (
    <div className="cm-page">
      <Panel title="Downloads" fill>
        {list.length === 0 ? (
          <p className="cm-empty-state">No downloads yet this session.</p>
        ) : (
          list.map((record) => <DownloadRow key={record.taskId} record={record} />)
        )}
      </Panel>
    </div>
  );
}
