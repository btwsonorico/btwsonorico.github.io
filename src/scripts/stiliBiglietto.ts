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

// ---------------- Lime Bloom: una fioritura di luce su una griglia nera, e dentro la luce una colonia del Game of Life
// che nasce, cresce e muore. Sul retro il nome del termine si scioglie in celle vive, poi si riscrive
const FIORI = [['#e9ffb0', '#b9f04a', '#5d8a1e'], ['#d6fbff', '#4ae0f0', '#1d6a7a'], ['#ffe0f2', '#ff6fb8', '#8a2a5a']] as const;
const lime: Stile = {
  id: 'lime', ascii: true,
  davanti: c => `<div class="fiore"></div><canvas data-ascii="vita" data-seme="${semeTela(c)}"></canvas><i class="tick" style="left:8%;top:7%"></i><i class="tick" style="right:8%;bottom:7%"></i>`,
  dietro: c => `<div class="fiore"></div><canvas data-ascii="vita-parola" data-seme="${semeTela(c)}" data-testo="${esc(c.termine.toUpperCase().slice(0, 18))}"></canvas>`,
  variabili: c => { const f = una(c, 'fiore', () => scegli(FIORI, c.r)); return { '--f1': f[0], '--f2': f[1], '--f3': f[2] }; },
};

// ---------------- Risograph: due inchiostri fluo sovrapposti, mezzatinta, il fuori registro che segue l'inclinazione
const INCHIOSTRI = [['#ff48b0', '#0078bf'], ['#ff6c2f', '#00838a'], ['#ff665e', '#3255a4']] as const;
const FORME: ((a: string, b: string, id: string) => [string, string])[] = [
  // Un profilo con un sole dietro
  (a, b, id) => [`<circle cx="58" cy="52" r="40" fill="url(#ha${id})"/><path d="M0 110 Q30 70 60 92 T100 80 V110 Z" fill="${a}"/>`, `<path d="M38 96 C30 70 32 40 50 26 C64 16 80 22 82 36 C84 44 78 46 80 52 L86 60 L80 62 C82 70 76 74 70 72 C66 84 64 92 66 100 Z" fill="url(#hb${id})" stroke="${b}" stroke-width="1.6"/><circle cx="72" cy="42" r="2.4" fill="${b}"/>`],
  // Un pianeta con l'anello
  (a, b, id) => [`<circle cx="50" cy="55" r="30" fill="url(#ha${id})"/><circle cx="82" cy="20" r="6" fill="${a}"/>`, `<ellipse cx="50" cy="58" rx="46" ry="11" fill="none" stroke="${b}" stroke-width="4" transform="rotate(-14 50 58)"/><circle cx="40" cy="48" r="10" fill="url(#hb${id})"/>`],
  // Un occhio
  (a, b, id) => [`<path d="M6 55 Q50 10 94 55 Q50 100 6 55 Z" fill="url(#ha${id})"/>`, `<circle cx="50" cy="55" r="20" fill="url(#hb${id})"/><circle cx="50" cy="55" r="8" fill="${b}"/><path d="M6 55 Q50 10 94 55" fill="none" stroke="${b}" stroke-width="2"/>`],
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

// ---------------- ASCII Night: una scena di caratteri, come l'intro della home
const ACCENTI = ['255,164,94', '111,227,255', '198,245,106', '255,138,194'] as const;
const notte: Stile = {
  id: 'notte', ascii: true,
  davanti: () => `<canvas data-ascii="notte"></canvas>`,
  dietro: () => `<canvas data-ascii="notte-grande"></canvas>`,
  variabili: c => { const a = una(c, 'accento', () => scegli(ACCENTI, c.r)); return { '--accento-a': `rgb(${a})`, '--accento-rgb': a, '--luna-x': (0.55 + c.r() * 0.3).toFixed(2) }; },
};

// ---------------- Koi: uno stagno visto dall'alto. Ogni pesce ha la sua varietà (kohaku, sanke, showa, ogon, asagi,
// tancho, chagoi); nuota con una spina flessibile, le pinne ondeggiano, l'acqua fa cerchi. Ninfee e un fiore di loto
const ACQUE = [
  { a: '#06222a', b: '#0f3b42', luce: '160,230,220', testo: '#e9f4f0', accento: '#ff7a59' },
  { a: '#0a0f14', b: '#18252e', luce: '170,200,230', testo: '#eef2f5', accento: '#ff6a4d' },
  { a: '#0b2a22', b: '#1b4a3b', luce: '190,240,200', testo: '#ecf6ee', accento: '#ffb347' },
  { a: '#0d1830', b: '#22365c', luce: '170,190,255', testo: '#eef1fb', accento: '#ff8a7a' },
] as const;
const koi: Stile = {
  id: 'koi', ascii: true,
  davanti: c => `<canvas data-ascii="koi" data-seme="${semeTela(c)}"></canvas>`,
  dietro: c => `<canvas data-ascii="koi-grande" data-seme="${semeTela(c)}"></canvas>`,
  variabili: c => { const q = una(c, 'acqua', () => scegli(ACQUE, c.r)); return { '--acqua-a': q.a, '--acqua-b': q.b, '--luce-rgb': q.luce, '--testo-k': q.testo, '--accento-k': q.accento }; },
};

// ---------------- Valley: la valle dell'intro della home, di caratteri minuscoli. Montagne, abeti, il prato e il lago;
// una famiglia di cervi bianchi a pixel passeggia, bruca e beve; uno stormo attraversa il cielo
const VALLI = [
  { cielo: ['#141a2e', '#3a3354'], monti: '150,160,210', bosco: '120,170,150', prato: '170,200,140', acqua: '140,170,220', accento: '255,190,140' },
  { cielo: ['#0c1a14', '#20382c'], monti: '140,180,160', bosco: '110,170,120', prato: '190,215,150', acqua: '130,190,180', accento: '230,240,150' },
  { cielo: ['#1e1424', '#5a3446'], monti: '220,160,170', bosco: '170,140,170', prato: '220,190,160', acqua: '230,170,180', accento: '255,210,150' },
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

export const STILI: Stile[] = [rapid, lime, risograph, notte, koi, valle];

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
  if (tipoT.startsWith('koi')) return stagno(c, ora, dt, dpr, tx, ty, tipoT === 'koi-grande');
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

// --- Lo stagno delle koi, visto dall'alto
type Koi = { x: number; y: number; a: number; vel: number; svolta: number; lungo: number; spina: { x: number; y: number }[]; varieta: Varieta; macchie: { t: number; lato: number; r: number; col: string }[]; fase: number };
type Varieta = { base: string; pinne: string; nome: string };
type Cerchio = { x: number; y: number; r: number; vita: number };
type Stagno = { pesci: Koi[]; cerchi: Cerchio[]; ninfee: { x: number; y: number; r: number; a: number; fiore: boolean }[]; r: () => number; goccia: number };
const ROSSO = '#d8361c', BIANCO = '#f4efe5', NERO = '#17181a';
const VARIETA: (Varieta & { macchie: (r: () => number) => { t: number; lato: number; r: number; col: string }[] })[] = [
  { nome: 'kohaku', base: BIANCO, pinne: 'rgba(250,246,238,.55)', macchie: r => Array.from({ length: 2 + Math.floor(r() * 3) }, () => ({ t: 0.12 + r() * 0.6, lato: (r() - 0.5) * 0.8, r: 0.5 + r() * 0.5, col: ROSSO })) },
  { nome: 'sanke', base: BIANCO, pinne: 'rgba(250,246,238,.55)', macchie: r => [...Array.from({ length: 2 + Math.floor(r() * 2) }, () => ({ t: 0.15 + r() * 0.55, lato: (r() - 0.5) * 0.8, r: 0.45 + r() * 0.4, col: ROSSO })), ...Array.from({ length: 3 + Math.floor(r() * 3) }, () => ({ t: 0.2 + r() * 0.6, lato: (r() - 0.5) * 1.2, r: 0.18 + r() * 0.2, col: NERO }))] },
  { nome: 'showa', base: NERO, pinne: 'rgba(40,40,44,.6)', macchie: r => [...Array.from({ length: 2 + Math.floor(r() * 2) }, () => ({ t: 0.1 + r() * 0.6, lato: (r() - 0.5) * 0.8, r: 0.45 + r() * 0.4, col: ROSSO })), ...Array.from({ length: 2 }, () => ({ t: 0.2 + r() * 0.5, lato: (r() - 0.5) * 0.9, r: 0.35 + r() * 0.3, col: BIANCO }))] },
  { nome: 'ogon', base: '#e9b13c', pinne: 'rgba(245,200,100,.55)', macchie: () => [{ t: 0.15, lato: 0, r: 0.6, col: '#f7d77e' }] },
  { nome: 'asagi', base: '#7f97ad', pinne: 'rgba(235,120,70,.6)', macchie: r => [{ t: 0.05, lato: 0, r: 0.6, col: '#c9d3dc' }, { t: 0.35 + r() * 0.2, lato: 0.9, r: 0.4, col: '#e4703a' }, { t: 0.35 + r() * 0.2, lato: -0.9, r: 0.4, col: '#e4703a' }] },
  { nome: 'tancho', base: BIANCO, pinne: 'rgba(250,246,238,.55)', macchie: () => [{ t: 0.07, lato: 0, r: 0.42, col: ROSSO }] },
  { nome: 'chagoi', base: '#a8743d', pinne: 'rgba(190,140,80,.55)', macchie: () => [] },
];
function stagno(c: HTMLCanvasElement, ora: number, dt: number, dpr: number, tx: number, ty: number, grande: boolean) {
  const g = c.getContext('2d')!, W = c.width, H = c.height;
  const s = prendi<Stagno>(c, () => {
    const r = casoTela(c), n = grande ? 7 : 4, base = Math.min(W, H);
    const pesci = Array.from({ length: n }, (_, k) => {
      const v = VARIETA[Math.floor(r() * VARIETA.length)]!, lungo = base * (grande ? 0.2 : 0.3) * (0.75 + r() * 0.45), x = W * (0.2 + r() * 0.6), y = H * (0.2 + r() * 0.6), a = r() * Math.PI * 2;
      return { x, y, a, vel: 0, svolta: 0, lungo, spina: Array.from({ length: 12 }, (_, i) => ({ x: x - Math.cos(a) * (lungo / 11) * i, y: y - Math.sin(a) * (lungo / 11) * i })), varieta: v, macchie: v.macchie(r), fase: k * 1.7 + r() * 3 };
    });
    const ninfee = Array.from({ length: grande ? 4 : 2 }, (_, k) => ({ x: W * (k % 2 ? 0.78 : 0.18) + (r() - 0.5) * W * 0.12, y: H * (0.15 + (k / (grande ? 4 : 2)) * 0.75), r: base * (0.07 + r() * 0.05), a: r() * 6.28, fiore: k === 0 }));
    return { pesci, cerchi: [], ninfee, r, goccia: 2 };
  });
  const acquaA = varCss(c, '--acqua-a', '#06222a'), acquaB = varCss(c, '--acqua-b', '#0f3b42'), luce = varCss(c, '--luce-rgb', '160,230,220');
  // L'acqua: un fondo che va dal centro verso i bordi, e riflessi lenti che seguono l'inclinazione
  const fondo = g.createRadialGradient(W * (0.5 + tx * 0.1), H * (0.45 + ty * 0.1), 0, W / 2, H / 2, Math.max(W, H) * 0.75);
  fondo.addColorStop(0, acquaB); fondo.addColorStop(1, acquaA);
  g.fillStyle = fondo; g.fillRect(0, 0, W, H);
  const t = ora / 1000;
  for (let k = 0; k < 5; k++) {
    const x = W * (0.5 + 0.42 * Math.sin(t * 0.07 * (k + 1) + k * 2)), y = H * (0.5 + 0.42 * Math.cos(t * 0.05 * (k + 2) + k)), r = Math.min(W, H) * (0.18 + 0.06 * k);
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${luce},.07)`); gr.addColorStop(1, `rgba(${luce},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Una goccia ogni tanto fa un cerchio
  s.goccia -= dt;
  if (s.goccia <= 0) { s.goccia = 2.5 + s.r() * 4; s.cerchi.push({ x: W * (0.1 + s.r() * 0.8), y: H * (0.1 + s.r() * 0.8), r: 0, vita: 1 }); }
  // I pesci: la testa vaga con una svolta che cambia piano, resta lontana dai bordi; la spina segue la testa
  for (const p of s.pesci) {
    p.svolta += ((Math.sin(t * 0.6 + p.fase) + Math.sin(t * 0.23 + p.fase * 2)) * 0.6 - p.svolta) * Math.min(1, dt * 1.5);
    const m = p.lungo * 0.7, dx = p.x < m ? 1 : p.x > W - m ? -1 : 0, dy = p.y < m ? 1 : p.y > H - m ? -1 : 0;
    if (dx || dy) { const voluto = Math.atan2(dy, dx); let d = voluto - p.a; d = Math.atan2(Math.sin(d), Math.cos(d)); p.svolta += d * dt * 3; }
    p.a += p.svolta * dt;
    p.vel += ((p.lungo * (0.32 + 0.12 * Math.sin(t * 0.4 + p.fase))) - p.vel) * Math.min(1, dt);
    p.x += Math.cos(p.a) * p.vel * dt; p.y += Math.sin(p.a) * p.vel * dt;
    // Il corpo ondeggia: la testa si sposta un poco di lato, la coda di più
    const onda = Math.sin(t * 5 + p.fase) * p.lungo * 0.018;
    p.spina[0] = { x: p.x + Math.cos(p.a + Math.PI / 2) * onda, y: p.y + Math.sin(p.a + Math.PI / 2) * onda };
    const L = p.lungo / 11;
    for (let i = 1; i < p.spina.length; i++) {
      const a = p.spina[i - 1]!, b = p.spina[i]!, d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      b.x = a.x + ((b.x - a.x) / d) * L; b.y = a.y + ((b.y - a.y) / d) * L;
    }
    if (Math.abs(p.svolta) > 0.9 && s.r() < dt * 0.6) s.cerchi.push({ x: p.x, y: p.y, r: 0, vita: 0.7 });
  }
  // Prima le ombre dei pesci sul fondo, poi i pesci, poi le ninfee che li coprono quando ci passano sotto
  for (const p of s.pesci) corpoKoi(g, p, dpr, true, t);
  for (const p of s.pesci) corpoKoi(g, p, dpr, false, t);
  for (const n of s.ninfee) ninfea(g, n, t, dpr);
  for (const q of s.cerchi) {
    q.r += dt * Math.min(W, H) * 0.12; q.vita -= dt * 0.35;
    g.strokeStyle = `rgba(${luce},${(Math.max(0, q.vita) * 0.35).toFixed(3)})`; g.lineWidth = dpr;
    g.beginPath(); g.ellipse(q.x, q.y, q.r, q.r * 0.9, 0, 0, Math.PI * 2); g.stroke();
    if (q.r > 12 * dpr) { g.beginPath(); g.ellipse(q.x, q.y, q.r * 0.6, q.r * 0.54, 0, 0, Math.PI * 2); g.stroke(); }
  }
  s.cerchi = s.cerchi.filter(q => q.vita > 0);
}
function corpoKoi(g: CanvasRenderingContext2D, p: Koi, dpr: number, ombra: boolean, t: number) {
  const sp = p.spina, n = sp.length, larghezza = (i: number) => { const u = i / (n - 1); return p.lungo * 0.165 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.1)), 0.7) * (1 - u * 0.35); };
  const lato = (i: number, s: number) => {
    const a = sp[Math.max(0, i - 1)]!, b = sp[Math.min(n - 1, i + 1)]!, ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2, w = larghezza(i) * s;
    return { x: sp[i]!.x + Math.cos(ang) * w, y: sp[i]!.y + Math.sin(ang) * w };
  };
  g.save();
  if (ombra) g.translate(p.lungo * 0.05, p.lungo * 0.08);
  // Le pinne pettorali e la coda, velate
  const coda = sp[n - 1]!, prima = sp[n - 3]!, ac = Math.atan2(coda.y - prima.y, coda.x - prima.x), batte = Math.sin(t * 5 + p.fase) * 0.35;
  g.fillStyle = ombra ? 'rgba(0,0,0,.22)' : p.varieta.pinne;
  for (const s of [-1, 1]) {
    const a0 = sp[2]!, a1 = sp[3]!, ang = Math.atan2(a1.y - a0.y, a1.x - a0.x) + s * (1.9 + Math.sin(t * 3 + p.fase) * 0.25);
    g.beginPath(); g.ellipse(a0.x + Math.cos(ang) * p.lungo * 0.1, a0.y + Math.sin(ang) * p.lungo * 0.1, p.lungo * 0.11, p.lungo * 0.045, ang, 0, Math.PI * 2); g.fill();
  }
  g.beginPath(); g.moveTo(prima.x, prima.y);
  for (const s of [-1, 1]) { const a = ac + batte + s * 0.55; g.quadraticCurveTo(coda.x + Math.cos(ac + batte) * p.lungo * 0.08, coda.y + Math.sin(ac + batte) * p.lungo * 0.08, coda.x + Math.cos(a) * p.lungo * 0.2, coda.y + Math.sin(a) * p.lungo * 0.2); g.lineTo(coda.x, coda.y); }
  g.fill();
  // Il corpo: la sagoma lungo la spina; le macchie si ritagliano dentro
  g.beginPath();
  for (let i = 0; i < n; i++) { const q = lato(i, 1); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }
  for (let i = n - 1; i >= 0; i--) { const q = lato(i, -1); g.lineTo(q.x, q.y); }
  g.closePath();
  if (ombra) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fill(); g.restore(); return; }
  g.fillStyle = p.varieta.base; g.fill();
  g.save(); g.clip();
  for (const m of p.macchie) {
    const i = Math.min(n - 1, Math.round(m.t * (n - 1))), q = lato(i, m.lato);
    g.fillStyle = m.col; g.beginPath(); g.ellipse(q.x, q.y, larghezza(i) * m.r * 1.6 + p.lungo * 0.02, larghezza(i) * m.r * 1.1 + p.lungo * 0.015, 0, 0, Math.PI * 2); g.fill();
  }
  // Una luce sul dorso
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = Math.max(1, p.lungo * 0.02); g.beginPath();
  for (let i = 1; i < n - 2; i++) i === 1 ? g.moveTo(sp[i]!.x, sp[i]!.y) : g.lineTo(sp[i]!.x, sp[i]!.y);
  g.stroke(); g.restore();
  // Gli occhi
  g.fillStyle = 'rgba(20,20,22,.8)';
  for (const s of [-1, 1]) { const q = lato(1, s * 0.75); g.beginPath(); g.arc(q.x, q.y, Math.max(dpr, p.lungo * 0.012), 0, Math.PI * 2); g.fill(); }
  g.restore();
}
function ninfea(g: CanvasRenderingContext2D, n: Stagno['ninfee'][number], t: number, dpr: number) {
  const a = n.a + Math.sin(t * 0.3 + n.x) * 0.05, y = n.y + Math.sin(t * 0.5 + n.x) * dpr;
  g.fillStyle = '#2f5d3a'; g.beginPath(); g.moveTo(n.x, y); g.arc(n.x, y, n.r, a + 0.35, a + Math.PI * 2 - 0.05); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(160,210,150,.35)'; g.lineWidth = dpr; g.stroke();
  g.strokeStyle = 'rgba(160,210,150,.18)';
  for (let k = 1; k < 6; k++) { const b = a + 0.35 + k * 1.1; g.beginPath(); g.moveTo(n.x, y); g.lineTo(n.x + Math.cos(b) * n.r * 0.9, y + Math.sin(b) * n.r * 0.9); g.stroke(); }
  if (!n.fiore) return;
  // Un loto rosa a petali sovrapposti
  for (let k = 0; k < 8; k++) {
    const b = k * 0.785 + t * 0.05, r = n.r * (k % 2 ? 0.42 : 0.52);
    g.fillStyle = k % 2 ? '#f6b5cf' : '#ee8fb4'; g.beginPath(); g.ellipse(n.x + Math.cos(b) * r * 0.55, y + Math.sin(b) * r * 0.55, r * 0.55, r * 0.26, b, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#ffd86a'; g.beginPath(); g.arc(n.x, y, n.r * 0.12, 0, Math.PI * 2); g.fill();
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
