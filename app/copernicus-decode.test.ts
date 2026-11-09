import assert from 'node:assert/strict';
import { test } from 'node:test';
import { threadId } from 'node:worker_threads';
import { deflateSync } from 'node:zlib';
import { CopernicusBlockDecoder } from './copernicus-decode.ts';
function block(value: number) {
 const raw=Buffer.alloc(1024*1024*4),float=Buffer.alloc(4);float.writeFloatLE(value);
 for(let y=0;y<1024;y++){const start=y*4096;for(let p=0;p<4;p++)raw.fill(float[3-p],start+p*1024,start+(p+1)*1024);for(let i=4095;i>0;i--)raw[start+i]=(raw[start+i]-raw[start+i-1])&255;}
 return deflateSync(raw);
}
test('terrain TIFF decode runs in separate CPU threads with exact native Float32 outputs',async()=>{
 const decoder=new CopernicusBlockDecoder();try{
  const bytes=block(123.5),copy=Buffer.from(bytes);let heartbeats=0;const timer=setInterval(()=>heartbeats++,1);
  const values=await Promise.all([decoder.decode(bytes),decoder.decode(bytes)]);clearInterval(timer);
  assert(heartbeats>0);assert(values.every(v=>v.every(n=>n===123.5)));assert.deepEqual(bytes,copy);
  assert(decoder.stats.threadIds.every(id=>id!==threadId&&id>0));assert.equal(decoder.stats.workers,2);
  await assert.rejects(decoder.decode(Buffer.from([1,2,3])));assert.equal(decoder.stats.active,0);
 }finally{decoder.dispose();}
});
test('terrain decoder disposal rejects queued and active work and cannot restart itself',async()=>{
 const decoder=new CopernicusBlockDecoder(),pending=decoder.decode(block(1));decoder.dispose();
 await assert.rejects(pending,/disposed/);await assert.rejects(decoder.decode(Buffer.from([1])),/unavailable/);
});
