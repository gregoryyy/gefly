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
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5193,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const observations = [], gestureObservations = [];
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
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, font: parseFloat(s.fontSize), display: s.display, cssZoom: s.zoom, cssWidth:parseFloat(s.width), transform:s.transform };
    };
    return { width: innerWidth, height: innerHeight, zoom:Number(document.querySelector('.flight-app').dataset.panelZoom), scale: Number(document.querySelector('.flight-app').dataset.cockpitScale),
      scene: rect('#scene'), deck: rect('.flight-deck'), viewport: rect('.cockpit-viewport'), vsiFace: rect('#vertical-speed'), surface: rect('.instruments'), primary: rect('.primary-instruments'),
      aircraft: rect('.engine-controls'), face: rect('#airspeed'), nav1: rect('#nav1-gauge .navigation-gauge-face'), nav2: rect('#nav2-gauge .navigation-gauge-face'), bearing: rect('#bearing-gauge .navigation-gauge-face'), rpmFace: rect('#rpm-gauge .navigation-gauge-face'), fuel: rect('#engine-fuel-gauge'), pressure: rect('#altimeter-open'), flaps: rect('#flap-control'), trim: rect('#pitch-trim-control'),
      ap: rect('.autopilot-content'), apHeading: rect('.autopilot-heading'), systemsHeading: rect('.aircraft-systems-content header'), apButton: rect('#ap-engage'), engine: rect('#engine-systems'), radio: rect('#radio-nav-systems'),
      rpm: rect('#engine-rpm'), frequency: rect('#com1-standby'), throttle: rect('#throttle'), mixture: rect('#mixture-control'),
      engineOpen: !document.querySelector('#engine-open').hidden, radioOpen: !document.querySelector('#radio-nav-open').hidden,
      appScroll: document.documentElement.scrollWidth };
  });
  const unchangedSurface=(before,after,message)=>assert(['x','y','right','bottom'].every(key=>Math.abs(before.surface[key]-after.surface[key])<.1),message);
  const singleTransform = (g, context) => {
    assert(g.surface.cssZoom==='normal'||Number(g.surface.cssZoom)===1,`${context}: surface CSS zoom remains normal/1`);
    const matrix=g.surface.transform.match(/^matrix\(([^)]+)\)$/);assert(matrix,`${context}: surface has one explicit transform`);
    const [a,b,c,d]=matrix[1].split(',').map(Number);
    assert(Math.abs(a-g.scale*g.zoom)<1e-5&&Math.abs(d-a)<1e-6&&Math.abs(b)<1e-6&&Math.abs(c)<1e-6,`${context}: transform owns the fitted scale and magnification`);
    assert(Math.abs(g.surface.width-g.surface.cssWidth*a)<1,`${context}: actual width uses one fractional fitted scale`);
  };
  const fittedSurface = (g, context) => {
    singleTransform(g,context);
    assert(Math.abs(g.surface.y - g.viewport.y) <= 1, `${context}: panel is top aligned in its fitted frame`);
    assert(Math.abs((g.surface.x + g.surface.right - g.viewport.x - g.viewport.right) / 2) <= 1,
      `${context}: panel is horizontally centered`);
    assert(g.surface.x >= g.viewport.x - 1 && g.surface.right <= g.viewport.right + 1,
      `${context}: full panel width remains in the frame`);
    assert(g.surface.bottom <= g.viewport.bottom + 1 && g.surface.bottom <= g.height + 1,
      `${context}: full panel height remains reachable`);
  };
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
    fittedSurface(g, `${width}×${height}`);
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
  const reachable = async selector => {
    const box = await page.locator(selector).boundingBox();
    assert(box && box.width > 0 && box.height > 0, `${selector} has visible geometry`);
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    assert(await page.evaluate(({ selector, x, y }) => !!document.elementFromPoint(x, y)?.closest(selector),
      { selector, ...point }), `${selector} is reachable through the actual rendered panel`);
    return point;
  };
  const filled = (g, context) => {
    singleTransform(g,context);
    assert(g.surface.y <= g.viewport.y + 1, `${context}: no empty top`);
    assert(g.surface.bottom >= g.viewport.bottom - 1, `${context}: no empty bottom`);
  };
  // Use actual rendered control locations. Verify the same material point stays
  // under the pointer unless a content edge hits the frame's allowed limit.
  for (const [width, height] of [[1440, 800], [1440, 480], [390, 844]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(180);
    const base = await geometry(), context = `${width}×${height}`, records = [];
    await page.mouse.move(base.viewport.x + base.viewport.width / 2, base.viewport.y + 10);
    await page.mouse.wheel(80, 0); await dragPanel(50, -30);
    unchangedSurface(base, await geometry(), `${context}: normal fitted panel does not pan`);
    await page.evaluate(() => {
      window.panelFrameSamples = []; window.samplePanelFrames = true;
      const sample = () => {
        const surface = document.querySelector('.instruments').getBoundingClientRect();
        const viewport = document.querySelector('.cockpit-viewport').getBoundingClientRect();
        if (window.panelFrameSamples.length < 2500) window.panelFrameSamples.push({
          top: surface.top - viewport.top, bottom: surface.bottom - viewport.bottom });
        if (window.samplePanelFrames) requestAnimationFrame(sample);
      }; requestAnimationFrame(sample);
    });
    const stableFrame = (g, label) => {
      assert(Math.abs(g.deck.height - base.deck.height) < .1, `${label}: panel frame height stays fixed`);
      assert(Math.abs(g.scene.height - base.scene.height) < .1, `${label}: flying height stays fixed`);
      filled(g, label);
    };
    const resetFit = async () => {
      await page.locator('.deck-heading').dblclick();
      const g = await geometry(); fittedSurface(g, context); filled(g, context);
      unchangedSurface(base, g, `${context}: reset returns the original centered fit`);
    };
    const bottomSelector = width <= 620 ? '#radio-nav-open' : '#parking-brake';
    for (const selector of ['#ap-engage', '#vertical-speed', bottomSelector, ...(width > 620 ? ['#nav1-gauge .navigation-gauge-face', '#nav2-gauge .navigation-gauge-face'] : [])]) {
      await resetFit(); const before = await geometry(), point = await reachable(selector);
      const u = (point.x - before.surface.x) / before.surface.width;
      const v = (point.y - before.surface.y) / before.surface.height;
      await page.mouse.move(point.x, point.y); await page.mouse.wheel(0, -140); await page.waitForTimeout(80);
      const after = await geometry(); stableFrame(after, `${context} ${selector}`);
      assert(after.surface.height > before.surface.height * 1.25, 'wheel really magnifies the pointed detail');
      const error = { x: after.surface.x + u * after.surface.width - point.x,
        y: after.surface.y + v * after.surface.height - point.y };
      const clampedX = Math.abs(after.surface.x - after.viewport.x) < 1
        || Math.abs(after.surface.right - after.viewport.right) < 1;
      const clampedY = Math.abs(after.surface.y - after.viewport.y) < 1
        || Math.abs(after.surface.bottom - after.viewport.bottom) < 1;
      assert(Math.abs(error.x) < 1.5 || clampedX, `${context} ${selector}: pointer anchors X except at a frame limit`);
      assert(Math.abs(error.y) < 1.5 || clampedY, `${context} ${selector}: pointer anchors Y except at a frame limit`);
      // These real upper/lower control centers fit without a vertical edge
      // exception, so do not let edge-clamp checks hide a broken anchor.
      assert(Math.abs(error.y) < 1.5, `${context} ${selector}: real detail stays vertically under the pointer`);
      const focused = await geometry();
      if (selector.includes('navigation-gauge-face')) {
        const receiver = selector.includes('nav1') ? 1 : 2;
        const obs = await page.locator(`#nav${receiver}-gauge-obs`).textContent();
        await page.locator(selector).dblclick();
        unchangedSurface(focused, await geometry(), 'interactive OBS face double-click never resets or moves the panel');
        assert.equal(await page.locator(`#nav${receiver}-gauge-obs`).textContent(), obs, 'zero-motion OBS clicks do not change course');
      }
      const clampPan = (before, dx, dy) => ({
        x: Math.max(Math.min(before.viewport.x, before.viewport.right - before.surface.width),
          Math.min(Math.max(before.viewport.x, before.viewport.right - before.surface.width), before.surface.x + dx)),
        y: Math.max(Math.min(before.viewport.y, before.viewport.bottom - before.surface.height),
          Math.min(Math.max(before.viewport.y, before.viewport.bottom - before.surface.height), before.surface.y + dy)),
      });
      const minX = Math.min(focused.viewport.x, focused.viewport.right - focused.surface.width);
      const deltaX = focused.surface.x > minX + 2 ? 40 : -40;
      await page.mouse.wheel(deltaX, 0); await page.waitForTimeout(30);
      const scrolled = await geometry(), scrollExpected = clampPan(focused, -deltaX, 0);
      assert(Math.abs(scrolled.surface.x - scrollExpected.x) < 1 && Math.abs(scrolled.surface.y - focused.surface.y) < 1,
        'horizontal two-finger scrolling pans only left/right within content bounds');
      assert(Math.abs(scrolled.surface.x - focused.surface.x) > 1, 'horizontal scrolling actually moves enlarged content');
      stableFrame(scrolled, `${context}: horizontal scroll`);
      await dragPanel(50, -30);
      const dragged = await geometry(), dragExpected = clampPan(scrolled, 50, -30);
      assert(Math.abs(dragged.surface.x - dragExpected.x) < 1 && Math.abs(dragged.surface.y - dragExpected.y) < 1,
        'housing drag uses actual screen deltas and clamps both axes');
      stableFrame(dragged, `${context}: housing drag`);
      records.push({ selector, point, error, before, after });
    }
    // Padding gestures explicitly exercise both hard vertical limits. Repeated
    // zoom-in/out must fill the frame at every step, not only after a reset.
    for (const edge of ['top', 'bottom']) {
      await resetFit(); const g = await geometry();
      const point = { x: g.viewport.x + g.viewport.width * .5,
        y: edge === 'top' ? g.deck.y + 2 : g.deck.bottom - 2 };
      await page.mouse.move(point.x, point.y);
      for (let i = 0; i < 8; i++) {
        await page.mouse.wheel(0, -180); await page.waitForTimeout(40);
        const z = await geometry(); stableFrame(z, `${context} ${edge} in ${i}`);
        assert(Math.abs(edge === 'top' ? z.surface.y - z.viewport.y : z.surface.bottom - z.viewport.bottom) < 1,
          `${context}: padding anchor stays on the ${edge} bound`);
      }
      assert.equal(Number(await page.locator('.flight-app').getAttribute('data-panel-zoom')), 3);
      await page.screenshot({ path: `${output}/panel-pointer-${edge}-${width}x${height}.png` });
      for (let i = 0; i < 10; i++) {
        const z = await geometry();
        await page.mouse.move(z.viewport.x + z.viewport.width * (i % 2 ? .2 : .8),
          z.viewport.y + z.viewport.height * (i % 2 ? .05 : .95));
        await page.mouse.wheel(0, 150); await page.waitForTimeout(40);
        stableFrame(await geometry(), `${context} ${edge} out ${i}`);
      }
      fittedSurface(await geometry(), context);
    }
    // Repeated real within-window drags and horizontal scrolls reach all hard
    // edges while every animation frame continues to cover the vertical area.
    await resetFit();
    let g = await geometry();
    await page.mouse.move(g.viewport.x + g.viewport.width / 2, g.viewport.y + g.viewport.height / 2);
    for (let i = 0; i < 8; i++) await page.mouse.wheel(0, -180);
    for (const sign of [1, -1]) {
      g = await geometry();
      await page.mouse.move(g.viewport.x + g.viewport.width / 2, g.viewport.y + 8);
      await page.mouse.wheel(sign * 10000, 0);
      const horizontalEdge = await geometry(); stableFrame(horizontalEdge, `${context}: horizontal edge ${sign}`);
      assert(Math.abs(sign > 0 ? horizontalEdge.surface.right - horizontalEdge.viewport.right : horizontalEdge.surface.x - horizontalEdge.viewport.x) < 1,
        `${context}: horizontal scroll reaches the content edge`);
      for (let i = 0; i < 8; i++) {
        await dragPanel(0, sign * Math.min(120, base.viewport.height * .6));
        stableFrame(await geometry(), `${context}: repeated vertical drag ${sign}/${i}`);
      }
      const verticalEdge = await geometry();
      assert(Math.abs(sign > 0 ? verticalEdge.surface.y - verticalEdge.viewport.y : verticalEdge.surface.bottom - verticalEdge.viewport.bottom) < 1,
        `${context}: repeated housing drags reach the vertical content edge`);
    }
    // Native OBS dragging retains its own capture/course gesture and never
    // starts a background pan. The normal reset keeps its face reachable.
    if (width > 620) {
      await resetFit(); const point = await reachable('#nav1-gauge .navigation-gauge-face');
      await page.mouse.move(point.x, point.y); await page.mouse.wheel(0, -140); await page.waitForTimeout(40);
      const beforeControlDrag = await geometry();
      await page.mouse.down(); await page.mouse.move(point.x + 20, point.y, {steps:4}); await page.mouse.up();
      unchangedSurface(beforeControlDrag, await geometry(), 'OBS control drag does not pan the instrument surface');
    }
    // Real mouse capture is released by blur/cancel; later pointer movement
    // cannot continue the old drag, and its release cannot click a control.
    for (const reason of ['blur', 'pointercancel', 'lostpointercapture', 'released-buttons']) {
      await resetFit(); const point = await reachable('#vertical-speed');
      await page.mouse.move(point.x, point.y); await page.mouse.wheel(0, -140); await page.waitForTimeout(40);
      await page.evaluate(() => {
        window.panelDragClicks = 0;
        document.querySelector('.flight-deck').addEventListener('click', () => window.panelDragClicks++, {once:true});
        window.addEventListener('pointerdown', event => {window.lastPanelPointer=event.pointerId;}, {once:true,capture:true});
      });
      const header = await page.locator('.deck-heading').boundingBox(), x = header.x + header.width / 2, y = header.y + header.height / 2;
      await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+20,y-15,{steps:3});
      assert(await page.locator('.flight-deck').evaluate(deck => deck.hasPointerCapture(window.lastPanelPointer)), 'zoomed housing drag captures its real pointer after threshold');
      const stopped = await geometry();
      await page.evaluate(reason => {
        const deck = document.querySelector('.flight-deck');
        if (reason === 'blur') window.dispatchEvent(new Event('blur'));
        else if (reason === 'pointercancel') deck.dispatchEvent(new PointerEvent('pointercancel', {pointerId:window.lastPanelPointer,bubbles:true}));
        else if (reason === 'lostpointercapture') deck.releasePointerCapture(window.lastPanelPointer);
        else window.dispatchEvent(new PointerEvent('pointermove', {pointerId:window.lastPanelPointer,buttons:0,clientX:999,clientY:99}));
      },reason);
      await page.mouse.move(x+40,y-30,{steps:3}); await page.mouse.up();
      unchangedSurface(stopped, await geometry(), `${reason} ends dragging`);
      assert(!await page.locator('.flight-deck').evaluate(deck => deck.hasPointerCapture(window.lastPanelPointer)), `${reason} leaves no stuck capture`);
      assert.equal(await page.evaluate(()=>window.panelDragClicks),0,'an ended drag suppresses its following click');
      stableFrame(await geometry(), `${context}: ${reason}`);
    }
    await resetFit();
    const samples = await page.evaluate(() => { window.samplePanelFrames = false; return window.panelFrameSamples; });
    assert(samples.length > 0 && samples.every(sample => sample.top <= 1 && sample.bottom >= -1),
      `${context}: every observed animation frame fills the area vertically`);
    gestureObservations.push({ width, height, records, samples });
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
    fittedSurface(await geometry(), `Review ${width}×${height}`);
    const reviewBase = await geometry(), reviewPoint = await reachable('#vertical-speed');
    await page.mouse.move(reviewPoint.x, reviewPoint.y); await page.mouse.wheel(0, -140); await page.waitForTimeout(60);
    const reviewZoom = await geometry(); filled(reviewZoom, `Review ${width}×${height}`);
    assert(reviewZoom.surface.height > reviewBase.surface.height * 1.25, 'Review permits view-only panel zoom');
    await page.locator('.deck-heading').dblclick(); fittedSurface(await geometry(), `Review reset ${width}×${height}`);
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
  await writeFile(`${output}/panel-pointer-zoom.json`, `${JSON.stringify(gestureObservations, null, 2)}\n`);
  await writeFile(`${output}/panel-layout.json`, `${JSON.stringify(observations, null, 2)}\n`);
  assert.deepEqual(errors, []);
  console.log(`Panel layout: ${observations.length} viewport cases, pointer anchors, bounded drag/horizontal pan, capture cleanup, vertical bounds at every observed frame, fit resets and fresh-mobile portals passed.`);
} finally {
  await browser?.close();
  server.kill();
}
