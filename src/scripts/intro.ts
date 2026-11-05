// Intro della home, una volta per sessione. Minimale: i colori del sito, e un solo accento arancio per gli uccelli.
// Un nido a linee su un ramo con le spine. Dietro cresce una vallata fatta di caratteri ASCII, che si decifrano al loro posto.
// Intorno al nome si apre un sigillo simmetrico a lame e spine, a pixel, percorso da piccole luci.
// Nel passaggio alla home gli uccelli non escono mai dallo schermo: si raccolgono dove vola lo stormo 3D e diventano lui.
// Il paesaggio si scioglie a pixel dal nido verso sinistra, e il nome scende al suo posto nella home.

const T = { ramo: 0, nido: 0.3, uova: 0.7, madre: 1, zoom: 1.7, valle: 1.8, sigillo: 2, nome: 2.5, schiusa: 3.1, stormo: 3.3, parte: 4.4, via: 5, durata: 1.6 };

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
  '^': ['.#.', '#.#', '...', '...', '...'], '/': ['..#', '..#', '.#.', '#..', '#..'], '\\': ['#..', '#..', '.#.', '..#', '..#'], '|': ['.#.', '.#.', '.#.', '.#.', '.#.'],
  '.': ['...', '...', '...', '...', '.#.'], ':': ['...', '.#.', '...', '.#.', '...'], ',': ['...', '...', '...', '.#.', '#..'], "'": ['.#.', '.#.', '...', '...', '...'], '~': ['...', '##.', '.##', '...', '...'],
  '*': ['...', '#.#', '.#.', '#.#', '...'], '+': ['...', '.#.', '###', '.#.', '...'], '-': ['...', '...', '###', '...', '...'], '_': ['...', '...', '...', '...', '###'], x: ['...', '#.#', '.#.', '#.#', '...'],
};
const MISTI = '/\\|*+:-^~x';
const ALBERI = [
  ['^', '|'],
  [' ^ ', '/|\\', ' | '],
  ['  ^  ', ' /|\\ ', '//|\\\\', '  |  '],
  ['   ^   ', '  /|\\  ', ' //|\\\\ ', '///|\\\\\\', '   |   ', '   |   '],
];

// Una linea morbida che passa per i punti: la base di tutto ciò che è sinuoso
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
  const radice = document.documentElement, stile = getComputedStyle(radice), V = (n: string, d: string) => stile.getPropertyValue(n).trim() || d;
  const fondo = V('--bg', '#0a0b0d'), testo = V('--fg', '#d9dde3'), spento = V('--muted', '#7d838c'), verde = V('--verde', '#3fb950'), azzurro = V('--azzurro', '#58a6ff'), arancio = V('--arancio', '#ffa45e');
  const cv = el.querySelector('canvas')!, nome = el.querySelector<HTMLElement>('.intro-nome')!, TESTO = nome.textContent ?? '';
  const px = Math.max(2, Math.round(Math.min(innerWidth / 360, innerHeight / 225))), W = Math.ceil(innerWidth / px), H = Math.ceil(innerHeight / px);
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingEnabled = false;
  const caso = semeCaso(7);
  nome.textContent = '';

  // --- Il nido: solo rametti sottili, con il fondo pieno per nascondere ciò che gli sta dietro
  const NW = 46, NH = 24, CX = 23, CY = 7;
  const davanti = tela(NW, NH), fg = davanti.getContext('2d')!;
  const inCoppa = (x: number, y: number) => { const u = (x - CX) / 22, v = (y - CY) / (y < CY ? 2 : 15); return u * u + v * v <= 1; };
  for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) if (inCoppa(x, y)) pixel(fg, x, y, fondo);
  for (let i = 0; i < 26; i++) {
    const a0 = (i / 26) * Math.PI + (caso() - 0.5) * 0.2, r0 = 0.5 + (i % 3) * 0.24, x = CX + Math.cos(a0) * 22 * r0, y = CY + Math.sin(a0) * 15 * r0, a = a0 + Math.PI / 2 + (i % 2 ? 0.45 : -0.45), l = 7 + caso() * 7;
    linea(fg, x - Math.cos(a) * l * 0.5, y - Math.sin(a) * l * 0.5, x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5, i % 3 ? spento : testo);
  }
  for (let x = 1; x < NW - 1; x++) { const q = (x - CX) / 22, y = CY + 1 + Math.sin((x - 1) * 0.9) * 0.6; if (Math.abs(q) < 1) pixel(fg, x, y, testo); }
  for (const [x0, y0, x1, y1] of [[2, 8, -2, 4], [5, 13, 0, 16], [43, 7, 47, 3], [40, 14, 46, 17], [15, 20, 11, 24], [30, 21, 34, 24]] as const) linea(fg, x0, y0, x1, y1, testo);

  // --- Le uova: solo il contorno e qualche punto
  const uovo = tela(9, 11), ug = uovo.getContext('2d')!;
  const inUovo = (x: number, y: number) => { const u = (x - 4) / 4.5, v = (y - 6) / (y < 6 ? 6.4 : 5.2); return u * u + v * v <= 1; };
  for (let y = 0; y < 11; y++) for (let x = 0; x < 9; x++) if (inUovo(x, y)) pixel(ug, x, y, inUovo(x - 1, y) && inUovo(x + 1, y) && inUovo(x, y - 1) && inUovo(x, y + 1) ? fondo : testo);
  for (const [x, y] of [[3, 3], [5, 5], [3, 7]] as const) pixel(ug, x, y, spento);
  const POSTI = [{ x: 4, y: -3 }, { x: 12, y: -4 }, { x: 20, y: -3 }];
  const pulcino = tela(6, 4), pg = pulcino.getContext('2d')!;
  ['..#...', '.###..', '#####.', '.####.'].forEach((r, y) => { for (let x = 0; x < 6; x++) if (r[x] === '#') pixel(pg, x, y, arancio); });

  // --- La madre: una sagoma piena e affilata, con i tagli al posto dei colori. Collo a S, cresta e coda a tre lame
  const SW = 54, SH = 36;
  const seduta = (o: number) => {
    const c = tela(SW, SH), q = c.getContext('2d')!, bob = Math.sin(o) * 0.8, onda = Math.sin(o) * 1.3;
    const corpo: P2[] = [[9, 7 + bob], [13, 11 + bob * 0.8], [11, 16 + bob * 0.4], [16, 21], [24, 23], [31, 22], [37, 21]];
    const raggio = (s: number) => { const v = [1.3, 1.2, 1.4, 3.2, 4, 2.4, 0.5], k = Math.min(5.99, s * 6), i = Math.floor(k); return v[i]! + (v[i + 1]! - v[i]!) * (k - i); };
    for (const l of [[[35, 21], [41, 20 + onda * 0.4], [46, 23 - onda * 0.5], [53, 18 + onda]], [[35, 22], [40, 26 + onda * 0.3], [46, 27 - onda * 0.5], [51, 33 + onda]], [[35, 20], [39, 14 + onda * 0.4], [44, 14 - onda * 0.5], [49, 8 + onda]]] as P2[][]) nastro(q, l, s => 1.1 - s * 1.1, arancio);
    nastro(q, corpo, raggio, arancio);
    // Cresta a lama, testa e becco
    nastro(q, [[8, 4 + bob], [12, 1 + bob], [17, 0 + bob], [22, 3 + bob]], s => 0.8 - s * 0.8, arancio);
    disco(q, 9, 6 + bob, 2.3, arancio);
    linea(q, 6, 6 + bob, 2, 7 + bob, testo);
    pixel(q, 8, 5 + bob, fondo);
    // L'ala è un taglio nella sagoma
    const ala: P2[] = [[17, 18], [24, 19], [32, 20], [41, 17]];
    nastro(q, ala, s => 2.6 - s * 2.6 + 0.8, fondo);
    nastro(q, ala, s => 2.6 - s * 2.6, arancio);
    return c;
  };
  const sedute = [0, 1, 2, 3, 4, 5].map(i => seduta((i / 6) * Math.PI * 2));

  // In volo: il corpo ondeggia, le ali sono due mezzelune sottili, la coda segue l'onda
  const FW = 62, FH = 44;
  const volo = (o: number) => {
    const c = tela(FW, FH), q = c.getContext('2d')!, cy = 22, s0 = Math.sin(o), s1 = Math.sin(o - 0.9), s2 = Math.sin(o - 1.8), s3 = Math.sin(o - 2.7);
    const corpo: P2[] = [[6, cy + s0 * 1.2], [12, cy - 1 + s1 * 0.8], [20, cy + s1 * 0.6], [29, cy + s2 * 0.9], [36, cy + s3 * 1.4]];
    const rb = (s: number) => { const v = [1.3, 1.3, 2, 1.5, 0.5], k = Math.min(3.99, s * 4), i = Math.floor(k); return v[i]! + (v[i + 1]! - v[i]!) * (k - i); };
    for (const off of [-3, 0, 3]) nastro(q, [[35, cy + s3], [42, cy + off * 0.7 + s3 * 3], [51, cy + off * 1.4 - s3 * 3], [61, cy + off * 2 + s2 * 3]], s => 1 - s, arancio);
    const battuta = Math.sign(s0) * Math.pow(Math.abs(s0), 0.5);
    const ali = (f: number, dx: number) => {
      const a = battuta * f, b = Math.sin(o - 0.7) * f * 0.35;
      nastro(q, [[17 + dx, cy - 1], [14 + dx, cy - 1 - a * 9], [16 + dx, cy - 1 - a * 15 - b * 3], [26 + dx, cy - 1 - a * 19 - b * 5]], u => 1.8 - u * 1.8, arancio, 50);
      for (const k of [0.45, 0.65, 0.85]) { const [x, y] = curva([[17 + dx, cy - 1], [14 + dx, cy - 1 - a * 9], [16 + dx, cy - 1 - a * 15 - b * 3], [26 + dx, cy - 1 - a * 19 - b * 5]], k); linea(q, x, y, x + 8 * k + 2, y + Math.sign(a || 1) * 4, arancio); }
    };
    ali(0.8, 4);
    nastro(q, corpo, rb, arancio);
    disco(q, 6, cy + s0 * 1.2, 2, arancio);
    linea(q, 3, cy + s0 * 1.2, 0, cy + 1 + s0 * 1.2, testo);
    pixel(q, 5, cy - 1 + s0 * 1.2, fondo);
    ali(1, 0);
    return c;
  };
  const voli = Array.from({ length: 8 }, (_, i) => volo((i / 8) * Math.PI * 2));

  // --- Il ramo: una linea che si stringe, con le spine
  const RW = 300, RH = 60, ramo = tela(RW, RH), rg = ramo.getContext('2d')!;
  const yRamo = (x: number) => 34 + Math.sin(x * 0.045) * 2 + x * 0.05;
  for (let x = 0; x < RW; x++) { const s = Math.min(1.6, 0.2 + x / 40); for (let k = -s; k <= s; k++) pixel(rg, x, yRamo(x) + k, testo); }
  for (let x = 14; x < RW; x += 11 + Math.floor(caso() * 9)) { const su = caso() < 0.55 ? -1 : 1, l = 4 + caso() * 8; linea(rg, x, yRamo(x), x - l * 0.7, yRamo(x) + su * l, testo); }

  // --- La vallata in caratteri: una griglia di celle 4x6. I monti salgono ai lati, gli alberi sono piccoli disegni ASCII
  const CW = 4, CH = 6, colonne = Math.ceil(W / CW), righe = Math.ceil(H / CH), rOriz = Math.round(righe * 0.7);
  type Cella = { c: number; r: number; ch: string; col: string; t: number };
  const celle = new Map<string, Cella>();
  const u = (c: number) => (c - colonne / 2) / (colonne / 2);
  const tempoCella = (c: number, r: number) => T.valle + Math.hypot(c * CW - W * 0.77, (r * CH - H * 0.79) * 1.2) / Math.hypot(W, H) * 1.5 + caso() * 0.18;
  const metti = (c: number, r: number, ch: string, col: string) => { if (c >= 0 && c < colonne && r >= 0 && r < righe && ch !== ' ') celle.set(`${c},${r}`, { c, r, ch, col, t: tempoCella(c, r) }); };
  const lontano = mescola(spento, fondo, 0.35), scuro = mescola(spento, fondo, 0.62);
  const cresta = (c: number) => Math.round(rOriz - 1 - Math.pow(Math.abs(u(c)), 1.5) * righe * 0.34 - Math.abs(Math.sin(c * 0.33) + Math.sin(c * 0.13 + 1) * 0.6) * 2.4 * Math.abs(u(c)));
  const collina = (c: number) => Math.round(rOriz + 1 - Math.pow(Math.abs(u(c)), 1.6) * righe * 0.14);
  for (let c = 0; c < colonne; c++) {
    const a = cresta(c), b = cresta(c + 1), p = cresta(c - 1);
    // La linea del monte: / dove sale, \ dove scende, ^ sulla cima
    const su = a < p, giu = b > a;
    metti(c, a, su && giu ? '^' : b < a ? '/' : p < a ? '\\' : '_', lontano);
    for (let r = Math.min(a, b) + 1; r < Math.max(a, b); r++) metti(c, r, b < a ? '/' : '\\', lontano);
    // Sotto la cresta, pochi punti: la roccia è quasi vuota
    for (let r = a + 1; r < collina(c); r++) if (caso() < 0.07) metti(c, r, caso() < 0.5 ? '.' : ':', scuro);
  }
  const fiumeC = (r: number) => colonne / 2 + Math.sin(r * 0.42) * (r - rOriz) * 0.42, fiumeL = (r: number) => (r - rOriz) * 0.16 + 0.4;
  const inFiume = (c: number, r: number) => r > rOriz && Math.abs(c - fiumeC(r)) < fiumeL(r);
  for (let r = rOriz + 1; r < righe; r++) for (let c = 0; c < colonne; c++) {
    if (inFiume(c, r)) metti(c, r, '~', mescola(azzurro, spento, 0.4));
    else if (r >= collina(c) && caso() < 0.045) metti(c, r, caso() < 0.5 ? '.' : ',', scuro);
  }
  // Alberi: pochi lontani, più grandi verso il basso, fitti solo ai lati. Il centro resta vuoto
  const posti: { c: number; r: number; t: string[]; col: string }[] = [];
  for (let i = 0; i < 1400 && posti.length < 90; i++) {
    const c = Math.floor(caso() * colonne), r0 = collina(c), r = r0 + Math.floor(caso() * (righe - r0)), d = (r - r0) / Math.max(1, righe - r0);
    if (caso() > Math.abs(u(c)) * 1.1 + d * 0.12) continue;
    const t = ALBERI[Math.min(3, Math.floor(d * 3.2 + caso() * 1.2))]!, l = t[0]!.length;
    if (Array.from({ length: t.length + 1 }, (_, k) => r - k).some(q => inFiume(c, q) || inFiume(c + l, q) || inFiume(c - l, q))) continue;
    if (posti.some(q => Math.abs(q.c - c) < (l + q.t[0]!.length) / 2 && Math.abs(q.r - r) < Math.max(t.length, q.t.length) - 1)) continue;
    posti.push({ c, r, t, col: d < 0.3 ? scuro : d < 0.65 ? lontano : mescola(verde, spento, 0.4) });
  }
  posti.sort((a, b) => a.r - b.r).forEach(p => p.t.forEach((riga, j) => { for (let k = 0; k < riga.length; k++) metti(p.c - (riga.length >> 1) + k, p.r - p.t.length + 1 + j, riga[k]!, p.col); }));
  const tutte = [...celle.values()].sort((a, b) => a.t - b.t);
  // I glifi già pronti, per colore: disegnarli è una sola copia
  const atlante = new Map<string, Tela>();
  const glifo = (ch: string, col: string) => {
    const k = ch + col;
    let q = atlante.get(k);
    if (!q) { q = tela(3, 5); const x = q.getContext('2d')!; (GLIFI[ch] ?? GLIFI['.']!).forEach((r, y) => { for (let i = 0; i < 3; i++) if (r[i] === '#') pixel(x, i, y, col); }); atlante.set(k, q); }
    return q;
  };
  const stampa = (c: Ctx, cella: Cella, ch = cella.ch) => c.drawImage(glifo(ch, cella.col), cella.c * CW, cella.r * CH);
  const valle = tela(W, H), vg = valle.getContext('2d')!;
  let fatte = 0;
  const INCERTO = 0.28; // Per questo tempo una cella mostra caratteri a caso, poi si ferma sul suo
  const disegnaValle = (t: number) => {
    while (fatte < tutte.length && tutte[fatte]!.t + INCERTO <= t) stampa(vg, tutte[fatte++]!);
    g.drawImage(valle, 0, 0);
    for (let i = fatte; i < tutte.length; i++) { const q = tutte[i]!; if (q.t > t) break; stampa(g, q, MISTI[Math.floor(t * 30 + q.c * 3 + q.r * 7) % MISTI.length]!); }
    // Il fiume scorre, e qualche carattere cambia da solo
    if (fatte === tutte.length) for (let i = 0; i < 14; i++) { const q = tutte[(i * 97 + Math.floor(t * 5) * 53) % tutte.length]!; g.fillStyle = fondo; g.fillRect(q.c * CW, q.r * CH, 3, 5); stampa(g, q, MISTI[(i + Math.floor(t * 9)) % MISTI.length]!); }
  };

  // --- Il sigillo: lame curve che si stringono fino a una punta, con le spine, specchiate intorno al nome. Ogni pixel ha il suo momento
  const SX = W * (W > H ? 0.46 : 0.5), SY = H * (W > H ? 0.5 : 0.3), cxS = W / 2, cyS = H * 0.5;
  const LAME: { p: P2[]; r: number; t0: number; spine: number }[] = [
    { p: [[0, -0.2], [0.22, -0.2], [0.44, -0.3], [0.5, -0.56]], r: 1.5, t0: 0, spine: 7 },
    { p: [[0.1, -0.2], [0.34, -0.14], [0.62, -0.17], [0.86, -0.42]], r: 1.4, t0: 0.12, spine: 8 },
    { p: [[0, -0.2], [0.07, -0.34], [0.03, -0.5], [0.13, -0.74]], r: 1.1, t0: 0.05, spine: 4 },
    { p: [[0.58, -0.17], [0.7, -0.08], [0.72, 0.02], [0.92, 0.1]], r: 1.1, t0: 0.4, spine: 3 },
    { p: [[0, 0.2], [0.2, 0.2], [0.42, 0.28], [0.6, 0.17]], r: 1.4, t0: 0.08, spine: 6 },
    { p: [[0.3, 0.23], [0.42, 0.33], [0.42, 0.42], [0.54, 0.54]], r: 1, t0: 0.35, spine: 3 },
    { p: [[0, 0.2], [0.05, 0.3], [0.02, 0.38], [0.06, 0.52]], r: 0.9, t0: 0.05, spine: 2 },
  ];
  type Punto = { x: number; y: number; t: number };
  const trama: Punto[] = [], binari: P2[][] = [];
  const nv = semeCaso(77), aS = (x: number, y: number): P2 => [cxS + x * SX, cyS + y * SY];
  const lama = (p: readonly P2[], r0: number, t0: number, durata: number, verso: number) => {
    const n = Math.ceil(Math.hypot(p[0]![0] - p[p.length - 1]![0], p[0]![1] - p[p.length - 1]![1]) * 2.4) + 8;
    for (let i = 0; i <= n; i++) {
      const s = i / n, [x, y] = curva(p, s), r = r0 * (1 - s), tt = t0 + s * durata, l = r > 0.9 ? 1 : 0;
      for (let a = -l; a <= l; a++) for (let b = -l; b <= l; b++) if (a * a + b * b <= r * r) for (const m of [1, -1]) trama.push({ x: Math.round(cxS + (x - cxS) * m) + a * m, y: Math.round(y) + b, t: tt });
      if (!l) for (const m of [1, -1]) trama.push({ x: Math.round(cxS + (x - cxS) * m), y: Math.round(y), t: tt });
    }
    void verso;
  };
  const DS = 1.1;
  for (const b of LAME) {
    const p = b.p.map(([x, y]) => aS(x, y)), t0 = T.sigillo + b.t0;
    binari.push(p);
    lama(p, b.r * 1.3, t0, DS, 1);
    // Le spine: corte, inclinate all'indietro, si alternano sui due lati
    for (let k = 1; k <= b.spine; k++) {
      const s = k / (b.spine + 1), [x, y] = curva(p, s), [x2, y2] = curva(p, s + 0.02), dir = Math.atan2(y2 - y, x2 - x), lato = k % 2 ? 1 : -1, l = (5 + nv() * 7) * (1 - s * 0.5) * Math.min(1.5, Math.min(W, H) / 150), a = dir + lato * 0.75;
      lama([[x, y], [x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5], [x + Math.cos(a) * l, y + Math.sin(a) * l]], 1, t0 + s * DS, 0.25, lato);
    }
  }
  // I rombi sull'asse, sopra e sotto il nome
  for (const [yy, r] of [[-0.2, 3], [0.2, 3], [-0.74, 2]] as const) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (Math.abs(a) + Math.abs(b) === r) trama.push({ x: Math.round(cxS) + a, y: Math.round(aS(0, yy)[1]) + b, t: T.sigillo });
  trama.sort((a, b) => a.t - b.t);
  const sigillo = tela(W, H), sg = sigillo.getContext('2d')!;
  let filiFatti = 0;
  const luci = Array.from({ length: 10 }, (_, i) => ({ b: i % binari.length, s: caso(), v: 0.32 + caso() * 0.3 }));
  const lampi = Array.from({ length: 40 }, () => ({ i: Math.floor(caso() * Math.max(1, trama.length)), f: caso() * 6, v: 2 + caso() * 3 }));
  const disegnaSigillo = (t: number) => {
    while (filiFatti < trama.length && trama[filiFatti]!.t <= t) { const q = trama[filiFatti++]!; pixel(sg, q.x, q.y, testo); }
    g.drawImage(sigillo, 0, 0);
    // Piccole luci arancio corrono sulle lame, specchiate; qualche punto lampeggia a croce
    if (t > T.sigillo + 0.3) for (const q of luci) {
      const s = (q.s + t * q.v) % 1, [x, y] = curva(binari[q.b]!, s);
      if (t < T.sigillo + LAME[q.b]!.t0 + s * DS) continue;
      for (const m of [1, -1]) { const a = cxS + (x - cxS) * m; pixel(g, a, y, arancio); pixel(g, a + 1, y, arancio); pixel(g, a, y + 1, arancio); pixel(g, a - 1, y, arancio); pixel(g, a, y - 1, arancio); }
    }
    for (const q of lampi) {
      const a = trama[q.i];
      if (!a || a.t > t || Math.sin(t * q.v + q.f) < 0.75) continue;
      for (const [i, j] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]] as const) pixel(g, a.x + i, a.y + j, testo);
    }
  };

  // --- Lo stormo piccolo: ogni uccello si alza dal nido o da un albero
  const kFine = 1, nx = Math.round(W * (W > H ? 0.8 : 0.58)), ny = Math.round(H * 0.8);
  const destra = posti.filter(a => a.c * CW > W * 0.4);
  const piccoli = Array.from({ length: 90 }, (_, i) => {
    const dalNido = i < 12, s = dalNido ? null : destra[Math.floor(caso() * destra.length)];
    return { x: dalNido ? nx : s ? s.c * CW : W, y: dalNido ? ny - 6 : s ? (s.r - s.t.length) * CH : H * 0.6, vx: -0.2 - caso() * 0.4, vy: -0.5 - caso() * 0.4, t0: T.schiusa + 0.1 + (dalNido ? i * 0.09 : 0.3 + caso() * 1.2), f: caso() * 6, ox: (caso() - 0.5) * W * 0.26, oy: (caso() - 0.5) * H * 0.16, fine: T.via + 0.5 + caso() * 1.1 };
  });
  // Lo stormo 3D dice dove si trova sullo schermo: i piccoli vanno lì. Prima che lo dica, un punto in alto a destra
  const meta = () => {
    const [a, b] = (radice.dataset.stormo ?? '').split(',').map(Number);
    return a !== undefined && b !== undefined && !Number.isNaN(a) && !Number.isNaN(b) && radice.dataset.stormo ? { x: a / px, y: b / px } : { x: W * 0.62, y: H * 0.24 };
  };

  // --- Il nido sulla scena
  const disegnaNido = (t: number) => {
    const z = liscio((t - T.zoom) / 0.5), k = t < T.zoom ? kFine + 2 : t < T.zoom + 0.28 ? kFine + 1 : kFine;
    const kk = Math.min(k, Math.max(kFine, Math.floor((W * 0.8) / NW)));
    const ax = W / 2 + (nx - W / 2) * z, ay = H * 0.46 + (ny - H * 0.46) * z, x0 = Math.round(ax - CX * kk), y0 = Math.round(ay - CY * kk);
    const disegna = (c: Tela, x: number, y: number) => g.drawImage(c, x0 + x * kk, y0 + y * kk, c.width * kk, c.height * kk);
    const vis = liscio((t - T.ramo) / 0.5), rx = x0 + (CX - 2) * kk, ry = y0 + (CY + 13 - 34) * kk, lung = Math.ceil(Math.max(0, W - rx) / kk) + 1, parte = Math.min(RW, Math.ceil(lung * vis));
    if (parte > 0) g.drawImage(ramo, Math.max(0, lung - parte), 0, parte, RH, rx + (lung - parte) * kk, ry, parte * kk, RH * kk);
    const nido = liscio((t - T.nido) / 0.45);
    if (nido <= 0) return;
    const sx = 19, sy = -19;
    if (t >= T.madre && t < T.parte) {
      const a = 1 - liscio((t - T.madre) / 0.45);
      if (a > 0) disegna(voli[Math.floor(t * 12) % 8]!, sx - 3 + Math.round(a * 70), sy - 5 - Math.round(a * 30 - Math.sin(a * 6) * 4));
      else disegna(sedute[Math.floor(t * 3.2) % 6]!, sx, sy);
    }
    POSTI.forEach((p, i) => {
      const ti = T.uova + i * 0.1;
      if (t < ti) return;
      const sale = Math.round((1 - liscio((t - ti) / 0.18)) * 8), sch = T.schiusa + i * 0.3, trema = t > T.uova + 0.5 && t < sch + 0.05 ? (Math.floor(t * (t > sch - 0.5 ? 18 : 5) + i) % 2 ? 1 : 0) : 0;
      if (t < sch) { disegna(uovo, p.x + trema, p.y + sale); return; }
      if (t < sch + 0.5) disegna(pulcino, p.x + 2, p.y - 1 + Math.round((1 - liscio((t - sch) / 0.15)) * 3));
      g.drawImage(uovo, 0, 5, 9, 6, x0 + p.x * kk, y0 + (p.y + 5) * kk, 9 * kk, 6 * kk);
    });
    const righeN = Math.ceil(NH * nido);
    g.drawImage(davanti, 0, NH - righeN, NW, righeN, x0, y0 + (NH - righeN) * kk, NW * kk, righeN * kk);
  };

  const FORMA = [['x...x', '.x.x.', '..x..'], ['.....', 'xx.xx', '..x..']];
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

  // Il paesaggio si scioglie a pixel, dal nido verso sinistra, dove atterra il nome. Ogni cella ha la sua soglia, con una trama regolare
  let soglie: Float32Array | null = null;
  const prepara = () => {
    soglie = new Float32Array(W * H);
    const mass = Math.hypot(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) soglie[y * W + x] = (Math.hypot(x - nx, (y - ny) * 1.15) / mass) * 0.72 + bayer(x, y) * 0.28;
  };

  const disegno = (t: number) => {
    g.fillStyle = fondo; g.fillRect(0, 0, W, H);
    if (t >= T.valle) disegnaValle(t);
    if (t >= T.sigillo) disegnaSigillo(t);
    disegnaNido(t);
    // La madre si stacca dal nido e sale, sinuosa, oltre il bordo in alto
    if (t >= T.parte) {
      const a = liscio((t - T.parte) / 1.5), m = meta(), o = curva([[nx + 19, ny - 22], [nx - W * 0.03, ny - H * 0.3], [m.x + W * 0.14, m.y + H * 0.1], [m.x, -60]], a);
      g.drawImage(voli[Math.floor(t * 12) % 8]!, Math.round(o[0] - FW / 2), Math.round(o[1] - FH / 2));
    }
    // Dissolvenza: si tolgono le celle sotto la soglia. Gli uccelli si disegnano dopo, quindi non si sciolgono mai
    const u0 = (t - T.via) / T.durata;
    if (u0 > 0) {
      if (!soglie) prepara();
      const dati = g.getImageData(0, 0, W, H), d = dati.data, q = liscio(u0 * 1.05) * 1.02;
      for (let i = 0, n = W * H; i < n; i++) if (soglie![i]! < q) d[i * 4 + 3] = 0;
      g.putImageData(dati, 0, 0);
    }
    for (const b of piccoli) {
      if (t < b.t0 || t > b.fine) continue;
      const f = FORMA[Math.floor(t * 9 + b.f) % 2]!;
      f.forEach((r, y) => { for (let x = 0; x < 5; x++) if (r[x] === 'x') pixel(g, b.x + x - 2, b.y + y - 1, arancio); });
    }
  };

  // --- Il nome: alla partenza perde la barra e scende al suo posto nella home
  type Volo = { dx: number; dy: number; s: number } | null;
  let voloNome: Volo = null, sparisce = false;
  const staccaNome = () => {
    const r = nome.getBoundingClientRect(), ch = r.width / TESTO.length, base = parseFloat(getComputedStyle(nome).fontSize);
    nome.textContent = TESTO.replace('/', '');
    nome.classList.add('in-volo');
    Object.assign(nome.style, { left: `${r.left + ch}px`, top: `${r.top}px`, transform: 'none', transformOrigin: '0 0' });
    const h1 = document.querySelector<HTMLElement>('.about > h1');
    if (!h1) { sparisce = true; return; }
    const intervallo = document.createRange();
    intervallo.selectNodeContents(h1);
    const d = intervallo.getBoundingClientRect(), fs = parseFloat(getComputedStyle(h1).fontSize);
    // Se nella home il nome va su due righe, non può scendere intero: sfuma
    if (d.height > fs * 1.6) { sparisce = true; return; }
    const lh = parseFloat(getComputedStyle(h1).lineHeight) || fs * 1.1;
    voloNome = { dx: d.left - (r.left + ch), dy: d.top + (lh - fs) / 2 - r.top, s: fs / base };
  };

  // --- Il tempo: si può saltare, con un clic o un tasto
  let t = 0, prima = 0, viaData = false, finito = false, ferma = 0;
  const parametro = new URLSearchParams(location.search).get('intro');
  if (parametro && !Number.isNaN(Number(parametro))) ferma = Number(parametro);
  const parti = () => { if (viaData) return; viaData = true; radice.dataset.intro = 'via'; el.classList.add('in-volo'); nome.textContent = TESTO; staccaNome(); };
  const chiudi = () => { if (finito) return; finito = true; parti(); delete radice.dataset.intro; delete radice.dataset.stormo; el.remove(); ['pointerdown', 'keydown', 'wheel'].forEach(e => removeEventListener(e, salta)); };
  const salta = () => { if (t < T.via) { t = T.via; for (const b of piccoli) if (b.t0 > t) b.t0 = t; parti(); } else chiudi(); };
  const aggiorna = (ora: number, dt: number) => {
    if (!viaData) {
      const scritte = Math.floor(liscio((ora - T.nome) / 0.6) * TESTO.length);
      if (nome.textContent !== TESTO.slice(0, scritte)) nome.textContent = TESTO.slice(0, scritte);
    } else {
      const z = liscio((ora - T.via - 0.15) / (T.durata - 0.25));
      if (voloNome) nome.style.transform = `translate(${voloNome.dx * z}px, ${voloNome.dy * z}px) scale(${1 + (voloNome.s - 1) * z})`;
      else if (sparisce) nome.style.opacity = String(1 - z);
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
