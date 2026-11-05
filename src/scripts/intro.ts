// Intro della home, una volta per sessione. Mescola gli stili e va dal vicino al lontano.
// Si parte da vicino, nel buio di una foresta fatta di caratteri che si muovono, con la nebbia e la polvere che passano.
// In primo piano galoppa una famiglia di cervi: sagome bianche piene e tonde, a piena risoluzione, l'opposto dei caratteri. Escono da dietro un albero e spariscono dietro un altro.
// Poi la camera si allontana: si vede la valle, compare il nome, e dagli alberi si alza lo stormo.
// È lo stesso della home: ogni uccello a pixel arriva sul suo uccello 3D e gli passa il posto. La foresta si scioglie dal basso, il nome sale nella barra.
import { ponte } from '../lib/ponteStormo';

const T = { cervi: 0.75, apre: 2.75, aperto: 4.2, nome: 3, stormo: 3.05, via: 4.7, durata: 1.4 };

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
  // Una terza tela per i cervi, a piena risoluzione e senza pixel: curve lisce contro i caratteri
  const dpr = Math.min(devicePixelRatio || 1, 2), cd = document.createElement('canvas');
  cd.width = Math.round(innerWidth * dpr); cd.height = Math.round(innerHeight * dpr);
  cd.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%;image-rendering:auto';
  cf.after(cd);
  const d = cd.getContext('2d')!;
  const VICINO = W > H ? 2.6 : 1.7, META = 1 / (2 * VICINO);
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
  const polvere = Array.from({ length: Math.round(C * R * 0.012) }, () => ({ x: C * (0.25 + caso() * 0.5), y: R * (0.4 + caso() * 0.5), v: 0.5 + caso() * 1.3, f: caso() * 6, k: caso() < 0.3 ? CALDO : STELLA }));
  const disegnaValle = (t: number, q: number) => {
    g.clearRect(0, 0, W, H);
    const buio = 1 - liscio((t - T.apre) / (T.aperto - T.apre));
    for (let r = 0, i = 0; r < R; r++) for (let c = 0; c < C; c++, i++) {
      const k = famiglia[i]!;
      if (k < 0 || t < t0[i]! || soglie[i]! < q) continue;
      const n = nn[i]!;
      let l = luce[i]!;
      // Da vicino è buio: banchi di nebbia lenti lasciano vedere solo una parte dei caratteri, e si aprono quando la camera si allontana
      if (buio > 0 && !baseAlbero[i]) { const b = 0.5 + 0.28 * Math.sin(c * 0.09 + t * 0.55 + Math.sin(r * 0.17 + t * 0.3) * 1.6) + 0.22 * Math.sin(r * 0.21 - t * 0.4 + c * 0.05); l *= 1 - buio * (1 - Math.max(0.12, b)); }
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
  // Il galoppo è un ciclo continuo: al suolo le zampe si raccolgono sotto il corpo, in aria si stendono avanti e indietro
  type Tipo = 'cervo' | 'cerva' | 'piccolo';
  const BIANCO = chiaro ? testo : '#ffffff';
  const zampa = (hx: number, hy: number, ang: number, piega: number, l1: number, l2: number, w: number) => {
    const kx = hx + Math.sin(ang) * l1, ky = hy + Math.cos(ang) * l1, b = ang + piega, px2 = kx + Math.sin(b) * l2, py = ky + Math.cos(b) * l2;
    d.lineWidth = w; d.beginPath(); d.moveTo(hx, hy); d.lineTo(kx, ky); d.stroke();
    d.lineWidth = w * 0.52; d.beginPath(); d.moveTo(kx, ky); d.lineTo(px2, py); d.stroke();
  };
  const disegnaCervo = (x: number, y: number, s: number, tipo: Tipo, ph: number, sfasa: number) => {
    // e: quanto il corpo è in aria e steso, da 0 a 1
    const e = Math.pow(Math.sin(Math.PI * ph), 1.3), inclina = Math.sin(ph * 6.283) * -0.13;
    const gambe = tipo === 'piccolo' ? 1.12 : 1, l1 = 9.5 * gambe, l2 = 11.5 * gambe, testa = tipo === 'piccolo' ? 1.25 : 1, alto = tipo === 'cervo' ? 1 : tipo === 'cerva' ? 0.88 : 0.84, corto = tipo === 'piccolo' ? 0.84 : 1;
    d.save();
    d.translate(x, y); d.rotate(inclina); d.scale(s, s);
    d.fillStyle = BIANCO; d.strokeStyle = BIANCO; d.lineCap = 'round'; d.lineJoin = 'round';
    // Quattro zampe, un po' sfasate fra loro: le posteriori si stendono indietro, le anteriori avanti
    const avanti = (v: number) => -0.28 + (0.28 + 1.08) * Math.pow(Math.sin(Math.PI * ((ph + v) % 1)), 1.3), dietro = (v: number) => 0.22 - (0.22 + 1.12) * Math.pow(Math.sin(Math.PI * ((ph + v) % 1)), 1.3);
    const piegaA = (v: number) => -0.9 - (1 - Math.pow(Math.sin(Math.PI * ((ph + v) % 1)), 1.3)) * 0.75, piegaD = (v: number) => 0.7 + (1 - Math.pow(Math.sin(Math.PI * ((ph + v) % 1)), 1.3)) * 0.75;
    zampa(-10.5 * corto, 1, dietro(0.05 + sfasa), piegaD(0.05 + sfasa), l1, l2, 3.1);
    zampa(-8.5 * corto, 1.5, dietro(0.11 + sfasa), piegaD(0.11 + sfasa), l1, l2, 3.1);
    zampa(9.5 * corto, 1.5, avanti(0.09 + sfasa), piegaA(0.09 + sfasa), l1, l2, 2.7);
    zampa(11.5 * corto, 1, avanti(0.02 + sfasa), piegaA(0.02 + sfasa), l1, l2, 2.7);
    // Il corpo è una sola forma morbida
    d.beginPath();
    d.moveTo(-13.5 * corto, -2.5 * alto);
    d.bezierCurveTo(-6 * corto, -5.6 * alto, 4 * corto, -5 * alto, 11 * corto, -5.4 * alto);
    d.bezierCurveTo(14.5 * corto, -4.5 * alto, 15 * corto, 1 * alto, 12.5 * corto, 4.2 * alto);
    d.bezierCurveTo(6 * corto, 5 * alto, -3 * corto, 2.6 * alto, -10.5 * corto, 4.2 * alto);
    d.bezierCurveTo(-15.5 * corto, 4.5 * alto, -16.5 * corto, -1 * alto, -13.5 * corto, -2.5 * alto);
    d.fill();
    // La coda, che si alza in aria
    d.save(); d.translate(-15 * corto, -2.8 * alto); d.rotate(-0.7 - e * 0.5); d.beginPath(); d.ellipse(-1.5, 0, 2.8, 1.25, 0, 0, 6.3); d.fill(); d.restore();
    // Collo e testa: il collo va avanti e in alto, la testa resta quasi ferma mentre il corpo ondula
    const nx = 19 * corto, ny = -13 - e * 1.2 + (tipo === 'piccolo' ? 1 : 0);
    d.save(); d.translate(nx, ny); d.rotate(-inclina * 0.8); d.scale(testa, testa);
    d.beginPath(); d.ellipse(2.6, 0.5, 5, 2.5, 0.22, 0, 6.3); d.fill();
    const orecchie = tipo === 'cervo' ? 2.8 : tipo === 'cerva' ? 3.7 : 4;
    d.save(); d.translate(-1.1, -1.4); d.rotate(-0.72 - e * 0.2); d.beginPath(); d.ellipse(0, -orecchie * 0.8, 1.15, orecchie, 0, 0, 6.3); d.fill(); d.restore();
    if (tipo === 'cervo') {
      // Il palco: tirato indietro dalla corsa
      d.lineWidth = 0.95;
      d.beginPath(); d.moveTo(0.6, -2); d.bezierCurveTo(-1, -7, -5, -10, -10, -13); d.moveTo(-1.3, -6.2); d.quadraticCurveTo(-1.5, -10, 0.6, -13); d.moveTo(-4.3, -9.5); d.quadraticCurveTo(-5, -13, -3.4, -16); d.moveTo(-7.4, -11.5); d.quadraticCurveTo(-9.5, -14, -9.2, -17); d.stroke();
    }
    d.restore();
    d.beginPath(); d.moveTo(8 * corto, -5 * alto);
    d.quadraticCurveTo(13 * corto, -8, nx - 2.6, ny - 1.4);
    d.lineTo(nx + 2, ny + 2.2);
    d.quadraticCurveTo(nx - 2, ny + 8, 13 * corto, 3.6 * alto);
    d.closePath(); d.fill();
    d.restore();
  };
  // Irregolari: ognuno ha il suo passo, che accelera e rallenta, e ogni salto ha la sua altezza. Vengono avanti mentre attraversano: crescono e scendono
  const FAMIGLIA = ([['cervo', 1.08, 0.5, 0.715, 0.56], ['cerva', 0.95, 0.2, 0.775, 0.5], ['piccolo', 0.66, 0, 0.745, 0.43], ['piccolo', 0.6, 0.36, 0.69, 0.41]] as const).map(([tipo, sc, ritardo, quota, salto], i) => ({ tipo: tipo as Tipo, sc, ritardo, quota, salto, seme: i * 1.7 + 0.4 }));
  const CORSA = 1.65, BASE = Math.min(1, Math.max(0.5, Math.min(W, H * 1.5) / 430));
  const casoS = (n: number) => { const v = Math.sin(n * 127.1) * 43758.5; return v - Math.floor(v); };
  let camera = 1;
  const disegnaCervi = (t: number) => {
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.clearRect(0, 0, cd.width, cd.height);
    if (t < T.cervi || t > T.cervi + CORSA + 0.6) return;
    // Dalla griglia allo schermo, con la stessa camera della foresta
    const ox = innerWidth * 0.5, oy = innerHeight * 0.72, k = px * camera * dpr;
    d.setTransform(k, 0, 0, k, ox * (1 - camera) * dpr, oy * (1 - camera) * dpr);
    const stato = FAMIGLIA.map(a => {
      const u0 = (t - T.cervi - a.ritardo) / CORSA;
      const fase = (t - T.cervi - a.ritardo) / a.salto + Math.sin(t * 2.3 + a.seme) * 0.1 + a.seme, salto = Math.floor(fase), ph = fase - salto, u1 = Math.min(1, Math.max(0, u0));
      const s = a.sc * BASE * (0.86 + u1 * 0.3), quota = a.quota + u1 * 0.035 + Math.sin(u1 * 3.8 + a.seme) * 0.012;
      const x = W * (ENTRA + (ESCE - ENTRA) * (u1 + Math.sin(fase * 6.283) * 0.012)), piede = H * quota, y = piede - (21 * s) - Math.pow(Math.sin(Math.PI * ph), 1.2) * (15 + casoS(salto + a.seme) * 13) * s;
      return { a, u0, ph, s, x, y, piede };
    }).sort((p, q) => p.piede - q.piede);
    for (const c of stato) {
      if (c.u0 <= 0 || c.u0 >= 1) continue;
      disegnaCervo(c.x, c.y, c.s, c.a.tipo, c.ph, c.a.seme % 0.08);
      // Le celle di un albero più vicino del cervo tornano davanti a lui
      const rB = Math.floor(c.piede / CH), pm = 48 * c.s, c0 = Math.max(0, Math.floor((c.x - pm) / CW)), c1 = Math.min(C - 1, Math.ceil((c.x + pm) / CW)), r0 = Math.max(0, Math.floor((c.y - 50 * c.s) / CH)), r1 = Math.min(R - 1, Math.ceil((c.piede + 6) / CH));
      for (let r = r0; r <= r1; r++) for (let q = c0; q <= c1; q++) if (baseAlbero[r * C + q]! > rB) d.clearRect(q * CW - 0.2, r * CH - 0.2, CW + 0.4, CH + 0.4);
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
    camera = sc;
    if (conta++ % 2 === 0 || u0 > 0) disegnaValle(t, q);
    f.clearRect(0, 0, W, H);
    disegnaCervi(t);
    disegnaStormo(t);
  };

  // --- Il nome: sale al suo posto nella barra in alto, dopo la tilde
  type Volo = { dx: number; dy: number; s: number } | null;
  let voloNome: Volo = null;
  const staccaNome = () => {
    const r = nome.getBoundingClientRect(), base = parseFloat(getComputedStyle(nome).fontSize);
    nome.classList.add('in-volo');
    Object.assign(nome.style, { left: `${r.left}px`, top: `${r.top}px`, transform: 'none', transformOrigin: '0 0' });
    const io = document.querySelector<HTMLElement>('.barra .io'), nodo = io?.firstChild;
    if (!io || !nodo?.textContent) return;
    const intervallo = document.createRange();
    intervallo.setStart(nodo, Math.max(0, nodo.textContent.indexOf('/')));
    intervallo.setEnd(nodo, nodo.textContent.length);
    const d = intervallo.getBoundingClientRect(), fs = parseFloat(getComputedStyle(io).fontSize);
    voloNome = { dx: d.left - r.left, dy: d.top + (d.height - fs) / 2 - r.top, s: fs / base };
  };

  // --- Il tempo: si può saltare, con un clic o un tasto
  let t = 0, prima = 0, viaData = false, finito = false, ferma = 0;
  const parametro = new URLSearchParams(location.search).get('intro');
  if (parametro && !Number.isNaN(Number(parametro))) ferma = Number(parametro);
  const parti = () => { if (viaData) return; viaData = true; radice.dataset.intro = 'via'; el.classList.add('in-volo'); nome.textContent = TESTO; staccaNome(); };
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
    } else if (voloNome) {
      const z = liscio((ora - T.via - 0.15) / (T.durata - 0.25));
      nome.style.transform = `translate(${voloNome.dx * z}px, ${voloNome.dy * z}px) scale(${1 + (voloNome.s - 1) * z})`;
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
