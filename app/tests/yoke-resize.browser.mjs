// R-INPUT-1/R-SIM-11: real app, worker and native engine; map/photo pixels are fixtures.
// This checks commanded inputs, not hands-off aircraft stability or C172S fidelity.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {installSceneryFixture,prepareFlightUI,startOrResume} from './flight-actions.mjs';
const app=fileURLToPath(new URL('..',import.meta.url)),output=fileURLToPath(new URL('../../output/flight/',import.meta.url)),origin='http://127.0.0.1:5378';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourcePaths=['src/main.ts','src/pilot-controls.ts','src/control-settings.ts','src/pointer-yoke.ts','src/session.ts','../studies/e1-browser/sim/dist/jsbsim.wasm'];
const hashes=async()=>Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,hash(await readFile(new URL('../'+p,import.meta.url)))])));
const result={scope:'Centered pointer resize pickup at SIM1; actual app/Worker/native engine; synthetic scenery only',checks:[],observations:[],errors:[],sourceHashesBefore:await hashes()};
const server=spawn(process.execPath,['--input-type=module','-e',`import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/yoke-resize-vite',server:{host:'127.0.0.1',port:5378,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],{cwd:app,stdio:'pipe'});
let log='',browser,page;server.stdout.on('data',data=>{log+=data});server.stderr.on('data',data=>{log+=data});
try{
 await mkdir(output,{recursive:true});
 for(let i=0;i<100&&!log.includes('Local:');i++)await new Promise(resolve=>setTimeout(resolve,100));assert(log.includes('Local:'),log);
 browser=await chromium.launch({headless:true,...(process.env.CHROME?{executablePath:process.env.CHROME}:{channel:'chrome'})});result.browser=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});page=await context.newPage();page.on('pageerror',error=>result.errors.push(String(error)));
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch(),source=await response.text(),marker='session.input(controls);';assert.equal(source.split(marker).length,2);await route.fulfill({response,body:source.replace(marker,marker+' window.neutralCandidate=structuredClone(controls);')});});
 await page.addInitScript(()=>{const Native=Worker;window.neutralCommands=[];window.neutralState=null;window.Worker=class extends Native{constructor(...args){super(...args);if(String(args[0]).includes('/sim/worker.js'))this.addEventListener('message',({data})=>{if(data.type==='state')window.neutralState=data;});}postMessage(message,...args){if(message?.type==='input'||message?.type==='init')window.neutralCommands.push(structuredClone(message));return super.postMessage(message,...args);}};});
 await installSceneryFixture(page);await page.goto(origin);await page.waitForFunction(()=>window.neutralState&&!document.querySelector('#start').disabled,null,{timeout:60000});
 const observe=async label=>{const row=await page.evaluate(label=>({label,state:window.neutralState,candidate:window.neutralCandidate,lastInput:[...window.neutralCommands].reverse().find(m=>m.type==='input'),rollSlider:document.querySelector('#roll-offset').value,offsetLabel:document.querySelector('#offset-value').textContent,visibleCommand:document.querySelector('#roll-control').textContent,pointerMode:document.querySelector('#scene').dataset.pointerMode}),label);result.observations.push(row);return row;};
 const waitAxis=async (axis,value)=>page.waitForFunction(({axis,value})=>Math.abs(window.neutralState?.[axis+'_cmd_norm']-value)<1e-10,{axis,value});
 const axes=row=>({aileron:row.lastInput.aileron,elevator:row.lastInput.elevator,rudder:row.lastInput.rudder});
 await observe('fresh ready paused');await startOrResume(page);await page.waitForFunction(()=>window.neutralState?.t_s>.3);const first=await observe('fresh SIM1 first live input');
 assert.equal(first.state.simulation_rate,1);const firstInput=await page.evaluate(()=>window.neutralCommands.find(m=>m.type==='input'));result.firstInput=firstInput;
 assert.deepEqual({aileron:firstInput.aileron,elevator:firstInput.elevator,rudder:firstInput.rudder},{aileron:0,elevator:0,rudder:0},'fresh manual flight must not send a hidden fixed control bias');
 assert.deepEqual(axes(first),{aileron:0,elevator:0,rudder:0});assert.equal(first.rollSlider,'0');assert.match(first.offsetLabel,/^0(?:\.0+)?% off/);await waitAxis('aileron',0);
 result.checks.push('fresh first worker input and native command telemetry are neutral at SIM1; offset slider/readout agree');
 const rect=await page.locator('#scene').boundingBox(),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;result.sceneRect={...rect,cx,cy};
 await page.mouse.click(cx,cy);await page.mouse.move(cx+15,cy);await page.waitForTimeout(150);const pointer=await observe('pointer 15 CSS pixels right');assert(Math.abs(pointer.lastInput.aileron-.05)<.004);assert.equal(pointer.lastInput.rudder,0);
 await page.mouse.move(cx,cy);await page.waitForTimeout(150);const centered=await observe('pointer returned to center');assert(Math.abs(centered.lastInput.aileron)<.004);assert(Math.abs(centered.lastInput.elevator)<.004);
 await page.mouse.move(rect.x-1,rect.y+40);await waitAxis('aileron',0);const outside=await observe('pointer leaves scene');assert.deepEqual(axes(outside),{aileron:0,elevator:0,rudder:0});
 await page.locator('#scene').focus();await page.keyboard.down('ArrowRight');await waitAxis('aileron',.45);await observe('right arrow held');await page.keyboard.up('ArrowRight');await waitAxis('aileron',0);const released=await observe('right arrow released');assert.deepEqual(axes(released),{aileron:0,elevator:0,rudder:0});
 result.checks.push('pointer position maps predictably; center/exit and keyboard release deliver neutral commands');
 await page.mouse.click(cx,cy);await page.mouse.click(cx,cy);await page.mouse.move(cx,cy);
 await page.keyboard.down('ArrowRight');await waitAxis('aileron',.45);
 await page.setViewportSize({width:1100,height:900});
 await page.waitForFunction(()=>document.querySelector('#yoke-center-marker').classList.contains('needs-center'));
 await waitAxis('aileron',.45);
 await page.keyboard.up('ArrowRight');await waitAxis('aileron',0);
 await page.mouse.move(cx+1,cy);await page.waitForTimeout(150);
 const shifted=await observe('1px near former center after resize');assert.deepEqual(axes(shifted),{aileron:0,elevator:0,rudder:0});
 assert.match(await page.locator('#pointer-mode').textContent(),/move pointer to the center ring/);
 const current=await page.locator('#scene').boundingBox(),nx=current.x+current.width/2,ny=current.y+current.height/2;
 const marker=await page.locator('#yoke-center-marker').boundingBox();assert(Math.abs(marker.x+marker.width/2-nx)<1);assert(Math.abs(marker.y+marker.height/2-ny)<1);
 await page.mouse.move(nx,ny);await page.waitForFunction(()=>!document.querySelector('#yoke-center-marker').classList.contains('needs-center'));await waitAxis('aileron',0);
 await page.mouse.move(nx+15,ny);await page.waitForTimeout(150);const picked=await observe('15px after pickup');assert(Math.abs(picked.lastInput.aileron-.05)<.004);
 await page.mouse.move(nx,ny);await waitAxis('aileron',0);
 result.checks.push('resize keeps marker at live center, neutralizes pointer until pickup, preserves held keyboard, and restores ordinary gain afterward');
 result.commands=await page.evaluate(()=>window.neutralCommands);result.sourceHashesAfter=await hashes();assert.deepEqual(result.sourceHashesAfter,result.sourceHashesBefore);assert.deepEqual(result.errors,[]);result.result='pass';console.log(JSON.stringify({result:result.result,browser:result.browser,checks:result.checks},null,2));
}catch(error){result.result='fail';result.failure=String(error);throw error;}
finally{if(page){result.commands??=await page.evaluate(()=>window.neutralCommands).catch(()=>[]);await page.screenshot({path:output+'/yoke-resize-browser.png'}).catch(()=>{});}result.sourceHashesAfter??=await hashes();await writeFile(output+'/yoke-resize-browser.json',JSON.stringify(result,null,2)+'\n');await browser?.close();server.kill('SIGTERM');}
