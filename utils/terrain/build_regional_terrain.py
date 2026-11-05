#!/usr/bin/env python3
"""Compile fixed, hash-bound DGM200/GCG regional tiles for lazy runtime loading."""
from pathlib import Path
import argparse, gzip, hashlib, io, json, zipfile
import numpy as np
import rasterio
import pyproj
from rasterio.io import MemoryFile
from rasterio.transform import from_origin
from rasterio.warp import reproject, Resampling

DEM_SHA='db82ad95da97bf9b8a5b4eab7aa856cd6f67bb0caaec551d21d12c7807ab3216'
GEOID_SHA='d5a40a20ae4cdb372c6ca27dbf742c1f46d8e28be282a12ef083fb93b823c67a'
DEM_URL='https://daten.gdz.bkg.bund.de/produkte/dgm/dgm200/aktuell/dgm200.utm32s.geotiff.zip'
GEOID_URL='https://daten.gdz.bkg.bund.de/produkte/sonstige/quasigeoid/2023/quasigeoid.geo89.de.zip'
N=129
WEST,SOUTH,EAST,NORTH=6.0,47.0,14.0,51.75
TILE=.25
COLS,ROWS=32,19
sha=lambda b:hashlib.sha256(b).hexdigest()

def geoid_table(raw):
    a=np.loadtxt(io.BytesIO(raw));lats=np.unique(a[:,0]);lons=np.unique(a[:,1]);v=a[:,2].reshape(len(lats),len(lons))[::-1]
    if not np.allclose(a[:,0].reshape(v.shape)[:,0],lats[::-1],rtol=0,atol=1e-10):raise ValueError('GCG row ordering')
    return lats,lons,v

def interpolate_geoid(table,lon,lat):
    lats,lons,v=table;x=np.searchsorted(lons,lon,side='right')-1;y=np.searchsorted(lats,lat,side='right')-1
    inside=(x[None,:]>=0)&(y[:,None]>=0)&(x[None,:]<len(lons)-1)&(y[:,None]<len(lats)-1)
    x=np.clip(x,0,len(lons)-2);y=np.clip(y,0,len(lats)-2)
    valid=inside.copy()
    for ox,oy in [(0,0),(1,0),(0,1),(1,1)]:valid &= np.isfinite(v[y[:,None]+oy,x[None,:]+ox])&(np.abs(v[y[:,None]+oy,x[None,:]+ox])<200)
    dx=(lon-lons[x])/(lons[x+1]-lons[x]);dy=(lat-lats[y])/(lats[y+1]-lats[y])
    values=(1-dy[:,None])*((1-dx[None,:])*v[y[:,None],x[None,:]]+dx[None,:]*v[y[:,None],x[None,:]+1])+dy[:,None]*((1-dx[None,:])*v[y[:,None]+1,x[None,:]]+dx[None,:]*v[y[:,None]+1,x[None,:]+1])
    return np.where(valid,values,np.nan)

def build(dem_path,geoid_path,output):
    dem=dem_path.read_bytes();geoid=geoid_path.read_bytes()
    if sha(dem)!=DEM_SHA or sha(geoid)!=GEOID_SHA:raise ValueError('Review changed source hashes before rebuilding')
    with zipfile.ZipFile(io.BytesIO(dem)) as z: tif=z.read('dgm200.utm32s.geotiff/dgm200/dgm200_utm32s.tif')
    with zipfile.ZipFile(io.BytesIO(geoid)) as z: table=geoid_table(z.read('quasigeoid.geo89.de/quasigeoid/de/linux/ascii/GCG2016v2023.txt'))
    output.mkdir(parents=True,exist_ok=True);tiles=[]
    with MemoryFile(tif) as memory:
      with memory.open() as source:
        if source.crs!=rasterio.crs.CRS.from_epsg(25832) or source.nodata!=-9999:raise ValueError('Unexpected DGM200 source reference')
        # One exact geographic lattice: shared tile edges are literally the
        # same float32 nodes. Sample source pixel centers using exact PROJ
        # coordinates, avoiding per-tile GDAL warp approximation differences.
        lon=WEST+np.arange(COLS*(N-1)+1)*(TILE/(N-1))
        values=source.read(1)
        transformer=pyproj.Transformer.from_crs('EPSG:4326',source.crs,always_xy=True)
        for row in range(ROWS):
          # One global-index strip bounds compiler memory without changing any
          # shared-node coordinates or interpolation order.
          lat=SOUTH+(row*(N-1)+np.arange(N))*(TILE/(N-1))
          llon,llat=np.meshgrid(lon,lat)
          east,north=transformer.transform(llon,llat)
          px=(east-source.transform.c)/source.transform.a-.5;py=(north-source.transform.f)/source.transform.e-.5
          ix=np.floor(px).astype(int);iy=np.floor(py).astype(int);dx=px-ix;dy=py-iy
          valid=(ix>=0)&(iy>=0)&(ix+1<source.width)&(iy+1<source.height)
          ix=np.clip(ix,0,source.width-2);iy=np.clip(iy,0,source.height-2)
          sw=values[iy,ix];se=values[iy,ix+1];nw=values[iy+1,ix];ne=values[iy+1,ix+1]
          for samples in [sw,se,nw,ne]:valid &= np.isfinite(samples)&(samples!=source.nodata)
          full_h=(1-dy)*((1-dx)*sw+dx*se)+dy*((1-dx)*nw+dx*ne)
          full_z=interpolate_geoid(table,lon,lat)
          valid &= np.isfinite(full_h)&(full_h>-1000)&(full_h<10000)&np.isfinite(full_z)&(np.abs(full_z)<200)
          for col in range(COLS):
            west,south=WEST+col*TILE,SOUTH+row*TILE;east,north=west+TILE,south+TILE
            supported=valid[:,col*128:col*128+N];count=int(supported.sum())
            ident=f'e{int(round(west*100))}-n{int(round(south*100))}'
            tile=dict(id=ident,west_deg=west,south_deg=south,east_deg=east,north_deg=north,width=N,height=N,
              coverage='full' if count==N*N else 'partial' if count else 'unavailable',valid_nodes=count)
            if count:
              packed=np.empty((N,N,2),dtype='<f4')
              packed[:,:,0]=np.where(supported,full_h[:,col*128:col*128+N],np.nan)
              packed[:,:,1]=np.where(supported,full_z[:,col*128:col*128+N],np.nan)
              data=packed.tobytes();asset=ident+'.f32';(output/asset).write_bytes(data)
              tile.update(asset=asset,bytes=len(data),sha256=sha(data))
            tiles.append(tile)
    raw_index=json.dumps(dict(version=2,tiles=tiles),ensure_ascii=False,separators=(',',':')).encode()
    index=gzip.compress(raw_index,mtime=0);(output/'tiles-v2.json.bin').write_bytes(index)
    manifest=dict(version=2,id='southern-germany-dgm200-gcg-v2',bounds=[WEST,SOUTH,EAST,NORTH],tile_degrees=TILE,tile_nodes=N,rows='south-to-north',physical_datum='DHHN2016',geoid_model='GCG2016v2023',nodata='paired-NaN',encoding='float32-le-interleaved-H-zeta',source=dict(dem=dict(url=DEM_URL,zip_sha256=sha(dem),tif_sha256=sha(tif),crs='EPSG:25832',resolution_m=200,license='DL-DE-BY-2.0',license_url='https://www.govdata.de/dl-de/by-2-0',credit='© GeoBasis-DE / BKG 2026 (Daten verändert)',source_age='State source surveys approximately 2000–2019; not current surveyed airport data'),geoid=dict(url=GEOID_URL,zip_sha256=sha(geoid),license='CC-BY-4.0',credit='© BKG 2026, GCG2016/2023; regional extraction/interpolation'),compiler_sha256=sha(Path(__file__).read_bytes()),transform='Exact PROJ geographic node coordinates; source-center bilinear interpolation on one shared lattice; GCG bilinear interpolation; float32 little-endian, south to north; unsupported DEM/geoid nodes remain paired NaN'),index=dict(asset='tiles-v2.json.bin',bytes=len(index),sha256=sha(index),decoded_bytes=len(raw_index),count=len(tiles),available=sum(t['valid_nodes']>0 for t in tiles)))
    (output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f'Built {len(tiles)} tiles, {sum(t.get("bytes",0) for t in tiles)} bytes')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--dem',type=Path,required=True);p.add_argument('--geoid',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();build(a.dem,a.geoid,a.output)
