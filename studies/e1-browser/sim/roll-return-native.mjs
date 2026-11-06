// R-SIM-11 / TODO2.0.153: returned command reaches the same aileron target.
// Numeric equality is an engineering FCS contract, not an aircraft tolerance.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkRollReturn } from './roll-return-checks.mjs';
const checkerFiles = ['roll-return-native.mjs', 'roll-return-checks.mjs'];
const checkedBy = Object.fromEntries(await Promise.all(checkerFiles.map(async file => [file, createHash('sha256').update(await readFile(new URL(file, import.meta.url))).digest('hex')])));
const output = process.env.GF_ROLL_RETURN_OUTPUT
  ? pathToFileURL(process.env.GF_ROLL_RETURN_OUTPUT.replace(/\/?$/, '/'))
  : new URL('../../../output/flight/roll-return-native/', import.meta.url);
const run = spawnSync(process.execPath, [fileURLToPath(new URL('./disturbance-response-native.mjs', import.meta.url))], {
  env: { ...process.env, GF_DISTURBANCE_OUTPUT: fileURLToPath(output) }, stdio: 'inherit', timeout: 120000,
});
assert.equal(run.status, 0, 'Native disturbance diagnostic must finish successfully');
const report = JSON.parse(await readFile(new URL('observations.json', output), 'utf8'));
const result = { ...checkRollReturn(report), checked_by: checkedBy };
for (const file of checkerFiles) assert.equal(createHash('sha256').update(await readFile(new URL(file, import.meta.url))).digest('hex'), checkedBy[file], 'Checker source changed during execution');
await mkdir(output, { recursive: true });
await writeFile(new URL('regression.json', output), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ result: 'pass', cases: result.cases.length, max_surface_residual_deg: Math.max(...result.cases.map(c => c.max_returned_surface_residual_deg)) }));
