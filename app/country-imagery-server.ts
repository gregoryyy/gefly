import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Fixed-source proxy for user-requested official country and state photographic tiles. */
type Country = 'ch' | 'at' | 'nrw' | 'bb' | 'es';
type Fetcher = typeof fetch;
type ImageResult = { bytes: Buffer; empty: boolean };
type Processor = (country: Country, z: number, x: number, y: number, bytes: Buffer, signal: AbortSignal) => Promise<ImageResult>;
export interface CountryImageryOptions { fetcher?: Fetcher; processor?: Processor; cacheBytes?: number; python?: string; timeoutMs?: number; now?: () => number }
const MAX_BYTES = 2 * 1024 * 1024, MAX_PENDING = 64, MAX_ACTIVE = 4, TIMEOUT_MS = 12000, TTL_MS = 15 * 60 * 1000;
const OUTAGE_THRESHOLD = 3, OUTAGE_COOLDOWN_MS = 30_000;
class SourceUnavailable extends Error {}
type Bounds = readonly [number, number, number, number];
const BOUNDS: Record<Country, readonly Bounds[]> = {
  ch: [[5.14, 45.39, 11.48, 48.24]], at: [[8.78, 46.35, 17.5, 49.04]],
  nrw: [[5.5, 50.0, 9.85, 52.9]], bb: [[11.1, 51.2, 15.1, 53.7]],
  es: [[-9.4, 35.99, 3.4, 44], [1, 38.5, 4.4, 40.2], [-18.3, 27.5, -13.3, 29.5]],
};
const TRANSPARENT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAABFUlEQVR4nO3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6AwBPAABo9vSmwAAAABJRU5ErkJggg==', 'base64');
function pngValid(b: Buffer): boolean {
  return b.length >= 45 && b.length <= MAX_BYTES && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    && b.toString('ascii',12,16) === 'IHDR' && b.readUInt32BE(16) === 256 && b.readUInt32BE(20) === 256
    && b.toString('ascii', b.length-8, b.length-4) === 'IEND';
}
function intersects(country: Country, z: number, x: number, y: number): boolean {
  const n = 2 ** z, lon = (xx: number) => xx / n * 360 - 180;
  const lat = (yy: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * yy / n))) * 180 / Math.PI;
  return BOUNDS[country].some(([w,s,e,north]) => lon(x+1) >= w && lon(x) <= e && lat(y) >= s && lat(y+1) <= north);
}
function upstream(country: Country, z: number, x: number, y: number): string {
  if (country === 'ch') return `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage-product/default/current/3857/${z}/${x}/${y}.png`;
  if (country === 'at') return `https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/${z}/${y}/${x}.jpeg`;
  if (country === 'es') {
    // EPSG:3857 metres, ordered west,south,east,north for WMS 1.3.0.
    const span = 40075016.68557849 / (2 ** z), half = 20037508.342789244;
    const west = -half + x * span, north = half - y * span;
    const bbox = [west, north - span, west + span, north].map(value => value.toFixed(8)).join(',');
    const query = new URLSearchParams({SERVICE:'WMS',VERSION:'1.3.0',REQUEST:'GetMap',LAYERS:'PNOA2024',STYLES:'',CRS:'EPSG:3857',BBOX:bbox,WIDTH:'256',HEIGHT:'256',FORMAT:'image/png',TRANSPARENT:'TRUE'});
    return `https://www.ign.es/wms/pnoa-historico?${query}`;
  }
  const extent = 20037508.342789244, size = extent * 2 / (2 ** z);
  const west = -extent + x * size, east = west + size, north = extent - y * size, south = north - size;
  const params = new URLSearchParams({ SERVICE:'WMS', VERSION:'1.1.1', REQUEST:'GetMap',
    LAYERS:country === 'nrw' ? 'nw_dop_rgb' : 'bebb_dop20c', STYLES:'', SRS:'EPSG:3857',
    BBOX:[west,south,east,north].join(','), WIDTH:'256', HEIGHT:'256', FORMAT:'image/png', TRANSPARENT:'TRUE' });
  const host = country === 'nrw' ? 'https://www.wms.nrw.de/geobasis/wms_nw_dop' : 'https://isk.geobasis-bb.de/mapproxy/dop20c/service/wms';
  return `${host}?${params}`;
}
function discardBody(response: Response): void {
  // Cancellation starts immediately; don't let a slow stream's cancellation promise block a request slot.
  if (response.body) void response.body.cancel().catch(() => {});
}
async function readBounded(response: Response, country: Country): Promise<Buffer> {
  const mime = country !== 'at' ? /^image\/png(?:;|$)/i : /^image\/jpeg(?:;|$)/i;
  const length = response.headers.get('content-length');
  if (!response.ok || !response.body || !mime.test(response.headers.get('content-type') || '')
      || (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES))) { discardBody(response); throw new Error('invalid imagery response'); }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let total = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; total += value.length;
    if (total > MAX_BYTES) throw new Error('imagery response too large'); chunks.push(value); }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  if (total === 0) throw new Error('empty imagery response');
  return Buffer.concat(chunks.map(x => Buffer.from(x)), total);
}
function makeProcessor(python: string): Processor {
  return (country,z,x,y,bytes,signal) => new Promise((resolve,reject) => {
    const script = fileURLToPath(new URL('../utils/scenery/country-photo.py', import.meta.url));
    if (signal.aborted) { reject(new Error('cancelled')); return; }
    const child = spawn(python, [script,country,String(z),String(x),String(y)], { stdio: ['pipe','pipe','pipe'], env: { PATH: process.env.PATH || '/usr/bin:/bin' } });
    let done = false, total = 0, marker = ''; const parts: Buffer[] = [];
    const finish = (error?: Error) => { if (done) return; done=true; clearTimeout(timer); signal.removeEventListener('abort',abort);
      if (error) { child.kill(); reject(error); } else if (marker === 'empty\n' || marker === 'data\n') resolve({ bytes: Buffer.concat(parts,total), empty: marker === 'empty\n' }); else reject(new Error('invalid imagery decoder status')); };
    const abort = () => finish(new Error('cancelled'));
    const timer = setTimeout(() => finish(new Error('imagery decoder timeout')), TIMEOUT_MS);
    signal.addEventListener('abort',abort,{once:true});
    child.on('error',()=>finish(new Error('imagery decoder unavailable')));
    child.stdin.on('error',()=>finish(new Error('imagery decoder input failure')));
    child.stderr.on('data',(chunk: Buffer)=>{ marker += chunk.toString('utf8'); if (marker.length > 64) finish(new Error('invalid imagery decoder status')); });
    child.stdout.on('data',(chunk: Buffer)=>{ total+=chunk.length; if(total>MAX_BYTES) finish(new Error('imagery output too large')); else parts.push(chunk); });
    child.on('close',code=>code===0 && total>0 ? finish() : finish(new Error('imagery decoder failed')));
    child.stdin.end(bytes);
  });
}

/** Only this exact route reaches the fixed public sources. Dispose on server close. */
export function createCountryImageryMiddleware(options: CountryImageryOptions = {}) {
  const fetcher = options.fetcher ?? fetch, processor = options.processor ?? makeProcessor(options.python ?? process.env.PYTHON ?? 'python3');
  const limit = Math.max(0, Math.min(options.cacheBytes ?? 32 * 1024 * 1024, 128 * 1024 * 1024));
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(10, Math.min(options.timeoutMs!, TIMEOUT_MS)) : TIMEOUT_MS;
  const now = options.now ?? Date.now;
  // Epochs keep late completions from older requests from resetting a newer outage.
  const breakers: Record<Country,{ failures:number; openUntil:number; probe:boolean; epoch:number }> = {
    ch:{failures:0,openUntil:0,probe:false,epoch:0}, at:{failures:0,openUntil:0,probe:false,epoch:0},
    nrw:{failures:0,openUntil:0,probe:false,epoch:0}, bb:{failures:0,openUntil:0,probe:false,epoch:0}, es:{failures:0,openUntil:0,probe:false,epoch:0},
  };
  function unavailable(res: ServerResponse, country: Country): void {
    const seconds = Math.max(1, Math.ceil((breakers[country].openUntil - now()) / 1000));
    res.writeHead(503,{'Cache-Control':'no-store','Retry-After':String(seconds),'X-Scenery-Status':'unavailable'}).end();
  }
  const cache = new Map<string,{value:ImageResult; expires:number}>(), pending = new Map<string,{controller:AbortController; promise:Promise<ImageResult>; users:number}>();
  const queue: Array<{run:()=>void; cancel:()=>void}> = []; let active = 0, cacheSize = 0, disposed = false;
  function schedule<T>(fn: () => Promise<T>, signal: AbortSignal): Promise<T> {
    return new Promise<T>((resolve,reject) => {
      const entry = { run: () => { signal.removeEventListener('abort',entry.cancel); if (signal.aborted) { reject(new Error('cancelled')); pump(); return; }
          active++; void fn().then(resolve,reject).finally(()=>{active--;pump();}); },
        cancel: () => { const i=queue.indexOf(entry); if(i>=0)queue.splice(i,1); reject(new Error('cancelled')); } };
      if (signal.aborted) { reject(new Error('cancelled')); return; }
      signal.addEventListener('abort',entry.cancel,{once:true}); queue.push(entry); pump();
    });
  }
  function pump(): void { while (!disposed && active < MAX_ACTIVE && queue.length) queue.shift()!.run(); }
  const middleware = ((req: IncomingMessage,res: ServerResponse,next: () => void) => {
    const raw=req.url ?? '';
    if (!raw.startsWith('/scenery/photo-country/')) { next(); return; }
    if (raw === '/scenery/photo-country/es/metadata.json' && !disposed && ['GET','HEAD'].includes(req.method ?? '')) {
      const body=Buffer.from(JSON.stringify({source:'PNOA 2024',attribution:'Obra derivada de PNOA 2024 CC-BY 4.0 scne.es',license:'https://creativecommons.org/licenses/by/4.0/',sourceService:'https://www.ign.es/wms/pnoa-historico',sourceLayer:'PNOA2024',modification:'Tiles resampled and re-encoded as PNG; source alpha retained.',coverage:'Partial: Canary and Balearic Islands and selected mainland areas; source coverage controls transparency.'}));
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Length':body.length,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}).end(req.method==='HEAD'?undefined:body);return;
    }
    const match=/^\/scenery\/photo-country\/(ch|at|nrw|bb|es)\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})\.png$/.exec(raw);
    if(disposed || !match || !['GET','HEAD'].includes(req.method ?? '')) { res.writeHead(404,{'Cache-Control':'no-store'}).end(); return; }
    const country=match[1] as Country,z=Number(match[2]),x=Number(match[3]),y=Number(match[4]),n=2**z;
    if(z>20 || x>=n || y>=n || String(z)!==match[2] || String(x)!==match[3] || String(y)!==match[4] ) {
      res.writeHead(404,{'Cache-Control':'no-store'}).end(); return;
    }
    if(z<7 || !intersects(country,z,x,y)) { res.writeHead(200,{'Content-Type':'image/png','Content-Length':TRANSPARENT.length,'Cache-Control':'public, max-age=3600','X-Scenery-Empty':'1','X-Content-Type-Options':'nosniff'}); res.end(req.method==='HEAD'?undefined:TRANSPARENT); return; }
    const key=`${country}/${z}/${x}/${y}`; let hit=cache.get(key);
    if(hit && hit.expires<=Date.now()) {cache.delete(key);cacheSize-=hit.value.bytes.length;hit=undefined;}
    if(hit) {cache.delete(key);cache.set(key,hit);res.writeHead(200,{'Content-Type':'image/png','Content-Length':hit.value.bytes.length,'Cache-Control':'private, max-age=300','X-Scenery-Source':country,'X-Scenery-Empty':hit.value.empty?'1':'0','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:hit.value.bytes);return;}
    let job=pending.get(key);
    if (job?.controller.signal.aborted) { pending.delete(key); job = undefined; }
    if(!job) {
      const breaker=breakers[country];
      if (breaker.openUntil && (now()<breaker.openUntil || breaker.probe)) { unavailable(res,country); return; }
      if(pending.size>=MAX_PENDING) {res.writeHead(503,{'Cache-Control':'no-store'}).end();return;}
      const controller=new AbortController();
      const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(timeoutMs)]);
      const promise=schedule(async()=>{
        if (breaker.openUntil && (now()<breaker.openUntil || breaker.probe)) throw new SourceUnavailable();
        const probe=breaker.openUntil!==0;
        if (probe) breaker.probe=true;
        const epoch=breaker.epoch;
        const abandonProbe=()=>{ if(probe && breaker.epoch===epoch && breaker.probe) {breaker.probe=false;breaker.epoch++;} };
        controller.signal.addEventListener('abort',abandonProbe,{once:true});
        try {
          const response=await fetcher(upstream(country,z,x,y),{signal,redirect:'error',headers:{Accept:country==='at'?'image/jpeg':'image/png'}});
          if(response.status===404) discardBody(response);
          const result=response.status===404
            ? {bytes:TRANSPARENT,empty:true}
            : await processor(country,z,x,y,await readBounded(response,country),signal);
          if(!pngValid(result.bytes)) throw new Error('invalid processed image');
          if (signal.aborted) throw new Error('cancelled');
          if (breaker.epoch===epoch) { breaker.failures=0; if(probe) { breaker.openUntil=0; breaker.probe=false; breaker.epoch++; } }
          if(result.bytes.length<=limit) {while(cacheSize+result.bytes.length>limit && cache.size) {const first=cache.keys().next().value as string;cacheSize-=cache.get(first)!.value.bytes.length;cache.delete(first);} cache.set(key,{value:result,expires:Date.now()+TTL_MS});cacheSize+=result.bytes.length;}
          return result;
        } catch (error) {
          if (breaker.epoch===epoch) {
            if (controller.signal.aborted) { if(probe) breaker.probe=false; }
            else if (probe || ++breaker.failures>=OUTAGE_THRESHOLD) { breaker.openUntil=now()+OUTAGE_COOLDOWN_MS; breaker.probe=false; breaker.epoch++; }
          }
          throw error;
        } finally { controller.signal.removeEventListener('abort',abandonProbe); }
      },signal);
      job={controller,promise,users:0}; pending.set(key,job); const created=job;
      void promise.finally(()=>{ if(pending.get(key)===created)pending.delete(key); }).catch(()=>{});
    }
    const current=job; current.users++; let done=false;
    const release=()=>{if(done)return;done=true;current.users--;if(current.users===0 && pending.get(key)===current)current.controller.abort();};
    res.once('close',release);
    current.promise.then(value=>{if(done||res.destroyed)return;res.writeHead(200,{'Content-Type':'image/png','Content-Length':value.bytes.length,'Cache-Control':'private, max-age=300','X-Scenery-Source':country,'X-Scenery-Empty':value.empty?'1':'0','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:value.bytes);}).catch((error:unknown)=>{if(!done && !res.headersSent) {if(error instanceof SourceUnavailable) unavailable(res,country);else res.writeHead(502,{'Cache-Control':'no-store'}).end();}}).finally(release);
  }) as ((req: IncomingMessage,res:ServerResponse,next:()=>void)=>void) & {dispose():void};
  middleware.dispose=()=>{disposed=true;for(const job of pending.values())job.controller.abort();for(const q of [...queue])q.cancel();cache.clear();cacheSize=0;};
  return middleware;
}
