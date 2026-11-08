// L'arte "gregge" del biglietto di AI terms: una partita delle due policy finali (tappa 4M) di /learn/reinforcement/,
// con la stessa grafica della pagina (isometria, pecore chiare che diventano blu nel cerchio, cane arancio, cerchio tratteggiato).
// Qui non gira né la rete né la simulazione: si rileggono i fotogrammi registrati da scripts/registra-gregge.ts e si interpolano.
// Davanti: la policy 2 con la telecamera vicina al cane, come «follow the dog» nella home di Learn: si vede bene quello che
// il cane legge (le celle delle mappe e le linee tratteggiate arancio).
// Dietro: una clip vera di «follow the dog» nella home di Learn (src/scripts/nuvole.ts) come si vede da telefono, con i pixel
// grossi della densità 1. La registra scripts/registra-cane-segui.mjs in public/learn/biglietti/. Finché il video non ha
// fotogrammi, dietro si disegna la stessa vista del davanti.
import { GREGGE_RUN } from '../data/gregge-run';
import { L, LATO_MAPPA, OSTACOLI, PECORE } from '../lib/gregge';
import { disegnaTestaCane } from './testaCane';

// I colori del tema scuro della pagina (src/layouts/Base.astro)
const FG = '#d9dde3', MUTED = '#7a828d', LINE = '#232830', ARANCIO = '#ffa45e', BLU = '#58a6ff', FONDO = '#0a0b0d';
export const CARTA_GREGGE = { carta: '#f3f0e9', inchiostro: '#16191e', accento: '#c45f17', tagliando: '#e7e2d7', fondo: FONDO };

const MONO = "'Departure Mono', ui-monospace, monospace";
const K = Math.SQRT1_2, PAUSA_RETRO = 1.2, ENTRA = 0.5, ESCE = 0.8, TITOLO = 14;
const orologio = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// --- Le partite decodificate: posizioni di tutti i fotogrammi, direzione letta dalla policy 2, e la telecamera già lisciata
type Corsa = { nome: string; F: number; n: number; pos: Float32Array; ang: Float32Array | null; gx: number; gz: number; durata: number; vicina: Float32Array };
let corse: Corsa[] | null = null;
function decodifica(): Corsa[] {
  if (corse) return corse;
  const { fps, q } = GREGGE_RUN;
  corse = GREGGE_RUN.corse.map(c => {
    const b = Uint8Array.from(atob(c.dati), ch => ch.charCodeAt(0)), dv = new DataView(b.buffer), F = c.fotogrammi;
    const n = Math.floor((b.length - (c.angolo ? F : 0)) / (4 + F - 1)), pos = new Float32Array(F * n * 2);
    const rx = new Int32Array(n), rz = new Int32Array(n);
    let k = 0;
    for (let i = 0; i < n; i++) { rx[i] = dv.getInt16(k, true); rz[i] = dv.getInt16(k + 2, true); k += 4; }
    const nib = (v: number) => (v & 8 ? v - 16 : v);
    for (let f = 0; f < F; f++) {
      for (let i = 0; i < n; i++) {
        if (f) { const v = b[k++]!; rx[i] = rx[i]! + nib(v >> 4); rz[i] = rz[i]! + nib(v & 15); }
        pos[(f * n + i) * 2] = rx[i]! * q; pos[(f * n + i) * 2 + 1] = rz[i]! * q;
      }
    }
    let ang: Float32Array | null = null;
    if (c.angolo) { ang = new Float32Array(F); for (let f = 0; f < F; f++) ang[f] = (b[k++]! / 255) * Math.PI * 2 - Math.PI; }
    return { nome: c.nome, F, n, pos, ang, gx: c.gx, gz: c.gz, durata: (F - 1) / fps, vicina: telecameraCane(pos, F, n, c.gx, c.gz) };
  });
  return corse;
}

// La telecamera vicina, come «follow the dog» nella home (src/scripts/nuvole.ts): guarda fra il cane e il centro del gregge fuori dal cerchio,
// e si allarga quanto basta per il gregge e il cane, fra 1,8 e 4 unità di raggio. Poi una media di 2 s, perché si muova piano.
// Il risultato: per fotogramma centro e mezzi lati in unità isometriche.
function telecameraCane(pos: Float32Array, F: number, n: number, gx: number, gz: number) {
  const grezzo = new Float32Array(F * 3), cam = new Float32Array(F * 4), A = 20;
  for (let f = 0; f < F; f++) {
    const cx = pos[f * n * 2]!, cz = pos[f * n * 2 + 1]!, raggio = GREGGE_RUN.raggio;
    let mx = 0, mz = 0, nf = 0;
    for (let i = 1; i <= PECORE; i++) { const x = pos[(f * n + i) * 2]!, z = pos[(f * n + i) * 2 + 1]!; if (Math.hypot(x - gx, z - gz) >= raggio) { mx += x; mz += z; nf++; } }
    if (nf) { mx /= nf; mz /= nf; } else { mx = gx; mz = gz; }
    let lontana = 0;
    for (let i = 1; i <= PECORE; i++) { const x = pos[(f * n + i) * 2]!, z = pos[(f * n + i) * 2 + 1]!; if (!nf || Math.hypot(x - gx, z - gz) >= raggio) lontana = Math.max(lontana, Math.hypot(x - mx, z - mz)); }
    const tx = cx * 0.55 + mx * 0.45, tz = cz * 0.55 + mz * 0.45, r = Math.min(4, Math.max(1.8, lontana * 0.45 + Math.hypot(cx - mx, cz - mz) * 0.4 + 0.6));
    grezzo.set([tx, tz, r], f * 3);
  }
  for (let f = 0; f < F; f++) {
    let x = 0, z = 0, r = 0, w = 0;
    for (let g = Math.max(0, f - A); g <= Math.min(F - 1, f + A); g++) { x += grezzo[g * 3]!; z += grezzo[g * 3 + 1]!; r += grezzo[g * 3 + 2]!; w++; }
    x /= w; z /= w; r /= w;
    cam.set([(x - z) * K, (x + z) * K * 0.5, r, r * 0.5], f * 4);
  }
  return cam;
}

// --- Lo stato di ogni tela: le posizioni del fotogramma interpolato, riusate a ogni disegno
type Stato = { xs: Float32Array; zs: Float32Array; ordine: Int32Array; chiavi: Float32Array };
const statiTela = new WeakMap<HTMLCanvasElement, Stato>();
const N_COSE = 1 + PECORE + 14 + OSTACOLI.length;

// Le posizioni al tempo t della partita, fra due fotogrammi
function interpola(k: Corsa, t: number, s: Stato) {
  const u = Math.min(k.F - 1, Math.max(0, t * GREGGE_RUN.fps)), f0 = Math.floor(u), f1 = Math.min(k.F - 1, f0 + 1), a = u - f0;
  for (let i = 0; i < k.n; i++) {
    const p = (f0 * k.n + i) * 2, r = (f1 * k.n + i) * 2;
    s.xs[i] = k.pos[p]! + (k.pos[r]! - k.pos[p]!) * a;
    s.zs[i] = k.pos[p + 1]! + (k.pos[r + 1]! - k.pos[p + 1]!) * a;
  }
  const c = k.vicina, q = f0 * 4, w = f1 * 4;
  return { f0, cam: [0, 1, 2, 3].map(j => c[q + j]! + (c[w + j]! - c[q + j]!) * a) as [number, number, number, number] };
}

type Vista = { S: number; ox: number; oy: number };
// Un prato: suolo, griglia, mappe della policy 2, cerchio, linee di quello che il cane legge, poi tutto il resto in ordine di profondità
function disegnaPrato(g: CanvasRenderingContext2D, d: number, k: Corsa, s: Stato, f0: number, t: number, v: Vista, scritte: { x: number; y: number; w: number }, nome: string) {
  const { S, ox, oy } = v, raggio = GREGGE_RUN.raggio, xs = s.xs, zs = s.zs;
  const sx = (x: number, z: number) => ox + (x - z) * S * K, sy = (x: number, z: number, h = 0) => oy + (x + z) * S * K * 0.5 - h * S * 0.8;
  const suolo = () => g.setTransform(d * S * K, d * S * K * 0.5, -d * S * K, d * S * K * 0.5, d * ox, d * oy);
  const schermo = () => g.setTransform(d, 0, 0, d, 0, 0);
  const px = 1 / (S * K), mi = Math.max(0.7, Math.min(1.4, S / 30));
  let dentro = 0;
  for (let i = 1; i <= PECORE; i++) if (Math.hypot(xs[i]! - k.gx, zs[i]! - k.gz) < raggio) dentro++;

  // Lo spessore del prato, come una zolla
  schermo();
  g.strokeStyle = LINE; g.lineWidth = 1;
  const zolla = S * 0.35;
  g.beginPath(); g.ellipse(ox, oy + zolla, L * S, L * S * 0.5, 0, 0, Math.PI); g.moveTo(ox - L * S, oy); g.lineTo(ox - L * S, oy + zolla); g.moveTo(ox + L * S, oy); g.lineTo(ox + L * S, oy + zolla); g.stroke();
  suolo();
  g.lineWidth = px;
  g.save();
  g.beginPath(); g.arc(0, 0, L, 0, Math.PI * 2); g.clip();
  g.strokeStyle = LINE;
  g.beginPath();
  for (let a = -L; a <= L; a += 2) { g.moveTo(a, -L); g.lineTo(a, L); g.moveTo(-L, a); g.lineTo(L, a); }
  g.stroke();
  // Le due mappe che legge la policy 2, intorno al cane: arancio le pecore fuori, blu quelle dentro
  if (k.ang) {
    const an = k.ang[f0]!, u = [Math.cos(an), Math.sin(an)] as const, w = [-u[1], u[0]] as const, m0 = LATO_MAPPA / 2, conte = new Float32Array(LATO_MAPPA * LATO_MAPPA);
    const cx = xs[0]!, cz = zs[0]!, angolo = (a: number, b: number) => [cx + (a - m0) * u[0] + (b - m0) * w[0], cz + (a - m0) * u[1] + (b - m0) * w[1]] as const;
    for (const blu of [false, true]) {
      conte.fill(0);
      for (let i = 1; i <= PECORE; i++) {
        if ((Math.hypot(xs[i]! - k.gx, zs[i]! - k.gz) < raggio) !== blu) continue;
        const dx = xs[i]! - cx, dz = zs[i]! - cz;
        const a = Math.max(0, Math.min(LATO_MAPPA - 1, Math.floor(dx * u[0] + dz * u[1] + m0))), b = Math.max(0, Math.min(LATO_MAPPA - 1, Math.floor(dx * w[0] + dz * w[1] + m0)));
        conte[a * LATO_MAPPA + b]! += 1;
      }
      g.fillStyle = blu ? BLU : ARANCIO;
      for (let a = 0; a < LATO_MAPPA; a++) for (let b = 0; b < LATO_MAPPA; b++) {
        const n = conte[a * LATO_MAPPA + b]!;
        if (!n) continue;
        g.globalAlpha = Math.min(0.55, 0.14 + n * 0.03);
        g.beginPath(); g.moveTo(...angolo(a, b)); g.lineTo(...angolo(a + 1, b)); g.lineTo(...angolo(a + 1, b + 1)); g.lineTo(...angolo(a, b + 1)); g.closePath(); g.fill();
      }
    }
    g.globalAlpha = 1;
  }
  g.restore();
  g.lineWidth = px;
  g.strokeStyle = LINE;
  g.beginPath(); g.arc(0, 0, L, 0, Math.PI * 2); g.stroke();
  g.setLineDash([4 * px, 4 * px]);
  g.strokeStyle = MUTED;
  g.beginPath(); g.arc(k.gx, k.gz, raggio, 0, Math.PI * 2); g.stroke();
  g.setLineDash([]);
  g.strokeStyle = FG;
  g.lineWidth = 2 * px;
  g.beginPath(); g.arc(k.gx, k.gz, raggio, -Math.PI / 2, -Math.PI / 2 + (dentro / PECORE) * Math.PI * 2); g.stroke();
  g.lineWidth = px;
  // Il centro del gregge fuori dal cerchio e la pecora più lontana: i numeri che leggono tutte e due
  let cxG = 0, czG = 0, nf = 0, far = -1, fd = -1;
  for (let i = 1; i <= PECORE; i++) if (Math.hypot(xs[i]! - k.gx, zs[i]! - k.gz) >= raggio) { cxG += xs[i]!; czG += zs[i]!; nf++; }
  if (nf) {
    cxG /= nf; czG /= nf;
    for (let i = 1; i <= PECORE; i++) if (Math.hypot(xs[i]! - k.gx, zs[i]! - k.gz) >= raggio) { const q = (xs[i]! - cxG) ** 2 + (zs[i]! - czG) ** 2; if (q > fd) { fd = q; far = i; } }
    g.strokeStyle = ARANCIO;
    g.setLineDash([3 * px, 3 * px]);
    g.beginPath(); g.moveTo(xs[0]!, zs[0]!); g.lineTo(cxG, czG); g.moveTo(cxG, czG); g.lineTo(xs[far]!, zs[far]!); g.stroke();
    g.setLineDash([]);
    g.fillStyle = ARANCIO;
    g.beginPath(); g.arc(cxG, czG, 3 * px, 0, Math.PI * 2); g.fill();
  }
  // L'ombra del cane
  g.fillStyle = LINE;
  g.beginPath(); g.arc(xs[0]!, zs[0]!, 0.16, 0, Math.PI * 2); g.fill();
  schermo();

  // In ordine di profondità: ostacoli, mucche, pecore e cane. Gli indici: 0 cane, 1..180 pecore, poi mucche, poi ostacoli
  const nm = k.n - 1 - PECORE, tot = k.n + OSTACOLI.length;
  for (let i = 0; i < tot; i++) {
    s.ordine[i] = i;
    s.chiavi[i] = i < k.n ? xs[i]! + zs[i]! + (i === 0 ? 0.01 : 0) : OSTACOLI[i - k.n]!.x + OSTACOLI[i - k.n]!.z;
  }
  const ord = s.ordine.subarray(0, tot).sort((a, b) => s.chiavi[a]! - s.chiavi[b]!);
  const lato = Math.max(2, S * 0.11);
  g.lineWidth = 1;
  // Le pecore vicine nell'ordine e dello stesso colore finiscono in un solo tracciato: molti meno fill a ogni fotogramma
  let aperto = '';
  const chiudi = () => { if (aperto) { g.fillStyle = aperto; g.fill(); aperto = ''; } };
  for (const i of ord) {
    if (i >= 1 && i <= PECORE) {
      const x = xs[i]!, z = zs[i]!, colore = Math.hypot(x - k.gx, z - k.gz) >= raggio ? FG : BLU, X = sx(x, z), Y = sy(x, z, 0.07);
      if (colore !== aperto) { chiudi(); aperto = colore; g.beginPath(); }
      g.moveTo(X + lato * 0.62, Y); g.ellipse(X, Y, lato * 0.62, lato * 0.42, 0, 0, Math.PI * 2);
      continue;
    }
    chiudi();
    if (i === 0) {
      // Il cane: la testa di cucciolo in pixel art, più grande quando la telecamera è vicina
      const X = sx(xs[0]!, zs[0]!), Y = sy(xs[0]!, zs[0]!, 0.12);
      disegnaTestaCane(g, X, Y + 2 * mi, Math.min(2.5, Math.max(1, S / 30)), d, ARANCIO, FONDO);
    } else if (i <= PECORE + nm) {
      const X = sx(xs[i]!, zs[i]!), Y = sy(xs[i]!, zs[i]!, 0.12);
      g.fillStyle = MUTED; g.fillRect(X - 3 * mi, Y - 2 * mi, 6 * mi, 4 * mi);
    } else {
      const o = OSTACOLI[i - k.n]!, X = sx(o.x, o.z), Y = sy(o.x, o.z), alto = (0.25 + o.r) * S * 0.8;
      g.strokeStyle = MUTED;
      g.beginPath(); g.moveTo(X, Y); g.lineTo(X, Y - alto); g.stroke();
      g.beginPath(); g.ellipse(X, Y - alto, Math.max(1.5, o.r * S * 0.8), Math.max(1, o.r * S * 0.5), 0, 0, Math.PI * 2); g.stroke();
    }
  }
  chiudi();

  // Le scritte della pagina: chi gioca, e quante pecore sono dentro con il tempo
  const finita = t >= k.durata && dentro === PECORE;
  const fascia = g.createLinearGradient(0, scritte.y - 16, 0, scritte.y + 10);
  fascia.addColorStop(0, FONDO); fascia.addColorStop(0.6, FONDO + 'd0'); fascia.addColorStop(1, FONDO + '00');
  g.fillStyle = fascia;
  g.fillRect(scritte.x - 8, scritte.y - 16, scritte.w + 16, 26);
  g.font = `9px ${MONO}`;
  g.textBaseline = 'alphabetic';
  g.fillStyle = FG;
  g.textAlign = 'left';
  g.fillText(nome, scritte.x, scritte.y);
  g.textAlign = 'right';
  g.fillStyle = finita ? BLU : FG;
  g.fillText(`${dentro}/${PECORE} · ${orologio(Math.min(t, k.durata))}${finita ? ' · done' : ''}`, scritte.x + scritte.w, scritte.y);
}

// --- Il video del retro: uno solo per tutte le tele, creato alla prima richiesta, muto e in loop
const CLIP = '/learn/biglietti/cane-segui.mp4';
let video: HTMLVideoElement | null = null;
function clip(): HTMLVideoElement | null {
  if (typeof document === 'undefined') return null;
  if (!video) {
    video = document.createElement('video');
    video.muted = true; video.loop = true; video.playsInline = true; video.autoplay = true; video.preload = 'auto';
    video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
    video.src = CLIP;
    video.play().catch(() => { /* lo riprova il prossimo disegno */ });
  } else if (video.paused && video.readyState >= 2) video.play().catch(() => { /* niente */ });
  return video.readyState >= 2 && video.videoWidth ? video : null;
}

// Il retro: il video a tutta tela (taglio «cover»), ingrandito senza sfumare. Niente scritte: è il poster del retro
// Il video ha ogni pixel del telefono in 2×2 (PIXEL_CLIP): se basta tagliare un po' di più (fino a 1,3 volte), ogni pixel del
// telefono diventa un quadrato intero di pixel della tela, tutti uguali; altrimenti la scala resta quella giusta per coprire
const PIXEL_CLIP = 2;
function disegnaClip(g: CanvasRenderingContext2D, c: HTMLCanvasElement, v: HTMLVideoElement) {
  const copre = Math.max(c.width / v.videoWidth, c.height / v.videoHeight) * PIXEL_CLIP, intero = Math.ceil(copre - 1e-6);
  const scala = (intero / copre <= 1.3 ? intero : copre) / PIXEL_CLIP, w = v.videoWidth * scala, h = v.videoHeight * scala;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = false;
  g.drawImage(v, (c.width - w) / 2, (c.height - h) / 2, w, h);
  g.imageSmoothingEnabled = true;
}

export function disegnaGregge(c: HTMLCanvasElement, tempo: number, retro: boolean): void {
  const g = c.getContext('2d');
  if (!g || !c.width || !c.height) return;
  const d = c.clientWidth ? c.width / c.clientWidth : Math.min(2, devicePixelRatio || 1), W = c.width / d, H = c.height / d;
  // Dietro: la clip, appena ha un fotogramma
  const v = retro ? clip() : null;
  if (v) { disegnaClip(g, c, v); return; }
  const tutte = decodifica();
  let s = statiTela.get(c);
  if (!s) { s = { xs: new Float32Array(1 + PECORE + 32), zs: new Float32Array(1 + PECORE + 32), ordine: new Int32Array(N_COSE + 32), chiavi: new Float32Array(N_COSE + 32) }; statiTela.set(c, s); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.fillStyle = FONDO;
  g.fillRect(0, 0, c.width, c.height);

  // La policy 2 con la telecamera vicina al cane: la scala la decide la telecamera, fino a 7 volte il prato intero
  const k = tutte[1]!, ciclo = k.durata + PAUSA_RETRO, t = ((tempo % ciclo) + ciclo) % ciclo;
  const r = { x: 0, y: 0, w: W, h: H }, pad = 8, { f0, cam } = interpola(k, t, s), alto = r.h - TITOLO - pad * 2, largo = r.w - pad * 2;
  const minimo = Math.min(largo / (2 * L + 0.6), alto / (L + 1.2));
  const S = Math.max(minimo, Math.min(minimo * 7, largo / (2 * cam[2] + 0.6), alto / (2 * cam[3] + 1.2)));
  const vista = { S, ox: r.x + r.w / 2 - cam[0] * S, oy: r.y + pad + TITOLO + alto / 2 - cam[1] * S };
  g.save();
  g.setTransform(d, 0, 0, d, 0, 0);
  g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip();
  disegnaPrato(g, d, k, s, f0, t, vista, { x: r.x + pad, y: r.y + pad + 7, w: r.w - pad * 2 }, `${k.nome} · ${W >= 300 ? 'what the dog sees' : "dog's view"}`);
  g.restore();

  // Dissolvenza: si apre all'inizio, si chiude alla fine della pausa, poi la partita riparte
  const a = Math.max(t < ENTRA ? 1 - t / ENTRA : 0, t > ciclo - ESCE ? (t - (ciclo - ESCE)) / ESCE : 0);
  if (a > 0) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = Math.min(1, a);
    g.fillStyle = FONDO;
    g.fillRect(0, 0, c.width, c.height);
    g.globalAlpha = 1;
  }
}
