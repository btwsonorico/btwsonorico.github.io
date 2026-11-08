import { DAVANTI, DIETRO, LATO_FRECCE, MONDO, N_FRECCE, SCALA } from '../data/diffusione-stella';

// L'arte «diffusione» dei biglietti di AI terms, presa da /learn/diffusion. Nessun modello gira qui: le corse di inference
// sono vere e registrate una volta (scripts/registra-diffusione.mjs). A ogni frame si interpola fra due passi registrati.
// Davanti: una corsa da 300 punti. Il rumore puro scende sul piano inclinato e forma la stella, le frecce mostrano dove la rete
// manda i punti; la stella resta un momento, poi il rumore torna (il processo in avanti) e si ricomincia, girata o specchiata.
// Dietro: 6 corse diverse in 6 riquadri, sfasate nel tempo, ognuna con il suo colore.

// I colori della pagina in tema scuro
const FONDO = '#0a0b0d', FG = '#e6eaf0', MUTED = '#7a828d', RETE = '#1f242c', BLU = '#58a6ff';
const COLORI_CORSE = ['#58a6ff', '#e6eaf0', '#ffa45e', '#3fb950', '#ff7ab8', '#b59cff'];
// Il piano come in pagina: schiacciato, con l'altezza che è la quota di rumore
const PIATTO = 0.6, ALTEZZA = 1.1, MAGLIE_DAVANTI = 12, MAGLIE_DIETRO = 6;
// Il ciclo davanti, in secondi: rumore fermo, discesa, stella ferma, rumore che torna
const FERMO = 0.8, DISCESA = 4.6, STELLA = 2.6, RITORNO = 1.6, CICLO = FERMO + DISCESA + STELLA + RITORNO;
// Il ciclo di ogni riquadro dietro, e lo sfasamento fra un riquadro e l'altro
const FERMO_D = 0.5, DISCESA_D = 3.4, STELLA_D = 2.2, RITORNO_D = 1.3, CICLO_D = FERMO_D + DISCESA_D + STELLA_D + RITORNO_D, SFASA = CICLO_D / 6;

export const CARTA_DIFFUSIONE = { carta: '#eef2f7', inchiostro: '#10161f', accento: '#1f6fd1', tagliando: '#dde5ef', fondo: FONDO };

// --- I dati: base64 → byte con segno, una volta sola
const daB64 = (s: string) => { const b = atob(s), a = new Int8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = (b.charCodeAt(i) << 24) >> 24; return a; };
let decodificati: { punti: Int8Array; frecce: Int8Array; corse: Int8Array[] } | null = null;
const dati = () => (decodificati ??= { punti: daB64(DAVANTI.punti), frecce: daB64(DAVANTI.frecce), corse: DIETRO.corse.map(daB64) });

// Lo stato di ogni tela: solo il contesto e il font letto una volta
const stati = new WeakMap<HTMLCanvasElement, { g: CanvasRenderingContext2D; mono: string }>();

const liscia = (u: number) => u * u * (3 - 2 * u);
const fra = (u: number, a: number, b: number) => Math.min(1, Math.max(0, (u - a) / (b - a)));

// Dove si trova la corsa in un momento del ciclo: f è il frame (anche fra due frame), luce l'opacità dei punti, frecce quella delle frecce
function momento(u: number, passi: number, fermo: number, discesa: number, stella: number, ritorno: number) {
  if (u < fermo) return { f: 0, luce: liscia(fra(u, 0, 0.35)), frecce: liscia(fra(u, 0, fermo)) };
  u -= fermo;
  // La discesa rallenta verso la fine, come l'occhio la vuole vedere: gli ultimi passi sono piccoli
  if (u < discesa) { const q = u / discesa; return { f: (1 - (1 - q) ** 1.6) * passi, luce: 1, frecce: 1 - fra(q, 0.85, 1) }; }
  u -= discesa;
  if (u < stella) return { f: passi, luce: 1, frecce: 0 };
  u -= stella;
  // Il ritorno: il rumore torna, più veloce, e i punti si spengono alla fine per cambiare corsa
  const q = u / ritorno;
  return { f: (1 - q * q) * passi, luce: 1 - liscia(fra(q, 0.7, 1)), frecce: 0 };
}

// La proiezione del piano inclinato in un riquadro: centro, scala, giro
type Piano = { cx: number; cy: number; S: number; co: number; si: number };
function adatta(x: number, y: number, w: number, h: number, giro: number, margine: number): Piano {
  const S = Math.min((w - margine * 2) / (2 * MONDO * Math.SQRT2 * 0.95), (h - margine * 2) / (2 * MONDO * Math.SQRT2 * PIATTO + ALTEZZA * 1.15));
  return { S, cx: x + w / 2, cy: y + h / 2 + (S * ALTEZZA) / 2.4, co: Math.cos(giro), si: Math.sin(giro) };
}
const proietta = (p: Piano, x: number, y: number, hh = 0): [number, number] => [p.cx + p.S * (x * p.co + y * p.si), p.cy - p.S * ((-x * p.si + y * p.co) * PIATTO + hh * ALTEZZA)];

function griglia(g: CanvasRenderingContext2D, p: Piano, maglie: number) {
  g.strokeStyle = RETE;
  g.lineWidth = 1;
  g.beginPath();
  for (let k = 0; k <= maglie; k++) {
    const q = -MONDO + (2 * MONDO * k) / maglie;
    let [a, b] = proietta(p, q, -MONDO); g.moveTo(a, b); [a, b] = proietta(p, q, MONDO); g.lineTo(a, b);
    [a, b] = proietta(p, -MONDO, q); g.moveTo(a, b); [a, b] = proietta(p, MONDO, q); g.lineTo(a, b);
  }
  g.stroke();
}

// I punti di una corsa al frame f, girati di «rot» e forse specchiati: la stella è uguale, il rumore di partenza no
function punti(g: CanvasRenderingContext2D, p: Piano, dati: Int8Array, n: number, f: number, hh: number, rot: number, specchio: boolean, lato: number) {
  const k0 = Math.floor(f), k1 = Math.min(k0 + 1, dati.length / (n * 2) - 1), u = f - k0, o0 = k0 * n * 2, o1 = k1 * n * 2, cr = Math.cos(rot), sr = Math.sin(rot), m = specchio ? -1 : 1;
  for (let i = 0; i < n * 2; i += 2) {
    const ax = dati[o0 + i]! * SCALA, ay = dati[o0 + i + 1]! * SCALA, x = (ax + (dati[o1 + i]! * SCALA - ax) * u) * m, y = ay + (dati[o1 + i + 1]! * SCALA - ay) * u;
    const [a, b] = proietta(p, x * cr - y * sr, x * sr + y * cr, hh);
    g.fillRect(a - lato / 2, b - lato / 2, lato, lato);
  }
}

// La quota di rumore al frame f, fra due frame registrati
const quotaA = (quote: number[], f: number) => { const k = Math.floor(f), u = f - k; return quote[k]! + ((quote[Math.min(k + 1, quote.length - 1)]!) - quote[k]!) * u; };

const mescola = (a: string, b: string, u: number) => {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), c = (s: number) => Math.round(((x >> s) & 255) + (((y >> s) & 255) - ((x >> s) & 255)) * u);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};

function davanti(g: CanvasRenderingContext2D, w: number, h: number, tempo: number, mono: string) {
  const d = dati(), giro = 0.42 + Math.sin(tempo * 0.21) * 0.18, giri = Math.floor(tempo / CICLO), u = tempo - giri * CICLO;
  const { f, luce, frecce: lf } = momento(u, DAVANTI.passi, FERMO, DISCESA, STELLA, RITORNO);
  // Un giro sì e uno no la stessa corsa è specchiata: la stella resta la stessa, il rumore cambia. Lo specchio tiene le frecce
  // sulle loro maglie; un quinto di giro no, quindi davanti non si gira
  const rot = 0, specchio = giri % 2 === 1;
  const basso = Math.max(12, h * 0.07), p = adatta(0, basso * 0.6, w, h - basso * 1.6, giro, Math.min(w, h) * 0.03);
  griglia(g, p, MAGLIE_DAVANTI);
  // Le frecce della rete al livello di rumore di questo passo, sul piano
  if (lf > 0.01) {
    const k0 = Math.min(Math.floor(f), DAVANTI.passi - 1), k1 = Math.min(k0 + 1, DAVANTI.passi), v = f - k0, nn = N_FRECCE * N_FRECCE * 2, cr = Math.cos(rot), sr = Math.sin(rot), m = specchio ? -1 : 1;
    g.strokeStyle = MUTED;
    g.globalAlpha = 0.75 * lf;
    g.lineWidth = Math.max(1, p.S * 0.012);
    g.beginPath();
    for (let r = 0, i = 0; r < N_FRECCE; r++) for (let k = 0; k < N_FRECCE; k++, i += 2) {
      const a0 = d.frecce[k0 * nn + i]!, b0 = d.frecce[k0 * nn + i + 1]!, a1 = d.frecce[k1 * nn + i]!, b1 = d.frecce[k1 * nn + i + 1]!;
      let dx = ((a0 + (a1 - a0) * v) / 127) * LATO_FRECCE * m, dy = ((b0 + (b1 - b0) * v) / 127) * LATO_FRECCE;
      if (Math.hypot(dx, dy) < 0.01) continue;
      [dx, dy] = [dx * cr - dy * sr, dx * sr + dy * cr];
      // Specchiate, le frecce di una maglia vengono dalla maglia opposta
      const x = (specchio ? -1 : 1) * (-MONDO + (k + 0.5) * LATO_FRECCE), y = -MONDO + (r + 0.5) * LATO_FRECCE;
      const [p0x, p0y] = proietta(p, x, y, 0), [p1x, p1y] = proietta(p, x + dx, y + dy, 0), [p2x, p2y] = proietta(p, x + dx * 0.65 - dy * 0.2, y + dy * 0.65 + dx * 0.2, 0), [p3x, p3y] = proietta(p, x + dx * 0.65 + dy * 0.2, y + dy * 0.65 - dx * 0.2, 0);
      g.moveTo(p0x, p0y); g.lineTo(p1x, p1y); g.lineTo(p2x, p2y); g.moveTo(p1x, p1y); g.lineTo(p3x, p3y);
    }
    g.stroke();
    g.globalAlpha = 1;
  }
  // I punti nuovi: la loro altezza è il rumore rimasto. Bianchi nel rumore, azzurri quando arrivano sulla forma
  const q = quotaA(DAVANTI.quote, f);
  g.globalAlpha = luce;
  g.fillStyle = mescola(BLU, FG, Math.min(1, q * 1.6));
  punti(g, p, d.punti, DAVANTI.n, f, q, rot, specchio, Math.max(1.6, p.S * 0.045));
  g.globalAlpha = 1;
  // Una riga in mono, come la lettura della pagina
  const passo = Math.round(f);
  g.font = `${Math.round(Math.max(9, Math.min(11, w / 30)))}px ${mono}`;
  g.fillStyle = MUTED;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillText(passo >= DAVANTI.passi ? `${DAVANTI.n} new points · from noise` : `step ${passo} of ${DAVANTI.passi} · ${Math.round(q * 100)}% noise`, w / 2, h - basso * 0.45);
}

function dietro(g: CanvasRenderingContext2D, w: number, h: number, tempo: number, mono: string) {
  const d = dati(), corse = d.corse.length, giro = 0.42 + Math.sin(tempo * 0.17) * 0.12;
  // La griglia di riquadri che dà riquadri più grandi: 3×2, 2×3 o 6×1
  let migliore = { col: 3, rig: 2, S: 0 };
  for (const [col, rig] of [[3, 2], [2, 3], [6, 1]] as const) {
    const S = adatta(0, 0, w / col, h / rig, giro, 0).S;
    if (S > migliore.S) migliore = { col, rig, S };
  }
  const { col, rig } = migliore, cw = w / col, ch = h / rig, corpo = Math.round(Math.max(8, Math.min(10, cw / 16)));
  g.font = `${corpo}px ${mono}`;
  g.textBaseline = 'top';
  for (let i = 0; i < corse; i++) {
    const x = (i % col) * cw, y = Math.floor(i / col) * ch, t = tempo + (corse - i) * SFASA, giri = Math.floor(t / CICLO_D), u = t - giri * CICLO_D;
    const { f, luce } = momento(u, DIETRO.passi, FERMO_D, DISCESA_D, STELLA_D, RITORNO_D);
    const p = adatta(x, y + corpo * 0.8, cw, ch - corpo * 0.8, giro, Math.min(cw, ch) * 0.06);
    griglia(g, p, MAGLIE_DIETRO);
    const q = quotaA(DIETRO.quote, f), colore = COLORI_CORSE[i % COLORI_CORSE.length]!;
    g.globalAlpha = luce;
    g.fillStyle = mescola(colore, FG, Math.min(1, q * 1.3));
    punti(g, p, d.corse[i]!, DIETRO.n, f, q, ((giri * 2 + i) % 5) * (2 * Math.PI / 5), (giri + i) % 2 === 1, Math.max(1.3, p.S * 0.05));
    g.globalAlpha = 1;
    // L'etichetta di ogni corsa: numero e passo
    const passo = Math.round(f);
    g.textAlign = 'left';
    g.fillStyle = colore;
    g.fillText(`run ${String(i + 1).padStart(2, '0')}`, x + 6, y + 5);
    g.textAlign = 'right';
    g.fillStyle = MUTED;
    g.fillText(passo >= DIETRO.passi ? 'done' : `${passo}/${DIETRO.passi}`, x + cw - 6, y + 5);
  }
  // Le linee fra i riquadri
  g.strokeStyle = RETE;
  g.lineWidth = 1;
  g.beginPath();
  for (let k = 1; k < col; k++) { g.moveTo(Math.round(k * cw) + 0.5, 0); g.lineTo(Math.round(k * cw) + 0.5, h); }
  for (let k = 1; k < rig; k++) { g.moveTo(0, Math.round(k * ch) + 0.5); g.lineTo(w, Math.round(k * ch) + 0.5); }
  g.stroke();
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
