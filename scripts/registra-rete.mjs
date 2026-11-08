// Registra l'arte «rete» dei biglietti di AI terms: la rete più grande della pagina /learn/neural-network (4 strati da 6 neuroni)
// impara la casa e il pesce. Per ogni forma salva poche fotografie della griglia a filo, dall'inizio alla fine dell'allenamento.
// Il biglietto non allena e non calcola la rete: passa solo da una fotografia all'altra.
// Si lancia con: node scripts/registra-rete.mjs   (scrive src/scripts/arteReteDati.ts)
import { writeFileSync } from 'node:fs';
import { avanti, nuovaRete, passo } from '../src/lib/rete.ts';

// Gli stessi numeri della pagina (src/scripts/reteVista.ts)
const G = 32, GRUPPO = 64, TASSO = 0.03, TASSO_FINE = 0.01, RALLENTA = 12000, FINE = 20000;
const STRATI = [6, 6, 6, 6];
// Griglia del biglietto: meno maglie della pagina, così il filo resta leggibile in piccolo
const MAGLIE = { house: 18, fish: 22 };
// Le tappe: fitte all'inizio, quando la forma cambia di più
const TAPPE = [0, 40, 100, 200, 350, 550, 800, 1150, 1600, 2200, 3000, 4200, 6000, 8500, 12000, 20000];
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
  const rete = nuovaRete(STRATI, 'tanh', seme), M = MAGLIE[nome], foto = [];
  const fotografa = () => {
    const b = new Uint8Array((M + 1) * (M + 1));
    for (let j = 0; j <= M; j++) for (let i = 0; i <= M; i++) b[j * (M + 1) + i] = Math.round(avanti(rete, -1 + (2 * i) / M, 1 - (2 * j) / M) * 255);
    return b;
  };
  let passi = 0;
  for (const tappa of TAPPE) {
    while (passi < tappa) {
      const g = [];
      for (let k = 0; k < GRUPPO; k++) { const a = k % 2 ? pieni : vuoti; g.push(a[Math.floor(r() * a.length)]); }
      passo(rete, g, passi < RALLENTA ? TASSO : TASSO_FINE);
      passi++;
    }
    foto.push(fotografa());
  }
  return { foto, match: somiglianza(rete, celle) };
}

const uscita = {};
for (const nome of ['house', 'fish']) {
  let meglio = null;
  for (const seme of SEMI) {
    const q = registra(nome, seme);
    console.log(`${nome} seme ${seme}: match ${(q.match * 100).toFixed(1)}%`);
    if (!meglio || q.match > meglio.match) meglio = { ...q, seme };
  }
  console.log(`${nome}: scelto il seme ${meglio.seme}, match ${(meglio.match * 100).toFixed(1)}%`);
  const tutto = new Uint8Array(meglio.foto.reduce((a, b) => a + b.length, 0));
  let k = 0;
  for (const b of meglio.foto) { tutto.set(b, k); k += b.length; }
  uscita[nome] = { maglie: MAGLIE[nome], foto: meglio.foto.length, match: Math.round(meglio.match * 1000) / 1000, dati: Buffer.from(tutto).toString('base64') };
}

const testo = `// File generato da scripts/registra-rete.mjs: non modificarlo a mano.
// La rete [2, ${STRATI.join(', ')}, 1] allenata come nella pagina /learn/neural-network. Per ogni forma: ${TAPPE.length} fotografie della griglia,
// ai passi ${TAPPE.join(', ')}; ogni fotografia ha (maglie + 1)² altezze da 0 a 255, riga per riga dall'alto
export const TAPPE_RETE = [${TAPPE.join(', ')}];
export const DATI_RETE = {
${Object.entries(uscita).map(([n, q]) => `  ${n}: { maglie: ${q.maglie}, foto: ${q.foto}, match: ${q.match}, dati: '${q.dati}' },`).join('\n')}
} as const;
`;
writeFileSync(new URL('../src/scripts/arteReteDati.ts', import.meta.url), testo);
console.log(`scritto src/scripts/arteReteDati.ts, ${testo.length} caratteri`);
