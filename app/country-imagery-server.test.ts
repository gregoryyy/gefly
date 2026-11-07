import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCountryImageryMiddleware } from './country-imagery-server.ts';

class ResponseMock extends EventEmitter {
  status = 0; headers: Record<string,string|number> = {}; body = Buffer.alloc(0); destroyed = false; headersSent = false;
  resolve!: () => void; finished = new Promise<void>(resolve => { this.resolve=resolve; });
  writeHead(status: number, headers: Record<string,string|number> = {}) { this.status=status;this.headers=headers;this.headersSent=true;return this; }
  end(body?: Buffer) { this.body=body ?? Buffer.alloc(0);this.resolve();this.emit('close');return this; }
}
function request(mw: ReturnType<typeof createCountryImageryMiddleware>, url: string, method='GET') {
  const res = new ResponseMock();
  mw({url,method,headers:{}} as never,res as never,()=>{res.writeHead(599).end();});
  return res;
}
function image(kind:'PNG'|'JPEG',size=256):Buffer {
  const r=spawnSync('python3',['-c',`from PIL import Image; import io,sys; s=io.BytesIO(); Image.new('RGB',(${size},${size}),(255,255,255)).save(s,'${kind}'); sys.stdout.buffer.write(s.getvalue())`]);
  assert.equal(r.status,0,String(r.stderr));return r.stdout;
}
function inspect(bytes:Buffer): {size:number[];alpha:number[];pixel:number[]} {
  const r=spawnSync('python3',['-c',"from PIL import Image; import io,json,sys; im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGBA');print(json.dumps({'size':im.size,'alpha':im.getchannel('A').getextrema(),'pixel':im.getpixel((128,128))}))"],{input:bytes});
  assert.equal(r.status,0,String(r.stderr));return JSON.parse(r.stdout.toString());
}
const endpoint=(country:string,z:number,x:number,y:number)=>`/scenery/photo-country/${country}/${z}/${x}/${y}.png`;
function tile(lat:number,lon:number,z=14):[number,number,number] {
  const n=2**z; return [z,Math.floor((lon+180)/360*n),Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n)];
}

test('German state WMS sources use fixed Web Mercator tile bounds and preserve source alpha',async()=>{
  const png=spawnSync('python3',['-c',"from PIL import Image; import io,sys; im=Image.new('RGBA',(256,256),(0,0,0,0)); im.putpixel((128,128),(5,6,7,255)); s=io.BytesIO(); im.save(s,'PNG'); sys.stdout.buffer.write(s.getvalue())"]);assert.equal(png.status,0);
  const urls:URL[]=[]; const mw=createCountryImageryMiddleware({fetcher:async input=>{urls.push(new URL(String(input)));return new Response(png.stdout,{headers:{'content-type':'image/png'}});}});
  for(const [id,lat,lon] of [['nrw',51.22,6.78],['bb',52.52,13.40]] as const) {
    const [z,x,y]=tile(lat,lon),r=request(mw,endpoint(id,z,x,y));await r.finished;assert.equal(r.status,200);assert.equal(r.headers['X-Scenery-Empty'],'0');assert.deepEqual(inspect(r.body).alpha,[0,255]);assert.deepEqual(inspect(r.body).pixel,[5,6,7,255]);
    const url=urls.at(-1)!;assert.equal(url.host,id==='nrw'?'www.wms.nrw.de':'isk.geobasis-bb.de');
    assert.equal(url.searchParams.get('LAYERS'),id==='nrw'?'nw_dop_rgb':'bebb_dop20c');assert.equal(url.searchParams.get('SRS'),'EPSG:3857');
    assert.equal(url.searchParams.get('TRANSPARENT'),'TRUE');assert.equal(url.searchParams.get('FORMAT'),'image/png');
    const box=url.searchParams.get('BBOX')!.split(',').map(Number);
    assert.equal(box.length,4); assert(box[0]<box[2] && box[1]<box[3]);assert(Math.abs((box[2]-box[0])-40075016.68557849/2**z)<1e-6);
  }
  const outside=request(mw,endpoint('nrw',...tile(52.52,13.4)));await outside.finished;assert.equal(outside.status,200);assert.equal(outside.headers['X-Scenery-Empty'],'1');assert.equal(urls.length,2);
  const bad=request(mw,'/scenery/photo-country/nrw/14/1/2.png?host=evil');await bad.finished;assert.equal(bad.status,404);
  mw.dispose();
});

test('German state source failures remain isolated and do not cache invalid responses',async()=>{
  let nrw=0,bb=0;const png=image('PNG');
  const mw=createCountryImageryMiddleware({fetcher:async input=>{if(String(input).includes('wms.nrw.de')){nrw++;return new Response(null,{status:503});}bb++;return new Response(png,{headers:{'content-type':'image/png'}});}});
  const [z,x,y]=tile(51.22,6.78);for(let i=0;i<3;i++){const r=request(mw,endpoint('nrw',z,x+i,y));await r.finished;assert.equal(r.status,502);}
  const blocked=request(mw,endpoint('nrw',z,x+3,y));await blocked.finished;assert.equal(blocked.status,503);assert.equal(nrw,3);
  const other=request(mw,endpoint('bb',...tile(52.52,13.4)));await other.finished;assert.equal(other.status,200);assert.equal(bb,1);mw.dispose();
});

test('Berlin Brandenburg service layer bbox is admitted at each edge',async()=>{
  let calls=0;const png=image('PNG');const mw=createCountryImageryMiddleware({fetcher:async()=>{calls++;return new Response(png,{headers:{'content-type':'image/png'}});}});
  for(const [lat,lon] of [[52,11.2291258],[52,14.7701928],[51.3063097,13],[53.5726199,13]]) {
    const r=request(mw,endpoint('bb',...tile(lat,lon,20)));await r.finished;assert.equal(r.status,200);assert.equal(r.headers['X-Scenery-Empty'],'0');
  }
  assert.equal(calls,4);mw.dispose();
});

test('NRW service layer bbox is admitted at each edge',async()=>{
  let calls=0;const png=image('PNG');const mw=createCountryImageryMiddleware({fetcher:async()=>{calls++;return new Response(png,{headers:{'content-type':'image/png'}});}});
  for(const [lat,lon] of [[51,5.593338],[51,9.741582],[50.057798,7],[52.799797,7]]) {
    const r=request(mw,endpoint('nrw',...tile(lat,lon,20)));await r.finished;assert.equal(r.status,200);assert.equal(r.headers['X-Scenery-Empty'],'0');
  }
  assert.equal(calls,4);mw.dispose();
});

test('country tile routes are fixed, low zoom and outside coverage decode as transparent',async()=>{
  let calls=0; const mw=createCountryImageryMiddleware({fetcher:async()=>{calls++;throw Error('unexpected');}});
  for(const url of [endpoint('ch',0,0,0),endpoint('at',6,32,22),endpoint('at',14,8000,5500)]) {
    const r=request(mw,url);await r.finished;assert.equal(r.status,200);assert.equal(r.headers['X-Scenery-Empty'],'1');assert.deepEqual(inspect(r.body).alpha,[0,0]);
  }
  for(const url of ['/scenery/photo-country/us/9/1/2.png','/scenery/photo-country/ch/21/1/2.png','/scenery/photo-country/ch/9/512/2.png','/scenery/photo-country/ch/09/1/2.png','/scenery/photo-country/ch/9/1/2.png?url=https://evil.test','/scenery/photo-country/ch/9/1/../../2.png']) {
    const r=request(mw,url);await r.finished;assert.equal(r.status,404,url);
  }
  const post=request(mw,endpoint('ch',9,266,180),'POST');await post.finished;assert.equal(post.status,404);assert.equal(calls,0);mw.dispose();
});

test('Swiss PNG and Austrian JPEG use correct fixed URLs, validate/decode and cache',async()=>{
  const urls:string[]=[];const ch=image('PNG'),at=image('JPEG');
  const mw=createCountryImageryMiddleware({fetcher:async (input)=>{const url=String(input);urls.push(url);return new Response(url.includes('swissimage')?ch:at,{headers:{'content-type':url.includes('swissimage')?'image/png':'image/jpeg'}});}});
  for(const [country,z,x,y] of [['ch',10,536,358],['at',14,8937,5681]] as const){
    const r=request(mw,endpoint(country,z,x,y));await r.finished;assert.equal(r.status,200);assert.equal(r.headers['X-Scenery-Empty'],'0');assert.deepEqual(inspect(r.body).size,[256,256]);
    if(country==='at') assert.deepEqual(inspect(r.body).pixel,[255,255,255,255], 'white snow is not keyed out');
    const cached=request(mw,endpoint(country,z,x,y));await cached.finished;assert.equal(cached.status,200);
  }
  assert.deepEqual(urls,['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage-product/default/current/3857/10/536/358.png','https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/14/5681/8937.jpeg']);mw.dispose();
});

test('Austrian border mask excludes outside and bounds high-zoom processing',async()=>{
  const body=image('JPEG');const mw=createCountryImageryMiddleware({fetcher:async()=>new Response(body,{headers:{'content-type':'image/jpeg'}})});
  const outside=request(mw,endpoint('at',14,8783,5720));await outside.finished;assert.equal(outside.status,200);assert.equal(outside.headers['X-Scenery-Empty'],'1');assert.deepEqual(inspect(outside.body).alpha,[0,0]);
  const polygon=JSON.parse(readFileSync(new URL('../utils/scenery/austria-ne-10m.geojson',import.meta.url),'utf8'));
  const [lon,lat]=polygon.coordinates[0][0];const z=20,n=2**z,x=Math.floor((lon+180)/360*n),y=Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n);
  const start=Date.now(), edge=request(mw,endpoint('at',z,x,y));await edge.finished;assert.equal(edge.status,200);assert.deepEqual(inspect(edge.body).alpha,[0,0]);assert(Date.now()-start<20000,'deep zoom boundary processing is bounded');
  const vx=Math.floor((16.37+180)/360*n),vy=Math.floor((1-Math.asinh(Math.tan(48.208*Math.PI/180))/Math.PI)/2*n);
  const inside=request(mw,endpoint('at',z,vx,vy));await inside.finished;assert.equal(inside.status,200);assert.deepEqual(inspect(inside.body).pixel,[255,255,255,255]);mw.dispose();
});

test('bad upstream MIME, dimensions, body and redirects fail without fabricated coverage',async()=>{
  const responses=[new Response('bad',{headers:{'content-type':'text/html'}}),new Response(image('PNG',128),{headers:{'content-type':'image/png'}}),new Response('fake',{headers:{'content-type':'image/png'}}),new Response(null,{status:302,headers:{location:'https://evil.invalid'}})];
  for(const response of responses){const mw=createCountryImageryMiddleware({fetcher:async()=>response});const r=request(mw,endpoint('ch',10,536,358));await r.finished;assert.equal(r.status,502);assert.equal(r.headers['Cache-Control'],'no-store');mw.dispose();}
});

test('missing and rejected streaming upstream bodies are promptly cancelled',async()=>{
  for(const [status,headers] of [[404,{}],[503,{}],[200,{'content-type':'text/html'}],[200,{'content-type':'image/png','content-length':String(3*1024*1024)}]] as const){
    let cancelled=false;
    const stream=new ReadableStream({pull(){},cancel(){cancelled=true;return new Promise<void>(()=>{});}});
    const mw=createCountryImageryMiddleware({fetcher:async()=>new Response(stream,{status,headers})});
    const r=request(mw,endpoint('ch',10,536,358));await r.finished;
    assert.equal(r.status,status===404?200:502);assert.equal(cancelled,true,`HTTP ${status} body cancellation`);
    if(status===404){assert.equal(r.headers['X-Scenery-Empty'],'1');assert.deepEqual(inspect(r.body).alpha,[0,0]);}
    mw.dispose();
  }
});

test('border tiles retain interior pixels while making outside transparent',async()=>{
  const mw=createCountryImageryMiddleware({fetcher:async()=>new Response(image('JPEG'),{headers:{'content-type':'image/jpeg'}})});
  const r=request(mw,endpoint('at',14,8782,5706));await r.finished;assert.equal(r.status,200);assert.equal(r.headers['X-Scenery-Empty'],'0');assert.deepEqual(inspect(r.body).alpha,[0,255]);mw.dispose();
});

test('Swiss source transparency survives processing and empty source is marked',async()=>{
  const a=spawnSync('python3',['-c',"from PIL import Image; import io,sys; im=Image.new('RGBA',(256,256),(0,0,0,0)); im.putpixel((128,128),(5,6,7,255)); s=io.BytesIO(); im.save(s,'PNG'); sys.stdout.buffer.write(s.getvalue())"]);assert.equal(a.status,0);
  const mw=createCountryImageryMiddleware({fetcher:async()=>new Response(a.stdout,{headers:{'content-type':'image/png'}})});
  const r=request(mw,endpoint('ch',10,536,358));await r.finished;assert.equal(r.status,200);assert.deepEqual(inspect(r.body).alpha,[0,255]);assert.deepEqual(inspect(r.body).pixel,[5,6,7,255]);mw.dispose();
});

test('aborted same-tile work can be replaced without old completion deleting new work',async()=>{
  const png=image('PNG'), calls:string[]=[];let firstResolve!:(r:Response)=>void, firstSignal:AbortSignal|undefined;
  const first=new Promise<Response>(resolve=>{firstResolve=resolve});
  const mw=createCountryImageryMiddleware({fetcher:async (input,init)=>{calls.push(String(input));if(calls.length===1){firstSignal=init?.signal as AbortSignal;return first;}return new Response(png,{headers:{'content-type':'image/png'}});},processor:async (_c,_z,_x,_y,b)=>({bytes:b,empty:false})});
  const one=request(mw,endpoint('ch',10,536,358)); await new Promise(resolve=>setTimeout(resolve,10)); assert.equal(calls.length,1);
  one.destroyed=true;one.emit('close');assert(firstSignal?.aborted);
  const two=request(mw,endpoint('ch',10,536,358));await two.finished;assert.equal(two.status,200);assert.equal(calls.length,2);
  firstResolve(new Response(png,{headers:{'content-type':'image/png'}}));await new Promise(resolve=>setTimeout(resolve,20));
  const three=request(mw,endpoint('ch',10,536,358));await three.finished;assert.equal(three.status,200);assert.equal(calls.length,2);mw.dispose();
});

test('queued country requests are bounded and timeout includes queue time',async()=>{
  let calls=0, aborted=0, active=0, maxActive=0;
  const mw=createCountryImageryMiddleware({timeoutMs:100,fetcher:(_input,init)=>{calls++;active++;maxActive=Math.max(maxActive,active);return new Promise((_resolve,reject)=>{const s=init?.signal as AbortSignal;s.addEventListener('abort',()=>{active--;aborted++;reject(new Error('aborted'));},{once:true});});}});
  const z=20,n=2**z,x=Math.floor((8.54+180)/360*n),y=Math.floor((1-Math.asinh(Math.tan(47.38*Math.PI/180))/Math.PI)/2*n);
  const requests=Array.from({length:64},(_,i)=>request(mw,endpoint('ch',z,x+i,y)));
  const extra=request(mw,endpoint('ch',z,x+64,y));await extra.finished;assert.equal(extra.status,503);assert.equal(extra.headers['Cache-Control'],'no-store');
  await Promise.all(requests.map(r=>r.finished));assert(requests.every(r=>r.status===502||r.status===503));assert(maxActive<=4,'no more than four upstream calls active');assert.equal(aborted,calls);mw.dispose();
});

test('missing tiles do not trip outage and failed recovery probe reopens cooldown',async()=>{
  let clock=1000,calls=0,status=404;const mw=createCountryImageryMiddleware({now:()=>clock,fetcher:async()=>{calls++;return new Response(null,{status});}});
  const ch=(i:number)=>endpoint('ch',14,8580+i,5730);
  for(let i=0;i<5;i++){const r=request(mw,ch(i));await r.finished;assert.equal(r.status,200);assert.equal(r.headers['X-Scenery-Empty'],'1');assert.deepEqual(inspect(r.body).alpha,[0,0]);}
  assert.equal(calls,5);status=503;
  for(let i=5;i<8;i++){const r=request(mw,ch(i));await r.finished;assert.equal(r.status,502);}
  clock+=30_000;const probe=request(mw,ch(8));await probe.finished;assert.equal(probe.status,502);
  const blocked=request(mw,ch(9));await blocked.finished;assert.equal(blocked.status,503);assert.equal(blocked.headers['Retry-After'],'30');assert.equal(calls,9);
  clock+=30_000;status=404;const missingProbe=request(mw,ch(10));await missingProbe.finished;assert.equal(missingProbe.status,200);assert.equal(missingProbe.headers['X-Scenery-Empty'],'1');assert.deepEqual(inspect(missingProbe.body).alpha,[0,0]);
  const next=request(mw,ch(11));await next.finished;assert.equal(next.status,200);assert.equal(calls,11);mw.dispose();
});

test('outage breaker bounds failed bursts, isolates countries and recovers with one probe',async()=>{
  let clock=1000,calls=0,mode:'fail'|'ok'|'hold'='fail'; let resolveProbe!:(value:Response)=>void;
  const png=image('PNG'), jpeg=image('JPEG');
  const mw=createCountryImageryMiddleware({now:()=>clock,fetcher:async input=>{calls++;if(String(input).includes('mapsneu')) return new Response(jpeg,{headers:{'content-type':'image/jpeg'}});if(mode==='hold') return new Promise(resolve=>{resolveProbe=resolve});return mode==='fail'?new Response(null,{status:503}):new Response(png,{headers:{'content-type':'image/png'}});},processor:async (_c,_z,_x,_y,b)=>({bytes:b.equals(jpeg)?png:b,empty:false})});
  const ch=(i:number)=>endpoint('ch',14,8580+i,5730);
  for(let i=0;i<3;i++){const r=request(mw,ch(i));await r.finished;assert.equal(r.status,502);}
  const burst=Array.from({length:100},(_,i)=>request(mw,ch(i+3)));await Promise.all(burst.map(r=>r.finished));
  assert.equal(calls,3);assert(burst.every(r=>r.status===503&&r.headers['Cache-Control']==='no-store'&&r.headers['X-Scenery-Status']==='unavailable'&&r.headers['Retry-After']==='30'));
  const at=request(mw,endpoint('at',14,8937,5681));await at.finished;assert.equal(at.status,200);assert.equal(calls,4);
  clock+=30_000;mode='hold';const probe=request(mw,ch(110));await new Promise(resolve=>setTimeout(resolve,0));
  const blocked=request(mw,ch(111));await blocked.finished;assert.equal(blocked.status,503);assert.equal(calls,5);
  resolveProbe(new Response(png,{headers:{'content-type':'image/png'}}));await probe.finished;assert.equal(probe.status,200);
  mode='ok';const recovered=request(mw,ch(112));await recovered.finished;assert.equal(recovered.status,200);assert.equal(calls,6);mw.dispose();
});

test('cancelled half-open probe releases gate and stale pre-outage success cannot close it',async()=>{
  let clock=1000,calls=0;let finishOld!:(r:Response)=>void,finishProbe!:(r:Response)=>void;
  const png=image('PNG');const mw=createCountryImageryMiddleware({now:()=>clock,fetcher:async()=>{calls++;if(calls===1)return new Promise(resolve=>{finishOld=resolve});if(calls<=4)return new Response(null,{status:503});if(calls===5)return new Promise(resolve=>{finishProbe=resolve});return new Response(png,{headers:{'content-type':'image/png'}});},processor:async (_c,_z,_x,_y,b)=>({bytes:b,empty:false})});
  const ch=(i:number)=>endpoint('ch',14,8580+i,5730);const old=request(mw,ch(0));await new Promise(resolve=>setTimeout(resolve,0));
  for(let i=1;i<=3;i++){const r=request(mw,ch(i));await r.finished;assert.equal(r.status,502);}
  finishOld(new Response(png,{headers:{'content-type':'image/png'}}));await old.finished;
  const blocked=request(mw,ch(4));await blocked.finished;assert.equal(blocked.status,503);assert.equal(calls,4);
  clock+=30_000;const probe=request(mw,ch(5));await new Promise(resolve=>setTimeout(resolve,0));probe.destroyed=true;probe.emit('close');
  const replacement=request(mw,ch(6));await replacement.finished;assert.equal(replacement.status,200);assert.equal(calls,6);
  finishProbe(new Response(null,{status:503}));await new Promise(resolve=>setTimeout(resolve,0));
  const after=request(mw,ch(7));await after.finished;assert.equal(after.status,200);mw.dispose();
});

test('actual Vite dev and preview mount country route before scenery catch-all',async()=>{
  const {createServer,preview}=await import('vite');
  const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const app=fileURLToPath(new URL('.',import.meta.url)), temporary=await mkdtemp(join(tmpdir(),'gefly-photo-preview-'));
  await writeFile(join(temporary,'index.html'),'<!doctype html><title>fixture</title>');
  try {
    const dev=await createServer({root:app,configFile:join(app,'vite.config.ts'),logLevel:'silent',server:{host:'127.0.0.1',port:0,strictPort:false,watch:{ignored:['**/*']}}});
    try {await dev.listen();const address=dev.httpServer?.address();assert(address&&typeof address==='object');
      const response=await fetch(`http://127.0.0.1:${address.port}/scenery/photo-country/ch/0/0/0.png`);assert.equal(response.status,200);assert.deepEqual(inspect(Buffer.from(await response.arrayBuffer())).alpha,[0,0]);
      const bad=await fetch(`http://127.0.0.1:${address.port}/scenery/photo-country/ch/21/0/0.png`);assert.equal(bad.status,404);
    } finally {await dev.close();}
    const view=await preview({root:app,configFile:join(app,'vite.config.ts'),logLevel:'silent',build:{outDir:temporary},preview:{host:'127.0.0.1',port:0,strictPort:false}});
    try {const address=view.httpServer.address();assert(address&&typeof address==='object');
      const response=await fetch(`http://127.0.0.1:${address.port}/scenery/photo-country/at/0/0/0.png`);assert.equal(response.status,200);assert.deepEqual(inspect(Buffer.from(await response.arrayBuffer())).alpha,[0,0]);
      const bad=await fetch(`http://127.0.0.1:${address.port}/scenery/photo-country/at/21/0/0.png`);assert.equal(bad.status,404);
    } finally {await new Promise<void>((resolve,reject)=>view.httpServer.close(error=>error?reject(error):resolve()));}
  } finally {await rm(temporary,{recursive:true,force:true});}
});
