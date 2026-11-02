import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inspectEvidence } from './evidence.ts';
import { validate } from '../upstream/src/model/facts.ts';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const roles = ['model', 'build', 'fixture', 'criteria', 'evaluator', 'source', 'environment'];
const catalogPath = 'docs/assure/catalog.json';
const files = () => ({
  'docs/SPEC.md': '| Deliver a browser exercise. [R-SIM-1] | mandate | fixture |\n',
  'inputs.json': JSON.stringify({ model: 1, build: 1, fixture: 1, criteria: 1, evaluator: 1, source: 1, environment: 1 }),
  'result.json': '{"ok":true,"skipped":false}',
  'review.md': 'Independent manual review of the bounded fixture.\n',
} as Record<string, string>);
const catalog = () => ({ schemaVersion: 1, guards: [], evidence: [], criteria: [], fixtureGroups: [], aircraft: [] } as any);
const pin = (f: Record<string, string>, path: string, pointer?: string) => ({ path, sha256: sha(f[path]), ...(pointer === undefined ? {} : { pointer }) });
function evidence(f: Record<string, string>, id = 'run-a'): any {
  return {
    id, mode: 'recorded_run', revision: 'fixture-revision', procedure: 'Offline synthetic fixture; not a flight evaluation.',
    scope: 'Test catalog behavior only.', limitations: ['Synthetic unit fixture.'], outcome: 'pass', requirements: ['R-SIM-1'],
    inputs: roles.map(role => ({ role, ...pin(f, 'inputs.json', `/${role}`) })), unavailableRoles: [], notApplicableRoles: [],
    dependsOn: [], result: { ...pin(f, 'result.json'), assertions: [{ pointer: '/ok', equals: true }] },
  };
}
function review(f: Record<string, string>): any {
  return { ...evidence(f, 'review-a'), mode: 'manual_review', procedure: 'Manually inspect synthetic fixture.',
    result: { ...pin(f, 'review.md'), assertions: [] }, review: { author: 'fixture author', reviewer: 'independent fixture reviewer', independent: true } };
}
function criterion(state = 'planned'): any {
  return { id: 'browser-launch', requirement: 'R-SIM-1', state, scope: 'Synthetic browser launch criterion.',
    evidenceIds: state === 'accepted' ? ['run-a'] : [], reviewIds: state === 'accepted' ? ['review-a'] : [] };
}
function run(f: Record<string, string>, c: any) {
  const all: Record<string, string> = { ...f, [catalogPath]: JSON.stringify(c) };
  return inspectEvidence(path => all[path], Object.keys(all));
}
const errors = (result: ReturnType<typeof run>) => result.problems.filter(problem => problem.severity === 'error');
const checks = (result: ReturnType<typeof run>) => result.problems.map(problem => problem.check);
function acceptedFixture() {
  const f = files(), c = catalog();
  c.evidence = [evidence(f), review(f)]; c.criteria = [criterion('accepted')];
  return { f, c };
}

test('planned coverage is advisory and deterministic, not accepted', () => {
  const f = files(), c = catalog(); c.criteria = [criterion()];
  const a = run(f, c), b = run(Object.fromEntries(Object.entries(f).reverse()), c);
  assert.deepEqual(errors(a), []); assert.deepEqual(a, b);
  assert.equal(a.summary.planned, 1); assert.equal(a.summary.accepted, 0);
  assert.equal(a.nodes.find(node => node.id === 'assure:browser-launch')?.attrs?.eligible, 'false');
  assert.ok(a.facts.every(fact => fact.relation !== 'implements'));
  assert.ok(a.facts.some(fact => fact.subject.id === 'assure:browser-launch' && fact.relation === 'refs' && fact.object.id === 'R-SIM-1'));
  assert.ok(a.nodes.every(node => node.attrs?.acceptance !== 'accepted'));
  assert.ok(a.facts.every(fact => validate(fact).length === 0));
});

test('current complete passing run and separately declared independent review can support a synthetic claim', () => {
  const { f, c } = acceptedFixture(), result = run(f, c);
  assert.deepEqual(errors(result), []);
  assert.equal(result.nodes.find(node => node.id === 'assure:browser-launch')?.attrs?.eligible, 'true');
  assert.equal(result.nodes.find(node => node.id === 'assure:browser-launch')?.attrs?.relationshipScope, 'catalog-acceptance');
  assert.ok(result.facts.some(fact => fact.subject.id === 'assure:browser-launch' && fact.relation === 'implements' && fact.object.id === 'R-SIM-1'));
  assert.equal(result.summary.pass, 2);
});

test('failed, skipped, blocked and not evaluated evidence never supports acceptance', () => {
  for (const outcome of ['fail', 'skipped', 'blocked', 'not_evaluated']) {
    const { f, c } = acceptedFixture(); c.evidence[0].outcome = outcome;
    const result = run(f, c);
    assert.ok(checks(result).includes('criterion.acceptance'), outcome);
    assert.equal(result.nodes.find(node => node.id === 'assure:run-a')?.attrs?.outcome, outcome);
    assert.ok(result.facts.every(fact => fact.relation !== 'implements'));
  }
});

test('changed run input stales transitive evidence and acceptance although result bytes are unchanged', () => {
  const { f, c } = acceptedFixture();
  c.evidence.push({ ...evidence(f, 'dependent-run'), dependsOn: ['run-a'] });
  c.criteria[0].evidenceIds = ['dependent-run'];
  f['inputs.json'] = f['inputs.json'].replace('"model":1', '"model":2');
  const result = run(f, c);
  for (const id of ['run-a', 'dependent-run', 'browser-launch']) assert.equal(result.nodes.find(node => node.id === `assure:${id}`)?.attrs?.freshness, 'stale');
  assert.ok(checks(result).includes('criterion.acceptance'));
});

test('changed result hash remains stale independently of still-passing assertions', () => {
  const { f, c } = acceptedFixture(); f['result.json'] = '{"ok":true,"skipped":false,"extra":1}';
  const result = run(f, c);
  assert.ok(checks(result).includes('evidence.stale')); assert.ok(checks(result).includes('criterion.acceptance'));
});

test('declared pass is checked against result assertions and terminal skipped/failure flags', () => {
  for (const resultText of ['{"ok":false}', '{"ok":true,"skipped":true}', '{"ok":true,"status":"blocked"}']) {
    const { f, c } = acceptedFixture(); f['result.json'] = resultText;
    c.evidence[0].result.sha256 = sha(resultText);
    const result = run(f, c);
    assert.ok(checks(result).includes('evidence.outcome')); assert.ok(checks(result).includes('criterion.acceptance'));
  }
});

test('empty-assertion JSON manual/source artifacts cannot promote terminal failure or skip to acceptance', () => {
  for (const mode of ['manual_review', 'source_record']) {
    for (const terminal of [{ status: 'skipped' }, { outcome: 'failed' }, { skipped: true }, { status: 'blocked' }, { outcome: 'not_evaluated' }]) {
      const { f, c } = acceptedFixture();
      f['review.json'] = JSON.stringify(terminal);
      const record = c.evidence[mode === 'manual_review' ? 1 : 0];
      record.mode = mode; record.result = { ...pin(f, 'review.json'), assertions: [] };
      const result = run(f, c);
      assert.ok(checks(result).includes('evidence.outcome'), `${mode}: ${JSON.stringify(terminal)}`);
      assert.ok(checks(result).includes('criterion.acceptance'));
      assert.equal(result.nodes.find(node => node.id === `assure:${record.id}`)?.attrs?.eligible, 'false');
    }
  }
  const { f, c } = acceptedFixture(); f['review.json'] = '{';
  c.evidence[1].result = { ...pin(f, 'review.json'), assertions: [] };
  const malformed = run(f, c);
  assert.ok(checks(malformed).includes('evidence.assertion'));
  assert.ok(checks(malformed).includes('criterion.acceptance'));
});

test('plaintext manual review remains supported without JSON assertions', () => {
  const { f, c } = acceptedFixture();
  f['review.md'] = 'Manual review of skipped-case handling. The bounded review passed.\n';
  c.evidence[1].result = { ...pin(f, 'review.md'), assertions: [] };
  const result = run(f, c);
  assert.deepEqual(errors(result), []);
  assert.equal(result.nodes.find(node => node.id === 'assure:browser-launch')?.attrs?.eligible, 'true');
});

test('missing independent review, self-review or incomplete provenance cannot support acceptance', () => {
  for (const change of [
    (c: any) => { c.criteria[0].reviewIds = []; },
    (c: any) => { c.evidence[1].review.reviewer = c.evidence[1].review.author; },
    (c: any) => { c.evidence[1].review.independent = false; },
    (c: any) => { c.criteria[0].evidenceIds = ['review-a']; },
    (c: any) => { c.evidence[0].requirements = ['R-SIM-2']; },
    (c: any) => { c.evidence[0].inputs = c.evidence[0].inputs.filter((input: any) => input.role !== 'model'); c.evidence[0].unavailableRoles = [{ role: 'model', reason: 'Unrecorded historical model bytes.' }]; },
  ]) {
    const { f, c } = acceptedFixture(); change(c);
    assert.ok(checks(run(f, c)).includes('criterion.acceptance'));
  }
});

test('missing hashes, escaped paths, broken references and missing files fail closed', () => {
  for (const change of [
    (_f: any, c: any) => { delete c.evidence[0].inputs[0].sha256; },
    (_f: any, c: any) => { c.evidence[0].inputs[0].path = '../outside'; },
    (_f: any, c: any) => { c.evidence[0].dependsOn = ['absent-record']; },
    (_f: any, c: any) => { c.criteria[0].evidenceIds = ['absent-run']; },
    (f: any) => { delete f['inputs.json']; },
  ]) {
    const { f, c } = acceptedFixture(); change(f, c);
    assert.ok(errors(run(f, c)).length > 0);
  }
  const { f, c } = acceptedFixture(); c.criteria[0].requirement = 'R-MISSING-1';
  for (const record of c.evidence) record.requirements = ['R-MISSING-1'];
  const result = run(f, c);
  assert.ok(checks(result).includes('evidence.requirement'));
  assert.equal(result.nodes.find(node => node.id === 'assure:browser-launch')?.attrs?.eligible, 'false');
});

test('unsupported version, unknown fields, malformed and oversized catalogs are rejected', () => {
  const f = files(), c = catalog(); c.schemaVersion = 2;
  assert.ok(checks(run(f, c)).includes('evidence.schema'));
  c.schemaVersion = 1; c.silentTypo = true;
  assert.ok(checks(run(f, c)).includes('evidence.schema'));
  for (const content of ['{', ' '.repeat(2 * 1024 * 1024 + 1)]) {
    const all: Record<string, string> = { ...f, [catalogPath]: content };
    const result = inspectEvidence(path => all[path], Object.keys(all));
    assert.ok(errors(result).length > 0);
  }
});

test('duplicate record IDs are errors without emitting malformed core facts', () => {
  const f = files(), c = catalog(); c.evidence = [evidence(f), evidence(f)];
  const result = run(f, c);
  assert.ok(checks(result).includes('evidence.identity'));
  assert.ok(result.facts.every(fact => validate(fact).length === 0));
});

test('cyclic evidence dependencies are reported and cannot support acceptance', () => {
  const { f, c } = acceptedFixture();
  c.evidence[0].dependsOn = ['review-a']; c.evidence[1].dependsOn = ['run-a'];
  const result = run(f, c);
  assert.ok(checks(result).includes('evidence.cycle')); assert.ok(checks(result).includes('criterion.acceptance'));
});

test('JSON pointers decode slash/tilde escapes, reject malformed escapes and never use inherited properties', () => {
  const { f, c } = acceptedFixture(); f['result.json'] = '{"a/b":{"~key":true}}';
  c.evidence[0].result = { ...pin(f, 'result.json'), assertions: [{ pointer: '/a~1b/~0key', equals: true }] };
  assert.deepEqual(errors(run(f, c)), []);
  c.evidence[0].result.assertions[0].pointer = '/a~2b';
  assert.ok(checks(run(f, c)).includes('evidence.schema'));
  c.evidence[0].result.assertions[0].pointer = '/constructor';
  assert.ok(checks(run(f, c)).includes('evidence.assertion'));
});

test('literal guards are configured data, with immutable source hashes and stale-input propagation', () => {
  const { f, c } = acceptedFixture();
  f['docs/input/decision.md'] = 'User selected engine X.\n'; f['docs/ARCH.md'] = 'Selected engine X.';
  c.guards = [{ id: 'engine-decision', sources: [pin(f, 'docs/input/decision.md')], rules: [{ path: 'docs/ARCH.md', required: ['Selected engine X'], forbidden: ['engine not selected'] }] }];
  c.evidence[0].dependsOn = ['engine-decision'];
  assert.deepEqual(errors(run(f, c)), []);
  f['docs/ARCH.md'] = 'engine not selected';
  assert.ok(checks(run(f, c)).includes('decision.literal'));
  f['docs/ARCH.md'] = 'Selected engine X.'; f['docs/input/decision.md'] += 'Changed.\n';
  const result = run(f, c);
  assert.equal(result.nodes.find(node => node.id === 'assure:run-a')?.attrs?.freshness, 'stale');
  assert.ok(checks(result).includes('decision.source'));
  assert.ok(checks(result).includes('criterion.acceptance'));
});

function fixtureGroup(f: Record<string, string>): any {
  f['cases.json'] = '{"cal":1,"hold":2}';
  const calibration = [{ caseId: 'cal-a', ...pin(f, 'cases.json', '/cal') }];
  const holdout = [{ caseId: 'hold-b', ...pin(f, 'cases.json', '/hold') }];
  const freeze = (entry: any) => sha(JSON.stringify([{ caseId: entry.caseId, path: entry.path, pointer: entry.pointer, sha256: entry.sha256 }]));
  return { id: 'fdm-fixtures', state: 'accepted', model: pin(f, 'inputs.json', '/model'), calibration, holdout, spent: [], dependsOn: [],
    freeze: { calibrationSha256: freeze(calibration[0]), holdoutSha256: freeze(holdout[0]) } };
}

test('calibration/holdout identity is disjoint even when both reference the same source file', () => {
  const f = files(), c = catalog(); c.fixtureGroups = [fixtureGroup(f)];
  assert.deepEqual(errors(run(f, c)), []);
  c.fixtureGroups[0].holdout[0].caseId = 'cal-a';
  assert.ok(checks(run(f, c)).includes('fixture.overlap'));
});

test('spent holdouts, missing freeze hashes and changed frozen membership are refused', () => {
  for (const change of [
    (group: any) => { group.spent = ['hold-b']; },
    (group: any) => { delete group.freeze; },
    (group: any) => { group.holdout[0].caseId = 'replacement-case'; },
  ]) {
    const f = files(), c = catalog(); c.fixtureGroups = [fixtureGroup(f)]; change(c.fixtureGroups[0]);
    assert.ok(errors(run(f, c)).length > 0);
  }
});

test('changed frozen case input stales dependent result and acceptance', () => {
  const { f, c } = acceptedFixture(); c.fixtureGroups = [fixtureGroup(f)];
  c.evidence[0].dependsOn = ['fdm-fixtures'];
  assert.deepEqual(errors(run(f, c)), []);
  f['cases.json'] = '{"cal":10,"hold":2}';
  const result = run(f, c);
  assert.ok(checks(result).includes('fixture.acceptance'));
  assert.equal(result.nodes.find(node => node.id === 'assure:run-a')?.attrs?.freshness, 'stale');
  assert.ok(checks(result).includes('criterion.acceptance'));
});

test('accepted fixture groups reject stale or nonpassing upstream evidence after dependency resolution', () => {
  for (const upstream of ['stale', 'fail', 'skipped', 'blocked', 'not_evaluated']) {
    const f = files(), c = catalog();
    c.evidence = [evidence(f)]; c.fixtureGroups = [fixtureGroup(f)];
    c.fixtureGroups[0].dependsOn = ['run-a'];
    if (upstream === 'stale') c.evidence[0].inputs[0].sha256 = '0'.repeat(64);
    else c.evidence[0].outcome = upstream;
    const result = run(f, c);
    assert.ok(checks(result).includes('fixture.acceptance'), upstream);
    const group = result.nodes.find(node => node.id === 'assure:fdm-fixtures');
    assert.equal(group?.attrs?.eligible, 'false');
    assert.equal(group?.attrs?.freshness, upstream === 'stale' ? 'stale' : 'fresh');
  }
});

test('known aircraft values retain source/page/class/units/reference lineage without model XML', () => {
  const f = files(), c = catalog();
  const base = 'data/aircraft/c172s-classic/';
  for (const name of ['manifest.json', 'poh-values.json', 'performance-values.json']) f[base + name] = readFileSync(new URL('../../../' + base + name, import.meta.url), 'utf8');
  c.aircraft = [{ manifest: base + 'manifest.json', values: [base + 'poh-values.json', base + 'performance-values.json'] }];
  const result = run(f, c);
  assert.deepEqual(errors(result), []);
  const parameter = result.nodes.find(node => node.id === base + 'poh-values.json#/airspeed_calibration/normal_flaps_0/points/0/ias');
  assert.equal(parameter?.attrs?.original_unit, 'kt'); assert.equal(parameter?.attrs?.reference, 'IAS');
  assert.equal(parameter?.attrs?.dataClass, 'sourced'); assert.match(parameter?.attrs?.citations ?? '', /5-9/);
  const source = result.nodes.find(node => node.attrs?.sourceId === 'S17');
  assert.match(source?.attrs?.rights ?? '', /facts_only/);
  assert.ok(result.facts.some(fact => fact.subject.id === parameter?.id && fact.object.id === source?.id));
  assert.ok(result.summary.parameters > 100); assert.ok(result.facts.every(fact => validate(fact).length === 0));
  const poh = JSON.parse(f[base + 'poh-values.json']); poh.manifest.manifest_id = 'wrong-aircraft'; f[base + 'poh-values.json'] = JSON.stringify(poh);
  assert.ok(checks(run(f, c)).includes('aircraft.manifest'));
});

function realAircraft() {
  const f = files(), c = catalog();
  const base = 'data/aircraft/c172s-classic/';
  for (const name of ['manifest.json', 'poh-values.json', 'performance-values.json']) f[base + name] = readFileSync(new URL('../../../' + base + name, import.meta.url), 'utf8');
  c.aircraft = [{ manifest: base + 'manifest.json', values: [base + 'poh-values.json', base + 'performance-values.json'] }];
  return { f, c, base };
}
function withS17(applicability: string) {
  const { f, c, base } = realAircraft();
  const manifest = JSON.parse(f[base + 'manifest.json']);
  manifest.sources.find((source: any) => source.id === 'S17').applicability = applicability;
  f[base + 'manifest.json'] = JSON.stringify(manifest);
  const result = run(f, c);
  return { result, source: result.nodes.find(node => node.attrs?.sourceId === 'S17'), parameter: base + 'poh-values.json#/airspeed_calibration/normal_flaps_0/points/0/ias' };
}

test('AS3 a sourced datum from a 172P-only source does not count as 172S evidence', () => {
  const { f, c, base } = realAircraft();
  const s17 = run(f, c).nodes.find(node => node.attrs?.sourceId === 'S17');
  assert.equal(s17?.attrs?.appliesToAircraft, 'true');
  const engine = run(f, c).nodes.find(node => node.attrs?.sourceId === 'S8');
  assert.equal(engine?.attrs?.appliesToAircraft, 'unstated');
  const manifest = JSON.parse(f[base + 'manifest.json']);
  const index = manifest.sources.findIndex((source: any) => source.id === 'S17');
  manifest.sources[index].applicability = 'Generic Cessna 172P information manual.';
  f[base + 'manifest.json'] = JSON.stringify(manifest);
  const foreign = run(f, c);
  const parameter = base + 'poh-values.json#/airspeed_calibration/normal_flaps_0/points/0/ias';
  assert.ok(errors(foreign).some(problem => problem.check === 'aircraft.applicability' && problem.id === parameter), 'S17-only sourced value rejected');
  assert.equal(foreign.nodes.find(node => node.attrs?.sourceId === 'S17')?.attrs?.appliesToAircraft, 'false');
  // A second, 172S-applicable citation keeps the value but warns about the foreign one.
  const poh = JSON.parse(f[base + 'poh-values.json']);
  const point = poh.airspeed_calibration.normal_flaps_0;
  const s1b = manifest.sources.find((source: any) => source.id === 'S1b');
  point.citations = [...(point.citations ?? []), { source_id: 'S1b', revision: s1b.revision, page: '28' }];
  f[base + 'poh-values.json'] = JSON.stringify(poh);
  const mixed = run(f, c).problems.filter(problem => problem.check === 'aircraft.applicability' && problem.id === parameter);
  assert.deepEqual(mixed.map(problem => problem.severity), ['warning']);
});

test('AS3 designators normalize C-prefix, case, spacing and 172SP before applicability matching', () => {
  for (const [text, variants] of [['Cessna C172S information manual', '172S'], ['Skyhawk SP (172SP) manual', '172S'], ['172s handbook', '172S'],
    ['Model 172 S handbook', '172S'], ['C172P and FR172 manuals', '172P,FR172'], ['Reims FR172K and R172K', 'FR172K,R172K']] as const) {
    const { result, source } = withS17(text);
    assert.equal(source?.attrs?.applicableVariants, variants, text);
    assert.equal(errors(result).some(problem => problem.check === 'aircraft.applicability'), !variants.split(',').includes('172S'), text);
  }
  const { source } = withS17('The 172 aero-data note; IO-360 engine; 172S8001 and on.');
  assert.equal(source?.attrs?.applicableVariants, '', 'bare family name, engine model and serial numbers are not designators');
  assert.equal(withS17('generic c172s manual').source?.attrs?.applicableVariants, '172S', 'lower-case c prefix');
  for (const [text, variants] of [['Model 172 PA conversion; 172 A and the 172 I flew', ''], ['172nd edition, 172T', ''],
    ['Cessna 172N, Model 172 S/N 17270050 and on', '172N'], ['Cessna 172P; Model 172 S/N 17274010', '172P'], ['Model 172 S.', '']] as const) {
    const { result, source } = withS17(text);
    assert.equal(source?.attrs?.applicableVariants, variants, text);
    assert.equal(errors(result).some(problem => problem.check === 'aircraft.applicability'), variants !== '', text);
  }
});

test('AS3 known limitation: a negated designator ("not the 172S") is still read as naming 172S', () => {
  // Documented limitation (FORMAT.md), not correct behavior: textual matching cannot
  // read negation, so this 172P-only source is treated as also covering the 172S.
  const { result, source, parameter } = withS17('Generic Cessna 172P information manual; not the 172S.');
  assert.equal(source?.attrs?.applicableVariants, '172P,172S');
  assert.ok(!result.problems.some(problem => problem.check === 'aircraft.applicability' && problem.id === parameter));
});
