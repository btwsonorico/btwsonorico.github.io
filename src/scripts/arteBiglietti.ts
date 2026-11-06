// Le illustrazioni dei biglietti di AI terms, in SVG. Ogni sezione ha un francobollo davanti e un poster dietro, con
// soggetti e stili mescolati: macchine che hanno fatto la storia (incisione a tratteggio), animali e natura (poster di
// metà Novecento, campiture piene e sfumature a puntini), concetti (onde e strisce anni '70).
// La foglia metallica sta solo su alcune forme e cambia con il livello del termine: facile argento, medio oro,
// difficile olografica, con un dettaglio in più. Il riflesso della foglia scorre da solo.
// Dietro, al primo colpo il poster è di giorno; dopo un errore è al tramonto.
// Niente testo delle note entra qui, tranne dove passa da esc().

export type Livello = 'easy' | 'medium' | 'hard';
const INK = '#1f1d1b', CREMA = '#f4ecd8';
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
let uid = 0;

// La foglia: un gradiente metallico che scorre. Argento, oro o olografica
const FOGLIE: Record<Livello, string[]> = {
  easy: ['#7f8791', '#f5f7f9', '#9aa2ad', '#ffffff', '#858d97'],
  medium: ['#9a6a14', '#f6d985', '#b98a26', '#fff0bd', '#a2711a'],
  hard: ['#ff9fd0', '#ffe79a', '#9ff3d4', '#a8c8ff', '#e3b0ff'],
};
const definizioni = (id: string, l: Livello) => `<defs>
  <linearGradient id="f${id}" x1="0" y1="0" x2="1" y2="1" spreadMethod="reflect">${FOGLIE[l].map((c, i) => `<stop offset="${i / 4}" stop-color="${c}"/>`).join('')}
    <animateTransform attributeName="gradientTransform" type="translate" values="-.5 -.5;.5 .5;-.5 -.5" dur="7s" repeatCount="indefinite"/></linearGradient>
  <pattern id="h${id}" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0 V2.6" stroke="${INK}" stroke-width=".7"/></pattern>
  <pattern id="x${id}" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0 V2.6 M0 0 H2.6" stroke="${INK}" stroke-width=".6"/></pattern>
  <pattern id="o${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-10)"><path d="M0 2.5 H5" stroke="${INK}" stroke-width=".45"/></pattern>
  <pattern id="p${id}" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".95" fill="#fffaf0" opacity=".85"/></pattern>
  <pattern id="q${id}" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".9" fill="${INK}" opacity=".35"/></pattern>
  <linearGradient id="r${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000"/></linearGradient>
  <mask id="m${id}"><rect width="400" height="300" fill="url(#r${id})" transform="scale(1 .7)"/></mask>
</defs>`;
const foglia = (id: string) => `url(#f${id})`;
// Brillantini: solo per i termini difficili
const brilla = (l: Livello, punti: [number, number][]) => l !== 'hard' ? '' : punti.map(([x, y], i) => `<path d="M${x} ${y - 4} L${x + 1} ${y - 1} L${x + 4} ${y} L${x + 1} ${y + 1} L${x} ${y + 4} L${x - 1} ${y + 1} L${x - 4} ${y} L${x - 1} ${y - 1} Z" fill="#fff"><animate attributeName="opacity" values="0;1;0" dur="${1.6 + i * 0.4}s" repeatCount="indefinite"/></path>`).join('');

// ---------------- Davanti: i francobolli, alti e stretti (120 x 150)

const FRANCOBOLLI: ((id: string, l: Livello) => string)[] = [
  // Definizioni: il Perceptron Mark I, inciso. Il pannello con la "retina" di fotocellule, le manopole, i fasci di cavi
  (id, l) => `<rect width="120" height="150" fill="${CREMA}"/><rect width="120" height="150" fill="url(#o${id})" opacity=".35"/>
    <g stroke="${INK}" stroke-width=".8"><rect x="18" y="20" width="84" height="104" fill="url(#h${id})"/><rect x="26" y="28" width="44" height="44" fill="${CREMA}"/>
    ${Array.from({ length: 36 }, (_, k) => `<circle cx="${30 + (k % 6) * 7.3}" cy="${32 + Math.floor(k / 6) * 7.3}" r="2.2" fill="${(k * 7) % 5 < 2 ? foglia(id) : CREMA}"/>`).join('')}
    ${[0, 1, 2].map(k => `<circle cx="86" cy="${38 + k * 16}" r="6" fill="${foglia(id)}"/><path d="M86 ${38 + k * 16} l${3 - k * 2} -4" />`).join('')}
    <rect x="26" y="80" width="68" height="36" fill="${CREMA}"/>${Array.from({ length: 9 }, (_, k) => `<path d="M${30 + k * 7} 82 C${30 + k * 7} 100 ${44 + k * 3} 96 ${40 + k * 5} 114" fill="none"/>`).join('')}</g>
    <text x="60" y="140" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" fill="${INK}" letter-spacing="1">PERCEPTRON 1958</text>${brilla(l, [[24, 14], [104, 30]])}`,
  // Modelli generativi: un colibrì che beve da un fiore, poster piatto; le ali in foglia
  (id, l) => `<rect width="120" height="150" fill="#f6e3b0"/><circle cx="60" cy="58" r="44" fill="#f0a64a"/><circle cx="60" cy="58" r="44" fill="url(#p${id})" mask="url(#m${id})"/>
    <path d="M0 116 Q30 100 60 112 T120 108 V150 H0 Z" fill="#3f7d5a"/><path d="M78 150 Q80 120 74 96" stroke="#2c5a40" stroke-width="3" fill="none"/>
    <path d="M74 96 Q62 84 66 72 Q78 78 80 92 Q92 80 98 88 Q90 98 76 98 Z" fill="#e8546b"/><circle cx="76" cy="90" r="3" fill="#ffd56a"/>
    <g transform="translate(40 64) rotate(-18)"><path d="M0 0 Q8 -8 20 -4 Q24 0 20 4 Q8 8 0 0 Z" fill="#2e6f8e"/><path d="M20 -1 L36 4" stroke="${INK}" stroke-width="1.4"/><circle cx="17" cy="-2" r="1.2" fill="${INK}"/>
      <path d="M6 -4 Q-6 -30 -18 -26 Q-8 -12 4 -2 Z" fill="${foglia(id)}" stroke="${INK}" stroke-width=".5"><animateTransform attributeName="transform" type="rotate" values="0 4 -2;-22 4 -2;0 4 -2" dur=".25s" repeatCount="indefinite"/></path>
      <path d="M0 2 L-14 8 L-12 2 Z" fill="#1f4f66"/></g>
    <text x="60" y="142" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" fill="#fffaf0" letter-spacing="1">GENERATE</text>${brilla(l, [[30, 30], [96, 40]])}`,
  // Rischio: un faro su strisce diagonali anni '70; il fascio in foglia
  (id, l) => `<rect width="120" height="150" fill="#1d2b4a"/>${Array.from({ length: 9 }, (_, k) => `<path d="M${-60 + k * 26} 150 L${k * 26 + 20} 0 L${k * 26 + 32} 0 L${-48 + k * 26} 150 Z" fill="${['#f0603f', '#f7a541', '#f7cf4f'][k % 3]}" opacity=".9"/>`).join('')}
    <path d="M62 44 L130 20 L130 70 Z" fill="${foglia(id)}" opacity=".9"/>
    <path d="M0 128 Q40 112 80 124 T120 120 V150 H0 Z" fill="#12203a"/>
    <g stroke="${INK}" stroke-width=".8"><path d="M50 128 L54 50 L70 50 L74 128 Z" fill="#fffaf0"/><path d="M51.6 106 L72.4 106 L71.4 90 L52.6 90 Z M53.4 74 L70.6 74 L70 60 L54 60 Z" fill="#e8402a"/>
      <rect x="52" y="38" width="20" height="12" fill="#ffd56a"/><path d="M48 38 L62 26 L76 38 Z" fill="#e8402a"/></g>
    <text x="60" y="142" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" fill="#fffaf0" letter-spacing="1">SAFE HARBOUR</text>${brilla(l, [[20, 20], [100, 96]])}`,
  // Prompting: un microfono da radio, inciso; la griglia in foglia
  (id, l) => `<rect width="120" height="150" fill="${CREMA}"/>${Array.from({ length: 14 }, (_, k) => `<circle cx="60" cy="60" r="${8 + k * 6}" fill="none" stroke="${INK}" stroke-width=".35" opacity=".5"/>`).join('')}
    <g stroke="${INK}" stroke-width=".9"><rect x="40" y="22" width="40" height="64" rx="20" fill="${foglia(id)}"/>${Array.from({ length: 9 }, (_, k) => `<path d="M42 ${32 + k * 6} H78" stroke-width=".5"/>`).join('')}
      <path d="M32 58 Q32 96 60 96 Q88 96 88 58" fill="none" stroke-width="2.4"/><path d="M60 96 V122" stroke-width="3"/><path d="M38 124 H82 L78 130 H42 Z" fill="url(#h${id})"/>
      <path d="M30 56 Q30 100 60 100" fill="none" stroke-width=".6"/></g>
    <text x="60" y="142" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" fill="${INK}" letter-spacing="1">ON AIR · PROMPT</text>${brilla(l, [[26, 26], [94, 34]])}`,
  // Operazioni: una scheda perforata su strisce anni '70; i fori in foglia
  (id, l) => `<rect width="120" height="150" fill="#f3e1b8"/>${['#e85d4a', '#f2a43a', '#f7cf4f', '#8fd6b4', '#3e6795'].map((c, k) => `<rect x="0" y="${92 + k * 9}" width="120" height="9" fill="${c}"/>`).join('')}
    <g transform="rotate(-8 60 60)"><path d="M18 26 H102 V96 H26 L18 88 Z" fill="#fffaf0" stroke="${INK}" stroke-width=".8"/>
      ${Array.from({ length: 12 }, (_, c) => Array.from({ length: 7 }, (_, r) => ((c * 3 + r * 5) % 7 === 0 || (c + r) % 5 === 0) ? `<rect x="${26 + c * 6.2}" y="${32 + r * 8.6}" width="2.6" height="5" fill="${foglia(id)}" stroke="${INK}" stroke-width=".3"/>` : `<text x="${27.3 + c * 6.2}" y="${36.6 + r * 8.6}" font-size="3.4" text-anchor="middle" font-family="ui-monospace, monospace" fill="${INK}" opacity=".55">${r}</text>`).join('')).join('')}</g>
    <text x="60" y="88" text-anchor="middle" font-family="ui-monospace, monospace" font-size="6" fill="${INK}" transform="rotate(-8 60 60)">BATCH 1890</text>
    <text x="60" y="144" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" fill="#fffaf0" letter-spacing="1">OPERATIONS</text>${brilla(l, [[20, 18], [100, 22]])}`,
  // Altri termini: un polpo che fa tante cose insieme, poster piatto; le ventose in foglia
  (id, l) => `<rect width="120" height="150" fill="#bfe3e6"/><rect width="120" height="150" fill="url(#q${id})" mask="url(#m${id})"/>
    <path d="M0 120 Q30 110 60 118 T120 116 V150 H0 Z" fill="#2f84b4"/>
    <g fill="#e8546b" stroke="${INK}" stroke-width=".6">${[[-40, 6], [-22, 16], [-6, 20], [10, 20], [26, 16], [42, 6]].map(([dx, dy], k) => `<path d="M${60 + dx * 0.25} 74 Q${60 + dx * 0.6} ${96 + dy} ${60 + dx} ${110 - dy * 0.3} Q${60 + dx * 1.1 + 4} ${116} ${60 + dx * 1.1} 122" fill="none" stroke="#e8546b" stroke-width="6" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="0 60 74;${k % 2 ? 4 : -4} 60 74;0 60 74" dur="${2 + k * 0.3}s" repeatCount="indefinite"/></path>`).join('')}
      <ellipse cx="60" cy="56" rx="24" ry="26"/><circle cx="52" cy="58" r="4" fill="#fffaf0"/><circle cx="68" cy="58" r="4" fill="#fffaf0"/><circle cx="53" cy="59" r="2" fill="${INK}"/><circle cx="69" cy="59" r="2" fill="${INK}"/></g>
    ${[[38, 104], [50, 112], [72, 112], [84, 104], [30, 96], [92, 96]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${foglia(id)}" stroke="${INK}" stroke-width=".3"/>`).join('')}
    <g stroke="${INK}" stroke-width=".6"><rect x="14" y="92" width="12" height="9" fill="#ffd56a"/><circle cx="104" cy="90" r="6" fill="#fffaf0"/><path d="M101 90 h6 M104 87 v6"/></g>
    <text x="60" y="142" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" fill="#fffaf0" letter-spacing="1">MULTITASK</text>${brilla(l, [[22, 24], [98, 30]])}`,
];

export function francobollo(sezione: number, livello: Livello) {
  const id = `s${++uid}`;
  return `<svg viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${definizioni(id, livello)}${FRANCOBOLLI[sezione % FRANCOBOLLI.length]!(id, livello)}</svg>`;
}

// ---------------- Dietro: i poster (320 x 200). sera: dopo un errore, la luce del tramonto

const cielo = (id: string, giorno: [string, string], sera: boolean) => {
  const [a, b] = sera ? ['#2a2350', '#f08a5d'] : giorno;
  return `<defs><linearGradient id="c${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="320" height="200" fill="url(#c${id})"/>`;
};
const POSTER: ((id: string, l: Livello, sera: boolean) => string)[] = [
  // Definizioni: il gufo sapiente su un ramo, sotto un grande sole in foglia; colline a strati e sfumature a puntini
  (id, l, sera) => `${cielo(id, ['#f6e7c4', '#f3c98b'], sera)}<circle cx="226" cy="78" r="58" fill="${foglia(id)}"/><circle cx="226" cy="78" r="58" fill="url(#q${id})" opacity=".4"/>
    <path d="M0 132 Q70 100 150 124 T320 112 V200 H0 Z" fill="${sera ? '#5a3f6e' : '#d98c4a'}"/><path d="M0 132 Q70 100 150 124 T320 112 V200 H0 Z" fill="url(#p${id})" mask="url(#m${id})"/>
    <path d="M0 160 Q90 136 180 156 T320 150 V200 H0 Z" fill="${sera ? '#2f2b4a' : '#7a4a2a'}"/>
    <path d="M40 112 Q120 96 196 108" stroke="#3a2416" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M150 102 q8 -10 18 -8" stroke="#3a2416" stroke-width="3" fill="none"/>
    <g transform="translate(118 58)"><path d="M0 50 Q-22 44 -20 16 Q-18 -6 0 -8 Q18 -6 20 16 Q22 44 0 50 Z" fill="#8a5a3b" stroke="${INK}" stroke-width="1"/>
      <path d="M-14 -4 L-18 -16 L-6 -8 M14 -4 L18 -16 L6 -8" fill="#8a5a3b" stroke="${INK}" stroke-width="1"/><circle cx="-8" cy="8" r="8" fill="${foglia(id)}" stroke="${INK}"/><circle cx="8" cy="8" r="8" fill="${foglia(id)}" stroke="${INK}"/>
      <circle cx="-8" cy="8" r="3.4" fill="${INK}"/><circle cx="8" cy="8" r="3.4" fill="${INK}"/><path d="M-3 16 L0 22 L3 16 Z" fill="#f2a43a"/><path d="M-12 26 Q0 34 12 26 Q8 44 0 46 Q-8 44 -12 26 Z" fill="#f3e1b8" opacity=".9"/>
      <animateTransform attributeName="transform" type="rotate" additive="sum" values="0 0 50;-3 0 50;0 0 50" dur="5s" repeatCount="indefinite"/></g>
    ${[[26, 40], [60, 28], [290, 150]].map(([x, y]) => `<path d="M${x} ${y} q4 -4 8 0 q4 -4 8 0" fill="none" stroke="${INK}" stroke-width="1.2"/>`).join('')}${brilla(l, [[200, 40], [250, 110], [60, 70]])}`,
  // Modelli generativi: onde anni '70 che nascono dal rumore. A sinistra punti sparsi, a destra bande piene; un fiore che sboccia
  (id, l, sera) => `${cielo(id, ['#2a1e3f', '#5a2d5e'], sera)}
    ${Array.from({ length: 140 }, (_, k) => `<circle cx="${(k * 37) % 110}" cy="${(k * 61) % 200}" r="${0.6 + (k % 3) * 0.5}" fill="#fff4d6" opacity="${0.3 + (k % 4) * 0.15}"/>`).join('')}
    ${['#f7cf4f', '#f2a43a', '#f0603f', '#d8336b', '#8e3fa3', '#3e6795'].map((c, k) => `<path d="M${60 + k * 4} 200 C ${120 + k * 6} ${150 - k * 18} ${150 + k * 8} ${120 - k * 16} 330 ${70 + k * 20} V200 Z" fill="${c}"><animateTransform attributeName="transform" type="translate" values="0 0;0 ${3 + k};0 0" dur="${4 + k * 0.4}s" repeatCount="indefinite"/></path>`).join('')}
    <path d="M60 200 C 120 150 150 120 330 70" stroke="${foglia(id)}" stroke-width="5" fill="none"/>
    <g transform="translate(240 70)"><circle r="20" fill="${foglia(id)}"/>${Array.from({ length: 8 }, (_, k) => `<ellipse rx="7" ry="16" fill="#ffb3c8" stroke="${INK}" stroke-width=".6" transform="rotate(${k * 45}) translate(0 -24)"/>`).join('')}<circle r="9" fill="#f7cf4f" stroke="${INK}" stroke-width=".6"/>
      <animateTransform attributeName="transform" type="rotate" additive="sum" from="0" to="360" dur="60s" repeatCount="indefinite"/></g>
    <text x="16" y="186" font-family="ui-monospace, monospace" font-size="8" fill="#fff4d6" letter-spacing="2" opacity=".8">NOISE → IMAGE</text>${brilla(l, [[250, 30], [180, 150], [290, 120]])}`,
  // Rischio: la bilancia, incisa a tratteggio, con i piatti in foglia; raggi fini dietro come una carta valori
  (id, l, sera) => `<rect width="320" height="200" fill="${sera ? '#e9d6c8' : CREMA}"/>${Array.from({ length: 48 }, (_, k) => { const a = (k / 48) * Math.PI * 2; return `<path d="M160 96 L${(160 + Math.cos(a) * 240).toFixed(1)} ${(96 + Math.sin(a) * 240).toFixed(1)}" stroke="${INK}" stroke-width=".35" opacity=".35"/>`; }).join('')}
    <circle cx="160" cy="96" r="70" fill="${CREMA}" stroke="${INK}" stroke-width=".6"/><circle cx="160" cy="96" r="64" fill="none" stroke="${INK}" stroke-width=".3" stroke-dasharray="1 2"/>
    <g stroke="${INK}" stroke-width="1"><path d="M154 168 L160 50 L166 168 Z" fill="url(#h${id})"/><path d="M130 172 H190 L184 180 H136 Z" fill="url(#x${id})"/><circle cx="160" cy="48" r="5" fill="${foglia(id)}"/>
      <g><path d="M98 64 H222" stroke-width="2.4"/>
        <path d="M104 64 L90 104 M104 64 L118 104 M216 64 L202 104 M216 64 L230 104" stroke-width=".7"/>
        <path d="M84 104 Q104 120 124 104 Z" fill="${foglia(id)}"/><path d="M196 104 Q216 120 236 104 Z" fill="${foglia(id)}"/>
        <rect x="96" y="92" width="16" height="12" fill="url(#x${id})"/><circle cx="216" cy="98" r="6" fill="url(#h${id})"/>
        <animateTransform attributeName="transform" type="rotate" values="-3 160 64;3 160 64;-3 160 64" dur="6s" repeatCount="indefinite"/></g></g>
    <text x="160" y="194" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" fill="${INK}" letter-spacing="3">WEIGH THE RISK</text>${brilla(l, [[60, 40], [270, 60], [250, 160]])}`,
  // Prompting: il pappagallo sul trespolo che risponde, poster piatto; il sole a puntini, il fumetto
  (id, l, sera) => `${cielo(id, ['#bfe3e6', '#e9f4dc'], sera)}<circle cx="96" cy="86" r="62" fill="${sera ? '#f08a5d' : '#f7cf4f'}"/><circle cx="96" cy="86" r="62" fill="url(#p${id})" mask="url(#m${id})"/>
    ${Array.from({ length: 6 }, (_, k) => `<path d="M0 ${150 + k * 9} H320" stroke="${['#3e8a5a', '#56a06a', '#6fb47a'][k % 3]}" stroke-width="9"/>`).join('')}
    <path d="M40 120 H220" stroke="#6b4426" stroke-width="5" stroke-linecap="round"/><path d="M200 120 V200" stroke="#6b4426" stroke-width="5"/>
    <g transform="translate(120 70)" stroke="${INK}" stroke-width="1"><path d="M0 50 Q-24 40 -20 6 Q-14 -18 6 -16 Q24 -12 22 12 Q20 40 0 50 Z" fill="#e8402a"/>
      <path d="M-6 30 Q-30 60 -26 96 Q-14 70 4 48 Z" fill="#3e6795"/><path d="M-2 40 Q-18 70 -10 100 Q0 76 8 50 Z" fill="${foglia(id)}"/>
      <path d="M10 -6 Q30 -6 32 8 Q22 4 14 8 Z" fill="#fffaf0"/><path d="M14 8 Q26 12 22 20 Q18 14 12 14 Z" fill="${INK}"/><circle cx="6" cy="-4" r="2.6" fill="#fffaf0"/><circle cx="6.6" cy="-4" r="1.3" fill="${INK}"/>
      <path d="M-8 6 Q-26 20 -18 40 Q-8 26 2 14 Z" fill="#f7cf4f"/><path d="M-8 6 Q-26 20 -18 40" fill="none"/>
      <animateTransform attributeName="transform" type="rotate" additive="sum" values="0 0 50;4 0 50;0 0 50" dur="3s" repeatCount="indefinite"/></g>
    <g transform="translate(170 26)"><path d="M0 0 H110 Q118 0 118 8 V40 Q118 48 110 48 H30 L18 60 L20 48 H8 Q0 48 0 40 V8 Q0 0 8 0 Z" fill="#fffaf0" stroke="${INK}" stroke-width="1"/>
      <text x="59" y="20" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="${INK}">"say it</text><text x="59" y="34" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="${INK}">step by step"</text></g>${brilla(l, [[60, 40], [290, 110], [240, 180]])}`,
  // Operazioni: la locomotiva a vapore, incisa, che tira i dati; ruote e fasce della caldaia in foglia; il fumo a righe
  (id, l, sera) => `<rect width="320" height="200" fill="${sera ? '#ecd9c6' : CREMA}"/><rect width="320" height="200" fill="url(#o${id})" opacity=".3"/>
    ${[0, 1, 2, 3].map(k => `<ellipse cx="${98 - k * 18}" cy="${46 - k * 8}" rx="${18 + k * 6}" ry="${10 + k * 4}" fill="url(#h${id})" stroke="${INK}" stroke-width=".6" opacity="${0.9 - k * 0.15}"><animateTransform attributeName="transform" type="translate" values="0 0;-14 -6" dur="${3 + k}s" repeatCount="indefinite"/></ellipse>`).join('')}
    <path d="M0 160 H320" stroke="${INK}" stroke-width="2"/>${Array.from({ length: 22 }, (_, k) => `<path d="M${k * 15} 162 h9" stroke="${INK}" stroke-width="3"/>`).join('')}
    <g stroke="${INK}" stroke-width="1"><rect x="80" y="74" width="140" height="50" rx="22" fill="url(#h${id})"/>${[110, 150, 190].map(x => `<rect x="${x}" y="72" width="6" height="54" fill="${foglia(id)}"/>`).join('')}
      <rect x="200" y="54" width="62" height="74" fill="url(#x${id})"/><rect x="210" y="62" width="20" height="18" fill="${CREMA}"/><rect x="236" y="62" width="20" height="18" fill="${CREMA}"/><path d="M194 54 H268 V48 H194 Z" fill="${INK}"/>
      <rect x="96" y="50" width="16" height="26" fill="url(#x${id})"/><path d="M92 50 H116 L112 44 H96 Z" fill="${INK}"/><path d="M60 124 L80 110 V130 Z" fill="url(#h${id})"/>
      ${[[110, 140, 16], [150, 140, 16], [190, 140, 16], [240, 146, 10]].map(([x, y, r]) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="${foglia(id)}"/><circle cx="${x}" cy="${y}" r="${r! - 4}" fill="none"/>${[0, 60, 120].map(a => `<path d="M${x} ${y! - r! + 4} V${y! + r! - 4}" transform="rotate(${a} ${x} ${y})" stroke-width=".7"/>`).join('')}<animateTransform attributeName="transform" type="rotate" from="0 ${x} ${y}" to="360 ${x} ${y}" dur="3s" repeatCount="indefinite"/></g>`).join('')}
      <path d="M110 140 H190" stroke-width="3"/></g>
    <g font-family="ui-monospace, monospace" font-size="7" fill="${INK}"><rect x="268" y="96" width="44" height="30" fill="#fffaf0" stroke="${INK}"/><text x="290" y="108" text-anchor="middle">DATA</text><text x="290" y="118" text-anchor="middle">EXPRESS</text></g>${brilla(l, [[40, 90], [290, 40], [160, 30]])}`,
  // Altri termini: tramonto anni '70 a strisce sul mare, la coda della balena bianca, il sole in foglia
  (id, l, sera) => `${cielo(id, ['#ffb3c8', '#ffe1a6'], sera)}<circle cx="160" cy="118" r="70" fill="${foglia(id)}"/>
    ${Array.from({ length: 7 }, (_, k) => `<rect x="80" y="${70 + k * 10}" width="160" height="${2 + k}" fill="${sera ? '#2a2350' : '#ffb3c8'}"/>`).join('')}
    ${['#2f84b4', '#2a73a0', '#24638b', '#1e5476', '#184561'].map((c, k) => `<path d="M0 ${128 + k * 14} Q80 ${120 + k * 14} 160 ${128 + k * 14} T320 ${126 + k * 14} V200 H0 Z" fill="${c}"><animateTransform attributeName="transform" type="translate" values="0 0;${k % 2 ? 8 : -8} 0;0 0" dur="${5 + k}s" repeatCount="indefinite"/></path>`).join('')}
    <g transform="translate(232 150)"><path d="M0 0 C-14 -10 -24 -30 -14 -36 C-8 -26 -2 -16 0 -12 C2 -16 8 -26 14 -36 C24 -30 14 -10 0 0 Z" fill="#f4f1ea" stroke="${INK}" stroke-width=".8"/>
      <animateTransform attributeName="transform" type="translate" additive="sum" values="0 6;0 0;0 6" dur="5s" repeatCount="indefinite"/></g>
    ${[0, 1, 2].map(k => `<circle cx="${232 + (k - 1) * 8}" cy="146" r="2" fill="#ffffff"><animate attributeName="cy" values="150;130;150" dur="${1.4 + k * 0.3}s" repeatCount="indefinite"/></circle>`).join('')}
    <g transform="translate(70 40)" fill="none" stroke="${INK}" stroke-width="1.2"><path d="M0 0 q4 -4 8 0 q4 -4 8 0"/><path d="M20 -8 q4 -4 8 0 q4 -4 8 0"/></g>${brilla(l, [[100, 60], [220, 70], [40, 140]])}`,
];

export function poster(sezione: number, livello: Livello, sera: boolean) {
  const id = `p${++uid}`;
  return `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${definizioni(id, livello)}${POSTER[sezione % POSTER.length]!(id, livello, sera)}</svg>`;
}

// L'annullo postale: due cerchi con il nome e la data, e le righe a onda che escono di lato
export function annullo(data: string, codice: string) {
  const id = `a${++uid}`;
  return `<svg viewBox="0 0 150 70" aria-hidden="true"><defs><path id="${id}" d="M35 35 m-24 0 a24 24 0 1 1 48 0 a24 24 0 1 1 -48 0"/></defs>
    <g fill="none" stroke="rgba(28,26,24,.75)" stroke-width="1.3"><circle cx="35" cy="35" r="30"/><circle cx="35" cy="35" r="19"/>
    ${[0, 1, 2, 3].map(k => `<path d="M68 ${20 + k * 10} q10 -5 20 0 t20 0 t20 0 t20 0"/>`).join('')}</g>
    <text font-family="ui-monospace, monospace" font-size="6.5" letter-spacing="1.5" fill="rgba(28,26,24,.8)"><textPath href="#${id}">AI TERMS ✦ AIRMAIL ✦ AI TERMS ✦</textPath></text>
    <text x="35" y="33" text-anchor="middle" font-family="ui-monospace, monospace" font-size="6.5" fill="rgba(28,26,24,.85)">${esc(data)}</text>
    <text x="35" y="42" text-anchor="middle" font-family="ui-monospace, monospace" font-size="6.5" fill="rgba(28,26,24,.85)">${esc(codice)}</text></svg>`;
}

// Il timbro della risposta: solo inchiostro, niente carta. Tre anelli, il testo in cerchio, la data in una fascia piena
// con le lettere lasciate vuote (le toglie la maschera), il segno al centro. Un filtro fa i bordi irregolari e i buchi
export function timbro(ok: boolean, data: string, codice: string, seme: number) {
  const id = `t${++uid}`, c = ok ? '#0b6b35' : '#a3161a', testo = ok ? '★ CLEARED ★ AI TERMS ★ CLEARED ★ AI TERMS ' : '✕ DELAYED ✕ TRY AGAIN ✕ DELAYED ✕ TRY AGAIN ';
  const segno = ok ? '<path d="M50 41 L57 48 L71 33" stroke-width="5"/>' : '<path d="M52 33 L68 47 M68 33 L52 47" stroke-width="5"/>';
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><defs>
    <filter id="f${id}" x="-8%" y="-8%" width="116%" height="116%">
      <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="${seme}" result="onde"/>
      <feDisplacementMap in="SourceGraphic" in2="onde" scale="3" xChannelSelector="R" yChannelSelector="G" result="mosso"/>
      <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="${seme + 7}" result="grana"/>
      <feColorMatrix in="grana" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.7 1.42" result="buchi"/>
      <feComposite in="mosso" in2="buchi" operator="in"/>
    </filter>
    <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".78"/><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity=".8"/></linearGradient>
    <mask id="k${id}"><rect width="120" height="120" fill="url(#g${id})"/><text x="60" y="64.5" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="1.5" font-family="ui-monospace, monospace" fill="#000">${esc(data)}</text></mask>
    <path id="p${id}" d="M60 60 m-40 0 a40 40 0 1 1 80 0 a40 40 0 1 1 -80 0"/>
  </defs>
  <g filter="url(#f${id})" mask="url(#k${id})" fill="none" stroke="${c}">
    <circle cx="60" cy="60" r="55" stroke-width="4.5"/><circle cx="60" cy="60" r="49.5" stroke-width="1.4"/><circle cx="60" cy="60" r="30" stroke-width="2"/>
    <text fill="${c}" stroke="none" font-size="9.5" font-weight="800" letter-spacing="1.4" font-family="ui-monospace, monospace"><textPath href="#p${id}">${testo}</textPath></text>
    <g stroke-linecap="round" stroke-linejoin="round">${segno}</g>
    <rect x="22" y="53" width="76" height="15" fill="${c}" stroke="none"/>
    <text x="60" y="81" text-anchor="middle" font-size="8" font-weight="700" letter-spacing="2" font-family="ui-monospace, monospace" fill="${c}" stroke="none">${esc(codice)}</text>
  </g></svg>`;
}
