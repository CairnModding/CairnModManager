/** Round-tripping reader/writer for MelonLoader's `UserData/MelonPreferences.cfg` — a single
 * TOML-flavored file every installed mod shares, one `[Category]` section each. We must never
 * lose another mod's comments or entries when editing one value, so this keeps the original
 * lines intact and only patches the exact line a value changed on. */

const SECTION_RE = /^\s*\[([^\]]+)\]\s*$/;
const ENTRY_RE = /^(\s*)([^\s=][^=]*?)(\s*=\s*)(.*?)(\s*)$/;

interface EntryLocation {
  readonly lineIndex: number;
  readonly rawValue: string;
}

export interface CfgDocument {
  readonly lines: readonly string[];
  /** Keyed by `${section}::${key}` for O(1) lookup/patch. */
  readonly index: ReadonlyMap<string, EntryLocation>;
  readonly sections: readonly string[];
}

function entryKey(section: string, key: string): string {
  return `${section}::${key}`;
}

export function parseMelonPreferences(text: string): CfgDocument {
  const lines = text.split(/\r?\n/);
  const index = new Map<string, EntryLocation>();
  const sections: string[] = [];
  let currentSection = "";

  lines.forEach((line, lineIndex) => {
    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      sections.push(currentSection);
      return;
    }
    if (!currentSection) return;

    const entryMatch = line.match(ENTRY_RE);
    if (!entryMatch) return;
    const key = entryMatch[2].trim();
    const value = entryMatch[4];
    index.set(entryKey(currentSection, key), { lineIndex, rawValue: value });
  });

  return { lines, index, sections };
}

export function getPreferenceValue(doc: CfgDocument, section: string, key: string): string | undefined {
  return doc.index.get(entryKey(section, key))?.rawValue;
}

export function listEntries(doc: CfgDocument, section: string): { key: string; value: string }[] {
  const prefix = `${section}::`;
  const entries: { key: string; value: string }[] = [];
  for (const [k, loc] of doc.index) {
    if (k.startsWith(prefix)) {
      entries.push({ key: k.slice(prefix.length), value: loc.rawValue });
    }
  }
  return entries;
}

/** Patches one entry's value in place and returns a new document — the rest of the file
 * (every other mod's section, every comment) is byte-identical to the input. */
export function setPreferenceValue(
  doc: CfgDocument,
  section: string,
  key: string,
  newValue: string,
): CfgDocument {
  const loc = doc.index.get(entryKey(section, key));
  if (!loc) {
    throw new Error(`Unknown preference ${section}.${key} — cannot blind-insert into a shared cfg file`);
  }

  const line = doc.lines[loc.lineIndex];
  const match = line.match(ENTRY_RE);
  if (!match) {
    throw new Error(`Preference line for ${section}.${key} no longer parses as key = value`);
  }
  const [, indent, rawKey, separator, , trailing] = match;
  const newLine = `${indent}${rawKey}${separator}${newValue}${trailing}`;

  const newLines = doc.lines.slice();
  newLines[loc.lineIndex] = newLine;
  return parseMelonPreferences(newLines.join("\n"));
}

export function serializeMelonPreferences(doc: CfgDocument): string {
  return doc.lines.join("\n");
}
