// Registra la clip «follow the dog» per il retro del biglietto di reinforcement learning (src/scripts/arteGregge.ts).
// Apre /learn/ in Chrome headless come un telefono (390×844, densità 1: la scena di src/scripts/natura.ts usa densità 1
// su telefono, quindi i pixel della tela sono quelli veri), preme «follow the dog» e lascia guidare l'AI.
// L'orologio della pagina è finto: requestAnimationFrame e performance.now avanzano solo quando lo dice lo script,
// così ogni fotogramma ha lo stesso passo anche se il rendering software è lento.
// Ogni fotogramma è una foto dello schermo ritagliata al centro della tela; testo, bottoni e contatore sono nascosti.
// Poi ffmpeg fa il video: ogni pixel della tela diventa 2×2, così il colore (che H.264 tiene a metà risoluzione) resta
// sulle linee sottili, e i pixel restano quelli grossi del telefono.
//
// Uso: (con il sito acceso, es. npx astro dev --port 4352)
//   node scripts/registra-cane-segui.mjs [url] [secondi] [inizio] [durata]
//     url: predefinito http://localhost:4352/learn/?vicino=0.55 (?vicino porta più vicina la camera di «follow the dog»,
//     src/scripts/nuvole.ts; senza parametro la pagina non cambia)
//     secondi registrati: 34 (una partita dell'AI dura circa 24 s, poi 4 s di festa)
//     inizio e durata della clip in secondi: vedi INIZIO e DURATA qui sotto
//   node scripts/registra-cane-segui.mjs --solo-video [inizio] [durata]   rifà solo il video dai fotogrammi già presi
// Uscita: public/learn/biglietti/cane-segui.mp4 (i fotogrammi PNG restano in una cartella temporanea)
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOLO_VIDEO = process.argv[2] === '--solo-video';
const arg = SOLO_VIDEO ? ['', '', ...process.argv.slice(3)] : process.argv.slice(2);
const URL_PAGINA = arg[0] || 'http://localhost:4352/learn/?vicino=0.55';
const SECONDI = Number(arg[1] || 34);
const INIZIO = Number(arg[2] || 14), DURATA = Number(arg[3] || 14), FONDI = 0.8, CRF = 39;
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FPS = 30, SOTTOPASSI = 1;            // 30 fotogrammi al secondo, uno per passo da 1/30 s (come il telefono): fluido
const LARGO = 390, ALTO = 844;            // il telefono
const TAGLIO = { w: 390, h: 270 };        // il ritaglio al centro, circa 1,45:1 come il biglietto
const PORTA = 9300 + Math.floor(Math.random() * 600);
const TMP = join(tmpdir(), 'registra-cane-segui');
const FOTO = join(TMP, 'foto');
const USCITA = 'public/learn/biglietti';

if (SOLO_VIDEO) { codifica(); process.exit(0); }
rmSync(TMP, { recursive: true, force: true });
mkdirSync(FOTO, { recursive: true });
mkdirSync(USCITA, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORTA}`, `--user-data-dir=${join(TMP, 'profilo')}`,
  '--no-first-run', '--no-default-browser-check', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--window-size=${LARGO},${ALTO}`, 'about:blank',
], { stdio: 'ignore' });
const fine = () => { try { chrome.kill(); } catch { /* niente */ } };
process.on('exit', fine);

const aspetta = ms => new Promise(r => setTimeout(r, ms));
let pagina;
for (let i = 0; i < 50 && !pagina; i++) {
  await aspetta(200);
  try { pagina = (await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* non ancora */ }
}
if (!pagina) throw new Error('Chrome non risponde');

// CDP su WebSocket (Node 22+ lo ha già)
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
let id = 0;
const attese = new Map();
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && attese.has(m.id)) { const { ok, no } = attese.get(m.id); attese.delete(m.id); m.error ? no(new Error(JSON.stringify(m.error))) : ok(m.result); }
  if (m.method === 'Network.loadingFailed') console.log('richiesta fallita:', m.params.errorText, m.params.requestId);
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) console.log('risposta', m.params.response.status, m.params.response.url);
  if (m.method === 'Runtime.exceptionThrown') console.log('errore in pagina:', m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text);
};
const cdp = (method, params = {}) => new Promise((ok, no) => { const n = ++id; attese.set(n, { ok, no }); ws.send(JSON.stringify({ id: n, method, params })); });
const valuta = async expr => {
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};

// L'orologio finto e un caso ripetibile, prima di ogni altro script della pagina
const OROLOGIO = `(() => {
  let ora = 1000, coda = [], prossimo = 1;
  let seme = 20261108;
  Math.random = () => { seme = (seme + 0x6d2b79f5) | 0; let t = Math.imul(seme ^ (seme >>> 15), 1 | seme); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  performance.now = () => ora;
  window.requestAnimationFrame = f => { const n = prossimo++; coda.push([n, f]); return n; };
  window.cancelAnimationFrame = n => { coda = coda.filter(c => c[0] !== n); };
  window.__passo = ms => { ora += ms; const ora_ = coda; coda = []; for (const [, f] of ora_) { try { f(ora); } catch (e) { console.error(e); } } return ora_.length; };
})();`;

await cdp('Runtime.enable');
await cdp('Page.enable');
await cdp('Network.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: LARGO, height: ALTO, deviceScaleFactor: 1, mobile: true });
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: OROLOGIO });
await cdp('Page.navigate', { url: URL_PAGINA });

// Aspetta la tela WebGL e il bottone, facendo girare l'orologio piano
for (let i = 0; ; i++) {
  if (i > 300) throw new Error('la scena non parte');
  // Il server di sviluppo a volte ricompila al primo giro e il modulo non arriva: si ricarica la pagina
  if (i && i % 100 === 0) { console.log('ricarico la pagina'); await cdp('Page.reload', { ignoreCache: true }); }
  await aspetta(100);
  const pronto = await valuta(`!!document.querySelector('.scena3d canvas') && [...document.querySelectorAll('button')].some(b => b.textContent === 'follow the dog')`).catch(() => false);
  if (pronto) break;
}
console.log('scena pronta');
// Un secondo di scena per caricare i pesi dell'AI, poi «follow the dog»
for (let i = 0; i < 30; i++) { await valuta('__passo(1000/30)'); await aspetta(30); }
await valuta(`[...document.querySelectorAll('button')].find(b => b.textContent === 'follow the dog').click()`);

// Sopra la scena non deve restare niente: testo della pagina, bottoni, contatore, cursore
await valuta(`(() => { const st = document.createElement('style'); st.textContent = 'body > *:not(.fondo3d), .learn, button, .scena3d > :not(canvas) { visibility: hidden !important; }'; document.head.appendChild(st); })()`);
const riquadro = await valuta(`(() => { const r = document.querySelector('.scena3d canvas').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
const clip = { x: riquadro.x + Math.round((riquadro.w - TAGLIO.w) / 2), y: riquadro.y + Math.round((riquadro.h - TAGLIO.h) / 2), width: TAGLIO.w, height: TAGLIO.h, scale: 1 };
console.log('tela', riquadro, 'ritaglio', clip);

// Un fotogramma: SOTTOPASSI passi dell'orologio, poi la foto dello schermo nel ritaglio.
// Nota: leggere la tela WebGL con drawImage dentro lo stesso compito lascia scie (il buffer non passa dal compositore);
// la foto dello schermo invece prende il fotogramma vero, con lo sfondo della pagina sotto la tela trasparente
const PASSO = `(() => { for (let i = 0; i < ${SOTTOPASSI}; i++) __passo(1000 / ${FPS * SOTTOPASSI}); return ([...document.querySelectorAll('.scena3d span')].map(s => s.textContent).find(s => s && s.includes('Sheep')) ?? ''); })()`;

const N = Math.round(SECONDI * FPS);
const via = Date.now();
for (let f = 0; f < N; f++) {
  const conta = await valuta(PASSO);
  // Una volta Chrome si è fermato a metà: dopo 30 s senza foto si smette e si fa il video con quello che c'è
  const foto = await Promise.race([cdp('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false }), aspetta(30000).then(() => null)]);
  if (!foto) { console.log(`Chrome non risponde al fotogramma ${f}: mi fermo qui`); break; }
  writeFileSync(join(FOTO, `f${String(f).padStart(4, '0')}.png`), Buffer.from(foto.data, 'base64'));
  if (f % FPS === 0) console.log(`${(f / FPS).toFixed(0)} s · ${conta.split(String.fromCharCode(10)).pop()}`);
}
console.log(`${N} fotogrammi in ${((Date.now() - via) / 1000).toFixed(0)} s`);
ws.close();
fine();

codifica();

// Il video: DURATA secondi dal secondo INIZIO, ogni pixel 2×2 senza sfumare. Un video solo, H.264: va ovunque, Safari compreso
// (VP9 a parità di aspetto pesava di più). Il giro si chiude senza salto: l'ultimo FONDI di secondo passa dal nero al primo.
// Si può rifare solo questa parte sui fotogrammi già presi: node scripts/registra-cane-segui.mjs --solo-video [inizio] [durata]
function codifica() {
  const a = Math.round(INIZIO * FPS), d = Math.round(DURATA * FPS), f = Math.round(FONDI * FPS);
  // Senza abbastanza fotogrammi non si tocca il video che c'è già
  if (!existsSync(join(FOTO, `f${String(a + d - 1).padStart(4, '0')}.png`))) { console.log(`mancano fotogrammi fino a ${INIZIO + DURATA} s: video non rifatto`); return; }
  const grafo = `[0:v]split[x][y];[x]trim=start_frame=${a + f}:end_frame=${a + d},setpts=PTS-STARTPTS[a];`
    + `[y]trim=start_frame=${a}:end_frame=${a + f},setpts=PTS-STARTPTS[b];`
    + `[a]scale=iw*2:ih*2:flags=neighbor[a2];[b]scale=iw*2:ih*2:flags=neighbor[b2];[a2][b2]xfade=transition=fadeblack:duration=${f / FPS}:offset=${(d - 2 * f) / FPS},format=yuv420p[v]`;
  const comune = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(FOTO, 'f%04d.png'), '-filter_complex', grafo, '-map', '[v]', '-an'];
  execFileSync('ffmpeg', [...comune, '-c:v', 'libx264', '-preset', 'veryslow', '-crf', String(CRF), '-tune', 'animation', '-movflags', '+faststart', join(USCITA, 'cane-segui.mp4')], { stdio: 'inherit' });
  console.log(`cane-segui.mp4: ${(statSync(join(USCITA, 'cane-segui.mp4')).size / 1024).toFixed(0)} KB · ${((d - f) / FPS).toFixed(1)} s`);
  console.log(`fotogrammi in ${FOTO}`);
}
execFileSync('ffmpeg', [...comune, ...filtro, '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '28', '-tune', 'animation', '-movflags', '+faststart', '-an', join(USCITA, 'cane-segui.mp4')], { stdio: 'inherit' });
execFileSync('ffmpeg', [...comune, ...filtro, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '40', '-row-mt', '1', '-an', join(USCITA, 'cane-segui.webm')], { stdio: 'inherit' });
for (const e of ['mp4', 'webm']) console.log(`cane-segui.${e}: ${(statSync(join(USCITA, `cane-segui.${e}`)).size / 1024).toFixed(0)} KB`);
console.log(`fotogrammi in ${FOTO}`);
