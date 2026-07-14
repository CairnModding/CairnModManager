import { create } from "zustand";

export type LogSubTab = "game" | "manager";

interface LogTabState {
  readonly subTab: LogSubTab;
  setSubTab(tab: LogSubTab): void;
}

/** Which of the Log page's Game/Manager sub-tabs is active — lifted out of `LogPage` itself so
 * navigation from outside (a toast's "View log" button) can select the Manager log specifically,
 * not just land on whichever sub-tab happened to be open. */
export const useLogTabStore = create<LogTabState>((set) => ({
  subTab: "game",
  setSubTab: (subTab) => set({ subTab }),
}));
