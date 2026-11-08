import { DATI_RETE } from './arteReteDati';

// Arte «rete» dei biglietti di AI terms: la griglia a filo della pagina /learn/neural-network, con la rete più grande (4 strati da 6 neuroni).
// Davanti la rete impara la casa, dietro il pesce. Il biglietto non allena: scripts/registra-rete.mjs ha registrato poche fotografie
// dell'allenamento, e qui si passa dall'una all'altra. La griglia parte quasi piatta, prende la forma, resta ferma, poi si scioglie e riparte.
// Intanto il terreno gira piano. Il disegno è quello della pagina: una striscia alla volta, dal fondo verso chi guarda.

// I colori del tema scuro della pagina (src/layouts/Base.astro)
const FONDO = '#0a0b0d', LINEA = '#1c2026', SPENTO = '#7a828d', ARANCIO = '#ffa45e', BLU = '#58a6ff';

// La carta intorno all'arte: chiara come un biglietto vero, inchiostro blu notte, accento arancio come le maglie alte
export const CARTA_RETE = { carta: '#f2efe8', inchiostro: '#15202e', accento: '#d9661f', tagliando: '#e7e2d6', fondo: FONDO };

// Tempi del giro, in secondi: ogni fotografia, la forma ferma, lo scioglimento
const PER_FOTO = 0.5, FERMO = 3.6, SCIOGLIE = 1.6;

const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };
const misto = (a: string, b: string, t: number) => { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i]! - v) * t)).join(',')})`; };
// Sette tinte, dal grigio delle maglie basse all'arancio delle maglie alte: come TINTE nella pagina
const TINTE = Array.from({ length: 7 }, (_, k) => misto(misto(LINEA, SPENTO, 0.55), ARANCIO, k / 6));

// --- Le sagome, le stesse della pagina: servono solo per il filo blu del bordo
const triangolo = (x: number, y: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
  const lato = (px: number, py: number, qx: number, qy: number) => (x - qx) * (py - qy) - (px - qx) * (y - qy);
  const d1 = lato(ax, ay, bx, by), d2 = lato(bx, by, cx, cy), d3 = lato(cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
const SAGOME = {
  fish: (x: number, y: number) => ((x + 0.18) / 0.58) ** 2 + (y / 0.3) ** 2 < 1
    || triangolo(x, y, 0.3, 0, 0.88, 0.5, 0.62, 0) || triangolo(x, y, 0.3, 0, 0.88, -0.5, 0.62, 0)
    || triangolo(x, y, -0.45, 0.22, 0.05, 0.22, -0.28, 0.66) || triangolo(x, y, -0.2, -0.22, 0.1, -0.22, 0.04, -0.58),
  house: (x: number, y: number) => triangolo(x, y, -0.85, 0.08, 0.85, 0.08, 0, 0.88) || (Math.abs(x) < 0.6 && y <= 0.08 && y > -0.85 && !(Math.abs(x) < 0.17 && y < -0.3)),
};
type Nome = keyof typeof SAGOME;

// Bordo della sagoma sulla griglia 32×32 della pagina: i lati delle celle piene che toccano una vuota
function bordoDi(nome: Nome) {
  const G = 32, f = SAGOME[nome], posto = (k: number) => ((k + 0.5) / G) * 2 - 1, bordo: number[] = [];
  const pieno = (r: number, q: number) => r >= 0 && q >= 0 && r < G && q < G && f(posto(q), -posto(r));
  const lato = (a: number, b: number, c: number, d: number) => bordo.push(-1 + (2 * a) / G, 1 - (2 * b) / G, -1 + (2 * c) / G, 1 - (2 * d) / G);
  for (let r = 0; r < G; r++) for (let q = 0; q < G; q++) {
    if (!pieno(r, q)) continue;
    if (!pieno(r - 1, q)) lato(q, r, q + 1, r);
    if (!pieno(r + 1, q)) lato(q, r + 1, q + 1, r + 1);
    if (!pieno(r, q - 1)) lato(q, r, q, r + 1);
    if (!pieno(r, q + 1)) lato(q + 1, r, q + 1, r + 1);
  }
  return Float32Array.from(bordo);
}

// --- Le registrazioni: si leggono una volta sola, alla prima chiamata
type Registrazione = { maglie: number; foto: number; punti: number; dati: Uint8Array; bordo: Float32Array };
const registrazioni = new Map<Nome, Registrazione>();
function registrazione(nome: Nome): Registrazione {
  let r = registrazioni.get(nome);
  if (!r) {
    const q = DATI_RETE[nome], testo = atob(q.dati), dati = new Uint8Array(testo.length);
    for (let k = 0; k < testo.length; k++) dati[k] = testo.charCodeAt(k);
    r = { maglie: q.maglie, foto: q.foto, punti: (q.maglie + 1) ** 2, dati, bordo: bordoDi(nome) };
    registrazioni.set(nome, r);
  }
  return r;
}

// Stato di ogni tela: le altezze del momento e i punti già proiettati
type Stato = { altezze: Float32Array; sx: Float32Array; sy: Float32Array };
const stati = new WeakMap<HTMLCanvasElement, Stato>();

const morbido = (v: number) => { const q = Math.max(0, Math.min(1, v)); return q * q * (3 - 2 * q); };

// Le altezze al tempo t del giro: l'allenamento a velocità fissa, la forma ferma, poi lo scioglimento verso la prima fotografia
function altezzeAl(r: Registrazione, t: number, fuori: Float32Array) {
  const impara = (r.foto - 1) * PER_FOTO, giro = impara + FERMO + SCIOGLIE, q = ((t % giro) + giro) % giro;
  let a: number, b: number, f: number;
  if (q < impara) { const p = q / PER_FOTO; a = Math.floor(p); b = Math.min(r.foto - 1, a + 1); f = p - a; }
  else if (q < impara + FERMO) { a = b = r.foto - 1; f = 0; }
  else { a = r.foto - 1; b = 0; f = morbido((q - impara - FERMO) / SCIOGLIE); }
  const A = a * r.punti, B = b * r.punti, d = r.dati;
  for (let k = 0; k < r.punti; k++) fuori[k] = (d[A + k]! + (d[B + k]! - d[A + k]!) * f) / 255;
}

export function disegnaRete(c: HTMLCanvasElement, tempo: number, retro: boolean): void {
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const W = c.width, H = c.height;
  const r = registrazione(retro ? 'fish' : 'house'), M = r.maglie;
  let s = stati.get(c);
  if (!s || s.altezze.length !== r.punti) {
    s = { altezze: new Float32Array(r.punti), sx: new Float32Array(r.punti), sy: new Float32Array(r.punti) };
    stati.set(c, s);
  }
  const { altezze, sx, sy } = s;
  // Il davanti e il retro non vanno a tempo insieme: il retro è avanti di qualche secondo
  altezzeAl(r, tempo + (retro ? 5 : 0), altezze);

  // dpr: la tela è già misurata in pixel del dispositivo
  const dpr = c.clientWidth ? c.width / c.clientWidth : Math.min(2, devicePixelRatio || 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, W, H);
  if (W < 4 || H < 4) return;

  // Inquadratura: in una colonna stretta la griglia si guarda più dall'alto, in un riquadro largo più di lato e più grande
  const alta = H > W * 0.9, PIATTO = alta ? 0.6 : 0.42, ALTEZZA = alta ? 0.68 : 0.6, margine = 0.06;
  // Il retro avvicina il pesce: gli angoli del pavimento, vuoti, possono uscire dal riquadro
  const S = Math.min(W / (2 * Math.SQRT2 + 2 * margine), H / (2 * Math.SQRT2 * PIATTO + ALTEZZA + 2 * margine)) * (retro ? 1.08 : 1);
  const cx = W / 2, cy = H / 2 + (S * ALTEZZA) / 2;
  const giro = (retro ? 2.1 : 0.55) + tempo * (retro ? 0.13 : 0.16), co = Math.cos(giro), si = Math.sin(giro);
  const proietta = (u: number, v: number, h: number) => [cx + S * (u * co + v * si), cy - S * (-u * si + v * co) * PIATTO - S * h * ALTEZZA] as const;

  for (let j = 0; j <= M; j++) for (let i = 0; i <= M; i++) {
    const u = -1 + (2 * i) / M, v = 1 - (2 * j) / M, k = j * (M + 1) + i;
    sx[k] = cx + S * (u * co + v * si);
    sy[k] = cy - S * (-u * si + v * co) * PIATTO - S * altezze[k]! * ALTEZZA;
  }

  // Dal fondo verso chi guarda, una striscia alla volta: ogni striscia copre quelle dietro, così il filo si legge.
  // Come nella pagina, ma ogni striscia traccia solo il suo lato lontano e i lati di traverso: il lato vicino è il lato lontano
  // della striscia dopo, che lo traccia sopra il suo fondo. Metà dei tratti, senza giunture: il disegno costa circa la metà
  const perRighe = Math.abs(co) >= Math.abs(si), crescente = perRighe ? co >= 0 : si >= 0;
  const punto = (a: number, b: number) => (perRighe ? b * (M + 1) + a : a * (M + 1) + b);
  const tinta = (a: number, b: number) => Math.round(((altezze[punto(a, b)]! + altezze[punto(a + 1, b)]! + altezze[punto(a + 1, b + 1)]! + altezze[punto(a, b + 1)]!) / 4) * 6);
  const tinte = new Uint8Array(M);
  const tratto = (p: number, q: number) => { ctx.moveTo(sx[p]!, sy[p]!); ctx.lineTo(sx[q]!, sy[q]!); };
  ctx.lineWidth = dpr;
  for (let n = 0; n < M; n++) {
    const b = crescente ? n : M - 1 - n, lontano = crescente ? b : b + 1, vicino = crescente ? b + 1 : b, ultima = n === M - 1;
    ctx.fillStyle = FONDO;
    ctx.beginPath();
    ctx.moveTo(sx[punto(0, b)]!, sy[punto(0, b)]!);
    for (let a = 1; a <= M; a++) ctx.lineTo(sx[punto(a, b)]!, sy[punto(a, b)]!);
    for (let a = M; a >= 0; a--) ctx.lineTo(sx[punto(a, b + 1)]!, sy[punto(a, b + 1)]!);
    ctx.closePath();
    ctx.fill();
    for (let a = 0; a < M; a++) tinte[a] = tinta(a, b);
    for (let k = 0; k < TINTE.length; k++) {
      let vuota = true;
      for (let a = 0; a <= M; a++) {
        const qui = tinte[Math.min(a, M - 1)] === k;
        if (!qui && !(a < M && tinte[a] === k)) continue;
        if (vuota) { ctx.beginPath(); vuota = false; }
        if (qui) tratto(punto(a, b), punto(a, b + 1));
        if (a < M && tinte[a] === k) {
          tratto(punto(a, lontano), punto(a + 1, lontano));
          if (ultima) tratto(punto(a, vicino), punto(a + 1, vicino));
        }
      }
      if (!vuota) { ctx.strokeStyle = TINTE[k]!; ctx.stroke(); }
    }
  }

  // La sagoma da raggiungere: un filo blu all'altezza piena, come nella pagina
  ctx.strokeStyle = BLU;
  ctx.lineWidth = 1.5 * dpr;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const bordo = r.bordo;
  for (let k = 0; k < bordo.length; k += 4) {
    const [ax, ay] = proietta(bordo[k]!, bordo[k + 1]!, 1), [bx, by] = proietta(bordo[k + 2]!, bordo[k + 3]!, 1);
    ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
  }
  ctx.stroke();
}
