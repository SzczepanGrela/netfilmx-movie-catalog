import{Component as e,Host as t,computed as n,createContext as r,createDisposalBin as i,defineCustomElement as a,effect as o,isKeyboardClick as s,isKeyboardEvent as c,isString as l,listenEvent as u,o$1 as d,onDispose as f,peek as p,provideContext as m,signal as h,useContext as g,x as _}from"./vidstack-BPo1FnPl.js";import{useMediaContext as v}from"./vidstack-C7uud4Wl.js";import{appendParamsToURL as y,getDownloadFile as b}from"./vidstack-Cn-KkgnC.js";import{LitElement as x}from"./vidstack-Bz0O6SMD.js";import{MediaAirPlayButtonElement as S,MediaAudioRadioGroupElement as C,MediaCaptionButtonElement as w,MediaCaptionsRadioGroupElement as ee,MediaFullscreenButtonElement as te,MediaLiveButtonElement as ne,MediaMenuButtonElement as re,MediaMenuElement as ie,MediaMenuItemElement as ae,MediaMenuItemsElement as oe,MediaMuteButtonElement as se,MediaPIPButtonElement as ce,MediaPlayButtonElement as T,MediaQualityRadioGroupElement as E,MediaRadioElement as D,MediaSeekButtonElement as O,MediaSliderPreviewElement as k,MediaSliderThumbnailElement as A,MediaSliderValueElement as j,MediaSpeedRadioGroupElement as M,MediaThumbnailElement as N,MediaTimeElement as P,MediaTimeSliderElement as F,MediaVolumeSliderElement as I}from"./vidstack-hZ91bAmY.js";import{MediaPosterElement as L}from"./vidstack-DaafK6Ec.js";import{$signal as R,Icon as z,LayoutIconsLoader as B,SlotManager as V}from"./vidstack-BAXJ85JM.js";const H=r();function U(){return g(H)}const W={clickToPlay:!0,clickToFullscreen:!0,controls:[`play-large`,`play`,`progress`,`current-time`,`mute+volume`,`captions`,`settings`,`pip`,`airplay`,`fullscreen`],customIcons:!1,displayDuration:!1,download:null,markers:null,invertTime:!0,thumbnails:null,toggleTime:!0,translations:null,seekTime:10,speed:[.5,.75,1,1.25,1.5,1.75,2,4]};var G=class extends e{static props=W;#e;onSetup(){this.#e=v(),m(H,{...this.$props,previewTime:h(0)})}};function le(e,t){let{canAirPlay:n,canFullscreen:r,canPictureInPicture:a,controlsHidden:s,currentTime:c,fullscreen:l,hasCaptions:u,isAirPlayConnected:d,paused:f,pictureInPicture:p,playing:m,pointer:h,poster:g,textTrack:_,viewType:v,waiting:y}=t.$state;e.classList.add(`plyr`),e.classList.add(`plyr--full-ui`);let b={"plyr--airplay-active":d,"plyr--airplay-supported":n,"plyr--fullscreen-active":l,"plyr--fullscreen-enabled":r,"plyr--hide-controls":s,"plyr--is-touch":()=>h()===`coarse`,"plyr--loading":y,"plyr--paused":f,"plyr--pip-active":p,"plyr--pip-enabled":a,"plyr--playing":m,"plyr__poster-enabled":g,"plyr--stopped":()=>f()&&c()===0,"plyr--captions-active":_,"plyr--captions-enabled":u},x=i();for(let t of Object.keys(b))x.add(o(()=>void e.classList.toggle(t,!!b[t]())));return x.add(o(()=>{let t=`plyr--${v()}`;return e.classList.add(t),()=>e.classList.remove(t)}),o(()=>{let{$provider:n}=t,r=n()?.type,i=`plyr--${ue(r)?`html5`:r}`;return e.classList.toggle(i,!!r),()=>e.classList.remove(i)})),()=>x.empty()}function ue(e){return e===`audio`||e===`video`}var de=class extends B{async loadIcons(){let e=(await import(`./vidstack-Cfd9285A.js`)).icons,t={};for(let n of Object.keys(e))t[n]=z({name:n,paths:e[n],viewBox:`0 0 18 18`});return t}};function K(e,t){return e()?.[t]??t}function fe(){return ge()}function pe(){let e=v(),{load:t}=e.$props,{canLoad:r}=e.$state;return n(()=>t()===`play`&&!r())()?[q(),J()]:[me(),he(),J(),_e(),Me(),Ne()]}function q(){let e=v(),{translations:t}=U(),{title:n}=e.$state;return _`
    <media-play-button
      class="plyr__control plyr__control--overlaid"
      aria-label=${R(()=>`${K(t,`Play`)}, ${n()}`)}
      data-plyr="play"
    >
      <slot name="play-icon"></slot>
    </button>
  `}function me(){let{controls:e}=U();return R(()=>e().includes(`play-large`)?q():null)}function he(){let{thumbnails:e,previewTime:t}=U();return _`
    <media-thumbnail
      .src=${R(e)}
      class="plyr__preview-scrubbing"
      time=${R(()=>t())}
    ></media-thumbnail>
  `}function J(){let{poster:e}=v().$state;return _`<div class="plyr__poster" style=${R(()=>`background-image: url("${e()}");`)}></div>`}function ge(){let e=new Set([`captions`,`pip`,`airplay`,`fullscreen`]),{controls:t}=U();return _`<div class="plyr__controls">${R(()=>t().filter(t=>!e.has(t)).map(Y))}</div>`}function _e(){let{controls:e}=U();return _`<div class="plyr__controls">${R(()=>e().map(Y))}</div>`}function Y(e){switch(e){case`airplay`:return ve();case`captions`:return ye();case`current-time`:return Ae();case`download`:return je();case`duration`:return X();case`fast-forward`:return Ee();case`fullscreen`:return be();case`mute`:case`volume`:case`mute+volume`:return Oe(e);case`pip`:return Se();case`play`:return Ce();case`progress`:return De();case`restart`:return we();case`rewind`:return Te();case`settings`:return Pe();default:return null}}function ve(){let{translations:e}=U();return _`
    <media-airplay-button class="plyr__controls__item plyr__control" data-plyr="airplay">
      <slot name="airplay-icon"></slot>
      <span class="plyr__tooltip">${$(e,`AirPlay`)}</span>
    </media-airplay-button>
  `}function ye(){let{translations:e}=U();return _`
    <media-caption-button
      class="plyr__controls__item plyr__control"
      data-no-label
      data-plyr="captions"
    >
      <slot name="captions-on-icon" data-class="icon--pressed"></slot>
      <slot name="captions-off-icon" data-class="icon--not-pressed"></slot>
      <span class="label--pressed plyr__tooltip">${$(e,`Disable captions`)}</span>
      <span class="label--not-pressed plyr__tooltip">${$(e,`Enable captions`)}</span>
    </media-caption-button>
  `}function be(){let{translations:e}=U(),t=$(e,`Enter Fullscreen`);return _`
    <media-fullscreen-button
      class="plyr__controls__item plyr__control"
      data-no-label
      data-plyr="fullscreen"
    >
      <slot name="enter-fullscreen-icon" data-class="icon--pressed"></slot>
      <slot name="exit-fullscreen-icon" data-class="icon--not-pressed"></slot>
      <span class="label--pressed plyr__tooltip">${$(e,`Exit Fullscreen`)}</span>
      <span class="label--not-pressed plyr__tooltip">${t}</span>
    </media-fullscreen-button>
  `}function xe(){let{translations:e}=U(),t=$(e,`Mute`);return _`
    <media-mute-button class="plyr__control" data-no-label data-plyr="mute">
      <slot name="muted-icon" data-class="icon--pressed"></slot>
      <slot name="volume-icon" data-class="icon--not-pressed"></slot>
      <span class="label--pressed plyr__tooltip">${$(e,`Unmute`)}</span>
      <span class="label--not-pressed plyr__tooltip">${t}</span>
    </media-mute-button>
  `}function Se(){let{translations:e}=U(),t=$(e,`Enter PiP`);return _`
    <media-pip-button class="plyr__controls__item plyr__control" data-no-label data-plyr="pip">
      <slot name="pip-icon"></slot>
      <slot name="enter-pip-icon" data-class="icon--pressed"></slot>
      <slot name="exit-pip-icon" data-class="icon--not-pressed"></slot>
      <span class="label--pressed plyr__tooltip">${$(e,`Exit PiP`)}</span>
      <span class="label--not-pressed plyr__tooltip">${t}</span>
    </media-pip-button>
  `}function Ce(){let{translations:e}=U(),t=$(e,`Play`);return _`
    <media-play-button class="plyr__controls__item plyr__control" data-no-label data-plyr="play">
      <slot name="pause-icon" data-class="icon--pressed"></slot>
      <slot name="play-icon" data-class="icon--not-pressed"></slot>
      <span class="label--pressed plyr__tooltip">${$(e,`Pause`)}</span>
      <span class="label--not-pressed plyr__tooltip">${t}</span>
    </media-play-button>
  `}function we(){let{translations:e}=U(),{remote:t}=v(),n=$(e,`Restart`);function r(e){c(e)&&!s(e)||t.seek(0,e)}return _`
    <button
      type="button"
      class="plyr__control"
      data-plyr="restart"
      @pointerup=${r}
      @keydown=${r}
    >
      <slot name="restart-icon"></slot>
      <span class="plyr__tooltip">${n}</span>
    </button>
  `}function Te(){let{translations:e,seekTime:t}=U(),n=R(()=>`${K(e,`Rewind`)} ${t()}s`);return _`
    <media-seek-button
      class="plyr__controls__item plyr__control"
      seconds=${R(()=>-1*t())}
      data-no-label
      data-plyr="rewind"
    >
      <slot name="rewind-icon"></slot>
      <span class="plyr__tooltip">${n}</span>
    </media-seek-button>
  `}function Ee(){let{translations:e,seekTime:t}=U(),n=R(()=>`${K(e,`Forward`)} ${t()}s`);return _`
    <media-seek-button
      class="plyr__controls__item plyr__control"
      seconds=${R(t)}
      data-no-label
      data-plyr="fast-forward"
    >
      <slot name="fast-forward-icon"></slot>
      <span class="plyr__tooltip">${n}</span>
    </media-seek-button>
  `}function De(){let{duration:e,viewType:t}=v().$state,{translations:n,markers:r,thumbnails:i,seekTime:a,previewTime:o}=U(),s=$(n,`Seek`),c=h(null),l=R(()=>{let e=c();return e?_`<span class="plyr__progress__marker-label">${d(e.label)}<br /></span>`:null});function u(e){o.set(e.detail)}function f(){c.set(this)}function p(){c.set(null)}function m(){let e=i(),n=R(()=>t()===`audio`);return e?_`
          <media-slider-preview class="plyr__slider__preview" ?no-clamp=${n}>
            <media-slider-thumbnail .src=${e} class="plyr__slider__preview__thumbnail">
              <span class="plyr__slider__preview__time-container">
                ${l}
                <media-slider-value class="plyr__slider__preview__time"></media-slider-value>
              </span>
            </media-slider-thumbnail>
          </media-slider-preview>
        `:_`
          <span class="plyr__tooltip">
            ${l}
            <media-slider-value></media-slider-value>
          </span>
        `}function g(){let t=e();return Number.isFinite(t)?r()?.map(e=>_`
        <span
          class="plyr__progress__marker"
          @mouseenter=${f.bind(e)}
          @mouseleave=${p}
          style=${`left: ${e.time/t*100}%;`}
        ></span>
      `):null}return _`
    <div class="plyr__controls__item plyr__progress__container">
      <div class="plyr__progress">
        <media-time-slider
          class="plyr__slider"
          data-plyr="seek"
          pause-while-dragging
          key-step=${R(a)}
          aria-label=${s}
          @media-seeking-request=${u}
        >
          <div class="plyr__slider__track"></div>
          <div class="plyr__slider__thumb"></div>
          <div class="plyr__slider__buffer"></div>
          ${R(m)}${R(g)}
        </media-time-slider>
      </div>
    </div>
  `}function Oe(e){return R(()=>{let t=e===`mute`||e===`mute+volume`,n=e===`volume`||e===`mute+volume`;return _`
      <div class="plyr__controls__item plyr__volume">
        ${[t?xe():null,n?ke():null]}
      </div>
    `})}function ke(){let{translations:e}=U();return _`
    <media-volume-slider class="plyr__slider" data-plyr="volume" aria-label=${$(e,`Volume`)}>
      <div class="plyr__slider__track"></div>
      <div class="plyr__slider__thumb"></div>
    </media-volume-slider>
  `}function Ae(){let e=v(),{translations:t,invertTime:n,toggleTime:r,displayDuration:i}=U(),a=h(p(n));function o(e){!r()||i()||c(e)&&!s(e)||a.set(e=>!e)}function l(){return R(()=>i()?X():null)}return R(()=>{let{streamType:n}=e.$state,r=$(t,`LIVE`),s=$(t,`Current time`),c=R(()=>!i()&&a());return n()===`live`||n()===`ll-live`?_`
          <media-live-button
            class="plyr__controls__item plyr__control plyr__live-button"
            data-plyr="live"
          >
            <span class="plyr__live-button__text">${r}</span>
          </media-live-button>
        `:_`
          <media-time
            type="current"
            class="plyr__controls__item plyr__time plyr__time--current"
            tabindex="0"
            role="timer"
            aria-label=${s}
            ?remainder=${c}
            @pointerup=${o}
            @keydown=${o}
          ></media-time>
          ${l()}
        `})}function X(){let{translations:e}=U();return _`
    <media-time
      type="duration"
      class="plyr__controls__item plyr__time plyr__time--duration"
      role="timer"
      tabindex="0"
      aria-label=${$(e,`Duration`)}
    ></media-time>
  `}function je(){return R(()=>{let e=v(),{translations:t,download:n}=U(),{title:r,source:i}=e.$state,a=i(),o=n(),s=b({title:r(),src:a,download:o}),c=$(t,`Download`);return l(s?.url)?_`
          <a
            class="plyr__controls__item plyr__control"
            href=${y(s.url,{download:s.name})}
            download=${s.name}
            target="_blank"
          >
            <slot name="download-icon" />
            <span class="plyr__tooltip">${c}</span>
          </a>
        `:null})}function Me(){return R(()=>{let{clickToPlay:e,clickToFullscreen:t}=U();return[e()?_`
            <media-gesture
              class="plyr__gesture"
              event="pointerup"
              action="toggle:paused"
            ></media-gesture>
          `:null,t()?_`
            <media-gesture
              class="plyr__gesture"
              event="dblpointerup"
              action="toggle:fullscreen"
            ></media-gesture>
          `:null]})}function Ne(){let e=v(),t=h(void 0),n=R(()=>d(t()?.text));return o(()=>{let n=e.$state.textTrack();if(!n)return;function r(){t.set(n?.activeCues[0])}return r(),u(n,`cue-change`,r)}),_`
    <div class="plyr__captions" dir="auto">
      <span class="plyr__caption">${n}</span>
    </div>
  `}function Pe(){let{translations:e}=U();return _`
    <div class="plyr__controls__item plyr__menu">
      <media-menu>
        <media-menu-button class="plyr__control" data-plyr="settings">
          <slot name="settings-icon" />
          <span class="plyr__tooltip">${$(e,`Settings`)}</span>
        </media-menu-button>
        <media-menu-items class="plyr__menu__container" placement="top end">
          <div><div>${[Q(),ze(),Ve(),Le()]}</div></div>
        </media-menu-items>
      </media-menu>
    </div>
  `}function Z({label:e,children:t}){let n=h(!1);return _`
    <media-menu @open=${()=>n.set(!0)} @close=${()=>n.set(!1)}>
      ${Fe({label:e,open:n})}
      <media-menu-items>${t}</media-menu-items>
    </media-menu>
  `}function Fe({open:e,label:t}){let{translations:n}=U(),r=R(()=>`plyr__control plyr__control--${e()?`back`:`forward`}`);function i(){let t=$(n,`Go back to previous menu`);return R(()=>e()?_`<span class="plyr__sr-only">${t}</span>`:null)}return _`
    <media-menu-button class=${r} data-plyr="settings">
      <span class="plyr__menu__label" aria-hidden=${Ue(e)}>
        ${$(n,t)}
      </span>
      <span class="plyr__menu__value" data-part="hint"></span>
      ${i()}
    </media-menu-button>
  `}function Q(){return Z({label:`Audio`,children:Ie()})}function Ie(){let{translations:e}=U();return _`
    <media-audio-radio-group empty-label=${$(e,`Default`)}>
      <template>
        <media-radio class="plyr__control" data-plyr="audio">
          <span data-part="label"></span>
        </media-radio>
      </template>
    </media-audio-radio-group>
  `}function Le(){return Z({label:`Speed`,children:Re()})}function Re(){let{translations:e,speed:t}=U();return _`
    <media-speed-radio-group .rates=${t} normal-label=${$(e,`Normal`)}>
      <template>
        <media-radio class="plyr__control" data-plyr="speed">
          <span data-part="label"></span>
        </media-radio>
      </template>
    </media-speed-radio-group>
  `}function ze(){return Z({label:`Captions`,children:Be()})}function Be(){let{translations:e}=U();return _`
    <media-captions-radio-group off-label=${$(e,`Disabled`)}>
      <template>
        <media-radio class="plyr__control" data-plyr="captions">
          <span data-part="label"></span>
        </media-radio>
      </template>
    </media-captions-radio-group>
  `}function Ve(){return Z({label:`Quality`,children:He()})}function He(){let{translations:e}=U();return _`
    <media-quality-radio-group auto-label=${$(e,`Auto`)}>
      <template>
        <media-radio class="plyr__control" data-plyr="quality">
          <span data-part="label"></span>
        </media-radio>
      </template>
    </media-quality-radio-group>
  `}function Ue(e){return R(()=>e()?`true`:`false`)}function $(e,t){return R(()=>K(e,t))}a(class extends t(x,G){static tagName=`media-plyr-layout`;#e;onSetup(){this.forwardKeepAlive=!1,this.#e=v()}onConnect(){this.#e.player.el?.setAttribute(`data-layout`,`plyr`),f(()=>this.#e.player.el?.removeAttribute(`data-layout`)),le(this,this.#e),o(()=>{this.$props.customIcons()?new V([this]).connect():new de([this]).connect()})}render(){return R(this.#t.bind(this))}#t(){let{viewType:e}=this.#e.$state;return e()===`audio`?fe():e()===`video`?pe():null}}),a(L),a(T),a(se),a(w),a(ce),a(te),a(O),a(S),a(ne),a(I),a(F),a(k),a(A),a(j),a(ie),a(re),a(oe),a(ae),a(C),a(ee),a(M),a(E),a(D),a(P),a(N);