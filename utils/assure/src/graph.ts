// Gefly graph assembly. Propeller supplies the pure typed facts/store/extractors;
// these adapters constrain definition ownership and preserve local document grammar.
import type { Fact, NewFact, NodeInfo, NodeRef } from '../upstream/src/model/facts.ts';
import { nodeKey, textHash, validate } from '../upstream/src/model/facts.ts';
import { MemoryStore } from '../upstream/src/model/store.ts';
import { applyLedger } from '../upstream/src/model/ledger.ts';
import { extractRequirements } from '../upstream/src/extract/requirements.ts';
import { extractRefs, parseRefList } from '../upstream/src/extract/refs.ts';
import { proseLines, stripLinks } from '../upstream/src/read/markdown.ts';
import { scanIds } from '../upstream/src/read/ids.ts';
import { extractStatus, todoIds, type Problem } from './status.ts';
import { sha256, type Snapshot } from './snapshot.ts';
import { inspectEvidence } from './evidence.ts';

export interface Graph {
  schemaVersion: 1;
  revision: string;
  head: string;
  inputHash: string;
  nodes: NodeInfo[];
  facts: Fact[];
  problems: Problem[];
  summary: Record<string, number>;
  limitations: string[];
}
const BY = 'gefly/graph@0.1';
const CODE = /\.(py|[cm]?js|ts|cpp|cc|cxx|h|hpp)$/;
// Retain the previous layout exclusion when reading immutable older snapshots.
const excluded = (path: string) => /^(docs\/(input|reviews)\/|(?:utils\/)?assure\/upstream\/|(?:utils\/)?assure\/out\/|node_modules\/)/.test(path);
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
};

export function buildGraph(snapshot: Snapshot): Graph {
  const nodes = new Map<string, NodeInfo>();
  const pending: NewFact[] = [];
  const problems: Problem[] = [];
  const reads = new Map<string, string>();
  const read = (path: string): string | undefined => {
    const text = snapshot.readFile(path);
    if (text !== undefined) reads.set(path, sha256(text));
    return text;
  };
  const problem = (check: string, id: string, message: string, sources: string[], severity: Problem['severity'] = 'error') =>
    problems.push({ check, severity, id, message, sources });
  const merge = (node: NodeInfo) => {
    const key = nodeKey(node);
    const old = nodes.get(key);
    nodes.set(key, { ...old, ...node, attrs: { ...old?.attrs, ...node.attrs } });
  };
  const add = (subject: NodeRef, relation: NewFact['relation'], object: NodeRef, source: string,
               certainty: NewFact['certainty'] = 'declared') =>
    pending.push({ at: snapshot.revision, by: BY, subject, relation, object, source, certainty });
  const doc = (path: string) => ({ path, text: read(path) ?? '' });
  for (const required of ['docs/SPEC.md', 'docs/TODO.md', 'docs/GAPS.md', 'docs/DONE.md'])
    if (read(required) === undefined) problem('missing-authority', required, 'Missing authoritative document', [required]);
  const declarations = extractRequirements([doc('docs/SPEC.md')], snapshot.revision);
  const status = extractStatus(doc('docs/TODO.md'), doc('docs/GAPS.md'), doc('docs/DONE.md'), snapshot.revision);
  problems.push(...status.problems);
  const definitions = new Map<string, string>();
  for (const node of [...declarations.nodes, ...status.nodes]) {
    const key = nodeKey(node);
    if (definitions.has(key)) problem('duplicate-definition', key, 'Duplicate canonical declaration', [definitions.get(key)!, node.source ?? key]);
    else definitions.set(key, node.source ?? key);
    merge(node);
  }
  pending.push(...declarations.facts, ...status.facts);
  for (const path of snapshot.paths.filter((p) => !excluded(p))) {
    if (!path.endsWith('.md') && !CODE.test(path) && !path.endsWith('.json')) continue;
    const text = read(path);
    if (text === undefined) { problem('missing-input', path, 'Selected tracked input is missing', [path]); continue; }
    const kind = path.endsWith('.md') ? 'document' : 'object';
    merge({ kind, id: path, source: `${path}:1`, hash: sha256(text), attrs: { scope: 'file', language: path.split('.').at(-1)! } });
    if (path.endsWith('.md')) {
      proseLines(text).forEach((line, index) => {
        const source = `${path}:${index + 1}`;
        for (const ref of scanIds(stripLinks(line), { bare: false })) {
          // SPEC owns declarations. Other mentions are references only, including tags.
          if (path === 'docs/SPEC.md' && ref.kind === 'requirement') continue;
          add({ kind: 'document', id: path }, 'refs', ref, source);
        }
        // Gefly uses slash lists and sibling ranges in addition to upstream's
        // comma-only prefixed grammar. Require the explicit TODO prefix so
        // unrelated versions and decimal quantities cannot become task IDs.
        for (const match of stripLinks(line).matchAll(/\bTODO(?:\s+|:\s*)(\d+(?:\.\d+)+(?:\s*(?:[,/–-]|and)\s*\d+(?:\.\d+)+)*)/g))
          for (const id of todoIds(match[1])) add({ kind: 'document', id: path }, 'refs', { kind: 'todo', id }, source);
      });
    } else if (CODE.test(path)) {
      let pythonClass = '';
      text.split('\n').forEach((line, index) => {
        const source = `${path}:${index + 1}`;
        const cls = path.endsWith('.py') ? /^class\s+(\w+)/.exec(line) : null;
        if (cls) pythonClass = cls[1];
        const py = path.endsWith('.py') ? /^\s*(?:async\s+)?def\s+(test_\w+)\s*\(/.exec(line) : null;
        const js = /\.(?:[cm]?js|ts)$/.test(path) ? /^\s*(?:await\s+)?(?:test|it)\s*\(\s*['"]([^'"]+)['"]/.exec(line) : null;
        const cpp = /\.(?:cpp|cc|cxx|h|hpp)$/.test(path) ? /^\s*TEST(?:_F)?\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/.exec(line) : null;
        const title = py ? `${pythonClass ? `${pythonClass}.` : ''}${py[1]}` : js?.[1] ?? (cpp ? `${cpp[1]}.${cpp[2]}` : undefined);
        if (title) {
          const test: NodeInfo = { kind: 'test', id: `${path}::${title}`, title, source, hash: textHash(line), attrs: { scope: 'lexical test-case identity; not execution', file: path } };
          merge(test); add(test, 'refs', { kind: 'object', id: path }, source, 'derived');
          for (const ref of scanIds(title, { bare: false })) if (['requirement', 'question', 'todo'].includes(ref.kind)) add(test, 'verifies', ref, source);
        }
        if ((path.endsWith('.py') ? /^\s*(?:#|"""|''')/ : /^\s*(?:\/\/|\/\*|\*)/).test(line))
          for (const ref of scanIds(line, { bare: false })) add({ kind: 'object', id: path }, 'refs', ref, source);
      });
    } else if (path.endsWith('.json')) {
      let value: unknown;
      try { value = JSON.parse(text); }
      catch { problem('invalid-json', path, 'Cannot parse JSON input', [path]); continue; }
      let fields = 0;
      const walk = (item: unknown, pointer: string, parent?: string, depth = 0) => {
        if (++fields > 12000 || depth > 48) throw new Error('JSON traversal limit');
        const id = `${path}#${pointer}`;
        merge({ kind: 'object', id, source: id, hash: sha256(canonical(item)), attrs: { scope: 'JSON pointer; value not validated by graph', file: path, pointer } });
        add({ kind: 'object', id }, 'part-of', { kind: 'object', id: parent ?? path }, id, 'derived');
        if (item && typeof item === 'object') for (const key of Object.keys(item).sort())
          walk((item as Record<string, unknown>)[key], `${pointer}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`, id, depth + 1);
      };
      try { walk(value, ''); }
      catch { problem('json-limit', path, 'JSON exceeds depth/field traversal limit', [path]); }
    }
  }
  // Invalid or enormous legacy trailers are warnings, never unbounded range loops.
  const commits = snapshot.commits.filter((commit) => {
    if (commit.refs.length > 65536 || [...commit.refs.matchAll(/Q(\d+)\s*[-–]\s*Q?(\d+)/g)].some((m) => Number(m[2]) - Number(m[1]) > 200)) {
      problem('legacy-refs-limit', commit.hash, 'Historical Refs trailer exceeds bounded grammar', [commit.hash], 'warning'); return false;
    }
    return true;
  });
  const history = extractRefs(commits);
  history.nodes.forEach(merge); pending.push(...history.facts);
  for (const commit of commits) {
    const parsed = parseRefList(commit.refs);
    if (commit.unparsed || parsed.unknown.length) problem('legacy-refs', commit.hash, 'Historical malformed or unparsed Refs trailer', [commit.hash], 'warning');
    for (const path of snapshot.changes.get(commit.hash) ?? []) {
      if (!nodes.has(nodeKey({ kind: 'object', id: path }))) merge({ kind: 'object', id: path, source: path, attrs: { scope: 'file history; content not parsed', historical: snapshot.paths.includes(path) ? 'false' : 'true' } });
      pending.push({ at: commit.hash, by: BY, subject: { kind: 'commit', id: commit.hash }, relation: 'changes', object: { kind: 'object', id: path }, source: commit.hash, certainty: 'derived' });
    }
  }
  // Historical/source records remain readable when explicitly pinned by evidence;
  // their contents are never promoted to canonical requirement declarations.
  const evidence = inspectEvidence(read, snapshot.paths);
  evidence.nodes.forEach(merge);
  pending.push(...evidence.facts.map((f) => ({ ...f, at: snapshot.revision })));
  problems.push(...evidence.problems);
  const currentLayout = snapshot.paths.some((path) => path.startsWith('utils/assure/'));
  const oldLayout = snapshot.revision !== 'worktree' && !currentLayout
    && snapshot.paths.includes('assure/UPSTREAM.json');
  const inventoryPath = oldLayout ? 'assure/UPSTREAM.json' : 'utils/assure/UPSTREAM.json';
  const inventoryPrefix = oldLayout ? 'assure/upstream/' : 'utils/assure/upstream/';
  const inventoryText = read(inventoryPath);
  if (inventoryText === undefined && snapshot.paths.some((path) => path.startsWith('utils/assure/')
      || (snapshot.revision === 'worktree' && path.startsWith('assure/'))))
    problem('upstream-inventory', 'upstream', 'Missing current-layout upstream inventory; legacy fallback requires an old-only committed snapshot', [inventoryPath]);
  if (inventoryText !== undefined) {
    try {
      const inventory = JSON.parse(inventoryText);
      if (inventory.commit !== '99dc60050cd904f7b25cd929b5a6b1e1420f9fc6' || !Array.isArray(inventory.files)) throw new Error('invalid upstream inventory');
      for (const entry of inventory.files) {
        if (typeof entry.destination !== 'string' || !entry.destination.startsWith(inventoryPrefix)) throw new Error('invalid vendor path');
        const source = read(entry.destination);
        if (source === undefined || sha256(source) !== entry.sha256) problem('upstream-integrity', entry.destination, 'Vendored bytes differ from pinned inventory', [inventoryPath, entry.destination]);
      }
    } catch (error) { problem('upstream-inventory', 'upstream', (error as Error).message, [inventoryPath]); }
  }
  if (nodes.size > 60000 || pending.length > 200000) throw new Error('graph exceeds node/fact limit');
  const store = new MemoryStore();
  for (const f of pending) {
    for (const endpoint of [f.subject, f.object]) if (!nodes.has(nodeKey(endpoint)))
      problem('dangling-reference', nodeKey(endpoint), 'Reference has no current declaration or object', [f.source], f.subject.kind === 'commit' ? 'warning' : 'error');
    try { store.assert(f); }
    catch (error) { problem('fact-schema', nodeKey(f.subject), (error as Error).message, [f.source]); }
  }
  const ledger = read('docs/assure/ledger.jsonl');
  if (ledger !== undefined || snapshot.committedLedger !== undefined) {
    try {
      const applied = applyLedger(store, nodes, ledger ?? '', snapshot.committedLedger);
      if (!applied.appendOnly || ledger === undefined) problem('ledger-rewrite', 'ledger', 'Ledger must retain its committed file and entries as an unchanged prefix', ['docs/assure/ledger.jsonl']);
      for (const item of applied.invalid) problem('ledger-invalid', 'ledger', item.error, [`docs/assure/ledger.jsonl:${item.line}`]);
      for (const item of applied.orphans) problem('ledger-orphan', item.link, 'Ledger endpoint/link is unavailable', [`docs/assure/ledger.jsonl:${item.line}`]);
      for (const item of applied.stale) problem('ledger-stale', item.link, 'Confirmation endpoints changed; link is stale', [`docs/assure/ledger.jsonl:${item.line}`], 'warning');
    } catch (error) { problem('ledger-invalid', 'ledger', (error as Error).message, ['docs/assure/ledger.jsonl']); }
  }
  const facts = store.query().sort((a, b) => a.id.localeCompare(b.id));
  // Ledger assertions are added after extraction and cannot bypass the current
  // endpoint or schema checks. A declared ledger link is not a node declaration.
  for (const f of facts.filter((item) => item.source.startsWith('docs/assure/ledger.jsonl:'))) {
    for (const endpoint of [f.subject, f.object]) if (!nodes.has(nodeKey(endpoint)))
      problem('dangling-reference', nodeKey(endpoint), 'Active ledger reference has no current declaration or object', [f.source]);
    for (const error of validate(f)) problem('ledger-invalid', nodeKey(f.subject), error, [f.source]);
  }
  for (const task of nodes.values()) if (task.kind === 'todo' && task.status === 'done' && task.attrs?.aggregate !== 'true') {
    // A completion record of an ancestor task (`1.14 complete`) covers its subtasks,
    // but only while that ancestor is itself ticked in TODO.
    const covering = task.id.split('.').map((_, i, parts) => parts.slice(0, i + 1).join('.'))
      .filter((id) => id.includes('.') && (id === task.id || nodes.get(nodeKey({ kind: 'todo', id }))?.status === 'done'));
    if (!facts.some((f) => f.relation === 'records' && f.object.kind === 'todo' && covering.includes(f.object.id)))
      problem('done-missing-record', task.id, 'Completed task has no applicable DONE record', [task.source ?? 'docs/TODO.md']);
    const open = [...nodes.values()].filter((child) => child.kind === 'todo' && child.id.startsWith(`${task.id}.`) && child.status !== 'done');
    if (open.length) problem('done-parent-open-children', task.id, `Completed task has unticked subtasks: ${open.map((child) => child.id).sort().join(', ')}`, [task.source ?? 'docs/TODO.md'], 'warning');
    for (const blocker of facts.filter((f) => f.relation === 'blocked-by' && f.subject.id === task.id && f.subject.kind === 'todo'))
      if (nodes.get(nodeKey(blocker.object))?.status !== 'resolved') problem('completed-blocked', task.id, `Completed task explicitly blocked by unresolved ${blocker.object.id}`, [blocker.source]);
  }
  const reqs = [...nodes.values()].filter((n) => n.kind === 'requirement');
  for (const requirement of reqs) if (!facts.some((f) => f.object.kind === 'requirement' && f.object.id === requirement.id && f.relation === 'implements'))
    problem('planned-requirement', requirement.id, 'No declared implementation link; planned/uncovered is advisory, not a pass', [requirement.source ?? 'docs/SPEC.md'], 'note');
  const uniqueProblems = [...new Map(problems.map((p) => [JSON.stringify(p), p])).values()].sort((a, b) =>
    `${a.severity}:${a.check}:${a.id}:${a.sources.join()}`.localeCompare(`${b.severity}:${b.check}:${b.id}:${b.sources.join()}`));
  return {
    schemaVersion: 1, revision: snapshot.revision, head: snapshot.head,
    inputHash: sha256(JSON.stringify([...reads].sort(([a], [b]) => a.localeCompare(b)))),
    nodes: [...nodes.values()].sort((a, b) => nodeKey(a).localeCompare(nodeKey(b))), facts,
    problems: uniqueProblems,
    summary: { ...evidence.summary, nodes: nodes.size, facts: facts.length, requirements: reqs.length,
      errors: uniqueProblems.filter((p) => p.severity === 'error').length,
      warnings: uniqueProblems.filter((p) => p.severity === 'warning').length,
      notes: uniqueProblems.filter((p) => p.severity === 'note').length },
    limitations: [
      'Only docs/SPEC.md defines requirements; historical input/reviews and vendored code are not scanned as current declarations.',
      'Code objects are file-level; test identities are lexical candidates, not AST analysis or executed results.',
      'Explicit links and hashes establish structure/freshness, not source truth, rights, physics fidelity, test adequacy or training approval.',
      'Unknown dependencies remain unknown; no inferred absence of impact or implicit acceptance.',
      'Ledger checks are append-only against HEAD for the worktree; Git history is read without rewriting it.',
    ],
  };
}

export function trace(graph: Graph, id: string) {
  const selected = new Set(graph.nodes.filter((node) => nodeKey(node) === id || node.id === id).map(nodeKey));
  if (!selected.size) throw new Error(`unknown graph identity: ${id}`);
  const facts = graph.facts.filter((f) => selected.has(nodeKey(f.subject)) || selected.has(nodeKey(f.object)));
  const keys = new Set([...selected, ...facts.flatMap((f) => [nodeKey(f.subject), nodeKey(f.object)])]);
  return { query: id, scope: 'direct declared/derived relations; no execution inferred', nodes: graph.nodes.filter((n) => keys.has(nodeKey(n))), facts };
}

export function impact(graph: Graph, paths: readonly string[]) {
  const matches = (node: NodeInfo, path: string) => node.id === path || nodeKey(node) === path
    || node.id.startsWith(`${path}${path.includes('#') ? '/' : '#'}`);
  const selected = new Set(graph.nodes.filter((n) => paths.some((path) => matches(n, path))).map(nodeKey));
  const start = new Set(selected);
  let changed = true;
  while (changed && selected.size < 5000) {
    changed = false;
    const identities = new Set(graph.nodes.filter((node) => selected.has(nodeKey(node))).map((node) => node.id));
    const files = new Set([...identities].filter((id) => id.includes('#')).map((id) => id.slice(0, id.indexOf('#'))));
    // A field change also changes the file pinned by whole-file dependencies.
    // Include both object/document identities and conservative same-file fields,
    // including ancestor/descendant selectors even without explicit part-of edges.
    for (const node of graph.nodes) if (!selected.has(nodeKey(node))
        && (identities.has(node.id) || files.has(node.id.split('#')[0]))) {
      selected.add(nodeKey(node)); changed = true;
    }
    for (const f of graph.facts) {
      const a = nodeKey(f.subject), b = nodeKey(f.object);
      const dependency = selected.has(b) && f.relation !== 'changes';
      const claim = selected.has(a) && f.relation === 'implements';
      if ((dependency || claim) && !selected.has(dependency ? a : b)) { selected.add(dependency ? a : b); changed = true; }
    }
  }
  return { paths, scope: 'conservative closure of declared dependencies and same-file JSON selectors; unknown edges are not an all-clear',
    truncated: selected.size >= 5000, unknown: paths.filter((path) => !graph.nodes.some((n) => matches(n, path))),
    nodes: graph.nodes.filter((n) => selected.has(nodeKey(n))),
    facts: graph.facts.filter((f) => selected.has(nodeKey(f.subject)) && selected.has(nodeKey(f.object))),
    initial: [...start].sort() };
}

export function diffGraphs(before: Graph, after: Graph) {
  const old = new Map(before.nodes.map((n) => [nodeKey(n), n]));
  const now = new Map(after.nodes.map((n) => [nodeKey(n), n]));
  const added = [...now.keys()].filter((key) => !old.has(key)).sort();
  const removed = [...old.keys()].filter((key) => !now.has(key)).sort();
  const changed = [...now.keys()].filter((key) => old.has(key) && canonical(old.get(key)) !== canonical(now.get(key))).sort();
  return { from: before.revision, to: after.revision, added, removed, changed,
    impact: impact(after, [...added, ...changed]), removedImpact: impact(before, removed) };
}

export function markdownReport(graph: Graph): string {
  const limit = 100;
  const cell = (value: unknown) => String(value ?? 'unknown').replace(/\s+/g, ' ').slice(0, 400)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[|`\[\]\\]/g, (char) => `\\${char}`);
  const lines = ['# Gefly assurance report', '', `Revision: ${graph.revision} (HEAD ${graph.head})`, `Input hash: ${graph.inputHash}`, '',
    `${graph.summary.nodes} nodes; ${graph.summary.facts} facts; ${graph.summary.errors} errors; ${graph.summary.warnings} warnings; ${graph.summary.notes} notes.`, '',
    'Facts retain link certainty; evidence outcomes and acceptance remain separate. This report establishes no physics or training validation.', '', '## Findings', ''];
  for (const p of graph.problems.slice(0, 200)) lines.push(`- ${p.severity} **${cell(p.check)}** ${cell(p.id)}: ${cell(p.message)} (${cell(p.sources.join(', '))})`);
  if (graph.problems.length > 200) lines.push(`- Findings truncated: showing 200 of ${graph.problems.length}; use report --json for all findings.`);
  const table = (title: string, headers: string[], rows: unknown[][]) => {
    lines.push('', `## ${title}`, '', `| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`);
    for (const row of rows.slice(0, limit)) lines.push(`| ${row.map(cell).join(' | ')} |`);
    if (!rows.length) lines.push(`| None recorded | ${headers.slice(1).map(() => '—').join(' | ')} |`);
    lines.push('', `Showing ${Math.min(limit, rows.length)} of ${rows.length} rows; cells limited to 400 characters. Full records are in report --json.`);
  };
  table('Implementation relationships', ['Requirement', 'Declared link subjects', 'Meaning / scope'],
    graph.nodes.filter((n) => n.kind === 'requirement').map((n) => {
      const claims = graph.facts.filter((f) => f.relation === 'implements' && f.object.kind === 'requirement' && f.object.id === n.id);
      return [n.id, claims.length ? claims.map((f) => `${nodeKey(f.subject)} (${f.certainty})`).join('; ') : 'none',
        claims.length ? 'declared relationship; catalog acceptance is not source-code or runtime proof' : 'planned/uncovered; no implementation inferred'];
    }));
  table('Criteria and acceptance', ['Criterion', 'Declared state', 'Current eligibility', 'Freshness', 'Scope'],
    graph.nodes.filter((n) => n.attrs?.domainKind === 'criterion').map((n) =>
      [n.id, n.attrs?.acceptance ?? n.status, n.attrs?.eligible, n.attrs?.freshness, n.attrs?.scope]));
  table('Evidence outcomes', ['Record', 'Mode', 'Recorded outcome', 'Freshness', 'Current eligibility', 'Revision / source'],
    graph.nodes.filter((n) => n.attrs?.domainKind === 'evidence').map((n) =>
      [n.id, n.attrs?.mode, n.attrs?.outcome ?? n.status, n.attrs?.freshness, n.attrs?.eligible, `${n.attrs?.revision ?? 'unknown'}; ${n.source ?? 'unknown'}`]));
  table('Evidence provenance and limits', ['Record', 'Declared scope', 'Declared limitations'],
    graph.nodes.filter((n) => n.attrs?.domainKind === 'evidence').map((n) => [n.id, n.attrs?.scope, n.attrs?.limitations]));
  table('Link certainty', ['Certainty', 'Active facts'],
    ['declared', 'derived', 'uncertain', 'confirmed', 'stale'].map((certainty) => [certainty, graph.facts.filter((f) => f.certainty === certainty).length]));
  lines.push('', '## Limits', '', ...graph.limitations.map((limit) => `- ${limit}`), '');
  return lines.join('\n');
}
