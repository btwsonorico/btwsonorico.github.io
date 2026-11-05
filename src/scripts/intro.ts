// Intro della home, una volta per sessione: un nido a pixel su un ramo, poi la vallata con la foresta che cresce dietro,
// e il nome al centro. Le uova si schiudono, gli uccelli si alzano e la madre passa davanti allo schermo da destra a sinistra:
// dietro di lei c'è la home, e lo stormo vero arriva da destra, dalla parte del nido.
// Tutto è disegnato a mano su una griglia bassa, con un solo canvas: nessun file da scaricare.

const T = { ramo: 0, nido: 0.3, uova: 0.7, madre: 1, zoom: 1.7, valle: 1.8, nome: 2.5, schiusa: 3.1, stormo: 3.3, via: 4.9, durata: 1.25 };

type Tela = HTMLCanvasElement;
const tela = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const semeCaso = (s: number) => () => { s = (s + 0x6d2b79f5) | 0; let z = Math.imul(s ^ (s >>> 15), 1 | s); z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z; return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
const liscio = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };

const PALETTE = {
  dark: { lontano: '#172430', lontano2: '#1f3140', neve: '#33475a', suolo: '#10261a', suolo2: '#16321f', fiume: '#2c6d9c', fiume2: '#58a6ff', alberi: [['#0e2519', '#123222', '#19442c'], ['#113620', '#184c2c', '#23703a'], ['#134229', '#1f6233', '#35a148']], tronco: '#3a2a1c',
    legno: ['#3d2a1a', '#5c3f25', '#7c5a36', '#a07a4c'], interno: '#1c130b', uovo: '#d8e6ea', uovo2: '#a9c4cc', macchia: '#6e8a93', o: '#a8531e', O: '#ffa45e', L: '#ffd9b0', d: '#d97a32', y: '#ffd24a', k: '#14100c', foglia: ['#1f6233', '#3fb950'] },
  light: { lontano: '#cfd2c2', lontano2: '#bcc3b0', neve: '#f4f0e6', suolo: '#cfd8b4', suolo2: '#bccba0', fiume: '#6aa6c8', fiume2: '#0755b5', alberi: [['#8aa98a', '#9dba9b', '#b4cdb0'], ['#3f7d54', '#4f9266', '#74b083'], ['#14522a', '#14682c', '#4f9e5f']], tronco: '#5f452c',
    legno: ['#4a3320', '#6b4c2e', '#8c6a42', '#b08c5c'], interno: '#3b2a1a', uovo: '#fbf8ef', uovo2: '#d3dcd2', macchia: '#7d8d84', o: '#6e2c00', O: '#c8601a', L: '#f6c693', d: '#983d00', y: '#d99a12', k: '#14100c', foglia: ['#14682c', '#4f9e5f'] },
};

export function monta(el: HTMLElement) {
  const radice = document.documentElement, P = PALETTE[radice.dataset.theme === 'light' ? 'light' : 'dark'];
  const fondo = getComputedStyle(radice).getPropertyValue('--bg').trim() || '#0a0b0d';
  const cv = el.querySelector('canvas')!, nome = el.querySelector<HTMLElement>('.intro-nome')!, TESTO = nome.textContent ?? '';
  const px = Math.max(2, Math.round(Math.min(innerWidth / 220, innerHeight / 130))), W = Math.ceil(innerWidth / px), H = Math.ceil(innerHeight / px);
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const caso = semeCaso(7);
  nome.textContent = '';

  // --- Il nido: dietro (interno scuro) e davanti (bordo intrecciato). Le uova e la madre stanno in mezzo
  const NW = 46, NH = 24, CX = 23, CY = 7;
  const dietro = tela(NW, NH), davanti = tela(NW, NH), dg = dietro.getContext('2d')!, fg = davanti.getContext('2d')!;
  const pixel = (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, 1, 1); };
  const linea = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, col: string, dentro?: (x: number, y: number) => boolean) => {
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
  // I rametti: corti e quasi orizzontali, più chiari in alto, dove arriva la luce
  const fuori = (x: number, y: number) => inCoppa(x, y) && !(inBocca(x, y) && y < CY + 3);
  for (let i = 0; i < 230; i++) {
    const x = caso() * NW, y = CY - 3 + caso() * 19, a = (caso() - 0.5) * 1.3, l = 3 + caso() * 6, q = (y - CY) / 15, c = P.legno[Math.max(0, Math.min(3, Math.floor(3.4 - q * 3 + (caso() - 0.5) * 1.6)))]!;
    linea(fg, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, c, fuori);
  }
  // Qualche rametto che esce dal bordo
  for (const [x0, y0, x1, y1] of [[2, 8, -1, 5], [5, 13, 1, 15], [43, 7, 46, 4], [40, 14, 45, 16], [15, 20, 12, 23], [30, 21, 33, 23]] as const) linea(fg, x0, y0, x1, y1, P.legno[2]!);

  // --- Le uova: tre, che tremano e poi si aprono
  const uovo = tela(9, 11), ug = uovo.getContext('2d')!;
  for (let y = 0; y < 11; y++) for (let x = 0; x < 9; x++) {
    const u = (x - 4) / 4.5, v = (y - 6) / (y < 6 ? 6.4 : 5.2);
    if (u * u + v * v > 1) continue;
    pixel(ug, x, y, x > 5 || y > 8 ? P.uovo2 : P.uovo);
  }
  for (const [x, y] of [[3, 3], [5, 5], [2, 6], [6, 7], [4, 8], [5, 2]] as const) pixel(ug, x, y, P.macchia);
  const POSTI = [{ x: 8, y: -3 }, { x: 16, y: -4 }, { x: 24, y: -3 }];
  const pulcino = ['..oo..', '.oOOo.', 'yOkOOo', '.oOOOo'];
  const stampa = (c: CanvasRenderingContext2D, righe: string[], x0: number, y0: number) => righe.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const col = (P as Record<string, unknown>)[r[x]!]; if (typeof col === 'string') pixel(c, x0 + x, y0 + y, col); } });

  // La madre sul nido, rivolta a sinistra
  const MADRE = [
    '......oOOOo.........',
    '....oOOOOOOOo.......',
    '...oOOkOOOOOOo......',
    '.yyoOOOOOOOOOOo.....',
    'yyyoOOOOOOOOOOOo....',
    '...oLLOOOOOOOOOOOo..',
    '...oLLLOOddddOOOOOo.',
    '...oLLLLOddddddOOOOo',
    '....oLLLOOddddddOOOo',
    '....oLLLLOOdddddOOo.',
    '.....oLLLLOOOOOOOo..',
    '......ooLLLLLLLoo...',
  ];
  const madre = tela(20, 12);
  stampa(madre.getContext('2d')!, MADRE, 0, 0);

  // Il ramo: entra dal bordo destro e regge il nido, con qualche foglia
  const RW = 240, RH = 44, ramo = tela(RW, RH), rg = ramo.getContext('2d')!;
  const yRamo = (x: number) => 26 + Math.sin(x * 0.045) * 2 + x * 0.05;
  for (let x = 0; x < RW; x++) {
    const y = yRamo(x), s = 2 + Math.min(3, x / 35);
    for (let k = -s; k <= s; k++) pixel(rg, x, y + k, P.legno[k < -s + 1 ? 3 : k > s - 1.5 ? 0 : caso() < 0.2 ? 2 : 1]!);
  }
  const fogliaA = (x: number, y: number) => { const c = P.foglia[caso() < 0.5 ? 0 : 1]!; for (const [a, b] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [1, -1], [2, -1], [3, -1]] as const) pixel(rg, x + a, y + b, c); };
  for (let i = 0; i < 12; i++) {
    const x = 30 + i * 18 + caso() * 8, y = yRamo(x), su = caso() < 0.6 ? -1 : 1, e = x + (caso() - 0.3) * 12, f = y + su * (8 + caso() * 8);
    linea(rg, x, y, e, f, P.legno[1]!);
    fogliaA(e, f); fogliaA(e + 3, f + su * 2); fogliaA(e - 4, f + su);
  }

  // --- La vallata: le montagne salgono ai lati e lasciano libero il centro, dove sta il nome
  const orizzonte = Math.round(H * 0.68), terra = tela(W, H), tg = terra.getContext('2d')!;
  const u = (x: number) => (x - W / 2) / (W / 2);
  const onda = (x: number, a: number, b: number) => Math.sin(x * a) * 0.6 + Math.sin(x * b + 2) * 0.4;
  const cresta = (x: number) => orizzonte - 2 - Math.pow(Math.abs(u(x)), 1.5) * H * 0.42 - (onda(x, 0.13, 0.31) * 3 + Math.abs(Math.sin(x * 0.07)) * 8 * Math.abs(u(x)));
  const collina = (x: number) => orizzonte + 3 - Math.pow(Math.abs(u(x)), 1.6) * H * 0.15 - onda(x, 0.05, 0.11) * 2;
  const fiumeX = (y: number) => W / 2 + Math.sin(y * 0.09) * (y - orizzonte) * 0.28, fiumeL = (y: number) => 0.5 + (y - orizzonte) * 0.16;
  for (let x = 0; x < W; x++) {
    const c = Math.round(cresta(x)), v = Math.round(collina(x));
    for (let y = c; y < H; y++) {
      const dentroCollina = y >= v, r = (x * 7 + y * 13) % 5 === 0;
      if (!dentroCollina) { tg.fillStyle = y < c + 3 && Math.abs(u(x)) > 0.4 ? P.neve : (y + x) % 3 === 0 ? P.lontano2 : P.lontano; tg.fillRect(x, y, 1, 1); continue; }
      tg.fillStyle = r ? P.suolo2 : P.suolo; tg.fillRect(x, y, 1, 1);
      if (y >= orizzonte + 1 && Math.abs(x - fiumeX(y)) < fiumeL(y)) { tg.fillStyle = (x + y * 3) % 7 === 0 ? P.fiume2 : P.fiume; tg.fillRect(x, y, 1, 1); }
    }
  }
  const pino = (h: number, C: string[]) => {
    const l = Math.max(3, Math.round(h * 0.62)) | 1, c = tela(l, h), q = c.getContext('2d')!, tr = Math.max(1, Math.round(h * 0.14));
    for (let y = 0; y < h - tr; y++) {
      const f = y / (h - tr), giro = Math.max(2, Math.round(h / 5)), m = ((y % giro) / giro) * 0.3 + 0.7, r = Math.round((l / 2) * f * m + 0.2);
      for (let x = -r; x <= r; x++) { q.fillStyle = x < -r * 0.3 ? C[2]! : x > r * 0.45 ? C[0]! : C[1]!; q.fillRect((l >> 1) + x, y, 1, 1); }
    }
    q.fillStyle = P.tronco; q.fillRect(l >> 1, h - tr, 1, tr);
    return c;
  };
  const tonda = (h: number, C: string[]) => {
    const l = Math.max(3, Math.round(h * 0.8)) | 1, c = tela(l, h), q = c.getContext('2d')!, a = h * 0.78, tr = h - Math.round(a);
    for (let y = 0; y < a; y++) for (let x = 0; x < l; x++) {
      const s = (x - l / 2 + 0.5) / (l / 2), t = (y - a / 2) / (a / 2);
      if (s * s + t * t > 1) continue;
      q.fillStyle = s + t < -0.5 ? C[2]! : s + t > 0.5 ? C[0]! : C[1]!; q.fillRect(x, y, 1, 1);
    }
    q.fillStyle = P.tronco; q.fillRect(l >> 1, h - tr, 1, tr);
    return c;
  };
  const scala = Math.min(W, H) / 130, sprite = new Map<string, Tela>();
  const tempoColonna = (x: number) => T.valle + ((W * 0.8 - x) / W) * 0.8 + (Math.sin(x * 12.9) * 0.5 + 0.5) * 0.12;
  const alberi: { x: number; y: number; c: Tela; t0: number }[] = [];
  for (let i = 0; i < 900 && alberi.length < 190; i++) {
    const x = caso() * W, y0 = collina(x), y = y0 + caso() * caso() * (H - y0), d = (y - y0) / Math.max(1, H - y0);
    // Il centro resta aperto: il fondovalle e il fiume si vedono
    if (caso() > 0.06 + Math.abs(u(x)) * 1.1 + d * 0.3) continue;
    if (Math.abs(x - fiumeX(y)) < fiumeL(y) + 2) continue;
    const lontananza = (y - collina(x)) / Math.max(1, H - collina(x)), ton = lontananza < 0.22 ? 0 : lontananza < 0.55 ? 1 : 2;
    const h = Math.max(4, Math.round((4 + (y - orizzonte + H * 0.15) * 0.1 + caso() * 3) * Math.min(1.2, scala))), tipo = caso() < 0.72 ? 'p' : 't', k = `${tipo}${h}${ton}`;
    if (!sprite.has(k)) sprite.set(k, tipo === 'p' ? pino(h, P.alberi[ton]!) : tonda(h, P.alberi[ton]!));
    alberi.push({ x: Math.round(x), y: Math.round(y), c: sprite.get(k)!, t0: tempoColonna(x) + 0.1 + caso() * 0.35 });
  }
  alberi.sort((a, b) => a.y - b.y);

  // --- Il grande uccello che passa davanti: ali su e ali giù, a blocchi larghi come nel volo vicino all'obiettivo
  const GW = 46, GH = 34;
  const grande = (su: boolean) => {
    const c = tela(GW, GH), q = c.getContext('2d')!, cy = 18, HA = 17;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      // Coda stretta, a ventaglio, con le penne a righe
      if (x >= 28 && x < 43 && Math.abs(y - cy - 1) <= (x - 28) * 0.22 + 1) pixel(q, x, y, y % 2 ? P.d : P.o);
      // Ala: larga alla spalla, si stringe verso la punta e piega all'indietro; sul lato posteriore ha le penne
      const v = su ? cy - y : y - cy, t = v / HA;
      if (t >= 0 && t <= 1) {
        const davanti = 11 + 19 * Math.pow(t, 1.25), dietro = 30 + 3 * t - (Math.floor(v / 2) % 2) * 3 * (1 - t * 0.5);
        if (x >= davanti && x <= dietro) {
          const qu = (x - davanti) / Math.max(1, dietro - davanti);
          pixel(q, x, y, x > dietro - 1 ? P.o : qu > 0.62 ? ((x + v) % 3 === 0 ? P.o : P.d) : t > 0.45 ? P.d : P.O);
        }
      }
      // Corpo affusolato verso la coda, testa tonda davanti
      const ax = (x - 18) / 13, ry = 5 - Math.max(0, ax) * 2.2, by = (y - cy) / ry;
      if (ax * ax + by * by <= 1) pixel(q, x, y, y > cy + 1 ? P.L : P.O);
      const tx = (x - 8) / 5, ty = (y - (cy - 2)) / 4.6;
      if (tx * tx + ty * ty <= 1) pixel(q, x, y, y > cy + 1 ? P.L : P.O);
    }
    for (const [a, b] of [[3, 15], [2, 15], [1, 16], [2, 16], [3, 16], [0, 16], [2, 17], [3, 17]] as const) pixel(q, a, b, P.y);
    pixel(q, 7, cy - 4, P.k); pixel(q, 7, cy - 3, P.k); pixel(q, 6, cy - 4, P.k); pixel(q, 6, cy - 3, P.k);
    return c;
  };
  const ali = [grande(true), grande(false)];

  // --- Lo stormo piccolo: ogni uccello si alza dal nido o da un albero sul lato destro
  const nx = Math.round(W * 0.78), ny = Math.round(H * 0.78);
  const destra = alberi.filter(a => a.x > W * 0.45);
  const piccoli = Array.from({ length: 80 }, (_, i) => {
    const dalNido = i < 12, s = dalNido ? null : destra[Math.floor(caso() * destra.length)];
    return { x: dalNido ? nx : s?.x ?? W, y: dalNido ? ny - 6 : (s ? s.y - s.c.height : H * 0.6), vx: -0.2 - caso() * 0.4, vy: -0.5 - caso() * 0.4, t0: T.schiusa + 0.1 + (dalNido ? i * 0.09 : 0.3 + caso() * 1.3), f: caso() * 6, ox: (caso() - 0.5) * W * 0.4, oy: (caso() - 0.5) * H * 0.24 };
  });

  // --- Un fotogramma, dato il tempo
  const disegnaNido = (t: number) => {
    const z = liscio((t - T.zoom) / 0.5), k = t < T.zoom ? 3 : t < T.zoom + 0.28 ? 2 : 1;
    const kInizio = Math.min(3, Math.floor((W * 0.8) / NW)), kk = Math.min(k, Math.max(1, kInizio));
    const ax = W / 2 + (nx - W / 2) * z, ay = H * 0.46 + (ny - H * 0.46) * z, x0 = Math.round(ax - CX * kk), y0 = Math.round(ay - CY * kk);
    const disegna = (c: Tela, x: number, y: number) => g.drawImage(c, x0 + x * kk, y0 + y * kk, c.width * kk, c.height * kk);
    // Il ramo cresce da destra
    const vis = liscio((t - T.ramo) / 0.5), rx = x0 + (CX - 2) * kk, ry = y0 + (CY + 13 - 26) * kk, lung = Math.ceil(Math.max(0, W - rx) / kk) + 1, parte = Math.min(RW, Math.ceil(lung * vis));
    if (parte > 0) g.drawImage(ramo, lung - parte < 0 ? 0 : lung - parte, 0, parte, RH, rx + (lung - parte) * kk, ry, parte * kk, RH * kk);
    const nido = liscio((t - T.nido) / 0.45);
    if (nido <= 0) return;
    // Il nido appare dal basso, riga per riga
    const righe = Math.ceil(NH * nido), taglia = (c: Tela) => g.drawImage(c, 0, NH - righe, NW, righe, x0, y0 + (NH - righe) * kk, NW * kk, righe * kk);
    taglia(dietro);
    POSTI.forEach((p, i) => {
      const ti = T.uova + i * 0.1;
      if (t < ti) return;
      const sale = Math.round((1 - liscio((t - ti) / 0.18)) * 8), sch = T.schiusa + i * 0.3, trema = t > T.uova + 0.5 && t < sch + 0.05 ? (Math.floor(t * (t > sch - 0.5 ? 18 : 5) + i) % 2 ? 1 : 0) : 0;
      if (t < sch) { disegna(uovo, p.x + trema, p.y + sale); return; }
      // Aperto: resta il guscio, il pulcino spunta e poi vola via
      if (t < sch + 0.5) { const q = tela(6, 4); stampa(q.getContext('2d')!, pulcino, 0, 0); disegna(q, p.x + 2, p.y - 1 + Math.round((1 - liscio((t - sch) / 0.15)) * 3)); }
      g.drawImage(uovo, 0, 5, 9, 6, x0 + p.x * kk, y0 + (p.y + 5) * kk, 9 * kk, 6 * kk);
    });
    // La madre arriva da destra e si posa; quando parte, sul nido non c'è più
    if (t >= T.madre && t < T.via) { const a = 1 - liscio((t - T.madre) / 0.4); disegna(madre, 28 + Math.round(a * 60), -9 - Math.round(a * 22)); }
    taglia(davanti);
  };

  const FORMA = [['x...x', '.x.x.', '..x..'], ['.....', 'xx.xx', '..x..']];
  const passo = (t: number, dt: number, via: boolean) => {
    for (const b of piccoli) {
      if (t < b.t0) continue;
      const mx = via ? -40 : W * 0.42 + Math.sin(t * 0.8) * W * 0.12 + b.ox, my = via ? H * 0.25 + b.oy : H * 0.26 + Math.cos(t * 1.1) * H * 0.05 + b.oy;
      const fA = via ? 7 : 2.2, vm = via ? 2.6 : 1.1, r = dt * 60;
      b.vx += ((mx - b.x) / W) * fA * dt * 3 + Math.sin(t * 3 + b.f) * 0.01 * r;
      b.vy += ((my - b.y) / H) * fA * dt * 3 + Math.cos(t * 2.4 + b.f) * 0.01 * r;
      const v = Math.hypot(b.vx, b.vy); if (v > vm) { b.vx *= vm / v; b.vy *= vm / v; }
      b.x += b.vx * r; b.y += b.vy * r;
    }
  };

  const K = Math.max(3, Math.ceil(Math.min(H / 30, W / 44))), LARGO = GW * K;
  // Il bordo fra intro e home, a gradini come tutto il resto
  const passoBordo = Math.max(2, Math.round(K / 2)), scarto = Array.from({ length: Math.ceil(H / passoBordo) + 1 }, () => caso() * K * 1.6);
  const finale = (t: number) => (t - T.via) / T.durata;

  const disegno = (t: number) => {
    g.fillStyle = fondo; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x++) {
      const a = liscio((t - tempoColonna(x)) / 0.35);
      if (a <= 0) continue;
      g.drawImage(terra, x, 0, 1, H, x, Math.round((1 - a) * H * 0.55), 1, H);
    }
    for (const a of alberi) {
      const f = liscio((t - a.t0) / 0.3);
      if (f <= 0) continue;
      const h = Math.ceil(a.c.height * f);
      g.drawImage(a.c, 0, 0, a.c.width, h, a.x - (a.c.width >> 1), a.y - h, a.c.width, h);
    }
    for (const b of piccoli) {
      if (t < b.t0) continue;
      const f = FORMA[Math.floor(t * 9 + b.f) % 2]!;
      f.forEach((r, y) => { for (let x = 0; x < 5; x++) if (r[x] === 'x') pixel(g, b.x + x - 2, b.y + y - 1, P.O); });
    }
    disegnaNido(t);
    const u0 = finale(t);
    if (u0 >= 0) {
      // Parte lenta e accelera, come un uccello che si stacca dal nido e passa vicino all'obiettivo
      const q = u0 * u0 * (3 - 2 * u0), x = W - (W + LARGO * 0.75) * q, bordo = x + LARGO * 0.5;
      scarto.forEach((s, i) => { const b = Math.max(0, Math.round((bordo + s) / passoBordo) * passoBordo); g.clearRect(b, i * passoBordo, W - b, passoBordo); });
      const y = Math.round(H / 2 - (GH * K) / 2);
      g.drawImage(ali[Math.floor(u0 * 5) % 2]!, Math.round(x), y, LARGO, GH * K);
      const r = nome.getBoundingClientRect();
      nome.style.clipPath = `inset(0 ${Math.max(0, r.right - x * px)}px 0 0)`;
    }
  };

  // --- Il tempo: si può saltare, con un clic o un tasto
  let t = 0, prima = 0, viaData = false, finito = false, ferma = 0;
  const parametro = new URLSearchParams(location.search).get('intro');
  if (parametro && !Number.isNaN(Number(parametro))) ferma = Number(parametro);
  const parti = () => { if (!viaData) { viaData = true; radice.dataset.intro = 'via'; el.classList.add('in-volo'); } };
  const chiudi = () => { if (finito) return; finito = true; parti(); delete radice.dataset.intro; el.remove(); ['pointerdown', 'keydown', 'wheel'].forEach(e => removeEventListener(e, salta)); };
  const salta = () => { if (t < T.via) { t = T.via; parti(); } else chiudi(); };
  const aggiorna = (ora: number, dt: number) => {
    const scritte = Math.floor(liscio((ora - T.nome) / 0.6) * TESTO.length);
    if (nome.textContent !== TESTO.slice(0, scritte)) nome.textContent = TESTO.slice(0, scritte);
    passo(ora, dt, ora >= T.via);
  };
  if (ferma) {
    // Solo per le prove: ?intro=3.2 ferma la scena a quel secondo
    for (let i = 0; i < ferma * 60; i++) aggiorna(i / 60, 1 / 60);
    aggiorna(ferma, 0);
    disegno(ferma);
    if (ferma >= T.via) parti();
    return;
  }
  ['pointerdown', 'keydown', 'wheel'].forEach(e => addEventListener(e, salta, { passive: true }));
  const giro = (ms: number) => {
    if (finito) return;
    // Anche su un telefono lento l'intro dura lo stesso tempo: salta fotogrammi, non rallenta
    const dt = Math.min(0.25, prima ? (ms - prima) / 1000 : 0);
    prima = ms; t += dt;
    aggiorna(t, dt);
    if (t >= T.via) parti();
    disegno(t);
    if (finale(t) >= 1) { chiudi(); return; }
    requestAnimationFrame(giro);
  };
  requestAnimationFrame(giro);
}
