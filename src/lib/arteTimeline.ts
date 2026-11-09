// La grafica ASCII dei 12 eventi essenziali della timeline (/learn/timeline/). Tutto è testo in Departure Mono: una griglia di
// 56 colonne per 30 righe, con caratteri larghi 0,6 della loro altezza. Niente DOM: il file serve sia nella build sia nel browser.
// Tre tipi di immagine: macchina = foto d'archivio in caratteri o oggetto 3D; idea = schema ridisegnato con caratteri veri
// (+ - | / \) e testo; world = numero o parola grande. La rampa di luminosità serve solo per foto e oggetti 3D.
import foto from './arteFoto.json';

export const COLONNE = 56, RIGHE = 30;
const RAMPA = ' .:-=+*#%@';

export type Arte = { righe: string; didascalia: string; rotante?: boolean; foto?: { src: string; alt: string } };

// --- La tela: una griglia di caratteri e pochi modi di disegnarci sopra
class Tela {
  g = Array.from({ length: RIGHE }, () => new Array<string>(COLONNE).fill(' '));
  punto(c: number, r: number, ch: string) { const x = Math.round(c), y = Math.round(r); if (y >= 0 && y < RIGHE && x >= 0 && x < COLONNE) this.g[y]![x] = ch; }
  testo(c: number, r: number, t: string) { [...t].forEach((ch, k) => { if (ch !== ' ') this.punto(c + k, r, ch); }); }
  centrato(c: number, r: number, t: string) { this.testo(Math.round(c - t.length / 2), r, t); }
  // Una linea sceglie il carattere dalla sua pendenza vera, cioè tenendo conto che un carattere è più alto che largo
  linea(c0: number, r0: number, c1: number, r1: number, ch?: string) {
    const dx = c1 - c0, dy = r1 - r0, passi = Math.max(Math.abs(dx), Math.abs(dy)) || 1, pend = Math.abs(dy) / (Math.abs(dx) * 0.6 || 1e-6);
    const segno = pend < 0.4 ? '-' : pend > 2.5 ? '|' : dx * dy > 0 ? '\\' : '/';
    for (let k = 0; k <= passi; k++) this.punto(c0 + (dx * k) / passi, r0 + (dy * k) / passi, ch ?? segno);
  }
  scatola(c0: number, r0: number, c1: number, r1: number, titolo?: string) {
    this.linea(c0, r0, c1, r0, '-'); this.linea(c0, r1, c1, r1, '-'); this.linea(c0, r0, c0, r1, '|'); this.linea(c1, r0, c1, r1, '|');
    for (const [c, r] of [[c0, r0], [c1, r0], [c0, r1], [c1, r1]] as const) this.punto(c, r, '+');
    if (titolo) this.centrato((c0 + c1) / 2 + 0.5, (r0 + r1) / 2, titolo);
  }
  ellisse(c: number, r: number, rc: number, rr: number, ch = 'o') {
    for (let k = 0; k < 64; k++) { const a = (k / 64) * Math.PI * 2; this.punto(c + Math.cos(a) * rc, r + Math.sin(a) * rr, ch); }
  }
  // Un carattere del banner: 5x7, ingrandito
  banner(c: number, r: number, parola: string, ch = '#', sc = 2, sr = 2) {
    parola.split('').forEach((l, n) => {
      (LETTERE[l] ?? []).forEach((riga, y) => [...riga].forEach((v, x) => {
        if (v === '#') for (let a = 0; a < sc; a++) for (let b = 0; b < sr; b++) this.punto(c + n * (5 * sc + 2) + x * sc + a, r + y * sr + b, ch);
      }));
    });
  }
  toString() { return this.g.map(r => r.join('')).join('\n'); }
}
const LETTERE: Record<string, string[]> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
};

// --- Gli oggetti 3D: Deep Blue a scatole, con un raggio per ogni carattere, e l'elica della proteina a punti
const vista = (a: number, t: number, p: readonly number[]) => {
  const x = p[0]! * Math.cos(a) + p[2]! * Math.sin(a), z1 = -p[0]! * Math.sin(a) + p[2]! * Math.cos(a);
  return [x, p[1]! * Math.cos(t) - z1 * Math.sin(t), p[1]! * Math.sin(t) + z1 * Math.cos(t)] as const;
};
const indietro = (a: number, t: number, p: readonly number[]) => {
  const y = p[1]! * Math.cos(t) + p[2]! * Math.sin(t), z1 = -p[1]! * Math.sin(t) + p[2]! * Math.cos(t);
  return [p[0]! * Math.cos(a) - z1 * Math.sin(a), y, p[0]! * Math.sin(a) + z1 * Math.cos(a)] as const;
};
type Scatola = { c: [number, number, number]; e: [number, number, number]; fasce?: number };
const sc = (x: number, y: number, z: number, w: number, h: number, d: number, fasce?: number): Scatola => ({ c: [x, y, z], e: [w / 2, h / 2, d / 2], fasce });
const DEEP_BLUE = [sc(-0.38, -0.04, 0, 0.66, 1.66, 0.78, 5), sc(0.38, -0.04, 0, 0.66, 1.66, 0.78, 5), sc(-0.38, 0.84, 0, 0.72, 0.1, 0.84), sc(0.38, 0.84, 0, 0.72, 0.1, 0.84), sc(0, -0.92, 0, 1.6, 0.1, 1.04)];

function deepBlue(angolo: number, chiaro: boolean) {
  const inclina = 0.36, scala = 12.5, righe: string[] = [];
  const d = indietro(angolo, inclina, [0, 0, -1]);
  for (let r = 0; r < RIGHE; r++) {
    let riga = '';
    for (let c = 0; c < COLONNE; c++) {
      const o = indietro(angolo, inclina, [((c - COLONNE / 2 + 0.5) * 0.6) / scala, (RIGHE / 2 - r - 0.5) / scala, 5]);
      let vicino = Infinity, luce = 0;
      for (const b of DEEP_BLUE) {
        let t0 = -Infinity, t1 = Infinity, asse = 0, dentro = true;
        for (let i = 0; i < 3; i++) {
          const v = d[i]!, q = o[i]!, ce = b.c[i]!, es = b.e[i]!;
          if (Math.abs(v) < 1e-6) { if (Math.abs(q - ce) > es) { dentro = false; break; } continue; }
          let u = (ce - es - q) / v, w = (ce + es - q) / v;
          if (u > w) [u, w] = [w, u];
          if (u > t0) { t0 = u; asse = i; }
          if (w < t1) t1 = w;
          if (t0 > t1) { dentro = false; break; }
        }
        if (dentro && t0 < vicino) {
          vicino = t0;
          const n = [0, 0, 0]; n[asse] = d[asse]! > 0 ? -1 : 1;
          const nv = vista(angolo, inclina, n);
          luce = 0.16 + 0.84 * Math.max(0, nv[0] * -0.5 + nv[1] * 0.6 + nv[2] * 0.62);
          if (b.fasce && Math.floor((o[1]! + d[1]! * t0 + 2) * b.fasce) % 2) luce *= 0.5;
        }
      }
      riga += carattere(luce, vicino === Infinity, chiaro);
    }
    righe.push(riga);
  }
  return righe.join('\n');
}
function proteina(angolo: number, chiaro: boolean) {
  const buf = new Float32Array(COLONNE * RIGHE).fill(-Infinity), inclina = 0.25, scala = 12;
  // La catena: un tratto a elica, un'ansa, e un secondo tratto a elica. È un disegno illustrativo, non una struttura reale
  for (let k = 0; k < 900; k++) {
    const s = k / 899;
    let p: readonly [number, number, number];
    if (s < 0.42) { const u = s / 0.42, a = u * Math.PI * 9; p = [-0.5 + Math.cos(a) * 0.34, -1 + u * 2, Math.sin(a) * 0.34]; }
    else if (s < 0.58) { const u = (s - 0.42) / 0.16, a = u * Math.PI; p = [-0.5 * Math.cos(a) + 0.04 * Math.sin(a * 5), 1 + Math.sin(a) * 0.14, Math.sin(a) * 0.5]; }
    else { const u = (s - 0.58) / 0.42, a = u * Math.PI * 9; p = [0.5 + Math.cos(a) * 0.34, 1 - u * 2, Math.sin(a) * 0.34]; }
    const v = vista(angolo, inclina, p);
    const c = Math.round(COLONNE / 2 + (v[0] * scala) / 0.6), r = Math.round(RIGHE / 2 - v[1] * scala);
    if (c >= 0 && c < COLONNE && r >= 0 && r < RIGHE) { const i = r * COLONNE + c; if (v[2] > buf[i]!) buf[i] = v[2]; }
  }
  const righe: string[] = [];
  for (let r = 0; r < RIGHE; r++) {
    let riga = '';
    for (let c = 0; c < COLONNE; c++) { const z = buf[r * COLONNE + c]!; riga += carattere(0.3 + 0.7 * Math.min(1, (z + 1) / 1.6), z === -Infinity, chiaro); }
    righe.push(riga);
  }
  return righe.join('\n');
}
// Nel tema chiaro la luce diventa inchiostro: più luce, meno carattere. Lo sfondo resta vuoto
function carattere(luce: number, vuoto: boolean, chiaro: boolean) {
  if (vuoto) return ' ';
  const k = Math.min(9, Math.max(1, Math.floor(luce * 10)));
  return RAMPA[chiaro ? 10 - k : k]!;
}
// Lo stesso per la foto: nel tema chiaro diventa il suo negativo, così resta una foto e non una radiografia
export function perIlTema(testo: string, chiaro: boolean) {
  if (!chiaro) return testo;
  return [...testo].map(ch => (ch === '\n' ? ch : RAMPA[9 - RAMPA.indexOf(ch)] ?? ch)).join('');
}
export function fotogrammaArte(nome: string, angolo: number, chiaro: boolean) {
  return nome === 'proteina' ? proteina(angolo, chiaro) : deepBlue(angolo, chiaro);
}

// --- Gli schemi
function neurone() {
  const t = new Tela();
  t.centrato(28, 1, 'a neuron as a logic unit');
  [[7, 'x1'], [12, 'x2'], [17, 'x3'], [22, 'x4']].forEach(([r, nome]) => { t.testo(2, r as number, nome as string); t.linea(6, r as number, 21, 14.5 + ((r as number) - 14.5) * 0.2); t.punto(5, r as number, '>'); });
  t.ellisse(28, 14.5, 8.5, 5.5);
  t.centrato(28, 13, 'fires if');
  t.centrato(28, 15, 'sum >= t');
  t.linea(37, 14.5, 49, 14.5, '-'); t.punto(50, 14.5, '>');
  t.testo(52, 14, '0');
  t.testo(52, 15, '1');
  t.centrato(28, 27, 'inputs on or off, output on or off');
  return t;
}
function turing() {
  const t = new Tela();
  t.centrato(28, 1, 'the imitation game');
  t.scatola(3, 11, 17, 17, 'judge');
  t.linea(30, 4, 30, 25, '#');
  t.scatola(37, 5, 52, 11, 'A: machine');
  t.scatola(37, 18, 52, 24, 'B: person');
  t.linea(18, 13, 29, 8.5); t.linea(31, 8, 36, 8, '-'); t.punto(36, 8, '>');
  t.linea(18, 15, 29, 20.5); t.linea(31, 21, 36, 21, '-'); t.punto(36, 21, '>');
  t.testo(21, 7, 'text');
  t.testo(21, 21, 'text');
  t.centrato(28, 27, 'which one is the machine?');
  return t;
}
function backprop() {
  const t = new Tela(), strati = [[8, 13, 18, 23], [6, 11, 16, 21, 26].slice(0, 5), [8, 13, 18, 23], [11, 20]], xs = [6, 20, 34, 48];
  t.testo(2, 2, 'forward ---------------------------->');
  strati.forEach((s, k) => { const dopo = strati[k + 1]; if (dopo) s.forEach(a => dopo.forEach(b => t.linea(xs[k]! + 2, a, xs[k + 1]! - 2, b, '.'))); });
  strati.forEach((s, k) => s.forEach(r => t.testo(xs[k]! - 1, r, '(O)')));
  t.testo(17, 28, '<============== error goes back');
  return t;
}
function alexnet() {
  const t = new Tela();
  [[3, 3, 17], [11, 5, 15], [19, 6, 14], [26, 7, 13], [33, 8, 12]].forEach(([c, a, b]) => { t.scatola(c!, a!, c! + 5, b!); t.scatola(c! + 1, a! - 1, c! + 6, b! - 1); });
  for (const c of [42, 46, 50]) t.linea(c, 5, c, 15, '#');
  t.testo(2, 19, 'five conv layers, then three dense');
  t.testo(2, 22, 'top-5 error, ImageNet 2012');
  t.testo(2, 24, `AlexNet   15.3% ${'#'.repeat(15)}`);
  t.testo(2, 26, `next best 26.2% ${'#'.repeat(26)}`);
  return t;
}
function tavoliere() {
  const t = new Tela(), c0 = 10, r0 = 3;
  for (let y = 0; y < 19; y++) t.testo(c0, r0 + y, Array.from({ length: 19 }, () => '+').join('-'));
  for (const x of [3, 9, 15]) for (const y of [3, 9, 15]) t.punto(c0 + x * 2, r0 + y, '*');
  // Una posizione illustrativa, non presa dalle partite
  const neri = [[3, 3], [4, 2], [15, 3], [16, 5], [13, 2], [2, 13], [3, 15], [5, 16], [9, 9], [10, 7], [12, 8], [14, 9], [15, 11], [8, 12], [7, 14], [16, 15], [14, 16]];
  const bianchi = [[15, 15], [13, 16], [3, 9], [2, 7], [5, 3], [7, 2], [16, 8], [16, 10], [11, 10], [10, 11], [12, 12], [6, 11], [5, 13], [11, 15], [9, 16], [3, 5]];
  for (const [x, y] of neri) t.punto(c0 + x! * 2, r0 + y!, '@');
  for (const [x, y] of bianchi) t.punto(c0 + x! * 2, r0 + y!, 'O');
  t.centrato(28, 24, 'more positions than can be searched');
  t.centrato(28, 26, 'networks choose where to look');
  return t;
}
function attenzione() {
  const t = new Tela();
  t.centrato(40, 0, 'probabilities');
  t.scatola(29, 1, 51, 3, 'linear, softmax');
  t.linea(40, 4, 40, 4, '|');
  t.scatola(26, 5, 54, 21);
  t.testo(27, 6, 'decoder x6');
  t.scatola(29, 7, 51, 9, 'feed forward');
  t.scatola(29, 11, 51, 13, 'attention');
  t.scatola(29, 15, 51, 19, 'masked attention');
  t.scatola(1, 9, 24, 21);
  t.testo(2, 10, 'encoder x6');
  t.scatola(3, 11, 22, 13, 'feed forward');
  t.scatola(3, 15, 22, 19, 'attention');
  t.linea(23, 12, 28, 12, '-'); t.punto(28, 12, '>');
  t.scatola(3, 23, 22, 25, 'embedding');
  t.scatola(29, 23, 51, 25, 'embedding');
  t.linea(12, 22, 12, 22, '|'); t.linea(40, 22, 40, 22, '|');
  t.centrato(12, 27, 'inputs');
  t.centrato(40, 27, 'outputs so far');
  return t;
}
function chat() {
  const t = new Tela();
  t.banner(4, 5, '100M');
  t.centrato(28, 22, 'users in about two months');
  t.centrato(28, 24, '(an estimate)');
  return t;
}
function ragionamento() {
  const t = new Tela();
  t.scatola(14, 1, 41, 3, 'question');
  const passi = ['thought', 'try a step', 'check it', 'try again', 'thought'];
  passi.forEach((p, k) => { const r = 6 + k * 3; t.linea(28, r - 2, 28, r - 1, '|'); t.punto(28, r - 1, 'v'); t.centrato(28, r, p); });
  t.linea(28, 19, 28, 21, '|'); t.punto(28, 21, 'v');
  t.scatola(14, 22, 41, 24, 'answer');
  t.linea(46, 4, 46, 22, '|'); t.punto(46, 4, '^'); t.punto(46, 22, 'v');
  t.testo(48, 12, 'more');
  t.testo(48, 13, 'compute');
  t.centrato(28, 27, 'the model writes before it answers');
  return t;
}
function pesiAperti() {
  const t = new Tela();
  t.banner(16, 3, 'R1');
  t.centrato(28, 20, 'open weights');
  t.centrato(28, 22, 'anyone can download and run it');
  t.centrato(28, 25, 'much lower reported cost');
  return t;
}

const SCHEMI: Record<string, { disegna: () => Tela; didascalia: string }> = {
  neurone: { disegna: neurone, didascalia: 'Schematic, after McCulloch and Pitts.' },
  turing: { disegna: turing, didascalia: 'Schematic of the imitation game.' },
  backprop: { disegna: backprop, didascalia: 'Schematic.' },
  alexnet: { disegna: alexnet, didascalia: 'Schematic, with the challenge results.' },
  go: { disegna: tavoliere, didascalia: 'Illustrative position, not from the match.' },
  attenzione: { disegna: attenzione, didascalia: 'Redrawn after Vaswani and colleagues, 2017.' },
  chat: { disegna: chat, didascalia: 'Reported estimate for ChatGPT.' },
  ragionamento: { disegna: ragionamento, didascalia: 'Schematic.' },
  'pesi-aperti': { disegna: pesiAperti, didascalia: 'As reported for DeepSeek-R1.' },
};

// L'immagine di un evento, dal campo simbolo della sua nota
export function arte(nome: string | undefined): Arte | undefined {
  if (!nome) return undefined;
  if (nome === 'perceptron') return {
    righe: (foto as Record<string, string>).perceptron!,
    didascalia: 'Mark I Perceptron, 1960. Photo: U.S. Navy, public domain.',
    foto: { src: '/learn/timeline/perceptron.jpg', alt: 'A researcher working at the Mark I Perceptron, in front of a large letter C.' },
  };
  if (nome === 'scacchi') return { righe: deepBlue(0.6, false), didascalia: 'Deep Blue, a 3D reconstruction. Not to scale.', rotante: true };
  if (nome === 'proteina') return { righe: proteina(0.6, false), didascalia: 'Illustrative chain, not a real structure.', rotante: true };
  const s = SCHEMI[nome];
  return s && { righe: s.disegna().toString(), didascalia: s.didascalia };
}
