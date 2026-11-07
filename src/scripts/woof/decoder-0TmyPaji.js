var e=!1,t=0,n=0,r=1,i=new Map,a=new Set,o=[],s=(e,t)=>{t.handle=window.setTimeout(()=>{i.delete(e),t.fn()},Math.max(0,t.due-c()))},c=()=>e?n:performance.now()-t,l=()=>e;function u(t,n){let a=r++,o={due:c()+Math.max(0,n),fn:t,handle:0};return i.set(a,o),e||s(a,o),a}function d(e){if(!e)return;let t=i.get(e);t&&(window.clearTimeout(t.handle),i.delete(e))}var f=()=>e?new Promise(e=>o.push(e)):Promise.resolve();function p(e){return a.add(e),()=>void a.delete(e)}function m(r){r!==e&&(r?(n=c(),e=!0,i.forEach(e=>window.clearTimeout(e.handle))):(t=performance.now()-n,e=!1,i.forEach((e,t)=>s(t,e)),o.splice(0).forEach(e=>e())),a.forEach(t=>t(e)))}var h={now:c,later:u,cancel:d,isPaused:l,running:f,onPause:p,setPaused:m},g=()=>window.matchMedia(`(pointer: coarse)`).matches||new URLSearchParams(window.location.search).has(`mobilecoop`),_=/^(?:I|I'm|I'll|I've|I'd|Underdog|Darkcloud|Riverbark)$/,v=e=>e.replace(/(^|[.!?…]\s+)([A-Z])([\p{L}']*)(?=[.!?…,]*(?:\s|$))/gu,(e,t,n,r,i,a)=>{let o=a.slice(i+e.length),s=/^[.!?…,]*(?:\s+[A-Z"'(]|\s*$)/u.test(o),c=n+r;return!s||_.test(c)||r.length>0&&r===r.toUpperCase()?e:t+n.toLowerCase()+r}),y=.4,b=.09,x=1.2,S=.05,C=.5;function w(e){let t=g(),n=document.createElement(`textarea`);n.setAttribute(`aria-label`,`Type here, and Woof reads it aloud`),n.autocapitalize=`sentences`,n.spellcheck=!1,Object.assign(n.style,{position:`absolute`,left:`50%`,bottom:`0`,width:`1px`,height:`1px`,opacity:`0`,border:`0`,padding:`0`,resize:`none`,pointerEvents:`none`,caretColor:`transparent`}),e.host.appendChild(n);let r=null,i=!1,a=``,o=0,s=[],c=0,l=0,u=!1,d=new AbortController,f=new AbortController,p=[],m=[],_=0,w=()=>e.onStatus?.({typing:i,loading:i&&!r,reading:u}),T=null,E=()=>{let{ctx:t,bus:n}=e.audio();if(T?.bus!==n){let e=t.createGain();e.gain.value=C,e.connect(n),T={bus:n,level:e}}return{ctx:t,room:T.level}},D=t=>{let{ctx:n,room:r}=E();return e.onAir(n.currentTime+t,!1),{ctx:n,room:r}},O=null,k=e=>{if(O)return O;O=e.createBuffer(1,e.sampleRate*.5,e.sampleRate);let t=O.getChannelData(0);for(let e=0;e<t.length;e++)t[e]=Math.random()*2-1;return O},A=(e,t,n,r,i,a,o=2)=>{let s=e.createBufferSource();s.buffer=k(e);let c=e.createBiquadFilter();c.type=`bandpass`,c.frequency.value=r,c.Q.value=o;let l=e.createGain();l.gain.setValueAtTime(1e-4,n),l.gain.exponentialRampToValueAtTime(i,n+.002),l.gain.exponentialRampToValueAtTime(1e-4,n+a),s.connect(c).connect(l).connect(t),s.start(n,Math.random()*.4,a+.02)},j=(e,t,n,r,i,a)=>{let o=e.createOscillator();o.frequency.setValueAtTime(r,n),o.frequency.exponentialRampToValueAtTime(r*.4,n+a*.8);let s=e.createGain();s.gain.setValueAtTime(i,n),s.gain.exponentialRampToValueAtTime(1e-4,n+a),o.connect(s).connect(t),o.start(n),o.stop(n+a+.01)},M=(e=1,t=1)=>{let{ctx:n,room:r}=D(.15),i=n.currentTime;j(n,r,i,130*t,.32*e,.08),A(n,r,i,(1500+Math.random()*400)*t,.45*e,.035),A(n,r,i+.019,(1250+Math.random()*300)*t,.26*e,.03),A(n,r,i+.041,(1700+Math.random()*300)*t,.18*e,.025)},N=()=>{let{ctx:e,room:t}=D(.6),n=e.currentTime;j(e,t,n,95,.4,.1);let r=e.createBufferSource();r.buffer=k(e);let i=e.createBiquadFilter();i.type=`bandpass`,i.Q.value=2.5,i.frequency.setValueAtTime(700,n+.03),i.frequency.exponentialRampToValueAtTime(1900,n+.33);let a=e.createGain();a.gain.setValueAtTime(1e-4,n+.03),a.gain.exponentialRampToValueAtTime(.18,n+.08),a.gain.exponentialRampToValueAtTime(1e-4,n+.36),r.connect(i).connect(a).connect(t),r.start(n+.03,0,.36),j(e,t,n+.38,120,.3,.07),A(e,t,n+.38,1100,.3,.04)},P=null,F=e=>{if(!e){P?.stop(),P=null;return}if(P)return;let{ctx:t,room:n}=E(),r=t.currentTime,i=t.createGain();i.gain.setValueAtTime(1e-4,r),i.gain.exponentialRampToValueAtTime(S,r+.7),i.connect(n);let a=t.createOscillator();a.type=`sawtooth`,a.frequency.setValueAtTime(18,r),a.frequency.exponentialRampToValueAtTime(58,r+.7);let o=t.createBiquadFilter();o.type=`lowpass`,o.frequency.value=320,a.connect(o).connect(i);let s=t.createBufferSource();s.buffer=k(t),s.loop=!0;let c=t.createBiquadFilter();c.type=`bandpass`,c.frequency.value=950,c.Q.value=1.4;let l=t.createGain();l.gain.value=.35;let u=t.createOscillator();u.type=`square`,u.frequency.value=14;let d=t.createGain();d.gain.value=.25,u.connect(d).connect(l.gain),s.connect(c).connect(l).connect(i),a.start(r),s.start(r),u.start(r),P={stop:()=>{let e=t.currentTime;i.gain.cancelScheduledValues(e),i.gain.setValueAtTime(Math.max(1e-4,i.gain.value),e),i.gain.exponentialRampToValueAtTime(1e-4,e+.6),a.frequency.cancelScheduledValues(e),a.frequency.setValueAtTime(a.frequency.value,e),a.frequency.exponentialRampToValueAtTime(14,e+.6);for(let t of[a,s,u])t.stop(e+.65)}}},I=async()=>{if(u||!r||!s.length)return;u=!0,w();let n=r;for(;s.length&&!d.signal.aborted;){let r=s.shift(),i=f.signal,{ctx:a,voice:o,narrator:c,evil:u,hurt:g,glitch:y,possessed:b}=e.audio(),x=r.possessed?b:r.glitch?y:r.hurt?g:r.evil?u:r.narrated?c:o;_=Math.max(_,a.currentTime+(t?1:.05));let S=!r.narrated||r.caption===null,C=r.evil?`evil`:`narrator`;if(r.pause)_=Math.max(_,a.currentTime)+r.pause;else if(r.bleep)S||m.push(h.later(()=>!i.aborted&&(l=r.line??0,e.onCaption?.(r.caption??r.text,C)),Math.max(0,(_-a.currentTime)*1e3))),e.bleep?.(_,r.bleep),_+=r.bleep,e.onAir(_);else try{await n.speak(v(r.text),(o,s)=>{if(i.aborted)return;let c=a.createBuffer(1,o.length,n.rate);c.copyToChannel(o,0);let u=a.createBufferSource();u.buffer=c,u.connect(x);let d=_<a.currentTime;d&&t&&console.info(`/escape: the voice ran dry ${(a.currentTime-_).toFixed(2)} s`),_=Math.max(_,a.currentTime+(d&&t?.4:.02)),u.start(_),S||(S=!0,m.push(h.later(()=>!i.aborted&&(l=r.line??0,e.onCaption?.(r.caption??r.text,C)),Math.max(0,(_-a.currentTime)*1e3)))),p.push(u),u.onended=()=>p=p.filter(e=>e!==u),e.onVoice?.({at:_,rate:n.rate,length:o.length,inside:s}),_+=c.duration,e.onAir(_);let f=r.end,g=R;f>=0&&m.push(h.later(()=>g===R&&e.typewriter()?.setSpoken(f),Math.max(0,(_-a.currentTime)*1e3)))},AbortSignal.any([d.signal,i]),async e=>{for(;!i.aborted&&!d.signal.aborted&&_-a.currentTime>e;)await new Promise(e=>h.later(e,20));return _-a.currentTime},r.evil?`evil`:r.narrated?`narrator`:`typist`)}catch(e){!d.signal.aborted&&!i.aborted&&console.error(`/escape: the voice failed`,e)}if(!i.aborted){let t=Math.max(0,(_-e.audio().ctx.currentTime)*1e3),n=e.onTyped,a=r.narrated?r.done:n?()=>n(r.text):void 0;a&&m.push(h.later(()=>!i.aborted&&a(),t)),r.narrated&&s[0]?.line!==r.line&&m.push(h.later(()=>!i.aborted&&l===r.line&&e.onCaption?.(null,C),t+400))}}u=!1,w()},L=t=>{let n=a.slice(o),r=/[^\n]*\n/g,i,c=0;for(;(i=r.exec(n))&&i[0];)c=i.index+i[0].length;if(t&&(c=n.length),!c)return;let l=n.slice(0,c);o+=c,/[\p{L}\p{N}]/u.test(l)&&e.onSent?.();let u=l.split(`
`);u.forEach((t,n)=>{let r=t.trim();if(!/[\p{L}\p{N}]/u.test(r))return;let i=n<u.length-1&&!/[.!?…]["')\]]*$/.test(r)?`${r}.`:r;s.push({text:i,end:o,evil:e.typedVoice?.()===`evil`})}),I()},R=0,z=!1,B=()=>{W&&n.value.length>a.length&&n.value.startsWith(a)&&n.value.slice(a.length).includes(`
`)&&(n.value=a+n.value.slice(a.length).replace(/\n/g,``));let t=n.value,r=e.typewriter();if(z&&t.length>a.length)M();else if(t.startsWith(a)&&t.length>a.length){let e=t.slice(a.length);for(let t of e.slice(-12))r?.strike(t),t===`
`?N():M(t===` `?.6:1)}else t.length<a.length&&(M(.5,.8),o=Math.min(o,t.length));a=t,t.length,r?.setText(a),e.onText?.(a),L(!1)};n.addEventListener(`input`,B);let V=()=>{f.abort(),f=new AbortController,s.length=0;for(let e of p)try{e.stop()}catch{}p=[],m.forEach(h.cancel),m=[],_=0,e.onCaption?.(null,`narrator`)},H=(t,n={})=>{let r={end:-1,narrated:!0,evil:n.evil||n.hurt||n.glitch,hurt:n.hurt,glitch:n.glitch,possessed:n.possessed},i=t=>{if(!e.censor)return[{text:t}];let n=[],r=0;for(let i of t.matchAll(new RegExp(e.censor.source,`gi`)))n.push({text:t.slice(r,i.index)},{text:i[0],bleep:Math.min(x,y+b*Math.max(0,i[0].length-4))}),r=(i.index??0)+i[0].length;return n.push({text:t.slice(r)}),n.map(e=>({...e,text:e.text.trim().replace(/^[^\p{L}\p{N}]+/u,``)})).filter(e=>e.bleep||/[\p{L}\p{N}]/u.test(e.text))},a=t.split(`
`).map(e=>e.trim()).filter(e=>/[\p{L}\p{N}]/u.test(e)).flatMap(e=>{let t=++c,n=/\s*\{(\d+(?:\.\d+)?)\}$/.exec(e),a=n?e.slice(0,n.index):e,o=i(a).map((e,n)=>({...r,...e,line:t,caption:n===0?a:null}));return n&&o.push({...r,text:``,line:t,caption:null,pause:Number(n[1])}),o});a.length&&(a[a.length-1]={...a[a.length-1],done:n.done}),n.next?s.unshift(...a):s.push(...a),I()},U=!1,W=!1,G=t=>{W&&t.key===`Enter`&&t.preventDefault(),!U||t.metaKey||t.ctrlKey||t.key.length!==1&&t.key!==`Enter`&&t.key!==`Backspace`||e.onLockedKey?.(),t.key===`Escape`&&(t.preventDefault(),K()),t.stopPropagation()};n.addEventListener(`keydown`,G);let K=()=>{i&&(i=!1,n.blur(),F(!1),e.onActive?.(!1),w())},q=e=>{!i||document.activeElement===n||e.metaKey||e.ctrlKey||e.altKey||e.target?.closest?.(`input, textarea, select, [contenteditable]`)||(e.key.length===1||e.key===`Enter`||e.key===`Backspace`||e.key===`Escape`)&&(n.focus({preventScroll:!0}),n.selectionStart=n.selectionEnd=n.value.length)};window.addEventListener(`keydown`,q,!0);let J=e=>!!e?.closest?.(`input, textarea, select, button, a, [contenteditable], .lil-gui`),ee=e=>{i&&document.activeElement===n&&!J(e.target)&&e.preventDefault()},Y=e=>{i&&document.activeElement!==n&&!J(e.target)&&n.focus({preventScroll:!0})};window.addEventListener(`mousedown`,ee,!0),window.addEventListener(`click`,Y,!0);let X=typeof window.matchMedia==`function`&&window.matchMedia(`(pointer: coarse)`).matches,Z=!1,Q=0,te=()=>{i&&X&&K()};n.addEventListener(`blur`,()=>{i&&X&&(h.cancel(Q),Q=h.later(()=>document.activeElement!==n&&te(),300))});let $=window.visualViewport,ne=0,re=()=>{if(!$||!i||!X)return void(Z=!1);let e=window.innerHeight;Z&&Math.abs($.width-ne)>1&&(Z=!1),$.height<e*.8?(Z=!0,ne=$.width):Z&&$.height>e*.92&&(Z=!1,te())};return $?.addEventListener(`resize`,re),{focus:()=>{i=!0,F(!0),n.focus({preventScroll:!0}),n.selectionStart=n.selectionEnd=n.value.length,e.onActive?.(!0),w()},blur:K,setVoice:e=>{r=e,w(),I()},active:()=>i,say:H,interrupt:()=>V(),submit:()=>{U||W||!/[\p{L}\p{N}]/u.test(n.value.slice(n.value.lastIndexOf(`
`)+1))||(n.value+=`
`,B())},lock:e=>{U=e,n.readOnly=U},hush:e=>{W=e},locked:()=>U,reset:()=>{V(),n.value=``,a=``,o=0;let t=e.typewriter();t?.setText(``),t?.setSpoken(0)},clear:()=>{R++;for(let e=s.length-1;e>=0;e--)s[e].narrated||s.splice(e,1);n.value=``,a=``,o=0;let t=e.typewriter();t?.setText(``),t?.setSpoken(0),e.onText?.(``)},repeat:()=>{/[\p{L}\p{N}]/u.test(a)&&(V(),o=0,e.typewriter()?.setSpoken(0),L(!0))},fill:e=>{let t=n.value;n.value=t+(t&&!/\s$/.test(t)?` `:``)+e,n.selectionStart=n.selectionEnd=n.value.length,z=!0,B(),z=!1},dispose:()=>{d.abort(),F(!1),n.removeEventListener(`input`,B),n.removeEventListener(`keydown`,G),window.removeEventListener(`mousedown`,ee,!0),window.removeEventListener(`click`,Y,!0),$?.removeEventListener(`resize`,re),h.cancel(Q),window.removeEventListener(`keydown`,q,!0),n.remove()}}}function T(e){let t=new DataView(e),n=Number(t.getBigUint64(0,!0)),r=JSON.parse(new TextDecoder().decode(new Uint8Array(e,8,n))),i=8+n,a=new Map;for(let[t,n]of Object.entries(r))t!==`__metadata__`&&a.set(t,{dtype:n.dtype,shape:n.shape,bytes:new Uint8Array(e,i+n.data_offsets[0],n.data_offsets[1]-n.data_offsets[0])});return a}function E(e){let t=e&32768?-1:1,n=e>>10&31,r=e&1023;return n===0?t*2**-14*(r/1024):n===31?r?NaN:t*(1/0):t*2**(n-15)*(1+r/1024)}function D(e){let t=e.shape.reduce((e,t)=>e*t,1),n=new Float32Array(t),r=new DataView(e.bytes.buffer,e.bytes.byteOffset,e.bytes.byteLength);if(e.dtype===`F32`)for(let e=0;e<t;e++)n[e]=r.getFloat32(e*4,!0);else if(e.dtype===`F16`)for(let e=0;e<t;e++)n[e]=E(r.getUint16(e*2,!0));else if(e.dtype===`I8`)for(let e=0;e<t;e++)n[e]=r.getInt8(e);else throw Error(`woof: no ${e.dtype}`);return n}var O=class{constructor(e){this.pipelines=new Map,this.owned=[],this.device=e}f32(e,t=``){let n=typeof e==`number`?e:e.length,r=this.device.createBuffer({label:t,size:Math.max(16,Math.ceil(n*4/16)*16),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,mappedAtCreation:typeof e!=`number`});return typeof e!=`number`&&(new Float32Array(r.getMappedRange()).set(e),r.unmap()),this.owned.push(r),r}bytes(e,t=``){let n=this.device.createBuffer({label:t,size:Math.max(16,Math.ceil(e.length/16)*16),usage:GPUBufferUsage.STORAGE,mappedAtCreation:!0});return new Uint8Array(n.getMappedRange()).set(e),n.unmap(),this.owned.push(n),n}uniforms(e,t=``){let n=this.device.createBuffer({label:t,size:Math.max(16,Math.ceil(e.length*4/16)*16),usage:GPUBufferUsage.UNIFORM,mappedAtCreation:!0});return new Uint32Array(n.getMappedRange()).set(e),n.unmap(),this.owned.push(n),n}static f(e){return new Uint32Array(new Float32Array([e]).buffer)[0]}pipeline(e,t){let n=this.pipelines.get(e);if(!n){let r=this.device.createShaderModule({code:e,label:t});n=this.device.createComputePipeline({layout:`auto`,compute:{module:r,entryPoint:`main`},label:t}),this.pipelines.set(e,n)}return n}async precompile(e,t){await Promise.all(e.map(async e=>{if(!this.pipelines.has(e)){let t=this.device.createShaderModule({code:e}),n=await this.device.createComputePipelineAsync({layout:`auto`,compute:{module:t,entryPoint:`main`}});this.pipelines.has(e)||this.pipelines.set(e,n)}t?.()}))}op(e,t,n,r){let i=this.pipeline(t,e),a=n.map((t,n)=>({binding:n,resource:{buffer:Array.isArray(t)?this.uniforms(t,e):t}})),o=this.device.createBindGroup({layout:i.getBindGroupLayout(0),entries:a,label:e}),[s,c=1,l=1]=r;if(s>65535||c>65535||l>65535)throw Error(`woof: ${e}: ${s}x${c}x${l} workgroups is too many`);return{pipeline:i,bind:o,groups:[s,c,l],label:e}}encode(e,t){let n=e.beginComputePass();for(let e of t)n.setPipeline(e.pipeline),n.setBindGroup(0,e.bind),n.dispatchWorkgroups(...e.groups);n.end()}run(e){let t=this.device.createCommandEncoder();this.encode(t,e),this.device.queue.submit([t.finish()])}async read(e,t,n=0){let r=Math.ceil(t*4/4)*4,i=this.device.createBuffer({size:r,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),a=this.device.createCommandEncoder();a.copyBufferToBuffer(e,n*4,i,0,r),this.device.queue.submit([a.finish()]),await i.mapAsync(GPUMapMode.READ);let o=new Float32Array(i.getMappedRange().slice(0));return i.unmap(),i.destroy(),o}write(e,t,n=0){this.device.queue.writeBuffer(e,n*4,t.buffer,t.byteOffset,t.byteLength)}destroy(){for(let e of this.owned)e.destroy();this.owned=[]}},k=class{constructor(e,t){this.gpu=e,this.tensors=t,this.onGpu=new Map}upload(e){if(this.onGpu.has(e))return 0;let t=this.get(e);return this.onGpu.set(e,t.dtype===`I8`?this.gpu.bytes(t.bytes,e):this.gpu.f32(D(t),e)),t.bytes.length}stored(e){return this.upload(e),this.onGpu.get(e)}has(e){return this.tensors.has(e)||this.tensors.has(`${e}.q`)}get(e){let t=this.tensors.get(e);if(!t)throw Error(`woof: no weight ${e}`);return t}floats(e){if(this.tensors.has(e))return D(this.get(e));let t=D(this.get(`${e}.q`)),n=D(this.get(`${e}.s`)),r=this.get(`${e}.q`).shape[0],i=t.length/r,a=n.length/r,o=i/a;for(let e=0;e<r;e++)for(let r=0;r<i;r++)t[e*i+r]*=n[e*a+Math.floor(r/o)];return t}shape(e){return(this.tensors.get(e)??this.get(`${e}.q`)).shape}f32(e){let t=this.tensors.get(e);return t&&t.dtype!==`I8`?this.stored(e):this.gpu.f32(this.floats(e),e)}q8(e){let t=this.get(`${e}.q`),n=this.get(`${e}.s`),r=t.shape[0],i=t.bytes.length/r,a=n.shape[1];if(i%4)throw Error(`woof: ${e}'s rows aren't whole u32s`);return{q:this.stored(`${e}.q`),s:this.stored(`${e}.s`),rows:r,cols:i,group:i/a,shape:t.shape}}},A=`
struct P { rows: u32, cols: u32, group: u32, xStride: u32, xOff: u32, yStride: u32, yOff: u32, flags: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> w: array<u32>;
@group(0) @binding(2) var<storage, read> s: array<f32>;
@group(0) @binding(3) var<storage, read> x: array<f32>;
@group(0) @binding(4) var<storage, read_write> y: array<f32>;
@group(0) @binding(5) var<storage, read> bias: array<f32>;

fn i8x4(u: u32) -> vec4<f32> {
  return vec4<f32>(vec4<i32>(bitcast<i32>(u << 24u), bitcast<i32>(u << 16u), bitcast<i32>(u << 8u), bitcast<i32>(u)) >> vec4<u32>(24u));
}
var<workgroup> part: array<f32, 64>;
@compute @workgroup_size(64)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let r = wg.x + wg.z * 65535u;
  let t = wg.y;
  if (r >= p.rows) { return; }
  let quads = p.cols / 4u;
  let groups = p.cols / p.group;
  let wrow = r * quads;
  let xrow = p.xOff + t * p.xStride;
  var acc = 0.0;
  for (var c4 = li; c4 < quads; c4 += 64u) {
    let c = c4 * 4u;
    let wv = i8x4(w[wrow + c4]) * s[r * groups + c / p.group];
    acc += dot(wv, vec4<f32>(x[xrow + c], x[xrow + c + 1u], x[xrow + c + 2u], x[xrow + c + 3u]));
  }
  part[li] = acc;
  workgroupBarrier();
  for (var k = 32u; k > 0u; k >>= 1u) {
    if (li < k) { part[li] += part[li + k]; }
    workgroupBarrier();
  }
  if (li == 0u) {
    var v = part[0];
    if ((p.flags & 1u) != 0u) { v += bias[r]; }
    let at = p.yOff + t * p.yStride + r;
    if ((p.flags & 2u) != 0u) { v += y[at]; }
    y[at] = v;
  }
}`;function j(e,t,n,r,i={}){let a=i.T??1,o=+!!i.bias|(i.accumulate?2:0),s=i.bias??t.s,c=Math.min(t.rows,65535),l=Math.ceil(t.rows/65535);return e.op(i.label??`linear`,A,[[t.rows,t.cols,t.group,i.xStride??t.cols,i.xOff??0,i.yStride??t.rows,i.yOff??0,o],t.q,t.s,n,r,s],[c,a,l])}var M=384,N=6,P=64,F=1536,I=1920,L=`
fn flat(wg: vec3<u32>, li: u32) -> u32 { return (wg.y * 65535u + wg.x) * 256u + li; }`,R=e=>{let t=Math.ceil(e/256);return[Math.min(t,65535),Math.ceil(t/65535)]},z=(e,t)=>e?`
@group(0) @binding(${t}) var<storage, read> wq: array<u32>;
@group(0) @binding(${t+1}) var<storage, read> ws: array<f32>;
fn W(row: u32, col: u32) -> f32 {
  let i = row * p.cols + col;
  let sh = (i & 3u) * 8u;
  let v = f32(bitcast<i32>(wq[i >> 2u] << (24u - sh)) >> 24u);
  return v * ws[row * (p.cols / p.group) + col / p.group];
}`:`
@group(0) @binding(${t}) var<storage, read> wf: array<f32>;
fn W(row: u32, col: u32) -> f32 { return wf[row * p.cols + col]; }`,B=`
fn elu(x: f32) -> f32 { return select(exp(x) - 1.0, x, x > 0.0); }`,V=e=>`
struct P { cin: u32, cout: u32, k: u32, t: u32, cols: u32, group: u32, flags: u32, _p: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> x: array<f32>;
@group(0) @binding(2) var<storage, read_write> y: array<f32>;
@group(0) @binding(3) var<storage, read> bias: array<f32>;
${z(e,4)}
${L}
${B}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= p.cout * p.t) { return; }
  let o = idx / p.t;
  let t = idx % p.t;
  var acc = 0.0;
  for (var i = 0u; i < p.cin; i++) {
    for (var j = 0u; j < p.k; j++) {
      if (t + j + 1u < p.k) { continue; }
      var v = x[i * p.t + t + j + 1u - p.k];
      if ((p.flags & 2u) != 0u) { v = elu(v); }
      acc += W(o, i * p.k + j) * v;
    }
  }
  if ((p.flags & 1u) != 0u) { acc += bias[o]; }
  if ((p.flags & 4u) != 0u) { acc += y[idx]; }
  y[idx] = acc;
}`,H=e=>`
struct P { cin: u32, cout: u32, k: u32, s: u32, tin: u32, cols: u32, group: u32, inPer: u32, outPer: u32, flags: u32, _a: u32, _b: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> x: array<f32>;
@group(0) @binding(2) var<storage, read_write> y: array<f32>;
@group(0) @binding(3) var<storage, read> bias: array<f32>;
${z(e,4)}
${L}
${B}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let tout = p.tin * p.s;
  let idx = flat(wg, li);
  if (idx >= p.cout * tout) { return; }
  let o = idx / tout;
  let t = idx % tout;
  let g = o / p.outPer;
  let ol = o % p.outPer;
  var acc = 0.0;
  var n = i32(t / p.s);
  loop {
    if (n < 0) { break; }
    let j = t - u32(n) * p.s;
    if (j >= p.k) { break; }
    if (u32(n) < p.tin) {
      for (var ii = 0u; ii < p.inPer; ii++) {
        let i = g * p.inPer + ii;
        var v = x[i * p.tin + u32(n)];
        if ((p.flags & 2u) != 0u) { v = elu(v); }
        acc += W(i, ol * p.k + j) * v;
      }
    }
    n -= 1;
  }
  if ((p.flags & 1u) != 0u) { acc += bias[o]; }
  y[idx] = acc;
}`,U=`
struct P { t: u32, _a: u32, _b: u32, _c: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> lat: array<f32>;
@group(0) @binding(2) var<storage, read_write> y: array<f32>;
@group(0) @binding(3) var<storage, read> mean: array<f32>;
@group(0) @binding(4) var<storage, read> spread: array<f32>;
${L}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= 32u * p.t) { return; }
  let c = idx / p.t;
  let t = idx % p.t;
  y[idx] = lat[t * 32u + c] * spread[c] + mean[c];
}`,W=`
struct P { r: u32, c: u32, _a: u32, _b: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> x: array<f32>;
@group(0) @binding(2) var<storage, read_write> y: array<f32>;
${L}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= p.r * p.c) { return; }
  let r = idx / p.c;
  let c = idx % p.c;
  y[c * p.r + r] = x[idx];
}`,G=`
@group(0) @binding(0) var<storage, read> x: array<f32>;
@group(0) @binding(1) var<storage, read_write> y: array<f32>;
@group(0) @binding(2) var<storage, read> w: array<f32>;
@group(0) @binding(3) var<storage, read> b: array<f32>;
var<workgroup> part: array<f32, 64>;
fn total(li: u32, v: f32) -> f32 {
  part[li] = v;
  workgroupBarrier();
  for (var k = 32u; k > 0u; k >>= 1u) {
    if (li < k) { part[li] += part[li + k]; }
    workgroupBarrier();
  }
  let s = part[0];
  workgroupBarrier();
  return s;
}
@compute @workgroup_size(64)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let row = wg.x * ${M}u;
  var s = 0.0;
  for (var c = li; c < ${M}u; c += 64u) { s += x[row + c]; }
  let mean = total(li, s) / ${M}.0;
  var v = 0.0;
  for (var c = li; c < ${M}u; c += 64u) { let d = x[row + c] - mean; v += d * d; }
  let inv = inverseSqrt(total(li, v) / ${M}.0 + 1e-5);
  for (var c = li; c < ${M}u; c += 64u) { y[row + c] = (x[row + c] - mean) * inv * w[c] + b[c]; }
}`,K=`
struct P { t: u32, _a: u32, _b: u32, _c: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read_write> q: array<f32>;
@group(0) @binding(2) var<storage, read_write> k: array<f32>;
@group(0) @binding(3) var<storage, read> cs: array<f32>;
${L}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= p.t * ${N}u * 32u) { return; }
  let t = idx / (${N}u * 32u);
  let h = (idx / 32u) % ${N}u;
  let d = idx % 32u;
  let c = cs[(t * 32u + d) * 2u];
  let s = cs[(t * 32u + d) * 2u + 1u];
  let at = t * ${M}u + h * ${P}u + d;
  let q1 = q[at]; let q2 = q[at + 32u];
  q[at] = q1 * c - q2 * s;
  q[at + 32u] = q2 * c + q1 * s;
  let k1 = k[at]; let k2 = k[at + 32u];
  k[at] = k1 * c - k2 * s;
  k[at + 32u] = k2 * c + k1 * s;
}`,q=1024,J=250,ee=`
@group(0) @binding(0) var<storage, read> q: array<f32>;
@group(0) @binding(1) var<storage, read> k: array<f32>;
@group(0) @binding(2) var<storage, read> v: array<f32>;
@group(0) @binding(3) var<storage, read_write> y: array<f32>;
var<workgroup> qv: array<f32, 64>;
var<workgroup> sc: array<f32, ${q}>;
var<workgroup> part: array<f32, 64>;
@compute @workgroup_size(64)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let qi = wg.x;
  let off = wg.y * ${P}u;
  qv[li] = q[qi * ${M}u + off + li];
  workgroupBarrier();
  var m = -1e30;
  for (var j = li; j <= qi; j += 64u) {
    var s = 0.0;
    for (var d = 0u; d < ${P}u; d++) { s += qv[d] * k[j * ${M}u + off + d]; }
    s *= 0.125;
    sc[j] = s;
    m = max(m, s);
  }
  part[li] = m;
  workgroupBarrier();
  for (var r = 32u; r > 0u; r >>= 1u) {
    if (li < r) { part[li] = max(part[li], part[li + r]); }
    workgroupBarrier();
  }
  let top = part[0];
  workgroupBarrier();
  var sum = 0.0;
  for (var j = li; j <= qi; j += 64u) { let e = exp(sc[j] - top); sc[j] = e; sum += e; }
  part[li] = sum;
  workgroupBarrier();
  for (var r = 32u; r > 0u; r >>= 1u) {
    if (li < r) { part[li] += part[li + r]; }
    workgroupBarrier();
  }
  let total = part[0];
  var acc = 0.0;
  for (var j = 0u; j <= qi; j++) { acc += sc[j] * v[j * ${M}u + off + li]; }
  y[qi * ${M}u + off + li] = acc / total;
}`,Y=`
struct P { n: u32, _a: u32, _b: u32, _c: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read_write> x: array<f32>;
@group(0) @binding(2) var<storage, read> y: array<f32>;
@group(0) @binding(3) var<storage, read> scale: array<f32>;
${L}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= p.n) { return; }
  x[idx] += scale[idx % ${M}u] * y[idx];
}`,X=`
struct P { n: u32, _a: u32, _b: u32, _c: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read_write> x: array<f32>;
${L}
fn erfc_(x: f32) -> f32 {
  let z = abs(x);
  let t = 1.0 / (1.0 + 0.5 * z);
  let r = t * exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return select(2.0 - r, r, x >= 0.0);
}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= p.n) { return; }
  let v = x[idx];
  x[idx] = 0.5 * v * (2.0 - erfc_(v * 0.70710678118654752));
}`,Z=e=>`
struct P { cin: u32, cout: u32, k: u32, t0: u32, n: u32, cols: u32, group: u32, flags: u32, rin: u32, rout: u32, _a: u32, _b: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> x: array<f32>;
@group(0) @binding(2) var<storage, read_write> y: array<f32>;
@group(0) @binding(3) var<storage, read> bias: array<f32>;
${z(e,4)}
${L}
${B}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= p.cout * p.n) { return; }
  let o = idx / p.n;
  let t = p.t0 + idx % p.n;
  var acc = 0.0;
  for (var i = 0u; i < p.cin; i++) {
    for (var j = 0u; j < p.k; j++) {
      if (t + j + 1u < p.k) { continue; }
      var v = x[i * p.rin + (t + j + 1u - p.k) % p.rin];
      if ((p.flags & 2u) != 0u) { v = elu(v); }
      acc += W(o, i * p.k + j) * v;
    }
  }
  if ((p.flags & 1u) != 0u) { acc += bias[o]; }
  let at = select(o * p.n + (t - p.t0), o * p.rout + t % p.rout, p.rout != 0u);
  if ((p.flags & 4u) != 0u) { acc += y[at]; }
  y[at] = acc;
}`,Q=e=>`
struct P { cin: u32, cout: u32, k: u32, s: u32, t0: u32, n: u32, cols: u32, group: u32, inPer: u32, outPer: u32, flags: u32, rin: u32, rout: u32, _a: u32, _b: u32, _c: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> x: array<f32>;
@group(0) @binding(2) var<storage, read_write> y: array<f32>;
@group(0) @binding(3) var<storage, read> bias: array<f32>;
${z(e,4)}
${L}
${B}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= p.cout * p.n) { return; }
  let o = idx / p.n;
  let t = p.t0 + idx % p.n;
  let g = o / p.outPer;
  let ol = o % p.outPer;
  var acc = 0.0;
  var n = i32(t / p.s);
  loop {
    if (n < 0) { break; }
    let j = t - u32(n) * p.s;
    if (j >= p.k) { break; }
    for (var ii = 0u; ii < p.inPer; ii++) {
      let i = g * p.inPer + ii;
      var v = x[i * p.rin + u32(n) % p.rin];
      if ((p.flags & 2u) != 0u) { v = elu(v); }
      acc += W(i, ol * p.k + j) * v;
    }
    n -= 1;
  }
  if ((p.flags & 1u) != 0u) { acc += bias[o]; }
  y[o * p.rout + t % p.rout] = acc;
}`,te=`
struct P { t0: u32, n: u32, rout: u32, _a: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> lat: array<f32>;
@group(0) @binding(2) var<storage, read_write> y: array<f32>;
@group(0) @binding(3) var<storage, read> mean: array<f32>;
@group(0) @binding(4) var<storage, read> spread: array<f32>;
${L}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= 32u * p.n) { return; }
  let c = idx / p.n;
  let r = idx % p.n;
  y[c * p.rout + (p.t0 + r) % p.rout] = lat[r * 32u + c] * spread[c] + mean[c];
}`,$=`
struct P { t0: u32, n: u32, ring: u32, _a: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> x: array<f32>;
@group(0) @binding(2) var<storage, read_write> y: array<f32>;
${L}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= ${M}u * p.n) { return; }
  let r = idx / ${M}u;
  let c = idx % ${M}u;
  y[idx] = x[c * p.ring + (p.t0 + r) % p.ring];
}`,ne=`
struct P { t0: u32, n: u32, ring: u32, _a: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> x: array<f32>;
@group(0) @binding(2) var<storage, read_write> y: array<f32>;
${L}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= ${M}u * p.n) { return; }
  let r = idx / ${M}u;
  let c = idx % ${M}u;
  y[c * p.ring + (p.t0 + r) % p.ring] = x[idx];
}`,re=`
struct P { t0: u32, n: u32, ring: u32, c: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> x: array<f32>;
@group(0) @binding(2) var<storage, read_write> y: array<f32>;
${L}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= p.c * p.n) { return; }
  let at = (idx / p.n) * p.ring + (p.t0 + idx % p.n) % p.ring;
  y[at] = x[at];
}`,ie=`
struct P { t0: u32, n: u32, _a: u32, _b: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read_write> q: array<f32>;
@group(0) @binding(2) var<storage, read_write> k: array<f32>;
@group(0) @binding(3) var<storage, read> cs: array<f32>;
${L}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= p.n * ${N}u * 32u) { return; }
  let r = idx / (${N}u * 32u);
  let h = (idx / 32u) % ${N}u;
  let d = idx % 32u;
  let pos = p.t0 + r;
  let c = cs[(pos * 32u + d) * 2u];
  let s = cs[(pos * 32u + d) * 2u + 1u];
  let at = r * ${M}u + h * ${P}u + d;
  let q1 = q[at]; let q2 = q[at + 32u];
  q[at] = q1 * c - q2 * s;
  q[at + 32u] = q2 * c + q1 * s;
  let k1 = k[at]; let k2 = k[at + 32u];
  k[at] = k1 * c - k2 * s;
  k[at + 32u] = k2 * c + k1 * s;
}`,ae=`
struct P { t0: u32, n: u32, ring: u32, _a: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> k: array<f32>;
@group(0) @binding(2) var<storage, read> v: array<f32>;
@group(0) @binding(3) var<storage, read_write> kc: array<f32>;
@group(0) @binding(4) var<storage, read_write> vc: array<f32>;
${L}
@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let idx = flat(wg, li);
  if (idx >= p.n * ${M}u) { return; }
  let r = idx / ${M}u;
  let at = ((p.t0 + r) % p.ring) * ${M}u + idx % ${M}u;
  kc[at] = k[idx];
  vc[at] = v[idx];
}`,oe=`
struct P { t0: u32, ring: u32, reach: u32, _a: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> q: array<f32>;
@group(0) @binding(2) var<storage, read> kc: array<f32>;
@group(0) @binding(3) var<storage, read> vc: array<f32>;
@group(0) @binding(4) var<storage, read_write> y: array<f32>;
var<workgroup> qv: array<f32, 64>;
var<workgroup> sc: array<f32, ${J}>;
var<workgroup> part: array<f32, 64>;
@compute @workgroup_size(64)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let r = wg.x;
  let qi = p.t0 + r;
  let first = select(0u, qi + 1u - p.reach, qi + 1u > p.reach);
  let count = qi + 1u - first;
  let off = wg.y * ${P}u;
  qv[li] = q[r * ${M}u + off + li];
  workgroupBarrier();
  var m = -1e30;
  for (var j = li; j < count; j += 64u) {
    let row = ((first + j) % p.ring) * ${M}u + off;
    var s = 0.0;
    for (var d = 0u; d < ${P}u; d++) { s += qv[d] * kc[row + d]; }
    s *= 0.125;
    sc[j] = s;
    m = max(m, s);
  }
  part[li] = m;
  workgroupBarrier();
  for (var k = 32u; k > 0u; k >>= 1u) {
    if (li < k) { part[li] = max(part[li], part[li + k]); }
    workgroupBarrier();
  }
  let top = part[0];
  workgroupBarrier();
  var sum = 0.0;
  for (var j = li; j < count; j += 64u) { let e = exp(sc[j] - top); sc[j] = e; sum += e; }
  part[li] = sum;
  workgroupBarrier();
  for (var k = 32u; k > 0u; k >>= 1u) {
    if (li < k) { part[li] += part[li + k]; }
    workgroupBarrier();
  }
  let total = part[0];
  var acc = 0.0;
  for (var j = 0u; j < count; j++) { acc += sc[j] * vc[((first + j) % p.ring) * ${M}u + off + li]; }
  y[r * ${M}u + off + li] = acc / total;
}`,se=[{name:`dec.seanet0`,what:`the first conv, out of the transformer`,channels:512,perFrame:2},{name:`dec.seanet3`,what:`residual block 1, after the first ×8 upsample`,channels:256,perFrame:16},{name:`dec.seanet6`,what:`residual block 2, after ×6`,channels:128,perFrame:96},{name:`dec.seanet9`,what:`residual block 3, after ×5`,channels:64,perFrame:480},{name:`dec.seanet12`,what:`residual block 4, after ×4: the last layer, summed into the voice`,channels:32,perFrame:1920}],ce=[V(!0),V(!1),H(!0),H(!1),U,W,G,K,ee,Y,X,Z(!0),Z(!1),Q(!0),Q(!1),te,re,$,ne,ie,ae,oe];function le(e,t){let n=e.device,r=e=>{if(t.tensors.has(`${e}.q`))return{q8:t.q8(e)};let n=t.shape(e);return{f32:t.f32(e),cols:n.slice(1).reduce((e,t)=>e*t,1)}},i=t.f32(`latent_mean`),a=t.f32(`latent_std`),o={w:r(`dec.inp.weight`),b:t.f32(`dec.inp.bias`)},s=r(`dec.upsample.conv.weight`),c=[0,1].map(e=>{let n=`dec.tf.layers.${e}`;return{ln1:[t.f32(`${n}.input_layernorm.weight`),t.f32(`${n}.input_layernorm.bias`)],ln2:[t.f32(`${n}.post_attention_layernorm.weight`),t.f32(`${n}.post_attention_layernorm.bias`)],q:t.q8(`${n}.self_attn.q_proj.weight`),k:t.q8(`${n}.self_attn.k_proj.weight`),v:t.q8(`${n}.self_attn.v_proj.weight`),o:t.q8(`${n}.self_attn.o_proj.weight`),fc1:t.q8(`${n}.mlp.fc1.weight`),fc2:t.q8(`${n}.mlp.fc2.weight`),s1:t.f32(`${n}.self_attn_layer_scale.scale`),s2:t.f32(`${n}.mlp_layer_scale.scale`)}}),l=(e,n=``)=>({w:r(`dec.seanet.layers.${e}${n}.conv.weight`),b:t.f32(`dec.seanet.layers.${e}${n}.conv.bias`)}),u=l(0),d=[{t:l(2),r1:l(3,`.block.1`),r2:l(3,`.block.3`),cin:512,s:8},{t:l(5),r1:l(6,`.block.1`),r2:l(6,`.block.3`),cin:256,s:6},{t:l(8),r1:l(9,`.block.1`),r2:l(9,`.block.3`),cin:128,s:5},{t:l(11),r1:l(12,`.block.1`),r2:l(12,`.block.3`),cin:64,s:4}],f=l(14),p=e.f32(16,`zeros`),m=0,h={},g=new Map,_=t=>{if(t<=m)return;for(let e of Object.values(h))e.destroy();g.clear(),m=Math.max(t,Math.ceil(m*1.5),16);let r=(e,t)=>n.createBuffer({label:t,size:e*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),i=m*2;h={lat:r(m*32,`dec.lat`),inp:r(m*32,`dec.in`),a:r(m*30720,`dec.a`),b:r(m*61440,`dec.b`),h:r(m*30720,`dec.h`),ta:r(i*M,`dec.ta`),tb:r(i*M,`dec.tb`),q:r(i*M,`dec.q`),k:r(i*M,`dec.k`),v:r(i*M,`dec.v`),att:r(i*M,`dec.att`),ff:r(i*F,`dec.ff`),rope:r(i*64,`dec.rope`)};let a=Math.fround,o=new Float32Array(i*64);for(let e=0;e<32;e++){let t=a(1/a(1e4**a(2*e/64)));for(let n=0;n<i;n++){let r=a(a(n)*t);o[(n*32+e)*2]=Math.cos(r),o[(n*32+e)*2+1]=Math.sin(r)}}e.write(h.rope,o)},v=(t,n,r,i,a,o,s,c,l,u)=>{let d=`q8`in n,f=d?n.q8.cols:n.cols,m=d?n.q8.group:1,h=d?[n.q8.q,n.q8.s]:[n.f32];return e.op(t,V(d),[[o,s,c,l,f,m,u|+!!r,0],i,a,r??p,...h],R(s*l))},y=(t,n,r,i,a,o,s,c,l,u,d,f)=>{let m=`q8`in n,h=m?n.q8.cols:n.cols,g=m?n.q8.group:1,_=m?[n.q8.q,n.q8.s]:[n.f32];return e.op(t,H(m),[[o,s,c,l,u,h,g,o/d,s/d,f|+!!r,0,0],i,a,r??p,..._],R(s*u*l))},b=t=>{let n=g.get(t);if(n)return n;let r=h,l=t*2,p=[];p.push({name:`dec.in`,ops:[e.op(`dec.prep`,U,[[t,0,0,0],r.lat,r.inp,i,a],R(32*t))],out:{buf:r.inp,n:32*t}}),p.push({name:`dec.inp`,ops:[v(`dec.inp`,o.w,o.b,r.inp,r.a,32,M,1,t,0)],out:{buf:r.a,n:M*t}}),p.push({name:`dec.upsample`,ops:[y(`dec.upsample`,s,null,r.a,r.b,M,M,4,2,t,M,0)],out:{buf:r.b,n:M*l}}),p.push({name:`dec.tfin`,ops:[e.op(`dec.toTokens`,W,[[M,l,0,0],r.b,r.ta],R(M*l))]}),c.forEach((t,n)=>{let i=(t,r,i)=>j(e,t,r,i,{T:l,label:`dec.tf${n}.linear`}),a=[e.op(`dec.tf${n}.ln1`,G,[r.ta,r.tb,t.ln1[0],t.ln1[1]],[l]),i(t.q,r.tb,r.q),i(t.k,r.tb,r.k),i(t.v,r.tb,r.v),e.op(`dec.tf${n}.rope`,K,[[l,0,0,0],r.q,r.k,r.rope],R(l*N*32)),e.op(`dec.tf${n}.attention`,ee,[r.q,r.k,r.v,r.att],[l,N]),i(t.o,r.att,r.tb),e.op(`dec.tf${n}.res1`,Y,[[l*M,0,0,0],r.ta,r.tb,t.s1],R(l*M)),e.op(`dec.tf${n}.ln2`,G,[r.ta,r.tb,t.ln2[0],t.ln2[1]],[l]),i(t.fc1,r.tb,r.ff),e.op(`dec.tf${n}.gelu`,X,[[l*F,0,0,0],r.ff],R(l*F)),i(t.fc2,r.ff,r.tb),e.op(`dec.tf${n}.res2`,Y,[[l*M,0,0,0],r.ta,r.tb,t.s2],R(l*M))];p.push({name:`dec.tf${n}`,ops:a,out:{buf:r.ta,n:l*M}})}),p.push({name:`dec.tfout`,ops:[e.op(`dec.toChannels`,W,[[l,M,0,0],r.ta,r.a],R(M*l))]}),p.push({name:`dec.seanet0`,ops:[v(`dec.seanet0`,u.w,u.b,r.a,r.b,M,512,7,l,0)],out:{buf:r.b,n:512*l}});let m=r.b,_=r.a,b=l,x=1;for(let e of d){let t=e.cin/2;p.push({name:`dec.seanet${x+1}`,ops:[y(`dec.seanet${x+1}`,e.t.w,e.t.b,m,_,e.cin,t,e.s*2,e.s,b,1,2)],out:{buf:_,n:t*b*e.s}}),b*=e.s,p.push({name:`dec.seanet${x+2}`,ops:[v(`dec.seanet${x+2}.1`,e.r1.w,e.r1.b,_,r.h,t,t/2,3,b,2),v(`dec.seanet${x+2}.3`,e.r2.w,e.r2.b,r.h,_,t/2,t,1,b,6)],out:{buf:_,n:t*b}}),[m,_]=[_,m],x+=3}return p.push({name:`dec.seanet14`,ops:[v(`dec.seanet14`,f.w,f.b,m,_,32,1,3,b,2)],out:{buf:_,n:b}}),g.set(t,p),p},x=(t,n)=>{if(n<1)throw Error(`woof: nothing to decode`);if(n*2>q)throw Error(`woof: ${n} frames is more than the decoder takes at once (${q/2})`);return _(n),e.write(h.lat,t.subarray(0,n*32)),b(n)},S=e=>12*e,C=[],w=(()=>{let t=(e,t)=>{let r=n.createBuffer({label:t,size:Math.max(16,e*4),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST});return C.push(r),r},r=t(q*64,`dec.s.rope`),i=Math.fround,a=new Float32Array(q*64);for(let e=0;e<32;e++){let t=i(1/i(1e4**i(2*e/64)));for(let n=0;n<q;n++){let r=i(i(n)*t);a[(n*32+e)*2]=Math.cos(r),a[(n*32+e)*2+1]=Math.sin(r)}}e.write(r,a);let o=2;return{lat:t(256,`dec.s.lat`),inp:t(32*S(1),`dec.s.inp`),a0:t(M*S(1),`dec.s.a0`),up:t(M*S(2),`dec.s.up`),ta:t(16*M,`dec.s.ta`),tb:t(16*M,`dec.s.tb`),q:t(16*M,`dec.s.q`),k:t(16*M,`dec.s.k`),v:t(16*M,`dec.s.v`),att:t(16*M,`dec.s.att`),ff:t(16*F,`dec.s.ff`),caches:c.map((e,n)=>({k:t(266*M,`dec.s.k${n}`),v:t(266*M,`dec.s.v${n}`)})),tf:t(M*S(2),`dec.s.tf`),s0:t(512*S(2),`dec.s.s0`),ups:d.map((e,n)=>{o*=e.s;let r=e.cin/2;return{per:o,pre:t(r*S(o),`dec.s.u${n}.pre`),out:t(r*S(o),`dec.s.u${n}`),h:t(r/2*S(o),`dec.s.h${n}`)}}),pcm:t(8*I,`dec.s.pcm`),rope:r}})(),T=new Map,E=t=>{let r=T.get(t);if(r)return r;let l=[],m=[],h=(e,t)=>{let r=e(0).length,i=n.createBuffer({label:t,size:Math.max(16,Math.ceil(r*4/16)*16),usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});return C.push(i),m.push({buf:i,values:e}),i},g=e=>{let t=`q8`in e;return{q8:t,cols:t?e.q8.cols:e.cols,group:t?e.q8.group:1,wb:t?[e.q8.q,e.q8.s]:[e.f32]}},_=(n,r,i,a,o,s,c,u,d,f,m,_)=>{let v=g(r),y=h(e=>[s,c,u,e*d,t*d,v.cols,v.group,f|+!!i,m,_,0,0],n);l.push(e.op(n,Z(v.q8),[y,a,o,i??p,...v.wb],R(c*t*d)))},v=(n,r,i,a,o,s,c,u,d,f,m,_,v,y)=>{let b=g(r),x=h(e=>[s,c,u,d,e*f*d,t*f*d,b.cols,b.group,s/m,c/m,_|+!!i,v,y,0,0,0],n);l.push(e.op(n,Q(b.q8),[x,a,o,i??p,...b.wb],R(c*t*f*d)))},y=2*t;l.push(e.op(`dec.s.prep`,te,[h(e=>[e,t,S(1),0],`dec.s.prep`),w.lat,w.inp,i,a],R(32*t))),_(`dec.s.inp`,o.w,o.b,w.inp,w.a0,32,M,1,1,0,S(1),S(1)),v(`dec.s.upsample`,s,null,w.a0,w.up,M,M,4,2,1,M,0,S(1),S(2)),l.push(e.op(`dec.s.toRows`,$,[h(e=>[2*e,y,S(2),0],`dec.s.toRows`),w.up,w.ta],R(M*y))),c.forEach((t,n)=>{let r=(t,r,i)=>j(e,t,r,i,{T:y,label:`dec.s.tf${n}.linear`}),i=w.caches[n];l.push(e.op(`dec.s.tf${n}.ln1`,G,[w.ta,w.tb,t.ln1[0],t.ln1[1]],[y]),r(t.q,w.tb,w.q),r(t.k,w.tb,w.k),r(t.v,w.tb,w.v),e.op(`dec.s.tf${n}.rope`,ie,[h(e=>[2*e,y,0,0],`dec.s.rope`),w.q,w.k,w.rope],R(y*N*32)),e.op(`dec.s.tf${n}.cache`,ae,[h(e=>[2*e,y,266,0],`dec.s.cache`),w.k,w.v,i.k,i.v],R(y*M)),e.op(`dec.s.tf${n}.attention`,oe,[h(e=>[2*e,266,J,0],`dec.s.attention`),w.q,i.k,i.v,w.att],[y,N]),r(t.o,w.att,w.tb),e.op(`dec.s.tf${n}.res1`,Y,[[y*M,0,0,0],w.ta,w.tb,t.s1],R(y*M)),e.op(`dec.s.tf${n}.ln2`,G,[w.ta,w.tb,t.ln2[0],t.ln2[1]],[y]),r(t.fc1,w.tb,w.ff),e.op(`dec.s.tf${n}.gelu`,X,[[y*F,0,0,0],w.ff],R(y*F)),r(t.fc2,w.ff,w.tb),e.op(`dec.s.tf${n}.res2`,Y,[[y*M,0,0,0],w.ta,w.tb,t.s2],R(y*M)))}),l.push(e.op(`dec.s.toRing`,ne,[h(e=>[2*e,y,S(2),0],`dec.s.toRing`),w.ta,w.tf],R(M*y))),_(`dec.s.seanet0`,u.w,u.b,w.tf,w.s0,M,512,7,2,0,S(2),S(2));let b=w.s0,x=2;d.forEach((n,r)=>{let i=n.cin/2,a=w.ups[r];v(`dec.s.seanet${3*r+2}`,n.t.w,n.t.b,b,a.pre,n.cin,i,n.s*2,n.s,x,1,2,S(x),S(a.per)),x=a.per;let o=x;_(`dec.s.seanet${3*r+3}.1`,n.r1.w,n.r1.b,a.pre,a.h,i,i/2,3,x,2,S(x),S(x)),l.push(e.op(`dec.s.seanet${3*r+3}.copy`,re,[h(e=>[e*o,t*o,S(o),i],`dec.s.copy`),a.pre,a.out],R(i*t*x))),_(`dec.s.seanet${3*r+3}.3`,n.r2.w,n.r2.b,a.h,a.out,i/2,i,1,x,6,S(x),S(x)),b=a.out}),_(`dec.s.seanet14`,f.w,f.b,b,w.pcm,32,1,3,x,2,S(x),0);let E={ops:l,moving:m};return T.set(t,E),E},D=0,O=async(t,r)=>{if((D+r)*2>q)throw Error(`woof: more than ${q/2} frames in one sentence`);let{ops:i,moving:a}=E(r);e.write(w.lat,t.subarray(0,r*32));for(let e of a)n.queue.writeBuffer(e.buf,0,new Uint32Array(e.values(D)));return e.run(i),D+=r,(await e.read(w.pcm,r*I)).map(e=>Math.min(1,Math.max(-1,e)))},k=e=>e.map(e=>e>0?e:Math.expm1(e)),A=null,P={w:t.floats(`dec.seanet.layers.14.conv.weight`),b:t.floats(`dec.seanet.layers.14.conv.bias`)[0]};return{decode:async(t,n,r=0)=>{let i=x(t,n);e.run(i.flatMap(e=>e.ops));let a=i[i.length-1].out;return(await e.read(a.buf,n*I-r,r)).map(e=>Math.min(1,Math.max(-1,e)))},decodeInside:async(t,n,r=`dec.seanet12`)=>{let i=x(t,n),a=i.findIndex(e=>e.name===r&&e.out),o=se.find(e=>e.name===r);if(a<0||!o)throw Error(`woof: no layer ${r} to read`);let s=i[a].out;(!A||A.size<s.n*4)&&(A?.destroy(),A=e.device.createBuffer({label:`dec.tap`,size:Math.ceil(s.n*4/16)*16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}));let c=e.device.createCommandEncoder();e.encode(c,i.slice(0,a+1).flatMap(e=>e.ops)),c.copyBufferToBuffer(s.buf,0,A,0,s.n*4),e.encode(c,i.slice(a+1).flatMap(e=>e.ops)),e.device.queue.submit([c.finish()]);let l=i[i.length-1].out,[u,d]=await Promise.all([e.read(l.buf,n*I),e.read(A,s.n)]);return{pcm:u.map(e=>Math.min(1,Math.max(-1,e))),inside:d,channels:o.channels,rate:o.perFrame*12.5}},stream:{reset:()=>void(D=0),push:async(e,t)=>{let n=new Float32Array(t*I);for(let r=0;r<t;r+=8){let i=Math.min(8,t-r);n.set(await O(e.subarray(r*32,(r+i)*32),i),r*I)}return n}},finalConv:()=>({w:P.w,b:P.b,channels:32,k:3}),trace:async(t,n)=>{let r=x(t,n),i=new Map;for(let t of r){if(e.run(t.ops),!t.out)continue;let n=await e.read(t.out.buf,t.out.n);i.set(t.name,n);let r=/^dec\.seanet(\d+)$/.exec(t.name);r&&[0,3,6,9,12].includes(+r[1])&&i.set(`dec.seanet${+r[1]+1}`,k(n))}return i},destroy:()=>{for(let e of Object.values(h))e.destroy();for(let e of C)e.destroy();C.length=0,T.clear(),A?.destroy(),A=null,h={},g.clear(),m=0}}}export{A as a,T as c,w as d,h as f,O as i,D as l,se as n,k as o,le as r,j as s,ce as t,g as u};