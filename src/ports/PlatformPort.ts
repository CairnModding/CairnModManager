export interface PlatformPort {
  steamRoot(): Promise<string>;
  appDataDir(): Promise<string>;
  /** Grows the fs plugin's runtime scope to include a user-picked game dir (persisted-scope
   * makes the grant survive restarts). Must be called before any FileSystemPort call against a
   * path outside the default `$APPDATA`/`$APPCONFIG` scope. */
  grantGameDirAccess(path: string): Promise<void>;
}
