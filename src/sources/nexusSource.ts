import type { ModRef } from "../domain/modRef";
import type { Dependency, Mod, ModVersion } from "../domain/modVersion";
import type { NxmRef } from "../domain/nxm";
import { compareVersions } from "../domain/version";
import type { HttpPort } from "../ports/HttpPort";
import type { DownloadResolution, ModSource } from "./modSource";

export interface NexusSourceConfig {
  readonly apiKey: string;
  readonly gameDomain: string;
}

interface NexusModDto {
  readonly mod_id: number;
  readonly name: string;
  readonly summary: string;
  /** Long-form, BBCode-formatted — see domain/stripMarkup before rendering. */
  readonly description?: string;
  readonly author: string;
  readonly version: string;
  readonly picture_url: string | null;
  readonly endorsement_count: number;
  readonly mod_unique_downloads: number;
  /** False for a reserved-but-never-filled-out mod page (blank name/summary/picture, no files) —
   * `latest_updated.json` includes these alongside real releases. */
  readonly available?: boolean;
}

function isPublished(dto: NexusModDto): boolean {
  return dto.available !== false && dto.name.trim().length > 0;
}

interface NexusFileDto {
  readonly file_id: number;
  readonly name: string;
  readonly version: string;
  readonly uploaded_timestamp: number;
  readonly changelog_html: string | null;
  readonly category_name: string | null;
}

interface NexusFilesResponse {
  readonly files: readonly NexusFileDto[];
}

interface NexusDownloadLinkDto {
  readonly URI: string;
}

// v3 API DTOs — only what's needed to bridge a classic numeric file_id to a materialized
// dependency list. v3's own mod/file schema (name, summary, etc.) is intentionally not used
// here; it's missing fields the v1 endpoints above already cover (see module doc).
interface NexusV3Envelope<T> {
  readonly data: T;
}

interface NexusV3ModFileVersionDto {
  readonly id: string; // UUID — what the dependencies endpoint actually keys on
  readonly game_scoped_id: string; // the classic numeric file_id
  readonly version: string;
}

interface NexusV3MinimalModDto {
  readonly id: string;
  readonly game_scoped_id: string; // the classic numeric mod_id
  readonly name: string;
}

interface NexusV3DependencyCandidateModFileDto {
  readonly id: string;
  readonly name: string;
  readonly mod: NexusV3MinimalModDto;
  readonly candidate_versions: readonly NexusV3ModFileVersionDto[];
}

interface NexusV3MaterializedDependencyDto {
  readonly id: string;
  readonly candidate_mod_files: readonly NexusV3DependencyCandidateModFileDto[];
}

interface NexusV3MaterializedDependenciesResponse {
  readonly dependencies: readonly NexusV3MaterializedDependencyDto[];
}

const API_V1_BASE = "https://api.nexusmods.com/v1";
const API_V3_BASE = "https://api.nexusmods.com/v3";

function toModRef(modId: number | string): ModRef {
  return { source: "nexus", id: String(modId) };
}

function toMod(dto: NexusModDto): Mod {
  return {
    ref: toModRef(dto.mod_id),
    name: dto.name,
    summary: dto.summary,
    description: dto.description ?? undefined,
    author: dto.author,
    tags: [],
    latestVersion: dto.version,
    downloadCount: dto.mod_unique_downloads,
    endorsementCount: dto.endorsement_count,
    pictureUrl: dto.picture_url ?? undefined,
  };
}

/** Full Nexus Mods implementation, split across two of their APIs on purpose:
 *  - **v1** (classic REST, `apikey` header) for browsing/metadata/downloads — name, summary,
 *    author, picture, files, download links. v1 has no keyword-search endpoint, so `search`
 *    fans out to `mods/latest_updated.json` and filters client-side; fine for a niche game
 *    whose whole catalog is small.
 *  - **v3** (`api.nexusmods.com/v3`, same `apikey` header, marked Experimental by Nexus) for
 *    structured mod dependencies via `/mod-file-versions/{id}/dependencies/materialized`. v3's
 *    own mod/file schema is too thin for browsing (no summary/author/picture at all), so it's
 *    used only for the dependency bridge: numeric file_id → v3 mod-file-version UUID →
 *    materialized dependency candidates.
 *
 * Nexus's dependency model allows OR-alternatives (a dependency slot can list more than one
 * candidate mod, any of which satisfies it) and per-candidate-mod OR-alternative versions. This
 * app's domain model (`Dependency { modRef, minVersion }`) only expresses a single mod at an
 * "at least this version" floor, so `getDependencies` takes the FIRST candidate mod for each
 * slot and uses the lowest of its candidate versions as the floor. Real-world Cairn mods only
 * ever declare a single-candidate requirement (e.g. "needs CairnAPI"), so this covers the actual
 * data; a mod with genuine OR-alternative requirements would need the domain model extended.
 */
export function createNexusSource(config: NexusSourceConfig, http: HttpPort): ModSource {
  const headers = { apikey: config.apiKey };

  async function getMod(modId: string): Promise<Mod> {
    const dto = await http.getJson<NexusModDto>(
      `${API_V1_BASE}/games/${config.gameDomain}/mods/${modId}.json`,
      { headers },
    );
    return toMod(dto);
  }

  return {
    id: "nexus",

    async search(query: string): Promise<Mod[]> {
      const listing = await http.getJson<NexusModDto[]>(
        `${API_V1_BASE}/games/${config.gameDomain}/mods/latest_updated.json`,
        { headers },
      );
      const published = listing.filter(isPublished);
      const needle = query.trim().toLowerCase();
      const filtered = needle
        ? published.filter(
            (m) =>
              m.name.toLowerCase().includes(needle) || m.summary.toLowerCase().includes(needle),
          )
        : published;
      return filtered.map((dto) => toMod(dto));
    },

    getMod,

    async getVersions(modId: string): Promise<ModVersion[]> {
      const modRef = toModRef(modId);
      const response = await http.getJson<NexusFilesResponse>(
        `${API_V1_BASE}/games/${config.gameDomain}/mods/${modId}/files.json`,
        { headers },
      );
      return [...response.files]
        .sort((a, b) => b.uploaded_timestamp - a.uploaded_timestamp)
        .map((file) => ({
          modRef,
          version: file.version || file.name,
          fileId: String(file.file_id),
          releasedAt: new Date(file.uploaded_timestamp * 1000).toISOString(),
          changelog: file.changelog_html ?? undefined,
        }));
    },

    async getDependencies(version: ModVersion): Promise<Dependency[]> {
      const versionLookup = await http.getJson<NexusV3Envelope<NexusV3ModFileVersionDto>>(
        `${API_V3_BASE}/games/${config.gameDomain}/mod-file-versions/${version.fileId}`,
        { headers },
      );

      const materialized = await http.getJson<NexusV3MaterializedDependenciesResponse>(
        `${API_V3_BASE}/mod-file-versions/${versionLookup.data.id}/dependencies/materialized`,
        { headers },
      );

      const dependencies: Dependency[] = [];
      for (const slot of materialized.dependencies) {
        const candidate = slot.candidate_mod_files[0];
        if (!candidate || candidate.candidate_versions.length === 0) continue;

        const floorVersion = [...candidate.candidate_versions].sort((a, b) =>
          compareVersions(a.version, b.version),
        )[0];

        dependencies.push({
          modRef: toModRef(candidate.mod.game_scoped_id),
          minVersion: floorVersion.version,
        });
      }
      return dependencies;
    },

    async resolveDownload(version: ModVersion, nxmRef?: NxmRef): Promise<DownloadResolution> {
      const webUrl = `https://www.nexusmods.com/${config.gameDomain}/mods/${version.modRef.id}?tab=files`;

      const params = new URLSearchParams();
      if (nxmRef) {
        params.set("key", nxmRef.key);
        params.set("expires", nxmRef.expires);
        if (nxmRef.userId) params.set("user_id", nxmRef.userId);
      }
      const query = params.toString() ? `?${params.toString()}` : "";

      try {
        const links = await http.getJson<NexusDownloadLinkDto[]>(
          `${API_V1_BASE}/games/${config.gameDomain}/mods/${version.modRef.id}/files/${version.fileId}/download_link.json${query}`,
          { headers },
        );
        const link = links[0];
        if (!link) throw new Error("Nexus returned no download links");
        return { kind: "direct", url: link.URI };
      } catch (error) {
        if (!nxmRef && String(error).includes("403")) {
          // Non-premium and no nxm handoff yet — the caller sends the user to the web page to
          // click "Mod Manager Download", which produces the nxmRef this same call needs.
          return { kind: "requires-handoff", webUrl };
        }
        throw error;
      }
    },
  };
}
