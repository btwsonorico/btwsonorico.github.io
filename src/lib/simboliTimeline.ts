// I simboli a filo degli eventi essenziali della timeline (/learn/timeline/). Ogni simbolo è un SVG di sole linee, in un
// colore solo (currentColor), con una vista isometrica leggera. Ogni linea ha pathLength="1": la pagina la "disegna"
// facendo scorrere stroke-dashoffset quando l'evento arriva al centro dello schermo.

type P = [number, number];
const L = (punti: P[], chiuso = false, classe = '') => `<path pathLength="1"${classe ? ` class="${classe}"` : ''} d="M${punti.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')}${chiuso ? ' Z' : ''}"/>`;
const C = (x: number, y: number, r: number, classe = '') => `<circle pathLength="1"${classe ? ` class="${classe}"` : ''} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"/>`;
const E = (x: number, y: number, rx: number, ry: number, classe = '') => `<ellipse pathLength="1"${classe ? ` class="${classe}"` : ''} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx}" ry="${ry}"/>`;
// Proiezione isometrica: x verso destra-giù, z verso sinistra-giù, y in alto
const iso = (x: number, y: number, z: number, s = 1, ox = 60, oy = 52): P => [ox + (x - z) * 0.866 * s, oy + (x + z) * 0.5 * s - y * s];
const quadro = (x0: number, z0: number, x1: number, z1: number, y = 0, s = 1, ox = 60, oy = 52) => L([iso(x0, y, z0, s, ox, oy), iso(x1, y, z0, s, ox, oy), iso(x1, y, z1, s, ox, oy), iso(x0, y, z1, s, ox, oy)], true);
const scatola = (x0: number, z0: number, x1: number, z1: number, h: number, s = 1, ox = 60, oy = 52) => {
  const q = (x: number, y: number, z: number) => iso(x, y, z, s, ox, oy);
  return [L([q(x0, h, z0), q(x1, h, z0), q(x1, h, z1), q(x0, h, z1)], true), L([q(x1, 0, z0), q(x1, 0, z1), q(x0, 0, z1)]),
    L([q(x1, 0, z0), q(x1, h, z0)]), L([q(x1, 0, z1), q(x1, h, z1)]), L([q(x0, 0, z1), q(x0, h, z1)])].join('');
};

const DISEGNI: Record<string, () => string> = {
  // Un neurone: il corpo, i dendriti che si ramificano a sinistra, l'assone con le sue terminazioni a destra
  neurone: () => [
    E(46, 46, 11, 9),
    L([[36, 42], [24, 34], [14, 30]]), L([[24, 34], [20, 24]]), L([[37, 50], [24, 58], [12, 60]]), L([[24, 58], [18, 68]]), L([[44, 37], [40, 22], [34, 14]]),
    L([[57, 47], [74, 49], [92, 50]]), L([[92, 50], [102, 42]]), L([[92, 50], [104, 52]]), L([[92, 50], [100, 61]]),
    C(102, 42, 2, 'pieno'), C(104, 52, 2, 'pieno'), C(100, 61, 2, 'pieno'), E(64, 48, 4, 3), E(78, 49, 4, 3),
  ].join(''),
  // Il gioco dell'imitazione: due terminali si guardano, fra loro una conversazione a puntini
  turing: () => [
    scatola(0, 0, 14, 12, 12, 1.6, 28, 46), scatola(0, 0, 14, 12, 12, 1.6, 82, 46),
    L([[38, 52], [52, 52]], false, 'tratteggio'), L([[64, 58], [78, 58]], false, 'tratteggio'), L([[60, 22], [60, 18]]), C(60, 26, 0.6, 'pieno'),
    L([[56, 12], [58, 9], [62, 9], [64, 12], [60, 16]]),
  ].join(''),
  // Il perceptron: quattro ingressi convergono in un nodo, che decide con un gradino
  perceptron: () => {
    const ingressi = [16, 32, 48, 64].map(y => [C(18, y + 6, 5), L([[23, y + 6], [60, 46]])].join(''));
    return [...ingressi, C(66, 46, 8), L([[74, 46], [94, 46]]), L([[94, 46], [90, 43]]), L([[94, 46], [90, 49]]), L([[62, 50], [66, 50], [66, 42], [70, 42]]), L([[98, 54], [104, 54], [104, 40], [110, 40]])].join('');
  },
  // La retropropagazione: tre strati di nodi; l'errore torna indietro, tratteggiato
  backprop: () => {
    const strati = [[16, [24, 46, 68]], [58, [16, 36, 56, 76]], [100, [34, 58]]] as const;
    const archi: string[] = [];
    for (let s = 0; s < 2; s++) for (const a of strati[s]![1]) for (const b of strati[s + 1]![1]) archi.push(L([[strati[s]![0] + 5, a], [strati[s + 1]![0] - 5, b]], false, 'tenue'));
    const nodi = strati.flatMap(([x, ys]) => ys.map(y => C(x, y, 5)));
    return [...archi, ...nodi, L([[96, 84], [22, 84]], false, 'tratteggio'), L([[22, 84], [27, 81]]), L([[22, 84], [27, 87]])].join('');
  },
  // Deep Blue: il re degli scacchi su una casella
  scacchi: () => [
    quadro(-16, -16, 16, 16, 0, 1, 60, 70), quadro(-16, -16, 0, 0, 0, 1, 60, 70),
    L([[50, 72], [70, 72], [67, 66], [53, 66]], true), L([[54, 66], [56, 46], [64, 46], [66, 66]]), L([[52, 46], [68, 46], [66, 40], [54, 40]], true),
    L([[55, 40], [53, 32], [60, 28], [67, 32], [65, 40]]), L([[60, 28], [60, 16]]), L([[55, 21], [65, 21]]),
  ].join(''),
  // AlexNet: strati di convoluzione sempre più piccoli e profondi, e una griglia di immagini
  alexnet: () => [
    scatola(0, 0, 4, 28, 28, 1, 22, 44), scatola(0, 0, 8, 20, 20, 1, 46, 48), scatola(0, 0, 12, 14, 14, 1, 66, 52), scatola(0, 0, 16, 8, 8, 1, 86, 56),
    L([[100, 64], [110, 64]]), C(112, 64, 1.5, 'pieno'),
    L([[4, 74], [16, 74], [16, 86], [4, 86]], true), L([[10, 74], [10, 86]], false, 'tenue'), L([[4, 80], [16, 80]], false, 'tenue'),
  ].join(''),
  // AlphaGo: un goban in prospettiva con qualche pietra nera e bianca
  go: () => {
    const righe: string[] = [];
    for (let k = 0; k <= 6; k++) { const t = -18 + k * 6; righe.push(L([iso(t, 0, -18, 1.4, 60, 46), iso(t, 0, 18, 1.4, 60, 46)], false, 'tenue'), L([iso(-18, 0, t, 1.4, 60, 46), iso(18, 0, t, 1.4, 60, 46)], false, 'tenue')); }
    const pietre = [[-6, 0, 1], [0, -6, 0], [6, 0, 1], [0, 6, 0], [6, 6, 1], [-6, -6, 0], [12, -6, 1]].map(([x, z, nera]) => { const [px, py] = iso(x!, 0, z!, 1.4, 60, 46); return E(px, py - 1, 4.2, 2.6, nera ? 'pieno' : ''); });
    return [...righe, ...pietre].join('');
  },
  // Il transformer: una matrice di attenzione, ogni parola guarda le altre; i quadri pieni sono i pesi forti
  attenzione: () => {
    const celle: string[] = [];
    const forti = new Set(['0,0', '1,0', '1,1', '2,1', '3,3', '4,2', '4,4', '5,3', '5,5', '2,2', '3,1']);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      const x = 28 + j * 11, y = 12 + i * 11, forte = forti.has(`${i},${j}`);
      celle.push(L([[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10]], true, forte ? 'pieno-tenue' : 'tenue'));
    }
    return [...celle, L([[16, 18], [24, 18]]), L([[16, 40], [24, 40]]), L([[16, 62], [24, 62]]), L([[96, 30], [110, 30]], false, 'tenue'), L([[96, 52], [110, 52]], false, 'tenue')].join('');
  },
  // AlphaFold: una catena di proteina che si avvolge in un'elica
  proteina: () => {
    const a: P[] = [], b: P[] = [], pioli: string[] = [];
    for (let k = 0; k <= 40; k++) {
      const t = k / 40, x = 12 + t * 96, f = t * Math.PI * 4;
      a.push([x, 46 + Math.sin(f) * 18]); b.push([x, 46 - Math.sin(f) * 18]);
      if (k % 4 === 2) pioli.push(L([[x, 46 + Math.sin(f) * 18], [x, 46 - Math.sin(f) * 18]], false, 'tenue'));
    }
    return [L(a), L(b), ...pioli, C(12, 46, 2, 'pieno'), C(108, 46, 2, 'pieno')].join('');
  },
  // ChatGPT: due fumetti di una conversazione
  chat: () => [
    L([[10, 14], [70, 14], [70, 40], [24, 40], [16, 48], [18, 40], [10, 40]], true), L([[18, 23], [60, 23]], false, 'tenue'), L([[18, 31], [48, 31]], false, 'tenue'),
    L([[44, 50], [110, 50], [110, 80], [102, 80], [104, 88], [94, 80], [44, 80]], true), L([[52, 59], [102, 59]], false, 'tenue'), L([[52, 66], [98, 66]], false, 'tenue'), L([[52, 73], [80, 73]], false, 'tenue'),
  ].join(''),
  // I modelli che ragionano: una catena di passi che sale fino alla risposta
  ragionamento: () => {
    const passi = [[14, 74], [34, 62], [54, 66], [74, 46], [94, 30]] as const;
    return [
      ...passi.slice(0, -1).map(([x, y], k) => L([[x + 4, y], [passi[k + 1]![0] - 4, passi[k + 1]![1]]], false, 'tratteggio')),
      ...passi.slice(0, -1).map(([x, y]) => C(x, y, 4)),
      C(94, 30, 8), L([[90, 30], [93, 34], [99, 26]]), L([[14, 84], [104, 84]], false, 'tenue'),
    ].join('');
  },
  // DeepSeek-R1: un lucchetto aperto davanti a una griglia di pesi
  'pesi-aperti': () => {
    const pesi: string[] = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) pesi.push(C(64 + j * 10, 22 + i * 12, 1.4, (i + j) % 3 ? 'tenue' : 'pieno'));
    return [...pesi, L([[14, 46], [50, 46], [50, 80], [14, 80]], true), L([[20, 46], [20, 30], [24, 20], [32, 16], [40, 20], [44, 28]]), C(32, 60, 4), L([[32, 64], [32, 72]])].join('');
  },
};

export const SIMBOLI = Object.keys(DISEGNI);
export function simbolo(nome: string | undefined) {
  const d = nome ? DISEGNI[nome] : undefined;
  return d ? `<svg class="simbolo" viewBox="0 0 120 92" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d()}</svg>` : '';
}
