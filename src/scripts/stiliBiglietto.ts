// Gli stili del biglietto di AI terms. Ogni biglietto ne pesca uno a caso, e dentro lo stile una variante (colori,
// elementi), così due biglietti non sono mai uguali. La struttura è la stessa per tutti: davanti la domanda, dietro la
// definizione. Uno stile dà solo l'arte (colonna a sinistra davanti, poster dietro) e le variabili di colore; il resto
// lo fa il CSS con l'attributo data-stile. Gli stili vivi (Game of Life, koi, valle, notte) disegnano su tela.
// Niente testo delle note entra qui, tranne dove passa da esc().
import { arteDavanti, poster, tipo, type Livello } from './arteBiglietti';

export type Contesto = { sezione: number; livello: Livello; numero: string; termine: string; sera: boolean; r: () => number };
export type Stile = {
  id: string;
  davanti: (c: Contesto) => string;
  dietro: (c: Contesto) => string;
  variabili: (c: Contesto) => Record<string, string>;
  // Le tele si disegnano fotogramma per fotogramma (disegnaAscii)
  ascii?: boolean;
  // Se lo stile può uscire per questa sezione e questo livello; senza, esce sempre
  ammesso?: (sezione: number, livello: Livello) => boolean;
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
// Il seme delle tele: lo stesso davanti e dietro, così un biglietto riaperto ritrova i suoi pesci e i suoi cervi
const semeTela = (c: Contesto) => una(c, 'seme', () => 1 + Math.floor(c.r() * 2147483000));

// ---------------- 70s Rapid: la carta della sezione e l'oggetto della tecnologia.
// Esce solo nelle sezioni 1, 2 e 6 (indici 0, 1, 5), e mai nei livelli difficili
const RAPID_SEZIONI = new Set([0, 1, 5]);
const rapid: Stile = {
  id: 'rapid',
  ammesso: (sezione, livello) => RAPID_SEZIONI.has(sezione) && livello !== 'hard',
  davanti: c => arteDavanti(c.sezione, c.livello),
  dietro: c => poster(c.sezione, c.livello, c.sera),
  variabili: c => { const t = tipo(c.sezione); return { '--carta': t.carta, '--c1': t.a, '--c2': t.b, '--tagliando': t.tagliando }; },
};

// ---------------- Rainbow: la carta piena e sei bande di colore larghe che attraversano tutto il davanti, sotto la domanda.
// Dietro le stesse bande si piegano in un arcobaleno che sorge da un orizzonte, con una stella
const BANDE = [
  { carta: '#e5532b', bande: ['#f4a43a', '#f7cf4f', '#3a8f8a', '#2a5a9a', '#7a3a8a', '#e5532b'], c1: '#1d2b4a', c2: '#f7cf4f', tagliando: '#f6dfe5', cielo: '#f3e7cf' },
  { carta: '#1d2b4a', bande: ['#f7cf4f', '#f4a43a', '#f0603f', '#d94a6a', '#8a3a8a', '#f2e6c8'], c1: '#f7cf4f', c2: '#f2e6c8', tagliando: '#f4e6bd', cielo: '#16213a' },
] as const;
const bande: Stile = {
  id: 'bande',
  davanti: c => { const b = una(c, 'bande', () => scegli(BANDE, c.r)); return `<svg class="onde-bande" viewBox="0 0 255 100" preserveAspectRatio="none" aria-hidden="true">${b.bande.map((col, i) => `<path d="M-10 ${30 + i * 13} C 30 ${10 + i * 13} 60 ${60 + i * 12} 100 ${36 + i * 13} S 160 ${12 + i * 13} 120 110" fill="none" stroke="${col}" stroke-width="12"/>`).join('')}</svg>`; },
  dietro: c => {
    const b = una(c, 'bande', () => scegli(BANDE, c.r));
    const archi = b.bande.slice(0, 5).map((col, i) => { const r = 78 - i * 12; return `<path d="M${100 - r} 112 A${r} ${r} 0 0 1 ${100 + r} 112" fill="none" stroke="${col}" stroke-width="12.5"/>`; }).join('');
    return `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="140" fill="${b.cielo}"/>${archi}<path d="M0 112 C40 104 70 120 100 112 S160 104 200 112 V140 H0 Z" fill="${b.carta}"/><path d="M0 124 C50 118 80 130 120 124 S180 118 200 124" fill="none" stroke="${b.bande[1]}" stroke-width="3"/><path d="M158 30 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3 Z" fill="${b.bande[1]}"/><path d="M38 44 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="${b.bande[0]}"/></svg>`;
  },
  variabili: c => { const b = una(c, 'bande', () => scegli(BANDE, c.r)); return { '--carta': b.carta, '--c1': b.c1, '--c2': b.c2, '--tagliando': b.tagliando }; },
};

// ---------------- Lime Bloom: una fioritura di luce su una griglia nera, e dentro la luce una colonia del Game of Life
// che nasce, cresce e muore. Sul retro il nome del termine si scioglie in celle vive, poi si riscrive
// Al massimo due varianti di colore per stile: lime e rosa
const FIORI = [['#e9ffb0', '#b9f04a', '#5d8a1e'], ['#ffe0f2', '#ff6fb8', '#8a2a5a']] as const;
const lime: Stile = {
  id: 'lime', ascii: true,
  davanti: c => `<div class="fiore"></div><canvas data-ascii="vita" data-seme="${semeTela(c)}"></canvas><i class="tick" style="left:8%;top:7%"></i><i class="tick" style="right:8%;bottom:7%"></i>`,
  dietro: c => `<div class="fiore"></div><canvas data-ascii="vita-parola" data-seme="${semeTela(c)}" data-testo="${esc(c.termine.toUpperCase().slice(0, 18))}"></canvas>`,
  variabili: c => { const f = una(c, 'fiore', () => scegli(FIORI, c.r)); return { '--f1': f[0], '--f2': f[1], '--f3': f[2] }; },
};

// ---------------- Risograph: due inchiostri fluo sovrapposti, mezzatinta, il fuori registro che segue l'inclinazione.
// Davanti e dietro hanno due disegni diversi con gli stessi inchiostri: girando il biglietto se ne scopre un altro
const INCHIOSTRI = [['#ff48b0', '#0078bf'], ['#ffe800', '#765ba7']] as const;
const FORME: ((a: string, b: string, id: string) => [string, string])[] = [
  // Un profilo con un sole dietro
  (a, b, id) => [`<circle cx="58" cy="52" r="40" fill="url(#ha${id})"/><path d="M0 110 Q30 70 60 92 T100 80 V110 Z" fill="${a}"/>`, `<path d="M38 96 C30 70 32 40 50 26 C64 16 80 22 82 36 C84 44 78 46 80 52 L86 60 L80 62 C82 70 76 74 70 72 C66 84 64 92 66 100 Z" fill="url(#hb${id})" stroke="${b}" stroke-width="1.6"/><circle cx="72" cy="42" r="2.4" fill="${b}"/>`],
  // Un pianeta con l'anello
  (a, b, id) => [`<circle cx="50" cy="55" r="30" fill="url(#ha${id})"/><circle cx="82" cy="20" r="6" fill="${a}"/>`, `<ellipse cx="50" cy="58" rx="46" ry="11" fill="none" stroke="${b}" stroke-width="4" transform="rotate(-14 50 58)"/><circle cx="40" cy="48" r="10" fill="url(#hb${id})"/>`],
  // Un occhio
  (a, b, id) => [`<path d="M6 55 Q50 10 94 55 Q50 100 6 55 Z" fill="url(#ha${id})"/>`, `<circle cx="50" cy="55" r="20" fill="url(#hb${id})"/><circle cx="50" cy="55" r="8" fill="${b}"/><path d="M6 55 Q50 10 94 55" fill="none" stroke="${b}" stroke-width="2"/>`],
];
const riso = (grande: boolean) => (c: Contesto) => {
  const [a, b] = una(c, 'ink', () => scegli(INCHIOSTRI, c.r)), id = `r${++uid}`;
  // Il davanti pesca un disegno, il retro uno degli altri due
  const kDavanti = una(c, 'forma', () => Math.floor(c.r() * FORME.length)), kRetro = una(c, 'forma-retro', () => (kDavanti + 1 + Math.floor(c.r() * (FORME.length - 1))) % FORME.length);
  const [ra, rb] = FORME[grande ? kRetro : kDavanti]!(a, b, id);
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

// ---------------- ASCII Night: una scena di caratteri, come l'intro della home
const ACCENTI = ['111,227,255', '255,138,194'] as const;
const notte: Stile = {
  id: 'notte', ascii: true,
  davanti: () => `<canvas data-ascii="notte"></canvas>`,
  dietro: () => `<canvas data-ascii="notte-grande"></canvas>`,
  variabili: c => { const a = una(c, 'accento', () => scegli(ACCENTI, c.r)); return { '--accento-a': `rgb(${a})`, '--accento-rgb': a, '--luna-x': (0.55 + c.r() * 0.3).toFixed(2) }; },
};

// ---------------- Koi Pond, tutto a pixel. Davanti la riva del mare vista dall'alto, con le onde che salgono sulla sabbia;
// dietro lo stagno: la riva d'erba con i sassi, le ninfee e le koi a sprite che nuotano senza piegarsi su se stesse
const ACQUE = [
  { acqua: ['#0b3b45', '#0f5560', '#167080', '#2a8f98', '#6fc3c1'], testo: '#f2f7f2', accento: '#ff7a59', fondo: '#082c34' },
  { acqua: ['#0c3a2e', '#11533f', '#1a6e52', '#2f8f6a', '#8fd0a8'], testo: '#eff8f1', accento: '#ff8fb4', fondo: '#082c22' },
] as const;
const koi: Stile = {
  id: 'koi', ascii: true,
  davanti: c => `<canvas data-ascii="onde" data-seme="${semeTela(c)}"></canvas>`,
  dietro: c => `<canvas data-ascii="koi-grande" data-seme="${semeTela(c)}"></canvas>`,
  variabili: c => {
    const q = una(c, 'acqua', () => scegli(ACQUE, c.r));
    return { '--acqua-0': q.acqua[0], '--acqua-1': q.acqua[1], '--acqua-2': q.acqua[2], '--acqua-3': q.acqua[3], '--acqua-4': q.acqua[4], '--acqua-a': q.fondo, '--acqua-b': q.acqua[1], '--testo-k': q.testo, '--accento-k': q.accento };
  },
};

// ---------------- Valley: la valle dell'intro della home, di caratteri minuscoli. Montagne, abeti, il prato e il lago;
// una famiglia di cervi bianchi a pixel passeggia, bruca e beve; uno stormo attraversa il cielo
const VALLI = [
  { cielo: ['#141a2e', '#3a3354'], monti: '150,160,210', bosco: '120,170,150', prato: '170,200,140', acqua: '140,170,220', accento: '255,190,140' },
  { cielo: ['#0c1a14', '#20382c'], monti: '140,180,160', bosco: '110,170,120', prato: '190,215,150', acqua: '130,190,180', accento: '230,240,150' },
] as const;
const valle: Stile = {
  id: 'valle', ascii: true,
  davanti: c => `<canvas data-ascii="valle" data-seme="${semeTela(c)}"></canvas>`,
  dietro: c => `<canvas data-ascii="valle-grande" data-seme="${semeTela(c)}"></canvas>`,
  variabili: c => {
    const v = una(c, 'valle', () => scegli(VALLI, c.r));
    return { '--cielo-a': v.cielo[0], '--cielo-b': v.cielo[1], '--monti-rgb': v.monti, '--bosco-rgb': v.bosco, '--prato-rgb': v.prato, '--lago-rgb': v.acqua, '--accento-rgb': v.accento, '--accento-a': `rgb(${v.accento})` };
  },
};

export const STILI: Stile[] = [rapid, bande, lime, risograph, notte, koi, valle];

// ---------------- Le tele vive. Il biglietto chiama disegnaAscii circa 30 volte al secondo; ogni tela decide quanto spesso
// ridisegnarsi (le scene di caratteri bastano 12 volte al secondo). Lo stato di ogni tela (cellule, pesci, cervi) sta qui
const ultimo = new WeakMap<HTMLCanvasElement, number>();
export function disegnaAscii(c: HTMLCanvasElement, ora: number, tx: number, ty: number) {
  const tipoT = c.dataset.ascii ?? '', lento = tipoT.startsWith('notte') || tipoT.startsWith('valle');
  if (lento && ora - (ultimo.get(c) ?? -1e9) < 80) return;
  const prima = ultimo.get(c) ?? ora; ultimo.set(c, ora);
  const dt = Math.min(0.1, Math.max(0, (ora - prima) / 1000));
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr);
  if (!W || !H) return;
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; stati.delete(c); maschere.delete(c); }
  if (tipoT.startsWith('vita')) return vita(c, ora, dt, dpr, tipoT === 'vita-parola');
  if (tipoT === 'onde') return ondeTela(c, dt, dpr, tx);
  if (tipoT.startsWith('koi')) return stagnoPixel(c, dt, dpr, tx, ty);
  if (tipoT.startsWith('valle')) return valleTela(c, ora, dt, dpr, tx, ty, tipoT === 'valle-grande');
  return notteTela(c, ora, tx, ty);
}
const stati = new WeakMap<HTMLCanvasElement, unknown>();
const prendi = <T>(c: HTMLCanvasElement, f: () => T): T => { let s = stati.get(c) as T | undefined; if (!s) { s = f(); stati.set(c, s); } return s; };
const casoTela = (c: HTMLCanvasElement) => casoDa(Number(c.dataset.seme) || 7);
const varCss = (c: HTMLCanvasElement, n: string, d: string) => getComputedStyle(c).getPropertyValue(n).trim() || d;

// --- Game of Life. Le celle appena nate prendono il colore più chiaro della fioritura, quelle vecchie il più scuro;
// vicino al centro della luce brillano di più. Quando la vita si spegne, rinasce una macchia nella luce
type Vita = { cols: number; rows: number; lato: number; vivo: Uint8Array; dopo: Uint8Array; eta: Uint8Array; luce: Float32Array; passo: number; parola: number; r: () => number };
const R_PENTOMINO = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];
const ALIANTE = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
function vita(c: HTMLCanvasElement, ora: number, dt: number, dpr: number, parola: boolean) {
  const g = c.getContext('2d')!, W = c.width, H = c.height;
  const s = prendi<Vita>(c, () => {
    const lato = Math.round((parola ? 7 : 8) * dpr), cols = Math.ceil(W / lato), rows = Math.ceil(H / lato), n = cols * rows, r = casoTela(c);
    const v: Vita = { cols, rows, lato, vivo: new Uint8Array(n), dopo: new Uint8Array(n), eta: new Uint8Array(n), luce: new Float32Array(n), passo: 0, parola: 0, r };
    if (parola) scriviParola(c, v); else semina(v, 0.32, cols * 0.34, rows * 0.4, Math.max(cols, rows) * 0.42);
    return v;
  });
  // Circa 7 generazioni al secondo; sul retro la parola si riscrive ogni 22 secondi
  s.passo += dt;
  if (s.passo > 0.14) { s.passo = 0; generazione(s, parola); }
  if (parola && (s.parola += dt) > 22) { s.parola = 0; scriviParola(c, s); }
  const f1 = varCss(c, '--f1', '#e9ffb0'), f2 = varCss(c, '--f2', '#b9f04a'), f3 = varCss(c, '--f3', '#5d8a1e');
  g.clearRect(0, 0, W, H);
  const k = Math.min(1, dt * 9), cx = s.cols * 0.34, cy = s.rows * 0.42, raggio = Math.max(s.cols, s.rows) * 0.6;
  for (let i = 0; i < s.luce.length; i++) {
    const l = (s.luce[i]! += (s.vivo[i]! - s.luce[i]!) * k);
    if (l < 0.05) continue;
    const x = i % s.cols, y = (i / s.cols) | 0, e = s.eta[i]!;
    const vicino = parola ? 1 : Math.max(0.35, 1 - Math.hypot(x - cx, y - cy) / raggio);
    g.globalAlpha = Math.min(1, l * (0.45 + 0.55 * vicino));
    g.fillStyle = e < 2 ? f1 : e < 10 ? f2 : f3;
    g.fillRect(x * s.lato + dpr * 0.5, y * s.lato + dpr * 0.5, s.lato - dpr, s.lato - dpr);
  }
  g.globalAlpha = 1;
  void ora;
}
function semina(s: Vita, densita: number, cx: number, cy: number, r: number) {
  for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) {
    const d = Math.hypot(x - cx, y - cy) / r;
    if (d < 1 && s.r() < densita * (1 - d * 0.6)) { const i = y * s.cols + x; s.vivo[i] = 1; s.eta[i] = 0; }
  }
}
function generazione(s: Vita, parola: boolean) {
  const C = s.cols, R = s.rows; let vive = 0;
  for (let y = 0; y < R; y++) {
    const su = ((y - 1 + R) % R) * C, qui = y * C, giu = ((y + 1) % R) * C;
    for (let x = 0; x < C; x++) {
      const sx = (x - 1 + C) % C, dx = (x + 1) % C, i = qui + x;
      const n = s.vivo[su + sx]! + s.vivo[su + x]! + s.vivo[su + dx]! + s.vivo[qui + sx]! + s.vivo[qui + dx]! + s.vivo[giu + sx]! + s.vivo[giu + x]! + s.vivo[giu + dx]!;
      if (s.vivo[i]) { s.dopo[i] = n === 2 || n === 3 ? 1 : 0; if (s.dopo[i] && s.eta[i]! < 255) s.eta[i]!++; }
      else { s.dopo[i] = n === 3 ? 1 : 0; if (s.dopo[i]) s.eta[i] = 0; }
      vive += s.dopo[i]!;
    }
  }
  [s.vivo, s.dopo] = [s.dopo, s.vivo];
  // Quasi spenta: davanti rinasce un R-pentomino nella luce, dietro parte un aliante
  if (vive < C * R * 0.015) {
    const forma = parola ? ALIANTE : R_PENTOMINO, x0 = Math.floor(C * (0.2 + s.r() * 0.3)), y0 = Math.floor(R * (0.25 + s.r() * 0.3));
    for (const [dx, dy] of forma) { const i = (y0 + dy!) * C + x0 + dx!; s.vivo[i] = 1; s.eta[i] = 0; }
    if (!parola) semina(s, 0.2, C * 0.34, R * 0.42, Math.max(C, R) * 0.2);
  }
}
// La parola del termine diventa celle vive: si scrive in nero su una tela piccola quanto la griglia, e ogni cella piena nasce
function scriviParola(c: HTMLCanvasElement, s: Vita) {
  const m = document.createElement('canvas'); m.width = s.cols; m.height = s.rows;
  const g = m.getContext('2d')!, testo = c.dataset.testo ?? 'AI', parole = testo.split(' ');
  // Una riga o due, la più larga possibile
  const righe = parole.length > 1 && testo.length > 9 ? [parole.slice(0, Math.ceil(parole.length / 2)).join(' '), parole.slice(Math.ceil(parole.length / 2)).join(' ')] : [testo];
  const alto = Math.min(s.rows * 0.32, (s.rows * 0.7) / righe.length);
  g.font = `900 ${alto}px "Arial Black", system-ui, sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'center';
  righe.forEach((t, k) => { const w = g.measureText(t).width || 1, sx = Math.min(1, (s.cols * 0.9) / w); g.setTransform(sx, 0, 0, 1, s.cols / 2, s.rows * (0.5 + (k - (righe.length - 1) / 2) * 0.36)); g.fillText(t, 0, 0); });
  const d = g.getImageData(0, 0, s.cols, s.rows).data;
  for (let i = 0; i < s.cols * s.rows; i++) if (d[i * 4 + 3]! > 120) { s.vivo[i] = 1; s.eta[i] = 0; }
}

// --- Koi Pond a pixel. Si disegna su un'immagine piccola (un pixel dell'arte = 3 pixel dello schermo) e la si ingrandisce
// senza sfumare. I colori passano da un tono all'altro con la retinatura a griglia (Bayer), come nella pixel art
const PIX = 3;
type Rgb = [number, number, number];
const daHex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
type Immagine = { tela: HTMLCanvasElement; g: CanvasRenderingContext2D; img: ImageData; w: number; h: number };
const immagini = new WeakMap<HTMLCanvasElement, Immagine>();
function immagine(c: HTMLCanvasElement, dpr: number): Immagine {
  const w = Math.ceil(c.width / (PIX * dpr)), h = Math.ceil(c.height / (PIX * dpr));
  let x = immagini.get(c);
  if (!x || x.w !== w || x.h !== h) {
    const tela = document.createElement('canvas'); tela.width = w; tela.height = h;
    const g = tela.getContext('2d')!; x = { tela, g, img: g.createImageData(w, h), w, h }; immagini.set(c, x);
  }
  return x;
}
const metti = (im: Immagine, x: number, y: number, col: Rgb) => {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= im.w || y >= im.h) return;
  const i = (y * im.w + x) * 4, d = im.img.data; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
};
// Un valore da 0 a 1 diventa uno dei toni della tavolozza, con la retinatura fra due toni vicini
const tono = (tav: Rgb[], v: number, x: number, y: number) => {
  const f = Math.max(0, Math.min(tav.length - 1, v * (tav.length - 1))), k = Math.floor(f);
  return tav[Math.min(tav.length - 1, f - k > BAYER4[(y & 3) * 4 + (x & 3)]! ? k + 1 : k)]!;
};
const mostra = (c: HTMLCanvasElement, im: Immagine) => {
  im.g.putImageData(im.img, 0, 0);
  const g = c.getContext('2d')!; g.imageSmoothingEnabled = false;
  g.drawImage(im.tela, 0, 0, im.w * (c.width / im.w), im.h * (c.height / im.h));
};
const acque = (c: HTMLCanvasElement) => [0, 1, 2, 3, 4].map(k => daHex(varCss(c, `--acqua-${k}`, ['#0b3b45', '#0f5560', '#167080', '#2a8f98', '#6fc3c1'][k]!)));
const SCHIUMA: Rgb = [244, 241, 230], SABBIA = ['#c9ad78', '#d8bf8a', '#e6d2a2', '#f0e2bb'].map(daHex), BAGNATA = ['#9c855c', '#ae966a'].map(daHex);

// Davanti: la riva vista dall'alto. Sabbia in alto, il mare in basso; le onde salgono di sbieco e si ritirano,
// lasciano la sabbia bagnata e un filo di schiuma; sull'acqua corrono le creste e qualche luccichio
type Onde = { bagnato: Float32Array; luccica: Float32Array; tempo: number; r: () => number };
function ondeTela(c: HTMLCanvasElement, dt: number, dpr: number, tx: number) {
  const im = immagine(c, dpr), { w, h } = im, tav = acque(c);
  const s = prendi<Onde>(c, () => ({ bagnato: new Float32Array(w * h), luccica: new Float32Array(w * h), tempo: casoTela(c)() * 20, r: casoTela(c) }));
  if (s.bagnato.length !== w * h) { s.bagnato = new Float32Array(w * h); s.luccica = new Float32Array(w * h); }
  s.tempo += dt;
  const t = s.tempo, PERIODO = 7, risalita = (f: number) => (f < 0.3 ? 1 - (1 - f / 0.3) ** 3 : 0.5 + 0.5 * Math.cos(((f - 0.3) / 0.7) * Math.PI));
  for (let x = 0; x < w; x++) {
    // Ogni colonna è un tratto di riva, un po' in ritardo sul vicino: l'onda arriva di sbieco
    const f = (((t / PERIODO - x * 0.012 - Math.sin(x * 0.11) * 0.05) % 1) + 1) % 1;
    const bordo = h * 0.42 + risalita(f) * h * 0.2 + Math.sin(x * 0.35 + t * 0.6) * 0.8 + Math.sin(x * 0.13) * 1.6;
    for (let y = 0; y < h; y++) {
      const i = y * w + x, u = h - y;
      if (u < bordo) {
        const profondo = Math.min(1, (bordo - u) / 22), cresta = Math.max(0, Math.sin(u * 0.45 - t * 2.4 + Math.sin(x * 0.09 + tx) * 1.5)) ** 8;
        let col = tono(tav, 0.85 - profondo * 0.75 + cresta * 0.35, x, y);
        const schiuma = bordo - u;
        if (schiuma < 1.6 || (schiuma < 3 && s.r() < (f < 0.35 ? 0.5 : 0.15))) col = SCHIUMA;
        s.bagnato[i] = 1;
        if (dt > 0 && s.r() < 0.0008) s.luccica[i] = 1;
        if (s.luccica[i]! > 0.4) col = SCHIUMA;
        s.luccica[i] = Math.max(0, s.luccica[i]! - dt * 1.4);
        metti(im, x, y, col);
      } else {
        s.bagnato[i] = Math.max(0, s.bagnato[i]! - dt * 0.18);
        const b = s.bagnato[i]!, grana = hash(x, y) * 0.5 + 0.25;
        metti(im, x, y, b > 0.15 ? tono(BAGNATA, grana, x, y) : tono(SABBIA, grana + (y / h) * 0.2, x, y));
      }
    }
  }
  mostra(c, im);
}

// Dietro: lo stagno. In alto la riva d'erba con i sassi e qualche fiore; l'acqua è più chiara vicino alla riva, ha strisce
// di luce che si muovono, ninfee con i fiori e koi a sprite. Le koi girano piano e il corpo si piega poco: niente pesci arrotolati
const ERBA = ['#2f5a2a', '#3f6f30', '#558a3a', '#79a84a'].map(daHex), SASSO = ['#5e6b6b', '#7d8a8a', '#a2acab'].map(daHex);
const FOGLIA = ['#2f6a35', '#3f8040', '#5c9c4c'].map(daHex), PETALI = ['#e0779f', '#f2a7c3', '#ffd86a'].map(daHex);
type KoiPx = { x: number; y: number; a: number; voluta: number; vel: number; spina: { x: number; y: number }[]; misura: number; colore: (t: number, s: number) => Rgb; fase: number };
type StagnoPx = { pesci: KoiPx[]; ninfee: { x: number; y: number; r: number; fiore: boolean }[]; sassi: { x: number; y: number; r: number }[]; cerchi: { x: number; y: number; r: number; vita: number }[]; tempo: number; r: () => number; riva: (x: number) => number };
const KW = daHex('#f6f2ea'), KR = daHex('#e2452c'), KK = daHex('#1f1f24'), KG = daHex('#f2b63c'), KG2 = daHex('#ffe08a'), KB = daHex('#b07a40'), KA = daHex('#7f9bb3'), KO = daHex('#e8743a');
// Le varietà: il colore di ogni punto del pesce, dato t (0 testa, 1 coda) e il lato s (-1 sinistra, 1 destra)
const VARIETA_PX: ((r: () => number) => (t: number, s: number) => Rgb)[] = [
  r => { const a = 0.05 + r() * 0.1, b = a + 0.25, c2 = 0.5 + r() * 0.1; return (t, s) => ((t > a && t < b && s > -0.4) || (t > c2 && t < c2 + 0.22) ? KR : KW); },
  () => (t, s) => (t < 0.18 && Math.abs(s) < 0.7 ? KR : KW),
  r => { const a = 0.15 + r() * 0.1; return (t, s) => (t > a && t < a + 0.3 ? KR : t > 0.6 && t < 0.72 && s > 0 ? KW : KK); },
  () => (_, s) => (s > 0.35 ? KG2 : KG),
  () => () => KB,
  () => (_, s) => (Math.abs(s) > 0.6 ? KO : KA),
  r => { const a = 0.08 + r() * 0.1; return (t, s) => (t > a && t < a + 0.3 ? KR : t > 0.5 && t < 0.8 && s > 0.2 && Math.round(t * 20 + s * 3) % 3 === 0 ? KK : KW); },
];
function stagnoPixel(c: HTMLCanvasElement, dt: number, dpr: number, tx: number, ty: number) {
  const im = immagine(c, dpr), { w, h } = im, tav = acque(c);
  const s = prendi<StagnoPx>(c, () => {
    const r = casoTela(c), riva = (x: number) => h * 0.17 + Math.sin(x * 0.09 + 1) * 2.2 + Math.sin(x * 0.23) * 1.2;
    const pesci: KoiPx[] = Array.from({ length: 6 }, (_, k) => {
      const x = w * (0.15 + r() * 0.7), y = h * (0.35 + r() * 0.55), a = r() * Math.PI * 2, misura = 0.85 + r() * 0.5;
      return { x, y, a, voluta: a, vel: 0, misura, spina: Array.from({ length: 7 }, (_, i) => ({ x: x - Math.cos(a) * 1.7 * misura * i, y: y - Math.sin(a) * 1.7 * misura * i })), colore: VARIETA_PX[Math.floor(r() * VARIETA_PX.length)]!(r), fase: k * 1.3 + r() * 4 };
    });
    const ninfee = Array.from({ length: 4 }, (_, k) => ({ x: w * [0.12, 0.83, 0.62, 0.3][k]! + (r() - 0.5) * 8, y: h * [0.38, 0.33, 0.78, 0.86][k]! + (r() - 0.5) * 6, r: 6 + r() * 3, fiore: k % 2 === 0 }));
    const sassi = Array.from({ length: 9 }, () => ({ x: r() * w, y: 0, r: 1.5 + r() * 2.5 })).map(q => ({ ...q, y: riva(q.x) - 1 }));
    return { pesci, ninfee, sassi, cerchi: [], tempo: r() * 30, r, riva };
  });
  s.tempo += dt;
  const t = s.tempo;
  // L'acqua e la riva, pixel per pixel
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const bordo = s.riva(x);
    if (y < bordo) { const v = 0.35 + 0.4 * hash(x, y) + (y > bordo - 2 ? -0.3 : 0) + 0.15 * Math.sin(x * 0.5 + y); metti(im, x, y, tono(ERBA, v, x, y)); continue; }
    const vicino = Math.max(0, 1 - (y - bordo) / (h * 0.35));
    const luce = Math.sin(x * 0.28 + y * 0.12 + t * 0.9 + tx * 2) + Math.sin(x * 0.11 - y * 0.31 - t * 0.6 + ty * 2) + Math.sin((x + y) * 0.07 + t * 0.4);
    let v = 0.2 + vicino * 0.35 + (luce > 2.1 ? 0.45 : luce > 1.6 ? 0.2 : 0);
    if (y < bordo + 1.5) v = 0.95;
    metti(im, x, y, tono(tav, v, x, y));
  }
  // I sassi sulla riva e qualche fiore nell'erba
  for (const q of s.sassi) for (let dy = -q.r; dy <= q.r; dy++) for (let dx = -q.r * 1.3; dx <= q.r * 1.3; dx++) {
    if ((dx / 1.3) ** 2 + dy ** 2 > q.r * q.r) continue;
    metti(im, q.x + dx, q.y + dy, SASSO[dy < -q.r * 0.3 ? 2 : dy > q.r * 0.4 ? 0 : 1]!);
  }
  for (let k = 0; k < 14; k++) { const x = (hash(k, 3) * w) | 0, y = (hash(k, 7) * s.riva(x) * 0.8) | 0; metti(im, x, y, PETALI[k % 3]!); }
  // Le koi: la testa va verso una direzione voluta che cambia ogni tanto, gira al massimo di poco al secondo,
  // e ogni giuntura della spina si piega al massimo di 0.2 radianti rispetto alla precedente
  for (const p of s.pesci) {
    if (s.r() < dt * 0.25) p.voluta = p.a + (s.r() - 0.5) * 2.2;
    const m = 8, cima = s.riva(p.x) + 6;
    if (p.x < m) p.voluta = 0; else if (p.x > w - m) p.voluta = Math.PI; else if (p.y < cima) p.voluta = Math.PI / 2; else if (p.y > h - m) p.voluta = -Math.PI / 2;
    let d = p.voluta - p.a; d = Math.atan2(Math.sin(d), Math.cos(d));
    p.a += Math.max(-0.7 * dt, Math.min(0.7 * dt, d));
    p.vel += ((5 + 3 * Math.sin(t * 0.3 + p.fase)) * p.misura - p.vel) * Math.min(1, dt);
    p.x += Math.cos(p.a) * p.vel * dt; p.y += Math.sin(p.a) * p.vel * dt;
    p.spina[0] = { x: p.x, y: p.y };
    const L = 1.7 * p.misura;
    let dir = p.a;
    for (let i = 1; i < p.spina.length; i++) {
      const a = p.spina[i - 1]!, b = p.spina[i]!;
      let ang = Math.atan2(a.y - b.y, a.x - b.x), dd = ang - dir; dd = Math.atan2(Math.sin(dd), Math.cos(dd));
      ang = dir + Math.max(-0.2, Math.min(0.2, dd)); dir = ang;
      p.spina[i] = { x: a.x - Math.cos(ang) * L, y: a.y - Math.sin(ang) * L };
    }
    if (s.r() < dt * 0.05) s.cerchi.push({ x: p.x, y: p.y, r: 0, vita: 1 });
  }
  const ombra = tav[0]!, raggi = [1.5, 1.9, 2, 1.8, 1.4, 0.95, 0.6];
  const corpo = (p: KoiPx, ox: number, oy: number, col: ((t: number, sd: number) => Rgb) | null, extra: number) => {
    const n = p.spina.length;
    for (let i = 0; i < n; i++) {
      const q = p.spina[i]!, rr = raggi[i]! * p.misura + extra, nx = -Math.sin(i ? Math.atan2(p.spina[i - 1]!.y - q.y, p.spina[i - 1]!.x - q.x) : p.a), ny = Math.cos(i ? Math.atan2(p.spina[i - 1]!.y - q.y, p.spina[i - 1]!.x - q.x) : p.a);
      for (let dy = -Math.ceil(rr); dy <= Math.ceil(rr); dy++) for (let dx = -Math.ceil(rr); dx <= Math.ceil(rr); dx++) {
        if (dx * dx + dy * dy > rr * rr + 0.3) continue;
        metti(im, q.x + dx + ox, q.y + dy + oy, col ? col(i / (n - 1), (dx * nx + dy * ny) / Math.max(0.5, rr)) : ombra);
      }
    }
  };
  for (const p of s.pesci) corpo(p, 1, 2, null, 0.3);
  for (const p of s.pesci) {
    // Pinne pettorali e coda: due pixel che battono piano
    const batte = Math.sin(t * 6 + p.fase) > 0 ? 1 : 0, q1 = p.spina[1]!, coda = p.spina[p.spina.length - 1]!, nx = -Math.sin(p.a), ny = Math.cos(p.a);
    const pinna = p.colore(0.2, 1)[0] > 200 && p.colore(0.2, 1)[1] > 200 ? daHex('#dfe8e6') : p.colore(0.2, 1);
    for (const sd of [-1, 1]) metti(im, q1.x + nx * sd * (2.6 + batte * 0.6) * p.misura, q1.y + ny * sd * (2.6 + batte * 0.6) * p.misura, pinna);
    const pc = p.spina[p.spina.length - 2]!, ac = Math.atan2(coda.y - pc.y, coda.x - pc.x);
    for (const sd of [-1, 1]) metti(im, coda.x + Math.cos(ac + sd * (0.6 + batte * 0.3)) * 1.6 * p.misura, coda.y + Math.sin(ac + sd * (0.6 + batte * 0.3)) * 1.6 * p.misura, pinna);
    corpo(p, 0, 0, p.colore, 0);
  }
  // Le ninfee: una foglia tonda col taglio, l'orlo più chiaro; alcune hanno il fiore rosa
  for (const n of s.ninfee) {
    const y0 = n.y + Math.sin(t * 0.6 + n.x) * 0.5;
    for (let dy = -n.r; dy <= n.r; dy++) for (let dx = -n.r; dx <= n.r; dx++) {
      const dd = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      if (dd > n.r || (ang > -0.25 && ang < 0.35 && dd > 1)) continue;
      metti(im, n.x + dx, y0 + dy, FOGLIA[dd > n.r - 1.2 ? 2 : (dx + dy) % 3 === 0 ? 1 : 0]!);
    }
    if (n.fiore) { for (const [dx, dy, k] of [[0, -1, 0], [-1, 0, 0], [1, 0, 0], [0, 1, 0], [-1, -1, 1], [1, -1, 1], [0, 0, 2]] as const) metti(im, n.x - 1 + dx, y0 - 1 + dy, PETALI[k]!); }
  }
  // Cerchi nell'acqua: un anello di pixel che si allarga e sbiadisce
  for (const q of s.cerchi) {
    q.r += dt * 6; q.vita -= dt * 0.6;
    if (q.vita > 0.3) for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; metti(im, q.x + Math.cos(a) * q.r, q.y + Math.sin(a) * q.r * 0.8, tav[4]!); }
  }
  s.cerchi = s.cerchi.filter(q => q.vita > 0);
  mostra(c, im);
}

// --- La valle: celle di caratteri come nell'intro della home, e i cervi a pixel pieni
type Cervo = { x: number; dir: number; stato: 'cammina' | 'bruca' | 'guarda'; fino: number; passo: number; misura: number; corna: boolean };
type Valle = { cervi: Cervo[]; stormo: number; r: () => number };
const RAMPA = { cielo: ' ..:', monti: " .'^/\\#", bosco: " .'^^*#", prato: " .,'`|!", acqua: ' .-~=~' };
function valleTela(c: HTMLCanvasElement, ora: number, dt: number, dpr: number, tx: number, ty: number, grande: boolean) {
  const g = c.getContext('2d')!, W = c.width, H = c.height, t = ora / 1000;
  const s = prendi<Valle>(c, () => {
    const r = casoTela(c), x0 = 0.15 + r() * 0.2;
    const famiglia: Cervo[] = [{ x: x0 + 0.14, dir: 1, stato: 'cammina', fino: 3, passo: 0, misura: 1, corna: true }, { x: x0 + 0.03, dir: 1, stato: 'cammina', fino: 2, passo: 0.4, misura: 0.92, corna: false }, { x: x0 - 0.06, dir: 1, stato: 'cammina', fino: 2.5, passo: 0.8, misura: 0.6, corna: false }];
    return { cervi: grande ? famiglia : famiglia.slice(0, 2), stormo: 4 + r() * 6, r };
  });
  const cielo = [varCss(c, '--cielo-a', '#141a2e'), varCss(c, '--cielo-b', '#3a3354')], rgb = (n: string, d: string) => varCss(c, n, d);
  const monti = rgb('--monti-rgb', '150,160,210'), bosco = rgb('--bosco-rgb', '120,170,150'), prato = rgb('--prato-rgb', '170,200,140'), lago = rgb('--lago-rgb', '140,170,220'), acc = rgb('--accento-rgb', '255,190,140');
  const sf = g.createLinearGradient(0, 0, 0, H); sf.addColorStop(0, cielo[0]!); sf.addColorStop(1, cielo[1]!);
  g.fillStyle = sf; g.fillRect(0, 0, W, H);
  const cw = Math.max(4, Math.round(W / (grande ? 96 : 60))), ch = Math.round(cw * 1.5), cols = Math.ceil(W / cw), rows = Math.ceil(H / ch);
  g.font = `${Math.round(cw * 1.4)}px ui-monospace, Menlo, Consolas, monospace`; g.textBaseline = 'top';
  const orizzonte = grande ? 0.56 : 0.6, rivaLago = grande ? 0.74 : 0.8;
  const monte = (u: number) => 0.3 + 0.08 * Math.sin(u * 5.3 + 1) + 0.05 * Math.sin(u * 13 + 2) + tx * 0.01;
  const abeti = (u: number) => orizzonte - 0.05 - 0.05 * Math.abs(Math.sin(u * 37)) * (0.6 + 0.4 * Math.sin(u * 7));
  const hashv = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const lunaX = 0.72 + tx * 0.05, lunaY = 0.16 + ty * 0.03;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const u = (q + 0.5) / cols, v = (r + 0.5) / rows; let rampa = RAMPA.cielo, luce = 0, col = monti;
    if (v < monte(u)) {
      const h = hashv(q, r), d = Math.hypot((u - lunaX) * 1.5, v - lunaY);
      if (d < 0.06) { rampa = '.:*#'; luce = 1 - d * 6; col = acc; }
      else if (h > 0.965) { rampa = ' .+*'; luce = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2 + h * 40)); col = '230,232,240'; }
      else continue;
    } else if (v < abeti(u)) { rampa = RAMPA.monti; luce = 0.35 + 0.4 * (1 - (v - monte(u)) * 4); col = monti; }
    else if (v < orizzonte) { rampa = RAMPA.bosco; luce = 0.45 + hashv(q, r) * 0.4; col = bosco; }
    else if (v < rivaLago) { rampa = RAMPA.prato; luce = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(u * 30 + t * 1.5 + v * 20)) + hashv(q, r) * 0.15; col = prato; }
    else { rampa = RAMPA.acqua; luce = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(u * 40 - t * 1.2 + v * 60)); col = lago; if (Math.abs(u - lunaX) < 0.04) { luce += 0.4; col = acc; } }
    const n = rampa.length - 1, k = Math.max(0, Math.min(n, Math.round(luce * n)));
    if (k === 0 || rampa[k] === ' ') continue;
    g.fillStyle = `rgba(${col},${(0.35 + 0.6 * Math.min(1, luce)).toFixed(2)})`;
    g.fillText(rampa[k]!, q * cw, r * ch);
  }
  // I cervi camminano lungo il prato, si fermano a brucare o a guardare, poi riprendono; ai bordi tornano indietro
  const p = Math.max(1, Math.round(cw * 0.42)), yPrato = H * (rivaLago - 0.03);
  for (const d of s.cervi) {
    d.fino -= dt;
    if (d.fino <= 0) { const x = s.r(); d.stato = x < 0.45 ? 'cammina' : x < 0.8 ? 'bruca' : 'guarda'; d.fino = 2 + s.r() * 4; if (d.x > 0.85) d.dir = -1; else if (d.x < 0.1) d.dir = 1; }
    if (d.stato === 'cammina') { d.x += d.dir * dt * 0.025; d.passo += dt * 3.2; if (d.x > 0.9) d.dir = -1; if (d.x < 0.06) d.dir = 1; }
    disegnaCervo(g, d.x * W, yPrato - (1 - d.misura) * p * 2, Math.max(1, Math.round(p * d.misura)), d);
  }
  // Uno stormo a V attraversa il cielo, ogni tanto
  s.stormo -= dt;
  if (s.stormo < 0) {
    const f = -s.stormo / 9, xb = (-0.1 + f * 1.3) * W, yb = H * (0.18 + Math.sin(f * 3) * 0.03);
    g.fillStyle = 'rgba(235,238,245,.85)';
    for (let k = 0; k < 7; k++) { const o = Math.ceil(k / 2) * (k % 2 ? 1 : -1), bx = xb - Math.abs(o) * cw * 1.4, by = yb + o * ch * 0.7, ali = Math.sin(t * 8 + k) > 0 ? -1 : 1; g.fillRect(bx, by, p, p); g.fillRect(bx - p, by + ali * p, p, p); g.fillRect(bx + p, by + ali * p, p, p); }
    if (f > 1) s.stormo = 6 + s.r() * 8;
  }
}
// Un cervo a pixel bianchi, di profilo; dir 1 guarda a destra. Le zampe si alternano camminando; brucando abbassa la testa
function disegnaCervo(g: CanvasRenderingContext2D, x: number, yPiedi: number, p: number, d: Cervo) {
  g.save(); g.translate(Math.round(x), Math.round(yPiedi)); g.scale(d.dir, 1); g.fillStyle = '#f4f1ea';
  const px = (a: number, b: number, w = 1, h = 1) => g.fillRect(a * p, b * p, w * p, h * p);
  const giu = d.stato === 'bruca', passo = d.stato === 'cammina' ? Math.round(Math.sin(d.passo * Math.PI)) : 0;
  // Zampe: due dietro, due davanti, alternate
  for (const [lx, fase] of [[-4, 1], [-2, -1], [3, -1], [5, 1]] as const) { px(lx + passo * fase * (lx < 0 ? 0.5 : 0.5), -4, 1, 4); }
  // Corpo e coda
  px(-5, -8, 11, 4); px(-4, -9, 9, 1); px(-6, -8, 1, 1);
  if (giu) { px(5, -7, 2, 2); px(6, -5, 2, 2); px(7, -3, 3, 2); px(9, -2, 1, 1); px(6, -6, 1, 1); }
  else {
    px(5, -11, 2, 4); px(6, -13, 3, 2); px(9, -12, 1, 1); px(6, -14, 1, 1);
    if (d.stato === 'guarda') px(8, -14, 1, 1);
    if (d.corna) { px(6, -16, 1, 2); px(5, -17, 1, 1); px(7, -17, 1, 1); px(4, -18, 1, 1); px(8, -18, 1, 1); px(8, -16, 1, 1); }
  }
  g.restore();
}

// --- La notte: la scena di caratteri con la luna, le stelle, il lago e l'aereo bianco a pixel
const RAMPE = { cielo: ' .:-=+*', stella: ' .+*', roccia: " .'^/\\*#", acqua: ' .-~=~' };
const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const AEREO = ['.....##.......', '.....###......', '##...####.....', '##############', '.#############', '.....####.....', '.....###......', '.....##.......'];
const maschere = new WeakMap<HTMLCanvasElement, unknown>();
function notteTela(c: HTMLCanvasElement, ora: number, tx: number, ty: number) {
  const st = getComputedStyle(c), dpr = Math.min(2, devicePixelRatio || 1), W = c.width, H = c.height;
  const g = c.getContext('2d')!, tipoA = c.dataset.ascii ?? '', s = ora / 1000;
  const acc = st.getPropertyValue('--accento-rgb').trim() || '255,164,94';
  const cw = Math.max(4, Math.round(W / (tipoA === 'notte-grande' ? 84 : 58))), ch = Math.round(cw * 1.55), cols = Math.ceil(W / cw), rows = Math.ceil(H / ch);
  g.fillStyle = '#0a0b0d'; g.fillRect(0, 0, W, H);
  g.font = `${Math.round(cw * 1.45)}px ui-monospace, Menlo, Consolas, monospace`; g.textBaseline = 'top';
  const lunaX = parseFloat(st.getPropertyValue('--luna-x')) || 0.72;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const u = (q + 0.5) / cols, v = (r + 0.5) / rows;
    let rampa = RAMPE.cielo, luce = 0, colore = '217,221,227';
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
    const n = rampa.length - 1, k = Math.max(0, Math.min(n, Math.round(luce * n)));
    if (k === 0 || rampa[k] === ' ') continue;
    g.fillStyle = `rgba(${colore},${(0.35 + 0.65 * Math.min(1, luce)).toFixed(2)})`;
    g.fillText(rampa[k]!, q * cw, r * ch);
  }
  // L'aereo bianco a pixel attraversa il cielo, pieno come i cervi dell'intro
  const p = Math.max(2, Math.round(cw * (tipoA === 'notte-grande' ? 0.9 : 0.75))), x0 = (-0.2 + ((s * 0.06) % 1) * 1.4) * W, y0 = H * (0.3 + Math.sin(s * 0.7) * 0.03);
  g.fillStyle = '#f4f1ea';
  AEREO.forEach((riga, y) => [...riga].forEach((cc, x) => { if (cc === '#') g.fillRect(Math.round(x0 + x * p), Math.round(y0 + y * p), p, p); }));
  void dpr; void maschere;
}
