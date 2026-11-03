// Real browser gestures and annunciation fixtures, not aircraft/servo validation.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5212';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5212,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser; const checks = [], observations = {};
server.stdout.on('data', value => { serverOutput += value; }); server.stderr.on('data', value => { serverOutput += value; });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `KAP panel fixture timed out: ${serverOutput}`); await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route(`${origin}/kap-panel-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html>
    <link rel="stylesheet" href="/src/style.css"><style>body{margin:20px}.engine-controls{width:200px!important;display:block!important;padding:0!important;height:auto!important}button:focus-visible,input:focus-visible{outline:2px solid orange}</style>
    <div class="cockpit-fitted"><aside class="engine-controls"><div id="autopilot-systems"></div></aside></div><script type="module">
    import{createAutopilotPanel}from'/src/autopilot-panel.ts';
    window.commands=[];window.leakedKeys=[];window.addEventListener('keydown',e=>window.leakedKeys.push(e.code));
    window.fixture={kap_profile:1,kap_engaged:0,kap_lateral:0,kap_lateral_arm:0,kap_vertical:0,kap_alt_arm:0,kap_gs_arm:0,
      kap_lateral_alert:0,kap_vertical_alert:0,kap_hdg_prompt:0,kap_heading_bug_rad:Math.PI/2,kap_selected_altitude_m:1524,kap_vs_target_mps:2.54,
      kap_hold_pressure_altitude_m:1200,kap_baro_setting_pa:101325,kap_baro_units:0,kap_display_page:0,
      kap_indicated_altitude_m:1200,kap_nav_valid:0,kap_nav_kind:0,kap_gs_valid:0,kap_elevator_norm:0};
    window.panel=createAutopilotPanel({container:document.querySelector('#autopilot-systems'),onCommand:command=>commands.push({...command,wall_ms:performance.now()}),onOpen(){},onClose(){}});
    window.setState=(patch={},review=false,available=true,locked=false)=>{Object.assign(fixture,patch);panel.update(fixture,review,available,locked);};setState();
    </script>` }));
  await page.goto(`${origin}/kap-panel-fixture.html`); await page.waitForFunction(() => !!window.panel);
  const commands = () => page.evaluate(() => window.commands.map(({ wall_ms, ...command }) => command));
  const clear = () => page.evaluate(() => { window.commands.length = 0; });
  const state = (patch, reviewing = false, available = true, locked = false) => page.evaluate(({ patch, reviewing, available, locked }) => setState(patch, reviewing, available, locked), { patch, reviewing, available, locked });
  const hold = async (id, milliseconds) => { await page.locator(`#${id}`).hover(); await page.mouse.down(); await page.waitForTimeout(milliseconds); await page.mouse.up(); };
  await page.locator('#ap-engage').click(); assert.deepEqual(await commands(), [], 'short AP press cannot engage later-firmware profile');
  await hold('ap-engage', 310); assert.deepEqual(await commands(), [{ action: 'ap' }]);
  assert.equal(await page.locator('#ap-engaged-label').textContent(), 'OFF', 'command alone never invents accepted AP state');
  await state({ kap_engaged: 1 }); await clear(); await page.locator('#ap-engage').click(); assert.deepEqual(await commands(), [{ action: 'disconnect' }]);
  await state({ kap_engaged: 0 }); await clear(); await page.locator('#ap-engage').focus(); await page.keyboard.down('Enter'); await page.waitForTimeout(310); await page.keyboard.down('Enter'); await page.keyboard.up('Enter');
  assert.deepEqual(await commands(), [{ action: 'ap' }], 'held keyboard activation engages once despite repeat');
  checks.push('AP needs a trusted quarter-second pointer/keyboard hold, short presses do not engage, accepted state comes from snapshots, disconnect is immediate');

  await clear(); await page.evaluate(() => { document.querySelector('#ap-heading').click(); document.querySelector('#ap-engage').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); });
  await page.waitForTimeout(300); assert.deepEqual(await commands(), [], 'synthetic actions cannot command the unit');
  await page.locator('#ap-heading').focus(); await page.keyboard.press('p'); await page.keyboard.press('r'); await page.keyboard.press('q'); await page.keyboard.press('ArrowUp');
  assert.deepEqual(await page.evaluate(() => window.leakedKeys), [], 'panel focus isolates flight shortcuts while key release can propagate');
  await page.locator('#ap-heading').click(); assert.deepEqual(await commands(), [{ action: 'hdg' }]);
  checks.push('trusted mode controls work while synthetic events and focused flight shortcuts cannot command aircraft');

  await state({ kap_engaged: 1, kap_lateral: 1, kap_vertical: 1, kap_lateral_arm: 2, kap_alt_arm: 1, kap_hdg_prompt: 1 });
  assert.equal(await page.locator('#ap-lateral').textContent(), 'HDG'); assert.equal(await page.locator('#ap-vertical').textContent(), 'ALT');
  assert.equal(await page.locator('#ap-lateral-armed').textContent(), 'NAV ARM'); assert.equal(await page.locator('#ap-vertical-armed').textContent(), 'ALT ARM');
  assert.equal(await page.locator('#ap-heading-prompt').textContent(), 'HDG'); assert(await page.locator('#ap-rev').isDisabled(), 'REV is unavailable for non-localizer source');
  await state({ kap_lateral: 0, kap_vertical: 0, kap_lateral_arm: 0, kap_alt_arm: 0, kap_lateral_alert: 2, kap_vertical_alert: 2 });
  assert.equal(await page.locator('#ap-lateral').textContent(), 'ROL'); assert.equal(await page.locator('#ap-vertical').textContent(), 'VS');
  assert.equal(await page.locator('#ap-lateral-alert').textContent(), 'NAV'); assert.equal(await page.locator('#ap-vertical-alert').textContent(), 'GS');
  assert(await page.locator('#ap-lateral-alert').evaluate(element => element.classList.contains('kap-flashing')));
  await clear(); await page.locator('#ap-nav').click(); assert.deepEqual(await commands(), [{ action: 'nav' }]);
  assert.equal(await page.locator('#ap-lateral').textContent(), 'ROL', 'invalid signal selection cannot fabricate capture');
  assert(await page.locator('#ap-altitude-alert').isHidden(), 'legacy optional alert group absence remains unavailable');
  await state({ kap_alert_state: 1, kap_alert_sequence: 1 });
  assert(await page.locator('#ap-altitude-alert').isVisible());
  assert(!await page.locator('#ap-altitude-alert').evaluate(element => element.classList.contains('kap-flashing')), 'approach annunciation is steady');
  for (const stateValue of [2, 3]) {
    await state({ kap_alert_state: stateValue });
    assert(await page.locator('#ap-altitude-alert').evaluate(element => element.classList.contains('kap-flashing')));
  }
  await page.evaluate(() => { delete fixture.kap_alert_state; delete fixture.kap_alert_sequence; setState(); });
  assert(await page.locator('#ap-altitude-alert').isHidden());
  assert.equal(await page.evaluate(() => {
    const observer = new MutationObserver(() => {}); observer.observe(document.querySelector('#ap-status'), { childList: true, characterData: true, subtree: true });
    for (let i = 0; i < 50; i++) setState();
    const changes = observer.takeRecords().length; observer.disconnect(); return changes;
  }), 0, 'unchanged animation frames do not repeatedly replace text in the live region');
  checks.push('LCD keeps lateral/vertical active and armed modes distinct, and source-loss flashes coexist with confirmed ROL/VS fallbacks');

  await state({ kap_lateral_alert: 0, kap_vertical_alert: 0, kap_display_page: 0 }); await clear();
  await page.locator('#ap-selector-increase').click(); assert.deepEqual(await commands(), [{ action: 'select-altitude', value: 1554.48 }]);
  await clear(); await page.locator('#ap-selector-value').fill('6200'); await page.locator('#ap-heading-target').focus();
  assert(Math.abs((await commands())[0].value - 1889.76) < 1e-9);
  await clear(); await page.locator('#ap-heading-target').fill('270'); await page.locator('#ap-heading-increase').focus();
  assert.deepEqual(await commands(), [{ action: 'heading', value: 1.5 * Math.PI }]);
  assert.equal(await page.locator('.kap-unit #ap-heading-target').count(), 0, 'DG heading bug stays outside original hardware face');
  await state({ kap_display_page: 1 }); assert.equal(await page.locator('#ap-selector-unit').textContent(), 'FPM');
  assert.equal(await page.locator('#ap-selector-value').inputValue(), '500'); assert(await page.locator('#ap-selector-value').getAttribute('readonly') !== null);
  checks.push('selector converts simulator feet at the explicit SI boundary, VS page is read-only, and external TRUE DG bug stays separate from hardware face');

  await clear(); await page.locator('#ap-baro').click(); assert.deepEqual(await commands(), [{ action: 'baro' }]);
  await clear(); await hold('ap-baro', 2100); assert.deepEqual(await commands(), [{ action: 'baro-units' }], 'long BARO press must not also fire short press');
  await state({ kap_display_page: 2, kap_baro_units: 0 }); assert.equal(await page.locator('#ap-selector-unit').textContent(), 'HPA');
  await clear(); await page.locator('#ap-selector-increase').click(); assert.deepEqual(await commands(), [{ action: 'baro-setting', value: 101425 }]);
  await state({ kap_baro_units: 1 }); assert.equal(await page.locator('#ap-selector-unit').textContent(), 'IN HG');
  assert.equal(await page.locator('#ap-selector-value').inputValue(), '29.92');
  checks.push('short BARO displays pressure, two-second hold changes units exactly once, and hPa/inHg values use the AP snapshot rather than altimeter assumptions');

  await clear(); await hold('ap-up', 400); assert.deepEqual(await commands(), [{ action: 'vertical', value: 1 }, { action: 'vertical', value: 0 }], 'worker owns repeat timing, not browser timers');
  await clear(); await page.locator('#ap-down').focus(); await page.keyboard.down('Space'); await page.waitForTimeout(350); await page.keyboard.down('Space'); await page.keyboard.up('Space');
  assert.deepEqual(await commands(), [{ action: 'vertical', value: -1 }, { action: 'vertical', value: 0 }]);
  await clear(); await page.locator('#ap-up').hover(); await page.mouse.down(); await state({}, true); await page.mouse.up();
  assert.deepEqual(await commands(), [{ action: 'vertical', value: 1 }, { action: 'vertical', value: 0 }]);
  for (const element of await page.locator('.autopilot-content button,.autopilot-content input').all()) assert(await element.isDisabled(), 'Review is read-only');
  await clear(); await page.evaluate(() => document.querySelector('#ap-nav').click()); assert.deepEqual(await commands(), []);
  checks.push('held UP/DN sends direction/release once, keyboard repeat is isolated, and entering Review releases held control before disabling all commands');

  await state({}, false, true, true); assert(await page.locator('#ap-engage').isDisabled());
  await page.evaluate(() => panel.update({ ap_mode: 2, ap_heading_target_rad: 0, ap_aileron_norm: 0 }, false, true));
  assert.equal(await page.locator('#ap-engaged-label').textContent(), 'INOP'); assert.equal(await page.locator('#ap-selector-value').inputValue(), '');
  assert(await page.locator('#ap-engage').isDisabled(), 'legacy generic AP telemetry never invents a KAP extension');
  await state({ kap_display_page: 0, kap_engaged: 1, kap_lateral: 1, kap_vertical: 1, kap_lateral_arm: 2, kap_alt_arm: 1, kap_hdg_prompt: 1 });
  for (const [width, height] of [[1440, 900], [390, 844], [390, 568]]) {
    await page.setViewportSize({ width, height });
    const geometry = await page.locator('.autopilot-content').evaluate(panel => {
      const p = panel.getBoundingClientRect(); return { width: p.width, height: p.height, bounds: [...panel.querySelectorAll('button,input')].map(element => {
        const r = element.getBoundingClientRect(); return { id: element.id, inside: r.left >= p.left && r.right <= p.right && r.top >= p.top && r.bottom <= p.bottom };
      }) };
    });
    assert.equal(geometry.height, 140); assert(geometry.bounds.every(bound => bound.inside), JSON.stringify(geometry)); observations[`${width}x${height}`] = geometry;
  }
  await page.screenshot({ path: `${output}/kap140-panel.png` });
  checks.push('legacy/missing controller state is INOP, collision/read-only locks commands, and canonical140px panel fits every control on desktop/narrow layouts');
  await clear(); await page.locator('#ap-up').hover(); await page.mouse.down(); await page.evaluate(() => panel.dispose()); await page.mouse.up();
  assert.deepEqual(await commands(), [{ action: 'vertical', value: 1 }, { action: 'vertical', value: 0 }]); assert.equal(await page.locator('#ap-engage').count(), 0);
  assert.deepEqual(errors, []); checks.push('dispose releases a held vertical command and removes controls/listeners');
  await writeFile(`${output}/kap140-panel-browser.json`, JSON.stringify({ result: 'pass', checks, observations }, null, 2) + '\n');
  console.log(JSON.stringify({ result: 'pass', checks }, null, 2));
} finally { await browser?.close(); server.kill('SIGTERM'); }
