import { joinPath } from "../domain/paths";
import { parseAppManifestInstallDir, parseLibraryFolders } from "../domain/steamVdf";
import type { FileSystemPort } from "../ports/FileSystemPort";
import type { PlatformPort } from "../ports/PlatformPort";

/** Cairn's Steam AppID — confirmed from this project's own repro tooling (SteamAppId env var
 * used to launch co-op test instances). */
const CAIRN_STEAM_APP_ID = "1588550";

export interface GameDetectionService {
  /** Scans every Steam library (the root itself plus everything in libraryfolders.vdf) for
   * Cairn's appmanifest and resolves its actual install directory. Returns undefined if not
   * found — the caller falls back to the manual override in Settings. */
  detectGameDir(): Promise<string | undefined>;
}

export function createGameDetectionService(
  fs: FileSystemPort,
  platform: PlatformPort,
): GameDetectionService {
  return {
    async detectGameDir(): Promise<string | undefined> {
      const steamRoot = await platform.steamRoot();
      // The fs plugin's static capability scope only covers $APPDATA/$APPCONFIG — every path
      // under the Steam install is outside it until granted at runtime, same mechanism as the
      // user-picked game dir override.
      await platform.grantGameDirAccess(steamRoot);

      const libraryFoldersPath = joinPath(steamRoot, "steamapps", "libraryfolders.vdf");

      const libraryPaths = [steamRoot];
      if (await fs.exists(libraryFoldersPath)) {
        const vdfText = await fs.readTextFile(libraryFoldersPath);
        for (const library of parseLibraryFolders(vdfText)) {
          libraryPaths.push(library.path);
        }
      }

      for (const libraryPath of libraryPaths) {
        // Other libraries are frequently on a different drive than steamRoot, so each needs
        // its own grant — granting steamRoot recursively does not cover them.
        await platform.grantGameDirAccess(libraryPath);

        const manifestPath = joinPath(
          libraryPath,
          "steamapps",
          `appmanifest_${CAIRN_STEAM_APP_ID}.acf`,
        );
        if (!(await fs.exists(manifestPath))) continue;

        const manifestText = await fs.readTextFile(manifestPath);
        const installDir = parseAppManifestInstallDir(manifestText);
        if (installDir) {
          return joinPath(libraryPath, "steamapps", "common", installDir);
        }
      }

      return undefined;
    },
  };
}

export { CAIRN_STEAM_APP_ID };
