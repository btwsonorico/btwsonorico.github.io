// Le immagini wireframe dei 12 eventi essenziali della timeline: piccole storie in loop, che fanno capire il fatto anche a chi non è
// tecnico. Il re cade, il filo si piega, la folla si riempie. Tutto è disegnato su una tela piccola e ingrandito senza sfumature,
// così ogni pixel è un blocco (3 px su computer, 2 su telefono), con due soli stati: acceso o spento.
// Le linee lontane sono a pixel alterni: è il solo modo di dare profondità senza sfumature. Niente librerie 3D, niente immagini.

export const LARGHEZZA = 130, ALTEZZA = 116;

type Punto = readonly [number, number, number];
type L = [Punto, Punto][];
type Testo = { x: number; y: number; t: string; s?: number };
// Ciò che una scena aggiunge a ogni fotogramma: linee in 3D, testi e pixel sulla tela
type Vivo = { l: L; testi: Testo[]; pixel: (x: number, y: number) => void };
export type Scena = { linee: L; testi: Testo[]; giro: 'pieno' | 'oscilla' | 'fermo'; inclina: number; scala: number; centroY: number; centroX?: number; anima?: (t: number, v: Vivo) => void };

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
  '%': [24, 25, 2, 4, 8, 19, 3], '.': [0, 0, 0, 0, 0, 12, 12], '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2], '=': [0, 0, 31, 0, 31, 0, 0], '-': [0, 0, 0, 31, 0, 0, 0], '?': [14, 17, 1, 2, 4, 0, 4], '!': [4, 4, 4, 4, 4, 0, 4], ':': [0, 12, 12, 0, 12, 12, 0],
};
const pieno = (g: number[] | undefined, x: number, y: number) => !!g && x >= 0 && x < 5 && y >= 0 && y < 7 && !!(g[y]! & (16 >> x));
const centrato = (t: string, y: number, s = 1, x = LARGHEZZA / 2): Testo => ({ x: Math.round(x - ((t.length * 6 - 1) * s) / 2), y, t, s });

// --- I mattoni
const seg = (l: L, a: Punto, b: Punto) => { l.push([a, b]); };
const lungo = (a: Punto, b: Punto, u: number): Punto => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const dolce = (u: number) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
const sulPercorso = (p: readonly Punto[], u: number): Punto => { const v = Math.min(0.9999, Math.max(0, u)) * (p.length - 1), k = Math.floor(v); return lungo(p[k]!, p[k + 1]!, v - k); };
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

// --- Scacchi: Deep Blue contro Kasparov. La regina si muove, il re cade, il punteggio resta
const PROFILI: Record<string, [number, number][]> = {
  re: [[0, 0.1], [0.04, 0.1], [0.12, 0.05], [0.34, 0.04], [0.42, 0.08], [0.5, 0.05]],
  regina: [[0, 0.09], [0.04, 0.09], [0.12, 0.045], [0.3, 0.035], [0.38, 0.08], [0.43, 0.03]],
  torre: [[0, 0.09], [0.04, 0.09], [0.1, 0.055], [0.22, 0.055], [0.26, 0.08], [0.32, 0.08]],
  pedone: [[0, 0.07], [0.03, 0.07], [0.12, 0.03], [0.16, 0.05], [0.22, 0.03]],
};
function pezzo(l: L, tipo: string, x: number, z: number, y0: number, caduta = 0) {
  const c = Math.cos(caduta), s = Math.sin(caduta), n = 8, K = 1.45;
  const P = (a: number, y0_: number, r0: number): Punto => { const y = y0_ * K, r = r0 * K, u = Math.cos(a) * r, v = Math.sin(a) * r; return [x + u * c + y * s, y0 - u * s + y * c, z + v]; };
  const prof = PROFILI[tipo]!;
  prof.forEach(([y, r], i) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, b = ((k + 1) / n) * Math.PI * 2;
      seg(l, P(a, y, r), P(b, y, r));
      const dopo = prof[i + 1];
      if (dopo && k % 2 === 0) seg(l, P(a, y, r), P(a, dopo[0], dopo[1]));
    }
  });
  if (tipo === 're') { seg(l, P(0, 0.5, 0), P(0, 0.64, 0)); seg(l, P(0, 0.58, 0.05), P(Math.PI, 0.58, 0.05)); }
}
function scacchi(): Scena {
  const l: L = [], m = 0.26, a = 1.04, cas = (f: number) => -a + (f + 0.5) * m;
  for (let k = 0; k <= 8; k++) { const v = -a + k * m; seg(l, [v, 0, -a], [v, 0, a]); seg(l, [-a, 0, v], [a, 0, v]); }
  // Pochi pezzi, grandi: a questa risoluzione si deve riconoscere il re che cade
  const FERMI: [string, number, number][] = [['torre', 1, 1], ['pedone', 6, 1], ['pedone', 2, 5]];
  return {
    linee: l, testi: [], giro: 'oscilla', inclina: 0.5, scala: 41, centroY: 62,
    anima: (t0, v) => {
      const t = t0 % 9;
      FERMI.forEach(([tipo, f, r]) => pezzo(v.l, tipo, cas(f), cas(r), 0));
      // La regina di Deep Blue vola verso il re
      const u = dolce((t - 0.8) / 1.1), xq = cas(1) + (cas(5) - cas(1)) * u, zq = cas(3) + (cas(5) - cas(3)) * u;
      pezzo(v.l, 'regina', xq, zq, Math.sin(u * Math.PI) * 0.3);
      // Il re trema, poi cade
      const trema = t > 2.1 && t < 3.1 ? Math.sin((t - 2.1) * 18) * 0.12 * (1 - (t - 2.1) * 0.4) : 0, cade = dolce((t - 3.1) / 0.55) * 1.5;
      pezzo(v.l, 're', cas(3), cas(6), 0, trema + cade);
      v.testi.push(t < 3.7 ? centrato('DEEP BLUE', 2) : centrato('KASPAROV RESIGNS', 2));
      if (t > 4.8) v.testi.push(centrato('FINAL SCORE 3.5 - 2.5', 107));
    },
  };
}
// --- Go: le pietre cadono una alla volta, fino alla mossa che nessuno si aspettava
function go(): Scena {
  const l: L = [], n = 9, m = 0.26, a0 = ((n - 1) * m) / 2;
  for (let k = 0; k < n; k++) { const v = -a0 + k * m; seg(l, [v, 0, -a0], [v, 0, a0]); seg(l, [-a0, 0, v], [a0, 0, v]); }
  // Una posizione illustrativa, non presa dalle partite
  const pietre = [[2, 2], [6, 6], [2, 6], [6, 2], [3, 4], [5, 3], [4, 6], [1, 4], [7, 4], [4, 1], [3, 7], [6, 5], [5, 5]] as const;
  // Una pietra è un disco: nera piena di cerchi, bianca con il solo bordo. Così si distinguono senza colore
  const disco = (l2: L, x: number, y: number, z: number, nera: boolean) => {
    anello(l2, x, y, z, 0.105, 'y', 12);
    if (nera) for (const r of [0.075, 0.045, 0.02]) anello(l2, x, y, z, r, 'y', 10);
    else anello(l2, x, y + 0.04, z, 0.06, 'y', 8);
  };
  return {
    linee: l, testi: [], giro: 'oscilla', inclina: 0.72, scala: 42, centroY: 58,
    anima: (t0, v) => {
      const dt = 0.42, passi = pietre.length * dt, t = t0 % (passi + 5), w = t / dt, quante = Math.min(pietre.length, Math.floor(w) + 1), finite = Math.floor(w) >= pietre.length;
      for (let k = 0; k < quante; k++) {
        const [x, z] = pietre[k]!, cade = k === quante - 1 && !finite ? 1 - Math.min(1, (w - Math.floor(w)) * 2.4) : 0;
        disco(v.l, -a0 + x * m, 0.03 + cade * cade * 1.1, -a0 + z * m, k % 2 === 0);
      }
      // L'ultima pietra è la mossa famosa: i cerchi si allargano sul tavoliere
      if (finite) {
        const [x, z] = pietre[pietre.length - 1]!, e = (t - passi) % 1.1;
        anello(v.l, -a0 + x * m, 0.02, -a0 + z * m, 0.14 + e * 0.75, 'y', 22);
        v.testi.push(centrato('MOVE 37', 2, 2));
        if (t - passi > 1.3) v.testi.push(centrato('NOBODY EXPECTED IT', 106));
      }
    },
  };
}
// --- ChatGPT: un contatore e una folla che si riempie
function chat(): Scena {
  const col = 18, righe = 5, passoX = 7, passoY = 9, x0 = Math.round((LARGHEZZA - col * passoX) / 2) + 1, y0 = 40;
  return {
    linee: [], testi: [], giro: 'fermo', inclina: 0, scala: 1, centroY: 0,
    anima: (t0, v) => {
      const t = t0 % 8.5, u = dolce(t / 4.5), milioni = Math.round(u * 100);
      v.testi.push(centrato(`${milioni}M`, 6, 3));
      const accese = Math.round(u * col * righe);
      // Ogni persona è testa e corpo. Si riempie a caso, come arriva la gente
      for (let k = 0; k < col * righe; k++) {
        const ordine = (k * 37) % (col * righe); if (ordine >= accese) continue;
        const x = x0 + (k % col) * passoX, y = y0 + Math.floor(k / col) * passoY;
        v.pixel(x + 1, y); v.pixel(x + 2, y);
        v.pixel(x + 1, y + 1); v.pixel(x + 2, y + 1);
        for (const dy of [3, 4, 5]) for (const dx of [0, 1, 2, 3]) if (dy < 5 || dx === 1 || dx === 2) v.pixel(x + dx, y + dy);
      }
      if (t > 4.6) v.testi.push(centrato('USERS IN ABOUT', 90), centrato('TWO MONTHS', 102));
    },
  };
}
// --- AlphaFold: un filo si piega da solo e diventa una forma
function proteina(): Scena {
  const N = 110;
  // La forma: due eliche e un'ansa. È un disegno illustrativo, non una struttura reale
  const forma = (u: number): Punto => {
    if (u < 0.44) { const w = u / 0.44, a = w * Math.PI * 8; return [-0.55 + Math.cos(a) * 0.36, -1 + w * 2, Math.sin(a) * 0.36]; }
    if (u < 0.56) { const w = (u - 0.44) / 0.12, a = w * Math.PI; return [-0.19 + (0.38 * (1 - Math.cos(a))) / 2 * 1, 1 + Math.sin(a) * 0.28, Math.sin(a) * 0.3]; }
    const w = (u - 0.56) / 0.44, a = w * Math.PI * 8; return [0.55 + Math.cos(a + Math.PI) * 0.36, 1 - w * 2, Math.sin(a + Math.PI) * 0.36];
  };
  const filo = (u: number, t: number): Punto => [-1.5 + u * 3, Math.sin(u * 14 + t * 2) * 0.05, Math.cos(u * 11 + t * 2) * 0.05];
  return {
    linee: [], testi: [], giro: 'pieno', inclina: 0.2, scala: 36, centroY: 54,
    anima: (t0, v) => {
      const t = t0 % 10, f = dolce((t - 1.2) / 3) * (1 - dolce((t - 9.2) / 0.8));
      let prima: Punto | null = null;
      for (let k = 0; k <= N; k++) {
        const u = k / N, ritardo = dolce((f * 1.5 - u * 0.5)), p = lungo(filo(u, t), forma(u), ritardo);
        if (prima) seg(v.l, prima, p);
        // I piccoli raggi fanno vedere la catena come un nastro
        if (k % 4 === 0) { const q = lungo(filo(u, t), forma(u), Math.max(0, ritardo - 0.02)); seg(v.l, p, [q[0], q[1] + 0.07, q[2] + 0.04]); }
        prima = p;
      }
      v.testi.push(f < 0.5 ? centrato('A STRING', 106) : centrato('FOLDS INTO A SHAPE', 106));
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
        // Prima arrivano due ingressi: non bastano. Poi arrivano tutti
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
// --- Il gioco dell'imitazione: domande a due stanze, senza vedere chi risponde
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
      v.testi.push(t < 6 ? centrato('MACHINE OR PERSON?', 104) : centrato('THE JUDGE CANNOT TELL', 104));
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
  const l: L = [], strati = [[-0.82, 1.1], [-0.42, 0.9], [-0.05, 0.7], [0.28, 0.52], [0.58, 0.38]] as const;
  strati.forEach(([x, h]) => cubo(l, x, 0, 0, 0.2, h, h));
  return {
    linee: l, testi: [{ x: 3, y: 88, t: 'ALEXNET 15.3%' }, { x: 3, y: 104, t: 'NEXT    26.2%' }], giro: 'oscilla', inclina: 0.3, scala: 30, centroY: 38,
    anima: (t0, v) => {
      const t = t0 % 6, u = dolce(t / 2.6), x0 = 2, y0 = 26;
      // Il gatto a pixel a sinistra
      GATTO.forEach((riga, y) => [...riga].forEach((c, x) => { if (c === '1') { for (const a of [0, 1]) for (const b of [0, 1]) v.pixel(x0 + x * 2 + a, y0 + y * 2 + b); } }));
      // Una finestra attraversa la rete e si stringe a ogni strato
      if (t < 2.6) {
        const x = -1 + u * 1.75, h = Math.max(0.06, 0.55 - u * 0.45);
        const P: Punto[] = [[x, h, h], [x, h, -h], [x, -h, -h], [x, -h, h]];
        P.forEach((p, k) => seg(v.l, p, P[(k + 1) % 4]!));
      } else v.testi.push({ x: 104, y: 36, t: 'CAT!', s: 1 });
      // Le barre crescono: più lunga vuol dire più errori
      const b = dolce(t / 2);
      for (const [y, n] of [[97, 15.3], [113, 26.2]] as const) for (let x = 0; x < n * 4.6 * b; x++) { v.pixel(3 + x, y); v.pixel(3 + x, y + 1); }
    },
  };
}
// --- L'attenzione: in una frase, ogni parola guarda le altre. «It» guarda «cat»
function attenzione(): Scena {
  const parole = ['THE', 'CAT', 'SAT.', 'IT', 'SLEPT'], y = 68;
  let x = 3; const xs = parole.map(p => { const c = x + (p.length * 6 - 1) / 2; x += (p.length + 1) * 6; return c; });
  const scelte: [number, number][] = [[3, 1], [2, 1], [4, 1], [0, 1], [1, 2]];
  return {
    linee: [], testi: [], giro: 'fermo', inclina: 0, scala: 1, centroY: 0,
    anima: (t0, v) => {
      const passo = 1.9, k = Math.floor(t0 / passo) % scelte.length, u = (t0 % passo) / passo, [da, verso] = scelte[k]!;
      let xt = 3;
      parole.forEach((p, i) => {
        v.testi.push({ x: xt, y, t: p, s: 1 });
        // La parola che guarda ha una riga sotto, quella guardata due
        const larg = p.length * 6 - 1;
        if (i === da) for (let q = 0; q < larg; q++) v.pixel(xt + q, y + 9);
        if (i === verso && u > 0.25) for (let q = 0; q < larg; q++) { v.pixel(xt + q, y + 9); v.pixel(xt + q, y + 11); }
        xt += (p.length + 1) * 6;
      });
      // Gli archi: tenui verso tutte le parole, pieno verso quella giusta
      const arco = (a: number, b: number, alt: number, pieno_: boolean, fino = 1) => {
        const n = Math.ceil(Math.abs(xs[b]! - xs[a]!) * 1.4) + 8;
        for (let q = 0; q <= n * fino; q++) { const w = q / n; if (!pieno_ && q % 3) continue; v.pixel(Math.round(xs[a]! + (xs[b]! - xs[a]!) * w), Math.round(y - 3 - Math.sin(w * Math.PI) * alt)); }
      };
      parole.forEach((_, b) => { if (b !== da && b !== verso) arco(da, b, 16, false, Math.min(1, u * 3)); });
      arco(da, verso, 36, true, Math.min(1, u * 2.2));
      v.testi.push(centrato('EVERY WORD LOOKS', 92), centrato('AT THE OTHERS', 104));
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
  // Il percorso del pensiero, e cosa sta facendo a ogni tappa
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
// --- Pesi aperti: il lucchetto si apre e il modello esce, per tutti
function pesiAperti(): Scena {
  const l: L = [];
  cubo(l, 0, -0.32, 0, 0.9, 0.72, 0.34);
  return {
    linee: l, testi: [centrato('R1', 2, 2)], giro: 'oscilla', inclina: 0.2, scala: 36, centroY: 62,
    anima: (t0, v) => {
      const t = t0 % 8, apre = dolce((t - 1) / 0.8);
      // L'arco del lucchetto si alza e gira
      const su = apre * 0.28, gira = apre * 1.5, ca = Math.cos(gira), sa = Math.sin(gira), r = 0.28, n = 10;
      const P = (x: number, y: number): Punto => [-r + (x + r) * ca, y, (x + r) * sa];
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI, b = ((k + 1) / n) * Math.PI; seg(v.l, P(Math.cos(a) * r, 0.28 + su + Math.sin(a) * r), P(Math.cos(b) * r, 0.28 + su + Math.sin(b) * r)); }
      seg(v.l, P(r, 0.04 + su), P(r, 0.28 + su)); seg(v.l, P(-r, 0.04 + su), P(-r, 0.28 + su));
      // Il buco della chiave
      anello(v.l, 0, -0.28, 0.17, 0.07, 'z', 8); seg(v.l, [0, -0.35, 0.17], [0, -0.48, 0.17]);
      // I pesi escono in tutte le direzioni
      if (t > 1.7) for (let k = 0; k < 12; k++) {
        const u = ((t - 1.7) * 0.32 + k / 12) % 1, an = k * 2.4, ra = 0.15 + u * 1.5, x = Math.cos(an) * ra, y = 0.1 + Math.sin(an) * ra * 0.55 + u * 0.3;
        cubo(v.l, x, y, Math.sin(an * 2.1) * 0.5 * u, 0.08, 0.08, 0.08);
      }
      v.testi.push(t > 1.7 ? centrato('OPEN WEIGHTS', 106) : centrato('LOCKED', 106));
    },
  };
}

const SCENE: Record<string, () => Scena> = { neurone, turing, backprop, scacchi, alexnet, go, attenzione, proteina, chat, ragionamento, 'pesi-aperti': pesiAperti };
export const scena = (nome: string) => SCENE[nome]?.();

// --- Il disegno. fino va da 0 a 1: quanta parte della scena è già comparsa. tempo in secondi: fa andare la storia
export function disegna(g: CanvasRenderingContext2D, s: Scena, angolo: number, colore: string, fino = 1, tempo = 0) {
  g.clearRect(0, 0, LARGHEZZA, ALTEZZA);
  g.fillStyle = colore;
  const a = s.giro === 'pieno' ? angolo : s.giro === 'oscilla' ? Math.sin(angolo * 1.3) * 0.62 : 0, ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(s.inclina), st = Math.sin(s.inclina);
  const proietta = (p: Punto) => {
    const x = p[0] * ca + p[2] * sa, z1 = -p[0] * sa + p[2] * ca, y = p[1] * ct - z1 * st, z = p[1] * st + z1 * ct, f = 4.2 / (4.2 - z);
    return [Math.round((s.centroX ?? LARGHEZZA / 2) + x * s.scala * f), Math.round(s.centroY - y * s.scala * f), z] as const;
  };
  const traccia = ([p, q]: [Punto, Punto]) => {
    const A = proietta(p), B = proietta(q);
    // Bresenham: niente sfumature. Dietro al centro della scena la linea è a pixel alterni
    let x = A[0], y = A[1]; const x1 = B[0], y1 = B[1], dx = Math.abs(x1 - x), dy = -Math.abs(y1 - y), sx = x < x1 ? 1 : -1, sy = y < y1 ? 1 : -1, lontana = (A[2] + B[2]) / 2 < -0.12;
    let err = dx + dy;
    for (;;) {
      if (!lontana || (x + y) % 2 === 0) g.fillRect(x, y, 1, 1);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  };
  const quante = Math.ceil(s.linee.length * fino);
  for (let k = 0; k < quante; k++) traccia(s.linee[k]!);
  // La storia parte quando la scena è comparsa
  const testi = [...s.testi];
  if (s.anima && fino >= 1) {
    const vivo: Vivo = { l: [], testi: [], pixel: (x, y) => g.fillRect(x, y, 1, 1) };
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
