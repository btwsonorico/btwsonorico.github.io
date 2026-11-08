// La lamina olografica dei biglietti: una raggiera di raggi arcobaleno (o di metallo) che parte da un centro;
// il centro scivola e i raggi girano quando il biglietto si inclina. Graffi sottili si accendono vicino alla luce.
// La lamina si stampa sopra la carta solo dove la maschera lo dice: la banda, il filo, il sigillo, le linee guilloché,
// il poster del retro. Le scritte dentro la lamina sono incise: tagliate via, si vede la carta sotto.
// Un solo contesto WebGL per tutta la pagina, fuori dallo schermo; ogni faccia copia il risultato sulla sua tela 2D.

export type Tinta = 'iride' | 'argento' | 'oro';
export type Pezzo = 'banda' | 'filo' | 'sigillo' | 'guilloche' | 'poster' | 'simboli';
export type Piano = { pezzi: Pezzo[]; tinta: Tinta; testo?: string; numero?: string };

const VS = 'attribute vec2 a; varying vec2 vUv; void main(){ vUv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }';
const FS = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes; uniform vec2 uTilt; uniform vec2 uCentro; uniform float uDpr; uniform float uTinta;
uniform vec3 uSigillo; uniform sampler2D uMaschera; uniform sampler2D uGraffi;
// Un ventaglio: argento, salmone, arancio, giallo, verde, verde acqua, blu, viola, buio, rosso, argento
vec3 tavolozza(float t) {
  t = fract(t);
  vec3 c = vec3(.74, .71, .69);
  c = mix(c, vec3(1.0, .63, .55), smoothstep(.00, .13, t));
  c = mix(c, vec3(1.0, .52, .10), smoothstep(.13, .21, t));
  c = mix(c, vec3(1.0, .93, .22), smoothstep(.21, .28, t));
  c = mix(c, vec3(.42, .98, .30), smoothstep(.28, .36, t));
  c = mix(c, vec3(.06, .86, .72), smoothstep(.36, .44, t));
  c = mix(c, vec3(.10, .48, 1.0), smoothstep(.44, .53, t));
  c = mix(c, vec3(.45, .16, 1.0), smoothstep(.53, .63, t));
  c = mix(c, vec3(.09, .03, .20), smoothstep(.63, .72, t));
  c = mix(c, vec3(.92, .06, .12), smoothstep(.72, .79, t));
  c = mix(c, vec3(.74, .71, .69), smoothstep(.79, 1.0, t));
  return c;
}
// Il metallo: la stessa raggiera diventa una luce spazzolata che gira, argento freddo o oro caldo
vec3 metallo(float t, float oro) {
  float l = 0.5 + 0.32 * cos(6.2831853 * t) + 0.18 * cos(12.566 * t + 1.0);
  vec3 scuro = mix(vec3(.40, .43, .48), vec3(.47, .32, .08), oro), chiaro = mix(vec3(.97, .98, 1.0), vec3(1.0, .91, .62), oro);
  return mix(mix(scuro, chiaro, clamp(l, 0.0, 1.0)), tavolozza(t), 0.07);
}
void main() {
  vec2 px = vUv * uRes, asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = px / uRes.y, c = uCentro * asp;
  float ventagli = 1.0;
  // Dentro il sigillo la raggiera ha il suo centro, e più ventagli
  if (uSigillo.z > 0.0 && distance(px, uSigillo.xy) < uSigillo.z) { c = (uSigillo.xy - uTilt * vec2(-1.0, 1.0) * uSigillo.z * 0.35) / uRes.y; ventagli = 2.0; }
  vec2 d = p - c;
  float r = length(d), ang = atan(d.y, d.x), fi = uTilt.x * 1.7 + uTilt.y * 1.0 + 0.4;
  float t = (ang - fi) / 3.14159265 * ventagli + 0.035 * log(r + 0.02);
  vec3 col = uTinta < 0.5 ? tavolozza(t) : metallo(t, uTinta > 1.5 ? 1.0 : 0.0);
  col *= 0.94 + 0.14 * exp(-r * 3.5);
  // I graffi: righe chiare del colore della lamina, accese vicino alla luce e quando sono di traverso
  vec4 g = texture2D(uGraffi, px / (900.0 * uDpr));
  vec2 dir = vec2(g.r * 2.0 - 1.0, g.g), L = vec2(cos(fi), sin(fi));
  vec2 luce = asp * (vec2(0.5) + uTilt * vec2(-0.45, 0.45));
  float vicino = exp(-pow(length(p - luce) * 1.6, 2.0));
  float allineo = pow(abs(dot(normalize(dir + 1e-4), vec2(-L.y, L.x))), 3.0);
  col = mix(col, min(vec3(1.0), col * 0.6 + vec3(.55, .78, .95)), g.a * g.b * (0.15 + 0.85 * vicino * (0.35 + 0.65 * allineo)));
  // Il riflesso bianco-azzurro quando l'inclinazione è forte
  col = mix(col, vec3(.88, .97, 1.0), exp(-pow((p.y - c.y) * 7.0, 2.0)) * smoothstep(0.55, 1.0, length(uTilt)) * 0.6);
  float m = texture2D(uMaschera, vUv).a;
  float m2 = texture2D(uMaschera, vUv + uTilt * 1.6 * uDpr / uRes).a;
  col += (m - m2) * 0.5;
  gl_FragColor = vec4(col * m, m);
}`;

// I graffi: righe corte a mucchi. Nel colore la direzione (r, g) e la forza (b); l'alfa è la copertura
function graffi() {
  const k = document.createElement('canvas'); k.width = k.height = 1024;
  const g = k.getContext('2d')!; g.lineCap = 'round';
  let s = 91; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const mucchi = Array.from({ length: 16 }, () => [r() * 1024, r() * 1024, 140 + r() * 220, r() * Math.PI] as const);
  for (let i = 0; i < 3000; i++) {
    let x: number, y: number, th: number;
    if (r() < 0.7) { const m = mucchi[Math.floor(r() * mucchi.length)]!; x = m[0] + (r() - 0.5) * m[2]; y = m[1] + (r() - 0.5) * m[2]; th = m[3] + (r() - 0.5) * 1.1; }
    else { x = r() * 1024; y = r() * 1024; th = r() * Math.PI; }
    th = ((th % Math.PI) + Math.PI) % Math.PI;
    const L = r() < 0.2 ? 1.5 : 4 + r() ** 2 * 50, cx = Math.cos(th), sy = Math.sin(th);
    g.strokeStyle = `rgb(${Math.round((cx * 0.5 + 0.5) * 255)},${Math.round(sy * 255)},${Math.round((0.35 + r() * 0.65) * 255)})`;
    g.lineWidth = r() < 0.85 ? 0.9 : 1.6;
    for (const [ox, oy] of [[0, 0], [1024, 0], [-1024, 0], [0, 1024], [0, -1024]] as const) {
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + cx * L, y + oy + sy * L); g.stroke();
    }
  }
  return k;
}

// --- Il motore condiviso
type Motore = { tela: HTMLCanvasElement; gl: WebGLRenderingContext; U: (n: string) => WebGLUniformLocation | null; texMaschere: WeakMap<HTMLCanvasElement, WebGLTexture> };
let motore: Motore | null | undefined;
function prendiMotore(): Motore | null {
  if (motore !== undefined) return motore;
  const tela = document.createElement('canvas');
  const gl = tela.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return (motore = null);
  const sh = (t: number, src: string) => { const o = gl.createShader(t)!; gl.shaderSource(o, src); gl.compileShader(o); return o; };
  const pr = gl.createProgram()!; gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return (motore = null);
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(pr, n);
  const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, graffi());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.uniform1i(U('uGraffi'), 1); gl.uniform1i(U('uMaschera'), 0);
  return (motore = { tela, gl, U, texMaschere: new WeakMap() });
}
function caricaMaschera(m: Motore, maschera: HTMLCanvasElement) {
  const { gl } = m;
  let t = m.texMaschere.get(maschera);
  if (!t) { t = gl.createTexture()!; m.texMaschere.set(maschera, t); }
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maschera);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

// --- Le misure di una parte della faccia, in pixel CSS, senza le trasformazioni 3D (offset, non getBoundingClientRect)
type Rett = { x: number; y: number; w: number; h: number };
function misura(el: HTMLElement | null, faccia: HTMLElement): Rett | null {
  if (!el || !el.offsetWidth) return null;
  let x = 0, y = 0, e: HTMLElement | null = el;
  while (e && e !== faccia) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent as HTMLElement | null; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
// Un testo con spaziatura fissa fra le lettere, centrato su (0, 0)
function testoSpaziato(g: CanvasRenderingContext2D, testo: string, spazio: number) {
  const larg = [...testo].map(ch => g.measureText(ch).width), tot = larg.reduce((a, b) => a + b, 0) + spazio * (testo.length - 1);
  let x = -tot / 2;
  [...testo].forEach((ch, i) => { g.fillText(ch, x, 0); x += larg[i]! + spazio; });
}
const stella = (g: CanvasRenderingContext2D, x: number, y: number, R: number, r: number) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fill(); };
const aereo = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s); g.beginPath();
  for (const [a, b] of [[10, 0], [2, 2], [-3, 9], [-5, 9], [-2, 2], [-8, 2.5], [-10, 5], [-11, 5], [-10, 0], [-11, -5], [-10, -5], [-8, -2.5], [-2, -2], [-5, -9], [-3, -9], [2, -2]] as const) g.lineTo(a, b);
  g.closePath(); g.fill(); g.restore();
};

// Disegna la maschera di un piano sulla faccia. Restituisce il sigillo (centro e raggio in pixel CSS), se c'è
function disegnaMaschera(g: CanvasRenderingContext2D, faccia: HTMLElement, piano: Piano, W: number, H: number): [number, number, number] | null {
  const q = (s: string) => misura(faccia.querySelector<HTMLElement>(s), faccia);
  const taglia = (f: () => void) => { g.save(); g.globalCompositeOperation = 'destination-out'; f(); g.restore(); };
  const mono = 'ui-monospace, Menlo, Consolas, monospace', display = getComputedStyle(faccia).getPropertyValue('--display').trim() || 'Impact, sans-serif';
  let sigillo: [number, number, number] | null = null;
  g.fillStyle = g.strokeStyle = '#fff';
  for (const pezzo of piano.pezzi) {
    if (pezzo === 'banda') {
      const b = q('.banda'), span = faccia.querySelector<HTMLElement>('.banda span');
      if (!b) continue;
      g.fillRect(b.x, b.y, b.w, b.h);
      // Il motto inciso nella lamina, nello stesso verso del testo stampato
      const testo = (span?.textContent ?? '').toUpperCase(), cs = span ? getComputedStyle(span) : null, fs = parseFloat(cs?.fontSize ?? '10') || 10;
      const sp = parseFloat(cs?.letterSpacing ?? '0') || fs * 0.4;
      taglia(() => { g.translate(b.x + b.w / 2, b.y + b.h / 2); if (b.h > b.w) g.rotate(-Math.PI / 2); g.font = `700 ${fs}px ${mono}`; g.textBaseline = 'middle'; testoSpaziato(g, testo, sp); });
    } else if (pezzo === 'filo') {
      // Il filo di sicurezza a finestre, sul bordo destro del corpo, con il micro testo inciso
      const c = q('.corpo'); if (!c) continue;
      const x = c.x + c.w - 12;
      for (let y = c.y + 8; y + 20 < c.y + c.h - 4; y += 30) {
        g.fillRect(x - 4, y, 8, 20);
        taglia(() => { g.translate(x, y + 10); g.rotate(-Math.PI / 2); g.font = `700 5.5px ${mono}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`AI·${piano.numero ?? ''}`, 0, 0); });
      }
    } else if (pezzo === 'sigillo') {
      // Il sigillo sul tagliando, fra i dati e il codice; se lo spazio manca (telefono), sulla striscia dell'arte
      const t = q('.tagliando'), md = q('.metadati'), cd = q('.coda'), ar = q('.arte70');
      let cx = 0, cy = 0, r = 0;
      if (t && md && cd && t.h > 150) { const su = md.y + md.h, giu = cd.y; cx = t.x + t.w / 2; cy = (su + giu) / 2; r = Math.min(38, (giu - su) / 2 - 6, t.w / 2 - 14); }
      if (r < 16 && ar) { r = Math.min(28, ar.h / 2 - 6); cx = ar.x + ar.w - r - 10; cy = ar.y + ar.h / 2; }
      if (r < 12) continue;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      taglia(() => {
        g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r - 4, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx, cy, r * 0.66, 0, Math.PI * 2); g.stroke();
        g.font = `700 ${Math.max(5, r * 0.16).toFixed(1)}px ${mono}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const giro = 'AI TERMS · BOARDING · AI TERMS · BOARDING · ', rr = (r - 4 + r * 0.66) / 2;
        [...giro].forEach((ch, i) => { const a = (i / giro.length) * Math.PI * 2; g.save(); g.translate(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore(); });
        aereo(g, cx, cy - r * 0.05, r / 34); stella(g, cx + r * 0.28, cy + r * 0.28, r * 0.14, r * 0.045);
      });
      sigillo = [cx, cy, r];
    } else if (pezzo === 'guilloche') {
      // Linee ondulate intrecciate sull'arte e sul corpo; si fermano intorno alle scritte
      g.lineWidth = 0.8;
      for (const zona of [q('.arte70'), q('.corpo')]) {
        if (!zona) continue;
        g.save(); g.beginPath(); g.rect(zona.x, zona.y, zona.w, zona.h); g.clip();
        for (let k = 0; k < 14; k++) {
          g.beginPath();
          for (let x = zona.x - 4; x <= zona.x + zona.w + 4; x += 2) {
            const u = x * 0.018 + k * 0.42, y = zona.y + zona.h * 0.5 + Math.sin(u) * zona.h * 0.34 * Math.sin(x * 0.004 + 1.2 + k * 0.05) + Math.sin(x * 0.07 + k) * 5;
            if (x === zona.x - 4) g.moveTo(x, y); else g.lineTo(x, y);
          }
          g.stroke();
        }
        g.restore();
      }
      taglia(() => faccia.querySelectorAll<HTMLElement>('.domanda, .opzione').forEach(e => { const r = misura(e, faccia); if (r) g.fillRect(r.x - 5, r.y - 4, r.w + 10, r.h + 8); }));
    } else if (pezzo === 'simboli') {
      // I simboli in lamina: il termine sul tagliando (al posto dell'inchiostro), il numero di citazione, due stelle e un aereo
      for (const sel of ['.tagliando .nome', '.tagliando .citazione']) {
        const el = faccia.querySelector<HTMLElement>(sel), rr = misura(el, faccia);
        if (!el || !rr) continue;
        const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) || 16, lh = parseFloat(cs.lineHeight) || fs * 1.05;
        g.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`; g.textBaseline = 'top';
        const testo = cs.textTransform === 'uppercase' ? (el.textContent ?? '').toUpperCase() : (el.textContent ?? '');
        // A capo come nel testo stampato: parola per parola, dentro la larghezza dell'elemento
        const righe: string[] = []; let riga = '';
        for (const parola of testo.split(/\s+/)) { const prova = riga ? `${riga} ${parola}` : parola; if (riga && g.measureText(prova).width > rr.w + 1) { righe.push(riga); riga = parola; } else riga = prova; }
        if (riga) righe.push(riga);
        const destra = cs.textAlign === 'right' || el.classList.contains('citazione');
        righe.forEach((x, i) => g.fillText(x, destra ? rr.x + rr.w - g.measureText(x).width : rr.x, rr.y + i * lh + (lh - fs) / 2));
      }
      const c = q('.corpo'), ar = q('.arte70');
      if (c) stella(g, c.x + c.w - 20, c.y + 18, 9, 2.2);
      if (ar && ar.h > 120) { stella(g, ar.x + 22, ar.y + 24, 7, 1.8); aereo(g, ar.x + ar.w - 34, ar.y + 30, 1.3); }
    } else if (pezzo === 'poster') {
      // Il poster tutto in lamina, con il termine inciso a contorno e una riga di dati
      const p = q('.poster'); if (!p) continue;
      g.fillRect(p.x, p.y, p.w, p.h);
      // La carta Holo è un premio, non un termine: sul poster c'è scritto BONUS ROUND
      const parole = 'BONUS ROUND';
      taglia(() => {
        g.font = `400 100px ${display}`; g.textBaseline = 'middle';
        let righe = [parole];
        if (g.measureText(parole).width > (p.w - 40) * 2.2 && parole.includes(' ')) { const m = parole.length / 2; let tg = -1; for (let i = 0; i < parole.length; i++) if (parole[i] === ' ' && (tg < 0 || Math.abs(i - m) < Math.abs(tg - m))) tg = i; righe = [parole.slice(0, tg), parole.slice(tg + 1)]; }
        const larga = Math.max(...righe.map(x => g.measureText(x).width), 1), alt = Math.min(p.h * 0.62 / righe.length, 100 * (p.w - 40) / larga);
        g.font = `400 ${alt.toFixed(1)}px ${display}`; g.lineWidth = Math.max(1.2, alt * 0.035);
        righe.forEach((x, i) => g.strokeText(x, p.x + 20, p.y + p.h / 2 + (i - (righe.length - 1) / 2) * alt * 1.02));
        g.font = `700 9px ${mono}`; g.textBaseline = 'alphabetic'; g.fillText(`HOLO · ${piano.numero ?? ''}`, p.x + 20, p.y + p.h - 16);
      });
    }
  }
  void W; void H;
  return sigillo;
}

// --- La lamina di una faccia del biglietto
export function laminaPer(faccia: HTMLElement) {
  const tela = document.createElement('canvas'); tela.className = 'lamina'; tela.setAttribute('aria-hidden', 'true'); tela.hidden = true;
  faccia.append(tela);
  const maschera = document.createElement('canvas');
  let piano: Piano | null = null, sporca = true, sigillo: [number, number, number] | null = null, fatto = false;
  new ResizeObserver(() => { sporca = true; }).observe(faccia);
  document.fonts?.ready.then(() => { sporca = true; });
  return {
    metti(p: Piano | null) {
      piano = p && p.pezzi.length ? p : null; sporca = true; fatto = false;
      tela.hidden = !piano;
      faccia.classList.toggle('lamina-banda', !!piano?.pezzi.includes('banda'));
      faccia.classList.toggle('lamina-poster', !!piano?.pezzi.includes('poster'));
      faccia.classList.toggle('lamina-simboli', !!piano?.pezzi.includes('simboli'));
    },
    // fermo: con il movimento ridotto, un fotogramma solo finché non cambia niente
    disegna(tx: number, ty: number, fermo: boolean) {
      if (!piano || !faccia.offsetWidth || (fermo && fatto && !sporca)) return;
      const m = prendiMotore(); if (!m) { tela.hidden = true; faccia.classList.remove('lamina-banda', 'lamina-poster', 'lamina-simboli'); return; }
      const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(faccia.offsetWidth * dpr), H = Math.round(faccia.offsetHeight * dpr);
      if (!W || !H) return;
      if (tela.width !== W || tela.height !== H) { tela.width = W; tela.height = H; sporca = true; }
      if (sporca) {
        maschera.width = W; maschera.height = H;
        const g = maschera.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        sigillo = disegnaMaschera(g, faccia, piano, faccia.offsetWidth, faccia.offsetHeight);
        caricaMaschera(m, maschera); sporca = false;
      } else { m.gl.activeTexture(m.gl.TEXTURE0); m.gl.bindTexture(m.gl.TEXTURE_2D, m.texMaschere.get(maschera)!); }
      const { gl, U } = m;
      if (m.tela.width < W || m.tela.height < H) { m.tela.width = Math.max(m.tela.width, W); m.tela.height = Math.max(m.tela.height, H); }
      gl.viewport(0, 0, W, H);
      gl.uniform2f(U('uRes'), W, H); gl.uniform2f(U('uTilt'), tx, ty); gl.uniform1f(U('uDpr'), dpr);
      gl.uniform2f(U('uCentro'), 0.55 - tx * 0.35, 0.5 + ty * 0.35);
      gl.uniform1f(U('uTinta'), piano.tinta === 'iride' ? 0 : piano.tinta === 'argento' ? 1 : 2);
      gl.uniform3f(U('uSigillo'), sigillo ? sigillo[0] * dpr : 0, sigillo ? H - sigillo[1] * dpr : 0, sigillo ? sigillo[2] * dpr : 0);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const g2 = tela.getContext('2d')!;
      g2.clearRect(0, 0, W, H);
      g2.drawImage(m.tela, 0, m.tela.height - H, W, H, 0, 0, W, H);
      fatto = true;
    },
  };
}
