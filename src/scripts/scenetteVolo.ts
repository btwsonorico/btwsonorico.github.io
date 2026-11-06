// Le illustrazioni dei biglietti di AI terms: panorami SVG a tinte piatte, filo sottile e grana da stampa, animati, uno per sezione.
// Sono il premio dietro il biglietto, quindi sono ricchi di dettagli e di piccole sorprese nascoste.
// Il meteo segue l'esito: sole al primo colpo; dopo un errore temporale che si apre in un arcobaleno. Di sera e di notte
// (ora del computer di chi gioca) il cielo è stellato. Davanti, nel francobollo, la stessa scena senza meteo.
// Il termine scritto sullo striscione dell'aereo arriva dalle note: si scrive sempre con escape, mai come HTML.

export type Meteo = 'neutro' | 'sole' | 'pioggia';
const INK = '#2b2420';
const T = `stroke="rgba(18,20,26,.42)" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"`;
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
let uid = 0;

// Piccoli movimenti: su e giù, rotazione, scorrimento. additive="sum" tiene la posizione di partenza
const su = (dy: number, dur: number, ritardo = 0) => `<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 ${dy};0 0" dur="${dur}s" begin="${ritardo}s" repeatCount="indefinite"/>`;
const gira = (cx: number, cy: number, dur: number, verso = 1) => `<animateTransform attributeName="transform" type="rotate" additive="sum" from="0 ${cx} ${cy}" to="${360 * verso} ${cx} ${cy}" dur="${dur}s" repeatCount="indefinite"/>`;
const scorri = (da: number, a: number, dur: number, ritardo = 0) => `<animateTransform attributeName="transform" type="translate" additive="sum" values="${da} 0;${a} 0" dur="${dur}s" begin="${ritardo}s" repeatCount="indefinite"/>`;
const dondola = (cx: number, cy: number, ang: number, dur: number) => `<animateTransform attributeName="transform" type="rotate" additive="sum" values="${-ang} ${cx} ${cy};${ang} ${cx} ${cy};${-ang} ${cx} ${cy}" dur="${dur}s" repeatCount="indefinite"/>`;
const lampeggia = (dur: number, valori = '1;0.2;1') => `<animate attributeName="opacity" values="${valori}" dur="${dur}s" repeatCount="indefinite"/>`;

const nuvola = (x: number, y: number, k: number, c: string, extra = '') =>
  `<g transform="translate(${x} ${y}) scale(${k})">${extra}<path d="M-16 6 Q-20 6 -20 1 Q-20 -5 -13 -5 Q-12 -12 -4 -12 Q3 -14 6 -7 Q14 -9 16 -2 Q21 -1 20 4 Q19 7 15 7 Z" fill="${c}" ${T}/></g>`;
const uccelli = (x: number, y: number) => `<g transform="translate(${x} ${y})" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round">${[[0, 0], [12, -5], [22, 2]].map(([a, b], i) => `<path d="M${a} ${b} q3 -3 6 0 q3 -3 6 0"><animateTransform attributeName="transform" type="scale" additive="sum" values="1 1;1 0.4;1 1" dur="${0.7 + i * 0.1}s" repeatCount="indefinite"/></path>`).join('')}${scorri(0, 30, 9)}</g>`;

// L'aereo paffuto con l'elica, visto di lato; dietro, lo striscione con il termine
const aereo = (tinta: string, termine: string, y: number, dur: number) => {
  const testo = esc(termine.toUpperCase().slice(0, 26)), lungo = Math.max(60, testo.length * 6.4 + 16);
  return `<g transform="translate(0 ${y})">${scorri(-lungo - 60, 460, dur)}
    <path d="M${-lungo - 12} 0 L-30 0" stroke="${INK}" stroke-width="1"/>
    <g transform="translate(${-lungo - 30} -9)"><rect width="${lungo}" height="18" rx="2" fill="#fffaf0" ${T}/><text x="${lungo / 2}" y="12.5" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" font-weight="700" fill="${INK}">${testo}</text>${su(2, 1.6)}</g>
    <g ${T}>
      <path d="M-13 -3 L-18 -13 L-11 -13 L-6 -5 Z" fill="${tinta}"/>
      <path d="M-15 0 Q-15 -7 -6 -7 L7 -7 Q16 -7 16 0 Q16 6 7 6 L-6 6 Q-15 6 -15 0 Z" fill="${tinta}"/>
      <circle cx="8" cy="-2" r="2.6" fill="#cfeefa"/>
      <path d="M-3 2 L5 2 L1 11 L-6 11 Z" fill="${tinta}" style="filter:brightness(.82)"/>
      <rect x="16" y="-8" width="3" height="16" rx="1.5" fill="${INK}"><animateTransform attributeName="transform" type="scale" additive="sum" values="1 1;1 0.15;1 1" dur="0.12s" repeatCount="indefinite"/></rect>
    </g>${su(4, 2.4)}</g>`;
};

const cielo = (m: Meteo, notte: boolean, id: string) => {
  const [a, b] = m === 'pioggia' ? ['#56606e', '#98a3ae'] : notte && m !== 'neutro' ? ['#101736', '#3c3a74'] : m === 'neutro' ? ['#ffe6bd', '#fff6e4'] : ['#6fc0ec', '#d9f2fb'];
  let s = `<defs><linearGradient id="c${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <radialGradient id="s${id}"><stop offset="0" stop-color="#fff6c8" stop-opacity=".9"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="160" fill="url(#c${id})"/>`;
  if (m === 'pioggia') {
    // Il temporale si apre: arcobaleno tenue a destra, poi nuvole scure, pioggia che cade e un lampo ogni tanto
    s += `<g fill="none" stroke-width="5" opacity=".55">${['#e85d4a', '#f2a43a', '#f7cf4f', '#7cc35c', '#5fb6d9', '#8b74d6'].map((c, i) => `<path d="M250 140 A${110 - i * 5} ${110 - i * 5} 0 0 1 ${470 - i * 10} 140" stroke="${c}"/>`).join('')}</g>`;
    s += nuvola(60, 26, 1.5, '#5e6873', scorri(-10, 10, 14)) + nuvola(170, 18, 1.2, '#6d7784', scorri(10, -10, 17)) + nuvola(110, 40, 1, '#4f5964');
    s += `<g stroke="#e4edf5" stroke-width="1.4" stroke-linecap="round" opacity=".8">${Array.from({ length: 34 }, (_, i) => { const x = (i * 53) % 400, y = 20 + ((i * 37) % 120); return `<path d="M${x} ${y} l-5 10"><animateTransform attributeName="transform" type="translate" values="0 -30;-8 50" dur="${0.7 + (i % 5) * 0.08}s" repeatCount="indefinite"/></path>`; }).join('')}</g>`;
    s += `<path d="M150 46 l-8 16 h9 l-7 18" fill="none" stroke="#ffd23f" stroke-width="3" stroke-linejoin="round" opacity="0"><animate attributeName="opacity" values="0;0;1;0;1;0;0" keyTimes="0;.7;.72;.75;.77;.8;1" dur="5s" repeatCount="indefinite"/></path>`;
  } else if (notte && m !== 'neutro') {
    s += Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 71) % 400}" cy="${6 + ((i * 29) % 70)}" r="${i % 4 ? 0.9 : 1.5}" fill="#fffbe8">${lampeggia(1.5 + (i % 5) * 0.6, '1;.3;1')}</circle>`).join('');
    // Una costellazione nascosta: le stelle disegnano le lettere A e I
    s += `<g stroke="#fffbe8" stroke-width=".6" opacity=".5" fill="#fffbe8"><path d="M40 40 L48 22 L56 40 M44 32 L52 32 M64 22 L64 40"/>${[[40, 40], [48, 22], [56, 40], [44, 32], [52, 32], [64, 22], [64, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3"/>`).join('')}</g>`;
    s += `<circle cx="336" cy="32" r="30" fill="url(#s${id})"/><circle cx="336" cy="32" r="13" fill="#fdf3cf" ${T}/><circle cx="342" cy="28" r="11" fill="${a}"/>`;
    s += `<path d="M0 0 l2 -1" stroke="#fffbe8" stroke-width="1.5" stroke-linecap="round"><animateTransform attributeName="transform" type="translate" values="60 10;200 60;200 60" keyTimes="0;.06;1" dur="9s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0;0" keyTimes="0;.02;.06;1" dur="9s" repeatCount="indefinite"/></path>`;
  } else if (m === 'sole') {
    s += `<circle cx="338" cy="34" r="36" fill="url(#s${id})"/><g ${T}>${Array.from({ length: 10 }, (_, i) => { const t = (i / 10) * Math.PI * 2; return `<path d="M${(338 + Math.cos(t) * 18).toFixed(1)} ${(34 + Math.sin(t) * 18).toFixed(1)} L${(338 + Math.cos(t) * 25).toFixed(1)} ${(34 + Math.sin(t) * 25).toFixed(1)}"/>`; }).join('')}${gira(338, 34, 30)}</g><circle cx="338" cy="34" r="13" fill="#ffd23f" ${T}/>`;
    s += nuvola(70, 24, 1, '#ffffff', scorri(-20, 40, 26)) + nuvola(220, 16, 0.75, '#ffffff', scorri(20, -30, 32));
  } else s += nuvola(300, 18, 0.8, '#ffffff');
  return s;
};

const colline = (c1 = '#8fd06a', c2 = '#6fb34f', c3 = '#5aa646') =>
  `<path d="M0 108 Q60 78 130 98 T260 92 T400 96 V160 H0 Z" fill="${c1}" ${T}/><path d="M-4 124 Q70 104 150 120 T300 114 T404 120 V164 H-4 Z" fill="${c2}" ${T}/><path d="M-4 142 Q90 128 200 140 T404 138 V164 H-4 Z" fill="${c3}" ${T}/>`;
const mare = (y: number, id: string) => `<defs><linearGradient id="m${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb3d9"/><stop offset="1" stop-color="#2f84b4"/></linearGradient></defs>
  <rect x="-4" y="${y}" width="408" height="${170 - y}" fill="url(#m${id})" ${T}/>
  <g fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".8">${Array.from({ length: 12 }, (_, i) => `<path d="M${(i * 67) % 400} ${y + 8 + ((i * 13) % (150 - y))} q5 -3 10 0 t10 0">${scorri(0, i % 2 ? 8 : -8, 3 + (i % 3))}</path>`).join('')}</g>`;
const albero = (x: number, y: number, k = 1, c = '#5aa646') => `<g transform="translate(${x} ${y}) scale(${k})" ${T}><path d="M0 0 V-12" /><circle cx="0" cy="-18" r="9" fill="${c}"/><circle cx="-6" cy="-13" r="6" fill="${c}"/><circle cx="6" cy="-13" r="6" fill="${c}"/></g>`;

// Una scena per sezione: 0 definizioni, 1 modelli generativi, 2 rischio, 3 prompting, 4 operazioni, 5 altri termini
const SCENE: ((id: string, m: Meteo) => string)[] = [
  // La valle delle basi: monti lontani, una fattoria con il fumo dal camino, la pala eolica di Learn, la strada che serpeggia.
  // Sorprese: il cartello «hello, world», una lumaca, una mucca
  id => `<path d="M0 98 L50 60 L90 84 L140 48 L200 88 L250 58 L310 92 L360 64 L400 84 V120 H0 Z" fill="#b8b0e0" ${T} opacity=".85"/><path d="M128 58 L140 48 L152 58 Q140 54 128 58 Z" fill="#fffaf0"/>
    ${colline()}
    <path d="M150 160 Q170 140 150 128 Q130 116 168 104" fill="none" stroke="#f2dfb0" stroke-width="9" stroke-linecap="round"/><path d="M150 160 Q170 140 150 128 Q130 116 168 104" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="3 5"/>
    <g ${T}><rect x="210" y="92" width="34" height="22" fill="#fffaf0"/><path d="M205 94 L227 76 L249 94 Z" fill="#e85d4a"/><rect x="222" y="102" width="9" height="12" fill="#8a5a3b"/><rect x="235" y="98" width="6" height="6" fill="#ffd56a"/><rect x="238" y="78" width="5" height="10" fill="#8a5a3b"/></g>
    ${[0, 1, 2].map(i => `<circle cx="240" cy="74" r="${3 + i}" fill="#ffffff" opacity=".7"><animateTransform attributeName="transform" type="translate" values="0 0;${6 + i * 4} -22" dur="3s" begin="${i}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;0" dur="3s" begin="${i}s" repeatCount="indefinite"/></circle>`).join('')}
    <g ${T}><path d="M300 108 L303 62 L306 108 Z" fill="#fffaf0"/><g fill="#fffaf0">${[0, 120, 240].map(a => `<path d="M303 62 L301 36 L305 36 Z" transform="rotate(${a} 303 62)"/>`).join('')}${gira(303, 62, 6)}</g><circle cx="303" cy="62" r="2.5" fill="${INK}"/></g>
    ${albero(70, 112, 1.1)}${albero(92, 118, 0.8, '#6fb34f')}${albero(360, 116, 1.2, '#4f8a3c')}
    <g transform="translate(110 132)" ${T}><path d="M0 0 V-16" /><rect x="-2" y="-24" width="40" height="11" rx="2" fill="#fffaf0"/><text x="18" y="-16" text-anchor="middle" font-family="ui-monospace, monospace" font-size="6.5" stroke="none" fill="${INK}">hello, world</text></g>
    <g transform="translate(270 128)" ${T}><ellipse cx="0" cy="0" rx="9" ry="5.5" fill="#fffaf0"/><circle cx="-3" cy="-1" r="2" fill="${INK}"/><circle cx="4" cy="1" r="1.6" fill="${INK}"/><circle cx="10" cy="-2" r="3.2" fill="#fffaf0"/><path d="M-6 5 V8 M5 5 V8" />${su(-1, 2)}</g>
    <g transform="translate(372 150)" ${T}><path d="M-8 0 Q-8 -6 0 -6 L6 -6" fill="none"/><circle cx="0" cy="-5" r="4" fill="#f2a43a"/><path d="M6 -6 l2 -4 M6 -6 l4 -2" fill="none" stroke-width="1"/>${scorri(0, -14, 20)}</g>`,
  // La festa delle mongolfiere: palloni dei colori di Learn che salgono e scendono. Sorprese: un pallone sorride,
  // un aquilone con la coda, un cavalletto che dipinge la stessa scena
  () => `${colline()}
    ${[[70, 52, '#ff9fb4', '#f7cf4f', 1.1, 5], [150, 30, '#5fb6d9', '#fffaf0', 0.8, 6], [235, 58, '#f7cf4f', '#e85d4a', 1.2, 4.5], [300, 26, '#8fd6b4', '#3e6795', 0.7, 7], [360, 60, '#b79ce6', '#fffaf0', 0.9, 5.5]].map(([x, y, a, b, k, d], i) => `<g transform="translate(${x} ${y}) scale(${k})" ${T}>
      <path d="M-6 16 L-4 24 M6 16 L4 24" fill="none" stroke-width="1.2"/><path d="M0 18 Q-17 6 -16 -6 Q-15 -20 0 -20 Q15 -20 16 -6 Q17 6 0 18 Z" fill="${a}"/><path d="M0 -20 Q-7 0 0 18 Q7 0 0 -20" fill="${b}"/><rect x="-5" y="24" width="10" height="7" rx="1" fill="#b07a4f"/>
      ${i === 2 ? `<circle cx="-5" cy="-6" r="1.6" fill="${INK}" stroke="none"/><circle cx="5" cy="-6" r="1.6" fill="${INK}" stroke="none"/><path d="M-5 0 Q0 5 5 0" fill="none" stroke-width="1.4"/>` : ''}${su(-6 - i, 4 + i * 0.7, i * 0.4)}</g>`).join('')}
    <g ${T}><path d="M40 140 Q70 100 108 78" fill="none" stroke-width="1"/><path d="M108 70 L116 78 L108 88 L100 78 Z" fill="#e85d4a"/><path d="M108 88 q-4 6 0 10 q4 4 0 9" fill="none" stroke-width="1.2"/>${dondola(108, 80, 8, 3)}</g>
    <g transform="translate(320 116)" ${T}><path d="M-10 26 L0 0 L10 26 M0 0 V30" fill="none"/><rect x="-14" y="-2" width="28" height="20" fill="#fffaf0"/><path d="M-12 14 Q-4 8 4 12 T12 10 V16 H-12 Z" fill="#8fd06a" stroke-width="1"/><circle cx="-4" cy="5" r="3" fill="#ff9fb4" stroke-width="1"/><circle cx="6" cy="3" r="2.4" fill="#f7cf4f" stroke-width="1"/></g>`,
  // Il faro sugli scogli, il mare mosso, una barca a vela. Sorprese: una bottiglia con il messaggio «RLHF»,
  // un gabbiano con il cappellino, una foca sugli scogli
  (id, m) => `${m !== 'sole' ? '<path d="M300 40 L-10 10 L-10 70 Z" fill="#fff3a8" opacity=".45"><animate attributeName="opacity" values=".1;.5;.1" dur="4s" repeatCount="indefinite"/></path>' : ''}
    ${mare(104, id)}
    <g ${T}><path d="M250 160 L262 118 Q290 98 330 104 Q370 100 404 120 V164 Z" fill="#9a958c"/><path d="M262 118 Q290 98 330 104" fill="none" stroke-width="1.2" opacity=".6"/>
      <path d="M286 110 L292 40 L314 40 L320 110 Z" fill="#fffaf0"/><path d="M288 92 L318 92 L316 76 L290 76 Z M291 58 L315 58 L314 48 L292 48 Z" fill="#e85d4a"/>
      <rect x="290" y="26" width="26" height="14" fill="#ffd23f">${lampeggia(4, '1;.6;1')}</rect><path d="M287 26 L303 14 L319 26 Z" fill="#e85d4a"/><path d="M303 14 V8" /></g>
    <g transform="translate(372 108)" ${T}><ellipse cx="0" cy="0" rx="12" ry="6" fill="#8a8f96"/><circle cx="10" cy="-4" r="4.5" fill="#8a8f96"/><circle cx="12" cy="-5" r=".9" fill="${INK}" stroke="none"/><path d="M-12 1 l-6 -3 M-12 1 l-6 3" fill="none"/>${su(-1, 3)}</g>
    <g transform="translate(110 112)" ${T}><path d="M-22 6 L22 6 L16 14 L-16 14 Z" fill="#e85d4a"/><path d="M0 6 V-34" /><path d="M2 -32 L22 2 L2 2 Z" fill="#fffaf0"/><path d="M-2 -28 L-18 2 L-2 2 Z" fill="#f7cf4f"/>${su(3, 3)}${dondola(0, 10, 4, 4)}</g>
    <g transform="translate(200 132)" ${T}><g transform="rotate(-30)"><rect x="-8" y="-3" width="16" height="7" rx="3" fill="#9fd8b4" opacity=".9"/><rect x="8" y="-1.5" width="4" height="4" fill="#b07a4f"/><path d="M-4 0.5 h8" stroke-width=".8"/></g><text x="-4" y="-8" font-family="ui-monospace, monospace" font-size="5" stroke="none" fill="${INK}" opacity=".7">RLHF</text>${su(3, 2.2)}${scorri(0, -40, 26)}</g>
    <g transform="translate(240 36)" ${T}><path d="M-10 0 Q-5 -5 0 0 Q5 -5 10 0" fill="none"/><path d="M-3 -4 h6 l-1 -4 h-4 Z" fill="#e85d4a" stroke-width="1"/>${su(-4, 2)}${scorri(-30, 30, 10)}</g>`,
  // Il paese dei messaggi: una collina con l'antenna che trasmette, case con le finestre accese, fumetti che salgono.
  // Sorprese: un gatto sul tetto che chiede «prompt?», un aeroplanino di carta, i puntini di attesa
  () => `${colline('#a5d98a', '#7cc35c', '#5aa646')}
    <g ${T}>${([[30, 104, 26, 26, '#e85d4a'], [60, 96, 22, 34, '#3e6795'], [86, 108, 30, 22, '#f2a43a'], [124, 100, 20, 30, '#8fd6b4']] as [number, number, number, number, string][]).map(([x, y, w, h, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fffaf0"/><path d="M${x! - 3} ${y} L${x! + w! / 2} ${y! - 12} L${x! + w! + 3} ${y} Z" fill="${c}"/><rect x="${x! + 5}" y="${y! + 6}" width="6" height="6" fill="#ffd56a"/>`).join('')}</g>
    <g transform="translate(70 84)" ${T}><path d="M-6 0 Q-7 -8 -4 -10 L-2 -6 L2 -6 L4 -10 Q7 -8 6 0 Z" fill="${INK}"/><path d="M6 -2 q6 -2 6 -8" fill="none"/><circle cx="-2" cy="-4" r=".9" fill="#ffd56a" stroke="none"/><circle cx="2" cy="-4" r=".9" fill="#ffd56a" stroke="none"/>
      <g transform="translate(6 -20)"><rect x="0" y="-8" width="30" height="12" rx="5" fill="#fffaf0"/><text x="15" y="0" text-anchor="middle" font-family="ui-monospace, monospace" font-size="6" stroke="none" fill="${INK}">prompt?</text>${lampeggia(5, '0;0;1;1;0')}</g></g>
    <g ${T}><path d="M270 112 L288 30 L306 112 M276 86 L300 86 M280 66 L296 66 M284 48 L292 48" fill="none"/><circle cx="288" cy="27" r="3.5" fill="#f0603f">${lampeggia(1.2)}</circle>
      ${[0, 1, 2].map(i => `<circle cx="288" cy="27" r="6" fill="none" stroke-width="1.5"><animate attributeName="r" values="6;40" dur="2.4s" begin="${i * 0.8}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;0" dur="2.4s" begin="${i * 0.8}s" repeatCount="indefinite"/></circle>`).join('')}</g>
    ${[['...', 180, 0], ['?', 220, 1.6], ['{ }', 340, 3.2]].map(([t, x, r]) => `<g transform="translate(${x} 110)" opacity="0"><rect x="-14" y="-10" width="28" height="16" rx="7" fill="#fffaf0" ${T}/><text x="0" y="2" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="${INK}">${t}</text><animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 -70" dur="4.8s" begin="${r}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" dur="4.8s" begin="${r}s" repeatCount="indefinite"/></g>`).join('')}
    <g transform="translate(140 70)" ${T}><path d="M0 0 L18 5 L4 8 Z" fill="#fffaf0"/><path d="M4 8 L6 3" fill="none" stroke-width="1"/>${scorri(-60, 300, 11)}${su(10, 3)}</g>`,
  // Il porto: gru con il gancio che sale e scende, container impilati, una nave. Sorprese: container «GPU» e «DATA»,
  // un robottino che saluta, le casse sul nastro
  id => `${mare(122, id)}
    <g ${T}><rect x="-4" y="112" width="250" height="14" fill="#b07a4f"/>${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 32} 126 V150" />`).join('')}
      ${([[20, 90, '#e85d4a', 'DATA'], [64, 90, '#3e6795', 'GPU'], [42, 68, '#f7cf4f', 'LOG'], [108, 90, '#8fd6b4', '']] as [number, number, string, string][]).map(([x, y, c, t]) => `<rect x="${x}" y="${y}" width="42" height="22" fill="${c}"/><path d="M${x! + 6} ${y! + 4} v14 M${x! + 12} ${y! + 4} v14" stroke-width="1" opacity=".5"/><text x="${x! + 26}" y="${y! + 15}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" font-weight="700" stroke="none" fill="${INK}">${t}</text>`).join('')}
      <path d="M180 112 V30 H190 V112 M150 34 H250 V42 H150 Z" fill="#f2a43a"/><path d="M182 34 L176 22 L194 22 L188 34" fill="#f2a43a"/>
      <g><path d="M232 42 V70" fill="none"/><rect x="225" y="70" width="14" height="10" fill="#5e6873"/><animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 18;0 18;0 0" dur="5s" repeatCount="indefinite"/></g>
      <path d="M260 140 L380 140 L368 156 L272 156 Z" fill="#e85d4a"/><rect x="290" y="124" width="22" height="16" fill="#3e6795"/><rect x="314" y="124" width="22" height="16" fill="#8fd6b4"/><rect x="338" y="116" width="18" height="24" fill="#fffaf0"/><rect x="342" y="120" width="5" height="5" fill="#ffd56a"/>
    </g>
    <g transform="translate(160 100)" ${T}><rect x="-6" y="-4" width="12" height="14" rx="3" fill="#cfd6dd"/><rect x="-5" y="-14" width="10" height="9" rx="2" fill="#cfd6dd"/><circle cx="-2" cy="-10" r="1.2" fill="${INK}" stroke="none"/><circle cx="2" cy="-10" r="1.2" fill="${INK}" stroke="none"/><path d="M0 -14 v-4" /><circle cx="0" cy="-19" r="1.5" fill="#f0603f"/>
      <path d="M6 -2 l6 -8" fill="none">${dondola(6, -2, 25, 0.8)}</path><path d="M-3 10 v3 M3 10 v3" /></g>
    <g ${T}>${[0, 1, 2].map(i => `<rect x="0" y="0" width="9" height="7" fill="#b07a4f" transform="translate(0 105)">${scorri(-20, 160, 6, i * 2)}</rect>`).join('')}</g>`,
  // L'isola tropicale: palma che ondeggia, vulcano con lo sbuffo, delfini che saltano, la coda della balena bianca.
  // Sorprese: lo scrigno con la X, un isolotto a forma di punto interrogativo
  id => `${mare(108, id)}
    <g ${T}><path d="M230 118 L262 66 L272 70 L282 64 L316 118 Z" fill="#a08670"/><path d="M262 66 L272 70 L282 64 L276 78 L268 76 Z" fill="#e85d4a"/>
      ${[0, 1].map(i => `<circle cx="272" cy="58" r="5" fill="#d8d3c8" opacity=".8"><animateTransform attributeName="transform" type="translate" values="0 0;${8 + i * 6} -26" dur="4s" begin="${i * 2}s" repeatCount="indefinite"/><animate attributeName="r" values="4;10" dur="4s" begin="${i * 2}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;0" dur="4s" begin="${i * 2}s" repeatCount="indefinite"/></circle>`).join('')}
      <ellipse cx="120" cy="124" rx="70" ry="14" fill="#f2dfb0"/>
      <g><path d="M118 120 Q112 94 124 70" fill="none" stroke-width="5"/><path d="M118 120 Q112 94 124 70" fill="none" stroke="#b07a4f" stroke-width="2.4"/>
        <g fill="#5aa646"><path d="M124 70 Q108 56 90 66 Q108 64 124 70 Z M124 70 Q138 52 158 60 Q140 60 124 70 Z M124 70 Q120 50 130 40 Q126 56 124 70 Z M124 70 Q146 70 150 86 Q138 76 124 70 Z M124 70 Q104 72 98 90 Q110 78 124 70 Z"/>${dondola(124, 70, 5, 3)}</g>
        <circle cx="121" cy="73" r="3" fill="#8a5a3b"/><circle cx="127" cy="74" r="3" fill="#8a5a3b"/></g>
      <rect x="150" y="112" width="18" height="11" rx="2" fill="#b07a4f"/><path d="M150 116 h18" /><rect x="157" y="114" width="4" height="4" fill="#f7cf4f"/>
      <path d="M78 124 l6 6 M84 124 l-6 6" stroke="#e85d4a" stroke-width="2.4"/>
      <path d="M360 136 q0 -12 10 -12 q10 0 10 9 q0 7 -10 9 v6" fill="none" stroke="#f2dfb0" stroke-width="5"/><circle cx="370" cy="152" r="3" fill="#f2dfb0"/></g>
    <g ${T}><g fill="#8ba9c0"><path d="M0 0 Q6 -14 18 -10 Q14 -6 20 -2 Q10 -4 0 0 Z"/><path d="M8 -12 l3 -5 l2 5" /></g>
      <animateTransform attributeName="transform" type="translate" values="196 140;214 112;232 140;232 140" keyTimes="0;.18;.36;1" dur="6s" repeatCount="indefinite"/></g>
    <g transform="translate(330 128)" ${T}><path d="M0 0 C-10 -6 -16 -18 -10 -22 C-6 -16 -2 -10 0 -8 C2 -10 6 -16 10 -22 C16 -18 10 -6 0 0 Z" fill="#f4f1ea"/>${su(6, 4)}</g>`,
];

// Il soggetto di ogni scena, in x: il francobollo è stretto e alto, quindi si inquadra lì
const SOGGETTO = [228, 235, 300, 288, 200, 124];
export function scena(sezione: number, meteo: Meteo, tinta: string, termine = '', notte = false, francobollo = false) {
  const id = `v${++uid}`;
  const fondo = SCENE[sezione % SCENE.length]!(id, meteo);
  const volo = meteo === 'neutro' ? '' : aereo(tinta, termine, meteo === 'pioggia' ? 58 : 46, meteo === 'pioggia' ? 20 : 15);
  const vista = francobollo ? `${SOGGETTO[sezione % SOGGETTO.length]! - 64} 6 128 154` : '0 0 400 160';
  // La grana: un rumore fine sopra tutto, come una stampa su carta
  const grana = `<filter id="n${id}"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0"/></filter><rect x="-10" y="-10" width="420" height="180" filter="url(#n${id})" opacity=".55" style="mix-blend-mode:multiply"/>`;
  return `<svg viewBox="${vista}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${cielo(meteo, notte, id)}${meteo !== 'pioggia' ? uccelli(40, 40) : ''}${fondo}${volo}${grana}</svg>`;
}

// Il timbro: solo inchiostro, niente carta. Tre anelli, il testo in cerchio, la data in una fascia piena con le lettere
// lasciate vuote (le toglie la maschera), e il segno al centro. Un filtro fa i bordi irregolari e lascia buchi dove l'inchiostro non ha preso
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
