// La grafica degli eventi della timeline (/learn/timeline/). Due tipi: la foto d'archivio resa in caratteri, nel
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
  scacchi: 'The real moves of game six. The king falling is symbolic: Kasparov resigned.',
  alexnet: 'Illustrative cat. Numbers: top-5 error in the 2012 challenge.',
  go: 'The real moves 1 to 37 of game two. The odds are the ones DeepMind reported.',
  attenzione: 'The 2017 encoder, with illustrative weights. Models like GPT look only at earlier words.',
  proteina: 'The start of ubiquitin as input. Illustrative chain. Dotted: the lab shape.',
  chat: 'UBS estimates from Similarweb data. TikTok and Instagram: Sensor Tower.',
  ragionamento: 'The idea, simplified.',
  'pesi-aperti': 'The price line is a drawing. The fall and the loss are as reported by Bloomberg.',
  eliza: 'The sample dialogue in the paper by Weizenbaum, 1966.',
  xor: 'A single-layer perceptron draws one line. XOR needs more.',
  word2vec: 'The famous example. The positions are a drawing.',
  gan: 'The idea, with an illustrative cat.',
  resnet: 'The idea: the trouble with deep networks, and the shortcut.',
  diffusione: 'The idea, with an illustrative cat. 1000 steps as in the 2020 paper.',
  scaling: 'The shape of the result. The points are a drawing.',
  rischio: 'The four levels of the AI Act, each with one example.',
  deepmind: 'The DeepMind logo in pixels. Trademark of its owner.',
  openai: 'The OpenAI logo in pixels. Trademark of OpenAI.',
  anthropic: 'The Anthropic logo in pixels. Trademark of Anthropic.',
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
