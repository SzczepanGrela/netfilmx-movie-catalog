#!/usr/bin/env python3
"""Disposable loopback fixture for real HLS/player checks; never a release importer."""
import argparse
import contextlib
import datetime
import hashlib
import http.client
import http.server
import json
import os
import pathlib
import re
import secrets
import signal
import socket
import sqlite3
import ssl
import subprocess
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('packet', type=pathlib.Path)
    parser.add_argument('output', type=pathlib.Path)
    args = parser.parse_args()
    os.umask(0o077)
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False, mode=0o700)
    packet = json.loads(args.packet.read_text())
    assert packet['kind'] == 'retained-seven-film-hls' and not packet['manifestActivated'] and not packet['providerWrites']
    manifest_file = ROOT/'NetFilmx_Storage.PostgreSql/Catalogue/retained-media.json'
    manifest_bytes = manifest_file.read_bytes()
    assert hashlib.sha256(manifest_bytes).hexdigest() == packet['shippingManifestSha256']
    plan = json.loads((args.packet.parent/'proposed-retained-media.json').read_text())
    files = {'/'+item['proposedKey']: ((ROOT/item['file']).resolve(), item['mime']) for item in packet['objects']}
    assert all(file.is_relative_to(ROOT/'artifacts') for file, _ in files.values())
    for video in plan['videos']:
        for field in ['posterObjectKey', 'backdropObjectKey']:
            if video.get(field):
                file = ROOT/'artifacts/media-review/20261013-r2-range-originals'/pathlib.Path(video[field]).name
                assert file.is_file()
                files['/'+video[field]] = (file, 'image/png' if file.suffix=='.png' else 'image/jpeg')
    backend_socket = socket.socket()
    backend_socket.bind(('127.0.0.1', 0))
    backend_port = backend_socket.getsockname()[1]
    backend_socket.close()

    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *_): pass
        def do_GET(self): self.serve(False)
        def do_HEAD(self): self.serve(True)
        def do_POST(self): self.send_error(405)
        def serve(self, head):
            try:
                name = urllib.parse.urlsplit(self.path).path
                if name in files:
                    file, mime = files[name]
                    size = file.stat().st_size
                    first, last = 0, size-1
                    ranged = self.headers.get('Range')
                    if ranged:
                        match = re.fullmatch(r'bytes=(\d+)-(\d*)', ranged)
                        if not match: self.send_error(416); return
                        first = int(match[1]); last = min(last, int(match[2])) if match[2] else last
                        if first>last or first>=size: self.send_error(416); return
                    self.send_response(206 if ranged else 200)
                    self.send_header('Content-Type', mime)
                    self.send_header('Content-Length', str(last-first+1))
                    self.send_header('Accept-Ranges', 'bytes')
                    self.send_header('Cache-Control', 'no-store')
                    if ranged:self.send_header('Content-Range',f'bytes {first}-{last}/{size}')
                    self.end_headers()
                    if not head:
                        with file.open('rb') as stream:
                            stream.seek(first); left=last-first+1
                            while left:
                                chunk=stream.read(min(left,128*1024))
                                if not chunk:break
                                self.wfile.write(chunk);left-=len(chunk)
                    return
                if name.startswith(('/videos/','/subtitles/','/posters/','/backdrops/')):
                    self.send_error(404);return
                with contextlib.closing(http.client.HTTPConnection('127.0.0.1',backend_port,timeout=20)) as connection:
                    headers={'Host':self.headers['Host'],'X-Forwarded-For':'127.0.0.1','X-Forwarded-Proto':'https'}
                    connection.request('HEAD' if head else 'GET',self.path,headers=headers)
                    response=connection.getresponse();body=response.read(8*1024*1024+1)
                    if len(body)>8*1024*1024:self.send_error(502);return
                    self.send_response(response.status)
                    for key,value in response.getheaders():
                        if key.lower() not in ['connection','transfer-encoding','server','date']:
                            self.send_header(key,value)
                    self.end_headers()
                    if not head:self.wfile.write(body)
            except (BrokenPipeError,ConnectionResetError,ssl.SSLError):pass

    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);server.daemon_threads=True
    origin='https://127.0.0.1:'+str(server.server_port)
    subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','2','-subj','/CN=Local HLS qualification',
                    '-addext','subjectAltName=IP:127.0.0.1','-keyout',str(output/'key.pem'),'-out',str(output/'cert.pem')],check=True,capture_output=True)
    tls=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);tls.load_cert_chain(output/'cert.pem',output/'key.pem')
    server.socket=tls.wrap_socket(server.socket,server_side=True)
    database=output/'fixture.db'
    # This private SQLite fixture is deliberately distinct from final-image PG import qualification.
    template=ROOT/'artifacts/subtitles/20261014-fixture-720p/catalogue.db'
    with sqlite3.connect(f'file:{template}?mode=ro',uri=True) as source, sqlite3.connect(database) as target:source.backup(target)
    with sqlite3.connect(database) as db:
        db.execute('PRAGMA foreign_keys=ON')
        assert db.execute('SELECT COUNT(*) FROM Users').fetchone()[0]==0
        db.execute('DELETE FROM Videos')
        now=datetime.datetime.now(datetime.timezone.utc).isoformat()
        for identity,video in enumerate(plan['videos'],1):
            db.execute('INSERT INTO Videos (Id,Title,Description,Price,VideoUrl,ThumbnailUrl,BackdropUrl,ReleaseYear,DurationMinutes,Views,CreatedAt,UpdatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                (identity,video['title'],video['description'],0,origin+'/'+video['playbackObjectKey'],origin+'/'+video['posterObjectKey'],origin+'/'+video['backdropObjectKey'] if video.get('backdropObjectKey') else None,video['releaseYear'],0,0,now,now))
            for track in video.get('subtitles',[]):
                db.execute('INSERT INTO VideoSubtitles (VideoId,TrackKey,Language,Label,Url,Position) VALUES (?,?,?,?,?,?)',
                    (identity,track['trackKey'],track['language'],track['label'],origin+'/'+track['objectKey'],track['position']))
    keys=output/'keys';keys.mkdir(mode=0o700)
    env={k:v for k,v in os.environ.items() if k in ['PATH','DOTNET_ROOT','LANG']}
    env.update({'ASPNETCORE_ENVIRONMENT':'Testing','ASPNETCORE_URLS':f'http://127.0.0.1:{backend_port}',
        'AllowedHosts':'127.0.0.1','Proxy__KnownProxies__0':'127.0.0.1','Proxy__ForwardLimit':'1',
        'ConnectionStrings__DefaultConnection':f'Data Source={database};Pooling=false','DataProtection__KeyRingPath':str(keys),
        'JwtSettings__SecretKey':secrets.token_hex(32),'JwtSettings__Issuer':'LocalHlsQualification','JwtSettings__Audience':'LocalHlsQualification','JwtSettings__AccessTokenTtlMinutes':'15',
        'CloudflareR2__PublicUrl':origin,'CloudflareR2__AccessKey':'','CloudflareR2__SecretKey':'',
        'Uploads__Enabled':'false','Worker__Enabled':'false','Database__SeedDemoData':'false','Logging__LogLevel__Default':'Warning'})
    state={'origin':origin,'pid':os.getpid(),'scope':'automated loopback HLS fixture only; no physical-device or production acceptance','uploads':False,'worker':False,'manifestActivated':False}
    log=(output/'app.log').open('w')
    app=subprocess.Popen(['dotnet',str(ROOT/'NetFilmx_Web/bin/Release/net10.0/NetFilmx_Web.dll')],cwd=ROOT/'NetFilmx_Web',env=env,stdout=log,stderr=log)
    state['appPid']=app.pid
    signal.signal(signal.SIGTERM,lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
    try:
        for _ in range(100):
            if app.poll() is not None:raise RuntimeError('Fixture app exited; see private app.log')
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{backend_port}/Home/Watch/1',timeout=1) as response:
                    if response.status==200:break
            except OSError:time.sleep(.25)
        else:raise RuntimeError('Fixture startup timeout')
        state['startedUtc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
        (output/'preview-state.json').write_text(json.dumps(state,indent=2)+'\n')
        print(json.dumps({'ready':True,'origin':origin}),flush=True)
        server.serve_forever(poll_interval=.25)
    except KeyboardInterrupt:pass
    finally:
        server.server_close();app.terminate()
        try:app.wait(timeout=10)
        except subprocess.TimeoutExpired:app.kill();app.wait(timeout=5)
        log.close()
        assert manifest_file.read_bytes()==manifest_bytes
        state.update({'stoppedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'stopped':True,'filesRetained':True})
        (output/'preview-state.json').write_text(json.dumps(state,indent=2)+'\n')


if __name__=='__main__':main()
