#!/usr/bin/env python3
"""Offline retained-catalogue orchestration. Encoding belongs only to FFmpegService."""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import pathlib
import shutil
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = ROOT / 'NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json'
DLL = ROOT / 'qualification/HlsCatalogue/bin/Release/net10.0/HlsCatalogue.dll'
ENCODER = DLL.parent / 'NetFilmx_Service.dll'


def stamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def digest(file):
    with pathlib.Path(file).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def write_json(file, value):
    file = pathlib.Path(file)
    temporary = file.with_suffix(file.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(file)


def encode(originals, output, workers):
    originals = originals.resolve(strict=True)
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    if shutil.disk_usage(output).free < 10 * 2**30:
        raise RuntimeError('At least 10 GiB free local space required.')
    manifest_hash = digest(MANIFEST)
    videos = json.loads(MANIFEST.read_text())['videos']
    assert len(videos) == 7
    encoder_hash = digest(ENCODER)
    status = {'startedUtc': stamp(), 'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'encoderAssemblySha256': encoder_hash, 'shippingManifestSha256': manifest_hash,
              'ffmpegVersion': subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0],
              'ffprobeVersion': subprocess.check_output(['ffprobe', '-version'], text=True).splitlines()[0],
              'sharedEncoder': 'NetFilmx_Service.Processing.FFmpegService', 'workers': workers,
              'providerWrites': False, 'manifestActivated': False, 'entries': [], 'status': 'encoding'}
    status_file = output / 'encoding-status.json'
    write_json(status_file, status)

    def one(video):
        source = originals / pathlib.Path(video['sourceObjectKey']).name
        target = output / 'encoded' / video['slug']
        target.parent.mkdir(exist_ok=True, mode=0o700)
        marker = target / 'encoded.json'
        if marker.exists():
            previous = json.loads(marker.read_text())
            if previous['inputSha256'] != digest(source) or previous['encoderAssemblySha256'] != encoder_hash:
                raise RuntimeError('Existing encode differs; preserve it and use a new packet directory: ' + video['slug'])
            return {'slug': video['slug'], 'status': 'encoded', 'record': str(marker.relative_to(ROOT)), 'reusedCompletedEncode': True}
        print(json.dumps({'event': 'encoding', 'slug': video['slug'], 'utc': stamp()}), flush=True)
        with (output / (video['slug'] + '-encode.log')).open('w') as log:
            result = subprocess.run(['dotnet', str(DLL), 'encode', str(source), str(target)],
                                    cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, timeout=32*60)
        if result.returncode:
            raise RuntimeError('Shared encoder failed for ' + video['slug'] + '; see private encode log. Partial output retained.')
        metadata = json.loads(marker.read_text())
        if metadata['encoderAssemblySha256'] != encoder_hash:
            raise RuntimeError('Encoder changed during run.')
        return {'slug': video['slug'], 'status': 'encoded', 'record': str(marker.relative_to(ROOT)),
                'elapsedSeconds': metadata['elapsedSeconds'], 'variants': metadata['plan']['variants'],
                'bytes': sum(item['bytes'] for item in metadata['objects']), 'objects': len(metadata['objects'])}

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        jobs = {pool.submit(one, video): video['slug'] for video in videos}
        for job in concurrent.futures.as_completed(jobs):
            try:
                entry = job.result()
            except Exception as error:
                entry = {'slug': jobs[job], 'status': 'failed', 'error': str(error)}
            status['entries'].append(entry)
            status['updatedUtc'] = stamp()
            write_json(status_file, status)
            print(json.dumps(entry), flush=True)
    if digest(MANIFEST) != manifest_hash:
        raise RuntimeError('Shipping manifest changed during encoding.')
    status['status'] = 'encoded' if all(e['status'] == 'encoded' for e in status['entries']) else 'failed'
    status['completedUtc'] = stamp()
    write_json(status_file, status)
    if status['status'] != 'encoded':
        raise RuntimeError('At least one encode failed; originals and partial evidence retained.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['encode'])
    parser.add_argument('originals', type=pathlib.Path)
    parser.add_argument('output', type=pathlib.Path)
    parser.add_argument('--workers', type=int, choices=[1, 2], default=2)
    args = parser.parse_args()
    encode(args.originals, args.output.resolve(), args.workers)


if __name__ == '__main__':
    main()
