#!/usr/bin/env python3
"""Compile the approved publication metadata only; no media reads or network."""
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
RECORD_SHA = 'bd89e9a34cf0ff6a0268608356fa45be7eed08ecfc4a92faaa5a810755c1ee88'
MANIFEST_SHA = 'e0ca16e65878eaf8bc647dc215ca8a3cc2c9eeba37c8883da0b73d7aa3b84327'

def compile_catalogue(record_bytes, manifest_bytes):
    if hashlib.sha256(record_bytes).hexdigest() != RECORD_SHA or hashlib.sha256(manifest_bytes).hexdigest() != MANIFEST_SHA:
        raise ValueError('Unapproved record or shipping manifest')
    record, manifest = json.loads(record_bytes), json.loads(manifest_bytes)
    objects = {}
    slugs = {v['slug'] for v in manifest['videos']}
    for obj in record['objects']:
        key = obj['proposedKey']
        if not re.fullmatch(r'[a-zA-Z0-9_./-]{1,512}', key) or any(p in ('', '.', '..') for p in key.split('/')) or key in objects:
            raise ValueError('Unsafe or duplicate key')
        if obj['slug'] not in slugs or obj['mime'] not in ('video/mp2t', 'application/vnd.apple.mpegurl', 'text/vtt; charset=utf-8', 'text/vtt'):
            raise ValueError('Unknown film or MIME')
        objects[key] = dict(film=obj['slug'], mime=obj['mime'], size=obj['bytes'], sha256=obj['sha256'])
    if len(objects) != 1398 or sum(o['size'] for o in objects.values()) != 1083549423:
        raise ValueError('Incomplete approved object list')
    films = {}
    for video in manifest['videos']:
        slug = video['slug']; master = video['playbackObjectKey']
        if objects[master]['film'] != slug or objects[master]['mime'] != 'application/vnd.apple.mpegurl':
            raise ValueError('Master does not belong to film')
        tracks = video.get('subtitles', [])
        for track in tracks:
            if objects[track['objectKey']]['film'] != slug or not objects[track['objectKey']]['mime'].startswith('text/vtt'):
                raise ValueError('Subtitle does not belong to film')
        films[slug] = dict(title=video['title'], master=master, subtitles=tracks)
        for key in [video.get('posterObjectKey'), video.get('backdropObjectKey')]:
            if key:
                if key in objects or not re.fullmatch(r'(posters|backdrops)/[a-z0-9_-]+\.(png|jpg)', key):
                    raise ValueError('Unexpected artwork key')
                objects[key] = dict(film=None, mime='image/png' if key.endswith('.png') else 'image/jpeg')
    if sum(o['film'] is None for o in objects.values()) != 13:
        raise ValueError('Expected thirteen reviewed artwork keys')
    body = dict(schema=1, manifestSha256=MANIFEST_SHA, publicationRecordSha256=RECORD_SHA, films=films, objects=dict(sorted(objects.items())))
    body['version'] = hashlib.sha256(json.dumps(body, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
    return json.dumps(body, indent=2, ensure_ascii=False) + '\n'

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publication-record', type=Path, required=True)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = compile_catalogue(args.publication_record.read_bytes(), (ROOT/'NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json').read_bytes())
    output = ROOT/'media-worker/catalogue.json'
    if args.check:
        if output.read_text() != data: raise SystemExit('Generated allowlist differs')
    else: output.write_text(data)
    print('Approved allowlist: 7 films, 1398 protected objects, 13 public artwork keys')
