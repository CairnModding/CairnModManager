import { decodeEntities, stripTags } from "./stripMarkup";

export type BBCodeInline =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "bold"; readonly text: string }
  | { readonly type: "italic"; readonly text: string }
  | { readonly type: "underline"; readonly text: string }
  | { readonly type: "link"; readonly href: string; readonly text: string };

export type BBCodeBlock =
  | { readonly type: "paragraph"; readonly inline: readonly BBCodeInline[] }
  | { readonly type: "list"; readonly items: readonly (readonly BBCodeInline[])[] };

// Non-nested by design — Nexus mod descriptions in practice don't nest [b]/[i]/[url], and a full
// recursive BBCode grammar isn't worth the complexity for "convert links, show formatting".
const INLINE_TOKEN =
  /\[b\]([\s\S]*?)\[\/b\]|\[i\]([\s\S]*?)\[\/i\]|\[u\]([\s\S]*?)\[\/u\]|\[url=([^\]]+)\]([\s\S]*?)\[\/url\]|\[url\]([\s\S]*?)\[\/url\]|(https?:\/\/[^\s[\]]+)/gi;

// Scanned globally rather than line-by-line: Nexus's API has been observed returning
// descriptions with NO real newlines between blocks at all (list items separated only by a
// single space), so detecting "[*]" only when it starts its own line misses them entirely.
const LIST_ITEM_GLOBAL = /\[\*\]([\s\S]*?)\[\/\*\]/gi;

/** Cleans one inline text run — decode entities, strip anything not handled by INLINE_TOKEN, and
 * collapse internal whitespace. Deliberately does NOT trim leading/trailing whitespace: this text
 * sits between sibling inline nodes (e.g. a link), and trimming here is what causes "Visit" +
 * link + "for" to render with the spaces around the link eaten. */
function cleanInline(raw: string): string {
  return decodeEntities(stripTags(raw)).replace(/[ \t]+/g, " ").replace(/\n+/g, " ");
}

function parseInline(text: string): BBCodeInline[] {
  const nodes: BBCodeInline[] = [];
  let lastIndex = 0;
  INLINE_TOKEN.lastIndex = 0;

  function pushText(raw: string) {
    const value = cleanInline(raw);
    if (value.length > 0) nodes.push({ type: "text", text: value });
  }

  let match: RegExpExecArray | null;
  while ((match = INLINE_TOKEN.exec(text))) {
    if (match.index > lastIndex) pushText(text.slice(lastIndex, match.index));

    const [, bold, italic, underline, urlHref, urlText, urlBareTarget, bareUrl] = match;
    if (bold !== undefined) nodes.push({ type: "bold", text: cleanInline(bold).trim() });
    else if (italic !== undefined) nodes.push({ type: "italic", text: cleanInline(italic).trim() });
    else if (underline !== undefined) nodes.push({ type: "underline", text: cleanInline(underline).trim() });
    else if (urlHref !== undefined) {
      nodes.push({ type: "link", href: decodeEntities(urlHref).trim(), text: cleanInline(urlText).trim() });
    } else if (urlBareTarget !== undefined) {
      const href = decodeEntities(urlBareTarget).trim();
      nodes.push({ type: "link", href, text: href });
    } else if (bareUrl !== undefined) {
      nodes.push({ type: "link", href: bareUrl, text: bareUrl });
    }

    lastIndex = INLINE_TOKEN.lastIndex;
  }
  if (lastIndex < text.length) pushText(text.slice(lastIndex));

  return nodes;
}

// Nexus descriptions use a SINGLE newline as a full line/paragraph break — there's no reliable
// "this is just word-wrap" signal to distinguish a soft-wrapped line from an intentional one, and
// treating every line as its own block (rather than requiring a blank line between blocks) is what
// actually separates "Description" / body / "Installation instructions" / body into distinct
// paragraphs instead of collapsing them onto one line.
function parseParagraphs(raw: string, blocks: BBCodeBlock[]): void {
  for (const line of raw.split(/\n+/)) {
    const text = line.trim();
    if (text.length > 0) blocks.push({ type: "paragraph", inline: parseInline(text) });
  }
}

/** Nexus mod descriptions are BBCode, not HTML — never assign to `innerHTML`. This is a small,
 * non-recursive parser covering what Nexus descriptions actually use: paragraphs, `[*]...[/*]`
 * list items (Nexus's editor emits these without a wrapping `[list]`, and sometimes without any
 * newlines around them at all), bold/italic/underline, and both `[url]`-tagged and bare links.
 * Anything else falls back to plain stripped text rather than leaking raw brackets. */
export function parseBBCode(source: string): BBCodeBlock[] {
  const normalized = source.replace(/\r\n?/g, "\n");
  const blocks: BBCodeBlock[] = [];
  let cursor = 0;
  let pendingListItems: string[] = [];

  function flushList() {
    if (pendingListItems.length > 0) {
      blocks.push({ type: "list", items: pendingListItems.map((item) => parseInline(item.trim())) });
    }
    pendingListItems = [];
  }

  LIST_ITEM_GLOBAL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LIST_ITEM_GLOBAL.exec(normalized))) {
    const between = normalized.slice(cursor, match.index);
    if (between.trim().length > 0) {
      flushList();
      parseParagraphs(between, blocks);
    }
    pendingListItems.push(match[1]);
    cursor = LIST_ITEM_GLOBAL.lastIndex;
  }
  flushList();

  const rest = normalized.slice(cursor);
  if (rest.trim().length > 0) parseParagraphs(rest, blocks);

  return blocks;
}
