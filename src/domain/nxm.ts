/** Parses the `nxm://<game>/mods/<modId>/files/<fileId>?key=...&expires=...&user_id=...` URL
 * Nexus hands the OS-registered app when a user clicks "Mod Manager Download" on the website.
 * The key/expires/userId are what let a non-premium user's download succeed despite the API's
 * normal premium-only gate on download_link.json. */
export interface NxmRef {
  readonly game: string;
  readonly modId: string;
  readonly fileId: string;
  readonly key: string;
  readonly expires: string;
  readonly userId?: string;
}

export function parseNxmUrl(url: string): NxmRef | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "nxm:") return undefined;

  const match = parsed.pathname.match(/^\/mods\/(\d+)\/files\/(\d+)$/);
  if (!match) return undefined;

  const key = parsed.searchParams.get("key");
  const expires = parsed.searchParams.get("expires");
  if (!key || !expires) return undefined;

  return {
    game: parsed.hostname,
    modId: match[1],
    fileId: match[2],
    key,
    expires,
    userId: parsed.searchParams.get("user_id") ?? undefined,
  };
}
