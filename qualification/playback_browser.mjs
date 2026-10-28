#!/usr/bin/env node
// Local protocol/player fixture only. No provider credentials or retained media reads.
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from '../media-worker/node_modules/esbuild/lib/main.js';
import {Miniflare,Log,LogLevel} from '../media-worker/node_modules/miniflare/dist/src/index.js';
import catalogue from '../media-worker/catalogue.json' with {type:'json'};
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
if(process.argv.includes('--help')){console.log('node qualification/playback_browser.mjs <new-output-under-artifacts> [firefox-executable] [firefox-codec-library-dir]');process.exit(0);}
const out=path.resolve(process.argv[2]||'');
if(!out.startsWith(root+'/artifacts/'))throw Error('New ignored output required');
fs.mkdirSync(out,{recursive:false,mode:0o700});
const redact=text=>String(text).replace(/\/g\/[^/\s]+\//g,'/g/[redacted]/');
const result={scope:'actual MVC/Vidstack and local HTTPS workerd/R2/Cache; short synthetic HLS; mocked Siteverify and widget; normal browser CORS',nativeSafariIos:'pending; no device test',productionAntiBot:'not tested',status:'failed',engines:[]};
let fixture,mediaServer,mf,browser,pg,currentPage;
const scope="netfilmx-playback-"+randomUUID().slice(0,12);
function command(executable,args){return execFileSync(executable,args,{cwd:root,timeout:30000,stdio:['ignore','pipe','pipe']});}
function http(url,options={}){return new Promise((resolve,reject)=>{https.get(url,{ca:fs.readFileSync(path.join(out,'cert.pem')),...options},res=>{let data=[];res.on('data',b=>data.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(data)}));}).on('error',reject);});}
try{
 fs.writeFileSync(path.join(out,'clock.txt'),'0');
 command('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',path.join(out,'tls.key'),'-out',path.join(out,'cert.pem')]);
 command('openssl',['pkcs12','-export','-in',path.join(out,'cert.pem'),'-inkey',path.join(out,'tls.key'),'-out',path.join(out,'server.pfx'),'-passout','pass:qualification']);
 const pgConfig=JSON.parse(fs.readFileSync(path.join(root,'infra/postgresql.json')));
 pg=scope+'-pg';
 command('docker',['run','--detach','--name',pg,'--label','netfilmx.playback-fixture='+scope,'--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','128',
   '--tmpfs',pgConfig.volumeTarget+':rw,nosuid,nodev,size=384m','--publish','127.0.0.1::5432','--env','PGDATA='+pgConfig.pgdata,
   '--env','POSTGRES_USER=fixture_admin','--env','POSTGRES_PASSWORD=local-fixture-only','--env','POSTGRES_DB=playback_qualification',pgConfig.image,...pgConfig.settings.flatMap(s=>['-c',s])]);
 let pgReady=false;
 for(let i=0;i<45;i++){try{command('docker',['exec',pg,'pg_isready','-h','127.0.0.1','-U','fixture_admin','-d','playback_qualification']);pgReady=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,500));}}
 if(!pgReady)throw Error('Fixture PostgreSQL deadline');
 const binding=JSON.parse(command('docker',['inspect','--format','{{json (index .NetworkSettings.Ports "5432/tcp")}}',pg]))[0];
 if(binding.HostIp!=='127.0.0.1')throw Error('PG not loopback-only');
 const pgConnection=`Host=127.0.0.1;Port=${binding.HostPort};Database=playback_qualification;Username=fixture_admin;Password=local-fixture-only`;
 const hls=path.join(out,'hls');fs.mkdirSync(hls);
 command('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=12','-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-t','16',
  '-filter_complex','[0:v]split=2[a][b];[a]scale=320:180[v0];[b]scale=160:90[v1]',
  '-map','[v0]','-map','1:a','-map','[v1]','-map','1:a','-c:v','libx264','-preset','ultrafast','-threads','1','-g','24','-keyint_min','24','-sc_threshold','0','-c:a','aac','-ac','2','-b:a','64k',
  '-f','hls','-hls_time','2','-hls_list_size','0','-hls_playlist_type','vod','-hls_flags','independent_segments','-var_stream_map','v:0,a:0 v:1,a:1','-hls_segment_filename',path.join(hls,'stream_%v_data%03d.ts'),'-master_pl_name','master.m3u8',path.join(hls,'stream_%v.m3u8')]);
 command('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','color=c=purple:s=32x32','-frames:v','1','-threads','1',path.join(out,'poster.jpg')]);
 command('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','color=c=purple:s=32x32','-frames:v','1','-threads','1',path.join(out,'poster.png')]);
 const bytes=new Map(),synthetic=structuredClone(catalogue);synthetic.objects={};
 for(const slug of ['sintel','caminandes-llama-drama']){
  const prefix=catalogue.films[slug].master.slice(0,-'master.m3u8'.length);
  for(const name of fs.readdirSync(hls)){
   const key=prefix+name;if(!catalogue.objects[key])throw Error('Fixture key outside retained graph');
   bytes.set(key,fs.readFileSync(path.join(hls,name)));
   synthetic.objects[key]={...catalogue.objects[key],size:bytes.get(key).length};
  }
 }
 for(const track of catalogue.films.sintel.subtitles){
  bytes.set(track.objectKey,Buffer.from('WEBVTT\n\n00:00:00.500 --> 00:00:15.500\nŻółć źródło — Русский — '+track.language+'\n'));
  synthetic.objects[track.objectKey]={...catalogue.objects[track.objectKey],size:bytes.get(track.objectKey).length};
 }
 for(const [key,object]of Object.entries(catalogue.objects))if(object.film===null){bytes.set(key,fs.readFileSync(path.join(out,key.endsWith('.png')?'poster.png':'poster.jpg')));synthetic.objects[key]={...object,size:bytes.get(key).length};}
 let ready=false;
 mediaServer=https.createServer({key:fs.readFileSync(path.join(out,'tls.key')),cert:fs.readFileSync(path.join(out,'cert.pem'))},async(req,res)=>{
  if(!ready){res.writeHead(503);res.end();return;}
  try{
   const response=await mf.dispatchFetch(mediaOrigin+req.url,{method:req.method,headers:req.headers});
   res.writeHead(response.status,Object.fromEntries(response.headers));
   if(response.body){for await(const chunk of response.body)res.write(chunk);}
   res.end();
  }catch{res.writeHead(503);res.end();}
 });
 await new Promise(resolve=>mediaServer.listen(0,'127.0.0.1',resolve));
 const mediaOrigin='https://localhost:'+mediaServer.address().port;
 fixture=spawn('dotnet',['qualification/PlaybackProtection/bin/Release/net10.0/PlaybackProtection.dll',out,mediaOrigin],{cwd:root,env:{...process.env,NETFILMX_QUALIFICATION_POSTGRES:pgConnection},stdio:['pipe','pipe','pipe']});
 const log=fs.createWriteStream(path.join(out,'mvc.log'),{mode:0o600});fixture.stdout.pipe(log);fixture.stderr.pipe(log);
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('MVC fixture startup deadline')),30000);fixture.once('exit',()=>{clearTimeout(timer);reject(Error('MVC fixture exited'));});fixture.stdout.on('data',b=>{text+=b;if(text.includes('Fixture ready')){clearTimeout(timer);resolve();}});});
 const app=JSON.parse(fs.readFileSync(path.join(out,'app.json')));
 const bundle=await build({stdin:{contents:`import {createGateway} from './src/gateway.js';export default createGateway(${JSON.stringify(synthetic)}, {now:()=>Math.floor(Date.now()/1000)+Number(globalThis.__clock||0)});`,resolveDir:path.join(root,'media-worker')},bundle:true,write:false,format:'esm',platform:'browser'});
 // A compile-time local fixture control, absent from production index/bundle.
 const controlled=bundle.outputFiles[0].text.replace(/export \{\s*([^\s]+) as default\s*\};?/,
  'const fixtureGateway=$1; export default {fetch(request,env,ctx){if(new URL(request.url).pathname==="/__fixture_clock"){globalThis.__clock=Number(request.headers.get("X-Fixture-Seconds")||0);return new Response("ok");}return fixtureGateway.fetch(request,env,ctx);}};');
 if(controlled===bundle.outputFiles[0].text)throw Error('Fixture clock wrapper not generated');
 mf=new Miniflare({modules:true,script:controlled,compatibilityDate:'2026-07-30',r2Buckets:['MEDIA'],log:new Log(LogLevel.NONE),bindings:{APP_ORIGIN:app.appOrigin,GRANT_ISSUER:'qualification',GRANT_AUDIENCE:'qualification-media',GRANT_PUBLIC_KEYS:JSON.stringify(app.jwks)},ratelimits:{REQUEST_LIMIT:{namespace_id:'10',simple:{limit:1200,period:60}},GRANT_LIMIT:{namespace_id:'11',simple:{limit:180,period:60}}}});
 const bucket=await mf.getR2Bucket('MEDIA');for(const [key,body]of bytes)await bucket.put(key,body,{httpMetadata:{contentType:synthetic.objects[key].mime}});
 ready=true;result.fixture={durationSeconds:16,audio:'silent synthetic AAC; no listening acceptance',variants:2,subtitles:10,storedObjects:bytes.size,bytes:[...bytes.values()].reduce((n,b)=>n+b.length,0),appOrigin:app.appOrigin,mediaOrigin};
 const require=createRequire(path.join(root,'media-worker/package.json'));const playwright=require('playwright');
 const widget=`(()=>{
  const automatic=document.querySelector('.cf-turnstile');
  if(automatic){const input=document.createElement('input');input.type='hidden';input.name='cf-turnstile-response';input.value='mock-netfilmx-admin-login-'+crypto.randomUUID();automatic.append(input);}
  const widgets=new Map();let nextId=0,hold=!!window.__holdFirstChallenge,sdkReady=false;const readyCallbacks=[];
  setTimeout(()=>{sdkReady=true;for(const callback of readyCallbacks)callback();},250);
  function emit(id,event){const record=widgets.get(id);if(!record)throw Error('Unknown fixture widget');const callback=record.options[event];if(callback)callback(event==='callback'?'mock-'+record.options.action+'-'+crypto.randomUUID():'fixture-event');}
  // Keep removed callbacks reachable to simulate events already queued by the SDK.
  window.__turnstileFixture={latest:()=>nextId-1,holdNext:()=>{hold=true;},emit,removed:id=>widgets.get(id)?.removed===true};
  window.turnstile={
   ready:callback=>{if(sdkReady)callback();else readyCallbacks.push(callback);},
   render:(selector,options)=>{if(!sdkReady)throw Error('SDK not ready');const id=nextId++;widgets.set(id,{options,removed:false});return id;},
   reset:()=>{},remove:id=>{widgets.get(id).removed=true;},
   execute:id=>{if(hold){hold=false;return;}setTimeout(()=>emit(id,'callback'),0);}
  };
 })();`;
 for(const engine of ['chromium','firefox']){
  fs.writeFileSync(path.join(out,'clock.txt'),'0');await mf.dispatchFetch(mediaOrigin+'/__fixture_clock',{headers:{'X-Fixture-Seconds':'0'}});
  const launch={headless:true};if(engine==='firefox'&&process.argv[3]){launch.executablePath=path.resolve(process.argv[3]);if(process.argv[4])launch.env={...process.env,LD_LIBRARY_PATH:path.resolve(process.argv[4])};}
  browser=await playwright[engine].launch(launch);
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:900}});
  const entry={engine,version:browser.version(),requests:[],errors:[],status:'failed'};result.engines.push(entry);
  await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js*',route=>route.fulfill({contentType:'application/javascript',body:widget}));
  await context.route('**/*',route=>{
   const url=route.request().url();if(url.startsWith('https://challenges.cloudflare.com/turnstile/v0/api.js'))return route.fallback();
   if(url.startsWith(app.appOrigin+'/')||url.startsWith(mediaOrigin+'/'))return route.continue();
   return route.abort();
  });
  const page=await context.newPage();currentPage=page;await page.clock.install();
  let grantPosts=0;page.on('request',request=>{if(request.method()==='POST'&&request.url()===app.appOrigin+'/playback/grant')grantPosts++;});
  page.on('response',response=>{
   if(!response.url().startsWith(mediaOrigin+'/'))return;
   const request={url:redact(response.url()),status:response.status()};
   // Advancing the fixture clock can expire an already in-flight HLS prefetch.
   // Accept only a 403 for that provably expired grant, never a general media
   // failure or a denial while the grant is still valid. Do not retain the JWT.
   if(response.status()===403){
    try{
     const token=new URL(response.url()).pathname.split('/')[2];
     const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));
     const now=Math.floor(Date.now()/1000)+Number(fs.readFileSync(path.join(out,'clock.txt')));
     request.expiredGrant=Number.isSafeInteger(claims.exp)&&claims.exp<=now;
    }catch{request.expiredGrant=false;}
   }
   entry.requests.push(request);
  });
  page.on('pageerror',error=>entry.errors.push(redact(error.message)));
  await page.goto(app.appOrigin+'/');
  if((await page.locator('a[href*="register"]').count())!==0)throw Error('Public signup link');
  await page.goto(app.appOrigin+'/auth/login');
  await page.locator('input[name="Username"]').fill('qualification_admin');
  await page.locator('input[name="Password"]').fill('Qualification123!');
  await page.locator('input[name="cf-turnstile-response"]').waitFor({state:'attached'});
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(app.appOrigin+'/');
  const session=await page.evaluate(async()=>{
   const csrf=await(await fetch('/auth/csrf')).json();
   const refreshed=await fetch('/auth/refresh',{method:'POST',headers:{'X-CSRF-TOKEN':csrf.token}});
   const fresh=await(await fetch('/auth/csrf')).json();
   const logout=await fetch('/auth/logout',{method:'POST',headers:{'X-CSRF-TOKEN':fresh.token}});
   return{refresh:refreshed.status,logout:logout.status};
  });
  if(session.refresh!==200||session.logout!==200)throw Error('Admin session fixture');
  entry.adminCreateLoginRefreshLogout=true;
  if((await context.cookies()).some(c=>c.name==='access_token'||c.name==='refresh_token'))throw Error('Viewer remains logged in');
  await page.goto(app.appOrigin+'/home/watch/'+app.videoId);
  await page.waitForFunction(()=>document.querySelector('#playback-gate').dataset.stage==='authorized');
  if(grantPosts!==1)throw Error('Background access did not issue exactly one grant');
  if(!await page.evaluate(()=>document.querySelector('#main-video-player').paused))throw Error('Autoplay without viewer intent');
  if(await page.locator('#playback-verification').isVisible())throw Error('Verification overlay remains after background loading');
  entry.backgroundAccessAndDelayedSdkReady=true;
  await page.locator('media-play-button:visible').first().click();
  await page.waitForFunction(()=>document.querySelector('#main-video-player')?.currentTime>1,{},{timeout:20000});
  await page.evaluate(()=>{const p=document.querySelector('#main-video-player');p.currentTime=5;p.qualities[1].selected=true;});
  await page.waitForFunction(()=>document.querySelector('#main-video-player')?.qualities?.auto===false);
  for(const language of ['pl','ru']){
   await page.evaluate(lang=>{const p=document.querySelector('#main-video-player');for(const t of p.textTracks.toArray())t.mode=t.language===lang?'showing':'disabled';},language);
   await page.waitForFunction(lang=>document.querySelector('#main-video-player').textTracks.selected?.language===lang,language);
   await page.waitForFunction(()=>document.querySelector('#main-video-player').textTracks.selected?.cues.length>0);
  }
  await page.evaluate(()=>{const p=document.querySelector('#main-video-player');for(const t of p.textTracks.toArray())t.mode=t.language==='pl'?'showing':'disabled';});
  const completedWidget=await page.evaluate(()=>window.__turnstileFixture.latest());
  entry.widgetExpiryChecks=[];
  for(const language of ['pl',null]){
   await page.evaluate(lang=>{const p=document.querySelector('#main-video-player');for(const t of p.textTracks.toArray())t.mode=lang&&t.language===lang?'showing':'disabled';},language);
   await page.waitForFunction(lang=>{const p=document.querySelector('#main-video-player'),v=p.querySelector('video');return !v.paused&&v.currentTime>5.1&&(p.textTracks.selected?.language||null)===lang;},language);
   const beforeWidget=await page.evaluate(()=>{const p=document.querySelector('#main-video-player');window.__fixtureStablePlayer={provider:p.provider,source:JSON.stringify(p.src)};return{time:p.currentTime,height:p.qualities.selected?.height,auto:p.qualities.auto,language:p.textTracks.selected?.language||null,paused:p.paused,nativePaused:p.querySelector('video').paused,nativeTime:p.querySelector('video').currentTime};});
   const postsBefore=grantPosts;
   await page.evaluate(id=>{for(const event of ['expired-callback','error-callback','timeout-callback','callback'])window.__turnstileFixture.emit(id,event);},completedWidget);
   await page.waitForTimeout(300);
   const afterWidget=await page.evaluate(()=>{const p=document.querySelector('#main-video-player');return{stage:document.querySelector('#playback-gate').dataset.stage,overlay:document.querySelector('#playback-verification').style.display,time:p.currentTime,height:p.qualities.selected?.height,auto:p.qualities.auto,language:p.textTracks.selected?.language||null,paused:p.paused,nativePaused:p.querySelector('video').paused,nativeTime:p.querySelector('video').currentTime,sameProvider:p.provider===window.__fixtureStablePlayer.provider,sameSource:JSON.stringify(p.src)===window.__fixtureStablePlayer.source};});
   entry.widgetExpiryChecks.push({before:beforeWidget,after:afterWidget,grantPostsBefore:postsBefore,grantPostsAfter:grantPosts});
   if(afterWidget.stage!=='authorized'||afterWidget.overlay!=='none'||afterWidget.paused||afterWidget.nativePaused||afterWidget.nativeTime<=beforeWidget.nativeTime||afterWidget.time<beforeWidget.time||afterWidget.time>beforeWidget.time+2||afterWidget.height!==beforeWidget.height||afterWidget.auto!==beforeWidget.auto||afterWidget.language!==beforeWidget.language||!afterWidget.sameProvider||!afterWidget.sameSource||grantPosts!==postsBefore)throw Error('P1: completed widget callback disturbed a valid grant/player or issued another grant');
  }
  entry.completedWidgetRemoved=await page.evaluate(id=>window.__turnstileFixture.removed(id),completedWidget);
  await page.evaluate(()=>{const p=document.querySelector('#main-video-player');p.pause();p.currentTime=5;for(const t of p.textTracks.toArray())t.mode=t.language==='pl'?'showing':'disabled';});
  await page.waitForFunction(()=>document.querySelector('#main-video-player').textTracks.selected?.language==='pl');
  const before=await page.evaluate(()=>{const p=document.querySelector('#main-video-player');return{time:p.currentTime,height:p.qualities.selected?.height,language:p.textTracks.selected?.language};});
  await page.evaluate(()=>window.__turnstileFixture.holdNext());
  fs.writeFileSync(path.join(out,'clock.txt'),'1801');await mf.dispatchFetch(mediaOrigin+'/__fixture_clock',{headers:{'X-Fixture-Seconds':'1801'}});
  await page.clock.fastForward(1801000);
  await page.waitForFunction(()=>document.querySelector('#playback-gate').dataset.stage==='verifying');
  const expiredAttempt=await page.evaluate(()=>window.__turnstileFixture.latest());
  await page.evaluate(id=>window.__turnstileFixture.emit(id,'timeout-callback'),expiredAttempt);
  await page.waitForFunction(()=>document.querySelector('#playback-gate').dataset.stage==='error');
  entry.automaticRenewalFailureStops=true;
  const renewalPostsBefore=grantPosts;
  let previousWidget=completedWidget;
  entry.activeVerificationFailuresRetryable=[];
  for(const event of ['expired-callback','error-callback','timeout-callback']){
   await page.evaluate(()=>window.__turnstileFixture.holdNext());
   await page.locator('#playback-start').click();
   await page.waitForFunction(()=>document.querySelector('#playback-gate').dataset.stage==='verifying');
   const currentWidget=await page.evaluate(()=>window.__turnstileFixture.latest());
   if(currentWidget===previousWidget)throw Error('Verification retry reused callbacks from an old attempt');
   await page.evaluate(id=>{for(const event of ['expired-callback','error-callback','timeout-callback','callback'])window.__turnstileFixture.emit(id,event);},previousWidget);
   await page.waitForTimeout(100);
   if(await page.locator('#playback-gate').getAttribute('data-stage')!=='verifying'||!await page.locator('#playback-start').isDisabled()||grantPosts!==renewalPostsBefore)throw Error('Stale widget callback affected the next active attempt');
   await page.evaluate(({id,event})=>window.__turnstileFixture.emit(id,event),{id:currentWidget,event});
   await page.waitForFunction(()=>document.querySelector('#playback-gate').dataset.stage==='error');
   if(await page.locator('#playback-start').isDisabled()||grantPosts!==renewalPostsBefore)throw Error('Active verification failure is not safely retryable');
   entry.activeVerificationFailuresRetryable.push(event);previousWidget=currentWidget;
  }
  await page.evaluate(()=>window.__turnstileFixture.holdNext());
  await page.locator('#playback-start').click();
  await page.waitForFunction(()=>document.querySelector('#playback-gate').dataset.stage==='verifying');
  await page.evaluate(previous=>{
   const fixture=window.__turnstileFixture,current=fixture.latest();
   fixture.emit(previous,'callback');fixture.emit(previous,'expired-callback');
   fixture.emit(current,'callback');
   // Duplicate success and token expiry during activation cannot cancel the POST.
   for(const event of ['callback','expired-callback','error-callback','timeout-callback'])fixture.emit(current,event);
  },previousWidget);
  await page.waitForFunction(()=>document.querySelector('#playback-gate').dataset.stage==='authorized');
  await page.waitForFunction(expected=>{const p=document.querySelector('#main-video-player');return Math.abs(p.currentTime-expected.time)<1.5&&p.qualities.selected?.height===expected.height&&p.textTracks.selected?.language===expected.language;},before,{timeout:20000});
  if(grantPosts!==renewalPostsBefore+1)throw Error('Renewal did not issue exactly one fresh grant');
  entry.staleCallbacksDuringNextAttempt=true;entry.renewalPreserved=before;
  // Successful automatic renewal must retain paused state and not require a click.
  await page.evaluate(()=>{const p=document.querySelector('#main-video-player');p.pause();p.currentTime=5;});
  fs.writeFileSync(path.join(out,'clock.txt'),'3602');await mf.dispatchFetch(mediaOrigin+'/__fixture_clock',{headers:{'X-Fixture-Seconds':'3602'}});
  const autoPostsBefore=grantPosts;
  await page.clock.fastForward(1801000);
  await page.waitForFunction(()=>document.querySelector('#playback-gate').dataset.stage==='authorized');
  await page.waitForFunction(()=>{const p=document.querySelector('#main-video-player');return p.paused&&Math.abs(p.currentTime-5)<1.5&&p.textTracks.selected?.language==='pl';});
  if(grantPosts!==autoPostsBefore+1)throw Error('Automatic renewal issued an unexpected number of grants');
  entry.pausedAutomaticRenewal=true;
  await page.evaluate(()=>{const p=document.querySelector('#main-video-player');for(const t of p.textTracks.toArray())t.mode='disabled';p.qualities.autoSelect();p.currentTime=12;p.play();});
  await page.waitForFunction(()=>{const p=document.querySelector('#main-video-player');return p.qualities.auto&&!p.textTracks.selected;});
  await page.waitForFunction(()=>document.querySelector('#main-video-player').state.ended,{},{timeout:15000});
  entry.seekQualityAutoOffAndEnding=true;
  await page.screenshot({path:path.join(out,engine+'.png')});
  // Retrieve one grant through the actual anonymous controller for graph-only native transport validation.
  const access=await page.evaluate(async id=>{const csrf=await(await fetch('/auth/csrf')).json();return(await fetch('/playback/grant',{method:'POST',headers:{'X-CSRF-TOKEN':csrf.token},body:new URLSearchParams({videoId:id,token:'mock-netfilmx-playback-'+crypto.randomUUID()})})).json();},app.videoId);
  const master=await http(access.url);if(master.status!==200)throw Error('Native graph master');
  const variant=master.body.toString().split('\n').find(line=>line&&!line.startsWith('#'));
  const playlist=await http(new URL(variant,access.url));if(playlist.status!==200)throw Error('Native graph variant');
  const segment=playlist.body.toString().split('\n').find(line=>line&&!line.startsWith('#'));
  if((await http(new URL(segment,new URL(variant,access.url)),{headers:{Range:'bytes=0-9'}})).status!==206)throw Error('Native graph range');
  for(const track of access.subtitles)if((await http(track.url)).status!==200)throw Error('Subtitle sidecar');
  entry.nativeTransportGraphAndTenSidecars=true;
  await page.addInitScript(()=>{window.__holdFirstChallenge=true;});
  const plainPostsBefore=grantPosts;
  await page.goto(app.appOrigin+'/home/watch/'+app.plainId);
  await page.waitForFunction(()=>window.__turnstileFixture?.latest()>=0);
  await page.locator('#playback-start').click();
  if(!await page.locator('#playback-start').isDisabled())throw Error('Pending play intent is not reflected while loading');
  await page.evaluate(()=>window.__turnstileFixture.emit(window.__turnstileFixture.latest(),'callback'));
  await page.waitForFunction(()=>document.querySelector('#playback-gate').dataset.stage==='authorized');
  if(await page.locator('#playback-start').isVisible())throw Error('A second Play click was required after background verification');
  await page.waitForFunction(()=>document.querySelector('#main-video-player')?.currentTime>0.5,{},{timeout:20000});
  if(await page.evaluate(()=>document.querySelector('#main-video-player').textTracks.length)!==0)throw Error('Plain film got subtitles');
  if(grantPosts!==plainPostsBefore+1)throw Error('Click during background loading issued duplicate grants');
  entry.plainFilm=true;entry.playIntentDuringBackgroundLoading=true;
  // A provider that never answers must terminate once without a retry loop.
  await page.goto(app.appOrigin+'/home/watch/'+app.plainId);
  await page.waitForFunction(()=>window.__turnstileFixture?.latest()>=0);
  const timeoutPosts=grantPosts;
  await page.clock.fastForward(31000);
  await page.waitForFunction(()=>document.querySelector('#playback-gate').dataset.stage==='error');
  const failureCode=await page.locator('#playback-gate').getAttribute('data-error-code');
  if(failureCode!=='challenge_timeout'||await page.locator('#playback-start').isDisabled())throw Error('Challenge deadline did not expose bounded retryable failure');
  await page.clock.fastForward(61000);
  if(grantPosts!==timeoutPosts||await page.evaluate(()=>window.__turnstileFixture.latest())!==0)throw Error('Automatic retry loop after challenge timeout');
  entry.challengeDeadlineAndNoRetryLoop=true;
  if(entry.requests.some(r=>r.status>=400&&!(r.status===403&&r.expiredGrant)))throw Error('Media/CORS request failed with a non-expired grant');
  entry.status='passed';await context.close();await browser.close();browser=null;
 }
 result.status='passed';
}catch(error){
 result.error=redact(error.stack||error.message);process.exitCode=1;
 if(currentPage){try{result.failureState=await currentPage.evaluate(()=>{
  const p=document.querySelector('#main-video-player'),v=p?.querySelector('video');
  return {stage:document.querySelector('#playback-gate')?.dataset.stage,message:document.querySelector('#playback-status')?.textContent,
   paused:p?.paused,time:p?.currentTime,duration:p?.duration,canPlay:p?.canPlay,qualityCount:p?.qualities?.length,auto:p?.qualities?.auto,tracks:p?.textTracks?.toArray().map(t=>({language:t.language,mode:t.mode})),
   video:v?{time:v.currentTime,paused:v.paused,seeking:v.seeking,ready:v.readyState,network:v.networkState,error:v.error?.code,frames:v.getVideoPlaybackQuality?.().totalVideoFrames}:null};
 });await currentPage.screenshot({path:path.join(out,'failure.png')});}catch{}}
}
finally{
 if(browser)await browser.close();if(fixture){fixture.stdin.end();await new Promise(resolve=>{const timer=setTimeout(()=>{fixture.kill('SIGTERM');resolve();},5000);fixture.once('exit',()=>{clearTimeout(timer);resolve();});});}
 if(mf)await mf.dispose();if(mediaServer)await new Promise(resolve=>mediaServer.close(resolve));
 if(pg){try{const owner=command('docker',['inspect','--format','{{index .Config.Labels "netfilmx.playback-fixture"}}',pg]).toString().trim();if(owner!==scope)throw Error('Ownership mismatch');
  result.pg={limits:JSON.parse(command('docker',['inspect','--format','{"memory":{{.HostConfig.Memory}},"memorySwap":{{.HostConfig.MemorySwap}},"cpu":{{.HostConfig.NanoCpus}},"oom":{{.State.OOMKilled}},"restarts":{{.RestartCount}}}',pg])),peakMemoryBytes:Number(command('docker',['exec',pg,'cat','/sys/fs/cgroup/memory.peak']).toString())};
  command('docker',['rm','--force',pg]);
 }catch{result.cleanupError='Owned PG cleanup incomplete';result.status='failed';process.exitCode=1;}}
 for(const name of ['tls.key','server.pfx','signing.pem'])fs.rmSync(path.join(out,name),{force:true});
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify({status:result.status,output:out,...(result.error?{error:result.error}: {})}));
}
