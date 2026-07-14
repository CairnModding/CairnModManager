import { joinPath } from "../domain/paths";
import { planExtraction } from "../domain/extractionPlan";
import type { ArchivePort } from "../ports/ArchivePort";
import type { FileSystemPort } from "../ports/FileSystemPort";
import type { HttpPort } from "../ports/HttpPort";
import type { ProgressPort } from "../ports/ProgressPort";

const RELEASES_API = "https://api.github.com/repos/LavaGang/MelonLoader/releases/latest";
/** MelonLoader's x64 runtime asset — the only build Cairn (a 64-bit Unity title) needs. */
const ASSET_NAME_PATTERN = /^MelonLoader\.x64\.zip$/i;

interface GitHubAsset {
  readonly name: string;
  readonly browser_download_url: string;
}

interface GitHubRelease {
  readonly tag_name: string;
  readonly assets: readonly GitHubAsset[];
}

export interface MelonLoaderService {
  isInstalled(gameDir: string): Promise<boolean>;
  latestAvailableVersion(): Promise<string>;
  install(gameDir: string, taskId: string): Promise<{ version: string }>;
  /**
   * Enable/disable strategy — MelonLoader skips non-`.dll` files in `Mods/`, so this renames the
   * extension (runtime-verified against the installed build). Kept as this one function so the
   * convention lives in a single place.
   */
  disableModFile(gameDir: string, relativeDllPath: string): Promise<void>;
  enableModFile(gameDir: string, relativeDisabledPath: string): Promise<void>;
}

export function createMelonLoaderService(
  http: HttpPort,
  fs: FileSystemPort,
  archive: ArchivePort,
  progress: ProgressPort,
): MelonLoaderService {
  return {
    async isInstalled(gameDir: string): Promise<boolean> {
      const [hasFolder, hasProxyDll] = await Promise.all([
        fs.exists(joinPath(gameDir, "MelonLoader")),
        fs.exists(joinPath(gameDir, "version.dll")),
      ]);
      return hasFolder && hasProxyDll;
    },

    async latestAvailableVersion(): Promise<string> {
      const release = await http.getJson<GitHubRelease>(RELEASES_API);
      return release.tag_name;
    },

    async install(gameDir: string, taskId: string): Promise<{ version: string }> {
      progress.emit({ taskId, phase: "downloading", message: "Fetching MelonLoader release info" });
      const release = await http.getJson<GitHubRelease>(RELEASES_API);
      const asset = release.assets.find((a) => ASSET_NAME_PATTERN.test(a.name));
      if (!asset) {
        throw new Error(`MelonLoader release ${release.tag_name} has no MelonLoader.x64.zip asset`);
      }

      const bytes = await http.getBytes(asset.browser_download_url);

      progress.emit({ taskId, phase: "extracting", message: "Unpacking MelonLoader" });
      const unzipped = archive.unzip(bytes);
      const planned = planExtraction(unzipped.entries, "melonloader");

      progress.emit({ taskId, phase: "installing", fraction: 0 });
      for (let i = 0; i < planned.length; i++) {
        const file = planned[i];
        const targetPath = joinPath(gameDir, file.targetPath);
        const segments = file.targetPath.split("/");
        segments.pop();
        if (segments.length > 0) await fs.mkdir(joinPath(gameDir, ...segments));
        await fs.writeFile(targetPath, unzipped.readEntry(file.archivePath));
        progress.emit({ taskId, phase: "installing", fraction: (i + 1) / planned.length });
      }

      progress.emit({ taskId, phase: "done" });
      return { version: release.tag_name };
    },

    async disableModFile(gameDir: string, relativeDllPath: string): Promise<void> {
      const from = joinPath(gameDir, relativeDllPath);
      const to = `${from}.disabled`;
      await fs.rename(from, to);
    },

    async enableModFile(gameDir: string, relativeDisabledPath: string): Promise<void> {
      const from = joinPath(gameDir, relativeDisabledPath);
      const to = from.replace(/\.disabled$/, "");
      await fs.rename(from, to);
    },
  };
}
