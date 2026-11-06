// Gli stili del biglietto di AI terms. Ogni biglietto ne pesca uno a caso, e dentro lo stile una variante (colori,
// elementi), così due biglietti non sono mai uguali. La struttura è la stessa per tutti: davanti la domanda, dietro la
// definizione. Uno stile dà solo l'arte (colonna a sinistra davanti, poster dietro) e le variabili di colore; il resto
// lo fa il CSS con la classe stile-<id>. Il catalogo completo sta nella libreria dei biglietti (artifact).
// Niente testo delle note entra qui, tranne dove passa da esc().
import { arteDavanti, poster, tipo, type Livello } from './arteBiglietti';

export type Contesto = { sezione: number; livello: Livello; numero: string; termine: string; sera: boolean; r: () => number };
export type Stile = {
  id: string;
  davanti: (c: Contesto) => string;
  dietro: (c: Contesto) => string;
  variabili: (c: Contesto) => Record<string, string>;
  // Gli stili ASCII disegnano su tela, fotogramma per fotogramma
  ascii?: boolean;
};

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
let uid = 0;
const scegli = <T>(a: readonly T[], r: () => number) => a[Math.floor(r() * a.length)]!;
export const casoDa = (seme: number) => () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };
// Una scelta fatta una volta per biglietto (per generatore): davanti, dietro e colori la condividono
const scelte = new WeakMap<() => number, Map<string, unknown>>();
const una = <T>(c: Contesto, chiave: string, f: () => T): T => {
  let m = scelte.get(c.r); if (!m) { m = new Map(); scelte.set(c.r, m); }
  if (!m.has(chiave)) m.set(chiave, f());
  return m.get(chiave) as T;
};

// ---------------- B · 70s Rapid: il primo stile, la carta della sezione e l'oggetto della tecnologia
const rapid: Stile = {
  id: 'rapid',
  davanti: c => arteDavanti(c.sezione, c.livello),
  dietro: c => poster(c.sezione, c.livello, c.sera),
  variabili: c => { const t = tipo(c.sezione); return { '--carta': t.carta, '--c1': t.a, '--c2': t.b, '--tagliando': t.tagliando }; },
};

// ---------------- D · Lime Bloom: griglia nera, una fioritura morbida con la grana, fogliame a pixel, serif piccolo
const FIORI = [['#e9ffb0', '#b9f04a', '#5d8a1e'], ['#d6fbff', '#4ae0f0', '#1d6a7a'], ['#fff0c0', '#f5b13a', '#8a5a14'], ['#ffe0f2', '#ff6fb8', '#8a2a5a'], ['#ece0ff', '#a77bff', '#4a2a8a']] as const;
const pixel = (r: () => number, f: readonly string[], k: number) => {
  let o = '';
  for (let y = 0; y < 40; y++) for (let x = 0; x < 30; x++) {
    const v = Math.sin(x * 0.5 + k) * Math.cos(y * 0.33 - k) + Math.sin((x + y) * 0.21 + k * 2) * 0.8 + r() * 0.9 - 0.45;
    if (v > 0.15) o += `<rect x="${x}" y="${y}" width=".82" height=".82" fill="${v > 0.9 ? f[0] : v > 0.5 ? f[1] : f[2]}"/>`;
  }
  return `<svg viewBox="0 0 30 40" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="30" height="40" fill="#0d140a"/>${o}</svg>`;
};
const lime: Stile = {
  id: 'lime',
  davanti: c => { const f = una(c, 'fiore', () => scegli(FIORI, c.r)), k = c.r() * 6; return `<div class="fiore"></div><div class="pixel" style="left:8%;top:9%">${pixel(c.r, f, k)}</div><div class="pixel" style="left:46%;top:48%;width:44%">${pixel(c.r, f, k + 2)}</div><i class="tick" style="left:8%;top:9%"></i><i class="tick" style="left:46%;top:48%"></i>`; },
  dietro: c => { const f = una(c, 'fiore', () => scegli(FIORI, c.r)); return `<div class="fiore"></div><div class="pixel" style="left:12%;top:12%;width:58%">${pixel(c.r, f, c.r() * 6)}</div><i class="tick" style="left:12%;top:12%"></i>`; },
  variabili: c => { const f = una(c, 'fiore', () => scegli(FIORI, c.r)); return { '--f1': f[0], '--f2': f[1], '--f3': f[2] }; },
};

// ---------------- E · Swiss Transit: griglia stretta, nero e un colore segnale, numero enorme, la linea con le fermate
const SEGNALI = ['#e30613', '#0057b8', '#00965e', '#ff6a13', '#111111'] as const;
const PITTOGRAMMI: ((s: string) => string)[] = [
  s => `<circle cx="100" cy="80" r="56" fill="none" stroke="#111" stroke-width="10"/><rect x="92" y="66" width="16" height="50" fill="${s}"/><circle cx="100" cy="48" r="9" fill="${s}"/>`,
  s => `<path d="M100 18 C106 62 118 74 162 80 C118 86 106 98 100 142 C94 98 82 86 38 80 C82 74 94 62 100 18 Z" fill="${s}"/><circle cx="150" cy="34" r="10" fill="#111"/>`,
  s => `<path d="M100 30 V140 M70 140 H130" stroke="#111" stroke-width="8"/><g transform="rotate(-12 100 40)"><path d="M30 40 H170" stroke="#111" stroke-width="8"/><path d="M30 40 L14 86 H46 Z" fill="${s}"/><path d="M170 40 L154 86 H186 Z" fill="#111"/></g><circle cx="100" cy="30" r="9" fill="${s}"/>`,
  s => `<path d="M30 30 H170 V110 H90 L56 142 V110 H30 Z" fill="none" stroke="#111" stroke-width="10" stroke-linejoin="round"/><rect x="56" y="58" width="88" height="10" fill="${s}"/><rect x="56" y="80" width="58" height="10" fill="${s}"/>`,
  s => `<circle cx="100" cy="80" r="40" fill="none" stroke="#111" stroke-width="22" stroke-dasharray="16 10"/><circle cx="100" cy="80" r="18" fill="${s}"/>`,
  s => `<g stroke-width="16" stroke-linecap="square"><path d="M100 22 V138" stroke="#111"/><path d="M50 51 L150 109" stroke="${s}"/><path d="M150 51 L50 109" stroke="#111"/></g>`,
];
const swiss: Stile = {
  id: 'swiss',
  davanti: c => { const seg = una(c, 'segnale', () => scegli(SEGNALI, c.r)), st = ['ASK', 'DEF', 'GEN', 'PRM', 'OPS', 'RSK'], fine = (c.sezione + 1) % st.length || 1; return `<div class="enorme">${esc(c.numero)}</div><svg class="linea" viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true"><path d="M8 12 H292" stroke="#111" stroke-width="5"/>${st.map((n, i) => { const x = 8 + i * 56.8, ora = i === fine; return `<circle cx="${x}" cy="12" r="${ora ? 8 : 5.5}" fill="${ora ? seg : '#f2f0eb'}" stroke="#111" stroke-width="3"/><text x="${x}" y="34" text-anchor="${i === 0 ? 'start' : i === 5 ? 'end' : 'middle'}" font-family="system-ui, sans-serif" font-weight="800" font-size="10" fill="#111">${n}</text>`; }).join('')}</svg>`; },
  dietro: c => `<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect width="200" height="160" fill="#f2f0eb"/>${PITTOGRAMMI[c.sezione % PITTOGRAMMI.length]!(una(c, 'segnale', () => scegli(SEGNALI, c.r)))}</svg>`,
  variabili: c => ({ '--segnale': una(c, 'segnale', () => scegli(SEGNALI, c.r)) }),
};

// ---------------- F · Risograph: due inchiostri fluo sovrapposti, mezzatinta, il fuori registro che segue l'inclinazione
const INCHIOSTRI = [['#ff48b0', '#0078bf'], ['#ff6c2f', '#00838a'], ['#ffe800', '#765ba7'], ['#00a95c', '#ff48b0'], ['#ff665e', '#3255a4']] as const;
const FORME: ((a: string, b: string, id: string) => [string, string])[] = [
  // Un profilo con un sole dietro
  (a, b, id) => [`<circle cx="58" cy="52" r="40" fill="url(#ha${id})"/><path d="M0 110 Q30 70 60 92 T100 80 V110 Z" fill="${a}"/>`, `<path d="M38 96 C30 70 32 40 50 26 C64 16 80 22 82 36 C84 44 78 46 80 52 L86 60 L80 62 C82 70 76 74 70 72 C66 84 64 92 66 100 Z" fill="url(#hb${id})" stroke="${b}" stroke-width="1.6"/><circle cx="72" cy="42" r="2.4" fill="${b}"/>`],
  // Un pianeta con l'anello
  (a, b, id) => [`<circle cx="50" cy="55" r="30" fill="url(#ha${id})"/><circle cx="82" cy="20" r="6" fill="${a}"/>`, `<ellipse cx="50" cy="58" rx="46" ry="11" fill="none" stroke="${b}" stroke-width="4" transform="rotate(-14 50 58)"/><circle cx="40" cy="48" r="10" fill="url(#hb${id})"/>`],
  // Un occhio
  (a, b, id) => [`<path d="M6 55 Q50 10 94 55 Q50 100 6 55 Z" fill="url(#ha${id})"/>`, `<circle cx="50" cy="55" r="20" fill="url(#hb${id})"/><circle cx="50" cy="55" r="8" fill="${b}"/><path d="M6 55 Q50 10 94 55" fill="none" stroke="${b}" stroke-width="2"/>`],
  // Una mano che indica
  (a, b, id) => [`<circle cx="62" cy="40" r="30" fill="url(#ha${id})"/>`, `<path d="M20 100 L20 66 C20 58 30 58 30 66 L30 40 C30 32 40 32 40 40 L40 60 L74 60 C82 60 82 70 74 70 L46 70 L46 100 Z" fill="url(#hb${id})" stroke="${b}" stroke-width="1.6"/>`],
];
const riso = (grande: boolean) => (c: Contesto) => {
  const [a, b] = una(c, 'ink', () => scegli(INCHIOSTRI, c.r)), id = `r${++uid}`, [ra, rb] = una(c, 'forma', () => scegli(FORME, c.r))(a, b, id);
  const defs = `<defs><pattern id="ha${id}" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.1" fill="${a}"/></pattern><pattern id="hb${id}" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="1.3" cy="1.3" r=".8" fill="${b}"/></pattern></defs>`;
  const vb = grande ? '0 0 100 80' : '0 0 100 110';
  return `<div class="rosa"><svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${defs}${ra}</svg></div><div class="blu"><svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${defs}${rb}</svg></div>`;
};
const risograph: Stile = {
  id: 'riso',
  davanti: riso(false),
  dietro: riso(true),
  // I due inchiostri valgono per tutto il biglietto: li sceglie la variante, l'arte li riprende dallo stesso seme
  variabili: c => { const [a, b] = una(c, 'ink', () => scegli(INCHIOSTRI, c.r)); return { '--ink1': a, '--ink2': b }; },
};

// ---------------- H · Liquid Chrome: il cromo riflette un orizzonte; metallo, cielo, sole, pavimento e oggetti a caso
const METALLI = [
  ['#ffffff', '#d7e6f8', '#7d8ca6', '#161821', '#4a3426', '#c99a6c', '#fff3e2'],
  ['#fffbe8', '#f8e3a0', '#b0832e', '#1e1305', '#6b4316', '#e8b860', '#fff0c8'],
  ['#ffffff', '#ffe0ee', '#c9849f', '#26101c', '#7e3f55', '#f3a9b9', '#fff0f3'],
  ['#ffffff', '#d8fbff', '#6fb2cf', '#061826', '#24607e', '#a7e8ff', '#f0fdff'],
  ['#f4fff8', '#9ff3d4', '#6a5cff', '#0d0a1c', '#ff4fa3', '#ffd36a', '#e9fbff'],
] as const;
const FERMATE = [0, 0.26, 0.44, 0.495, 0.51, 0.64, 0.82];
const CIELI = [
  { c: ['#07061a', '#17123f', '#2b1650'], linee: 'rgb(168 140 255 / .9)', sole: ['#ffd27a', '#ff5fa2'], testo: '#eef0ff' },
  { c: ['#1a0612', '#5a1530', '#ff7a4a'], linee: 'rgb(255 190 140 / .9)', sole: ['#fff2a8', '#ff8a3d'], testo: '#fff4ec' },
  { c: ['#021414', '#063838', '#0f6b5e'], linee: 'rgb(125 255 214 / .8)', sole: ['#d8ffef', '#5affc8'], testo: '#eafff7' },
  { c: ['#050505', '#101010', '#1c1c1c'], linee: 'rgb(212 255 74 / .7)', sole: ['#e8ff8a', '#7ad12a'], testo: '#f2f2f2' },
  { c: ['#00122e', '#00327a', '#2a7bff'], linee: 'rgb(150 210 255 / .8)', sole: ['#ffffff', '#7ed0ff'], testo: '#f0f7ff' },
] as const;
const OGGETTI: ((f: string, h: string) => string)[] = [
  (f, h) => `<path d="M2 -70 C32 -74 60 -48 58 -16 C56 8 38 16 42 38 C46 62 14 72 -6 60 C-24 50 -38 66 -54 50 C-70 34 -60 10 -64 -8 C-68 -38 -34 -66 2 -70 Z" fill="${f}" stroke="#0b0a18" stroke-width="1.2"/><path d="M-42 -30 C-26 -52 14 -58 36 -38 C14 -44 -16 -42 -34 -20 Z" fill="#0b0a18" opacity=".5"/><ellipse cx="-20" cy="-36" rx="18" ry="8" fill="${h}" transform="rotate(-25 -20 -36)"/><path d="M-50 32 C-28 50 14 54 38 36 C20 58 -24 60 -50 32 Z" fill="#fff" opacity=".7"/>`,
  f => `<path d="M-56 0 a56 22 0 1 0 112 0 a56 22 0 1 0 -112 0 Z M-34 0 a34 11 0 1 1 68 0 a34 11 0 1 1 -68 0 Z" fill="${f}" fill-rule="evenodd" stroke="#0b0a18" stroke-width="1"/><ellipse cx="-26" cy="-13" rx="14" ry="4" fill="#fff" opacity=".85"/>`,
  (f, h) => `<circle r="44" fill="${f}" stroke="#0b0a18" stroke-width="1"/><circle cx="-14" cy="-16" r="16" fill="${h}"/>`,
  f => `<path d="M0 -64 C6 -16 16 -6 64 0 C16 6 6 16 0 64 C-6 16 -16 6 -64 0 C-16 -6 -6 -16 0 -64 Z" fill="${f}" stroke="#0b0a18" stroke-width="1"/><path d="M0 -50 C3 -14 8 -8 20 -4" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>`,
  f => `<path d="M14 -70 L-36 6 L-4 6 L-18 70 L40 -14 L6 -14 Z" fill="${f}" stroke="#0b0a18" stroke-width="1.2" stroke-linejoin="round"/><path d="M10 -58 L-24 0" stroke="#fff" stroke-width="3" opacity=".75"/>`,
  f => `<path d="M-60 20 C-40 -40 -10 -40 0 0 S40 40 60 -20" stroke="#0b0a18" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M-60 20 C-40 -40 -10 -40 0 0 S40 40 60 -20" stroke="${f}" stroke-width="27" fill="none" stroke-linecap="round"/>`,
  f => `<path d="M0 -56 L50 -28 L0 0 L-50 -28 Z" fill="${f}" stroke="#0b0a18" stroke-width="1"/><path d="M-50 -28 L0 0 L0 58 L-50 30 Z" fill="${f}" stroke="#0b0a18" stroke-width="1" opacity=".75"/><path d="M50 -28 L0 0 L0 58 L50 30 Z" fill="${f}" stroke="#0b0a18" stroke-width="1" opacity=".5"/>`,
];
// Il metallo e gli oggetti si scelgono una volta per biglietto: davanti e dietro li condividono
const cromoDi = (c: Contesto) => una(c, 'cromo', () => {
  {
    const posti = [[150, 48, 0.42], [152, 150, 0.5], [44, 158, 0.4], [40, 40, 0.36]].sort(() => c.r() - 0.5);
    return { m: scegli(METALLI, c.r) as readonly string[], grande: Math.floor(c.r() * OGGETTI.length), piccoli: [0, 1, 2].slice(0, 2 + Math.floor(c.r() * 2)).map(() => Math.floor(c.r() * OGGETTI.length)), posti, sole: scegli(['', '', 'anello', 'pieno', 'nessuno'], c.r), pav: scegli(['', '', 'onde', 'punti'], c.r) };
  }
});
const cromoArte = (c: Contesto) => {
  const x = cromoDi(c), id = `c${++uid}`, f = `url(#oz${id})`, h = `url(#sp${id})`;
  const defs = `<defs><linearGradient id="oz${id}" class="foglia-svg" x1="0" y1="0" x2="0" y2="1">${x.m.map((col, i) => `<stop offset="${FERMATE[i]}" stop-color="${col}"/>`).join('')}<stop offset="1" stop-color="${x.m[0]}"/></linearGradient><radialGradient id="sp${id}" cx=".32" cy=".26" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
  const pezzi = [`<g transform="translate(96 100) scale(.9)">${OGGETTI[x.grande]!(f, h)}</g>`, ...x.piccoli.map((o, i) => { const [px, py, sc] = x.posti[i]!; return `<g transform="translate(${px} ${py}) scale(${sc})">${OGGETTI[o]!(f, h)}</g>`; })];
  return `<div class="sole ${x.sole}"></div><div class="pavimento ${x.pav}"></div><svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${defs}${pezzi.join('')}</svg>`;
};
const chrome: Stile = {
  id: 'chrome',
  davanti: cromoArte,
  dietro: cromoArte,
  variabili: c => {
    const x = cromoDi(c), cielo = scegli(CIELI, c.r);
    return {
      '--cielo1': cielo.c[0], '--cielo2': cielo.c[1], '--cielo3': cielo.c[2], '--linee': cielo.linee, '--sole1': cielo.sole[0], '--sole2': cielo.sole[1], '--testo': cielo.testo,
      '--orizzonte': `linear-gradient(calc(180deg + var(--tx) * 28deg), ${x.m.map((col, i) => `${col} ${FERMATE[i]! * 100}%`).join(', ')}, ${x.m[0]} 100%)`,
    };
  },
};

// ---------------- I · ASCII Night e J · ASCII Print: scene di caratteri, come l'intro della home
const ACCENTI = ['255,164,94', '111,227,255', '198,245,106', '255,138,194'] as const;
const CARTE = [['#f1ece1', '29,27,24'], ['#e9eef2', '27,42,74'], ['#f6e7e0', '40,24,24']] as const;
const INK = ['232,88,42', '42,107,216', '210,58,106'] as const;
const notte: Stile = {
  id: 'notte', ascii: true,
  davanti: () => `<canvas data-ascii="notte"></canvas>`,
  dietro: () => `<canvas data-ascii="notte-grande"></canvas>`,
  variabili: c => { const a = scegli(ACCENTI, c.r); return { '--accento-a': `rgb(${a})`, '--accento-rgb': a, '--luna-x': (0.55 + c.r() * 0.3).toFixed(2) }; },
};
const stampa: Stile = {
  id: 'stampa', ascii: true,
  davanti: () => `<canvas data-ascii="sole"></canvas>`,
  dietro: c => `<canvas data-ascii="sole-banner" data-testo="${esc(c.termine.toUpperCase().slice(0, 14))}"></canvas>`,
  variabili: c => { const [p, i] = scegli(CARTE, c.r), a = scegli(INK, c.r); return { '--carta-a': p, '--inchiostro-rgb': i, '--inchiostro': `rgb(${i})`, '--accento-rgb': a, '--accento-a': `rgb(${a})` }; },
};

export const STILI: Stile[] = [rapid, lime, swiss, risograph, chrome, notte, stampa];

// ---------------- Il motore ASCII: una griglia di celle; ogni cella prende un carattere da una rampa, dal vuoto al pieno,
// secondo la luce. L'inclinazione sposta la luce. Il ciclo lo chiama il biglietto, circa 12 volte al secondo
const RAMPE = { cielo: ' .:-=+*', stella: ' .+*', roccia: " .'^/\\*#", acqua: ' .-~=~', pieno: ' .:-=+*#%@' };
const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const AEREO = ['.....##.......', '.....###......', '##...####.....', '##############', '.#############', '.....####.....', '.....###......', '.....##.......'];
const maschere = new WeakMap<HTMLCanvasElement, { cols: number; rows: number; a: Float32Array }>();
const maschera = (c: HTMLCanvasElement, testo: string, cols: number, rows: number) => {
  const m = document.createElement('canvas'); m.width = cols; m.height = rows;
  const g = m.getContext('2d')!; g.font = `900 ${rows * 1.15}px "Arial Black", system-ui, sans-serif`; g.textBaseline = 'middle';
  const w = g.measureText(testo).width || 1;
  g.setTransform(Math.min(3, (cols * 0.96) / w), 0, 0, 1, cols * 0.02, 0); g.fillText(testo, 0, rows * 0.55);
  const d = g.getImageData(0, 0, cols, rows).data, a = new Float32Array(cols * rows);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]! / 255;
  const x = { cols, rows, a }; maschere.set(c, x); return x;
};
export function disegnaAscii(c: HTMLCanvasElement, ora: number, tx: number, ty: number) {
  const st = getComputedStyle(c), dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr);
  if (!W || !H) return;
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; maschere.delete(c); }
  const g = c.getContext('2d')!, tipoA = c.dataset.ascii ?? '', s = ora / 1000, carta = tipoA.startsWith('sole');
  const acc = st.getPropertyValue('--accento-rgb').trim() || '255,164,94', ink = st.getPropertyValue('--inchiostro-rgb').trim() || '29,27,24';
  const cw = Math.max(4, Math.round(W / (tipoA === 'notte-grande' ? 84 : 58))), ch = Math.round(cw * 1.55), cols = Math.ceil(W / cw), rows = Math.ceil(H / ch);
  g.fillStyle = carta ? st.getPropertyValue('--carta-a').trim() || '#f1ece1' : '#0a0b0d'; g.fillRect(0, 0, W, H);
  g.font = `${Math.round(cw * 1.45)}px ui-monospace, Menlo, Consolas, monospace`; g.textBaseline = 'top';
  const banner = tipoA === 'sole-banner', fasciaB = 0.34, m = banner ? (maschere.get(c) ?? maschera(c, c.dataset.testo ?? '', cols, Math.round(rows * fasciaB))) : null;
  const lunaX = parseFloat(st.getPropertyValue('--luna-x')) || 0.72;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const u = (q + 0.5) / cols; let v = (r + 0.5) / rows;
    let rampa = RAMPE.cielo, luce = 0, colore = carta ? ink : '217,221,227';
    if (!carta) {
      const cresta = 0.5 + 0.07 * Math.sin(u * 9 + 1) + 0.04 * Math.sin(u * 23), lago = 0.66, lx = lunaX + tx * 0.08, ly = 0.2 + ty * 0.05;
      const luna = (uu: number, vv: number) => { const d = Math.hypot((uu - lx) * 1.6, vv - ly); return d < 0.07 ? 1 : Math.max(0, 0.5 - d * 1.4); };
      if (v < cresta) {
        luce = 0.08 + luna(u, v) * 0.8 + (1 - v) * 0.1;
        const h = hash(q, r); if (h > 0.94) { rampa = RAMPE.stella; luce = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(s * 3 + h * 50)); }
        if (Math.hypot((u - lx) * 1.6, v - ly) < 0.07) colore = acc;
      } else if (v < lago) { rampa = RAMPE.roccia; luce = 0.25 + 0.5 * (Math.sin(u * 9 + 1) * 0.5 + 0.5) * (1 - (v - cresta) * 4) + hash(q, r) * 0.15; }
      else {
        rampa = RAMPE.acqua; const vv = 2 * lago - v + Math.sin(v * 70 - s * 2.4 + u * 6) * 0.012;
        luce = (vv < cresta ? 0.05 + luna(u, vv) * 0.7 : 0.18) * (0.75 + 0.25 * Math.sin(u * 40 + s * 1.5 + v * 30));
        if (Math.abs(u - lx) < 0.05 && luna(u, vv) > 0.3) colore = acc;
      }
    } else {
      rampa = RAMPE.pieno;
      if (banner && m && r < m.rows) {
        const a = m.a[r * m.cols + q] ?? 0;
        if (a < 0.08) continue;
        luce = 0.55 + a * 0.45; if (a < 0.6 && hash(q + Math.floor(s * 8), r) > 0.7) luce = hash(q, r + Math.floor(s * 8));
      } else {
        if (banner) v = fasciaB + (v - fasciaB) * 1.0;
        const sx = 0.5 + tx * 0.1, sy = (banner ? 0.62 : 0.4) + ty * 0.06, d = Math.hypot((u - sx) * 1.3, v - sy), mare = banner ? 0.82 : 0.64, raggio = banner ? 0.2 : 0.3;
        if (v < mare) { luce = d < raggio ? 0.95 - d * 1.2 + (Math.sin(v * 46) > 0.55 && v > sy ? -0.6 : 0) : 0.06 + hash(q, r) * 0.06; if (d < raggio) colore = acc; }
        else luce = 0.35 + 0.35 * Math.sin(u * 14 + s * 1.6 + v * 40) * (1 - (v - mare)) + (v - mare) * 0.6;
      }
    }
    const n = rampa.length - 1, k = Math.max(0, Math.min(n, Math.round(luce * n)));
    if (k === 0 || rampa[k] === ' ') continue;
    g.fillStyle = `rgba(${colore},${(0.35 + 0.65 * Math.min(1, luce)).toFixed(2)})`;
    g.fillText(rampa[k]!, q * cw, r * ch);
  }
  // L'aereo bianco a pixel attraversa il cielo, pieno come i cervi dell'intro
  if (!carta) {
    const p = Math.max(2, Math.round(cw * (tipoA === 'notte-grande' ? 0.9 : 0.75))), x0 = (-0.2 + ((s * 0.06) % 1) * 1.4) * W, y0 = H * (0.3 + Math.sin(s * 0.7) * 0.03);
    g.fillStyle = '#f4f1ea';
    AEREO.forEach((riga, y) => [...riga].forEach((cc, x) => { if (cc === '#') g.fillRect(Math.round(x0 + x * p), Math.round(y0 + y * p), p, p); }));
  }
}
