import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateRegionalManifest,regionalTileAt} from './regional-imagery.ts';
const root=new URL('../public/imagery/rhein-main/',import.meta.url);
const digest=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');

test('bundled imagery bytes and source-group provenance match the bounded manifest',()=>{
  const source=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
  const m=validateRegionalManifest(source);
  assert.equal(m.tiles.length,723);
  const sources=readFileSync(new URL('SOURCES.json',root));
  assert.equal(digest(sources),source.source.sources_sha256);
  const provenance=JSON.parse(sources.toString('utf8'));
  assert.match(provenance.transform,/crop.*JPEG quality 85/);
  assert(provenance.groups.length>0 && provenance.groups.length<=723);
  for(const g of provenance.groups){
    const url=new URL(g.url);
    assert.equal(url.hostname,'www.gds-srv.hessen.de');assert.equal(url.protocol,'https:');
    assert.equal(url.searchParams.get('SRS'),'EPSG:3857');
    assert([1,2,4].includes(g.span));
    assert.equal(url.searchParams.get('WIDTH'),String(g.span*512));assert.equal(url.searchParams.get('HEIGHT'),String(g.span*512));
    assert.match(g.sha256,/^[0-9a-f]{64}$/);
  }
  let total=0;
  for(const t of m.tiles){
    const b=readFileSync(new URL(`tiles/${t.z}/${t.x}/${t.y}.jpg`,root));
    assert.equal(b.length,t.bytes);assert.equal(digest(b),t.sha256);
    assert.equal(b.readUInt16BE(0),0xffd8);assert.equal(b.readUInt16BE(b.length-2),0xffd9);
    total+=b.length;
  }
  assert(total<=80*1024*1024);
  // Independent geographic holdouts in the actual delivered high-detail regions.
  for(const [lat,lon] of [[49.96,8.643],[50.04,8.59],[50.07,8.70]]){
    const {x,y}=regionalTileAt(lat,lon,15);
    assert(m.tiles.some(t=>t.z===15&&t.x===x&&t.y===y),`${lat},${lon} has detail`);
  }
  assert.equal(source.source.capture_date,null);
});
