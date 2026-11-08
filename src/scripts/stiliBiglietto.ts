// Le arti del biglietto di AI terms. Il biglietto è sempre lo stesso: carta chiara, stesso layout, stessi caratteri.
// Ogni biglietto pesca un'arte: l'arte riempie solo la colonna a sinistra davanti e il poster dietro, e dà i colori
// della carta (carta, inchiostro, accento, tagliando). Sopra si stampano a caso gli elementi in lamina olografica
// (pianoLamina). Le arti vive (Game of Life, koi, paesaggi, prato, passing minds) disegnano su tela.
// Niente testo delle note entra qui, tranne dove passa da esc().
import { type Livello } from './arteBiglietti';
import type { Pezzo, Tinta } from './laminaBiglietto';

export type Contesto = { sezione: number; livello: Livello; numero: string; termine: string; sera: boolean; r: () => number };
export type Stile = {
  id: string;
  davanti: (c: Contesto) => string;
  dietro: (c: Contesto) => string;
  variabili: (c: Contesto) => Record<string, string>;
  // Le tele si disegnano fotogramma per fotogramma (disegnaAscii)
  ascii?: boolean;
  // Se lo stile può uscire per questa sezione e questo livello; senza, esce sempre
  ammesso?: (sezione: number, livello: Livello) => boolean;
  // Il nome del termine sul retro scritto in caratteri, su tela, invece che in lettere
  titoloAscii?: boolean;
};

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
let uid = 0;
const scegli = <T>(a: readonly T[], r: () => number) => a[Math.floor(r() * a.length)]!;
export const casoDa = (seme: number) => () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };
// Una scelta fatta una volta per biglietto (per generatore): davanti, dietro e colori la condividono
const scelte = new WeakMap<() => number, Map<string, unknown>>();
const una = <T>(c: Contesto, chiave: string, f: () => T): T => {
  let m = scelte.get(c.r); if (!m) { m = new Map(); scelte.set(c.r, m); }
  if (!m.has(chiave)) m.set(chiave, f());
  return m.get(chiave) as T;
};
// Il seme delle tele: lo stesso davanti e dietro, così un biglietto riaperto ritrova i suoi pesci e i suoi cervi
const semeTela = (c: Contesto) => una(c, 'seme', () => 1 + Math.floor(c.r() * 2147483000));
// I colori della carta, presi dall'arte: la carta resta sempre chiara, come un biglietto vero
type Carta = { carta: string; inchiostro: string; accento: string; tagliando: string; fondo: string };
const carta = (k: Carta): Record<string, string> => ({ '--carta': k.carta, '--inchiostro': k.inchiostro, '--accento': k.accento, '--tagliando': k.tagliando, '--arte-fondo': k.fondo });

// ---------------- Lime Bloom: una fioritura di luce su una griglia nera, e dentro la luce una colonia del Game of Life
// che nasce, cresce e muore. Sul retro il nome del termine si scioglie in celle vive, poi si riscrive
// Un'unica palette azzurro neon, senza varianti gialle o rosa.
const FIORI = [['#bdfaff', '#14ddff', '#006b91']] as const;
const lime: Stile = {
  id: 'lime', ascii: true,
  davanti: c => `<div class="fiore"></div><canvas data-ascii="vita" data-seme="${semeTela(c)}"></canvas><i class="tick" style="left:8%;top:7%"></i><i class="tick" style="right:8%;bottom:7%"></i>`,
  dietro: c => `<div class="fiore"></div><canvas data-ascii="vita-parola" data-seme="${semeTela(c)}" data-testo="${esc(c.termine.toUpperCase().slice(0, 18))}"></canvas>`,
  variabili: c => { const f = una(c, 'fiore', () => scegli(FIORI, c.r)); return { ...carta({ carta: '#eef7f8', inchiostro: '#06303d', accento: '#0a9fc4', tagliando: '#dcedf0', fondo: '#061017' }), '--f1': f[0], '--f2': f[1], '--f3': f[2] }; },
};

// ---------------- Risograph: due inchiostri fluo sovrapposti, mezzatinta, il fuori registro che segue l'inclinazione.
// Davanti e dietro hanno due disegni diversi con gli stessi inchiostri, a coppie fisse: girando il biglietto si scopre il compagno
const INCHIOSTRI = [['#ff48b0', '#0078bf']] as const;
const FORME: ((a: string, b: string, id: string) => [string, string])[] = [
  // Un profilo con un sole dietro
  (a, b, id) => [`<circle cx="58" cy="52" r="40" fill="url(#ha${id})"/><path d="M0 110 Q30 70 60 92 T100 80 V110 Z" fill="${a}"/>`, `<path d="M38 96 C30 70 32 40 50 26 C64 16 80 22 82 36 C84 44 78 46 80 52 L86 60 L80 62 C82 70 76 74 70 72 C66 84 64 92 66 100 Z" fill="url(#hb${id})" stroke="${b}" stroke-width="1.6"/><circle cx="72" cy="42" r="2.4" fill="${b}"/>`],
  // Un pianeta con l'anello
  (a, b, id) => [`<circle cx="50" cy="55" r="30" fill="url(#ha${id})"/><circle cx="82" cy="20" r="6" fill="${a}"/>`, `<ellipse cx="50" cy="58" rx="46" ry="11" fill="none" stroke="${b}" stroke-width="4" transform="rotate(-14 50 58)"/><circle cx="40" cy="48" r="10" fill="url(#hb${id})"/>`],
  // Un occhio
  (a, b, id) => [`<path d="M6 55 Q50 10 94 55 Q50 100 6 55 Z" fill="url(#ha${id})"/>`, `<circle cx="50" cy="55" r="20" fill="url(#hb${id})"/><circle cx="50" cy="55" r="8" fill="${b}"/><path d="M6 55 Q50 10 94 55" fill="none" stroke="${b}" stroke-width="2"/>`],
  // Un razzo che sale in diagonale, con la scia di fumo, la fiammata e le stelle
  (a, b, id) => [`<circle cx="24" cy="60" r="15" fill="url(#ha${id})"/><circle cx="12" cy="70" r="10" fill="url(#ha${id})"/><circle cx="36" cy="66" r="8" fill="url(#ha${id})"/><path d="M38 48 L26 64 L44 54 Z" fill="${a}"/><circle cx="82" cy="12" r="2" fill="${a}"/><circle cx="70" cy="6" r="1.4" fill="${a}"/><circle cx="92" cy="30" r="1.6" fill="${a}"/><circle cx="16" cy="18" r="1.6" fill="${a}"/>`, `<g transform="rotate(40 58 36)"><path d="M58 8 C66 18 68 34 66 52 L50 52 C48 34 50 18 58 8 Z" fill="url(#hb${id})" stroke="${b}" stroke-width="1.6"/><circle cx="58" cy="28" r="5" fill="none" stroke="${b}" stroke-width="2"/><path d="M50 42 L42 56 L50 52 Z M66 42 L74 56 L66 52 Z" fill="${b}"/></g>`],
];
// Un'unica coppia: occhio davanti e profilo dietro.
const COPPIE = [[2, 0]] as const;
const riso = (grande: boolean) => (c: Contesto) => {
  const [a, b] = una(c, 'ink', () => scegli(INCHIOSTRI, c.r)), id = `r${++uid}`;
  // Il biglietto pesca una coppia: un disegno davanti, il suo compagno dietro
  const coppia = COPPIE[una(c, 'coppia', () => Math.floor(c.r() * COPPIE.length))]!;
  const [ra, rb] = FORME[grande ? coppia[1] : coppia[0]]!(a, b, id);
  const defs = `<defs><pattern id="ha${id}" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.1" fill="${a}"/></pattern><pattern id="hb${id}" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="1.3" cy="1.3" r=".8" fill="${b}"/></pattern></defs>`;
  const vb = grande ? '0 0 100 80' : '0 0 100 110';
  return `<div class="rosa"><svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${defs}${ra}</svg></div><div class="blu"><svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${defs}${rb}</svg></div>`;
};
const risograph: Stile = {
  id: 'riso',
  davanti: riso(false),
  dietro: riso(true),
  // I due inchiostri valgono per tutto il biglietto: li sceglie la variante, l'arte li riprende dallo stesso seme
  variabili: c => { const [a, b] = una(c, 'ink', () => scegli(INCHIOSTRI, c.r)); return { ...carta({ carta: '#f6f0e4', inchiostro: '#163a6b', accento: a, tagliando: '#f2e2e9', fondo: '#f6f0e4' }), '--ink1': a, '--ink2': b }; },
};

// ---------------- Koi Pond, tutto a pixel. Davanti la riva del mare vista dall'alto, con le onde che salgono sulla sabbia;
// dietro lo stagno: la riva d'erba con i sassi, le ninfee e le koi a sprite che nuotano senza piegarsi su se stesse
// Solo la versione minimal in bianco e nero, dove solo le koi hanno colore
const ACQUE = [
  { mono: true, acqua: ['#8f918e', '#a8aaa6', '#c2c3bf', '#d9dad6', '#f2f2ee'], ui: { fondo: '#f4f3ef', bg: '#f4f3ef', pannello: '#e7e6e1', bordo: '#1a1a1a', hover: '#d9d8d2', ombra: '#1a1a1a' }, testo: '#141414', accento: '#e2452c' },
] as const;
const koi: Stile = {
  id: 'koi', ascii: true,
  davanti: c => `<canvas data-ascii="onde" data-seme="${semeTela(c)}"></canvas>`,
  dietro: c => `<canvas data-ascii="koi-grande" data-seme="${semeTela(c)}"></canvas>`,
  variabili: c => {
    const q = una(c, 'acqua', () => scegli(ACQUE, c.r));
    return {
      ...carta({ carta: '#f4f3ef', inchiostro: '#141414', accento: q.accento, tagliando: '#e7e6e1', fondo: q.acqua[4] }),
      '--acqua-0': q.acqua[0], '--acqua-1': q.acqua[1], '--acqua-2': q.acqua[2], '--acqua-3': q.acqua[3], '--acqua-4': q.acqua[4], '--koi-mono': q.mono ? '1' : '0',
    };
  },
};

// ---------------- Meadow: un prato in pixel art, in due momenti dello stesso paesaggio: il giorno davanti, la notte dietro.
// Versione notte ispirata al prato animato di Astropelican Games; il giorno è una nostra interpretazione.
const prato: Stile = {
  id: 'prato', ascii: true,
  davanti: c => `<canvas data-ascii="prato" data-seme="${semeTela(c)}" data-scena="prato-giorno"></canvas>`,
  dietro: c => `<canvas data-ascii="prato" data-seme="${semeTela(c)}" data-scena="prato-notte"></canvas>`,
  variabili: () => carta({ carta: '#eef3e4', inchiostro: '#143e37', accento: '#b77a12', tagliando: '#e1ead2', fondo: '#0b1c16' }),
};

// ---------------- Paesaggi: un paesaggio dipinto e reso in caratteri colorati. Lo stesso paesaggio in due momenti:
// il più bello dei due sta dietro, nel poster grande. La montagna: tramonto davanti, aurora dietro. La lavanda:
// notte davanti, giorno dietro
const PAESAGGI = [
  { davanti: 'tramonto', dietro: 'aurora', carta: { carta: '#f6ede8', inchiostro: '#2a1a35', accento: '#d4573f', tagliando: '#efdfe2', fondo: '#0b0d12' } },
  { davanti: 'lavanda-notte', dietro: 'lavanda', carta: { carta: '#f3eff8', inchiostro: '#2a2240', accento: '#7a55c8', tagliando: '#e6def2', fondo: '#0b0d12' } },
] as const;
const paesaggi: Stile = {
  id: 'paesaggi', ascii: true,
  davanti: c => `<canvas data-ascii="scena" data-scena="${una(c, 'paesaggio', () => scegli(PAESAGGI, c.r)).davanti}"></canvas>`,
  dietro: c => `<canvas data-ascii="scena" data-scena="${una(c, 'paesaggio', () => scegli(PAESAGGI, c.r)).dietro}"></canvas>`,
  variabili: c => carta(una(c, 'paesaggio', () => scegli(PAESAGGI, c.r)).carta),
};

// Passing minds: una figura davanti, la folla sul retro, palette ciano su nero.
const passing: Stile = {
  id: 'passing', ascii: true,
  davanti: c => `<canvas data-ascii="passing" data-side="front" data-seme="${semeTela(c)}"></canvas>`,
  dietro: c => `<canvas data-ascii="passing" data-side="back" data-seme="${semeTela(c)}"></canvas>`,
  variabili: () => carta({ carta: '#edf4f1', inchiostro: '#0c1a17', accento: '#139c7e', tagliando: '#dce9e4', fondo: '#010304' }),
};

// ---------------- Sfera: un grappolo di sfere translucide, come un render di Houdini. Carta burro, sfere viola e blu
// che si sovrappongono, il nucleo ciano e lime. Davanti il grappolo nella colonna; dietro due grappoli, come uno studio.
const SFERA_CARTA = { fondo: '#f6efc8', tinta: '#eee3b6', pannello: '#fbf6dd', ink: '#171331', linea: 'rgb(23 19 49 / .18)' };
const SFERA_TONI: Record<string, [string, string, string]> = {
  viola: ['#a294ff', '#5c4cd4', '#2f2887'],
  blu: ['#79b0ff', '#3273d6', '#1b3f8f'],
  ciano: ['#9af6f0', '#37c6d2', '#146f88'],
  lime: ['#e0f9b0', '#82d66c', '#3f8f45'],
};
const sfGradients = (id: string) => `<radialGradient id="sf${id}viola" cx="34%" cy="28%" r="74%"><stop offset="0" stop-color="${SFERA_TONI.viola![0]}"/><stop offset=".58" stop-color="${SFERA_TONI.viola![1]}"/><stop offset="1" stop-color="${SFERA_TONI.viola![2]}"/></radialGradient><radialGradient id="sf${id}blu" cx="34%" cy="28%" r="74%"><stop offset="0" stop-color="${SFERA_TONI.blu![0]}"/><stop offset=".58" stop-color="${SFERA_TONI.blu![1]}"/><stop offset="1" stop-color="${SFERA_TONI.blu![2]}"/></radialGradient><radialGradient id="sf${id}ciano" cx="34%" cy="28%" r="74%"><stop offset="0" stop-color="${SFERA_TONI.ciano![0]}"/><stop offset=".58" stop-color="${SFERA_TONI.ciano![1]}"/><stop offset="1" stop-color="${SFERA_TONI.ciano![2]}"/></radialGradient><radialGradient id="sf${id}lime" cx="34%" cy="28%" r="74%"><stop offset="0" stop-color="${SFERA_TONI.lime![0]}"/><stop offset=".58" stop-color="${SFERA_TONI.lime![1]}"/><stop offset="1" stop-color="${SFERA_TONI.lime![2]}"/></radialGradient><radialGradient id="sf${id}alone"><stop offset="0" stop-color="#8c78ff" stop-opacity=".55"/><stop offset=".6" stop-color="#6c5be0" stop-opacity=".18"/><stop offset="1" stop-color="#6c5be0" stop-opacity="0"/></radialGradient><filter id="sf${id}soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.4"/></filter><filter id="sf${id}morbido" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".5"/></filter>`;
const grappolo = (id: string, cx: number, cy: number, raggio: number, n: number, rand: () => number) => {
  // Tre strati di profondità, come nel video: le sfere di fuori sono più grandi, scure e sfocate, quelle del nucleo
  // sono più piccole, accese e nitide. Ognuna respira e va per conto suo, con durata e sfasamento suoi
  const strati: string[][] = [[], [], []];
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, q = Math.sqrt(rand()), d = q * raggio, r = raggio * (0.17 + rand() * 0.1) * (1.08 - q * 0.16);
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    const tono = q < 0.38 && rand() < 0.8 ? (rand() < 0.5 ? 'lime' : 'ciano') : q < 0.72 ? (rand() < 0.74 ? 'ciano' : 'blu') : (rand() < 0.58 ? 'viola' : 'blu');
    const strato = q < 0.4 ? 2 : q < 0.74 ? 1 : 0;
    const ampiezza = 4.2 + strato * 1.4, ax = (rand() - 0.5) * ampiezza, ay = (rand() - 0.5) * ampiezza;
    const durata = 5.5 + rand() * 7, pausa = -rand() * durata, sc = 0.03 + rand() * 0.04;
    strati[strato]!.push(`<g class="sf-sfera" style="--ax:${ax.toFixed(2)}px;--ay:${ay.toFixed(2)}px;--dur:${durata.toFixed(1)}s;--delay:${pausa.toFixed(1)}s;--sc:${sc.toFixed(3)}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#sf${id}${tono})" opacity="${strato === 0 ? '.7' : strato === 1 ? '.82' : '.92'}"/><circle cx="${(x - r * 0.29).toFixed(1)}" cy="${(y - r * 0.33).toFixed(1)}" r="${(r * 0.24).toFixed(1)}" fill="#fff" opacity="${strato === 2 ? '.3' : '.2'}"/><circle cx="${(x + r * 0.34).toFixed(1)}" cy="${(y + r * 0.4).toFixed(1)}" r="${(r * 0.1).toFixed(1)}" fill="#fff" opacity=".1"/></g>`);
  }
  return `<circle cx="${cx}" cy="${cy}" r="${(raggio * 1.5).toFixed(1)}" fill="url(#sf${id}alone)" filter="url(#sf${id}soft)"/>${strati.map((s, k) => `<g class="sf-strato sf-strato-${k}"${k === 0 ? ` filter="url(#sf${id}morbido)"` : ''}>${s.join('')}</g>`).join('')}`;
};
const sfFronte = (id: string, rand: () => number) => `<svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${sfGradients(id)}</defs>${grappolo(id, 50, 57, 31, 28, rand)}</svg>`;
const sfRetro = (id: string, rand: () => number) => `<svg viewBox="0 0 220 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${sfGradients(id)}</defs>${grappolo(id, 61, 79, 33, 28, rand)}${grappolo(id, 158, 74, 38, 32, rand)}</svg>`;
const sfera: Stile = {
  id: 'sfera',
  davanti: c => {
    const id = `s${++uid}`, rand = casoDa(Math.floor(c.r() * 2147483000));
    return `<div class="sf"><div class="sf-livello">${sfFronte(id, rand)}</div><div class="sf-testa"><span>STUDY ${c.numero}</span><span>TRANSPARENT BLOOM</span></div><div class="sf-piede"><span>SPHERES / A–B</span><span>AI TERMS</span></div></div>`;
  },
  dietro: c => {
    const id = `s${++uid}`, rand = casoDa(Math.floor(c.r() * 2147483000));
    return `<div class="sf"><div class="sf-livello">${sfRetro(id, rand)}</div><div class="sf-testa"><span>TRANSPARENT BLOOM</span><span>STUDY ${c.numero}</span></div><div class="sf-piede"><span>63,000 SPHERES</span><span>SOFT BODY / RENDER 04</span></div></div>`;
  },
  variabili: () => ({ ...carta({ carta: '#f8f2d6', inchiostro: SFERA_CARTA.ink, accento: '#5c4cd4', tagliando: SFERA_CARTA.tinta, fondo: SFERA_CARTA.fondo }), '--sf-fondo': SFERA_CARTA.fondo, '--sf-tinta': SFERA_CARTA.tinta, '--sf-pannello': SFERA_CARTA.pannello, '--sf-ink': SFERA_CARTA.ink, '--sf-linea': SFERA_CARTA.linea }),
};

// ---------------- Holo: la carta rara, dopo una serie di risposte giuste. Davanti una rosetta incisa a inchiostro, con le
// linee guilloché e il sigillo in lamina; dietro il poster tutto in lamina, con il termine inciso. Non entra nel mazzo
const rosetta = () => {
  let linee = '';
  for (let k = 0; k < 18; k++) {
    let d = '';
    for (let i = 0; i <= 240; i++) {
      const a = (i / 240) * Math.PI * 2, rr = 26 + 9 * Math.sin(a * 7 + k * 0.35) + 4 * Math.sin(a * 13 - k * 0.2);
      d += `${i ? 'L' : 'M'}${(50 + Math.cos(a + k * 0.03) * rr).toFixed(1)} ${(55 + Math.sin(a + k * 0.03) * rr).toFixed(1)}`;
    }
    linee += `<path d="${d}Z"/>`;
  }
  return linee;
};
export const OLO: Stile = {
  id: 'olo',
  davanti: c => `<svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#1b2340" stroke-width=".22" opacity=".85">${rosetta()}</g><text x="50" y="104" text-anchor="middle" font-family="ui-monospace, monospace" font-size="3.2" letter-spacing=".9" fill="#1b2340">HOLO · ${esc(c.numero)}</text></svg>`,
  dietro: c => `<div class="olo-poster"><span>${esc(c.termine)}</span></div>`,
  variabili: () => carta({ carta: '#f3f1ec', inchiostro: '#1b2340', accento: '#5a4fd0', tagliando: '#e9e6f0', fondo: '#f3f1ec' }),
};

// Il mazzo: ogni arte esce una volta per giro
export const STILI: Stile[] = [sfera, lime, risograph, koi, prato, paesaggi, passing];

// ---------------- La lamina: quali elementi si stampano in lamina su questo biglietto, e in che tinta.
// La tinta dice il livello: argento facile, oro medio, arcobaleno difficile. Gli elementi escono a caso, al massimo due:
// la banda o il filo (mai insieme), il sigillo, le linee guilloché (rare)
export type PianoBiglietto = { davanti: Pezzo[]; dietro: Pezzo[]; tinta: Tinta };
const SET_LAMINA: [number, Pezzo[]][] = [[0.28, ['banda']], [0.18, ['filo']], [0.16, ['banda', 'sigillo']], [0.1, ['filo', 'sigillo']], [0.12, ['sigillo']], [0.08, ['guilloche']], [0.08, []]];
export function pianoLamina(st: Stile, c: Contesto): PianoBiglietto {
  if (st.id === 'olo') return { davanti: ['guilloche', 'sigillo'], dietro: ['poster'], tinta: 'iride' };
  const tinta: Tinta = c.livello === 'hard' ? 'iride' : c.livello === 'medium' ? 'oro' : 'argento';
  let k = una(c, 'lamina', () => c.r());
  for (const [peso, pezzi] of SET_LAMINA) { if (k < peso) return { davanti: pezzi, dietro: [], tinta }; k -= peso; }
  return { davanti: [], dietro: [], tinta };
}

// ---------------- Le tele vive. Il biglietto chiama disegnaAscii circa 30 volte al secondo; ogni tela decide quanto spesso
// ridisegnarsi (le scene di caratteri bastano 12 volte al secondo). Lo stato di ogni tela (cellule, pesci) sta qui
const ultimo = new WeakMap<HTMLCanvasElement, number>();
export function disegnaAscii(c: HTMLCanvasElement, ora: number, tx: number, ty: number) {
  const tipoT = c.dataset.ascii ?? '', lento = tipoT.startsWith('notte') || tipoT === 'scena' || tipoT === 'prato' || tipoT === 'passing' || tipoT === 'banner';
  if (lento && ora - (ultimo.get(c) ?? -1e9) < 80) return;
  const prima = ultimo.get(c) ?? ora; ultimo.set(c, ora);
  const dt = Math.min(0.1, Math.max(0, (ora - prima) / 1000));
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr);
  if (!W || !H) return;
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; stati.delete(c); maschere.delete(c); }
  if (tipoT.startsWith('vita')) return vita(c, ora, dt, dpr, tipoT === 'vita-parola');
  if (tipoT === 'onde') return ondeTela(c, dt, dpr, tx);
  if (tipoT.startsWith('koi')) return stagnoPixel(c, dt, dpr, tx, ty);
  if (tipoT === 'scena') return scenaTela(c, ora / 1000, tx);
  if (tipoT === 'prato') return pratoPixel(c, ora / 1000);
  if (tipoT === 'passing') return passingMinds(c, ora);
  if (tipoT === 'banner') return bannerTela(c, ora / 1000);
  return notteTela(c, ora, tx, ty);
}
const stati = new WeakMap<HTMLCanvasElement, unknown>();
const prendi = <T>(c: HTMLCanvasElement, f: () => T): T => { let s = stati.get(c) as T | undefined; if (!s) { s = f(); stati.set(c, s); } return s; };
const casoTela = (c: HTMLCanvasElement) => casoDa(Number(c.dataset.seme) || 7);
const varCss = (c: HTMLCanvasElement, n: string, d: string) => getComputedStyle(c).getPropertyValue(n).trim() || d;

// --- Game of Life. Le celle appena nate prendono il colore più chiaro della fioritura, quelle vecchie il più scuro;
// vicino al centro della luce brillano di più. Quando la vita si spegne, rinasce una macchia nella luce
type Vita = { cols: number; rows: number; lato: number; vivo: Uint8Array; dopo: Uint8Array; eta: Uint8Array; luce: Float32Array; passo: number; parola: number; r: () => number };
const R_PENTOMINO = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];
const ALIANTE = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
function vita(c: HTMLCanvasElement, ora: number, dt: number, dpr: number, parola: boolean) {
  const g = c.getContext('2d')!, W = c.width, H = c.height;
  const s = prendi<Vita>(c, () => {
    const lato = Math.round((parola ? 7 : 8) * dpr), cols = Math.ceil(W / lato), rows = Math.ceil(H / lato), n = cols * rows, r = casoTela(c);
    const v: Vita = { cols, rows, lato, vivo: new Uint8Array(n), dopo: new Uint8Array(n), eta: new Uint8Array(n), luce: new Float32Array(n), passo: 0, parola: 0, r };
    if (parola) scriviParola(c, v); else semina(v, 0.32, cols * 0.34, rows * 0.4, Math.max(cols, rows) * 0.42);
    return v;
  });
  // Circa 7 generazioni al secondo; sul retro la parola si riscrive ogni 22 secondi
  s.passo += dt;
  if (s.passo > 0.14) { s.passo = 0; generazione(s, parola); }
  if (parola && (s.parola += dt) > 22) { s.parola = 0; scriviParola(c, s); }
  const f1 = varCss(c, '--f1', '#bdfaff'), f2 = varCss(c, '--f2', '#14ddff'), f3 = varCss(c, '--f3', '#006b91');
  g.clearRect(0, 0, W, H);
  const k = Math.min(1, dt * 9), cx = s.cols * 0.34, cy = s.rows * 0.42, raggio = Math.max(s.cols, s.rows) * 0.6;
  for (let i = 0; i < s.luce.length; i++) {
    const l = (s.luce[i]! += (s.vivo[i]! - s.luce[i]!) * k);
    if (l < 0.05) continue;
    const x = i % s.cols, y = (i / s.cols) | 0, e = s.eta[i]!;
    const vicino = parola ? 1 : Math.max(0.35, 1 - Math.hypot(x - cx, y - cy) / raggio);
    g.globalAlpha = Math.min(1, l * (0.45 + 0.55 * vicino));
    g.fillStyle = e < 2 ? f1 : e < 10 ? f2 : f3;
    g.fillRect(x * s.lato + dpr * 0.5, y * s.lato + dpr * 0.5, s.lato - dpr, s.lato - dpr);
  }
  g.globalAlpha = 1;
  void ora;
}
function semina(s: Vita, densita: number, cx: number, cy: number, r: number) {
  for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) {
    const d = Math.hypot(x - cx, y - cy) / r;
    if (d < 1 && s.r() < densita * (1 - d * 0.6)) { const i = y * s.cols + x; s.vivo[i] = 1; s.eta[i] = 0; }
  }
}
function generazione(s: Vita, parola: boolean) {
  const C = s.cols, R = s.rows; let vive = 0;
  for (let y = 0; y < R; y++) {
    const su = ((y - 1 + R) % R) * C, qui = y * C, giu = ((y + 1) % R) * C;
    for (let x = 0; x < C; x++) {
      const sx = (x - 1 + C) % C, dx = (x + 1) % C, i = qui + x;
      const n = s.vivo[su + sx]! + s.vivo[su + x]! + s.vivo[su + dx]! + s.vivo[qui + sx]! + s.vivo[qui + dx]! + s.vivo[giu + sx]! + s.vivo[giu + x]! + s.vivo[giu + dx]!;
      if (s.vivo[i]) { s.dopo[i] = n === 2 || n === 3 ? 1 : 0; if (s.dopo[i] && s.eta[i]! < 255) s.eta[i]!++; }
      else { s.dopo[i] = n === 3 ? 1 : 0; if (s.dopo[i]) s.eta[i] = 0; }
      vive += s.dopo[i]!;
    }
  }
  [s.vivo, s.dopo] = [s.dopo, s.vivo];
  // Quasi spenta: davanti rinasce un R-pentomino nella luce, dietro parte un aliante
  if (vive < C * R * 0.015) {
    const forma = parola ? ALIANTE : R_PENTOMINO, x0 = Math.floor(C * (0.2 + s.r() * 0.3)), y0 = Math.floor(R * (0.25 + s.r() * 0.3));
    for (const [dx, dy] of forma) { const i = (y0 + dy!) * C + x0 + dx!; s.vivo[i] = 1; s.eta[i] = 0; }
    if (!parola) semina(s, 0.2, C * 0.34, R * 0.42, Math.max(C, R) * 0.2);
  }
}
// La parola del termine diventa celle vive: si scrive in nero su una tela piccola quanto la griglia, e ogni cella piena nasce
function scriviParola(c: HTMLCanvasElement, s: Vita) {
  const m = document.createElement('canvas'); m.width = s.cols; m.height = s.rows;
  const g = m.getContext('2d')!, testo = c.dataset.testo ?? 'AI', parole = testo.split(' ');
  // Una riga o due, la più larga possibile
  const righe = parole.length > 1 && testo.length > 9 ? [parole.slice(0, Math.ceil(parole.length / 2)).join(' '), parole.slice(Math.ceil(parole.length / 2)).join(' ')] : [testo];
  const alto = Math.min(s.rows * 0.32, (s.rows * 0.7) / righe.length);
  g.font = `900 ${alto}px "Arial Black", system-ui, sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'center';
  righe.forEach((t, k) => { const w = g.measureText(t).width || 1, sx = Math.min(1, (s.cols * 0.9) / w); g.setTransform(sx, 0, 0, 1, s.cols / 2, s.rows * (0.5 + (k - (righe.length - 1) / 2) * 0.36)); g.fillText(t, 0, 0); });
  const d = g.getImageData(0, 0, s.cols, s.rows).data;
  for (let i = 0; i < s.cols * s.rows; i++) if (d[i * 4 + 3]! > 120) { s.vivo[i] = 1; s.eta[i] = 0; }
}

// --- Koi Pond a pixel. Si disegna su un'immagine piccola (un pixel dell'arte = 3 pixel dello schermo) e la si ingrandisce
// senza sfumare. I colori passano da un tono all'altro con la retinatura a griglia (Bayer), come nella pixel art
const PIX = 3;
type Rgb = [number, number, number];
const daHex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
type Immagine = { tela: HTMLCanvasElement; g: CanvasRenderingContext2D; img: ImageData; w: number; h: number };
const immagini = new WeakMap<HTMLCanvasElement, Immagine>();
function immagine(c: HTMLCanvasElement, dpr: number): Immagine {
  const w = Math.ceil(c.width / (PIX * dpr)), h = Math.ceil(c.height / (PIX * dpr));
  let x = immagini.get(c);
  if (!x || x.w !== w || x.h !== h) {
    const tela = document.createElement('canvas'); tela.width = w; tela.height = h;
    const g = tela.getContext('2d')!; x = { tela, g, img: g.createImageData(w, h), w, h }; immagini.set(c, x);
  }
  return x;
}
const metti = (im: Immagine, x: number, y: number, col: Rgb) => {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= im.w || y >= im.h) return;
  const i = (y * im.w + x) * 4, d = im.img.data; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
};
// Un valore da 0 a 1 diventa uno dei toni della tavolozza, con la retinatura fra due toni vicini
const tono = (tav: Rgb[], v: number, x: number, y: number) => {
  const f = Math.max(0, Math.min(tav.length - 1, v * (tav.length - 1))), k = Math.floor(f);
  return tav[Math.min(tav.length - 1, f - k > BAYER4[(y & 3) * 4 + (x & 3)]! ? k + 1 : k)]!;
};
const mostra = (c: HTMLCanvasElement, im: Immagine) => {
  im.g.putImageData(im.img, 0, 0);
  const g = c.getContext('2d')!; g.imageSmoothingEnabled = false;
  g.drawImage(im.tela, 0, 0, im.w * (c.width / im.w), im.h * (c.height / im.h));
};
const acque = (c: HTMLCanvasElement) => [0, 1, 2, 3, 4].map(k => daHex(varCss(c, `--acqua-${k}`, ['#0b3b45', '#0f5560', '#167080', '#2a8f98', '#6fc3c1'][k]!)));
// Le tavolozze delle due varianti: a colori, e in scala di grigi (le koi restano a colori)
const TAVOLE = {
  colore: { schiuma: daHex('#f4f1e6'), sabbia: ['#c9ad78', '#d8bf8a', '#e6d2a2', '#f0e2bb'].map(daHex), bagnata: ['#9c855c', '#ae966a'].map(daHex), erba: ['#2f5a2a', '#3f6f30', '#558a3a', '#79a84a'].map(daHex), sasso: ['#5e6b6b', '#7d8a8a', '#a2acab'].map(daHex), foglia: ['#2f6a35', '#3f8040', '#5c9c4c'].map(daHex), petali: ['#e0779f', '#f2a7c3', '#ffd86a'].map(daHex) },
  mono: { schiuma: daHex('#ffffff'), sabbia: ['#dcdcd7', '#e6e6e1', '#efefea', '#f7f7f3'].map(daHex), bagnata: ['#bdbdb8', '#cacac5'].map(daHex), erba: ['#4a4c49', '#5f615d', '#777975', '#93958f'].map(daHex), sasso: ['#2c2d2c', '#454745', '#6a6c69'].map(daHex), foglia: ['#3a3c3a', '#525451', '#6e706c'].map(daHex), petali: ['#ffffff', '#e2e2de', '#ffffff'].map(daHex) },
};
const tavola = (c: HTMLCanvasElement) => (varCss(c, '--koi-mono', '0') === '1' ? TAVOLE.mono : TAVOLE.colore);
const liscia = (u: number) => u * u * (3 - 2 * u);
const rumore = (x: number, y: number) => {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = liscia(x - x0), fy = liscia(y - y0);
  const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const frattale = (x: number, y: number) => rumore(x, y) * 0.55 + rumore(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + rumore(x * 4.3 + 1, y * 4.3 + 9) * 0.15;

// Davanti: la riva vista dall'alto. Sabbia in alto, il mare in basso; le onde salgono di sbieco e si ritirano,
// lasciano la sabbia bagnata e un filo di schiuma; sull'acqua corrono le creste e qualche luccichio
type Onde = { bagnato: Float32Array; luccica: Float32Array; tempo: number; r: () => number };
function ondeTela(c: HTMLCanvasElement, dt: number, dpr: number, tx: number) {
  const im = immagine(c, dpr), { w, h } = im, tav = acque(c), P = tavola(c);
  const s = prendi<Onde>(c, () => ({ bagnato: new Float32Array(w * h), luccica: new Float32Array(w * h), tempo: casoTela(c)() * 20, r: casoTela(c) }));
  if (s.bagnato.length !== w * h) { s.bagnato = new Float32Array(w * h); s.luccica = new Float32Array(w * h); }
  s.tempo += dt;
  const t = s.tempo, PERIODO = 7, risalita = (f: number) => (f < 0.3 ? 1 - (1 - f / 0.3) ** 3 : 0.5 + 0.5 * Math.cos(((f - 0.3) / 0.7) * Math.PI));
  for (let x = 0; x < w; x++) {
    // Ogni colonna è un tratto di riva, un po' in ritardo sul vicino: l'onda arriva di sbieco. La riva è frastagliata
    // dal rumore, e ogni onda arriva un po' più su o più giù della precedente
    const f = (((t / PERIODO - x * 0.012 - (frattale(x * 0.05, 1) - 0.5) * 0.35) % 1) + 1) % 1, onda = Math.floor(t / PERIODO - x * 0.012);
    const bordo = h * 0.4 + risalita(f) * h * (0.14 + 0.1 * rumore(x * 0.04, onda * 3.7)) + (frattale(x * 0.11, t * 0.05) - 0.5) * 9 + (rumore(x * 0.6, 5) - 0.5) * 2;
    for (let y = 0; y < h; y++) {
      const i = y * w + x, u = h - y;
      if (u < bordo) {
        // Il fondo e le creste a chiazze: il rumore scorre verso la riva, le creste sono le sue parti più alte
        const profondo = Math.min(1, (bordo - u) / 22), chiazza = frattale(x * 0.09 + tx, u * 0.13 - t * 0.35), cresta = Math.max(0, chiazza - 0.62) * 3.2;
        let col = tono(tav, 0.82 - profondo * 0.7 + cresta * 0.45 + (frattale(x * 0.04, u * 0.05 + t * 0.03) - 0.5) * 0.25, x, y);
        const schiuma = bordo - u, bordoSchiuma = 1.2 + rumore(x * 0.3, t * 0.8) * 2.4;
        if (schiuma < bordoSchiuma || (schiuma < bordoSchiuma + 2.5 && rumore(x * 0.5, u * 0.5 + t) > (f < 0.35 ? 0.55 : 0.8))) col = P.schiuma;
        s.bagnato[i] = 1;
        if (dt > 0 && s.r() < 0.0008) s.luccica[i] = 1;
        if (s.luccica[i]! > 0.4) col = P.schiuma;
        s.luccica[i] = Math.max(0, s.luccica[i]! - dt * 1.4);
        metti(im, x, y, col);
      } else {
        s.bagnato[i] = Math.max(0, s.bagnato[i]! - dt * (0.12 + 0.12 * hash(x, 77)));
        const b = s.bagnato[i]!, grana = hash(x, y) * 0.35 + frattale(x * 0.12, y * 0.12) * 0.45;
        metti(im, x, y, b > 0.15 ? tono(P.bagnata, grana, x, y) : tono(P.sabbia, grana + (y / h) * 0.2, x, y));
      }
    }
  }
  mostra(c, im);
}

// Dietro: lo stagno. In alto la riva d'erba con i sassi e qualche fiore; l'acqua è più chiara vicino alla riva, ha strisce
// di luce che si muovono, ninfee con i fiori e koi a sprite. Le koi girano piano e il corpo si piega poco: niente pesci arrotolati
type KoiPx = { x: number; y: number; a: number; voluta: number; vel: number; spina: { x: number; y: number }[]; misura: number; colore: (t: number, s: number) => Rgb; fase: number };
type StagnoPx = { pesci: KoiPx[]; ninfee: { x: number; y: number; r: number; fiore: boolean }[]; sassi: { x: number; y: number; r: number }[]; cerchi: { x: number; y: number; r: number; vita: number }[]; tempo: number; r: () => number; riva: (x: number) => number };
const KW = daHex('#f6f2ea'), KR = daHex('#e2452c'), KK = daHex('#1f1f24'), KG = daHex('#f2b63c'), KG2 = daHex('#ffe08a'), KB = daHex('#b07a40'), KA = daHex('#7f9bb3'), KO = daHex('#e8743a');
// Le varietà: il colore di ogni punto del pesce, dato t (0 testa, 1 coda) e il lato s (-1 sinistra, 1 destra)
const VARIETA_PX: ((r: () => number) => (t: number, s: number) => Rgb)[] = [
  r => { const a = 0.05 + r() * 0.1, b = a + 0.25, c2 = 0.5 + r() * 0.1; return (t, s) => ((t > a && t < b && s > -0.4) || (t > c2 && t < c2 + 0.22) ? KR : KW); },
  () => (t, s) => (t < 0.18 && Math.abs(s) < 0.7 ? KR : KW),
  r => { const a = 0.15 + r() * 0.1; return (t, s) => (t > a && t < a + 0.3 ? KR : t > 0.6 && t < 0.72 && s > 0 ? KW : KK); },
  () => (_, s) => (s > 0.35 ? KG2 : KG),
  () => () => KB,
  () => (_, s) => (Math.abs(s) > 0.6 ? KO : KA),
  r => { const a = 0.08 + r() * 0.1; return (t, s) => (t > a && t < a + 0.3 ? KR : t > 0.5 && t < 0.8 && s > 0.2 && Math.round(t * 20 + s * 3) % 3 === 0 ? KK : KW); },
];
function stagnoPixel(c: HTMLCanvasElement, dt: number, dpr: number, tx: number, ty: number) {
  const im = immagine(c, dpr), { w, h } = im, tav = acque(c), P = tavola(c), FOGLIA = P.foglia, PETALI = P.petali;
  const s = prendi<StagnoPx>(c, () => {
    // Niente riva: l'acqua riempie tutto il retro, così le koi non passano mai sopra l'erba. Restano dentro i bordi del biglietto
    const r = casoTela(c), riva = () => -6;
    const pesci: KoiPx[] = Array.from({ length: 6 }, (_, k) => {
      const x = w * (0.15 + r() * 0.7), y = h * (0.35 + r() * 0.55), a = r() * Math.PI * 2, misura = 0.85 + r() * 0.5;
      return { x, y, a, voluta: a, vel: 0, misura, spina: Array.from({ length: 7 }, (_, i) => ({ x: x - Math.cos(a) * 1.7 * misura * i, y: y - Math.sin(a) * 1.7 * misura * i })), colore: VARIETA_PX[Math.floor(r() * VARIETA_PX.length)]!(r), fase: k * 1.3 + r() * 4 };
    });
    const ninfee = Array.from({ length: 4 }, (_, k) => ({ x: w * [0.12, 0.83, 0.62, 0.3][k]! + (r() - 0.5) * 8, y: h * [0.38, 0.33, 0.78, 0.86][k]! + (r() - 0.5) * 6, r: 6 + r() * 3, fiore: k % 2 === 0 }));
    return { pesci, ninfee, sassi: [], cerchi: [], tempo: r() * 30, r, riva };
  });
  s.tempo += dt;
  const t = s.tempo;
  // L'acqua, pixel per pixel: un fondo a macchie larghe e la luce a chiazze irregolari, che scorrono piano e seguono l'inclinazione
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const luce = frattale(x * 0.07 + t * 0.04 + tx, y * 0.09 - t * 0.03 + ty), fondo = frattale(x * 0.03 + 11, y * 0.03 + 5);
    const v = 0.22 + (fondo - 0.5) * 0.4 + (luce > 0.68 ? 0.4 : luce > 0.6 ? 0.18 : 0);
    metti(im, x, y, tono(tav, v, x, y));
  }
  // Le koi: la testa va verso una direzione voluta che cambia ogni tanto, gira al massimo di poco al secondo,
  // e ogni giuntura della spina si piega al massimo di 0.2 radianti rispetto alla precedente
  for (const p of s.pesci) {
    if (s.r() < dt * 0.25) p.voluta = p.a + (s.r() - 0.5) * 2.2;
    const m = 8, cima = s.riva(p.x) + 6;
    if (p.x < m) p.voluta = 0; else if (p.x > w - m) p.voluta = Math.PI; else if (p.y < cima) p.voluta = Math.PI / 2; else if (p.y > h - m) p.voluta = -Math.PI / 2;
    let d = p.voluta - p.a; d = Math.atan2(Math.sin(d), Math.cos(d));
    p.a += Math.max(-0.7 * dt, Math.min(0.7 * dt, d));
    p.vel += ((5 + 3 * Math.sin(t * 0.3 + p.fase)) * p.misura - p.vel) * Math.min(1, dt);
    p.x += Math.cos(p.a) * p.vel * dt; p.y += Math.sin(p.a) * p.vel * dt;
    p.spina[0] = { x: p.x, y: p.y };
    const L = 1.7 * p.misura;
    let dir = p.a;
    for (let i = 1; i < p.spina.length; i++) {
      const a = p.spina[i - 1]!, b = p.spina[i]!;
      let ang = Math.atan2(a.y - b.y, a.x - b.x), dd = ang - dir; dd = Math.atan2(Math.sin(dd), Math.cos(dd));
      ang = dir + Math.max(-0.2, Math.min(0.2, dd)); dir = ang;
      p.spina[i] = { x: a.x - Math.cos(ang) * L, y: a.y - Math.sin(ang) * L };
    }
    if (s.r() < dt * 0.05) s.cerchi.push({ x: p.x, y: p.y, r: 0, vita: 1 });
  }
  const ombra = tav[0]!, raggi = [1.5, 1.9, 2, 1.8, 1.4, 0.95, 0.6];
  const corpo = (p: KoiPx, ox: number, oy: number, col: ((t: number, sd: number) => Rgb) | null, extra: number) => {
    const n = p.spina.length;
    for (let i = 0; i < n; i++) {
      const q = p.spina[i]!, rr = raggi[i]! * p.misura + extra, nx = -Math.sin(i ? Math.atan2(p.spina[i - 1]!.y - q.y, p.spina[i - 1]!.x - q.x) : p.a), ny = Math.cos(i ? Math.atan2(p.spina[i - 1]!.y - q.y, p.spina[i - 1]!.x - q.x) : p.a);
      for (let dy = -Math.ceil(rr); dy <= Math.ceil(rr); dy++) for (let dx = -Math.ceil(rr); dx <= Math.ceil(rr); dx++) {
        if (dx * dx + dy * dy > rr * rr + 0.3) continue;
        metti(im, q.x + dx + ox, q.y + dy + oy, col ? col(i / (n - 1), (dx * nx + dy * ny) / Math.max(0.5, rr)) : ombra);
      }
    }
  };
  for (const p of s.pesci) corpo(p, 1, 2, null, 0.3);
  for (const p of s.pesci) {
    // Pinne pettorali e coda: due pixel che battono piano
    const batte = Math.sin(t * 6 + p.fase) > 0 ? 1 : 0, q1 = p.spina[1]!, coda = p.spina[p.spina.length - 1]!, nx = -Math.sin(p.a), ny = Math.cos(p.a);
    const pinna = p.colore(0.2, 1)[0] > 200 && p.colore(0.2, 1)[1] > 200 ? daHex('#dfe8e6') : p.colore(0.2, 1);
    for (const sd of [-1, 1]) metti(im, q1.x + nx * sd * (2.6 + batte * 0.6) * p.misura, q1.y + ny * sd * (2.6 + batte * 0.6) * p.misura, pinna);
    const pc = p.spina[p.spina.length - 2]!, ac = Math.atan2(coda.y - pc.y, coda.x - pc.x);
    for (const sd of [-1, 1]) metti(im, coda.x + Math.cos(ac + sd * (0.6 + batte * 0.3)) * 1.6 * p.misura, coda.y + Math.sin(ac + sd * (0.6 + batte * 0.3)) * 1.6 * p.misura, pinna);
    corpo(p, 0, 0, p.colore, 0);
  }
  // Le ninfee: una foglia tonda col taglio, l'orlo più chiaro; alcune hanno il fiore rosa
  for (const n of s.ninfee) {
    const y0 = n.y + Math.sin(t * 0.6 + n.x) * 0.5;
    for (let dy = -n.r; dy <= n.r; dy++) for (let dx = -n.r; dx <= n.r; dx++) {
      const dd = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      if (dd > n.r || (ang > -0.25 && ang < 0.35 && dd > 1)) continue;
      metti(im, n.x + dx, y0 + dy, FOGLIA[dd > n.r - 1.2 ? 2 : (dx + dy) % 3 === 0 ? 1 : 0]!);
    }
    if (n.fiore) { for (const [dx, dy, k] of [[0, -1, 0], [-1, 0, 0], [1, 0, 0], [0, 1, 0], [-1, -1, 1], [1, -1, 1], [0, 0, 2]] as const) metti(im, n.x - 1 + dx, y0 - 1 + dy, PETALI[k]!); }
  }
  // Cerchi nell'acqua: un anello di pixel che si allarga e sbiadisce
  for (const q of s.cerchi) {
    q.r += dt * 6; q.vita -= dt * 0.6;
    if (q.vita > 0.3) for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; metti(im, q.x + Math.cos(a) * q.r, q.y + Math.sin(a) * q.r * 0.8, tav[4]!); }
  }
  s.cerchi = s.cerchi.filter(q => q.vita > 0);
  mostra(c, im);
}

// Un prato in pixel art: le radici restano ferme, le punte oscillano con il vento.
// Nessun avanzamento della visuale o frame del riferimento incorporato.
type FiorePrato = { x: number; z: number; h: number; fase: number; colore: number; grande: boolean };
type StatoPrato = { fiori: FiorePrato[]; punti: { x: number; y: number; fase: number }[] };
function pratoPixel(c: HTMLCanvasElement, tempo: number) {
  const notte = c.dataset.scena === 'prato-notte';
  const g = c.getContext('2d'); if (!g) return;
  const w = c.width, h = c.height;
  if (!w || !h) return;
  const s = prendi<StatoPrato>(c, () => {
    const r = casoTela(c), fiori: FiorePrato[] = [];
    for (let i = 0; i < 210; i++) fiori.push({x:r(), z:Math.pow(r(), 1.7), h:.88 + r()*.24, fase:r()*6.28, colore:r(), grande:r()>.83});
    fiori.sort((a,b) => a.z-b.z);
    return { fiori, punti:Array.from({length:70},()=>({x:r(),y:r(),fase:r()*6.28})) };
  });
  // Una griglia logica bassa, poi ingrandita senza interpolazione: i pixel restano netti.
  const scala = Math.max(1, Math.round(Math.min(w,h)/112));
  const W = Math.max(1, Math.round(w/scala)), H = Math.max(1, Math.round(h/scala));
  const im = prendiPrato(c, W, H), p = im.ctx;
  p.imageSmoothingEnabled = false;
  const ciel = notte ? '#07130f' : '#a7daed', orizz = notte ? '#1c4931' : '#7fbac7', fondo = notte ? '#0a2017' : '#335b46';
  p.fillStyle = ciel; p.fillRect(0,0,W,H);
  const horizon = H*.31;
  p.fillStyle = orizz; p.fillRect(0,Math.floor(horizon-5),W,8);
  for (let i=0;i<55;i++) {
    const x=Math.floor(hash(i,17)*W), y=Math.floor(horizon-9+hash(i,21)*10);
    p.fillStyle = notte ? (i%5===0 ? '#d6ff93' : '#4d8d63') : (i%5===0 ? '#f4f2d7' : '#6da5ac');
    p.fillRect(x,y,1,1);
  }
  p.fillStyle=fondo; p.fillRect(0,Math.floor(horizon+3),W,H-horizon);
  // Fili d’erba e foglie dietro ai fiori.
  for(let i=0;i<400;i++){
    const x=hash(i,11)*W, z=hash(i,29), y=horizon+z*(H-horizon), len=1+z*4;
    p.fillStyle = notte ? (i%3 ? '#163e29' : '#2b653e') : (i%3 ? '#4b7757' : '#709468');
    p.fillRect(Math.floor(x), Math.floor(y-len), 1, Math.ceil(len));
  }
  // Distribuzione stabile in profondità, con gambi lunghi e fiori a distanze diverse.
  for(const f of s.fiori){
    const z=f.z, x=f.x*W, y=horizon+z*(H-horizon+8);
    const height=(2+z*H*.32)*f.h;
    // Raffiche ampie attraversano il prato; un'oscillazione più lieve varia da fiore a fiore.
    // La base resta ancorata e la punta si piega proporzionalmente alla lunghezza del gambo.
    const vento=Math.sin(tempo*.65-f.x*4.0-z*1.6)*.72 + Math.sin(tempo*.27-f.x*2.2)*.22;
    const tremolio=Math.sin(tempo*1.15+f.fase)*.10;
    const piega=(vento+tremolio)*Math.min(7,height*.21);
    const topX=x+piega, topY=y-height+Math.abs(piega)*.055;
    p.strokeStyle=notte ? (f.colore>.7?'#69aa45':'#3a8551') : (f.colore>.7?'#6c7752':'#547052');
    p.lineWidth=1; p.beginPath();p.moveTo(Math.round(x)+.5,Math.round(y));
    p.quadraticCurveTo(Math.round(x+piega*.15)+.5,Math.round(y-height*.52),Math.round(topX)+.5,Math.round(topY));p.stroke();
    if(z>.25){p.fillStyle=notte?'#65b867':'#72996d'; p.fillRect(Math.round(x-1),Math.round(y-height*.36),2,1);}
    const size = z>.68 ? (f.grande?3:2) : z>.34?2:1, px=Math.round(topX), py=Math.round(topY);
    const petals=notte?(f.colore>.80?'#f4ff68':f.colore>.45?'#a8ff74':'#65e7a0'):(f.colore>.86?'#f9d678':f.colore>.5?'#fff9ec':'#fac8d0');
    p.fillStyle=petals;
    if(size===1){p.fillRect(px,py,1,1);} else {
      const d=size===3?2:1;
      p.fillRect(px-d,py,d,1);p.fillRect(px+1,py,d,1);p.fillRect(px,py-d,1,d);p.fillRect(px,py+1,1,d);
      if(size===3){p.fillRect(px-1,py-1,3,3);}
      p.fillStyle=notte?'#faffc1':'#eab75e';p.fillRect(px,py,1,1);
    }
  }
  if(notte) for(const [i,o] of s.punti.entries()){
    if(i%3===0)continue;
    const x=Math.floor(o.x*W), y=Math.floor(horizon+o.y*(H-horizon));
    p.fillStyle=i%2?'#adff81':'#edff74';p.fillRect(x,y,1,1);
  }
  g.clearRect(0,0,w,h); g.imageSmoothingEnabled=false;g.drawImage(im.canvas,0,0,w,h);
}
const superficiPrato = new WeakMap<HTMLCanvasElement, {canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D}>();
function prendiPrato(c:HTMLCanvasElement,w:number,h:number) {
  let im=superficiPrato.get(c);
  if(!im){ const canvas=document.createElement('canvas');im={canvas,ctx:canvas.getContext('2d')!};superficiPrato.set(c,im); }
  if(im.canvas.width!==w || im.canvas.height!==h){im.canvas.width=w;im.canvas.height=h;}
  return im;
}

// ---------------- Passing minds, motore: robot a pixel. Davanti uno solo, dietro la folla.
// Ispirato alla clip "crowd control" di itsgalo: corpi a fil di ferro con il busto a rettangolo,
// passo rigido a quattro pose, ombre a trattini sul terreno. Disegnato da zero, nessun frame incorporato.
type Robot = { x: number; z: number; vx: number; vz: number; dir: number; meta: number; passo: number; vel: number; scala: number; timer: number; fermo: boolean; sguardo: number; timerSguardo: number; capo: boolean };
// Ogni faccia ha il suo orologio: su desktop fronte e retro si disegnano nello stesso fotogramma
type Folla = { robot: Robot[]; trattini: { x: number; z: number; l: number }[]; ultimo: { fronte: number; retro: number }; tick: { fronte: number; retro: number }; r: () => number };
const folle = new Map<string, Folla>();
const strati = new WeakMap<HTMLCanvasElement, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }>();
const OTTAVO = Math.PI / 4;
// Il robot ragiona in otto direzioni: le svolte sono a scatti di 45 gradi
const aOttavi = (a: number) => Math.round(a / OTTAVO) * OTTAVO;
function follaDi(c: HTMLCanvasElement): Folla {
  const chiave = c.dataset.seme ?? '1';
  let f = folle.get(chiave);
  if (f) return f;
  const r = casoDa(Number(chiave) || 1);
  const robot: Robot[] = [];
  const nuovo = (capo: boolean, x: number, z: number): Robot => {
    const a = aOttavi(r() * Math.PI * 2);
    return { x, z, vx: 0, vz: 0, dir: a, meta: a, passo: Math.floor(r() * 4), vel: capo ? .085 : .045 + r() * .035, scala: capo ? 1 : .86 + r() * .28, timer: r() * 2, fermo: r() < .3, sguardo: 0, timerSguardo: 0, capo };
  };
  robot.push(nuovo(true, .5, .55));
  // La folla nasce come una massa centrale che riempie già l'inquadratura del retro
  for (let i = 0; i < 72; i++) { const rad = Math.sqrt(r()), ang = r() * Math.PI * 2; robot.push(nuovo(false, .5 + Math.cos(ang) * rad * .36, .5 + Math.sin(ang) * rad * .33)); }
  const trattini = Array.from({ length: 150 }, () => ({ x: .5 + (r() - .5) * .95, z: r(), l: .015 + r() * .05 }));
  f = { robot, trattini, ultimo: { fronte: 0, retro: 0 }, tick: { fronte: -1, retro: -1 }, r };
  folle.set(chiave, f);
  if (folle.size > 32) { const prima = folle.keys().next().value; if (prima !== undefined) folle.delete(prima); }
  return f;
}
function muoviFolla(f: Folla, dt: number, capo: boolean) {
  const gruppo = f.robot.filter(p => p.capo === capo), r = f.r;
  const zMin = capo ? .25 : .04, zMax = capo ? .85 : .96;
  for (const p of gruppo) {
    p.timer -= dt;
    if (p.timer <= 0) {
      // Pausa o nuova direzione: i robot si fermano, si guardano intorno, ripartono di scatto
      if (!p.fermo && r() < .32) { p.fermo = true; p.timer = .7 + r() * 1.4; }
      else { p.fermo = false; p.meta = aOttavi(p.meta + (r() < .5 ? -1 : 1) * OTTAVO * (1 + Math.floor(r() * 2))); p.timer = 1.2 + r() * 3; }
    }
    if (p.fermo) { p.timerSguardo -= dt; if (p.timerSguardo <= 0) { p.sguardo = (Math.floor(r() * 5) - 2) * OTTAVO; p.timerSguardo = .3 + r() * .45; } }
    else p.sguardo = 0;
    let tx = Math.cos(p.meta), tz = Math.sin(p.meta);
    for (const q of gruppo) {
      if (q === p) continue;
      const dx = p.x - q.x, dz = p.z - q.z, d2 = dx * dx + dz * dz;
      if (d2 < .0028 && d2 > 1e-7) { const d = Math.sqrt(d2), k = (.053 - d) / .053; tx += dx / d * k * 1.6; tz += dz / d * k * 1.6; }
    }
    // Un richiamo morbido verso il centro tiene la massa unita; ai bordi il robot gira verso il centro
    const fuori = !capo && Math.hypot((p.x - .5) / .42, (p.z - .5) / .4) > 1;
    if (fuori || p.x < .06 || p.x > .94 || p.z < zMin || p.z > zMax) { p.meta = aOttavi(Math.atan2(.5 - p.z, .5 - p.x)); p.fermo = false; tx = Math.cos(p.meta); tz = Math.sin(p.meta); }
    const v = p.fermo ? 0 : p.vel, n = Math.hypot(tx, tz) || 1, k = Math.min(1, dt * 8);
    p.vx += (tx / n * v - p.vx) * k; p.vz += (tz / n * v - p.vz) * k;
    p.x = Math.max(.02, Math.min(.98, p.x + p.vx * dt)); p.z = Math.max(zMin - .02, Math.min(zMax + .02, p.z + p.vz * dt));
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > .012) p.dir = Math.atan2(p.vz, p.vx);
    // Quattro pose al passo, a scatti; da fermo i piedi tornano uniti
    if (p.fermo && sp < .012) p.passo = Math.round(p.passo / 2) * 2;
    else p.passo += dt * 6.5 * Math.min(1, sp / p.vel);
  }
}
// Linee e cerchi a pixel pieni, come nella pixel art: niente antialiasing
function pixLinea(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (let i = 0; i < 400; i++) {
    g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
function pixCerchio(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, pieno: boolean) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = x * x + y * y;
    if (pieno ? d <= r * r + r * .8 : (d <= r * r + r * .8 && d >= (r - 1) * (r - 1) + (r - 1) * .8)) g.fillRect(cx + x, cy + y, 1, 1);
  }
}
function disegnaRobot(g: CanvasRenderingContext2D, p: Robot, sx: number, sy: number, H: number) {
  const d = aOttavi(p.dir), cx = Math.cos(d), cz = Math.sin(d);
  const posa = ((Math.floor(p.passo) % 4) + 4) % 4, passo = posa === 1 ? 1 : posa === 3 ? -1 : 0, giu = passo ? 1 : 0;
  const x0 = Math.round(sx), y0 = Math.round(sy);
  const anca = y0 - Math.round(H * .46) + giu, spalla = y0 - Math.round(H * .76) + giu, testa = y0 - Math.round(H * .88) + giu;
  // Busto largo di fronte e di schiena, stretto di profilo
  const mezzo = Math.max(1, Math.round(H * (.035 + .045 * Math.abs(cz))));
  const px = Math.round(passo * H * .17 * cx), pz = Math.round(passo * H * .05 * cz);
  // Ombra a trattino sul terreno, verso destra
  g.fillStyle = 'rgba(110,210,190,.22)'; g.fillRect(x0 - 1, y0 + 1, Math.max(3, Math.round(H * .42)), 1);
  g.fillStyle = '#eef8f4';
  // Gambe dritte, senza ginocchio: si aprono e chiudono come compassi
  pixLinea(g, x0 - Math.min(1, mezzo), anca, x0 - 1 + px, y0 + pz);
  pixLinea(g, x0 + Math.min(1, mezzo), anca, x0 + 1 - px, y0 - pz);
  // Busto a rettangolo
  pixLinea(g, x0 - mezzo, spalla, x0 + mezzo, spalla); pixLinea(g, x0 - mezzo, anca, x0 + mezzo, anca);
  pixLinea(g, x0 - mezzo, spalla, x0 - mezzo, anca); pixLinea(g, x0 + mezzo, spalla, x0 + mezzo, anca);
  // Braccia rigide, in controfase con le gambe
  const bx = Math.round(-px * .7), bz = Math.round(-pz * .7), mano = anca - Math.round(H * .04);
  pixLinea(g, x0 - mezzo, spalla, x0 - mezzo - 1 + bx, mano + bz);
  pixLinea(g, x0 + mezzo, spalla, x0 + mezzo + 1 - bx, mano - bz);
  // Testa: cranio scuro con il contorno chiaro e la sfera di luce dentro.
  // La sfera segue lo sguardo: al centro di fronte, sul lato di profilo, spenta quando il robot dà le spalle
  const rt = Math.max(2, Math.round(H * .075));
  pixLinea(g, x0, spalla, x0, testa + rt);
  g.fillStyle = '#031410'; pixCerchio(g, x0, testa, rt, true);
  g.fillStyle = '#eef8f4'; pixCerchio(g, x0, testa, rt, false);
  const sguardo = d + p.sguardo, verso = Math.sin(sguardo), sx2 = x0 + Math.round(Math.cos(sguardo) * (rt - 1) * .65);
  if (verso > -.35) {
    const rs = Math.max(1, Math.round(rt * .45));
    g.fillStyle = 'rgba(110,255,220,.28)'; g.fillRect(sx2 - rs - 1, testa - rs - 1, rs * 2 + 3, rs * 2 + 3);
    g.fillStyle = '#62f3d2'; pixCerchio(g, sx2, testa, rs, true);
    g.fillStyle = '#e8fff8'; g.fillRect(sx2, testa - (rs > 1 ? 1 : 0), 1, 1);
  } else { g.fillStyle = '#2b6a60'; g.fillRect(sx2, testa, 1, 1); }
}
function passingMinds(c: HTMLCanvasElement, ora: number) {
  const f = follaDi(c), davanti = c.dataset.side === 'front', tick = Math.floor(ora / 33);
  const lato = davanti ? 'fronte' : 'retro';
  if (f.tick[lato] !== tick) {
    const dt = f.ultimo[lato] ? Math.min(.05, Math.max(0, (ora - f.ultimo[lato]) / 1000)) : 0;
    f.ultimo[lato] = ora; f.tick[lato] = tick;
    // Sul fronte cammina solo il capo: la folla aspetta al centro fino al primo giro del biglietto
    if (!document.hidden) muoviFolla(f, dt, davanti);
  }
  const ww = c.width, hh = c.height, cw = c.clientWidth, ch = c.clientHeight;
  if (!ww || !hh || !cw || !ch) return;
  // Altezza di riferimento del robot in pixel CSS: il retro è inquadrato stretto sulla folla
  const altezza = davanti ? Math.min(ch * .46, cw * .3) : Math.min(ch * .27, cw * .14);
  const scala = Math.max(1, Math.round(altezza / 30));
  const w = Math.max(1, Math.round(cw / scala)), h = Math.max(1, Math.round(ch / scala)), H0 = altezza / scala;
  let s = strati.get(c);
  if (!s) { const canvas = document.createElement('canvas'); s = { canvas, ctx: canvas.getContext('2d')! }; strati.set(c, s); }
  if (s.canvas.width !== w || s.canvas.height !== h) { s.canvas.width = w; s.canvas.height = h; }
  const g = s.ctx;
  g.fillStyle = '#010304'; g.fillRect(0, 0, w, h);
  const schermo = (x: number, z: number): [number, number, number] => davanti
    ? [w * (.1 + x * .8), h * (.5 + (z - .25) / .6 * .42), H0 * (.85 + .3 * (z - .25) / .6)]
    : [w * (.5 + (x - .5) * 1.04 * (.84 + .16 * z)), h * (.2 + z * .76), H0 * (.74 + .4 * z)];
  // Trattini del terreno, fermi: danno il piano su cui camminano
  g.fillStyle = '#10342e';
  for (const t of f.trattini) { if (davanti && t.z < .3) continue; const [x, y] = schermo(t.x, t.z); g.fillRect(Math.round(x), Math.round(y) + 1, Math.max(2, Math.round(t.l * w)), 1); }
  for (const p of f.robot.filter(p => p.capo === davanti).sort((a, b) => a.z - b.z)) {
    const [x, y, H] = schermo(p.x, p.z);
    disegnaRobot(g, p, x, y, H * p.scala);
  }
  const out = c.getContext('2d');
  if (!out) return;
  out.setTransform(1, 0, 0, 1, 0, 0); out.imageSmoothingEnabled = false;
  out.clearRect(0, 0, ww, hh); out.drawImage(s.canvas, 0, 0, ww, hh);
}

// --- La notte: la scena di caratteri con la luna, le stelle, il lago e l'aereo bianco a pixel
const RAMPE = { cielo: ' .:-=+*', stella: ' .+*', roccia: " .'^/\\*#", acqua: ' .-~=~' };
const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const AEREO = ['.....##.......', '.....###......', '##...####.....', '##############', '.#############', '.....####.....', '.....###......', '.....##.......'];
const maschere = new WeakMap<HTMLCanvasElement, unknown>();
function notteTela(c: HTMLCanvasElement, ora: number, tx: number, ty: number) {
  const st = getComputedStyle(c), dpr = Math.min(2, devicePixelRatio || 1), W = c.width, H = c.height;
  const g = c.getContext('2d')!, tipoA = c.dataset.ascii ?? '', s = ora / 1000;
  const acc = st.getPropertyValue('--accento-rgb').trim() || '255,164,94';
  const cw = Math.max(4, Math.round(W / (tipoA === 'notte-grande' ? 84 : 58))), ch = Math.round(cw * 1.55), cols = Math.ceil(W / cw), rows = Math.ceil(H / ch);
  g.fillStyle = '#0a0b0d'; g.fillRect(0, 0, W, H);
  g.font = `${Math.round(cw * 1.45)}px ui-monospace, Menlo, Consolas, monospace`; g.textBaseline = 'top';
  const lunaX = parseFloat(st.getPropertyValue('--luna-x')) || 0.72;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const u = (q + 0.5) / cols, v = (r + 0.5) / rows;
    let rampa = RAMPE.cielo, luce = 0, colore = '217,221,227';
    const cresta = 0.5 + 0.07 * Math.sin(u * 9 + 1) + 0.04 * Math.sin(u * 23), lago = 0.66, lx = lunaX + tx * 0.08, ly = 0.2 + ty * 0.05;
    const luna = (uu: number, vv: number) => { const d = Math.hypot((uu - lx) * 1.6, vv - ly); return d < 0.07 ? 1 : Math.max(0, 0.5 - d * 1.4); };
    if (v < cresta) {
      luce = 0.08 + luna(u, v) * 0.8 + (1 - v) * 0.1;
      const h = hash(q, r); if (h > 0.94) { rampa = RAMPE.stella; luce = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(s * 3 + h * 50)); }
      if (Math.hypot((u - lx) * 1.6, v - ly) < 0.07) colore = acc;
    } else if (v < lago) { rampa = RAMPE.roccia; luce = 0.25 + 0.5 * (Math.sin(u * 9 + 1) * 0.5 + 0.5) * (1 - (v - cresta) * 4) + hash(q, r) * 0.15; }
    else {
      rampa = RAMPE.acqua; const vv = 2 * lago - v + Math.sin(v * 70 - s * 2.4 + u * 6) * 0.012;
      luce = (vv < cresta ? 0.05 + luna(u, vv) * 0.7 : 0.18) * (0.75 + 0.25 * Math.sin(u * 40 + s * 1.5 + v * 30));
      if (Math.abs(u - lx) < 0.05 && luna(u, vv) > 0.3) colore = acc;
    }
    const n = rampa.length - 1, k = Math.max(0, Math.min(n, Math.round(luce * n)));
    if (k === 0 || rampa[k] === ' ') continue;
    g.fillStyle = `rgba(${colore},${(0.35 + 0.65 * Math.min(1, luce)).toFixed(2)})`;
    g.fillText(rampa[k]!, q * cw, r * ch);
  }
  // L'aereo bianco a pixel attraversa il cielo, pieno come i cervi dell'intro
  const p = Math.max(2, Math.round(cw * (tipoA === 'notte-grande' ? 0.9 : 0.75))), x0 = (-0.2 + ((s * 0.06) % 1) * 1.4) * W, y0 = H * (0.3 + Math.sin(s * 0.7) * 0.03);
  g.fillStyle = '#f4f1ea';
  AEREO.forEach((riga, y) => [...riga].forEach((cc, x) => { if (cc === '#') g.fillRect(Math.round(x0 + x * p), Math.round(y0 + y * p), p, p); }));
  void dpr; void maschere;
}

// --- ASCII Print. La scena dà un colore per cella; sotto un bagliore sfocato dello stesso colore, sopra il carattere
// scelto dalla luce. I colori simili si disegnano insieme, per cambiare colore di riempimento poche volte
const fbm = (x: number, y: number) => rumore(x, y) * 0.5 + rumore(x * 2.03 + 5, y * 2.03 + 1) * 0.27 + rumore(x * 4.1 + 2, y * 4.1 + 7) * 0.15 + rumore(x * 8.3 + 9, y * 8.3 + 3) * 0.08;
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const add = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const mul = (a: Rgb, k: number): Rgb => [a[0] * k, a[1] * k, a[2] * k];
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const grad = (punti: [number, Rgb][], k: number): Rgb => {
  k = clamp(k);
  for (let i = 1; i < punti.length; i++) if (k <= punti[i]![0]) { const [k0, c0] = punti[i - 1]!, [k1, c1] = punti[i]!; return mix(c0, c1, (k - k0) / (k1 - k0)); }
  return punti[punti.length - 1]![1];
};
const RAMPA = " .'`,:;-~+=*ox%#&@";
type Scena = (u: number, v: number, t: number, A: number) => Rgb;
type Sopra = (g: CanvasRenderingContext2D, t: number, W: number, H: number, ch: number) => void;
type TelaScena = { o: HTMLCanvasElement; og: CanvasRenderingContext2D; im: ImageData; cols: number; rows: number };

// A e C · La stessa montagna: creste, pini e lago uguali; il cielo e la luce cambiano
const ORIZ = 0.64;
const cresta = (x: number) => (1 - Math.abs(fbm(x, 1.3) * 2 - 1)) ** 2;
type Tinte = { pini: Rgb; medio: [Rgb, Rgb]; ombra: Rgb; lume: Rgb; neve: Rgb; acqua: Rgb; sole: number };
const TINTE: Record<'tramonto' | 'aurora', Tinte> = {
  tramonto: { pini: [16, 38, 40], medio: [[44, 34, 80], [200, 96, 110]], ombra: [92, 70, 140], lume: [236, 150, 140], neve: [255, 236, 236], acqua: [20, 30, 70], sole: 0.66 },
  aurora: { pini: [6, 14, 20], medio: [[18, 28, 52], [60, 150, 130]], ombra: [36, 50, 92], lume: [150, 210, 215], neve: [215, 245, 240], acqua: [4, 10, 26], sole: 0.3 },
};
const cieloTramonto: Scena = (u, v, t, A) => {
  let c = grad([[0, [38, 24, 82]], [0.22, [120, 50, 120]], [0.3, [236, 96, 104]], [0.45, [255, 170, 86]], [0.6, [255, 214, 140]]], v);
  const nuvole = fbm(u * 3 + t * 0.012, v * 9) * clamp(1 - Math.abs(v - 0.2) * 4);
  if (nuvole > 0.48) c = mix(c, v < 0.25 ? [255, 120, 150] : [255, 180, 120], clamp((nuvole - 0.48) * 4) * 0.8);
  const ds = Math.hypot((u - 0.66) * A, v - 0.36);
  return ds < 0.06 ? mix([255, 236, 190], [255, 250, 230], 1 - ds / 0.06) : add(c, [255, 150, 80], 0.35 * Math.exp(-ds * 7));
};
const stelle = (c: Rgb, u: number, v: number, t: number) => hash(Math.floor(u * 200), Math.floor(v * 140)) > 0.993 ? add(c, [255, 255, 255], 0.5 + 0.5 * Math.sin(t * 3 + u * 90)) : c;
const cieloAurora: Scena = (u, v, t) => {
  let col = stelle(grad([[0, [6, 10, 34]], [0.5, [14, 30, 66]], [0.64, [24, 56, 84]]], v), u, v, t);
  for (const [y0, fase, forza] of [[0.12, 0, 1], [0.24, 2.4, 0.7]] as const) {
    const yc = y0 + Math.sin(u * 4 + t * 0.25 + fase) * 0.06 + (fbm(u * 2.5 + fase, t * 0.06) - 0.5) * 0.1, d = v - yc;
    const raggi = Math.pow(fbm(u * 60 + Math.sin(v * 8 + t * 0.3) * 0.6 + fase, t * 0.35), 2) * 2.2;
    const I = (d > 0 ? Math.exp(-d * 3.6) : Math.exp(d * 40)) * (0.25 + raggi) * forza;
    col = add(col, mix([60, 255, 150], [220, 90, 240], clamp(-d * 14 + 0.35)), I * 0.9);
  }
  return col;
};
const montagna = (u: number, v: number, t: number, A: number, cielo: Scena, T: Tinte): Rgb => {
  const lontano = 0.52 - cresta(u * 4) * 0.24 - Math.max(0, 0.1 - Math.abs(u - 0.25) * 0.4);
  const medio = 0.56 - cresta(u * 6 + 3) * 0.1;
  const dente = Math.abs(((u * 46) % 1) - 0.5) * 2, alto = hash(Math.floor(u * 46), 4);
  const pini = 0.6 - (1 - dente) * (0.03 + alto * 0.05) + fbm(u * 9, 5) * 0.02;
  if (v > pini) return mix(T.pini, mul(T.pini, 2.2), clamp(1 - (v - pini) * 30) * 0.4);
  if (v > medio) return mix(T.medio[0], T.medio[1], fbm(u * 14, v * 14) * 0.6 * clamp(1 - (v - medio) * 7));
  if (v > lontano) {
    // Il lato verso la luce è acceso, l'altro in ombra; la neve sulle cime più alte
    const pend = fbm((u + 0.004) * 4, 1.3) - fbm((u - 0.004) * 4, 1.3), lume = clamp(0.5 - pend * 40 * Math.sign(u - T.sole || 1));
    const base = mix(T.ombra, T.lume, lume * 0.8);
    const neve = v < lontano + 0.025 + fbm(u * 20, v * 20) * 0.04 && lontano < 0.38;
    return neve ? mix(base, T.neve, 0.85) : mix(base, cielo(u, lontano - 0.01, t, A), clamp(1 - (v - lontano) * 6) * 0.25);
  }
  return cielo(u, v, t, A);
};
const lagoDi = (cielo: Scena, T: Tinte, scia: boolean): Scena => (u, v, t, A) => {
  if (v < ORIZ) return montagna(u, v, t, A, cielo, T);
  const p = v - ORIZ, onda = Math.sin(v * 160 - t * 1.6 + fbm(u * 4, v * 30) * 4) * 0.012 * (0.4 + p * 3);
  let col = mix(mul(montagna(u + onda, ORIZ - p * 1.25 - 0.003, t, A, cielo, T), 0.72 - p * 0.4), T.acqua, p * 0.9);
  if (scia && Math.abs(u - 0.66) * A < 0.03 + p * 0.35 && rumore(u * 22 + onda * 100, v * 300 - t * 2) > 0.72) col = mix(col, [255, 226, 170], 0.85);
  return col;
};

// E · Il campo di lavanda, di giorno e di notte con la luna: file in prospettiva, onde di vento, l'albero sulla collina
const lavandaDi = (notte: boolean): Scena => (u, v, t, A) => {
  const O = 0.5;
  if (v < O) {
    let col = notte ? stelle(grad([[0, [8, 10, 34]], [0.35, [28, 30, 80]], [0.5, [70, 60, 120]]], v / O * 0.5), u, v, t) : grad([[0, [70, 130, 220]], [0.35, [140, 190, 240]], [0.5, [250, 210, 180]]], v / O * 0.5);
    const nuvola = fbm(u * 2.5 - t * 0.015, v * 5);
    col = mix(col, notte ? [70, 70, 120] : [255, 250, 245], clamp((nuvola - 0.5) * 4) * clamp(1 - v * 2.2) * (notte ? 0.6 : 1));
    if (notte) { const dl = Math.hypot((u - 0.3) * A, v - 0.17); col = dl < 0.05 ? [244, 238, 214] : add(col, [200, 190, 255], 0.3 * Math.exp(-dl * 9)); }
    const colle = O - 0.05 - fbm(u * 3, 7) * 0.06;
    if (v > colle) col = notte ? mix([24, 34, 44], [48, 58, 76], fbm(u * 20, v * 20)) : mix([110, 150, 80], [170, 180, 110], fbm(u * 20, v * 20));
    const albero = Math.hypot((u - 0.74) * A * 1.4, (v - (colle - 0.035)) * 1.2);
    if (albero < 0.05 + fbm(u * 30, v * 30) * 0.02) col = notte ? mix([8, 14, 18], [24, 34, 40], fbm(u * 25, v * 25)) : mix([30, 60, 30], [90, 130, 50], fbm(u * 25, v * 25));
    if (Math.abs(u - 0.74) < 0.004 && v > colle - 0.03 && v < colle + 0.005) col = notte ? [14, 12, 16] : [60, 40, 30];
    return col;
  }
  const p = v - O + 0.012, x = (u - 0.62) / p, fila = Math.sin(x * 9) * 0.5 + 0.5;
  const vento = Math.sin(1 / p * 0.6 - t * 1.8 + u * 2) * 0.5 + 0.5;
  const col = fila > 0.35
    ? (notte ? mix([44, 30, 100], [130, 100, 210], fbm(x * 0.6, 1 / p * 0.4) * 0.7 + vento * 0.3) : mix([90, 60, 170], [200, 150, 240], fbm(x * 0.6, 1 / p * 0.4) * 0.7 + vento * 0.35))
    : (notte ? mix([14, 22, 20], [30, 40, 34], fbm(x, 1 / p)) : mix([60, 90, 40], [120, 140, 60], fbm(x, 1 / p)));
  return mix(col, notte ? [60, 54, 110] : [200, 170, 220], clamp(1 - p * 6));
};

// Sopra la scena: gli uccelli al tramonto, le farfalle sulla lavanda, le lucciole di notte
const uccelli: Sopra = (g, t, W, H) => {
  g.fillStyle = 'rgb(40,20,50)';
  for (let k = 0; k < 6; k++) g.fillText(Math.sin(t * 7 + k) > 0 ? 'v' : '~', ((t * 0.025 + k * 0.045 + Math.sin(k * 3) * 0.02) % 1.2 - 0.1) * W, (0.13 + Math.sin(k * 2.1) * 0.04 + Math.sin(t + k) * 0.008) * H);
};
const farfalle: Sopra = (g, t, W, H) => {
  for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? 'rgb(255,240,120)' : 'rgb(255,255,255)'; g.fillText(Math.sin(t * 10 + k) > 0 ? 'Ж' : '|', (0.1 + hash(k, 2) * 0.8 + Math.sin(t * 0.4 + k) * 0.06) * W, (0.62 + hash(k, 3) * 0.25 + Math.sin(t * 1.3 + k * 2) * 0.03) * H); }
};
const lucciole: Sopra = (g, t, W, H) => {
  for (let k = 0; k < 14; k++) { const a = Math.sin(t * 2.1 + k * 4.7); if (a < 0) continue; g.fillStyle = `rgba(255,214,120,${a.toFixed(2)})`; g.fillText('*', (0.05 + hash(k, 1) * 0.9 + Math.sin(t * 0.3 + k) * 0.03) * W, (0.55 + hash(k, 2) * 0.38 + Math.cos(t * 0.4 + k) * 0.03) * H); }
};
const SCENE_TELA: Record<string, [Scena, Sopra | null]> = {
  tramonto: [lagoDi(cieloTramonto, TINTE.tramonto, true), uccelli],
  aurora: [lagoDi(cieloAurora, TINTE.aurora, false), null],
  lavanda: [lavandaDi(false), farfalle],
  'lavanda-notte': [lavandaDi(true), lucciole],
};

function scenaTela(c: HTMLCanvasElement, t: number, tx: number) {
  const [scena, sopra] = SCENE_TELA[c.dataset.scena ?? ''] ?? SCENE_TELA.tramonto!;
  const W = c.width, H = c.height, dpr = Math.min(2, devicePixelRatio || 1), A = W / H;
  // Una cella di circa 5 pixel CSS: la colonna stretta davanti ha meno caratteri, il poster dietro di più
  const cols = Math.max(28, Math.min(110, Math.round(W / dpr / 5))), cw = W / cols, ch = cw * 1.7, rows = Math.ceil(H / ch);
  const s = prendi<TelaScena>(c, () => { const o = document.createElement('canvas'); o.width = cols; o.height = rows; const og = o.getContext('2d')!; return { o, og, im: og.createImageData(cols, rows), cols, rows }; });
  const g = c.getContext('2d')!, d = s.im.data, celle: Rgb[] = new Array(cols * rows), sposta = tx * 0.015;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const col = scena((x + 0.5) / cols + sposta, (y + 0.5) / rows, t, A), i = y * cols + x;
    celle[i] = col; d[i * 4] = col[0] * 0.62; d[i * 4 + 1] = col[1] * 0.62; d[i * 4 + 2] = col[2] * 0.62; d[i * 4 + 3] = 255;
  }
  s.og.putImageData(s.im, 0, 0);
  g.imageSmoothingEnabled = true; g.filter = `blur(${(cw * 0.6).toFixed(1)}px)`; g.drawImage(s.o, 0, 0, W, H); g.filter = 'none';
  g.font = `bold ${Math.round(ch * 0.92)}px ui-monospace, Menlo, Consolas, monospace`; g.textBaseline = 'top'; g.textAlign = 'center';
  const secchi = new Map<string, number[]>();
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const col = celle[y * cols + x]!, l = clamp((col[0] * 0.3 + col[1] * 0.59 + col[2] * 0.11) / 255);
    const k = Math.min(RAMPA.length - 1, Math.floor(Math.pow(l, 0.8) * RAMPA.length + (hash(x, y) - 0.5) * 1.6));
    if (k <= 0) continue;
    const q = (n: number) => (Math.min(255, n * 1.25 + 18) >> 3) << 3, chiave = `rgb(${q(col[0])},${q(col[1])},${q(col[2])})`;
    let lista = secchi.get(chiave); if (!lista) secchi.set(chiave, (lista = []));
    lista.push(x, y, k);
  }
  for (const [colore, lista] of secchi) { g.fillStyle = colore; for (let i = 0; i < lista.length; i += 3) g.fillText(RAMPA[lista[i + 2]!]!, (lista[i]! + 0.5) * cw, lista[i + 1]! * ch); }
  if (sopra) { g.font = `${Math.round(ch)}px ui-monospace, Menlo, Consolas, monospace`; sopra(g, t, W, H, ch); }
}

// Il nome del termine in caratteri, sul retro: lettere piene fatte di segni, con la sfumatura della scena.
// Un nome lungo va su due righe, spezzato allo spazio più vicino al centro
type Banner = { cols: number; rows: number; a: Uint8ClampedArray };
function bannerTela(c: HTMLCanvasElement, t: number) {
  const W = c.width, H = c.height, dpr = Math.min(2, devicePixelRatio || 1), g = c.getContext('2d')!;
  const cw = Math.max(3, 3 * dpr), ch = cw * 1.6, cols = Math.floor(W / cw), rows = Math.floor(H / ch);
  const m = prendi<Banner>(c, () => {
    const testo = (c.dataset.testo ?? '').toUpperCase(), k = document.createElement('canvas'); k.width = cols; k.height = rows;
    const kg = k.getContext('2d')!, font = (n: number) => `900 ${n}px "Arial Black", system-ui, sans-serif`;
    kg.font = font(rows); let righe = [testo];
    if (kg.measureText(testo).width > cols * 1.6 && testo.includes(' ')) {
      const meta = testo.length / 2; let taglio = -1;
      for (let i = 0; i < testo.length; i++) if (testo[i] === ' ' && (taglio < 0 || Math.abs(i - meta) < Math.abs(taglio - meta))) taglio = i;
      righe = [testo.slice(0, taglio), testo.slice(taglio + 1)];
    }
    const alt = rows / righe.length; kg.font = font(alt * 1.05); kg.textBaseline = 'middle';
    const larga = Math.max(...righe.map(x => kg.measureText(x).width), 1), sx = Math.min(1.6, (cols * 0.98) / larga);
    kg.setTransform(sx, 0, 0, 1, 0, 0);
    righe.forEach((x, i) => kg.fillText(x, 0, alt * (i + 0.55)));
    return { cols, rows, a: kg.getImageData(0, 0, cols, rows).data };
  });
  const c1 = varCss(c, '--banner-1', '255,255,255').split(',').map(Number) as Rgb, c2 = varCss(c, '--banner-2', '255,255,255').split(',').map(Number) as Rgb;
  g.clearRect(0, 0, W, H); g.font = `bold ${Math.round(cw * 1.5)}px ui-monospace, Menlo, Consolas, monospace`; g.textBaseline = 'top';
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    const a = m.a[(y * m.cols + x) * 4 + 3]! / 255; if (a < 0.1) continue;
    const col = mix(c1, c2, clamp(x / m.cols + Math.sin(t * 0.8 + y * 0.3) * 0.05));
    g.fillStyle = `rgba(${Math.round(col[0])},${Math.round(col[1])},${Math.round(col[2])},${(0.6 + a * 0.4).toFixed(2)})`;
    g.fillText(a > 0.7 ? (hash(x + Math.floor(t * 6), y) > 0.85 ? '%' : '#') : '+', x * cw, y * ch);
  }
}
