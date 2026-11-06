import { createStreamedAirportScenery } from './streamed-airport-scenery.ts';
import {
  ShadowMode, Cartesian3, Color, ColorGeometryInstanceAttribute, GeometryInstance, PerInstanceColorAppearance,
  PolygonGeometry, PolygonHierarchy, Primitive, PrimitiveCollection, PointPrimitiveCollection,
  CylinderGeometry, Transforms, Matrix3, Matrix4, type Scene,
} from 'cesium';
import { airportLocal, airportOffset, EDFE_REFERENCE, EDFE_RUNWAYS, runwayPoint, practicePapiWhites, practiceRunwayLights, sampleAirportPoints } from './airport-geometry';

type Coordinate = [number, number];
type Feature = { properties: {kind: string; width?: number; surface?: string}; geometry: {type: string; coordinates: Coordinate | Coordinate[] | Coordinate[][]} };
export const AIRPORT_VECTOR_URL = '/airports/scenery/edfe-vector.geojson';
export const AIRPORT_VECTOR_CREDIT = '© OpenStreetMap contributors · ODbL · EDFE snapshot 2026-11-03';
const VECTOR_HASH = 'f3b56bede6bea8b811fc5e837009fa581f2a472b8816d9f17215c4e75b7685e2';
const colors: Record<string, string> = {apron:'#727779', taxiway:'#4c5054', runway:'#34383b', road:'#b5ac98', water:'#406e88', forest:'#365b3e', residential:'#8c8980', industrial:'#7b7d7c', meadow:'#698150', farmland:'#8e9163', grass:'#668254'};
/** Renders only; sampleHeight must use the same active terrain + geoid as aircraft.
 * Returns null while unavailable; the overlay waits rather than assuming sea level. */
export function createAirportScenery(scene: Scene, sampleHeight: (lat_rad: number, lon_rad: number) => number | null) {
  const streamed = createStreamedAirportScenery(scene, sampleHeight);
  const airport = scene.primitives.add(new PrimitiveCollection()) as PrimitiveCollection;
  const landscape = scene.primitives.add(new PrimitiveCollection()) as PrimitiveCollection;
  const papi = scene.primitives.add(new PointPrimitiveCollection()) as PointPrimitiveCollection;
  const lights = scene.primitives.add(new PointPrimitiveCollection()) as PointPrimitiveCollection;
  const runwayLights=practiceRunwayLights();
  let lightsBuilt=false;
  const abort = new AbortController();
  let disposed = false, built = false, airportVisible = true, vectorVisible = false, practicePapi = false;
  let features: Feature[] = [], fetchStatus: 'loading' | 'ready' | 'unavailable' = 'loading';
  const addPolygon = (vertices: {lat_rad: number; lon_rad: number}[], color: string, instances: GeometryInstance[], offset = .12) => {
    const positions: Cartesian3[] = [];
    for (const v of vertices) {
      const h = sampleHeight(v.lat_rad, v.lon_rad);
      if (h === null || !Number.isFinite(h)) return;
      positions.push(Cartesian3.fromRadians(v.lon_rad, v.lat_rad, h + offset));
    }
    if (positions.length < 3) return;
    instances.push(new GeometryInstance({geometry: new PolygonGeometry({polygonHierarchy:new PolygonHierarchy(positions),perPositionHeight:true,vertexFormat:PerInstanceColorAppearance.VERTEX_FORMAT}),attributes:{color:ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(color))}}));
  };
  const addStrip = (a: {lat_rad:number;lon_rad:number}, b: {lat_rad:number;lon_rad:number}, width: number, color: string, instances: GeometryInstance[], offset = .12) => {
    const local = airportLocal(b,a), length = Math.hypot(local.east_m, local.north_m);
    if (length < .01 || !Number.isFinite(length)) return;
    const dx = local.north_m / length * width / 2, dy = -local.east_m / length * width / 2;
    // Short sections follow the actual DEM; a long runway chord would disappear
    // into terrain or float above it, even when its endpoints agree.
    const n = Math.ceil(length / 8);
    for (let i=0;i<n;i++) {
      const p = airportOffset(a,local.east_m*i/n,local.north_m*i/n), q = airportOffset(a,local.east_m*(i+1)/n,local.north_m*(i+1)/n);
      addPolygon([airportOffset(p,-dx,-dy),airportOffset(q,-dx,-dy),airportOffset(q,dx,dy),airportOffset(p,dx,dy)],color,instances,offset);
    }
  };
  const batch = (collection: PrimitiveCollection, instances: GeometryInstance[]) => {
    if(instances.length) collection.add(new Primitive({geometryInstances:instances,appearance:new PerInstanceColorAppearance({flat:true,translucent:false}),asynchronous:false,shadows:ShadowMode.RECEIVE_ONLY}));
  };
  const makeRunway = () => {
    const surfaces: GeometryInstance[] = [], paint: GeometryInstance[] = [];
    addStrip(runwayPoint(-700),runwayPoint(700),25,colors.runway,surfaces);
    for(const side of [-1,1]) addStrip(runwayPoint(-700,side*11.7),runwayPoint(700,side*11.7),.3,'#efeee4',paint,.16);
    // Generic paint; RWY26 displaced threshold leaves an arrowed approach area.
    for(let d=-630;d<400;d+=60) addStrip(runwayPoint(d),runwayPoint(d+30),.45,'#efeee4',paint,.16);
    for(const threshold of [-695,461]) {
      addStrip(runwayPoint(threshold,-12),runwayPoint(threshold,12),1.8,'#efeee4',paint,.17);
      const direction = threshold<0?1:-1;
      for(const side of [-1,1]) for(let i=0;i<3;i++) addStrip(runwayPoint(threshold+direction*7,side*(3+i*2.4)),runwayPoint(threshold+direction*30,side*(3+i*2.4)),1.3,'#efeee4',paint,.17);
    }
    for(let d=500;d<680;d+=50) {addStrip(runwayPoint(d),runwayPoint(d-22),.5,'#efeee4',paint,.17);for(const side of [-1,1])addStrip(runwayPoint(d-22),runwayPoint(d-12,side*3),.5,'#efeee4',paint,.17);}
    // Project-authored seven-segment numerals remain sharp at runway scale.
    const segments: Record<string, number[]> = {'0':[0,1,2,3,4,5],'8':[0,1,2,3,4,5,6],'2':[0,1,6,4,3],'6':[0,5,6,4,3,2]};
    const strokes = [[[-1.5,3],[1.5,3]],[[1.5,3],[1.5,0]],[[1.5,0],[1.5,-3]],[[-1.5,-3],[1.5,-3]],[[-1.5,0],[-1.5,-3]],[[-1.5,3],[-1.5,0]],[[-1.5,0],[1.5,0]]];
    for(const r of [{along:-647,direction:1,text:'08'},{along:413,direction:-1,text:'26'}]) {
      for(let digit=0;digit<2;digit++)for(const index of segments[r.text[digit]]) {
        const [a,b]=strokes[index], lateral=(digit===0?-3:3)*r.direction;
        addStrip(runwayPoint(r.along+a[1]*r.direction*1.8,lateral+a[0]*r.direction),runwayPoint(r.along+b[1]*r.direction*1.8,lateral+b[0]*r.direction),.8,'#efeee4',paint,.18);
      }
    }
    batch(airport,surfaces); batch(airport,paint);
  };
  const makeWindsock = () => {
    const lat=49.9598762*Math.PI/180, lon=8.6329093*Math.PI/180;
    const h=sampleHeight(lat,lon);if(h===null)return;
    const fixed=Transforms.eastNorthUpToFixedFrame(Cartesian3.fromRadians(lon,lat,h));
    const cylinder=(length:number,bottomRadius:number,topRadius:number,color:string,height:number,horizontal=false)=>{
      const local=Matrix4.fromRotationTranslation(horizontal?Matrix3.fromRotationY(Math.PI/2):Matrix3.IDENTITY,new Cartesian3(horizontal?length/2:0,0,height));
      airport.add(new Primitive({geometryInstances:new GeometryInstance({geometry:new CylinderGeometry({length,bottomRadius,topRadius,slices:12,vertexFormat:PerInstanceColorAppearance.VERTEX_FORMAT}),modelMatrix:Matrix4.multiply(fixed,local,new Matrix4()),attributes:{color:ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(color))}}),appearance:new PerInstanceColorAppearance({flat:true,translucent:false}),asynchronous:false,shadows:ShadowMode.RECEIVE_ONLY}));
    };
    cylinder(4,.045,.045,'#deddd5',2);
    cylinder(1.7,.4,.12,'#ef743a',4,true);
  };
  const makeFeatures = () => {
    const paved: GeometryInstance[] = [], vector: GeometryInstance[] = [], centerlines: GeometryInstance[] = [];
    for(const f of features) {
      const k=f.properties.kind, color=f.properties.surface==='grass'?colors.grass:colors[k];
      if(!color || k==='runway') continue;
      const target=k==='apron'||k==='taxiway'?paved:vector;
      const convert=(c:Coordinate)=>({lon_rad:c[0]*Math.PI/180,lat_rad:c[1]*Math.PI/180});
      if(f.geometry.type==='Polygon') addPolygon((f.geometry.coordinates as Coordinate[][])[0].slice(0,-1).map(convert),color,target,.07);
      else if(f.geometry.type==='LineString') {
        const cs=f.geometry.coordinates as Coordinate[];
        for(let i=1;i<cs.length;i++) {
          addStrip(convert(cs[i-1]),convert(cs[i]),k==='taxiway'?Math.min(25,Math.max(6,f.properties.width??12)):k==='road'?6:3,color,target,.08);
          if(k==='taxiway')addStrip(convert(cs[i-1]),convert(cs[i]),.2,'#e5bd4b',centerlines,.17);
        }
      }
    }
    batch(airport,paved); batch(airport,centerlines); batch(landscape,vector);
  };
  const load = async () => {
    try {
      const response=await fetch(AIRPORT_VECTOR_URL,{signal:abort.signal});
      if(!response.ok)throw Error('airport-vector-unavailable');
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength>1_000_000)throw Error('airport-vector-size');
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
      if(hash!==VECTOR_HASH)throw Error('airport-vector-integrity');
      const data=JSON.parse(new TextDecoder().decode(bytes));
      if(data.type!=='FeatureCollection'||!Array.isArray(data.features)||data.features.length>3000)throw Error('airport-vector-schema');
      features=data.features; fetchStatus='ready';
    } catch { if(!disposed)fetchStatus='unavailable'; }
  };
  void load();
  return {
    setVisible(value:boolean) {streamed.setVisible(value);airportVisible=value;airport.show=value;papi.show=value&&practicePapi;lights.show=value&&practicePapi;},
    setVectorVisible(value:boolean) {vectorVisible=value;landscape.show=value;},
    setPracticePapi(value:boolean) {streamed.setPracticePapi(value);practicePapi=value;papi.show=airportVisible&&value;lights.show=airportVisible&&value;},
    get status() {return fetchStatus;},
    get streamedStatus() { return streamed.stats.status; },
    get streamedStats() { return streamed.stats; },
    setExcludedSourceIds(ids: Iterable<string>) { streamed.setExcludedSourceIds(ids); },
    update(state:{lat_rad:number;lon_rad:number;alt_msl_m:number;terrain_geoid_m?:number}, terrainRevision = 0, options: {live:boolean} = {live:false}) {
      if(disposed)return;
      streamed.update(state, terrainRevision, options.live);
      if(!built && fetchStatus!=='loading' && sampleHeight(EDFE_REFERENCE.lat_rad,EDFE_REFERENCE.lon_rad)!==null) {
        makeFeatures();makeRunway();makeWindsock();built=true;
      }
      if(built&&!lightsBuilt) {
        // Wait for every light's real receiver height; never create a sea-level
        // placeholder or retain partial index sets while terrain is streaming.
        const barLocations=EDFE_RUNWAYS.flatMap(r=>Array.from({length:4},(_,i)=>airportOffset(r,Math.sin(r.heading_true_rad)*250-Math.cos(r.heading_true_rad)*(25+i*8),Math.cos(r.heading_true_rad)*250+Math.sin(r.heading_true_rad)*(25+i*8))));
        const bars=sampleAirportPoints(barLocations,sampleHeight), edges=sampleAirportPoints(runwayLights,sampleHeight);
        if(bars&&edges) {
          for(const p of bars)papi.add({position:Cartesian3.fromRadians(p.lon_rad,p.lat_rad,p.ellipsoid_m+.8),color:Color.RED,pixelSize:9,outlineWidth:1,outlineColor:Color.fromCssColorString('#333333')});
          for(const p of edges)lights.add({position:Cartesian3.fromRadians(p.lon_rad,p.lat_rad,p.ellipsoid_m+.25),color:p.kind==='edge'?Color.WHITE:p.kind==='threshold'?Color.LIME:Color.RED,pixelSize:p.kind==='edge'?4:5,outlineWidth:0});
          lightsBuilt=true;
        }
      }
      airport.show=airportVisible;landscape.show=vectorVisible;papi.show=airportVisible&&practicePapi&&lightsBuilt;lights.show=airportVisible&&practicePapi&&lightsBuilt;
      if(practicePapi&&lightsBuilt) {
        const position=airportLocal(state), h=86*Math.PI/180,along=position.east_m*Math.sin(h)+position.north_m*Math.cos(h);
        for(let i=0;i<runwayLights.length;i++) {const l=runwayLights[i];lights.get(i).show=l.kind==='edge'||(along-l.along_m)*l.facing>0;}
      }
      if(!practicePapi||!lightsBuilt)return;
      for(let j=0;j<EDFE_RUNWAYS.length;j++) {
        const r=EDFE_RUNWAYS[j], light=airportOffset(r,Math.sin(r.heading_true_rad)*250,Math.cos(r.heading_true_rad)*250);
        const p=airportLocal(state,light), along=p.east_m*Math.sin(r.heading_true_rad)+p.north_m*Math.cos(r.heading_true_rad), cross=p.east_m*Math.cos(r.heading_true_rad)-p.north_m*Math.sin(r.heading_true_rad);
        const h=sampleHeight(light.lat_rad,light.lon_rad), geoid=state.terrain_geoid_m;
        // MSL → ellipsoid conversion must come from the active terrain's
        // explicit quasigeoid. Missing coverage hides cues, never assumes MSL0.
        const available=h!==null&&Number.isFinite(h)&&Number.isFinite(geoid)&&Number.isFinite(state.alt_msl_m);
        if(!available){for(let i=0;i<4;i++)papi.get(j*4+i).show=false;continue;}
        const ellipsoid=state.alt_msl_m+geoid!;
        const angle=Math.atan2(ellipsoid-h!-.8,-along)*180/Math.PI;
        const visible=along<0&&along>-6300&&Math.abs(Math.atan2(cross,-along))<10*Math.PI/180;
        const whites=practicePapiWhites(angle);
        for(let i=0;i<4;i++){const point=papi.get(j*4+i);point.show=visible;point.color=i<whites?Color.WHITE:Color.RED;}
      }
    },
    dispose(){if(disposed)return;disposed=true;streamed.dispose();abort.abort();scene.primitives.remove(airport);scene.primitives.remove(landscape);scene.primitives.remove(papi);scene.primitives.remove(lights);},
  };
}
