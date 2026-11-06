// R-NAV-5 / TODO2.0.157: actual editor/store components, without a simulator.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5354';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/world-gps-vite',server:{host:'127.0.0.1',port:5354,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
const result = { checks: [], errors: [] };
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 100 && !serverLog.includes('Local:'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert(serverLog.includes('Local:'), serverLog);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  result.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, serviceWorkers: 'block' });
  page.on('pageerror', error => result.errors.push(String(error)));
  await page.route(`${origin}/world-gps-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><title>Worldwide GPS planner</title><style>body{background:#13212c;color:#eee;margin:12px;max-width:780px}</style><main id="planner"></main><script type="module">
import{createFlightPlanStore,planLegs}from'/src/map-flight-plan.ts';
import{createFlightPlanPanel}from'/src/map-flight-plan-panel.ts';
window.actions=[];window.changes=0;let panel;
window.store=createFlightPlanStore(()=>{changes++;render();});
function render(){panel.update({state:store.getSnapshot(),legs:planLegs(store.getSnapshot()),navigationText:'No aircraft or radio connection in component fixture.',picking:false,reviewing:false});}
panel=createFlightPlanPanel({onAction(action){actions.push(action);switch(action.type){
case'create-fix':return store.createFix(action.name,action.lat_deg,action.lon_deg);
case'set-point':return store.setPoint(action.role,action.point);
case'remove-fix':return store.removeFix(action.id);
case'activate-leg':return store.activateLeg(action.index);
case'clear-plan':store.clearPlan();return{ok:true,value:undefined};
default:return{ok:true,value:undefined};}}});
window.panel=panel;window.legs=()=>planLegs(store.getSnapshot());document.querySelector('#planner').append(panel.element);render();window.ready=true;
</script>` }));
  await page.goto(`${origin}/world-gps-fixture.html`);
  await page.waitForFunction(() => window.ready);
  const editor = page.getByRole('region', { name: 'GPS fixes and flight plan', exact: true });
  const fixes = editor.getByRole('list', { name: 'Custom GPS fixes', exact: true });
  const lat = editor.getByLabel('Latitude °N', { exact: true }), lon = editor.getByLabel('Longitude °E', { exact: true });
  const submit = editor.getByRole('button', { name: 'Create GPS fix', exact: true });
  const create = async (name, latitude, longitude) => {
    await editor.getByLabel('GPS fix name', { exact: true }).fill(name);
    await lat.fill(String(latitude)); await lon.fill(String(longitude)); await submit.click();
  };
  const row = name => fixes.getByRole('listitem').filter({ has: page.locator('strong', { hasText: `Custom: ${name}` }) });
  assert.deepEqual(await lat.evaluate(input => [input.min, input.max]), ['-90', '90']);
  assert.deepEqual(await lon.evaluate(input => [input.min, input.max]), ['-180', '180']);
  await create('Paris', 48.8566, 2.3522);
  await create('Brest', 48.39, -4.49);
  await create('Cape Town', -33.9249, 18.4241);
  await create('California', 37.6213, -122.379);
  assert.equal(await fixes.getByRole('listitem').count(), 4);
  assert.match(await row('Brest').textContent(), /48\.39000° N, 4\.49000° W/);
  assert.match(await row('Cape Town').textContent(), /33\.92490° S, 18\.42410° E/);
  assert.match(await row('California').textContent(), /37\.62130° N, 122\.37900° W/);
  result.checks.push('manual France, negative longitude and southern/western coordinates create fixes with correct hemisphere metadata');

  await row('Paris').getByRole('button', { name: 'Set start', exact: true }).click();
  await row('Brest').getByRole('button', { name: 'Add waypoint', exact: true }).click();
  await row('Cape Town').getByRole('button', { name: 'Set destination', exact: true }).click();
  const route = await page.evaluate(() => ({ state: store.getSnapshot(), legs: legs() }));
  assert.equal(route.state.start.name, 'Paris'); assert.equal(route.state.waypoints[0].name, 'Brest');
  assert.equal(route.state.destination.name, 'Cape Town'); assert.equal(route.legs.length, 2);
  assert(route.legs.every(leg => Number.isFinite(leg.course_true_deg) && leg.distance_nm > 0));
  result.checks.push('French start/waypoint and southern destination produce finite global route legs');

  const beforeInvalid = await page.evaluate(() => ({ state: store.getSnapshot(), actions: actions.length, changes }));
  for (const [latitude, longitude] of [[90.0001, 0], [-90.0001, 0], [0, 180.0001], [0, -180.0001]]) await create('Invalid', latitude, longitude);
  await lat.fill(''); await submit.click();
  const afterInvalid = await page.evaluate(() => ({ state: store.getSnapshot(), actions: actions.length, changes }));
  assert.deepEqual(afterInvalid, beforeInvalid, 'invalid manual coordinates do not dispatch or mutate the store');
  assert.match(await editor.getByRole('alert').textContent(), /WGS84/);
  await create('After invalid', 46.6, 1.88);
  assert.equal(await page.evaluate(() => store.getSnapshot().fixes.at(-1).id), 'USER-0005');
  result.checks.push('invalid/nonfinite manual input is rejected before dispatch, mutation and ID consumption');

  await page.evaluate(() => panel.setPickedPosition(-4.49, 48.39));
  assert.equal(await lat.inputValue(), '48.39'); assert.equal(await lon.inputValue(), '-4.49');
  assert.equal(await fixes.getByRole('listitem').count(), 5, 'picking fills fields without creating a point');
  const beforePick = await page.evaluate(() => ({ state: store.getSnapshot(), actions: actions.length, changes }));
  for (const [longitude, latitude] of [[181, 0], [0, 91], [Infinity, 0], [0, NaN]]) await page.evaluate(([x, y]) => panel.setPickedPosition(x, y), [longitude, latitude]);
  assert.equal(await lat.inputValue(), '48.39'); assert.equal(await lon.inputValue(), '-4.49');
  assert.deepEqual(await page.evaluate(() => ({ state: store.getSnapshot(), actions: actions.length, changes })), beforePick);
  await page.evaluate(() => panel.setPickedPosition(-70.6693, -33.4489));
  await editor.getByLabel('Anonymous GPS fix', { exact: true }).check(); await submit.click();
  const anonymous = await page.evaluate(() => store.getSnapshot().fixes.at(-1));
  assert.equal(anonymous.id, 'USER-0006'); assert.equal(anonymous.name, anonymous.id); assert.equal(anonymous.anonymous, true);
  assert.equal(anonymous.lat_deg, -33.4489); assert.equal(anonymous.lon_deg, -70.6693);
  result.checks.push('picked global positions require explicit creation; invalid picks preserve fields/state, and anonymous southern/western fixes work');

  await editor.getByLabel('Anonymous GPS fix', { exact: true }).uncheck();
  for (const [name, latitude, longitude] of [['North east', 90, 180], ['South west', -90, -180]]) await create(name, latitude, longitude);
  assert.equal(await fixes.getByRole('listitem').count(), 8);
  const waypoint = await page.evaluate(() => store.createWaypoint(43.2965, 5.3698));
  assert.equal(waypoint.ok, true); assert.equal(waypoint.value.id, 'USER-0009');
  const snapshot = await page.evaluate(() => store.getSnapshot());
  assert.equal(snapshot.waypoints.at(-1).id, 'USER-0009'); assert.equal(snapshot.fixes.at(-1).id, 'USER-0009');
  result.checks.push('inclusive WGS84 boundaries and direct anonymous French waypoint creation use the same policy');
  assert.deepEqual(result.errors, []);
  result.snapshot = snapshot;
  result.scope = 'Actual store/editor browser component. No native engine, real map right-click, radio/AP, GPU or complete simulator integration is exercised.';
  await page.screenshot({ path: `${output}/world-gps-planner.png`, fullPage: true });
  await writeFile(`${output}/world-gps-planner-browser.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(`World GPS planner browser: ${result.checks.length} groups passed; France/global manual, picked, anonymous and route cases.`);
} finally {
  await browser?.close(); server.kill();
}
