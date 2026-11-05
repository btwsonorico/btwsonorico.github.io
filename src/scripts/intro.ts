// Intro della home, una volta per sessione. Una valle di notte con un grande lago, fatta di caratteri minuscoli che si muovono.
// La scena è una sola, a grandezza fissa: il computer la mostra quasi tutta, il telefono ne inquadra il lato sinistro, alla stessa scala.
// Lungo la riva, in basso a sinistra, galoppa una famiglia di cervi: pixel art bianca piena, l'opposto dei caratteri.
// Escono da dietro un abete e spariscono dietro le canne. Poi dalle chiome si alza lo stormo, che si riflette nel lago.
// È lo stesso della home: ogni uccello a pixel arriva sul suo uccello 3D e gli passa il posto. La scena si scioglie dal basso e il nome sfuma dov'è.
import { ponte } from '../lib/ponteStormo';

const T = { cervi: 0.5, nome: 1, apre: 3, aperto: 3.9, stormo: 3.1, via: 4.6, durata: 1.4 };
// Il mondo, in pixel della griglia: uguale su ogni schermo
const W = 960, H = 520, CW = 4, CH = 6, C = W / CW, R = Math.ceil(H / CH), N = C * R;
// Dove corrono i cervi, in frazioni del mondo: dall'abete alle canne. Il telefono inquadra questo tratto
const ABETE = 0.125, CANNE = 0.37, FUOCO = 0.25;

type Tela = HTMLCanvasElement;
type Ctx = CanvasRenderingContext2D;
const tela = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const semeCaso = (s: number) => () => { s = (s + 0x6d2b79f5) | 0; let z = Math.imul(s ^ (s >>> 15), 1 | s); z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z; return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
const liscio = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)]! / 16;
const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const;
const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
const mescola = (a: string, b: string, f: number) => { const x = rgb(a), y = rgb(b); return `#${hex2(x[0] + (y[0] - x[0]) * f)}${hex2(x[1] + (y[1] - x[1]) * f)}${hex2(x[2] + (y[2] - x[2]) * f)}`; };

// I caratteri, disegnati su 3x5 pixel
const GLIFI: Record<string, string[]> = {
  '.': ['...', '...', '...', '...', '.#.'], ',': ['...', '...', '...', '.#.', '#..'], "'": ['.#.', '.#.', '...', '...', '...'], '`': ['#..', '.#.', '...', '...', '...'], ':': ['...', '.#.', '...', '.#.', '...'],
  '-': ['...', '...', '###', '...', '...'], '=': ['...', '###', '...', '###', '...'], '+': ['...', '.#.', '###', '.#.', '...'], '*': ['...', '#.#', '.#.', '#.#', '...'], '~': ['...', '##.', '.##', '...', '...'],
  '^': ['.#.', '#.#', '...', '...', '...'], '/': ['..#', '..#', '.#.', '#..', '#..'], '\\': ['#..', '#..', '.#.', '..#', '..#'], '|': ['.#.', '.#.', '.#.', '.#.', '.#.'], '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '#': ['#.#', '###', '#.#', '###', '#.#'], '%': ['#.#', '..#', '.#.', '#..', '#.#'],
};
const SEGNI = Object.keys(GLIFI), INDICE = new Map(SEGNI.map((s, i) => [s, i]));
// Le famiglie di celle. Ogni famiglia ha i suoi caratteri, dal più vuoto al più pieno, e 12 livelli di luce
const ROCCIA = 0, ALBERO = 1, ERBA = 2, ACQUA = 3, STELLA = 4, CALDO = 5, LIVELLI = 12;
const RAMPE = [".:-=+*", ".'^/\\*#", ".,'`|!/", ".-~=~", ".+*", ".:*+%#"].map(s => [...s].map(c => INDICE.get(c)!));
const pixel = (c: Ctx, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };

export function monta(el: HTMLElement) {
  const radice = document.documentElement, stile = getComputedStyle(radice), V = (n: string, d: string) => stile.getPropertyValue(n).trim() || d, chiaro = radice.dataset.theme === 'light';
  const fondo = V('--bg', '#0a0b0d'), testo = V('--fg', '#d9dde3'), arancio = V('--arancio', '#ffa45e');
  const cv = el.querySelector('canvas')!, nome = el.querySelector<HTMLElement>('.intro-nome')!, TESTO = nome.textContent ?? '';
  // L'inquadratura: il mondo copre sempre lo schermo, ancorato in basso.
  // Su uno schermo stretto si vede solo il tratto dei cervi
  const px = Math.max(innerWidth / W, innerHeight / H);
  const larghezza = W * px, altezza = H * px, largo = innerWidth > innerHeight, sinistra = largo ? (innerWidth - larghezza) / 2 : Math.max(innerWidth - larghezza, Math.min(0, innerWidth / 2 - FUOCO * larghezza)), sopra = innerHeight - altezza;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  const cf = cv.cloneNode() as HTMLCanvasElement;
  cf.width = W; cf.height = H;
  cv.after(cf);
  const f = cf.getContext('2d')!;
  for (const c of [cv, cf]) Object.assign(c.style, { left: `${sinistra}px`, top: `${sopra}px`, right: 'auto', bottom: 'auto', width: `${larghezza}px`, height: `${altezza}px`, transformOrigin: `${FUOCO * 100}% 86%` });
  g.imageSmoothingEnabled = false; f.imageSmoothingEnabled = false;
  const caso = semeCaso(7);
  nome.textContent = '';
  // Solo le celle che si vedono: su telefono sono meno di un terzo
  const cVede0 = Math.max(0, Math.floor(-sinistra / px / CW) - 2), cVede1 = Math.min(C - 1, Math.ceil((innerWidth - sinistra) / px / CW) + 2);

  // --- L'atlante: ogni carattere in ogni colore, su una sola tela. Disegnare una cella è una sola copia
  const CIMA = chiaro ? ['#3a4a5c', '#0f5a2c', '#14682c', '#0755b5', '#23201b', arancio] : ['#7a93b8', '#3fc06e', '#6fdc7c', '#58a6ff', testo, arancio];
  const atlante = tela(SEGNI.length * CW, CIMA.length * LIVELLI * CH), ag = atlante.getContext('2d')!;
  CIMA.forEach((cima, k) => { for (let l = 0; l < LIVELLI; l++) { const col = mescola(fondo, cima, Math.pow((l + 1) / LIVELLI, 0.95)); SEGNI.forEach((s, i) => GLIFI[s]!.forEach((r, y) => { for (let x = 0; x < 3; x++) if (r[x] === '#') pixel(ag, i * CW + x, (k * LIVELLI + l) * CH + y, col); })); } });
  const copia = (c: Ctx, segno: number, famiglia: number, livello: number, cc: number, rr: number) => c.drawImage(atlante, segno * CW, (famiglia * LIVELLI + livello) * CH, 3, 5, cc * CW, rr * CH, 3, 5);

  // --- La scena: per ogni cella la famiglia e la luce, come un'immagine a bassissima risoluzione
  const famiglia = new Int8Array(N).fill(-1), luce = new Float32Array(N), nn = new Float32Array(N), t0 = new Float32Array(N), soglie = new Float32Array(N), copre = new Uint8Array(N), lago = new Uint8Array(N);
  const metti = (c: number, r: number, k: number, l: number) => { if (c >= 0 && c < C && r >= 0 && r < R) { const i = r * C + c; famiglia[i] = k; luce[i] = l; lago[i] = 0; } };
  for (let i = 0; i < N; i++) nn[i] = caso();
  const u = (c: number) => (c - C / 2) / (C / 2);
  // Le rive del lago: quella lontana quasi dritta, quella vicina che scende da sinistra verso destra
  const rivaLontana = (c: number) => R * 0.5 + Math.sin(c * 0.05) * 1.4 + Math.sin(c * 0.13 + 1) * 0.8;
  const TRATTI = [[0.09, 0.5], [0.2, 0.6], [0.31, 0.72], [0.42, 0.79], [0.56, 0.86], [0.74, 0.92], [1, 0.97]] as const;
  const rivaVicina = (c: number) => { const x = c / C; let k = 0; while (k < TRATTI.length - 2 && x > TRATTI[k + 1]![0]) k++; const [a, b] = TRATTI[k]!, [e, q] = TRATTI[k + 1]!, w = (x - a) / (e - a); return R * (b + (q - b) * w) + Math.sin(c * 0.21) * 0.7 + Math.sin(c * 0.53) * 0.4; };
  const margineDestro = (r: number) => C * (0.9 - ((r - R * 0.5) / (R * 0.5)) * 0.04) + Math.sin(r * 0.5) * 1.5;
  const inLago = (c: number, r: number) => c > C * 0.09 && r > rivaLontana(c) && r < rivaVicina(c) && c < margineDestro(r);
  const sentiero = (c: number) => R * 0.865 + Math.sin(c * 0.07) * 0.9;

  // Cielo: poche stelle
  for (let r = 0; r < R * 0.42; r++) for (let c = 0; c < C; c++) if (caso() < 0.008) metti(c, r, STELLA, 0.15 + caso() * caso() * 0.85);
  // Monti su due piani, con le creste a punta: più alti ai lati, la luce viene da sinistra
  [(c: number) => R * 0.37 - Math.pow(Math.abs(u(c)), 1.3) * R * 0.17 - Math.abs(Math.sin(c * 0.075) + Math.sin(c * 0.19 + 1) * 0.5) * R * 0.075, (c: number) => R * 0.44 - Math.pow(Math.abs(u(c)), 1.4) * R * 0.13 - Math.abs(Math.sin(c * 0.11 + 2) + Math.sin(c * 0.27) * 0.4) * R * 0.045].forEach((cresta, q) => {
    for (let c = 0; c < C; c++) {
      const a = Math.round(cresta(c)), pende = cresta(c + 1) - cresta(c - 1);
      for (let r = a; r < rivaLontana(c) + 1; r++) {
        const base = (q ? 0.4 : 0.26) * (1 - ((r - a) / Math.max(1, rivaLontana(c) - a)) * 0.55), lato = pende * 0.14 + Math.sin(c * 0.6 + r * 0.9) * 0.05;
        if (caso() < 0.85) metti(c, r, ROCCIA, Math.max(0.03, base + lato + (r - a < 1 ? 0.3 : 0) + (caso() - 0.5) * 0.08));
      }
    }
  });
  // Il terreno
  for (let r = Math.floor(R * 0.47); r < R; r++) for (let c = 0; c < C; c++) {
    if (r < rivaLontana(c)) continue;
    const d = (r - R * 0.47) / (R * 0.53);
    if (caso() < 0.5 + d * 0.45) metti(c, r, ERBA, 0.1 + d * 0.3 + (caso() - 0.5) * 0.14);
  }
  // Gli abeti, a piani: minuscoli sulla riva lontana, grandi sui fianchi della valle
  type Albero = { c: number; r: number; h: number; forza: number };
  const alberi: Albero[] = [];
  for (let c = 0; c < C; c += 2) for (let k = 0; k < 3; k++) alberi.push({ c: c + Math.round(caso() * 2), r: Math.round(rivaLontana(c) - (2 - k) * 2.2 - caso()), h: 5 + Math.round(caso() * 6) + k * 2, forza: 0.55 + k * 0.08 + caso() * 0.2 });
  const nLontani = alberi.length;
  for (let i = 0; i < 9000 && alberi.length < nLontani + 420; i++) {
    const x = caso() < 0.55 ? caso() * 0.22 : 0.78 + caso() * 0.22, c = Math.floor(x * C), r = Math.round(R * (0.52 + caso() * 0.42));
    const sinistro = x < 0.22, destro = c > margineDestro(r) - 3;
    if (!sinistro && !destro) continue;
    if (inLago(c, r) || Math.abs(r - sentiero(c)) < 5 || (sinistro && x > 0.1 && r > rivaVicina(c) + 2 && r < R * 0.82 && caso() < 0.6)) continue;
    const d = (r - R * 0.5) / (R * 0.5);
    alberi.push({ c, r, h: Math.round(5 + d * R * 0.24 + caso() * 3), forza: 0.42 + d * 0.5 });
  }
  alberi.sort((a, b) => a.r - b.r);
  const pino = ({ c, r, h, forza }: Albero) => {
    const tiers = Math.max(2, Math.round(h / 4)), largo2 = h * 0.42;
    for (let j = 0; j < h; j++) {
      const rr = r - h + j, q = j / h, frazione = ((j * tiers) / h) % 1, mezza = largo2 * q * (0.55 + frazione * 0.45) + (caso() - 0.5) * 0.7;
      // Un bordo vuoto stacca l'albero da ciò che ha dietro
      for (const v of [-1, 1]) { const x = c + v * Math.round(largo2 * q + 1.5), i2 = rr * C + x; if (x >= 0 && x < C && rr >= 0) famiglia[i2] = -1; }
      for (let i = -Math.ceil(mezza); i <= mezza; i++) { const lato = -i / Math.max(1, mezza); metti(c + i, rr, ALBERO, Math.max(0.06, forza * (0.34 + lato * 0.42 + (1 - frazione) * 0.42 + (caso() - 0.5) * 0.3))); }
    }
    for (let j = 0; j < 2; j++) metti(c, r + j, ROCCIA, forza * 0.5);
  };
  alberi.forEach(pino);
  // Il lago: ogni cella riflette ciò che sta sopra la riva lontana, più scuro. Le stelle e i monti tremano nell'acqua
  for (let c = 0; c < C; c++) for (let r = Math.floor(R * 0.48); r < R; r++) {
    if (!inLago(c, r)) continue;
    const y0 = rivaLontana(c), sr = Math.round(y0 - (r - y0) * 1.25), i = r * C + c, fonte = sr >= 0 ? sr * C + c : -1, k = fonte >= 0 ? famiglia[fonte]! : -1;
    if (k === STELLA) { famiglia[i] = STELLA; luce[i] = luce[fonte]! * 0.7; lago[i] = 1; continue; }
    const dist = (r - y0) / (R * 0.45), vuoto = Math.sin(r * 1.4 + c * 0.08) * 0.5 + 0.5;
    if (k >= 0 && caso() < 0.82) { famiglia[i] = k; luce[i] = Math.min(0.75, luce[fonte]! * (0.95 - dist * 0.3)); lago[i] = 1; }
    else if (caso() < 0.28 + vuoto * 0.25) { famiglia[i] = ACQUA; luce[i] = 0.2 + dist * 0.25 + caso() * 0.12; lago[i] = 1; }
    else famiglia[i] = -1;
  }
  // La riva: sabbia chiara lungo l'acqua, e il sentiero dove corrono i cervi, che si perde verso destra
  for (let c = 0; c < C; c++) {
    const y = Math.round(rivaVicina(c));
    if (c > C * 0.09) for (let k = 0; k < 2; k++) if (caso() < 0.85 && y + k < R) metti(c, y + k, ROCCIA, 0.5 + caso() * 0.25);
    if (c < C * 0.46) {
      const s = sentiero(c), largh = 3.2 - Math.max(0, c / C - 0.38) * 34;
      for (let r = Math.round(s - largh); r <= s + largh; r++) { const i = r * C + c; famiglia[i] = -1; if (caso() < 0.92) metti(c, r, ROCCIA, 0.42 + caso() * 0.32 + (r > s ? 0.08 : 0)); }
    }
  }
  // Primo piano: erba alta sotto il sentiero
  for (let c = 0; c < C; c++) { const b = Math.round(sentiero(c)) + 4 + Math.floor(caso() * 2); for (let r = b; r < R; r++) if (caso() < 0.9) metti(c, r, ERBA, 0.3 + caso() * 0.52); }
  // L'abete grande a sinistra, davanti al sentiero: i cervi ne escono
  const ABETONE: Albero = { c: Math.round(C * ABETE), r: Math.round(R * 0.965), h: Math.round(R * 0.46), forza: 1 };
  pino(ABETONE);
  pino({ c: Math.round(C * 0.05), r: Math.round(R * 0.985), h: Math.round(R * 0.37), forza: 0.92 });
  for (let j = 0; j <= ABETONE.h + 2; j++) { const r = ABETONE.r - ABETONE.h + j, m = Math.ceil(ABETONE.h * 0.22 * Math.min(1, j / ABETONE.h)); if (r >= 0 && r < R) for (let i = -m; i <= m; i++) copre[r * C + ABETONE.c + i] = 1; }
  // Le canne, dritte e fitte, con due sassi: i cervi spariscono qui
  const cCanne = Math.round(C * CANNE), base = Math.round(R * 0.91);
  for (let c = cCanne - 13; c <= cCanne + 13; c++) {
    const lontano = Math.abs(c - cCanne) / 13, alta = (1 - lontano * lontano) * R * 0.17 + 3 + (Math.sin(c * 1.7) * 0.5 + 0.5) * R * 0.045, cima = Math.round(base - alta);
    // Coprono il cervo solo fin dove ci sono, così i bordi seguono la forma del ciuffo
    for (let r = cima; r <= base; r++) { copre[r * C + c] = 1; famiglia[r * C + c] = -1; }
    if (lontano > 0.72 && c % 2) continue;
    for (let r = cima; r <= base; r++) if (caso() < 0.8) metti(c, r, ERBA, 0.34 + ((r - cima) / alta) * -0.05 + caso() * 0.5);
    // La pannocchia in cima, piena e chiara
    if (c % 3 === 0) for (let k = 1; k <= 2; k++) metti(c, cima - k, CALDO, 0.5);
  }
  for (const [cc, rr, m] of [[cCanne - 15, 0.895, 3], [cCanne + 14, 0.905, 2]] as const) for (let i = -m * 2; i <= m * 2; i++) for (let j = -m; j <= 0; j++) if (Math.hypot(i / 2, j) <= m) metti(cc + i, Math.round(R * rr) + j, ROCCIA, 0.42 + j * 0.03 - i * 0.012);
  // Si decifra dal punto in cui passano i cervi; si scioglie dal basso, seguendo lo stormo che sale
  const fx = C * FUOCO, fy = R * 0.86;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    t0[r * C + c] = (Math.hypot(c - fx, (r - fy) * 1.5) / Math.hypot(C, R * 1.5)) * 0.85 + nn[r * C + c]! * 0.2;
    soglie[r * C + c] = ((R - r) / R) * 0.72 + bayer(c, r) * 0.28;
  }
  const lucciole = Array.from({ length: 34 }, () => ({ x: caso() * C, y: R * 0.52 + caso() * R * 0.42, f: caso() * 6, v: 0.5 + caso() }));
  const polvere = Array.from({ length: 150 }, () => ({ x: caso() * C, y: R * (0.4 + caso() * 0.58), v: 0.5 + caso() * 1.3, f: caso() * 6, k: caso() < 0.3 ? CALDO : STELLA }));
  const disegnaValle = (t: number, q: number) => {
    g.clearRect(0, 0, W, H);
    const buio = 1 - liscio((t - T.apre) / (T.aperto - T.apre));
    for (let r = 0; r < R; r++) for (let c = cVede0; c <= cVede1; c++) {
      const i = r * C + c, k = famiglia[i]!;
      if (k < 0 || t < t0[i]! || soglie[i]! < q) continue;
      const n = nn[i]!, acqua = lago[i] === 1;
      let l = luce[i]!, xx = c;
      if (acqua) {
        // L'acqua: righe che scorrono e luccicano, e il riflesso che trema di lato
        l += Math.sin(c * 0.5 + r * 1.3 + t * 2.2 + n * 6) * 0.1;
        xx = c + Math.round(Math.sin(r * 0.9 + t * 1.6) * 0.8);
        if (xx < 0 || xx >= C) continue;
      } else if (k === ERBA) l += Math.sin(c * 0.14 + r * 0.5 - t * 2.3 + n) * 0.17;
      else if (k === STELLA) l *= 0.55 + 0.45 * Math.sin(t * (1 + n * 4) + n * 20);
      else if (k === ALBERO) l += Math.sin(c * 0.3 - t * 1.1 + r * 0.2) * 0.03;
      // Nebbia leggera finché la camera è vicina
      if (buio > 0 && !copre[i]) { const b = 0.5 + 0.28 * Math.sin(c * 0.07 + t * 0.55 + Math.sin(r * 0.17 + t * 0.3) * 1.6) + 0.22 * Math.sin(r * 0.21 - t * 0.4 + c * 0.05); l *= 1 - buio * 0.35 * (1 - Math.max(0.2, b)); }
      const liv = Math.max(0, Math.min(LIVELLI - 1, Math.floor(l * LIVELLI))), rampa = RAMPE[acqua && k !== STELLA ? ACQUA : k]!;
      const qui = t < t0[i]! + 0.22 ? Math.floor(t * 28 + n * 40) % rampa.length : Math.min(rampa.length - 1, Math.floor((Math.max(0, l) + n * 0.1) * rampa.length));
      copia(g, rampa[qui]!, k, liv, xx, r);
    }
    for (const b of polvere) {
      if (q > 0 || Math.sin(t * 2.2 * b.v + b.f) < 0.1) continue;
      const x = Math.round(b.x + Math.sin(t * 0.7 * b.v + b.f) * 2.5), y = Math.round(((b.y - t * b.v * 1.6) % R + R) % R);
      if (x < cVede0 || x > cVede1) continue;
      g.clearRect(x * CW, y * CH, 3, 5);
      copia(g, RAMPE[b.k]![b.v > 1.2 ? 2 : 0]!, b.k, b.k === CALDO ? 9 : 7, x, y);
    }
    if (t > 0.3) for (const b of lucciole) {
      if (Math.sin(t * 2 * b.v + b.f) < -0.15) continue;
      const x = Math.round(b.x + Math.sin(t * b.v + b.f) * 5), y = Math.round(b.y + Math.cos(t * b.v * 0.8 + b.f) * 3);
      if (x < cVede0 || x > cVede1 || y < 0 || y >= R || soglie[y * C + x]! < q) continue;
      g.clearRect(x * CW, y * CH, 3, 5);
      copia(g, RAMPE[CALDO]![5]!, CALDO, 11, x, y);
    }
  };

  // --- I cervi: bianco pieno, nessuna ombra, nessun dettaglio. Ogni fotogramma si disegna una volta e diventa pieno o vuoto: pixel netti.
  // Ogni zoccolo segue una traiettoria, fermo a terra mentre il corpo avanza, poi alzato e portato avanti. Il ginocchio si piega sempre dal lato giusto
  type Tipo = 'cervo' | 'cerva' | 'piccolo';
  const BIANCO = chiaro ? testo : '#ffffff', PASSO = 20, APPOGGIO = 0.3, ALZA = 7.5, FOTOGRAMMI = 10;
  let d: Ctx = f, minimo = 1;
  const zoccolo = (fase: number, centro: number): [number, number] => {
    const p = ((fase % 1) + 1) % 1;
    if (p < APPOGGIO) return [centro + PASSO / 2 - (p / APPOGGIO) * PASSO, 0];
    const w = (p - APPOGGIO) / (1 - APPOGGIO), e = w * w * (3 - 2 * w);
    return [centro - PASSO / 2 + e * PASSO, -Math.sin(Math.PI * w) * ALZA];
  };
  const gamba = (hx: number, hy: number, fx0: number, fy0: number, l1: number, l2: number, verso: number, w1: number, w2: number) => {
    const dx = fx0 - hx, dy = fy0 - hy, dist = Math.min(l1 + l2 - 0.05, Math.hypot(dx, dy)), a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)))), base = Math.atan2(dy, dx) + verso * a;
    const kx = hx + Math.cos(base) * l1, ky = hy + Math.sin(base) * l1;
    d.lineWidth = Math.max(w1, minimo); d.beginPath(); d.moveTo(hx, hy); d.lineTo(kx, ky); d.stroke();
    d.lineWidth = Math.max(w2, minimo); d.beginPath(); d.moveTo(kx, ky); d.lineTo(fx0, fy0); d.stroke();
  };
  const disegnaCervo = (x: number, suolo: number, s: number, tipo: Tipo, ph: number) => {
    const corto = tipo === 'piccolo' ? 0.8 : 1, grossa = tipo === 'piccolo' ? 1.2 : 1, alto = tipo === 'cervo' ? 1 : 0.88, l1 = 10.5, l2 = 11;
    const su = Math.sin((ph - 0.08) * 6.283) * 1.2, inclina = Math.sin((ph + 0.1) * 6.283) * 0.055;
    d.save();
    d.translate(x, suolo); d.scale(s, s);
    d.fillStyle = BIANCO; d.strokeStyle = BIANCO; d.lineCap = 'round'; d.lineJoin = 'round';
    const by = -19 + su, co = Math.cos(inclina), si = Math.sin(inclina), P = (a: number, b: number): [number, number] => [a * co - b * si, by + a * si + b * co];
    const [h1x, h1y] = P(-10.5 * corto, 1.5), [h2x, h2y] = P(-8.5 * corto, 2), [f1x, f1y] = P(9 * corto, 2), [f2x, f2y] = P(10.5 * corto, 1.5);
    const piedi = [zoccolo(ph, -8 * corto), zoccolo(ph + 0.13, -6.5 * corto), zoccolo(ph + 0.55, 10 * corto), zoccolo(ph + 0.68, 11.5 * corto)];
    gamba(h1x, h1y, piedi[0]![0], piedi[0]![1], l1, l2, 1, 2.6, 1.15);
    gamba(h2x, h2y, piedi[1]![0], piedi[1]![1], l1, l2, 1, 2.6, 1.15);
    gamba(f1x, f1y, piedi[2]![0], piedi[2]![1], l1, l2, -1, 2.1, 1.05);
    gamba(f2x, f2y, piedi[3]![0], piedi[3]![1], l1, l2, -1, 2.1, 1.05);
    d.translate(0, by); d.rotate(inclina);
    // Schiena dritta, petto a cuneo, come un cervo in corsa a pochi pixel
    d.beginPath();
    d.moveTo(-15.5 * corto, -2 * alto); d.lineTo(-11 * corto, -5 * alto); d.lineTo(8 * corto, -5 * alto); d.lineTo(14 * corto, -5.6 * alto); d.lineTo(15 * corto, 0); d.lineTo(10 * corto, 5.4 * alto); d.lineTo(3 * corto, 3.6 * alto); d.lineTo(-7 * corto, 2.6 * alto); d.lineTo(-11 * corto, 6 * alto); d.lineTo(-16 * corto, 3 * alto);
    d.closePath(); d.fill();
    d.save(); d.translate(-15.2 * corto, -2.4 * alto); d.rotate(-0.65); d.beginPath(); d.ellipse(-1.6, 0, 2.6, 1.15, 0, 0, 6.3); d.fill(); d.restore();
    const nx = 20.5 * corto, ny = -11.5 - su * 0.35;
    d.beginPath(); d.moveTo(8 * corto, -5.2 * alto); d.quadraticCurveTo(14 * corto, -7.5, nx - 2.3, ny - 1.9); d.lineTo(nx + 1.4, ny + 2.1); d.quadraticCurveTo(nx - 2.2, ny + 7, 13 * corto, 3.4 * alto); d.closePath(); d.fill();
    d.save(); d.translate(nx, ny); d.rotate(-inclina); d.scale(grossa, grossa);
    d.beginPath(); d.ellipse(2.3, 0.6, 4.7, 2.3, 0.2, 0, 6.3); d.fill();
    const orecchio = tipo === 'cervo' ? 2.5 : tipo === 'cerva' ? 3.5 : 3.8;
    d.save(); d.translate(-1.2, -1.3); d.rotate(-0.85); d.beginPath(); d.ellipse(0, -orecchio * 0.8, 1.1, orecchio, 0, 0, 6.3); d.fill(); d.restore();
    if (tipo === 'cervo') {
      d.lineWidth = Math.max(1, minimo);
      d.beginPath(); d.moveTo(0.6, -1.8); d.bezierCurveTo(-0.5, -6, -4, -9, -7, -14); d.moveTo(-1.4, -5.8); d.quadraticCurveTo(-0.8, -9, 1.6, -11.5); d.moveTo(-3.7, -9); d.quadraticCurveTo(-3.8, -12.5, -1.6, -15.5); d.moveTo(-5.6, -11.8); d.quadraticCurveTo(-8.5, -13.5, -10.5, -13); d.stroke();
    }
    d.restore();
    d.restore();
  };
  const fotogrammi = (tipo: Tipo, sc: number) => Array.from({ length: FOTOGRAMMI }, (_, k) => {
    const l = Math.ceil(76 * sc), h = Math.ceil(52 * sc), c = tela(l, h), q = c.getContext('2d', { willReadFrequently: true })!;
    d = q; minimo = 1.5 / sc;
    disegnaCervo(30 * sc, 46 * sc, sc, tipo, k / FOTOGRAMMI);
    const dati = q.getImageData(0, 0, l, h);
    q.clearRect(0, 0, l, h);
    q.fillStyle = BIANCO;
    for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) if (dati.data[(y * l + x) * 4 + 3]! > 105) q.fillRect(x, y, 1, 1);
    return c;
  });
  // Ognuno ha la sua corsia sul sentiero: chi corre più in basso è più vicino, quindi un po' più grande
  const FAMIGLIA = ([['cervo', 0.95, 0.75, -0.012, 1.02], ['cerva', 0.88, 0.28, 0.016, 0.97], ['piccolo', 0.58, 0, 0.002, 1.05], ['piccolo', 0.54, 0.52, -0.017, 1]] as const)
    .map(([tipo, sc, ritardo, corsia, ritmo], i) => ({ tipo: tipo as Tipo, sc, ritardo, corsia, ritmo, seme: i * 1.7 + 0.4, quadri: fotogrammi(tipo as Tipo, sc) }))
    .sort((a, b) => a.corsia - b.corsia);
  const CORSA = 1.8;
  const disegnaCervi = (t: number) => {
    if (t < T.cervi || t > T.cervi + CORSA + 1) return;
    for (const a of FAMIGLIA) {
      const u0 = (t - T.cervi - a.ritardo) / (CORSA / a.ritmo);
      if (u0 <= 0 || u0 >= 1) continue;
      const u1 = u0 + Math.sin(u0 * 7 + a.seme) * 0.012, x = W * (ABETE + (CANNE - ABETE) * u1), suolo = (sentiero(x / CW) + 1) * CH + a.corsia * H;
      // Gli zoccoli non scivolano: il fotogramma dipende dalla strada fatta
      const fase = x / ((PASSO / APPOGGIO) * a.sc) + a.seme, fr = a.quadri[Math.floor(((fase % 1) + 1) % 1 * FOTOGRAMMI)]!, dx = Math.round(x - 30 * a.sc), dy = Math.round(suolo - 46 * a.sc);
      f.drawImage(fr, dx, dy);
      // L'abete e le canne stanno davanti: le loro celle coprono il cervo
      const c0 = Math.max(0, Math.floor(dx / CW)), c1 = Math.min(C - 1, Math.ceil((dx + fr.width) / CW)), r0 = Math.max(0, Math.floor(dy / CH)), r1 = Math.min(R - 1, Math.ceil((dy + fr.height) / CH));
      for (let r = r0; r <= r1; r++) for (let q = c0; q <= c1; q++) if (copre[r * C + q]) f.clearRect(q * CW, r * CH, CW, CH);
    }
  };

  // --- Lo stormo: ogni uccello parte da una chioma e arriva sul suo uccello 3D. Quando è arrivato, il 3D gli prende il posto
  type Uccello = { x0: number; y0: number; t0: number; dura: number; f: number; onda: number };
  let stormo: Uccello[] | null = null;
  const creaStormo = () => {
    const n = ponte.xy ? ponte.xy.length / 2 : 300, chiome = alberi.filter(a => a.h > 3);
    stormo = Array.from({ length: n }, (_, i) => {
      const a = chiome[Math.floor(caso() * chiome.length)] ?? { c: C / 2, r: R / 2, h: 0 };
      return { x0: a.c * CW, y0: (a.r - a.h) * CH, t0: T.stormo + (i / n) * 1.25, dura: 1.15 + caso() * 0.45, f: caso() * 6, onda: (caso() - 0.5) * W * 0.09 };
    });
  };
  const FORMA = [['x...x', '.x.x.', '..x..'], ['.....', 'xx.xx', '..x..']];
  const rifletti = mescola(fondo, arancio, 0.42);
  const disegnaStormo = (t: number) => {
    if (t < T.stormo) return;
    if (!stormo) creaStormo();
    const xy = ponte.xy;
    let arrivati = 0;
    while (arrivati < stormo!.length && (t - stormo![arrivati]!.t0) / stormo![arrivati]!.dura >= 1) arrivati++;
    ponte.visibili = arrivati;
    for (let i = arrivati; i < stormo!.length; i++) {
      const b = stormo![i]!, w = (t - b.t0) / b.dura;
      if (w <= 0) continue;
      const e = liscio(w), su = Math.pow(e, 0.65), mx = xy ? (xy[i * 2]! - sinistra) / px : W * 0.62 + Math.sin(b.f) * W * 0.12, my = xy ? (xy[i * 2 + 1]! - sopra) / px : H * 0.24 + Math.cos(b.f) * H * 0.08;
      const x = b.x0 + (mx - b.x0) * e + Math.sin(w * Math.PI) * b.onda, y = b.y0 + (my - b.y0) * su, lato = w < 0.7 ? 2 : 1, fo = FORMA[Math.floor(t * 9 + b.f) % 2]!;
      f.fillStyle = arancio;
      fo.forEach((r, j) => { for (let k = 0; k < 5; k++) if (r[k] === 'x') f.fillRect(Math.round(x) + (k - 2) * lato, Math.round(y) + (j - 1) * lato, lato, lato); });
      // Il riflesso nel lago, finché la scena non si scioglie
      const c0 = Math.floor(x / CW), yr = rivaLontana(c0) * CH, ry = yr + (yr - y) * 0.8;
      if (t < T.via + 0.5 && y < yr && inLago(c0, Math.floor(ry / CH))) { f.fillStyle = rifletti; f.fillRect(Math.round(x) - lato, Math.round(ry), lato * 3, 1); }
    }
  };

  let conta = 0;
  const VICINO = largo ? 1.12 : 1.06;
  const disegno = (t: number) => {
    const u0 = (t - T.via) / T.durata, q = u0 > 0 ? liscio(u0 * 1.05) * 1.02 : 0;
    // La camera: appena più vicina ai cervi, poi si allontana fino a mostrare tutto
    const lontano = liscio((t - T.apre) / (T.aperto - T.apre)), sc = 1 + (VICINO - 1) * (1 - lontano), forma = sc > 1.001 ? `scale(${sc})` : '';
    cv.style.transform = forma; cf.style.transform = forma;
    if (conta++ % 2 === 0 || u0 > 0) disegnaValle(t, q);
    f.clearRect(0, 0, W, H);
    disegnaCervi(t);
    disegnaStormo(t);
  };

  // --- Il tempo: si può saltare, con un clic o un tasto
  let t = 0, prima = 0, viaData = false, finito = false, ferma = 0;
  const parametro = new URLSearchParams(location.search).get('intro');
  if (parametro && !Number.isNaN(Number(parametro))) ferma = Number(parametro);
  const parti = () => { if (viaData) return; viaData = true; radice.dataset.intro = 'via'; el.classList.add('in-volo'); nome.textContent = TESTO; };
  const chiudi = () => { if (finito) return; finito = true; parti(); delete radice.dataset.intro; el.remove(); ['pointerdown', 'keydown', 'wheel'].forEach(e => removeEventListener(e, salta)); };
  const salta = () => {
    if (t >= T.via) { chiudi(); return; }
    t = T.via;
    if (!stormo) creaStormo();
    // Lo stormo finisce di salire nel tempo che resta
    stormo!.forEach((b, i) => { b.t0 = T.via + (i / stormo!.length) * 0.5; b.dura = 0.8; });
    for (let i = 0; i < N; i++) t0[i] = -1;
    parti();
  };
  const aggiorna = (ora: number) => {
    if (!viaData) {
      const scritte = Math.floor(liscio((ora - T.nome) / 0.6) * TESTO.length);
      if (nome.textContent !== TESTO.slice(0, scritte)) nome.textContent = TESTO.slice(0, scritte);
    } else {
      // Sfuma a scatti, come il resto della scena
      nome.style.opacity = String(1 - Math.floor(liscio((ora - T.via - 0.1) / 0.7) * 5) / 5);
    }
  };
  if (ferma) {
    // Solo per le prove: ?intro=3.2 ferma la scena a quel secondo
    if (ferma >= T.via) parti();
    aggiorna(ferma);
    setTimeout(() => disegno(ferma), 1500);
    return;
  }
  ['pointerdown', 'keydown', 'wheel'].forEach(e => addEventListener(e, salta, { passive: true }));
  const giro = (ms: number) => {
    if (finito) return;
    // Anche su un telefono lento l'intro dura lo stesso tempo: salta fotogrammi, non rallenta
    const dt = Math.min(0.25, prima ? (ms - prima) / 1000 : 0);
    prima = ms; t += dt;
    if (t >= T.via) parti();
    aggiorna(t);
    disegno(t);
    if ((t - T.via) / T.durata >= 1.02) { chiudi(); return; }
    requestAnimationFrame(giro);
  };
  requestAnimationFrame(giro);
}
