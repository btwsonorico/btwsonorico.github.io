// Registra una volta, offline, quello che la tela di /learn/diffusion mostra con la stella, per l'arte «diffusione» dei biglietti di AI terms.
// Usa lo stesso modello e lo stesso ciclo della pagina (src/lib/spirale.ts, src/scripts/spiraleVista.ts), con un orologio finto a 60 fps:
// - davanti (training, bottone «train»): 8.000 passi in 30 s, il ritmo che la pagina dichiara. Si salvano i dati veri, le frecce a ogni
//   ricalcolo della pagina (ogni 200 ms; dopo i primi 5 s una su tre), un racconto ogni 1,1 s (il punto vero, il suo cammino di rumore
//   passo dopo passo, l'ipotesi della rete e il suo errore), l'errore medio ogni 100 passi e «on shape» ogni 500;
// - dietro (inference, bottone «generate» a 20 passi): 300 punti dal rumore alla stella, con le frecce di ogni passo.
// Uscita: src/data/diffusione-stella.ts, con posizioni e frecce in byte (int8) codificati in base64.
// Uso: node scripts/registra-diffusione.mjs   (Node 23.6+: legge il .ts senza build)
import { renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Un caso ripetibile: lo stesso seme dà gli stessi dati, lo stesso modello e le stesse corse
let seme = 20261108;
Math.random = () => {
  seme = (seme + 0x6d2b79f5) | 0;
  let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const { abar, aggiornaMedia, allena, conMedia, errorePiuBasso, gauss, indietro, nuovoModello, stella, stima, sullaForma, T } = await import('../src/lib/spirale.ts');

// Le stesse impostazioni della pagina (src/scripts/spiraleVista.ts)
const N_DATI = 1024, N_NUOVI = 300, GRUPPO = 64, FINE = 8000, MONDO = 1.65, N_FRECCE = 14, T_ALLENA = 12, T_FRECCE_MAX = 44, OGNI_FRECCE = 200, RACCONTO = 1100, PASSI_NUOVI = 20;
// Il ritmo: la pagina dice «in about 30 seconds». L'orologio finto va a 60 fps
const DURATA = 30000, FPS = 60, DT = 1000 / FPS;
// Le frecce salvate: tutte nei primi 5 s, quando cambiano di più; dopo, una ogni 550 ms almeno
const FRECCE_FITTE = 5000, FRECCE_RADE = 550;
const LATO = (2 * MONDO) / N_FRECCE;
const lim = v => Math.max(-MONDO, Math.min(MONDO, v));
const quota = t => Math.sqrt(1 - abar[t]);
const int8 = (v, s) => Math.max(-127, Math.min(127, Math.round(v / s)));
const tondo = (v, n = 3) => Number(v.toFixed(n));

// --- Le frecce della pagina (calcolaFrecce + il disegno): da ogni maglia verso il punto pulito stimato, già accorciate come le
// disegna la pagina, in 127esimi di maglia
function frecce(media, t) {
  const q = Math.min(t, T_FRECCE_MAX), a = abar[q], sa = Math.sqrt(a), sb = Math.sqrt(1 - a), uscita = new Int8Array(N_FRECCE * N_FRECCE * 2);
  for (let r = 0, i = 0; r < N_FRECCE; r++) for (let k = 0; k < N_FRECCE; k++, i += 2) {
    const x = -MONDO + (k + 0.5) * LATO, y = -MONDO + (r + 0.5) * LATO, [e0, e1] = stima(media, x, y, q);
    const dx = lim((x - sb * e0) / sa) - x, dy = lim((y - sb * e1) / sa) - y, d = Math.hypot(dx, dy) || 1, l = Math.min(0.8 * LATO, d * 0.6);
    uscita[i] = Math.round(((dx / d) * l / LATO) * 127);
    uscita[i + 1] = Math.round(((dy / d) * l / LATO) * 127);
  }
  return uscita;
}

// --- Training, come il bottone «train» della pagina
const dati = stella(N_DATI), m = nuovoModello(), media = conMedia(m), minimo = errorePiuBasso(dati, T);
const storia = [], buoni = [], instantanee = [], racconti = [];
let somma = 0, conta = 0, ora = 0, racconto = null, oraFrecce = -Infinity, ultimaSalvata = -Infinity;
const allenaUno = () => {
  somma += allena(m, dati, GRUPPO, 3e-3 * (1 - m.passi / FINE) + 1e-4, T);
  aggiornaMedia(m, media);
  if (++conta === 100) { storia.push(tondo(somma / conta)); somma = conta = 0; }
  if (m.passi % 500 === 0) buoni.push(sullaForma(media, dati));
};
const calcolaFrecce = (fine = false) => {
  oraFrecce = ora;
  if (!fine && ora < ultimaSalvata + (ora < FRECCE_FITTE ? 0 : FRECCE_RADE)) return;
  ultimaSalvata = ora;
  instantanee.push({ ms: Math.round(ora), f: frecce(media, T_ALLENA) });
};
// Un racconto come nuovoRacconto: un punto vero, il suo rumore passo dopo passo (un gauss nuovo a ogni passo)
function nuovoRacconto() {
  const i = Math.floor(Math.random() * N_DATI), t = 1 + Math.floor(Math.random() * T), cammino = [dati[i * 2], dati[i * 2 + 1]];
  let x = cammino[0], y = cammino[1];
  for (let k = 1; k <= t; k++) {
    const beta = 1 - abar[k] / abar[k - 1], s = Math.sqrt(1 - beta), r = Math.sqrt(beta);
    x = s * x + r * gauss(); y = s * y + r * gauss();
    cammino.push(x, y);
  }
  racconto = { inizio: ora, i, t, cammino, guess: null, errore: 0 };
  racconti.push(racconto);
}
// Come indovina: l'ipotesi della rete sul punto pulito, con i pesi di quel momento
function indovina(r) {
  const n = r.cammino.length, x = r.cammino[n - 2], y = r.cammino[n - 1], a = abar[r.t], sa = Math.sqrt(a), sb = Math.sqrt(1 - a), [e0, e1] = stima(media, x, y, r.t);
  r.guess = [lim((x - sb * e0) / sa), lim((y - sb * e1) / sa)];
  const veri0 = (x - sa * dati[r.i * 2]) / sb, veri1 = (y - sa * dati[r.i * 2 + 1]) / sb;
  r.errore = ((e0 - veri0) ** 2 + (e1 - veri1) ** 2) / 2;
}

// Il clic: le frecce si calcolano subito (non si vedono finché i passi sono 0). Poi il ciclo della pagina, un frame alla volta
calcolaFrecce();
const via = performance.now();
while (m.passi < FINE) {
  ora += DT;
  const voluti = Math.min(FINE, Math.floor((ora / DURATA) * FINE));
  while (m.passi < voluti) allenaUno();
  if (m.passi >= FINE) racconto = null;
  else if (!racconto || ora - racconto.inizio > RACCONTO) nuovoRacconto();
  if (ora - oraFrecce > OGNI_FRECCE || m.passi >= FINE) calcolaFrecce(m.passi >= FINE);
  if (racconto && (ora - racconto.inizio) / RACCONTO >= 0.5 && !racconto.guess) indovina(racconto);
}
// L'ultimo racconto si interrompe con la fine del training: la sua ipotesi non si vede, ma si calcola lo stesso
for (const r of racconti) if (!r.guess) indovina(r);
const fineMs = Math.round(ora);
console.log(`training: ${((performance.now() - via) / 1000).toFixed(1)} s · errore ${storia.at(-1)} · minimo ${minimo.toFixed(3)} · on shape ${buoni.at(-1)}% · ${instantanee.length} frecce · ${racconti.length} racconti`);

// --- Inference, come il bottone «generate» a 20 passi: i tempi da T a 0 in parti uguali
const tempi = [...Array.from({ length: PASSI_NUOVI }, (_, k) => Math.round(T - (k * T) / PASSI_NUOVI)), 0];
const p = Float32Array.from({ length: N_NUOVI * 2 }, () => gauss()), fotogrammi = [p.slice()];
for (let k = 0; k < PASSI_NUOVI; k++) {
  for (let i = 0; i < N_NUOVI; i++) [p[i * 2], p[i * 2 + 1]] = indietro(media, p[i * 2], p[i * 2 + 1], tempi[k], tempi[k + 1]);
  fotogrammi.push(p.slice());
}
let vicini = 0;
for (let i = 0; i < N_NUOVI; i++) {
  let d = 9;
  for (let j = 0; j < N_DATI; j++) d = Math.min(d, (p[i * 2] - dati[j * 2]) ** 2 + (p[i * 2 + 1] - dati[j * 2 + 1]) ** 2);
  if (d < 0.0049) vicini++;
}
console.log(`inference: ${N_NUOVI} punti in ${PASSI_NUOVI} passi, ${Math.round((vicini / N_NUOVI) * 100)}% sulla stella`);

// --- Codifica. Ogni fotogramma dell'inference ha la sua scala: con meno rumore i punti stanno più stretti e il byte è più fine
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const unisci = parti => { const u = new Int8Array(parti.reduce((s, a) => s + a.length, 0)); let o = 0; for (const a of parti) { u.set(a, o); o += a.length; } return u; };
const SCALA_DATI = 1.2 / 127, SCALA_CAMMINO = 3.5 / 127;
const scale = fotogrammi.map(f => tondo(f.reduce((s, v) => Math.max(s, Math.abs(v)), 0) / 127, 5));
const punti = unisci(fotogrammi.map((f, k) => Int8Array.from(f, v => int8(v, scale[k]))));
// Le frecce dell'inference: dopo il passo k la pagina le ricalcola al livello tempi[k]; all'ultimo passo restano quelle di prima
const frecceNuovi = unisci(tempi.slice(0, PASSI_NUOVI).map(t => frecce(media, t)));
const cammini = unisci(racconti.map(r => Int8Array.from(r.cammino, v => int8(v, SCALA_CAMMINO))));

const testo = `// Generato da scripts/registra-diffusione.mjs: non modificare a mano.
// Quello che la tela di /learn/diffusion mostra con la stella, registrato con lo stesso modello e lo stesso ciclo della pagina.
// Byte con segno (int8) in base64. Frecce: già accorciate come le disegna la pagina, valore = byte / 127 × lato della maglia.
export const MONDO = ${MONDO};
export const N_FRECCE = ${N_FRECCE};
export const T_ALLENA = ${T_ALLENA};

// Davanti (training, ${FINE} passi in ${DURATA / 1000} s). DATI: i ${N_DATI} punti veri, x/y × ${SCALA_DATI}.
// FRECCE: istantanee a T_ALLENA, ognuna valida da MS[k] alla successiva. RACCONTI: [ms d'inizio, indice del punto vero, t, ipotesi x, y,
// errore]; CAMMINI: i loro cammini di rumore (t + 1 punti x/y, × ${SCALA_CAMMINO}), uno dopo l'altro. STORIA: l'errore medio ogni 100 passi.
// BUONI: «on shape» ogni 500 passi. MINIMO: l'errore più basso possibile (la riga tratteggiata)
export const TRAINING = {
  fine: ${FINE},
  durata: ${fineMs},
  scalaDati: ${SCALA_DATI},
  dati: '${b64(Int8Array.from(dati, v => int8(v, SCALA_DATI)))}',
  ms: [${instantanee.map(s => s.ms).join(', ')}],
  frecce: '${b64(unisci(instantanee.map(s => s.f)))}',
  racconto: ${RACCONTO},
  racconti: [${racconti.map(r => `[${Math.round(r.inizio)}, ${r.i}, ${r.t}, ${tondo(r.guess[0])}, ${tondo(r.guess[1])}, ${tondo(r.errore)}]`).join(', ')}],
  scalaCammino: ${SCALA_CAMMINO},
  cammini: '${b64(cammini)}',
  storia: [${storia.join(', ')}],
  buoni: [${buoni.join(', ')}],
  minimo: ${tondo(minimo)},
};

// Dietro (inference, ${PASSI_NUOVI} passi). TEMPI: il livello t di ogni passo, da ${T} a 0. PUNTI: ${PASSI_NUOVI + 1} fotogrammi da ${N_NUOVI} punti x/y,
// valore = byte × SCALE[fotogramma]. FRECCE: ${PASSI_NUOVI} istantanee, al livello TEMPI[k]
export const INFERENCE = {
  n: ${N_NUOVI},
  passi: ${PASSI_NUOVI},
  durata: 3200,
  tempi: [${tempi.join(', ')}],
  quote: [${tempi.map(t => quota(t).toFixed(4)).join(', ')}],
  scale: [${scale.join(', ')}],
  punti: '${b64(punti)}',
  frecce: '${b64(frecceNuovi)}',
};
`;
const dove = fileURLToPath(new URL('../src/data/diffusione-stella.ts', import.meta.url));
// File temporaneo + rinomina: il dev server non legge mai un file a metà
writeFileSync(dove + '.tmp', testo);
renameSync(dove + '.tmp', dove);
console.log(`scritto ${dove}: ${(Buffer.byteLength(testo) / 1024).toFixed(1)} KB`);
