// Un modello di diffusion su punti in 3D, che si allena nel browser: ogni punto di un pesce o di un albero è un «dato», con tre valori.
// È lo stesso metodo della spirale (src/lib/spirale.ts), con una dimensione in più e una rete un po' più larga.
export const T = 50;
const CUE = 4, D3 = 3, NASCOSTI = [96, 96, 96], FORMA = [D3 + CUE, ...NASCOSTI, D3], L = FORMA.length - 1;
export const abar = Array.from({ length: T + 1 }, (_, t) => Math.max(1e-3, Math.cos(((t / T + 0.008) / 1.008) * Math.PI / 2) ** 2 / Math.cos((0.008 / 1.008) * Math.PI / 2) ** 2));
export const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

// Un punto a caso sulla superficie di un ellissoide
const suEllissoide = (cx: number, cy: number, cz: number, rx: number, ry: number, rz: number): [number, number, number] => {
  const u = 2 * Math.random() - 1, a = Math.random() * 2 * Math.PI, s = Math.sqrt(1 - u * u);
  return [cx + rx * s * Math.cos(a), cy + ry * u, cz + rz * s * Math.sin(a)];
};
const riempi = (n: number, punto: () => [number, number, number]) => {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) p.set(punto(), i * 3);
  return p;
};

// Il pesce: corpo, coda a forbice e pinna sul dorso
export function pesce(n: number): Float32Array {
  return riempi(n, () => {
    const q = Math.random();
    if (q < 0.68) return suEllissoide(0.15, 0, 0, 0.85, 0.42, 0.26);
    if (q < 0.9) {
      // La coda: due lame che si aprono verso il fondo
      const u = Math.random(), lato = Math.random() < 0.5 ? 1 : -1;
      return [-0.65 - u * 0.55, lato * u * 0.55 + (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.06];
    }
    // La pinna sul dorso: un triangolo
    const u = Math.random(), v = Math.random() * (1 - u);
    return [0.3 - u * 0.5, 0.38 + v * 0.42, (Math.random() - 0.5) * 0.04];
  });
}

// L'albero: tronco e tre chiome una sopra l'altra, come gli abeti del sito
export function albero(n: number): Float32Array {
  return riempi(n, () => {
    const q = Math.random();
    if (q < 0.12) {
      const a = Math.random() * 2 * Math.PI;
      return [0.09 * Math.cos(a), -1.05 + Math.random() * 0.5, 0.09 * Math.sin(a)];
    }
    // Tre coni: si sceglie un cono, poi un'altezza; più in basso c'è più superficie
    const cono = q < 0.5 ? 0 : q < 0.8 ? 1 : 2, base = [-0.55, -0.1, 0.32][cono]!, alto = [0.75, 0.68, 0.72][cono]!, raggio = [0.8, 0.62, 0.42][cono]!;
    const u = 1 - Math.sqrt(Math.random()), a = Math.random() * 2 * Math.PI, r = raggio * (1 - u);
    return [r * Math.cos(a), base + u * alto, r * Math.sin(a)];
  });
}

export type Modello = { pesi: Float32Array[]; scarti: Float32Array[]; m1: Float32Array[]; m2: Float32Array[]; s1: Float32Array[]; s2: Float32Array[]; passi: number; u: Float32Array[]; d: Uint8Array[]; c: Float32Array[]; gp: Float32Array[]; gs: Float32Array[] };

export function nuovoModello(): Modello {
  const z = (l: Float32Array[]) => l.map(a => new Float32Array(a.length));
  const pesi = FORMA.slice(1).map((n, l) => Float32Array.from({ length: n * FORMA[l]! }, () => (Math.random() * 2 - 1) * Math.sqrt(3 / FORMA[l]!)));
  const scarti = FORMA.slice(1).map(n => new Float32Array(n));
  return { pesi, scarti, m1: z(pesi), m2: z(pesi), s1: z(scarti), s2: z(scarti), gp: z(pesi), gs: z(scarti), passi: 0, u: FORMA.map(n => new Float32Array(n)), d: FORMA.map(n => new Uint8Array(n)), c: FORMA.map(n => new Float32Array(n)) };
}

function avanti(m: Modello, x: number, y: number, z: number, t: number) {
  const q = t / T, u0 = m.u[0]!;
  u0[0] = x; u0[1] = y; u0[2] = z; u0[3] = Math.sin(Math.PI * q); u0[4] = Math.cos(Math.PI * q); u0[5] = Math.sin(2 * Math.PI * q); u0[6] = Math.cos(2 * Math.PI * q);
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

// Un passo di allenamento: sporca un gruppo di punti e corregge i pesi con Adam. Torna l'errore medio
export function allena(m: Modello, dati: Float32Array, gruppo: number, lr: number): number {
  m.gp.forEach(g => g.fill(0));
  m.gs.forEach(g => g.fill(0));
  let errore = 0;
  const n = dati.length / 3;
  for (let k = 0; k < gruppo; k++) {
    const i = Math.floor(Math.random() * n), t = 1 + Math.floor(Math.random() * T), a = abar[t]!, sa = Math.sqrt(a), sb = Math.sqrt(1 - a), e0 = gauss(), e1 = gauss(), e2 = gauss();
    const o = avanti(m, sa * dati[i * 3]! + sb * e0, sa * dati[i * 3 + 1]! + sb * e1, sa * dati[i * 3 + 2]! + sb * e2, t), c = m.c[L]!;
    c[0] = o[0]! - e0; c[1] = o[1]! - e1; c[2] = o[2]! - e2;
    errore += c[0] * c[0] + c[1] * c[1] + c[2] * c[2];
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
  const b1 = 0.9, b2 = 0.999, c1 = 1 - b1 ** m.passi, c2 = 1 - b2 ** m.passi, adam = (x: Float32Array, g: Float32Array, a: Float32Array, b: Float32Array) => {
    for (let i = 0; i < x.length; i++) {
      const v = g[i]! / gruppo;
      a[i] = b1 * a[i]! + (1 - b1) * v;
      b[i] = b2 * b[i]! + (1 - b2) * v * v;
      x[i] = x[i]! - (lr * a[i]! / c1) / (Math.sqrt(b[i]! / c2) + 1e-8);
    }
  };
  for (let l = 0; l < L; l++) { adam(m.pesi[l]!, m.gp[l]!, m.m1[l]!, m.m2[l]!); adam(m.scarti[l]!, m.gs[l]!, m.s1[l]!, m.s2[l]!); }
  return errore / gruppo / 3;
}

// Un passo all'indietro su un punto, da t a dopo: stima il punto pulito, poi rimette la quota di rumore del passo dopo
export function indietro(m: Modello, p: Float32Array, i: number, t: number, dopo: number) {
  const o = avanti(m, p[i]!, p[i + 1]!, p[i + 2]!, t), a = abar[t]!, d = dopo > 0 ? abar[dopo]! : 1, sa = Math.sqrt(a), sb = Math.sqrt(1 - a), lim = (v: number) => Math.max(-1.4, Math.min(1.4, v));
  for (let k = 0; k < 3; k++) {
    const q = p[i + k]!, c = lim((q - sb * o[k]!) / sa), e = (q - sa * c) / sb;
    p[i + k] = Math.sqrt(d) * c + Math.sqrt(1 - d) * e;
  }
}
