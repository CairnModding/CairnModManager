/** Lets ProcessLockService be tested without a real game process — `isRunning` is the seam. */
export interface ProcessPort {
  isRunning(executableName: string): Promise<boolean>;
  /** Launches the game via its Steam URI (`steam://rungameid/<appid>`) so Steam's overlay/DRM
   * init correctly, rather than spawning the exe path directly. */
  launchViaSteam(appId: string): Promise<void>;
  /** Opens a URL in the system's default browser — used to send the user to a Nexus mod page
   * for the "Mod Manager Download" click that produces an nxm:// handoff. */
  openExternalUrl(url: string): Promise<void>;
}
