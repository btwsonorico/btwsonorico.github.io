// Registra una volta, offline, le corse di inference della stella per l'arte «diffusione» dei biglietti di AI terms.
// Usa lo stesso modello della pagina /learn/diffusion (src/lib/spirale.ts), con le stesse impostazioni: 1.024 punti sul contorno
// della stella, gruppi da 64, 8.000 passi, Adam con lr che scende, media dei pesi. Poi fa girare l'inference e salva le posizioni.
// Uscita: src/data/diffusione-stella.ts, con le posizioni in byte (int8) codificati in base64.
// Uso: node scripts/registra-diffusione.mjs   (Node 23.6+: legge il .ts senza build)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Un caso ripetibile: lo stesso seme dà gli stessi dati, lo stesso modello e le stesse corse
let seme = 20261108;
Math.random = () => {
  seme = (seme + 0x6d2b79f5) | 0;
  let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const { abar, aggiornaMedia, allena, conMedia, gauss, indietro, nuovoModello, stella, stima, sullaForma, T } = await import('../src/lib/spirale.ts');

// Le stesse impostazioni della pagina (src/scripts/spiraleVista.ts)
const N_DATI = 1024, GRUPPO = 64, FINE = 8000, MONDO = 1.65, T_FRECCE_MAX = 44;
// Cosa si registra. Davanti: una corsa da 300 punti in 25 passi, con le frecce. Dietro: 6 corse da 160 punti in 20 passi
const N_DAVANTI = 300, PASSI_DAVANTI = 25, N_DIETRO = 160, PASSI_DIETRO = 20, CORSE_DIETRO = 6, N_FRECCE = 10;
// Un byte con segno per coordinata: da -3 a 3, un gradino ogni 0,024 circa
const SCALA = 3 / 127;
const LATO = (2 * MONDO) / N_FRECCE;

// --- Training, come il bottone «train» della pagina
const dati = stella(N_DATI), m = nuovoModello(), media = conMedia(m);
const via = performance.now();
let somma = 0;
for (let k = 0; k < FINE; k++) {
  somma += allena(m, dati, GRUPPO, 3e-3 * (1 - m.passi / FINE) + 1e-4, T);
  aggiornaMedia(m, media);
  if ((k + 1) % 1000 === 0) { console.log(`passo ${k + 1} · errore ${(somma / 1000).toFixed(3)}`); somma = 0; }
}
console.log(`training: ${((performance.now() - via) / 1000).toFixed(1)} s · sulla forma ${sullaForma(media, dati, 300, 20)}%`);

// --- Inference: i tempi come in pagina, da T a 0 in parti uguali
const tempiDi = passi => [...Array.from({ length: passi }, (_, k) => Math.round(T - (k * T) / passi)), 0];
const quota = t => Math.sqrt(1 - abar[t]);
const byte = v => Math.max(-127, Math.min(127, Math.round(v / SCALA)));

// Una corsa: per ogni passo, tutte le posizioni. frame 0 è il rumore puro
function corsa(n, passi) {
  const tempi = tempiDi(passi), p = Float32Array.from({ length: n * 2 }, () => gauss()), uscita = new Int8Array((passi + 1) * n * 2);
  const salva = k => { for (let i = 0; i < n * 2; i++) uscita[k * n * 2 + i] = byte(p[i]); };
  salva(0);
  for (let k = 0; k < passi; k++) {
    for (let i = 0; i < n; i++) [p[i * 2], p[i * 2 + 1]] = indietro(media, p[i * 2], p[i * 2 + 1], tempi[k], tempi[k + 1]);
    salva(k + 1);
  }
  // Quanti punti finali stanno sulla stella, per controllo
  let vicini = 0;
  for (let i = 0; i < n; i++) {
    let d = 9;
    for (let j = 0; j < N_DATI; j++) d = Math.min(d, (p[i * 2] - dati[j * 2]) ** 2 + (p[i * 2 + 1] - dati[j * 2 + 1]) ** 2);
    if (d < 0.0049) vicini++;
  }
  console.log(`corsa da ${n} punti in ${passi} passi: ${Math.round((vicini / n) * 100)}% sulla stella`);
  return { tempi, uscita };
}

// Le frecce della pagina: da ogni maglia verso il punto pulito stimato, già accorciate come le disegna la pagina, in frazioni di maglia
function frecce(tempi) {
  const uscita = new Int8Array(tempi.length * N_FRECCE * N_FRECCE * 2), lim = v => Math.max(-MONDO, Math.min(MONDO, v));
  tempi.forEach((t, f) => {
    const q = Math.min(t, T_FRECCE_MAX), a = abar[q], sa = Math.sqrt(a), sb = Math.sqrt(1 - a);
    for (let r = 0, i = f * N_FRECCE * N_FRECCE * 2; r < N_FRECCE; r++) for (let k = 0; k < N_FRECCE; k++, i += 2) {
      const x = -MONDO + (k + 0.5) * LATO, y = -MONDO + (r + 0.5) * LATO;
      if (q === 0) { uscita[i] = uscita[i + 1] = 0; continue; }
      const [e0, e1] = stima(media, x, y, q), dx = lim((x - sb * e0) / sa) - x, dy = lim((y - sb * e1) / sa) - y, d = Math.hypot(dx, dy) || 1, l = Math.min(0.8 * LATO, d * 0.6);
      uscita[i] = Math.round(((dx / d) * l / LATO) * 127);
      uscita[i + 1] = Math.round(((dy / d) * l / LATO) * 127);
    }
  });
  return uscita;
}

const davanti = corsa(N_DAVANTI, PASSI_DAVANTI), frecceDavanti = frecce(davanti.tempi);
const dietro = Array.from({ length: CORSE_DIETRO }, () => corsa(N_DIETRO, PASSI_DIETRO));

const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const quote = tempi => `[${tempi.map(t => quota(t).toFixed(3)).join(', ')}]`;
const testo = `// Generato da scripts/registra-diffusione.mjs: non modificare a mano.
// Corse di inference vere del modello di /learn/diffusion, allenato sulla stella (${FINE} passi, gruppi da ${GRUPPO}).
// Ogni coordinata è un byte con segno (int8) in base64: valore = byte × SCALA. Ordine: frame, punto, x/y.
// Le frecce sono in frazioni di maglia: valore = byte / 127 × LATO_FRECCE.
export const SCALA = ${SCALA};
export const MONDO = ${MONDO};
export const N_FRECCE = ${N_FRECCE};
export const LATO_FRECCE = ${LATO};

// Davanti: una corsa da ${N_DAVANTI} punti in ${PASSI_DAVANTI} passi. QUOTE: il rumore rimasto a ogni frame, da 1 a 0
export const DAVANTI = {
  n: ${N_DAVANTI},
  passi: ${PASSI_DAVANTI},
  quote: ${quote(davanti.tempi)},
  punti: '${b64(davanti.uscita)}',
  frecce: '${b64(frecceDavanti)}',
};

// Dietro: ${CORSE_DIETRO} corse da ${N_DIETRO} punti in ${PASSI_DIETRO} passi, ognuna dal suo rumore
export const DIETRO = {
  n: ${N_DIETRO},
  passi: ${PASSI_DIETRO},
  quote: ${quote(dietro[0].tempi)},
  corse: [
${dietro.map(d => `    '${b64(d.uscita)}',`).join('\n')}
  ],
};
`;
const dove = fileURLToPath(new URL('../src/data/diffusione-stella.ts', import.meta.url));
writeFileSync(dove, testo);
console.log(`scritto ${dove}: ${(Buffer.byteLength(testo) / 1024).toFixed(1)} KB`);
