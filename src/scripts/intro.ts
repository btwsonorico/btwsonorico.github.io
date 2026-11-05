// Intro della home, una volta per sessione. Mescola gli stili e va dal vicino al lontano.
// Si parte appena più vicino, in una foresta fatta di caratteri che si muovono, con la nebbia e la polvere che passano.
// Fra gli alberi galoppa una famiglia di cervi: pixel art bianca piena, dieci fotogrammi di corsa, l'opposto dei caratteri. Escono da dietro un albero e spariscono dietro un altro.
// Poi la camera si allontana: si vede la valle, compare il nome, e dagli alberi si alza lo stormo.
// È lo stesso della home: ogni uccello a pixel arriva sul suo uccello 3D e gli passa il posto. La foresta si scioglie dal basso e il nome sfuma dov'è.
import { ponte } from '../lib/ponteStormo';

const T = { cervi: 0.5, apre: 3.4, aperto: 4.4, nome: 3.4, stormo: 3.6, via: 5, durata: 1.4 };

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
  const px = innerWidth < 700 ? 1.25 : Math.max(2, Math.ceil(innerWidth / 800)), W = Math.ceil(innerWidth / px), H = Math.ceil(innerHeight / px), CW = 4, CH = 6, C = Math.ceil(W / CW), R = Math.ceil(H / CH), N = C * R;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  // Sopra la foresta, una seconda tela per cervi e stormo: non si ingrandisce con lei
  const cf = cv.cloneNode() as HTMLCanvasElement;
  cf.width = W; cf.height = H;
  cv.after(cf);
  const f = cf.getContext('2d')!;
  const VICINO = W > H ? 1.2 : 1.15, META = 1 / (2 * VICINO);
  g.imageSmoothingEnabled = false; f.imageSmoothingEnabled = false;
  const caso = semeCaso(7);
  nome.textContent = '';

  // --- L'atlante: ogni carattere in ogni colore, su una sola tela. Disegnare una cella è una sola copia
  const CIMA = chiaro ? ['#3a4a5c', '#0f5a2c', '#14682c', '#0755b5', '#23201b', arancio] : ['#7a93b8', '#3fc06e', '#6fdc7c', '#58a6ff', testo, arancio];
  const atlante = tela(SEGNI.length * CW, CIMA.length * LIVELLI * CH), ag = atlante.getContext('2d')!;
  CIMA.forEach((cima, k) => { for (let l = 0; l < LIVELLI; l++) { const col = mescola(fondo, cima, Math.pow((l + 1) / LIVELLI, 0.95)); SEGNI.forEach((s, i) => GLIFI[s]!.forEach((r, y) => { for (let x = 0; x < 3; x++) if (r[x] === '#') pixel(ag, i * CW + x, (k * LIVELLI + l) * CH + y, col); })); } });
  const copia = (c: Ctx, segno: number, famiglia: number, livello: number, cc: number, rr: number) => c.drawImage(atlante, segno * CW, (famiglia * LIVELLI + livello) * CH, 3, 5, cc * CW, rr * CH, 3, 5);

  // --- La foresta: per ogni cella la famiglia e la luce, come un'immagine a bassissima risoluzione
  const famiglia = new Int8Array(N).fill(-1), luce = new Float32Array(N), nn = new Float32Array(N), t0 = new Float32Array(N);
  const metti = (c: number, r: number, k: number, l: number) => { if (c >= 0 && c < C && r >= 0 && r < R) { const i = r * C + c; famiglia[i] = k; luce[i] = l; } };
  const u = (c: number) => (c - C / 2) / (C / 2), oriz = Math.round(R * 0.6);
  for (let i = 0; i < N; i++) nn[i] = caso();
  for (let r = 0; r < oriz; r++) for (let c = 0; c < C; c++) {
    if (caso() < 0.009) metti(c, r, STELLA, 0.15 + caso() * caso() * 0.85);
    else if (r > oriz * 0.72 && caso() < 0.1 * ((r - oriz * 0.72) / (oriz * 0.28))) metti(c, r, ROCCIA, 0.05 + caso() * 0.08);
  }
  const creste = [(c: number) => oriz - 1 - Math.pow(Math.abs(u(c)), 1.25) * R * 0.5 - Math.abs(Math.sin(c * 0.11) + Math.sin(c * 0.29 + 1) * 0.5) * R * 0.05 * (0.2 + Math.abs(u(c))), (c: number) => oriz + 1 - Math.pow(Math.abs(u(c)), 1.5) * R * 0.32 - Math.abs(Math.sin(c * 0.17 + 2) + Math.sin(c * 0.41) * 0.4) * R * 0.03 * (0.2 + Math.abs(u(c)))];
  creste.forEach((cresta, q) => {
    for (let c = 0; c < C; c++) {
      const a = Math.round(cresta(c)), pende = cresta(c + 1) - cresta(c - 1);
      for (let r = a; r <= oriz + 3; r++) {
        const d = (r - a) / Math.max(1, oriz + 3 - a), base = (q ? 0.42 : 0.28) * (1 - d * 0.6), lato = pende * 0.13 + Math.sin(c * 0.6 + r * 0.9) * 0.05;
        if (caso() < 0.82) metti(c, r, ROCCIA, Math.max(0.03, base + lato + (r - a < 1 ? 0.28 : 0) + (caso() - 0.5) * 0.09));
      }
    }
  });
  // Un fiume che scende a destra della radura
  const fiumeC = (r: number) => C * 0.66 + Math.sin(r * 0.15) * (r - oriz) * 0.3 + (r - oriz) * 0.25, fiumeL = (r: number) => 0.6 + (r - oriz) * 0.13;
  const inFiume = (c: number, r: number) => r > oriz && Math.abs(c - fiumeC(r)) < fiumeL(r);
  for (let r = oriz + 1; r < R; r++) for (let c = 0; c < C; c++) {
    const d = (r - oriz) / (R - oriz);
    if (inFiume(c, r)) { metti(c, r, ACQUA, 0.3 + d * 0.32 + (caso() - 0.5) * 0.18); continue; }
    if (caso() < 0.5 + d * 0.5) metti(c, r, ERBA, 0.14 + d * 0.32 + (caso() - 0.5) * 0.16);
  }
  // Abeti a punta, dal fondo verso chi guarda
  const alberi: { c: number; r: number; h: number; d: number }[] = [];
  for (let i = 0; i < 7000 && alberi.length < C * R * 0.024; i++) {
    const c = Math.floor(caso() * C), r = oriz + Math.floor(caso() * caso() * (R - oriz) * 0.82), d = (r - oriz) / Math.max(1, R - oriz);
    if (caso() > 0.3 + Math.abs(u(c)) * 1.3) continue;
    if (Math.abs(c - fiumeC(r)) < fiumeL(r) + 2 + d * 5) continue;
    alberi.push({ c, r, h: Math.round((4 + d * R * 0.34 + caso() * 3) * (0.8 + caso() * 0.45)), d });
  }
  // Una fila di alberi vicini. I due ai bordi di ciò che si vede da vicino sono i più grandi: i cervi escono da dietro il primo e spariscono dietro il secondo
  const ENTRA = 0.5 - META * 0.62, ESCE = 0.5 + META * 0.62;
  for (const [v, alto] of [[0.06, 0.28], [0.17, 0.3], [ENTRA, 0.38], [ESCE, 0.38], [0.85, 0.3], [0.93, 0.28]] as const) {
    const c = Math.round(C * v), r = Math.round(R * 0.89), d = (r - oriz) / Math.max(1, R - oriz);
    alberi.push({ c, r, h: Math.round(R * alto), d });
  }
  alberi.sort((a, b) => a.r - b.r);
  // Per ogni cella, la base dell'albero che la occupa: serve a sapere se un cervo passa davanti o dietro
  const baseAlbero = new Int16Array(N);
  for (const a of alberi) {
    const tiers = Math.max(2, Math.round(a.h / 4)), largo = a.h * 0.42, forza = 0.5 + a.d * 0.5;
    for (let j = 0; j < a.h; j++) {
      // Un bordo vuoto: l'albero si stacca da ciò che ha dietro
      const bordoM = largo * (j / a.h) + 1.5;
      for (const v of [-1, 1]) { const x = a.c + v * Math.round(bordoM), i2 = (a.r - a.h + j) * C + x; if (x >= 0 && x < C && i2 >= 0 && i2 < N) famiglia[i2] = -1; }
      const q = j / a.h, frazione = ((j * tiers) / a.h) % 1, mezza = largo * q * (0.55 + frazione * 0.45) + (caso() - 0.5) * 0.7, rr = a.r - a.h + j;
      for (let i = -Math.ceil(mezza); i <= mezza; i++) {
        const lato = -i / Math.max(1, mezza), l = forza * (0.34 + lato * 0.42 + (1 - frazione) * 0.42 + (caso() - 0.5) * 0.3);
        metti(a.c + i, rr, ALBERO, Math.max(0.06, l));
      }
    }
    for (let j = 0; j < 2; j++) { metti(a.c, a.r + j, ROCCIA, forza * 0.5); }
  }
  for (const v of [ENTRA, ESCE]) {
    const h = Math.round(R * 0.38), base = Math.round(R * 0.89), cc = Math.round(C * v);
    for (let j = 0; j <= h + 2; j++) { const r = base - h + j, m = Math.ceil(h * 0.3 * Math.min(1, j / h)); if (r >= 0 && r < R) for (let i = -m; i <= m; i++) if (cc + i >= 0 && cc + i < C) baseAlbero[r * C + cc + i] = base; }
  }
  for (let c = 0; c < C; c++) {
    const b = R - 3 - Math.floor(caso() * caso() * R * 0.1);
    for (let r = b; r < R; r++) if (!inFiume(c, r) && caso() < 0.96) metti(c, r, ERBA, 0.28 + caso() * 0.55);
  }
  for (let i = 0; i < N * 0.006; i++) { const c = Math.floor(caso() * C), r = oriz + Math.floor(caso() * (R - oriz)); metti(c, r, STELLA, 0.3 + caso() * 0.5); }
  // La foresta cresce dal punto da cui parte lo zoom; si scioglie dal basso, seguendo lo stormo che sale
  const fx = C * 0.5, fy = R * 0.72, soglie = new Float32Array(N);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    t0[r * C + c] = Math.hypot(c - fx, (r - fy) * 1.5) / Math.hypot(C, R * 1.5) * 0.9 + nn[r * C + c]! * 0.2;
    soglie[r * C + c] = ((R - r) / R) * 0.72 + bayer(c, r) * 0.28;
  }
  const lucciole = Array.from({ length: Math.round(C * 0.14) }, () => ({ x: caso() * C, y: oriz - 4 + caso() * (R - oriz), f: caso() * 6, v: 0.5 + caso() }));
  // La polvere: tanti punti che salgono piano e lampeggiano, più fitti dove si guarda all'inizio
  const polvere = Array.from({ length: Math.round(C * R * 0.012) }, () => ({ x: caso() * C, y: R * (0.35 + caso() * 0.6), v: 0.5 + caso() * 1.3, f: caso() * 6, k: caso() < 0.3 ? CALDO : STELLA }));
  const disegnaValle = (t: number, q: number) => {
    g.clearRect(0, 0, W, H);
    const buio = 1 - liscio((t - T.apre) / (T.aperto - T.apre));
    for (let r = 0, i = 0; r < R; r++) for (let c = 0; c < C; c++, i++) {
      const k = famiglia[i]!;
      if (k < 0 || t < t0[i]! || soglie[i]! < q) continue;
      const n = nn[i]!;
      let l = luce[i]!;
      // Da vicino è buio: banchi di nebbia lenti lasciano vedere solo una parte dei caratteri, e si aprono quando la camera si allontana
      if (buio > 0 && !baseAlbero[i]) { const b = 0.5 + 0.28 * Math.sin(c * 0.09 + t * 0.55 + Math.sin(r * 0.17 + t * 0.3) * 1.6) + 0.22 * Math.sin(r * 0.21 - t * 0.4 + c * 0.05); l *= 1 - buio * 0.6 * (1 - Math.max(0.2, b)); }
      if (k === ERBA) l += Math.sin(c * 0.14 + r * 0.5 - t * 2.3 + n) * 0.17;
      else if (k === ACQUA) l += Math.sin(c * 0.7 + r * 1.3 + t * 3 + n * 6) * 0.14;
      else if (k === STELLA) l *= 0.55 + 0.45 * Math.sin(t * (1 + n * 4) + n * 20);
      else if (k === ALBERO) l += Math.sin(c * 0.3 - t * 1.1 + r * 0.2) * 0.03;
      const liv = Math.max(0, Math.min(LIVELLI - 1, Math.floor(l * LIVELLI))), rampa = RAMPE[k]!;
      const qui = t < t0[i]! + 0.22 ? Math.floor(t * 28 + n * 40) % rampa.length : Math.min(rampa.length - 1, Math.floor((Math.max(0, l) + n * 0.1) * rampa.length));
      copia(g, rampa[qui]!, k, liv, c, r);
    }
    for (const b of polvere) {
      if (q > 0 || Math.sin(t * 2.2 * b.v + b.f) < 0.1) continue;
      const x = Math.round(b.x + Math.sin(t * 0.7 * b.v + b.f) * 2.5), y = Math.round(((b.y - t * b.v * 1.6) % R + R) % R);
      if (x < 0 || x >= C) continue;
      g.clearRect(x * CW, y * CH, 3, 5);
      copia(g, RAMPE[b.k]![b.v > 1.2 ? 2 : 0]!, b.k, b.k === CALDO ? 9 : 7, x, y);
    }
    if (t > 0.3) for (const b of lucciole) {
      if (Math.sin(t * 2 * b.v + b.f) < -0.15) continue;
      const x = Math.round(b.x + Math.sin(t * b.v + b.f) * 5), y = Math.round(b.y + Math.cos(t * b.v * 0.8 + b.f) * 3);
      if (x < 0 || x >= C || y < 0 || y >= R || soglie[y * C + x]! < q) continue;
      g.clearRect(x * CW, y * CH, 3, 5);
      copia(g, RAMPE[CALDO]![5]!, CALDO, 11, x, y);
    }
  };

  // --- I cervi: bianco pieno, nessuna ombra, nessun dettaglio. Curve lisce, ridisegnate a ogni fotogramma.
  // Le zampe non sono angoli scritti a mano: ogni zoccolo segue una traiettoria, fermo a terra mentre il corpo avanza, poi alzato e portato avanti.
  // Il ginocchio si ricava dalla lunghezza dei due tratti, sempre piegato dal lato giusto: indietro per le posteriori, avanti per le anteriori.
  type Tipo = 'cervo' | 'cerva' | 'piccolo';
  const BIANCO = chiaro ? testo : '#ffffff', PASSO = 20, APPOGGIO = 0.3, ALZA = 7.5;
  let d: Ctx = f, minimo = 1;
  const zoccolo = (fase: number, centro: number): [number, number] => {
    const p = ((fase % 1) + 1) % 1;
    if (p < APPOGGIO) return [centro + PASSO / 2 - (p / APPOGGIO) * PASSO, 0];
    const w = (p - APPOGGIO) / (1 - APPOGGIO), e = w * w * (3 - 2 * w);
    return [centro - PASSO / 2 + e * PASSO, -Math.sin(Math.PI * w) * ALZA];
  };
  const gamba = (hx: number, hy: number, fx: number, fy: number, l1: number, l2: number, verso: number, w1: number, w2: number) => {
    const dx = fx - hx, dy = fy - hy, dist = Math.min(l1 + l2 - 0.05, Math.hypot(dx, dy)), a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)))), base = Math.atan2(dy, dx) + verso * a;
    const kx = hx + Math.cos(base) * l1, ky = hy + Math.sin(base) * l1, r = l2 / dist, px2 = hx + (fx - hx) * Math.min(1, 1), py = hy + (fy - hy) * Math.min(1, 1);
    void r;
    d.lineWidth = Math.max(w1, minimo); d.beginPath(); d.moveTo(hx, hy); d.lineTo(kx, ky); d.stroke();
    d.lineWidth = Math.max(w2, minimo); d.beginPath(); d.moveTo(kx, ky); d.lineTo(px2, py); d.stroke();
  };
  const disegnaCervo = (x: number, suolo: number, s: number, tipo: Tipo, ph: number) => {
    const corto = tipo === 'piccolo' ? 0.8 : 1, grossa = tipo === 'piccolo' ? 1.2 : 1, alto = tipo === 'cervo' ? 1 : 0.88, l1 = 10.5, l2 = 11;
    // Il corpo ondula appena: si abbassa quando gli zoccoli toccano, e ondeggia avanti e indietro
    const su = Math.sin((ph - 0.08) * 6.283) * 1.2, inclina = Math.sin((ph + 0.1) * 6.283) * 0.055;
    d.save();
    d.translate(x, suolo); d.scale(s, s);
    d.fillStyle = BIANCO; d.strokeStyle = BIANCO; d.lineCap = 'round'; d.lineJoin = 'round';
    const by = -19 + su, co = Math.cos(inclina), si = Math.sin(inclina), P = (a: number, b: number): [number, number] => [a * co - b * si, by + a * si + b * co];
    // Le quattro zampe: prima le posteriori, poi le anteriori, sfasate come in un galoppo
    const [h1x, h1y] = P(-10.5 * corto, 1.5), [h2x, h2y] = P(-8.5 * corto, 2), [f1x, f1y] = P(9 * corto, 2), [f2x, f2y] = P(10.5 * corto, 1.5);
    const piedi = [zoccolo(ph, -8 * corto), zoccolo(ph + 0.13, -6.5 * corto), zoccolo(ph + 0.55, 10 * corto), zoccolo(ph + 0.68, 11.5 * corto)];
    gamba(h1x, h1y, piedi[0]![0], piedi[0]![1], l1, l2, 1, 2.6, 1.15);
    gamba(h2x, h2y, piedi[1]![0], piedi[1]![1], l1, l2, 1, 2.6, 1.15);
    gamba(f1x, f1y, piedi[2]![0], piedi[2]![1], l1, l2, -1, 2.1, 1.05);
    gamba(f2x, f2y, piedi[3]![0], piedi[3]![1], l1, l2, -1, 2.1, 1.05);
    d.translate(0, by); d.rotate(inclina);
    // Una sola forma morbida: groppa piena, schiena lunga, petto profondo, pancia che risale verso le zampe posteriori
    d.beginPath();
    d.moveTo(-15.5 * corto, -2 * alto);
    d.lineTo(-11 * corto, -5 * alto);
    d.lineTo(8 * corto, -5 * alto);
    d.lineTo(14 * corto, -5.6 * alto);
    d.lineTo(15 * corto, 0);
    d.lineTo(10 * corto, 5.4 * alto);
    d.lineTo(3 * corto, 3.6 * alto);
    d.lineTo(-7 * corto, 2.6 * alto);
    d.lineTo(-11 * corto, 6 * alto);
    d.lineTo(-16 * corto, 3 * alto);
    d.closePath();
    d.fill();
    // La coda
    d.save(); d.translate(-15.2 * corto, -2.4 * alto); d.rotate(-0.65); d.beginPath(); d.ellipse(-1.6, 0, 2.6, 1.15, 0, 0, 6.3); d.fill(); d.restore();
    // Collo teso in avanti, come nella corsa; la testa compensa l'ondulazione e resta quasi ferma
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
  // La scala viene dagli alberi: un albero vicino è alto circa 4 volte un cervo adulto. Più lontano vuol dire più piccolo e più in alto
  const SCALA = ((R * 0.38 * CH) / 165);
  const FOTOGRAMMI = 10;
  // Ogni fotogramma si disegna una volta sola e diventa pieno o vuoto, senza sfumature: pixel netti
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
  const FAMIGLIA = ([['cervo', 1, 0.8, 0.74, 1.02], ['cerva', 0.9, 0.3, 0.8, 0.98], ['piccolo', 0.6, 0, 0.775, 1.05], ['piccolo', 0.56, 0.55, 0.715, 1]] as const)
    .map(([tipo, sc, ritardo, quota, ritmo], i) => {
      const s2 = sc * SCALA * (0.72 + ((quota - 0.6) / 0.3) * 0.55);
      return { tipo: tipo as Tipo, sc: s2, ritardo, quota, ritmo, seme: i * 1.7 + 0.4, quadri: fotogrammi(tipo as Tipo, s2) };
    }).sort((a, b) => a.quota - b.quota);
  const CORSA = 2.2;
  const disegnaCervi = (t: number) => {
    if (t < T.cervi || t > T.cervi + CORSA + 1) return;
    for (const a of FAMIGLIA) {
      const u0 = (t - T.cervi - a.ritardo) / (CORSA / a.ritmo);
      if (u0 <= 0 || u0 >= 1) continue;
      const u1 = u0 + Math.sin(u0 * 7 + a.seme) * 0.012, x = W * (ENTRA + (ESCE - ENTRA) * u1), suolo = H * (a.quota + Math.sin(u0 * 4 + a.seme) * 0.006);
      // Gli zoccoli non scivolano: il fotogramma dipende dalla strada fatta
      const fase = x / ((PASSO / APPOGGIO) * a.sc) + a.seme, fr = a.quadri[Math.floor(((fase % 1) + 1) % 1 * FOTOGRAMMI)]!, dx = Math.round(x - 30 * a.sc), dy = Math.round(suolo - 46 * a.sc);
      f.drawImage(fr, dx, dy);
      // Le celle dei due alberi vicini tornano davanti al cervo
      const c0 = Math.max(0, Math.floor(dx / CW)), c1 = Math.min(C - 1, Math.ceil((dx + fr.width) / CW)), r0 = Math.max(0, Math.floor(dy / CH)), r1 = Math.min(R - 1, Math.ceil((dy + fr.height) / CH));
      for (let r = r0; r <= r1; r++) for (let q = c0; q <= c1; q++) if (baseAlbero[r * C + q]!) f.clearRect(q * CW, r * CH, CW, CH);
    }
  };

  // --- Lo stormo: ogni uccello parte da una chioma e arriva sul suo uccello 3D. Quando è arrivato, il 3D gli prende il posto
  type Uccello = { x0: number; y0: number; t0: number; dura: number; f: number; onda: number };
  let stormo: Uccello[] | null = null;
  const creaStormo = () => {
    const n = ponte.xy ? ponte.xy.length / 2 : 300, chiome = alberi.filter(a => a.h > 4);
    stormo = Array.from({ length: n }, (_, i) => {
      const a = chiome[Math.floor(caso() * chiome.length)] ?? { c: C / 2, r: oriz, h: 0 };
      return { x0: a.c * CW, y0: (a.r - a.h) * CH, t0: T.stormo + (i / n) * 1.25, dura: 1.15 + caso() * 0.45, f: caso() * 6, onda: (caso() - 0.5) * W * 0.09 };
    });
  };
  const FORMA = [['x...x', '.x.x.', '..x..'], ['.....', 'xx.xx', '..x..']];
  const disegnaStormo = (t: number) => {
    if (t < T.stormo) return;
    if (!stormo) creaStormo();
    const xy = ponte.xy, rif = { x: W * 0.62, y: H * 0.24 };
    // Quanti sono già arrivati, in fila: quelli li disegna la home
    let arrivati = 0;
    while (arrivati < stormo!.length && (t - stormo![arrivati]!.t0) / stormo![arrivati]!.dura >= 1) arrivati++;
    ponte.visibili = arrivati;
    f.fillStyle = arancio;
    for (let i = arrivati; i < stormo!.length; i++) {
      const b = stormo![i]!, w = (t - b.t0) / b.dura;
      if (w <= 0) continue;
      const e = liscio(w), su = Math.pow(e, 0.65), mx = xy ? xy[i * 2]! / px : rif.x + Math.sin(b.f) * W * 0.12, my = xy ? xy[i * 2 + 1]! / px : rif.y + Math.cos(b.f) * H * 0.08;
      const x = b.x0 + (mx - b.x0) * e + Math.sin(w * Math.PI) * b.onda, y = b.y0 + (my - b.y0) * su, lato = w < 0.7 ? 2 : 1, fo = FORMA[Math.floor(t * 9 + b.f) % 2]!;
      fo.forEach((r, j) => { for (let k = 0; k < 5; k++) if (r[k] === 'x') f.fillRect(Math.round(x) + (k - 2) * lato, Math.round(y) + (j - 1) * lato, lato, lato); });
    }
  };

  let conta = 0;
  cv.style.transformOrigin = cf.style.transformOrigin = '50% 72%';
  const disegno = (t: number) => {
    const u0 = (t - T.via) / T.durata, q = u0 > 0 ? liscio(u0 * 1.05) * 1.02 : 0;
    // La camera: vicina, si avvicina appena mentre i cervi corrono, poi si allontana fino a mostrare tutto
    const lontano = liscio((t - T.apre) / (T.aperto - T.apre)), sc = 1 + (VICINO * (1 + Math.min(t, T.apre) * 0.018) - 1) * (1 - lontano);
    const forma = sc > 1.001 ? `scale(${sc})` : '';
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
    stormo!.forEach((b, i) => { b.t0 = T.via + (i / stormo!.length) * 0.5; b.dura = 0.9; });
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
