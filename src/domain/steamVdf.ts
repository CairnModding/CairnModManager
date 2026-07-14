/** Minimal recursive-descent parser for Valve's VDF (KeyValues) text format — just enough to
 * read `libraryfolders.vdf` and `appmanifest_<id>.acf`. Both are flat-ish nested key/value trees;
 * we don't need array or type-annotation support Valve's format doesn't use here. */
export type VdfNode = { readonly [key: string]: string | VdfNode };

export function parseVdf(text: string): VdfNode {
  let i = 0;

  function skipWhitespaceAndComments(): void {
    for (;;) {
      while (i < text.length && /\s/.test(text[i])) i++;
      if (text[i] === "/" && text[i + 1] === "/") {
        while (i < text.length && text[i] !== "\n") i++;
        continue;
      }
      break;
    }
  }

  function readQuotedString(): string {
    i++; // opening quote
    let out = "";
    while (i < text.length && text[i] !== '"') {
      if (text[i] === "\\" && i + 1 < text.length) {
        out += text[i + 1];
        i += 2;
      } else {
        out += text[i];
        i++;
      }
    }
    i++; // closing quote
    return out;
  }

  function readObject(): VdfNode {
    const node: Record<string, string | VdfNode> = {};
    for (;;) {
      skipWhitespaceAndComments();
      if (i >= text.length || text[i] === "}") {
        i++;
        return node;
      }
      if (text[i] !== '"') {
        i++;
        continue;
      }
      const key = readQuotedString();
      skipWhitespaceAndComments();
      if (text[i] === "{") {
        i++;
        node[key] = readObject();
      } else if (text[i] === '"') {
        node[key] = readQuotedString();
      }
    }
  }

  skipWhitespaceAndComments();
  if (text[i] === '"') {
    readQuotedString(); // root key, discarded — callers index by known child keys
    skipWhitespaceAndComments();
    if (text[i] === "{") {
      i++;
      return readObject();
    }
  }
  return {};
}

export interface SteamLibrary {
  readonly path: string;
  readonly apps: readonly string[];
}

/** `libraryfolders.vdf` lives under `<steamRoot>/steamapps/`; each numbered child is a library. */
export function parseLibraryFolders(text: string): SteamLibrary[] {
  const root = parseVdf(text);
  const libraries: SteamLibrary[] = [];
  for (const value of Object.values(root)) {
    if (typeof value === "string") continue;
    const path = value["path"];
    const apps = value["apps"];
    if (typeof path !== "string") continue;
    libraries.push({
      path,
      apps: typeof apps === "object" ? Object.keys(apps) : [],
    });
  }
  return libraries;
}

/** `appmanifest_<appid>.acf` — we only need the install-directory name, relative to
 * `<library>/steamapps/common/`. */
export function parseAppManifestInstallDir(text: string): string | undefined {
  const root = parseVdf(text);
  const installDir = root["installdir"];
  return typeof installDir === "string" ? installDir : undefined;
}
