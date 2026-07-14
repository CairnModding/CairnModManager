import type { SourceId } from "../domain/modRef";
import type { HttpPort } from "../ports/HttpPort";
import { createNexusSource } from "./nexusSource";
import { createThunderstoreSource } from "./thunderstoreSource";
import type { ModSource } from "./modSource";

const CAIRN_GAME_DOMAIN = "cairn";

export function createSourceRegistry(
  http: HttpPort,
  nexusApiKey: string,
): ReadonlyMap<SourceId, ModSource> {
  return new Map<SourceId, ModSource>([
    ["nexus", createNexusSource({ apiKey: nexusApiKey, gameDomain: CAIRN_GAME_DOMAIN }, http)],
    ["thunderstore", createThunderstoreSource()],
  ]);
}
