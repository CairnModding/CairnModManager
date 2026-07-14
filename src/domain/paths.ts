/** Pure path joining, forward-slash normalized — Windows file APIs (and Tauri's fs plugin)
 * accept forward slashes, so services can build paths without depending on a Tauri-specific
 * join call. Keeps `services/` free of any `@tauri-apps/*` import. */
export function joinPath(...segments: string[]): string {
  return segments
    .filter((s) => s.length > 0)
    .map((s) => s.replace(/[/\\]+$/, "").replace(/^[/\\]+/, ""))
    .join("/");
}
