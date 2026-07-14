import { joinPath } from "../domain/paths";
import {
  getPreferenceValue,
  listEntries,
  parseMelonPreferences,
  serializeMelonPreferences,
  setPreferenceValue,
  type CfgDocument,
} from "../domain/melonPreferences";
import type { FileSystemPort } from "../ports/FileSystemPort";

const CFG_RELATIVE_PATH = "UserData/MelonPreferences.cfg";

export interface ConfigEditorService {
  load(gameDir: string): Promise<CfgDocument>;
  getValue(doc: CfgDocument, section: string, key: string): string | undefined;
  listSectionEntries(doc: CfgDocument, section: string): { key: string; value: string }[];
  /** Patches one value and writes the whole file back — every other mod's section and every
   * comment survives untouched (see domain/melonPreferences round-trip guarantee). */
  setValue(gameDir: string, doc: CfgDocument, section: string, key: string, value: string): Promise<CfgDocument>;
}

export function createConfigEditorService(fs: FileSystemPort): ConfigEditorService {
  function cfgPath(gameDir: string): string {
    return joinPath(gameDir, CFG_RELATIVE_PATH);
  }

  return {
    async load(gameDir: string): Promise<CfgDocument> {
      const path = cfgPath(gameDir);
      if (!(await fs.exists(path))) return parseMelonPreferences("");
      return parseMelonPreferences(await fs.readTextFile(path));
    },

    getValue: getPreferenceValue,
    listSectionEntries: listEntries,

    async setValue(gameDir, doc, section, key, value): Promise<CfgDocument> {
      const updated = setPreferenceValue(doc, section, key, value);
      await fs.writeTextFile(cfgPath(gameDir), serializeMelonPreferences(updated));
      return updated;
    },
  };
}
