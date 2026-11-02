import { avanti, copiaPesi, misura, nuovaRete, passo, type Punto, type Rete } from '../lib/rete';

// Rete neurale in cinque passi, su una sola scena. Una rete vera prova a far emergere una sagoma da una griglia a filo:
// l'altezza della griglia è l'uscita della rete. Un neurone è un gradino dritto; più neuroni si sommano e fanno una forma.
// La rete cresce di passo in passo, e si allena solo mentre si vede.
const G = 32, GRUPPO = 64, TASSO = 0.03, TASSO_FINE = 0.01, RALLENTA = 14000, FINE = 30000, MS_AL_FOTOGRAMMA = 7, DURATA_PASSO = 4500;
const ALTEZZA = 0.62, PIATTO = 0.52, RIPIDO = 7;

type Sagoma = (x: number, y: number) => boolean;
const SAGOME: Record<string, Sagoma> = {
  fish: (x, y) => ((x + 0.2) / 0.62) ** 2 + (y / 0.5) ** 2 < 1 || (x > 0.32 && x < 0.9 && Math.abs(y) < (x - 0.32) * 1.15 && Math.abs(y) > (x - 0.72) * 2.2),
  bird: (x, y) => Math.abs(y - (Math.abs(x) * 0.8 - 0.3)) < 0.17 && Math.abs(x) < 0.9,
};
const f2 = (v: number) => v.toFixed(2);
const posto = (k: number) => ((k + 0.5) / G) * 2 - 1;

const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };
const misto = (a: string, b: string, t: number) => { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i]! - v) * t)).join(',')})`; };
const FONT = "11px 'Departure Mono', ui-monospace, monospace";
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Quanto la forma della rete coincide con la sagoma: celle giuste su tutte le celle coinvolte
const somiglianza = (rete: Rete, celle: Punto[]) => {
  let e = 0, u = 0;
  for (const q of celle) { const p = avanti(rete, q.x, q.y) >= 0.5; if (p && q.c) e++; if (p || q.c) u++; }
  return u ? e / u : 0;
};

type Neurone = { l: number; j: number };
type Opzioni = { nascosti: number[]; sagoma?: string };

function banco(el: HTMLElement, o: Opzioni) {
  const BG = tono('--bg'), FG = tono('--fg'), MUTED = tono('--muted'), LINE = tono('--line'), BLU = tono('--azzurro'), ARANCIO = tono('--arancio');
  const scala = (fine: string) => Array.from({ length: 7 }, (_, k) => misto(misto(LINE, MUTED, 0.55), fine, k / 6));
  const TINTE = scala(ARANCIO), TINTE_NEURONE = scala(FG);
  const telaRete = el.querySelector<HTMLCanvasElement>('.tela-rete')!, telaTerreno = el.querySelector<HTMLCanvasElement>('.tela-terreno')!;
  const c = telaRete.getContext('2d')!, t = telaTerreno.getContext('2d')!;
  const lettura = el.querySelector<HTMLElement>('.lettura'), dettaglio = el.querySelector<HTMLElement>('.dettaglio');

  const s = {
    rete: nuovaRete(o.nascosti, 'tanh', 3) as Rete, nascosti: o.nascosti, seme: 3, passi: 0, visibile: false, sporco: true,
    celle: [] as Punto[], pieni: [] as Punto[], vuoti: [] as Punto[], bordo: [] as number[],
    giro: 0.55, sopra: null as Neurone | null, fisso: null as Neurone | null,
    piano: false, sonda: null as (Punto & { p: number }) | null, impulso: 0, verso: 1, testo: '', errore: 0, somiglia: 0, storia: [] as number[],
    sopraTerreno: null as null | (() => void),
  };
  const scelto = () => s.sopra ?? s.fisso;

  function fissaSagoma(f: Sagoma | boolean[]) {
    s.celle = [];
    for (let r = 0; r < G; r++) for (let q = 0; q < G; q++) {
      const x = posto(q), y = -posto(r), dentro = typeof f === 'function' ? f(x, y) : f[r * G + q]!;
      s.celle.push({ x, y, c: dentro ? 1 : 0 });
    }
    aggiornaSagoma();
  }
  // Bordo della sagoma: i lati delle celle piene che toccano una vuota; si disegna a filo, all'altezza piena
  function aggiornaSagoma() {
    s.pieni = s.celle.filter(q => q.c);
    s.vuoti = s.celle.filter(q => !q.c);
    s.bordo = [];
    const pieno = (r: number, q: number) => r >= 0 && q >= 0 && r < G && q < G && s.celle[r * G + q]!.c === 1;
    const lato = (a: number, b: number, c2: number, d: number) => s.bordo.push(-1 + (2 * a) / G, 1 - (2 * b) / G, -1 + (2 * c2) / G, 1 - (2 * d) / G);
    for (let r = 0; r < G; r++) for (let q = 0; q < G; q++) {
      if (!pieno(r, q)) continue;
      if (!pieno(r - 1, q)) lato(q, r, q + 1, r);
      if (!pieno(r + 1, q)) lato(q, r + 1, q + 1, r + 1);
      if (!pieno(r, q - 1)) lato(q, r, q, r + 1);
      if (!pieno(r, q + 1)) lato(q + 1, r, q + 1, r + 1);
    }
    s.passi = Math.min(s.passi, RALLENTA - 1);
    s.sporco = true;
  }
  fissaSagoma(SAGOME[o.sagoma ?? 'fish']!);

  function cambiaRete(nascosti: number[], tieni: boolean) {
    const nuova = nuovaRete(nascosti, 'tanh', ++s.seme);
    if (tieni && nascosti.length === s.nascosti.length) copiaPesi(s.rete, nuova);
    s.rete = nuova;
    s.nascosti = nascosti;
    s.passi = 0;
    // Con un neurone in più la linea di performance continua: si vede il salto
    if (!tieni) s.storia = [];
    s.sopra = s.fisso = null;
    s.sporco = true;
  }
  const gruppo = () => {
    const g: Punto[] = [];
    for (let k = 0; k < GRUPPO; k++) {
      const a = k % 2 ? s.pieni : s.vuoti, b = a.length ? a : s.celle;
      g.push(b[Math.floor(Math.random() * b.length)]!);
    }
    return g;
  };
  const tasso = () => (s.passi < RALLENTA ? TASSO : TASSO_FINE);
  function unPassoSolo() {
    passo(s.rete, gruppo(), tasso());
    s.passi++;
    s.sporco = true;
  }

  // --- Terreno
  let W = 0, H = 0, Wr = 0, Hr = 0;
  const altezze = new Float32Array((G + 1) * (G + 1)), sx = new Float32Array(altezze.length), sy = new Float32Array(altezze.length);
  const piano = () => {
    const S = Math.min(W / 2.95, H / (2 * Math.SQRT2 * PIATTO + ALTEZZA + 0.12));
    return { S, cx: W / 2, cy: H / 2 + (S * ALTEZZA) / 2, co: Math.cos(s.giro), si: Math.sin(s.giro) };
  };
  const proietta = (u: number, v: number, h: number) => {
    const { S, cx, cy, co, si } = piano();
    return [cx + S * (u * co + v * si), cy - S * (-u * si + v * co) * PIATTO - S * h * ALTEZZA] as const;
  };
  const sulPavimento = (x: number, y: number) => {
    const { S, cx, cy, co, si } = piano(), a = (x - cx) / S, d = (cy - y) / (S * PIATTO);
    return [a * co - d * si, a * si + d * co] as const;
  };
  function calcolaAltezze() {
    const sel = scelto(), ultimo = s.rete.forma.length - 1;
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
      const p = avanti(s.rete, -1 + (2 * i) / G, 1 - (2 * j) / G);
      altezze[j * (G + 1) + i] = !sel || sel.l === ultimo ? p : sel.l === 0 ? (s.rete.uscite[0]![sel.j]! + 1) / 2 : (s.rete.uscite[sel.l]![sel.j]! + 1) / 2;
    }
  }
  function disegnaTerreno() {
    const { S, cx, cy, co, si } = piano(), sel = scelto();
    t.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    t.clearRect(0, 0, W, H);
    if (s.piano) return disegnaPiatto();
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
      const u = -1 + (2 * i) / G, v = 1 - (2 * j) / G, k = j * (G + 1) + i;
      sx[k] = cx + S * (u * co + v * si);
      sy[k] = cy - S * (-u * si + v * co) * PIATTO - S * altezze[k]! * ALTEZZA;
    }
    // Dal fondo verso chi guarda, una striscia alla volta: ogni striscia copre quelle dietro, così il filo si legge.
    // Dentro una striscia le maglie dello stesso colore si tracciano insieme: molti meno disegni, anche su telefono
    const tinte = sel ? TINTE_NEURONE : TINTE, perRighe = Math.abs(co) >= Math.abs(si), crescente = perRighe ? co >= 0 : si >= 0;
    const punto = (a: number, b: number) => (perRighe ? b * (G + 1) + a : a * (G + 1) + b);
    t.lineWidth = 1;
    t.fillStyle = BG;
    for (let n = 0; n < G; n++) {
      const b = crescente ? n : G - 1 - n;
      t.beginPath();
      t.moveTo(sx[punto(0, b)]!, sy[punto(0, b)]!);
      for (let a = 1; a <= G; a++) t.lineTo(sx[punto(a, b)]!, sy[punto(a, b)]!);
      for (let a = G; a >= 0; a--) t.lineTo(sx[punto(a, b + 1)]!, sy[punto(a, b + 1)]!);
      t.closePath();
      t.fill();
      for (let k = 0; k < tinte.length; k++) {
        let vuota = true;
        for (let a = 0; a < G; a++) {
          const p0 = punto(a, b), p1 = punto(a + 1, b), p2 = punto(a + 1, b + 1), p3 = punto(a, b + 1);
          if (Math.round(((altezze[p0]! + altezze[p1]! + altezze[p2]! + altezze[p3]!) / 4) * 6) !== k) continue;
          if (vuota) { t.beginPath(); vuota = false; }
          t.moveTo(sx[p0]!, sy[p0]!); t.lineTo(sx[p1]!, sy[p1]!); t.lineTo(sx[p2]!, sy[p2]!); t.lineTo(sx[p3]!, sy[p3]!); t.closePath();
        }
        if (!vuota) { t.strokeStyle = tinte[k]!; t.stroke(); }
      }
    }
    // La sagoma da raggiungere: un filo all'altezza piena
    if (!sel) {
      t.strokeStyle = BLU;
      t.lineWidth = 1.5;
      t.beginPath();
      for (let k = 0; k < s.bordo.length; k += 4) {
        const [ax, ay] = proietta(s.bordo[k]!, s.bordo[k + 1]!, 1), [bx, by] = proietta(s.bordo[k + 2]!, s.bordo[k + 3]!, 1);
        t.moveTo(ax, ay); t.lineTo(bx, by);
      }
      t.stroke();
    }
    if (s.sonda) {
      const [ax, ay] = proietta(s.sonda.x, s.sonda.y, 0), [bx, by] = proietta(s.sonda.x, s.sonda.y, s.sonda.p);
      t.strokeStyle = FG;
      t.lineWidth = 2;
      t.beginPath(); t.moveTo(ax, ay); t.lineTo(bx, by); t.stroke();
      t.fillStyle = FG;
      t.fillRect(bx - 4, by - 4, 8, 8);
    }
    disegnaVistaAlto();
    s.sopraTerreno?.();
  }
  // Vista dall'alto, in un angolo: si riconosce la forma senza girare il terreno
  function disegnaVistaAlto() {
    const q = W < 340 ? 58 : 76, x0 = W - q - 2, y0 = 18, cella = q / G;
    t.fillStyle = BG;
    t.fillRect(x0, y0, q, q);
    t.fillStyle = ARANCIO;
    t.beginPath();
    for (let r = 0; r < G; r++) for (let k = 0; k < G; k++) {
      if (avanti(s.rete, posto(k), -posto(r)) >= 0.5) t.rect(x0 + k * cella, y0 + r * cella, cella, cella);
    }
    t.fill();
    t.strokeStyle = BLU;
    t.lineWidth = 1;
    t.beginPath();
    for (let k = 0; k < s.bordo.length; k += 4) {
      t.moveTo(x0 + ((s.bordo[k]! + 1) / 2) * q, y0 + ((1 - s.bordo[k + 1]!) / 2) * q);
      t.lineTo(x0 + ((s.bordo[k + 2]! + 1) / 2) * q, y0 + ((1 - s.bordo[k + 3]!) / 2) * q);
    }
    t.stroke();
    t.strokeStyle = MUTED;
    t.strokeRect(x0 + 0.5, y0 + 0.5, q, q);
    t.font = FONT;
    t.fillStyle = MUTED;
    t.textAlign = 'right';
    t.textBaseline = 'alphabetic';
    t.fillText('from above', W - 2, y0 - 5);
  }
  // Modo disegno: la griglia vista dall'alto, cella per cella
  function disegnaPiatto() {
    const q = Math.min(W, H) - 4, x0 = (W - q) / 2, y0 = (H - q) / 2, cella = q / G;
    t.strokeStyle = LINE;
    t.lineWidth = 1;
    t.beginPath();
    for (let k = 0; k <= G; k++) { t.moveTo(x0 + k * cella, y0); t.lineTo(x0 + k * cella, y0 + q); t.moveTo(x0, y0 + k * cella); t.lineTo(x0 + q, y0 + k * cella); }
    t.stroke();
    t.fillStyle = BLU;
    t.beginPath();
    s.celle.forEach((p, k) => { if (p.c) t.rect(x0 + (k % G) * cella + 1, y0 + Math.floor(k / G) * cella + 1, cella - 1, cella - 1); });
    t.fill();
  }

  // --- Rete
  const ALTO = 18;
  const colonna = (l: number) => {
    const ultimo = s.rete.forma.length - 1, largo = Math.min(Wr - 56, ultimo * 200);
    return (Wr - largo) / 2 + (largo * l) / ultimo;
  };
  const riga = (l: number, j: number) => ALTO + ((Hr - ALTO - 6) * (j + 0.5)) / s.rete.forma[l]!;
  const lato = () => Math.max(7, Math.min(22, (Hr - ALTO - 6) / Math.max(...s.rete.forma) - 5));
  const nome = (l: number, j: number) => (l === 0 ? 'xy'[j]! : l === s.rete.forma.length - 1 ? 'height' : `n${l}.${j + 1}`);
  function disegnaRete() {
    const { forma, pesi } = s.rete, ultimo = forma.length - 1, q = lato(), sel = scelto();
    c.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    c.clearRect(0, 0, Wr, Hr);
    for (let l = 1; l <= ultimo; l++) for (let j = 0; j < forma[l]!; j++) for (let i = 0; i < forma[l - 1]!; i++) {
      const w = pesi[l - 1]![j * forma[l - 1]! + i]!, forza = Math.abs(w);
      c.globalAlpha = Math.min(0.9, 0.12 + forza * 0.22) * (sel && !((l === sel.l && j === sel.j) || (l - 1 === sel.l && i === sel.j)) ? 0.12 : 1);
      c.strokeStyle = w > 0 ? ARANCIO : BLU;
      c.lineWidth = Math.min(3.5, 0.5 + forza * 0.45);
      c.beginPath();
      c.moveTo(colonna(l - 1), riga(l - 1, i));
      c.lineTo(colonna(l), riga(l, j));
      c.stroke();
    }
    c.globalAlpha = 1;
    // Durante il passo guidato i valori corrono in avanti, poi la correzione torna indietro
    if (s.impulso > 0 && s.impulso < 1) {
      const f = s.impulso * ultimo, k = Math.min(ultimo - 1, Math.floor(f)), fr = f - k;
      const da = s.verso > 0 ? k : ultimo - k, a = s.verso > 0 ? k + 1 : ultimo - k - 1;
      c.fillStyle = s.verso > 0 ? FG : ARANCIO;
      for (let i = 0; i < forma[da]!; i++) for (let j = 0; j < forma[a]!; j++) {
        c.fillRect(colonna(da) + (colonna(a) - colonna(da)) * fr - 2, riga(da, i) + (riga(a, j) - riga(da, i)) * fr - 2, 4, 4);
      }
    }
    c.font = FONT;
    c.textBaseline = 'middle';
    for (let l = 0; l <= ultimo; l++) for (let j = 0; j < forma[l]!; j++) {
      const x = colonna(l), y = riga(l, j), attivo = sel && sel.l === l && sel.j === j;
      c.fillStyle = BG;
      c.fillRect(x - q / 2, y - q / 2, q, q);
      c.strokeStyle = attivo ? FG : MUTED;
      c.lineWidth = attivo ? 2 : 1;
      c.strokeRect(Math.round(x - q / 2) + 0.5, Math.round(y - q / 2) + 0.5, Math.round(q), Math.round(q));
    }
    c.fillStyle = MUTED;
    c.textAlign = 'right';
    c.fillText('x', colonna(0) - q / 2 - 5, riga(0, 0));
    c.fillText('y', colonna(0) - q / 2 - 5, riga(0, 1));
    c.textAlign = 'center';
    c.fillText('height', colonna(ultimo), riga(ultimo, 0) + q / 2 + 11);
  }
  function testoDettaglio() {
    if (s.testo) return s.testo;
    const sel = scelto();
    if (!sel) return 'Hover or tap a square in the network: the grid shows what that neuron sees.';
    if (sel.l === 0) return `${nome(0, sel.j)} is the ${sel.j ? 'north-south' : 'east-west'} position on the grid. It only tilts.`;
    const entrate = s.rete.forma[sel.l - 1]!;
    let somma = '';
    for (let i = 0; i < Math.min(entrate, 8); i++) {
      const w = s.rete.pesi[sel.l - 1]![sel.j * entrate + i]!;
      somma += `${i ? (w < 0 ? ' - ' : ' + ') : w < 0 ? '-' : ''}${f2(Math.abs(w))}·${nome(sel.l - 1, i)}`;
    }
    if (entrate > 8) somma += ' + …';
    const b = s.rete.scarti[sel.l - 1]![sel.j]!;
    const cosa = sel.l === s.rete.forma.length - 1 ? 'It adds everything up' : sel.l === 1 ? 'It sees one straight step' : 'It combines the steps before it';
    return `${cosa}: ${nome(sel.l, sel.j)} = step(${somma}${b < 0 ? ' - ' : ' + '}${f2(Math.abs(b))})`;
  }
  function cerca(x: number, y: number, dito: boolean): Neurone | null {
    const q = lato() / 2 + (dito ? 7 : 2), { forma } = s.rete;
    for (let l = 0; l < forma.length; l++) for (let j = 0; j < forma[l]!; j++) if (Math.abs(x - colonna(l)) <= q && Math.abs(y - riga(l, j)) <= q) return { l, j };
    return null;
  }
  const dove = (e: PointerEvent, tela: HTMLElement) => { const r = tela.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  telaRete.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const [x, y] = dove(e, telaRete), n = cerca(x, y, false);
    if (n?.l !== s.sopra?.l || n?.j !== s.sopra?.j) { s.sopra = n; s.sporco = true; }
    telaRete.style.cursor = n ? 'pointer' : '';
  });
  telaRete.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { s.sopra = null; s.sporco = true; } });
  telaRete.addEventListener('pointerdown', e => {
    const [x, y] = dove(e, telaRete), n = cerca(x, y, e.pointerType !== 'mouse');
    s.fisso = n && !(s.fisso?.l === n.l && s.fisso?.j === n.j) ? n : null;
    s.sporco = true;
  });

  // --- Trascinare il terreno lo gira. Un capitolo può prendersi il gesto (presa), per esempio per muovere le maniglie
  const gesti = { vuole: null as null | ((x: number, y: number) => boolean), presa: null as null | ((x: number, y: number, dito: boolean) => boolean), muovi: null as null | ((x: number, y: number) => void), lascia: null as null | (() => void) };
  let gira = false, preso = false, xPrima = 0;
  telaTerreno.addEventListener('pointerdown', e => {
    const [x, y] = dove(e, telaTerreno);
    if (gesti.presa?.(x, y, e.pointerType !== 'mouse')) { preso = true; telaTerreno.setPointerCapture(e.pointerId); return; }
    gira = true;
    xPrima = e.clientX;
    telaTerreno.setPointerCapture(e.pointerId);
  });
  // Col dito la maniglia si tiene da subito: la pagina non scorre mentre la sposti
  telaTerreno.addEventListener('touchstart', e => {
    const b = telaTerreno.getBoundingClientRect(), d = e.touches[0]!;
    if (gesti.vuole?.(d.clientX - b.left, d.clientY - b.top)) e.preventDefault();
  }, { passive: false });
  telaTerreno.addEventListener('pointermove', e => {
    if (preso) { const [x, y] = dove(e, telaTerreno); gesti.muovi?.(x, y); s.sporco = true; return; }
    if (!gira) return;
    s.giro -= (e.clientX - xPrima) * 0.008;
    xPrima = e.clientX;
    s.sporco = true;
  });
  const fine = () => { gira = false; if (preso) { preso = false; gesti.lascia?.(); } };
  telaTerreno.addEventListener('pointerup', fine);
  telaTerreno.addEventListener('pointercancel', fine);

  function misuraTele() {
    W = telaTerreno.clientWidth; H = telaTerreno.clientHeight; Wr = telaRete.clientWidth; Hr = telaRete.clientHeight;
    const d = devicePixelRatio;
    telaTerreno.width = W * d; telaTerreno.height = H * d;
    telaRete.width = Wr * d; telaRete.height = Hr * d;
    s.sporco = true;
  }
  new ResizeObserver(misuraTele).observe(el);
  new IntersectionObserver(v => { s.visibile = v.some(x => x.isIntersecting); }, { rootMargin: '60px' }).observe(el);
  misuraTele();

  function disegna() {
    if (!W || !Wr) return;
    const m = misura(s.rete, s.celle);
    s.errore = m.errore;
    s.somiglia = somiglianza(s.rete, s.celle);
    calcolaAltezze();
    disegnaTerreno();
    disegnaRete();
    if (lettura) { const t2 = `match ${Math.round(s.somiglia * 100)}%`; if (lettura.textContent !== t2) lettura.textContent = t2; }
    if (dettaglio) { const t2 = testoDettaglio(); if (dettaglio.textContent !== t2) dettaglio.textContent = t2; }
  }
  return { s, fissaSagoma, aggiornaSagoma, cambiaRete, unPassoSolo, disegna, gesti, proietta, sulPavimento, el };
}
export function monta(radice: HTMLElement) {
  const b = banco(radice.querySelector<HTMLElement>('.banco')!, { nascosti: [] }), { s } = b;
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const scrivi = (el: Element | null, t: string) => { if (el && el.textContent !== t) el.textContent = t; };
  const FRASI = [
    'A neuron weighs its inputs, adds them and squashes the sum. On this grid, that makes one straight step. Drag the two squares to cover the fish: that is setting the weights by hand.',
    'Each hidden neuron makes its own step, and the output adds them up. Add neurons, then hover a square to see what that neuron sees.',
    'A later layer reads the steps of the layer before and combines them into corners. Same 16 neurons: add a layer and compare the match.',
    'The network starts at random. It tries a point, measures the error, and backpropagation corrects every weight a little. Press step for one correction, play for thousands.',
    'Pick or draw a shape, then build the network. Thin shapes and corners need more neurons.',
  ];
  const linguette = radice.querySelectorAll<HTMLButtonElement>('.passi button'), pannelli = radice.querySelectorAll<HTMLElement>('[data-comandi]'), dopo = $<HTMLButtonElement>('.dopo');
  let ora = -1;

  // --- 1. Un neurone: la rete non si allena, le due maniglie decidono i pesi
  let man = [[-0.35, 0.8], [0.15, -0.8]] as [number, number][], tenuta = -1;
  const fissa = () => {
    const [ax, ay] = man[0]!, [bx, by] = man[1]!, nx = -(by - ay), ny = bx - ax, d = Math.hypot(nx, ny) || 1;
    const prova = (verso: number) => {
      s.rete.pesi[0]![0] = (verso * RIPIDO * nx) / d;
      s.rete.pesi[0]![1] = (verso * RIPIDO * ny) / d;
      s.rete.scarti[0]![0] = (-verso * RIPIDO * (nx * ax + ny * ay)) / d;
      return somiglianza(s.rete, s.celle);
    };
    // Il lato alto del gradino è quello che copre di più la sagoma
    const uno = prova(1);
    if (prova(-1) < uno) prova(1);
    s.sporco = true;
  };
  const tela = $<HTMLCanvasElement>('.tela-terreno'), ctx = tela.getContext('2d')!;
  const disegnaManiglie = () => {
    const w = s.rete.pesi[0]!, q = s.rete.scarti[0]![0]!;
    s.testo = `height = step(${f2(w[0]!)}·x ${w[1]! < 0 ? '-' : '+'} ${f2(Math.abs(w[1]!))}·y ${q < 0 ? '-' : '+'} ${f2(Math.abs(q))})   These numbers are the weights.`;
    const [ax, ay] = b.proietta(man[0]![0], man[0]![1], 0), [bx, by] = b.proietta(man[1]![0], man[1]![1], 0);
    ctx.strokeStyle = tono('--fg');
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    for (const [x, y] of [[ax, ay], [bx, by]] as const) {
      ctx.fillStyle = tono('--bg');
      ctx.fillRect(x - 7, y - 7, 14, 14);
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 7, y - 7, 14, 14);
    }
  };
  const gestiManiglie = () => {
    b.gesti.vuole = (x, y) => man.some(m => { const [px, py] = b.proietta(m[0], m[1], 0); return Math.hypot(x - px, y - py) < 26; });
    b.gesti.presa = (x, y, dito) => {
      tenuta = -1;
      man.forEach((m, k) => { const [px, py] = b.proietta(m[0], m[1], 0); if (Math.hypot(x - px, y - py) < (dito ? 26 : 14)) tenuta = k; });
      return tenuta >= 0;
    };
    b.gesti.muovi = (x, y) => {
      if (tenuta < 0) return;
      const [u, v] = b.sulPavimento(x, y);
      man[tenuta] = [Math.max(-1, Math.min(1, u)), Math.max(-1, Math.min(1, v))];
      if (Math.hypot(man[0]![0] - man[1]![0], man[0]![1] - man[1]![1]) > 0.08) fissa();
    };
    b.gesti.lascia = () => { tenuta = -1; };
  };

  // --- 2. Più neuroni: uno strato solo; si aggiungono uno alla volta e quelli che c'erano restano
  const pannelloNeuroni = $<HTMLElement>('[data-comandi="1"]');
  const scriviNeuroni = () => {
    const n = s.nascosti[0]!;
    scrivi(pannelloNeuroni.querySelector('.numero'), `${n} ${n === 1 ? 'neuron' : 'neurons'}`);
    pannelloNeuroni.querySelector<HTMLButtonElement>('.meno')!.disabled = n === 1;
    pannelloNeuroni.querySelector<HTMLButtonElement>('.piu')!.disabled = n === 16;
  };
  const cambiaNeuroni = (d: number) => { b.cambiaRete([Math.max(1, Math.min(16, s.nascosti[0]! + d))], true); scriviNeuroni(); metti(true); };
  pannelloNeuroni.querySelector('.piu')!.addEventListener('click', () => cambiaNeuroni(1));
  pannelloNeuroni.querySelector('.meno')!.addEventListener('click', () => cambiaNeuroni(-1));

  // --- 3. Strati: sempre 16 neuroni, divisi in uno, due o tre strati
  const FORME = [[16], [8, 8], [5, 5, 6]], pannelloStrati = $<HTMLElement>('[data-comandi="2"]');
  let forma = 0;
  const scriviStrati = () => {
    scrivi(pannelloStrati.querySelector('.numero'), `16 neurons in ${forma + 1} ${forma ? 'layers' : 'layer'}`);
    pannelloStrati.querySelector<HTMLButtonElement>('.meno')!.disabled = forma === 0;
    pannelloStrati.querySelector<HTMLButtonElement>('.piu')!.disabled = forma === FORME.length - 1;
  };
  const cambiaForma = (d: number) => { forma = Math.max(0, Math.min(FORME.length - 1, forma + d)); b.cambiaRete(FORME[forma]!, false); scriviStrati(); metti(true); };
  pannelloStrati.querySelector('.piu')!.addEventListener('click', () => cambiaForma(1));
  pannelloStrati.querySelector('.meno')!.addEventListener('click', () => cambiaForma(-1));

  // --- Comandi di tutti i passi: play, step, restart e la linea di performance
  const gioca = $<HTMLButtonElement>('.gioca'), curva = $<HTMLCanvasElement>('.curva'), cc = curva.getContext('2d')!, scritta = $<HTMLElement>('.errore');
  const fasi = radice.querySelectorAll<HTMLElement>('.fasi span'), scatolaFasi = $<HTMLElement>('.fasi');
  const accendi = (n: number) => fasi.forEach((f, k) => f.classList.toggle('accesa', k === n));
  let inMoto = false, anima: { t0: number; q: Punto; p: number; fatto: boolean } | null = null, resto = 0, prima = 0, ultimoPunto = 0;
  const metti = (si: boolean) => { inMoto = si; gioca.textContent = si ? 'pause' : 'play'; };
  const fermaAnimazione = () => { anima = null; s.sonda = null; s.testo = ''; s.impulso = 0; accendi(-1); scatolaFasi.hidden = ora !== 3; };
  // Le maniglie seguono il gradino quando è la rete a spostarlo: due punti sulla linea dove il neurone cambia lato
  const seguiGradino = () => {
    const [w0, w1] = s.rete.pesi[0]!, q = s.rete.scarti[0]![0]!, l2 = w0! * w0! + w1! * w1!;
    if (l2 < 1e-6) return;
    const l = Math.sqrt(l2), cx = (-q * w0!) / l2, cy = (-q * w1!) / l2, dx = -w1! / l, dy = w0! / l, entro = (v: number) => Math.max(-1, Math.min(1, v));
    man = [[entro(cx + dx * 0.8), entro(cy + dy * 0.8)], [entro(cx - dx * 0.8), entro(cy - dy * 0.8)]];
  };
  gioca.addEventListener('click', () => {
    if (anima) return;
    if (s.passi >= FINE) s.passi = RALLENTA;
    metti(!inMoto);
  });
  $('.azzera').addEventListener('click', () => {
    fermaAnimazione();
    if (ora === 0) { man = [[-0.35, 0.8], [0.15, -0.8]]; b.cambiaRete([], false); fissa(); metti(false); }
    else { b.cambiaRete(s.nascosti, false); metti(ora !== 3); }
  });
  $('.un-passo').addEventListener('click', () => {
    if (anima) return;
    metti(false);
    const insieme = Math.random() < 0.5 && s.pieni.length ? s.pieni : s.vuoti.length ? s.vuoti : s.celle, q = insieme[Math.floor(Math.random() * insieme.length)]!;
    const p = avanti(s.rete, q.x, q.y);
    if (calmo) { b.unPassoSolo(); s.testo = `One correction done. This point had height ${f2(p)}; it should be ${q.c}.`; return; }
    anima = { t0: performance.now(), q, p, fatto: false };
    s.sonda = { ...q, p };
    scatolaFasi.hidden = false;
  });
  const avanza = (adesso: number) => {
    const dt = Math.min(0.1, (adesso - prima) / 1000);
    prima = adesso;
    if (inMoto && s.visibile) {
      // Una velocità fissa, per vedere la rete imparare: più piano al passo Learning. Su un telefono lento si ferma prima
      resto += dt * (ora === 3 ? 400 : 1500);
      const n = Math.floor(resto), t0 = performance.now();
      resto -= n;
      for (let k = 0; k < n && performance.now() - t0 < MS_AL_FOTOGRAMMA; k++) b.unPassoSolo();
      if (ora === 0) seguiGradino();
      if (s.passi >= FINE) metti(false);
    }
    if (anima) {
      const f = (adesso - anima.t0) / DURATA_PASSO, { q, p } = anima;
      if (f < 0.34) {
        accendi(0);
        s.verso = 1; s.impulso = f / 0.34;
        s.testo = `Try: at this point the network answers height ${f2(p)}. The right height is ${q.c}.`;
      } else if (f < 0.6) {
        accendi(1);
        s.impulso = 0;
        s.testo = `Error: -log(${q.c ? f2(p) : f2(1 - p)}) = ${f2(-Math.log(Math.max(1e-9, q.c ? p : 1 - p)))}. Sure and right is near 0; sure and wrong is big.`;
      } else {
        accendi(2);
        s.verso = -1; s.impulso = (f - 0.6) / 0.4;
        s.testo = 'Backpropagation sends the error back through the network. Gradient descent moves each weight a little, downhill.';
        if (!anima.fatto) { b.unPassoSolo(); anima.fatto = true; s.sonda = { ...q, p: avanti(s.rete, q.x, q.y) }; if (ora === 0) seguiGradino(); }
      }
      s.sporco = true;
      if (f >= 1) fermaAnimazione();
    }
  };
  // Linea di performance: quanto la forma coincide con la sagoma, da 0 a 100%. Un punto ogni 100 ms, quando la rete cambia
  const disegnaCurva = (adesso: number) => {
    if ((inMoto || tenuta >= 0 || anima) && adesso - ultimoPunto > 100) {
      ultimoPunto = adesso;
      s.storia.push(s.somiglia);
      if (s.storia.length > 400) s.storia.shift();
    }
    scrivi(scritta, `error ${s.errore.toFixed(3)} · ${s.passi} corrections`);
    const w = curva.clientWidth, h = curva.clientHeight, d = devicePixelRatio;
    if (curva.width !== w * d) { curva.width = w * d; curva.height = h * d; }
    cc.setTransform(d, 0, 0, d, 0, 0);
    cc.clearRect(0, 0, w, h);
    cc.strokeStyle = tono('--line');
    cc.lineWidth = 1;
    cc.setLineDash([3, 4]);
    cc.beginPath(); cc.moveTo(0, 2.5); cc.lineTo(w, 2.5); cc.stroke();
    cc.setLineDash([]);
    cc.strokeStyle = tono('--arancio');
    cc.lineWidth = 1.5;
    cc.beginPath();
    s.storia.forEach((v, k) => { const x = (k / Math.max(1, s.storia.length - 1)) * w, y = h - 2 - v * (h - 5); if (k) cc.lineTo(x, y); else cc.moveTo(x, y); });
    cc.stroke();
  };

  // --- 5. Tocca a te: sagoma a scelta o disegnata a mano, strati e neuroni liberi
  const sagome = radice.querySelectorAll<HTMLButtonElement>('[data-sagoma]'), matita = $<HTMLButtonElement>('.matita'), pulisci = $<HTMLButtonElement>('.pulisci');
  const segna = (nome: string) => sagome.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.sagoma === nome)));
  const scriviLibero = () => { scrivi($('.strati-n'), String(s.nascosti.length)); scrivi($('.neuroni-n'), String(s.nascosti[0])); };
  const disegnando = (si: boolean) => {
    s.piano = si;
    matita.setAttribute('aria-pressed', String(si));
    matita.textContent = si ? 'see it rise' : 'draw your own';
    pulisci.hidden = !si;
    s.sporco = true;
  };
  sagome.forEach(x => x.addEventListener('click', () => { disegnando(false); segna(x.dataset.sagoma!); b.fissaSagoma(SAGOME[x.dataset.sagoma!]!); s.passi = 0; s.storia = []; metti(true); }));
  matita.addEventListener('click', () => { segna(''); disegnando(!s.piano); s.passi = 0; s.storia = []; metti(true); });
  pulisci.addEventListener('click', () => { s.celle.forEach(q => { q.c = 0; }); b.aggiornaSagoma(); s.passi = 0; });
  const riforma = (strati: number, neuroni: number) => { b.cambiaRete(Array.from({ length: strati }, () => neuroni), false); scriviLibero(); metti(true); };
  $('.strati-piu').addEventListener('click', () => riforma(Math.min(4, s.nascosti.length + 1), s.nascosti[0]!));
  $('.strati-meno').addEventListener('click', () => riforma(Math.max(1, s.nascosti.length - 1), s.nascosti[0]!));
  $('.neuroni-piu').addEventListener('click', () => riforma(s.nascosti.length, Math.min(16, s.nascosti[0]! + 1)));
  $('.neuroni-meno').addEventListener('click', () => riforma(s.nascosti.length, Math.max(1, s.nascosti[0]! - 1)));
  // Disegno a mano: il trascinamento dipinge invece di girare la griglia. Se parte da una cella piena, cancella
  let colore = 1, ultimo: [number, number] | null = null;
  const cella = (x: number, y: number) => {
    const W = tela.clientWidth, H = tela.clientHeight, q = Math.min(W, H) - 4;
    return [Math.floor(((x - (W - q) / 2) / q) * G), Math.floor(((y - (H - q) / 2) / q) * G)] as const;
  };
  // Dipinge il tratto dall'ultimo punto a questo, anche se il puntatore si muove veloce
  const dipingi = (x: number, y: number) => {
    const [k, r] = cella(x, y), [k0, r0] = ultimo ?? [k, r], tratti = Math.max(1, Math.abs(k - k0), Math.abs(r - r0));
    for (let n = 0; n <= tratti; n++) {
      const qk = Math.round(k0 + ((k - k0) * n) / tratti), qr = Math.round(r0 + ((r - r0) * n) / tratti);
      for (const [dr, dk] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
        const a = qr + dr, c2 = qk + dk;
        if (a >= 0 && c2 >= 0 && a < G && c2 < G) s.celle[a * G + c2]!.c = colore;
      }
    }
    ultimo = [k, r];
  };
  const gestiDisegno = () => {
    b.gesti.vuole = () => s.piano;
    b.gesti.presa = (x, y) => {
      if (!s.piano) return false;
      const [k, r] = cella(x, y);
      colore = s.celle[r * G + k]?.c ? 0 : 1;
      ultimo = null;
      dipingi(x, y);
      b.aggiornaSagoma();
      return true;
    };
    b.gesti.muovi = (x, y) => { if (s.piano) { dipingi(x, y); b.aggiornaSagoma(); s.passi = 0; } };
  };

  // --- Passi. Avanti di uno la rete cresce da quella che c'è; ogni altro salto riparte dallo stato iniziale di quel passo
  function vai(n: number) {
    const inFila = n === ora + 1;
    fermaAnimazione();
    metti(false);
    disegnando(false);
    s.sopraTerreno = null;
    b.gesti.vuole = b.gesti.presa = b.gesti.muovi = b.gesti.lascia = null;
    if (!inFila || n < 4) { b.fissaSagoma(SAGOME.fish!); segna('fish'); }
    if (n === 0) {
      man = [[-0.35, 0.8], [0.15, -0.8]];
      b.cambiaRete([], false);
      fissa();
      gestiManiglie();
      s.sopraTerreno = disegnaManiglie;
    } else if (n === 1) {
      b.cambiaRete([1], false);
      scriviNeuroni();
    } else if (n === 2) {
      forma = 0;
      b.cambiaRete([16], inFila);
      scriviStrati();
    } else if (n === 3) {
      b.cambiaRete(inFila ? s.nascosti : [8, 8], false);
    } else {
      if (!inFila) b.cambiaRete([8, 8], false);
      else s.passi = 0;
      gestiDisegno();
      scriviLibero();
    }
    ora = n;
    scrivi($('.frase'), FRASI[n]!);
    linguette.forEach((l, k) => { if (k === n) l.setAttribute('aria-current', 'step'); else l.removeAttribute('aria-current'); });
    pannelli.forEach(p => { p.hidden = p.dataset.comandi !== String(n); });
    dopo.hidden = n === FRASI.length - 1;
    scatolaFasi.hidden = n !== 3;
    metti(n === 1 || n === 2 || n === 4);
    s.sporco = true;
  }
  linguette.forEach((l, k) => l.addEventListener('click', () => { if (k !== ora) vai(k); }));
  dopo.addEventListener('click', () => vai(ora + 1));
  vai(0);

  document.fonts?.ready.then(() => { s.sporco = true; });
  const ciclo = (adesso: number) => {
    requestAnimationFrame(ciclo);
    avanza(adesso);
    if (s.visibile && s.sporco) { s.sporco = false; b.disegna(); disegnaCurva(adesso); }
  };
  requestAnimationFrame(ciclo);
}
