#!/usr/bin/env python3
"""Run the actual MVC/Vidstack player on an isolated local SQLite fixture."""
import argparse, json, os, pathlib, secrets, signal, socket, subprocess, tempfile, time, urllib.request

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('fixture',type=pathlib.Path)
    parser.add_argument('output',type=pathlib.Path)
    parser.add_argument('playwright',type=pathlib.Path)
    parser.add_argument('--browser',choices=['chromium','firefox'],default='chromium')
    args=parser.parse_args()
    os.umask(0o077)
    root=pathlib.Path(__file__).resolve().parents[1]
    fixture=args.fixture.resolve(); output=args.output.resolve()
    private=root/'artifacts'
    if not fixture.is_relative_to(private) or not output.is_relative_to(private):
        parser.error('Fixture and evidence must stay in private artifacts.')
    metadata=json.loads(fixture.read_text())
    database=pathlib.Path(metadata['database']).resolve()
    if not database.is_relative_to(fixture.parent) or not database.is_file(): parser.error('Isolated fixture database required.')
    output.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    logpath=output.parent/(output.name+'-app.log')
    web=root/'NetFilmx_Web'; dll=web/'bin/Release/net10.0/NetFilmx_Web.dll'
    with tempfile.TemporaryDirectory(prefix='netfilmx-subtitle-ui-') as temporary:
        keys=pathlib.Path(temporary)/'keys'; keys.mkdir(mode=0o700)
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
        origin=f'http://127.0.0.1:{port}'
        env={k:v for k,v in os.environ.items() if k in ['PATH','DOTNET_ROOT','LANG','PLAYWRIGHT_BROWSERS_PATH','NETFILMX_FIREFOX_LIBRARIES']}
        env.update({'ASPNETCORE_ENVIRONMENT':'Testing','ASPNETCORE_URLS':origin,'AllowedHosts':'127.0.0.1',
            'ConnectionStrings__DefaultConnection':f'Data Source={database};Pooling=false',
            'DataProtection__KeyRingPath':str(keys),'JwtSettings__SecretKey':secrets.token_hex(32),
            'JwtSettings__Issuer':'SubtitleFixture','JwtSettings__Audience':'SubtitleFixture','JwtSettings__AccessTokenTtlMinutes':'15',
            'CloudflareR2__PublicUrl':metadata['origin'],'Uploads__Enabled':'false','Worker__Enabled':'false',
            'Database__SeedDemoData':'false','Logging__LogLevel__Default':'Warning'})
        if args.browser=='firefox':
            env.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(private/'tools/playwright'))
            if (private/'tools/firefox-codecs').is_dir():
                env.setdefault('NETFILMX_FIREFOX_LIBRARIES',str(private/'tools/firefox-codecs'))
        with logpath.open('w') as log:
            app=subprocess.Popen(['dotnet',str(dll)],cwd=web,env=env,stdout=log,stderr=log)
            try:
                until=time.monotonic()+25
                while time.monotonic()<until:
                    if app.poll() is not None: raise RuntimeError('Local app exited; inspect private app log.')
                    try:
                        with urllib.request.urlopen(origin+'/Home/Watch/'+str(metadata['plain']),timeout=1) as response:
                            if response.status==200: break
                    except OSError: time.sleep(.25)
                else: raise RuntimeError('Local app startup timed out.')
                runner=subprocess.Popen(['node',str(root/'qualification/subtitles-browser.cjs'),str(fixture),origin,str(output),str(args.playwright.resolve()),args.browser],env=env,start_new_session=True)
                try: result=runner.wait(timeout=150)
                except subprocess.TimeoutExpired:
                    os.killpg(runner.pid,signal.SIGTERM)
                    try: runner.wait(timeout=5)
                    except subprocess.TimeoutExpired: os.killpg(runner.pid,signal.SIGKILL);runner.wait(timeout=5)
                    raise
                if result: raise RuntimeError('Actual player subtitle checks failed; inspect private evidence.')
            finally:
                app.terminate()
                try: app.wait(timeout=10)
                except subprocess.TimeoutExpired: app.kill();app.wait(timeout=5)
    print('Local app stopped; temporary test keyring removed. Fixture database retained for restart checks.')

if __name__=='__main__': main()
