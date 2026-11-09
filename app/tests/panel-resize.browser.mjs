// Actual cockpit CSS/controller/components in a standalone local file: no scene,
// worker, native runtime, HTTP server or scenery requests. This checks DOM fit,
// not aircraft telemetry or authority of the unavailable fixture controls.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { build } from 'vite';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'gefly-panel-resize-'));
const checks = [], observations = [], gestures = [], errors = [], network = [], sceneBudgetObservations = [], wheelObservations = [], embeddedObservations = [], initialLoadObservations = [];
let browser, page, result = 'fail', failure;
const hash = value => createHash('sha256').update(value).digest('hex');
const sourceHashes = {};
for (const name of ['main.ts', 'style.css', 'cockpit-layout.ts', 'panel-zoom.ts']) {
  sourceHashes[name] = hash(await readFile(join(app, 'src', name)));
}
function measureGeometry() {
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const root = document.querySelector('.flight-app');
    const surfaceStyle = getComputedStyle(document.querySelector('.instruments'));
    const surfaceComputed = Object.fromEntries(['zoom', 'width', 'height', 'marginLeft', 'marginRight', 'left', 'transform', 'transformOrigin'].map(key => [key, surfaceStyle[key]]));
    surfaceComputed.inlineTransform = document.querySelector('.instruments').style.transform;
    const matrix = new DOMMatrixReadOnly(surfaceStyle.transform);
    surfaceComputed.matrix = { a:matrix.a,b:matrix.b,c:matrix.c,d:matrix.d,e:matrix.e,f:matrix.f };
    const controls = ['#airspeed', '#vertical-speed', '#ap-heading-target', '#flap-control', '#pitch-trim-control', '#parking-brake',
      ...(innerWidth > 900 ? ['#throttle', '#com1-standby'] : ['#engine-open', '#radio-nav-open'])];
    return { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, focus: document.activeElement?.id,
      visualViewport: window.visualViewport ? {offsetLeft:visualViewport.offsetLeft,offsetTop:visualViewport.offsetTop,scale:visualViewport.scale,width:visualViewport.width,height:visualViewport.height}:null,
      scrolls: ['.cockpit-viewport','.flight-deck','.flight-app','html','body'].map(selector=>{const el=document.querySelector(selector);return{selector,left:el.scrollLeft,top:el.scrollTop,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};}),surfaceComputed, zoom: Number(root.dataset.panelZoom), scale: Number(root.dataset.cockpitScale),
      viewport: rect(document.querySelector('.cockpit-viewport')), surface: rect(document.querySelector('.instruments')),
      deck: rect(document.querySelector('.flight-deck')), scrollWidth: document.documentElement.scrollWidth,
      controls: controls.map(selector => { const element = document.querySelector(selector), r = rect(element);
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { selector, ...r, reachable: !!hit && (hit === element || element.contains(hit)) }; }),
    };
}

function singleTransform(g,label) {
  assert(g.surfaceComputed.zoom==='normal'||Number(g.surfaceComputed.zoom)===1,`${label}: CSS zoom must stay normal/1; fitted size belongs to the transform`);
  const {a,b,c,d,e,f}=g.surfaceComputed.matrix;
  assert(Math.abs(a-g.scale*g.zoom)<1e-5&&Math.abs(d-a)<1e-7&&Math.abs(b)<1e-7&&Math.abs(c)<1e-7,`${label}: one uniform transform owns fit and magnification`);
  assert(Math.abs(g.surface.x-g.viewport.x-e)<1&&Math.abs(g.surface.y-g.viewport.y-f)<1,`${label}: translation is measured in screen CSS pixels from the frame origin`);
  const width=parseFloat(g.surfaceComputed.width),height=parseFloat(g.surfaceComputed.height);
  assert(Math.abs(g.surface.width-width*a)<1&&Math.abs(g.surface.height-height*d)<1,`${label}: fractional canonical size has one rendered scale`);
}
function fittedGeometry(g,label) {
    singleTransform(g,label);
    assert.equal(g.zoom, 1, `${label}: normal fit replaces stale zoom/pan state`);
    const centerError = (g.surface.x + g.surface.right - g.viewport.x - g.viewport.right) / 2;
    assert(Math.abs(centerError) <= 1, `${label}: actual rendered center drift ${centerError}px`);
    assert(Math.abs((g.viewport.x + g.viewport.right) / 2 - g.width / 2) <= 1, `${label}: frame itself remains centered in the window`);
    assert(g.surface.x >= g.viewport.x - 1 && g.surface.right <= g.viewport.right + 1, `${label}: full panel width is reachable`);
    assert(Math.abs(g.surface.y - g.viewport.y) <= 1 && Math.abs(g.surface.bottom - g.viewport.bottom) <= 1, `${label}: normal fit has no vertical gap or clipped bottom`);
    assert(g.surface.bottom <= g.height + 1, `${label}: fitted panel bottom remains within the window`);
    assert(g.scrollWidth <= g.width, `${label}: no horizontal page overflow`);
    for (const control of g.controls) assert(control.width > 0 && control.height > 0 && control.reachable,
      `${label}: ${control.selector} is reachable at its rendered center`);
}

try {
  await mkdir(output, { recursive: true });
  const mainSource = await readFile(join(app, 'src/main.ts'), 'utf8');
  const deckStart = mainSource.indexOf('<section class="flight-deck"');
  const deckEnd = mainSource.indexOf('\n</main>`;', deckStart);
  assert(deckStart >= 0 && deckEnd > deckStart, 'the real main cockpit markup is available');
  const deck = mainSource.slice(deckStart, deckEnd);
  assert(!deck.includes('${'), 'cockpit markup must not require main-session evaluation');
  const markup = `<main class="flight-app"><div id="scene" tabindex="0"></div>${deck}</main>`;
  const imports = [
    ['createCockpitLayout', 'cockpit-layout'], ['createPitchTrimControl', 'pitch-trim'],
    ['createNavigationGauges', 'navigation-gauges'], ['createSixPack', 'six-pack'],
    ['createAutopilotPanel', 'autopilot-panel'], ['createRadioNavPanel', 'radio-nav-panel'],
    ['createEnginePanel', 'engine-panel'], ['createPressureAltimeterPanel', 'pressure-altimeter-panel'],
  ];
  const entry = join(directory, 'fixture.ts');
  await writeFile(entry, `import {createAircraftSystemsPanel} from ${JSON.stringify(join(app, 'src/aircraft-systems-panel.ts'))};
import ${JSON.stringify(join(app, 'src/style.css'))};
${imports.map(([name, file]) => `import {${name}} from ${JSON.stringify(join(app, 'src', file + '.ts'))};`).join('\n')}
import {DEFAULT_RADIO_NAV} from ${JSON.stringify(join(app,'src/radio-nav.ts'))};
import {createKap140} from ${JSON.stringify(join(app,'../studies/e1-browser/sim/kap140.js'))};
document.body.innerHTML=${JSON.stringify(markup)};
const el=(id)=>document.getElementById(id), noop=()=>{};
const pack=createSixPack(el('six-pack'));
createPressureAltimeterPanel({container:pack.altimeterContainer,onSetting:noop,onOpen:noop,onClose:noop});
createAircraftSystemsPanel({container:el('aircraft-systems'),opener:el('systems-open'),onChange:noop,onOpen:noop,onClose:noop});
createEnginePanel({container:el('engine-systems'),onMixture:noop,onEngine:noop,onOpen:noop,onClose:noop});
(document.querySelector('.engine-power-controls')??document.querySelector('.engine-content')).insertBefore(document.querySelector('.throttle-control'),document.querySelector('.engine-mixture'));
const ap=createAutopilotPanel({container:el('autopilot-systems'),onCommand:noop,onOpen:noop,onClose:noop});
const radio=createRadioNavPanel({container:el('radio-nav-systems'),onChange:noop,onOpen:noop,onClose:noop});
// Static UI-only telemetry makes native inputs focusable without a worker.
const sensors={t_s:0,dt_s:0,heading_rad:0,physical_altitude_m:400,pressure_altitude_m:400,vertical_speed_mps:0,nav:{valid:false,gs_valid:false,kind:0,cdi_norm:0,course_rad:0,gs_norm:0}};
const uiState={...DEFAULT_RADIO_NAV,...createKap140(sensors).snapshot(sensors),step:0,t_s:0,lat_rad:50*Math.PI/180,lon_rad:8.6*Math.PI/180,alt_msl_m:400,heading_rad:0};
ap.update(uiState,false,true);radio.update(uiState,false,true);
createNavigationGauges({container:el('navigation-gauges'),onObs:noop,onOpen:noop,onClose:noop});
createPitchTrimControl({container:el('pitch-trim'),onChange:noop,onRestoreInitial:noop});
window.panelLayout=createCockpitLayout(document.querySelector('.flight-app'));
window.fixtureReady=true;
`);
  const bundled = await build({ configFile: false, root: app, logLevel: 'silent', build: {
    write: false, minify: false, cssCodeSplit: false,
    lib: { entry, formats: ['iife'], name: 'PanelResizeFixture' },
  } });
  const assets = (Array.isArray(bundled) ? bundled : [bundled]).flatMap(bundle => bundle.output);
  const code = assets.filter(asset => asset.type === 'chunk').map(asset => asset.code).join('\n');
  const css = assets.filter(asset => asset.type === 'asset' && asset.fileName.endsWith('.css')).map(asset => String(asset.source)).join('\n');
  assert(code && css, 'the actual production CSS/controller bundle was built');
  const html = join(directory, 'panel-resize.html');
  await writeFile(html, `<!doctype html><meta charset="utf-8"><style>${css}</style><body><script>${code.replace(/<\/script/gi, '<\\/script')}</script>`);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  for (const deviceScaleFactor of [1, 2]) {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor });
  page.on('pageerror', error => errors.push(String(error)));
  await page.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  await page.goto(pathToFileURL(html).href);
  assert.deepEqual(errors, [], 'standalone cockpit components initialize successfully');
  await page.waitForFunction(() => window.fixtureReady && document.querySelector('.flight-app').dataset.cockpitScale);
  await page.evaluate(() => {
    window.resizeWheels=[];
    window.addEventListener('wheel',event=>{const before=document.querySelector('.flight-app').dataset.panelZoom;const target=event.target.id||event.target.className;
      setTimeout(()=>window.resizeWheels.push({deltaX:event.deltaX,deltaY:event.deltaY,deltaMode:event.deltaMode,trusted:event.isTrusted,prevented:event.defaultPrevented,target:String(target),before,after:document.querySelector('.flight-app').dataset.panelZoom}),0);
    },{capture:true,passive:true});
  });
  const geometry = () => page.evaluate(measureGeometry);
  const settle = async () => {
    // ResizeObserver schedules a layout frame; inspect after three actual
    // rendering frames rather than treating viewport API completion as fit.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  };
  const filled = (g, label) => {
    singleTransform(g,label);
    assert(g.surface.y <= g.viewport.y + 1, `${label}: empty top strip ${g.surface.y - g.viewport.y}`);
    assert(g.surface.bottom >= g.viewport.bottom - 1, `${label}: empty bottom strip ${g.viewport.bottom - g.surface.bottom}`);
  };
  const fit = fittedGeometry;
  const resize = async (width, height, label) => {
    await page.setViewportSize({ width, height }); await settle();
    const g = await geometry(); observations.push({ label: `DPR${deviceScaleFactor} ${label}`, ...g }); if(g.deck.y < g.height * .6 - 1) sceneBudgetObservations.push({label, dpr: deviceScaleFactor, sceneHeight: g.deck.y, sixtyPercentHeight: g.height * .6}); assert.equal(g.dpr, deviceScaleFactor); fit(g, `DPR${deviceScaleFactor} ${label}`);
    if((width===812&&height===823)||(width===1624&&height===1646)) await page.screenshot({path:join(output, `panel-resize-${width}x${height}-dpr${deviceScaleFactor}.png`)}); return g;
  };
  // A continuous narrowing/widening sequence catches origin error accumulated
  // between nearby sizes, with exact neighbors of all relevant CSS breakpoints.
  const widths = [...new Set([1440, 1380, 1320, 1260, 1200, 1140, 1080, 1020, 960, 920, 901, 900, 899,
    881, 880, 879, 840, 780, 720, 660, 621, 620, 619, 560, 500, 440, 390])];
  for (const width of [...widths, ...widths.slice(0, -1).reverse()]) await resize(width, 900, `gradual ${width}x900`);
  checks.push('53 real gradual narrowing/widening sizes retain the actual DOM panel/window center across 900/880/620 breakpoints');
  for (const [width, height] of [[812, 823], [1624, 1646], [1440, 480], [1080, 600], [881, 480], [880, 700], [621, 600], [620, 844], [390, 844], [320, 568], [768, 1024], [1024, 768], [1440, 900]]) {
    await resize(width, height, `height/orientation ${width}x${height}`);
  }
  checks.push('short, tall and portrait windows keep both panel edges and actual control centers reachable');
  for (const [width, height, nextWidth, nextHeight] of [[1440, 900, 812, 823], [812, 823, 1624, 1646], [1440, 900, 1380, 900], [960, 800, 879, 800], [650, 844, 619, 844], [390, 844, 768, 1024]]) {
    const before = await resize(width, height, `pre-gesture ${width}x${height}`);
    await page.mouse.move(before.viewport.x + before.viewport.width * .7, before.viewport.y + before.viewport.height * .5);
    await page.mouse.wheel(0, -200); await settle(); await page.mouse.wheel(0, -200); await settle();
    const zoomed = await geometry(); assert(zoomed.zoom > 1.2, 'actual wheel gestures enlarge the panel before panning/resizing'); filled(zoomed, 'zoom before resize');
    // Real pointer drag on the same noninteractive heading the product exposes.
    const heading = await page.locator('.deck-heading').boundingBox();
    const x = heading.x + heading.width / 2, y = heading.y + heading.height / 2;
    const minX = Math.min(zoomed.viewport.x, zoomed.viewport.right - zoomed.surface.width);
    const maxX = Math.max(zoomed.viewport.x, zoomed.viewport.right - zoomed.surface.width);
    const dx = zoomed.surface.x > minX + 3 ? -Math.min(80, (zoomed.surface.x - minX) / 2) : Math.min(80, (maxX - zoomed.surface.x) / 2);
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y - 25, { steps: 4 }); await page.mouse.up(); await settle();
    const dragged = await geometry(); filled(dragged, 'drag before resize');
    assert(Math.abs(dragged.surface.x - zoomed.surface.x) > 2, 'the horizontal drag really displaced the surface before resizing');
    const reset = await resize(nextWidth, nextHeight, `zoom/pan reset ${nextWidth}x${nextHeight}`);
    gestures.push({ before, zoomed, dragged, reset });
  }
  for (const [width, height, nextWidth, nextHeight] of [[1440, 900, 812, 823], [812, 823, 619, 844]]) {
    const before = await resize(width, height, `pre-captured-drag ${width}x${height}`);
    await page.mouse.move(before.viewport.x + before.viewport.width / 2, before.viewport.y + before.viewport.height / 2);
    await page.mouse.wheel(0, -200); await settle();
    await page.evaluate(() => window.addEventListener('pointerdown', event => { window.resizePointer = event.pointerId; }, { once: true, capture: true }));
    const header = await page.locator('.deck-heading').boundingBox(), x = header.x + header.width / 2, y = header.y + header.height / 2;
    await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+35,y-20,{steps:3});
    assert(await page.locator('.flight-deck').evaluate(deck=>deck.hasPointerCapture(window.resizePointer)), 'real housing drag holds pointer capture before resize');
    const reset = await resize(nextWidth,nextHeight,`resize during captured drag ${nextWidth}x${nextHeight}`);
    assert(!await page.locator('.flight-deck').evaluate(deck=>deck.hasPointerCapture(window.resizePointer)), 'resize releases previous panel drag capture');
    await page.mouse.move(x+60,Math.max(1,y-30)); await page.mouse.up(); await settle();
    const after = await geometry();fit(after,'pointer movement after captured resize');
    assert(Math.abs(after.surface.x-reset.surface.x)<1&&Math.abs(after.surface.y-reset.surface.y)<1,'later pointer movement does not restore the old drag offset');
    gestures.push({ capturedResize:true, before, reset, after });
  }
  checks.push('actual zoom plus horizontal drag is discarded by resizing, including both responsive layout directions');
  for(const mode of ['clicked DG BUG','Tab to radio']) {
    const before=await resize(1440,900,`focus setup ${mode}`);
    const selector='#ap-heading-target';
    const control=await page.locator(selector).boundingBox();
    await page.mouse.move(control.x+control.width/2,control.y+control.height/2);await page.mouse.wheel(0,-200);await settle();
    const heading=await page.locator('.deck-heading').boundingBox();
    await page.mouse.move(heading.x+heading.width/2,heading.y+heading.height/2);await page.mouse.down();await page.mouse.move(heading.x+heading.width/2+(mode==='clicked DG BUG'?-70:100),heading.y+heading.height/2-15,{steps:3});await page.mouse.up();
    if(mode==='clicked DG BUG') {
      await page.locator('#ap-heading-target').click();await page.keyboard.press(process.platform==='darwin'?'Meta+A':'Control+A');await page.keyboard.type('66');await page.keyboard.press('Enter');
    } else {
      const far=await page.locator('#nav2-standby').boundingBox();
      const frameBox=await page.locator('.cockpit-viewport').boundingBox();
      assert(far.x+far.width>frameBox.x+frameBox.width+5,'far-right radio field starts genuinely beyond the clipped frame before native Tab navigation');
      await page.locator('#ap-heading-target').click();
      for(let step=0;step<60&&await page.evaluate(()=>document.activeElement?.id)!=='nav2-standby';step++) await page.keyboard.press('Tab');
    }
    const focused=await geometry();const focusId=mode==='clicked DG BUG'?'ap-heading-target':'nav2-standby';
    assert.equal(focused.focus,focusId,'real click/Tab reaches the intended native numeric field');
    gestures.push({focusCase:mode,before,focused});
    for(const [width,height] of [[1320,900],[1080,900],[940,900],[1624,1646],[812,823],[1440,900]]) {
      const after=await resize(width,height,`${mode} then resize ${width}x${height}`);
      if(mode==='clicked DG BUG'||[1320,1080,940,1624].includes(width)) assert.equal(after.focus,focusId,'inline native input keeps focus through fit');
    }
  }
  checks.push('clicked/typed DG BUG and native Tab into the far-right radio input retain centered fit through narrowing/widening, with scroll and visualViewport evidence');
  await page.screenshot({ path: join(output, `panel-resize-final-dpr${deviceScaleFactor}.png`) });
  wheelObservations.push({dpr:deviceScaleFactor,events:await page.evaluate(()=>window.resizeWheels)});
  await page.close();
  }
  for(const deviceScaleFactor of [1,2]) {
    for(const [width,height] of [[812,823],[390,844]]) {
      page=await browser.newPage({viewport:{width,height},deviceScaleFactor});
      page.on('pageerror',error=>errors.push(String(error)));
      await page.route(/^https?:/,route=>{network.push(route.request().url());return route.abort();});
      for(const phase of ['initial narrow load','full narrow reload']) {
        if(phase==='initial narrow load')await page.goto(pathToFileURL(html).href);else await page.reload();
        await page.waitForFunction(()=>window.fixtureReady&&document.querySelector('.flight-app').dataset.cockpitScale);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
        const g=await page.evaluate(measureGeometry);fittedGeometry(g,`${phase} DPR${deviceScaleFactor} ${width}x${height}`);
        initialLoadObservations.push({phase,...g});
      }
      await page.close();
    }
  }
  checks.push('fresh narrow-first loads and full reloads at 812x823/390x844 use CSS zoom 1 and one fitted transform at DPR1/2');
  const host=join(directory,'embedded-panel.html');
  await writeFile(host,`<!doctype html><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{position:absolute;left:23px;top:31px;width:calc(100% - 46px);height:calc(100% - 62px);border:0}</style><iframe id="panel-frame" title="Embedded cockpit layout fixture" src="${pathToFileURL(html).href}"></iframe>`);
  for(const deviceScaleFactor of [1,2]) {
    page=await browser.newPage({viewport:{width:858,height:885},deviceScaleFactor});
    page.on('pageerror',error=>errors.push(String(error)));
    await page.route(/^https?:/,route=>{network.push(route.request().url());return route.abort();});
    await page.goto(pathToFileURL(host).href);
    for(const [width,height] of [[858,885],[436,906],[1300,900]]) {
      await page.setViewportSize({width,height});
      let child=await(await page.locator('#panel-frame').elementHandle()).contentFrame();assert(child);
      await child.waitForFunction(()=>window.fixtureReady&&document.querySelector('.flight-app').dataset.cockpitScale);
      await child.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
      const before=await child.evaluate(measureGeometry);fittedGeometry(before,`offset iframe DPR${deviceScaleFactor} ${width-46}x${height-62}`);
      assert.equal(before.width,width-46);assert.equal(before.height,height-62);
      const record={hostWidth:width,hostHeight:height,dpr:deviceScaleFactor,before};
      if(width===858) {
        const frameBox=await page.locator('#panel-frame').boundingBox(),control=await child.locator('#ap-heading-target').boundingBox();
        const pointer={x:control.x+control.width/2,y:control.y+control.height/2};
        const u=(pointer.x-frameBox.x-before.surface.x)/before.surface.width,v=(pointer.y-frameBox.y-before.surface.y)/before.surface.height;
        await page.mouse.move(pointer.x,pointer.y);await page.mouse.wheel(0,-160);
        await child.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const after=await child.evaluate(measureGeometry);singleTransform(after,'iframe pointer zoom');
        assert(after.zoom>1,'real wheel magnifies the child panel');
        assert(after.surface.y<=after.viewport.y+1&&after.surface.bottom>=after.viewport.bottom-1,'iframe zoom covers the vertical frame');
        const error={x:frameBox.x+after.surface.x+u*after.surface.width-pointer.x,y:frameBox.y+after.surface.y+v*after.surface.height-pointer.y};
        const clampedX=Math.abs(after.surface.x-after.viewport.x)<1||Math.abs(after.surface.right-after.viewport.right)<1;
        const clampedY=Math.abs(after.surface.y-after.viewport.y)<1||Math.abs(after.surface.bottom-after.viewport.bottom)<1;
        assert(Math.abs(error.x)<1||clampedX,'iframe screen offset does not change pointer anchoring except at a clamp');
        assert(Math.abs(error.y)<1||clampedY,'iframe screen offset does not change vertical anchoring except at a clamp');
        record.zoom={after,error};
        await page.reload();child=await(await page.locator('#panel-frame').elementHandle()).contentFrame();
        await child.waitForFunction(()=>window.fixtureReady&&document.querySelector('.flight-app').dataset.cockpitScale);
        await child.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
        record.reloaded=await child.evaluate(measureGeometry);fittedGeometry(record.reloaded,'full offset iframe reload');
        await page.screenshot({path:join(output,`panel-resize-iframe-dpr${deviceScaleFactor}.png`)});
      }
      embeddedObservations.push(record);
    }
    await page.close();
  }
  checks.push('nonzero-offset iframe initial load, full reload, pointer zoom and responsive resize retain the single screen-pixel transform; actual VS Code engine remains untested');
  assert.deepEqual(errors, []); assert.deepEqual(network, [], 'standalone DOM fixture requests no network resources');
  result = 'pass';
} catch (error) {
  failure = String(error);
  if(page&&!page.isClosed()) wheelObservations.push({failure:true,events:await page.evaluate(()=>window.resizeWheels??[]).catch(()=>[])});
  if (page && !page.isClosed()) await page.screenshot({ path: join(output, 'panel-resize-failure.png') }).catch(() => {});
} finally {
  await browser?.close(); await rm(directory, { recursive: true, force: true });
  await writeFile(join(output, 'panel-resize-browser.json'), JSON.stringify({ result, error: failure, browser: browser?.version(),
    fixture: 'Standalone local file, current main cockpit markup and production component/CSS/controller bundle; no JSBSim, scenery or HTTP server',
    sourceHashes, checks, observations, gestures, sceneBudgetObservations, wheelObservations, initialLoadObservations, embeddedObservations, errors, network }, null, 2));
}
if (failure) throw Error(failure);
console.log(JSON.stringify({ result, checks, sizes: observations.length, gestures: gestures.length }, null, 2));
