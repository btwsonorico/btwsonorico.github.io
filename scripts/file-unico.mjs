// Crea un solo file HTML da mandare: tutte le pagine del sito, con CSS e JavaScript dentro.
// Si apre con un doppio clic, senza server. Uso: npm run export (prima fa la build).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const USCITA = join('export', 'riccardomondi.html');
const leggi = p => readFileSync(join(DIST, p), 'utf8');
const dataUrl = js => `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;

// Pagine: percorso del sito → file della build
const pagine = ['/', '/knowledge/', '/projects/'];
for (const sezione of ['knowledge', 'projects']) {
  for (const d of readdirSync(join(DIST, sezione), { withFileTypes: true })) {
    if (d.isDirectory() && existsSync(join(DIST, sezione, d.name, 'index.html'))) pagine.push(`/${sezione}/${d.name}/`);
  }
}
// Pagine dei temi: /knowledge/t/<tema>/
if (existsSync(join(DIST, 'knowledge', 't'))) {
  for (const d of readdirSync(join(DIST, 'knowledge', 't'), { withFileTypes: true })) {
    if (d.isDirectory()) pagine.push(`/knowledge/t/${d.name}/`);
  }
}
const html = Object.fromEntries(pagine.map(p => [p, leggi(join(p, 'index.html'))]));
const main = h => h.match(/<main[\s\S]*?<\/main>/)[0];
const titolo = h => h.match(/<title>([\s\S]*?)<\/title>/)[1];

let base = html['/'];

// CSS: il file comune e gli stili in linea di ogni pagina, senza doppioni
const stili = new Set();
for (const h of Object.values(html)) {
  for (const m of h.matchAll(/<link rel="stylesheet" href="(\/_astro\/[^"]+)">/g)) stili.add(leggi(m[1]));
  for (const m of h.matchAll(/<style>([\s\S]*?)<\/style>/g)) stili.add(m[1]);
}
base = base.replace(/<link rel="stylesheet" href="\/_astro\/[^"]+">/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');
base = base.replace('</head>', `<style>${[...stili].join('\n')}</style></head>`);
base = base.replace(/<link rel="alternate"[^>]*>/, '');
// Il font del sito dentro il file
const font = readFileSync(join('public', 'fonts', 'DepartureMono-Regular.woff2')).toString('base64');
base = base.replace(/url\(['"]?\/fonts\/DepartureMono-Regular\.woff2['"]?\)/g, `url(data:font/woff2;base64,${font})`);

// Tutte le pagine nello stesso file; si vede una pagina per volta
const sezioni = pagine.map(p => `<div data-pagina="${p}"${p === '/' ? '' : ' hidden'}>${main(html[p])}</div>`).join('\n');
base = base.replace(/<main[\s\S]*?<\/main>/, () => sezioni);

// Script del grafo: in linea, e i clic sui nodi passano dal router del file
// Ogni pagina ha il suo tag: il primo diventa lo script in linea, gli altri si tolgono (uno basta per tutti i grafi)
const inclusi = new Set();
base = base.replace(/<script type="module" src="(\/_astro\/[^"]+)"><\/script>/g, (_, src) => {
  if (inclusi.has(src)) return '';
  inclusi.add(src);
  const js = leggi(src).replace(/window\.location\.href=(\$?\w+\.href)/g, 'window.__vai($1)');
  return `<script type="module">${js}</script>`;
});

// Isola React (tab della home): i moduli diventano data URL, anche le loro importazioni
const moduli = readdirSync(join(DIST, '_astro')).filter(f => f.endsWith('.js'));
const condiviso = moduli.find(f => /^index\..+\.js$/.test(f));
const urlCondiviso = dataUrl(leggi(`/_astro/${condiviso}`));
base = base.replace(/(component-url|renderer-url)="(\/_astro\/[^"]+)"/g, (_, attr, src) =>
  `${attr}="${dataUrl(leggi(src).replaceAll(`"./${condiviso}"`, `"${urlCondiviso}"`))}"`);

const titoli = Object.fromEntries(pagine.map(p => [p, titolo(html[p])]));
const router = `<script>
(() => {
  const titoli = ${JSON.stringify(titoli)};
  const pulisci = p => p.split('#')[0].split('?')[0];
  function mostra(p) {
    if (!(p in titoli)) p = '/';
    document.querySelectorAll('[data-pagina]').forEach(el => { el.hidden = el.dataset.pagina !== p; });
    document.title = titoli[p];
  }
  window.__vai = href => {
    const p = pulisci(href);
    if (!(p in titoli)) return;
    history.pushState(null, '', '#!' + p);
    mostra(p);
    scrollTo(0, 0);
  };
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="/"]');
    if (!a || !(pulisci(a.getAttribute('href')) in titoli)) return;
    e.preventDefault();
    window.__vai(a.getAttribute('href'));
  });
  const daIndirizzo = () => mostra(location.hash.startsWith('#!') ? location.hash.slice(2) : '/');
  addEventListener('popstate', daIndirizzo);
  daIndirizzo();
})();
</script>`;
base = base.replace('</body>', `${router}</body>`);

mkdirSync('export', { recursive: true });
writeFileSync(USCITA, base);
console.log(`${USCITA}: ${pagine.length} pagine, ${(Buffer.byteLength(base) / 1024).toFixed(0)} KB`);
