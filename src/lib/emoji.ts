// L'autotagger, già allenato (scripts/allena-emoji.py): un encoder minuscolo scritto a mano, che gira nel browser senza server.
// Legge una frase e dà una probabilità a ognuna delle 50 emoji. Forma e ordine dei pesi sono gli stessi dello script.
const SECCHI = 4096, DIM = 48, TESTE = 2, POS = 16, MAX_PAROLE = 16, SCALA = 2048, CLASSI = 50;

type Lineare = { w: Float32Array; b: Float32Array; i: number; o: number };
type Norma = { w: Float32Array; b: Float32Array };
export type Modello = { emb: Float32Array; pos: Float32Array; n1: Norma; qkv: Lineare; fuori: Lineare; n2: Norma; f1: Lineare; f2: Lineare; testa: Lineare };

export function modelloDa(dati: ArrayBuffer): Modello {
  const interi = new Int16Array(dati);
  let k = 0;
  const prendi = (n: number) => { const p = Float32Array.from(interi.subarray(k, k + n), v => v / SCALA); k += n; return p; };
  const lin = (i: number, o: number): Lineare => ({ w: prendi(i * o), b: prendi(o), i, o });
  const norma = (): Norma => ({ w: prendi(DIM), b: prendi(DIM) });
  return { emb: prendi(SECCHI * DIM), pos: prendi(POS * DIM), n1: norma(), qkv: lin(DIM, DIM * 3), fuori: lin(DIM, DIM), n2: norma(), f1: lin(DIM, DIM * 2), f2: lin(DIM * 2, DIM), testa: lin(DIM, CLASSI) };
}

export const parole = (t: string) => (t.toLowerCase().match(/[a-z0-9']+/g) ?? []).slice(0, MAX_PAROLE);

const fnv = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h % SECCHI;
};
// Una parola diventa i suoi pezzi di tre lettere più la parola intera: così «run» e «running» si somigliano
const pezzi = (w: string) => {
  const g = `<${w}>`, p = [fnv(w)];
  for (let i = 0; i + 3 <= g.length; i++) p.push(fnv(g.slice(i, i + 3)));
  return p;
};

function lineare(l: Lineare, x: Float32Array, da = 0) {
  const y = new Float32Array(l.o);
  for (let j = 0; j < l.o; j++) {
    let s = l.b[j]!;
    for (let i = 0; i < l.i; i++) s += l.w[j * l.i + i]! * x[da + i]!;
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

// I punteggi delle 50 emoji per una lista di parole
export function punteggi(m: Modello, lista: string[]) {
  const ws = lista.length ? lista : ['?'], L = ws.length, H = DIM / TESTE;
  // Ogni parola: la media dei suoi pezzi, più il suo posto nella frase
  const xs = ws.map((w, i) => {
    const x = new Float32Array(DIM), p = pezzi(w);
    for (const q of p) for (let d = 0; d < DIM; d++) x[d]! += m.emb[q * DIM + d]! / p.length;
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
