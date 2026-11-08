import { CORSA, DATI, LATO_FRECCE, MONDO, N_FRECCE, SCALA, SCALA_E } from '../data/diffusione-stella';

// L'arte «diffusione» dei biglietti di AI terms, presa da /learn/diffusion. Nessun modello gira qui.
// Davanti: il training. I dati veri della stella stanno sul piano. Una o due linee arancioni alla volta partono da un punto
// della forma e salgono fino alla sua posizione sporcata: è il rumore che la rete impara a togliere. Sono campioni veri del
// training, registrati uno ogni 50 passi (punto, livello t, rumore usato, errore del passo), rigiocati in ordine e in loop.
// Dietro: l'inference. Una corsa vera da 300 punti, registrata una volta (scripts/registra-diffusione.mjs): il rumore puro
// scende sul piano e forma la stella, le frecce mostrano dove la rete manda i punti. A ogni frame si interpola fra due passi.

// I colori della pagina in tema scuro
const FONDO = '#0a0b0d', FG = '#e6eaf0', MUTED = '#7a828d', RETE = '#1f242c', BLU = '#58a6ff', ARANCIO = '#ffa45e';
// Il piano come in pagina: schiacciato, con l'altezza che è la quota di rumore
const PIATTO = 0.6, ALTEZZA = 1.1, MAGLIE = 12;
// Il ciclo dietro, in secondi: rumore fermo, discesa, stella ferma, rumore che torna
const FERMO = 0.8, DISCESA = 4.6, STELLA = 2.6, RITORNO = 1.6, CICLO = FERMO + DISCESA + STELLA + RITORNO;
// Davanti: la curva del rumore della pagina (src/lib/spirale.ts, T = 50). Ogni linea, in secondi: si disegna, resta, si spegne.
// Una nuova ogni PASSO secondi
const T = 50, DISEGNO = 0.6, TIENI = 0.8, SPEGNI = 0.5, VITA = DISEGNO + TIENI + SPEGNI, PASSO = 1.1;
const abar = Array.from({ length: T + 1 }, (_, t) => Math.max(1e-3, Math.cos(((t / T + 0.008) / 1.008) * Math.PI / 2) ** 2 / Math.cos((0.008 / 1.008) * Math.PI / 2) ** 2));
const quota = (t: number) => Math.sqrt(1 - abar[t]!);

export const CARTA_DIFFUSIONE = { carta: '#eef2f7', inchiostro: '#10161f', accento: '#1f6fd1', tagliando: '#dde5ef', fondo: FONDO };

// --- I dati: base64 → byte con segno, una volta sola
const daB64 = (s: string) => { const b = atob(s), a = new Int8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = (b.charCodeAt(i) << 24) >> 24; return a; };
let decodificati: { dati: Int8Array; campioni: Int8Array; punti: Int8Array; frecce: Int8Array } | null = null;
const dati = () => (decodificati ??= { dati: daB64(DATI.punti), campioni: daB64(DATI.campioni), punti: daB64(CORSA.punti), frecce: daB64(CORSA.frecce) });

// Lo stato di ogni tela: solo il contesto e il font letto una volta
const stati = new WeakMap<HTMLCanvasElement, { g: CanvasRenderingContext2D; mono: string }>();

const liscia = (u: number) => u * u * (3 - 2 * u);
const fra = (u: number, a: number, b: number) => Math.min(1, Math.max(0, (u - a) / (b - a)));

// La proiezione del piano inclinato in un riquadro: centro, scala, giro
type Piano = { cx: number; cy: number; S: number; co: number; si: number };
function adatta(x: number, y: number, w: number, h: number, giro: number, margine: number): Piano {
  const S = Math.min((w - margine * 2) / (2 * MONDO * Math.SQRT2 * 0.95), (h - margine * 2) / (2 * MONDO * Math.SQRT2 * PIATTO + ALTEZZA * 1.15));
  return { S, cx: x + w / 2, cy: y + h / 2 + (S * ALTEZZA) / 2.4, co: Math.cos(giro), si: Math.sin(giro) };
}
const proietta = (p: Piano, x: number, y: number, hh = 0): [number, number] => [p.cx + p.S * (x * p.co + y * p.si), p.cy - p.S * ((-x * p.si + y * p.co) * PIATTO + hh * ALTEZZA)];

function griglia(g: CanvasRenderingContext2D, p: Piano) {
  g.strokeStyle = RETE;
  g.lineWidth = 1;
  g.beginPath();
  for (let k = 0; k <= MAGLIE; k++) {
    const q = -MONDO + (2 * MONDO * k) / MAGLIE;
    let [a, b] = proietta(p, q, -MONDO); g.moveTo(a, b); [a, b] = proietta(p, q, MONDO); g.lineTo(a, b);
    [a, b] = proietta(p, -MONDO, q); g.moveTo(a, b); [a, b] = proietta(p, MONDO, q); g.lineTo(a, b);
  }
  g.stroke();
}

// Il piano e la riga in mono in basso, uguali sui due lati
function impagina(g: CanvasRenderingContext2D, w: number, h: number, giro: number, mono: string) {
  const basso = Math.max(12, h * 0.07), p = adatta(0, basso * 0.6, w, h - basso * 1.6, giro, Math.min(w, h) * 0.03);
  g.font = `${Math.round(Math.max(9, Math.min(11, w / 30)))}px ${mono}`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  return { p, riga: h - basso * 0.45 };
}

const mescola = (a: string, b: string, u: number) => {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), c = (s: number) => Math.round(((x >> s) & 255) + (((y >> s) & 255) - ((x >> s) & 255)) * u);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};

// --- Davanti: il training
function davanti(g: CanvasRenderingContext2D, w: number, h: number, tempo: number, mono: string) {
  const d = dati(), n = DATI.n, { p, riga } = impagina(g, w, h, 0.42 + Math.sin(tempo * 0.21) * 0.18, mono);
  griglia(g, p);
  // I dati veri, azzurri e un po' spenti come in pagina durante il training
  const lato = Math.max(1.4, p.S * 0.032);
  g.fillStyle = BLU;
  g.globalAlpha = 0.55;
  for (let i = 0; i < n * 2; i += 2) {
    const [a, b] = proietta(p, d.dati[i]! * SCALA, d.dati[i + 1]! * SCALA);
    g.fillRect(a - lato / 2, b - lato / 2, lato, lato);
  }
  g.globalAlpha = 1;
  // I campioni veri del training, in ordine: uno nuovo ogni PASSO secondi, ognuno vive DISEGNO + TIENI + SPEGNI. Al massimo due insieme
  const nc = d.campioni.length / 6, ora = Math.floor(tempo / PASSO), punta = Math.max(3, p.S * 0.06), anello = Math.max(3, p.S * 0.05);
  g.lineJoin = g.lineCap = 'round';
  for (let k = ora - Math.ceil(VITA / PASSO) + 1; k <= ora; k++) {
    const u = tempo - k * PASSO;
    if (u < 0 || u >= VITA) continue;
    const o = (((k % nc) + nc) % nc) * 6, x0 = d.campioni[o]! * SCALA, y0 = d.campioni[o + 1]! * SCALA, t = d.campioni[o + 2]!, e0 = d.campioni[o + 3]! * SCALA_E, e1 = d.campioni[o + 4]! * SCALA_E;
    // Quanto della linea si vede (in passi di rumore, anche fra due passi) e quanta luce ha
    const v = liscia(fra(u, 0, DISEGNO)) * t, luce = fra(u, 0, 0.12) * (1 - liscia(fra(u, DISEGNO + TIENI, VITA)));
    // La posizione a ogni livello s, con lo stesso rumore vero: √ābar·x0 + √(1−ābar)·e. Al livello t è il punto che la rete ha visto
    const a = (s: number) => { const k0 = Math.floor(s), q = s - k0, ab = abar[k0]! + (abar[Math.min(k0 + 1, T)]! - abar[k0]!) * q, sa = Math.sqrt(ab), sb = Math.sqrt(1 - ab); return proietta(p, sa * x0 + sb * e0, sa * y0 + sb * e1, sb); };
    const [ax, ay] = proietta(p, x0, y0);
    g.globalAlpha = luce;
    // Il punto vero, cerchiato
    g.strokeStyle = FG;
    g.lineWidth = 1;
    g.beginPath(); g.ellipse(ax, ay, anello, anello * PIATTO, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = ARANCIO;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(ax, ay);
    for (let s = 1; s < v; s++) { const [qx, qy] = a(s); g.lineTo(qx, qy); }
    const [qx, qy] = a(v);
    g.lineTo(qx, qy);
    g.stroke();
    // L'ombra sul piano dice quanto è alto; la punta arancione è la posizione sporcata
    const ab = abar[Math.floor(v)]! + (abar[Math.min(Math.floor(v) + 1, T)]! - abar[Math.floor(v)]!) * (v - Math.floor(v)), [ox, oy] = proietta(p, Math.sqrt(ab) * x0 + Math.sqrt(1 - ab) * e0, Math.sqrt(ab) * y0 + Math.sqrt(1 - ab) * e1);
    g.fillStyle = MUTED;
    g.globalAlpha = luce * 0.6;
    g.fillRect(ox - punta * 0.35, oy - punta * 0.35, punta * 0.7, punta * 0.7);
    g.globalAlpha = luce;
    g.fillStyle = ARANCIO;
    g.fillRect(qx - punta / 2, qy - punta / 2, punta, punta);
  }
  g.globalAlpha = 1;
  // Una riga in mono: il passo e l'errore veri del campione più nuovo
  const o = (((ora % nc) + nc) % nc) * 6, passo = ((((ora % nc) + nc) % nc) + 1) * DATI.ogni;
  g.fillStyle = MUTED;
  g.fillText(`training · step ${passo.toLocaleString('en-US')} · loss ${(d.campioni[o + 5]! / 100).toFixed(2)}`, w / 2, riga);
}

// --- Dietro: l'inference
// Dove si trova la corsa in un momento del ciclo: f è il frame (anche fra due frame), luce l'opacità dei punti, frecce quella delle frecce
function momento(u: number, passi: number) {
  if (u < FERMO) return { f: 0, luce: liscia(fra(u, 0, 0.35)), frecce: liscia(fra(u, 0, FERMO)) };
  u -= FERMO;
  // La discesa rallenta verso la fine, come l'occhio la vuole vedere: gli ultimi passi sono piccoli
  if (u < DISCESA) { const q = u / DISCESA; return { f: (1 - (1 - q) ** 1.6) * passi, luce: 1, frecce: 1 - fra(q, 0.85, 1) }; }
  u -= DISCESA;
  if (u < STELLA) return { f: passi, luce: 1, frecce: 0 };
  u -= STELLA;
  // Il ritorno: il rumore torna, più veloce, e i punti si spengono alla fine per ricominciare
  const q = u / RITORNO;
  return { f: (1 - q * q) * passi, luce: 1 - liscia(fra(q, 0.7, 1)), frecce: 0 };
}

// La quota di rumore al frame f, fra due frame registrati
const quotaA = (quote: number[], f: number) => { const k = Math.floor(f), u = f - k; return quote[k]! + ((quote[Math.min(k + 1, quote.length - 1)]!) - quote[k]!) * u; };

function dietro(g: CanvasRenderingContext2D, w: number, h: number, tempo: number, mono: string) {
  const d = dati(), giri = Math.floor(tempo / CICLO), { f, luce, frecce: lf } = momento(tempo - giri * CICLO, CORSA.passi);
  // Un giro sì e uno no la stessa corsa è specchiata: la stella resta la stessa, il rumore cambia. Lo specchio tiene le frecce sulle loro maglie
  const m = giri % 2 === 1 ? -1 : 1, { p, riga } = impagina(g, w, h, 0.42 + Math.sin(tempo * 0.21) * 0.18, mono);
  griglia(g, p);
  // Le frecce della rete al livello di rumore di questo passo, sul piano
  if (lf > 0.01) {
    const k0 = Math.min(Math.floor(f), CORSA.passi - 1), k1 = Math.min(k0 + 1, CORSA.passi), v = f - k0, nn = N_FRECCE * N_FRECCE * 2;
    g.strokeStyle = MUTED;
    g.globalAlpha = 0.75 * lf;
    g.lineWidth = Math.max(1, p.S * 0.012);
    g.beginPath();
    for (let r = 0, i = 0; r < N_FRECCE; r++) for (let k = 0; k < N_FRECCE; k++, i += 2) {
      const a0 = d.frecce[k0 * nn + i]!, b0 = d.frecce[k0 * nn + i + 1]!, a1 = d.frecce[k1 * nn + i]!, b1 = d.frecce[k1 * nn + i + 1]!;
      const dx = ((a0 + (a1 - a0) * v) / 127) * LATO_FRECCE * m, dy = ((b0 + (b1 - b0) * v) / 127) * LATO_FRECCE;
      if (Math.hypot(dx, dy) < 0.01) continue;
      // Specchiate, le frecce di una maglia vengono dalla maglia opposta
      const x = m * (-MONDO + (k + 0.5) * LATO_FRECCE), y = -MONDO + (r + 0.5) * LATO_FRECCE;
      const [p0x, p0y] = proietta(p, x, y), [p1x, p1y] = proietta(p, x + dx, y + dy), [p2x, p2y] = proietta(p, x + dx * 0.65 - dy * 0.2, y + dy * 0.65 + dx * 0.2), [p3x, p3y] = proietta(p, x + dx * 0.65 + dy * 0.2, y + dy * 0.65 - dx * 0.2);
      g.moveTo(p0x, p0y); g.lineTo(p1x, p1y); g.lineTo(p2x, p2y); g.moveTo(p1x, p1y); g.lineTo(p3x, p3y);
    }
    g.stroke();
    g.globalAlpha = 1;
  }
  // I punti nuovi: la loro altezza è il rumore rimasto. Bianchi nel rumore, azzurri quando arrivano sulla forma
  const q = quotaA(CORSA.quote, f), n = CORSA.n, k0 = Math.floor(f), k1 = Math.min(k0 + 1, CORSA.passi), u = f - k0, o0 = k0 * n * 2, o1 = k1 * n * 2, lato = Math.max(1.6, p.S * 0.045);
  g.globalAlpha = luce;
  g.fillStyle = mescola(BLU, FG, Math.min(1, q * 1.6));
  for (let i = 0; i < n * 2; i += 2) {
    const ax = d.punti[o0 + i]! * SCALA, ay = d.punti[o0 + i + 1]! * SCALA;
    const [a, b] = proietta(p, (ax + (d.punti[o1 + i]! * SCALA - ax) * u) * m, ay + (d.punti[o1 + i + 1]! * SCALA - ay) * u, q);
    g.fillRect(a - lato / 2, b - lato / 2, lato, lato);
  }
  g.globalAlpha = 1;
  // Una riga in mono, come la lettura della pagina
  const passo = Math.round(f);
  g.fillStyle = MUTED;
  g.fillText(passo >= CORSA.passi ? `${n} new points · from noise` : `inference · step ${passo} of ${CORSA.passi} · ${Math.round(q * 100)}% noise`, w / 2, riga);
}

// Disegna tutta la tela, fondo compreso. «tempo» in secondi; la tela ha già le misure giuste in pixel del dispositivo
export function disegnaDiffusione(c: HTMLCanvasElement, tempo: number, retro: boolean): void {
  let s = stati.get(c);
  if (!s) {
    const g = c.getContext('2d');
    if (!g) return;
    s = { g, mono: getComputedStyle(c).getPropertyValue('--mono').trim() || 'ui-monospace, monospace' };
    stati.set(c, s);
  }
  const { g, mono } = s, dpr = c.clientWidth ? c.width / c.clientWidth : Math.min(2, devicePixelRatio || 1), w = c.width / dpr, h = c.height / dpr;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.fillStyle = FONDO;
  g.fillRect(0, 0, c.width, c.height);
  if (!w || !h) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (retro) dietro(g, w, h, tempo, mono);
  else davanti(g, w, h, tempo, mono);
}
