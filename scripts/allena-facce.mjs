// Allena il piccolo modello di diffusion della pagina /learn/diffusion/ e salva i pesi in public/learn/facce.bin.
// Le facce di esempio le disegna questo stesso programma, a caso: niente dataset da scaricare.
// La rete vede una faccia sporcata dal rumore e indovina la faccia pulita. Si lancia con: node scripts/allena-facce.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const S = 16, D = S * S, T = 50, TEMPO = 4, NASCOSTI = [64, 64], PASSI = 16000, GRUPPO = 32, SCALA = 2048;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function faccia() {
  const c = new Float32Array(D).fill(-1);
  const metti = (x, y) => { if (x >= 0 && y >= 0 && x < S && y < S) c[y * S + x] = 1; };
  const cx = 7.5 + (Math.random() - 0.5), cy = 8.5 + (Math.random() - 0.5), rx = 5.4 + Math.random() * 1.6, ry = 5.4 + Math.random() * 1.4;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (d > 0.84 && d <= 1.08) metti(x, y);
  }
  const yOcchi = Math.round(cy - 1.5 + Math.random()), dist = rnd(2, 3), xs = Math.round(cx), occhi = rnd(0, 2);
  for (const l of [xs - dist - 1, xs + dist]) {
    if (occhi === 0) { metti(l, yOcchi); metti(l + 1, yOcchi); metti(l, yOcchi - 1); metti(l + 1, yOcchi - 1); }
    else if (occhi === 1) { metti(l, yOcchi); metti(l + 1, yOcchi); }
    else { metti(l, yOcchi); metti(l, yOcchi - 1); }
  }
  // Bocca: sorriso, piatta, triste, aperta
  const yb = Math.round(cy + 2.4 + Math.random() * 0.8), bocca = rnd(0, 3), l = rnd(2, 3);
  for (let x = xs - l; x < xs + l; x++) {
    const bordo = x === xs - l || x === xs + l - 1;
    if (bocca === 0) metti(x, bordo ? yb - 1 : yb);
    else if (bocca === 1) metti(x, yb);
    else if (bocca === 2) metti(x, bordo ? yb + 1 : yb);
    else { metti(x, yb); metti(x, yb + 1); }
  }
  // Capelli: niente, frangia, ciuffo
  const cap = rnd(0, 2), top = Math.round(cy - ry);
  if (cap === 1) for (let x = Math.round(cx - rx * 0.7); x <= Math.round(cx + rx * 0.7); x++) { metti(x, top); metti(x, top + 1); }
  if (cap === 2) for (let k = -2; k <= 2; k++) { metti(xs + k, top - 1 + Math.abs(k) % 2); metti(xs + k, top + Math.abs(k) % 2); }
  return c;
}

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const abar = [];
for (let t = 0; t <= T; t++) abar.push(Math.cos(((t / T + 0.008) / 1.008) * Math.PI / 2) ** 2 / Math.cos((0.008 / 1.008) * Math.PI / 2) ** 2);
const forma = [D + TEMPO, ...NASCOSTI, D], L = forma.length - 1;
const pesi = forma.slice(1).map((n, l) => Float32Array.from({ length: n * forma[l] }, () => (Math.random() * 2 - 1) * Math.sqrt(3 / forma[l]) * (l === L - 1 ? 0.2 : 1)));
const scarti = forma.slice(1).map(n => new Float32Array(n));
const z = a => a.map(p => new Float32Array(p.length));
const m1p = z(pesi), m2p = z(pesi), m1s = z(scarti), m2s = z(scarti), gp = z(pesi), gs = z(scarti);
const us = forma.map(n => new Float32Array(n)), col = forma.map(n => new Float32Array(n)), der = forma.map(n => new Float32Array(n));

function avanti(x, t) {
  us[0].set(x);
  const u = t / T;
  us[0][D] = Math.sin(Math.PI * u); us[0][D + 1] = Math.cos(Math.PI * u); us[0][D + 2] = Math.sin(2 * Math.PI * u); us[0][D + 3] = Math.cos(2 * Math.PI * u);
  for (let l = 1; l <= L; l++) {
    const prima = us[l - 1], qui = us[l], p = pesi[l - 1], b = scarti[l - 1], e = forma[l - 1], n = forma[l], d = der[l];
    for (let j = 0; j < n; j++) {
      let s = b[j];
      const off = j * e;
      for (let i = 0; i < e; i++) s += p[off + i] * prima[i];
      if (l === L) qui[j] = s; else { qui[j] = s > 0 ? s : 0; d[j] = s > 0 ? 1 : 0; }
    }
  }
  return us[L];
}
const dati = Array.from({ length: 4000 }, faccia), sporco = new Float32Array(D);
let passo = 0;
function allena(lr) {
  gp.forEach(g => g.fill(0));
  gs.forEach(g => g.fill(0));
  let errore = 0;
  for (let k = 0; k < GRUPPO; k++) {
    const q = dati[Math.floor(Math.random() * dati.length)], t = 1 + Math.floor(Math.random() * T), a = Math.sqrt(abar[t]), n = Math.sqrt(1 - abar[t]);
    for (let i = 0; i < D; i++) sporco[i] = a * q[i] + n * gauss();
    const o = avanti(sporco, t), c = col[L];
    for (let i = 0; i < D; i++) { c[i] = o[i] - q[i]; errore += c[i] * c[i]; }
    for (let l = L; l >= 1; l--) {
      const e = forma[l - 1], nn = forma[l], w = pesi[l - 1], gw = gp[l - 1], gb = gs[l - 1], prima = us[l - 1], sotto = col[l - 1], cc = col[l];
      sotto.fill(0);
      for (let j = 0; j < nn; j++) {
        const d = cc[j], off = j * e;
        gb[j] += d;
        if (d === 0) continue;
        for (let i = 0; i < e; i++) { gw[off + i] += d * prima[i]; sotto[i] += d * w[off + i]; }
      }
      if (l > 1) { const de = der[l - 1]; for (let i = 0; i < e; i++) sotto[i] *= de[i]; }
    }
  }
  passo++;
  const c1 = 1 - 0.9 ** passo, c2 = 1 - 0.999 ** passo;
  const adam = (v, g, m1, m2) => {
    for (let k = 0; k < v.length; k++) {
      const gg = g[k] / GRUPPO;
      m1[k] = 0.9 * m1[k] + 0.1 * gg;
      m2[k] = 0.999 * m2[k] + 0.001 * gg * gg;
      v[k] -= (lr * (m1[k] / c1)) / (Math.sqrt(m2[k] / c2) + 1e-8);
    }
  };
  for (let l = 0; l < L; l++) { adam(pesi[l], gp[l], m1p[l], m2p[l]); adam(scarti[l], gs[l], m1s[l], m2s[l]); }
  return errore / GRUPPO / D;
}
const t0 = performance.now();
for (let k = 1; k <= PASSI; k++) {
  const e = allena(k < PASSI * 0.7 ? 0.001 : 0.0003);
  if (k % 4000 === 0) console.log(k, 'errore', e.toFixed(3), `${((performance.now() - t0) / 1000).toFixed(0)}s`);
}
// Pesi a 16 bit: per ogni strato prima i pesi, poi gli scarti
const tutti = [];
for (let l = 0; l < L; l++) { tutti.push(...pesi[l], ...scarti[l]); }
const fuori = Int16Array.from(tutti, v => Math.max(-32768, Math.min(32767, Math.round(v * SCALA))));
mkdirSync('public/learn', { recursive: true });
writeFileSync('public/learn/facce.bin', Buffer.from(fuori.buffer));
console.log('salvato', fuori.length, 'pesi', Math.round(fuori.byteLength / 1024), 'KB');
