// Registra l'arte «rete» dei biglietti di AI terms: la rete più grande della pagina /learn/neural-network (4 strati da 6 neuroni)
// impara la casa e il pesce. Per ogni forma salva la griglia come la pagina la mostra mentre allena: un fotogramma ogni 1/30 di
// secondo alla velocità della pagina (800 correzioni al secondo), con i pesi del momento. Così si vede anche il tremolio delle correzioni.
// Il biglietto non allena e non calcola la rete: mostra i fotogrammi uno dopo l'altro.
// Si lancia con: node scripts/registra-rete.mjs   (scrive src/scripts/arteReteDati.ts)
import { writeFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { avanti, nuovaRete, passo } from '../src/lib/rete.ts';

// Gli stessi numeri della pagina (src/scripts/reteVista.ts)
const G = 32, GRUPPO = 64, TASSO = 0.03, TASSO_FINE = 0.01, RALLENTA = 12000, FINE = 20000, PASSI_AL_SECONDO = 800;
const STRATI = [6, 6, 6, 6];
// Il biglietto disegna a 30 fotogrammi al secondo: un fotogramma ogni 800 / 30 correzioni, come la pagina nello stesso tempo
const AL_SECONDO = 30, PAGINA = 200;
// Griglia del biglietto: meno maglie della pagina, così il filo resta leggibile in piccolo
const MAGLIE = { house: 18, fish: 22 };
// Le tappe: 200 fotogrammi al passo della pagina (circa 6,7 secondi), poi la fine dell'allenamento più in fretta, fino a 20000
const TAPPE = [
  ...Array.from({ length: PAGINA }, (_, k) => Math.round((k * PASSI_AL_SECONDO) / AL_SECONDO)),
  6000, 6700, 7500, 8400, 9400, 10500, 11700, 13000, 14400, 15900, 17500, FINE,
];
const SEMI = [3, 5, 7, 11, 13, 17, 19, 23];

const triangolo = (x, y, ax, ay, bx, by, cx, cy) => {
  const lato = (px, py, qx, qy) => (x - qx) * (py - qy) - (px - qx) * (y - qy);
  const d1 = lato(ax, ay, bx, by), d2 = lato(bx, by, cx, cy), d3 = lato(cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
const SAGOME = {
  fish: (x, y) => ((x + 0.18) / 0.58) ** 2 + (y / 0.3) ** 2 < 1
    || triangolo(x, y, 0.3, 0, 0.88, 0.5, 0.62, 0) || triangolo(x, y, 0.3, 0, 0.88, -0.5, 0.62, 0)
    || triangolo(x, y, -0.45, 0.22, 0.05, 0.22, -0.28, 0.66) || triangolo(x, y, -0.2, -0.22, 0.1, -0.22, 0.04, -0.58),
  house: (x, y) => triangolo(x, y, -0.85, 0.08, 0.85, 0.08, 0, 0.88) || (Math.abs(x) < 0.6 && y <= 0.08 && y > -0.85 && !(Math.abs(x) < 0.17 && y < -0.3)),
};
const posto = k => ((k + 0.5) / G) * 2 - 1;

// Generatore ripetibile per i gruppi di punti, così la registrazione è sempre la stessa
const casuale = seme => () => {
  seme = (seme + 0x6d2b79f5) | 0;
  let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const somiglianza = (rete, celle) => {
  let e = 0, u = 0;
  for (const q of celle) { const p = avanti(rete, q.x, q.y) >= 0.5; if (p && q.c) e++; if (p || q.c) u++; }
  return u ? e / u : 0;
};

function registra(nome, seme) {
  const f = SAGOME[nome], celle = [];
  for (let r = 0; r < G; r++) for (let q = 0; q < G; q++) { const x = posto(q), y = -posto(r); celle.push({ x, y, c: f(x, y) ? 1 : 0 }); }
  const pieni = celle.filter(q => q.c), vuoti = celle.filter(q => !q.c), r = casuale(seme * 7919);
  const rete = nuovaRete(STRATI, 'tanh', seme), M = MAGLIE[nome], punti = (M + 1) ** 2, foto = new Uint8Array(TAPPE.length * punti);
  let passi = 0;
  TAPPE.forEach((tappa, n) => {
    // Come la pagina: metà dei punti dentro la sagoma, metà fuori
    while (passi < tappa) {
      const g = [];
      for (let k = 0; k < GRUPPO; k++) { const a = k % 2 ? pieni : vuoti; g.push(a[Math.floor(r() * a.length)]); }
      passo(rete, g, passi < RALLENTA ? TASSO : TASSO_FINE);
      passi++;
    }
    // I pesi del momento, senza medie: il fotogramma è quello che la pagina disegnerebbe adesso
    for (let j = 0; j <= M; j++) for (let i = 0; i <= M; i++) foto[n * punti + j * (M + 1) + i] = Math.round(avanti(rete, -1 + (2 * i) / M, 1 - (2 * j) / M) * 255);
  });
  return { foto, punti, match: somiglianza(rete, celle) };
}

// Ogni fotogramma si salva come differenza dal fotogramma prima, poi tutto si comprime: le celle ferme diventano zeri
function comprimi({ foto, punti }) {
  const d = new Uint8Array(foto.length);
  for (let k = 0; k < foto.length; k++) d[k] = (foto[k] - (k >= punti ? foto[k - punti] : 0)) & 255;
  return deflateRawSync(d, { level: 9 });
}

const uscita = {};
for (const nome of ['house', 'fish']) {
  let meglio = null;
  for (const seme of SEMI) {
    const q = registra(nome, seme);
    console.log(`${nome} seme ${seme}: match ${(q.match * 100).toFixed(1)}%`);
    if (!meglio || q.match > meglio.match) meglio = { ...q, seme };
  }
  const z = comprimi(meglio);
  console.log(`${nome}: scelto il seme ${meglio.seme}, match ${(meglio.match * 100).toFixed(1)}%, ${meglio.foto.length} byte, compressi ${z.length}`);
  uscita[nome] = { maglie: MAGLIE[nome], foto: TAPPE.length, match: Math.round(meglio.match * 1000) / 1000, dati: z.toString('base64') };
}

const testo = `// File generato da scripts/registra-rete.mjs: non modificarlo a mano.
// La rete [2, ${STRATI.join(', ')}, 1] allenata come nella pagina /learn/neural-network. Per ogni forma: ${TAPPE.length} fotogrammi della griglia.
// I primi ${PAGINA} vanno a ${AL_SECONDO} al secondo, un fotogramma ogni ${PASSI_AL_SECONDO / AL_SECONDO} correzioni come nella pagina; gli altri arrivano a ${FINE} correzioni.
// Ogni fotogramma ha (maglie + 1)² altezze da 0 a 255, riga per riga dall'alto, salvate come differenza dal fotogramma prima (modulo 256),
// poi compresse con deflate-raw e scritte in base64
export const TAPPE_RETE = [${TAPPE.join(', ')}];
export const FOTOGRAMMI_AL_SECONDO = ${AL_SECONDO};
export const DATI_RETE = {
${Object.entries(uscita).map(([n, q]) => `  ${n}: { maglie: ${q.maglie}, foto: ${q.foto}, match: ${q.match}, dati: '${q.dati}' },`).join('\n')}
} as const;
`;
writeFileSync(new URL('../src/scripts/arteReteDati.ts', import.meta.url), testo);
console.log(`scritto src/scripts/arteReteDati.ts, ${testo.length} caratteri`);
