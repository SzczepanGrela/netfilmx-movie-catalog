#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  if (process.argv.includes('--help')) {
    console.log('node qualification/subtitles-browser.cjs <fixture.json> <local-app-origin> <new-output> <playwright-directory> [chromium|firefox]');
    return;
  }
  const [fixturePath, origin, outputPath, packageDir, engine = 'chromium'] = process.argv.slice(2);
  const privateRoot = path.resolve(__dirname, '../artifacts');
  const within = p => p.startsWith(privateRoot + path.sep);
  const fixtureFile = fs.realpathSync(fixturePath), fixtureRoot = path.dirname(fixtureFile), output = path.resolve(outputPath);
  if (!within(fixtureFile) || !within(output) || !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin) || !['chromium','firefox'].includes(engine))
    throw Error('Use private artifacts and an isolated loopback app.');
  fs.mkdirSync(output, {mode:0o700});
  const fixture = JSON.parse(fs.readFileSync(fixtureFile));
  const playwright = require(path.resolve(packageDir));
  const launch = {headless:true};
  if (engine==='firefox' && process.env.NETFILMX_FIREFOX_LIBRARIES) {
    const libraries=fs.realpathSync(process.env.NETFILMX_FIREFOX_LIBRARIES);
    if(!within(libraries)) throw Error('Codec fixture must stay in artifacts');
    launch.env={...process.env,LD_LIBRARY_PATH:libraries};
  }
  const browser=await playwright[engine].launch(launch);
  const report={observedUtc:new Date().toISOString(),engine,browser:browser.version(),
    scope:'actual MVC watch view and pinned Vidstack; local synthetic files; requests outside fixtures denied',
    nativeSafariMobile:false,audibleAcceptance:false,realHttpsCorsAcceptance:false,entries:[]};
  const check=(value,message)=>{if(!value) throw Error(message);};
  try {
    for(const [kind,id] of [['plain',fixture.plain],['mp4',fixture.mp4],['hls',fixture.hls],['missing-vtt',fixture.mp4]]) {
      const context=await browser.newContext({viewport:{width:1280,height:900}});
      const page=await context.newPage(), errors=[];
      page.setDefaultTimeout(6000);
      const record={kind,id,status:'failed'}; report.entries.push(record);
      page.on('pageerror',e=>errors.push(e.message));
      await context.route('**/*',async route=>{
        const request=route.request(), url=request.url();
        if(url.startsWith(origin+'/')) return route.continue();
        if(!url.startsWith(fixture.origin)) return route.abort();
        const name=decodeURIComponent(new URL(url).pathname).slice(1);
        if(kind==='missing-vtt' && name==='mp4-subtitles/subtitle-2.vtt')
          return route.fulfill({status:404,body:'',headers:{'access-control-allow-origin':origin}});
        let file=path.resolve(fixtureRoot,name);
        if(!file.startsWith(fixtureRoot+path.sep) || !['.mp4','.m3u8','.ts','.vtt','.png'].includes(path.extname(file))) return route.abort();
        try { file=fs.realpathSync(file); if(!file.startsWith(fixtureRoot+path.sep)) return route.abort(); }
        catch {return route.fulfill({status:404,body:''});}
        const size=fs.statSync(file).size;
        const match=/^bytes=(\d+)-(\d*)$/.exec(request.headers().range||'');
        const start=match?Number(match[1]):0, end=match&&match[2]?Math.min(Number(match[2]),size-1):size-1;
        if(start>end || end>=size) return route.fulfill({status:416,body:''});
        const data=Buffer.alloc(end-start+1), fd=fs.openSync(file,'r');
        try {fs.readSync(fd,data,0,data.length,start);} finally {fs.closeSync(fd);}
        const type={'.mp4':'video/mp4','.m3u8':'application/vnd.apple.mpegurl','.ts':'video/mp2t','.vtt':'text/vtt; charset=utf-8','.png':'image/png'}[path.extname(file)];
        await route.fulfill({status:match?206:200,body:data,headers:{'content-type':type,'content-length':String(data.length),
          'access-control-allow-origin':origin,'accept-ranges':'bytes',...(match?{'content-range':`bytes ${start}-${end}/${size}`}:{})}});
      });
      try {
        const response=await page.goto(origin+'/Home/Watch/'+id);
        check(response.status()===200,'watch response');
        await page.waitForFunction(()=>{const p=document.querySelector('media-player');return p?.state?.canPlay;},null,{timeout:20000});
        record.initial=await page.$eval('media-player',p=>({duration:p.duration,currentTime:p.currentTime,provider:p.provider?.type,
          tracks:p.textTracks.toArray().map(t=>({id:t.id,language:t.language,label:t.label,mode:t.mode})),start:p.state.seekableStart,
          mediaType:p.state.mediaType,viewType:p.state.viewType,viewAttribute:p.getAttribute('view-type'),videoWidth:p.querySelector('video')?.videoWidth,
          layout:p.querySelector('media-video-layout')?.outerHTML.slice(0,500)}));
        check(record.initial.tracks.length===(kind==='plain'?0:3),'persistent track count');
        await page.$eval('media-player',p=>{p.muted=true;});
        if(kind==='plain') {
          await page.locator('media-play-button').first().click();
          await page.waitForFunction(()=>document.querySelector('media-player').currentTime>.3);
          await page.$eval('media-player',p=>p.pause());
        } else {
          // The default Vidstack menus, rather than a test-only selector/API, perform every choice.
          async function choose(label) {
            await page.getByRole('button',{name:/Settings/}).first().click();
            await page.locator('media-menu-button').filter({hasText:'Captions'}).first().click();
            const option=page.locator('media-captions-radio-group media-radio').filter({hasText:label}).first();
            if(label==='English' || label==='Off') {
              await option.waitFor({state:'visible'});
              await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
              const options=page.locator('media-captions-radio-group media-radio');
              const labels=await options.allTextContents();
              const at=labels.findIndex(text=>text.includes(label));
              check(at>=0,'keyboard language option');
              await options.first().focus();
              await page.keyboard.press('Home');
              for(let i=0;i<at;i++) await page.keyboard.press('ArrowDown');
              await page.waitForFunction(text=>document.activeElement?.textContent?.trim()===text,label);
              await page.keyboard.press('Enter');
            }
            else await option.click();
            const expected={'Polski':'pl','Русский':'ru','English':'en'}[label]??null;
            await page.waitForFunction(language=>(document.querySelector('media-player').textTracks.selected?.language??null)===language,expected);
            await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
          }
          await choose('Polski');
          await page.waitForFunction(()=>document.querySelector('media-player').textTracks.selected?.language==='pl');
          if(kind==='missing-vtt') {
            await page.locator('#subtitle-status').waitFor({state:'visible'});
            await choose('English');
            await page.$eval('media-player',p=>{p.currentTime=1;});
            await page.$eval('media-player',p=>p.play());
            await page.getByText('English first cue',{exact:true}).waitFor({state:'visible'});
            await page.locator('#subtitle-status').waitFor({state:'hidden'});
            await page.$eval('media-player',p=>p.pause());
            check(errors.length===0,'unexpected player JavaScript error');
            record.failedTrackSurfaced=true;record.anotherLanguageStillWorks=true;record.status='passed';
            continue;
          }
          await page.$eval('media-player',p=>{p.currentTime=1;});
          await page.$eval('media-player',p=>p.play());
          await page.waitForFunction(()=>document.querySelector('media-player').currentTime>1.15);
          await page.$eval('media-player',p=>p.pause());
          await page.getByText('Zażółć gęślą jaźń',{exact:true}).waitFor({state:'visible'});
          record.polish=await page.$eval('media-player',p=>({time:p.currentTime,cues:p.textTracks.selected.activeCues.map(c=>c.text)}));
          record.decode=await page.$eval('video',v=>({width:v.videoWidth,height:v.videoHeight,frames:v.getVideoPlaybackQuality().totalVideoFrames}));
          check(record.decode.width>0 && record.decode.frames>0,'real video frames');
          if(kind==='hls') {
            record.adaptiveLevels=await page.$eval('media-player',p=>p.provider.instance?.levels?.length??0);
            check(record.adaptiveLevels>=2,'multiple actual HLS renditions');
          }
          await page.screenshot({path:path.join(output,kind+'-polish.png')});
          await choose('Русский');
          await page.waitForFunction(()=>document.querySelector('media-player').textTracks.selected?.language==='ru');
          await page.getByText('Привет, мир',{exact:true}).waitFor({state:'visible'});
          await choose('English');
          await page.$eval('media-player',p=>{p.currentTime=4;});
          await page.waitForFunction(()=>!document.querySelector('media-player').state.seeking);
          await page.getByText('English after seeking',{exact:true}).waitFor({state:'visible'});
          await page.$eval('media-player',p=>{p.currentTime=1;});
          await page.waitForFunction(()=>!document.querySelector('media-player').state.seeking);
          await page.getByText('English first cue',{exact:true}).waitFor({state:'visible'});
          await choose('Off');
          await page.waitForFunction(()=>document.querySelector('media-player').textTracks.selected===null);
          await page.getByText('English first cue',{exact:true}).waitFor({state:'hidden'});
          record.languageChoices=['pl','ru','en','off']; record.forwardAndBackwardSeek=true;
          record.keyboardSelection=['en','off'];
        }
        check(errors.length===0,'player JavaScript errors: '+errors.join('; '));
        record.status='passed';
      } catch(error) {
        record.error=error.message;
        record.controls=await page.getByRole('button').evaluateAll(list=>list.map(e=>({name:e.getAttribute('aria-label'),text:e.textContent?.slice(0,80)}))).catch(()=>[]);
        record.menuItems=await page.locator('[role]').evaluateAll(list=>list.map(e=>({role:e.getAttribute('role'),name:e.getAttribute('aria-label'),text:e.textContent?.trim().slice(0,80)})).filter(e=>/menu|radio/.test(e.role))).catch(()=>[]);
        record.trackState=await page.$eval('media-player',p=>({time:p.currentTime,selected:p.textTracks.selected?.language,tracks:p.textTracks.toArray().map(t=>({language:t.language,mode:t.mode,ready:t.readyState,cues:t.activeCues.map(c=>c.text)}))})).catch(()=>null);
        record.focus=await page.evaluate(()=>({tag:document.activeElement?.localName,text:document.activeElement?.textContent?.trim().slice(0,100)}));
        await page.screenshot({path:path.join(output,kind+'-failed.png')}).catch(()=>{});
        process.exitCode=1;
      } finally {record.errors=errors;await context.close();}
    }
    report.status=report.entries.every(e=>e.status==='passed')?'passed':'failed';
  } finally {await browser.close();fs.writeFileSync(path.join(output,'player-evidence.json'),JSON.stringify(report,null,2),{mode:0o600});for(const file of fs.readdirSync(output))fs.chmodSync(path.join(output,file),0o600);}
  console.log(JSON.stringify({status:report.status,engine,entries:report.entries.map(e=>({kind:e.kind,status:e.status,error:e.error}))}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
