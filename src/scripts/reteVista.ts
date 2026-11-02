import { avanti, misura, nuovaRete, passo, type Punto, type Rete } from '../lib/rete';

// Una rete vera prova a far emergere una sagoma da una griglia a filo: l'altezza della griglia è l'uscita della rete.
// Un neurone è un taglio dritto; più neuroni si sommano, e gli strati combinano i tagli in forme.
// Due righe dicono sempre cosa sta succedendo (Now) e cosa si può fare adesso (Try); passando su un elemento, Try lo spiega.
const G = 32, T = 9, PASSI_AL_SECONDO = 800, GRUPPO = 64, TASSO = 0.03, TASSO_FINE = 0.01, RALLENTA = 12000, FINE = 20000, MS_AL_FOTOGRAMMA = 7, DURATA_PASSO = 4500, DURATA_SALITA = 1300;
const ALTEZZA = 0.62, PIATTO = 0.52, RIPIDO = 7, SPAZIO_GUIDA = 64;
// Con 5 neuroni uno strato si ferma intorno all'80%, due arrivano oltre il 95%: così si vede cosa aggiunge uno strato
const MAX_NEURONI = 5, MAX_STRATI = 4, NEURONI_INIZIALI = 3;

const SAGOME: Record<string, (x: number, y: number) => boolean> = {
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
type Arco = Neurone & { i: number };

export function monta(radice: HTMLElement) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const scrivi = (el: Element, t: string) => { if (el.textContent !== t) el.textContent = t; };
  const BG = tono('--bg'), FG = tono('--fg'), MUTED = tono('--muted'), LINE = tono('--line'), BLU = tono('--azzurro'), ARANCIO = tono('--arancio');
  const [bR, bG, bB] = rgb(BG), [aR, aG, aB] = rgb(BLU), [oR, oG, oB] = rgb(ARANCIO);
  const scala = (fine: string) => Array.from({ length: 7 }, (_, k) => misto(misto(LINE, MUTED, 0.55), fine, k / 6));
  const TINTE = scala(ARANCIO), TINTE_NEURONE = scala(FG);
  const telaRete = $<HTMLCanvasElement>('.tela-rete'), telaTerreno = $<HTMLCanvasElement>('.tela-terreno'), curva = $<HTMLCanvasElement>('.curva');
  const c = telaRete.getContext('2d')!, t = telaTerreno.getContext('2d')!, cc = curva.getContext('2d')!;
  const gioca = $<HTMLButtonElement>('.gioca'), unPassoB = $<HTMLButtonElement>('.un-passo'), azzera = $<HTMLButtonElement>('.azzera'), piuStrati = $<HTMLButtonElement>('.strati-piu'), menoStrati = $<HTMLButtonElement>('.strati-meno');
  const matita = $<HTMLButtonElement>('.matita'), pulisci = $<HTMLButtonElement>('.pulisci'), sagome = radice.querySelectorAll<HTMLButtonElement>('[data-sagoma]');

  // --- Stato
  let rete: Rete = nuovaRete([], 'tanh', 3), nascosti: number[] = [], seme = 3, passi = 0, visibile = false, sporco = true;
  let celle: Punto[] = [], pieni: Punto[] = [], vuoti: Punto[] = [], bordo: number[] = [], nomeSagoma = 'fish';
  let sopra: Neurone | null = null, fisso: Neurone | null = null, arco: Arco | null = null, spiega = '', giro = 0.55;
  let sonda: (Punto & { p: number }) | null = null, impulso = 0, verso = 1, testoPasso = '';
  let errore = 0, somiglia = 0, matchMostrato = 0, erroreMostrato = 0, primoDato = true, ultimoTesto = 0;
  let storia: [number, number][] = [], storiaPrima: [number, number][] = [], nomePrima = '';
  // alza: quota del filo blu, da 0 (sulla base) a 1. mostra: quanto la griglia segue la rete. salita: l'animazione dopo Done
  let alza = 1, mostra = 1, salita = 0;
  let inMoto = false, disegno = false, anima: { t0: number; q: Punto; p: number; fatto: boolean } | null = null, resto = 0, ultimoTempo = 0, ultimoPunto = 0;
  let man = [[-0.35, 0.8], [0.15, -0.8]] as [number, number][], tenuta = -1;
  const scelto = () => sopra ?? fisso;
  const soloNeurone = () => !nascosti.length;

  // --- Sagoma
  function fissaSagoma(f: (x: number, y: number) => boolean) {
    celle = [];
    for (let r = 0; r < G; r++) for (let q = 0; q < G; q++) { const x = posto(q), y = -posto(r); celle.push({ x, y, c: f(x, y) ? 1 : 0 }); }
    aggiornaSagoma();
  }
  // Bordo della sagoma: i lati delle celle piene che toccano una vuota; si disegna a filo, all'altezza piena
  function aggiornaSagoma() {
    pieni = celle.filter(q => q.c);
    vuoti = celle.filter(q => !q.c);
    bordo = [];
    const pieno = (r: number, q: number) => r >= 0 && q >= 0 && r < G && q < G && celle[r * G + q]!.c === 1;
    const lato = (a: number, b: number, c2: number, d: number) => bordo.push(-1 + (2 * a) / G, 1 - (2 * b) / G, -1 + (2 * c2) / G, 1 - (2 * d) / G);
    for (let r = 0; r < G; r++) for (let q = 0; q < G; q++) {
      if (!pieno(r, q)) continue;
      if (!pieno(r - 1, q)) lato(q, r, q + 1, r);
      if (!pieno(r + 1, q)) lato(q, r + 1, q + 1, r + 1);
      if (!pieno(r, q - 1)) lato(q, r, q, r + 1);
      if (!pieno(r, q + 1)) lato(q + 1, r, q + 1, r + 1);
    }
    sporco = true;
  }

  // --- Rete. Ogni cambio riparte da pesi casuali, così le curve si confrontano; quella di prima resta in grigio
  const nomeForma = () => nascosti.join('+');
  function cambiaRete(nuovi: number[]) {
    if (storia.length > 1) { storiaPrima = storia; nomePrima = nomeForma(); }
    rete = nuovaRete(nuovi, 'tanh', ++seme);
    nascosti = nuovi;
    passi = 0;
    storia = [];
    primoDato = true;
    sopra = fisso = arco = null;
    sporco = true;
    disegnaColonne();
    scriviComandi();
  }
  const gruppo = () => {
    const g: Punto[] = [];
    for (let k = 0; k < GRUPPO; k++) {
      const a = k % 2 ? pieni : vuoti, b = a.length ? a : celle;
      g.push(b[Math.floor(Math.random() * b.length)]!);
    }
    return g;
  };
  const correggi = () => { passo(rete, gruppo(), passi < RALLENTA ? TASSO : TASSO_FINE); passi++; sporco = true; };
  const metti = (si: boolean) => { inMoto = si; gioca.textContent = si ? 'pause' : passi > 0 && passi < FINE ? 'continue' : 'train'; gioca.dataset.stato = si ? 'pausa' : 'via'; sporco = true; };

  // --- Un neurone solo: non si allena, le due maniglie decidono i pesi
  const fissa = () => {
    const [ax, ay] = man[0]!, [bx, by] = man[1]!, nx = -(by - ay), ny = bx - ax, d = Math.hypot(nx, ny) || 1;
    const prova = (v: number) => {
      rete.pesi[0]![0] = (v * RIPIDO * nx) / d;
      rete.pesi[0]![1] = (v * RIPIDO * ny) / d;
      rete.scarti[0]![0] = (-v * RIPIDO * (nx * ax + ny * ay)) / d;
      return somiglianza(rete, celle);
    };
    // Il lato alto del gradino è quello che copre di più la sagoma
    const uno = prova(1);
    if (prova(-1) < uno) prova(1);
    sporco = true;
  };
  const neuroneSolo = () => {
    fermaAnimazione();
    man = [[-0.35, 0.8], [0.15, -0.8]];
    metti(false);
    cambiaRete([]);
    fissa();
  };

  // --- Terreno
  let W = 0, H = 0, Wr = 0, Hr = 0;
  const altezze = new Float32Array((G + 1) * (G + 1)), sx = new Float32Array(altezze.length), sy = new Float32Array(altezze.length);
  const piano = () => {
    const sinistra = W >= 760 ? Wr : 0, libero = W - sinistra, spazio = W >= 760 ? SPAZIO_GUIDA : 0;
    const S = Math.min(libero / 2.95, (H - spazio) / (2 * Math.SQRT2 * PIATTO + ALTEZZA + 0.12));
    return { S, cx: sinistra + libero / 2, cy: spazio + (H - spazio) / 2 + (S * ALTEZZA) / 2, co: Math.cos(giro), si: Math.sin(giro) };
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
    const sel = scelto(), ultimo = rete.forma.length - 1;
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
      const p = avanti(rete, -1 + (2 * i) / G, 1 - (2 * j) / G);
      altezze[j * (G + 1) + i] = mostra * (!sel || sel.l === ultimo ? p : (rete.uscite[sel.l]![sel.j]! + 1) / 2);
    }
  }
  function disegnaTerreno() {
    const { S, cx, cy, co, si } = piano(), sel = scelto();
    t.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    t.clearRect(0, 0, W, H);
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
    // Mentre si disegna, e mentre sale, la sagoma è dipinta sulla base
    if (alza < 1) {
      t.globalAlpha = 0.55 * (1 - alza);
      t.fillStyle = BLU;
      t.beginPath();
      for (const q of pieni) {
        const m = 1 / G, [ax, ay] = proietta(q.x - m, q.y + m, 0), [bx, by] = proietta(q.x + m, q.y + m, 0), [dx, dy] = proietta(q.x + m, q.y - m, 0), [ex, ey] = proietta(q.x - m, q.y - m, 0);
        t.moveTo(ax, ay); t.lineTo(bx, by); t.lineTo(dx, dy); t.lineTo(ex, ey); t.closePath();
      }
      t.fill();
      t.globalAlpha = 1;
    }
    // La sagoma da raggiungere: un filo all'altezza piena
    if (!sel) {
      t.strokeStyle = BLU;
      t.lineWidth = 1.5;
      t.beginPath();
      for (let k = 0; k < bordo.length; k += 4) {
        const [ax, ay] = proietta(bordo[k]!, bordo[k + 1]!, alza), [bx, by] = proietta(bordo[k + 2]!, bordo[k + 3]!, alza);
        t.moveTo(ax, ay); t.lineTo(bx, by);
      }
      t.stroke();
    }
    if (sonda) {
      const [ax, ay] = proietta(sonda.x, sonda.y, 0), [bx, by] = proietta(sonda.x, sonda.y, sonda.p);
      t.strokeStyle = FG;
      t.lineWidth = 2;
      t.beginPath(); t.moveTo(ax, ay); t.lineTo(bx, by); t.stroke();
      t.fillStyle = FG;
      t.fillRect(bx - 4, by - 4, 8, 8);
    }
    if (soloNeurone()) {
      const [ax, ay] = proietta(man[0]![0], man[0]![1], 0), [bx, by] = proietta(man[1]![0], man[1]![1], 0);
      t.strokeStyle = FG;
      t.lineWidth = 1.5;
      t.setLineDash([5, 4]);
      t.beginPath(); t.moveTo(ax, ay); t.lineTo(bx, by); t.stroke();
      t.setLineDash([]);
      for (const [x, y] of [[ax, ay], [bx, by]] as const) {
        t.fillStyle = BG;
        t.fillRect(x - 7, y - 7, 14, 14);
        t.lineWidth = 2;
        t.strokeRect(x - 7, y - 7, 14, 14);
      }
    }
    // Vista dall'alto, in un angolo: si riconosce la forma senza girare il terreno
    const q = W < 340 ? 58 : 84, x0 = W - q - 2, y0 = 2, cella = q / G;
    t.fillStyle = BG;
    t.fillRect(x0, y0, q, q);
    t.fillStyle = ARANCIO;
    t.beginPath();
    if (mostra > 0.5) for (let r = 0; r < G; r++) for (let k = 0; k < G; k++) if (avanti(rete, posto(k), -posto(r)) >= 0.5) t.rect(x0 + k * cella, y0 + r * cella, cella, cella);
    t.fill();
    t.strokeStyle = BLU;
    t.lineWidth = 1;
    t.beginPath();
    for (let k = 0; k < bordo.length; k += 4) {
      t.moveTo(x0 + ((bordo[k]! + 1) / 2) * q, y0 + ((1 - bordo[k + 1]!) / 2) * q);
      t.lineTo(x0 + ((bordo[k + 2]! + 1) / 2) * q, y0 + ((1 - bordo[k + 3]!) / 2) * q);
    }
    t.stroke();
    t.strokeStyle = MUTED;
    t.strokeRect(x0 + 0.5, y0 + 0.5, q, q);
  }

  // --- Rete disegnata: ogni neurone è una mini-mappa di quello che vede
  const ALTO = 34;
  const colonna = (l: number) => {
    const ultimo = rete.forma.length - 1, largo = Math.min(Wr - 56, ultimo * 200);
    return (Wr - largo) / 2 + (largo * l) / ultimo;
  };
  const riga = (l: number, j: number) => ALTO + ((Hr - ALTO - 18) * (j + 0.5)) / rete.forma[l]!;
  const lato = () => Math.max(14, Math.min(36, (Hr - ALTO - 18) / Math.max(...rete.forma) - 6));
  const nome = (l: number, j: number) => (l === 0 ? 'xy'[j]! : l === rete.forma.length - 1 ? 'height' : `n${l}.${j + 1}`);
  const fogliettino = document.createElement('canvas');
  fogliettino.width = fogliettino.height = T;
  const cm = fogliettino.getContext('2d')!, immagine = cm.createImageData(T, T);
  let mappe: Float32Array[][] = [];
  function calcolaMappe() {
    const ultimo = rete.forma.length - 1;
    mappe = rete.forma.map(n => Array.from({ length: n }, () => new Float32Array(T * T)));
    for (let r = 0; r < T; r++) for (let q = 0; q < T; q++) {
      avanti(rete, ((q + 0.5) / T) * 2 - 1, 1 - ((r + 0.5) / T) * 2);
      for (let l = 0; l <= ultimo; l++) for (let j = 0; j < rete.forma[l]!; j++) {
        const v = rete.uscite[l]![j]!;
        mappe[l]![j]![r * T + q] = l === ultimo ? 2 * v - 1 : v;
      }
    }
  }
  function mini(l: number, j: number, x: number, y: number, s: number) {
    const m = mappe[l]![j]!, d = immagine.data;
    for (let k = 0; k < T * T; k++) {
      const v = m[k]!, a = Math.min(1, Math.abs(v)) * 0.85, r = v < 0 ? aR : oR, g = v < 0 ? aG : oG, b = v < 0 ? aB : oB;
      d[k * 4] = bR + (r - bR) * a; d[k * 4 + 1] = bG + (g - bG) * a; d[k * 4 + 2] = bB + (b - bB) * a; d[k * 4 + 3] = 255;
    }
    cm.putImageData(immagine, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(fogliettino, x, y, s, s);
  }
  function disegnaRete() {
    const { forma, pesi } = rete, ultimo = forma.length - 1, q = lato(), sel = scelto();
    c.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    c.clearRect(0, 0, Wr, Hr);
    c.font = FONT;
    for (let l = 1; l <= ultimo; l++) for (let j = 0; j < forma[l]!; j++) for (let i = 0; i < forma[l - 1]!; i++) {
      const w = pesi[l - 1]![j * forma[l - 1]! + i]!, forza = Math.abs(w), entra = !!sel && l === sel.l && j === sel.j, questo = arco && arco.l === l && arco.j === j && arco.i === i;
      c.globalAlpha = questo ? 1 : Math.min(0.9, 0.14 + forza * 0.22) * (sel && !entra ? 0.1 : 1);
      c.strokeStyle = questo ? FG : w > 0 ? ARANCIO : BLU;
      c.lineWidth = Math.min(3.5, 0.5 + forza * 0.45);
      c.beginPath();
      c.moveTo(colonna(l - 1), riga(l - 1, i));
      c.lineTo(colonna(l), riga(l, j));
      c.stroke();
    }
    c.globalAlpha = 1;
    if (impulso > 0 && impulso < 1) {
      const f = impulso * ultimo, k = Math.min(ultimo - 1, Math.floor(f)), fr = f - k;
      const da = verso > 0 ? k : ultimo - k, a = verso > 0 ? k + 1 : ultimo - k - 1;
      c.fillStyle = verso > 0 ? FG : ARANCIO;
      for (let i = 0; i < forma[da]!; i++) for (let j = 0; j < forma[a]!; j++) {
        c.fillRect(colonna(da) + (colonna(a) - colonna(da)) * fr - 2, riga(da, i) + (riga(a, j) - riga(da, i)) * fr - 2, 4, 4);
      }
    }
    c.textBaseline = 'middle';
    for (let l = 0; l <= ultimo; l++) for (let j = 0; j < forma[l]!; j++) {
      const x = colonna(l), y = riga(l, j), attivo = sel && sel.l === l && sel.j === j, sorgente = sel && l === sel.l - 1;
      // Passando su un neurone restano accese solo le mappe da cui legge: sono i pezzi con cui fa la sua forma
      c.globalAlpha = sel && !attivo && !sorgente ? 0.22 : 1;
      mini(l, j, x - q / 2, y - q / 2, q);
      c.strokeStyle = attivo ? FG : MUTED;
      c.lineWidth = attivo ? 2 : 1;
      c.strokeRect(Math.round(x - q / 2) + 0.5, Math.round(y - q / 2) + 0.5, Math.round(q), Math.round(q));
    }
    c.globalAlpha = 1;
    // Il peso di ogni pezzo, sulla linea che entra nel neurone scelto
    if (sel && sel.l > 0) {
      c.textAlign = 'center';
      for (let i = 0; i < forma[sel.l - 1]!; i++) {
        const w = pesi[sel.l - 1]![sel.j * forma[sel.l - 1]! + i]!, x = colonna(sel.l - 1) + (colonna(sel.l) - colonna(sel.l - 1)) * 0.42, y = riga(sel.l - 1, i) + (riga(sel.l, sel.j) - riga(sel.l - 1, i)) * 0.42, e = f2(w), tw = c.measureText(e).width;
        c.fillStyle = BG;
        c.fillRect(x - tw / 2 - 2, y - 7, tw + 4, 14);
        c.fillStyle = FG;
        c.fillText(e, x, y);
      }
    }
    c.fillStyle = MUTED;
    c.textAlign = 'right';
    c.fillText('x', colonna(0) - q / 2 - 5, riga(0, 0));
    c.fillText('y', colonna(0) - q / 2 - 5, riga(0, 1));
    c.textAlign = 'center';
    c.fillText('height', colonna(ultimo), riga(ultimo, 0) + q / 2 + 10);
  }
  // Grafico del match: stessi assi per tutte le reti, così si confrontano. In basso le correzioni, a sinistra la percentuale
  function disegnaCurva() {
    const w = curva.clientWidth, h = curva.clientHeight, d = devicePixelRatio, sx0 = 30, sy0 = 22, altoG = h - sy0 - 16, largoG = w - sx0 - 6;
    if (curva.width !== w * d) { curva.width = w * d; curva.height = h * d; }
    cc.setTransform(d, 0, 0, d, 0, 0);
    cc.clearRect(0, 0, w, h);
    cc.font = FONT;
    const px = (q: number) => sx0 + (q / FINE) * largoG, py = (v: number) => sy0 + (1 - v) * altoG;
    cc.textBaseline = 'middle';
    cc.textAlign = 'right';
    cc.lineWidth = 1;
    for (const v of [0, 0.5, 1]) {
      cc.strokeStyle = LINE;
      cc.beginPath(); cc.moveTo(sx0, Math.round(py(v)) + 0.5); cc.lineTo(w - 6, Math.round(py(v)) + 0.5); cc.stroke();
      cc.fillStyle = MUTED;
      cc.fillText(`${v * 100}%`, sx0 - 4, py(v));
    }
    cc.textAlign = 'left';
    cc.fillText('0', sx0, h - 6);
    cc.textAlign = 'right';
    cc.fillText(`${FINE / 1000}k corrections`, w - 6, h - 6);
    const linea = (dati: [number, number][], colore: string) => {
      cc.strokeStyle = colore;
      cc.lineWidth = 2;
      cc.beginPath();
      dati.forEach(([q, v], k) => { if (k) cc.lineTo(px(q), py(v)); else cc.moveTo(px(q), py(v)); });
      cc.stroke();
    };
    linea(storiaPrima, MUTED);
    linea(storia, ARANCIO);
    // Legenda: quale rete è quale, col risultato
    cc.textBaseline = 'top';
    cc.textAlign = 'left';
    let x = sx0;
    const voce = (colore: string, testo: string) => {
      cc.fillStyle = colore;
      cc.fillRect(x, 3, 10, 2);
      cc.fillText(testo, x + 14, 0);
      x += 14 + cc.measureText(testo).width + 14;
    };
    if (nascosti.length) voce(ARANCIO, `now ${nomeForma()}`);
    if (storiaPrima.length) voce(MUTED, `before ${nomePrima}: ${Math.round(storiaPrima[storiaPrima.length - 1]![1] * 100)}%`);
  }

  // --- Now e Try: cosa sta succedendo, e cosa puoi fare adesso
  const rigaOra = $<HTMLElement>('.riga-ora'), rigaProva = $<HTMLElement>('.riga-prova'), cartelloProva = $<HTMLElement>('.cartello.prova');
  const descrizione = () => {
    const tot = nascosti.reduce((a, b) => a + b, 0), k = nascosti.length;
    return `${tot} ${tot === 1 ? 'neuron' : 'neurons'} in ${k} ${k === 1 ? 'layer' : 'layers'}`;
  };
  const cosaFa = () => {
    if (anima) return 'Stopped, showing one correction slowly.';
    if (disegno) return 'The network is stopped while you paint.';
    if (salita) return 'Your shape rises to the height the network must reach.';
    if (soloNeurone()) return 'One neuron, with weights set by you: one straight cut.';
    const forma = nomeSagoma === 'draw' ? 'your shape' : `a ${nomeSagoma}`;
    if (passi >= FINE) return `Finished: ${descrizione()} trained on ${forma}.`;
    return inMoto ? `Training ${descrizione()} to draw ${forma}.` : `Stopped: ${descrizione()}, ${forma}.`;
  };
  // Il consiglio accende anche il comando giusto
  let consigliato: Element | null = null;
  const consiglia = (el: Element | null) => { if (el !== consigliato) { consigliato?.classList.remove('consigliato'); el?.classList.add('consigliato'); consigliato = el; } };
  const cosaProvare = (): [string, Element | null] => {
    if (anima) return [testoPasso, null];
    if (salita) return ['Now the network must learn your shape.', null];
    if (disegno) return ['Paint on the grid, then press done.', pieni.length ? matita : null];
    if (soloNeurone()) return ['Drag the white squares to cover the fish, then press + next to layers.', piuStrati];
    if (!inMoto && passi < FINE) return [`Press ${gioca.textContent} to train the network.`, gioca];
    if (matchMostrato >= 0.95) return ['It got it. Try another shape, or draw your own.', sagome[nomeSagoma === 'fish' ? 1 : 0] ?? null];
    if (nascosti.length === 1 && nascosti[0]! < MAX_NEURONI) return ['Add a neuron with + above the layer. Training starts over, so you can compare.', colonne.querySelector('button:last-child')];
    if (nascosti.length === 1 && passi > 5000) return ['One layer gets stuck. Press + next to layers and compare the lines.', piuStrati];
    if (passi > 4000 && matchMostrato < 0.9) return ['Add neurons or layers to do better.', null];
    return ['Hover or tap a square in the network to see what that neuron sees.', null];
  };
  const spiegaNeurone = () => {
    const sel = scelto();
    if (arco) {
      const w = rete.pesi[arco.l - 1]![arco.j * rete.forma[arco.l - 1]! + arco.i]!;
      return `This weight: ${nome(arco.l - 1, arco.i)} counts ${f2(w)} for ${nome(arco.l, arco.j)}. ${w > 0 ? 'Orange pushes up.' : 'Blue pushes down.'}`;
    }
    if (!sel) return '';
    if (sel.l === 0) return `${nome(0, sel.j)} is the ${sel.j ? 'north-south' : 'east-west'} position on the grid. The grid shows it as a slope.`;
    const entrate = rete.forma[sel.l - 1]!, ultimo = rete.forma.length - 1;
    const cosa = sel.l === ultimo ? (ultimo === 1 ? 'A single neuron makes one cut' : 'The output adds its inputs up') : sel.l === 1 ? 'This neuron sees one straight cut' : 'This neuron combines the cuts before it';
    let somma = '';
    for (let i = 0; i < entrate; i++) {
      const w = rete.pesi[sel.l - 1]![sel.j * entrate + i]!;
      somma += `${i ? (w < 0 ? ' - ' : ' + ') : w < 0 ? '-' : ''}${f2(Math.abs(w))}·${nome(sel.l - 1, i)}`;
    }
    return `${cosa}: squash(${somma}).`;
  };
  function scriviRighe() {
    scrivi(rigaOra, cosaFa());
    const [prova, el] = cosaProvare(), qui = spiegaNeurone() || spiega;
    scrivi(rigaProva, qui || prova);
    scrivi(cartelloProva, qui ? 'this' : anima ? 'step' : 'try');
    consiglia(qui ? null : el);
    scrivi($('.lettura'), disegno ? 'match –' : `match ${Math.round(matchMostrato * 100)}%`);
    scrivi($('.errore'), disegno ? '' : `error ${erroreMostrato.toFixed(2)}`);
  }
  radice.addEventListener('pointerover', e => {
    const q = (e.target as Element).closest?.('[data-spiega]') as HTMLElement | null, nuovo = q?.dataset.spiega ?? '';
    if (nuovo !== spiega) { spiega = nuovo; sporco = true; }
  });

  // --- Contatori: gli strati sopra la rete, i neuroni sopra ogni strato
  const colonne = $<HTMLElement>('.colonne');
  function disegnaColonne() {
    colonne.replaceChildren();
    if (!Wr) return;
    if (nascosti.length) {
      const nomeC = document.createElement('span');
      nomeC.className = 'nome-colonna';
      nomeC.textContent = 'neurons';
      colonne.append(nomeC);
    }
    nascosti.forEach((n, l) => {
      const e = document.createElement('span');
      e.className = 'colonna';
      e.style.left = `${colonna(l + 1)}px`;
      e.dataset.spiega = 'Neurons in this layer. More neurons mean more cuts. Changing them starts training over.';
      const bottone = (t2: string, azione: string, d: number, spento: boolean) => {
        const q = document.createElement('button');
        q.type = 'button';
        q.textContent = t2;
        q.disabled = spento;
        q.setAttribute('aria-label', `${azione} layer ${l + 1}`);
        q.addEventListener('click', () => { cambiaRete(nascosti.map((v, k) => (k === l ? n + d : v))); metti(true); });
        return q;
      };
      const numero = document.createElement('b');
      numero.textContent = String(n);
      e.append(bottone('−', 'Remove a neuron from', -1, n <= 1), numero, bottone('+', 'Add a neuron to', 1, n >= MAX_NEURONI));
      colonne.append(e);
    });
  }
  function scriviComandi() {
    const k = nascosti.length;
    scrivi($('.strati-n'), String(k));
    menoStrati.disabled = k <= 0;
    piuStrati.disabled = k >= MAX_STRATI;
    gioca.hidden = unPassoB.hidden = azzera.hidden = k === 0;
    $<HTMLElement>('.nota-solo').hidden = k !== 0;
  }
  piuStrati.addEventListener('click', () => {
    cambiaRete(nascosti.length ? [...nascosti, nascosti[nascosti.length - 1]!] : [NEURONI_INIZIALI]);
    metti(true);
  });
  menoStrati.addEventListener('click', () => {
    if (nascosti.length === 1) neuroneSolo();
    else { cambiaRete(nascosti.slice(0, -1)); metti(true); }
  });

  // --- Play, una correzione, ricomincia
  function fermaAnimazione() { anima = null; sonda = null; testoPasso = ''; impulso = 0; sporco = true; }
  gioca.addEventListener('click', () => {
    if (anima) return;
    if (passi >= FINE) passi = RALLENTA;
    metti(!inMoto);
  });
  azzera.addEventListener('click', () => { fermaAnimazione(); cambiaRete(nascosti); metti(true); });
  unPassoB.addEventListener('click', () => {
    if (anima) return;
    metti(false);
    const insieme = Math.random() < 0.5 && pieni.length ? pieni : vuoti.length ? vuoti : celle, q = insieme[Math.floor(Math.random() * insieme.length)]!;
    const p = avanti(rete, q.x, q.y);
    if (calmo) { correggi(); return; }
    anima = { t0: performance.now(), q, p, fatto: false };
    sonda = { ...q, p };
  });
  function avanza(adesso: number) {
    const dt = Math.min(0.1, (adesso - ultimoTempo) / 1000);
    ultimoTempo = adesso;
    if (inMoto && visibile) {
      // Una velocità fissa, per vedere la rete imparare. Su un telefono lento si ferma prima
      resto += dt * PASSI_AL_SECONDO;
      const n = Math.floor(resto), t0 = performance.now();
      resto -= n;
      for (let k = 0; k < n && passi < FINE && performance.now() - t0 < MS_AL_FOTOGRAMMA; k++) correggi();
      if (passi >= FINE) metti(false);
    }
    if (anima) {
      const f = (adesso - anima.t0) / DURATA_PASSO, { q, p } = anima;
      if (f < 0.34) {
        verso = 1; impulso = f / 0.34;
        testoPasso = `1 Try: this point gets height ${f2(p)}. It should be ${q.c}.`;
      } else if (f < 0.6) {
        impulso = 0;
        testoPasso = `2 Error: -log(${q.c ? f2(p) : f2(1 - p)}) = ${f2(-Math.log(Math.max(1e-9, q.c ? p : 1 - p)))}. Far from the right height means a big error.`;
      } else {
        verso = -1; impulso = (f - 0.6) / 0.4;
        testoPasso = '3 Backpropagation sends the error back, and gradient descent moves each weight a little.';
        if (!anima.fatto) { correggi(); anima.fatto = true; sonda = { ...q, p: avanti(rete, q.x, q.y) }; }
      }
      sporco = true;
      if (f >= 1) fermaAnimazione();
    }
    if (salita) {
      const f = (adesso - salita) / DURATA_SALITA, morbido = (v: number) => { const q = Math.max(0, Math.min(1, v)); return q * q * (3 - 2 * q); };
      alza = morbido(f / 0.65);
      mostra = morbido((f - 0.6) / 0.4);
      sporco = true;
      if (f >= 0.65 && !inMoto) metti(true);
      if (f >= 1) { salita = 0; alza = mostra = 1; }
    }
    if (inMoto && nascosti.length && !primoDato && adesso - ultimoPunto > 120) {
      ultimoPunto = adesso;
      storia.push([passi, matchMostrato]);
    }
  }

  // --- Forme e disegno direttamente sul terreno
  const segna = (nomeB: string) => sagome.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.sagoma === nomeB)));
  const pannello = $<HTMLElement>('.pannello');
  const disegnando = (si: boolean) => {
    disegno = si;
    matita.setAttribute('aria-pressed', String(si));
    matita.textContent = si ? 'done' : 'draw';
    pulisci.hidden = !si;
    telaTerreno.classList.toggle('pennello', si);
    pannello.classList.toggle('spento', si);
    sporco = true;
  };
  const scegliForma = (nomeF: string) => {
    disegnando(false);
    salita = 0; alza = mostra = 1;
    nomeSagoma = nomeF;
    segna(nomeF);
    fissaSagoma(SAGOME[nomeF]!);
    storia = []; storiaPrima = []; passi = 0; primoDato = true;
    if (soloNeurone()) fissa(); else metti(true);
  };
  sagome.forEach(x => x.addEventListener('click', () => scegliForma(x.dataset.sagoma!)));
  matita.addEventListener('click', () => {
    if (disegno) {
      // Niente di dipinto: si torna al pesce. Altrimenti la sagoma sale e l'allenamento riparte
      if (!pieni.length) { scegliForma('fish'); return; }
      disegnando(false);
      cambiaRete(nascosti);
      storiaPrima = [];
      if (calmo) { alza = mostra = 1; metti(true); } else salita = performance.now();
      return;
    }
    fermaAnimazione();
    metti(false);
    salita = 0;
    if (soloNeurone()) cambiaRete([NEURONI_INIZIALI]);
    nomeSagoma = 'draw';
    segna('');
    celle.forEach(q => { q.c = 0; });
    aggiornaSagoma();
    alza = mostra = 0;
    disegnando(true);
  });
  pulisci.addEventListener('click', () => { celle.forEach(q => { q.c = 0; }); aggiornaSagoma(); });
  let colore = 1, ultimoPennello: [number, number] | null = null;
  const dipingi = (x: number, y: number) => {
    const [u, v] = sulPavimento(x, y), k = Math.floor(((u + 1) / 2) * G), r = Math.floor(((1 - v) / 2) * G), [k0, r0] = ultimoPennello ?? [k, r], tratti = Math.max(1, Math.abs(k - k0), Math.abs(r - r0));
    for (let n = 0; n <= tratti; n++) {
      const qk = Math.round(k0 + ((k - k0) * n) / tratti), qr = Math.round(r0 + ((r - r0) * n) / tratti);
      for (const [dr, dk] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
        const a = qr + dr, c2 = qk + dk;
        if (a >= 0 && c2 >= 0 && a < G && c2 < G) celle[a * G + c2]!.c = colore;
      }
    }
    ultimoPennello = [k, r];
    aggiornaSagoma();
  };

  // --- Puntatore sulla rete
  const dove = (e: PointerEvent, tela: HTMLElement) => { const r = tela.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  function cerca(x: number, y: number, dito: boolean): Neurone | null {
    const q = lato() / 2 + (dito ? 7 : 2), { forma } = rete;
    for (let l = 0; l < forma.length; l++) for (let j = 0; j < forma[l]!; j++) if (Math.abs(x - colonna(l)) <= q && Math.abs(y - riga(l, j)) <= q) return { l, j };
    return null;
  }
  function cercaArco(x: number, y: number): Arco | null {
    let meglio: Arco | null = null, d = 5;
    const { forma } = rete;
    for (let l = 1; l < forma.length; l++) for (let j = 0; j < forma[l]!; j++) for (let i = 0; i < forma[l - 1]!; i++) {
      const x0 = colonna(l - 1), y0 = riga(l - 1, i), dx = colonna(l) - x0, dy = riga(l, j) - y0;
      const u = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy))), q = Math.hypot(x - x0 - dx * u, y - y0 - dy * u);
      if (q < d) { d = q; meglio = { l, j, i }; }
    }
    return meglio;
  }
  telaRete.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const [x, y] = dove(e, telaRete), n = cerca(x, y, false), a = n ? null : cercaArco(x, y);
    if (n?.l !== sopra?.l || n?.j !== sopra?.j || a?.l !== arco?.l || a?.j !== arco?.j || a?.i !== arco?.i) { sopra = n; arco = a; sporco = true; }
    telaRete.style.cursor = n ? 'pointer' : '';
  });
  telaRete.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { sopra = null; arco = null; sporco = true; } });
  telaRete.addEventListener('pointerdown', e => {
    const [x, y] = dove(e, telaRete), n = cerca(x, y, e.pointerType !== 'mouse');
    fisso = n && !(fisso?.l === n.l && fisso?.j === n.j) ? n : null;
    sporco = true;
  });

  // --- Puntatore sul terreno: dipinge, sposta le maniglie o lo gira
  const maniglia = (x: number, y: number, raggio: number) => man.findIndex(m => { const [px, py] = proietta(m[0], m[1], 0); return Math.hypot(x - px, y - py) < raggio; });
  let gira = false, dipinge = false, xPrima = 0;
  telaTerreno.addEventListener('pointerdown', e => {
    const [x, y] = dove(e, telaTerreno);
    telaTerreno.setPointerCapture(e.pointerId);
    if (disegno) {
      const [u, v] = sulPavimento(x, y), k = Math.floor(((u + 1) / 2) * G), r = Math.floor(((1 - v) / 2) * G);
      colore = celle[r * G + k]?.c ? 0 : 1;
      ultimoPennello = null;
      dipinge = true;
      dipingi(x, y);
      return;
    }
    if (soloNeurone()) { tenuta = maniglia(x, y, e.pointerType === 'mouse' ? 14 : 26); if (tenuta >= 0) return; }
    gira = true;
    xPrima = e.clientX;
  });
  // Col dito pennello e maniglie si tengono da subito: la pagina non scorre mentre li usi
  telaTerreno.addEventListener('touchstart', e => {
    const b = telaTerreno.getBoundingClientRect(), d = e.touches[0]!;
    if (disegno || (soloNeurone() && maniglia(d.clientX - b.left, d.clientY - b.top, 26) >= 0)) e.preventDefault();
  }, { passive: false });
  telaTerreno.addEventListener('pointermove', e => {
    const [x, y] = dove(e, telaTerreno);
    if (dipinge) { dipingi(x, y); return; }
    if (tenuta >= 0) {
      const [u, v] = sulPavimento(x, y);
      man[tenuta] = [Math.max(-1, Math.min(1, u)), Math.max(-1, Math.min(1, v))];
      if (Math.hypot(man[0]![0] - man[1]![0], man[0]![1] - man[1]![1]) > 0.08) fissa();
      return;
    }
    if (!gira) return;
    giro -= (e.clientX - xPrima) * 0.008;
    xPrima = e.clientX;
    sporco = true;
  });
  const fine = () => { gira = false; dipinge = false; tenuta = -1; };
  telaTerreno.addEventListener('pointerup', fine);
  telaTerreno.addEventListener('pointercancel', fine);

  // --- Pannello "how it works"
  const aiuto = $<HTMLButtonElement>('.aiuto'), pannelloAiuto = $<HTMLElement>('.pannello-aiuto');
  const apriAiuto = (si: boolean) => { pannelloAiuto.hidden = !si; aiuto.setAttribute('aria-expanded', String(si)); };
  aiuto.addEventListener('click', () => apriAiuto(pannelloAiuto.hidden));
  $('.chiudi').addEventListener('click', () => apriAiuto(false));

  // --- Misure, avvio e ciclo
  const misuraTele = () => {
    W = telaTerreno.clientWidth; H = telaTerreno.clientHeight; Wr = telaRete.clientWidth; Hr = telaRete.clientHeight;
    const d = devicePixelRatio;
    telaTerreno.width = W * d; telaTerreno.height = H * d;
    telaRete.width = Wr * d; telaRete.height = Hr * d;
    disegnaColonne();
    sporco = true;
  };
  const misure = new ResizeObserver(misuraTele);
  misure.observe(telaTerreno);
  misure.observe(telaRete);
  new IntersectionObserver(v => { visibile = v.some(x => x.isIntersecting); }, { rootMargin: '60px' }).observe(telaTerreno);
  misuraTele();
  fissaSagoma(SAGOME.fish!);
  segna('fish');
  neuroneSolo();
  storiaPrima = [];
  document.fonts?.ready.then(() => { sporco = true; });
  const ciclo = (adesso: number) => {
    requestAnimationFrame(ciclo);
    avanza(adesso);
    if (!visibile || !sporco || !W || !Wr) return;
    sporco = false;
    const m = misura(rete, celle);
    errore = m.errore;
    somiglia = somiglianza(rete, celle);
    const passo2 = 1 - Math.exp(-(adesso - ultimoTesto) / 700);
    if (primoDato || soloNeurone()) { matchMostrato = somiglia; erroreMostrato = errore; primoDato = false; }
    else { matchMostrato += (somiglia - matchMostrato) * passo2; erroreMostrato += (errore - erroreMostrato) * passo2; }
    ultimoTesto = adesso;
    calcolaAltezze();
    calcolaMappe();
    disegnaTerreno();
    disegnaRete();
    disegnaCurva();
    scriviRighe();
  };
  requestAnimationFrame(ciclo);
}
