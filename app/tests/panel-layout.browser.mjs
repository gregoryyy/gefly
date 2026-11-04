import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
// Actual-browser responsive cockpit geometry; no aircraft fidelity claim.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5193';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5193', '--strictPort'], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const observations = [];
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    if (attempt === 99) throw new Error(`Layout server timed out: ${serverOutput}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack ?? String(error)));
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForSelector('.cockpit-fitted');
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await prepareFlightUI(page);
  const geometry = () => page.evaluate(() => {
    const rect = selector => {
      const element = document.querySelector(selector), r = element.getBoundingClientRect(), s = getComputedStyle(element);
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, font: parseFloat(s.fontSize), display: s.display };
    };
    return { width: innerWidth, height: innerHeight, scale: Number(document.querySelector('.flight-app').dataset.cockpitScale),
      scene: rect('#scene'), deck: rect('.flight-deck'), viewport: rect('.cockpit-viewport'), vsiFace: rect('#vertical-speed'), surface: rect('.instruments'), primary: rect('.primary-instruments'),
      aircraft: rect('.engine-controls'), face: rect('#airspeed'), nav1: rect('#nav1-gauge .navigation-gauge-face'), nav2: rect('#nav2-gauge .navigation-gauge-face'), bearing: rect('#bearing-gauge .navigation-gauge-face'), rpmFace: rect('#rpm-gauge .navigation-gauge-face'), fuel: rect('#engine-fuel-gauge'), pressure: rect('#altimeter-open'), flaps: rect('#flap-control'), trim: rect('#pitch-trim-control'),
      ap: rect('.autopilot-content'), apButton: rect('#ap-engage'), engine: rect('#engine-systems'), radio: rect('#radio-nav-systems'),
      rpm: rect('#engine-rpm'), frequency: rect('#com1-standby'), throttle: rect('#throttle'), mixture: rect('#mixture-control'),
      engineOpen: !document.querySelector('#engine-open').hidden, radioOpen: !document.querySelector('#radio-nav-open').hidden,
      appScroll: document.documentElement.scrollWidth };
  });
  const unchangedSurface=(before,after,message)=>assert(['x','y','right','bottom'].every(key=>Math.abs(before.surface[key]-after.surface[key])<.1),message);
  const dragPanel=async(dx,dy)=>{
    const box=await page.locator('.deck-heading').boundingBox(), x=box.x+box.width/2, y=box.y+box.height/2;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:3});await page.mouse.up();await page.waitForTimeout(60);
  };
  let reference;
  for (const [width, height] of [[1440, 900], [1440, 800], [1280, 720], [1200, 800], [901, 800], [900, 800], [880, 800], [621, 800], [620, 844], [390, 844], [1440, 600], [1440, 480], [1440, 400]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(180);
    const g = await geometry(); observations.push(g);
    reference ??= g;
    assert(g.scale > 0 && g.scale <= 1);
    assert(await page.locator('#altimeter-reference').isVisible(), 'active altimeter pressure reference stays visible');
    assert(g.surface.x >= -1 && g.surface.right <= width + 1, 'entire cockpit surface fits width');
    assert(g.surface.bottom <= height + 1 && g.deck.y >= height * .6 - 1, 'deck fits while preserving at least 60% for flying');
    assert(g.scene.height >= height * .6 - 1, 'flight view keeps its vertical priority');
    for (const key of ['face', 'nav1', 'nav2', 'bearing', 'rpmFace', 'flaps', 'trim', 'ap']) {
      if (g[key].display !== 'none' && g[key].height > 0) assert(g[key].y >= g.deck.y - 1 && g[key].bottom <= height + 1, `${key} remains inside both instrument rows at ${width}×${height}`);
    }
    assert(g.appScroll <= width, 'no page horizontal overflow');
    for (const key of ['face', 'flaps', 'trim', 'ap']) {
      assert(Math.abs(g[key].height / g.scale - reference[key].height / reference.scale) < 3, `${key} keeps the shared scale at ${width}`);
    }
    assert(Math.abs(g.flaps.height - g.trim.height) < 2, 'paired levers keep matching travel');
    assert(Math.abs(g.flaps.y + g.flaps.height / 2 - g.trim.y - g.trim.height / 2) <= 1, 'paired levers align vertically');
    assert.equal(g.ap.display, 'block', 'autopilot remains inline on narrow screens');
    if (width > 620) {
      assert(Math.abs(g.primary.height - g.aircraft.height) < 2);
    }
    if (width > 900) {
      assert(Math.abs(g.primary.height - g.aircraft.height) < 2);
      assert(Math.abs(g.primary.height - g.engine.height) < 2);
      assert(Math.abs(g.primary.height - g.radio.height) < 2);
      for (const key of ['throttle', 'mixture']) assert(Math.abs(g[key].height / g.scale - reference[key].height / reference.scale) < 3);
      for (const key of ['rpm', 'frequency', 'apButton']) assert(Math.abs(g[key].font - reference[key].font) < .1, `${key} canonical font stays fixed`);
      assert.equal(g.engineOpen, false); assert.equal(g.radioOpen, false);
      assert(g.primary.right <= g.engine.x && g.engine.right <= g.aircraft.x && g.aircraft.right <= g.radio.x, 'engine precedes AP/flaps and radio');
      assert(Math.abs(g.nav1.y - g.nav2.y) < 1 && Math.abs(g.bearing.y - g.rpmFace.y) < 1, 'secondary gauge rows align');
      assert(Math.abs(g.face.y - g.nav1.y) < 1, 'six-pack and NAV top faces align');
      assert(g.nav1.x < g.nav2.x && g.bearing.x < g.rpmFace.x && g.bearing.y > g.nav1.bottom, 'NAV1/NAV2 above BRG/RPM');
      assert(g.fuel.height / g.scale > 40 && g.fuel.bottom <= g.engine.bottom + 1, 'distinct round fuel face fits engine column');
      assert(g.pressure.bottom <= g.primary.bottom && g.pressure.right <= g.primary.right, 'pressure control remains inside primary panel');
      const overflow = await page.evaluate(() => ['.engine-content', '.engine-controls', '.radio-nav-content'].map(selector => {
        const p = document.querySelector(selector), b = p.getBoundingClientRect();
        return { selector, overflow: [...p.querySelectorAll('button,input,svg,output')].filter(el => {
          const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.bottom > b.bottom + 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.left < b.left - 1);
        }).map(el => ({ id: el.id, tag: el.tagName, rect: el.getBoundingClientRect().toJSON(), parent: b.toJSON() })) };
      }));
      assert(overflow.every(p => p.overflow.length === 0), `all controls remain inside compact columns at ${width}×${height}: ${JSON.stringify(overflow)}`);
    } else {
      assert.equal(g.engineOpen, true); assert.equal(g.radioOpen, true);
      await page.locator('#engine-open').click();
      await page.locator('#engine-dialog').waitFor({ state: 'visible' });
      assert(await page.locator('#throttle').isVisible()); assert(await page.locator('#mixture-control').isVisible());
      await page.locator('#engine-close').click();
      await page.locator('#radio-nav-open').click();
      await page.locator('#radio-nav-dialog').waitFor({ state: 'visible' });
      await page.locator('#radio-nav-close').click();
    }
    if (width === 1440 && height === 900) assert(g.deck.height <= 390, 'desktop cockpit is shorter than the previous 449px panel');
    if (width === 390 || (width === 1440 && [900, 800, 480].includes(height))) await page.screenshot({ path: `${output}/panel-layout-${width}x${height}.png` });
  }
  // Focused magnification crops other instruments without growing the cockpit
  // or reducing the flight view, including in short/mobile windows.
  for (const [width, height] of [[1440, 800], [1440, 480], [390, 844]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(180);
    const before = await geometry(), ap = page.locator('#ap-engage');
    const anchor = { x: before.apButton.x + before.apButton.width / 2, y: before.apButton.y + before.apButton.height / 2 };
    await page.mouse.move(anchor.x, anchor.y); await page.mouse.wheel(0, -180); await page.waitForTimeout(120);
    let focused = await geometry();
    assert(focused.apButton.width > before.apButton.width * 1.3, 'short windows retain useful instrument magnification');
    const anchoredX = Math.abs(focused.apButton.x + focused.apButton.width / 2 - anchor.x) < 1.5;
    const clampedX = Math.abs(focused.surface.x - focused.viewport.x) < 1 || Math.abs(focused.surface.right - focused.viewport.right) < 1;
    assert(anchoredX || width <= 620 && clampedX, 'pointer X anchors the instrument, subject only to mobile content-edge clamping');
    assert(Math.abs(focused.apButton.y + focused.apButton.height / 2 - anchor.y) < 1.5, 'pointer Y anchors the focused instrument');
    assert.equal(focused.deck.height, before.deck.height, 'zoom never grows the cockpit');
    assert.equal(focused.scene.height, before.scene.height, 'zoom never shrinks the flying area');
    await ap.focus(); await ap.dblclick();
    unchangedSurface(focused,await geometry(),'focusing and clicking AP controls never moves the panel');
    assert(Number(await page.locator('.flight-deck').getAttribute('data-panel-zoom')) > 1.3, `double-clicking a native AP control does not reset zoom at ${width}×${height}`);
    for (let i = 0; i < 4; i++) { await page.mouse.move(anchor.x, anchor.y); await page.mouse.wheel(0, -200); }
    await page.waitForTimeout(100); focused = await geometry();
    assert.equal(Number(await page.locator('.flight-deck').getAttribute('data-panel-zoom')), 3);
    assert(focused.surface.y <= focused.viewport.y + 1 && focused.surface.bottom >= focused.viewport.bottom - 1, 'vertical pan clamps keep the instrument viewport filled without a blank top');
    for (const dx of [10000, -10000]) {
      await page.mouse.move(focused.viewport.x + focused.viewport.width / 2, focused.viewport.y + focused.viewport.height / 2);
      await page.mouse.wheel(dx, 0); await page.waitForTimeout(80); focused = await geometry();
      assert(focused.surface.x <= focused.viewport.x + 1 && focused.surface.right >= focused.viewport.right - 1, 'horizontal pan cannot reveal blank margins');
    }
    const beforeFocus=await geometry();
    await page.locator('#pitch-trim-control').focus();await page.waitForTimeout(60);
    unchangedSurface(beforeFocus,await geometry(),'focusing a clipped control does not reposition the panel');
    await dragPanel(0,-10000);focused=await geometry();
    assert(Math.abs(focused.surface.bottom-focused.viewport.bottom)<1,'dragging housing reaches the content bottom');
    await page.mouse.move(focused.viewport.x+focused.viewport.width/2,focused.viewport.y+focused.viewport.height/2);
    unchangedSurface(focused,await geometry(),'pointer re-entry after release never moves the panel');
    if(height===800) await page.screenshot({path:`${output}/panel-drag-bottom.png`});
    await dragPanel(0,10000);focused=await geometry();
    assert(Math.abs(focused.surface.y-focused.viewport.y)<1,'dragging housing reaches the content top');
    for(const dx of [-10000,10000]){
      await dragPanel(dx,0);focused=await geometry();
      assert(focused.surface.x<=focused.viewport.x+1&&focused.surface.right>=focused.viewport.right-1,'housing drag cannot expose blank horizontal margins');
      assert(Math.abs((dx<0?focused.surface.right:focused.surface.x)-(dx<0?focused.viewport.right:focused.viewport.x))<1,'housing drag reaches either horizontal edge');
    }
    if(width===1440&&height===800) for(const selector of ['#pitch-trim-control','#nav1-gauge .navigation-gauge-face','#ap-engage']){
      const control=page.locator(selector), target=await control.boundingBox();focused=await geometry();
      await dragPanel(focused.viewport.x+focused.viewport.width/2-target.x-target.width/2,focused.viewport.y+focused.viewport.height/2-target.y-target.height/2);
      const visible=await control.boundingBox(), stable=await geometry();
      const x=Math.max(stable.viewport.x+3,Math.min(stable.viewport.right-3,visible.x+visible.width/2));
      const y=Math.max(stable.viewport.y+3,Math.min(stable.viewport.bottom-3,visible.y+visible.height/2));
      assert(await page.evaluate(({x,y,selector})=>!!document.elementFromPoint(x,y)?.closest(selector),{x,y,selector}),`${selector} is actually reachable`);
      await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+12,y+10,{steps:3});await page.mouse.up();
      unchangedSurface(stable,await geometry(),`${selector} interaction cannot drag the panel`);
    }
    assert.equal(focused.deck.height,before.deck.height);assert.equal(focused.scene.height,before.scene.height);
    // Restore fit through the noninteractive housing, then focus a lower face.
    await page.locator('.deck-heading').dblclick(); await page.waitForTimeout(80);
    assert.equal(Number(await page.locator('.flight-deck').getAttribute('data-panel-zoom')), 1);
    const base = await geometry(), vsi = page.locator('#vertical-speed');
    const lowerAnchor = { x: base.vsiFace.x + base.vsiFace.width / 2, y: base.vsiFace.y + base.vsiFace.height / 2 };
    await page.mouse.move(lowerAnchor.x, lowerAnchor.y); await page.mouse.wheel(0, -180); await page.waitForTimeout(100);
    const lower = await geometry();
    assert(lower.vsiFace.width > base.vsiFace.width * 1.3, 'lower-row gesture actually magnifies the VSI');
    const lowerX = Math.abs(lower.vsiFace.x + lower.vsiFace.width / 2 - lowerAnchor.x) < 1.5;
    const lowerClampedX = Math.abs(lower.surface.x - lower.viewport.x) < 1 || Math.abs(lower.surface.right - lower.viewport.right) < 1;
    assert((lowerX || width <= 620 && lowerClampedX) && Math.abs(lower.vsiFace.y + lower.vsiFace.height / 2 - lowerAnchor.y) < 1.5, 'lower-row focus anchors in both axes subject to mobile content-edge clamping');
    if (height === 800) await page.screenshot({ path: `${output}/panel-focus-lower.png` });
    await vsi.dblclick(); await page.waitForTimeout(60);
    assert.equal(Number(await page.locator('.flight-deck').getAttribute('data-panel-zoom')), 1, 'double-clicking a noninteractive face restores the fitted panel');
    const restored = await geometry();
    assert(Math.abs(restored.surface.x - before.surface.x) < 1 && Math.abs(restored.surface.y - before.surface.y) < 1);
    if (height === 800) {
      await page.mouse.move(anchor.x, base.viewport.y + 1); await page.mouse.wheel(0, -300); await page.waitForTimeout(80);
      await page.screenshot({ path: `${output}/panel-focus-autopilot.png` });
      await page.locator('.deck-heading').dblclick();
      assert.equal(Number(await page.locator('.flight-deck').getAttribute('data-panel-zoom')), 1, 'double-clicking panel housing restores fit');
    }
  }
  // Docking the flight map changes width, not the reserved flying height.
  await page.setViewportSize({ width: 1440, height: 800 }); await page.waitForTimeout(180);
  const undocked = await geometry();
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  await page.locator('#practice-map-panel').waitFor({ state: 'visible' });
  await page.waitForTimeout(180);
  const docked = await geometry();
  assert(Math.abs(docked.scene.height - undocked.scene.height) <= 1, 'map docking retains the flying height');
  assert(docked.scene.width < undocked.scene.width, 'desktop map docks beside the flight view');
  assert(docked.scene.height >= 479 && docked.surface.bottom <= 801);
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  // Portaled controls return to the cockpit if a narrow dialog is open during expansion.
  await page.setViewportSize({ width: 900, height: 900 });
  await page.waitForTimeout(180);
  for (const unit of ['engine', 'radio-nav']) {
    await page.locator(`#${unit}-open`).click();
    await page.locator(`#${unit}-dialog`).waitFor({ state: 'visible' });
    await page.setViewportSize({ width: 901, height: 900 });
    await page.locator(`#${unit}-dialog`).waitFor({ state: 'hidden' });
    await page.waitForTimeout(180);
    assert(await page.locator(unit === 'engine' ? '#engine-systems .engine-content' : '#radio-nav-systems .radio-nav-content').isVisible());
    await page.setViewportSize({ width: 900, height: 900 });
    await page.waitForTimeout(180);
  }
  // Review has room for both its complete readouts and transport above the scaled cockpit.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#start').click();
  await page.waitForTimeout(350);
  await page.locator('#pause').click();
  await page.setViewportSize({ width: 1440, height: 800 }); await page.waitForTimeout(180);
  await page.screenshot({ path: `${output}/flying-view-1440x800.png` });
  await page.locator('#scene').focus();
  await page.keyboard.press('r');
  await page.locator('#flight-review').waitFor({ state: 'visible' });
  for (const [width, height] of [[1440, 900], [760, 844], [390, 844]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(200);
    const boxes = await page.evaluate(() => {
      const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom }; };
      return { controls: r('.control-panel'), review: r('#flight-review'), header: r('.topbar'), deck: r('.flight-deck') };
    });
    assert(boxes.controls.y >= boxes.header.bottom - 1, `recorded readouts clear header at ${width}`);
    assert(boxes.review.bottom <= boxes.deck.y + 1, 'review transport clears cockpit');
    assert(boxes.controls.bottom <= boxes.review.y || boxes.controls.x >= boxes.review.right, `recorded readouts and review transport do not overlap at ${width}×${height}: ${JSON.stringify(boxes)}`);
    if (width === 390) await page.screenshot({ path: `${output}/panel-layout-review-mobile.png` });
  }
  // A fresh mobile load must not depend on desktop-first portal placement.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on('pageerror', error => errors.push(error.stack ?? String(error)));
  await installSceneryFixture(mobile); await mobile.goto(origin); await mobile.waitForFunction(() => !document.querySelector('#start').disabled);
  assert(await mobile.locator('.engine-controls .autopilot-content').isVisible());
  assert(await mobile.locator('#engine-open').isVisible());
  await mobile.close();
  await writeFile(`${output}/panel-layout.json`, `${JSON.stringify(observations, null, 2)}\n`);
  assert.deepEqual(errors, []);
  console.log(`Panel layout: ${observations.length} viewport cases and fresh-mobile portals passed.`);
} finally {
  await browser?.close();
  server.kill();
}
