#!/usr/bin/env python3
"""Verify local HLS graphs/segments and prepare an inactive R2 publication packet."""
import argparse
import concurrent.futures
import copy
import difflib
import hashlib
import json
import math
import pathlib
import re
import subprocess
from fractions import Fraction
from retained_hls import ROOT, MANIFEST, digest, stamp, write_json

MIMES = {'.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t', '.vtt': 'text/vtt; charset=utf-8'}


def peak_segment_bitrate(segments, target=6):
    # RFC 8216 section 4.1: contiguous windows of 0.5–1.5 target durations.
    # A one-frame final segment alone is not a valid peak-rate window.
    rates = []
    for start in range(len(segments)):
        duration = size = 0
        for segment in segments[start:]:
            duration += segment['duration']; size += segment['bytes']
            if duration > 1.5 * target: break
            if duration >= .5 * target: rates.append(size * 8 / duration)
    return max(rates) if rates else sum(s['bytes'] for s in segments) * 8 / sum(s['duration'] for s in segments)


def safe_reference(value, extension):
    if not re.fullmatch(r'[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*', value) or not value.endswith(extension):
        raise ValueError('Unsafe or unexpected HLS reference: ' + value)
    return value


def playlist(file):
    text = file.read_text(encoding='utf-8-sig')
    if not text.startswith('#EXTM3U\n') or 'URI=' in text or '#EXT-X-KEY' in text:
        raise ValueError('Unexpected playlist syntax or external/key URI: ' + str(file))
    return [line.strip() for line in text.splitlines() if line.strip()]


def media_graph(file):
    lines = playlist(file)
    if '#EXT-X-ENDLIST' not in lines or '#EXT-X-PLAYLIST-TYPE:VOD' not in lines or '#EXT-X-INDEPENDENT-SEGMENTS' not in lines:
        raise ValueError('Media playlist is not complete independent VOD')
    segments = []
    duration = None
    for line in lines:
        if line.startswith('#EXTINF:'):
            duration = float(line[8:].rstrip(','))
            if not math.isfinite(duration) or duration <= 0 or duration > 6.15:
                raise ValueError('Invalid segment duration')
        elif not line.startswith('#'):
            safe_reference(line, '.ts')
            segment = file.parent / line
            if duration is None or not segment.is_file() or segment.is_symlink() or segment.stat().st_size == 0:
                raise ValueError('Missing segment or EXTINF')
            segments.append({'name': line, 'duration': duration, 'bytes': segment.stat().st_size})
            duration = None
    if duration is not None or not segments or len({s['name'] for s in segments}) != len(segments):
        raise ValueError('Incomplete or duplicate segment graph')
    target = int(next(line.split(':')[1] for line in lines if line.startswith('#EXT-X-TARGETDURATION:')))
    if any(round(s['duration']) > target for s in segments):
        raise ValueError('Target duration too small')
    return segments


def probe(file, entries, packets=False):
    command = ['ffprobe', '-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_entries', entries, '-of', 'json']
    if packets:
        command += ['-select_streams', 'v:0', '-show_packets', '-read_intervals', '%+#1']
    result = subprocess.run(command + [str(file)], capture_output=True, text=True, timeout=20)
    if result.returncode or result.stderr.strip():
        raise ValueError('Failed/damaged media probe: ' + str(file))
    return json.loads(result.stdout)


def verify_film(run, video):
    directory = run / 'encoded' / video['slug']
    encoded = json.loads((directory / 'encoded.json').read_text())
    plan = json.loads((directory / 'encoding-plan.json').read_text())
    source = pathlib.Path(plan['input'])
    if digest(source) != encoded['inputSha256']:
        raise ValueError('Original identity changed')
    original = probe(source, 'format=duration:stream=codec_type,codec_name,width,height,sample_aspect_ratio,channels,r_frame_rate')
    original_video = next(s for s in original['streams'] if s['codec_type'] == 'video')
    source_dar = Fraction(original_video['width'], original_video['height']) * Fraction(original_video.get('sample_aspect_ratio', '1:1').replace(':', '/'))
    source_duration = float(original['format']['duration'])
    folder = directory / 'hls'
    actual_files = {f.name for f in folder.iterdir()}
    expected_files = {item['file'] for item in encoded['objects']}
    if actual_files != expected_files:
        raise ValueError('Unlisted, missing or temporary encoder outputs')
    for item in encoded['objects']:
        file = folder / item['file']
        if file.is_symlink() or file.stat().st_size != item['bytes'] or digest(file) != item['sha256']:
            raise ValueError('Output checksum/length changed: ' + str(file))
    master = playlist(folder / 'master.m3u8')
    children = [line for line in master if not line.startswith('#')]
    declarations = [line for line in master if line.startswith('#EXT-X-STREAM-INF:')]
    if len(children) != len(encoded['plan']['variants']) or len(children) != len(declarations) or len(children) < 2:
        raise ValueError('Expected complete adaptive ladder')
    variants = []
    all_segments = []
    referenced = {'master.m3u8'}
    for index, (name, declaration) in enumerate(zip(children, declarations)):
        safe_reference(name, '.m3u8')
        segments = media_graph(folder / name)
        referenced.add(name)
        referenced.update(s['name'] for s in segments)
        total = sum(s['duration'] for s in segments)
        if abs(total - source_duration) > .16:
            raise ValueError('Full-film/closing duration differs: ' + video['slug'])
        if variants and (len(segments) != len(variants[0]['segments']) or any(abs(a['duration']-b['duration']) > .085 for a,b in zip(segments, variants[0]['segments']))):
            raise ValueError('Variant segment boundaries differ')
        details = probe(folder / segments[0]['name'], 'stream=codec_name,codec_type,width,height,display_aspect_ratio,pix_fmt,channels,sample_rate')
        v = next(s for s in details['streams'] if s['codec_type'] == 'video')
        audio = [s for s in details['streams'] if s['codec_type'] == 'audio']
        target = encoded['plan']['variants'][index]
        if (v['codec_name'] != 'h264' or v['pix_fmt'] != 'yuv420p' or v['width'] != target['width'] or v['height'] != target['height']
                or v['width'] > original_video['width'] or v['height'] > original_video['height']
                or abs(float(Fraction(v['display_aspect_ratio'].replace(':', '/')) / source_dar) - 1) > .001):
            raise ValueError('Codec, dimensions, upscale or aspect mismatch')
        if len(audio) != 1 or audio[0]['codec_name'] != 'aac' or audio[0]['channels'] != 2 or audio[0]['sample_rate'] != '48000':
            raise ValueError('Expected one stereo AAC 48 kHz stream per variant')
        resolution = re.search(r'RESOLUTION=(\d+)x(\d+)', declaration)
        if not resolution or tuple(map(int,resolution.groups())) != (v['width'], v['height']):
            raise ValueError('Master resolution declaration mismatch')
        bandwidth = int(re.search(r'(?<!-)BANDWIDTH=(\d+)', declaration)[1])
        peak = peak_segment_bitrate(segments)
        if bandwidth < peak * .99:
            raise ValueError('Master bandwidth underestimates measured segment peak')
        variants.append({'playlist': name, 'width': v['width'], 'height': v['height'], 'displayAspectRatio': v['display_aspect_ratio'],
                         'declaredBandwidth': bandwidth, 'measuredPeakBandwidth': math.ceil(peak),
                         'maximumSingleSegmentBitrate': math.ceil(max(s['bytes']*8/s['duration'] for s in segments)),
                         'measuredAverageBandwidth': math.ceil(sum(s['bytes'] for s in segments)*8/total),
                         'duration': total, 'segments': segments})
        all_segments.extend((index, folder / s['name']) for s in segments)
    sidecars = [f for f in actual_files if f.endswith('.vtt')]
    if referenced | set(sidecars) != actual_files:
        raise ValueError('Orphaned or unreferenced playback output')

    def first_packet(item):
        index, file = item
        data = probe(file, 'packet=pts_time,flags', packets=True)
        packets = data.get('packets', [])
        if not packets or 'K' not in packets[0].get('flags', ''):
            raise ValueError('Segment does not begin with a video keyframe: ' + file.name)
        return index, file.name, float(packets[0]['pts_time'])

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        packet_results = list(pool.map(first_packet, all_segments))
    for index, variant in enumerate(variants):
        times = [pts for i, _, pts in packet_results if i == index]
        variant['firstVideoPts'] = times[0]
        variant['allSegmentsStartWithKeyframes'] = True
        if any(abs((pts-times[0])-sum(s['duration'] for s in variant['segments'][:i])) > .085 for i,pts in enumerate(times)):
            raise ValueError('Segment presentation times differ from playlist')
        if abs(times[0] - variants[0]['firstVideoPts']) > .085:
            raise ValueError('Variants use different video time origins')
    if video['slug'] == 'sintel':
        accepted = json.loads((ROOT/'artifacts/subtitles/20261015-publication-proposal/publication-record.json').read_text())
        tracks = [o for o in accepted['objects'] if o['role'] == 'subtitle']
        if len(sidecars) != 10 or len(encoded['tracks']) != 10:
            raise ValueError('All ten Sintel tracks required')
        for track in tracks:
            # Stable stream keys and exactly the already accepted VTT bytes/times.
            match = next(t for t in encoded['tracks'] if t['trackKey'] == track['trackKey'])
            if (match['language'], match['label']) != (track['language'], track['label']) or digest(folder/match['fileName']) != track['sha256']:
                raise ValueError('Sintel sidecar identity or label changed')
    elif sidecars:
        raise ValueError('Unexpected subtitle inventory for retained title')
    return {'slug': video['slug'], 'status': 'passed', 'sourceObjectKey': video['sourceObjectKey'], 'input': str(source.relative_to(ROOT)),
            'sourceSha256': encoded['inputSha256'], 'sourceBytes': encoded['inputBytes'], 'sourceProbe': original,
            'encodingRecord': str((directory/'encoded.json').relative_to(ROOT)), 'variants': variants,
            'totalBytes': sum(o['bytes'] for o in encoded['objects']), 'objects': len(encoded['objects']), 'subtitleTracks': encoded['tracks']}


def verify(run):
    result = {'observedUtc': stamp(), 'scope': 'Local bytes, complete playlist graph, all segment keyframes and source preservation; no audible/native-device/production acceptance',
              'providerWrites': False, 'manifestActivated': False, 'entries': [], 'status': 'failed'}
    for video in json.loads(MANIFEST.read_text())['videos']:
        try:
            entry = verify_film(run, video)
        except Exception as error:
            entry = {'slug': video['slug'], 'status': 'failed', 'error': str(error)}
        result['entries'].append(entry)
        write_json(run/'verification.json', result)
        print(json.dumps({'slug': entry['slug'], 'status': entry['status'], 'error': entry.get('error')}), flush=True)
    result['status'] = 'passed' if all(e['status'] == 'passed' for e in result['entries']) else 'failed'
    write_json(run/'verification.json', result)
    if result['status'] != 'passed':
        raise ValueError('Verification failed; do not prepare publication.')


def package(run):
    verification = json.loads((run/'verification.json').read_text())
    if verification['status'] != 'passed' or len(verification['entries']) != 7:
        raise ValueError('Complete verification required first')
    original_text = MANIFEST.read_text()
    original_hash = digest(MANIFEST)
    mapping = json.loads(original_text)
    proposed = copy.deepcopy(mapping)
    objects = []
    summaries = []
    for video, checked in zip(proposed['videos'], verification['entries']):
        if video['slug'] != checked['slug']: raise ValueError('Catalogue order mismatch')
        if any(v['declaredBandwidth'] < v['measuredPeakBandwidth'] * .99 for v in checked['variants']):
            raise ValueError('Master bandwidth underestimates verified segment peak')
        directory = run/'encoded'/video['slug']
        encoded = json.loads((directory/'encoded.json').read_text())
        playback = [item for item in encoded['objects'] if not item['file'].endswith('.vtt')]
        bundle = hashlib.sha256(json.dumps(playback,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        prefix = 'videos/hls/'+video['slug']+'/'+bundle+'/'
        video['playbackObjectKey'] = prefix+'master.m3u8'
        for item in playback:
            file = directory/'hls'/item['file']
            if digest(file) != item['sha256']:raise ValueError('Playback changed since verification')
            objects.append({'slug':video['slug'],'role':'master' if item['file']=='master.m3u8' else 'variant' if item['file'].endswith('.m3u8') else 'segment',
                            'file':str(file.relative_to(ROOT)),'proposedKey':prefix+item['file'],'bytes':item['bytes'],'sha256':item['sha256'],
                            'mime':MIMES[file.suffix],'cacheControl':'public,max-age=31536000,immutable','acceptedBy':None,'publishedBy':None,'httpsReadback':None})
        for track in video.get('subtitles',[]):
            t=next(t for t in encoded['tracks'] if t['trackKey']==track['trackKey'])
            file=directory/'hls'/t['fileName'];checksum=digest(file)
            track['objectKey']='subtitles/sintel/'+track['language']+'/'+checksum+'.vtt'
            objects.append({'slug':video['slug'],'role':'subtitle','trackKey':track['trackKey'],'language':track['language'],'label':track['label'],
                            'file':str(file.relative_to(ROOT)),'proposedKey':track['objectKey'],'bytes':file.stat().st_size,'sha256':checksum,
                            'mime':MIMES['.vtt'],'cacheControl':'public,max-age=31536000,immutable','acceptedBy':None,'publishedBy':None,'httpsReadback':None})
        summaries.append({'slug':video['slug'],'bundleSha256':bundle,'masterKey':video['playbackObjectKey'],'variants':[{k:v for k,v in variant.items() if k!='segments'} for variant in checked['variants']],
                          'sourceObjectKey':video['sourceObjectKey'],'sourceSha256':checked['sourceSha256'],'sourceBytes':checked['sourceBytes'],
                          'totalBytes':checked['totalBytes'],'objects':checked['objects']})
    keys=[o['proposedKey'] for o in objects]
    if len(keys)!=len(set(keys)) or sum(o['role']=='master' for o in objects)!=7 or sum(o['role']=='subtitle' for o in objects)!=10:
        raise ValueError('Invalid final object inventory')
    destination=run/'publication-proposal';destination.mkdir(exist_ok=True,mode=0o700)
    new_text=json.dumps(proposed,ensure_ascii=False,indent=2)+'\n'
    write_json(destination/'proposed-retained-media.json',proposed)
    patch=''.join(difflib.unified_diff(original_text.splitlines(True),new_text.splitlines(True),fromfile='a/NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json',tofile='b/NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json'))
    (destination/'proposed-retained-media.patch').write_text(patch)
    ordered=sorted(objects,key=lambda o:({'segment':0,'subtitle':1,'variant':2,'master':3}[o['role']],o['proposedKey']))
    record={'createdUtc':stamp(),'kind':'retained-seven-film-hls','shippingManifestSha256':original_hash,
            'proposedManifestSha256':hashlib.sha256(new_text.encode()).hexdigest(),
            'patchSha256':digest(destination/'proposed-retained-media.patch'),'manifestActivated':False,'providerWrites':False,
            'supersedes':'artifacts/subtitles/20261015-publication-proposal (two MP4s and ten VTTs), retained as history; never apply that patch',
            'targetPlaybackFields':7,'targetSubtitleFields':10,'sourceHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
            'films':summaries,'objects':ordered,'totalBytes':sum(o['bytes'] for o in objects),'objectCount':len(objects),
            'acceptedBy':None,'publicationApprovedBy':None,'publishedBy':None,'targetHttpsCors':None,
            'limitations':['First audio stream only; stereo AAC','Sintel perceived synchronization cause/full acceptance unresolved',
                           'Earlier manual tests are preserved at their old artifact scope; no full manual HLS acceptance inferred',
                           'Safari/iOS and previously deferred trials remain deferred','Actual target HTTPS/CORS and final-image qualification follow separate publication decision']}
    write_json(destination/'publication-record.json',record)
    with (destination/'objects.sha256').open('w') as f:
        for item in ordered:f.write(item['sha256']+'  '+item['file']+'\n')
    with (destination/'upload-order.jsonl').open('w') as f:
        for item in ordered:f.write(json.dumps({k:item[k] for k in ['file','proposedKey','mime','cacheControl','bytes','sha256']})+'\n')
    if digest(MANIFEST)!=original_hash:raise ValueError('Shipping manifest changed')
    print(json.dumps({'packet':str(destination),'objects':len(objects),'bytes':record['totalBytes'],'manifestActivated':False}))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=['verify','package'])
    parser.add_argument('run',type=pathlib.Path)
    args=parser.parse_args()
    (verify if args.command=='verify' else package)(args.run.resolve())


if __name__=='__main__':main()
