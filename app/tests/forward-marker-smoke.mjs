// Actual Cesium projection and fixed-step physics invariance for the body-forward cue.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5185';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
await access(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url));
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['--input-type=module', '-e', `import {createServer} from 'vite';
const s=await createServer({server:{host:'127.0.0.1',port:5185,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverLog='', browser;
server.stdout.on('data', c=>serverLog+=c); server.stderr.on('data', c=>serverLog+=c);
const checks=[], observations={};
try {
  for(let n=0;n<100;n++) {
    if(server.exitCode!==null) throw Error(serverLog);
    try { if(serverLog.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    await new Promise(r=>setTimeout(r,100));
  }
  browser=await chromium.launch({headless:true,...(process.env.CHROME?{executablePath:process.env.CHROME}:{channel:'chrome'})});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{
    const Native=window.Worker; window.__forwardStats=[]; window.__forwardStates=[];
    window.Worker=class extends Native {
      constructor(...args) { super(...args); if(!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__forwardWorker=this;this.addEventListener('message',e=>{
          if(e.data?.type==='stats') window.__forwardStats.push(e.data);
          if(e.data?.type==='state') window.__forwardStates.push(e.data);
        });
      }
    };
  });
  await page.goto(origin); await page.waitForFunction(()=>!document.querySelector('#start').disabled);
  await page.locator('#start').click(); await page.waitForFunction(()=>window.__forwardStates.at(-1)?.step>10);
  // Pull the nose up briefly so the recorded trace holds distinctly different attitudes.
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(900); await page.keyboard.up('ArrowDown'); await page.waitForTimeout(300);
  await page.locator('#pause').click(); await page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused');
  const stats=async()=>{const count=await page.evaluate(()=>window.__forwardStats.length);await page.evaluate(()=>window.__forwardWorker.postMessage({type:'stats'}));await page.waitForFunction(n=>window.__forwardStats.length>n,count);return page.evaluate(()=>window.__forwardStats.at(-1));};
  const baseline=await stats();
  const marker=()=>page.locator('#aircraft-forward-marker').evaluate(e=>({hidden:e.hidden,x:Number(e.dataset.xPx),y:Number(e.dataset.yPx),clipped:e.dataset.clipped==='true',pointer:getComputedStyle(e).pointerEvents}));
  const begin=async()=>{await page.mouse.move(1050,200);await page.mouse.down();await page.waitForTimeout(300);};
  await begin(); await page.mouse.move(1050,165); await page.waitForTimeout(70);
  const front=await marker(); assert(!front.hidden && !front.clipped); assert(Math.abs(front.x-720)<2);
  await page.screenshot({path:`${output}/forward-marker-centered.png`});
  await page.mouse.move(1100,165); await page.waitForTimeout(70);const right=await marker();assert(right.x<front.x-100);
  await page.screenshot({path:`${output}/forward-marker-looking-right.png`});
  await page.mouse.move(1000,165); await page.waitForTimeout(70);const left=await marker();assert(left.x>front.x+100);
  assert.equal(left.pointer,'none'); observations.look={front,right,left};
  checks.push('crosshair follows actual body-forward direction opposite horizontal look');
  await page.mouse.move(1300,165);await page.waitForTimeout(70);const edge=await marker();assert(!edge.hidden && edge.clipped);
  await page.mouse.move(1500,165);await page.waitForTimeout(70);assert((await marker()).hidden);
  await page.mouse.up();await page.waitForTimeout(70);assert(!(await marker()).hidden);
  checks.push('offscreen front uses bounded edge cue; behind-camera direction hides; release restores live look');
  const afterLook=await stats();assert.equal(afterLook.step,baseline.step);assert.equal(afterLook.digest,baseline.digest);assert.deepEqual(afterLook.final_state,baseline.final_state);
  checks.push('look and projection leave paused engine state and digest unchanged');
  await page.locator('#review-flight').click(); await page.waitForFunction(()=>document.querySelector('#status').textContent==='Review');
  await begin();await page.mouse.move(1100,165);await page.mouse.up();await page.waitForTimeout(70);const review=await marker();
  await page.waitForTimeout(100);assert.deepEqual(await marker(),review);
  await page.locator('#review-time').focus();await page.keyboard.press('Home');await page.waitForTimeout(70);const sought=await marker();assert.equal(sought.hidden,review.hidden);assert.equal(sought.clipped,review.clipped);assert(Math.abs(sought.x-review.x)<.02&&Math.abs(sought.y-review.y)<.02);
  const frozen=await stats();assert.equal(frozen.step,baseline.step);assert.equal(frozen.digest,baseline.digest);assert.deepEqual(frozen.final_state,baseline.final_state);
  checks.push('persistent recorded inspection and seeking retain projected marker without live physics');
  await page.locator('#scene').focus();await page.keyboard.press('Escape');await page.waitForTimeout(70);
  // F31: the cue must be recomputed from each recorded attitude. In chase view the
  // camera follows heading only, so a recorded pitch change must move the marker
  // vertically in the same sense, and seeking back must reproduce the first position.
  await page.locator('#view-menu > summary').click();await page.locator('#chase').click();
  const recordedPitch=await page.evaluate(()=>{const states=window.__forwardStates.filter(s=>Number.isFinite(s.pitch_rad));return {first:states[0].pitch_rad,last:states.at(-1).pitch_rad};});
  assert(Math.abs(recordedPitch.last-recordedPitch.first)>0.02,`trace attitude differs: ${JSON.stringify(recordedPitch)}`);
  await page.locator('#review-time').focus();
  await page.keyboard.press('Home');await page.waitForTimeout(100);const startCue=await marker();
  await page.keyboard.press('End');await page.waitForTimeout(100);const endCue=await marker();
  await page.keyboard.press('Home');await page.waitForTimeout(100);const startAgain=await marker();
  assert(!startCue.hidden&&!endCue.hidden,'recorded forward cue visible in chase review');
  assert(Math.abs(endCue.y-startCue.y)>2,'different recorded attitude moves the cue');
  assert.equal(Math.sign(startCue.y-endCue.y),Math.sign(recordedPitch.last-recordedPitch.first),'nose-up recorded pitch raises the cue');
  assert(Math.abs(startAgain.x-startCue.x)<.02&&Math.abs(startAgain.y-startCue.y)<.02,'seeking back recomputes the same recorded cue');
  observations.recordedAttitude={recordedPitch,startCue,endCue};
  checks.push('review cue recomputes from recorded attitude (chase pitch direction and seek reproducibility)');
  await page.locator('#view-menu > summary').click();await page.locator('#cockpit').click();
  await page.locator('#scene').focus();await page.keyboard.press('Escape');await page.waitForTimeout(70);
  await begin();await page.mouse.move(1100,165);await page.mouse.up();await page.waitForTimeout(70);const wide=await marker();
  await page.mouse.move(1100,160);await page.mouse.wheel(0,100);await page.waitForTimeout(100);const wider=await marker();assert(Math.abs(wider.x-720)<Math.abs(wide.x-720));
  await page.locator('#view-menu > summary').click();await page.locator('#chase').click();await page.waitForTimeout(70);const chase=await marker();assert(!chase.hidden && Number.isFinite(chase.x));
  await page.setViewportSize({width:1200,height:800});await page.waitForTimeout(120);const resized=await marker();assert(!resized.hidden&&resized.x>=0&&resized.x<=1200);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(120);const mobile=await marker();assert(!mobile.hidden && mobile.x>=0 && mobile.x<=390);
  observations.projection={wide,wider,chase,resized,mobile};
  checks.push('FOV, view and viewport changes recompute actual projection');
  assert.deepEqual(errors,[]); await page.screenshot({path:`${output}/forward-marker-mobile.png`});
  await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(100);await page.screenshot({path:`${output}/forward-marker-wide.png`});
  const evidence={result:'pass',browser:browser.version(),checks,observations};await writeFile(`${output}/forward-marker-browser.json`,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
} finally {await browser?.close();server.kill('SIGTERM');}
