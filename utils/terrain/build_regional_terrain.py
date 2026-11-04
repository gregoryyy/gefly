#!/usr/bin/env python3
"""Compile fixed, hash-bound DGM200/GCG regional tiles for lazy runtime loading."""
from pathlib import Path
import argparse, hashlib, io, json, zipfile
import numpy as np
import rasterio
import pyproj
from rasterio.io import MemoryFile
from rasterio.transform import from_origin
from rasterio.warp import reproject, Resampling

DEM_SHA='db82ad95da97bf9b8a5b4eab7aa856cd6f67bb0caaec551d21d12c7807ab3216'
GEOID_SHA='16b2f09996aee74eaa647fde4b7724ade17e384be534f38d23d9d229f30520c3'
DEM_URL='https://daten.gdz.bkg.bund.de/produkte/dgm/dgm200/aktuell/dgm200.utm32s.geotiff.zip'
GEOID_URL='https://daten.gdz.bkg.bund.de/produkte/sonstige/quasigeoid/aktuell/quasigeoid.geo89.w.zip'
N=129
WEST,SOUTH,EAST,NORTH=7.0,49.25,10.0,51.5
TILE=.25
COLS,ROWS=12,9
sha=lambda b:hashlib.sha256(b).hexdigest()

def geoid_table(raw):
    a=np.loadtxt(io.BytesIO(raw));lats=np.unique(a[:,0]);lons=np.unique(a[:,1]);v=a[:,2].reshape(len(lats),len(lons))[::-1]
    if not np.allclose(a[:,0].reshape(v.shape)[:,0],lats[::-1],rtol=0,atol=1e-10):raise ValueError('GCG row ordering')
    return lats,lons,v

def interpolate_geoid(table,lon,lat):
    lats,lons,v=table;x=np.searchsorted(lons,lon,side='right')-1;y=np.searchsorted(lats,lat,side='right')-1
    if x.min()<0 or y.min()<0 or x.max()>=len(lons)-1 or y.max()>=len(lats)-1:raise ValueError('Missing GCG coverage')
    dx=(lon-lons[x])/(lons[x+1]-lons[x]);dy=(lat-lats[y])/(lats[y+1]-lats[y])
    return (1-dy[:,None])*((1-dx[None,:])*v[y[:,None],x[None,:]]+dx[None,:]*v[y[:,None],x[None,:]+1])+dy[:,None]*((1-dx[None,:])*v[y[:,None]+1,x[None,:]]+dx[None,:]*v[y[:,None]+1,x[None,:]+1])

def build(dem_path,geoid_path,output):
    dem=dem_path.read_bytes();geoid=geoid_path.read_bytes()
    if sha(dem)!=DEM_SHA or sha(geoid)!=GEOID_SHA:raise ValueError('Review changed source hashes before rebuilding')
    with zipfile.ZipFile(io.BytesIO(dem)) as z: tif=z.read('dgm200.utm32s.geotiff/dgm200/dgm200_utm32s.tif')
    with zipfile.ZipFile(io.BytesIO(geoid)) as z: table=geoid_table(z.read('quasigeoid.geo89.w/quasigeoid/w/linux/ascii/GCG2016v2023_W.txt'))
    output.mkdir(parents=True,exist_ok=True);tiles=[]
    with MemoryFile(tif) as memory:
      with memory.open() as source:
        if source.crs!=rasterio.crs.CRS.from_epsg(25832) or source.nodata!=-9999:raise ValueError('Unexpected DGM200 source reference')
        # One exact geographic lattice: shared tile edges are literally the
        # same float32 nodes. Sample source pixel centers using exact PROJ
        # coordinates, avoiding per-tile GDAL warp approximation differences.
        lon=WEST+np.arange(COLS*(N-1)+1)*(TILE/(N-1));lat=SOUTH+np.arange(ROWS*(N-1)+1)*(TILE/(N-1))
        llon,llat=np.meshgrid(lon,lat)
        east,north=pyproj.Transformer.from_crs('EPSG:4326',source.crs,always_xy=True).transform(llon,llat)
        px=(east-source.transform.c)/source.transform.a-.5;py=(north-source.transform.f)/source.transform.e-.5
        ix=np.floor(px).astype(int);iy=np.floor(py).astype(int);dx=px-ix;dy=py-iy
        if ix.min()<0 or iy.min()<0 or ix.max()+1>=source.width or iy.max()+1>=source.height:raise ValueError('Missing source coverage')
        values=source.read(1);sw=values[iy,ix];se=values[iy,ix+1];nw=values[iy+1,ix];ne=values[iy+1,ix+1]
        if any(np.any(v==source.nodata) for v in [sw,se,nw,ne]):raise ValueError('Unavailable DGM200 source nodes')
        full_h=(1-dy)*((1-dx)*sw+dx*se)+dy*((1-dx)*nw+dx*ne)
        full_z=interpolate_geoid(table,lon,lat)
        for row in range(ROWS):
          for col in range(COLS):
            west,south=WEST+col*TILE,SOUTH+row*TILE;east,north=west+TILE,south+TILE
            physical=full_h[row*128:row*128+N,col*128:col*128+N]
            zeta=full_z[row*128:row*128+N,col*128:col*128+N]
            if not np.all(np.isfinite(physical)&(physical>-1000)&(physical<10000)) or not np.all(np.isfinite(zeta)&(np.abs(zeta)<200)):raise ValueError('Unavailable terrain/geoid')
            packed=np.empty((N,N,2),dtype='<f4');packed[:,:,0]=physical;packed[:,:,1]=zeta;data=packed.tobytes()
            ident=f'e{int(round(west*100))}-n{int(round(south*100))}';asset=ident+'.f32';(output/asset).write_bytes(data)
            tiles.append(dict(id=ident,west_deg=west,south_deg=south,east_deg=east,north_deg=north,width=N,height=N,asset=asset,bytes=len(data),sha256=sha(data)))
    manifest=dict(version=1,id='rhein-main-dgm200-gcg-v1',bounds=[WEST,SOUTH,EAST,NORTH],tile_degrees=TILE,tile_nodes=N,rows='south-to-north',physical_datum='DHHN2016',geoid_model='GCG2016v2023_W',encoding='float32-le-interleaved-H-zeta',source=dict(dem=dict(url=DEM_URL,zip_sha256=sha(dem),tif_sha256=sha(tif),crs='EPSG:25832',resolution_m=200,license='DL-DE-BY-2.0',license_url='https://www.govdata.de/dl-de/by-2-0',credit='© GeoBasis-DE / BKG 2026 (Daten verändert)',source_age='State source surveys approximately 2000–2019; not current surveyed airport data'),geoid=dict(url=GEOID_URL,zip_sha256=sha(geoid),license='CC-BY-4.0',credit='© BKG 2026, GCG2016/2023; regional extraction/interpolation'),compiler_sha256=sha(Path(__file__).read_bytes()),transform='Exact PROJ geographic node coordinates; source-center bilinear interpolation on one shared lattice; GCG bilinear interpolation; float32 little-endian, south to north'),tiles=tiles)
    (output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f'Built {len(tiles)} tiles, {sum(t["bytes"] for t in tiles)} bytes')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--dem',type=Path,required=True);p.add_argument('--geoid',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();build(a.dem,a.geoid,a.output)
