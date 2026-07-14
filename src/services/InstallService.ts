import { detectConflicts, type FileConflict } from "../domain/detectConflicts";
import { planExtraction } from "../domain/extractionPlan";
import { joinPath } from "../domain/paths";
import type { InstalledMod, Profile } from "../domain/installedMod";
import { modRefEquals, modRefKey } from "../domain/modRef";
import type { ModVersion } from "../domain/modVersion";
import type { NxmRef } from "../domain/nxm";
import { resolveDependencies } from "../domain/resolveDependencies";
import { planSnapshot } from "../domain/snapshotPlan";
import type { ArchivePort } from "../ports/ArchivePort";
import type { FileSystemPort } from "../ports/FileSystemPort";
import type { HttpPort } from "../ports/HttpPort";
import type { ProgressPort } from "../ports/ProgressPort";
import type { SnapshotPort } from "../ports/SnapshotPort";
import type { ModSource } from "../sources/modSource";
import type { NxmHandoffService } from "./NxmHandoffService";
import type { ProcessLockService } from "./ProcessLockService";

/** Pre-install snapshots kept in `$APPDATA/backups` before the oldest are pruned. Enough to undo
 * a handful of recent installs without letting the folder grow without bound. */
const MAX_KEPT_SNAPSHOTS = 20;

/** `modRefKey` is `source:id`; the colon and any source-native punctuation are illegal in a
 * Windows directory name, so flatten anything outside a safe set to `_` for use as a dir segment. */
function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export class ModConflictError extends Error {
  constructor(public readonly conflicts: readonly FileConflict[]) {
    super(`Install would overwrite files owned by another mod: ${conflicts.map((c) => c.path).join(", ")}`);
    this.name = "ModConflictError";
  }
}

export class UnresolvedDependenciesError extends Error {
  constructor(
    public readonly missing: readonly { id: string }[],
    public readonly unsatisfied: readonly { id: string; required: string; installed: string }[],
  ) {
    super(unresolvedDependenciesMessage(missing, unsatisfied));
    this.name = "UnresolvedDependenciesError";
  }
}

function unresolvedDependenciesMessage(
  missing: readonly { id: string }[],
  unsatisfied: readonly { id: string; required: string; installed: string }[],
): string {
  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`missing ${missing.map((m) => m.id).join(", ")}`);
  }
  if (unsatisfied.length > 0) {
    parts.push(
      `out of date ${unsatisfied
        .map((u) => `${u.id} (need ${u.required}, have ${u.installed})`)
        .join(", ")}`,
    );
  }
  return `Can't install — unmet dependencies: ${parts.join("; ")}.`;
}

export interface InstallService {
  /** Installs `version` plus any unmet dependencies. Nexus's non-premium download gate
   * ("Mod Manager Download" browser handoff) is resolved internally, once per mod that needs
   * it — the caller only sees ordinary progress events, not a distinct outcome to branch on.
   * `nxmRef`, if given, is an already-resolved handoff (e.g. from an unsolicited `nxm://` link)
   * for the primary requested `version` — it skips that mod's browser round trip entirely;
   * dependencies still go through their own handoff if they need one. `label`, if given, is the
   * mod's display name for progress events — this layer only otherwise has `modRef.id` (a raw
   * source-native id, e.g. Nexus's numeric mod id), which reads as noise in the UI. */
  install(
    source: ModSource,
    version: ModVersion,
    gameDir: string,
    profile: Profile,
    taskId: string,
    nxmRef?: NxmRef,
    label?: string,
  ): Promise<InstalledMod[]>;
}

export function createInstallService(
  http: HttpPort,
  fs: FileSystemPort,
  archive: ArchivePort,
  snapshot: SnapshotPort,
  progress: ProgressPort,
  processLock: ProcessLockService,
  nxmHandoff: NxmHandoffService,
): InstallService {
  async function installSingle(
    source: ModSource,
    version: ModVersion,
    gameDir: string,
    profile: Profile,
    taskId: string,
    snapshotId: string,
    onCaptured: (snapshotId: string) => void,
    nxmRef?: NxmRef,
    label?: string,
  ): Promise<InstalledMod> {
    const displayName = label ?? version.modRef.id;

    let resolution = await source.resolveDownload(version, nxmRef);
    if (resolution.kind === "requires-handoff") {
      progress.emit({
        taskId,
        phase: "awaiting-browser",
        message: displayName,
        webUrl: resolution.webUrl,
      });
      const nxmRef = await nxmHandoff.requestDownload(resolution.webUrl);
      resolution = await source.resolveDownload(version, nxmRef);
      if (resolution.kind === "requires-handoff") {
        throw new Error(`${displayName} still requires a browser handoff after the nxm:// round trip`);
      }
    }

    progress.emit({ taskId, phase: "downloading", message: displayName });
    const bytes = await http.getBytes(resolution.url);

    progress.emit({ taskId, phase: "extracting", message: displayName, sizeBytes: bytes.length });
    const unzipped = archive.unzip(bytes);
    const planned = planExtraction(unzipped.entries, "mod");

    const conflicts = detectConflicts(
      version.modRef,
      planned.map((p) => p.targetPath),
      profile,
    );
    if (conflicts.length > 0) throw new ModConflictError(conflicts);

    const existing = new Set<string>();
    for (const file of planned) {
      if (await fs.exists(joinPath(gameDir, file.targetPath))) existing.add(file.targetPath);
    }
    // Brand-new files have no lock to fight — only overwriting an already-installed mod's files
    // (an update/reinstall) can hit one a running game holds open, so only gate that case.
    if (existing.size > 0) await processLock.assertGameNotRunning();
    await snapshot.capture(gameDir, planSnapshot(snapshotId, planned, existing));
    // Recorded only after a successful capture, so a rollback never tries to restore a snapshot
    // that was never written.
    onCaptured(snapshotId);

    progress.emit({ taskId, phase: "installing", fraction: 0 });
    for (let i = 0; i < planned.length; i++) {
      const file = planned[i];
      const segments = file.targetPath.split("/");
      segments.pop();
      if (segments.length > 0) await fs.mkdir(joinPath(gameDir, ...segments));
      await fs.writeFile(joinPath(gameDir, file.targetPath), unzipped.readEntry(file.archivePath));
      progress.emit({ taskId, phase: "installing", fraction: (i + 1) / planned.length });
    }

    return {
      ref: version.modRef,
      version: version.version,
      enabled: true,
      files: planned.map((p) => p.targetPath),
      installedAt: new Date().toISOString(),
    };
  }

  return {
    async install(source, version, gameDir, profile, taskId, nxmRef, label): Promise<InstalledMod[]> {
      const dependencies = await source.getDependencies(version);
      const catalog = new Map<string, readonly ModVersion[]>([[modRefKey(version.modRef), [version]]]);
      for (const dep of dependencies) {
        catalog.set(modRefKey(dep.modRef), await source.getVersions(dep.modRef.id));
      }

      const plan = resolveDependencies(version, dependencies, profile, catalog);
      if (plan.missing.length > 0 || plan.unsatisfied.length > 0) {
        throw new UnresolvedDependenciesError(
          plan.missing.map((m) => ({ id: m.id })),
          plan.unsatisfied.map((u) => ({
            id: u.modRef.id,
            required: u.required,
            installed: u.installed,
          })),
        );
      }

      // All mods in one install() share a batch stamp so their snapshots sort together and stay
      // unique per mod — the id doubles as both the sort key for pruning and the rollback handle.
      const batchStamp = new Date().toISOString().replace(/[:.]/g, "-");
      const installed: InstalledMod[] = [];
      const captured: string[] = [];
      try {
        for (const item of plan.toInstall) {
          const isPrimary = modRefEquals(item.version.modRef, version.modRef);
          const snapshotId = `${batchStamp}__${safeSegment(modRefKey(item.version.modRef))}`;
          installed.push(
            await installSingle(
              source,
              item.version,
              gameDir,
              profile,
              taskId,
              snapshotId,
              (id) => captured.push(id),
              isPrimary ? nxmRef : undefined,
              isPrimary ? label : undefined,
            ),
          );
        }
      } catch (err) {
        // A dependency chain that fails partway leaves the mods installed before the failure on
        // disk with no profile record. Restore each captured snapshot newest-first so the game dir
        // returns to its pre-install state instead of accumulating orphaned files.
        for (const id of [...captured].reverse()) {
          try {
            await snapshot.restore(gameDir, id);
          } catch {
            // Best-effort: a restore failure must not mask the original install error.
          }
        }
        throw err;
      }

      // Housekeeping only — a failure here must not fail an otherwise-successful install.
      try {
        await snapshot.prune(MAX_KEPT_SNAPSHOTS);
      } catch {
        /* ignore */
      }

      progress.emit({ taskId, phase: "done", message: label ?? version.modRef.id });
      return installed;
    },
  };
}
