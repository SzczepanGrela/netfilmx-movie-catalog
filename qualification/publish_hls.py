#!/usr/bin/env python3
"""One reviewed HLS packet: local preflight by default; explicit S3/HTTPS modes."""
import argparse
import collections
import contextlib
import datetime
import fcntl
import hashlib
import json
import os
import pathlib
import re
import shutil
import signal
import stat
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass

from hls_package import MIMES, media_graph, playlist, safe_reference

ROOT = pathlib.Path(__file__).resolve().parent.parent
FIELDS = ('file', 'proposedKey', 'mime', 'cacheControl', 'bytes', 'sha256')
PHASE = {'segment': 0, 'subtitle': 1, 'variant': 2, 'master': 3}
HTTP_USER_AGENT = 'NetFilmxPublicationVerifier/1.0'


class PublicationError(Exception):
    """Messages contain fixed reasons, never raw AWS/HTTP responses."""


def require(condition, reason):
    if not condition:
        raise PublicationError(reason)


def checksum(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def unique_json(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'duplicate JSON field')
        result[key] = value
    return result


def decode_json(text):
    return json.loads(text, object_pairs_hook=unique_json)


def local_file(root, relative):
    require(isinstance(relative, str) and re.fullmatch(r'[A-Za-z0-9_./-]+', relative), 'unsafe local path')
    parts = pathlib.PurePosixPath(relative).parts
    require(parts and parts[0] != '/' and relative == '/'.join(parts) and '..' not in parts, 'unsafe local path')
    file = root
    for part in parts:
        file = file / part
        require(not file.is_symlink(), 'symlink in local path')
    require(file.resolve(strict=True).is_relative_to(root) and stat.S_ISREG(file.stat().st_mode), 'local file is not regular')
    return file


@dataclass
class Packet:
    root: pathlib.Path
    directory: pathlib.Path
    record_sha: str
    order_sha: str
    objects: list

    def file(self, item):
        return local_file(self.root, item['file'])


def preflight(directory, approved_sha, root=ROOT):
    """No subprocess, network, credentials, FFmpeg or mutation."""
    require(re.fullmatch(r'[0-9a-f]{64}', approved_sha or ''), 'explicit approved record SHA-256 required')
    root = pathlib.Path(root).resolve(strict=True)
    directory = pathlib.Path(directory).absolute()
    require(directory.is_relative_to(root), 'packet must be inside source root')
    controls = {name: local_file(root, str((directory/name).relative_to(root))) for name in
                ['publication-record.json', 'upload-order.jsonl', 'objects.sha256', 'proposed-retained-media.json', 'proposed-retained-media.patch']}
    require(all(f.stat().st_size <= 8*1024*1024 for f in controls.values()), 'packet metadata too large')
    raw = {name: file.read_bytes() for name, file in controls.items()}
    hashes = {name: hashlib.sha256(data).hexdigest() for name, data in raw.items()}
    require(hashes['publication-record.json'] == approved_sha, 'publication record identity differs')
    record = decode_json(raw['publication-record.json'])
    require(record['kind'] == 'retained-seven-film-hls' and record['providerWrites'] is False
            and record['manifestActivated'] is False, 'inactive HLS proposal required')
    require(hashes['proposed-retained-media.json'] == record['proposedManifestSha256']
            and hashes['proposed-retained-media.patch'] == record['patchSha256'], 'mapping or patch identity differs')
    objects = record['objects']
    require(0 < len(objects) <= 10000 and len(objects) == record['objectCount'], 'incomplete object inventory')
    order = [decode_json(line) for line in raw['upload-order.jsonl'].splitlines()]
    require(order == [{k: item[k] for k in FIELDS} for item in objects], 'upload list differs from approved record')
    require(len({x['proposedKey'] for x in objects}) == len(objects)
            and len({x['file'] for x in objects}) == len(objects), 'duplicate object key or file')
    require(sum(x['bytes'] for x in objects) == record['totalBytes'], 'total byte count differs')
    phases = []
    for item in objects:
        key, role = item['proposedKey'], item['role']
        require(role in PHASE and isinstance(key, str) and re.fullmatch(r'[A-Za-z0-9_./-]+', key)
                and all(p not in ('', '.', '..') for p in key.split('/')), 'unsafe key or role')
        require(type(item['bytes']) is int and 0 < item['bytes'] <= 5*1024*1024,
                'unsupported single-PutObject size')
        require(re.fullmatch(r'[0-9a-f]{64}', item['sha256']), 'invalid object checksum')
        file = local_file(root, item['file'])
        suffix = {'segment': '.ts', 'subtitle': '.vtt', 'variant': '.m3u8', 'master': '.m3u8'}[role]
        require(file.suffix == suffix and key.endswith(suffix) and item['mime'] == MIMES[suffix]
                and item['cacheControl'] == 'public,max-age=31536000,immutable', 'unexpected object metadata')
        require(file.stat().st_size == item['bytes'] and checksum(file) == item['sha256'], 'local size or SHA-256 differs')
        phases.append(PHASE[role])
    require(phases == sorted(phases), 'masters or playlists precede their dependencies')
    expected_sums = ''.join(x['sha256']+'  '+x['file']+'\n' for x in objects)
    require(raw['objects.sha256'].decode('utf-8') == expected_sums, 'checksum list differs')
    packet = Packet(root, directory, approved_sha, hashes['upload-order.jsonl'], objects)
    check_graph(packet, record, decode_json(raw['proposed-retained-media.json']))
    require(all(checksum(file) == hashes[name] for name, file in controls.items()), 'packet metadata changed during preflight')
    return packet


def check_graph(packet, record, mapping):
    by_key = {x['proposedKey']: x for x in packet.objects}
    require(len({f['slug'] for f in record['films']}) == len(record['films']), 'duplicate film')
    require(record['targetPlaybackFields'] == len(record['films']) == len(mapping['videos']), 'film mapping incomplete')
    reached, subtitles = set(), set()
    for film in record['films']:
        video = next(v for v in mapping['videos'] if v['slug'] == film['slug'])
        key = film['masterKey']
        require(key == video['playbackObjectKey'] and by_key[key]['role'] == 'master', 'master mapping differs')
        prefix = f"videos/hls/{film['slug']}/{film['bundleSha256']}/"
        require(re.fullmatch(r'[0-9a-f]{64}', film['bundleSha256']) and key == prefix+'master.m3u8', 'unexpected bundle key')
        reached.add(key)
        master = packet.file(by_key[key])
        children = [line for line in playlist(master) if not line.startswith('#')]
        require(len(children) == len(film['variants']) and len(children) > 0, 'variant inventory differs')
        for child in children:
            safe_reference(child, '.m3u8')
            variant = by_key[prefix+child]
            require(variant['role'] == 'variant' and packet.file(variant) == master.parent/child, 'variant path differs')
            reached.add(prefix+child)
            for segment in media_graph(packet.file(variant)):
                row = by_key[prefix+segment['name']]
                require(row['role'] == 'segment' and packet.file(row) == master.parent/segment['name'], 'segment path differs')
                reached.add(prefix+segment['name'])
        for track in video.get('subtitles', []):
            row = by_key[track['objectKey']]
            require(row['role'] == 'subtitle' and all(row[k] == track[k] for k in ['trackKey', 'language', 'label']), 'subtitle mapping differs')
            require(track['objectKey'] == f"subtitles/{film['slug']}/{track['language']}/{row['sha256']}.vtt", 'subtitle key differs')
            require(track['objectKey'] not in subtitles, 'duplicate subtitle reference')
            subtitles.add(track['objectKey'])
    require(reached | subtitles == set(by_key) and len(subtitles) == record['targetSubtitleFields'], 'missing or orphaned objects')


class Journal:
    def __init__(self, directory, packet, mode, target, resume=False):
        self.directory = pathlib.Path(directory).absolute()
        require(self.directory.resolve() == self.directory, 'journal path contains symlinks or dot segments')
        require(not self.directory.is_relative_to(packet.directory), 'journal must be outside original packet')
        for item in packet.objects:
            parent = packet.file(item).parent
            require(not self.directory.is_relative_to(parent) and not parent.is_relative_to(self.directory), 'journal overlaps media')
        if not resume:
            self.directory.mkdir(mode=0o700, parents=True, exist_ok=False)
        require(not self.directory.is_symlink(), 'journal cannot be a symlink')
        require(all(not (self.directory/name).is_symlink() for name in
                    ['lock', 'binding.json', 'objects.jsonl', 'result.json', 'result.json.tmp']), 'symlink in journal')
        self.lock = (self.directory/'lock').open('a')
        try:
            fcntl.flock(self.lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            self.lock.close()
            raise PublicationError('journal already in use') from None
        self.binding = {'recordSha256': packet.record_sha, 'uploadOrderSha256': packet.order_sha,
                        'objects': len(packet.objects), 'mode': mode, 'target': target}
        binding = self.directory/'binding.json'
        try:
            if resume:
                require(decode_json(binding.read_text()) == self.binding, 'resume packet, list, mode or target differs')
                with (self.directory/'objects.jsonl').open() as previous:
                    for line in previous:
                        require(line.endswith('\n') and isinstance(decode_json(line), dict),
                                'damaged journal; preserve it and start a new journal with the same packet/target')
            else:
                binding.write_text(json.dumps(self.binding, indent=2)+'\n')
        except BaseException:
            self.lock.close()
            raise
        self.stream = (self.directory/'objects.jsonl').open('a')
        self.current = None
        self.attempt = uuid.uuid4().hex
        self.summary = {'mode': mode, 'attempt': self.attempt, 'status': 'in_progress', 'objects': len(packet.objects),
                        'bytes': sum(x['bytes'] for x in packet.objects), 'verifiedObjects': 0,
                        'putAttempts': 0, 'transferComplete': False, 'httpVerified': False,
                        'browserPlayerAccepted': False, 'manifestActivated': False,
                        'recordSha256': packet.record_sha, 'uploadOrderSha256': packet.order_sha,
                        'roleCounts': dict(collections.Counter(x['role'] for x in packet.objects)),
                        'dryRunNoNetwork': mode == 'dry-run', 'toolSha256': checksum(pathlib.Path(__file__))}
        if mode == 'verify-https':
            self.summary['httpUserAgent'] = HTTP_USER_AGENT
        self.finish('in_progress')

    def event(self, item, status):
        self.current = item
        self.stream.write(json.dumps({'attempt': self.attempt, 'atUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'key': item['proposedKey'], 'role': item['role'], 'status': status,
            'sha256': item['sha256'], 'bytes': item['bytes']})+'\n')
        self.stream.flush()
        os.fsync(self.stream.fileno())

    def finish(self, status, reason=None):
        self.summary.update(status=status, reason=reason)
        for name in ['attempt-'+self.attempt+'.json', 'result.json']:
            temporary = self.directory/(name+'.tmp')
            with temporary.open('w') as stream:
                stream.write(json.dumps(self.summary, indent=2)+'\n'); stream.flush(); os.fsync(stream.fileno())
            temporary.replace(self.directory/name)

    def close(self):
        self.stream.close()
        self.lock.close()


class AwsFailure(PublicationError):
    def __init__(self, code):
        self.code = code
        super().__init__('AWS operation failed: '+code)


def origin(value, allow_http=False):
    require(isinstance(value, str), 'explicit HTTPS origin required')
    parsed = urllib.parse.urlsplit(value)
    require(parsed.scheme in (['http', 'https'] if allow_http else ['https']) and parsed.hostname
            and not parsed.username and not parsed.password and parsed.path in ('', '/')
            and not parsed.query and not parsed.fragment and not re.search(r'[\s\x00-\x1f]', value), 'explicit HTTPS origin required')
    return value.rstrip('/')


class Aws:
    def __init__(self, profile, endpoint, bucket):
        require(profile and re.fullmatch(r'[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}', profile), 'explicit S3 profile required')
        require(bucket and re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]', bucket), 'explicit bucket required')
        self.target = {'profile': profile, 'endpoint': origin(endpoint), 'bucket': bucket}

    def call(self, operation, arguments):
        env = dict(os.environ, AWS_MAX_ATTEMPTS='1', AWS_RETRY_MODE='standard', AWS_EC2_METADATA_DISABLED='true',
                   AWS_PAGER='', AWS_CLI_AUTO_PROMPT='off')
        command = ['aws', '--profile', self.target['profile'], '--endpoint-url', self.target['endpoint'], '--region', 'auto',
                   '--no-cli-pager', '--no-cli-auto-prompt', '--output', 'json', '--color', 'off',
                   '--cli-connect-timeout', '10', '--cli-read-timeout', '60', 's3api', operation,
                   '--bucket', self.target['bucket'], *arguments]
        try:
            result = subprocess.run(command, env=env, capture_output=True, text=True, timeout=90, check=False)
        except (OSError, subprocess.TimeoutExpired):
            raise AwsFailure('uncertain_transport') from None
        if result.returncode:
            match = re.search(r'An error occurred \(([A-Za-z0-9_.-]{1,80})\) when calling', result.stderr)
            known = {'NoSuchKey', 'NoSuchBucket', 'AccessDenied', 'Forbidden', 'InvalidAccessKeyId',
                     'SignatureDoesNotMatch', 'ExpiredToken', 'PreconditionFailed', '412',
                     'ConditionalRequestConflict', '409', 'RequestTimeout', 'SlowDown', 'InvalidRequest'}
            raise AwsFailure(match[1] if match and match[1] in known else 'unclassified_failure')
        try:
            data = decode_json(result.stdout)
            require(isinstance(data, dict), 'invalid AWS response')
            return data
        except (ValueError, PublicationError):
            raise AwsFailure('uncertain_response') from None

    def get(self, item, file):
        file.unlink(missing_ok=True)  # Private temporary readback only; never reuse stale bytes.
        try:
            return self.call('get-object', ['--key', item['proposedKey'], str(file)])
        except AwsFailure as error:
            if error.code == 'NoSuchKey':
                return None
            raise

    def put(self, item, file):
        return self.call('put-object', ['--key', item['proposedKey'], '--body', str(file),
            '--if-none-match', '*', '--content-type', item['mime'], '--cache-control', item['cacheControl']])


def compare_remote(item, metadata, file):
    require(type(metadata.get('ContentLength')) is int and metadata['ContentLength'] == item['bytes'] and file.stat().st_size == item['bytes']
            and checksum(file) == item['sha256'] and metadata.get('ContentType') == item['mime']
            and metadata.get('CacheControl') == item['cacheControl']
            and metadata.get('ContentEncoding', 'identity') == 'identity', 'remote content or metadata conflict')


def publish(packet, aws, journal):
    # Every resume reads each object again. A previous journal entry or ETag is
    # never authority to skip it. Unknown prior writes retain their old events.
    with tempfile.TemporaryDirectory(prefix='netfilmx-publication-') as temporary:
        directory = pathlib.Path(temporary)
        for index, item in enumerate(packet.objects):
            if item['role'] == 'master':
                require(journal.summary['verifiedObjects'] == index, 'master dependency gate failed')
            journal.event(item, 'checking')
            remote = directory/'readback'
            metadata = aws.get(item, remote)
            if metadata is not None:
                compare_remote(item, metadata, remote)
                journal.event(item, 'existing_verified')
            else:
                snapshot = directory/'body'
                shutil.copyfile(packet.file(item), snapshot)
                require(snapshot.stat().st_size == item['bytes'] and checksum(snapshot) == item['sha256'], 'source changed after preflight')
                journal.event(item, 'put_started')
                journal.summary['putAttempts'] += 1
                try:
                    aws.put(item, snapshot)
                except AwsFailure as error:
                    if error.code not in ('PreconditionFailed', '412'):
                        journal.event(item, 'put_unresolved_or_refused')
                        raise
                    journal.event(item, 'precondition_failed_readback_required')
                metadata = aws.get(item, remote)
                require(metadata is not None, 'write result unresolved; stop and explicitly resume later')
                compare_remote(item, metadata, remote)
                journal.event(item, 'put_or_race_verified')
            journal.summary['verifiedObjects'] += 1
            journal.finish('in_progress')
    journal.summary['transferComplete'] = journal.summary['verifiedObjects'] == len(packet.objects)
    journal.finish('s3_complete')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class HttpVerifier:
    def __init__(self, media, application, allow_http=False):
        self.media, self.application = origin(media, allow_http), origin(application, allow_http)
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    def request(self, item, method, headers=None):
        url = self.media+'/'+urllib.parse.quote(item['proposedKey'], safe='/-._~')
        request = urllib.request.Request(url, method=method,
            headers={'Origin': self.application, 'Accept-Encoding': 'identity', **(headers or {}),
                     'User-Agent': HTTP_USER_AGENT})
        try:
            return self.opener.open(request, timeout=30)
        except urllib.error.HTTPError as error:
            error.close()
            raise PublicationError('HTTPS HTTP status failed; redirects are not followed') from None
        except (OSError, urllib.error.URLError):
            raise PublicationError('HTTPS request failed; no browser acceptance inferred') from None

    def headers(self, response, item, length):
        def normalized(value, delimiter):
            return sorted(x.strip().lower() for x in (value or '').split(delimiter))
        require(response.headers.get('Content-Length') == str(length)
                and normalized(response.headers.get('Content-Type'), ';') == normalized(item['mime'], ';')
                and normalized(response.headers.get('Cache-Control'), ',') == normalized(item['cacheControl'], ',')
                and response.headers.get('Content-Encoding', 'identity') == 'identity', 'HTTPS length/MIME/cache differs')
        require(response.headers.get('Access-Control-Allow-Origin') == self.application, 'HTTPS CORS origin differs or missing')
        exposed = {x.strip().lower() for x in response.headers.get('Access-Control-Expose-Headers', '').split(',')}
        require({'accept-ranges', 'content-length', 'content-range', 'etag'} <= exposed, 'HTTPS CORS exposure incomplete')

    def verify(self, item, file):
        with self.request(item, 'GET') as response:
            require(response.status == 200, 'HTTPS full GET status differs')
            self.headers(response, item, item['bytes'])
            digest = hashlib.sha256(); size = 0
            while chunk := response.read(128*1024):
                size += len(chunk); require(size <= item['bytes'], 'HTTPS body longer than expected'); digest.update(chunk)
            require(size == item['bytes'] and digest.hexdigest() == item['sha256'], 'HTTPS full checksum differs')
        with self.request(item, 'HEAD') as response:
            require(response.status == 200, 'HTTPS HEAD status differs'); self.headers(response, item, item['bytes'])
        end = min(63, item['bytes']-1)
        with self.request(item, 'GET', {'Range': f'bytes=0-{end}'}) as response:
            require(response.status == 206 and response.headers.get('Content-Range') == f"bytes 0-{end}/{item['bytes']}", 'HTTPS Range response differs')
            self.headers(response, item, end+1)
            with file.open('rb') as local:
                require(response.read(end+2) == local.read(end+1), 'HTTPS Range body differs')
        with self.request(item, 'OPTIONS', {'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'range'}) as response:
            require(response.status in (200, 204) and response.headers.get('Access-Control-Allow-Origin') == self.application,
                    'HTTPS CORS preflight failed')
            methods = {x.strip().upper() for x in response.headers.get('Access-Control-Allow-Methods', '').split(',')}
            headers = {x.strip().lower() for x in response.headers.get('Access-Control-Allow-Headers', '').split(',')}
            require({'GET', 'HEAD'} <= methods and 'range' in headers, 'HTTPS CORS methods or Range not allowed')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--execute', action='store_true', help='Conditional S3 writes; requires separate operator authorization')
    mode.add_argument('--verify-https', action='store_true', help='Explicit network readback; no S3 writes or browser claim')
    parser.add_argument('--package', type=pathlib.Path, required=True)
    parser.add_argument('--approved-record-sha256', required=True)
    parser.add_argument('--source-root', type=pathlib.Path, default=ROOT)
    parser.add_argument('--output', type=pathlib.Path, required=True, help='Private journal outside original packet')
    parser.add_argument('--resume', action='store_true')
    for option in ['profile', 'endpoint', 'bucket', 'media-origin', 'app-origin']:
        parser.add_argument('--'+option)
    args = parser.parse_args(argv)
    os.umask(0o077)
    def interrupted(_signum, _frame):
        raise KeyboardInterrupt()
    previous_sigterm = signal.signal(signal.SIGTERM, interrupted)
    journal = None
    try:
        packet = preflight(args.package, args.approved_record_sha256, args.source_root)
        if args.execute:
            aws = Aws(args.profile, args.endpoint, args.bucket)
            journal = Journal(args.output, packet, 'execute', aws.target, args.resume)
            publish(packet, aws, journal)
        elif args.verify_https:
            verifier = HttpVerifier(args.media_origin, args.app_origin)
            journal = Journal(args.output, packet, 'verify-https', {'media': verifier.media, 'application': verifier.application}, args.resume)
            for item in packet.objects:
                journal.event(item, 'http_checking')
                verifier.verify(item, packet.file(item))
                journal.event(item, 'http_verified')
                journal.summary['verifiedObjects'] += 1; journal.finish('in_progress')
            journal.summary['httpVerified'] = True; journal.finish('http_complete')
        else:
            require(not args.resume, 'resume requires explicit execute or HTTPS mode')
            journal = Journal(args.output, packet, 'dry-run', {}, False)
            for item in packet.objects:
                journal.event(item, 'locally_verified_planned')
                journal.summary['verifiedObjects'] += 1
            journal.finish('local_preflight_passed')
        print(json.dumps(journal.summary))
        return 0
    except (Exception, KeyboardInterrupt) as error:
        reason = str(error) if isinstance(error, PublicationError) else 'interrupted or invalid local/transport state'
        if journal:
            journal.summary['transferComplete'] = False
            with contextlib.suppress(Exception):
                if journal.current: journal.event(journal.current, 'stopped_unverified')
                journal.finish('stopped', reason)
        # Never echo raw AWS stderr, response bodies, signed URLs or environment.
        result = {'status': 'stopped', 'reason': reason, 'transferComplete': False}
        if args.verify_https:
            result['httpUserAgent'] = HTTP_USER_AGENT
        print(json.dumps(result))
        return 1
    finally:
        if journal:
            journal.close()
        signal.signal(signal.SIGTERM, previous_sigterm)


if __name__ == '__main__':
    raise SystemExit(main())
