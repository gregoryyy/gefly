import { genericPapiAngle_deg, airportSurfaceMarkings, type GenericPapi } from './airport-surface-markings.ts';
import { practicePapiWhites } from './airport-geometry.ts';
import { PointPrimitiveCollection, ShadowMode, Cartesian3, Color, ColorGeometryInstanceAttribute, GeometryInstance, PerInstanceColorAppearance,
  PolygonGeometry, PolygonHierarchy, Primitive, PrimitiveCollection, type Scene } from 'cesium';
import { airportRegionBounds, airportSurfaceDistance_m, type AirportRegionPackage, type AirportSurfaceFeature } from './airport-region.ts';
import { createAirportRegionLoader, type AirportRegionLoaderOptions } from './airport-region-loader.ts';
import { airportSurfaceGeometry } from './airport-surface-geometry.ts';

const RAD = Math.PI / 180;
export const STREAMED_AIRPORT_LIMITS = Object.freeze({ regions: 6, instances: 14000, regionInstances: 2000,
  distance_m: 25000, buildIntervalMs: 200, planDistance_m: 500 });
const EDFE: readonly [number, number] = [8.6415, 49.9608333333];
const colors = { runway: '#34383b', taxiway: '#4c5054', apron: '#727779', grass: '#668254' };
interface Mesh { collection: PrimitiveCollection; primitive: Primitive; instances: number; signature: string; papi: {points:PointPrimitiveCollection; heads:GenericPapi[]} }
interface Attempt { signature: string; deferred: number; truncated: number; unsupported: number }
interface Position { lon_rad: number; lat_rad: number; ground_height_ellipsoid_m?:number }

/** Optional visual scenery, independent of native terrain/contact and airport navigation data. */
export function createStreamedAirportScenery(scene: Scene,
  sampleHeight: (lat_rad: number, lon_rad: number) => number | null, options: AirportRegionLoaderOptions = {}) {
  const loader = createAirportRegionLoader(options);
  const collection = scene.primitives.add(new PrimitiveCollection()) as PrimitiveCollection;
  const meshes = new Map<string, Mesh>(), attempts = new Map<string, Attempt>();
  let excluded = new Set<string>(), exclusionRevision = 0, terrainRevision: number | undefined;
  let practicePapi = false;
  let disposed = false, visible = true, nextBuild_ms = 0, lastRevision = -1, lastExclusions = -1;
  let lastPosition: readonly [number, number] | null = null;
  let plan = new Map<string, readonly AirportSurfaceFeature[]>();
  const clear = () => { collection.removeAll(); meshes.clear(); attempts.clear(); nextBuild_ms = 0; };
  const fingerprints = new WeakMap<AirportSurfaceFeature, string>();
  const signature = (features: readonly AirportSurfaceFeature[]) => features.map(feature => {
    let key = fingerprints.get(feature);
    if (key === undefined) { key = JSON.stringify(feature); fingerprints.set(feature, key); }
    return key;
  }).join(',');
  function updatePlan(position: readonly [number, number], packages: readonly AirportRegionPackage[]): void {
    const near = packages.filter(p => p.features.length > 0).sort((a, b) => {
      const center = (p: AirportRegionPackage): readonly [number, number] => {
        const [w, s, e, n] = airportRegionBounds(p); return [(w + e) / 2, (s + n) / 2];
      };
      return airportSurfaceDistance_m(position, center(a)) - airportSurfaceDistance_m(position, center(b));
    }).slice(0, STREAMED_AIRPORT_LIMITS.regions);
    const selected = new Set(near.map(p => p.id));
    for (const [id, mesh] of meshes) if (!selected.has(id)) { collection.remove(mesh.collection); meshes.delete(id); attempts.delete(id); }
    // Existing owners claim shared OSM IDs first, preventing each newly loaded
    // neighbour from needlessly rebuilding already drawn surfaces.
    const ordered = [...near.filter(p => meshes.has(p.id)), ...near.filter(p => !meshes.has(p.id))];
    const seen = new Set<string>(); plan = new Map();
    for (const p of ordered) {
      const features = p.features.filter(feature => {
        if (seen.has(feature.id) || excluded.has(feature.id)) return false;
        const cs = feature.geometry.type === 'Polygon' ? feature.geometry.coordinates[0] : feature.geometry.coordinates;
        // The prepared EDFE surfaces remain authoritative for this visual slot.
        if (cs.some(c => airportSurfaceDistance_m(c, EDFE) < 2000)) return false;
        if (!cs.some(c => airportSurfaceDistance_m(position, c) <= STREAMED_AIRPORT_LIMITS.distance_m)) return false;
        seen.add(feature.id); return true;
      });
      if (features.length) plan.set(p.id, features);
    }
    for (const id of attempts.keys()) if (!plan.has(id)) attempts.delete(id);
    for (const [id, mesh] of meshes) {
      const fs = plan.get(id);
      if (!fs || mesh.signature !== signature(fs)) { collection.remove(mesh.collection); meshes.delete(id); attempts.delete(id); }
    }
  }
  function build(id: string, features: readonly AirportSurfaceFeature[]): void {
    const instances: GeometryInstance[] = [];
    const remaining = Math.min(STREAMED_AIRPORT_LIMITS.regionInstances,
      STREAMED_AIRPORT_LIMITS.instances - [...meshes.values()].reduce((n, mesh) => n + mesh.instances, 0));
    const heads: GenericPapi[] = [];
    let deferred = 0, truncated = 0, unsupported = 0;
    for (const feature of features) {
      const geometry = airportSurfaceGeometry(feature, sampleHeight, remaining - instances.length);
      deferred += Number(geometry.deferred); truncated += Number(geometry.truncated); unsupported += Number(geometry.unsupported);
      const color = /grass|turf|earth|dirt|gravel|sand|unpaved/i.test(feature.surface) ? colors.grass : colors[feature.kind];
      const markings = airportSurfaceMarkings(feature, sampleHeight, Math.max(0, remaining - instances.length - geometry.polygons.length));
      if (heads.length < 48) heads.push(...markings.papi.slice(0,48-heads.length));
      for (const {polygon,tint} of [...geometry.polygons.map(polygon=>({polygon,tint:color})), ...markings.polygons.map(polygon=>({polygon,tint:feature.kind==='taxiway'?'#e5bd4b':'#efeee4'}))]) instances.push(new GeometryInstance({
        geometry: new PolygonGeometry({ polygonHierarchy: new PolygonHierarchy(polygon.map(v => Cartesian3.fromRadians(v.lon_rad, v.lat_rad, v.ellipsoid_m))),
          perPositionHeight: true, vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT }),
        attributes: { color: ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(tint)) },
      }));
    }
    const key = signature(features); attempts.set(id, { signature: key, deferred, truncated, unsupported });
    if (instances.length) {
      const child = collection.add(new PrimitiveCollection()) as PrimitiveCollection;
      const primitive = child.add(new Primitive({ geometryInstances: instances,
        appearance: new PerInstanceColorAppearance({ flat: true, translucent: false }), asynchronous: true, shadows: ShadowMode.RECEIVE_ONLY })) as Primitive;
      const points = child.add(new PointPrimitiveCollection()) as PointPrimitiveCollection;
      const readyHeads:GenericPapi[]=[];
      // Admit complete four-head units so missing terrain cannot shift the white/red index.
      for (let start=0;start<heads.length;start+=4) {
        const group=heads.slice(start,start+4), heights=group.map(head=>sampleHeight(head.location[1]*RAD,head.location[0]*RAD));
        if(group.length!==4||heights.some(h=>h===null||!Number.isFinite(h)))continue;
        group.forEach((head,i)=>{readyHeads.push(head);points.add({position:Cartesian3.fromDegrees(head.location[0],head.location[1],heights[i]!+.8),pixelSize:6,color:Color.RED});});
      }
      points.show=practicePapi;
      meshes.set(id, { collection: child, primitive, instances: instances.length, signature: key, papi:{points,heads:readyHeads} });
    }
  }
  return {
    setPracticePapi(value: boolean):void { practicePapi=value; for(const mesh of meshes.values())mesh.papi.points.show=value; },
    setVisible(value: boolean): void { visible = value; collection.show = value; },
    setExcludedSourceIds(ids: Iterable<string>): void {
      const next = new Set(ids);
      if (next.size === excluded.size && [...next].every(id => excluded.has(id))) return;
      excluded = next; exclusionRevision++; clear();
    },
    update(state: Position, revision: number, live: boolean): void {
      if (disposed) return;
      if (revision !== terrainRevision) { terrainRevision = revision; clear(); }
      loader.update(state.lon_rad / RAD, state.lat_rad / RAD, visible && live);
      for(const mesh of meshes.values()) for(let i=0;i<mesh.papi.heads.length;i++) {
        const head=mesh.papi.heads[i],point=mesh.papi.points.get(i),h=sampleHeight(head.location[1]*RAD,head.location[0]*RAD);
        const angle=genericPapiAngle_deg(head,state,h);
        point.show=practicePapi&&angle!==null;
        point.color=i%4<practicePapiWhites(angle??NaN)?Color.WHITE:Color.RED;
      }
      const stats = loader.stats, position: readonly [number, number] = [state.lon_rad / RAD, state.lat_rad / RAD];
      if (stats.revision !== lastRevision || lastExclusions !== exclusionRevision || !lastPosition
        || airportSurfaceDistance_m(position, lastPosition) >= STREAMED_AIRPORT_LIMITS.planDistance_m) {
        updatePlan(position, loader.packages); lastRevision = stats.revision; lastExclusions = exclusionRevision; lastPosition = position;
      }
      if (!visible || performance.now() < nextBuild_ms) return;
      for (const [id, features] of plan) {
        const key = signature(features);
        if (meshes.get(id)?.signature === key || attempts.get(id)?.signature === key) continue;
        nextBuild_ms = performance.now() + STREAMED_AIRPORT_LIMITS.buildIntervalMs; build(id, features); break;
      }
    },
    get stats() {
      const base = loader.stats, entries = [...attempts.values()];
      const deferred = entries.reduce((n, a) => n + a.deferred, 0), truncated = entries.reduce((n, a) => n + a.truncated, 0);
      const unsupported = entries.reduce((n, a) => n + a.unsupported, 0);
      return { ...base, status: base.status === 'disabled' ? 'disabled' : deferred ? 'terrain-pending' : truncated || unsupported ? 'limited' : base.status,
        genericPapi: [...meshes.values()].reduce((n,m)=>n+m.papi.heads.length,0), resident: meshes.size, readyMeshes: [...meshes.values()].filter(mesh => mesh.primitive.ready).length,
        instances: [...meshes.values()].reduce((n, mesh) => n + mesh.instances, 0), deferred, truncated, unsupported,
        loadedRegions: [...meshes.keys()] };
    },
    reset(): void { if (disposed) return; loader.reset(); clear(); plan.clear(); lastPosition = null; lastRevision = -1; },
    dispose(): void { if (disposed) return; disposed = true; loader.dispose(); meshes.clear(); attempts.clear(); scene.primitives.remove(collection); },
  };
}
