export interface AppSettings {
  readonly gameDir?: string;
  readonly nexusApiKey?: string;
  readonly nxmHandlerRegistered: boolean;
  readonly activeProfile: string;
}

export interface SettingsPort {
  load(): Promise<AppSettings>;
  save(settings: AppSettings): Promise<void>;
}
