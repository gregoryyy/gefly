// Extracts `Refs:` trailers from the Git history (assurance level 1, docs/assure/ASSR.md).
// A trailer lists what a commit serves: `Refs: TODO 0.2.6, 0.4.5, GAPS Q1-Q17, R-LENS-1`.
// A bare number after a TODO item continues the TODO list; Q ranges are expanded.
// A TODO item in the trailer is `implements`, anything else `refs`.

import type { Extraction, NodeRef } from '../model/facts.ts';

/** One commit as read from `git log`. */
export interface Commit {
  hash: string;
  time: string;
  subject: string;
  refs: string;
  /** A `Refs:` line appears in the message but Git didn't read it as a trailer (not in the last paragraph). */
  unparsed?: boolean;
}

const BY = 'assure/refs@0.2';

/** Parses a trailer value into node references, plus the tokens it couldn't place. */
export function parseRefList(value: string): { refs: NodeRef[]; unknown: string[] } {
  const refs: NodeRef[] = [];
  const unknown: string[] = [];
  let context: 'todo' | 'gaps' | 'sec' | null = null;
  for (const raw of value.split(',')) {
    let token = raw.trim();
    if (!token) continue;
    const prefix = /^(TODO|GAPS|SEC)\s+/.exec(token);
    if (prefix) {
      context = prefix[1].toLowerCase() as 'todo' | 'gaps' | 'sec';
      token = token.slice(prefix[0].length);
    }
    let m: RegExpExecArray | null;
    if ((m = /^R-[A-Z]+-\d+$/.exec(token))) {
      refs.push({ kind: 'requirement', id: m[0] });
    } else if ((m = /^Q(\d+)\s*[-–]\s*Q?(\d+)$/.exec(token))) {
      for (let n = Number(m[1]); n <= Number(m[2]); n++) refs.push({ kind: 'question', id: `Q${n}` });
    } else if ((m = /^Q\d+$/.exec(token))) {
      refs.push({ kind: 'question', id: m[0] });
    } else if ((m = /^A\d+$/.exec(token))) {
      refs.push({ kind: 'assumption', id: m[0] });
    } else if ((m = /^T\d+$/.exec(token))) {
      refs.push({ kind: 'threat', id: m[0] });
    } else if ((m = /^\d+(\.\d+)*$/.exec(token)) && context === 'todo') {
      refs.push({ kind: 'todo', id: m[0] });
    } else {
      unknown.push(raw.trim());
    }
  }
  return { refs, unknown };
}

/** Commit nodes and facts for each commit's trailer references. */
export function extractRefs(commits: readonly Commit[]): Extraction {
  return {
    nodes: commits.map((c) => ({ kind: 'commit', id: c.hash, title: c.subject, attrs: { time: c.time, ...(c.unparsed ? { unparsed: 'Refs' } : {}) } })),
    facts: commits.flatMap((c) =>
      parseRefList(c.refs).refs.map((object) => ({
        at: c.hash,
        by: BY,
        subject: { kind: 'commit', id: c.hash },
        relation: object.kind === 'todo' ? 'implements' : 'refs',
        object,
        certainty: 'declared',
        source: c.hash,
      })),
    ),
  };
}

/** Format for `git log` that {@link parseLog} reads: fields and records split by control characters. */
export const LOG_FORMAT = '%H%x1f%aI%x1f%s%x1f%(trailers:key=Refs,valueonly,separator=%x2C )%x1f%b%x1e';

/** Parses `git log --format=LOG_FORMAT` output. */
export function parseLog(output: string): Commit[] {
  return output
    .split('\u001e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, time, subject = '', refs = '', body = ''] = record.split('\u001f');
      const unparsed = !refs.trim() && /^Refs:/m.test(body);
      return { hash, time, subject, refs: refs.trim(), ...(unparsed ? { unparsed } : {}) };
    });
}
