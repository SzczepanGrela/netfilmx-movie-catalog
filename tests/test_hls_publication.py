import contextlib
import hashlib
import http.server
import io
import json
import pathlib
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]/'qualification'))
import publish_hls as pub


class Fixture:
    def __init__(self, root):
        self.root = pathlib.Path(root)
        self.package = self.root/'packet'; self.package.mkdir()
        self.media = self.root/'artifacts/media/hls'; self.media.mkdir(parents=True)
        self.prefix = 'videos/hls/test-film/'+'a'*64+'/'
        self.objects = []
        for index in range(2):
            self.add(f'stream_{index}_data000.ts', (f'local synthetic segment {index} '*12).encode(), 'segment')
        data = b'WEBVTT\n\n00:00.000 --> 00:01.000\nHello\n'
        key = 'subtitles/test-film/en/'+hashlib.sha256(data).hexdigest()+'.vtt'
        self.add('subtitle.vtt', data, 'subtitle', key)
        self.objects[-1].update(trackKey='stream-2', language='en', label='English')
        for index in range(2):
            self.add(f'stream_{index}.m3u8', ('#EXTM3U\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXT-X-INDEPENDENT-SEGMENTS\n'
                f'#EXT-X-TARGETDURATION:6\n#EXTINF:6,\nstream_{index}_data000.ts\n#EXT-X-ENDLIST\n').encode(), 'variant')
        self.add('master.m3u8', b'#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000\nstream_0.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=500\nstream_1.m3u8\n', 'master')
        self.mapping = {'videos': [{'slug': 'test-film', 'playbackObjectKey': self.prefix+'master.m3u8',
            'subtitles': [{'trackKey': 'stream-2', 'language': 'en', 'label': 'English', 'objectKey': key}]}]}
        (self.package/'proposed-retained-media.json').write_text(json.dumps(self.mapping))
        (self.package/'proposed-retained-media.patch').write_text('inactive synthetic fixture patch\n')
        self.record = {'kind': 'retained-seven-film-hls', 'manifestActivated': False, 'providerWrites': False,
            'proposedManifestSha256': pub.checksum(self.package/'proposed-retained-media.json'),
            'patchSha256': pub.checksum(self.package/'proposed-retained-media.patch'), 'objects': self.objects,
            'targetPlaybackFields': 1, 'targetSubtitleFields': 1,
            'films': [{'slug': 'test-film', 'bundleSha256': 'a'*64, 'masterKey': self.prefix+'master.m3u8', 'variants': [{}, {}]}]}
        self.seal()

    def add(self, name, data, role, key=None):
        file = self.media/name; file.write_bytes(data)
        self.objects.append({'slug': 'test-film', 'role': role, 'file': str(file.relative_to(self.root)),
            'proposedKey': key or self.prefix+name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
            'mime': pub.MIMES[file.suffix], 'cacheControl': 'public,max-age=31536000,immutable'})

    def seal(self):
        self.record['objectCount'] = len(self.objects)
        self.record['totalBytes'] = sum(x['bytes'] for x in self.objects)
        (self.package/'publication-record.json').write_text(json.dumps(self.record))
        (self.package/'upload-order.jsonl').write_text(''.join(json.dumps({k: o[k] for k in pub.FIELDS})+'\n' for o in self.objects))
        (self.package/'objects.sha256').write_text(''.join(o['sha256']+'  '+o['file']+'\n' for o in self.objects))
        self.sha = pub.checksum(self.package/'publication-record.json')

    def load(self):
        return pub.preflight(self.package, self.sha, self.root)

    def arguments(self, output):
        return ['--package', str(self.package), '--approved-record-sha256', self.sha,
                '--source-root', str(self.root), '--output', str(output)]


class FakeAws:
    target = {'profile': 'local-fixture', 'endpoint': 'https://s3.example.invalid', 'bucket': 'fixture-bucket'}
    def __init__(self, packet):
        self.packet = packet; self.data = {}; self.puts = []; self.gets = []; self.fail = None

    def stored(self, item, data=None):
        return (self.packet.file(item).read_bytes() if data is None else data,
                {'ContentLength': item['bytes'], 'ContentType': item['mime'], 'CacheControl': item['cacheControl']})

    def get(self, item, output):
        key = item['proposedKey']; self.gets.append(key)
        if self.fail == ('get', key): raise pub.AwsFailure('AccessDenied')
        if key not in self.data:return None
        data, metadata = self.data[key]; output.write_bytes(data); return metadata

    def put(self, item, file):
        key = item['proposedKey']; self.puts.append(key)
        action = self.fail[0] if self.fail and self.fail[1] == key else None
        if action == 'denied':raise pub.AwsFailure('AccessDenied')
        if action == 'interrupt':raise KeyboardInterrupt()
        if action == 'uncertain_absent':raise pub.AwsFailure('uncertain_transport')
        self.data[key] = self.stored(item, file.read_bytes())
        if action == 'uncertain_committed':raise pub.AwsFailure('uncertain_transport')
        if action in ('race_match', 'race_conflict'):
            if action == 'race_conflict':self.data[key] = self.stored(item, b'conflict')
            raise pub.AwsFailure('PreconditionFailed')
        if action == 'no_readback':del self.data[key]
        return {'ETag': 'not-a-checksum'}


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.f = Fixture(self.tmp.name)

    def run_main(self, extra=(), output=None):
        output = output or self.f.root/'journal'
        with contextlib.redirect_stdout(io.StringIO()) as text:
            result = pub.main(self.f.arguments(output)+list(extra))
        return result, text.getvalue(), output

    def execute(self, aws, resume=False, output=None):
        args = ['--execute', '--profile', 'local-fixture', '--endpoint', 'https://s3.example.invalid', '--bucket', 'fixture-bucket']
        if resume:args.append('--resume')
        with patch.object(pub, 'Aws', return_value=aws):return self.run_main(args, output)

    def test_default_is_local_and_keeps_packet_unchanged(self):
        before = {f.name: pub.checksum(f) for f in self.f.package.iterdir()}
        with patch.object(pub.subprocess, 'run', side_effect=AssertionError('AWS invoked')), \
                patch.object(pub.urllib.request, 'build_opener', side_effect=AssertionError('network initialized')):
            result, _, output = self.run_main()
        self.assertEqual(0, result)
        status = json.loads((output/'result.json').read_text())
        self.assertEqual('local_preflight_passed', status['status'])
        self.assertFalse(status['transferComplete']); self.assertEqual(0, status['putAttempts'])
        self.assertNotIn('httpUserAgent', status)
        self.assertEqual(before, {f.name: pub.checksum(f) for f in self.f.package.iterdir()})

    def test_wrong_approved_sha_stops_before_client(self):
        self.f.sha = '0'*64
        with patch.object(pub, 'Aws', side_effect=AssertionError('client initialized')):
            self.assertEqual(1, self.run_main(['--execute'])[0])

    def test_metadata_changed_while_preflight_is_reading_stops_before_client(self):
        original=pathlib.Path.read_bytes;record=self.f.package/'publication-record.json'
        def changed(file):
            data=original(file)
            if file==record:record.write_text('{"changed":true}')
            return data
        with patch.object(pathlib.Path,'read_bytes',changed),patch.object(pub,'Aws',side_effect=AssertionError('client initialized')):
            self.assertEqual(1,self.run_main(['--execute'])[0])

    def test_changed_last_file_prevents_any_remote_operation(self):
        self.f.media.joinpath('master.m3u8').write_bytes(b'bad last file')
        with patch.object(pub, 'Aws', side_effect=AssertionError('client initialized')):
            self.assertEqual(1, self.run_main(['--execute'])[0])

    def test_missing_file_and_size_or_checksum_mismatch(self):
        file = self.f.media/'stream_0_data000.ts'; original = file.read_bytes()
        for changed in [b'short', bytes([original[0]^1])+original[1:]]:
            with self.subTest(changed=len(changed)):
                file.write_bytes(changed)
                with self.assertRaises(pub.PublicationError):self.f.load()
        file.unlink()
        with self.assertRaises(OSError):self.f.load()

    def test_changed_or_truncated_upload_list(self):
        p = self.f.package/'upload-order.jsonl'; original = p.read_text()
        for changed in ['\n'.join(original.splitlines()[:-1])+'\n', original.replace('video/mp2t', 'text/plain', 1)]:
            p.write_text(changed)
            with self.assertRaises(pub.PublicationError):self.f.load()

    def test_duplicate_keys_and_files_rejected(self):
        for field in ['proposedKey', 'file']:
            with self.subTest(field=field):
                original = self.f.objects[1][field]; self.f.objects[1][field] = self.f.objects[0][field]; self.f.seal()
                with self.assertRaises(pub.PublicationError):self.f.load()
                self.f.objects[1][field] = original; self.f.seal()

    def test_paths_cannot_escape_or_follow_symlinks(self):
        original = self.f.objects[0]['file']
        for name in ['../outside.ts', '/absolute.ts', 'artifacts/../../outside.ts']:
            self.f.objects[0]['file'] = name; self.f.seal()
            with self.assertRaises(pub.PublicationError):self.f.load()
        self.f.objects[0]['file'] = original; self.f.seal()
        source = self.f.root/original; data = source.read_bytes(); source.unlink()
        target = self.f.root/'elsewhere.ts'; target.write_bytes(data); source.symlink_to(target)
        with self.assertRaises(pub.PublicationError):self.f.load()

    def test_unsafe_key_and_changed_metadata_rejected(self):
        for field, value in [('proposedKey', '../escape.ts'), ('mime', 'text/plain'), ('cacheControl', 'no-cache')]:
            original = self.f.objects[0][field]; self.f.objects[0][field] = value; self.f.seal()
            with self.assertRaises(pub.PublicationError):self.f.load()
            self.f.objects[0][field] = original

    def test_master_cannot_be_moved_earlier_even_in_approved_record(self):
        self.f.objects.insert(0, self.f.objects.pop()); self.f.seal()
        with self.assertRaises(pub.PublicationError):self.f.load()

    def test_graph_reference_not_on_list_rejected(self):
        item = next(x for x in self.f.objects if x['role'] == 'variant')
        file = self.f.root/item['file']; data = file.read_bytes().replace(b'data000.ts', b'data999.ts'); file.write_bytes(data)
        item['sha256'] = pub.checksum(file); item['bytes'] = len(data); self.f.seal()
        with self.assertRaises((pub.PublicationError, ValueError)):self.f.load()

    def test_success_puts_in_exact_order_and_confirms_all_before_master(self):
        packet = self.f.load(); aws = FakeAws(packet)
        result, _, output = self.execute(aws)
        self.assertEqual(0, result); self.assertEqual([o['proposedKey'] for o in packet.objects], aws.puts)
        status = json.loads((output/'result.json').read_text()); self.assertTrue(status['transferComplete'])
        self.assertFalse(status['browserPlayerAccepted']); self.assertFalse(status['httpVerified'])
        events = [json.loads(line) for line in (output/'objects.jsonl').read_text().splitlines()]
        master = next(i for i,x in enumerate(events) if x['role']=='master')
        self.assertEqual(5, sum(x['status']=='put_or_race_verified' for x in events[:master]))

    def test_existing_requires_full_bytes_length_and_metadata_not_etag(self):
        packet = self.f.load()
        for failure in ['bytes', 'length', 'mime', 'cache']:
            aws = FakeAws(packet); item=packet.objects[0]; data, metadata = aws.stored(item)
            if failure=='bytes':data=bytes([data[0]^1])+data[1:]
            else:metadata[{'length':'ContentLength','mime':'ContentType','cache':'CacheControl'}[failure]]='wrong'
            aws.data[item['proposedKey']] = data, metadata
            result, _, output = self.execute(aws, output=self.f.root/('journal-'+failure))
            self.assertEqual(1, result); self.assertEqual([], aws.puts)
            self.assertFalse(json.loads((output/'result.json').read_text())['transferComplete'])

    def test_412_is_read_back_and_not_accepted_by_itself(self):
        for action, expected in [('race_match', 0), ('race_conflict', 1), ('no_readback', 1)]:
            packet=self.f.load();aws=FakeAws(packet);aws.fail=(action, packet.objects[0]['proposedKey'])
            result,_,_=self.execute(aws,output=self.f.root/('journal-'+action));self.assertEqual(expected,result)
            if expected:self.assertNotIn(packet.objects[-1]['proposedKey'],aws.puts)

    def test_access_denied_or_uncertain_write_stops_before_master(self):
        for action in ['get', 'denied', 'uncertain_absent', 'uncertain_committed', 'interrupt']:
            packet=self.f.load();aws=FakeAws(packet);aws.fail=(action,packet.objects[1]['proposedKey'])
            result,_,output=self.execute(aws,output=self.f.root/('journal-'+action))
            self.assertEqual(1,result);self.assertNotIn(packet.objects[-1]['proposedKey'],aws.puts)
            self.assertFalse(json.loads((output/'result.json').read_text())['transferComplete'])

    def test_explicit_resume_rechecks_unknown_committed_write_without_duplicate(self):
        packet=self.f.load();aws=FakeAws(packet);key=packet.objects[1]['proposedKey'];aws.fail=('uncertain_committed',key)
        self.assertEqual(1,self.execute(aws)[0]);aws.fail=None
        self.assertEqual(0,self.execute(aws,resume=True)[0]);self.assertEqual(1,aws.puts.count(key))
        self.assertEqual(0,self.execute(aws,resume=True)[0]);self.assertEqual(len(packet.objects),len(aws.puts))

    def test_resume_never_treats_absence_after_unknown_write_as_proof_of_failure(self):
        packet=self.f.load();aws=FakeAws(packet);key=packet.objects[1]['proposedKey'];aws.fail=('uncertain_absent',key)
        self.assertEqual(1,self.execute(aws)[0]);aws.fail=None
        self.assertEqual(0,self.execute(aws,resume=True)[0]);self.assertEqual(2,aws.puts.count(key))
        log=(self.f.root/'journal/objects.jsonl').read_text();self.assertIn('put_unresolved_or_refused',log)

    def test_resume_stops_if_previously_verified_remote_has_drifted(self):
        packet=self.f.load();aws=FakeAws(packet);self.assertEqual(0,self.execute(aws)[0])
        item=packet.objects[0];aws.data[item['proposedKey']]=aws.stored(item,b'changed')
        self.assertEqual(1,self.execute(aws,resume=True)[0])

    def test_resume_binding_prevents_other_list_or_target(self):
        packet=self.f.load();aws=FakeAws(packet);self.assertEqual(0,self.execute(aws)[0])
        aws.target={**aws.target,'bucket':'other-bucket'}
        self.assertEqual(1,self.execute(aws,resume=True)[0])

    def test_resume_binds_exact_upload_list_bytes(self):
        packet=self.f.load();aws=FakeAws(packet);self.assertEqual(0,self.execute(aws)[0]);gets=len(aws.gets)
        file=self.f.package/'upload-order.jsonl'
        file.write_text(''.join(json.dumps(json.loads(line),indent=None,separators=(',',':'))+'\n' for line in file.read_text().splitlines()))
        self.assertEqual(1,self.execute(aws,resume=True)[0]);self.assertEqual(gets,len(aws.gets))

    def test_truncated_journal_stops_resume_before_any_remote_call(self):
        packet=self.f.load();aws=FakeAws(packet);self.assertEqual(0,self.execute(aws)[0]);gets=len(aws.gets)
        with (self.f.root/'journal/objects.jsonl').open('a') as file:file.write('{"partial":')
        self.assertEqual(1,self.execute(aws,resume=True)[0]);self.assertEqual(gets,len(aws.gets))

    def test_same_journal_lock_prevents_two_executors(self):
        packet=self.f.load();journal=pub.Journal(self.f.root/'journal',packet,'execute',FakeAws.target)
        try:
            aws=FakeAws(packet)
            self.assertEqual(1,self.execute(aws,resume=True)[0]);self.assertEqual([],aws.gets)
        finally:journal.close()

    def test_output_cannot_follow_symlink_into_packet(self):
        alias=self.f.root/'alias';alias.symlink_to(self.f.package,target_is_directory=True)
        with self.assertRaises(pub.PublicationError):pub.Journal(alias/'new',self.f.load(),'dry-run',{})

    def test_source_changed_after_preflight_stops_before_its_put_and_masters(self):
        packet=self.f.load();item=packet.objects[1];packet.file(item).write_bytes(b'changed after validated plan')
        aws=FakeAws(packet);journal=pub.Journal(self.f.root/'journal',packet,'execute',aws.target)
        try:
            with self.assertRaises(pub.PublicationError):pub.publish(packet,aws,journal)
            self.assertEqual([packet.objects[0]['proposedKey']],aws.puts)
            self.assertFalse(journal.summary['transferComplete'])
        finally:journal.close()

    def test_http_mode_does_not_claim_transfer_or_browser_acceptance(self):
        with patch.object(pub,'Aws',side_effect=AssertionError('S3 initialized')), \
                patch.object(pub,'HttpVerifier') as verifier:
            verifier.return_value.media='https://media.example.invalid';verifier.return_value.application='https://app.example.invalid'
            result,text,output=self.run_main(['--verify-https','--media-origin','https://media.example.invalid','--app-origin','https://app.example.invalid'])
        self.assertEqual(0,result);status=json.loads((output/'result.json').read_text())
        self.assertTrue(status['httpVerified']);self.assertFalse(status['transferComplete']);self.assertFalse(status['browserPlayerAccepted'])
        self.assertEqual('NetFilmxPublicationVerifier/1.0', status['httpUserAgent'])
        self.assertEqual(status['httpUserAgent'], json.loads(text)['httpUserAgent'])
        for attempt in output.glob('attempt-*.json'):
            self.assertEqual(status['httpUserAgent'], json.loads(attempt.read_text())['httpUserAgent'])

    def test_old_readback_cannot_be_reused_when_cli_writes_no_body(self):
        packet=self.f.load();item=packet.objects[0];output=self.f.root/'readback';output.write_bytes(packet.file(item).read_bytes())
        aws=pub.Aws('fixture','https://s3.example.invalid','fixture-bucket')
        with patch.object(aws,'call',return_value=FakeAws(packet).stored(item)[1]):aws.get(item,output)
        self.assertFalse(output.exists())

    def test_journal_cannot_modify_original_packet_or_media_directory(self):
        for output in [self.f.package/'new',self.f.media/'new']:
            with self.assertRaises(pub.PublicationError):pub.Journal(output,self.f.load(),'dry-run',{})

    def test_execute_requires_profile_endpoint_and_bucket(self):
        for values in [(None,'https://s3.example.invalid','bucket'),('profile',None,'bucket'),('profile','https://s3.example.invalid',None)]:
            with self.assertRaises(pub.PublicationError):pub.Aws(*values)

    def test_every_actual_cli_put_is_conditional_and_errors_do_not_leak(self):
        aws=pub.Aws('fixture','https://s3.example.invalid','fixture-bucket');item=self.f.load().objects[0]
        with patch.object(pub.subprocess,'run',return_value=subprocess.CompletedProcess([],0,'{}','')) as run:
            aws.put(item,self.f.root/item['file'])
        command=run.call_args.args[0];self.assertEqual('*',command[command.index('--if-none-match')+1])
        self.assertEqual('1',run.call_args.kwargs['env']['AWS_MAX_ATTEMPTS'])
        for result in [subprocess.CompletedProcess([],1,'secret response','An error occurred (AccessDenied) when calling secret-token'),
                       subprocess.CompletedProcess([],0,'invalid secret response','')]:
            with patch.object(pub.subprocess,'run',return_value=result),self.assertRaises(pub.AwsFailure) as error:
                aws.put(item,self.f.root/item['file'])
            self.assertNotIn('secret',str(error.exception))

    def test_cli_timeout_is_uncertain_and_never_auto_retried(self):
        aws=pub.Aws('fixture','https://s3.example.invalid','fixture-bucket');item=self.f.load().objects[0]
        with patch.object(pub.subprocess,'run',side_effect=subprocess.TimeoutExpired('secret command',1)) as run:
            with self.assertRaises(pub.AwsFailure) as error:aws.put(item,self.f.root/item['file'])
        self.assertEqual('uncertain_transport',error.exception.code);self.assertEqual(1,run.call_count)


class HttpTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.f=Fixture(self.tmp.name)
        self.item=self.f.load().objects[0];self.file=self.f.root/self.item['file'];owner=self;self.fault=None;self.methods=[]
        self.requests=[];self.forbidden_at=None
        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self,*args):pass
            def do_GET(self):self.reply('GET')
            def do_HEAD(self):self.reply('HEAD')
            def do_OPTIONS(self):self.reply('OPTIONS')
            def reply(self,method):
                owner.methods.append(method);body=owner.file.read_bytes();size=len(body);ranged=self.headers.get('Range')
                owner.requests.append({'method':method,'range':ranged,'userAgent':self.headers.get('User-Agent')})
                if len(owner.requests)==owner.forbidden_at:
                    self.send_response(403);self.send_header('Content-Length','0');self.end_headers();return
                if owner.fault=='redirect':
                    self.send_response(302);self.send_header('Location','https://other.example.invalid/private');self.end_headers();return
                if method=='OPTIONS':
                    self.send_response(204);self.send_header('Access-Control-Allow-Origin',owner.app)
                    self.send_header('Access-Control-Allow-Methods','GET, HEAD');self.send_header('Access-Control-Allow-Headers','none' if owner.fault=='preflight' else 'Range');self.end_headers();return
                if ranged:
                    end=min(63,size-1);body=body[:end+1]
                    self.send_response(200 if owner.fault=='range' else 206)
                    self.send_header('Content-Range',f'bytes 0-{end}/{size}')
                else:self.send_response(200)
                self.send_header('Content-Type','text/plain' if owner.fault=='mime' else owner.item['mime'])
                self.send_header('Cache-Control','no-cache' if owner.fault=='cache' else owner.item['cacheControl'])
                self.send_header('Content-Length',str(len(body)))
                if owner.fault!='cors':self.send_header('Access-Control-Allow-Origin',owner.app)
                self.send_header('Access-Control-Expose-Headers','Accept-Ranges, Content-Length, Content-Range, ETag')
                self.end_headers()
                if method=='GET':
                    if owner.fault=='checksum':body=bytes([body[0]^1])+body[1:]
                    if owner.fault=='truncated':body=body[:5]
                    self.wfile.write(body)
        self.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.addCleanup(self.stop)
        self.media=f'http://127.0.0.1:{self.server.server_port}';self.app='https://app.example.invalid'

    def stop(self):
        self.server.shutdown();self.server.server_close();self.thread.join(timeout=2)

    def test_full_http_readback_checks_bytes_head_range_and_preflight(self):
        pub.HttpVerifier(self.media,self.app,allow_http=True).verify(self.item,self.file)
        self.assertEqual(['GET','HEAD','GET','OPTIONS'],self.methods)

    def test_fixed_http_client_identity_on_every_method(self):
        pub.HttpVerifier(self.media,self.app,allow_http=True).verify(self.item,self.file)
        self.assertEqual([
            {'method':method,'range':ranged,'userAgent':'NetFilmxPublicationVerifier/1.0'}
            for method,ranged in [('GET',None),('HEAD',None),('GET','bytes=0-63'),('OPTIONS',None)]
        ],self.requests)

    def test_403_stops_each_method_without_retry_or_fallback(self):
        methods=['GET','HEAD','GET','OPTIONS']
        for forbidden_at in range(1,5):
            with self.subTest(forbidden_at=forbidden_at):
                self.requests.clear();self.methods.clear();self.forbidden_at=forbidden_at
                with self.assertRaisesRegex(pub.PublicationError,'HTTPS HTTP status failed'):
                    pub.HttpVerifier(self.media,self.app,allow_http=True).verify(self.item,self.file)
                self.assertEqual(methods[:forbidden_at],self.methods)
                self.assertTrue(all(r['userAgent']=='NetFilmxPublicationVerifier/1.0' for r in self.requests))

    def test_first_403_cli_records_identity_without_completing(self):
        self.forbidden_at=1
        verifier=pub.HttpVerifier(self.media,self.app,allow_http=True)
        output=self.f.root/'http-journal'
        with patch.object(pub,'HttpVerifier',return_value=verifier), \
                patch.object(pub,'Aws',side_effect=AssertionError('S3 initialized')), \
                contextlib.redirect_stdout(io.StringIO()) as text:
            result=pub.main(self.f.arguments(output)+['--verify-https',
                '--media-origin','https://media.example.invalid','--app-origin',self.app])
        self.assertEqual(1,result);self.assertEqual(['GET'],self.methods)
        status=json.loads((output/'result.json').read_text())
        self.assertEqual('stopped',status['status']);self.assertEqual(0,status['verifiedObjects'])
        self.assertFalse(status['httpVerified']);self.assertFalse(status['transferComplete'])
        self.assertFalse(status['browserPlayerAccepted']);self.assertFalse(status['manifestActivated'])
        self.assertEqual('NetFilmxPublicationVerifier/1.0',status['httpUserAgent'])
        self.assertEqual(status['httpUserAgent'],json.loads(text.getvalue())['httpUserAgent'])
        for attempt in output.glob('attempt-*.json'):
            self.assertEqual(status['httpUserAgent'],json.loads(attempt.read_text())['httpUserAgent'])

    def test_corrupt_truncated_metadata_cors_range_and_redirect_fail(self):
        for fault in ['checksum','truncated','mime','cache','cors','range','preflight','redirect']:
            with self.subTest(fault=fault):
                self.fault=fault
                with self.assertRaises(pub.PublicationError):pub.HttpVerifier(self.media,self.app,allow_http=True).verify(self.item,self.file)

    def test_production_cli_rejects_plain_http_and_credential_urls(self):
        for url in [self.media,'https://user:secret@example.invalid','https://example.invalid?token=secret']:
            with self.assertRaises(pub.PublicationError):pub.HttpVerifier(url,self.app)


if __name__=='__main__':unittest.main()
