// Le illustrazioni dei biglietti di AI terms, in SVG, nello stile "70s Rapid": campiture piene, due o tre colori per
// sezione, bande anni '70, una forma in foglia metallica. Davanti un oggetto della tecnologia, a volte animato
// (antenna, terminale, nastro perforato). Dietro un poster con il sole in foglia. Il metallo è fisso per disegno:
// argento con l'antenna, oro con il PC e con il nastro perforato. I gradienti della foglia hanno la classe
// "foglia-svg": il biglietto li gira con l'inclinazione.
// Niente testo delle note entra qui, tranne dove passa da esc().

export type Livello = 'easy' | 'medium' | 'hard';
const INK = '#17161b', CREMA = '#f3e7cf';
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
let uid = 0;

// Ogni sezione è un tipo di biglietto: la carta, due colori di stampa, la carta di sicurezza del tagliando, il motto
export const TIPI = [
  { carta: '#23457a', a: '#f2b33d', b: CREMA, tagliando: '#f4e6bd', trama: 'rgba(190,140,40,.45)', motto: 'WORDS FIRST' },
  { carta: '#5b2e7a', a: '#f28ab3', b: CREMA, tagliando: '#f6dfe5', trama: 'rgba(214,90,120,.45)', motto: 'MAKE IT NEW' },
  { carta: '#e5532b', a: '#1d2b4a', b: '#f7cf4f', tagliando: '#f6dfe5', trama: 'rgba(214,90,120,.45)', motto: 'SAFE PASSAGE' },
  { carta: '#2f6e52', a: '#f2b33d', b: CREMA, tagliando: '#e2efe4', trama: 'rgba(60,130,90,.45)', motto: 'ASK IT WELL' },
  { carta: '#18606a', a: '#f0603f', b: CREMA, tagliando: '#dfeaf2', trama: 'rgba(70,110,170,.42)', motto: 'KEEP RUNNING' },
  { carta: '#b3305f', a: '#f7cf4f', b: '#2a1f3a', tagliando: '#f4e6bd', trama: 'rgba(190,140,40,.45)', motto: 'ALL THE REST' },
] as const;
export const tipo = (sezione: number) => TIPI[sezione % TIPI.length]!;

// Due metalli soltanto, fissi per disegno: l'antenna è argento, il PC e il nastro perforato sono oro.
// Il metallo non dipende più dal livello: il livello resta per i brillantini dei termini difficili.
export type Metallo = 'argento' | 'oro';
const METALLI: Record<Metallo, string[]> = {
  argento: ['#7d8792', '#f3f6f9', '#98a2ad', '#ffffff', '#828c97'],
  oro: ['#8d6418', '#f8dc8c', '#b88a2a', '#fff2c4', '#94681a'],
};
const foglia = (id: string, m: Metallo) => `<linearGradient id="f${id}" class="foglia-svg" x1="0" y1="0" x2="1" y2="0" spreadMethod="reflect">${METALLI[m].map((c, i) => `<stop offset="${i / 4}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const F = (id: string) => `url(#f${id})`;
// Brillantini, solo per i termini difficili
const brilla = (l: Livello, punti: [number, number][]) => l !== 'hard' ? '' : punti.map(([x, y], i) => `<path d="M${x} ${y - 4} L${x + 1} ${y - 1} L${x + 4} ${y} L${x + 1} ${y + 1} L${x} ${y + 4} L${x - 1} ${y + 1} L${x - 4} ${y} L${x - 1} ${y - 1} Z" fill="#fff"><animate attributeName="opacity" values="0;1;0" dur="${1.6 + i * 0.5}s" repeatCount="indefinite"/></path>`).join('');

// ---------------- Davanti: l'oggetto della tecnologia, nella colonna a sinistra (100 x 110)
type Arte = (id: string, l: Livello, t: (typeof TIPI)[number]) => string;
// Restano tre disegni: l'antenna in argento, il PC in oro, il nastro perforato sempre in oro.
// Le sezioni girano su questi tre, così ogni biglietto ha comunque il suo oggetto.
const DAVANTI: { arte: Arte; metallo: Metallo }[] = [
  // Modelli generativi: un'antenna che trasmette. Gli anelli del segnale si allargano; dietro mezzi soli a bande
  { metallo: 'argento', arte: (id, l, t) => `${[0, 1, 2, 3].map(k => `<circle cx="50" cy="112" r="${58 - k * 13}" fill="${k % 2 ? t.carta : t.a}"/>`).join('')}
    ${[0, 1, 2].map(k => `<circle cx="50" cy="30" r="4" fill="none" stroke="${t.b}" stroke-width="2.4"><animate attributeName="r" values="4;46" dur="3s" begin="${k}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="3s" begin="${k}s" repeatCount="indefinite"/></circle>`).join('')}
    <g stroke="${INK}" stroke-width="2.2" stroke-linecap="round"><path d="M50 32 L36 108 M50 32 L64 108"/><path d="M45 56 H55 M41 78 H59 M38 98 H62 M45 56 L59 78 M55 56 L41 78 M41 78 L62 98 M59 78 L38 98" stroke-width="1.2"/></g>
    <circle cx="50" cy="30" r="6" fill="${F(id)}" stroke="${INK}" stroke-width="1.2"/>${brilla(l, [[18, 18], [84, 26]])}` },
  // Prompting: un terminale. Lo schermo con il prompt e il cursore che lampeggia, la tastiera, il tasto invio in foglia
  { metallo: 'oro', arte: (id, l, t) => `<rect x="8" y="12" width="84" height="56" rx="7" fill="${t.b}"/><rect x="14" y="18" width="72" height="44" rx="4" fill="#132a20"/>
    <text x="20" y="49" font-family="Anton, Impact, sans-serif" font-size="24" fill="${t.a}">&gt;</text>
    <rect x="36" y="44" width="11" height="4" fill="${t.a}"><animate attributeName="opacity" values="1;1;0;0" dur="1.1s" repeatCount="indefinite" calcMode="discrete"/></rect>
    <g fill="${t.b}">${Array.from({ length: 3 }, (_, r) => Array.from({ length: 6 - (r === 2 ? 1 : 0) }, (_, c) => `<rect x="${8 + c * 14 + r * 3}" y="${76 + r * 11}" width="11" height="8" rx="2"/>`).join('')).join('')}</g>
    <rect x="80" y="98" width="14" height="8" rx="2" fill="${F(id)}" stroke="${INK}" stroke-width=".8"/>${brilla(l, [[90, 8], [10, 70]])}` },
  // Altri termini: un nastro perforato che scorre in diagonale sopra bande a gradini; la fila guida in foglia
  { metallo: 'oro', arte: (id, l, t) => `${[0, 1, 2, 3].map(k => `<rect x="0" y="${70 + k * 10}" width="${100 - k * 18}" height="10" fill="${k % 2 ? t.b : t.a}"/>`).join('')}
    <g transform="rotate(-24 50 55)"><rect x="-40" y="36" width="180" height="34" fill="${CREMA}" stroke="${INK}" stroke-width="1"/>
      <g><animateTransform attributeName="transform" type="translate" values="0 0;-24 0" dur="1.5s" repeatCount="indefinite"/>
        ${Array.from({ length: 22 }, (_, c) => `<circle cx="${-36 + c * 8}" cy="53" r="1.6" fill="${F(id)}" stroke="${INK}" stroke-width=".4"/>${[42, 47, 59, 64].map((y, r) => ((c * 5 + r * 3) % 7 < 3) ? `<circle cx="${-36 + c * 8}" cy="${y}" r="2.4" fill="${t.carta}"/>` : '').join('')}`).join('')}</g></g>${brilla(l, [[14, 14], [86, 22]])}` },
];

// Il metallo della banda verticale segue il disegno: argento con l'antenna, oro con PC e nastro
export const metalloDi = (sezione: number): Metallo => DAVANTI[sezione % DAVANTI.length]!.metallo;

export function arteDavanti(sezione: number, livello: Livello) {
  const id = `d${++uid}`, voce = DAVANTI[sezione % DAVANTI.length]!;
  return `<svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${foglia(id, voce.metallo)}</defs>${voce.arte(id, livello, tipo(sezione))}</svg>`;
}

// ---------------- Dietro: il poster anni '70 (220 x 170). Provvisorio: sole in foglia con le strisce, bande, una sagoma
// nera di una macchina. Di sera (dopo un errore) il fondo è notte e compaiono le stelle
const SAGOME: ((t: (typeof TIPI)[number]) => string)[] = [
  // Un terminale con lo schermo acceso
  t => `<rect x="70" y="72" width="80" height="62" rx="6" fill="${INK}"/><rect x="80" y="80" width="60" height="40" rx="3" fill="${t.carta}"/><rect x="88" y="98" width="10" height="4" fill="${t.b}"><animate attributeName="opacity" values="1;1;0;0" dur="1.1s" repeatCount="indefinite" calcMode="discrete"/></rect><path d="M62 150 L74 134 H146 L158 150 Z" fill="${INK}"/>`,
  // Una parabola che guarda il cielo
  t => `<g transform="rotate(-25 110 112)"><path d="M70 96 A40 22 0 0 0 150 96 Z" fill="${INK}"/><path d="M110 96 L110 70" stroke="${INK}" stroke-width="3"/><circle cx="110" cy="68" r="4" fill="${t.a}"/></g><path d="M104 118 L96 150 H124 L116 118 Z" fill="${INK}"/>`,
  // Un faro
  t => `<path d="M100 150 L104 74 L120 74 L124 150 Z" fill="${INK}"/><rect x="102" y="60" width="20" height="14" fill="${INK}"/><path d="M98 60 L112 48 L126 60 Z" fill="${INK}"/><path d="M112 66 L230 40 L230 92 Z" fill="${t.b}" opacity=".5"><animate attributeName="opacity" values=".5;.15;.5" dur="3s" repeatCount="indefinite"/></path>`,
  // Un microfono da studio
  t => `<rect x="96" y="54" width="28" height="48" rx="14" fill="${INK}"/>${[0, 1, 2, 3].map(k => `<path d="M100 ${64 + k * 8} H120" stroke="${t.carta}" stroke-width="1.4"/>`).join('')}<path d="M88 84 Q88 112 110 112 Q132 112 132 84" fill="none" stroke="${INK}" stroke-width="4"/><path d="M110 112 V146 M94 148 H126" stroke="${INK}" stroke-width="5"/>`,
  // Un braccio robotico
  t => `<path d="M88 150 H132 L126 138 H94 Z" fill="${INK}"/><g stroke="${INK}" stroke-width="10" stroke-linecap="round"><path d="M110 138 L96 100"/><g><path d="M96 100 L136 82"/><path d="M136 82 L146 96" stroke-width="6"/><animateTransform attributeName="transform" type="rotate" values="-6 96 100;8 96 100;-6 96 100" dur="4s" repeatCount="indefinite"/></g></g><circle cx="96" cy="100" r="7" fill="${t.a}"/>`,
  // Un floppy disk
  t => `<g transform="rotate(-8 110 104)"><path d="M78 70 H134 L144 80 V140 H78 Z" fill="${INK}"/><rect x="92" y="70" width="34" height="22" fill="${t.b}"/><rect x="114" y="74" width="7" height="14" fill="${INK}"/><rect x="88" y="104" width="46" height="30" fill="${CREMA}"/><path d="M92 112 H128 M92 120 H120" stroke="${t.carta}" stroke-width="2"/></g>`,
];

export function poster(sezione: number, livello: Livello, sera: boolean) {
  const id = `p${++uid}`, t = tipo(sezione), fondo = sera ? '#1c2340' : CREMA;
  return `<svg viewBox="0 0 220 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${foglia(id, metalloDi(sezione))}</defs>
    <rect width="220" height="170" fill="${fondo}"/>${sera ? [[20, 20], [60, 36], [180, 18], [200, 50], [34, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="${CREMA}"/>`).join('') : ''}
    <circle cx="110" cy="96" r="66" fill="${F(id)}"/>${Array.from({ length: 7 }, (_, k) => `<rect x="30" y="${66 + k * 10}" width="160" height="${2 + k}" fill="${fondo}"/>`).join('')}
    ${[t.carta, t.a, t.b, INK].map((c, k) => `<path d="M0 ${126 + k * 12} Q55 ${114 + k * 12} 110 ${126 + k * 12} T220 ${124 + k * 12} V170 H0 Z" fill="${c}"/>`).join('')}
    ${SAGOME[sezione % SAGOME.length]!(t)}${brilla(livello, [[40, 40], [184, 70], [150, 30]])}</svg>`;
}

// Il timbro della risposta: solo inchiostro, niente carta. Tre anelli, il testo in cerchio, la data in una fascia piena
// con le lettere lasciate vuote (le toglie la maschera), il segno al centro. Un filtro fa i bordi irregolari e i buchi
export function timbro(ok: boolean, data: string, codice: string, seme: number) {
  const id = `t${++uid}`, c = ok ? '#0b6b35' : '#a3161a', testo = ok ? '★ CLEARED ★ AI TERMS ★ CLEARED ★ AI TERMS ' : '✕ DELAYED ✕ TRY AGAIN ✕ DELAYED ✕ TRY AGAIN ';
  const segno = ok ? '<path d="M49 41 L57 49 L72 32" stroke-width="6.5"/>' : '<path d="M51 32 L69 48 M69 32 L51 48" stroke-width="6.5"/>';
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><defs>
    <filter id="f${id}" x="-8%" y="-8%" width="116%" height="116%">
      <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="${seme}" result="onde"/>
      <feDisplacementMap in="SourceGraphic" in2="onde" scale="3" xChannelSelector="R" yChannelSelector="G" result="mosso"/>
      <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="${seme + 7}" result="grana"/>
      <feColorMatrix in="grana" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.62" result="buchi"/>
      <feComposite in="mosso" in2="buchi" operator="in"/>
    </filter>
    <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".78"/><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity=".8"/></linearGradient>
    <mask id="k${id}"><rect width="120" height="120" fill="url(#g${id})"/><text x="60" y="64.5" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="1.5" font-family="ui-monospace, monospace" fill="#000">${esc(data)}</text></mask>
    <path id="p${id}" d="M60 60 m-40 0 a40 40 0 1 1 80 0 a40 40 0 1 1 -80 0"/>
  </defs>
  <g filter="url(#f${id})" mask="url(#k${id})" fill="none" stroke="${c}">
    <circle cx="60" cy="60" r="55" stroke-width="6"/><circle cx="60" cy="60" r="48.5" stroke-width="2"/><circle cx="60" cy="60" r="30" stroke-width="2.8"/>
    <text fill="${c}" stroke="none" font-size="9.5" font-weight="800" letter-spacing="1.4" font-family="ui-monospace, monospace"><textPath href="#p${id}">${testo}</textPath></text>
    <g stroke-linecap="round" stroke-linejoin="round">${segno}</g>
    <rect x="22" y="53" width="76" height="15" fill="${c}" stroke="none"/>
    <text x="60" y="81" text-anchor="middle" font-size="8" font-weight="700" letter-spacing="2" font-family="ui-monospace, monospace" fill="${c}" stroke="none">${esc(codice)}</text>
  </g></svg>`;
}
