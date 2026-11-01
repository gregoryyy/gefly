// Extracts requirement definitions and references from Markdown documents.
// A definition is a tag at the end of a statement, after a space: `… [R-PIV-1]`.
// Any other mention of an ID (in TODO items, DONE entries, prose) is a reference.
// Fenced code blocks and inline code spans are skipped, so format examples aren't counted.

import { type Extraction, type NewFact, type NodeInfo, textHash } from '../model/facts.ts';
import { plain, proseLines } from '../read/markdown.ts';

/** A Markdown document to extract from. */
export interface Doc {
  path: string;
  text: string;
}

const DEFINITION = / \[(R-[A-Z]+-\d+)\]/g;
const MENTION = /\bR-[A-Z]+-\d+\b/g;
const BY = 'assure/requirements@0.2';

/** The statement before a tag (and after an earlier tag on the line), without list markers, table pipes and inline Markdown. */
function statement(line: string, tagAt: number): string {
  const before = line.slice(0, tagAt).replace(/^.* \[R-[A-Z]+-\d+\]/, '');
  const cell = before.slice(before.lastIndexOf('|') + 1);
  return plain(cell.replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
}

/** Requirement nodes and facts for their definitions (`defined-in`) and references (`refs`). */
export function extractRequirements(docs: readonly Doc[], at: string): Extraction {
  const facts: NewFact[] = [];
  const nodes: NodeInfo[] = [];
  for (const doc of docs) {
    const raw = doc.text.split('\n');
    proseLines(doc.text).forEach((line, i) => {
      const source = `${doc.path}:${i + 1}`;
      const defined = new Set<string>();
      for (const m of line.matchAll(DEFINITION)) {
        defined.add(m[1]);
        const title = statement(raw[i], m.index);
        const retired = /^\s*\*retired\*/.test(line.slice(m.index + m[0].length));
        nodes.push({ kind: 'requirement', id: m[1], title, status: retired ? 'retired' : 'active', source, hash: textHash(title) });
        facts.push({
          at,
          by: BY,
          subject: { kind: 'requirement', id: m[1] },
          relation: 'defined-in',
          object: { kind: 'document', id: doc.path },
          certainty: 'declared',
          source,
        });
      }
      for (const m of line.matchAll(MENTION)) {
        if (defined.has(m[0])) continue;
        facts.push({
          at,
          by: BY,
          subject: { kind: 'document', id: doc.path },
          relation: 'refs',
          object: { kind: 'requirement', id: m[0] },
          certainty: 'declared',
          source,
        });
      }
    });
  }
  return { nodes, facts };
}
