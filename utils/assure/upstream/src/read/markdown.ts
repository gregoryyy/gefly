// Markdown helpers shared by the document extractors.

/** Lines of a document with code removed: fenced blocks become empty, code spans are blanked. */
export function proseLines(text: string): string[] {
  let fenced = false;
  return text.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return '';
    }
    return fenced ? '' : line.replace(/`[^`]*`/g, (span) => ' '.repeat(span.length));
  });
}

/** Number of lines, not counting the empty one after a final newline. */
export function lineCount(text: string): number {
  const n = text.split('\n').length;
  return text.endsWith('\n') ? n - 1 : n;
}

/** Links reduced to their text: `[SEC](SEC.md) T13` → `SEC T13`. */
export function stripLinks(text: string): string {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

/** Inline Markdown removed for titles: links, code ticks, emphasis. */
export function plain(text: string): string {
  return stripLinks(text).replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
}

/** A heading's GitHub anchor before the suffix GitHub adds to repeats. */
export const anchor = (heading: string) =>
  plain(heading)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');

/** A slug function with GitHub's anchor rules, numbering repeated headings within one document. */
export function slugger(): (heading: string) => string {
  const seen = new Map<string, number>();
  return (heading) => {
    const base = anchor(heading);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
}
