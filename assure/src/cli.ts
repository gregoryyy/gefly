#!/usr/bin/env node
// Read-only by default; the explicit lineage command writes disposable ignored outputs.
import { existsSync, lstatSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildGraph, diffGraphs, impact, markdownReport, trace, type Graph } from './graph.ts';
import { git, InputError, loadSnapshot, safePath } from './snapshot.ts';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const usage = 'Usage: node assure/src/cli.ts check|report|trace ID|diff REV|impact PATH|lineage [--json] [--revision REV] [--root PATH]';

function writeLineage(root: string, graph: Graph): string {
  // Refuse a redirected output directory/file and refuse outputs that are not ignored.
  const base = realpathSync(root);
  const output = resolve(base, 'assure/out');
  const contained = (path: string) => {
    const value = relative(base, realpathSync(path));
    if (value === '..' || value.startsWith(`..${sep}`) || isAbsolute(value)) throw new InputError('output path escapes repository');
  };
  contained(resolve(base, 'assure'));
  if (existsSync(output)) contained(output);
  const ignored = git(base, ['check-ignore', '--no-index', '--', 'assure/out/graph.json', 'assure/out/report.md']).toString('utf8').trim().split('\n');
  if (!['assure/out/graph.json', 'assure/out/report.md'].every((path) => ignored.includes(path))) throw new InputError('generated outputs must both be ignored');
  mkdirSync(output, { recursive: true }); contained(output);
  for (const [file, text] of [['graph.json', JSON.stringify(graph, null, 2) + '\n'], ['report.md', markdownReport(graph)]]) {
    const path = resolve(output, file);
    try {
      if (lstatSync(path).isSymbolicLink()) throw new InputError('generated output cannot replace a symlink');
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    writeFileSync(path, text, 'utf8');
  }
  return 'assure/out/graph.json and assure/out/report.md';
}

export function main(argv = process.argv.slice(2)): number {
  let root = ROOT, revision = 'worktree', json = false;
  const positional: string[] = [];
  try {
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--json') json = true;
      else if (argv[i] === '--root' || argv[i] === '--revision') {
        const option = argv[i], value = argv[++i];
        if (!value || value.startsWith('--')) throw new InputError(usage);
        if (option === '--root') root = resolve(value); else revision = value;
      } else if (argv[i].startsWith('-')) throw new InputError(usage);
      else positional.push(argv[i]);
    }
    const [command, argument] = positional;
    const needsArgument = ['trace', 'diff', 'impact'].includes(command);
    if (!['check', 'report', 'trace', 'diff', 'impact', 'lineage'].includes(command)
        || positional.length !== (needsArgument ? 2 : 1)) throw new InputError(usage);
    if (command === 'impact') safePath(argument.split('#')[0]);
    const graph = buildGraph(loadSnapshot(root, revision));
    let output: unknown;
    if (command === 'trace') output = trace(graph, argument);
    else if (command === 'impact') output = impact(graph, [argument]);
    else if (command === 'diff') output = diffGraphs(buildGraph(loadSnapshot(root, argument)), graph);
    else if (command === 'lineage') output = { output: writeLineage(root, graph), summary: graph.summary };
    else if (command === 'check') output = { revision: graph.revision, inputHash: graph.inputHash,
      summary: graph.summary, problems: graph.problems, limitations: graph.limitations };
    else output = graph;
    console.log(!json && ['check', 'report'].includes(command) ? markdownReport(graph) : JSON.stringify(output, null, 2));
    return graph.summary.errors ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'assurance input failure';
    if (json) console.log(JSON.stringify({ error: message, scope: 'no assurance result produced' }, null, 2));
    else console.error(`ERROR: ${message}`);
    return 2;
  }
}

if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) process.exitCode = main();
