// Le immagini wireframe della timeline: piccole storie in loop, che fanno capire il fatto anche a chi non è tecnico.
// Dove esistono i dati veri si usano quelli: la sesta partita di Deep Blue e Kasparov e le prime 37 mosse della seconda partita di
// AlphaGo e Lee Sedol sono le mosse reali. Tutto è disegnato su una tela piccola e ingrandito senza sfumature, così ogni pixel è un
// blocco (3 px su computer, 2 su telefono), con due soli stati: acceso o spento. Le linee lontane sono a pixel alterni.
import loghi from './arteLoghi.json';

export const LARGHEZZA = 130, ALTEZZA = 116;

type Punto = readonly [number, number, number];
type L = [Punto, Punto][];
type Testo = { x: number; y: number; t: string; s?: number };
// Ciò che una scena aggiunge a ogni fotogramma: linee in 3D, testi, pixel e linee sulla tela
type Vivo = {
  l: L; testi: Testo[];
  pixel: (x: number, y: number) => void;
  linea: (x0: number, y0: number, x1: number, y1: number, tratteggio?: boolean) => void;
  cancella: (x: number, y: number, w: number, h: number) => void;
  proietta: (p: Punto) => readonly [number, number, number];
};
export type Scena = { linee: L; testi: Testo[]; giro: 'pieno' | 'oscilla' | 'fermo'; inclina: number; scala: number; centroY: number; ampiezza?: number; tenue?: boolean; anima?: (t: number, v: Vivo) => void };
const SCENA_PIANA = { linee: [] as L, testi: [] as Testo[], giro: 'fermo' as const, inclina: 0, scala: 1, centroY: 0 };

// --- Il carattere a pixel: 5x7, ogni riga è un numero di 5 bit
const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [30, 1, 1, 14, 1, 1, 30], 4: [2, 6, 10, 18, 31, 2, 2],
  5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  '%': [24, 25, 2, 4, 8, 19, 3], '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], "'": [4, 4, 8, 0, 0, 0, 0], '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2], '=': [0, 0, 31, 0, 31, 0, 0], '-': [0, 0, 0, 31, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '?': [14, 17, 1, 2, 4, 0, 4], '!': [4, 4, 4, 4, 4, 0, 4], ':': [0, 12, 12, 0, 12, 12, 0],
};
const pieno = (g: number[] | undefined, x: number, y: number) => !!g && x >= 0 && x < 5 && y >= 0 && y < 7 && !!(g[y]! & (16 >> x));
const centrato = (t: string, y: number, s = 1, x = LARGHEZZA / 2): Testo => ({ x: Math.round(x - ((t.length * 6 - 1) * s) / 2), y, t, s });

// --- I mattoni
const seg = (l: L, a: Punto, b: Punto) => { l.push([a, b]); };
const lungo = (a: Punto, b: Punto, u: number): Punto => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const dolce = (u: number) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
const sulPercorso = (p: readonly Punto[], u: number): Punto => { const v = Math.min(0.9999, Math.max(0, u)) * (p.length - 1), k = Math.floor(v); return lungo(p[k]!, p[k + 1]!, v - k); };
// Un numero fra 0 e 1 che dipende solo dai suoi ingressi: il rumore resta uguale finché non cambia il passo
const caso = (a: number, b: number, c = 0) => { const v = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return v - Math.floor(v); };
function cubo(l: L, x: number, y: number, z: number, w: number, h: number, d: number) {
  const P = (a: number, b: number, c: number): Punto => [x + (a * w) / 2, y + (b * h) / 2, z + (c * d) / 2];
  for (const a of [-1, 1]) for (const b of [-1, 1]) { seg(l, P(a, b, -1), P(a, b, 1)); seg(l, P(a, -1, b), P(a, 1, b)); seg(l, P(-1, a, b), P(1, a, b)); }
}
function anello(l: L, x: number, y: number, z: number, r: number, asse: 'x' | 'y' | 'z', n = 14) {
  const p = (k: number): Punto => { const a = (k / n) * Math.PI * 2, u = Math.cos(a) * r, v = Math.sin(a) * r; return asse === 'y' ? [x + u, y, z + v] : asse === 'x' ? [x, y + u, z + v] : [x + u, y + v, z]; };
  for (let k = 0; k < n; k++) seg(l, p(k), p(k + 1));
}
function nodo(l: L, x: number, y: number, z: number, r: number) {
  const giro: Punto[] = [[x + r, y, z], [x, y, z + r], [x - r, y, z], [x, y, z - r]];
  giro.forEach((p, k) => { seg(l, p, giro[(k + 1) % 4]!); seg(l, [x, y + r, z], p); seg(l, [x, y - r, z], p); });
}
const impulso = (l: L, p: Punto, r = 0.09) => nodo(l, p[0], p[1], p[2], r);
function riquadro(v: Vivo, x0: number, y0: number, x1: number, y1: number) { v.linea(x0, y0, x1, y0); v.linea(x1, y0, x1, y1); v.linea(x1, y1, x0, y1); v.linea(x0, y1, x0, y0); }

// --- Deep Blue contro Kasparov, sesta partita, 11 maggio 1997: tutte le mosse vere. Deep Blue ha il bianco
const PARTITA: [string, string, string][] = [['e4', 'e2', 'e4'], ['c6', 'c7', 'c6'], ['d4', 'd2', 'd4'], ['d5', 'd7', 'd5'], ['Nc3', 'b1', 'c3'], ['dxe4', 'd5', 'e4'], ['Nxe4', 'c3', 'e4'], ['Nd7', 'b8', 'd7'], ['Ng5', 'e4', 'g5'], ['Ngf6', 'g8', 'f6'], ['Bd3', 'f1', 'd3'], ['e6', 'e7', 'e6'], ['N1f3', 'g1', 'f3'], ['h6', 'h7', 'h6'], ['Nxe6', 'g5', 'e6'], ['Qe7', 'd8', 'e7'], ['O-O', 'e1', 'g1'], ['fxe6', 'f7', 'e6'], ['Bg6+', 'd3', 'g6'], ['Kd8', 'e8', 'd8'], ['Bf4', 'c1', 'f4'], ['b5', 'b7', 'b5'], ['a4', 'a2', 'a4'], ['Bb7', 'c8', 'b7'], ['Re1', 'f1', 'e1'], ['Nd5', 'f6', 'd5'], ['Bg3', 'f4', 'g3'], ['Kc8', 'd8', 'c8'], ['axb5', 'a4', 'b5'], ['cxb5', 'c6', 'b5'], ['Qd3', 'd1', 'd3'], ['Bc6', 'b7', 'c6'], ['Bf5', 'g6', 'f5'], ['exf5', 'e6', 'f5'], ['Rxe7', 'e1', 'e7'], ['Bxe7', 'f8', 'e7'], ['c4', 'c2', 'c4']];
const PEZZI: Record<string, string[]> = {
  P: ['.........', '.........', '...###...', '...###...', '....#....', '...###...', '..#####..', '.#######.', '.........'],
  R: ['.#.#.#.#.', '.#######.', '..#####..', '...###...', '...###...', '...###...', '..#####..', '.#######.', '.........'],
  N: ['...##....', '..####...', '.#####.#.', '.########', '...#####.', '..#####..', '..####...', '.######..', '.#######.'],
  B: ['....#....', '...###...', '...#.#...', '..##.##..', '..#####..', '...###...', '...###...', '..#####..', '.#######.'],
  Q: ['#..#.#..#', '#.#####.#', '.#######.', '..#####..', '...###...', '...###...', '..#####..', '.#######.', '.........'],
  K: ['....#....', '...###...', '....#....', '..#####..', '.#######.', '..#####..', '...###...', '..#####..', '.#######.'],
};
function tavolaIniziale() {
  const t = new Map<string, string>(), riga = 'RNBQKBNR';
  for (let f = 0; f < 8; f++) { const c = 'abcdefgh'[f]!; t.set(`${c}1`, riga[f]!); t.set(`${c}2`, 'P'); t.set(`${c}7`, 'p'); t.set(`${c}8`, riga[f]!.toLowerCase()); }
  return t;
}
function scacchi(): Scena {
  const l: L = [], m = 0.25, a = 1;
  for (let k = 0; k <= 8; k++) { const v = -a + k * m; seg(l, [v, 0, -a], [v, 0, a]); seg(l, [-a, 0, v], [a, 0, v]); }
  // Le posizioni si calcolano una volta: a ogni mossa la tavola è quella vera. L'arrocco muove anche la torre
  const storia: Map<string, string>[] = [tavolaIniziale()];
  for (const [san, da, a_] of PARTITA) { const t = new Map(storia[storia.length - 1]!), p = t.get(da)!; t.delete(da); t.set(a_, p); if (san === 'O-O') { t.delete('h1'); t.set('f1', 'R'); } storia.push(t); }
  const dx = (s: string) => -a + (s.charCodeAt(0) - 97 + 0.5) * m, dz = (s: string) => a - (+s[1]! - 0.5) * m;
  const SACRIFICIO = 14, DUR = 0.42, PAUSA = 1.5, FINE = PARTITA.length * DUR + PAUSA;
  const pezzo = (v: Vivo, cod: string, x: number, z: number, y3 = 0, caduto = false) => {
    const [px, py] = v.proietta([x, y3, z]), sp = PEZZI[cod.toUpperCase()]!, nero = cod === cod.toLowerCase(), X = Math.round(px - 4), Y = Math.round(py - 5);
    v.cancella(X, Y, 9, 9);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const on = (q: number, w: number) => sp[w]?.[q] === '#';
      if (!on(c, r)) continue;
      // Il bianco è il solo contorno, il nero è pieno. Il re che cade è girato di lato
      if (nero || !on(c - 1, r) || !on(c + 1, r) || !on(c, r - 1) || !on(c, r + 1)) { if (caduto) v.pixel(X + 8 - r, Y + c); else v.pixel(X + c, Y + r); }
    }
  };
  return {
    linee: l, testi: [], giro: 'oscilla', ampiezza: 0.05, tenue: true, inclina: 1.22, scala: 48, centroY: 58,
    anima: (t0, v) => {
      const t = t0 % (FINE + 5.5);
      // Quale mossa è in corso: la sesta partita è stata rapida, e l'ottava mossa del bianco è il sacrificio che la decide
      let k = -1, resto = t, durata = DUR;
      for (let i = 0; i < PARTITA.length; i++) { durata = i === SACRIFICIO ? DUR + PAUSA : DUR; if (resto < durata) { k = i; break; } resto -= durata; }
      const finita = k < 0, tav = finita ? storia[PARTITA.length]! : storia[k]!;
      const mossa = finita ? null : PARTITA[k]!, u = finita ? 1 : dolce((resto / DUR) * 1.3);
      tav.forEach((cod, sq) => {
        if (mossa && sq === mossa[1]) return;
        if (mossa?.[0] === 'O-O' && sq === 'h1') return;
        pezzo(v, cod, dx(sq), dz(sq), 0, finita && cod === 'k' && t - FINE > 0.7);
      });
      if (mossa) {
        const cod = tav.get(mossa[1])!;
        pezzo(v, cod, dx(mossa[1]) + (dx(mossa[2]) - dx(mossa[1])) * u, dz(mossa[1]) + (dz(mossa[2]) - dz(mossa[1])) * u);
        if (mossa[0] === 'O-O') pezzo(v, 'R', dx('h1') + (dx('f1') - dx('h1')) * u, dz('h1'));
        const n = Math.floor(k / 2) + 1, nome = mossa[0].toUpperCase();
        v.testi.push(centrato(k % 2 ? `${n}... ${nome}` : `${n}. ${nome}`, 1));
        v.testi.push(centrato(k === SACRIFICIO ? 'KNIGHT SACRIFICE' : 'GAME 6, 1997', 109));
      } else {
        v.testi.push(centrato('KASPAROV RESIGNS', 1));
        v.testi.push(centrato(t - FINE > 2 ? 'MATCH: 3.5 - 2.5' : '19. C4', 109));
      }
    },
  };
}

// --- AlphaGo contro Lee Sedol, seconda partita, 10 marzo 2016: le prime 37 mosse vere, dal file della partita. AlphaGo ha il nero
const MOSSE_GO = 'pd dp cd qp op oq nq pq cn fq mp qn ic dj po qo cp cq bq co bp bo do bn dq ep dr cm jp cg ed qf qe pf nd pi oj'.split(' ');
function go(): Scena {
  const l: L = [], m = 0.1, a0 = 0.9;
  for (let k = 0; k < 19; k++) { const v = -a0 + k * m; seg(l, [v, 0, -a0], [v, 0, a0]); seg(l, [-a0, 0, v], [a0, 0, v]); }
  const sx = (s: string) => -a0 + (s.charCodeAt(0) - 97) * m, sz = (s: string) => -a0 + (s.charCodeAt(1) - 97) * m;
  const DT = 0.26, FINE = MOSSE_GO.length * DT;
  return {
    linee: l, testi: [], giro: 'oscilla', ampiezza: 0.05, tenue: true, inclina: 1.22, scala: 52, centroY: 58,
    anima: (t0, v) => {
      const t = t0 % (FINE + 6), n = Math.min(MOSSE_GO.length, Math.floor(t / DT) + 1), finite = t >= FINE;
      for (let k = 0; k < n; k++) {
        const s = MOSSE_GO[k]!, [px, py] = v.proietta([sx(s), 0, sz(s)]), X = Math.round(px) - 2, Y = Math.round(py) - 2, nera = k % 2 === 0;
        v.cancella(X, Y, 5, 5);
        for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
          const angolo = (x === 0 || x === 4) && (y === 0 || y === 4), bordo = x === 0 || x === 4 || y === 0 || y === 4;
          if (!angolo && (nera || bordo)) v.pixel(X + x, Y + y);
        }
      }
      if (finite) {
        const s = MOSSE_GO[36]!, e = (t - FINE) % 1.1;
        anello(v.l, sx(s), 0.01, sz(s), 0.1 + e * 0.5, 'y', 20);
        v.testi.push(centrato('MOVE 37: P10', 1));
        v.testi.push(centrato(t - FINE > 1.6 ? 'A HUMAN? 1 IN 10000' : '5TH LINE: UNUSUAL', 109));
      } else {
        v.testi.push(centrato(`MOVE ${n}`, 1));
        v.testi.push(centrato(n % 2 ? 'ALPHAGO, BLACK' : 'LEE SEDOL, WHITE', 109));
      }
    },
  };
}

// --- ChatGPT: le stime di UBS mese per mese, poi il confronto con le altre app
function chat(): Scena {
  const col = 20, righe = 5, passoX = 6, passoY = 8, x0 = 5, y0 = 38;
  return {
    ...SCENA_PIANA,
    anima: (t0, v) => {
      const t = t0 % 12, q = t < 1.5 ? 0 : t < 3 ? 57 * dolce((t - 1.5) / 1.3) : 57 + 43 * dolce((t - 3) / 1.3), mil = Math.round(q);
      v.testi.push(centrato(`${mil}M`, 4, 3));
      if (t < 5.6) {
        const accese = Math.round((q / 100) * col * righe);
        for (let k = 0; k < col * righe; k++) {
          if ((k * 37) % (col * righe) >= accese) continue;
          const x = x0 + (k % col) * passoX, y = y0 + Math.floor(k / col) * passoY;
          v.pixel(x + 1, y); v.pixel(x + 2, y); v.pixel(x + 1, y + 1); v.pixel(x + 2, y + 1);
          for (const dy of [3, 4]) for (const dx of [0, 1, 2, 3]) v.pixel(x + dx, y + dy);
          v.pixel(x + 1, y + 5); v.pixel(x + 2, y + 5);
        }
        v.testi.push(centrato(t < 1.5 ? 'NOV 2022: LAUNCH' : t < 3 ? 'DEC 2022' : 'JAN 2023', 86), centrato('MONTHLY USERS, EST.', 100));
      } else {
        // Quanti mesi hanno impiegato per arrivare a 100 milioni
        const u = dolce((t - 5.6) / 1.5);
        v.testi.push(centrato('MONTHS TO 100M', 34));
        for (const [i, nome, mesi] of [[0, 'CHATGPT', 2], [1, 'TIKTOK', 9], [2, 'INSTAGRAM', 30]] as const) {
          const y = 48 + i * 22;
          v.testi.push({ x: 3, y, t: `${nome} ${mesi}` });
          for (let x = 0; x < mesi * 4 * u; x++) for (const d of [0, 1, 2]) v.pixel(3 + x, y + 10 + d);
        }
      }
    },
  };
}

// --- AlphaFold: non piega nulla. Riceve una sequenza e predice la forma, poi la si confronta con quella misurata in laboratorio
const SEQUENZA = 'MQIFVKTLTGKTITLEVEPS';
function proteina(): Scena {
  const N = 110;
  const forma = (u: number): Punto => {
    if (u < 0.44) { const w = u / 0.44, a = w * Math.PI * 8; return [-0.55 + Math.cos(a) * 0.34, -0.9 + w * 1.8, Math.sin(a) * 0.34]; }
    if (u < 0.56) { const w = (u - 0.44) / 0.12, a = w * Math.PI; return [-0.21 + 0.42 * w, 0.9 + Math.sin(a) * 0.25, Math.sin(a) * 0.28]; }
    const w = (u - 0.56) / 0.44, a = w * Math.PI * 8; return [0.55 + Math.cos(a + Math.PI) * 0.34, 0.9 - w * 1.8, Math.sin(a + Math.PI) * 0.34];
  };
  return {
    linee: [], testi: [], giro: 'pieno', inclina: 0.2, scala: 34, centroY: 58,
    anima: (t0, v) => {
      const t = t0 % 12, tipo = Math.min(SEQUENZA.length, Math.floor(t * 14));
      v.testi.push(centrato(SEQUENZA.slice(0, tipo).padEnd(SEQUENZA.length), 1));
      if (t < 1.8) { v.testi.push(centrato('INPUT: A SEQUENCE', 108)); return; }
      // La previsione migliora in tre giri, e si avvicina alla forma del laboratorio (a pixel alterni)
      const giro_ = Math.min(3, Math.floor((t - 1.8) / 1.6) + 1), mezzo = dolce(((t - 1.8) % 1.6) / 0.8), scarti = [0.55, 0.3, 0.13, 0.035];
      const scarto = t > 6.6 ? scarti[3]! : scarti[giro_ - 1]! + (scarti[giro_]! - scarti[giro_ - 1]!) * mezzo;
      let prima: Punto | null = null;
      for (let k = 0; k <= N; k++) {
        const u = k / N, f = forma(u), p: Punto = [f[0] + Math.sin(k * 0.7) * scarto, f[1] + Math.cos(k * 0.41) * scarto, f[2] + Math.sin(k * 0.23) * scarto];
        if (prima) seg(v.l, prima, p);
        prima = p;
        if (k % 2 === 0) { const q = forma(u), r = forma(Math.min(1, u + 0.5 / N)); seg(v.l, [q[0], q[1], q[2]], [r[0], r[1], r[2]]); }
      }
      v.testi.push(centrato(t > 6.6 ? 'MEDIAN GDT: 92.4' : `PREDICTED, ROUND ${giro_}`, 108));
    },
  };
}

// --- Il neurone: gli ingressi arrivano, il corpo si accende, parte la scarica
function neurone(): Scena {
  const l: L = [], dendriti: Punto[][] = [];
  anello(l, -0.15, 0, 0, 0.42, 'x'); anello(l, -0.15, 0, 0, 0.42, 'y'); anello(l, -0.15, 0, 0, 0.42, 'z');
  for (const [y, z] of [[0.7, 0.3], [0.25, -0.65], [-0.3, 0.7], [-0.75, -0.3]] as const) {
    const fine: Punto = [-1.35, y, z], mezzo: Punto = [-0.85, y * 0.6, z * 0.6], radice: Punto = [-0.5, y * 0.25, z * 0.25];
    seg(l, radice, mezzo); seg(l, mezzo, fine); nodo(l, fine[0], fine[1], fine[2], 0.07);
    dendriti.push([fine, mezzo, radice]);
  }
  seg(l, [0.27, 0, 0], [1.1, 0, 0]);
  for (const [y, z] of [[0.3, 0.2], [-0.3, 0.2], [0, -0.35]] as const) { seg(l, [1.1, 0, 0], [1.42, y, z]); nodo(l, 1.42, y, z, 0.06); }
  return {
    linee: l, testi: [], giro: 'oscilla', inclina: 0.2, scala: 36, centroY: 50,
    anima: (t0, v) => {
      const t = t0 % 5, testo = (s: string) => v.testi.push(centrato(s, 104));
      if (t < 1.6) {
        const pochi = t < 0.8, u = (pochi ? t : t - 0.8) / 0.8;
        dendriti.slice(0, pochi ? 2 : 4).forEach(d => impulso(v.l, sulPercorso(d, u), 0.07));
        testo(pochi ? 'NOT ENOUGH' : 'ENOUGH');
      } else if (t < 3.2) {
        const u = (t - 1.6) / 1.6;
        for (const r of [0.48, 0.56]) anello(v.l, -0.15, 0, 0, r + Math.sin(u * 20) * 0.03, 'z');
        impulso(v.l, lungo([0.27, 0, 0], [1.42, 0, 0], u), 0.11);
        v.testi.push(centrato('FIRES!', 100, 2));
      } else testo('ON OR OFF');
    },
  };
}
// --- Il gioco dell'imitazione: domande scritte a due stanze, senza vedere chi risponde
function turing(): Scena {
  const l: L = [];
  const terminale = (x: number, y: number) => { cubo(l, x, y, 0, 0.62, 0.42, 0.42); cubo(l, x, y - 0.3, 0.05, 0.3, 0.1, 0.25); };
  terminale(-1, 0); terminale(0.95, 0.52); terminale(0.95, -0.52);
  for (const y of [-1, -0.5, 0, 0.5, 1]) seg(l, [0.05, y, -0.5], [0.05, y, 0.5]);
  for (const z of [-0.5, 0, 0.5]) seg(l, [0.05, -1, z], [0.05, 1, z]);
  const A: Punto = [-0.68, 0.05, 0], B: Punto = [0.62, 0.52, 0], C: Punto = [-0.68, -0.05, 0], D: Punto = [0.62, -0.52, 0];
  seg(l, A, B); seg(l, C, D);
  return {
    linee: l, testi: [centrato('JUDGE', 2, 1, 26)], giro: 'oscilla', inclina: 0.24, scala: 35, centroY: 46,
    anima: (t0, v) => {
      const t = t0 % 8, u = t % 2, su = Math.floor(t / 2) % 2 === 0, andata = u < 1 ? u : 2 - u;
      impulso(v.l, su ? lungo(A, B, andata) : lungo(C, D, andata), 0.08);
      v.testi.push(t < 6 ? centrato('MACHINE OR PERSON?', 104) : centrato('CANNOT TELL? PASS', 104));
    },
  };
}
// --- La retropropagazione: la rete prova, sbaglia, corregge, e sbaglia meno
function backprop(): Scena {
  const l: L = [], strati = [[0.75, 0.25, -0.25, -0.75], [0.5, 0, -0.5], [0.75, 0.25, -0.25, -0.75], [0.3, -0.3]], xs = [-1.2, -0.4, 0.4, 1.2];
  strati.forEach((s, k) => s.forEach(y => { nodo(l, xs[k]!, y, 0, 0.1); (strati[k + 1] ?? []).forEach(b => seg(l, [xs[k]!, y, 0], [xs[k + 1]!, b, 0])); }));
  const avanti: Punto[][] = [[[-1.2, 0.75, 0], [-0.4, 0.5, 0], [0.4, 0.25, 0], [1.2, 0.3, 0]], [[-1.2, -0.25, 0], [-0.4, 0, 0], [0.4, -0.25, 0], [1.2, -0.3, 0]]];
  return {
    linee: l, testi: [], giro: 'oscilla', inclina: 0.14, scala: 38, centroY: 46,
    anima: (t0, v) => {
      const t = t0 % 6.5, testo = (s: string) => v.testi.push(centrato(s, 104));
      if (t < 1.5) { avanti.forEach(p => impulso(v.l, sulPercorso(p, t / 1.5), 0.08)); testo('TRY'); }
      else if (t < 2.5) { for (const y of [0.3, -0.3]) { seg(v.l, [1.32, y + 0.14, 0], [1.56, y - 0.14, 0]); seg(v.l, [1.32, y - 0.14, 0], [1.56, y + 0.14, 0]); } testo('WRONG'); }
      else if (t < 4.5) { const u = (t - 2.5) / 2; avanti.forEach(p => impulso(v.l, sulPercorso(p, 1 - u), 0.1)); testo('THE ERROR GOES BACK'); }
      else testo('NEXT TIME, LESS WRONG');
    },
  };
}
// --- AlexNet: entra un gatto, esce la parola. Sotto, di quanto ha battuto gli altri
const GATTO = ['1000000001', '1100000011', '1110000111', '1111111111', '1011111101', '1011111101', '1111001111', '1111111111', '0111111110', '0011111100'];
function alexnet(): Scena {
  const l: L = [], strati = [[-0.78, 1.1], [-0.42, 0.9], [-0.1, 0.7], [0.18, 0.52], [0.42, 0.38]] as const;
  strati.forEach(([x, h]) => cubo(l, x, 0, 0, 0.18, h, h));
  // Cinque strati convolutivi, poi i tre strati densi
  for (const x of [0.66, 0.8, 0.94]) seg(l, [x, -0.55, 0], [x, 0.55, 0]);
  return {
    linee: l, testi: [{ x: 3, y: 88, t: 'ALEXNET 15.3%' }, { x: 3, y: 104, t: 'NEXT    26.2%' }], giro: 'oscilla', inclina: 0.3, scala: 30, centroY: 38,
    anima: (t0, v) => {
      const t = t0 % 6, u = dolce(t / 2.6), x0 = 2, y0 = 26;
      GATTO.forEach((riga, y) => [...riga].forEach((c, x) => { if (c === '1') { for (const a of [0, 1]) for (const b of [0, 1]) v.pixel(x0 + x * 2 + a, y0 + y * 2 + b); } }));
      if (t < 2.6) {
        const x = -1 + u * 1.75, h = Math.max(0.06, 0.55 - u * 0.45);
        const P: Punto[] = [[x, h, h], [x, h, -h], [x, -h, -h], [x, -h, h]];
        P.forEach((p, k) => seg(v.l, p, P[(k + 1) % 4]!));
      } else v.testi.push({ x: 104, y: 36, t: 'CAT!', s: 1 });
      const b = dolce(t / 2);
      for (const [y, n] of [[97, 15.3], [113, 26.2]] as const) for (let x = 0; x < n * 4.6 * b; x++) { v.pixel(3 + x, y); v.pixel(3 + x, y + 1); }
    },
  };
}
// --- L'attenzione, come nell'encoder del 2017: ogni parola dà un peso a tutte le altre, alcuni alti e altri quasi zero, e tutte lo
// fanno nello stesso momento. I pesi qui sotto sono inventati per spiegare l'idea: nessun modello li ha prodotti
function attenzione(): Scena {
  const parole = ['THE', 'CAT', 'SAT.', 'IT', 'SLEPT'], y = 68;
  let x = 3; const xs = parole.map(p => { const c = x + (p.length * 6 - 1) / 2; x += (p.length + 1) * 6; return c; });
  const PESI = [[0, 0.8, 0.2, 0.1, 0.1], [0.3, 0, 0.7, 0.3, 0.3], [0.1, 0.8, 0, 0.1, 0.2], [0.1, 0.9, 0.2, 0, 0.3], [0.1, 0.5, 0.2, 0.8, 0]];
  const ORDINE = [3, 4, 2, 0, 1];
  return {
    ...SCENA_PIANA,
    anima: (t0, v) => {
      const passo = 1.9, tot = passo * ORDINE.length + 3.5, t = t0 % tot, insieme = t >= passo * ORDINE.length, da = ORDINE[insieme ? 0 : Math.floor(t / passo)]!, u = (t % passo) / passo;
      // Il peso si vede dalla densità: alto è una linea piena, basso sono pochi punti
      const arco = (a: number, b: number, peso: number, fino = 1) => {
        const n = Math.ceil(Math.abs(xs[b]! - xs[a]!) * 1.4) + 8, ogni = peso >= 0.6 ? 1 : peso >= 0.25 ? 2 : 5, alt = 6 + Math.abs(xs[b]! - xs[a]!) * 0.42;
        for (let q = 0; q <= n * fino; q++) { const w = q / n; if (q % ogni) continue; v.pixel(Math.round(xs[a]! + (xs[b]! - xs[a]!) * w), Math.round(y - 3 - Math.sin(w * Math.PI) * alt)); }
      };
      let xt = 3;
      parole.forEach((p, i) => {
        v.testi.push({ x: xt, y, t: p, s: 1 });
        if (!insieme && i === da) for (let q = 0; q < p.length * 6 - 1; q++) v.pixel(xt + q, y + 9);
        xt += (p.length + 1) * 6;
      });
      if (insieme) {
        PESI.forEach((riga, a) => riga.forEach((peso, b) => { if (a !== b) arco(a, b, peso); }));
        v.testi.push(centrato('ALL WORDS,', 92), centrato('ALL AT THE SAME TIME', 104));
        return;
      }
      PESI[da]!.forEach((peso, b) => { if (b !== da) arco(da, b, peso, Math.min(1, u * 2.4)); });
      v.testi.push(centrato('EVERY WORD WEIGHS', 92), centrato('THE OTHERS', 104));
    },
  };
}
// --- Il ragionamento: prova, controlla, torna indietro, riprova, risponde
function ragionamento(): Scena {
  const l: L = [], nodi: Punto[] = [[0, 0.9, 0]];
  cubo(l, 0, 1.05, 0, 1.3, 0.28, 0.5);
  for (const [k, x] of [[0, -0.42], [1, 0.42], [2, -0.42], [3, 0.42]] as const) { const y = 0.5 - k * 0.42; nodo(l, x, y, 0, 0.13); nodi.push([x, y, 0]); }
  nodi.push([0, -0.9, 0]);
  nodi.forEach((p, k) => { if (k) seg(l, nodi[k - 1]!, p); });
  cubo(l, 0, -1.05, 0, 1.3, 0.28, 0.5);
  const tappe: [number, string][] = [[0.05, 'THINK'], [0.25, 'TRY'], [0.45, 'CHECK: WRONG'], [0.25, 'GO BACK'], [0.45, 'TRY AGAIN'], [0.65, 'CHECK: GOOD'], [1, 'ANSWER']];
  return {
    linee: l, testi: [centrato('QUESTION', 2)], giro: 'oscilla', inclina: 0.2, scala: 35, centroY: 56,
    anima: (t0, v) => {
      const passo = 1.15, n = tappe.length, t = t0 % (passo * (n + 1.5)), k = Math.min(n - 1, Math.floor(t / passo)), u = dolce((t / passo - k) * 1.8), prima = k ? tappe[k - 1]![0] : 0;
      impulso(v.l, sulPercorso(nodi, prima + (tappe[k]![0] - prima) * u), 0.09);
      v.testi.push(centrato(tappe[k]![1], 106));
    },
  };
}
// --- DeepSeek-R1: i pesi arrivano su tanti server, poi il crollo di Nvidia del 27 gennaio 2025
function pesiAperti(): Scena {
  const server: Punto[] = [[-1, 0.55, 0], [0, 0.72, -0.2], [1, 0.55, 0], [-1, -0.55, 0], [0, -0.72, 0.2], [1, -0.55, 0]];
  return {
    linee: [], testi: [], giro: 'oscilla', ampiezza: 0.45, inclina: 0.18, scala: 37, centroY: 54,
    anima: (t0, v) => {
      const t = t0 % 13;
      if (t < 6.2) {
        // Il modello al centro, e i server che lo ricevono uno dopo l'altro
        cubo(v.l, 0, 0, 0, 0.5, 0.42, 0.42);
        const arrivati = Math.floor(t / 0.9);
        server.forEach((s, k) => {
          cubo(v.l, s[0], s[1], s[2], 0.34, 0.4, 0.3);
          if (k < arrivati) for (let r = 0; r < 3; r++) { if (caso(k, r, Math.floor(t * 5)) > 0.25) seg(v.l, [s[0] - 0.1, s[1] + 0.12 - r * 0.12, s[2] + 0.15], [s[0] + 0.1, s[1] + 0.12 - r * 0.12, s[2] + 0.15]); }
          if (k === arrivati) cubo(v.l, ...lungo([0, 0, 0], s, (t % 0.9) / 0.9), 0.1, 0.1, 0.1);
        });
        v.testi.push(centrato('R1: OPEN WEIGHTS', 1), centrato(arrivati < 3 ? 'ANYONE CAN DOWNLOAD' : 'ANYONE CAN RUN IT', 108));
      } else {
        // Il grafico è un disegno: la sola misura vera è il calo del giorno
        const u = dolce((t - 6.2) / 1.1), X0 = 8, X1 = 122, Y0 = 34, Y1 = 92, fino = X0 + (X1 - X0) * Math.min(1, (t - 6.2) / 1.8);
        v.linea(X0, Y0 - 6, X0, Y1); v.linea(X0, Y1, X1, Y1);
        const quota = (x: number) => { const w = (x - X0) / (X1 - X0); return w < 0.72 ? 44 - w * 12 + Math.sin(x * 0.7) * 2 : 35 + ((w - 0.72) / 0.28) * 44; };
        let px = X0, py = quota(X0);
        for (let x = X0 + 2; x <= fino; x += 2) { const y = quota(x); v.linea(Math.round(px), Math.round(py), Math.round(x), Math.round(y)); px = x; py = y; }
        v.testi.push(centrato('NVIDIA, 27 JAN 2025', 1));
        if (u >= 1) v.testi.push(centrato('-17%', 12, 2, 92));
        v.testi.push(centrato(t > 8.6 ? '589B DOLLARS, ONE DAY' : 'SHARE PRICE', 100));
      }
    },
  };
}

// --- Nuove scene
// ELIZA: il vero dialogo dell'articolo di Weizenbaum, 1966. Le regole girano «my» in «your»: si vede bene nell'ultima risposta
function eliza(): Scena {
  const righe = ['> MEN ARE ALL ALIKE.', 'IN WHAT WAY?', "> THEY'RE ALWAYS", '  BUGGING US ABOUT', '  SOMETHING OR OTHER.', 'CAN YOU THINK OF A', 'SPECIFIC EXAMPLE?', '> WELL, MY BOYFRIEND', '  MADE ME COME HERE.', 'YOUR BOYFRIEND MADE', 'YOU COME HERE'];
  const tot = righe.join('').length;
  return {
    ...SCENA_PIANA,
    anima: (t0, v) => {
      const t = t0 % (tot / 22 + 4.5);
      let resto = Math.floor(t * 22);
      righe.forEach((r, i) => {
        if (resto <= 0) return;
        v.testi.push({ x: 2, y: 2 + i * 10, t: r.slice(0, resto) });
        resto -= r.length;
      });
      if (t > tot / 22 + 0.4) {
        // MY nella riga dell'utente e YOUR nella risposta: la sola «comprensione» è questa regola
        for (let q = 0; q < 11; q++) v.pixel(2 + 48 + q, 2 + 70 + 8);
        for (let q = 0; q < 23; q++) v.pixel(2 + q, 2 + 90 + 8);
      }
    },
  };
}
// Perceptrons: quattro punti XOR. Una sola linea non separa mai le due classi, comunque la si giri
function xor(): Scena {
  const X0 = 30, X1 = 100, Y0 = 27, Y1 = 90;
  const punti: [number, number, boolean][] = [[X0, Y1, false], [X1, Y0, false], [X0, Y0, true], [X1, Y1, true]];
  return {
    ...SCENA_PIANA,
    anima: (t0, v) => {
      riquadro(v, X0 - 14, Y0 - 14, X1 + 14, Y1 + 14);
      const a = t0 * 0.6, c = Math.cos(a), s = Math.sin(a), cx = 65 + Math.sin(t0 * 1.3) * 12, cy = 53 + Math.cos(t0 * 0.9) * 12;
      let sbagliati = Infinity;
      for (const lato of [1, -1]) sbagliati = Math.min(sbagliati, punti.filter(([x, y, cl]) => ((x - cx) * -s + (y - cy) * c) * lato > 0 !== cl).length);
      v.linea(Math.round(cx - c * 90), Math.round(cy - s * 90), Math.round(cx + c * 90), Math.round(cy + s * 90), true);
      v.cancella(0, 0, 130, Y0 - 15); v.cancella(0, Y1 + 15, 130, 40); v.cancella(0, 0, X0 - 15, 116); v.cancella(X1 + 15, 0, 20, 116);
      riquadro(v, X0 - 14, Y0 - 14, X1 + 14, Y1 + 14);
      for (const [x, y, cl] of punti) {
        v.cancella(x - 5, y - 5, 11, 11);
        for (let b = -4; b <= 4; b++) for (let d = -4; d <= 4; d++) { const r = b * b + d * d; if (r <= 18 && (cl || r >= 9)) v.pixel(x + d, y + b); }
      }
      v.testi.push(centrato('XOR', 1), centrato(`ONE LINE: ${sbagliati} WRONG`, 108));
    },
  };
}
// word2vec: le parole diventano punti, e le relazioni direzioni. Le posizioni sono un disegno, il calcolo è l'esempio famoso
function parole2vec(): Scena {
  const K: [number, number] = [96, 74], M: [number, number] = [28, 74], W: [number, number] = [28, 28], Q: [number, number] = [96, 28];
  return {
    ...SCENA_PIANA,
    anima: (t0, v) => {
      const t = t0 % 9;
      const croce = ([x, y]: [number, number], n: string, sopra: boolean) => { v.linea(x - 2, y, x + 2, y); v.linea(x, y - 2, x, y + 2); v.testi.push(centrato(n, y + (sopra ? -11 : 5), 1, x)); };
      croce(K, 'KING', false); croce(M, 'MAN', false); croce(W, 'WOMAN', true);
      const parti = dolce((t - 1) / 1.2), secondo = dolce((t - 2.8) / 1.2);
      if (t > 1) v.linea(K[0], K[1], Math.round(K[0] + (M[0] - K[0]) * parti), K[1], true);
      if (t > 2.8) v.linea(M[0], M[1], M[0], Math.round(M[1] + (W[1] - M[1]) * secondo), true);
      if (t > 4.4) { const u = dolce((t - 4.4) / 1.2); v.linea(M[0], W[1], Math.round(M[0] + (Q[0] - M[0]) * u), W[1]); }
      v.testi.push(centrato(t < 1 ? 'KING' : t < 2.8 ? 'KING - MAN' : 'KING - MAN + WOMAN', 94));
      if (t > 5.6) { croce(Q, 'QUEEN', true); v.testi.push(centrato('CLOSEST WORD: QUEEN', 106)); }
    },
  };
}
// Disegna il gatto a blocchi con una parte di rumore: acceso o spento a caso con probabilità «rumore»
function gattoRumoroso(v: Vivo, x0: number, y0: number, sc: number, rumore: number, passo: number) {
  const L_ = GATTO.length * sc;
  for (let y = 0; y < L_; y++) for (let x = 0; x < L_; x++) {
    const vero = GATTO[Math.floor(y / sc)]![Math.floor(x / sc)] === '1', acceso = caso(x, y, passo) < rumore ? caso(y, x, passo + 7) > 0.5 : vero;
    if (acceso) v.pixel(x0 + x, y0 + y);
  }
}
// GAN: uno falsifica, l'altro controlla. A ogni giro entrambi migliorano
function gan(): Scena {
  return {
    ...SCENA_PIANA,
    anima: (t0, v) => {
      const dur = 1.6, n = 5, t = t0 % (dur * n + 1.5), giro_ = Math.min(n - 1, Math.floor(t / dur)), rumore = [0.8, 0.55, 0.35, 0.16, 0.03][giro_]!;
      riquadro(v, 2, 20, 30, 68); riquadro(v, 100, 20, 128, 68);
      v.testi.push({ x: 2, y: 8, t: 'FAKER' }, { x: 93, y: 8, t: 'CRITIC' });
      gattoRumoroso(v, 45, 24, 4, rumore, giro_);
      const u = (t % dur) / dur;
      // Il falso esce dal falsario; il giudizio torna indietro
      const x = u < 0.5 ? 30 + u * 2 * 14 : 86 + (u - 0.5) * 2 * 14; v.linea(30, 44, 44, 44); v.linea(86, 44, 100, 44);
      v.pixel(Math.round(x), 42); v.pixel(Math.round(x), 46);
      v.testi.push(centrato(giro_ < 4 ? `ROUND ${giro_ + 1}: FAKE` : 'ROUND 5: REAL?', 78), centrato('BOTH KEEP IMPROVING', 96));
    },
  };
}
// ResNet: senza scorciatoie il segnale si perde negli strati profondi, con le scorciatoie arriva in fondo
function resnet(): Scena {
  const N = 14, X = (k: number) => 8 + k * 8.8;
  return {
    ...SCENA_PIANA,
    anima: (t0, v) => {
      const t = t0 % 7, u = (t % 3.5) / 3.5;
      const fila = (y: number, salti: boolean) => {
        for (let k = 0; k < N; k++) { v.linea(Math.round(X(k)), y - 6, Math.round(X(k)), y + 6); if (k < N - 1) v.linea(Math.round(X(k)), y, Math.round(X(k + 1)), y); }
        if (salti) for (let k = 0; k + 2 < N; k += 2) {
          const a = X(k), b = X(k + 2);
          for (let q = 0; q <= 20; q++) { const w = q / 20; v.pixel(Math.round(a + (b - a) * w), Math.round(y - 7 - Math.sin(w * Math.PI) * 9)); }
        }
      };
      fila(36, false); fila(82, true);
      v.testi.push(centrato('NO SHORTCUTS', 16), centrato('WITH SHORTCUTS', 54));
      // Sopra il segnale si indebolisce: sempre meno pixel fino a sparire. Sotto resta pieno
      const xs = X(0) + u * (X(N - 1) - X(0)), forza = Math.max(0, 1 - u * 1.25);
      for (let d = -3; d <= 3; d++) for (let e = -3; e <= 3; e++) { if (caso(d, e, Math.floor(t * 12)) < forza) v.pixel(Math.round(xs) + d, 36 + e); v.pixel(Math.round(xs) + d, 82 + e); }
      v.testi.push(centrato('152 LAYERS', 104));
    },
  };
}
// Diffusion: in addestramento si aggiunge rumore, per generare lo si toglie a piccoli passi. 1000 è il numero di passi del lavoro del 2020
function diffusione(): Scena {
  return {
    ...SCENA_PIANA,
    anima: (t0, v) => {
      const t = t0 % 10, passo = Math.floor(t * 8);
      if (t < 3.2) {
        const u = t / 3.2;
        gattoRumoroso(v, 25, 12, 8, dolce(u * 1.2), passo);
        v.testi.push(centrato('TRAINING: ADD NOISE', 96), centrato(`STEP ${Math.round(u * 1000)}`, 106));
      } else if (t < 8.4) {
        const u = (t - 3.2) / 5.2;
        gattoRumoroso(v, 25, 12, 8, 1 - dolce(u * 1.05), passo);
        v.testi.push(centrato('MAKING: REMOVE NOISE', 96), centrato(`STEP ${Math.round((1 - u) * 1000)}`, 106));
      } else {
        gattoRumoroso(v, 25, 12, 8, 0, passo);
        v.testi.push(centrato('IMAGE FROM NOISE', 96));
      }
    },
  };
}
// Scaling laws: l'errore scende come una retta, se gli assi sono logaritmici. Quindi si può prevedere quanto rende ingrandire
function scala(): Scena {
  const X0 = 22, X1 = 124, Y0 = 8, Y1 = 84;
  return {
    ...SCENA_PIANA,
    anima: (t0, v) => {
      const t = t0 % 8;
      v.linea(X0, Y0, X0, Y1); v.linea(X0, Y1, X1, Y1);
      v.testi.push({ x: 2, y: 8, t: 'LOG' }, { x: 66, y: 89, t: 'LOG SIZE' });
      const n = Math.min(10, Math.floor(t * 2.6) + 1);
      const px = (k: number) => X0 + 6 + k * 7.4, py = (k: number) => Y0 + 6 + k * 4.6 + (k % 2 ? 1.5 : -1);
      let qx = 0, qy = 0;
      for (let k = 0; k < n; k++) { qx = px(k); qy = py(k); for (const [d, e] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) v.pixel(Math.round(qx) + d, Math.round(qy) + e); }
      if (t > 4) {
        v.linea(Math.round(px(0)), Math.round(py(0)), Math.round(px(9)), Math.round(py(9)));
        v.linea(Math.round(px(9)), Math.round(py(9)), Math.round(px(13)), Math.round(py(13)), true);
      }
      v.testi.push(centrato(t > 4 ? 'PREDICTABLE GAIN' : 'BIGGER, LESS ERROR', 102));
    },
  };
}
// AI Act: quattro livelli di rischio, e un esempio per ciascuno
function rischio(): Scena {
  const livelli = [['BANNED', 38], ['HIGH RISK', 70], ['TRANSPARENCY', 96], ['MINIMAL', 124]] as const;
  const esempi: [number, string][] = [[3, 'SPAM FILTER'], [2, 'CHATBOT'], [1, 'HIRING TOOL'], [0, 'SOCIAL SCORING']];
  return {
    ...SCENA_PIANA,
    anima: (t0, v) => {
      const passo = 2.1, k = Math.floor(t0 / passo) % esempi.length, u = (t0 % passo) / passo, [ris, nome] = esempi[k]!;
      livelli.forEach(([testo, larg], i) => {
        const y = 3 + i * 21, x0 = Math.round(65 - larg / 2);
        riquadro(v, x0, y, x0 + larg, y + 18);
        if (i === ris && u > 0.45) for (let a = 1; a < 18; a++) for (let b = 1; b < larg; b++) if ((a + b) % 3 === 0) v.pixel(x0 + b, y + a);
        if (i === ris && u > 0.45) v.cancella(Math.round(65 - (testo.length * 6) / 2) - 2, y + 4, testo.length * 6 + 3, 10);
        v.testi.push(centrato(testo, y + 6));
      });
      v.testi.push(centrato(nome, 100));
    },
  };
}
// I loghi: il logo gira su se stesso come una moneta. Sono griglie di pixel ricavate dai file SVG
function logo(nome: 'openai' | 'anthropic' | 'deepmind', y0: number, righe_: [string, string]): Scena {
  const griglia = (loghi as Record<string, string[]>)[nome]!, W = griglia[0]!.length;
  return {
    ...SCENA_PIANA,
    anima: (t0, v) => {
      // Il logo non si vede mai dal rovescio: allo specchio non sarebbe più il logo. Resta quasi sempre leggibile
      const c = Math.abs(Math.cos(t0 * 0.7)) ** 0.35, cx = LARGHEZZA / 2, x0 = cx - W / 2;
      griglia.forEach((riga, y) => { for (let x = 0; x < W; x++) if (riga[x] === '#') v.pixel(Math.round(cx + (x0 + x - cx) * c), y0 + y); });
      v.testi.push(centrato(righe_[0], 88), centrato(righe_[1], 100));
    },
  };
}
const openai = () => logo('openai', 16, ['FOUNDED 2015', 'A NON-PROFIT LAB']);
const anthropic = () => logo('anthropic', 40, ['FOUNDED 2021', 'AI SAFETY RESEARCH']);
const deepmind = () => logo('deepmind', 32, ['FOUNDED 2010', 'A LONDON STARTUP']);

const SCENE: Record<string, () => Scena> = {
  neurone, turing, backprop, scacchi, alexnet, go, attenzione, proteina, chat, ragionamento, 'pesi-aperti': pesiAperti,
  eliza, xor, word2vec: parole2vec, gan, resnet, diffusione, scaling: scala, rischio, openai, anthropic, deepmind,
};
export const scena = (nome: string) => SCENE[nome]?.();
// Il momento da mostrare quando l'immagine resta ferma (movimento ridotto): quello che dice di più, non il primo istante
const FERMI: Record<string, number> = { scacchi: 20, go: 12, chat: 8, proteina: 8, attenzione: 1.5, eliza: 11, word2vec: 7, xor: 3, gan: 7, resnet: 1.5, diffusione: 9, scaling: 6, rischio: 7.5, 'pesi-aperti': 10, neurone: 2.4, backprop: 3.5, ragionamento: 8, turing: 7, alexnet: 4 };
export const tempoFermo = (nome: string) => FERMI[nome] ?? 0;

// --- Il disegno. fino va da 0 a 1: quanta parte della scena è già comparsa. tempo in secondi: fa andare la storia
export function disegna(g: CanvasRenderingContext2D, s: Scena, angolo: number, colore: string, fino = 1, tempo = 0) {
  g.clearRect(0, 0, LARGHEZZA, ALTEZZA);
  g.fillStyle = colore;
  const a = s.giro === 'pieno' ? angolo : s.giro === 'oscilla' ? Math.sin(angolo * 1.3) * (s.ampiezza ?? 0.62) : 0, ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(s.inclina), st = Math.sin(s.inclina);
  const proietta = (p: Punto) => {
    const x = p[0] * ca + p[2] * sa, z1 = -p[0] * sa + p[2] * ca, y = p[1] * ct - z1 * st, z = p[1] * st + z1 * ct, f = 4.2 / (4.2 - z);
    return [Math.round(LARGHEZZA / 2 + x * s.scala * f), Math.round(s.centroY - y * s.scala * f), z] as const;
  };
  // Bresenham: niente sfumature
  const bres = (x0: number, y0: number, x1: number, y1: number, alterni: boolean) => {
    let x = x0, y = y0; const dx = Math.abs(x1 - x), dy = -Math.abs(y1 - y), sx = x < x1 ? 1 : -1, sy = y < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (!alterni || (x + y) % 2 === 0) g.fillRect(x, y, 1, 1);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  };
  const traccia = ([p, q]: [Punto, Punto]) => { const A = proietta(p), B = proietta(q); bres(A[0], A[1], B[0], B[1], (A[2] + B[2]) / 2 < -0.12); };
  const quante = Math.ceil(s.linee.length * fino);
  // La griglia di un tavoliere è tenue: si devono vedere i pezzi
  for (let k = 0; k < quante; k++) { if (s.tenue) { const A = proietta(s.linee[k]![0]), B = proietta(s.linee[k]![1]); bres(A[0], A[1], B[0], B[1], true); } else traccia(s.linee[k]!); }
  // La storia parte quando la scena è comparsa
  const testi = [...s.testi];
  if (s.anima && (fino >= 1 || !s.linee.length)) {
    const vivo: Vivo = { l: [], testi: [], pixel: (x, y) => g.fillRect(x, y, 1, 1), linea: (x0, y0, x1, y1, t = false) => bres(x0, y0, x1, y1, t), cancella: (x, y, w, h) => g.clearRect(x, y, w, h), proietta };
    s.anima(tempo, vivo);
    vivo.l.forEach(traccia);
    testi.push(...vivo.testi);
  }
  for (const t of testi) {
    const sc = t.s ?? 1;
    [...t.t].forEach((ch, n) => {
      const gl = FONT[ch];
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (pieno(gl, x, y)) g.fillRect(t.x + n * 6 * sc + x * sc, t.y + y * sc, sc, sc);
    });
  }
}
