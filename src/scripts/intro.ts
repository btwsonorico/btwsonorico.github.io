// Intro della home, una volta per sessione: un nido a pixel su un ramo, poi una vallata fantasy che cresce dietro, e il nome al centro.
// Le uova si schiudono e gli uccelli si alzano. Nel passaggio alla home gli uccelli non escono mai dallo schermo: si raccolgono dove
// vola lo stormo 3D e diventano lui. Il paesaggio si scioglie a pixel dal nido verso sinistra, e il nome scende al suo posto nella home.
// Tutto è disegnato a mano su una griglia bassa, con un solo canvas: nessun file da scaricare.

const T = { ramo: 0, nido: 0.3, uova: 0.7, madre: 1, zoom: 1.7, valle: 1.8, nome: 2.5, schiusa: 3.1, stormo: 3.3, parte: 4.4, via: 5, durata: 1.6 };

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

// Chiome: dal più scuro al più chiaro. Smeraldo, oro, glicine e, per gli abeti, un verde azzurro
const CHIOME = { smeraldo: ['#0c3029', '#125641', '#1f8a58', '#58cf83', '#b6f5a4'], oro: ['#4a2f12', '#8a5a18', '#d0902a', '#f4c04a', '#ffe99a'], glicine: ['#331c4a', '#68337f', '#b05cb0', '#ea93d2', '#ffd3ee'], abete: ['#0b2736', '#124a58', '#1c7d88', '#4fc6bd', '#b4f2dc'] };
const PALETTE = {
  dark: { filo: '#dfe9ff', filo2: '#8fb8ff', scintilla: ['#b6ff6a', '#ffe66a', '#7dffd8', '#ff9ae0'], cielo: ['#0a0b0d', '#0d1420', '#132033', '#1f3147', '#3a4560'], foschia: '#1a2c40', luna: '#f0ecd2', luna2: '#b8b48f', stella: '#cfd8ea', monti: ['#17263a', '#223650', '#30496a'], neve: '#a9bdd6', suolo: '#0c2a20', suolo2: '#123a29', erba: ['#14503a', '#1f7d4e', '#49c077'], fiume: '#2c6d9c', fiume2: '#7cc4ff', lucciola: '#e8ff9a', tronco: ['#20150f', '#3d2a1c', '#5f452d'],
    legno: ['#3d2a1a', '#5c3f25', '#7c5a36', '#a07a4c'], interno: '#1c130b', uovo: '#d8e6ea', uovo2: '#a9c4cc', macchia: '#6e8a93', o: '#8a3f14', O: '#ffa45e', L: '#ffe1bd', d: '#d97a32', y: '#ffd24a', k: '#14100c', funghi: ['#7a2f6d', '#e36fb4', '#ffd3ee'] },
  light: { filo: '#2f4a3a', filo2: '#6a8f6a', scintilla: ['#3f9a1e', '#c98a00', '#0f9a86', '#c43f94'], cielo: ['#eee8dc', '#eee8dc', '#f1e3d3', '#f4d9c4', '#f6cdb4'], foschia: '#dfe0d2', luna: '#fffbe8', luna2: '#e6dfbf', stella: '#eee8dc', monti: ['#b9c2c8', '#a6b3bd', '#8fa1ae'], neve: '#fbf8ef', suolo: '#9dbb86', suolo2: '#8cae78', erba: ['#3f8a58', '#2f7a4c', '#74b083'], fiume: '#6aa6c8', fiume2: '#d7eef7', lucciola: '#c7a312', tronco: ['#3e2c1c', '#5f452c', '#86653f'],
    legno: ['#4a3320', '#6b4c2e', '#8c6a42', '#b08c5c'], interno: '#3b2a1a', uovo: '#fbf8ef', uovo2: '#d3dcd2', macchia: '#7d8d84', o: '#6e2c00', O: '#c8601a', L: '#f6c693', d: '#983d00', y: '#d99a12', k: '#14100c', funghi: ['#7a2f6d', '#c64f9a', '#f7b4dc'] },
};

type P2 = readonly [number, number];
// Una linea morbida che passa per i punti: la base di tutto ciò che è sinuoso
const curva = (p: readonly P2[], s: number): P2 => {
  const n = p.length - 1, q = Math.min(n - 1e-4, Math.max(0, s) * n), i = Math.floor(q), t = q - i;
  const a = p[Math.max(0, i - 1)]!, b = p[i]!, c = p[i + 1]!, d = p[Math.min(n, i + 2)]!, f = (u: number, v: number, w: number, z: number) => 0.5 * (2 * v + (w - u) * t + (2 * u - 5 * v + 4 * w - z) * t * t + (3 * v - u - 3 * w + z) * t * t * t);
  return [f(a[0], b[0], c[0], d[0]), f(a[1], b[1], c[1], d[1])];
};
const pixel = (c: Ctx, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, 1, 1); };
const disco = (c: Ctx, x: number, y: number, r: number, col: string) => {
  c.fillStyle = col;
  const R = Math.ceil(r);
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) if (i * i + j * j <= r * r + 0.3) c.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
};
const nastro = (c: Ctx, p: readonly P2[], raggio: (s: number) => number, col: string | ((s: number) => string), passi = 70) => {
  for (let i = 0; i <= passi; i++) { const s = i / passi, [x, y] = curva(p, s); disco(c, x, y, raggio(s), typeof col === 'string' ? col : col(s)); }
};

export function monta(el: HTMLElement) {
  const radice = document.documentElement, P = PALETTE[radice.dataset.theme === 'light' ? 'light' : 'dark'], chiaro = radice.dataset.theme === 'light';
  const fondo = getComputedStyle(radice).getPropertyValue('--bg').trim() || '#0a0b0d';
  const cv = el.querySelector('canvas')!, nome = el.querySelector<HTMLElement>('.intro-nome')!, TESTO = nome.textContent ?? '';
  const px = Math.max(2, Math.round(Math.min(innerWidth / 300, innerHeight / 180))), W = Math.ceil(innerWidth / px), H = Math.ceil(innerHeight / px);
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingEnabled = false;
  const caso = semeCaso(7);
  nome.textContent = '';

  // --- Il nido: dietro (interno scuro) e davanti (bordo intrecciato). Le uova e la madre stanno in mezzo
  const NW = 46, NH = 24, CX = 23, CY = 7;
  const dietro = tela(NW, NH), davanti = tela(NW, NH), dg = dietro.getContext('2d')!, fg = davanti.getContext('2d')!;
  const linea = (c: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, dentro?: (x: number, y: number) => boolean) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n; if (!dentro || dentro(x, y)) pixel(c, x, y, col); }
  };
  const inCoppa = (x: number, y: number) => { const u = (x - CX) / 22, v = (y - CY) / (y < CY ? 4.5 : 14); return u * u + v * v <= 1; };
  const inBocca = (x: number, y: number) => { const u = (x - CX) / 17, v = (y - CY + 1) / 3.6; return u * u + v * v <= 1; };
  for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) {
    if (inCoppa(x, y)) pixel(dg, x, y, P.legno[0]!);
    if (inBocca(x, y)) pixel(dg, x, y, P.interno);
    if (inCoppa(x, y) && !(inBocca(x, y) && y < CY + 3)) pixel(fg, x, y, P.legno[y > CY + 9 ? 0 : 1]!);
  }
  const fuori = (x: number, y: number) => inCoppa(x, y) && !(inBocca(x, y) && y < CY + 3);
  for (let i = 0; i < 230; i++) {
    const x = caso() * NW, y = CY - 3 + caso() * 19, a = (caso() - 0.5) * 1.3, l = 3 + caso() * 6, q = (y - CY) / 15, c = P.legno[Math.max(0, Math.min(3, Math.floor(3.4 - q * 3 + (caso() - 0.5) * 1.6)))]!;
    linea(fg, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, c, fuori);
  }
  for (const [x0, y0, x1, y1] of [[2, 8, -1, 5], [5, 13, 1, 15], [43, 7, 46, 4], [40, 14, 45, 16], [15, 20, 12, 23], [30, 21, 33, 23]] as const) linea(fg, x0, y0, x1, y1, P.legno[2]!);

  // --- Le uova
  const uovo = tela(9, 11), ug = uovo.getContext('2d')!;
  for (let y = 0; y < 11; y++) for (let x = 0; x < 9; x++) {
    const u = (x - 4) / 4.5, v = (y - 6) / (y < 6 ? 6.4 : 5.2);
    if (u * u + v * v <= 1) pixel(ug, x, y, x > 5 || y > 8 ? P.uovo2 : P.uovo);
  }
  for (const [x, y] of [[3, 3], [5, 5], [2, 6], [6, 7], [4, 8], [5, 2]] as const) pixel(ug, x, y, P.macchia);
  const POSTI = [{ x: 4, y: -3 }, { x: 12, y: -4 }, { x: 20, y: -3 }];
  const pulcino = tela(6, 4), pg = pulcino.getContext('2d')!;
  ['..oo..', '.oOOo.', 'yOkOOo', '.oOOOo'].forEach((r, y) => { for (let x = 0; x < 6; x++) { const col = ({ o: P.o, O: P.O, y: P.y, k: P.k } as Record<string, string>)[r[x]!]; if (col) pixel(pg, x, y, col); } });

  // --- La madre: collo a S, corpo affusolato, ciuffo e coda lunga a tre nastri. Ogni parte è una linea morbida con uno spessore
  const SW = 52, SH = 36;
  const seduta = (o: number) => {
    const c = tela(SW, SH), q = c.getContext('2d')!, bob = Math.sin(o) * 0.8, onda = Math.sin(o) * 1.4;
    const corpo: P2[] = [[9, 7 + bob], [13, 10 + bob * 0.8], [11, 15 + bob * 0.4], [15, 21], [23, 24], [30, 23], [35, 22]];
    const code: P2[][] = [
      [[33, 22], [39, 20 + onda * 0.4], [44, 23 - onda * 0.5], [51, 19 + onda]],
      [[33, 23], [39, 25 + onda * 0.3], [45, 26 - onda * 0.5], [50, 30 + onda]],
      [[33, 22], [38, 16 + onda * 0.4], [43, 16 - onda * 0.5], [48, 11 + onda]],
    ];
    const rc = (s: number) => 1 - s * 0.7, rb = (s: number) => [1.5, 1.7, 2, 4, 5, 3.4, 1.4][Math.min(6, Math.floor(s * 7))]! * (1 - (s * 7) % 1 * 0.08);
    for (const l of code) nastro(q, l, s => rc(s) + 0.9, P.o);
    for (const [i, l] of code.entries()) nastro(q, l, rc, s => (s > 0.78 ? P.y : i === 1 ? P.d : P.O));
    nastro(q, corpo, s => rb(s) + 1, P.o);
    nastro(q, corpo, rb, P.O);
    // Petto e pancia più chiari, sul lato davanti del collo
    nastro(q, corpo.slice(1, 5).map(([x, y]) => [x - 1, y + 1.4] as P2), s => 0.7 + s * 2.6, P.L);
    // Ciuffo sinuoso, testa, becco sottile
    nastro(q, [[9, 4 + bob], [12, 1 + bob], [16, 1 + bob], [19, 3 + bob]], s => 0.8 - s * 0.5, P.d);
    disco(q, 9, 6 + bob, 3.3, P.o); disco(q, 9, 6 + bob, 2.4, P.O);
    linea(q, 6, 6 + bob, 2, 7 + bob, P.y); linea(q, 6, 7 + bob, 4, 7 + bob, P.y);
    pixel(q, 8, 5 + bob, P.k);
    // Ala chiusa: una goccia lunga con le penne
    const ala: P2[] = [[18, 17], [24, 18], [31, 19], [38, 18]];
    nastro(q, ala, s => (3.3 - s * 3) + 0.8, P.o);
    nastro(q, ala, s => 3.3 - s * 3, s => (s > 0.55 ? P.d : P.O));
    for (let i = 0; i < 4; i++) { const [x, y] = curva(ala, 0.25 + i * 0.17); linea(q, x, y - 1, x + 2, y + 2 - i * 0.3, P.o); }
    return c;
  };
  const sedute = [0, 1, 2, 3, 4, 5].map(i => seduta((i / 6) * Math.PI * 2));

  // In volo: il corpo ondeggia, le ali si piegano e la coda segue l'onda
  const FW = 62, FH = 44;
  const volo = (o: number) => {
    const c = tela(FW, FH), q = c.getContext('2d')!, cy = 22, s0 = Math.sin(o), s1 = Math.sin(o - 0.9), s2 = Math.sin(o - 1.8), s3 = Math.sin(o - 2.7);
    const corpo: P2[] = [[6, cy + s0 * 1.2], [12, cy - 1 + s1 * 0.8], [20, cy + s1 * 0.6], [29, cy + s2 * 0.9], [35, cy + s3 * 1.4]];
    const rb = (s: number) => { const v = [1.4, 1.7, 2.6, 2.1, 0.9]; const k = Math.min(3.99, s * 4), i = Math.floor(k); return v[i]! + (v[i + 1]! - v[i]!) * (k - i); };
    for (const [i, off] of [-3, 0, 3].entries()) {
      const l: P2[] = [[34, cy + s3], [42, cy + off * 0.7 + s3 * 3], [51, cy + off * 1.4 - s3 * 3], [61, cy + off * 2 + s2 * 3]];
      nastro(q, l, s => 1.8 - s * 1.4, P.o);
      nastro(q, l, s => 1 - s * 0.75, s => (s > 0.8 ? P.y : i === 1 ? P.O : P.d));
    }
    // Le ali: una curva che sale o scende a partire dalla spalla, con la punta che arriva dopo la spalla, come una frusta lenta
    // Le ali sono lunghe mezzelune: la battuta passa in fretta per il piano del corpo, così l'ala non si appiattisce mai sopra di lui
    const battuta = Math.sign(s0) * Math.pow(Math.abs(s0), 0.5);
    const ali = (f: number, dx: number, col: string) => {
      const a = battuta * f, b = Math.sin(o - 0.7) * f * 0.35;
      const bordo: P2[] = [[17 + dx, cy - 1], [14 + dx, cy - 1 - a * 9], [16 + dx, cy - 1 - a * 15 - b * 3], [25 + dx, cy - 1 - a * 19 - b * 5]];
      for (let k = 1; k < 7; k++) {
        const [x, y] = curva(bordo, k * 0.16), lun = 3 + k * 1.1, verso = a > 0 ? 1 : -1;
        nastro(q, [[x, y], [x + lun * 0.7, y + verso * 0.6], [x + lun, y + verso * lun * 0.42]], u => 0.9 - u * 0.5, P.o, 14);
        if (k % 2) linea(q, x, y, x + lun - 1, y + verso * lun * 0.35, col);
      }
      nastro(q, bordo, u => 2.3 - u * 1.8, P.o, 50);
      nastro(q, bordo, u => 1.5 - u * 1.25, col, 50);
    };
    ali(0.8, 4, P.d);
    nastro(q, corpo, s => rb(s) + 0.9, P.o);
    nastro(q, corpo, rb, P.O);
    nastro(q, corpo.slice(0, 4).map(([x, y]) => [x, y + 1.3] as P2), s => 0.5 + s * 1.1, P.L);
    disco(q, 6, cy + s0 * 1.2, 2.9, P.o); disco(q, 6, cy + s0 * 1.2, 2.1, P.O);
    linea(q, 3, cy + s0 * 1.2, 0, cy + 1 + s0 * 1.2, P.y);
    pixel(q, 5, cy - 1 + s0 * 1.2, P.k);
    nastro(q, [[6, cy - 2 + s0], [10, cy - 5 + s1], [15, cy - 5 + s2]], s => 0.8 - s * 0.5, P.d, 18);
    ali(1, 0, P.O);
    return c;
  };
  const voli = Array.from({ length: 8 }, (_, i) => volo((i / 8) * Math.PI * 2));

  // --- Il ramo: entra dal bordo destro e regge il nido, con foglie e un rametto fiorito
  const RW = 260, RH = 60, ramo = tela(RW, RH), rg = ramo.getContext('2d')!;
  const yRamo = (x: number) => 34 + Math.sin(x * 0.045) * 2 + x * 0.05;
  for (let x = 0; x < RW; x++) {
    const y = yRamo(x), s = 2 + Math.min(3, x / 35);
    for (let k = -s; k <= s; k++) pixel(rg, x, y + k, P.legno[k < -s + 1 ? 3 : k > s - 1.5 ? 0 : caso() < 0.2 ? 2 : 1]!);
  }
  const foglia = (c: Ctx, x: number, y: number, tinte: string[]) => { const col = tinte[Math.floor(caso() * tinte.length)]!; for (const [a, b] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [1, -1], [2, -1], [3, -1]] as const) pixel(c, x + a, y + b, col); };
  for (let i = 0; i < 16; i++) {
    const x = 26 + i * 15 + caso() * 8, y = yRamo(x), su = caso() < 0.6 ? -1 : 1, e = x + (caso() - 0.3) * 14, f = y + su * (9 + caso() * 12);
    linea(rg, x, y, e, f, P.legno[1]!);
    const tinte = CHIOME.smeraldo.slice(2, 4);
    for (let k = 0; k < 6; k++) foglia(rg, e + (caso() - 0.5) * 9, f + (caso() - 0.5) * 7, tinte);
    if (i % 4 === 1) for (let k = 0; k < 4; k++) pixel(rg, e + (caso() - 0.5) * 8, f + (caso() - 0.5) * 6, CHIOME.glicine[4]!);
  }

  // --- Gli alberi. Ogni chioma è fatta di tanti ciuffi di foglie, con la luce da sinistra in alto e foglie sparse sul bordo
  const scala = Math.min(1.25, Math.min(W, H) / 170);
  const fuso = (f: number) => (c: string) => mescola(c, P.foschia, f);
  const tronco = (q: Ctx, x: number, y0: number, y1: number, l: number, piega: number, f: number) => {
    const col = P.tronco.map(fuso(f));
    const asse: P2[] = [[x, y0], [x + piega * 0.4, y0 + (y1 - y0) * 0.4], [x + piega, y1]];
    nastro(q, asse, s => l * (1.25 - s * 0.7), s => col[0]!, 40);
    nastro(q, asse.map(([a, b]) => [a - l * 0.25, b] as P2), s => Math.max(0.5, l * (0.7 - s * 0.45)), col[1]!, 30);
    // Le radici si allargano nel terreno
    for (const v of [-1, 1]) nastro(q, [[x, y0 - 2], [x + v * l * 1.2, y0 - 1], [x + v * l * 2.4, y0]], s => Math.max(0.5, l * 0.45 * (1 - s)), col[0]!, 12);
  };
  const ciuffo = (q: Ctx, cx: number, cy: number, r: number, C: string[], ca: () => number) => {
    // Bordo irregolare: ogni cella decide da sola, così il contorno sembra fatto di foglie
    const R = Math.ceil(r + 2);
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
      const d = Math.hypot(i, j) / r, n = ca();
      if (d > 1 + n * 0.35) continue;
      if (d > 0.82 && n < 0.45) continue;
      const luce = (-i - j * 1.2) / (r * 1.6) + (n - 0.5) * 0.75, k = luce > 0.62 ? 3 : luce > 0.1 ? 2 : luce > -0.45 ? 1 : 0;
      q.fillStyle = C[k]!;
      q.fillRect(Math.round(cx) + i, Math.round(cy) + j, 1, 1);
    }
    // Le foglie più chiare, a coppie
    for (let k = 0; k < r * 1.1; k++) { const a = ca() * 6.28, b = ca() * r, x = cx + Math.cos(a) * b - r * 0.25, y = cy + Math.sin(a) * b - r * 0.25; q.fillStyle = C[4]!; q.fillRect(Math.round(x), Math.round(y), 1, 1); q.fillStyle = C[3]!; q.fillRect(Math.round(x) + 1, Math.round(y), 1, 1); }
  };
  type Spec = { tipo: string; h: number; f: number; v: number };
  const crea = ({ tipo, h, f, v }: Spec) => {
    const ca = semeCaso(h * 131 + v * 977 + tipo.charCodeAt(0));
    const l = Math.round(h * (tipo === 'abete' ? 0.78 : 1.15)) + 8, c = tela(l, h + 3), q = c.getContext('2d')!, mx = l / 2;
    const tinta = (t: string[]) => t.map(fuso(f));
    if (tipo === 'abete') {
      const C = tinta(CHIOME.abete), piani = Math.max(4, Math.round(h / 4.2));
      tronco(q, mx, h + 1, h * 0.25, Math.max(0.7, h * 0.03), 0, f);
      // Rami a balze che ricadono, dalla base alla punta
      for (let p = piani - 1; p >= 0; p--) {
        const u = p / (piani - 1), y = h * 0.04 + u * h * 0.8, larg = (0.06 + u * 0.92) * (l * 0.46);
        for (let i = -Math.ceil(larg); i <= larg; i++) {
          const s = Math.abs(i) / Math.max(1, larg), caduta = Math.round(s * s * (h / piani) * 1.4) , spessore = Math.round((h / piani) * (1.15 - s * 0.55)) + Math.round(ca() * 2);
          for (let j = 0; j < spessore; j++) {
            const n = ca(), luce = (-i / Math.max(1, larg)) * 0.75 + (1 - j / Math.max(1, spessore)) * 0.55 + (n - 0.5) * 0.5, k = luce > 0.82 ? 3 : luce > 0.35 ? 2 : luce > -0.05 ? 1 : 0;
            q.fillStyle = C[k]!;
            q.fillRect(Math.round(mx + i), Math.round(y + caduta + j), 1, 1);
          }
        }
      }
      for (let k = 0; k < h * 0.6; k++) { const u = ca(), w = (0.06 + u * 0.9) * (l * 0.4); q.fillStyle = C[4]!; q.fillRect(Math.round(mx - ca() * w), Math.round(h * 0.06 + u * h * 0.84), 1, 1); }
      return c;
    }
    const C = tinta(tipo === 'oro' ? CHIOME.oro : tipo === 'glicine' ? CHIOME.glicine : CHIOME.smeraldo);
    const piega = (ca() - 0.5) * h * 0.22, alto = h * (tipo === 'salice' ? 0.42 : 0.5);
    tronco(q, mx, h + 1, alto, Math.max(0.8, h * 0.055), piega, f);
    // Due rami che escono dal tronco, curvi
    for (const s of [-1, 1]) nastro(q, [[mx + piega * 0.7, h * 0.72], [mx + piega + s * h * 0.14, h * 0.56], [mx + piega + s * h * 0.3, h * 0.42]], u => Math.max(0.5, h * 0.03 * (1 - u)), tinta(P.tronco)[0]!, 16);
    const cx = mx + piega, cy = h * (tipo === 'salice' ? 0.27 : 0.32), rr = h * 0.33;
    if (tipo === 'salice') {
      // La chioma ricade in lunghi fili di foglie
      ciuffo(q, cx, cy, rr, C, ca);
      for (let k = 0; k < rr * 3.2; k++) {
        const a = -rr * 1.1 + ca() * rr * 2.2, x0 = cx + a, y0 = cy + Math.sqrt(Math.max(0, rr * rr - a * a)) * 0.4, lun = h * (0.32 + ca() * 0.32), b = ca() * 6;
        for (let y = 0; y < lun; y++) { if (ca() < 0.18) continue; q.fillStyle = C[1 + ((y + k) % 3)]!; q.fillRect(Math.round(x0 + Math.sin(y * 0.22 + b) * 1.2), Math.round(y0 + y), 1, 1); }
      }
      return c;
    }
    // Tanti ciuffi: prima quelli dietro, più scuri, poi quelli davanti
    const n = Math.max(5, Math.round(h / 2.6));
    const scuri = [C[0]!, C[0]!, C[1]!, C[1]!, C[2]!];
    for (let k = 0; k < n; k++) { const a = ca() * 6.28, b = Math.sqrt(ca()) * rr; ciuffo(q, cx + Math.cos(a) * b * 1.15, cy + Math.sin(a) * b * 0.8, rr * (0.34 + ca() * 0.2), scuri, ca); }
    for (let k = 0; k < n; k++) { const a = ca() * 6.28, b = Math.sqrt(ca()) * rr * 0.85; ciuffo(q, cx + Math.cos(a) * b * 1.1 - rr * 0.08, cy + Math.sin(a) * b * 0.72 - rr * 0.1, rr * (0.26 + ca() * 0.18), C, ca); }
    return c;
  };

  // --- La vallata: cielo a bande, luna, monti a guglie che salgono ai lati e lasciano libero il centro, dove sta il nome
  const orizzonte = Math.round(H * 0.67), terra = tela(W, H), tg = terra.getContext('2d')!, cielo = tela(W, H), cg = cielo.getContext('2d')!;
  const u = (x: number) => (x - W / 2) / (W / 2);
  const nC = P.cielo.length - 1;
  for (let y = 0; y < orizzonte + 4; y++) for (let x = 0; x < W; x++) {
    const v = (y / orizzonte) * nC, i = Math.min(nC - 1, Math.floor(v)), f = v - i;
    if (f > bayer(x, y)) pixel(cg, x, y, P.cielo[i + 1]!); else if (i > 0) pixel(cg, x, y, P.cielo[i]!);
  }
  const stelle = chiaro ? [] : Array.from({ length: 70 }, () => ({ x: Math.floor(caso() * W), y: Math.floor(caso() * orizzonte * 0.75), f: caso() * 6, v: 1 + caso() * 2 }));
  const lx = Math.round(W * 0.2), ly = Math.round(H * 0.2), lr = Math.max(7, Math.round(Math.min(W, H) * 0.058));
  for (let j = -lr * 2; j <= lr * 2; j++) for (let i = -lr * 2; i <= lr * 2; i++) {
    const d = Math.hypot(i, j) / lr;
    if (d <= 1) pixel(cg, lx + i, ly + j, Math.hypot(i - lr * 0.3, j + lr * 0.2) < lr * 0.28 || Math.hypot(i + lr * 0.35, j - lr * 0.3) < lr * 0.2 ? P.luna2 : P.luna);
    else if (d < 1.9 && (d - 1) / 0.9 < bayer(lx + i, ly + j) * 0.6) pixel(cg, lx + i, ly + j, mescola(P.cielo[2]!, P.luna, 0.22));
  }
  const dente = (x: number, a: number, b: number) => Math.abs(Math.sin(x * a) + Math.sin(x * b + 1.4) * 0.5);
  const cresta2 = (x: number) => orizzonte - 3 - Math.pow(Math.abs(u(x)), 1.15) * H * 0.42 - dente(x, 0.07, 0.19) * H * 0.075 * (0.3 + Math.abs(u(x)));
  const cresta = (x: number) => orizzonte - 1 - Math.pow(Math.abs(u(x)), 1.4) * H * 0.27 - dente(x + 37, 0.11, 0.27) * H * 0.05 * (0.25 + Math.abs(u(x)));
  const onda = (x: number, a: number, b: number) => Math.sin(x * a) * 0.6 + Math.sin(x * b + 2) * 0.4;
  const collina = (x: number) => orizzonte + 3 - Math.pow(Math.abs(u(x)), 1.5) * H * 0.2 - onda(x, 0.05, 0.11) * 2;
  const fiumeX = (y: number) => W / 2 + Math.sin(y * 0.08) * (y - orizzonte) * 0.28, fiumeL = (y: number) => 0.5 + (y - orizzonte) * 0.14;
  const dalle = (x: number, y: number, c: number, base: readonly string[], f: number, neve: boolean) => {
    const pende = (cresta2(x + 1) - cresta2(x - 1)) + (x % 5 === 0 ? 1 : 0), luce = pende + (bayer(x, y) - 0.5) * 2.4, col = luce > 0.5 ? base[2]! : luce > -0.8 ? base[1]! : base[0]!;
    pixel(tg, x, y, neve && y < c + 1 + bayer(x, y) * 3 ? mescola(P.neve, col, 0.35) : mescola(col, P.foschia, f));
  };
  for (let x = 0; x < W; x++) {
    const c2 = Math.round(cresta2(x)), c1 = Math.round(cresta(x)), v = Math.round(collina(x));
    for (let y = c2; y < c1; y++) dalle(x, y, c2, P.monti, 0.45, Math.abs(u(x)) > 0.6);
    for (let y = c1; y < H; y++) {
      if (y < v) { dalle(x, y, c1, P.monti, 0.08, false); continue; }
      const n = caso();
      pixel(tg, x, y, n < 0.16 ? P.suolo2 : P.suolo);
      if (y >= orizzonte + 1 && Math.abs(x - fiumeX(y)) < fiumeL(y)) pixel(tg, x, y, (x * 3 + y * 7) % 11 === 0 ? P.fiume2 : P.fiume);
    }
  }
  // Una cascata che scende dal monte a destra
  const cx = Math.round(W * 0.72), c0 = Math.round(cresta(cx)) + 4, c1 = Math.round(collina(cx));
  for (let y = c0; y < c1; y++) for (let k = -1; k <= 1; k++) pixel(tg, cx + k + Math.round(Math.sin(y * 0.2) * 0.6), y, (y + k * 3) % 4 === 0 ? P.fiume : P.fiume2);

  // Una fitta linea di alberi lontani, a ciuffi, dove finiscono i monti
  const lontani = semeCaso(31), TONI_L = CHIOME.smeraldo.map(fuso(0.55));
  for (let x = 0; x < W; x += 2) {
    const y0 = collina(x) + 1, b = 2 + lontani() * 4;
    for (let k = 0; k < 3; k++) { const q = lontani(); disco(tg, x, y0 - b * q, b * 0.7, TONI_L[q > 0.66 ? 2 : q > 0.3 ? 1 : 0]!); }
  }

  // --- Dove crescono gli alberi: fitti ai lati e sui fianchi, radi lungo il fiume
  const sprite = new Map<string, Tela>();
  const tempoColonna = (x: number) => T.valle + ((W * 0.8 - x) / W) * 0.8 + (Math.sin(x * 12.9) * 0.5 + 0.5) * 0.12;
  const alberi: { x: number; y: number; c: Tela; t0: number }[] = [];
  const TIPI = ['smeraldo', 'smeraldo', 'abete', 'abete', 'abete', 'salice', 'oro', 'glicine'];
  for (let i = 0; i < 2600 && alberi.length < 300; i++) {
    const x = caso() * W, y0 = collina(x), y = y0 + caso() * (H - y0), d = (y - y0) / Math.max(1, H - y0);
    if (caso() > 0.1 + Math.abs(u(x)) * 1.25 + d * 0.22) continue;
    if (Math.abs(x - fiumeX(y)) < fiumeL(y) + 2 + d * 8) continue;
    const gigante = caso() < 0.05 && Math.abs(u(x)) > 0.35;
    const h = Math.round((Math.max(9, 9 + Math.pow(d, 1.2) * 44) * (0.8 + caso() * 0.45) * (gigante ? 1.5 : 1) * scala) / 3) * 3;
    const f = Math.round(Math.pow(1 - d, 2) * 3) / 3 * 0.6, tipo = TIPI[Math.floor(caso() * TIPI.length)]!, v = Math.floor(caso() * 3), k = `${tipo}${h}${f}${v}`;
    if (!sprite.has(k)) sprite.set(k, crea({ tipo, h, f, v }));
    alberi.push({ x: Math.round(x), y: Math.round(y), c: sprite.get(k)!, t0: tempoColonna(x) + 0.1 + caso() * 0.35 });
  }
  alberi.sort((a, b) => a.y - b.y);

  // Primo piano: erba, felci, fiori e funghi che brillano, lungo il fondo
  const primo = tela(W, H), pv = primo.getContext('2d')!;
  for (let x = 0; x < W; x++) {
    if (Math.abs(x - fiumeX(H - 1)) < fiumeL(H - 1) + 1) continue;
    for (let k = 0; k < 2; k++) {
      const hh = 3 + caso() * caso() * 13, b = H - caso() * 6, c = P.erba[Math.floor(caso() * 3)]!;
      linea(pv, x, b, x + (caso() - 0.5) * 4, b - hh, c);
    }
  }
  for (let i = 0; i < 26; i++) {
    const x = caso() * W, b = H - 2 - caso() * H * 0.1;
    if (Math.abs(x - fiumeX(b)) < fiumeL(b) + 3) continue;
    if (i % 3 === 0) {
      // Fungo: gambo chiaro e cappello a cupola, con i puntini
      for (let k = 0; k < 4; k++) pixel(pv, x, b - k, P.uovo2);
      const r = 2 + caso() * 2.5;
      for (let j = 0; j <= r; j++) for (let a = -r; a <= r; a++) if (a * a + j * j <= r * r) pixel(pv, x + a, b - 4 - j, j > r * 0.5 ? P.funghi[1]! : P.funghi[0]!);
      pixel(pv, x - 1, b - 5 - r * 0.6, P.funghi[2]!); pixel(pv, x + 1, b - 4 - r * 0.3, P.funghi[2]!);
    } else {
      // Felce: una curva con le foglioline ai lati
      const v = caso() < 0.5 ? -1 : 1, l = 8 + caso() * 8, f: P2[] = [[x, b], [x + v * l * 0.3, b - l * 0.7], [x + v * l, b - l * 0.8]];
      for (let k = 0; k <= 12; k++) { const [a, y] = curva(f, k / 12), s = (1 - k / 12) * 3 + 1; pixel(pv, a, y, P.erba[1]!); pixel(pv, a - s * 0.5, y - s, P.erba[2]!); pixel(pv, a + s * 0.5, y + s * 0.8, P.erba[0]!); }
    }
  }
  // Rampicanti dall'angolo in alto a sinistra, che incorniciano la scena
  const rampi = tela(W, H), rv = rampi.getContext('2d')!;
  nastro(rv, [[-4, 16], [W * 0.09, 8], [W * 0.2, 2], [W * 0.3, -3]], s => 3.6 - s * 2.8, P.tronco[1]!, 90);
  for (let k = 0; k < 30; k++) {
    const s = caso() * 0.92, [a, b] = curva([[-4, 16], [W * 0.09, 8], [W * 0.2, 2], [W * 0.3, -3]], s), lun = 8 + caso() * H * 0.13, fase = caso() * 6;
    for (let y = 0; y < lun; y++) {
      const xx = a + Math.sin(y * 0.2 + fase) * 1.5;
      pixel(rv, xx, b + y, P.tronco[2]!);
      if (y % 3 === 0) foglia(rv, xx + (y % 2 ? 0 : -3), b + y, CHIOME.smeraldo.slice(1, 4));
    }
    if (k % 3 === 0) for (let j = 0; j < 4; j++) pixel(rv, a + (caso() - 0.5) * 6, b + lun + j * 2, CHIOME.glicine[3]!);
  }

  // --- Vivi: lucciole, foglie che cadono, scintille sul fiume
  const lucciole = Array.from({ length: 34 }, () => ({ x: caso() * W, y: orizzonte - 6 + caso() * (H - orizzonte), f: caso() * 6, v: 0.5 + caso() }));
  const cadenti = Array.from({ length: 24 }, () => ({ x: caso() * W, y: caso() * H, f: caso() * 6, c: (caso() < 0.5 ? CHIOME.oro : CHIOME.glicine)[3]! }));

  // Dove sta il nido alla fine
  const kFine = W >= 380 ? 2 : 1, nx = Math.round(W * (W > H ? 0.77 : 0.58)), ny = Math.round(H * 0.79);
  // --- I viticci: dal nido partono due fili che girano intorno al nome e si riempiono di riccioli, come un ricamo.
  // Ogni pixel ha il momento in cui compare; lungo i fili corrono le luci, e intorno volano scintille e farfalle
  const FILO_INIZIO = T.valle + 0.15, FILO_DURATA = 1.5;
  type Pt = { x: number; y: number; t: number; c: string };
  const fili: Pt[] = [], guide: P2[][] = [];
  const nv = semeCaso(77), ex = W * (W > H ? 0.335 : 0.42), ey = H * (W > H ? 0.27 : 0.17), ec = H * 0.5;
  const aggiungi = (p: readonly P2[], t0: number, durata: number, c: string, passi: number) => {
    for (let i = 0; i <= passi; i++) { const s = i / passi, [x, y] = curva(p, s); fili.push({ x: Math.round(x), y: Math.round(y), t: t0 + s * durata, c }); }
  };
  // Un ricciolo: una spirale che si stringe, con una gemma in punta
  const ricciolo = (x: number, y: number, a0: number, l: number, verso: number, t0: number, c: string) => {
    const pts: P2[] = [];
    let a = a0, xx = x, yy = y, passo = l / 9;
    for (let k = 0; k < 14; k++) { pts.push([xx, yy]); xx += Math.cos(a) * passo; yy += Math.sin(a) * passo; a += verso * (0.22 + k * 0.05); passo *= 0.93; }
    aggiungi(pts, t0, 0.35, c, Math.ceil(l * 1.5));
    for (const [i, j] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]] as const) fili.push({ x: Math.round(xx) + i, y: Math.round(yy) + j, t: t0 + 0.35, c: i || j ? P.filo2 : P.scintilla[Math.floor(nv() * 4)]! });
  };
  const anello = (inizio: number, fine: number, verso: number) => {
    const n = 26, pts: P2[] = [[nx - 4, ny - 6]];
    for (let k = 0; k <= n; k++) {
      const a = inizio + ((fine - inizio) * k) / n, ond = Math.sin(k * 1.3 + verso) * H * 0.018 + Math.sin(k * 0.47) * H * 0.012;
      pts.push([W / 2 + Math.cos(a) * (ex + ond), ec + Math.sin(a) * (ey + ond)]);
    }
    guide.push(pts);
    aggiungi(pts, FILO_INIZIO, FILO_DURATA, P.filo, 620);
    for (let k = 0; k < 74; k++) {
      const s = 0.02 + (k / 74) * 0.96, [x, y] = curva(pts, s), [x2, y2] = curva(pts, s + 0.01), dir = Math.atan2(y2 - y, x2 - x), lato = nv() < 0.5 ? 1 : -1, l = 7 + nv() * nv() * Math.min(W, H) * 0.14, t0 = FILO_INIZIO + s * FILO_DURATA;
      // I riccioli restano fuori dall'ovale del nome: quelli verso l'interno sono corti
      const dentro = Math.hypot((x + Math.cos(dir + lato * 1.2) * 5 - W / 2) / ex, (y + Math.sin(dir + lato * 1.2) * 5 - ec) / ey) < Math.hypot((x - W / 2) / ex, (y - ec) / ey);
      ricciolo(x, y, dir + lato * 1.2, dentro ? l * 0.45 : l, lato, t0, k % 3 ? P.filo : P.filo2);
      // Un rametto secondario, con il suo ricciolo in fondo
      if (k % 3 === 0 && !dentro) {
        const a = dir + lato * 0.8, x3 = x + Math.cos(a) * l, y3 = y + Math.sin(a) * l, ram: P2[] = [[x, y], [x + Math.cos(a + 0.3) * l * 0.5, y + Math.sin(a + 0.3) * l * 0.5], [x3, y3]];
        aggiungi(ram, t0, 0.3, P.filo2, Math.ceil(l * 1.3));
        ricciolo(x3, y3, a - lato, l * 0.6, -lato, t0 + 0.3, P.filo);
      }
    }
  };
  anello(0.55, Math.PI * 1.02, 1);
  anello(0.55 + Math.PI * 2, Math.PI * 1.02, -1);
  fili.sort((a, b) => a.t - b.t);
  const trama = tela(W, H), tv = trama.getContext('2d')!;
  let filiFatti = 0;
  const aggiornaFili = (t: number) => { while (filiFatti < fili.length && fili[filiFatti]!.t <= t) { const q = fili[filiFatti++]!; pixel(tv, q.x, q.y, q.c); } };
  const corrono = Array.from({ length: 46 }, (_, i) => ({ g: i % 2, s: caso(), v: 0.05 + caso() * 0.09, c: P.scintilla[i % 4]! }));
  // Scintille: si posano sui fili e lampeggiano. Sono tante, e cambiano posto da sole
  const scintille = Array.from({ length: 150 }, (_, i) => ({ i: Math.floor(caso() * Math.max(1, fili.length)), f: caso() * 6, v: 2 + caso() * 5, c: P.scintilla[i % 4]!, dx: (caso() - 0.5) * 7, dy: (caso() - 0.5) * 7 }));
  const FARFALLA = [['x..x', 'xxxx', '.xx.', 'x..x'], ['.xx.', '.xx.', '.xx.', '.xx.']];
  const farfalle = Array.from({ length: 7 }, (_, i) => ({ g: i % 2, s: caso(), v: 0.03 + caso() * 0.03, f: caso() * 6, c: P.scintilla[3 - (i % 4)]! }));
  const luci = (t: number) => {
    aggiornaFili(t);
    g.drawImage(trama, 0, 0);
    const vivo = liscio((t - FILO_INIZIO) / FILO_DURATA);
    for (const q of corrono) {
      const s = Math.min(vivo, (q.s + t * q.v) % 1), l = guide[q.g]!;
      for (let k = 0; k < 4; k++) { const [x, y] = curva(l, Math.max(0, s - k * 0.006)); pixel(g, x, y, k ? P.filo2 : q.c); if (!k) { pixel(g, x + 1, y, q.c); pixel(g, x, y + 1, q.c); } }
    }
    for (const q of scintille) {
      const a = fili[q.i];
      if (!a || a.t > t) continue;
      const lampo = Math.sin(t * q.v + q.f);
      if (lampo < 0.15) continue;
      const x = a.x + q.dx * Math.sin(t * 0.7 + q.f), y = a.y + q.dy * Math.cos(t * 0.6 + q.f);
      pixel(g, x, y, q.c);
      if (lampo > 0.8) { pixel(g, x + 1, y, q.c); pixel(g, x - 1, y, q.c); pixel(g, x, y + 1, q.c); pixel(g, x, y - 1, q.c); }
    }
    if (vivo > 0.6) for (const q of farfalle) {
      const [x, y] = curva(guide[q.g]!, (q.s + t * q.v) % 1), f = FARFALLA[Math.floor(t * 8 + q.f) % 2]!;
      const ax = x + Math.sin(t * 1.3 + q.f) * 9, ay = y + Math.cos(t * 1.7 + q.f) * 6;
      f.forEach((r, j) => { for (let i = 0; i < 4; i++) if (r[i] === 'x') pixel(g, ax + i, ay + j, q.c); });
    }
  };

  // --- Lo stormo piccolo: ogni uccello si alza dal nido o da un albero
  const destra = alberi.filter(a => a.x > W * 0.4);
  const piccoli = Array.from({ length: 90 }, (_, i) => {
    const dalNido = i < 12, s = dalNido ? null : destra[Math.floor(caso() * destra.length)];
    return { x: dalNido ? nx : s?.x ?? W, y: dalNido ? ny - 6 : (s ? s.y - s.c.height : H * 0.6), vx: -0.2 - caso() * 0.4, vy: -0.5 - caso() * 0.4, t0: T.schiusa + 0.1 + (dalNido ? i * 0.09 : 0.3 + caso() * 1.2), f: caso() * 6, ox: (caso() - 0.5) * W * 0.26, oy: (caso() - 0.5) * H * 0.16, fine: T.via + 0.5 + caso() * 1.1 };
  });
  // Lo stormo 3D dice dove si trova sullo schermo: i piccoli vanno lì. Prima che lo dica, un punto in alto a destra
  const meta = () => {
    const [a, b] = (radice.dataset.stormo ?? '').split(',').map(Number);
    return a !== undefined && b !== undefined && !Number.isNaN(a) && !Number.isNaN(b) && radice.dataset.stormo ? { x: a / px, y: b / px } : { x: W * 0.62, y: H * 0.24 };
  };

  // --- Il nido sulla scena
  const disegnaNido = (t: number) => {
    const z = liscio((t - T.zoom) / 0.5), k = t < T.zoom ? 3 : t < T.zoom + 0.28 ? 2 : kFine;
    const kk = Math.min(k, Math.max(kFine, Math.floor((W * 0.8) / NW)));
    const ax = W / 2 + (nx - W / 2) * z, ay = H * 0.46 + (ny - H * 0.46) * z, x0 = Math.round(ax - CX * kk), y0 = Math.round(ay - CY * kk);
    const disegna = (c: Tela, x: number, y: number) => g.drawImage(c, x0 + x * kk, y0 + y * kk, c.width * kk, c.height * kk);
    const vis = liscio((t - T.ramo) / 0.5), rx = x0 + (CX - 2) * kk, ry = y0 + (CY + 13 - 34) * kk, lung = Math.ceil(Math.max(0, W - rx) / kk) + 1, parte = Math.min(RW, Math.ceil(lung * vis));
    if (parte > 0) g.drawImage(ramo, Math.max(0, lung - parte), 0, parte, RH, rx + (lung - parte) * kk, ry, parte * kk, RH * kk);
    const nido = liscio((t - T.nido) / 0.45);
    if (nido <= 0) return { x0, y0, kk };
    const righe = Math.ceil(NH * nido), taglia = (c: Tela) => g.drawImage(c, 0, NH - righe, NW, righe, x0, y0 + (NH - righe) * kk, NW * kk, righe * kk);
    taglia(dietro);
    // Coordinate della madre seduta, rispetto al nido
    const sx = 19, sy = -19;
    if (t >= T.madre && t < T.parte) {
      const a = 1 - liscio((t - T.madre) / 0.45);
      if (a > 0) {
        const q = voli[Math.floor(t * 12) % 8]!;
        disegna(q, sx - 3 + Math.round(a * 70), sy - 5 - Math.round(a * 30 - Math.sin(a * 6) * 4));
      } else disegna(sedute[Math.floor(t * 3.2) % 6]!, sx, sy);
    }
    POSTI.forEach((p, i) => {
      const ti = T.uova + i * 0.1;
      if (t < ti) return;
      const sale = Math.round((1 - liscio((t - ti) / 0.18)) * 8), sch = T.schiusa + i * 0.3, trema = t > T.uova + 0.5 && t < sch + 0.05 ? (Math.floor(t * (t > sch - 0.5 ? 18 : 5) + i) % 2 ? 1 : 0) : 0;
      if (t < sch) { disegna(uovo, p.x + trema, p.y + sale); return; }
      if (t < sch + 0.5) disegna(pulcino, p.x + 2, p.y - 1 + Math.round((1 - liscio((t - sch) / 0.15)) * 3));
      g.drawImage(uovo, 0, 5, 9, 6, x0 + p.x * kk, y0 + (p.y + 5) * kk, 9 * kk, 6 * kk);
    });
    taglia(davanti);
    return { x0, y0, kk };
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
    for (const q of lucciole) { q.x += Math.sin(t * q.v + q.f) * 0.25 * dt * 30; q.y += Math.cos(t * q.v * 0.8 + q.f) * 0.15 * dt * 30; }
    for (const q of cadenti) { q.y += dt * 11; q.x += Math.sin(t * 1.6 + q.f) * dt * 10; if (q.y > H) { q.y = -2; q.x = (q.x + 37) % W; } }
  };

  // Il paesaggio si scioglie a pixel, dal nido verso sinistra, dove atterra il nome. Ogni cella ha la sua soglia, con una trama regolare
  let soglie: Float32Array | null = null;
  const prepara = () => {
    soglie = new Float32Array(W * H);
    const mass = Math.hypot(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) soglie[y * W + x] = (Math.hypot(x - nx, (y - ny) * 1.15) / mass) * 0.72 + bayer(x, y) * 0.28;
  };

  // Il paesaggio, che una volta cresciuto non cambia più: si disegna una volta sola
  let fisso: Tela | null = null;
  const paesaggio = (c: Ctx, t: number) => {
    for (let x = 0; x < W; x++) if (t > tempoColonna(x)) c.drawImage(cielo, x, 0, 1, H, x, 0, 1, H);
    for (let x = 0; x < W; x++) {
      const a = liscio((t - tempoColonna(x)) / 0.35);
      if (a > 0) c.drawImage(terra, x, 0, 1, H, x, Math.round((1 - a) * H * 0.55), 1, H);
    }
    for (const a of alberi) {
      const f = liscio((t - a.t0) / 0.3);
      if (f <= 0) continue;
      const h = Math.ceil(a.c.height * f);
      c.drawImage(a.c, 0, 0, a.c.width, h, a.x - (a.c.width >> 1), a.y - h, a.c.width, h);
    }
    // Foschia sul fondovalle, a trama
    const fs = liscio((t - T.valle - 0.9) / 0.5);
    if (fs > 0) { c.fillStyle = P.foschia; for (let y = orizzonte - 5; y < orizzonte + H * 0.1; y++) for (let x = (y & 1); x < W; x += 2) { const q = 1 - Math.abs(y - orizzonte - H * 0.02) / (H * 0.09); if (q * fs * 0.62 > bayer(x + 7, y)) c.fillRect(x, y, 1, 1); } }
    for (let x = 0; x < W; x++) {
      const a = liscio((t - tempoColonna(x) - 0.25) / 0.35);
      if (a > 0) c.drawImage(primo, x, 0, 1, H, x, Math.round((1 - a) * H * 0.2), 1, H);
    }
    const rm = liscio((t - T.valle - 0.3) / 0.8);
    if (rm > 0) c.drawImage(rampi, 0, 0, W, Math.ceil(H * rm), 0, 0, W, Math.ceil(H * rm));
  };
  const FINE_CRESCITA = T.valle + 2.3;

  const disegno = (t: number) => {
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = fondo; g.fillRect(0, 0, W, H);
    if (t >= T.valle) {
      if (t >= FINE_CRESCITA) {
        if (!fisso) { fisso = tela(W, H); const f = fisso.getContext('2d')!; f.imageSmoothingEnabled = false; f.fillStyle = fondo; f.fillRect(0, 0, W, H); paesaggio(f, FINE_CRESCITA + 1); }
        g.drawImage(fisso, 0, 0);
      } else paesaggio(g, t);
      for (const s of stelle) if (Math.sin(t * s.v + s.f) > -0.3) pixel(g, s.x, s.y, P.stella);
      for (const q of cadenti) if (t > T.valle + 1) pixel(g, q.x, q.y, q.c);
      for (const q of lucciole) if (t > T.valle + 1.2 && Math.sin(t * 2.4 * q.v + q.f) > 0.1) { pixel(g, q.x, q.y, P.lucciola); }
      for (let i = 0; i < 12; i++) { const y = orizzonte + 4 + ((i * 37 + Math.floor(t * 9) * 11) % (H - orizzonte - 5)), xx = fiumeX(y) + Math.sin(i * 7 + t) * fiumeL(y) * 0.7; if (t > T.valle + 1.5) pixel(g, xx, y, P.fiume2); }
    }
    if (t >= FILO_INIZIO) luci(t);
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
      f.forEach((r, y) => { for (let x = 0; x < 5; x++) if (r[x] === 'x') pixel(g, b.x + x - 2, b.y + y - 1, P.O); });
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
