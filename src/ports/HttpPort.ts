export interface HttpRequestOptions {
  readonly method?: "GET" | "POST";
  readonly headers?: Readonly<Record<string, string>>;
}

/** HTTP seam over `@tauri-apps/plugin-http` — used for both JSON API calls (Nexus, GitHub) and
 * raw byte downloads (mod/MelonLoader zips). */
export interface HttpPort {
  getJson<T>(url: string, options?: HttpRequestOptions): Promise<T>;
  getBytes(url: string, options?: HttpRequestOptions): Promise<Uint8Array>;
}
