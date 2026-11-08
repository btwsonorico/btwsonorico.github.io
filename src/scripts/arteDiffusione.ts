import { INFERENCE, MONDO, N_FRECCE, T_ALLENA, TRAINING } from '../data/diffusione-stella';

// L'arte «diffusione» dei biglietti di AI terms: la tela di /learn/diffusion con la stella, rigiocata. Nessun modello gira qui.
// Il disegno è quello della pagina (src/scripts/spiraleVista.ts, disegna e disegnaCurva), con le stesse misure in px e gli stessi colori.
// I dati vengono da una corsa vera, registrata una volta con lo stesso modello e lo stesso ciclo della pagina (scripts/registra-diffusione.mjs).
// Davanti: il bottone «train». Il piano a filo, i 1.024 punti veri, le frecce a 38% di rumore che cambiano con i pesi, e ogni 1,1 s un
// racconto: un punto vero, la linea arancione che lo sporca passo dopo passo, l'ipotesi bianca della rete, l'errore tratteggiato.
// Sotto (o a sinistra, se la tela è larga) la riga dei passi e la curva dell'errore, come nel pannello. 8.000 passi in 30 s, poi «done».
// Dietro: il bottone «generate» a 20 passi. 300 punti bianchi scendono dal rumore sul piano in 3,2 s, con le frecce di ogni passo.

// I colori della pagina in tema scuro (src/layouts/Base.astro)
const FONDO = '#0a0b0d', FG = '#d9dde3', MUTED = '#7a828d', LINE = '#1c2026', BLU = '#58a6ff', ARANCIO = '#ffa45e';
// Le costanti della pagina
const PIATTO = 0.6, ALTEZZA = 1.1, MAGLIE = 16, GIRO = 0.42, T = 50, TAPPE = [0, 0.1, 0.5, 0.72, 0.88];
const abar = Array.from({ length: T + 1 }, (_, t) => Math.max(1e-3, Math.cos(((t / T + 0.008) / 1.008) * Math.PI / 2) ** 2 / Math.cos((0.008 / 1.008) * Math.PI / 2) ** 2));
const quota = (t: number) => Math.sqrt(1 - abar[t]!);
const LATO = (2 * MONDO) / N_FRECCE, NF = N_FRECCE * N_FRECCE * 2;
// Il ciclo, in ms. Davanti: un attimo prima del clic su «train», il training, poi lo stato «done». Dietro: la discesa, poi «finished»
const PRIMA = 1000, DOPO = 3500, CICLO_DAVANTI = PRIMA + TRAINING.durata + DOPO, FINITO = 2800, CICLO_DIETRO = INFERENCE.durata + FINITO;

export const CARTA_DIFFUSIONE = { carta: '#eef2f7', inchiostro: '#10161f', accento: '#1f6fd1', tagliando: '#dde5ef', fondo: FONDO };

// --- I dati: base64 → byte con segno, una volta sola
const daB64 = (s: string) => { const b = atob(s), a = new Int8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = (b.charCodeAt(i) << 24) >> 24; return a; };
type Decodificati = { dati: Int8Array; frecce: Int8Array; cammini: Int8Array; inizi: number[]; punti: Int8Array; frecceNuovi: Int8Array };
let decodificati: Decodificati | null = null;
const dati = (): Decodificati => {
  if (decodificati) return decodificati;
  // Dove comincia il cammino di ogni racconto: t + 1 punti x/y ciascuno
  const inizi: number[] = [];
  let o = 0;
  for (const r of TRAINING.racconti) { inizi.push(o); o += (r[2]! + 1) * 2; }
  return (decodificati = { dati: daB64(TRAINING.dati), frecce: daB64(TRAINING.frecce), cammini: daB64(TRAINING.cammini), inizi, punti: daB64(INFERENCE.punti), frecceNuovi: daB64(INFERENCE.frecce) });
};

// Lo stato di ogni tela: solo il contesto e il font letto una volta
const stati = new WeakMap<HTMLCanvasElement, { g: CanvasRenderingContext2D; mono: string }>();

// --- Il piano, come piano() della pagina, in un riquadro: in alto resta la riga delle frecce
type Riquadro = { x: number; y: number; w: number; h: number };
type Piano = { S: number; cx: number; cy: number; co: number; si: number };
function piano(r: Riquadro): Piano {
  const S = Math.min(r.w / (2 * MONDO * Math.SQRT2 * 0.92), (r.h - 24) / (2 * MONDO * Math.SQRT2 * PIATTO + ALTEZZA * 1.2));
  return { S, cx: r.x + r.w / 2, cy: r.y + r.h / 2 + 12 + (S * ALTEZZA) / 3, co: Math.cos(GIRO), si: Math.sin(GIRO) };
}
const P = (p: Piano, x: number, y: number, h = 0): [number, number] => [p.cx + p.S * (x * p.co + y * p.si), p.cy - p.S * ((-x * p.si + y * p.co) * PIATTO + h * ALTEZZA)];
const punto = (g: CanvasRenderingContext2D, p: Piano, x: number, y: number, h: number, lato: number) => { const [a, b] = P(p, x, y, h); g.fillRect(a - lato / 2, b - lato / 2, lato, lato); };

function griglia(g: CanvasRenderingContext2D, p: Piano) {
  g.strokeStyle = LINE;
  g.lineWidth = 1;
  g.beginPath();
  for (let k = 0; k <= MAGLIE; k++) {
    const q = -MONDO + (2 * MONDO * k) / MAGLIE;
    let [a, b] = P(p, q, -MONDO); g.moveTo(a, b); [a, b] = P(p, q, MONDO); g.lineTo(a, b);
    [a, b] = P(p, -MONDO, q); g.moveTo(a, b); [a, b] = P(p, MONDO, q); g.lineTo(a, b);
  }
  g.stroke();
}

// Le frecce della rete sul piano, come la pagina: dal centro della maglia verso il punto pulito stimato. Sopra, la riga che le spiega
function frecce(g: CanvasRenderingContext2D, p: Piano, f: Int8Array, o: number, t: number, mono: string, r: Riquadro) {
  g.strokeStyle = MUTED;
  g.lineWidth = 1;
  g.beginPath();
  for (let rr = 0, i = 0; rr < N_FRECCE; rr++) for (let k = 0; k < N_FRECCE; k++, i += 2) {
    const x = -MONDO + (k + 0.5) * LATO, y = -MONDO + (rr + 0.5) * LATO, dx = (f[o + i]! / 127) * LATO, dy = (f[o + i + 1]! / 127) * LATO;
    const [a0, b0] = P(p, x, y), [a1, b1] = P(p, x + dx, y + dy), [a2, b2] = P(p, x + dx * 0.65 - dy * 0.2, y + dy * 0.65 + dx * 0.2), [a3, b3] = P(p, x + dx * 0.65 + dy * 0.2, y + dy * 0.65 - dx * 0.2);
    g.moveTo(a0, b0); g.lineTo(a1, b1); g.lineTo(a2, b2); g.moveTo(a1, b1); g.lineTo(a3, b3);
  }
  g.stroke();
  g.fillStyle = MUTED;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  testo(g, `arrows at ${Math.round(quota(t) * 100)}% noise: where points get sent`, p.cx, r.y + 12, 11, r.w - 8, mono);
}

// Un testo in mono della misura della pagina, più piccolo solo se non ci sta
function testo(g: CanvasRenderingContext2D, s: string, x: number, y: number, px: number, largo: number, mono: string) {
  g.font = `${px}px ${mono}`;
  const w = g.measureText(s).width;
  if (w > largo) g.font = `${Math.max(6, Math.floor((px * largo) / w))}px ${mono}`;
  g.fillText(s, x, y);
}

// Le righe di un testo diviso ai « · », per una colonna stretta
function righe(g: CanvasRenderingContext2D, s: string, largo: number): string[] {
  const pezzi = s.split(' · '), out: string[] = [];
  for (const q of pezzi) {
    const ultima = out[out.length - 1];
    if (ultima !== undefined && g.measureText(`${ultima} · ${q}`).width <= largo) out[out.length - 1] = `${ultima} · ${q}`;
    else out.push(q);
  }
  return out;
}

// --- La curva dell'errore, come disegnaCurva della pagina, in un riquadro alto circa 54 px
function curva(g: CanvasRenderingContext2D, r: Riquadro, storia: number, mono: string) {
  // La misura della pagina (11 px), più piccola se la riga in basso non ci sta accanto allo «0»
  const { x: x0, y: y0, w, h } = r, sotto = `dashed: lowest possible · ${TRAINING.fine / 1000}k steps`;
  g.font = `11px ${mono}`;
  const px = Math.max(6, Math.min(11, Math.floor((11 * w) / (g.measureText(sotto).width * 1.35 + 1)))), sx = Math.round(34 * (px / 11)), giu = h - 16 * (px / 11);
  g.font = `${px}px ${mono}`;
  g.fillStyle = MUTED;
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  g.lineWidth = 1;
  const minimo = TRAINING.minimo, basso = minimo - 0.03, alto = basso + 0.21, y = (v: number) => y0 + 4 + ((alto - Math.min(alto, Math.max(basso, v))) / (alto - basso)) * (giu - 4);
  [alto, minimo].forEach(v => {
    g.fillText(v.toFixed(2), x0 + sx - 4, y(v));
    g.strokeStyle = LINE;
    g.beginPath(); g.moveTo(x0 + sx, y(v)); g.lineTo(x0 + w, y(v)); g.stroke();
  });
  g.textBaseline = 'alphabetic';
  g.fillText(sotto, x0 + w, y0 + h - 2);
  g.textAlign = 'left';
  g.fillText('0', x0 + sx, y0 + h - 2);
  g.strokeStyle = FG;
  g.setLineDash([3, 3]);
  g.beginPath(); g.moveTo(x0 + sx, y(minimo)); g.lineTo(x0 + w, y(minimo)); g.stroke();
  g.setLineDash([]);
  g.strokeStyle = ARANCIO;
  g.beginPath();
  for (let i = 0; i < storia; i++) { const xx = x0 + sx + (((i + 1) * 100) / TRAINING.fine) * (w - sx), yy = y(TRAINING.storia[i]!); if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy); }
  g.stroke();
}

// --- Davanti: il training
function davanti(g: CanvasRenderingContext2D, w: number, h: number, tempo: number, mono: string) {
  const d = dati(), e = (tempo * 1000) % CICLO_DAVANTI - PRIMA, fine = TRAINING.fine;
  // Prima del clic i passi sono 0; dopo la fine restano 8.000 e il racconto sparisce
  const passi = e <= 0 ? 0 : Math.min(fine, Math.floor((e / TRAINING.durata) * fine)), inMoto = e > 0 && passi < fine;
  // Dove stanno il piano e il pannello: a sinistra se la tela è larga, come la pagina sul desktop; sotto se è alta, come sul telefono
  const largo = w / h > 1.5, pw = largo ? Math.round(w * 0.42) : w - 16, ph = largo ? 0 : Math.min(84, Math.round(h * 0.27));
  // Sulla tela alta il piano prende solo l'altezza che gli serve, e piano e pannello stanno insieme al centro
  const serve = 24 + (w / (2 * MONDO * Math.SQRT2 * 0.92)) * (2 * MONDO * Math.SQRT2 * PIATTO + ALTEZZA * 1.2), hp = largo ? h : Math.min(h - ph, serve), su = largo ? 0 : Math.round((h - ph - hp) / 2);
  const rp: Riquadro = largo ? { x: pw + 8, y: 0, w: w - pw - 12, h } : { x: 0, y: su, w, h: hp };
  const p = piano(rp);
  griglia(g, p);
  // Il racconto in corso: uno nuovo ogni 1,1 s, finché il training va
  let ir = -1;
  if (inMoto) for (let i = 0; i < TRAINING.racconti.length && TRAINING.racconti[i]![0]! <= e; i++) ir = i;
  // I dati veri: in training un po' spenti, sotto il racconto
  g.fillStyle = BLU;
  g.globalAlpha = ir >= 0 ? 0.45 : 1;
  const sd = TRAINING.scalaDati;
  for (let i = 0; i < d.dati.length; i += 2) punto(g, p, d.dati[i]! * sd, d.dati[i + 1]! * sd, 0, 2);
  g.globalAlpha = 1;
  // Le frecce: l'ultima istantanea della pagina, dal primo passo in poi
  if (passi > 0) {
    let k = 0;
    while (k + 1 < TRAINING.ms.length && TRAINING.ms[k + 1]! <= e) k++;
    frecce(g, p, d.frecce, k * NF, T_ALLENA, mono, rp);
  }
  if (ir >= 0) racconto(g, p, ir, (e - TRAINING.racconti[ir]![0]!) / TRAINING.racconto, mono);
  // Il pannello: la riga dei passi, poi la curva
  const storia = Math.floor(passi / 100), buoni = passi >= 500 ? TRAINING.buoni[Math.floor(passi / 500) - 1]! : -1;
  const riga = passi ? `${passi.toLocaleString('en')} steps${storia ? ` · error ${TRAINING.storia[storia - 1]!.toFixed(2)}` : ''}${buoni >= 0 ? ` · on shape ${buoni}%` : ''}` : '';
  const px = Math.max(8, Math.min(12, Math.round(pw / 26))), alto = Math.min(54, largo ? h * 0.4 : ph - px - 10);
  g.font = `${px}px ${mono}`;
  const linee = riga ? righe(g, riga, pw) : [], blocco = Math.max(1, largo ? 2 : 1) * (px + 4) + 4 + alto;
  const x0 = 8, y0 = largo ? Math.round((h - blocco) / 2) : su + hp + 2;
  g.fillStyle = MUTED;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  linee.forEach((l, i) => g.fillText(l, x0, y0 + px + i * (px + 4)));
  curva(g, { x: x0, y: y0 + blocco - alto, w: pw, h: alto }, storia, mono);
}

// Un racconto, come la pagina: f va da 0 a 1 in 1,1 s
function racconto(g: CanvasRenderingContext2D, p: Piano, ir: number, f0: number, mono: string) {
  const d = dati(), [, iv, t, gxm, gym, errore] = TRAINING.racconti[ir]!, sc = TRAINING.scalaCammino, o = d.inizi[ir]!;
  const f = Math.min(1, f0), visti = Math.round(Math.min(1, Math.max(0, (f - TAPPE[1]!) / (TAPPE[2]! - TAPPE[1]!))) * t!);
  const sd = TRAINING.scalaDati, [vx, vy] = P(p, d.dati[iv! * 2]! * sd, d.dati[iv! * 2 + 1]! * sd);
  // Il punto vero
  g.strokeStyle = FG;
  g.lineWidth = 2;
  g.beginPath(); g.ellipse(vx, vy, 7, 7 * PIATTO, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1.5;
  // Il rumore, un passo dopo l'altro: ogni passo sale un po'
  g.strokeStyle = ARANCIO;
  g.beginPath();
  for (let k = 0; k <= visti; k++) { const [a, b] = P(p, d.cammini[o + k * 2]! * sc, d.cammini[o + k * 2 + 1]! * sc, quota(k)); if (k) g.lineTo(a, b); else g.moveTo(a, b); }
  g.stroke();
  const qxm = d.cammini[o + visti * 2]! * sc, qym = d.cammini[o + visti * 2 + 1]! * sc, [qx, qy] = P(p, qxm, qym, quota(visti));
  // L'ombra rende leggibile quanto è alto
  g.fillStyle = MUTED;
  g.globalAlpha = 0.6;
  punto(g, p, qxm, qym, 0, 4);
  g.globalAlpha = 1;
  g.fillStyle = ARANCIO;
  g.fillRect(qx - 3, qy - 3, 6, 6);
  // L'ipotesi della rete: dove crede che fosse il punto pulito, sul piano
  if (f >= TAPPE[2]!) {
    const u = Math.min(1, (f - TAPPE[2]!) / (TAPPE[3]! - TAPPE[2]!)), [gx, gy] = P(p, gxm!, gym!), ex = qx + (gx - qx) * u, ey = qy + (gy - qy) * u;
    g.strokeStyle = FG;
    g.beginPath(); g.moveTo(qx, qy); g.lineTo(ex, ey); g.stroke();
    g.fillStyle = FG;
    g.fillRect(ex - 3, ey - 3, 6, 6);
    // La distanza dal punto vero è l'errore
    if (f >= TAPPE[3]!) {
      g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(gx, gy); g.lineTo(vx, vy); g.stroke();
      g.setLineDash([]);
      g.font = `12px ${mono}`;
      g.textAlign = 'left';
      g.textBaseline = 'alphabetic';
      g.fillText(`error ${errore!.toFixed(2)}`, (gx + vx) / 2 + 8, (gy + vy) / 2 - 8);
    }
  }
  g.lineWidth = 1;
}

// --- Dietro: l'inference
function dietro(g: CanvasRenderingContext2D, w: number, h: number, tempo: number, mono: string) {
  const d = dati(), e = (tempo * 1000) % CICLO_DIETRO, { n, passi: np, durata, tempi, quote, scale } = INFERENCE, sale = e < durata;
  const px = Math.max(8, Math.min(12, Math.round(w / 30))), rp: Riquadro = { x: 0, y: 0, w, h: h - px - 8 }, p = piano(rp);
  griglia(g, p);
  // Come la pagina: al passo k i punti vanno dal fotogramma k − 1 al fotogramma k, in 3,2 s / 20 ciascuno. A fine discesa restano fermi
  const k = sale ? Math.min(np, Math.floor((e / durata) * np) + 1) : np, u = sale ? Math.min(1, Math.max(0, (e / durata) * np - (k - 1))) : 1;
  const hh = sale ? quote[k - 1]! + (quote[k]! - quote[k - 1]!) * u : 0;
  // Le frecce al livello del passo: dopo l'ultimo passo restano quelle di prima, poi spariscono
  if (sale) { const a = Math.min(k, np - 1); frecce(g, p, d.frecceNuovi, a * NF, tempi[a]!, mono, rp); }
  g.fillStyle = FG;
  const o0 = (k - 1) * n * 2, o1 = k * n * 2, s0 = scale[k - 1]!, s1 = scale[k]!;
  for (let i = 0; i < n * 2; i += 2) {
    const ax = d.punti[o0 + i]! * s0, ay = d.punti[o0 + i + 1]! * s0;
    punto(g, p, ax + (d.punti[o1 + i]! * s1 - ax) * u, ay + (d.punti[o1 + i + 1]! * s1 - ay) * u, hh, 3);
  }
  // La lettura della pagina sotto «generate»
  g.fillStyle = FG;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  testo(g, sale ? `step ${k} of ${np} · ${Math.round(quote[k]! * 100)}% noise left` : 'finished', w / 2, h - 6, px, w - 16, mono);
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
  g.lineJoin = 'miter';
  g.lineCap = 'butt';
  if (retro) dietro(g, w, h, tempo, mono);
  else davanti(g, w, h, tempo, mono);
}
