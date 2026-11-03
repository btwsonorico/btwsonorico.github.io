// Un modello di diffusion piccolissimo su punti 2D, che si allena nel browser. Ogni punto della spirale è un «dato», con due soli valori.
// La rete vede un punto sporcato dal rumore e il passo t, e stima il rumore che lo ha spostato.
export const T = 50;
const CUE = 4, NASCOSTI = [64, 64, 64], FORMA = [2 + CUE, ...NASCOSTI, 2], L = FORMA.length - 1;
export const abar = Array.from({ length: T + 1 }, (_, t) => Math.max(1e-3, Math.cos(((t / T + 0.008) / 1.008) * Math.PI / 2) ** 2 / Math.cos((0.008 / 1.008) * Math.PI / 2) ** 2));

export const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

// La spirale, con i valori fra -1 e 1 circa
export function punti(n: number): Float32Array {
  const p = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const u = Math.sqrt(Math.random()), a = u * 3.2 * Math.PI + 0.4, r = 0.1 + u * 0.9;
    p[i * 2] = r * Math.cos(a) + gauss() * 0.012;
    p[i * 2 + 1] = r * Math.sin(a) + gauss() * 0.012;
  }
  return p;
}

export type Modello = { pesi: Float32Array[]; scarti: Float32Array[]; m1: Float32Array[]; m2: Float32Array[]; s1: Float32Array[]; s2: Float32Array[]; passi: number; u: Float32Array[]; d: Uint8Array[]; c: Float32Array[]; gp: Float32Array[]; gs: Float32Array[] };

export function nuovoModello(): Modello {
  const z = (l: Float32Array[]) => l.map(a => new Float32Array(a.length));
  const pesi = FORMA.slice(1).map((n, l) => Float32Array.from({ length: n * FORMA[l]! }, () => (Math.random() * 2 - 1) * Math.sqrt(3 / FORMA[l]!)));
  const scarti = FORMA.slice(1).map(n => new Float32Array(n));
  return { pesi, scarti, m1: z(pesi), m2: z(pesi), s1: z(scarti), s2: z(scarti), gp: z(pesi), gs: z(scarti), passi: 0, u: FORMA.map(n => new Float32Array(n)), d: FORMA.map(n => new Uint8Array(n)), c: FORMA.map(n => new Float32Array(n)) };
}

function avanti(m: Modello, x: number, y: number, t: number) {
  const q = t / T, u0 = m.u[0]!;
  u0[0] = x; u0[1] = y; u0[2] = Math.sin(Math.PI * q); u0[3] = Math.cos(Math.PI * q); u0[4] = Math.sin(2 * Math.PI * q); u0[5] = Math.cos(2 * Math.PI * q);
  for (let l = 1; l <= L; l++) {
    const prima = m.u[l - 1]!, qui = m.u[l]!, p = m.pesi[l - 1]!, b = m.scarti[l - 1]!, e = FORMA[l - 1]!, n = FORMA[l]!, d = m.d[l]!;
    for (let j = 0; j < n; j++) {
      let s = b[j]!;
      const off = j * e;
      for (let i = 0; i < e; i++) s += p[off + i]! * prima[i]!;
      if (l === L) qui[j] = s; else { qui[j] = s > 0 ? s : 0; d[j] = s > 0 ? 1 : 0; }
    }
  }
  return m.u[L]!;
}

// La stima del rumore per un punto al passo t
export function stima(m: Modello, x: number, y: number, t: number): [number, number] {
  const o = avanti(m, x, y, t);
  return [o[0]!, o[1]!];
}

// Un passo di allenamento: sporca un gruppo di punti e corregge i pesi con Adam. Torna l'errore medio
export function allena(m: Modello, dati: Float32Array, gruppo: number, lr: number): number {
  m.gp.forEach(g => g.fill(0));
  m.gs.forEach(g => g.fill(0));
  let errore = 0;
  const n = dati.length / 2;
  for (let k = 0; k < gruppo; k++) {
    const i = Math.floor(Math.random() * n), t = 1 + Math.floor(Math.random() * T), a = abar[t]!, sa = Math.sqrt(a), sb = Math.sqrt(1 - a), e0 = gauss(), e1 = gauss();
    const o = avanti(m, sa * dati[i * 2]! + sb * e0, sa * dati[i * 2 + 1]! + sb * e1, t), c = m.c[L]!;
    c[0] = o[0]! - e0; c[1] = o[1]! - e1;
    errore += c[0] * c[0] + c[1] * c[1];
    for (let l = L; l >= 1; l--) {
      const dopo = m.c[l]!, sotto = m.c[l - 1]!, prima = m.u[l - 1]!, g = m.gp[l - 1]!, gs = m.gs[l - 1]!, e = FORMA[l - 1]!, nn = FORMA[l]!, p = m.pesi[l - 1]!;
      sotto.fill(0);
      for (let j = 0; j < nn; j++) {
        const v = dopo[j]!;
        if (v === 0) continue;
        const off = j * e;
        gs[j] = gs[j]! + v;
        for (let q = 0; q < e; q++) {
          g[off + q] = g[off + q]! + v * prima[q]!;
          sotto[q] = sotto[q]! + v * p[off + q]!;
        }
      }
      if (l > 1) { const d = m.d[l - 1]!; for (let q = 0; q < e; q++) if (!d[q]) sotto[q] = 0; }
    }
  }
  m.passi++;
  const b1 = 0.9, b2 = 0.999, adam = (x: Float32Array, g: Float32Array, a: Float32Array, b: Float32Array) => {
    const c1 = 1 - b1 ** m.passi, c2 = 1 - b2 ** m.passi;
    for (let i = 0; i < x.length; i++) {
      const v = g[i]! / gruppo;
      a[i] = b1 * a[i]! + (1 - b1) * v;
      b[i] = b2 * b[i]! + (1 - b2) * v * v;
      x[i] = x[i]! - (lr * a[i]! / c1) / (Math.sqrt(b[i]! / c2) + 1e-8);
    }
  };
  for (let l = 0; l < L; l++) { adam(m.pesi[l]!, m.gp[l]!, m.m1[l]!, m.m2[l]!); adam(m.scarti[l]!, m.gs[l]!, m.s1[l]!, m.s2[l]!); }
  return errore / gruppo / 2;
}

// Un passo all'indietro, da t a dopo: stima il punto pulito, poi rimette la quota di rumore del passo dopo
export function indietro(m: Modello, x: number, y: number, t: number, dopo: number): [number, number] {
  const [e0, e1] = stima(m, x, y, t), a = abar[t]!, d = dopo > 0 ? abar[dopo]! : 1;
  const lim = (v: number) => Math.max(-1.3, Math.min(1.3, v));
  const px = lim((x - Math.sqrt(1 - a) * e0) / Math.sqrt(a)), py = lim((y - Math.sqrt(1 - a) * e1) / Math.sqrt(a));
  const n0 = (x - Math.sqrt(a) * px) / Math.sqrt(1 - a), n1 = (y - Math.sqrt(a) * py) / Math.sqrt(1 - a);
  return [Math.sqrt(d) * px + Math.sqrt(1 - d) * n0, Math.sqrt(d) * py + Math.sqrt(1 - d) * n1];
}

// Quanto i punti generati stanno vicino alla spirale: la quota entro una piccola distanza da un punto vero
export function vicini(gen: Float32Array, dati: Float32Array, soglia = 0.07): number {
  let dentro = 0;
  for (let i = 0; i < gen.length; i += 2) {
    let min = Infinity;
    for (let j = 0; j < dati.length; j += 2) {
      const dx = gen[i]! - dati[j]!, dy = gen[i + 1]! - dati[j + 1]!, v = dx * dx + dy * dy;
      if (v < min) min = v;
    }
    if (min < soglia * soglia) dentro++;
  }
  return dentro / (gen.length / 2);
}
