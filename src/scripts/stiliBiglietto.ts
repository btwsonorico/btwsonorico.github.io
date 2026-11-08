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
// Un'unica palette verde Matrix, su un fondo quasi nero.
const FIORI = [['#c8ffd4', '#00ff41', '#007a1f']] as const;
const lime: Stile = {
  id: 'lime', ascii: true,
  davanti: c => `<div class="fiore"></div><canvas data-ascii="vita" data-seme="${semeTela(c)}"></canvas><i class="tick" style="left:8%;top:7%"></i><i class="tick" style="right:8%;bottom:7%"></i>`,
  dietro: c => `<div class="fiore"></div><canvas data-ascii="vita-parola" data-seme="${semeTela(c)}" data-testo="${esc(c.termine.toUpperCase().slice(0, 18))}"></canvas>`,
  variabili: c => { const f = una(c, 'fiore', () => scegli(FIORI, c.r)); return { ...carta({ carta: '#eef6ef', inchiostro: '#062b12', accento: '#0a9a34', tagliando: '#dceede', fondo: '#030a05' }), '--f1': f[0], '--f2': f[1], '--f3': f[2] }; },
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

// ---------------- Koi Pond, tutto a pixel. Davanti una koi sola, da vicino: la camera la segue, l'acqua e le ninfee
// scorrono sotto. Dietro lo stagno intero: all'inizio c'è solo lei, poi le altre entrano dai bordi una alla volta.
// Solo la versione minimal in bianco e nero, dove solo le koi hanno colore
const ACQUE = [
  { mono: true, acqua: ['#8f918e', '#a8aaa6', '#c2c3bf', '#d9dad6', '#f2f2ee'], ui: { fondo: '#f4f3ef', bg: '#f4f3ef', pannello: '#e7e6e1', bordo: '#1a1a1a', hover: '#d9d8d2', ombra: '#1a1a1a' }, testo: '#141414', accento: '#e2452c' },
] as const;
const koi: Stile = {
  id: 'koi', ascii: true,
  // Davanti le stesse koi dello stagno: finché il biglietto non si gira, nello stagno c'è una koi sola
  davanti: c => `<canvas data-ascii="koi-stagno" data-side="front" data-seme="${semeTela(c)}"></canvas>`,
  dietro: c => `<canvas data-ascii="koi-stagno" data-seme="${semeTela(c)}"></canvas>`,
  variabili: c => {
    const q = una(c, 'acqua', () => scegli(ACQUE, c.r));
    return {
      ...carta({ carta: '#f4f3ef', inchiostro: '#141414', accento: q.accento, tagliando: '#e7e6e1', fondo: q.acqua[4] }),
      '--acqua-0': q.acqua[0], '--acqua-1': q.acqua[1], '--acqua-2': q.acqua[2], '--acqua-3': q.acqua[3], '--acqua-4': q.acqua[4], '--koi-mono': q.mono ? '1' : '0',
    };
  },
};

// ---------------- Spiaggia, tutto a pixel: la riva vista dall'alto. Davanti di giorno: mare turchese, la schiuma, l'onda
// che sale piano sulla sabbia e si ritira, la sabbia bagnata più scura. Dietro la stessa riva al tramonto, con i teli,
// l'ombrellone, le ciabatte e il secchiello sulla sabbia asciutta, e le ombre lunghe. Anche di giorno la spiaggia è popolata
const spiaggia: Stile = {
  id: 'spiaggia', ascii: true,
  davanti: c => `<canvas data-ascii="riva" data-seme="${semeTela(c)}"></canvas>`,
  dietro: c => `<canvas data-ascii="riva-tramonto" data-seme="${semeTela(c)}"></canvas>`,
  variabili: () => carta({ carta: '#f6f1e6', inchiostro: '#173847', accento: '#14879b', tagliando: '#ece4d3', fondo: '#e3cfa4' }),
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

// ---------------- Sfera: un corpo morbido fatto di qualche centinaio di sfere di vetro, in 3D vero. Il grappolo gira piano
// e trema come una gelatina quando il biglietto si inclina: il nucleo segue subito, il guscio arriva in ritardo.
// Sfere piene e lucide, verde acceso, azzurro e lilla, su un blu notte; ogni tanto una scoppia in tante gocce. Davanti un grappolo; dietro uno più grande
const sfera: Stile = {
  id: 'sfera', ascii: true,
  davanti: c => `<canvas data-ascii="sfere" data-side="front" data-seme="${semeTela(c)}"></canvas><div class="sf"><div class="sf-testa"><span>STUDY ${esc(c.numero)}</span><span>SOFT GLASS</span></div><div class="sf-piede"><span>SPHERES</span><span>AI TERMS</span></div></div>`,
  dietro: c => `<canvas data-ascii="sfere" data-side="back" data-seme="${semeTela(c)}"></canvas><div class="sf"><div class="sf-testa"><span>SOFT GLASS</span><span>STUDY ${esc(c.numero)}</span></div><div class="sf-piede"><span>SOFT FOAM</span><span>POP / TAKE 03</span></div></div>`,
  variabili: () => carta({ carta: '#eef3fb', inchiostro: '#161a33', accento: '#7a4fe0', tagliando: '#dde7f6', fondo: '#0f1226' }),
};

// ---------------- Holo: la carta rara, ogni 10 domande. In arcobaleno, argento o oro, con una nota di colore. Davanti una rosetta incisa a inchiostro, con le
// linee guilloché e il sigillo in lamina; dietro il poster tutto in lamina, con il termine inciso. Non entra nel mazzo
const OLO_TINTE = ['iride', 'argento', 'oro', 'cobalto', 'smeraldo', 'rubino', 'camaleonte'] as const, OLO_COLORI = ['#e2566b', '#1f9a8a', '#6a4fd0', '#d48a12'] as const;
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
  davanti: c => { const col = una(c, 'olo-colore', () => scegli(OLO_COLORI, c.r)); return `<svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="${col}" stroke-width=".22" opacity=".9">${rosetta()}</g></svg>`; },
  dietro: () => `<div class="olo-poster"></div>`,
  variabili: c => carta({ carta: '#f3f1ec', inchiostro: '#1b2340', accento: una(c, 'olo-colore', () => scegli(OLO_COLORI, c.r)), tagliando: '#e9e6f0', fondo: '#f3f1ec' }),
};

// ---------------- Tre arti dalle pagine di Learn. Non calcolano niente: riproducono una run registrata una volta sola
// (scripts/registra-rete.mjs, registra-diffusione.mjs, registra-gregge.ts). Il codice e i dati si caricano solo
// quando l'arte esce nel sorteggio, così la pagina non pesa di più
// Rete neurale: davanti la casa che prende forma sulla griglia, dietro il pesce, più grande
const rete: Stile = {
  id: 'rete', ascii: true,
  davanti: () => `<canvas data-ascii="rete" data-side="front"></canvas>`,
  dietro: () => `<canvas data-ascii="rete" data-side="back"></canvas>`,
  variabili: () => carta({ carta: '#f2efe8', inchiostro: '#15202e', accento: '#d9661f', tagliando: '#e7e2d6', fondo: '#0a0b0d' }),
};
// Diffusion: davanti una run dal rumore alla stella, dietro sei run diverse
const diffusione: Stile = {
  id: 'diffusione', ascii: true,
  davanti: () => `<canvas data-ascii="diffusione" data-side="front"></canvas>`,
  dietro: () => `<canvas data-ascii="diffusione" data-side="back"></canvas>`,
  variabili: () => carta({ carta: '#eef2f7', inchiostro: '#10161f', accento: '#1f6fd1', tagliando: '#dde5ef', fondo: '#0a0b0d' }),
};
// Reinforcement: davanti la policy addestrata 4M che porta il gregge nel cerchio, dietro le due policy a confronto
const gregge: Stile = {
  id: 'gregge', ascii: true,
  davanti: () => `<canvas data-ascii="gregge" data-side="front"></canvas>`,
  dietro: () => `<canvas data-ascii="gregge" data-side="back"></canvas>`,
  variabili: () => carta({ carta: '#f3f0e9', inchiostro: '#16191e', accento: '#c45f17', tagliando: '#e7e2d7', fondo: '#0a0b0d' }),
};
type Disegno = (c: HTMLCanvasElement, tempo: number, retro: boolean) => void;
const caricate: Record<string, Disegno | 'attesa' | undefined> = {};
const CARICA: Record<string, () => Promise<Disegno>> = {
  rete: () => import('./arteRete').then(m => m.disegnaRete),
  diffusione: () => import('./arteDiffusione').then(m => m.disegnaDiffusione),
  gregge: () => import('./arteGregge').then(m => m.disegnaGregge),
};
function arteLearn(tipo: string, c: HTMLCanvasElement, ora: number) {
  const f = caricate[tipo];
  if (typeof f === 'function') { f(c, ora / 1000, c.dataset.side === 'back'); return; }
  if (f === 'attesa') return;
  caricate[tipo] = 'attesa';
  // Se il pezzo non si carica è quasi sempre perché il sito è stato aggiornato mentre la pagina era aperta: i file vecchi
  // non esistono più. Allora la pagina si ricarica una volta (non di più, per non entrare in un giro infinito)
  CARICA[tipo]!().then(d => { caricate[tipo] = d; }).catch(() => {
    caricate[tipo] = undefined;
    try { if (!sessionStorage.getItem('ricaricata-arte')) { sessionStorage.setItem('ricaricata-arte', '1'); location.reload(); } } catch { /* niente */ }
  });
}

// Il mazzo: ogni arte esce una volta per giro
export const STILI: Stile[] = [sfera, lime, risograph, koi, spiaggia, prato, paesaggi, passing, rete, diffusione, gregge];

// ---------------- La lamina dice la combo: ogni giusta di fila al primo colpo aggiunge un elemento, sempre nello stesso
// ordine. 1: il nome del termine sul tagliando; 2: il filo sottile con le paroline; 3: la banda grande; 4: il bollino;
// 5: le linee guilloché. Un errore azzera la combo e il biglietto dopo torna di solo inchiostro.
// Il colore è a caso, per biglietto: argento e oro comuni, arcobaleno più raro
export type PianoBiglietto = { davanti: Pezzo[]; dietro: Pezzo[]; tinta: Tinta };
const ORDINE_LAMINA: Pezzo[] = ['simboli', 'filo', 'banda', 'sigillo', 'guilloche'];
export function pianoLamina(st: Stile, c: Contesto, combo = 0): PianoBiglietto {
  const k = una(c, 'tinta-lamina', () => c.r());
  // Argento e oro comuni; cobalto, smeraldo, rubino e camaleonte meno; l'arcobaleno raro
  const tinta: Tinta = k < 0.32 ? 'argento' : k < 0.62 ? 'oro' : k < 0.695 ? 'cobalto' : k < 0.77 ? 'smeraldo' : k < 0.845 ? 'rubino' : k < 0.92 ? 'camaleonte' : 'iride';
  if (st.id === 'olo') { const t = una(c, 'olo-tinta', () => scegli(OLO_TINTE, c.r)); return { davanti: ['guilloche', 'sigillo'], dietro: ['poster'], tinta: t }; }
  return { davanti: ORDINE_LAMINA.slice(0, Math.max(0, Math.min(combo, ORDINE_LAMINA.length))), dietro: [], tinta };
}

// ---------------- Le tele vive. Il biglietto chiama disegnaAscii circa 30 volte al secondo; ogni tela decide quanto spesso
// ridisegnarsi (le scene di caratteri bastano 12 volte al secondo). Lo stato di ogni tela (cellule, pesci) sta qui
const ultimo = new WeakMap<HTMLCanvasElement, number>();
export function disegnaAscii(c: HTMLCanvasElement, ora: number, tx: number, ty: number) {
  const tipoT = c.dataset.ascii ?? '';
  // La clip del cane sul retro è un video: si disegna a ogni giro, senza limiti, così resta fluida
  const clip = tipoT === 'gregge' && c.dataset.side === 'back';
  const lento = tipoT.startsWith('notte') || tipoT === 'scena' || tipoT === 'prato' || tipoT === 'passing' || tipoT === 'banner' || (tipoT in CARICA && !clip);
  // Le arti di Learn a circa 20 fotogrammi al secondo, le scene di caratteri a 12
  if (lento && ora - (ultimo.get(c) ?? -1e9) < (tipoT in CARICA ? 48 : 80)) return;
  const prima = ultimo.get(c) ?? ora; ultimo.set(c, ora);
  const dt = Math.min(0.1, Math.max(0, (ora - prima) / 1000));
  // Su telefono le tele dei biglietti al massimo a densità 1,5: costano meno e si vedono uguali
  const dpr = Math.min(innerWidth < 700 ? 1.5 : 2, devicePixelRatio || 1), W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr);
  if (!W || !H) return;
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; stati.delete(c); maschere.delete(c); }
  if (tipoT.startsWith('vita')) return vita(c, ora, dt, dpr, tipoT === 'vita-parola');
  // Spiaggia e koi costano di più: la faccia che non si vede (il retro prima del giro, il davanti dopo) si ferma,
  // ma solo dopo il primo disegno, così anche con il movimento ridotto ogni faccia ha la sua immagine
  if (tipoT.startsWith('riva') || tipoT.startsWith('koi')) {
    const retro = tipoT === 'riva-tramonto' || (tipoT === 'koi-stagno' && c.dataset.side !== 'front'), girata = !!c.closest('.girata');
    if (c.dataset.fatto && (retro ? !girata && !!c.closest('.carta') : girata)) return;
  }
  if (tipoT === 'riva' || tipoT === 'riva-tramonto') return rivaTela(c, dt, dpr, tx, tipoT === 'riva-tramonto');
  if (tipoT === 'koi-uno') return koiVicina(c, dt, dpr, tx, ty);
  if (tipoT.startsWith('koi')) return stagnoPixel(c, dt, dpr, tx, ty);
  if (tipoT === 'scena') return scenaTela(c, ora / 1000, tx);
  if (tipoT === 'prato') return pratoPixel(c, ora / 1000);
  if (tipoT === 'passing') return passingMinds(c, ora);
  if (tipoT === 'sfere') return sfereTela(c, ora / 1000, dt, tx, ty);
  if (tipoT in CARICA) return arteLearn(tipoT, c, ora);
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
  const f1 = varCss(c, '--f1', '#c8ffd4'), f2 = varCss(c, '--f2', '#00ff41'), f3 = varCss(c, '--f3', '#007a1f');
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
// Un pixel dell'arte è sempre un numero intero di pixel della tela: così nessuna riga esce più larga delle altre
// e le cose che si muovono piano non tremolano. L'immagine può uscire di poco dal bordo destro e da quello in basso
const latoPix = (dpr: number) => Math.max(1, Math.round(PIX * dpr));
function immagine(c: HTMLCanvasElement, dpr: number): Immagine {
  const k = latoPix(dpr), w = Math.ceil(c.width / k), h = Math.ceil(c.height / k);
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
const mostra = (c: HTMLCanvasElement, im: Immagine, dpr: number) => {
  im.g.putImageData(im.img, 0, 0);
  const g = c.getContext('2d')!, k = latoPix(dpr); g.imageSmoothingEnabled = false;
  g.drawImage(im.tela, 0, 0, im.w * k, im.h * k);
};
// Un colore sopra il pixel che c'è già: a dice quanto copre
const mescola = (im: Immagine, x: number, y: number, col: Rgb, a: number) => {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= im.w || y >= im.h) return;
  const i = (y * im.w + x) * 4, d = im.img.data;
  d[i] = d[i]! + (col[0] - d[i]!) * a; d[i + 1] = d[i + 1]! + (col[1] - d[i + 1]!) * a; d[i + 2] = d[i + 2]! + (col[2] - d[i + 2]!) * a; d[i + 3] = 255;
};
const misto = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const scuro = (a: Rgb, k: number): Rgb => [a[0] * k, a[1] * k, a[2] * k];
const frazione = (v: number) => v - Math.floor(v);
const soglia = (x: number, y: number) => BAYER4[(y & 3) * 4 + (x & 3)]!;
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

// ---------------- La spiaggia vista dall'alto. Sabbia in alto, il mare in basso. Tutto si misura in pixel dell'arte, mai
// in frazioni della tela: l'onda sale al massimo di 16 pixel e le creste corrono a 1,3 pixel al secondo, sia nella
// colonna alta del desktop sia nella striscia larga del telefono. Niente caso a ogni fotogramma: schiuma e luccichii
// dipendono solo dal posto e dal tempo, così non sfarfallano
type Spiaggia = { mare: Rgb[]; schiuma: Rgb; schiuma2: Rgb; sabbia: Rgb[]; bagnata: Rgb[]; lucida: Rgb; luce: Rgb };
const SPIAGGE: Record<'giorno' | 'tramonto', Spiaggia> = {
  giorno: { mare: ['#155a80', '#1c7499', '#2490b0', '#38abc0', '#5cc6c9', '#8fdcd3', '#c2eedf'].map(daHex), schiuma: daHex('#fbfbf4'), schiuma2: daHex('#d9f1ea'), sabbia: ['#d6bb88', '#e0c795', '#e9d3a6', '#f2e1b9'].map(daHex), bagnata: ['#a98d63', '#b79a6e', '#c4a87d'].map(daHex), lucida: daHex('#d3d6c6'), luce: daHex('#ffffff') },
  tramonto: { mare: ['#2a2c5a', '#43386d', '#69457c', '#975580', '#c66a7c', '#e8907c', '#f6bb93'].map(daHex), schiuma: daHex('#fff0e2'), schiuma2: daHex('#f4c9b6'), sabbia: ['#b07558', '#c18562', '#d1966d', '#dfa87b'].map(daHex), bagnata: ['#7a4f52', '#8a5b5a', '#9a6862'].map(daHex), lucida: daHex('#eba187'), luce: daHex('#fff1b8') },
};
// Un campo fermo, un valore per pixel, calcolato una volta sola per tela (la grana della sabbia, le macchie del fondo)
const campi = new WeakMap<HTMLCanvasElement, Map<string, Float32Array>>();
const campo = (c: HTMLCanvasElement, nome: string, w: number, h: number, f: (x: number, y: number) => number) => {
  let m = campi.get(c); if (!m) { m = new Map(); campi.set(c, m); }
  let a = m.get(nome);
  if (!a || a.length !== w * h) { a = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = f(x, y); m.set(nome, a); }
  return a;
};
type Riva = { tempo: number; alto: Float32Array };
function rivaTela(c: HTMLCanvasElement, dt: number, dpr: number, tx: number, tramonto: boolean) {
  const im = immagine(c, dpr), { w, h } = im, T = tramonto ? SPIAGGE.tramonto : SPIAGGE.giorno;
  const s = prendi<Riva>(c, () => ({ tempo: casoTela(c)() * 40, alto: new Float32Array(w).fill(1e9) }));
  if (s.alto.length !== w) s.alto = new Float32Array(w).fill(1e9);
  const GRANA = campo(c, 'grana', w, h, (x, y) => hash(x, y) * 0.3 + rumore(x * 0.11, y * 0.11) * 0.45 + 0.08 * Math.sin(x * 0.3 + y * 0.12 + rumore(x * 0.05, y * 0.05) * 5));
  s.tempo += dt;
  // PERIODO: un'onda ogni 10 secondi. A: quanto sale l'onda. base: dove l'acqua si ferma quando si è ritirata.
  // Dietro, in alto, resta una fascia di sabbia asciutta per i teli e l'ombrellone
  const t = s.tempo, PERIODO = 10, A = Math.round(Math.min(16, h * 0.26)), ZONA = 16;
  const base = Math.min(h - 10, Math.max(Math.round(h * (tramonto ? 0.58 : 0.52)), ZONA + A + 4));
  const LB = 13, SURF = Math.max(6, Math.min(16, (h - base) * 0.7)), sole = w * 0.72, scia = Math.max(18, w * 0.2);
  for (let x = 0; x < w; x++) {
    // Ogni colonna è un tratto di riva, un po' in ritardo sul vicino: l'onda arriva di sbieco
    const g = t / PERIODO - x * 0.004 + (rumore(x * 0.03, 3) - 0.5) * 0.12, n = Math.floor(g), f = g - n;
    // L'acqua sale in fretta (un terzo del tempo) e si ritira piano
    const sale = f < 0.32 ? 1 - (1 - f / 0.32) ** 2.2 : 0.5 + 0.5 * Math.cos(((f - 0.32) / 0.68) * Math.PI), ritira = f < 0.32 ? 0 : (f - 0.32) / 0.68;
    const R = (A * (0.62 + 0.38 * rumore(x * 0.035, n * 1.7)) + (rumore(x * 0.16, n * 2.3) - 0.5) * 2.4) * sale;
    const yF = base - R;
    // La sabbia bagnata arriva fin dove è salita l'acqua, poi si asciuga piano verso il mare
    const alto = (s.alto[x] = Math.min(yF, s.alto[x]! + dt * 0.9));
    const wob = (rumore(x * 0.05, n * 0.3 + 11) - 0.5) * 3;
    const spessa = (1.2 + 1.3 * rumore(x * 0.22, n * 4 + f * 2)) * (f < 0.32 ? 1.5 : 1 - ritira * 0.6);
    for (let y = 0; y < h; y++) {
      let col: Rgb;
      const grana = GRANA[y * w + x]!;
      if (y < yF) {
        if (y >= alto - 0.5) {
          // Bagnata: più scura vicino all'acqua; appena l'acqua si ritira la sabbia luccica un momento
          const k = Math.min(1, (y - alto + 1) / 4);
          col = tono(T.bagnata, grana * 0.6 + (1 - k) * 0.45, x, y);
          if (ritira > 0 && yF - y < 3 && (1 - (yF - y) / 3) * Math.min(1, ritira * 2) > soglia(x, y)) col = T.lucida;
        } else col = tono(T.sabbia, grana + (1 - y / base) * 0.22, x, y);
      } else {
        const d = y - yF, v = y - base;
        // Il colore del mare: chiaro dove l'acqua è bassa, blu dove è profonda (40 pixel dalla riva)
        const D = Math.max(0, Math.min(1, (v + 4) / 40));
        let val = 0.92 - D * 0.9 + (rumore(x * 0.07 + tx * 2, y * 0.12 - t * 0.1) - 0.5) * 0.08;
        // Le creste: righe parallele alla riva che salgono piano e arrivano alla riva insieme all'onda
        const fase = (v + wob) / LB + f, e = frazione(fase), q = v >= 0 ? (e < 0.12 ? 1 - e / 0.12 : e > 0.78 ? ((e - 0.78) / 0.22) * 0.5 : 0) : 0;
        val += q * 0.16;
        col = tono(T.mare, val, x, y);
        if (y < base) {
          // Il velo d'acqua sulla sabbia: sottile vicino al bordo, e si assottiglia mentre si ritira
          const a = Math.min(1, d / (3 + 5 * (1 - ritira))) * (1 - ritira * 0.45);
          if (a < soglia(x, y)) col = tono(T.bagnata, grana * 0.6, x, y);
        }
        if (d < spessa) col = T.schiuma;
        else if (d < 9) {
          // Il pizzo di schiuma dietro il bordo: si muove con il bordo e si scioglie mentre l'acqua torna indietro
          const pz = rumore(x * 0.24, d * 0.35 + n * 5.1);
          if (pz > 0.52 + d * 0.035 + ritira * 0.3) col = pz > 0.7 ? T.schiuma : T.schiuma2;
        }
        if (v >= -1 && v < SURF && q > 0.4) {
          // L'onda che rompe vicino alla riva diventa schiuma bianca, che corre con la cresta
          const pz = rumore(x * 0.3, e * LB * 0.55 + Math.floor(fase) * 3.1);
          if (pz > 0.3 + (Math.max(0, v) / SURF) * 0.35) col = pz > 0.55 ? T.schiuma : T.schiuma2;
        }
        if (v > 2 && d > 3) {
          if (tramonto) {
            // Il riflesso del sole basso: una scia di strisce calde e di luccichii verso destra
            const vicino = Math.max(0, 1 - Math.abs(x - sole) / scia);
            if (vicino > 0 && rumore(x * 0.32, y * 1.1 - t * 0.3) > 0.76 - vicino * 0.24) col = misto(col, T.luce, 0.3 + vicino * 0.4);
            if (hash(x, y) > 0.986 - vicino * 0.05 && Math.sin(t * 1.3 + hash(y, x) * 40) > 0.6) col = T.luce;
          } else if (hash(x, y + 999) > 0.993 && Math.sin(t * 1.1 + hash(y + 5, x) * 40) > 0.75) col = T.luce;
        }
      }
      metti(im, x, y, col);
    }
  }
  oggettiSpiaggia(im, w, base - A - 2, tramonto, Number(c.dataset.seme) || 7);
  mostra(c, im, dpr);
}

// Un piccolo disegno a righe di caratteri: ogni carattere è un colore, il punto è vuoto
const sprite = (im: Immagine, x: number, y: number, righe: string[], colori: Record<string, Rgb>) => {
  righe.forEach((r, dy) => { for (let dx = 0; dx < r.length; dx++) { const k = colori[r[dx]!]; if (k) metti(im, x + dx, y + dy, k); } });
};
// Gli oggetti sulla sabbia asciutta: teli, ombrelloni, ciabatte, secchielli, palloni, sparsi lungo tutta la riva come
// su una spiaggia frequentata. La disposizione viene dal seme del biglietto, uguale davanti e dietro. Al tramonto i
// colori si scaldano e le ombre vanno lunghe a sinistra (il sole è basso a destra); di giorno le ombre sono corte
function oggettiSpiaggia(im: Immagine, w: number, fondoZona: number, tramonto: boolean, seme: number) {
  const caldo = (hx: string) => (tramonto ? misto(daHex(hx), daHex('#ff9566'), 0.16) : daHex(hx)), OMBRA: Rgb = tramonto ? [70, 34, 48] : [120, 92, 56];
  const lungo = tramonto ? 1 : 0.35, forza = tramonto ? 1 : 0.8;
  const ombraTonda = (cx: number, cy: number, rx: number, ry: number) => {
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) if ((dx / rx) ** 2 + (dy / ry) ** 2 <= 1) mescola(im, cx + dx, cy + dy, OMBRA, 0.32 * forza);
  };
  const telo = (x0: number, y0: number, lw: number, lh: number, righe: string[]) => {
    for (let x = 0; x < Math.max(1, Math.round(3 * lungo)); x++) for (let y = 0; y <= lh; y++) mescola(im, x0 - 1 - x, y0 + y + 1, OMBRA, 0.12 * forza);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) metti(im, x0 + x, y0 + y, caldo(righe[Math.floor(x / 2) % righe.length]!));
    for (let y = 0; y < lh; y += 2) { metti(im, x0 - 1, y0 + y, caldo('#fff4e2')); metti(im, x0 + lw, y0 + y, caldo('#fff4e2')); }
  };
  const ombrellone = (cx: number, cy: number, raggio: number, a: string, b: string) => {
    ombraTonda(cx - Math.round((raggio + 2) * lungo), cy + 1, raggio + 3 * lungo, raggio - 1.5);
    for (let dy = -raggio; dy <= raggio; dy++) for (let dx = -raggio; dx <= raggio; dx++) {
      const dd = Math.hypot(dx, dy); if (dd > raggio + 0.3) continue;
      const spicchio = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 8) % 2;
      let col = caldo(spicchio ? a : b);
      if (dd > raggio - 0.9) col = scuro(col, 0.82); else if (dx > 0) col = misto(col, daHex('#fff1d0'), 0.12 * (dx / raggio));
      metti(im, cx + dx, cy + dy, col);
    }
    metti(im, cx, cy, caldo('#6b4a3a'));
  };
  const C = { o: caldo('#3fb7e0'), p: caldo('#ff8fb1'), s: caldo('#fdf6ea'), R: caldo('#ffd23f'), D: caldo('#c99a1c'), S: caldo('#e2b47a'), B: caldo('#e84a5f'), H: caldo('#7a5a3a'), r: caldo('#e8463f'), b: caldo('#2f78c8'), y: caldo('#ffd23f'), w: caldo('#fffaf0') };
  const TELI = [['#e6464a', '#fdf6ea', '#2f78c8'], ['#f2c14e', '#3aa6a0'], ['#7a55c8', '#fdf6ea'], ['#ff8fb1', '#fdf6ea', '#3aa6a0'], ['#2f9fd1', '#fff4e0']];
  const OMBRELLONI = [['#ff6b5a', '#fff4e0'], ['#2f9fd1', '#fff4e0'], ['#f2c14e', '#e6464a'], ['#3aa6a0', '#fdf6ea']];
  const r = casoDa(seme * 7 + 3), alto = Math.max(4, fondoZona - 10);
  // Postazioni lungo la riva, ogni 24-34 pixel; ognuna è un telo, a volte con l'ombrellone, e qualcosa intorno
  for (let x = 2 + Math.floor(r() * 8); x < w - 6; x += 24 + Math.floor(r() * 11)) {
    const y = 2 + Math.floor(r() * Math.max(1, alto - 6)), cosa = r();
    if (cosa < 0.72) {
      const lw = 12 + Math.floor(r() * 4);
      if (x + lw < w) telo(x, y, lw, 7, TELI[Math.floor(r() * TELI.length)]!);
      if (r() < 0.6 && x + lw + 6 < w) { const o = OMBRELLONI[Math.floor(r() * OMBRELLONI.length)]!; ombrellone(x + lw + 1, y + 2, 5 + Math.floor(r() * 2), o[0]!, o[1]!); }
      if (r() < 0.45 && y + 12 < fondoZona) { const k = r() < 0.5 ? 'o' : 'p'; sprite(im, x + 3, y + 8, ['.o.', 'oso', 'sos', 'ooo', '.o.'].map(q => q.replace(/o/g, k)), C); sprite(im, x + 7, y + 9, ['.o.', 'oso', 'sos', 'ooo', '.o.'].map(q => q.replace(/o/g, k)), C); }
    } else if (cosa < 0.86) {
      ombraTonda(x - 2, y + 3, 4, 2.5);
      sprite(im, x, y, ['.RRR.', 'RDSDR', 'RSSSR', 'RDSDR', '.RRR.'], C);
      sprite(im, x + 7, y - 1, ['BB', 'BB', '.H', '.H', '.H'], C);
    } else {
      ombraTonda(x - 2, y + 3, 3, 1.5);
      sprite(im, x, y, ['.rw.', 'rrwb', 'yybb', '.yb.'], C); metti(im, x + 2, y, C.w);
    }
  }
  // Qualche fila di impronte dalla sabbia asciutta fino all'acqua
  for (let k = 0; k < 2; k++) {
    const x0 = Math.floor(r() * (w - 20)) + 10;
    for (let y = alto, j = 0; y < fondoZona; y += 3, j++) { const x = x0 + Math.round((y - alto) * 0.25) + (j % 2 ? 1 : -1); mescola(im, x, y, OMBRA, 0.26); mescola(im, x, y + 1, OMBRA, 0.14); }
  }
}

// ---------------- Le koi a pixel. Una koi è una spina di 16 punti: la testa va avanti e ogni punto segue il precedente,
// piegandosi al massimo di 0,09 radianti. Così il corpo resta morbido e non si arrotola mai. Sopra la spina passa
// un'onda leggera che cresce verso la coda. Il corpo si disegna pixel per pixel: per ogni pixel si cerca il punto più
// vicino della spina, e da lì si sa dove si è sul pesce (s: 0 testa, 1 coda; l: -1 un fianco, 1 l'altro)
const KW = daHex('#f6f2ea'), KR = daHex('#e2452c'), KK = daHex('#1f1f24'), KG = daHex('#f2b63c'), KG2 = daHex('#ffe08a'), KA = daHex('#7f9bb3'), KO = daHex('#e8743a'), BIANCO: Rgb = [255, 255, 255], OCCHIO = daHex('#26262b');
type VarietaKoi = (s: number, l: number, m: number) => Rgb;
const VARIETA_KOI: VarietaKoi[] = [
  // Kohaku: bianca con le macchie rosse
  (s, l, m) => (s > 0.04 && s < 0.78 && rumore(s * 7 + m, l * 1.3 + m * 0.7) > 0.52 ? KR : KW),
  // Sanke: come la kohaku, con qualche macchia nera piccola
  (s, l, m) => (s > 0.15 && s < 0.8 && rumore(s * 13 + m * 2, l * 2.6 + 9) > 0.74 ? KK : s > 0.04 && s < 0.78 && rumore(s * 7 + m, l * 1.3 + m * 0.7) > 0.52 ? KR : KW),
  // Showa: nera, con il rosso e il bianco
  (s, l, m) => (rumore(s * 7 + m, l * 1.4 + 3) > 0.58 ? KR : rumore(s * 9 + m * 3, l * 2 + 7) > 0.55 ? KW : KK),
  // Tancho: bianca, con un tondo rosso sulla testa
  (s, l) => (Math.hypot((s - 0.09) * 9, l * 0.9) < 0.7 ? KR : KW),
  // Ogon: tutta oro, più chiara sul dorso
  (_, l) => (Math.abs(l) < 0.35 ? KG2 : KG),
  // Asagi: il dorso azzurro, i fianchi arancio
  (s, l) => (Math.abs(l) > 0.62 && s > 0.1 ? KO : KA),
];
type Koi = { x: number; y: number; a: number; voluta: number; vel: number; L: number; spina: { x: number; y: number }[]; tipo: VarietaKoi; m: number; fase: number; onda: number; stato: 'entra' | 'nuota' | 'esce'; meta: { x: number; y: number } };
const NK = 16;
const nuovaKoi = (x: number, y: number, a: number, L: number, tipo: VarietaKoi, m: number, fase: number): Koi => ({
  x, y, a, voluta: a, vel: 0, L, tipo, m, fase, onda: fase, stato: 'nuota', meta: { x, y },
  spina: Array.from({ length: NK }, (_, i) => ({ x: x - (Math.cos(a) * L * i) / (NK - 1), y: y - (Math.sin(a) * L * i) / (NK - 1) })),
});
function muoviKoi(p: Koi, dt: number, giro: number) {
  let d = p.voluta - p.a; d = Math.atan2(Math.sin(d), Math.cos(d));
  p.a += Math.max(-giro * dt, Math.min(giro * dt, d));
  p.x += Math.cos(p.a) * p.vel * dt; p.y += Math.sin(p.a) * p.vel * dt;
  // La coda batte più in fretta quando la koi va più veloce: circa una volta ogni due secondi
  p.onda += dt * Math.PI * 2 * (0.4 + (1.2 * p.vel) / p.L);
  p.spina[0] = { x: p.x, y: p.y };
  const seg = p.L / (NK - 1);
  let dir = p.a;
  for (let i = 1; i < NK; i++) {
    const a = p.spina[i - 1]!, b = p.spina[i]!;
    let ang = Math.atan2(a.y - b.y, a.x - b.x), dd = ang - dir; dd = Math.atan2(Math.sin(dd), Math.cos(dd));
    ang = dir + Math.max(-0.09, Math.min(0.09, dd)); dir = ang;
    p.spina[i] = { x: a.x - Math.cos(ang) * seg, y: a.y - Math.sin(ang) * seg };
  }
}
// La larghezza del corpo da 0 a 1: muso tondo, la pancia larga a un terzo, poi si stringe fino all'attacco della coda
const profiloKoi = (s: number) => (s < 0.3 ? Math.sqrt(Math.max(0, s) / 0.3) : 1 - 0.76 * Math.pow(Math.min(1, (s - 0.3) / 0.52), 1.4));
// Le misure del pesce in un rettangolo intorno a lui: per ogni pixel la distanza dalla spina, dove cade (s) e da che lato
let mBest = new Float32Array(0), mS = new Float32Array(0), mD = new Float32Array(0);
function disegnaKoi(im: Immagine, p: Koi, ox: number, oy: number, t: number, ombra: Rgb) {
  // La spina che si vede: quella vera più l'onda del nuoto
  const q = p.spina.map((pt, i) => {
    const s = i / (NK - 1), a = p.spina[Math.max(0, i - 1)]!, b = p.spina[Math.min(NK - 1, i + 1)]!, ang = Math.atan2(a.y - b.y, a.x - b.x);
    const lat = p.L * (0.01 + 0.07 * s * s) * Math.sin(p.onda - s * Math.PI * 1.8);
    return { x: pt.x - Math.sin(ang) * lat + ox, y: pt.y + Math.cos(ang) * lat + oy };
  });
  const HW = p.L * 0.13, grande = p.L >= 40, medio = p.L >= 22, sh = Math.max(1, Math.round(p.L / 20)), W = HW * 1.25 + 1;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const v of q) { x0 = Math.min(x0, v.x); y0 = Math.min(y0, v.y); x1 = Math.max(x1, v.x); y1 = Math.max(y1, v.y); }
  x0 = Math.floor(x0 - W); y0 = Math.floor(y0 - W); x1 = Math.ceil(x1 + W); y1 = Math.ceil(y1 + W);
  if (x1 < -sh || y1 < -sh || x0 >= im.w || y0 >= im.h) return;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, n = bw * bh;
  if (mBest.length < n) { mBest = new Float32Array(n * 2); mS = new Float32Array(n * 2); mD = new Float32Array(n * 2); }
  mBest.fill(1e9, 0, n);
  // Ogni tratto della spina timbra solo i pixel vicini: costa poco anche per la koi grande del davanti
  for (let i = 0; i < NK - 1; i++) {
    const a = q[i]!, b = q[i + 1]!, ex = b.x - a.x, ey = b.y - a.y, l2 = ex * ex + ey * ey || 1e-6;
    const ya = Math.max(y0, Math.floor(Math.min(a.y, b.y) - W)), yb = Math.min(y1, Math.ceil(Math.max(a.y, b.y) + W));
    const xa = Math.max(x0, Math.floor(Math.min(a.x, b.x) - W)), xb = Math.min(x1, Math.ceil(Math.max(a.x, b.x) + W));
    for (let Y = ya; Y <= yb; Y++) for (let X = xa; X <= xb; X++) {
      const uu = ((X - a.x) * ex + (Y - a.y) * ey) / l2;
      // Oltre la fine della coda non c'è niente: niente tappo tondo che chiude la forcella
      if (i === NK - 2 && uu > 1) continue;
      const u = Math.max(0, Math.min(1, uu)), cx = a.x + ex * u - X, cy = a.y + ey * u - Y, d2 = cx * cx + cy * cy, j = (Y - y0) * bw + X - x0;
      if (d2 < mBest[j]!) { mBest[j] = d2; mS[j] = (i + u) / (NK - 1); mD[j] = ((X - a.x) * ey - (Y - a.y) * ex >= 0 ? 1 : -1) * Math.sqrt(d2); }
    }
  }
  // 0 niente, 1 corpo, 2 coda
  const cosa = (j: number) => {
    if (mBest[j]! > 1e8) return 0;
    const s = mS[j]!, d = Math.abs(mD[j]!);
    if (s <= 0.82 && d <= HW * profiloKoi(s) + 0.35) return 1;
    if (s > 0.78) {
      // La coda a ventaglio: si allarga verso la fine, con una forcella poco profonda
      const u = (s - 0.78) / 0.22;
      if (d <= HW * (0.3 + 0.95 * u) && !(u > 0.75 && d < HW * (u - 0.75) * 2.6)) return 2;
    }
    return 0;
  };
  // L'ombra sul fondo, spostata in basso a destra
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) if (cosa((Y - y0) * bw + X - x0)) mescola(im, X + sh, Y + sh, ombra, 0.4);
  const pinna = misto(p.tipo(0.3, 0.95, p.m), BIANCO, 0.5);
  // Le pinne pettorali, grandi, e le ventrali, piccole: remano piano, una in controfase con l'altra
  for (const [sf, lung, largo] of [[0.2, 0.2, 0.5], [0.52, 0.11, 0.45]] as const) for (const lato of [-1, 1]) {
    const i0 = Math.round(sf * (NK - 1)), a0 = q[i0]!, a1 = q[i0 + 1]!, beta = Math.atan2(a1.y - a0.y, a1.x - a0.x);
    const nx = Math.sin(beta), ny = -Math.cos(beta), bx = a0.x + nx * lato * HW * profiloKoi(sf) * 0.75, by = a0.y + ny * lato * HW * profiloKoi(sf) * 0.75;
    const fa = beta - lato * (0.65 + 0.3 * Math.sin(t * 1.7 + p.fase + lato * 1.3)), ca = Math.cos(fa), sa = Math.sin(fa), len = p.L * lung, wid = len * largo;
    for (let y = Math.floor(by - len - 1); y <= by + len + 1; y++) for (let x = Math.floor(bx - len - 1); x <= bx + len + 1; x++) {
      const rx = x - bx, ry = y - by, lungo = rx * ca + ry * sa, attra = -rx * sa + ry * ca;
      if (lungo < 0 || lungo > len) continue;
      const mezzo = wid * 0.5 * Math.sin(Math.PI * Math.min(0.999, 0.12 + (0.88 * lungo) / len));
      if (Math.abs(attra) > mezzo) continue;
      const raggio = grande && (Math.floor((attra / (lungo + 1)) * 4 + 10) & 1) === 1;
      const orlo = Math.abs(attra) > mezzo - 0.9 || lungo > len - 0.9;
      mescola(im, x, y, orlo ? scuro(pinna, 0.72) : raggio ? scuro(pinna, 0.86) : pinna, orlo ? 0.8 : 0.72);
    }
  }
  for (let Y = Math.max(0, y0); Y <= Math.min(im.h - 1, y1); Y++) for (let X = Math.max(0, x0); X <= Math.min(im.w - 1, x1); X++) {
    const j = (Y - y0) * bw + X - x0, k0 = cosa(j);
    if (!k0) continue;
    const bs = mS[j]!, d = mD[j]!;
    if (k0 === 2) { mescola(im, X, Y, medio && (Math.floor(Math.abs(d) / 1.5) & 1) ? scuro(pinna, 0.85) : pinna, 0.75); continue; }
    const hw = HW * profiloKoi(bs), l = d / Math.max(0.5, hw), al = Math.abs(l);
    let col = p.tipo(bs, l, p.m), k = 1 - Math.max(0, al - 0.55) * 0.45;
    // La luce sul dorso, le squame a rombi sulle koi grandi, la pinna dorsale come una riga scura, gli occhi
    if (al < 0.22 && bs > 0.08 && bs < 0.7) col = misto(col, BIANCO, 0.14);
    if (grande && bs > 0.17 && bs < 0.78) { const a1 = (bs * p.L + d) / 3, a2 = (bs * p.L - d) / 3; if (frazione(a1) < 0.2 || frazione(a2) < 0.2) k *= 0.92; }
    if (medio && al < 0.14 && bs > 0.33 && bs < 0.62) k *= 0.84;
    if (bs < 0.03) k *= 0.9;
    if (bs > 0.045 && bs < 0.1 && al > 0.42 && al < 0.88) { col = OCCHIO; k = 1; }
    metti(im, X, Y, scuro(col, k));
  }
}
// I colori dello stagno si leggono dal CSS una volta sola per tela: getComputedStyle a ogni fotogramma costa
const coloriStagno = new WeakMap<HTMLCanvasElement, { tav: Rgb[]; P: ReturnType<typeof tavola> }>();
const coloriKoi = (c: HTMLCanvasElement) => { let k = coloriStagno.get(c); if (!k) { k = { tav: acque(c), P: tavola(c) }; coloriStagno.set(c, k); } return k; };
// Una ninfea vista dall'alto: la foglia tonda con il taglio, le nervature, l'orlo più chiaro; alcune hanno il fiore
function ninfea(im: Immagine, cx: number, cy: number, r: number, rot: number, fiore: boolean, P: typeof TAVOLE.mono, ombra: Rgb) {
  const R = Math.ceil(r) + 1;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const dd = Math.hypot(dx, dy); if (dd > r) continue;
    let ang = Math.atan2(dy, dx) - rot; ang = Math.atan2(Math.sin(ang), Math.cos(ang));
    if (Math.abs(ang) < 0.22 && dd > 0.8) continue;
    mescola(im, cx + dx + 1, cy + dy + 1, ombra, 0.35);
  }
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const dd = Math.hypot(dx, dy); if (dd > r) continue;
    let ang = Math.atan2(dy, dx) - rot; ang = Math.atan2(Math.sin(ang), Math.cos(ang));
    if (Math.abs(ang) < 0.22 && dd > 0.8) continue;
    const vena = r > 7 && dd > 1.5 && frazione((ang / (Math.PI * 2)) * 9 + 0.5) < 0.09;
    metti(im, cx + dx, cy + dy, P.foglia[dd > r - 1.1 ? 2 : vena ? 0 : (hash(dx + 40, dy + 40) > 0.7 ? 0 : 1)]!);
  }
  if (!fiore) return;
  const fr = Math.max(1.5, r * 0.32);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + rot, x = cx - r * 0.2 + Math.cos(a) * fr, y = cy - r * 0.15 + Math.sin(a) * fr;
    metti(im, x, y, P.petali[k % 2]!);
    if (fr > 2.5) metti(im, cx - r * 0.2 + Math.cos(a) * fr * 0.55, cy - r * 0.15 + Math.sin(a) * fr * 0.55, P.petali[0]!);
  }
  metti(im, cx - r * 0.2, cy - r * 0.15, P.petali[2]!);
}
type Cerchio = { x: number; y: number; r: number; vita: number };
const disegnaCerchi = (im: Immagine, cerchi: Cerchio[], ox: number, oy: number, col: Rgb, dt: number, vel: number) => {
  for (const q of cerchi) {
    q.r += dt * vel; q.vita -= dt * 0.45;
    const n = Math.max(12, Math.round(q.r * 5));
    if (q.vita > 0.15) for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; mescola(im, q.x + ox + Math.cos(a) * q.r, q.y + oy + Math.sin(a) * q.r * 0.85, col, Math.min(1, q.vita * 1.3)); }
  }
  return cerchi.filter(q => q.vita > 0);
};

// Davanti: una koi sola, da vicino. La camera la segue: l'acqua, la luce sul fondo e le ninfee scorrono sotto di lei.
// Tutte le misure dipendono dalla lunghezza della koi, così il colpo d'occhio è lo stesso sulla colonna alta e sulla striscia larga
type KoiDavanti = { p: Koi; camX: number; camY: number; tempo: number; dir0: number; amp: number; f1: number; f2: number; foglie: { x: number; y: number; r: number; rot: number; fiore: boolean }[]; cerchi: Cerchio[]; tessera: number; r: () => number };
function koiVicina(c: HTMLCanvasElement, dt: number, dpr: number, tx: number, ty: number) {
  const im = immagine(c, dpr), { w, h } = im, { tav, P } = coloriKoi(c);
  const s = prendi<KoiDavanti>(c, () => {
    // Le prime due estrazioni del seme sono la varietà e le macchie: il retro le rifà uguali, ed è la stessa koi
    const r = casoTela(c), tipo = VARIETA_KOI[Math.floor(r() * VARIETA_KOI.length)]!, m = r() * 50;
    const largo = w > h * 1.25, L = largo ? Math.min(w * 0.55, h * 1.55) : Math.min(h * 0.7, w * 0.95);
    const dir0 = largo ? (r() < 0.5 ? 0 : Math.PI) : -Math.PI / 2 + (r() - 0.5) * 0.6;
    const p = nuovaKoi(0, 0, dir0, L, tipo, m, r() * 6); p.vel = L * 0.085;
    const tessera = Math.round(L * 2.4);
    const foglie = Array.from({ length: 3 }, (_, k) => ({ x: tessera * (k / 3 + r() * 0.2), y: tessera * r(), r: L * (0.14 + r() * 0.07), rot: r() * Math.PI * 2, fiore: k !== 1 }));
    const mezzo = p.spina[7]!;
    return { p, camX: mezzo.x, camY: mezzo.y, tempo: r() * 30, dir0, amp: largo ? 0.22 : 0.5, f1: r() * 6, f2: r() * 6, foglie, cerchi: [], tessera, r };
  });
  s.tempo += dt;
  const t = s.tempo, p = s.p, z = 64 / p.L;
  // La direzione cambia piano, con due onde lente: la koi curva dolce e non torna mai su se stessa
  p.voluta = s.dir0 + s.amp * (Math.sin(t * 0.13 + s.f1) * 0.7 + Math.sin(t * 0.29 + s.f2) * 0.3);
  p.vel += (p.L * (0.085 + 0.025 * Math.sin(t * 0.21 + s.f1)) - p.vel) * Math.min(1, dt);
  muoviKoi(p, dt, 0.35);
  const mezzo = p.spina[7]!, kc = Math.min(1, dt * 1.5);
  s.camX += (mezzo.x - s.camX) * kc; s.camY += (mezzo.y - s.camY) * kc;
  // La camera si sposta a pixel interi: il fondo scorre netto, senza retinatura che tremola
  const ox = Math.round(w / 2 - s.camX), oy = Math.round(h / 2 - s.camY);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wx = (x - ox) * z, wy = (y - oy) * z;
    const fondo = rumore(wx * 0.03, wy * 0.03) * 0.6 + rumore(wx * 0.08 + 5, wy * 0.08) * 0.4;
    // La luce sul fondo: una rete di righe chiare che cambia forma piano
    const rete = 1 - Math.abs(2 * rumore(wx * 0.07 + t * 0.05 + tx * 0.3, wy * 0.07 - t * 0.04 + ty * 0.3) - 1);
    metti(im, x, y, tono(tav, 0.42 + (fondo - 0.5) * 0.35 + (rete > 0.9 ? 0.22 : rete > 0.8 ? 0.08 : 0), x - ox, y - oy));
  }
  // Le ninfee scorrono sotto la koi: lei resta sempre tutta in vista. Il fondo si ripete ogni "tessera"
  for (const f of s.foglie) {
    const T = s.tessera, bx = ((((f.x + ox) % T) + T) % T), by = ((((f.y + oy) % T) + T) % T);
    for (const X of [bx, bx - T]) for (const Y of [by, by - T]) if (X > -f.r - 2 && X < w + f.r + 2 && Y > -f.r - 2 && Y < h + f.r + 2) ninfea(im, X, Y + Math.sin(t * 0.6 + f.x) * 0.4, f.r, f.rot, f.fiore, P, tav[0]!);
  }
  disegnaKoi(im, p, ox, oy, t, tav[0]!);
  // Cerchi nell'acqua: ogni tanto uno vicino alla testa, ogni tanto uno lontano
  if (s.r() < dt * 0.35) { const q = p.spina[0]!; s.cerchi.push({ x: q.x + (s.r() - 0.5) * 4, y: q.y + (s.r() - 0.5) * 4, r: 0, vita: 1 }); }
  if (s.r() < dt * 0.25) s.cerchi.push({ x: (s.r() * w) - ox, y: (s.r() * h) - oy, r: 0, vita: 1 });
  s.cerchi = disegnaCerchi(im, s.cerchi, ox, oy, tav[4]!, dt, p.L * 0.07);
  mostra(c, im, dpr);
}

// Dietro: lo stagno intero, visto da più in alto. All'inizio c'è solo la koi del davanti; quando si gira il biglietto
// le altre entrano dai bordi, una ogni 4 secondi, fino a 7-9. Dopo mezzo minuto escono piano una alla volta, resta
// di nuovo lei sola, e si ricomincia
type StagnoPx = { pesci: Koi[]; ninfee: { x: number; y: number; r: number; rot: number; fiore: boolean }[]; cerchi: Cerchio[]; tempo: number; visto: number; pieno: number; esce: number; fase: 'cresce' | 'svuota'; N: number; L: number; r: () => number };
function stagnoPixel(c: HTMLCanvasElement, dt: number, dpr: number, tx: number, ty: number) {
  const im = immagine(c, dpr), { w, h } = im, { tav, P } = coloriKoi(c);
  const s = prendi<StagnoPx>(c, () => {
    const r = casoTela(c), tipo = VARIETA_KOI[Math.floor(r() * VARIETA_KOI.length)]!, m = r() * 50;
    const L = Math.max(15, Math.min(30, Math.min(w * 0.24, h * 0.42)));
    const prima = nuovaKoi(w * 0.5, h * 0.5, r() * Math.PI * 2, L * 1.1, tipo, m, r() * 6);
    const ninfee = Array.from({ length: 4 }, (_, k) => ({ x: w * [0.12, 0.83, 0.62, 0.3][k]! + (r() - 0.5) * 8, y: h * [0.3, 0.25, 0.78, 0.84][k]! + (r() - 0.5) * 6, r: Math.max(4, Math.min(9, L * 0.3)) * (0.8 + r() * 0.4), rot: r() * Math.PI * 2, fiore: k % 2 === 0 }));
    return { pesci: [prima], ninfee, cerchi: [], tempo: r() * 30, visto: 0, pieno: 0, esce: 0, fase: 'cresce', N: 7 + Math.floor(r() * 3), L, r };
  });
  s.tempo += dt;
  const t = s.tempo, r = s.r;
  // Il tempo dello stagno corre solo con il retro in vista: prima del giro c'è solo lei
  if (c.closest('.girata') && c.dataset.side !== 'front') {
    if (s.fase === 'cresce') {
      s.visto += dt;
      if (s.pesci.length < Math.min(s.N, 1 + Math.floor(s.visto / 4))) {
        // Entra da un bordo a caso, già orientata verso un punto dentro lo stagno
        const L = s.L * (0.8 + r() * 0.35), lato = Math.floor(r() * 4), fuori = L * 0.4;
        const x = lato === 0 ? -fuori : lato === 1 ? w + fuori : w * (0.15 + r() * 0.7), y = lato === 2 ? -fuori : lato === 3 ? h + fuori : h * (0.2 + r() * 0.6);
        const meta = { x: w * (0.3 + r() * 0.4), y: h * (0.3 + r() * 0.4) };
        const k = nuovaKoi(x, y, Math.atan2(meta.y - y, meta.x - x), L, VARIETA_KOI[Math.floor(r() * VARIETA_KOI.length)]!, r() * 50, r() * 6);
        k.stato = 'entra'; k.meta = meta; k.vel = L * 0.2; s.pesci.push(k);
      }
      if (s.pesci.length >= s.N && s.pesci.every(p => p.stato === 'nuota') && (s.pieno += dt) > 30) { s.fase = 'svuota'; s.esce = 0; }
    } else if ((s.esce += dt) > 2.5) {
      s.esce = 0;
      const k = s.pesci.slice(1).reverse().find(p => p.stato !== 'esce');
      if (k) {
        // Esce dal bordo più vicino
        k.stato = 'esce';
        const dl = [k.x, w - k.x, k.y, h - k.y], i = dl.indexOf(Math.min(...dl));
        k.meta = [{ x: -999, y: k.y }, { x: w + 999, y: k.y }, { x: k.x, y: -999 }, { x: k.x, y: h + 999 }][i]!;
      } else if (s.pesci.length === 1) { s.fase = 'cresce'; s.visto = 0; s.pieno = 0; }
    }
  }
  // L'acqua: un fondo a macchie larghe e la luce a chiazze, che scorrono piano e seguono l'inclinazione
  const FONDO = campo(c, 'fondo', w, h, (x, y) => frattale(x * 0.03 + 11, y * 0.03 + 5));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const luce = rumore(x * 0.07 + t * 0.04 + tx, y * 0.09 - t * 0.03 + ty) * 0.65 + rumore(x * 0.15 + t * 0.06 + 7, y * 0.19 - t * 0.05) * 0.35, fondo = FONDO[y * w + x]!;
    metti(im, x, y, tono(tav, 0.22 + (fondo - 0.5) * 0.4 + (luce > 0.68 ? 0.4 : luce > 0.6 ? 0.18 : 0), x, y));
  }
  for (const p of s.pesci) {
    const m = p.L * 0.45 + 3;
    if (p.stato === 'nuota') {
      if (r() < dt * 0.25) p.voluta = p.a + (r() - 0.5) * 2;
      if (p.x < m) p.voluta = 0; else if (p.x > w - m) p.voluta = Math.PI; else if (p.y < m) p.voluta = Math.PI / 2; else if (p.y > h - m) p.voluta = -Math.PI / 2;
    } else {
      p.voluta = Math.atan2(p.meta.y - p.y, p.meta.x - p.x);
      if (p.stato === 'entra' && p.x > m && p.x < w - m && p.y > m && p.y < h - m) p.stato = 'nuota';
    }
    p.vel += ((0.2 + 0.07 * Math.sin(t * 0.3 + p.fase)) * p.L - p.vel) * Math.min(1, dt);
    muoviKoi(p, dt, 0.8);
    if (r() < dt * 0.05) s.cerchi.push({ x: p.x, y: p.y, r: 0, vita: 1 });
  }
  // Chi è uscita del tutto, con la coda, sparisce
  s.pesci = s.pesci.filter(p => p.stato !== 'esce' || p.spina.some(q => q.x > -3 && q.x < w + 3 && q.y > -3 && q.y < h + 3));
  for (const p of [...s.pesci].sort((a, b) => a.L - b.L)) disegnaKoi(im, p, 0, 0, t, tav[0]!);
  for (const n of s.ninfee) ninfea(im, n.x, n.y + Math.sin(t * 0.6 + n.x) * 0.5, n.r, n.rot, n.fiore, P, tav[0]!);
  s.cerchi = disegnaCerchi(im, s.cerchi, 0, 0, tav[4]!, dt, 6);
  mostra(c, im, dpr);
}

// Un prato in pixel art, in prospettiva: steli sottili che il vento piega dalla punta, fiori a croce grandi davanti e
// puntini all'orizzonte, una fascia di foschia retinata. Di notte: cielo stellato con la foschia blu,
// qualche lanterna gialla che galleggia bassa; il prato nei nostri verdi. Di giorno: cielo chiaro e margheritine.
// Disegnato da zero, nessun fotogramma del riferimento
type FiorePrato = { x: number; z: number; h: number; fase: number; colore: number };
type StatoPrato = { fiori: FiorePrato[]; steli: { x: number; z: number; h: number; fase: number }[]; stelle: { x: number; y: number; fase: number }[]; lanterne: { x: number; y: number; v: number; fase: number }[] };
const BAYER2 = [0, 2, 3, 1];
function pratoPixel(c: HTMLCanvasElement, tempo: number) {
  const notte = c.dataset.scena === 'prato-notte';
  const g = c.getContext('2d'); if (!g) return;
  const w = c.width, h = c.height;
  if (!w || !h) return;
  const s = prendi<StatoPrato>(c, () => {
    const r = casoTela(c), fiori: FiorePrato[] = [], steli: StatoPrato['steli'] = [];
    // Più fiori lontano che vicino: la profondità z va da 0 (orizzonte) a 1 (davanti)
    // Tanti fiori, anche vicinissimi: arrivano fino al bordo in basso, cioè fino alla camera
    for (let i = 0; i < 640; i++) fiori.push({ x: r() * 1.1 - 0.05, z: Math.pow(r(), 1.25), h: 0.8 + r() * 0.4, fase: r() * 6.28, colore: r() });
    for (let i = 0; i < 520; i++) steli.push({ x: r() * 1.1 - 0.05, z: Math.pow(r(), 1.5), h: 0.4 + r() * 0.5, fase: r() * 6.28 });
    fiori.sort((a, b) => a.z - b.z); steli.sort((a, b) => a.z - b.z);
    return { fiori, steli, stelle: Array.from({ length: 90 }, () => ({ x: r(), y: r(), fase: r() * 6.28 })), lanterne: Array.from({ length: 4 }, () => ({ x: r(), y: r(), v: 0.004 + r() * 0.006, fase: r() * 6.28 })) };
  });
  // Una griglia bassa, ingrandita senza sfumare: i pixel restano netti
  // Pixel più grandi: il prato è più vicino, i fiori si vedono di più
  const scala = Math.max(1, Math.round(Math.min(w, h) / 112));
  const W = Math.max(1, Math.round(w / scala)), H = Math.max(1, Math.round(h / scala));
  const im = prendiPrato(c, W, H), p = im.ctx;
  p.imageSmoothingEnabled = false;
  const T = notte
    // Notte: il cielo stellato e la foschia blu come nel riferimento; il prato nei nostri verdi, fiori lime, verde chiaro e menta
    ? { cielo: '#05060f', alto: '#0a0d22', foschia: ['#141c44', '#1f2c62', '#2c3d80'], terra: '#06120c', macchia: '#0c2017', stelo: ['#163e29', '#2b653e', '#3a8551'], fiore: ['#f4ff68', '#a8ff74', '#65e7a0'], cuore: ['#faffc1', '#faffc1', '#e8fff1'] }
    // Giorno: margheritine, petali bianchi e cuore giallo, qualche fiore giallo e qualche rosa chiaro
    : { cielo: '#bfe3f2', alto: '#8fc9e6', foschia: ['#d9eef4', '#cfe6ee', '#bcdbe6'], terra: '#3f6b3e', macchia: '#4e7c45', stelo: ['#2f5a2f', '#3f7238', '#5a8c43'], fiore: ['#ffffff', '#ffffff', '#ffd2dc'], cuore: ['#f5c518', '#f5c518', '#f5c518'] };
  const oriz = Math.round(H * 0.26);
  // Il cielo: due toni retinati; di notte le stelle che brillano piano
  for (let y = 0; y < oriz; y++) for (let x = 0; x < W; x++) {
    const k = y / oriz, soglia = BAYER2[(y & 1) * 2 + (x & 1)]! / 4;
    p.fillStyle = k * 1.2 > soglia + 0.35 ? T.alto : T.cielo; p.fillRect(x, y, 1, 1);
  }
  if (notte) for (const st of s.stelle) {
    if (st.y * oriz > oriz - 4) continue;
    p.fillStyle = Math.sin(tempo * 1.7 + st.fase) > 0.6 ? '#ffffff' : '#4a5378';
    p.fillRect(Math.floor(st.x * W), Math.floor(st.y * (oriz - 6)), 1, 1);
  }
  // La foschia all'orizzonte: tre fasce, la retinatura fa il passaggio fra l'una e l'altra
  for (let y = oriz - 6; y < oriz + 4; y++) for (let x = 0; x < W; x++) {
    const k = (y - (oriz - 6)) / 10, f = Math.min(2, Math.floor(k * 3 + BAYER2[(y & 1) * 2 + (x & 1)]! / 4));
    p.fillStyle = T.foschia[f]!; p.fillRect(x, y, 1, 1);
  }
  // La terra, con macchie scure retinate che danno profondità
  for (let y = oriz + 4; y < H; y++) for (let x = 0; x < W; x++) {
    const m = rumore(x * 0.12, y * 0.25) > 0.62 && BAYER2[(y & 1) * 2 + (x & 1)]! < 2;
    p.fillStyle = m ? T.macchia : T.terra; p.fillRect(x, y, 1, 1);
  }
  // Il vento: raffiche lente e morbide che attraversano il prato, più un tremolio appena accennato per ogni fiore
  const vento = (x: number, z: number, fase: number) => Math.sin(tempo * 0.45 - x * 3.2 - z * 1.1) * 0.32 + Math.sin(tempo * 0.2 - x * 1.6) * 0.12 + Math.sin(tempo * 0.9 + fase) * 0.04;
  // La base dei fiori vicini scende sotto il bordo: in basso si vedono solo le corolle
  const suolo = (z: number) => oriz + 3 + z * (H - oriz + 34);
  // Gli steli: lunghi e sottili davanti, cortissimi lontano. La base resta ferma, la punta si piega
  for (const st of s.steli) {
    const x = st.x * W, y = suolo(st.z), alt = (1.5 + st.z * H * 0.3) * st.h, piega = vento(st.x, st.z, st.fase) * Math.min(6, alt * 0.18);
    p.fillStyle = T.stelo[Math.min(2, Math.floor(st.z * 2.2 + st.h * 0.4))]!;
    const passi = Math.max(1, Math.round(alt));
    for (let k = 0; k < passi; k++) { const u = k / passi; p.fillRect(Math.round(x + piega * u * u), Math.round(y - alt * u), 1, 1); }
  }
  // I fiori a croce: un puntino lontano, una croce piccola a metà, una croce grande con il cuore davanti
  for (const f of s.fiori) {
    const x = f.x * W, y = suolo(f.z), alt = (2 + f.z * H * 0.3) * f.h, piega = vento(f.x, f.z, f.fase) * Math.min(7, alt * 0.2);
    const passi = Math.max(1, Math.round(alt));
    p.fillStyle = T.stelo[f.z > 0.5 ? 2 : 1]!;
    for (let k = 0; k < passi; k++) { const u = k / passi; p.fillRect(Math.round(x + piega * u * u), Math.round(y - alt * u), 1, 1); }
    const fx = Math.round(x + piega), fy = Math.round(y - alt), ti = f.colore < 0.55 ? 0 : f.colore < 0.85 ? 1 : 2;
    p.fillStyle = T.fiore[ti]!;
    if (f.z < 0.2) { p.fillRect(fx, fy, 1, 1); continue; }
    const d = f.z < 0.5 ? 1 : f.z < 0.82 ? 2 : 3;
    p.fillRect(fx - d, fy, d * 2 + 1, 1); p.fillRect(fx, fy - d, 1, d * 2 + 1);
    if (d >= 2) { p.fillRect(fx - 1, fy - 1, 3, 3); if (d === 3) { p.fillRect(fx - 2, fy - 1, 5, 3); p.fillRect(fx - 1, fy - 2, 3, 5); } p.fillStyle = T.cuore[ti]!; p.fillRect(fx, fy, 1, 1); if (d === 3) p.fillRect(fx - 1, fy, 2, 1); }
    else if (!notte) { p.fillStyle = T.cuore[ti]!; p.fillRect(fx, fy, 1, 1); }
  }
  // Le lanterne: poche luci gialle che galleggiano basse sopra l'orizzonte e pulsano piano
  if (notte) for (const l of s.lanterne) {
    const x = Math.round(((l.x + tempo * l.v) % 1.1 - 0.05) * W), y = Math.round(oriz - 3 - l.y * 6 + Math.sin(tempo * 0.8 + l.fase) * 1.5);
    p.fillStyle = Math.sin(tempo * 2 + l.fase) > -0.3 ? '#ffd84a' : '#b88a1c';
    p.fillRect(x, y, 2, 1); p.fillStyle = '#fff1a8'; p.fillRect(x, y, 1, 1);
    p.fillStyle = 'rgba(255,216,74,.18)'; p.fillRect(x - 2, y - 1, 6, 3);
  }
  g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false; g.drawImage(im.canvas, 0, 0, w, h);
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
type Robot = { x: number; z: number; vx: number; vz: number; dir: number; meta: number; passo: number; vel: number; scala: number; timer: number; fermo: boolean; sguardo: number; timerSguardo: number; capo: boolean; rosso?: boolean };
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
  // Uno solo, in mezzo alla folla, ha la testa rossa
  robot[1 + Math.floor(r() * 72)]!.rosso = true;
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
  // Il passo è un ciclo continuo: una gamba avanti e l'altra indietro, il piede si alza quando la gamba torna avanti,
  // il ginocchio si piega in avanti, il bacino scende sul passo. Da fermo le gambe restano unite
  const fase = p.passo * Math.PI / 2, muove = p.fermo ? 0 : 1, sw = Math.sin(fase) * muove;
  const x0 = Math.round(sx), y0 = Math.round(sy), giu = Math.round(Math.abs(Math.sin(fase)) * H * 0.025 * muove);
  const anca = y0 - Math.round(H * .46) + giu, spalla = y0 - Math.round(H * .76) + giu, testa = y0 - Math.round(H * .88) + giu;
  const mezzo = Math.max(1, Math.round(H * (.035 + .045 * Math.abs(cz))));
  // Ombra a trattino sul terreno, verso destra
  g.fillStyle = 'rgba(110,210,190,.22)'; g.fillRect(x0 - 1, y0 + 1, Math.max(3, Math.round(H * .42)), 1);
  g.fillStyle = '#eef8f4';
  for (const lato of [-1, 1]) {
    const s = sw * lato, avanti = Math.cos(fase) * lato * muove;
    const ax = x0 + lato * Math.min(1, mezzo);
    const fx = x0 + lato + s * H * .18 * cx, fy = y0 + s * H * .05 * cz - Math.max(0, avanti) * H * .05;
    const piega = Math.max(0, avanti) * H * .06 + .02 * H;
    const kx = (ax + fx) / 2 + piega * cx, ky = (anca + fy) / 2 - piega * .2;
    pixLinea(g, ax, anca, kx, ky); pixLinea(g, kx, ky, fx, fy);
  }
  // Busto a rettangolo
  pixLinea(g, x0 - mezzo, spalla, x0 + mezzo, spalla); pixLinea(g, x0 - mezzo, anca, x0 + mezzo, anca);
  pixLinea(g, x0 - mezzo, spalla, x0 - mezzo, anca); pixLinea(g, x0 + mezzo, spalla, x0 + mezzo, anca);
  // Braccia con il gomito, in controfase con le gambe
  for (const lato of [-1, 1]) {
    const s = -sw * lato, sx0 = x0 + lato * mezzo, mano = anca - Math.round(H * .03);
    const ex = sx0 + lato * .6 + s * H * .05 * cx, ey = (spalla + mano) / 2;
    const hx = sx0 + lato + s * H * .13 * cx, hy = mano + s * H * .03 * cz - Math.abs(s) * H * .03;
    pixLinea(g, sx0, spalla, ex, ey); pixLinea(g, ex, ey, hx, hy);
  }
  // Testa: cranio scuro con il contorno chiaro e la sfera di luce dentro.
  // La sfera segue lo sguardo: al centro di fronte, sul lato di profilo, spenta quando il robot dà le spalle
  const rt = Math.max(2, Math.round(H * .075));
  pixLinea(g, x0, spalla, x0, testa + rt);
  g.fillStyle = '#031410'; pixCerchio(g, x0, testa, rt, true);
  g.fillStyle = '#eef8f4'; pixCerchio(g, x0, testa, rt, false);
  const sguardo = d + p.sguardo, verso = Math.sin(sguardo), sx2 = x0 + Math.round(Math.cos(sguardo) * (rt - 1) * .65);
  if (verso > -.35) {
    const rs = Math.max(1, Math.round(rt * .45));
    g.fillStyle = p.rosso ? 'rgba(255,80,60,.32)' : 'rgba(110,255,220,.28)'; g.fillRect(sx2 - rs - 1, testa - rs - 1, rs * 2 + 3, rs * 2 + 3);
    g.fillStyle = p.rosso ? '#ff4a3d' : '#62f3d2'; pixCerchio(g, sx2, testa, rs, true);
    g.fillStyle = '#e8fff8'; g.fillRect(sx2, testa - (rs > 1 ? 1 : 0), 1, 1);
  } else { g.fillStyle = p.rosso ? '#8a2a22' : '#2b6a60'; g.fillRect(sx2, testa, 1, 1); }
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
  const altezza = davanti ? Math.min(ch * .54, cw * .35) : Math.min(ch * .27, cw * .14);
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
  // Sul terreno solo le ombre dei robot (le disegna ogni robot)
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
// --- Le bolle. Una schiuma di bolle di vetro in 3D: ogni bolla spinge via quelle che tocca ed è tirata verso il centro,
// così il grappolo resta unito. Ogni tanto una bolla del guscio scoppia: le altre si risistemano da sole e una bolla
// nuova cresce in superficie. Una membrana trasparente unisce le bolle che si toccano. Il grappolo gira con
// l'inclinazione: il nucleo subito, il guscio in ritardo con una molla, come una gelatina
type Bolla = { x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; R: number; col: number; fase: number; scoppio: number };
type Schiuma = { bolle: Bolla[]; sprite: HTMLCanvasElement[][]; nucleo: { a: number; b: number }; guscio: { a: number; b: number; va: number; vb: number }; prossimo: number; gocce: { x: number; y: number; vx: number; vy: number; vita: number; col: number; l: number }[]; velo: HTMLCanvasElement; rnd: () => number };
// Sfere solide e lucide, colori accesi: verde, azzurro, lilla, e qualche bianca
const TONI_SFERE = [['#b8ffcf', '#22e06b', '#0a7a3a'], ['#c9f0ff', '#2fb4ff', '#0b5fa8'], ['#eadcff', '#b07cff', '#5b2fb8'], ['#d8fff0', '#2ee6c0', '#0b8270'], ['#ffffff', '#eef2ff', '#9aa3c8']];
const COLORI_GOCCE = ['#22e06b', '#2fb4ff', '#b07cff', '#2ee6c0', '#ffffff'];
function spriteSfera(tono: string[], sfoca: number) {
  const k = document.createElement('canvas'), L = 96; k.width = k.height = L;
  const g = k.getContext('2d')!, c = L / 2, R = L / 2 - 8;
  if (sfoca) g.filter = `blur(${sfoca}px)`;
  // Una sfera piena e lucida: luce dall'alto a sinistra, ombra in basso a destra, un riflesso di luce sul bordo
  const corpo = g.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.05, c, c, R);
  corpo.addColorStop(0, tono[0]!); corpo.addColorStop(0.45, tono[1]!); corpo.addColorStop(1, tono[2]!);
  g.fillStyle = corpo; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
  const bordo = g.createRadialGradient(c + R * 0.45, c + R * 0.5, 0, c + R * 0.45, c + R * 0.5, R * 0.55);
  bordo.addColorStop(0, tono[0]! + '88'); bordo.addColorStop(1, tono[0]! + '00');
  g.fillStyle = bordo; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(c - R * 0.36, c - R * 0.42, R * 0.18, R * 0.11, -0.6, 0, Math.PI * 2); g.fill();
  return k;
}
function sfereTela(c: HTMLCanvasElement, t: number, dt: number, tx: number, ty: number) {
  const W = c.width, H = c.height, g = c.getContext('2d')!, retro = c.dataset.side === 'back';
  const nuova = (r: () => number, x: number, y: number, z: number, R: number): Bolla => ({ x, y, z, vx: 0, vy: 0, vz: 0, r: 0.002, R, col: r() < 0.1 ? 4 : Math.floor(r() * 4), fase: r() * 6.28, scoppio: 0 });
  const s = prendi<Schiuma>(c, () => {
    const r = casoTela(c), n = retro ? 170 : 90, bolle: Bolla[] = [];
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, a = r() * Math.PI * 2, q = Math.cbrt(r()) * 0.75, sq = Math.sqrt(1 - u * u);
      const b = nuova(r, Math.cos(a) * sq * q, u * q, Math.sin(a) * sq * q, 0.07 + r() ** 2 * 0.13); b.r = b.R; bolle.push(b);
    }
    const velo = document.createElement('canvas');
    return { bolle, sprite: TONI_SFERE.map(tono => [0, 2.5, 6].map(bl => spriteSfera(tono, bl))), nucleo: { a: 0, b: 0 }, guscio: { a: 0, b: 0, va: 0, vb: 0 }, prossimo: t + 1.2, gocce: [], velo, rnd: r };
  });
  const h = Math.min(dt, 0.05), B = s.bolle, rnd = s.rnd;
  // La fisica: le bolle si spingono via dove si sovrappongono, e tutte sono tirate verso il centro
  for (let i = 0; i < B.length; i++) {
    const a = B[i]!;
    if (a.r < a.R && !a.scoppio) a.r = Math.min(a.R, a.r + h * 0.12);
    a.vx -= a.x * 1.6 * h; a.vy -= a.y * 1.6 * h; a.vz -= a.z * 1.6 * h;
    for (let j = i + 1; j < B.length; j++) {
      const b = B[j]!, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1e-4, m = (a.r + b.r) * 0.92 - d;
      if (m > 0) { const f = m * 18 * h / d; a.vx -= dx * f; a.vy -= dy * f; a.vz -= dz * f; b.vx += dx * f; b.vy += dy * f; b.vz += dz * f; }
    }
  }
  for (const a of B) { a.vx *= 0.9; a.vy *= 0.9; a.vz *= 0.9; a.x += a.vx * h * 6; a.y += a.vy * h * 6; a.z += a.vz * h * 6; }
  // Lo scoppio: ogni 0,9–2,2 secondi una bolla del guscio; al suo posto, dopo poco, ne cresce una nuova in superficie
  if (t > s.prossimo) {
    s.prossimo = t + 0.9 + rnd() * 1.3;
    const fuori = B.filter(b => !b.scoppio && b.r > 0.06).sort((p1, p2) => Math.hypot(p2.x, p2.y, p2.z) - Math.hypot(p1.x, p1.y, p1.z)).slice(0, 12);
    const v = fuori[Math.floor(rnd() * fuori.length)];
    if (v) v.scoppio = 0.001;
  }
  for (let i = B.length - 1; i >= 0; i--) {
    const b = B[i]!;
    if (!b.scoppio) continue;
    b.scoppio += h * 5;
    if (b.scoppio >= 1) {
      B.splice(i, 1);
      const d = Math.hypot(b.x, b.y, b.z) || 1, a = rnd() * Math.PI * 2;
      B.push(nuova(rnd, b.x / d * 0.5 + Math.cos(a) * 0.1, b.y / d * 0.5 + Math.sin(a) * 0.1, b.z / d * 0.5, 0.07 + rnd() ** 2 * 0.13));
    }
  }
  // Le due rotazioni: il nucleo segue l'inclinazione e un giro lento; il guscio lo insegue con una molla smorzata
  s.nucleo.a = t * 0.16 + tx * 0.9; s.nucleo.b = ty * 0.6 + Math.sin(t * 0.3) * 0.15;
  s.guscio.va += ((s.nucleo.a - s.guscio.a) * 38 - s.guscio.va * 5.5) * h; s.guscio.a += s.guscio.va * h;
  s.guscio.vb += ((s.nucleo.b - s.guscio.b) * 38 - s.guscio.vb * 5.5) * h; s.guscio.b += s.guscio.vb * h;
  // Lo sfondo: verde bosco, con un alone giallo dietro il grappolo
  g.fillStyle = '#0f1226'; g.fillRect(0, 0, W, H);
  const cx = W * 0.5, cy = H * 0.5, R = Math.min(W, H) * (retro ? 0.5 : 0.44);
  const alone = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.8);
  alone.addColorStop(0, 'rgba(120,200,255,.22)'); alone.addColorStop(0.5, 'rgba(176,124,255,.08)'); alone.addColorStop(1, 'rgba(15,18,38,0)');
  g.fillStyle = alone; g.fillRect(0, 0, W, H);
  const punti = B.map(q => {
    const dd = Math.hypot(q.x, q.y, q.z), peso = Math.min(1, dd * 1.3), a = s.nucleo.a + (s.guscio.a - s.nucleo.a) * peso, b = s.nucleo.b + (s.guscio.b - s.nucleo.b) * peso;
    const resp = 1 + 0.025 * Math.sin(t * 1.4 + q.fase);
    const ca = Math.cos(a), sa = Math.sin(a), x1 = q.x * ca - q.z * sa, z1 = q.x * sa + q.z * ca;
    const cb = Math.cos(b), sb = Math.sin(b), y1 = q.y * cb - z1 * sb, z2 = q.y * sb + z1 * cb, prosp = 2.6 / (2.6 - z2);
    return { X: cx + x1 * R * prosp, Y: cy + y1 * R * prosp, Z: z2, S: q.r * R * prosp * resp * (1 + q.scoppio * 0.35), col: q.col, sc: q.scoppio };
  }).sort((p1, p2) => p1.Z - p2.Z);
  // La membrana: tutte le bolle un po' più grandi, su un velo a parte; dove si toccano il velo è continuo
  const v = s.velo; if (v.width !== W || v.height !== H) { v.width = W; v.height = H; }
  const gv = v.getContext('2d')!; gv.clearRect(0, 0, W, H); gv.fillStyle = '#9fd8ff';
  for (const q of punti) if (!q.sc) { gv.beginPath(); gv.arc(q.X, q.Y, q.S * 1.12, 0, Math.PI * 2); gv.fill(); }
  g.save(); g.globalAlpha = 0.08; g.filter = `blur(${(R * 0.02).toFixed(1)}px)`; g.drawImage(v, 0, 0); g.restore();
  for (const q of punti) {
    // Lontane: sfocate e trasparenti; vicinissime: un po' sfocate, come la profondità di campo
    const fuoco = q.Z < -0.45 ? 2 : q.Z < -0.1 ? 1 : q.Z > 0.85 ? 1 : 0;
    g.globalAlpha = (0.8 + 0.2 * Math.min(1, (q.Z + 1) / 1.2)) * (1 - q.sc);
    const L = q.S * 2 * (96 / 80);
    g.drawImage(s.sprite[q.col]![fuoco]!, q.X - L / 2, q.Y - L / 2, L, L);
    // Lo scoppio: un anello sottile che si allarga e qualche goccia
    if (q.sc) {
      g.globalAlpha = 1 - q.sc; g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, q.S * 0.06);
      g.beginPath(); g.arc(q.X, q.Y, q.S * (1 + q.sc * 0.6), 0, Math.PI * 2); g.stroke();
      if (q.sc < 0.25) for (let k = 0; k < 14; k++) { const a = rnd() * Math.PI * 2, vv = q.S * (2 + rnd() * 4); s.gocce.push({ x: q.X + Math.cos(a) * q.S * 0.8, y: q.Y + Math.sin(a) * q.S * 0.8, vx: Math.cos(a) * vv, vy: Math.sin(a) * vv, vita: 0.7, col: q.col, l: Math.max(2, q.S * (0.12 + rnd() * 0.12)) }); }
    }
  }
  s.gocce = s.gocce.filter(d => (d.vita -= h) > 0);
  for (const d of s.gocce) { d.x += d.vx * h; d.y += d.vy * h; d.vy += R * 0.9 * h; g.globalAlpha = Math.min(1, d.vita * 1.6); g.fillStyle = COLORI_GOCCE[d.col]!; g.beginPath(); g.arc(d.x, d.y, d.l * Math.min(1, d.vita * 1.5), 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
}
