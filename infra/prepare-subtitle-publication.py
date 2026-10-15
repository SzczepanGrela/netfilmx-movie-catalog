#!/usr/bin/env python3
"""Prepare a private, inactive publication packet. No provider or database access."""
import argparse, copy, difflib, hashlib, json, os, pathlib, re

ROOT=pathlib.Path(__file__).resolve().parents[1]
def digest(file):
    with file.open('rb') as stream: return hashlib.file_digest(stream,'sha256').hexdigest()
def private(value):
    path=pathlib.Path(value).resolve()
    if not path.is_relative_to(ROOT/'artifacts'): raise ValueError('Evidence must stay in private artifacts.')
    return path
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('subtitle_evidence',type=private)
    parser.add_argument('derivative_evidence',type=private)
    parser.add_argument('output',type=private)
    args=parser.parse_args(); os.umask(0o077)
    if args.output.exists(): parser.error('Use a new private output directory.')
    evidence=json.loads(args.subtitle_evidence.read_text())
    derivatives=json.loads(args.derivative_evidence.read_text())['entries']
    manifest=ROOT/'NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json'
    original=manifest.read_text(); plan=json.loads(original); proposal=copy.deepcopy(plan)
    sintel=next(v for v in proposal['videos'] if v['slug']=='sintel')
    tracks={row['track']['trackKey']:row for row in evidence['tracks']}
    pending=[v for v in proposal['videos'] if v['playbackObjectKey'] is None]
    if plan['schemaVersion']!=2 or {v['slug'] for v in pending}!={'sintel','caminandes-llama-drama'}:
        raise ValueError('Shipping manifest changed; review a fresh proposal.')
    if len(tracks)!=10 or len(evidence['tracks'])!=10 or len(sintel['subtitles'])!=10:
        raise ValueError('Every one of Sintel’s ten original tracks is required.')
    source=next(d for d in derivatives if d['slug']=='sintel')
    if evidence['inputSha256']!=source['source_sha256']:
        raise ValueError('Subtitle source does not match the retained Sintel MKV.')
    objects=[]
    for item in pending:
        derivative=next(d for d in derivatives if d['slug']==item['slug'])
        file=private(args.derivative_evidence.parent/derivative['file'])
        if file.stat().st_size!=derivative['bytes'] or digest(file)!=derivative['sha256']:
            raise ValueError('Existing MP4 differs from the reviewed derivative record.')
        item['playbackObjectKey']=derivative['proposed_key']
        objects.append({'role':'playback','slug':item['slug'],'file':str(file.relative_to(ROOT)),
            'sha256':derivative['sha256'],'bytes':derivative['bytes'],'proposedKey':derivative['proposed_key'],'mime':'video/mp4',
            'acceptedBy':None,'publishedBy':None,'httpsReadback':None})
    for item in sintel['subtitles']:
        row=tracks[item['trackKey']];track=row['track']
        if item['objectKey'] is not None or any(item[key]!=track[key] for key in ['language','label','position']):
            raise ValueError('Track language/label/order differs from the shipping requirement.')
        file=private(args.subtitle_evidence.parent/'mp4-subtitles'/track['fileName'])
        text=file.read_text(encoding='utf-8')
        if digest(file)!=row['sha256'] or file.stat().st_size!=row['bytes'] or not text.startswith('WEBVTT\n') or text.count('-->')!=row['cueCount']:
            raise ValueError('Prepared WebVTT identity or cue count differs.')
        item['objectKey']=f"subtitles/sintel/{item['language']}/{row['sha256']}.vtt"
        objects.append({'role':'subtitle','slug':'sintel','trackKey':item['trackKey'],'language':item['language'],'label':item['label'],
            'file':str(file.relative_to(ROOT)),'sha256':row['sha256'],'bytes':row['bytes'],'cueCount':row['cueCount'],
            'proposedKey':item['objectKey'],'mime':'text/vtt; charset=utf-8','acceptedBy':None,'publishedBy':None,'httpsReadback':None})
    playback=iter(v['playbackObjectKey'] for v in pending)
    rendered=re.sub(r'("playbackObjectKey":\s*)null',lambda m:m[1]+json.dumps(next(playback)),original)
    by_key={s['trackKey']:s['objectKey'] for s in sintel['subtitles']}
    rendered,count=re.subn(r'("trackKey":\s*"([^"]+)"[^\n]*?"objectKey":\s*)null',lambda m:m[1]+json.dumps(by_key[m[2]]),rendered)
    if count!=10 or json.loads(rendered)!=proposal: raise ValueError('Proposal changed more than the twelve reviewed fields.')
    args.output.mkdir(mode=0o700,parents=True)
    (args.output/'proposed-retained-media.json').write_text(rendered)
    target='NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json'
    (args.output/'proposed-retained-media.patch').write_text(''.join(difflib.unified_diff(original.splitlines(True),rendered.splitlines(True),fromfile='a/'+target,tofile='b/'+target)))
    packet={'status':'preparation only; do not apply or publish','rightsAccepted':False,'providerWrites':False,
        'manifestActivated':False,'shippingManifestSha256':digest(manifest),'objects':objects,
        'subtitleSourceEvidence':str(args.subtitle_evidence.relative_to(ROOT)),'changedFields':12,
        'manualSafariMobile':None,'audibleSound':None,'subtitleQualityReview':None,'creditsReview':None,
        'acceptanceOrder':'local review, operator publication to new keys, actual HTTPS identity/MIME/Range/cache/CORS readback, then key activation/final-image import'}
    (args.output/'publication-record.json').write_text(json.dumps(packet,ensure_ascii=False,indent=2)+'\n')
    lines=['# Inactive subtitle/media publication proposal','',
        'This replaces the older two-field-only proposal. Do not apply or publish now.',
        'Two existing MP4s are unchanged; ten Sintel WebVTT objects preserve every source language. No video/audio reconversion is needed.',
        'The shipping manifest still has two playback nulls and ten subtitle nulls. This patch changes only those twelve fields.',
        'Local/manual review precedes operator publication. Preserve originals. Record exact object identity and actual HTTPS/MIME/Range/cache/CORS behavior before activation.',
        'Safari/mobile, audible sound, subtitle quality and notice acceptance remain open. See docs/subtitles.md and docs/media-acceptance.md.',
        '', '| Role / language | Bytes | SHA256 | Proposed key |','| --- | ---: | --- | --- |']
    lines += [f"| {o['slug']} / {o.get('language','playback')} | {o['bytes']} | `{o['sha256']}` | `{o['proposedKey']}` |" for o in objects]
    (args.output/'operator-publication.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps({'objects':len(objects),'subtitleTracks':10,'manifestFields':12,'activated':False,'providerWrites':False}))

if __name__=='__main__':main()
