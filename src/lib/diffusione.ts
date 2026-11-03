// Un piccolo modello di diffusion già allenato (scripts/allena-facce.mjs): genera facce 16x16 nel browser, senza server.
// Parte da puro rumore. A ogni passo la rete indovina la faccia finita, e l'immagine si avvicina un po' a quell'ipotesi.
export const LATO = 16;
const D = LATO * LATO, T = 50, TEMPO = 4, FORMA = [D + TEMPO, 64, 64, D], SCALA = 2048;
const abar = Array.from({ length: T + 1 }, (_, t) => Math.cos(((t / T + 0.008) / 1.008) * Math.PI / 2) ** 2 / Math.cos((0.008 / 1.008) * Math.PI / 2) ** 2);

export type Modello = { pesi: Float32Array[]; scarti: Float32Array[]; uscite: Float32Array[] };
export type Generazione = {
  // stati[k]: l'immagine dopo k passi; ipotesi[k]: la faccia finita che la rete vede a quel punto; rumore[k]: quanto rumore resta, da 0 a 1
  // rumori[k]: il rumore che la rete trova nell'immagine a quel punto
  stati: Float32Array[]; ipotesi: Float32Array[]; rumori: Float32Array[]; rumore: number[];
};

export async function caricaModello(indirizzo: string): Promise<Modello> {
  const dati = new Int16Array(await (await fetch(indirizzo)).arrayBuffer());
  const pesi: Float32Array[] = [], scarti: Float32Array[] = [];
  let k = 0;
  for (let l = 1; l < FORMA.length; l++) {
    const n = FORMA[l]! * FORMA[l - 1]!, m = FORMA[l]!;
    pesi.push(Float32Array.from(dati.subarray(k, k + n), v => v / SCALA));
    k += n;
    scarti.push(Float32Array.from(dati.subarray(k, k + m), v => v / SCALA));
    k += m;
  }
  return { pesi, scarti, uscite: FORMA.map(n => new Float32Array(n)) };
}

function avanti(m: Modello, x: Float32Array, t: number) {
  const ultimo = FORMA.length - 1, u = t / T, ingresso = m.uscite[0]!;
  ingresso.set(x);
  ingresso[D] = Math.sin(Math.PI * u); ingresso[D + 1] = Math.cos(Math.PI * u); ingresso[D + 2] = Math.sin(2 * Math.PI * u); ingresso[D + 3] = Math.cos(2 * Math.PI * u);
  for (let l = 1; l <= ultimo; l++) {
    const prima = m.uscite[l - 1]!, qui = m.uscite[l]!, p = m.pesi[l - 1]!, b = m.scarti[l - 1]!, e = FORMA[l - 1]!, n = FORMA[l]!;
    for (let j = 0; j < n; j++) {
      let s = b[j]!;
      const off = j * e;
      for (let i = 0; i < e; i++) s += p[off + i]! * prima[i]!;
      qui[j] = l === ultimo ? s : s > 0 ? s : 0;
    }
  }
  return m.uscite[ultimo]!;
}

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
export const rumorePuro = () => Float32Array.from({ length: D }, gauss);

// Generazione: ogni passo salta allo stesso modo qualunque sia il numero di passi, così anche con 5 passi esce una faccia
export function genera(m: Modello, passi: number, partenza: Float32Array): Generazione {
  const tempi = Array.from({ length: passi }, (_, k) => Math.round(T - (k * T) / passi));
  const stati = [partenza.slice()], ipotesi: Float32Array[] = [], rumori: Float32Array[] = [], rumore: number[] = [];
  let x = partenza.slice();
  tempi.forEach((t, k) => {
    const o = avanti(m, x, t), a = abar[t]!, dopo = k + 1 < passi ? abar[tempi[k + 1]!]! : 1;
    const pulita = new Float32Array(D), nuovo = new Float32Array(D), trovato = new Float32Array(D);
    for (let i = 0; i < D; i++) {
      const x0 = Math.max(-1, Math.min(1, o[i]!)), eps = (x[i]! - Math.sqrt(a) * x0) / Math.sqrt(1 - a);
      pulita[i] = x0;
      trovato[i] = eps;
      nuovo[i] = Math.sqrt(dopo) * x0 + Math.sqrt(1 - dopo) * eps;
    }
    ipotesi.push(pulita);
    rumori.push(trovato);
    rumore.push(Math.sqrt(1 - a));
    stati.push(nuovo);
    x = nuovo;
  });
  ipotesi.push(x);
  rumori.push(new Float32Array(D));
  rumore.push(0);
  return { stati, ipotesi, rumori, rumore };
}
