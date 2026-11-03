// Il modello di diffusion delle cifre, già allenato (scripts/allena-cifre.py): una piccola U-Net scritta a mano, che gira nel browser senza server.
// Legge l'immagine sporca, il passo e la cifra chiesta, e stima il rumore. Forma e ordine dei pesi sono gli stessi dello script.
export const LATO = 28;
export const D = LATO * LATO;
const T = 100, A = 16, B = 32, C = 48, COND = 64;
const abar = Array.from({ length: T + 1 }, (_, t) => Math.max(1e-4, Math.cos(((t / T + 0.008) / 1.008) * Math.PI / 2) ** 2 / Math.cos((0.008 / 1.008) * Math.PI / 2) ** 2));

type Lineare = { w: Float32Array; b: Float32Array; o: number };
type Conv = { w: Float32Array; b: Float32Array; i: number; o: number };
type Res = { a: Conv; b: Conv; c: Lineare };
export type Modello = { c1: Lineare; c2: Lineare; ini: Conv; r1: Res; d1: Conv; r2: Res; d2: Conv; r3: Res; r4: Res; u2: Conv; r5: Res; u1: Conv; r6: Res; fine: Conv };

export async function caricaModello(indirizzo: string): Promise<Modello> {
  const dati = new Float32Array(await (await fetch(indirizzo)).arrayBuffer());
  let k = 0;
  const prendi = (n: number) => { const p = dati.subarray(k, k + n); k += n; return p; };
  const lin = (i: number, o: number): Lineare => ({ w: prendi(i * o), b: prendi(o), o });
  const conv = (i: number, o: number): Conv => ({ w: prendi(o * i * 9), b: prendi(o), i, o });
  const res = (c: number): Res => ({ a: conv(c, c), b: conv(c, c), c: lin(COND, c) });
  return {
    c1: lin(18, COND), c2: lin(COND, COND), ini: conv(1, A), r1: res(A), d1: conv(A, B), r2: res(B), d2: conv(B, C), r3: res(C), r4: res(C),
    u2: conv(C + B, B), r5: res(B), u1: conv(B + A, A), r6: res(A), fine: conv(A, 1),
  };
}

function lineare(l: Lineare, x: Float32Array) {
  const y = new Float32Array(l.o), n = x.length;
  for (let j = 0; j < l.o; j++) {
    let s = l.b[j]!;
    for (let i = 0; i < n; i++) s += l.w[j * n + i]! * x[i]!;
    y[j] = s;
  }
  return y;
}

// Convoluzione 3x3 con bordo a zero: lato è il lato dell'ingresso, passo 2 dimezza l'immagine
function conv(c: Conv, x: Float32Array, lato: number, passo = 1) {
  const fuori = passo === 2 ? lato / 2 : lato, y = new Float32Array(c.o * fuori * fuori);
  for (let co = 0; co < c.o; co++) {
    const base = co * fuori * fuori, bias = c.b[co]!;
    for (let i = 0; i < fuori * fuori; i++) y[base + i] = bias;
    for (let ci = 0; ci < c.i; ci++) {
      const ing = ci * lato * lato;
      for (let ky = 0; ky < 3; ky++) for (let kx = 0; kx < 3; kx++) {
        const w = c.w[(co * c.i + ci) * 9 + ky * 3 + kx]!;
        for (let r = 0; r < fuori; r++) {
          const ir = r * passo + ky - 1;
          if (ir < 0 || ir >= lato) continue;
          const riga = ing + ir * lato, usc = base + r * fuori;
          for (let q = 0; q < fuori; q++) {
            const iq = q * passo + kx - 1;
            if (iq >= 0 && iq < lato) y[usc + q]! += w * x[riga + iq]!;
          }
        }
      }
    }
  }
  return y;
}

const relu = (x: Float32Array) => { for (let i = 0; i < x.length; i++) if (x[i]! < 0) x[i] = 0; return x; };

function res(r: Res, x: Float32Array, lato: number, e: Float32Array) {
  const h = relu(conv(r.a, x, lato)), v = lineare(r.c, e), n = lato * lato;
  for (let c = 0; c < r.c.o; c++) for (let i = 0; i < n; i++) h[c * n + i]! += v[c]!;
  const y = conv(r.b, h, lato);
  for (let i = 0; i < y.length; i++) y[i]! += x[i]!;
  return relu(y);
}

// Raddoppia il lato copiando i pixel, poi mette accanto i canali che arrivano dalla discesa
function sali(x: Float32Array, canali: number, lato: number, accanto: Float32Array) {
  const L2 = lato * 2, y = new Float32Array(canali * L2 * L2 + accanto.length);
  for (let c = 0; c < canali; c++) for (let r = 0; r < L2; r++) for (let q = 0; q < L2; q++) y[c * L2 * L2 + r * L2 + q] = x[c * lato * lato + (r >> 1) * lato + (q >> 1)]!;
  y.set(accanto, canali * L2 * L2);
  return y;
}

export function stima(m: Modello, x: Float32Array, t: number, cifra: number) {
  const u = t / T, ing = new Float32Array(18);
  [1, 2, 4, 8].forEach((k, i) => { ing[i * 2] = Math.sin(Math.PI * k * u); ing[i * 2 + 1] = Math.cos(Math.PI * k * u); });
  ing[8 + cifra] = 1;
  const e = lineare(m.c2, relu(lineare(m.c1, ing)));
  const h1 = res(m.r1, relu(conv(m.ini, x, 28)), 28, e);
  const h2 = res(m.r2, relu(conv(m.d1, h1, 28, 2)), 14, e);
  let h = res(m.r4, res(m.r3, relu(conv(m.d2, h2, 14, 2)), 7, e), 7, e);
  h = res(m.r5, relu(conv(m.u2, sali(h, C, 7, h2), 14)), 14, e);
  h = res(m.r6, relu(conv(m.u1, sali(h, B, 14, h1), 28)), 28, e);
  return conv(m.fine, h, 28);
}

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
export const rumorePuro = () => Float32Array.from({ length: D }, gauss);

// tempi[k]: il passo del modello al passo k della generazione. Finisce con 0, l'immagine pulita
export const tempiDi = (passi: number) => [...Array.from({ length: passi }, (_, k) => Math.round(T - (k * T) / passi)), 0];
// Quanto rumore resta a quel punto, da 0 a 1
export const quotaRumore = (t: number) => (t > 0 ? Math.sqrt(1 - abar[t]!) : 0);

// Un passo: stima il rumore, ricava l'immagine pulita, e prepara l'immagine del passo dopo con meno rumore
export function passo(m: Modello, x: Float32Array, t: number, dopo: number, cifra: number) {
  const o = stima(m, x, t, cifra), a = abar[t]!, d = dopo > 0 ? abar[dopo]! : 1;
  const pulita = new Float32Array(D), rumore = new Float32Array(D), nuovo = new Float32Array(D);
  for (let i = 0; i < D; i++) {
    const p = Math.max(-1, Math.min(1, (x[i]! - Math.sqrt(1 - a) * o[i]!) / Math.sqrt(a))), e = (x[i]! - Math.sqrt(a) * p) / Math.sqrt(1 - a);
    pulita[i] = p;
    rumore[i] = e;
    nuovo[i] = Math.sqrt(d) * p + Math.sqrt(1 - d) * e;
  }
  return { pulita, rumore, nuovo };
}
