// Intro della home, una volta per sessione. Mescola tre stili e va dal piccolo al grande.
// Una macchia di caratteri colorati al centro dello schermo si ingrandisce fino a diventare una foresta di notte, tutta in ASCII.
// Dal bosco esce di corsa una famiglia di cervi: blocchi bianchi piatti, in contrasto con i caratteri, e bianchi come i cervi del sito.
// Dalle chiome si alza lo stormo. È lo stesso della home: ogni uccello a pixel arriva sul suo uccello 3D e lì gli passa il posto.
// La foresta si scioglie dal basso, e il nome sale nella barra in alto.
import { ponte } from '../lib/ponteStormo';

const T = { zoom: 1.4, nome: 1.2, cervi: 1.55, stormo: 2.9, via: 4.8, durata: 1.55 };

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
  // Abeti a punta, dal fondo verso chi guarda. Davanti al centro c'è una radura, dove escono i cervi
  const inRadura = (c: number, r: number) => { const a = (c - C * 0.5) / (C * 0.3), b = (r - R * 0.86) / (R * 0.24); return a * a + b * b < 1; };
  const alberi: { c: number; r: number; h: number; d: number }[] = [];
  for (let i = 0; i < 7000 && alberi.length < C * R * 0.024; i++) {
    const c = Math.floor(caso() * C), r = oriz + Math.floor(caso() * caso() * (R - oriz) * 0.82), d = (r - oriz) / Math.max(1, R - oriz);
    if (caso() > 0.3 + Math.abs(u(c)) * 1.3) continue;
    if (inRadura(c, r) || Math.abs(c - fiumeC(r)) < fiumeL(r) + 2 + d * 5) continue;
    alberi.push({ c, r, h: Math.round((4 + d * R * 0.34 + caso() * 3) * (0.8 + caso() * 0.45)), d });
  }
  alberi.sort((a, b) => a.r - b.r);
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
    for (let j = 0; j < 2; j++) metti(a.c, a.r + j, ROCCIA, forza * 0.5);
  }
  for (let c = 0; c < C; c++) {
    const b = R - 3 - Math.floor(caso() * caso() * R * 0.1);
    for (let r = b; r < R; r++) if (!inFiume(c, r) && caso() < 0.96) metti(c, r, ERBA, 0.28 + caso() * 0.55);
  }
  for (let i = 0; i < N * 0.006; i++) { const c = Math.floor(caso() * C), r = oriz + Math.floor(caso() * (R - oriz)); metti(c, r, STELLA, 0.3 + caso() * 0.5); }
  // La foresta cresce dal punto da cui parte lo zoom; si scioglie dal basso, seguendo lo stormo che sale
  const fx = C * 0.5, fy = R * 0.72, soglie = new Float32Array(N);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    t0[r * C + c] = Math.hypot(c - fx, (r - fy) * 1.5) / Math.hypot(C, R * 1.5) * 1.15 + nn[r * C + c]! * 0.15;
    soglie[r * C + c] = ((R - r) / R) * 0.72 + bayer(c, r) * 0.28;
  }
  const lucciole = Array.from({ length: Math.round(C * 0.14) }, () => ({ x: caso() * C, y: oriz - 4 + caso() * (R - oriz), f: caso() * 6, v: 0.5 + caso() }));
  const disegnaValle = (t: number, q: number) => {
    g.clearRect(0, 0, W, H);
    for (let r = 0, i = 0; r < R; r++) for (let c = 0; c < C; c++, i++) {
      const k = famiglia[i]!;
      if (k < 0 || t < t0[i]! || soglie[i]! < q) continue;
      const n = nn[i]!;
      let l = luce[i]!;
      if (k === ERBA) l += Math.sin(c * 0.14 + r * 0.5 - t * 2.3 + n) * 0.17;
      else if (k === ACQUA) l += Math.sin(c * 0.7 + r * 1.3 + t * 3 + n * 6) * 0.14;
      else if (k === STELLA) l *= 0.55 + 0.45 * Math.sin(t * (1 + n * 4) + n * 20);
      else if (k === ALBERO) l += Math.sin(c * 0.3 - t * 1.1 + r * 0.2) * 0.03;
      const liv = Math.max(0, Math.min(LIVELLI - 1, Math.floor(l * LIVELLI))), rampa = RAMPE[k]!;
      const qui = t < t0[i]! + 0.22 ? Math.floor(t * 28 + n * 40) % rampa.length : Math.min(rampa.length - 1, Math.floor((Math.max(0, l) + n * 0.1) * rampa.length));
      copia(g, rampa[qui]!, k, liv, c, r);
    }
    if (t > T.zoom) for (const b of lucciole) {
      if (Math.sin(t * 2 * b.v + b.f) < -0.15) continue;
      const x = Math.round(b.x + Math.sin(t * b.v + b.f) * 5), y = Math.round(b.y + Math.cos(t * b.v * 0.8 + b.f) * 3);
      if (x < 0 || x >= C || y < 0 || y >= R || soglie[y * C + x]! < q) continue;
      g.clearRect(x * CW, y * CH, 3, 5);
      copia(g, RAMPE[CALDO]![5]!, CALDO, 11, x, y);
    }
  };

  // --- I cervi: blocchi bianchi pieni, piatti e grossi, senza dettagli, in contrasto con la trama fitta dei caratteri.
  // Due soli fotogrammi di corsa, come in un vecchio videogioco. Attraversano la radura in gruppo, e al loro passaggio lo stormo si alza
  const ZAMPE = [['..##.......##.......', '.##.........##......', '.#...........##.....', '#.............#.....'], ['...##.....##........', '...##.....##........', '....##...##.........', '....#.....#.........']];
  const CORPO = ['..###########.......', '.############.......', '.############.......', '..##########........'];
  const PALCO = ['............#.#.#.#.', '.............##.##..', '..............###...'];
  const TESTA = ['...............####.', '..............#####.', '.............###....', '............###.....'];
  const ORECCHIE = ['...............#.#..'];
  const CORPI = { cervo: [...PALCO, ...TESTA, ...CORPO], cerva: [...ORECCHIE, ...TESTA, ...CORPO] };
  const blocchi = (righe: string[], lato: number) => { const c = tela(20 * lato, righe.length * lato), q = c.getContext('2d')!; q.fillStyle = testo; righe.forEach((r, y) => { for (let x = 0; x < 20; x++) if (r[x] === '#') q.fillRect(x * lato, y * lato, lato, lato); }); return c; };
  const passoCervo = innerWidth < 700 ? 2 : 3;
  const FAMIGLIA = ([['cervo', passoCervo, 0, 0.8], ['cerva', passoCervo, 0.28, 0.87], ['cerva', Math.max(1, passoCervo - 1), 0.42, 0.765], ['cerva', Math.max(1, passoCervo - 1), 0.62, 0.84], ['cerva', Math.max(1, passoCervo - 1), 0.86, 0.79]] as const).map(([tipo, lato, ritardo, quota]) => ({
    quadri: ZAMPE.map(z => blocchi([...CORPI[tipo], ...z], lato)), ritardo, quota,
  }));
  const CORSA = 1.9;
  const disegnaCervi = (t: number) => {
    for (const a of FAMIGLIA) {
      const u0 = (t - T.cervi - a.ritardo) / CORSA;
      if (u0 <= 0 || u0 >= 1) continue;
      const fr = a.quadri[Math.floor(t * 10 + a.ritardo * 9) % 2]!, x = -fr.width + (W + fr.width) * u0, y = H * a.quota - fr.height + (Math.floor(t * 10 + a.ritardo * 9) % 2 ? -passoCervo : 0);
      f.drawImage(fr, Math.round(x), Math.round(y));
    }
  };

  // --- Lo stormo: ogni uccello parte da una chioma e arriva sul suo uccello 3D. Quando è arrivato, il 3D gli prende il posto
  type Uccello = { x0: number; y0: number; t0: number; dura: number; f: number; onda: number };
  let stormo: Uccello[] | null = null;
  const creaStormo = () => {
    const n = ponte.xy ? ponte.xy.length / 2 : 300, chiome = alberi.filter(a => a.h > 4);
    stormo = Array.from({ length: n }, (_, i) => {
      const a = chiome[Math.floor(caso() * chiome.length)] ?? { c: C / 2, r: oriz, h: 0 };
      return { x0: a.c * CW, y0: (a.r - a.h) * CH, t0: T.stormo + (i / n) * 1.45, dura: 1.15 + caso() * 0.45, f: caso() * 6, onda: (caso() - 0.5) * W * 0.09 };
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
  const disegno = (t: number) => {
    const u0 = (t - T.via) / T.durata, q = u0 > 0 ? liscio(u0 * 1.05) * 1.02 : 0;
    // Lo zoom: la foresta parte minuscola al centro e arriva a coprire lo schermo
    const z = liscio(t / T.zoom), sc = Math.pow(0.1, 1 - z);
    cv.style.transform = sc < 0.999 ? `scale(${sc})` : '';
    if (conta++ % 2 === 0 || u0 > 0 || t < T.zoom) disegnaValle(t, q);
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
