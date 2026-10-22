import{Component as e,Host as t,camelToKebabCase as n,computed as r,createContext as i,defineCustomElement as a,effect as o,i as s,isArray as c,isBoolean as l,isFunction as u,isKeyboardClick as d,isNil as f,isString as p,keysOf as m,l as ee,listenEvent as h,n as g,noop as te,onDispose as ne,peek as _,prop as re,provideContext as ie,scoped as ae,setAttribute as v,signal as y,tick as oe,toggleClass as se,unwrap as b,uppercaseFirstChar as ce,useContext as le,x}from"./vidstack-BPo1FnPl.js";import{useMediaContext as S,useMediaState as C}from"./vidstack-C7uud4Wl.js";import{appendParamsToURL as ue,getDownloadFile as de}from"./vidstack-Cn-KkgnC.js";import{watchActiveTextTrack as fe}from"./vidstack-DbMO6gZA.js";import{$ariaBool as pe,LitElement as me}from"./vidstack-Bz0O6SMD.js";import{createSlot as he,isHTMLElement as ge,useActive as _e,useResizeObserver as ve,useTransitionActive as ye,watchColorScheme as be}from"./vidstack-DlJDBIU8.js";import{LocalStorage as w}from"./vidstack-HA_mc-o7.js";import{$signal as T,Icon as xe,LayoutIconsLoader as Se,SlotManager as Ce}from"./vidstack-BAXJ85JM.js";const we=i();function E(){return le(we)}const Te={colorScheme:`system`,download:null,customIcons:!1,disableTimeSlider:!1,menuContainer:null,menuGroup:`bottom`,noAudioGain:!1,noGestures:!1,noKeyboardAnimations:!1,noModal:!1,noScrubGesture:!1,playbackRates:{min:0,max:2,step:.25},audioGains:{min:0,max:300,step:25},seekStep:10,sliderChaptersMinWidth:325,hideQualityBitrate:!1,smallWhen:!1,thumbnails:null,translations:null,when:!1};var D=class extends e{static props=Te;#e;#t=r(()=>{let e=this.$props.when();return this.#r(e)});#n=r(()=>{let e=this.$props.smallWhen();return this.#r(e)});get isMatch(){return this.#t()}get isSmallLayout(){return this.#n()}onSetup(){this.#e=S(),this.setAttributes({"data-match":this.#t,"data-sm":()=>this.#n()?``:null,"data-lg":()=>this.#n()?null:``,"data-size":()=>this.#n()?`sm`:`lg`,"data-no-scrub-gesture":this.$props.noScrubGesture}),ie(we,{...this.$props,when:this.#t,smallWhen:this.#n,userPrefersAnnouncements:y(!0),userPrefersKeyboardAnimations:y(!0),menuPortal:y(null)})}onAttach(e){be(e,this.$props.colorScheme)}#r(e){return e!==`never`&&(l(e)?e:r(()=>e(this.#e.player.state))())}};const Ee=D.prototype;re(Ee,`isMatch`),re(Ee,`isSmallLayout`);var De=class extends D{static props={...super.props,when:({viewType:e})=>e===`audio`,smallWhen:({width:e})=>e<576}};function Oe(e,t){o(()=>{let{player:n}=S(),r=n.el;return r&&v(r,`data-layout`,t()&&e),()=>r?.removeAttribute(`data-layout`)})}function O(e,t){return e()?.[t]??t}function k(){return T(()=>{let{translations:e,userPrefersAnnouncements:t}=E();return t()?x`<media-announcer .translations=${T(e)}></media-announcer>`:null})}function A(e,t=``){return x`<slot
    name=${`${e}-icon`}
    data-class=${`vds-icon vds-${e}-icon${t?` ${t}`:``}`}
  ></slot>`}function j(e){return e.map(e=>A(e))}function M(e,t){return T(()=>O(e,t))}function N({tooltip:e}){let{translations:t}=E(),{remotePlaybackState:n}=C(),r=T(()=>`${O(t,`AirPlay`)} ${ce(n())}`),i=M(t,`AirPlay`);return x`
    <media-tooltip class="vds-airplay-tooltip vds-tooltip">
      <media-tooltip-trigger>
        <media-airplay-button class="vds-airplay-button vds-button" aria-label=${r}>
          ${A(`airplay`)}
        </media-airplay-button>
      </media-tooltip-trigger>
      <media-tooltip-content class="vds-tooltip-content" placement=${e}>
        <span class="vds-airplay-tooltip-text">${i}</span>
      </media-tooltip-content>
    </media-tooltip>
  `}function ke({tooltip:e}){let{translations:t}=E(),{remotePlaybackState:n}=C(),r=T(()=>`${O(t,`Google Cast`)} ${ce(n())}`),i=M(t,`Google Cast`);return x`
    <media-tooltip class="vds-google-cast-tooltip vds-tooltip">
      <media-tooltip-trigger>
        <media-google-cast-button class="vds-google-cast-button vds-button" aria-label=${r}>
          ${A(`google-cast`)}
        </media-google-cast-button>
      </media-tooltip-trigger>
      <media-tooltip-content class="vds-tooltip-content" placement=${e}>
        <span class="vds-google-cast-tooltip-text">${i}</span>
      </media-tooltip-content>
    </media-tooltip>
  `}function P({tooltip:e}){let{translations:t}=E(),n=M(t,`Play`),r=M(t,`Pause`);return x`
    <media-tooltip class="vds-play-tooltip vds-tooltip">
      <media-tooltip-trigger>
        <media-play-button
          class="vds-play-button vds-button"
          aria-label=${M(t,`Play`)}
        >
          ${j([`play`,`pause`,`replay`])}
        </media-play-button>
      </media-tooltip-trigger>
      <media-tooltip-content class="vds-tooltip-content" placement=${e}>
        <span class="vds-play-tooltip-text">${n}</span>
        <span class="vds-pause-tooltip-text">${r}</span>
      </media-tooltip-content>
    </media-tooltip>
  `}function Ae({tooltip:e,ref:t=te}){let{translations:n}=E(),r=M(n,`Mute`),i=M(n,`Unmute`);return x`
    <media-tooltip class="vds-mute-tooltip vds-tooltip">
      <media-tooltip-trigger>
        <media-mute-button
          class="vds-mute-button vds-button"
          aria-label=${M(n,`Mute`)}
          ${g(t)}
        >
          ${j([`mute`,`volume-low`,`volume-high`])}
        </media-mute-button>
      </media-tooltip-trigger>
      <media-tooltip-content class="vds-tooltip-content" placement=${e}>
        <span class="vds-mute-tooltip-text">${i}</span>
        <span class="vds-unmute-tooltip-text">${r}</span>
      </media-tooltip-content>
    </media-tooltip>
  `}function F({tooltip:e}){let{translations:t}=E(),n=M(t,`Closed-Captions On`),r=M(t,`Closed-Captions Off`);return x`
    <media-tooltip class="vds-caption-tooltip vds-tooltip">
      <media-tooltip-trigger>
        <media-caption-button
          class="vds-caption-button vds-button"
          aria-label=${M(t,`Captions`)}
        >
          ${j([`cc-on`,`cc-off`])}
        </media-caption-button>
      </media-tooltip-trigger>
      <media-tooltip-content class="vds-tooltip-content" placement=${e}>
        <span class="vds-cc-on-tooltip-text">${r}</span>
        <span class="vds-cc-off-tooltip-text">${n}</span>
      </media-tooltip-content>
    </media-tooltip>
  `}function je(){let{translations:e}=E(),t=M(e,`Enter PiP`),n=M(e,`Exit PiP`);return x`
    <media-tooltip class="vds-pip-tooltip vds-tooltip">
      <media-tooltip-trigger>
        <media-pip-button
          class="vds-pip-button vds-button"
          aria-label=${M(e,`PiP`)}
        >
          ${j([`pip-enter`,`pip-exit`])}
        </media-pip-button>
      </media-tooltip-trigger>
      <media-tooltip-content class="vds-tooltip-content">
        <span class="vds-pip-enter-tooltip-text">${t}</span>
        <span class="vds-pip-exit-tooltip-text">${n}</span>
      </media-tooltip-content>
    </media-tooltip>
  `}function Me({tooltip:e}){let{translations:t}=E(),n=M(t,`Enter Fullscreen`),r=M(t,`Exit Fullscreen`);return x`
    <media-tooltip class="vds-fullscreen-tooltip vds-tooltip">
      <media-tooltip-trigger>
        <media-fullscreen-button
          class="vds-fullscreen-button vds-button"
          aria-label=${M(t,`Fullscreen`)}
        >
          ${j([`fs-enter`,`fs-exit`])}
        </media-fullscreen-button>
      </media-tooltip-trigger>
      <media-tooltip-content class="vds-tooltip-content" placement=${e}>
        <span class="vds-fs-enter-tooltip-text">${n}</span>
        <span class="vds-fs-exit-tooltip-text">${r}</span>
      </media-tooltip-content>
    </media-tooltip>
  `}function Ne({backward:e,tooltip:t}){let{translations:n,seekStep:r}=E(),i=e?`Seek Backward`:`Seek Forward`,a=M(n,i);return x`
    <media-tooltip class="vds-seek-tooltip vds-tooltip">
      <media-tooltip-trigger>
        <media-seek-button
          class="vds-seek-button vds-button"
          seconds=${T(()=>(e?-1:1)*r())}
          aria-label=${a}
        >
          ${A(e?`seek-backward`:`seek-forward`)}
        </media-seek-button>
      </media-tooltip-trigger>
      <media-tooltip-content class="vds-tooltip-content" placement=${t}>
        ${M(n,i)}
      </media-tooltip-content>
    </media-tooltip>
  `}function Pe(){let{translations:e}=E(),{live:t}=C(),n=M(e,`Skip To Live`),r=M(e,`LIVE`);return t()?x`
        <media-live-button class="vds-live-button" aria-label=${n}>
          <span class="vds-live-button-text">${r}</span>
        </media-live-button>
      `:null}function I(){return T(()=>{let{download:e,translations:t}=E(),n=e();if(f(n))return null;let{source:r,title:i}=C(),a=r(),o=de({title:i(),src:a,download:n});return p(o?.url)?x`
          <media-tooltip class="vds-download-tooltip vds-tooltip">
            <media-tooltip-trigger>
              <a
                role="button"
                class="vds-download-button vds-button"
                aria-label=${M(t,`Download`)}
                href=${ue(o.url,{download:o.name})}
                download=${o.name}
                target="_blank"
              >
                <slot name="download-icon" data-class="vds-icon" />
              </a>
            </media-tooltip-trigger>
            <media-tooltip-content class="vds-tooltip-content" placement="top">
              ${M(t,`Download`)}
            </media-tooltip-content>
          </media-tooltip>
        `:null})}function L(){let{translations:e}=E();return x`
    <media-captions
      class="vds-captions"
      .exampleText=${M(e,`Captions look like this`)}
    ></media-captions>
  `}function R(){return x`<div class="vds-controls-spacer"></div>`}function Fe(e,t){return x`
    <media-menu-portal .container=${T(e)} disabled="fullscreen">
      ${t}
    </media-menu-portal>
  `}function Ie(e,t,n,r){let i=p(t)?document.querySelector(t):t;i||=e?.closest(`dialog`),i||=document.body;let a=document.createElement(`div`);a.style.display=`contents`,a.classList.add(n),i.append(a),o(()=>{if(!a)return;let{viewType:e}=C(),t=r();v(a,`data-view-type`,e()),v(a,`data-sm`,t),v(a,`data-lg`,!t),v(a,`data-size`,t?`sm`:`lg`)});let{colorScheme:s}=E();return be(a,s),a}function Le({placement:e,tooltip:t,portal:n}){let{textTracks:i}=S(),{viewType:a,seekableStart:o,seekableEnd:s}=C(),{translations:c,thumbnails:l,menuPortal:d,noModal:f,menuGroup:p,smallWhen:m}=E();if(r(()=>{let e=o(),t=s(),n=y(null);return fe(i,`chapters`,n.set),!n()?.cues.filter(n=>n.startTime<=t&&n.endTime>=e)?.length})())return null;let ee=r(()=>f()?b(e):m()?null:b(e)),h=r(()=>!m()&&p()===`bottom`&&a()===`video`?26:0),g=y(!1);function te(){g.set(!0)}function ne(){g.set(!1)}let _=x`
    <media-menu-items
      class="vds-chapters-menu-items vds-menu-items"
      placement=${T(ee)}
      offset=${T(h)}
    >
      ${T(()=>g()?x`
          <media-chapters-radio-group
            class="vds-chapters-radio-group vds-radio-group"
            .thumbnails=${T(l)}
          >
            <template>
              <media-radio class="vds-chapter-radio vds-radio">
                <media-thumbnail class="vds-thumbnail"></media-thumbnail>
                <div class="vds-chapter-radio-content">
                  <span class="vds-chapter-radio-label" data-part="label"></span>
                  <span class="vds-chapter-radio-start-time" data-part="start-time"></span>
                  <span class="vds-chapter-radio-duration" data-part="duration"></span>
                </div>
              </media-radio>
            </template>
          </media-chapters-radio-group>
        `:null)}
    </media-menu-items>
  `;return x`
    <media-menu class="vds-chapters-menu vds-menu" @open=${te} @close=${ne}>
      <media-tooltip class="vds-tooltip">
        <media-tooltip-trigger>
          <media-menu-button
            class="vds-menu-button vds-button"
            aria-label=${M(c,`Chapters`)}
          >
            ${A(`menu-chapters`)}
          </media-menu-button>
        </media-tooltip-trigger>
        <media-tooltip-content
          class="vds-tooltip-content"
          placement=${u(t)?T(t):t}
        >
          ${M(c,`Chapters`)}
        </media-tooltip-content>
      </media-tooltip>
      ${n?Fe(d,_):_}
    </media-menu>
  `}function Re(e){let{style:t}=new Option;return t.color=e,t.color.match(/\((.*?)\)/)[1].replace(/,/g,` `)}const z={type:`color`},ze={type:`radio`,values:{"Monospaced Serif":`mono-serif`,"Proportional Serif":`pro-serif`,"Monospaced Sans-Serif":`mono-sans`,"Proportional Sans-Serif":`pro-sans`,Casual:`casual`,Cursive:`cursive`,"Small Capitals":`capitals`}},Be={type:`slider`,min:0,max:400,step:25,upIcon:null,downIcon:null},Ve={type:`slider`,min:0,max:100,step:5,upIcon:null,downIcon:null},He={type:`radio`,values:[`None`,`Drop Shadow`,`Raised`,`Depressed`,`Outline`]},B={fontFamily:`pro-sans`,fontSize:`100%`,textColor:`#ffffff`,textOpacity:`100%`,textShadow:`none`,textBg:`#000000`,textBgOpacity:`100%`,displayBg:`#000000`,displayBgOpacity:`0%`},V=Object.keys(B).reduce((e,t)=>({...e,[t]:y(B[t])}),{});for(let e of Object.keys(V)){let t=w.getItem(`vds-player:${n(e)}`);p(t)&&V[e].set(t)}function Ue(){for(let e of Object.keys(V)){let t=B[e];V[e].set(t)}}let We=!1,H=new Set;function Ge(){let{player:e}=S();H.add(e),Ke(e),ne(()=>H.delete(e)),We||=(ae(()=>{for(let e of m(V)){let t=V[e],r=B[e],i=`vds-player:${n(e)}`;o(()=>{let n=t(),a=n===r;for(let t of H)qe(t,e,n);a?w.removeItem(i):w.setItem(i,n)})}},null),!0)}function Ke(e){for(let t of m(V))qe(e,t,V[t]())}function qe(e,t,r){let i=B[t],a=`--media-user-${n(t)}`,o=r===i?null:Je(t,r);if(t===`fontFamily`){let t=r===`capitals`?`small-caps`:null;e.el?.style.setProperty(`--media-user-font-variant`,t)}e.el?.style.setProperty(a,o)}function Je(e,t){switch(e){case`fontFamily`:return Xe(t);case`fontSize`:case`textOpacity`:case`textBgOpacity`:case`displayBgOpacity`:return Ye(t);case`textColor`:return`rgb(${Re(t)} / var(--media-user-text-opacity, 1))`;case`textShadow`:return Ze(t);case`textBg`:return`rgb(${Re(t)} / var(--media-user-text-bg-opacity, 1))`;case`displayBg`:return`rgb(${Re(t)} / var(--media-user-display-bg-opacity, 1))`}}function Ye(e){return(parseInt(e)/100).toString()}function Xe(e){switch(e){case`mono-serif`:return`"Courier New", Courier, "Nimbus Mono L", "Cutive Mono", monospace`;case`mono-sans`:return`"Deja Vu Sans Mono", "Lucida Console", Monaco, Consolas, "PT Mono", monospace`;case`pro-sans`:return`Roboto, "Arial Unicode Ms", Arial, Helvetica, Verdana, "PT Sans Caption", sans-serif`;case`casual`:return`"Comic Sans MS", Impact, Handlee, fantasy`;case`cursive`:return`"Monotype Corsiva", "URW Chancery L", "Apple Chancery", "Dancing Script", cursive`;case`capitals`:return`"Arial Unicode Ms", Arial, Helvetica, Verdana, "Marcellus SC", sans-serif + font-variant=small-caps`;default:return`"Times New Roman", Times, Georgia, Cambria, "PT Serif Caption", serif`}}function Ze(e){switch(e){case`drop shadow`:return`rgb(34, 34, 34) 1.86389px 1.86389px 2.79583px, rgb(34, 34, 34) 1.86389px 1.86389px 3.72778px, rgb(34, 34, 34) 1.86389px 1.86389px 4.65972px`;case`raised`:return`rgb(34, 34, 34) 1px 1px, rgb(34, 34, 34) 2px 2px`;case`depressed`:return`rgb(204, 204, 204) 1px 1px, rgb(34, 34, 34) -1px -1px`;case`outline`:return`rgb(34, 34, 34) 0px 0px 1.86389px, rgb(34, 34, 34) 0px 0px 1.86389px, rgb(34, 34, 34) 0px 0px 1.86389px, rgb(34, 34, 34) 0px 0px 1.86389px, rgb(34, 34, 34) 0px 0px 1.86389px`;default:return``}}let Qe=0;function U({label:e=``,value:t=``,children:n}){if(!e)return x`
      <div class="vds-menu-section">
        <div class="vds-menu-section-body">${n}</div>
      </div>
    `;let r=`vds-menu-section-${++Qe}`;return x`
    <section class="vds-menu-section" role="group" aria-labelledby=${r}>
      <div class="vds-menu-section-title">
        <header id=${r}>${e}</header>
        ${t?x`<div class="vds-menu-section-value">${t}</div>`:null}
      </div>
      <div class="vds-menu-section-body">${n}</div>
    </section>
  `}function W({label:e,children:t}){return x`
    <div class="vds-menu-item">
      <div class="vds-menu-item-label">${e}</div>
      ${t}
    </div>
  `}function G({label:e,icon:t,hint:n}){return x`
    <media-menu-button class="vds-menu-item">
      ${A(`menu-arrow-left`,`vds-menu-close-icon`)}
      ${t?A(t,`vds-menu-item-icon`):null}
      <span class="vds-menu-item-label">${T(e)}</span>
      <span class="vds-menu-item-hint" data-part="hint">${n?T(n):null} </span>
      ${A(`menu-arrow-right`,`vds-menu-open-icon`)}
    </media-menu-button>
  `}function $e({value:e=null,options:t,hideLabel:n=!1,children:r=null,onChange:i=null}){function a(e){let{value:t,label:i}=e;return x`
      <media-radio class="vds-radio" value=${t}>
        ${A(`menu-radio-check`)}
        ${n?null:x`
              <span class="vds-radio-label" data-part="label">
                ${p(i)?i:T(i)}
              </span>
            `}
        ${u(r)?r(e):r}
      </media-radio>
    `}return x`
    <media-radio-group
      class="vds-radio-group"
      value=${p(e)?e:e?T(e):``}
      @change=${i}
    >
      ${c(t)?t.map(a):T(()=>t().map(a))}
    </media-radio-group>
  `}function et(e){return c(e)?e.map(e=>({label:e,value:e.toLowerCase()})):Object.keys(e).map(t=>({label:t,value:e[t]}))}function K(){return x`
    <div class="vds-slider-track"></div>
    <div class="vds-slider-track-fill vds-slider-track"></div>
    <div class="vds-slider-thumb"></div>
  `}function q(){return x`
    <media-slider-steps class="vds-slider-steps">
      <template>
        <div class="vds-slider-step"></div>
      </template>
    </media-slider-steps>
  `}function J({label:e=null,value:t=null,upIcon:n=``,downIcon:r=``,children:i,isMin:a,isMax:o}){let s=e||t,c=[r?A(r,`down`):null,i,n?A(n,`up`):null];return x`
    <div
      class=${`vds-menu-item vds-menu-slider-item${s?` group`:``}`}
      data-min=${T(()=>a()?``:null)}
      data-max=${T(()=>o()?``:null)}
    >
      ${s?x`
            <div class="vds-menu-slider-title">
              ${[e?x`<div>${e}</div>`:null,t?x`<div>${t}</div>`:null]}
            </div>
            <div class="vds-menu-slider-body">${c}</div>
          `:c}
    </div>
  `}const tt={...Be,upIcon:`menu-opacity-up`,downIcon:`menu-opacity-down`},Y={...Ve,upIcon:`menu-opacity-up`,downIcon:`menu-opacity-down`};function nt(){return T(()=>{let{hasCaptions:e}=C(),{translations:t}=E();return e()?x`
      <media-menu class="vds-font-menu vds-menu">
        ${G({label:()=>O(t,`Caption Styles`)})}
        <media-menu-items class="vds-menu-items">
          ${[U({label:M(t,`Font`),children:[rt(),it()]}),U({label:M(t,`Text`),children:[at(),st(),ot()]}),U({label:M(t,`Text Background`),children:[ct(),lt()]}),U({label:M(t,`Display Background`),children:[ut(),dt()]}),U({children:[ft()]})]}
        </media-menu-items>
      </media-menu>
    `:null})}function rt(){return X({label:`Family`,option:ze,type:`fontFamily`})}function it(){return X({label:`Size`,option:tt,type:`fontSize`})}function at(){return X({label:`Color`,option:z,type:`textColor`})}function ot(){return X({label:`Opacity`,option:Y,type:`textOpacity`})}function st(){return X({label:`Shadow`,option:He,type:`textShadow`})}function ct(){return X({label:`Color`,option:z,type:`textBg`})}function lt(){return X({label:`Opacity`,option:Y,type:`textBgOpacity`})}function ut(){return X({label:`Color`,option:z,type:`displayBg`})}function dt(){return X({label:`Opacity`,option:Y,type:`displayBgOpacity`})}function ft(){let{translations:e}=E();return x`
    <button class="vds-menu-item" role="menuitem" @click=${Ue}>
      <span class="vds-menu-item-label">${T(()=>O(e,`Reset`))}</span>
    </button>
  `}function X({label:e,option:t,type:r}){let{player:i}=S(),{translations:a}=E(),o=V[r],s=()=>O(a,e);function c(){oe(),i.dispatchEvent(new Event(`vds-font-change`))}if(t.type===`color`){function e(e){o.set(e.target.value),c()}return W({label:T(s),children:x`
        <input
          class="vds-color-picker"
          type="color"
          .value=${T(o)}
          @input=${e}
        />
      `})}if(t.type===`slider`){let{min:e,max:n,step:r,upIcon:i,downIcon:a}=t;function l(e){o.set(e.detail+`%`),c()}return J({label:T(s),value:T(o),upIcon:i,downIcon:a,isMin:()=>o()===e+`%`,isMax:()=>o()===n+`%`,children:x`
        <media-slider
          class="vds-slider"
          min=${e}
          max=${n}
          step=${r}
          key-step=${r}
          .value=${T(()=>parseInt(o()))}
          aria-label=${T(s)}
          @value-change=${l}
          @drag-value-change=${l}
        >
          ${K()}${q()}
        </media-slider>
      `})}let l=et(t.values);return x`
    <media-menu class=${`vds-${n(r)}-menu vds-menu`}>
      ${G({label:s,hint:()=>{let e=o(),t=l.find(t=>t.value===e)?.label||``;return O(a,p(t)?t:t())}})}
      <media-menu-items class="vds-menu-items">
        ${$e({value:o,options:l,onChange({detail:e}){o.set(e),c()}})}
      </media-menu-items>
    </media-menu>
  `}function pt({label:e,checked:t,defaultChecked:n=!1,storageKey:r,onChange:i}){let{translations:a}=E(),s=y(!!((r?w.getItem(r):null)??n)),c=y(!1),l=T(pe(s)),u=M(a,e);r&&i(_(s)),t&&o(()=>void s.set(t()));function f(e){e?.button!==1&&(s.set(e=>!e),r&&w.setItem(r,s()?`1`:``),i(s(),e),c.set(!1))}function p(e){d(e)&&f()}function m(e){e.button===0&&c.set(!0)}return x`
    <div
      class="vds-menu-checkbox"
      role="menuitemcheckbox"
      tabindex="0"
      aria-label=${u}
      aria-checked=${l}
      data-active=${T(()=>c()?``:null)}
      @pointerup=${f}
      @pointerdown=${m}
      @keydown=${p}
    ></div>
  `}function mt(){return T(()=>{let{translations:e}=E();return x`
      <media-menu class="vds-accessibility-menu vds-menu">
        ${G({label:()=>O(e,`Accessibility`),icon:`menu-accessibility`})}
        <media-menu-items class="vds-menu-items">
          ${[U({children:[ht(),gt()]}),U({children:[nt()]})]}
        </media-menu-items>
      </media-menu>
    `})}function ht(){let{userPrefersAnnouncements:e,translations:t}=E(),n=`Announcements`;return W({label:M(t,n),children:pt({label:n,storageKey:`vds-player::announcements`,onChange(t){e.set(t)}})})}function gt(){return T(()=>{let{translations:e,userPrefersKeyboardAnimations:t,noKeyboardAnimations:n}=E(),{viewType:i}=C();if(r(()=>i()!==`video`||n())())return null;let a=`Keyboard Animations`;return W({label:M(e,a),children:pt({label:a,defaultChecked:!0,storageKey:`vds-player::keyboard-animations`,onChange(e){t.set(e)}})})})}function _t(){return T(()=>{let{noAudioGain:e,translations:t}=E(),{audioTrack:n,audioTracks:i,canSetAudioGain:a}=C();return r(()=>!(a()&&!e())&&i().length<=1)()?null:x`
      <media-menu class="vds-audio-menu vds-menu">
        ${G({label:()=>O(t,`Audio`),icon:`menu-audio`,hint:()=>n()?.label??``})}
        <media-menu-items class="vds-menu-items">
          ${[vt(),yt()]}
        </media-menu-items>
      </media-menu>
    `})}function vt(){return T(()=>{let{translations:e}=E(),{audioTracks:t}=C(),n=M(e,`Default`);return r(()=>t().length<=1)()?null:U({children:x`
        <media-menu class="vds-audio-tracks-menu vds-menu">
          ${G({label:()=>O(e,`Track`)})}
          <media-menu-items class="vds-menu-items">
            <media-audio-radio-group
              class="vds-audio-track-radio-group vds-radio-group"
              empty-label=${n}
            >
              <template>
                <media-radio class="vds-audio-track-radio vds-radio">
                  <slot name="menu-radio-check-icon" data-class="vds-icon"></slot>
                  <span class="vds-radio-label" data-part="label"></span>
                </media-radio>
              </template>
            </media-audio-radio-group>
          </media-menu-items>
        </media-menu>
      `})})}function yt(){return T(()=>{let{noAudioGain:e,translations:t}=E(),{canSetAudioGain:n}=C();if(r(()=>!n()||e())())return null;let{audioGain:i}=C();return U({label:M(t,`Boost`),value:T(()=>Math.round(((i()??1)-1)*100)+`%`),children:[J({upIcon:`menu-audio-boost-up`,downIcon:`menu-audio-boost-down`,children:bt(),isMin:()=>((i()??1)-1)*100<=xt(),isMax:()=>((i()??1)-1)*100===St()})]})})}function bt(){let{translations:e}=E(),t=M(e,`Boost`),n=xt,r=St,i=Ct;return x`
    <media-audio-gain-slider
      class="vds-audio-gain-slider vds-slider"
      aria-label=${t}
      min=${T(n)}
      max=${T(r)}
      step=${T(i)}
      key-step=${T(i)}
    >
      ${K()}${q()}
    </media-audio-gain-slider>
  `}function xt(){let{audioGains:e}=E(),t=e();return c(t)?t[0]??0:t.min}function St(){let{audioGains:e}=E(),t=e();return c(t)?t[t.length-1]??300:t.max}function Ct(){let{audioGains:e}=E(),t=e();return c(t)?t[1]-t[0]||25:t.step}function wt(){return T(()=>{let{translations:e}=E(),{hasCaptions:t}=C(),n=M(e,`Off`);return t()?x`
      <media-menu class="vds-captions-menu vds-menu">
        ${G({label:()=>O(e,`Captions`),icon:`menu-captions`})}
        <media-menu-items class="vds-menu-items">
          <media-captions-radio-group
            class="vds-captions-radio-group vds-radio-group"
            off-label=${n}
          >
            <template>
              <media-radio class="vds-caption-radio vds-radio">
                <slot name="menu-radio-check-icon" data-class="vds-icon"></slot>
                <span class="vds-radio-label" data-part="label"></span>
              </media-radio>
            </template>
          </media-captions-radio-group>
        </media-menu-items>
      </media-menu>
    `:null})}function Tt(){return T(()=>{let{hideQualityBitrate:e,translations:t}=E(),{canSetQuality:n,qualities:r}=C();if(!n()||r().length<=1)return null;let i=M(t,`Auto`);return x`
      <media-menu class="vds-quality-menu vds-menu">
        ${G({label:()=>O(t,`Quality`),icon:`menu-quality-up`})}
        <media-menu-items class="vds-menu-items">
          <media-quality-radio-group
            class="vds-quality-radio-group vds-radio-group"
            auto-label=${i}
            ?hide-bitrate=${T(e)}
          >
            <template>
              <media-radio class="vds-quality-radio vds-radio">
                <slot name="menu-radio-check-icon" data-class="vds-icon"></slot>
                <span class="vds-radio-label" data-part="label"></span>
                <span class="vds-radio-hint" data-part="bitrate"></span>
              </media-radio>
            </template>
          </media-quality-radio-group>
        </media-menu-items>
      </media-menu>
    `})}function Et(){return T(()=>{let{translations:e}=E(),{canSetPlaybackRate:t,playbackRate:n}=C();return t()?x`
      <media-menu class="vds-speed-menu vds-menu">
        ${G({label:()=>O(e,`Speed`),icon:`menu-speed-up`,hint:()=>n()===1?O(e,`Normal`):n()+`x`})}
        <media-menu-items class="vds-menu-items">
          ${U({label:M(e,`Speed`),value:T(()=>n()===1?O(e,`Normal`):n()+`x`),children:J({upIcon:`menu-font-size-up`,downIcon:`menu-font-size-down`,children:At(),isMin:()=>n()===Dt(),isMax:()=>n()===Ot()})})}
        </media-menu-items>
      </media-menu>
    `:null})}function Dt(){let{playbackRates:e}=E(),t=e();return c(t)?t[0]??0:t.min}function Ot(){let{playbackRates:e}=E(),t=e();return c(t)?t[t.length-1]??2:t.max}function kt(){let{playbackRates:e}=E(),t=e();return c(t)?t[1]-t[0]||.25:t.step}function At(){let{translations:e}=E(),t=M(e,`Speed`),n=Dt,r=Ot,i=kt;return x`
    <media-speed-slider
      class="vds-speed-slider vds-slider"
      aria-label=${t}
      min=${T(n)}
      max=${T(r)}
      step=${T(i)}
      key-step=${T(i)}
    >
      ${K()}${q()}
    </media-speed-slider>
  `}function jt({placement:e,portal:t,tooltip:n}){return T(()=>{let{viewType:i}=C(),{translations:a,menuPortal:o,noModal:s,menuGroup:c,smallWhen:l}=E(),d=r(()=>s()?b(e):l()?null:b(e)),f=r(()=>!l()&&c()===`bottom`&&i()===`video`?26:0),p=y(!1);Ge();function m(){p.set(!0)}function ee(){p.set(!1)}let h=x`
      <media-menu-items
        class="vds-settings-menu-items vds-menu-items"
        placement=${T(d)}
        offset=${T(f)}
      >
        ${T(()=>p()?[Et(),Tt(),mt(),_t(),wt()]:null)}
      </media-menu-items>
    `;return x`
      <media-menu class="vds-settings-menu vds-menu" @open=${m} @close=${ee}>
        <media-tooltip class="vds-tooltip">
          <media-tooltip-trigger>
            <media-menu-button
              class="vds-menu-button vds-button"
              aria-label=${M(a,`Settings`)}
            >
              ${A(`menu-settings`,`vds-rotate-icon`)}
            </media-menu-button>
          </media-tooltip-trigger>
          <media-tooltip-content
            class="vds-tooltip-content"
            placement=${u(n)?T(n):n}
          >
            ${M(a,`Settings`)}
          </media-tooltip-content>
        </media-tooltip>
        ${t?Fe(o,h):h}
      </media-menu>
    `})}function Z({orientation:e,tooltip:t}){return T(()=>{let{pointer:n,muted:r,canSetVolume:i}=C();if(n()===`coarse`&&!r())return null;if(!i())return Ae({tooltip:t});let a=y(void 0);return x`
      <div class="vds-volume" ?data-active=${T(_e(a))} ${g(a.set)}>
        ${Ae({tooltip:t})}
        <div class="vds-volume-popup">${Mt({orientation:e})}</div>
      </div>
    `})}function Mt({orientation:e}={}){let{translations:t}=E();return x`
    <media-volume-slider
      class="vds-volume-slider vds-slider"
      aria-label=${M(t,`Volume`)}
      orientation=${ee(e)}
    >
      <div class="vds-slider-track"></div>
      <div class="vds-slider-track-fill vds-slider-track"></div>
      <media-slider-preview class="vds-slider-preview" no-clamp>
        <media-slider-value class="vds-slider-value"></media-slider-value>
      </media-slider-preview>
      <div class="vds-slider-thumb"></div>
    </media-volume-slider>
  `}function Q(){let e=y(void 0),t=y(0),{thumbnails:n,translations:r,sliderChaptersMinWidth:i,disableTimeSlider:a,seekStep:o,noScrubGesture:s}=E(),c=M(r,`Seek`),l=T(a),u=T(()=>t()<i()),d=T(n);return ve(e,()=>{let n=e();n&&t.set(n.clientWidth)}),x`
    <media-time-slider
      class="vds-time-slider vds-slider"
      aria-label=${c}
      key-step=${T(o)}
      ?disabled=${l}
      ?no-swipe-gesture=${T(s)}
      ${g(e.set)}
    >
      <media-slider-chapters class="vds-slider-chapters" ?disabled=${u}>
        <template>
          <div class="vds-slider-chapter">
            <div class="vds-slider-track"></div>
            <div class="vds-slider-track-fill vds-slider-track"></div>
            <div class="vds-slider-progress vds-slider-track"></div>
          </div>
        </template>
      </media-slider-chapters>
      <div class="vds-slider-thumb"></div>
      <media-slider-preview class="vds-slider-preview">
        <media-slider-thumbnail
          class="vds-slider-thumbnail vds-thumbnail"
          .src=${d}
        ></media-slider-thumbnail>
        <div class="vds-slider-chapter-title" data-part="chapter-title"></div>
        <media-slider-value class="vds-slider-value"></media-slider-value>
      </media-slider-preview>
    </media-time-slider>
  `}function Nt(){return x`
    <div class="vds-time-group">
      ${T(()=>{let{duration:e}=C();return e()?[x`<media-time class="vds-time" type="current"></media-time>`,x`<div class="vds-time-divider">/</div>`,x`<media-time class="vds-time" type="duration"></media-time>`]:null})}
    </div>
  `}function Pt(){return T(()=>{let{live:e,duration:t}=C();return e()?Pe():t()?x`<media-time class="vds-time" type="current" toggle remainder></media-time>`:null})}function Ft(){return T(()=>{let{live:e}=C();return e()?Pe():Nt()})}function It(){return T(()=>{let{textTracks:e}=S(),{title:t,started:n}=C(),r=y(null);return fe(e,`chapters`,r.set),r()&&(n()||!t())?Lt():x`<media-title class="vds-chapter-title"></media-title>`})}function Lt(){return x`<media-chapter-title class="vds-chapter-title"></media-chapter-title>`}function Rt(){return[k(),L(),x`
      <media-controls class="vds-controls">
        <media-controls-group class="vds-controls-group">
          ${[Ne({backward:!0,tooltip:`top start`}),P({tooltip:`top`}),Ne({tooltip:`top`}),zt(),Q(),Pt(),Z({orientation:`vertical`,tooltip:`top`}),F({tooltip:`top`}),I(),N({tooltip:`top`}),Bt()]}
        </media-controls-group>
      </media-controls>
    `]}function zt(){return T(()=>{let e=y(void 0),t=y(!1),n=S(),{title:r,started:i,currentTime:a,ended:s}=C(),{translations:c}=E(),l=ye(e),u=()=>i()||a()>0,d=()=>`${O(c,s()?`Replay`:u()?`Continue`:`Play`)}: ${r()}`;o(()=>{l()&&document.activeElement===document.body&&n.player.el?.focus({preventScroll:!0})});function f(){let n=e(),r=!!n&&!l()&&n.clientWidth<n.children[0].clientWidth;n&&se(n,`vds-marquee`,r),t.set(r)}function p(){return x`
        <span class="vds-title-text">
          ${T(d)}${T(()=>u()?Lt():null)}
        </span>
      `}return ve(e,f),r()?x`
          <span class="vds-title" title=${T(d)} ${g(e.set)}>
            ${[p(),T(()=>t()&&!l()?p():null)]}
          </span>
        `:R()})}function Bt(){let e=`top end`;return[Le({tooltip:`top`,placement:e,portal:!0}),jt({tooltip:`top end`,placement:e,portal:!0})]}var Vt=class extends Se{async loadIcons(){let e=(await import(`./vidstack-CjliHkOZ.js`)).icons,t={};for(let n of Object.keys(e))t[n]=xe({name:n,paths:e[n]});return t}},Ht=class extends t(me,De){static tagName=`media-audio-layout`;static attrs={smallWhen:{converter(e){return e!==`never`&&!!e}}};#e;#t=y(!1);onSetup(){this.forwardKeepAlive=!1,this.#e=S(),this.#r(),this.#a()}onConnect(){this.#r(),Oe(`audio`,()=>this.isMatch),this.#i()}render(){return T(this.#n.bind(this))}#n(){return this.isMatch?Rt():null}#r(){this.classList.add(`vds-audio-layout`)}#i(){let{menuPortal:e}=E();o(()=>{if(!this.isMatch)return;let t=Ie(this,this.menuContainer,`vds-audio-layout`,()=>this.isSmallLayout),n=t?[this,t]:[this];return(this.$props.customIcons()?new Ce(n):new Vt(n)).connect(),e.set(t),()=>{t.remove(),e.set(null)}})}#a(){let{pointer:e}=this.#e.$state;o(()=>{e()===`coarse`&&o(this.#o.bind(this))})}#o(){if(!this.#t()){h(this,`pointerdown`,this.#s.bind(this),{capture:!0});return}h(this,`pointerdown`,e=>e.stopPropagation()),h(window,`pointerdown`,this.#c.bind(this))}#s(e){let{target:t}=e;ge(t)&&t.closest(`.vds-time-slider`)&&(e.stopImmediatePropagation(),this.setAttribute(`data-scrubbing`,``),this.#t.set(!0))}#c(){this.#t.set(!1),this.removeAttribute(`data-scrubbing`)}},Ut=class extends D{static props={...super.props,when:({viewType:e})=>e===`video`,smallWhen:({width:e,height:t})=>e<576||t<380}};function Wt(){return T(()=>{let e=S(),{noKeyboardAnimations:t,userPrefersKeyboardAnimations:i}=E();if(r(()=>t()||!i())())return null;let a=y(!1),{lastKeyboardAction:c}=e.$state;o(()=>{a.set(!!c());let e=setTimeout(()=>a.set(!1),500);return()=>{a.set(!1),window.clearTimeout(e)}});let l=r(()=>{let e=c()?.action;return e&&a()?n(e):null}),u=r(()=>`vds-kb-action${a()?``:` hidden`}`),d=r(Gt),f=r(()=>{let e=qt();return e?he(e):null});function p(){let e=f();return e?x`
        <div class="vds-kb-bezel">
          <div class="vds-kb-icon">${e}</div>
        </div>
      `:null}return x`
      <div class=${T(u)} data-action=${T(l)}>
        <div class="vds-kb-text-wrapper">
          <div class="vds-kb-text">${T(d)}</div>
        </div>
        ${T(()=>s(c(),p()))}
      </div>
    `})}function Gt(){let{$state:e}=S(),t=e.lastKeyboardAction()?.action,n=e.audioGain()??1;switch(t){case`toggleMuted`:return e.muted()?`0%`:Kt(e.volume(),n);case`volumeUp`:case`volumeDown`:return Kt(e.volume(),n);default:return``}}function Kt(e,t){return`${Math.round(e*t*100)}%`}function qt(){let{$state:e}=S();switch(e.lastKeyboardAction()?.action){case`togglePaused`:return e.paused()?`kb-pause-icon`:`kb-play-icon`;case`toggleMuted`:return e.muted()||e.volume()===0?`kb-mute-icon`:e.volume()>=.5?`kb-volume-up-icon`:`kb-volume-down-icon`;case`toggleFullscreen`:return`kb-fs-${e.fullscreen()?`enter`:`exit`}-icon`;case`togglePictureInPicture`:return`kb-pip-${e.pictureInPicture()?`enter`:`exit`}-icon`;case`toggleCaptions`:return e.hasCaptions()?`kb-cc-${e.textTrack()?`on`:`off`}-icon`:null;case`volumeUp`:return`kb-volume-up-icon`;case`volumeDown`:return`kb-volume-down-icon`;case`seekForward`:return`kb-seek-forward-icon`;case`seekBackward`:return`kb-seek-backward-icon`;default:return null}}function Jt(){return[k(),tn(),$(),Wt(),L(),x`<div class="vds-scrim"></div>`,x`
      <media-controls class="vds-controls">
        ${[Xt(),R(),x`<media-controls-group class="vds-controls-group"></media-controls-group>`,R(),x`
            <media-controls-group class="vds-controls-group">
              ${Q()}
            </media-controls-group>
          `,x`
            <media-controls-group class="vds-controls-group">
              ${[P({tooltip:`top start`}),Z({orientation:`horizontal`,tooltip:`top`}),Ft(),It(),F({tooltip:`top`}),Yt(),N({tooltip:`top`}),ke({tooltip:`top`}),I(),je(),Me({tooltip:`top end`})]}
            </media-controls-group>
          `]}
      </media-controls>
    `]}function Yt(){return T(()=>{let{menuGroup:e}=E();return e()===`bottom`?en():null})}function Xt(){return x`
    <media-controls-group class="vds-controls-group">
      ${T(()=>{let{menuGroup:e}=E();return e()===`top`?[R(),en()]:null})}
    </media-controls-group>
  `}function Zt(){return[k(),tn(),$(),L(),Wt(),x`<div class="vds-scrim"></div>`,x`
      <media-controls class="vds-controls">
        <media-controls-group class="vds-controls-group">
          ${[N({tooltip:`top start`}),ke({tooltip:`bottom start`}),R(),F({tooltip:`bottom`}),I(),en(),Z({orientation:`vertical`,tooltip:`bottom end`})]}
        </media-controls-group>

        ${R()}

        <media-controls-group class="vds-controls-group" style="pointer-events: none;">
          ${[R(),P({tooltip:`top`}),R()]}
        </media-controls-group>

        ${R()}

        <media-controls-group class="vds-controls-group">
          ${[Ft(),It(),Me({tooltip:`top end`})]}
        </media-controls-group>

        <media-controls-group class="vds-controls-group">
          ${Q()}
        </media-controls-group>
      </media-controls>
    `,$t()]}function Qt(){return x`
    <div class="vds-load-container">
      ${[$(),P({tooltip:`top`})]}
    </div>
  `}function $t(){return T(()=>{let{duration:e}=C();return e()===0?null:x`
      <div class="vds-start-duration">
        <media-time class="vds-time" type="duration"></media-time>
      </div>
    `})}function $(){return x`
    <div class="vds-buffering-indicator">
      <media-spinner class="vds-buffering-spinner"></media-spinner>
    </div>
  `}function en(){let{menuGroup:e,smallWhen:t}=E(),n=()=>e()===`top`||t()?`bottom`:`top`,i=r(()=>`${n()} ${e()===`top`?`end`:`center`}`),a=r(()=>`${n()} end`);return[Le({tooltip:i,placement:a,portal:!0}),jt({tooltip:i,placement:a,portal:!0})]}function tn(){return T(()=>{let{noGestures:e}=E();return e()?null:x`
      <div class="vds-gestures">
        <media-gesture class="vds-gesture" event="pointerup" action="toggle:paused"></media-gesture>
        <media-gesture
          class="vds-gesture"
          event="pointerup"
          action="toggle:controls"
        ></media-gesture>
        <media-gesture
          class="vds-gesture"
          event="dblpointerup"
          action="toggle:fullscreen"
        ></media-gesture>
        <media-gesture class="vds-gesture" event="dblpointerup" action="seek:-10"></media-gesture>
        <media-gesture class="vds-gesture" event="dblpointerup" action="seek:10"></media-gesture>
      </div>
    `})}var nn=class extends t(me,Ut){static tagName=`media-video-layout`;static attrs={smallWhen:{converter(e){return e!==`never`&&!!e}}};#e;onSetup(){this.forwardKeepAlive=!1,this.#e=S(),this.#t()}onConnect(){this.#t(),Oe(`video`,()=>this.isMatch),this.#n()}render(){return T(this.#r.bind(this))}#t(){this.classList.add(`vds-video-layout`)}#n(){let{menuPortal:e}=E();o(()=>{if(!this.isMatch)return;let t=Ie(this,this.menuContainer,`vds-video-layout`,()=>this.isSmallLayout),n=t?[this,t]:[this];return(this.$props.customIcons()?new Ce(n):new Vt(n)).connect(),e.set(t),()=>{t.remove(),e.set(null)}})}#r(){let{load:e}=this.#e.$props,{canLoad:t,streamType:n,nativeControls:r}=this.#e.$state;return!r()&&this.isMatch?e()===`play`&&!t()?Qt():n()===`unknown`?$():this.isSmallLayout?Zt():Jt():null}};a(Ht),a(nn);