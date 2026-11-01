import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildGraph, diffGraphs, impact, markdownReport, trace } from './graph.ts';
import { sha256, type Snapshot } from './snapshot.ts';

const emptyCatalog = JSON.stringify({ schemaVersion: 1, guards: [], evidence: [], criteria: [], fixtureGroups: [], aircraft: [] });
function fixture(extra: Record<string, string> = {}): Snapshot {
  const files: Record<string, string> = {
    'docs/SPEC.md': '# Spec\n| Deliver a thing. [R-DEMO-1] | future |\n',
    'docs/TODO.md': '## 1. Work\n- [x] 1.1 Deliver thing (R-DEMO-1).\n',
    'docs/GAPS.md': '## Open questions\n### Q1. Open detail\nAnswer: partial.\n',
    'docs/DONE.md': '## 2026-11-01 19:00 — Deliver thing\n\nTODO: 1.1 complete. Agent: fixture.\n\n**Implementation notes**\n\nImplement fixture.\n\n**Deviations**\n\nNone.\n',
    'docs/assure/catalog.json': emptyCatalog, ...extra,
  };
  return { revision: 'worktree', head: 'a'.repeat(40), paths: Object.keys(files).sort(), commits: [], changes: new Map(), readFile: (path) => files[path] };
}

test('AS1 deterministic graph owns definitions only in canonical SPEC', () => {
  const snapshot = fixture({ 'docs/input/old.md': 'Old copied tag. [R-DEMO-1]', 'docs/reviews/old.md': 'Old tag. [R-DEMO-999]', 'docs/design/NOTE.md': 'Reference to R-DEMO-1, not a new definition.' });
  const first = buildGraph(snapshot), second = buildGraph(snapshot);
  assert.deepEqual(first, second);
  assert.equal(first.nodes.filter((n) => n.kind === 'requirement').length, 1);
  assert.equal(first.summary.errors, 0);
  assert(first.problems.some((p) => p.check === 'planned-requirement' && p.severity === 'note'));
  assert(first.facts.every((f) => f.certainty !== 'confirmed'));
});

test('AS2 strict dangling, duplicate and completed-blocked status failures', () => {
  const graph = buildGraph(fixture({
    'docs/SPEC.md': 'First. [R-DEMO-1]\nDuplicate. [R-DEMO-1]\n',
    'docs/TODO.md': '## 1. Work\n- [x] 1.1 Blocked by Q1; R-DEMO-404.\n- [x] 1.2 No record.\n',
  }));
  for (const check of ['duplicate-definition', 'dangling-reference', 'completed-blocked', 'done-missing-record'])
    assert(graph.problems.some((p) => p.check === check), check);
});

test('AS2 explicit TODO slash/range references check every task without inferring decimal versions', () => {
  const graph = buildGraph(fixture({ 'docs/design/NOTE.md': 'TODO 1.1/1.99; TODO 1.1–1.3. Schema v9.4 and ratio 1.8 are not task references.\n' }));
  for (const id of ['todo:1.99', 'todo:1.2', 'todo:1.3']) assert(graph.problems.some((p) => p.check === 'dangling-reference' && p.id === id), id);
  assert(!graph.problems.some((p) => p.id === 'todo:9.4' || p.id === 'todo:1.8'));
});

test('AS1 code files and lexical test identities are opaque and never executed', () => {
  const graph = buildGraph(fixture({
    'utils/example.py': 'class Checks(unittest.TestCase):\n    def test_safe(self): pass\n',
    'src/example.mjs': "throw new Error('MUST NOT RUN');\ntest('R-DEMO-1 example', () => {});\n",
    'src/driver.cpp': 'TEST(Driver, Safe) {}\n',
    'data/value.json': '{"a/b":{"~x":3}}',
  }));
  for (const path of ['utils/example.py', 'src/example.mjs', 'src/driver.cpp']) assert(graph.nodes.some((n) => n.kind === 'object' && n.id === path));
  assert(graph.nodes.some((n) => n.kind === 'test' && n.id.endsWith('Checks.test_safe')));
  assert(graph.nodes.some((n) => n.id === 'data/value.json#/a~1b/~0x'));
  assert(graph.facts.some((f) => f.relation === 'verifies' && f.object.id === 'R-DEMO-1'));
});

test('AS1 merge commit changes remain connected and legacy invalid trailers are warnings', () => {
  const snapshot = fixture({ 'src/only-at-merge.cpp': 'int answer = 42;\n' });
  snapshot.commits = [{ hash: 'b'.repeat(40), subject: 'Merge with unique edit', time: '2026-11-01T00:00:00Z', refs: 'TODO 1.1, R-LEGACY-999, unknown-token' }];
  snapshot.changes = new Map([[snapshot.commits[0].hash, ['src/only-at-merge.cpp']]]);
  const graph = buildGraph(snapshot);
  assert(graph.facts.some((f) => f.relation === 'changes' && f.object.id === 'src/only-at-merge.cpp'));
  assert.equal(graph.summary.errors, 0);
  assert(graph.problems.some((p) => p.check === 'legacy-refs' && p.severity === 'warning'));
});

test('AS6 trace/diff/impact retain certainty, field identity and unknown-dependency limits', () => {
  const before = buildGraph(fixture({ 'data/value.json': '{"a":1}' }));
  const after = buildGraph(fixture({ 'data/value.json': '{"a":2}' }));
  assert(diffGraphs(before, after).changed.includes('object:data/value.json#/a'));
  assert(trace(after, 'R-DEMO-1').facts.every((f) => typeof f.certainty === 'string'));
  assert(impact(after, ['data/value.json']).nodes.some((n) => n.id === 'data/value.json#/a'));
  assert.deepEqual(impact(after, ['missing.json']).unknown, ['missing.json']);
});

test('AS5 ledger endpoint changes become stale and committed prefix cannot be rewritten', () => {
  const snapshot = fixture();
  const initial = buildGraph(snapshot);
  const link = initial.facts.find((f) => f.relation === 'records')!;
  const ledger = JSON.stringify({ action: 'confirm', link: { subject: `done:${link.subject.id}`, relation: 'records', object: 'todo:1.1' }, by: 'fixture reviewer', time: '2026-11-01', hashes: ['old', 'old'] }) + '\n';
  const amended = fixture({ 'docs/assure/ledger.jsonl': ledger });
  amended.committedLedger = ledger + '{"older":"must remain"}\n';
  const graph = buildGraph(amended);
  assert(graph.problems.some((p) => p.check === 'ledger-stale'));
  assert(graph.problems.some((p) => p.check === 'ledger-rewrite'));
  assert(graph.facts.some((f) => f.certainty === 'stale'));
});

test('AS2 deleting a committed ledger cannot evade append-only enforcement', () => {
  const snapshot = fixture();
  snapshot.committedLedger = JSON.stringify({ action: 'assert', link: { subject: 'object:current.py', relation: 'implements', object: 'requirement:R-DEMO-1' }, by: 'reviewer', time: '2026-11-01' }) + '\n';
  const graph = buildGraph(snapshot);
  assert(graph.problems.some((p) => p.check === 'ledger-rewrite' && p.severity === 'error'));
});

test('AS2 active ledger assertions require actual endpoints and valid relation schema', () => {
  const entry = { action: 'assert', link: { subject: 'object:missing.py', relation: 'implements', object: 'requirement:R-MISSING-1' }, by: 'reviewer', time: '2026-11-01' };
  const graph = buildGraph(fixture({ 'docs/assure/ledger.jsonl': JSON.stringify(entry) + '\n' }));
  for (const id of ['object:missing.py', 'requirement:R-MISSING-1'])
    assert(graph.problems.some((p) => p.check === 'dangling-reference' && p.id === id && p.severity === 'error'), id);
  const invalid = buildGraph(fixture({ 'docs/assure/ledger.jsonl': JSON.stringify({ ...entry, link: { ...entry.link, relation: 'records' } }) + '\n' }));
  assert(invalid.problems.some((p) => p.check === 'ledger-invalid' && p.severity === 'error'));
});

test('AS2 valid append-only ledger assertions remain declared relationships', () => {
  const first = JSON.stringify({ action: 'assert', link: { subject: 'object:current.py', relation: 'implements', object: 'requirement:R-DEMO-1' }, by: 'reviewer', time: '2026-11-01' }) + '\n';
  const next = JSON.stringify({ action: 'assert', link: { subject: 'object:current.py', relation: 'refs', object: 'todo:1.1' }, by: 'reviewer', time: '2026-11-02' }) + '\n';
  const snapshot = fixture({ 'current.py': 'value = 1\n', 'docs/assure/ledger.jsonl': first + next });
  snapshot.committedLedger = first;
  const graph = buildGraph(snapshot);
  assert.equal(graph.summary.errors, 0);
  assert(graph.facts.some((f) => f.relation === 'implements' && f.source === 'docs/assure/ledger.jsonl:1' && f.certainty === 'declared'));
});

function wholeFileClaim(outcome = 'pass', accepted = true): Snapshot {
  const files = { 'inputs.json': '{"x":{"nested":1},"other":2}', 'result.json': JSON.stringify({ ok: outcome === 'pass', skipped: false }), 'review.md': 'Independent manual fixture review.\n' };
  const pin = (path: keyof typeof files) => ({ path, sha256: sha256(files[path]) });
  const record = { id: 'run-whole-file', mode: 'recorded_run', revision: 'fixture-revision', procedure: 'Offline synthetic fixture; no physics validation.', scope: 'Report and impact regression.', limitations: ['Synthetic fixture only.'], outcome, requirements: ['R-DEMO-1'],
    inputs: ['model', 'build', 'fixture', 'criteria', 'evaluator', 'source', 'environment'].map((role) => ({ role, ...pin('inputs.json') })), unavailableRoles: [], notApplicableRoles: [], dependsOn: [],
    result: { ...pin('result.json'), assertions: [{ pointer: '/ok', equals: outcome === 'pass' }] } };
  const review = { ...record, id: 'review-whole-file', mode: 'manual_review', outcome: 'pass', result: { ...pin('review.md'), assertions: [] }, review: { author: 'fixture author', reviewer: 'independent reviewer', independent: true } };
  const catalog = { schemaVersion: 1, guards: [], aircraft: [], fixtureGroups: [], evidence: accepted ? [record, review] : [record], criteria: [{ id: 'whole-file-claim', requirement: 'R-DEMO-1', state: accepted ? 'accepted' : 'planned', scope: 'Synthetic acceptance only.', evidenceIds: accepted ? [record.id] : [], reviewIds: accepted ? [review.id] : [] }] };
  return fixture({ ...files, 'docs/assure/catalog.json': JSON.stringify(catalog) });
}

test('AS6 JSON field impact conservatively reaches whole-file run, review and accepted claim', () => {
  const graph = buildGraph(wholeFileClaim());
  assert.equal(graph.summary.errors, 0);
  assert.equal(graph.nodes.find((n) => n.id === 'assure:whole-file-claim')?.attrs?.eligible, 'true');
  for (const query of ['inputs.json#/x', 'inputs.json#/x/nested', 'object:inputs.json#/x']) {
    const result = impact(graph, [query]);
    assert.deepEqual(result.unknown, []);
    for (const id of ['inputs.json', 'inputs.json#', 'assure:run-whole-file', 'assure:review-whole-file', 'assure:whole-file-claim'])
      assert(result.nodes.some((n) => n.id === id), `${query} -> ${id}`);
    assert(result.nodes.some((n) => n.id === 'inputs.json#/x/nested'), 'descendant field remains included');
  }
});

test('AS6 Markdown exposes failed observations, planned scope and freshness without implementation claims', () => {
  const graph = buildGraph(wholeFileClaim('fail', false));
  assert.equal(graph.summary.errors, 0);
  const report = markdownReport(graph);
  assert.match(report, /## Evidence outcomes/);
  assert.match(report, /run-whole-file[^\n]*fail[^\n]*fresh/);
  assert.match(report, /whole-file-claim[^\n]*planned[^\n]*false/);
  assert.match(report, /R-DEMO-1[^\n]*planned\/uncovered/);
  assert(!graph.facts.some((f) => f.relation === 'implements' && f.subject.id === 'assure:whole-file-claim'));
});

test('AS8 runtime inventory rejects changed pinned vendor bytes and accepts the original bytes', () => {
  const path = 'utils/assure/upstream/src/model/facts.ts', original = '// Original pinned fixture bytes\n';
  const inventory = JSON.stringify({ commit: '99dc60050cd904f7b25cd929b5a6b1e1420f9fc6', files: [{ destination: path, sha256: sha256(original) }] });
  const changed = buildGraph(fixture({ 'utils/assure/UPSTREAM.json': inventory, [path]: '// Tampered vendor bytes\n' }));
  assert(changed.problems.some((p) => p.check === 'upstream-integrity' && p.severity === 'error'));
  const pinned = buildGraph(fixture({ 'utils/assure/UPSTREAM.json': inventory, [path]: original }));
  assert.equal(pinned.summary.errors, 0);
  const legacyPath = path.replace(/^utils\//, '');
  const legacyInventoryPath = 'assure/UPSTREAM.json';
  const legacyInventory = JSON.stringify({ commit: '99dc60050cd904f7b25cd929b5a6b1e1420f9fc6', files: [{ destination: legacyPath, sha256: sha256(original) }] });
  const legacy = fixture({ [legacyInventoryPath]: legacyInventory, [legacyPath]: original });
  legacy.revision = 'a'.repeat(40);
  assert.equal(buildGraph(legacy).summary.errors, 0, 'immutable pre-relocation snapshots remain readable');
  legacy.revision = 'worktree';
  assert(buildGraph(legacy).problems.some((p) => p.check === 'upstream-inventory' && p.severity === 'error'), 'worktree cannot fall back to an obsolete inventory');
  const currentFiles = { 'utils/assure/src/cli.ts': '// Current layout fixture\n', [path]: '// Tampered current vendor bytes\n' };
  const mixed = fixture({ [legacyInventoryPath]: legacyInventory, [legacyPath]: original, ...currentFiles });
  mixed.revision = 'a'.repeat(40);
  assert(buildGraph(mixed).problems.some((p) => p.check === 'upstream-inventory' && p.sources.includes('utils/assure/UPSTREAM.json') && p.severity === 'error'), 'committed mixed layout requires its current inventory');
  const currentOnly = fixture(currentFiles);
  currentOnly.revision = 'a'.repeat(40);
  assert(buildGraph(currentOnly).problems.some((p) => p.check === 'upstream-inventory' && p.severity === 'error'), 'committed current-only layout requires its inventory');
  const mixedPinned = fixture({ [legacyInventoryPath]: legacyInventory, [legacyPath]: original, ...currentFiles, 'utils/assure/UPSTREAM.json': inventory });
  mixedPinned.revision = 'a'.repeat(40);
  assert(buildGraph(mixedPinned).problems.some((p) => p.check === 'upstream-integrity' && p.id === path && p.severity === 'error'), 'current inventory checks current vendor bytes even with valid legacy copies');
});
