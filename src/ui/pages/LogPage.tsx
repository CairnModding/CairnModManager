import { useLogTabStore } from "../../state/logTabStore";
import { LogViewer } from "./LogViewer";
import { ManagerLogViewer } from "./ManagerLogViewer";

const LOG_TABS = [
  { id: "game", label: "Game log", render: () => <LogViewer /> },
  { id: "manager", label: "Manager log", render: () => <ManagerLogViewer /> },
] as const;

/** One "Log" nav entry with an internal tab switcher, rather than two separate top-level tabs for
 * what's conceptually one destination (logs) with two sources. Sub-tab selection lives in a store
 * (not local state) so a toast's "View log" button can land on the Manager log specifically. */
export function LogPage() {
  const { subTab: tab, setSubTab: setTab } = useLogTabStore();
  const active = LOG_TABS.find((t) => t.id === tab)!;

  return (
    <div className="cm-page">
      <div className="cm-subtabs">
        {LOG_TABS.map((t) => (
          <button
            key={t.id}
            className={`cm-subtabs__item ${t.id === tab ? "cm-subtabs__item--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {active.render()}
    </div>
  );
}
