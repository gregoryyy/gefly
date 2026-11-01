/** Bounded, offline catalog inspection. A supplied reader owns filesystem containment. */
import { createHash } from 'node:crypto';
import type { NewFact, NodeInfo, NodeRef } from '../upstream/src/model/facts.ts';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type ObjectValue = Record<string, unknown>;
type Pin = { path: string; sha256: string; pointer?: string };
type Role = 'model' | 'build' | 'fixture' | 'criteria' | 'evaluator' | 'source' | 'environment';
type Input = Pin & { role: Role };
type RoleReason = { role: Role; reason: string };
type Assertion = { pointer: string; equals: Json };
type Guard = { id: string; sources: Pin[]; rules: { path: string; required: string[]; forbidden: string[] }[] };
type Evidence = {
  id: string; mode: 'recorded_run' | 'manual_review' | 'source_record'; revision: string;
  procedure: string; scope: string; limitations: string[]; outcome: string;
  requirements: string[]; inputs: Input[]; unavailableRoles: RoleReason[];
  notApplicableRoles: RoleReason[]; dependsOn: string[];
  result: Pin & { assertions: Assertion[] };
  review?: { author: string; reviewer: string; independent: boolean };
};
type Criterion = { id: string; requirement: string; state: 'planned' | 'accepted'; scope: string; evidenceIds: string[]; reviewIds: string[] };
type Case = Pin & { caseId: string };
type FixtureGroup = {
  id: string; state: 'planned' | 'accepted'; calibration: Case[]; holdout: Case[];
  spent: string[]; dependsOn: string[]; model?: Pin;
  freeze?: { calibrationSha256: string; holdoutSha256: string };
};
type Catalog = { schemaVersion: 1; guards: Guard[]; evidence: Evidence[]; criteria: Criterion[]; fixtureGroups: FixtureGroup[]; aircraft: { manifest: string; values: string[] }[] };
export type Problem = { check: string; severity: 'error' | 'warning' | 'note'; id: string; message: string; sources: string[] };
type State = { fresh: boolean; valid: boolean; eligible: boolean };
const CATALOG = 'docs/assure/catalog.json';
const ROLES: Role[] = ['model', 'build', 'fixture', 'criteria', 'evaluator', 'source', 'environment'];
const OUTCOMES = ['pass', 'fail', 'skipped', 'blocked', 'not_evaluated'];
const MAX_BYTES = 2 * 1024 * 1024;
const sha = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const own = (value: object, key: string) => Object.hasOwn(value, key);
const escapePointer = (key: string) => key.replace(/~/g, '~0').replace(/\//g, '~1');
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

function safePath(path: unknown): path is string {
  return typeof path === 'string' && path.length > 0 && path.length <= 512 &&
    !/[\\:#?\x00-\x1f\x7f]/.test(path) && !path.startsWith('/') &&
    path.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}

function pointerParts(pointer: string): string[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/') || /~(?:[^01]|$)/.test(pointer)) throw new Error('invalid RFC 6901 pointer');
  return pointer.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function select(value: unknown, pointer: string): unknown {
  for (const key of pointerParts(pointer)) {
    if (value === null || typeof value !== 'object' || !own(value, key)) throw new Error(`missing pointer ${pointer}`);
    if (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(key)) throw new Error(`invalid array pointer ${pointer}`);
    value = (value as ObjectValue)[key];
  }
  return value;
}

function canonical(value: unknown, depth = 0): string {
  if (depth > 64) throw new Error('JSON nesting exceeds 64');
  if (Array.isArray(value)) return '[' + value.map(item => canonical(item, depth + 1)).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(key =>
    JSON.stringify(key) + ':' + canonical((value as ObjectValue)[key], depth + 1)).join(',') + '}';
  return JSON.stringify(value);
}

function object(value: unknown, at: string, allowed: string[], required = allowed): ObjectValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${at}: expected object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${at}: unknown field ${key}`);
  for (const key of required) if (!own(value, key)) throw new Error(`${at}: missing ${key}`);
  return value as ObjectValue;
}
function text(value: unknown, at: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 16000) throw new Error(`${at}: expected nonempty bounded string`);
  return value;
}
function list<T>(value: unknown, at: string, parse: (item: unknown, at: string) => T): T[] {
  if (!Array.isArray(value) || value.length > 2000) throw new Error(`${at}: expected array of at most 2000 items`);
  return value.map((item, index) => parse(item, `${at}/${index}`));
}
function strings(value: unknown, at: string) { return list(value, at, text); }
function choice<T extends string>(value: unknown, choices: readonly T[], at: string): T {
  if (!choices.includes(value as T)) throw new Error(`${at}: expected ${choices.join('|')}`);
  return value as T;
}
function hash(value: unknown, at: string): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${at}: expected lowercase SHA-256`);
  return value;
}
function path(value: unknown, at: string): string {
  if (!safePath(value)) throw new Error(`${at}: expected confined repository-relative path`);
  return value;
}
function pin(value: unknown, at: string, extra: string[] = []): Pin {
  const item = object(value, at, ['path', 'sha256', 'pointer', ...extra], ['path', 'sha256', ...extra]);
  const result: Pin = { path: path(item.path, at + '/path'), sha256: hash(item.sha256, at + '/sha256') };
  if (own(item, 'pointer')) {
    if (typeof item.pointer !== 'string') throw new Error(`${at}/pointer: expected string`);
    pointerParts(item.pointer);
    result.pointer = item.pointer;
  }
  return result;
}
function id(value: unknown, at: string): string {
  const result = text(value, at);
  if (!/^[A-Za-z][A-Za-z0-9._:-]{0,127}$/.test(result)) throw new Error(`${at}: invalid stable ID`);
  return result;
}
function requirement(value: unknown, at: string): string {
  const result = text(value, at);
  if (!/^R-[A-Z]+-[0-9]+$/.test(result)) throw new Error(`${at}: invalid requirement ID`);
  return result;
}
function reasons(value: unknown, at: string): RoleReason[] {
  return list(value, at, (raw, here) => {
    const item = object(raw, here, ['role', 'reason']);
    return { role: choice(item.role, ROLES, here), reason: text(item.reason, here) };
  });
}

function parseCatalog(raw: unknown): Catalog {
  const root = object(raw, CATALOG, ['schemaVersion', 'guards', 'evidence', 'criteria', 'fixtureGroups', 'aircraft']);
  if (root.schemaVersion !== 1) throw new Error('unsupported catalog schemaVersion (expected 1)');
  const guards = list(root.guards, 'guards', (raw, at): Guard => {
    const item = object(raw, at, ['id', 'sources', 'rules']);
    const sources = list(item.sources, at + '/sources', pin);
    if (!sources.length || sources.some(source => !source.path.startsWith('docs/input/'))) throw new Error(`${at}: pin immutable docs/input sources`);
    const rules = list(item.rules, at + '/rules', (raw, here) => {
      const rule = object(raw, here, ['path', 'required', 'forbidden']);
      const required = strings(rule.required, here), forbidden = strings(rule.forbidden, here);
      if (!required.length && !forbidden.length) throw new Error(`${here}: empty literal guard`);
      return { path: path(rule.path, here), required, forbidden };
    });
    if (!rules.length) throw new Error(`${at}: missing literal rules`);
    return { id: id(item.id, at), sources, rules };
  });
  const evidence = list(root.evidence, 'evidence', (raw, at): Evidence => {
    const keys = ['id', 'mode', 'revision', 'procedure', 'scope', 'limitations', 'outcome', 'requirements', 'inputs', 'unavailableRoles', 'notApplicableRoles', 'dependsOn', 'result'];
    const item = object(raw, at, [...keys, 'review'], keys);
    const resultPin = pin(item.result, at + '/result', ['assertions']);
    const resultObject = item.result as ObjectValue;
    const assertions = list(resultObject.assertions, at + '/assertions', (raw, here): Assertion => {
      const assertion = object(raw, here, ['pointer', 'equals']);
      if (typeof assertion.pointer !== 'string') throw new Error(`${here}: expected pointer string`);
      pointerParts(assertion.pointer); canonical(assertion.equals);
      return { pointer: assertion.pointer, equals: assertion.equals as Json };
    });
    const entry: Evidence = {
      id: id(item.id, at), mode: choice(item.mode, ['recorded_run', 'manual_review', 'source_record'], at),
      revision: text(item.revision, at), procedure: text(item.procedure, at), scope: text(item.scope, at),
      limitations: strings(item.limitations, at), outcome: choice(item.outcome, OUTCOMES, at),
      requirements: list(item.requirements, at, requirement),
      inputs: list(item.inputs, at + '/inputs', (raw, here) => ({ ...pin(raw, here, ['role']), role: choice((raw as ObjectValue).role, ROLES, here) })),
      unavailableRoles: reasons(item.unavailableRoles, at), notApplicableRoles: reasons(item.notApplicableRoles, at),
      dependsOn: list(item.dependsOn, at, id), result: { ...resultPin, assertions },
    };
    if (own(item, 'review')) {
      const review = object(item.review, at + '/review', ['author', 'reviewer', 'independent']);
      if (typeof review.independent !== 'boolean') throw new Error(`${at}: independent must be boolean`);
      entry.review = { author: text(review.author, at), reviewer: text(review.reviewer, at), independent: review.independent };
    }
    if (entry.mode === 'manual_review' && !entry.review) throw new Error(`${at}: manual_review requires declared reviewer identity`);
    if (entry.mode !== 'manual_review' && entry.review) throw new Error(`${at}: only manual_review carries a review declaration`);
    if (entry.mode === 'recorded_run' && entry.notApplicableRoles.length) throw new Error(`${at}: run roles must be pinned or explicitly unavailable`);
    if (!entry.requirements.length) throw new Error(`${at}: evidence needs at least one requirement reference`);
    const covered = new Set([...entry.inputs, ...entry.unavailableRoles, ...entry.notApplicableRoles].map(input => input.role));
    if (ROLES.some(role => !covered.has(role))) throw new Error(`${at}: every run-input role needs a pin or a reason`);
    if (entry.unavailableRoles.some(reason => entry.inputs.some(input => input.role === reason.role)) ||
        entry.notApplicableRoles.some(reason => entry.inputs.some(input => input.role === reason.role) || entry.unavailableRoles.some(other => other.role === reason.role))) throw new Error(`${at}: contradictory role coverage`);
    if (entry.mode === 'recorded_run' && ['pass', 'fail'].includes(entry.outcome) && !assertions.length) throw new Error(`${at}: run pass/fail requires JSON result assertions`);
    return entry;
  });
  const criteria = list(root.criteria, 'criteria', (raw, at): Criterion => {
    const item = object(raw, at, ['id', 'requirement', 'state', 'scope', 'evidenceIds', 'reviewIds']);
    return { id: id(item.id, at), requirement: requirement(item.requirement, at), state: choice(item.state, ['planned', 'accepted'], at), scope: text(item.scope, at), evidenceIds: list(item.evidenceIds, at, id), reviewIds: list(item.reviewIds, at, id) };
  });
  const fixtureGroups = list(root.fixtureGroups, 'fixtureGroups', (raw, at): FixtureGroup => {
    const item = object(raw, at, ['id', 'state', 'calibration', 'holdout', 'spent', 'dependsOn', 'model', 'freeze'], ['id', 'state', 'calibration', 'holdout', 'spent', 'dependsOn']);
    const cases = (value: unknown, here: string) => list(value, here, (raw, location) => ({ ...pin(raw, location, ['caseId']), caseId: id((raw as ObjectValue).caseId, location) }));
    const group: FixtureGroup = { id: id(item.id, at), state: choice(item.state, ['planned', 'accepted'], at), calibration: cases(item.calibration, at), holdout: cases(item.holdout, at), spent: list(item.spent, at, id), dependsOn: list(item.dependsOn, at, id) };
    if (own(item, 'model')) group.model = pin(item.model, at + '/model');
    if (own(item, 'freeze')) {
      const freeze = object(item.freeze, at, ['calibrationSha256', 'holdoutSha256']);
      group.freeze = { calibrationSha256: hash(freeze.calibrationSha256, at), holdoutSha256: hash(freeze.holdoutSha256, at) };
    }
    if (group.state === 'accepted' && (!group.model || !group.freeze || !group.calibration.length || !group.holdout.length)) throw new Error(`${at}: accepted sets need a model pin, both sets and freeze hashes`);
    return group;
  });
  const aircraft = list(root.aircraft, 'aircraft', (raw, at) => {
    const item = object(raw, at, ['manifest', 'values']);
    return { manifest: path(item.manifest, at), values: list(item.values, at, path) };
  });
  return { schemaVersion: 1, guards, evidence, criteria, fixtureGroups, aircraft };
}

export function inspectEvidence(readFile: (path: string) => string | undefined, paths: readonly string[]) {
  const nodes = new Map<string, NodeInfo>(), facts: NewFact[] = [], problems: Problem[] = [];
  const summary: Record<string, number> = { guards: 0, evidence: 0, criteria: 0, planned: 0, accepted: 0, freshEvidence: 0, staleEvidence: 0, parameters: 0, sources: 0 };
  const cache = new Map<string, string | undefined>(), available = new Set(paths.filter(safePath));
  function problem(check: string, severity: Problem['severity'], id: string, message: string, sources = [CATALOG]) { problems.push({ check, severity, id, message, sources }); }
  function add(node: NodeInfo) {
    const key = `${node.kind}:${node.id}`, previous = nodes.get(key);
    nodes.set(key, { ...previous, ...node, attrs: { ...previous?.attrs, ...node.attrs } });
  }
  function read(file: string): string | undefined {
    if (!safePath(file) || !available.has(file)) { problem('evidence.path', 'error', file, 'Missing or unsafe declared file', [file]); return undefined; }
    if (!cache.has(file)) {
      let value: string | undefined;
      try { value = readFile(file); } catch { value = undefined; }
      if (value === undefined || Buffer.byteLength(value, 'utf8') > MAX_BYTES) {
        problem('evidence.file', 'error', file, 'File unavailable or exceeds 2 MiB', [file]); value = undefined;
      }
      cache.set(file, value);
      if (value !== undefined) add({ kind: 'document', id: file, hash: sha(value), source: file });
    }
    return cache.get(file);
  }
  function edge(subject: NodeRef, object: NodeRef, source: string, relation: NewFact['relation'] = 'refs') {
    facts.push({ at: 'worktree', by: 'gefly-evidence/1', subject, relation, object, certainty: 'declared', source });
  }
  function checkPin(input: Pin, owner: NodeRef, source: string): State {
    const content = read(input.path);
    edge(owner, { kind: 'document', id: input.path }, source);
    if (content === undefined) return { fresh: false, valid: false, eligible: false };
    const fresh = sha(content) === input.sha256;
    if (!fresh) problem('evidence.stale', 'warning', owner.id, `Pinned content changed: ${input.path}`, [source, input.path]);
    let valid = true;
    if (input.pointer !== undefined) {
      try {
        const value = select(JSON.parse(content), input.pointer);
        const field = { kind: 'object' as const, id: `${input.path}#${input.pointer}` };
        add({ ...field, source: field.id, hash: sha(canonical(value)), attrs: { domainKind: 'json-field', pointer: input.pointer } });
        edge(owner, field, source);
      } catch { valid = false; problem('evidence.pointer', 'error', owner.id, `Invalid or missing JSON selector ${input.pointer}`, [source, input.path]); }
    }
    return { fresh: fresh && valid, valid, eligible: fresh && valid };
  }
  const content = read(CATALOG);
  if (content === undefined) return finish();
  let catalog: Catalog;
  try { catalog = parseCatalog(JSON.parse(content)); }
  catch (error) { problem('evidence.schema', 'error', CATALOG, error instanceof Error ? error.message : 'Malformed catalog'); return finish(); }
  const records = [...catalog.guards, ...catalog.evidence, ...catalog.criteria, ...catalog.fixtureGroups];
  if (records.length > 2000) { problem('evidence.schema', 'error', CATALOG, 'Too many catalog records'); return finish(); }
  const refs = new Map<string, NodeRef>(), states = new Map<string, State>(), dependencies = new Map<string, string[]>();
  const reqText = read('docs/SPEC.md') ?? '';
  const requirements = new Set([...reqText.matchAll(/ \[(R-[A-Z]+-[0-9]+)\]/g)].map(match => match[1]));
  function referenceRequirement(owner: NodeRef, requirementId: string, source: string, relation: NewFact['relation']) {
    if (!requirements.has(requirementId)) problem('evidence.requirement', 'error', owner.id, `Undefined canonical requirement ${requirementId}`, [source, 'docs/SPEC.md']);
    edge(owner, { kind: 'requirement', id: requirementId }, source, relation);
  }
  let duplicate = false;
  for (const record of records) {
    if (refs.has(record.id)) { duplicate = true; problem('evidence.identity', 'error', record.id, 'Duplicate catalog ID'); continue; }
    const ref: NodeRef = { kind: catalog.evidence.includes(record as Evidence) ? 'test' : 'object', id: `assure:${record.id}` };
    refs.set(record.id, ref); add({ ...ref, source: CATALOG, attrs: { catalogId: record.id, schemaVersion: '1' } });
    edge(ref, { kind: 'document', id: CATALOG }, CATALOG);
  }
  if (duplicate) return finish();
  function combine(items: State[]): State { return { fresh: items.every(item => item.fresh), valid: items.every(item => item.valid), eligible: items.every(item => item.eligible) }; }
  for (const [index, guard] of catalog.guards.entries()) {
    const ref = refs.get(guard.id)!, source = `${CATALOG}#/guards/${index}`;
    let state = combine(guard.sources.map(input => checkPin(input, ref, source)));
    if (!state.fresh || !state.valid) problem('decision.source', 'error', guard.id, 'Immutable decision source is missing, changed or invalid', [source, ...guard.sources.map(input => input.path)]);
    for (const rule of guard.rules) {
      const target = read(rule.path); edge(ref, { kind: 'document', id: rule.path }, source);
      for (const literal of rule.required) if (target !== undefined && !target.includes(literal)) {
        state.valid = false; problem('decision.literal', 'error', guard.id, `Required literal absent: ${JSON.stringify(literal)}`, [source, rule.path]);
      }
      for (const literal of rule.forbidden) if (target !== undefined && target.includes(literal)) {
        state.valid = false; problem('decision.literal', 'error', guard.id, `Forbidden stale literal present: ${JSON.stringify(literal)}`, [source, rule.path]);
      }
      if (target === undefined) state = { fresh: false, valid: false, eligible: false };
    }
    state.eligible = state.valid && state.fresh;
    states.set(guard.id, state); dependencies.set(guard.id, []);
    add({ ...ref, attrs: { domainKind: 'decision-guard', freshness: state.fresh ? 'fresh' : 'stale' } });
    summary.guards++;
  }
  for (const [index, record] of catalog.evidence.entries()) {
    const ref = refs.get(record.id)!, source = `${CATALOG}#/evidence/${index}`;
    const state = combine([...record.inputs, record.result].map(input => checkPin(input, ref, source)));
    if (record.unavailableRoles.length) problem('evidence.incomplete', 'warning', record.id, `Unavailable run inputs: ${record.unavailableRoles.map(item => item.role).join(', ')}`, [source]);
    let result: unknown, resultIsJson = false;
    try { result = JSON.parse(read(record.result.path) ?? ''); resultIsJson = true; }
    catch {
      if (record.result.assertions.length || /\.json$/i.test(record.result.path)) {
        state.valid = false; problem('evidence.assertion', 'error', record.id, 'Cannot parse required JSON result artifact', [source, record.result.path]);
      }
    }
    if (record.result.assertions.length && resultIsJson) {
      try {
        const passed = record.result.assertions.every(assertion => canonical(select(result, assertion.pointer)) === canonical(assertion.equals));
        if (record.outcome === 'pass' && !passed) { state.valid = false; problem('evidence.outcome', 'error', record.id, 'Declared pass contradicts JSON result assertions', [source, record.result.path]); }
      } catch { state.valid = false; problem('evidence.assertion', 'error', record.id, 'Cannot resolve JSON result assertions', [source, record.result.path]); }
    }
    if (record.outcome === 'pass' && resultIsJson && result && typeof result === 'object') {
      const terminal = result as ObjectValue, nonPassing = ['fail', 'failed', 'skipped', 'blocked', 'not_evaluated'];
      if (terminal.skipped === true ||
          (typeof terminal.outcome === 'string' && nonPassing.includes(terminal.outcome)) ||
          (typeof terminal.status === 'string' && nonPassing.includes(terminal.status))) {
        state.valid = false; problem('evidence.outcome', 'error', record.id, 'Result terminal outcome cannot be promoted to pass', [source, record.result.path]);
      }
    }
    state.eligible = state.fresh && state.valid && record.outcome === 'pass' && !record.unavailableRoles.length;
    if (record.requirements.some(id => !requirements.has(id))) state.valid = state.eligible = false;
    states.set(record.id, state); dependencies.set(record.id, record.dependsOn);
    for (const requirementId of record.requirements) referenceRequirement(ref, requirementId, source, 'verifies');
    add({ ...ref, status: record.outcome, attrs: { domainKind: 'evidence', outcome: record.outcome, mode: record.mode, revision: record.revision, scope: record.scope, limitations: JSON.stringify(record.limitations), inputs: JSON.stringify(record.inputs), unavailableRoles: JSON.stringify(record.unavailableRoles), procedure: record.procedure } });
    summary.evidence++; summary[record.outcome] = (summary[record.outcome] ?? 0) + 1;
  }
  for (const [index, group] of catalog.fixtureGroups.entries()) {
    const ref = refs.get(group.id)!, source = `${CATALOG}#/fixtureGroups/${index}`;
    const state = combine([...group.calibration, ...group.holdout, ...(group.model ? [group.model] : [])].map(input => checkPin(input, ref, source)));
    const calibration = group.calibration.map(item => item.caseId), holdout = group.holdout.map(item => item.caseId);
    if (new Set(calibration).size !== calibration.length || new Set(holdout).size !== holdout.length || holdout.some(caseId => calibration.includes(caseId) || group.spent.includes(caseId))) {
      state.valid = false; problem('fixture.overlap', 'error', group.id, 'Duplicate, calibration/holdout-overlapping or spent holdout case identity', [source]);
    }
    if (group.freeze) for (const set of ['calibration', 'holdout'] as const) {
      const frozen = group[set].slice().sort((a, b) => compare(a.caseId, b.caseId));
      if (sha(canonical(frozen)) !== group.freeze[`${set}Sha256`]) { state.valid = false; problem('fixture.freeze', 'error', group.id, `${set} case membership/pins differ from frozen hash`, [source]); }
    }
    state.eligible = state.fresh && state.valid && group.state === 'accepted';
    states.set(group.id, state); dependencies.set(group.id, group.dependsOn);
    add({ ...ref, status: group.state, attrs: { domainKind: 'fixture-group', calibration: JSON.stringify(calibration), holdout: JSON.stringify(holdout), spent: JSON.stringify(group.spent) } });
  }
  for (const [index, criterion] of catalog.criteria.entries()) {
    const ref = refs.get(criterion.id)!, source = `${CATALOG}#/criteria/${index}`;
    dependencies.set(criterion.id, [...criterion.evidenceIds, ...criterion.reviewIds]);
    const evidence = criterion.evidenceIds.map(id => catalog.evidence.find(item => item.id === id));
    const reviews = criterion.reviewIds.map(id => catalog.evidence.find(item => item.id === id));
    const validAcceptance = requirements.has(criterion.requirement) && evidence.length > 0 && evidence.every(item => item?.requirements.includes(criterion.requirement)) && reviews.length > 0 &&
      criterion.reviewIds.every(id => !criterion.evidenceIds.includes(id)) &&
      reviews.every(review => review?.requirements.includes(criterion.requirement) && review.mode === 'manual_review' && review.review?.independent && review.review.author !== review.review.reviewer);
    states.set(criterion.id, { fresh: true, valid: criterion.state === 'planned' || validAcceptance, eligible: criterion.state === 'accepted' && validAcceptance });
    referenceRequirement(ref, criterion.requirement, source, 'refs');
    add({ ...ref, status: criterion.state, attrs: { domainKind: 'criterion', acceptance: criterion.state, scope: criterion.scope, relationshipScope: criterion.state === 'accepted' ? 'catalog-acceptance' : 'planned-scope' } });
    summary.criteria++; summary[criterion.state]++;
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  function resolve(key: string, depth = 0): State {
    const state = states.get(key)!;
    if (visited.has(key)) return state;
    if (visiting.has(key) || depth > 128) {
      problem('evidence.cycle', 'error', key, 'Cyclic or excessively deep dependency graph');
      state.fresh = state.valid = state.eligible = false; return state;
    }
    visiting.add(key);
    for (const dependency of dependencies.get(key) ?? []) {
      const target = refs.get(dependency);
      if (!target || !states.has(dependency)) {
        problem('evidence.reference', 'error', key, `Unknown dependency ${dependency}`);
        state.fresh = state.valid = state.eligible = false; continue;
      }
      edge(refs.get(key)!, target, CATALOG);
      const upstream = resolve(dependency, depth + 1);
      state.fresh &&= upstream.fresh; state.valid &&= upstream.valid; state.eligible &&= upstream.eligible;
    }
    visiting.delete(key); visited.add(key); return state;
  }
  for (const key of [...states.keys()].sort()) resolve(key);
  for (const [index, group] of catalog.fixtureGroups.entries()) {
    if (group.state === 'accepted' && !states.get(group.id)!.eligible) {
      problem('fixture.acceptance', 'error', group.id, 'Accepted fixture set or transitive dependency is stale, invalid or ineligible', [`${CATALOG}#/fixtureGroups/${index}`]);
    }
  }
  for (const [index, criterion] of catalog.criteria.entries()) {
    const state = states.get(criterion.id)!, ref = refs.get(criterion.id)!;
    if (criterion.state === 'accepted') {
      const evidence = criterion.evidenceIds.map(id => catalog.evidence.find(item => item.id === id));
      const reviews = criterion.reviewIds.map(id => catalog.evidence.find(item => item.id === id));
      const independent = reviews.length > 0 && reviews.every(review => review?.mode === 'manual_review' && review.review?.independent && review.review.author !== review.review.reviewer);
      if (!state.eligible || !evidence.length || evidence.some(item => !item) || !independent) {
        state.valid = state.eligible = false;
        problem('criterion.acceptance', 'error', criterion.id, 'Accepted claim needs current complete passing evidence and declared independent passing review');
      }
      if (state.eligible) edge(ref, { kind: 'requirement', id: criterion.requirement }, `${CATALOG}#/criteria/${index}`, 'implements');
    } else problem('criterion.planned', 'note', criterion.id, 'Planned criterion; no acceptance inferred');
    add({ ...ref, attrs: { freshness: state.fresh ? 'fresh' : 'stale', eligible: String(state.eligible) } });
  }
  for (const [id, state] of states) {
    const ref = refs.get(id)!;
    add({ ...ref, attrs: { freshness: state.fresh ? 'fresh' : 'stale', eligible: String(state.eligible) } });
    if (catalog.evidence.some(item => item.id === id)) summary[state.fresh ? 'freshEvidence' : 'staleEvidence']++;
  }
  const recordKeys = new Map([...refs].map(([id, ref]) => [`${ref.kind}:${ref.id}`, id]));
  for (const fact of facts) {
    const key = recordKeys.get(`${fact.subject.kind}:${fact.subject.id}`);
    if (key && !states.get(key)?.fresh) fact.certainty = 'stale';
  }
  for (const entry of catalog.aircraft) {
    try { inspectAircraft(entry.manifest, entry.values); }
    catch { problem('aircraft.schema', 'error', entry.manifest, 'Malformed or excessively nested aircraft/source data', [entry.manifest, ...entry.values]); }
  }
  return finish();

  function inspectAircraft(manifestPath: string, valuesPaths: string[]) {
    const manifestContent = read(manifestPath);
    if (manifestContent === undefined) return;
    let manifest: ObjectValue;
    try { manifest = JSON.parse(manifestContent); if (!manifest || !Array.isArray(manifest.sources)) throw new Error(); }
    catch { problem('aircraft.schema', 'error', manifestPath, 'Malformed manifest/source list', [manifestPath]); return; }
    const sources = new Map<string, { ref: NodeRef; value: ObjectValue; variants: string[] }>();
    // AS3: the identified variant is read from the manifest configuration. A source
    // whose applicability names only other variants (for example 172P) cannot back a
    // `sourced` value for this variant; a source naming no variant (an engine TCDS)
    // remains for review and is not rejected by text alone.
    const configuration = (manifest.configuration ?? {}) as ObjectValue;
    const modelText = String(((configuration.model ?? {}) as ObjectValue).value ?? configuration.label ?? '');
    const variant = variantsIn(modelText)[0];
    for (const [index, raw] of (manifest.sources as unknown[]).entries()) {
      const source = raw as ObjectValue, location = `${manifestPath}#/sources/${index}`;
      if (!source || typeof source.id !== 'string' || typeof source.revision !== 'string' || sources.has(source.id) ||
          !source.rights || typeof source.rights !== 'object' || Array.isArray(source.rights) ||
          typeof (source.rights as ObjectValue).redistribution !== 'string' || typeof source.applicability !== 'string') {
        problem('aircraft.source', 'error', location, 'Missing/duplicate source identity, revision, rights or applicability', [location]); continue;
      }
      const ref: NodeRef = { kind: 'object', id: location };
      const variants = variantsIn(source.applicability);
      sources.set(source.id, { ref, value: source, variants }); summary.sources++;
      const applicable = !variant || !variants.length ? 'unstated' : String(variants.includes(variant));
      add({ ...ref, title: String(source.title ?? source.id), status: String(source.access_status ?? 'unknown'), source: location, hash: sha(canonical(source)), attrs: { domainKind: 'aircraft-source', sourceId: source.id, revision: source.revision, applicability: source.applicability, applicableVariants: variants.join(','), appliesToAircraft: applicable, rights: JSON.stringify(source.rights), accessStatus: String(source.access_status ?? 'unknown') } });
      edge(ref, { kind: 'document', id: manifestPath }, location);
      if (!['read', 'read_selected_pages'].includes(String(source.access_status))) problem('aircraft.unknown', 'note', location, `Source access remains ${String(source.access_status ?? 'unknown')}`, [location]);
    }
    for (const file of [manifestPath, ...valuesPaths]) {
      const fileContent = read(file); if (fileContent === undefined) continue;
      let data: ObjectValue;
      try { data = JSON.parse(fileContent); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); }
      catch { problem('aircraft.schema', 'error', file, 'Malformed aircraft JSON', [file]); continue; }
      add({ kind: 'document', id: file, status: String(data.status ?? 'unknown'), attrs: { domainKind: 'aircraft-data', fidelity: String(data.fidelity ?? 'unknown'), version: String(data.manifest_version ?? data.values_version ?? 'unknown') } });
      if (data.fidelity !== 'validated') problem('aircraft.unvalidated', 'note', file, `Recorded fidelity is ${String(data.fidelity ?? 'unknown')}; lineage does not validate it`, [file]);
      if (file !== manifestPath) {
        const declared = data.manifest as ObjectValue | undefined;
        const relative = typeof declared?.path === 'string' ? declared.path : '';
        const resolved = file.slice(0, file.lastIndexOf('/') + 1) + relative;
        if (!safePath(relative) || resolved !== manifestPath || declared?.manifest_id !== manifest.manifest_id) problem('aircraft.manifest', 'error', file, 'Missing/mismatched manifest path or identity', [file, manifestPath]);
        edge({ kind: 'document', id: file }, { kind: 'document', id: manifestPath }, file);
      }
      let count = 0;
      function walk(value: unknown, pointer: string, inherited: ObjectValue, depth: number) {
        if (++count > 20000 || depth > 64) throw new Error('aircraft traversal limit');
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) { value.forEach((item, index) => walk(item, `${pointer}/${index}`, inherited, depth + 1)); return; }
        const item = value as ObjectValue;
        const context = { ...inherited };
        for (const key of ['status', 'citations', 'reading', 'conversion', 'uncertainty', 'derivation', 'condition']) if (own(item, key)) context[key] = item[key];
        if (own(item, 'value')) {
          const location = `${file}#${pointer}`, ref: NodeRef = { kind: 'object', id: location };
          const citations = Array.isArray(context.citations) ? context.citations as ObjectValue[] : [];
          const status = typeof context.status === 'string' ? context.status : 'unknown';
          const attrs: Record<string, string> = { domainKind: 'aircraft-parameter', pointer, dataClass: status, fidelity: String(data.fidelity ?? 'unknown'), citations: JSON.stringify(citations) };
          for (const key of ['value', 'unit', 'original_value', 'original_unit', 'reference']) if (own(item, key)) attrs[key] = typeof item[key] === 'string' ? item[key] as string : JSON.stringify(item[key]);
          for (const key of ['reading', 'conversion', 'uncertainty', 'derivation', 'condition']) if (context[key] !== undefined) attrs[key] = String(context[key]);
          add({ ...ref, status, source: location, hash: sha(canonical({ value: item, context, fidelity: data.fidelity ?? null })), attrs }); summary.parameters++;
          edge(ref, { kind: 'document', id: file }, location);
          if (status === 'sourced' && !citations.length) problem('aircraft.citation', 'error', location, 'Sourced parameter has no inherited/direct citation', [location]);
          if (['unknown', 'estimated', 'draft'].includes(status) || item.value === null) problem('aircraft.unknown', 'note', location, `Parameter remains ${status}; no validation inferred`, [location]);
          const foreign: string[] = [];
          let applicableCitation = false;
          for (const citation of citations) {
            const source = sources.get(String(citation?.source_id));
            if (source) {
              if (variant && source.variants.length && !source.variants.includes(variant)) foreign.push(`${String(citation.source_id)} (${source.variants.join(', ')})`);
              else applicableCitation = true;
            }
            if (!source || typeof citation.page !== 'string' || typeof citation.revision !== 'string') problem('aircraft.citation', 'error', location, 'Unknown source or missing citation page/revision', [location, manifestPath]);
            else {
              edge(ref, source.ref, location);
              if (citation.revision !== source.value.revision) problem('aircraft.revision', 'error', location, `Citation revision differs for ${String(citation.source_id)}`, [location, source.ref.id]);
            }
          }
          if (status === 'sourced' && foreign.length) {
            if (!applicableCitation) problem('aircraft.applicability', 'error', location, `Sourced ${variant} parameter cites only sources applicable to other variants: ${foreign.join('; ')}`, [location, manifestPath]);
            else problem('aircraft.applicability', 'warning', location, `Sourced ${variant} parameter also cites other-variant sources: ${foreign.join('; ')}`, [location, manifestPath]);
          }
        }
        for (const [key, child] of Object.entries(item)) if (key !== 'sources') walk(child, `${pointer}/${escapePointer(key)}`, context, depth + 1);
      }
      try { walk(data, '', {}, 0); }
      catch { problem('aircraft.limit', 'error', file, 'Aircraft JSON exceeds traversal bounds', [file]); }
    }
  }
  function variantsIn(text: unknown): string[] {
    // Specific Cessna 172-family designators, normalized: `C172S`, `c172s`, `172s`, `172 S`
    // read as 172S; `172SP` (Skyhawk SP) is the 172S; F/R/FR prefixes are kept
    // (`R172K`, `FR172`). The bare family name `172` is not a variant. Matching is
    // textual: it cannot read negation or serial/avionics ranges (FORMAT.md).
    const found: string[] = [];
    const text_ = String(text ?? '');
    const add = (prefix = '', suffix = '') => {
      const model = suffix.toUpperCase() === 'SP' ? 'S' : suffix.toUpperCase();
      const lead = prefix.toUpperCase() === 'C' ? '' : prefix.toUpperCase();
      if (lead || model) found.push(`${lead}172${model}`);
    };
    // Only known model suffixes (A–S without O, J for Reims, RG, SP) are read. The
    // spaced form takes one upper-case letter, not A or I (prose articles/pronouns),
    // and not one followed by a letter, digit, `/`, `.` or `-` (`172 S/N 17270050`).
    for (const m of text_.matchAll(/\b(c|C|f|F|r|R|fr|FR)?172((?:SP|RG|[A-HJ-NP-S])(?![A-Za-z]))?(?![\dA-Za-z])/gi)) add(m[1], m[2]);
    for (const m of text_.matchAll(/\b(C|F|R|FR)?172 ([B-HJ-NP-S])(?![A-Za-z\d/.\-])/g)) add(m[1], m[2]);
    return [...new Set(found)];
  }
  function finish() {
    for (const severity of ['error', 'warning', 'note'] as const) summary[severity] = problems.filter(problem => problem.severity === severity).length;
    return { nodes: [...nodes.values()].sort((a, b) => compare(`${a.kind}:${a.id}`, `${b.kind}:${b.id}`)), facts: facts.sort((a, b) => compare(JSON.stringify(a), JSON.stringify(b))), problems: problems.sort((a, b) => compare(`${a.check}:${a.id}:${a.message}`, `${b.check}:${b.id}:${b.message}`)), summary };
  }
}
