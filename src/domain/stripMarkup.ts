const ENTITY_REPLACEMENTS: readonly (readonly [RegExp, string])[] = [
  [/&nbsp;/g, " "],
  [/&amp;/g, "&"],
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&quot;/g, '"'],
  [/&#39;/g, "'"],
];

/** Strips HTML tags and BBCode tags (`[b]`, `[/list]`, ...) without decoding entities — the
 * building block `bbcode.ts` uses to clean up unrecognized/nested tags it doesn't render. */
export function stripTags(text: string): string {
  const withoutHtmlTags = text.replace(/<[^>]*>/g, "");
  const withoutBbcodeTags = withoutHtmlTags.replace(/\[\/?[a-z][a-z0-9]*(=[^\]]*)?\]/gi, "");
  return withoutBbcodeTags.replace(/\[\/?\*\]/g, "");
}

export function decodeEntities(text: string): string {
  return ENTITY_REPLACEMENTS.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text);
}

/** Nexus serves changelogs as remote, untrusted HTML — never assign that to `innerHTML` (a
 * classic XSS vector). This is a plain regex strip, not a parser: worst case on malformed markup
 * is a stray bracket in the rendered text, not code execution, since the result only ever goes
 * through React's auto-escaping text rendering. For mod descriptions (BBCode, not HTML) prefer
 * `bbcode.ts`'s `parseBBCode`, which renders links/formatting instead of discarding them. */
export function stripMarkup(text: string): string {
  return decodeEntities(stripTags(text));
}
