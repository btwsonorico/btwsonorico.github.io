// Il decision model di /learn/decision/ nel browser (allenato da scripts/allena-decisore.py).
// Ha la forma dei decision model open: un encoder bidirezionale piccolo (2 strati di attenzione) e una testa.
// Le risposte possibili sono testo e arrivano con la richiesta: la frase e ogni etichetta passano nello stesso encoder,
// e il punteggio di un'etichetta è quanto i due vettori si somigliano. Una seconda testa dà un'etichetta a ogni parola.
// Fa gli stessi conti dello script di allenamento, con i pesi in 8 bit.

export type Meta = {
  B: number; D: number; teste: number; strati: number; ffn: number; lmax: number; pesi: number; tag: string[];
  tensori: { nome: string; forma: number[]; scale?: number; valori: number; tipo: 'int8' | 'float32' }[];
  compiti: Record<string, { etichette: string[]; temperatura: number; soglia: number | null }>;
  nomi: Record<string, string[]>; esempi: Record<string, string[]>; esito: Record<string, unknown>;
};
type Mat = { r: number; c: number; w: Float32Array };
export type Decisore = { meta: Meta; m: Record<string, Mat | Float32Array> };

export function carica(meta: Meta, bin: ArrayBuffer): Decisore {
  const m: Record<string, Mat | Float32Array> = {};
  for (const t of meta.tensori) {
    if (t.tipo === 'float32') { m[t.nome] = new Float32Array(bin, t.valori, t.forma.reduce((a, b) => a * b, 1)); continue; }
    const [r, c] = t.forma as [number, number], sc = new Float32Array(bin, t.scale!, r), q = new Int8Array(bin, t.valori, r * c), w = new Float32Array(r * c);
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) w[i * c + j] = q[i * c + j]! * sc[i]!;
    m[t.nome] = { r, c, w };
  }
  return { meta, m };
}

export const parole = (t: string, lmax = 32) => t.toLowerCase().normalize('NFC').replace(/[^a-z0-9àèéìíòóùú]+/g, ' ').split(' ').filter(Boolean).slice(0, lmax);
const fnv = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
const cache = new Map<string, number[]>();
function pezzi(w: string, B: number) {
  let p = cache.get(w);
  if (!p) { const x = `<${w}>`; p = [fnv('w:' + w) % B]; for (let i = 0; i + 3 <= x.length; i++) p.push(fnv(x.slice(i, i + 3)) % B); cache.set(w, p); }
  return p;
}

const lin = (W: Mat, b: Float32Array, x: Float32Array, xo: number, y: Float32Array, yo: number) => {
  for (let i = 0; i < W.r; i++) { let s = b[i]!; const r = i * W.c; for (let j = 0; j < W.c; j++) s += W.w[r + j]! * x[xo + j]!; y[yo + i] = s; }
};
const norma = (x: Float32Array, o: number, n: number, g: Float32Array, b: Float32Array, y: Float32Array) => {
  let m = 0, v = 0;
  for (let i = 0; i < n; i++) m += x[o + i]!;
  m /= n;
  for (let i = 0; i < n; i++) v += (x[o + i]! - m) ** 2;
  const k = 1 / Math.sqrt(v / n + 1e-5);
  for (let i = 0; i < n; i++) y[o + i] = (x[o + i]! - m) * k * g[i]! + b[i]!;
};
const gelu = (x: number) => 0.5 * x * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x * x * x)));

// L'encoder: una frase diventa un vettore di lunghezza 1, più i vettori delle singole parole (per la testa delle parole)
export function codifica(d: Decisore, ws: string[]) {
  const { D, teste, strati, ffn, B } = d.meta, M = d.m, L = Math.max(1, ws.length), dh = D / teste;
  const E = M['emb.weight'] as Mat, P = M['pos.weight'] as Mat;
  const x = new Float32Array(L * D);
  ws.forEach((w, j) => {
    const p = pezzi(w, B), k = 1 / Math.max(1, p.length - 1);
    for (let t = 0; t < p.length; t++) { const f = t ? k : 1, r = p[t]! * D; for (let i = 0; i < D; i++) x[j * D + i] += E.w[r + i]! * f; }
  });
  for (let j = 0; j < L; j++) for (let i = 0; i < D; i++) x[j * D + i] += P.w[j * D + i]!;
  const n = new Float32Array(L * D), qkv = new Float32Array(L * 3 * D), att = new Float32Array(L * D), tmp = new Float32Array(D), h1 = new Float32Array(ffn), punti = new Float32Array(L);
  for (let s = 0; s < strati; s++) {
    const g = (k: string) => M[`strati.${s}.${k}`]!;
    for (let j = 0; j < L; j++) { norma(x, j * D, D, g('n1.weight') as Float32Array, g('n1.bias') as Float32Array, n); lin(g('qkv.weight') as Mat, g('qkv.bias') as Float32Array, n, j * D, qkv, j * 3 * D); }
    // Ogni parola guarda tutte le altre, prima e dopo di lei: è questo che rende l'encoder bidirezionale
    for (let t = 0; t < teste; t++) for (let a = 0; a < L; a++) {
      let mx = -Infinity;
      for (let b = 0; b < L; b++) { let v = 0; for (let i = 0; i < dh; i++) v += qkv[a * 3 * D + t * dh + i]! * qkv[b * 3 * D + D + t * dh + i]!; punti[b] = v / Math.sqrt(dh); if (punti[b]! > mx) mx = punti[b]!; }
      let tot = 0;
      for (let b = 0; b < L; b++) { punti[b] = Math.exp(punti[b]! - mx); tot += punti[b]!; }
      for (let i = 0; i < dh; i++) { let v = 0; for (let b = 0; b < L; b++) v += punti[b]! * qkv[b * 3 * D + 2 * D + t * dh + i]!; att[a * D + t * dh + i] = v / tot; }
    }
    for (let j = 0; j < L; j++) { lin(g('o.weight') as Mat, g('o.bias') as Float32Array, att, j * D, tmp, 0); for (let i = 0; i < D; i++) x[j * D + i] += tmp[i]!; }
    for (let j = 0; j < L; j++) {
      norma(x, j * D, D, g('n2.weight') as Float32Array, g('n2.bias') as Float32Array, n);
      lin(g('f1.weight') as Mat, g('f1.bias') as Float32Array, n, j * D, h1, 0);
      for (let i = 0; i < ffn; i++) h1[i] = gelu(h1[i]!);
      lin(g('f2.weight') as Mat, g('f2.bias') as Float32Array, h1, 0, tmp, 0);
      for (let i = 0; i < D; i++) x[j * D + i] += tmp[i]!;
    }
  }
  const h = new Float32Array(L * D), media = new Float32Array(D), v = new Float32Array(D);
  for (let j = 0; j < L; j++) { norma(x, j * D, D, M['fine.weight'] as Float32Array, M['fine.bias'] as Float32Array, h); for (let i = 0; i < D; i++) media[i] += h[j * D + i]! / L; }
  lin(M['proietta.weight'] as Mat, M['proietta.bias'] as Float32Array, media, 0, v, 0);
  let nn = 0; for (let i = 0; i < D; i++) nn += v[i]! * v[i]!;
  nn = Math.sqrt(nn) || 1; for (let i = 0; i < D; i++) v[i] = v[i]! / nn;
  return { v, h, L };
}

// Le etichette di un compito si codificano una volta: sono le risposte possibili, scritte come testo
export function etichette(d: Decisore, testi: string[]) { return testi.map(t => codifica(d, parole(t)).v); }

export function decidi(d: Decisore, ws: string[], et: Float32Array[], temperatura: number) {
  const { v } = codifica(d, ws), scala = Math.exp((d.m['scala'] as Float32Array)[0]!);
  const z = et.map(e => { let s = 0; for (let i = 0; i < e.length; i++) s += e[i]! * v[i]!; return (scala * s) / temperatura; });
  const mx = Math.max(...z), e = z.map(x => Math.exp(x - mx)), tot = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / tot);
}

// La testa delle parole: per ogni parola, una fra le etichette (niente, stanza, colore, numero)
export function parti(d: Decisore, ws: string[]) {
  const { h, L } = codifica(d, ws), W = d.m['parti.weight'] as Mat, b = d.m['parti.bias'] as Float32Array, y = new Float32Array(W.r);
  return Array.from({ length: ws.length ? L : 0 }, (_, j) => { lin(W, b, h, j * d.meta.D, y, 0); let k = 0; for (let i = 1; i < W.r; i++) if (y[i]! > y[k]!) k = i; return d.meta.tag[k]!; });
}
