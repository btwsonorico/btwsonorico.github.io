// Le illustrazioni dei biglietti di AI terms, in SVG a tinte piatte e contorno spesso, come un francobollo disegnato.
// Una scena per sezione del glossario. Il meteo cambia con l'esito: sole se indovini al primo colpo, pioggia se hai sbagliato prima.
// Sul davanti del biglietto la scena è senza meteo (neutro). Tutto il testo qui è nostro: niente arriva dalle note.

export type Meteo = 'neutro' | 'sole' | 'pioggia';
const INK = '#2b2420';
const tratto = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;

const cielo = (m: Meteo) => {
  const fondo = m === 'sole' ? '#aee0f2' : m === 'pioggia' ? '#8d9aa8' : '#fff1d6';
  let s = `<rect width="160" height="100" fill="${fondo}"/>`;
  if (m === 'sole') {
    s += `<g ${tratto}>${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<path d="M${(132 + Math.cos(a) * 16).toFixed(1)} ${(22 + Math.sin(a) * 16).toFixed(1)} L${(132 + Math.cos(a) * 21).toFixed(1)} ${(22 + Math.sin(a) * 21).toFixed(1)}"/>`; }).join('')}<circle cx="132" cy="22" r="11" fill="#ffd23f"/></g>`;
    s += nuvola(26, 20, 0.8, '#ffffff');
  } else if (m === 'pioggia') {
    s += `<g stroke="#e4edf5" stroke-width="1.6" stroke-linecap="round">${Array.from({ length: 22 }, (_, i) => { const x = 8 + ((i * 37) % 150), y = 34 + ((i * 23) % 40); return `<path d="M${x} ${y} l-4 8"/>`; }).join('')}</g>`;
    s += nuvola(44, 20, 1.1, '#5e6873') + nuvola(118, 16, 0.9, '#6d7784');
    s += `<path d="M112 26 l-5 10 h6 l-5 11" fill="none" stroke="#ffd23f" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
  } else s += nuvola(118, 18, 0.7, '#ffffff');
  return s;
};
const nuvola = (x: number, y: number, k: number, c: string) =>
  `<path transform="translate(${x} ${y}) scale(${k})" d="M-16 6 Q-20 6 -20 1 Q-20 -5 -13 -5 Q-12 -12 -4 -12 Q3 -14 6 -7 Q14 -9 16 -2 Q21 -1 20 4 Q19 7 15 7 Z" fill="${c}" ${tratto}/>`;

// L'aereo paffuto con l'elica, visto di lato, nel colore della sezione
const aereo = (x: number, y: number, k: number, tinta: string, giu = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${giu}) scale(${k})" ${tratto}>
    <path d="M-13 -3 L-18 -13 L-11 -13 L-6 -5 Z" fill="${tinta}"/>
    <path d="M-15 0 Q-15 -7 -6 -7 L7 -7 Q16 -7 16 0 Q16 6 7 6 L-6 6 Q-15 6 -15 0 Z" fill="${tinta}"/>
    <circle cx="8" cy="-2" r="2.6" fill="#cfeefa"/>
    <path d="M-3 2 L5 2 L1 11 L-6 11 Z" fill="${tinta}" style="filter:brightness(.82)"/>
    <rect x="16" y="-8" width="3" height="16" rx="1.5" fill="${INK}"/>
  </g>`;
const scia = (x: number, y: number) => `<path d="M${x} ${y} q-10 -4 -20 0 t-20 0" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-dasharray="1 5" stroke-linecap="round"/>`;

const colline = (a = '#7cc35c', b = '#5aa646') =>
  `<path d="M0 72 Q30 56 62 70 T124 66 T160 68 V100 H0 Z" fill="${a}" ${tratto}/><path d="M-4 86 Q40 74 82 84 T164 82 V104 H-4 Z" fill="${b}" ${tratto}/>`;
const mare = (y = 74) =>
  `<rect x="-4" y="${y}" width="168" height="40" fill="#4fb3d9" ${tratto}/><g fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round">${[[14, y + 9], [52, y + 16], [96, y + 8], [134, y + 18], [30, y + 22]].map(([x, yy]) => `<path d="M${x} ${yy} q4 -3 8 0 t8 0"/>`).join('')}</g>`;

// Una scena per sezione: 0 definizioni, 1 modelli generativi, 2 rischio, 3 prompting, 4 operazioni, 5 altri termini
const SCENE: ((m: Meteo) => string)[] = [
  // Le basi: colline e una casetta
  () => `${colline()}<g ${tratto}><rect x="92" y="58" width="22" height="16" fill="#fff8ea"/><path d="M88 60 L103 47 L118 60 Z" fill="#e85d4a"/><rect x="100" y="65" width="6" height="9" fill="#8a5a3b"/><rect x="108" y="61" width="4" height="4" fill="#cfeefa"/></g>`,
  // Generare: due mongolfiere sopra le colline
  () => `${colline()}<g ${tratto}><path d="M40 52 L37 60 M52 52 L55 60" fill="none"/><path d="M46 52 Q30 42 32 30 Q34 16 46 16 Q58 16 60 30 Q62 42 46 52 Z" fill="#ff9fb4"/><path d="M46 16 Q40 32 46 52 Q52 32 46 16" fill="#f7cf4f"/><rect x="40" y="60" width="12" height="7" fill="#b07a4f"/>
    <path d="M100 44 L98 49 M108 44 L110 49" fill="none"/><path d="M104 44 Q93 37 95 29 Q96 20 104 20 Q112 20 113 29 Q115 37 104 44 Z" fill="#8fd6b4"/><rect x="99" y="49" width="10" height="5" fill="#b07a4f"/></g>`,
  // Rischio e regole: il faro sugli scogli, con il fascio di luce
  m => `${m !== 'sole' ? '<path d="M112 34 L20 18 L20 44 Z" fill="#fff3a8" opacity=".55"/>' : ''}${mare()}<g ${tratto}><path d="M92 82 Q96 70 110 70 Q126 68 132 82 Z" fill="#9a958c"/><path d="M104 72 L106 38 L118 38 L120 72 Z" fill="#fff8ea"/><path d="M104.6 62 L119.4 62 L119 52 L105 52 Z M105.6 46 L118.4 46 L118.2 40 L105.8 40 Z" fill="#e85d4a"/><rect x="105" y="28" width="14" height="10" fill="#ffd23f"/><path d="M103 28 L112 20 L121 28 Z" fill="#e85d4a"/></g>`,
  // Prompting: un'antenna sulla collina che parla, con il fumetto
  () => `${colline()}<g ${tratto}><path d="M112 70 L120 30 L128 70 M114 60 L126 60 M116 50 L124 50 M118 40 L122 40" fill="none"/><circle cx="120" cy="28" r="3" fill="#f0603f"/><path d="M108 22 Q102 28 108 34 M132 22 Q138 28 132 34 M103 17 Q94 28 103 39 M137 17 Q146 28 137 39" fill="none"/>
    <path d="M40 30 Q40 20 52 20 L76 20 Q86 20 86 30 Q86 40 76 40 L58 40 L50 48 L51 40 Q40 40 40 30 Z" fill="#ffffff"/></g><g fill="${INK}"><circle cx="54" cy="30" r="2.4"/><circle cx="63" cy="30" r="2.4"/><circle cx="72" cy="30" r="2.4"/></g>`,
  // Operazioni: il porto, con la gru e i container
  () => `${mare(78)}<g ${tratto}><rect x="60" y="70" width="104" height="10" fill="#b07a4f"/><rect x="74" y="58" width="18" height="12" fill="#f0603f"/><rect x="92" y="58" width="18" height="12" fill="#3e6795"/><rect x="82" y="46" width="18" height="12" fill="#f7cf4f"/>
    <path d="M128 70 L128 22 L136 22 L136 70 M110 26 L156 26 L156 32 L110 32 Z" fill="#f2a43a"/><path d="M116 32 L116 46" fill="none"/><rect x="112" y="46" width="8" height="6" fill="#5e6873"/></g>`,
  // Altri termini: l'isoletta con la palma
  () => `${mare()}<g ${tratto}><ellipse cx="96" cy="78" rx="34" ry="8" fill="#f2d9a0"/><path d="M98 76 Q94 56 102 40" fill="none" stroke-width="4.5"/><path d="M98 76 Q94 56 102 40" fill="none" stroke="#b07a4f" stroke-width="2"/>
    <path d="M102 40 Q90 30 78 38 Q90 36 102 40 Z M102 40 Q112 28 126 34 Q112 34 102 40 Z M102 40 Q98 26 106 18 Q104 30 102 40 Z M102 40 Q118 40 122 52 Q112 44 102 40 Z M102 40 Q88 42 84 54 Q94 44 102 40 Z" fill="#5aa646"/><circle cx="100" cy="42" r="2.6" fill="#8a5a3b"/><circle cx="105" cy="43" r="2.6" fill="#8a5a3b"/></g>`,
];

export function scena(sezione: number, meteo: Meteo, tinta: string) {
  const fondo = SCENE[sezione % SCENE.length]!(meteo);
  const volo = meteo === 'sole' ? scia(56, 44) + aereo(70, 44, 1.1, tinta, -10) : meteo === 'pioggia' ? aereo(62, 58, 0.9, tinta, 8) : '';
  return `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${cielo(meteo)}${fondo}${volo}</svg>`;
}

// Il timbro tondo, grosso e cartoon: verde con la spunta se giusto, rosso con la croce se sbagliato
let conta = 0;
export function timbro(ok: boolean) {
  const id = `tt${++conta}`, c = ok ? '#1f9d55' : '#e0413a', testo = ok ? 'CLEARED ✦ AI TERMS ✦ CLEARED ✦ ' : 'DELAYED ✦ TRY AGAIN ✦ DELAYED ✦ ';
  const segno = ok ? '<path d="M45 61 L56 72 L77 47"/>' : '<path d="M47 47 L73 73 M73 47 L47 73"/>';
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><path id="${id}" d="M60 60 m-42 0 a42 42 0 1 1 84 0 a42 42 0 1 1 -84 0"/></defs>
    <circle cx="60" cy="60" r="54" fill="#fffaf0" fill-opacity=".72" stroke="${c}" stroke-width="7"/>
    <circle cx="60" cy="60" r="31" fill="none" stroke="${c}" stroke-width="3.5" stroke-dasharray="4 4"/>
    <text fill="${c}" font-size="10.5" font-weight="700" letter-spacing="1.2" font-family="ui-monospace, monospace"><textPath href="#${id}">${testo}</textPath></text>
    <g fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">${segno}</g></svg>`;
}
