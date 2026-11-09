// La grafica dei 12 eventi essenziali della timeline (/learn/timeline/). Due tipi: la foto d'archivio resa in caratteri, nel
// font del sito, e il wireframe molto pixelato per tutto il resto (le scene sono in src/lib/arteWire.ts).
// Niente DOM: il file serve sia nella build sia nel browser.
import foto from './arteFoto.json';

const RAMPA = ' .:-=+*#%@';

export type Arte = { righe?: string; didascalia: string; foto?: { src: string; alt: string } };

// Nel tema chiaro la foto ha la rampa rovesciata: più luce, meno inchiostro
export function perIlTema(testo: string, chiaro: boolean) {
  if (!chiaro) return testo;
  return [...testo].map(ch => (ch === '\n' ? ch : RAMPA[9 - RAMPA.indexOf(ch)] ?? ch)).join('');
}

const DIDASCALIE: Record<string, string> = {
  neurone: 'The idea, after McCulloch and Pitts.',
  turing: 'The imitation game, as Turing proposed it.',
  backprop: 'The idea, simplified.',
  scacchi: 'Kasparov resigned game six. The position shown is illustrative.',
  alexnet: 'Illustrative cat. Numbers: top-5 error in the 2012 challenge.',
  go: 'Move 37 of game two. Small board, illustrative position.',
  attenzione: 'The idea of attention, simplified.',
  proteina: 'Illustrative chain, not a real structure.',
  chat: 'Reported estimate for ChatGPT.',
  ragionamento: 'The idea, simplified.',
  'pesi-aperti': 'DeepSeek-R1, released with open weights.',
};

// L'immagine di un evento, dal campo simbolo della sua nota
export function arte(nome: string | undefined): Arte | undefined {
  if (!nome) return undefined;
  if (nome === 'perceptron') return {
    righe: (foto as Record<string, string>).perceptron!,
    didascalia: 'Mark I Perceptron, 1960. Photo: U.S. Navy, public domain.',
    foto: { src: '/learn/timeline/perceptron.jpg', alt: 'A researcher working at the Mark I Perceptron, in front of a large letter C.' },
  };
  const didascalia = DIDASCALIE[nome];
  return didascalia ? { didascalia } : undefined;
}
