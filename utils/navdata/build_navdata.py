#!/usr/bin/env python3
"""Compile a pinned, historical NAV810 regional subset. No live AIS retrieval."""
from __future__ import annotations
import argparse
from collections import Counter
import gzip
import hashlib
import json
import math
from pathlib import Path

SOURCE_SHA = '24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839'
COMMIT = '5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95'
SOURCE_URL = f'https://gitlab.com/flightgear/fgdata/-/raw/{COMMIT}/Navaids/nav.dat.gz'
CENTER = (50.026706, 8.558350)  # OurAirports community EDDF point; not verified official ARP.
RADIUS_NM = 100
FT = .3048

def sha(b): return hashlib.sha256(b).hexdigest()
def distance(a, b):
    la, lb = math.radians(a[0]), math.radians(b[0])
    dl = math.radians(b[1]-a[1]); dlat=lb-la
    h = math.sin(dlat/2)**2+math.cos(la)*math.cos(lb)*math.sin(dl/2)**2
    return 6371000*2*math.asin(math.sqrt(max(0,min(1,h))))/1852

def parse(raw):
    lines = raw.decode('latin-1').splitlines()
    if not any('cycle 2013.10' in x and 'either version 2' in x for x in lines[:4]):
        raise ValueError('Unexpected source edition/license')
    rows=[];excluded=[]
    for number, text in enumerate(lines,1):
        p=text.split()
        if not p or not p[0].isdigit() or int(p[0]) not in [2,3,4,5,6,7,8,9,12,13]: continue
        if len(p)<9: raise ValueError(f'Malformed source row {number}')
        try:
            row={'line':number,'raw':text,'type':int(p[0]),'lat':float(p[1]),'lon':float(p[2]),'elev':float(p[3]),'freq':int(p[4])*10 if int(p[0])!=2 else int(p[4]),'range':float(p[5]),'multi':float(p[6]),'id':p[7],'tail':p[8:]}
        except (ValueError,IndexError):
            # The pinned worldwide file has four malformed far-away GS rows.
            # Regional or nearby component parse errors still fail closed.
            if distance(CENTER,(float(p[1]),float(p[2]))) <= RADIUS_NM+10:
                raise ValueError(f'Malformed regional/component source row {number}')
            excluded.append({'source_line':number,'reason':'Malformed worldwide row outside region and component margin'})
            continue
        if not all(math.isfinite(row[k]) for k in ['lat','lon','elev','range','multi']): raise ValueError('Nonfinite source')
        rows.append(row)
    return lines,rows,excluded

def antenna(row):
    return {'lat_deg':row['lat'],'lon_deg':row['lon'],'elevation_m':row['elev']*FT,'range_nm':row['range']}
def ils_key(row):
    if row['type'] in [4,5,6] or (row['type'] in [12,13] and len(row['tail'])>=3 and row['tail'][-1]=='DME-ILS'):
        return (row['id'],row['freq'],row['tail'][0],row['tail'][1])
    return None

def compile_package(source:Path, output:Path):
    zipped=source.read_bytes()
    if sha(zipped)!=SOURCE_SHA: raise ValueError('Unreviewed source bytes')
    raw=gzip.decompress(zipped); lines,rows,excluded=parse(raw)
    selected=[r for r in rows if distance(CENTER,(r['lat'],r['lon']))<=RADIUS_NM]
    parents=[r for r in selected if r['type'] in [3,4,5] and 108000<=r['freq']<=117950]
    records=[]; attached=set(); used=set(); diagnostics=[]
    for row in parents:
        loc=row['type'] in [4,5]
        key=ils_key(row)
        airport,runway = row['tail'][:2] if loc else (None,None)
        ident=row['id']; name=' '.join(row['tail'])
        uid=f"{('LOC' if loc else 'VOR').lower()}-{ident.lower()}-{row['freq']}"+(f'-{airport.lower()}-{runway.lower()}' if loc else '')
        record={**antenna(row),'uid':uid,'id':ident,'name':name,'frequency_khz':row['freq'],'kind':'LOC' if loc else 'VOR','variation_deg_east':None if loc else row['multi'],'front_course_true_deg':row['multi'] if loc else None,'airport':airport,'runway':runway,'dme':None,'gs':None,'source_line_ids':[row['line']]}
        # Identity/frequency plus airport/runway for ILS; co-location guards VOR collisions.
        dmes=[r for r in rows if r['type'] in [12,13] and r['id']==ident and r['freq']==row['freq']
              and (ils_key(r)==key if loc else ils_key(r) is None and distance((r['lat'],r['lon']),(row['lat'],row['lon']))<=10)]
        if len(dmes)>1:
            component_lines=[d['line'] for d in dmes]
            diagnostics.append({'station_uid':uid,'component':'DME','source_line_ids':component_lines,'reason':'Conflicting explicit components; DME unavailable'})
            record['source_line_ids'].extend(component_lines)
            attached.update(component_lines)
            dmes=[]
        if dmes:
            d=dmes[0]; record['dme']={**antenna(d),'bias_nm':d['multi']};record['source_line_ids'].append(d['line']);attached.add(d['line'])
        if loc:
            gs=[r for r in rows if r['type']==6 and ils_key(r)==key]
            if len(gs)>1:
                component_lines=[g['line'] for g in gs]
                diagnostics.append({'station_uid':uid,'component':'GS','source_line_ids':component_lines,'reason':'Conflicting explicit components; GS unavailable'})
                record['source_line_ids'].extend(component_lines)
                gs=[]
            if gs:
                g=gs[0];record['gs']={**antenna(g),'angle_deg':math.floor(g['multi']/1000)/100,'front_course_true_deg':g['multi']%1000};record['source_line_ids'].append(g['line'])
        records.append(record);used.update(record['source_line_ids'])
    for row in selected:
        if row['type'] not in [12,13] or row['line'] in attached or not 108000<=row['freq']<=117950: continue
        # DME parent outside the extent is retained only as DME, not fabricated VOR/LOC.
        uid=f"dme-{row['id'].lower()}-{row['freq']}-{row['line']}"
        key=ils_key(row);record={**antenna(row),'uid':uid,'id':row['id'],'name':' '.join(row['tail']),'frequency_khz':row['freq'],'kind':'DME','variation_deg_east':None,'front_course_true_deg':None,'airport':key[2] if key else None,'runway':key[3] if key else None,'dme':{**antenna(row),'bias_nm':row['multi']},'gs':None,'source_line_ids':[row['line']]}
        records.append(record);used.add(row['line'])
    if len({r['uid'] for r in records})!=len(records): raise ValueError('Nonunique regional uid')
    records.sort(key=lambda r:(r['kind'],r['airport'] or '',r['id'],r['frequency_khz'],r['uid']))
    package={'version':1,'id':'rhein-main-nav810-2013-10-v1','edition':'2013.10','historical':True,'source_label':'Rhein-Main NAV 2013.10 · historical','vertical_reference':'Source AMSL; exact vertical datum and survey accuracy unverified. Geometric training approximation only.','region':{'center_lat_deg':CENTER[0],'center_lon_deg':CENTER[1],'radius_nm':RADIUS_NM,'center_source':'https://ourairports.com/airports/EDDF/','center_reference':'Community airport point, not verified official ARP','distance_model':'6371000 m sphere'},'source':{'url':SOURCE_URL,'commit':COMMIT,'gzip_sha256':sha(zipped),'raw_sha256':sha(raw),'encoding':'ISO-8859-1 decoded and serialized as UTF-8','edition_header':next(x for x in lines[:4] if '810 Version' in x),'license':'GPL-2.0-or-later','rights_notice':'Copyright © 2013 Robin A. Peel; complete original notice retained in source-nav810.dat','changes':'Bounded regional subset; explicit pairing, units converted to metres/kHz; GS values precede FlightGear scenery-height calibration.','compiler_sha256':sha(Path(__file__).read_bytes())},'records':records,'component_issues':diagnostics,'excluded_malformed_worldwide_rows':excluded,'unmodeled_source_rows':[{'source_line':r['line'],'row_type':r['type'],'id':r['id'],'reason':'NDB/marker or unmatched unsupported component; no simulated reception'} for r in selected if r['line'] not in used],'limitations':['Historical simulator inventory, not current AIRAC/NOTAM or real-flight data.','No RF propagation/terrain masking, surveyed runway or antenna acceptance.','Source-calibrated VOR radials are not current magnetic variation.','Only explicit paired DME/GS components are modeled.']}
    output.mkdir(parents=True,exist_ok=True)
    data=(json.dumps(package,ensure_ascii=False,indent=2)+'\n').encode()
    (output/'rhein-main-v1.json').write_bytes(data)
    # Corresponding source subset retains complete header and every used component row.
    header=next(x for x in lines[:4] if '810 Version' in x)
    source_text='I\n'+header+'\n\n'+'\n'.join(lines[i-1] for i in sorted(used))+'\n99\n'
    (output/'source-nav810.dat').write_text(source_text,encoding='utf-8')
    manifest={'version':1,'id':package['id'],'asset':'rhein-main-v1.json','sha256':sha(data),'bytes':len(data)}
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'records':len(records),'kinds':dict(Counter(r['kind'] for r in records)),'manifest':manifest,'eddf':[{'id':r['id'],'runway':r['runway'],'frequency_khz':r['frequency_khz'],'gs':bool(r['gs']),'dme':bool(r['dme'])} for r in records if r['airport']=='EDDF']}))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();compile_package(a.source,a.output)
