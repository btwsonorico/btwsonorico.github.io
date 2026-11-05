// Intro della home, una volta per sessione: una vallata di notte fatta solo di caratteri minuscoli e colorati, ombreggiati come un'immagine.
// Ogni carattere si decifra al suo posto; l'erba ondeggia, l'acqua luccica, le lucciole accendono i caratteri intorno.
// Il nido e la madre sono caratteri anche loro. Al centro resta solo il nome. Nel passaggio alla home gli uccelli non escono mai
// dallo schermo: si raccolgono dove vola lo stormo 3D e diventano lui. La valle si scioglie dal nido, e il nome sale nella barra in alto.

const T = { ramo: 0, nido: 0.3, uova: 0.7, madre: 1, zoom: 1.7, valle: 1.8, nome: 2.5, schiusa: 3.1, stormo: 3.3, parte: 4.4, via: 5, durata: 1.6 };

type Tela = HTMLCanvasElement;
type Ctx = CanvasRenderingContext2D;
type P2 = readonly [number, number];
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
  '#': ['#.#', '###', '#.#', '###', '#.#'], '%': ['#.#', '..#', '.#.', '#..', '#.#'], '&': ['.#.', '#.#', '.#.', '#.#', '.##'], o: ['...', '.#.', '#.#', '.#.', '...'],
};
const SEGNI = Object.keys(GLIFI), INDICE = new Map(SEGNI.map((s, i) => [s, i]));
// Le famiglie di celle. Ogni famiglia ha i suoi caratteri, dal più vuoto al più pieno, e 12 livelli di luce
const ROCCIA = 0, ALBERO = 1, ERBA = 2, ACQUA = 3, STELLA = 4, CALDO = 5, LIVELLI = 12;
const RAMPE = [".:-=+*", ".'^/\\*#", ".,'`|!/", ".-~=~", ".+*", ".:*+%#"].map(s => [...s].map(c => INDICE.get(c)!));

const curva = (p: readonly P2[], s: number): P2 => {
  const n = p.length - 1, q = Math.min(n - 1e-4, Math.max(0, s) * n), i = Math.floor(q), t = q - i;
  const a = p[Math.max(0, i - 1)]!, b = p[i]!, c = p[i + 1]!, d = p[Math.min(n, i + 2)]!, f = (u: number, v: number, w: number, z: number) => 0.5 * (2 * v + (w - u) * t + (2 * u - 5 * v + 4 * w - z) * t * t + (3 * v - u - 3 * w + z) * t * t * t);
  return [f(a[0], b[0], c[0], d[0]), f(a[1], b[1], c[1], d[1])];
};
const pixel = (c: Ctx, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
const disco = (c: Ctx, x: number, y: number, r: number, col: string) => {
  c.fillStyle = col;
  const R = Math.ceil(r);
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) if (i * i + j * j <= r * r + 0.25) c.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
};
const nastro = (c: Ctx, p: readonly P2[], raggio: (s: number) => number, col: string, passi = 70) => {
  for (let i = 0; i <= passi; i++) { const s = i / passi, [x, y] = curva(p, s); disco(c, x, y, Math.max(0, raggio(s)), col); }
};
const linea = (c: Ctx, x0: number, y0: number, x1: number, y1: number, col: string) => {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1));
  for (let i = 0; i <= n; i++) pixel(c, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, col);
};

export function monta(el: HTMLElement) {
  const radice = document.documentElement, stile = getComputedStyle(radice), V = (n: string, d: string) => stile.getPropertyValue(n).trim() || d, chiaro = radice.dataset.theme === 'light';
  const fondo = V('--bg', '#0a0b0d'), testo = V('--fg', '#d9dde3'), arancio = V('--arancio', '#ffa45e');
  const cv = el.querySelector('canvas')!, nome = el.querySelector<HTMLElement>('.intro-nome')!, TESTO = nome.textContent ?? '';
  // Su telefono i caratteri sono più piccoli: lo schermo stretto deve contenere il nido
  const px = innerWidth < 700 ? 1.25 : Math.max(2, Math.ceil(innerWidth / 800)), W = Math.ceil(innerWidth / px), H = Math.ceil(innerHeight / px), CW = 4, CH = 6, C = Math.ceil(W / CW), R = Math.ceil(H / CH), N = C * R;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  // Sopra la valle, una seconda tela per nido, madre e stormo: cambia a ogni fotogramma
  const cf = cv.cloneNode() as HTMLCanvasElement;
  cf.width = W; cf.height = H;
  cv.after(cf);
  const f = cf.getContext('2d')!;
  g.imageSmoothingEnabled = false; f.imageSmoothingEnabled = false;
  const caso = semeCaso(7);
  nome.textContent = '';

  // --- L'atlante: ogni carattere in ogni colore, su una sola tela. Disegnare una cella è una sola copia
  const CIMA = chiaro ? ['#3a4a5c', '#0f5a2c', '#14682c', '#0755b5', '#23201b', arancio] : ['#7a93b8', '#3fc06e', '#6fdc7c', '#58a6ff', testo, arancio];
  const atlante = tela(SEGNI.length * CW, CIMA.length * LIVELLI * CH), ag = atlante.getContext('2d')!;
  CIMA.forEach((cima, k) => { for (let l = 0; l < LIVELLI; l++) { const col = mescola(fondo, cima, Math.pow((l + 1) / LIVELLI, 0.95)); SEGNI.forEach((s, i) => GLIFI[s]!.forEach((r, y) => { for (let x = 0; x < 3; x++) if (r[x] === '#') pixel(ag, i * CW + x, (k * LIVELLI + l) * CH + y, col); })); } });
  const copia = (c: Ctx, segno: number, famiglia: number, livello: number, cc: number, rr: number) => c.drawImage(atlante, segno * CW, (famiglia * LIVELLI + livello) * CH, 3, 5, cc * CW, rr * CH, 3, 5);

  // --- Il paesaggio: per ogni cella la famiglia e la luce, come se fosse un'immagine a bassissima risoluzione
  const famiglia = new Int8Array(N).fill(-1), luce = new Float32Array(N), nn = new Float32Array(N), t0 = new Float32Array(N), caldo = new Float32Array(N);
  const nC = Math.round(C * (W > H ? 0.79 : 0.6)), nR = Math.round(R * 0.8);
  const metti = (c: number, r: number, k: number, l: number) => { if (c >= 0 && c < C && r >= 0 && r < R) { const i = r * C + c; famiglia[i] = k; luce[i] = l; } };
  const u = (c: number) => (c - C / 2) / (C / 2), oriz = Math.round(R * 0.6);
  for (let i = 0; i < N; i++) nn[i] = caso();
  // Stelle radi e foschia sopra l'orizzonte
  for (let r = 0; r < oriz; r++) for (let c = 0; c < C; c++) {
    if (caso() < 0.009) metti(c, r, STELLA, 0.15 + caso() * caso() * 0.85);
    else if (r > oriz * 0.72 && caso() < 0.1 * ((r - oriz * 0.72) / (oriz * 0.28))) metti(c, r, ROCCIA, 0.05 + caso() * 0.08);
  }
  // Monti: due creste a punta, che salgono ai lati e lasciano libero il centro. La luce viene da sinistra
  const creste = [(c: number) => oriz - 1 - Math.pow(Math.abs(u(c)), 1.25) * R * 0.5 - Math.abs(Math.sin(c * 0.11) + Math.sin(c * 0.29 + 1) * 0.5) * R * 0.05 * (0.2 + Math.abs(u(c))), (c: number) => oriz + 1 - Math.pow(Math.abs(u(c)), 1.5) * R * 0.32 - Math.abs(Math.sin(c * 0.17 + 2) + Math.sin(c * 0.41) * 0.4) * R * 0.03 * (0.2 + Math.abs(u(c)))];
  creste.forEach((cresta, q) => {
    for (let c = 0; c < C; c++) {
      const a = Math.round(cresta(c)), pende = cresta(c + 1) - cresta(c - 1);
      for (let r = a; r <= oriz + 3; r++) {
        const d = (r - a) / Math.max(1, oriz + 3 - a), base = (q ? 0.42 : 0.28) * (1 - d * 0.6), lato = pende * 0.13 + (Math.sin(c * 0.6 + r * 0.9) * 0.05);
        if (caso() < 0.82) metti(c, r, ROCCIA, Math.max(0.03, base + lato + (r - a < 1 ? 0.28 : 0) + (caso() - 0.5) * 0.09));
      }
    }
  });
  // Terreno e fiume
  const fiumeC = (r: number) => C / 2 + Math.sin(r * 0.15) * (r - oriz) * 0.34, fiumeL = (r: number) => 0.6 + (r - oriz) * 0.17;
  const inFiume = (c: number, r: number) => r > oriz && Math.abs(c - fiumeC(r)) < fiumeL(r);
  for (let r = oriz + 1; r < R; r++) for (let c = 0; c < C; c++) {
    const d = (r - oriz) / (R - oriz);
    if (inFiume(c, r)) { metti(c, r, ACQUA, 0.3 + d * 0.32 + (caso() - 0.5) * 0.18); continue; }
    if (caso() < 0.5 + d * 0.5) metti(c, r, ERBA, 0.14 + d * 0.32 + (caso() - 0.5) * 0.16);
  }
  // Abeti a punta, dal fondo verso chi guarda. Fitti ai lati; lungo il fiume restano radure. Sulla cima e a sinistra prendono la luce
  const alberi: { c: number; r: number; h: number; d: number }[] = [];
  for (let i = 0; i < 7000 && alberi.length < C * R * 0.022; i++) {
    const c = Math.floor(caso() * C), r = oriz + Math.floor(caso() * caso() * (R - oriz) * 0.78), d = (r - oriz) / Math.max(1, R - oriz);
    if (caso() > 0.12 + Math.abs(u(c)) * 1.5) continue;
    if (Math.abs(c - fiumeC(r)) < fiumeL(r) + 2 + d * 6) continue;
    alberi.push({ c, r, h: Math.round((4 + d * R * 0.34 + caso() * 3) * (0.8 + caso() * 0.45)), d });
  }
  alberi.sort((a, b) => a.r - b.r);
  for (const a of alberi) {
    const tiers = Math.max(2, Math.round(a.h / 4)), largo = a.h * 0.42, forza = 0.5 + a.d * 0.5;
    for (let j = 0; j < a.h; j++) {
      // Un bordo vuoto: l'albero si stacca da ciò che ha dietro
      const bordoQ = j / a.h, bordoM = largo * bordoQ + 1.5;
      for (const v of [-1, 1]) { const x = a.c + v * Math.round(bordoM), i2 = (a.r - a.h + j) * C + x; if (x >= 0 && x < C && i2 >= 0 && i2 < N) famiglia[i2] = -1; }
      const q = j / a.h, frazione = ((j * tiers) / a.h) % 1, mezza = largo * q * (0.55 + frazione * 0.45) + (caso() - 0.5) * 0.7, rr = a.r - a.h + j;
      for (let i = -Math.ceil(mezza); i <= mezza; i++) {
        const lato = -i / Math.max(1, mezza), l = forza * (0.34 + lato * 0.42 + (1 - frazione) * 0.42 + (caso() - 0.5) * 0.3);
        metti(a.c + i, rr, ALBERO, Math.max(0.06, l));
      }
    }
    for (let j = 0; j < 2; j++) metti(a.c, a.r + j, ROCCIA, forza * 0.5);
  }
  // Erba alta in primo piano, con qualche filo che sale sopra gli altri
  for (let c = 0; c < C; c++) {
    const b = R - 3 - Math.floor(caso() * caso() * R * 0.13);
    for (let r = b; r < R; r++) if (!inFiume(c, r) && caso() < 0.96) metti(c, r, ERBA, 0.28 + caso() * 0.55);
  }
  // Puntini chiari nell'erba, come semi nel vento
  for (let i = 0; i < N * 0.006; i++) { const c = Math.floor(caso() * C), r = oriz + Math.floor(caso() * (R - oriz)); metti(c, r, STELLA, 0.3 + caso() * 0.5); }
  // La luce calda del nido sui caratteri intorno
  const RAGGIO = Math.min(C, R) * 0.34;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const d = Math.hypot(c - nC, (r - nR) * 1.5) / RAGGIO, i = r * C + c;
    caldo[i] = Math.pow(Math.max(0, 1 - d), 1.8);
    t0[i] = T.valle + Math.hypot(c - nC, (r - nR) * 1.5) / Math.hypot(C, R * 1.5) * 1.5 + nn[i]! * 0.2;
  }
  const soglie = new Float32Array(N);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) soglie[r * C + c] = (Math.hypot(c - nC, (r - nR) * 1.5) / Math.hypot(C, R * 1.5)) * 0.74 + bayer(c, r) * 0.26;

  const lucciole = Array.from({ length: Math.round(C * 0.16) }, () => ({ x: caso() * C, y: oriz - 4 + caso() * (R - oriz), f: caso() * 6, v: 0.5 + caso() }));
  const disegnaValle = (t: number, q: number) => {
    g.clearRect(0, 0, W, H);
    if (q <= 0) { g.fillStyle = fondo; g.fillRect(0, 0, W, H); }
    for (let r = 0, i = 0; r < R; r++) for (let c = 0; c < C; c++, i++) {
      let k = famiglia[i]!;
      if (k < 0 || t < t0[i]! || soglie[i]! < q) continue;
      const n = nn[i]!;
      let l = luce[i]!;
      if (k === ERBA) l += Math.sin(c * 0.14 + r * 0.5 - t * 2.3 + n) * 0.17;
      else if (k === ACQUA) l += Math.sin(c * 0.7 + r * 1.3 + t * 3 + n * 6) * 0.14;
      else if (k === STELLA) l *= 0.55 + 0.45 * Math.sin(t * (1 + n * 4) + n * 20);
      else if (k === ALBERO) l += Math.sin(c * 0.3 - t * 1.1 + r * 0.2) * 0.03;
      const w = caldo[i]!;
      if (w > 0.03 && k !== STELLA) { l += w * 0.55; if (w > 0.22 + n * 0.3) k = CALDO; }
      const liv = Math.max(0, Math.min(LIVELLI - 1, Math.floor(l * LIVELLI))), rampa = RAMPE[k]!;
      // Mentre si decifra, la cella mostra un carattere a caso; poi trova il suo, che dipende da quanta luce riceve
      const qui = t < t0[i]! + 0.25 ? Math.floor(t * 28 + n * 40) % rampa.length : Math.min(rampa.length - 1, Math.floor((Math.max(0, l) + n * 0.1) * rampa.length));
      copia(g, rampa[qui]!, k, liv, c, r);
    }
    // Le lucciole: un carattere pieno e un alone caldo
    if (t > T.valle + 1.2) for (const b of lucciole) {
      const a = Math.sin(t * 2 * b.v + b.f);
      if (a < -0.15) continue;
      const x = Math.round(b.x + Math.sin(t * b.v + b.f) * 5), y = Math.round(b.y + Math.cos(t * b.v * 0.8 + b.f) * 3);
      if (x < 0 || x >= C || y < 0 || y >= R || soglie[y * C + x]! < q) continue;
      for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) { g.clearRect((x + i) * CW, (y + j) * CH, 3, 5); copia(g, 1 % 2 ? RAMPE[CALDO]![1]! : 0, CALDO, 5, x + i, y + j); }
      g.clearRect(x * CW, y * CH, 3, 5);
      copia(g, RAMPE[CALDO]![5]!, CALDO, 11, x, y);
    }
  };

  // --- Gli oggetti: si disegnano prima su piccole tele, poi ogni pixel pieno diventa un carattere
  const NW = 46, NH = 24, CX = 23, CY = 7;
  const davanti = tela(NW, NH), fgn = davanti.getContext('2d')!;
  const inCoppa = (x: number, y: number) => { const a = (x - CX) / 22, b = (y - CY) / (y < CY ? 2 : 15); return a * a + b * b <= 1; };
  for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) if (inCoppa(x, y)) pixel(fgn, x, y, '#3a2a1c');
  for (let i = 0; i < 70; i++) {
    const a0 = caso() * Math.PI, r0 = 0.3 + caso() * 0.7, x = CX + Math.cos(a0) * 22 * r0, y = CY + Math.sin(a0) * 15 * r0, a = (caso() - 0.5) * 1.1, l = 3 + caso() * 7;
    linea(fgn, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, caso() < 0.3 ? '#ffffff' : '#808080');
  }
  for (const [x0, y0, x1, y1] of [[2, 8, -2, 4], [5, 13, 0, 16], [43, 7, 47, 3], [40, 14, 46, 17], [15, 20, 11, 24], [30, 21, 34, 24]] as const) linea(fgn, x0, y0, x1, y1, '#ffffff');
  const uovo = tela(9, 11), ug = uovo.getContext('2d')!;
  const inUovo = (x: number, y: number) => { const a = (x - 4) / 4.5, b = (y - 6) / (y < 6 ? 6.4 : 5.2); return a * a + b * b <= 1; };
  for (let y = 0; y < 11; y++) for (let x = 0; x < 9; x++) if (inUovo(x, y)) pixel(ug, x, y, x > 5 || y > 8 ? '#808080' : '#ffffff');
  const mezzoUovo = tela(9, 6);
  mezzoUovo.getContext('2d')!.drawImage(uovo, 0, -5);
  const POSTI = [{ x: 4, y: -3 }, { x: 12, y: -4 }, { x: 20, y: -3 }];
  const pulcino = tela(6, 4), pg = pulcino.getContext('2d')!;
  ['..#...', '.###..', '#####.', '.####.'].forEach((r, y) => { for (let x = 0; x < 6; x++) if (r[x] === '#') pixel(pg, x, y, '#ff8000'); });
  const A = '#ff8000', B = '#ffffff';

  const SW = 54, SH = 36;
  const seduta = (o: number) => {
    const c = tela(SW, SH), q = c.getContext('2d')!, bob = Math.sin(o) * 0.8, onda = Math.sin(o) * 1.3;
    const corpo: P2[] = [[9, 7 + bob], [13, 11 + bob * 0.8], [11, 16 + bob * 0.4], [16, 21], [24, 23], [31, 22], [37, 21]];
    const raggio = (s: number) => { const v = [1.5, 1.4, 1.6, 3.4, 4.2, 2.6, 0.6], k = Math.min(5.99, s * 6), i = Math.floor(k); return v[i]! + (v[i + 1]! - v[i]!) * (k - i); };
    for (const l of [[[35, 21], [41, 20 + onda * 0.4], [46, 23 - onda * 0.5], [53, 18 + onda]], [[35, 22], [40, 26 + onda * 0.3], [46, 27 - onda * 0.5], [51, 33 + onda]], [[35, 20], [39, 14 + onda * 0.4], [44, 14 - onda * 0.5], [49, 8 + onda]]] as P2[][]) nastro(q, l, s => 1.2 - s * 1.1, A);
    nastro(q, corpo, raggio, A);
    nastro(q, [[8, 4 + bob], [12, 1 + bob], [17, 0 + bob], [22, 3 + bob]], s => 0.9 - s * 0.8, A);
    disco(q, 9, 6 + bob, 2.5, A);
    linea(q, 6, 6 + bob, 2, 7 + bob, B);
    return c;
  };
  const sedute = [0, 1, 2, 3, 4, 5].map(i => seduta((i / 6) * Math.PI * 2));
  const FW = 62, FH = 44;
  const volo = (o: number) => {
    const c = tela(FW, FH), q = c.getContext('2d')!, cy = 22, s0 = Math.sin(o), s1 = Math.sin(o - 0.9), s2 = Math.sin(o - 1.8), s3 = Math.sin(o - 2.7);
    const corpo: P2[] = [[6, cy + s0 * 1.2], [12, cy - 1 + s1 * 0.8], [20, cy + s1 * 0.6], [29, cy + s2 * 0.9], [36, cy + s3 * 1.4]];
    const rb = (s: number) => { const v = [1.4, 1.4, 2.2, 1.6, 0.6], k = Math.min(3.99, s * 4), i = Math.floor(k); return v[i]! + (v[i + 1]! - v[i]!) * (k - i); };
    for (const off of [-3, 0, 3]) nastro(q, [[35, cy + s3], [42, cy + off * 0.7 + s3 * 3], [51, cy + off * 1.4 - s3 * 3], [61, cy + off * 2 + s2 * 3]], s => 1.1 - s, A);
    const battuta = Math.sign(s0) * Math.pow(Math.abs(s0), 0.5);
    const ali = (k: number, dx: number) => {
      const a = battuta * k, b = Math.sin(o - 0.7) * k * 0.35, bordo: P2[] = [[17 + dx, cy - 1], [14 + dx, cy - 1 - a * 9], [16 + dx, cy - 1 - a * 15 - b * 3], [26 + dx, cy - 1 - a * 19 - b * 5]];
      nastro(q, bordo, s => 2 - s * 2, A, 50);
      for (const s of [0.45, 0.65, 0.85]) { const [x, y] = curva(bordo, s); linea(q, x, y, x + 8 * s + 2, y + Math.sign(a || 1) * 4, A); }
    };
    ali(0.8, 4);
    nastro(q, corpo, rb, A);
    disco(q, 6, cy + s0 * 1.2, 2.2, A);
    linea(q, 3, cy + s0 * 1.2, 0, cy + 1 + s0 * 1.2, B);
    ali(1, 0);
    return c;
  };
  const voli = Array.from({ length: 8 }, (_, i) => volo((i / 8) * Math.PI * 2));
  const RW = 300, RH = 60, ramo = tela(RW, RH), rg = ramo.getContext('2d')!;
  const yRamo = (x: number) => 34 + Math.sin(x * 0.045) * 2 + x * 0.05;
  for (let x = 0; x < RW; x++) { const s = Math.min(1.8, 0.3 + x / 40); for (let k = -s; k <= s; k++) pixel(rg, x, yRamo(x) + k, '#808080'); }
  for (let x = 14; x < RW; x += 9 + Math.floor(caso() * 9)) { const su = caso() < 0.55 ? -1 : 1, l = 4 + caso() * 9; linea(rg, x, yRamo(x), x - l * 0.7, yRamo(x) + su * l, '#ffffff'); }

  // Da pixel a celle: le celle sono più alte che larghe, quindi le righe si leggono una ogni 1,5.
  // Il colore del disegno dice la famiglia: arancio per gli uccelli, bianco e grigio per legno e uova
  type Pezzo = { x: number; y: number; k: number; l: number; s: number };
  const cache = new Map<Tela, Pezzo[]>();
  const pezzi = (c: Tela) => {
    let lista = cache.get(c);
    if (lista) return lista;
    lista = [];
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data, r = semeCaso(c.width * 13 + c.height);
    for (let y = 0; y < Math.floor(c.height / 1.5); y++) for (let x = 0; x < c.width; x++) {
      const i = (Math.floor(y * 1.5) * c.width + x) * 4;
      if (d[i + 3]! < 128) continue;
      const rosso = d[i]!, verde2 = d[i + 1]!, blu = d[i + 2]!, n = r();
      const pieno = (a: number, b: number) => { const j = (Math.floor(b * 1.5) * c.width + a) * 4; return a >= 0 && a < c.width && b >= 0 && j < d.length && d[j + 3]! >= 128; };
      const bordo = !(pieno(x - 1, y) && pieno(x + 1, y) && pieno(x, y - 1) && pieno(x, y + 1));
      if (rosso > 200 && blu < 60) lista.push({ x, y, k: CALDO, l: bordo ? 11 : 7 + Math.floor(n * 3), s: INDICE.get(bordo ? '#' : n < 0.5 ? '+' : '*')! });
      else if (rosso > 200) lista.push({ x, y, k: STELLA, l: 9 + Math.floor(n * 3), s: INDICE.get(n < 0.5 ? '+' : '*')! });
      else if (rosso > 90 && verde2 > 90) lista.push({ x, y, k: STELLA, l: 5 + Math.floor(n * 3), s: INDICE.get(n < 0.33 ? '/' : n < 0.66 ? '\\' : '-')! });
      else lista.push({ x, y, k: CALDO, l: 2, s: INDICE.get('.')! });
    }
    cache.set(c, lista);
    return lista;
  };
  const VARIE = [...'+*#%'].map(c => INDICE.get(c)!), varia = (p: Pezzo, x: number, y: number) => (p.k === CALDO ? VARIE[(x * 7 + y * 13) % 4]! : VARIE[(x * 7 + y * 13) % 2]!);
  // Mette un disegno sulla griglia, a una grandezza intera. Spegne la cella sotto, e rispetta la dissolvenza
  const posa = (c: Tela, cc: number, rr: number, k: number, q: number, sciogli = true) => {
    for (const p of pezzi(c)) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) {
      const x = cc + p.x * k + a, y = rr + p.y * k + b;
      if (x < 0 || y < 0 || x >= C || y >= R) continue;
      if (sciogli && q > 0 && soglie[y * C + x]! < q) continue;
      f.fillStyle = fondo; f.fillRect(x * CW, y * CH, CW, CH);
      copia(f, k > 1 && p.l > 5 ? varia(p, x, y) : p.s, p.k, p.l, x, y);
    }
  };

  // --- Lo stormo piccolo: gli uccelli si alzano dal nido e dagli alberi sul lato destro
  const destra = alberi.filter(a => a.c > C * 0.4);
  const piccoli = Array.from({ length: 90 }, (_, i) => {
    const dalNido = i < 12, s = dalNido ? null : destra[Math.floor(caso() * destra.length)];
    return { x: dalNido ? nC * CW : s ? s.c * CW : W, y: dalNido ? (nR - 4) * CH : s ? (s.r - s.h) * CH : H * 0.6, vx: -0.2 - caso() * 0.4, vy: -0.5 - caso() * 0.4, t0: T.schiusa + 0.1 + (dalNido ? i * 0.09 : 0.3 + caso() * 1.2), f: caso() * 6, ox: (caso() - 0.5) * W * 0.26, oy: (caso() - 0.5) * H * 0.16, fine: T.via + 0.5 + caso() * 1.1 };
  });
  const meta = () => {
    const [a, b] = (radice.dataset.stormo ?? '').split(',').map(Number);
    return a !== undefined && b !== undefined && !Number.isNaN(a) && !Number.isNaN(b) && radice.dataset.stormo ? { x: a / px, y: b / px } : { x: W * 0.62, y: H * 0.24 };
  };
  const passo = (t: number, dt: number) => {
    const m = meta();
    for (const b of piccoli) {
      if (t < b.t0) continue;
      const mx = m.x + Math.sin(t * 0.8 + b.f * 0.2) * W * 0.03 + b.ox, my = m.y + Math.cos(t * 1.1 + b.f * 0.2) * H * 0.03 + b.oy, r = dt * 60;
      b.vx += ((mx - b.x) / W) * 8 * dt + Math.sin(t * 3 + b.f) * 0.012 * r;
      b.vy += ((my - b.y) / H) * 8 * dt + Math.cos(t * 2.4 + b.f) * 0.012 * r;
      const v = Math.hypot(b.vx, b.vy), vm = 1.15; if (v > vm) { b.vx *= vm / v; b.vy *= vm / v; }
      b.x += b.vx * r; b.y += b.vy * r;
    }
  };

  const kBase = 1, kMax = Math.max(1, Math.min(3, Math.floor((C * 0.8) / NW)));
  const disegnaNido = (t: number, q: number) => {
    const z = liscio((t - T.zoom) / 0.5), k = t < T.zoom ? kMax : t < T.zoom + 0.28 ? Math.max(kBase, kMax - 1) : kBase;
    const ax = C / 2 + (nC - C / 2) * z, ay = R * 0.5 + (nR - R * 0.5) * z, x0 = Math.round(ax - CX * k), y0 = Math.round(ay - (CY / 1.5) * k);
    const vis = liscio((t - T.ramo) / 0.5);
    // Il ramo cresce da destra
    if (vis > 0) {
      const rx = x0 + (CX - 2) * k, ry = y0 + Math.round(((CY + 13 - 34) / 1.5) * k);
      for (const p of pezzi(ramo)) {
        const xx = rx + p.x * k;
        if (xx >= C || xx < C - (C - rx) * vis) continue;
        for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) { const x = xx + a, y = ry + p.y * k + b; if (y < 0 || y >= R || x >= C || (q > 0 && soglie[y * C + x]! < q)) continue; f.fillStyle = fondo; f.fillRect(x * CW, y * CH, CW, CH); copia(f, p.s, p.k, p.l, x, y); }
      }
    }
    if (liscio((t - T.nido) / 0.45) <= 0) return;
    const sx = 19, sy = -13;
    if (t >= T.madre && t < T.parte) {
      const a = 1 - liscio((t - T.madre) / 0.45);
      if (a > 0) posa(voli[Math.floor(t * 12) % 8]!, x0 + (sx - 3 + Math.round(a * 70)) * k, y0 + (sy - 3 - Math.round(a * 20)) * k, k, q);
      else posa(sedute[Math.floor(t * 3.2) % 6]!, x0 + sx * k, y0 + sy * k, k, q);
    }
    POSTI.forEach((p, i) => {
      const ti = T.uova + i * 0.1;
      if (t < ti) return;
      const sale = Math.round((1 - liscio((t - ti) / 0.18)) * 5), sch = T.schiusa + i * 0.3, trema = t > T.uova + 0.5 && t < sch + 0.05 ? (Math.floor(t * (t > sch - 0.5 ? 18 : 5) + i) % 2 ? 1 : 0) : 0, py = Math.round(p.y / 1.5);
      if (t < sch) { posa(uovo, x0 + (p.x + trema) * k, y0 + (py + sale) * k, k, q); return; }
      if (t < sch + 0.5) posa(pulcino, x0 + (p.x + 2) * k, y0 + (py - 1) * k, k, q);
      posa(mezzoUovo, x0 + p.x * k, y0 + (py + 3) * k, k, q);
    });
    const parti2 = liscio((t - T.nido) / 0.45);
    if (parti2 >= 1) posa(davanti, x0, y0, k, q);
    else for (const p of pezzi(davanti)) { if (p.y < (NH / 1.5) * (1 - parti2)) continue; for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) { const x = x0 + p.x * k + a, y = y0 + p.y * k + b; if (x >= 0 && y >= 0 && x < C && y < R) { f.fillStyle = fondo; f.fillRect(x * CW, y * CH, CW, CH); copia(f, p.s, p.k, p.l, x, y); } } }
  };

  const FORMA = [['x...x', '.x.x.', '..x..'], ['.....', 'xx.xx', '..x..']], LATO = innerWidth < 700 ? 2 : 2;
  let conta = 0;
  const disegno = (t: number) => {
    const u0 = (t - T.via) / T.durata, q = u0 > 0 ? liscio(u0 * 1.05) * 1.02 : 0;
    // La valle si aggiorna un fotogramma su due: i caratteri cambiano a scatti, come in un terminale
    if (conta++ % 2 === 0 || u0 > 0) disegnaValle(t, q);
    f.clearRect(0, 0, W, H);
    disegnaNido(t, q);
    if (t >= T.parte) {
      const a = liscio((t - T.parte) / 1.5), m = meta(), o = curva([[(nC + 19) * CW, (nR - 8) * CH], [(nC - 4) * CW, H * 0.5], [m.x + W * 0.14, m.y + H * 0.1], [m.x, -80]], a);
      posa(voli[Math.floor(t * 12) % 8]!, Math.round((o[0] - (FW * CW) / 2) / CW), Math.round((o[1] - (FH * CH) / 3) / CH), 1, 0, false);
    }
    f.fillStyle = arancio;
    for (const b of piccoli) {
      if (t < b.t0 || t > b.fine) continue;
      const fo = FORMA[Math.floor(t * 9 + b.f) % 2]!;
      fo.forEach((r, y) => { for (let x = 0; x < 5; x++) if (r[x] === 'x') f.fillRect(Math.round(b.x) + (x - 2) * LATO, Math.round(b.y) + (y - 1) * LATO, LATO, LATO); });
    }
  };

  // --- Il nome: sale al suo posto nella barra in alto, dopo la tilde
  type Volo = { dx: number; dy: number; s: number } | null;
  let voloNome: Volo = null;
  const staccaNome = () => {
    const r = nome.getBoundingClientRect(), base = parseFloat(getComputedStyle(nome).fontSize);
    nome.classList.add('in-volo');
    Object.assign(nome.style, { left: `${r.left}px`, top: `${r.top}px`, transform: 'none', transformOrigin: '0 0' });
    const io = document.querySelector<HTMLElement>('.barra .io');
    const nodo = io?.firstChild;
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
  const chiudi = () => { if (finito) return; finito = true; parti(); delete radice.dataset.intro; delete radice.dataset.stormo; el.remove(); ['pointerdown', 'keydown', 'wheel'].forEach(e => removeEventListener(e, salta)); };
  const salta = () => { if (t < T.via) { t = T.via; for (const b of piccoli) if (b.t0 > t) b.t0 = t; for (let i = 0; i < N; i++) t0[i] = Math.min(t0[i]!, t - 1); parti(); } else chiudi(); };
  const aggiorna = (ora: number, dt: number) => {
    if (!viaData) {
      const scritte = Math.floor(liscio((ora - T.nome) / 0.6) * TESTO.length);
      if (nome.textContent !== TESTO.slice(0, scritte)) nome.textContent = TESTO.slice(0, scritte);
    } else if (voloNome) {
      const z = liscio((ora - T.via - 0.15) / (T.durata - 0.25));
      nome.style.transform = `translate(${voloNome.dx * z}px, ${voloNome.dy * z}px) scale(${1 + (voloNome.s - 1) * z})`;
    }
    passo(ora, dt);
  };
  if (ferma) {
    // Solo per le prove: ?intro=3.2 ferma la scena a quel secondo
    for (let i = 0; i < ferma * 60; i++) { if (i / 60 >= T.via) parti(); aggiorna(i / 60, 1 / 60); }
    if (ferma >= T.via) parti();
    aggiorna(ferma, 0);
    disegno(ferma);
    return;
  }
  ['pointerdown', 'keydown', 'wheel'].forEach(e => addEventListener(e, salta, { passive: true }));
  const giro = (ms: number) => {
    if (finito) return;
    // Anche su un telefono lento l'intro dura lo stesso tempo: salta fotogrammi, non rallenta
    const dt = Math.min(0.25, prima ? (ms - prima) / 1000 : 0);
    prima = ms; t += dt;
    if (t >= T.via) parti();
    aggiorna(t, dt);
    disegno(t);
    if ((t - T.via) / T.durata >= 1.02) { chiudi(); return; }
    requestAnimationFrame(giro);
  };
  requestAnimationFrame(giro);
}
