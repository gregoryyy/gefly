// R-INPUT-1/R-SIM-11: real app, worker and native engine; map/photo pixels are fixtures.
// This checks commanded inputs, not hands-off aircraft stability or C172S fidelity.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {installSceneryFixture,prepareFlightUI,startOrResume} from './flight-actions.mjs';
const app=fileURLToPath(new URL('..',import.meta.url)),output=fileURLToPath(new URL('../../output/flight/',import.meta.url)),origin='http://127.0.0.1:5379';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourcePaths=['../studies/e1-browser/sim/worker.js','../studies/e1-browser/sim/initial-balance.js','src/main.ts','src/pilot-controls.ts','src/control-settings.ts','src/pointer-yoke.ts','src/session.ts','../studies/e1-browser/sim/dist/jsbsim.wasm'];
const hashes=async()=>Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,hash(await readFile(new URL('../'+p,import.meta.url)))])));
const result={scope:'Generic model initial equilibrium atSIM1, actualapp/Worker/newWASM, scenery-onlyfixtures; no aircraftfidelity claim',checks:[],observations:[],errors:[],sourceHashesBefore:await hashes()};
const server=spawn(process.execPath,['--input-type=module','-e',`import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/initial-balance-vite',server:{host:'127.0.0.1',port:5379,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],{cwd:app,stdio:'pipe'});
let log='',browser,page;server.stdout.on('data',data=>{log+=data});server.stderr.on('data',data=>{log+=data});
try{
 await mkdir(output,{recursive:true});
 for(let i=0;i<100&&!log.includes('Local:');i++)await new Promise(resolve=>setTimeout(resolve,100));assert(log.includes('Local:'),log);
 browser=await chromium.launch({headless:true,...(process.env.CHROME?{executablePath:process.env.CHROME}:{channel:'chrome'})});result.browser=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});page=await context.newPage();page.on('pageerror',error=>result.errors.push(String(error)));
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch(),source=await response.text(),marker='session.input(controls);';assert.equal(source.split(marker).length,2);await route.fulfill({response,body:source.replace(marker,marker+' window.neutralCandidate=structuredClone(controls);')});});
 await page.addInitScript(()=>{const Native=Worker;window.neutralCommands=[];window.neutralState=null;window.balanceStates=[];window.Worker=class extends Native{constructor(...args){super(...args);if(String(args[0]).includes('/sim/worker.js'))this.addEventListener('message',({data})=>{if(data.type==='state'){window.neutralState=data;window.balanceStates.push(data);}});}postMessage(message,...args){if(message?.type==='input'||message?.type==='init')window.neutralCommands.push(structuredClone(message));return super.postMessage(message,...args);}};});
 await installSceneryFixture(page);await page.goto(origin);await page.waitForFunction(()=>window.neutralState&&!document.querySelector('#start').disabled,null,{timeout:60000});
 const observe=async label=>{const row=await page.evaluate(label=>({label,state:window.neutralState,candidate:window.neutralCandidate,lastInput:[...window.neutralCommands].reverse().find(m=>m.type==='input'),rollSlider:document.querySelector('#roll-offset').value,offsetLabel:document.querySelector('#offset-value').textContent,visibleCommand:document.querySelector('#roll-control').textContent,pointerMode:document.querySelector('#scene').dataset.pointerMode}),label);result.observations.push(row);return row;};
 const waitAxis=async (axis,value)=>page.waitForFunction(({axis,value})=>Math.abs(window.neutralState?.[axis+'_cmd_norm']-value)<1e-10,{axis,value});
 const axes=row=>({aileron:row.lastInput.aileron,elevator:row.lastInput.elevator,rudder:row.lastInput.rudder});
 await observe('fresh ready paused');await startOrResume(page);await page.waitForFunction(()=>window.neutralState?.t_s>.3);const first=await observe('fresh SIM1 first live input');
 assert.equal(first.state.simulation_rate,1);const firstInput=await page.evaluate(()=>window.neutralCommands.find(m=>m.type==='input'));result.firstInput=firstInput;
 assert.deepEqual({aileron:firstInput.aileron,elevator:firstInput.elevator,rudder:firstInput.rudder},{aileron:0,elevator:0,rudder:0},'fresh manual flight must not send a hidden fixed control bias');
 assert.deepEqual(axes(first),{aileron:0,elevator:0,rudder:0});assert.equal(first.rollSlider,'0');assert.match(first.offsetLabel,/^0(?:\.0+)?% off/);await waitAxis('aileron',0);
 result.checks.push('fresh first worker input and native command telemetry are neutral at SIM1; offset slider/readout agree');
 assert.equal(first.state.initial_balance_profile,1);assert.equal(first.state.kap_engaged,0);
 const identity=state=>[state.initial_balance_profile,state.roll_trim_norm,state.yaw_trim_norm];
 const fixed=identity(first.state);assert(fixed.slice(1).every(Number.isFinite));
 await page.waitForFunction(()=>window.neutralState.t_s>=30,null,{timeout:45000});
 const stable=await observe('neutral manual flight at30seconds');
 const samples=await page.evaluate(()=>window.balanceStates.filter(s=>s.t_s>0&&s.t_s<=30));
 assert(samples.length>500);assert(samples.every(s=>s.aileron_cmd_norm===0&&s.rudder_cmd_norm===0&&s.elevator_cmd_norm===0));
 assert(samples.every(s=>JSON.stringify(identity(s))===JSON.stringify(fixed)));
 const bankChange=(stable.state.roll_rad-first.state.roll_rad)*180/Math.PI;
 assert(Math.abs(bankChange)<1,`30s initial-equilibrium regression budget1degree; got${bankChange}`);
 result.neutralFlight={samples:samples.length,bankChange_deg:bankChange,initial:first.state,after:stable.state};
 assert(await page.locator('#initial-balance-status').isVisible());assert.match(await page.locator('#initial-balance-status').getAttribute('title'),/No continuous wings-level assistance/);
 result.checks.push('fresh airborne model balance is visible and stable for30s atSIM1 with all external axes zero; fixed trim identity remains unchanged');
 await page.locator('#scene').focus();await page.keyboard.press('a');await page.waitForFunction(()=>window.neutralState.kap_engaged===1);
 await page.keyboard.down('c');await page.waitForFunction(()=>window.neutralState.kap_cws===1);
 await page.keyboard.up('c');await page.waitForFunction(()=>window.neutralState.kap_cws===0);
 await page.keyboard.press('a');await page.waitForFunction(()=>window.neutralState.kap_engaged===0);
 assert.deepEqual(identity((await observe('afterAP/CWS/disconnect')).state),fixed);
 result.checks.push('AP engagement, heldCWS, release and disconnect preserve model balance separately from pilot controls');
 await page.reload();await page.waitForFunction(()=>window.neutralState?.initial_balance_profile===1&&!document.querySelector('#start').disabled,null,{timeout:60000});
 await observe('saved-location reload re-solves fresh airborne balance');
 result.checks.push('reload retains the requested profile and freshly initializes balanced airborne flight');
 result.commands=await page.evaluate(()=>window.neutralCommands);result.sourceHashesAfter=await hashes();assert.deepEqual(result.sourceHashesAfter,result.sourceHashesBefore);assert.deepEqual(result.errors,[]);result.result='pass';console.log(JSON.stringify({result:result.result,browser:result.browser,checks:result.checks},null,2));
}catch(error){result.result='fail';result.failure=String(error);throw error;}
finally{if(page){result.commands??=await page.evaluate(()=>window.neutralCommands).catch(()=>[]);await page.screenshot({path:output+'/initial-balance-browser.png'}).catch(()=>{});}result.sourceHashesAfter??=await hashes();await writeFile(output+'/initial-balance-browser.json',JSON.stringify(result,null,2)+'\n');await browser?.close();server.kill('SIGTERM');}
