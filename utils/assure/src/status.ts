// Gefly's document grammars differ from Propeller's TODO-items/DONE conventions.
import { textHash, type Extraction, type NewFact, type NodeInfo, type NodeRef } from '../upstream/src/model/facts.ts';
import { plain } from '../upstream/src/read/markdown.ts';
import { extractPlan } from '../upstream/src/extract/plan.ts';
import type { Doc } from '../upstream/src/extract/requirements.ts';

export interface Problem { check: string; severity: 'error' | 'warning' | 'note'; id: string; message: string; sources: string[] }
export interface StatusExtraction extends Extraction { problems: Problem[] }
const BY = 'gefly/status@0.1';

// A task ID, optionally a range `1.1–1.3` (hyphen, en or em dash) or `1.1 to 1.3`.
const ID_PATTERN = /\b(\d+(?:\.\d+)+)(?:\s*[–—-]\s*(\d+(?:\.\d+)*)|\s+to\s+(\d+(?:\.\d+)+))?/g;

export function todoIds(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(ID_PATTERN)) {
    const last = match[2] ?? match[3];
    if (!last) { found.push(match[1]); continue; }
    const prefix = match[1].slice(0, match[1].lastIndexOf('.') + 1);
    const start = Number(match[1].slice(prefix.length));
    const end = Number(last.slice(last.lastIndexOf('.') + 1));
    if (end < start || end - start > 200) continue;
    for (let n = start; n <= end; n++) found.push(`${prefix}${n}`);
  }
  return [...new Set(found)];
}

// AS2: completion is decided per task ID, not per DONE `TODO:` line. The metadata
// is split into `;` clauses, then into segments at commas and `and`/`&`. A segment
// that holds only IDs takes the wording of the next worded segment in its clause
// (`1.1 and 1.2 complete, 1.3 open`); a clause of IDs only is the historical bare
// list form (`TODO: 0.1–0.6.`) and records completion. Worded segments record
// completion only with explicit completion wording (`complete`, `done`, `recorded`)
// and no progress, partial, open or exception wording (`in progress`, `partially`,
// `except`, `apart from`, `but`, `unverified`, `limitations`). Exception wording
// makes every ID of its segment incomplete (`1.1 complete apart from 1.1.3`); a
// segment that starts with it, or a later segment without task IDs that holds any
// not-complete wording, also qualifies the earlier IDs of its clause. `done-ish`
// is not completion wording. The
// mandated workflow markers `peer pending` and `pending merge` do not negate it.
const COMPLETED = /\b(?:complete|completed|done|finished|recorded)\b(?!-)/i;
const WORKFLOW_MARKERS = /\bpeer\W+pending\b|\bpending\W+merge\b/gi;
const NOT_COMPLETED = /\b(?:in[\s-]+progress|partial|partially|partly|pending|started|starting|ongoing|underway|incomplete|not|no|remain|remains|remaining|future|parent|open|deferred|blocked|preparation|portion|support|except|excepting|excluding|apart|but|without|other\s+than|unverified|unvalidated|untested|unreviewed|unchecked|limitation|limitations|caveat|caveats)\b/i;
const EXCEPTION_LEAD = /^(?:except|excepting|excluding|apart|but|without|other\s+than)\b/i;
const wording = (segment: string) => segment.replace(ID_PATTERN, ' ').replace(/[\s.,/()*_&:]+/g, ' ').trim();
const completes = (segment: string): boolean => {
  const text = segment.replace(WORKFLOW_MARKERS, ' ');
  return COMPLETED.test(text) && !NOT_COMPLETED.test(text);
};

/** Each task ID in DONE `TODO:` metadata, with whether it is a completion record. */
export function completionRecords(metadata: string): { id: string; complete: boolean }[] {
  const result: { id: string; complete: boolean }[] = [];
  for (const clause of metadata.split(';')) {
    const segments = clause.split(/,|\band\b|&/i);
    const bareClause = segments.every((segment) => !wording(segment));
    const clauseStart = result.length;
    for (let i = 0; i < segments.length; i++) {
      // `1.1 complete, except 1.1.3`: a segment led by exception wording also
      // qualifies every earlier ID of its clause.
      // `1.1 complete, verification pending`: not-complete wording in a later
      // segment without task IDs also qualifies the earlier IDs of its clause.
      const ids = todoIds(segments[i]);
      const qualifier = segments[i].replace(WORKFLOW_MARKERS, ' ');
      if (EXCEPTION_LEAD.test(wording(segments[i])) || (!ids.length && NOT_COMPLETED.test(qualifier)))
        for (const earlier of result.slice(clauseStart)) earlier.complete = false;
      if (!ids.length) continue;
      let complete = bareClause;
      if (!bareClause) {
        const worded = segments.slice(i).find((segment) => wording(segment));
        complete = worded !== undefined && completes(worded);
      }
      for (const id of ids) result.push({ id, complete });
    }
  }
  return result;
}

const fact = (at: string, subject: NodeRef, relation: NewFact['relation'], object: NodeRef, source: string): NewFact =>
  ({ at, by: BY, subject, relation, object, source, certainty: 'declared' });

export function extractStatus(todo: Doc, gaps: Doc, done: Doc, at: string): StatusExtraction {
  const plan = extractPlan(todo, at);
  const x: StatusExtraction = { nodes: [...plan.nodes], facts: [...plan.facts], problems: [] };
  const problem = (check: string, id: string, message: string, sources: string[], severity: Problem['severity'] = 'error') =>
    x.problems.push({ check, severity, id, message, sources });
  for (const node of plan.nodes) {
    if (!node.id.includes('.')) node.attrs = { aggregate: 'true' };
  }
  // The schema intentionally has no todo->todo derives-from relation: explicit
  // task mentions are represented on the containing document instead.
  for (const node of plan.nodes.filter((n) => n.attrs?.aggregate !== 'true')) {
    const source = node.source!;
    const raw = todo.text.split('\n')[Number(source.split(':').at(-1)) - 1] ?? '';
    for (const match of raw.matchAll(/\bTODO\s+([^);]+)(?:[);]|$)/g))
      for (const id of todoIds(match[1])) x.facts.push(fact(at, { kind: 'document', id: todo.path }, 'refs', { kind: 'todo', id }, source));
  }
  let section = '';
  const lines = gaps.text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^## /.test(lines[i])) section = lines[i].slice(3);
    const heading = /^###\s+(Q\d+)\.\s+(.*)$/.exec(lines[i]);
    if (heading) {
      let end = i + 1;
      while (end < lines.length && !/^##(?:#)? /.test(lines[end])) end++;
      const body = lines.slice(i + 1, end).join('\n');
      const resolved = /^Resolved(?:\s*\([^)]*\))?:\s*\S/m.test(body);
      const openSection = /^Open\b/i.test(section);
      const status = !openSection && /^Resolved\b/i.test(section) && resolved ? 'resolved' : 'open';
      const node: NodeInfo = { kind: 'question', id: heading[1], title: plain(heading[2]), status,
        source: `${gaps.path}:${i + 1}`, hash: textHash(body),
        attrs: { section, answer: /^Answer(?:\s*\([^)]*\))?:/m.test(body) ? 'recorded' : 'missing', partial: openSection && resolved ? 'true' : 'false' } };
      x.nodes.push(node);
      x.facts.push(fact(at, node, 'defined-in', { kind: 'document', id: gaps.path }, node.source!));
    }
    const assumption = /^\|\s*(A\d+)\s*\|\s*([^|]+)/.exec(lines[i]);
    if (assumption) {
      const node: NodeInfo = { kind: 'assumption', id: assumption[1], title: plain(assumption[2]), source: `${gaps.path}:${i + 1}`, hash: textHash(lines[i]) };
      x.nodes.push(node); x.facts.push(fact(at, node, 'defined-in', { kind: 'document', id: gaps.path }, node.source!));
    }
  }
  const raw = done.text.split('\n');
  const entries: { heading: string; stamp: string; title: string; line: number; body: string }[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (!/^## /.test(raw[i])) continue;
    const match = /^##\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s+—\s+(.+)$/.exec(raw[i]);
    if (!match) { problem('done-heading', 'DONE', 'Malformed DONE entry heading', [`${done.path}:${i + 1}`]); continue; }
    let end = i + 1;
    while (end < raw.length && !/^## /.test(raw[end])) end++;
    entries.push({ heading: raw[i], stamp: match[1], title: match[2], line: i + 1, body: raw.slice(i + 1, end).join('\n') });
  }
  const headings = new Map<string, string>();
  const bodies = new Map<string, string>();
  let previous = '';
  for (const entry of entries) {
    const source = `${done.path}:${entry.line}`;
    const id = `${entry.stamp} — ${plain(entry.title)}`;
    if (headings.has(entry.heading)) problem('done-duplicate-heading', id, 'Duplicate complete DONE heading', [headings.get(entry.heading)!, source]);
    headings.set(entry.heading, source);
    if (previous && entry.stamp > previous) problem('done-order', id, 'DONE entries must be newest first', [source]);
    previous = entry.stamp;
    const meta = entry.body.split(/\n\*\*Implementation notes/)[0];
    if (!/^TODO:\s*\S/m.test(meta) || !/\bAgent:\s*\S/.test(meta)
        || !/^\*\*Implementation notes\*\*/m.test(entry.body) || !/^\*\*Deviations\*\*/m.test(entry.body))
      problem('done-metadata', id, 'DONE needs TODO scope, Agent, Implementation notes and Deviations', [source]);
    const implementation = entry.body.split(/^\*\*Implementation notes\*\*\s*$/m)[1]?.split(/^\*\*(?:Deviations|Insights)\*\*/m)[0]?.trim() ?? '';
    const normalized = implementation.replace(/\s+/g, ' ').trim();
    if (normalized.length >= 100 && normalized.split(' ').length >= 20) {
      const hash = textHash(normalized);
      if (bodies.has(hash)) problem('done-duplicate-body', id, 'Implementation body duplicates another entry; check misassigned merge content', [bodies.get(hash)!, source]);
      else bodies.set(hash, source);
    }
    const node: NodeInfo = { kind: 'done', id, title: plain(entry.title), source, hash: textHash(entry.body), attrs: { time: entry.stamp, scope: 'recorded work; not acceptance' } };
    x.nodes.push(node); x.facts.push(fact(at, node, 'defined-in', { kind: 'document', id: done.path }, source));
    const metadata = /^TODO:\s*([\s\S]*?)(?=\n\s*\n|\bAgent:|\bPR:|\bBranch:|$)/m.exec(meta)?.[1] ?? '';
    for (const task of completionRecords(metadata))
      x.facts.push(fact(at, node, task.complete ? 'records' : 'refs', { kind: 'todo', id: task.id }, source));
  }
  return x;
}
