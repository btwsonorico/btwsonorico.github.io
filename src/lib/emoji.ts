// L'autotagger, già allenato (scripts/allena-emoji.py): un encoder minuscolo scritto a mano, che gira nel browser senza server.
// Le parole arrivano come vettori GloVe già allenati; l'encoder li legge e dà una probabilità a ognuna delle 50 emoji. Forma e ordine dei pesi sono quelli dello script.
const VDIM = 50, MAX_V = 5, DIM = 48, TESTE = 2, POS = 16, MAX_PAROLE = 16, SCALA = 2048, CLASSI = 50;

type Lineare = { w: Float32Array; b: Float32Array; i: number; o: number };
type Norma = { w: Float32Array; b: Float32Array };
export type Modello = { indice: Map<string, number>; vettori: Int8Array; proj: Lineare; pos: Float32Array; n1: Norma; qkv: Lineare; fuori: Lineare; n2: Norma; f1: Lineare; f2: Lineare; testa: Lineare };

export function modelloDa(pesi: ArrayBuffer, vettori: ArrayBuffer, parole: string): Modello {
  const interi = new Int16Array(pesi);
  let k = 0;
  const prendi = (n: number) => { const p = Float32Array.from(interi.subarray(k, k + n), v => v / SCALA); k += n; return p; };
  const lin = (i: number, o: number): Lineare => ({ w: prendi(i * o), b: prendi(o), i, o });
  const norma = (): Norma => ({ w: prendi(DIM), b: prendi(DIM) });
  return {
    indice: new Map(parole.split('\n').map((w, i) => [w, i])), vettori: new Int8Array(vettori),
    proj: lin(VDIM, DIM), pos: prendi(POS * DIM), n1: norma(), qkv: lin(DIM, DIM * 3), fuori: lin(DIM, DIM), n2: norma(), f1: lin(DIM, DIM * 2), f2: lin(DIM * 2, DIM), testa: lin(DIM, CLASSI),
  };
}

export const parole = (t: string) => (t.toLowerCase().match(/[a-z0-9]+/g) ?? []).slice(0, MAX_PAROLE);

function lineare(l: Lineare, x: Float32Array) {
  const y = new Float32Array(l.o);
  for (let j = 0; j < l.o; j++) {
    let s = l.b[j]!;
    for (let i = 0; i < l.i; i++) s += l.w[j * l.i + i]! * x[i]!;
    y[j] = s;
  }
  return y;
}
function norma(n: Norma, x: Float32Array) {
  let m = 0, v = 0;
  for (let i = 0; i < DIM; i++) m += x[i]!;
  m /= DIM;
  for (let i = 0; i < DIM; i++) v += (x[i]! - m) ** 2;
  const d = Math.sqrt(v / DIM + 1e-5), y = new Float32Array(DIM);
  for (let i = 0; i < DIM; i++) y[i] = ((x[i]! - m) / d) * n.w[i]! + n.b[i]!;
  return y;
}
export const softmax = (o: Float32Array | number[], t = 1) => {
  const v = [...o], m = Math.max(...v), e = v.map(x => Math.exp((x - m) / t)), s = e.reduce((a, b) => a + b);
  return e.map(x => x / s);
};

// I punteggi delle 50 emoji per una lista di parole che il modello conosce
export function punteggi(m: Modello, lista: string[]) {
  const L = lista.length, H = DIM / TESTE;
  // Ogni parola: il suo vettore già allenato, portato alla misura della rete, più il suo posto nella frase
  const xs = lista.map((w, i) => {
    const q = m.indice.get(w)!, v = new Float32Array(VDIM);
    for (let d = 0; d < VDIM; d++) v[d] = (m.vettori[q * VDIM + d]! / 127) * MAX_V;
    const x = lineare(m.proj, v);
    for (let d = 0; d < DIM; d++) x[d]! += m.pos[i * DIM + d]!;
    return x;
  });
  // Attenzione: ogni parola legge tutte le altre, prima e dopo di lei
  const qkv = xs.map(x => lineare(m.qkv, norma(m.n1, x)));
  const dopo = xs.map((x, i) => {
    const unito = new Float32Array(DIM);
    for (let t = 0; t < TESTE; t++) {
      const p = new Float32Array(L);
      for (let j = 0; j < L; j++) {
        let s = 0;
        for (let d = 0; d < H; d++) s += qkv[i]![t * H + d]! * qkv[j]![DIM + t * H + d]!;
        p[j] = s / Math.sqrt(H);
      }
      const a = softmax(p);
      for (let j = 0; j < L; j++) for (let d = 0; d < H; d++) unito[t * H + d]! += a[j]! * qkv[j]![DIM * 2 + t * H + d]!;
    }
    const r = lineare(m.fuori, unito), y = new Float32Array(DIM);
    for (let d = 0; d < DIM; d++) y[d] = x[d]! + r[d]!;
    const f = lineare(m.f1, norma(m.n2, y));
    for (let d = 0; d < f.length; d++) if (f[d]! < 0) f[d] = 0;
    const g = lineare(m.f2, f);
    for (let d = 0; d < DIM; d++) y[d]! += g[d]!;
    return y;
  });
  const media = new Float32Array(DIM);
  for (const y of dopo) for (let d = 0; d < DIM; d++) media[d]! += y[d]! / L;
  return lineare(m.testa, media);
}
