import { dividi } from '../lib/glossario';
import type { Partita, Volo } from '../lib/voli';
import { timbro, tipo, type Livello } from './arteBiglietti';
import { STILI, casoDa, disegnaAscii } from './stiliBiglietto';

// Il nome dello stile nella riga in alto del biglietto: ogni stile ha il suo, invece di "rapid" per tutti
const NOME_STILE: Record<string, string> = { rapid: 'rapid', lime: 'bloom', riso: 'riso', notte: 'night', koi: 'koi pond', valle: 'valley' };

// La carta d'imbarco di AI terms. Ogni biglietto pesca uno stile a caso (src/scripts/stiliBiglietto.ts) e una variante;
// la struttura è sempre la stessa. Lo stile di partenza è "70s Rapid": ogni sezione ha la sua carta piena e i
// suoi due colori di stampa. Davanti, da sinistra: l'oggetto della tecnologia, la banda in foglia con il motto (argento,
// oro o olografica secondo il livello), la carta con la domanda, il tagliando su carta di sicurezza
// con il numero rosso. Risposta sbagliata: timbro rosso e si riprova. Risposta giusta: timbro verde, poi si gira.
// Dietro, metà e metà: il poster a sinistra, la definizione su carta a righe a destra.
// La foglia risponde all'inclinazione: mouse, dito o giroscopio. Senza input il biglietto ondeggia piano.
// Il testo delle note si scrive sempre come testo, mai come HTML.
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', testo?: string) => {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (testo !== undefined) e.textContent = testo;
  return e;
};
const MESI = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const FOGLIA: Record<Livello, string> = { easy: 'argento', medium: 'oro', hard: 'iride' };
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const livelloDi = (v: Volo): Livello => (['easy', 'medium', 'hard'].includes(v.voce.livello) ? v.voce.livello : 'easy') as Livello;
const strati = () => [el('div', 'strato grana'), el('div', 'strato perla'), el('div', 'strato bagliore')];

export type OpzioniImbarco = {
  data: Date; voli: Volo[]; partita: Partita;
  // Dopo ogni risposta. Il biglietto ha già aggiornato la partita
  dopo: (i: number, giusto: boolean) => void;
  // Una riga sullo stato del gioco, per il retro: serie e album
  riassunto: () => string;
  prossimo: () => void; chiudi: () => void;
  // Il testo del bottone per andare avanti: domanda dopo, risultati, ancora
  testoProssimo?: () => string;
};

export function nuovoImbarco(contenitore: HTMLElement, o: OpzioniImbarco) {
  const scheda = el('aside', 'imbarco');
  scheda.hidden = true;
  scheda.setAttribute('aria-label', 'boarding pass');
  const biglietto = el('div', 'biglietto'), carta = el('div', 'carta');

  // --- Davanti
  const fronte = el('section', 'faccia fronte');
  const arte = el('div', 'arte70'), banda = el('div', 'banda'), motto = el('span', 'mono');
  banda.append(motto);
  const corpo = el('div', 'corpo');
  const riga = el('p', 'mono sotto');
  const scheda70 = el('div', 'carta-dom'), termine = el('h2', 'titolo'), sezione = el('p', 'corsivo'), domanda = el('p', 'domanda'), opzioniEl = el('div', 'opzioni'), nota = el('p', 'mono nota');
  nota.setAttribute('aria-live', 'polite');
  scheda70.append(termine, sezione, domanda, opzioniEl, nota);
  corpo.append(riga, scheda70);
  const tagliando = el('div', 'tagliando'), numeroF = el('p', 'numero'), serialeT = el('p', 'seriale'), fine = el('p', 'mono fine'), codice = el('div', 'codice');
  tagliando.append(numeroF, serialeT, fine, codice);
  const timbri = el('div', 'timbri');
  fronte.append(arte, banda, corpo, tagliando, timbri, ...strati());

  // --- Dietro
  const retro = el('section', 'faccia retro');
  const quadro = el('div', 'poster');
  const pannello = el('div', 'pannello'), esito = el('p', 'mono sotto');
  const termineR = el('h2', 'titolo'), sezioneR = el('p', 'corsivo'), definizione = el('div', 'definizione'), piedeR = el('div', 'piede-retro'), serialeR = el('p', 'mono seriale'), statoR = el('p', 'mono stato');
  piedeR.append(serialeR);
  // La definizione scorre da sola: il dito che la scorre non inclina il biglietto. Se il testo continua, lo dice
  const scorre = el('div', 'scorre');
  scorre.append(definizione);
  pannello.append(esito, termineR, sezioneR, scorre, statoR, piedeR);
  for (const tipoE of ['pointerdown', 'pointermove'] as const) definizione.addEventListener(tipoE, e => e.stopPropagation());
  const segnaAltro = () => scorre.classList.toggle('altro', definizione.scrollTop + definizione.clientHeight < definizione.scrollHeight - 4);
  definizione.addEventListener('scroll', segnaAltro, { passive: true });
  retro.append(quadro, pannello, ...strati());
  carta.append(fronte, retro);
  biglietto.append(carta);
  const azioni = el('div', 'azioni'), gira = el('button', 'mono gira'), prossimo = el('button', 'mono prossimo'), chiudi = el('button', 'mono chiudi', 'close ×');
  prossimo.type = chiudi.type = gira.type = 'button';
  prossimo.addEventListener('click', o.prossimo);
  chiudi.addEventListener('click', o.chiudi);
  gira.addEventListener('click', () => { carta.classList.toggle('girata'); scriviGira(); });
  azioni.append(gira, prossimo, chiudi);
  scheda.append(biglietto, azioni);
  contenitore.appendChild(scheda);

  // --- L'inclinazione. Da -1 a 1 su x e y. Il mouse sopra o il dito che trascina vincono; poi il giroscopio; senza
  // niente, un'oscillazione lenta. Ogni fotogramma scrive --tx, --ty, --t e gira i gradienti della foglia
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mano = { x: 0, y: 0, attiva: false }, ora = { x: 0, y: 0 };
  let giro: { x: number; y: number } | null = null, anima = 0, foglie: Element[] = [], tele: HTMLCanvasElement[] = [], ultimoAscii = 0;
  const limita = (v: number) => Math.max(-1, Math.min(1, v));
  const segui = (e: PointerEvent) => {
    const r = biglietto.getBoundingClientRect();
    mano.x = limita(((e.clientX - r.left) / r.width - 0.5) * 2); mano.y = limita(((e.clientY - r.top) / r.height - 0.5) * 2);
    mano.attiva = true;
  };
  biglietto.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) segui(e); });
  biglietto.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') segui(e);
    // iOS chiede il permesso per il giroscopio al primo tocco
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (e.pointerType !== 'mouse' && typeof D.requestPermission === 'function' && !giro) D.requestPermission().catch(() => { /* resta il dito */ });
  });
  biglietto.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') mano.attiva = false; });
  biglietto.addEventListener('pointerleave', () => { mano.attiva = false; });
  window.addEventListener('deviceorientation', e => {
    if (e.gamma === null || e.beta === null) return;
    giro = { x: limita(e.gamma / 35), y: limita((e.beta - 45) / 35) };
  });
  const passo = (t: number) => {
    anima = 0;
    if (scheda.hidden) return;
    let x = 0, y = 0;
    if (mano.attiva) { x = mano.x; y = mano.y; }
    else if (giro) { x = giro.x; y = giro.y; }
    else if (!fermo) { x = Math.sin(t / 1600) * 0.5; y = Math.sin(t / 2300 + 1) * 0.35; }
    ora.x += (x - ora.x) * 0.12; ora.y += (y - ora.y) * 0.12;
    const s = biglietto.style;
    s.setProperty('--tx', ora.x.toFixed(3)); s.setProperty('--ty', ora.y.toFixed(3));
    s.setProperty('--t', Math.min(1, Math.hypot(ora.x, ora.y)).toFixed(3));
    s.transform = fermo ? '' : `perspective(1600px) rotateX(${(-ora.y * 9).toFixed(2)}deg) rotateY(${(ora.x * 12).toFixed(2)}deg)`;
    const ang = 20 + ora.x * 70 + ora.y * 25, sp = ora.x * 0.5;
    foglie.forEach(g => g.setAttribute('gradientTransform', `translate(${sp.toFixed(3)} 0) rotate(${ang.toFixed(1)} .5 .5)`));
    // Le tele vive: circa 30 fotogrammi al secondo (le scene di caratteri si limitano da sole); con il movimento ridotto un fotogramma solo
    if (tele.length && t - ultimoAscii > 33) { ultimoAscii = t; tele.forEach(c => { if (fermo && c.dataset.fatto) return; disegnaAscii(c, t, ora.x, ora.y); c.dataset.fatto = '1'; }); }
    anima = requestAnimationFrame(passo);
  };
  const avvia = () => { if (!anima) anima = requestAnimationFrame(passo); };

  // --- Il sorteggio dello stile: uno per biglietto, mai lo stesso due volte di fila. Il seme tiene ferme le scelte
  // della variante, così il retro e un biglietto riaperto combaciano con il davanti
  const sorteggio = new Map<string, { stile: number; seme: number }>();
  let ultimoStile = -1, variabiliMesse: string[] = [];
  const stileDi = (v: Volo) => {
    let x = sorteggio.get(v.seriale);
    if (!x) {
      // Solo gli stili ammessi per questa sezione e questo livello (70s Rapid esce solo in alcune sezioni)
      const ammessi = STILI.map((st, k) => k).filter(k => STILI[k]!.ammesso?.(v.sezione, livelloDi(v)) ?? true), altri = ammessi.filter(k => k !== ultimoStile);
      const pool = altri.length ? altri : ammessi, k = pool[Math.floor(Math.random() * pool.length)]!;
      ultimoStile = k;
      x = { stile: k, seme: 1 + Math.floor(Math.random() * 2147483646) };
      sorteggio.set(v.seriale, x);
    }
    return x;
  };
  const disegnaStile = (v: Volo, sera: boolean) => {
    const x = stileDi(v), st = STILI[x.stile]!, c = { sezione: v.sezione, livello: livelloDi(v), numero: String(v.indice + 1).padStart(2, '0'), termine: v.voce.termine, sera, r: casoDa(x.seme) };
    const variabili = st.variabili(c), davanti = st.davanti(c), dietro = st.dietro(c);
    return { st, variabili, davanti, dietro };
  };
  const p = o.partita, d = o.data, quando = `${String(d.getDate()).padStart(2, '0')} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
  let corrente = -1, attesa = 0, opzioni: HTMLButtonElement[] = [];
  const barre = (dove: HTMLElement, chiave: string) => dove.replaceChildren(...[...chiave.replace(/[\s-]+/g, '')].slice(0, 30).map((c, k) => { const s = el('span'); s.style.width = `${1 + (c.charCodeAt(0) % 3)}px`; s.style.marginRight = `${1 + ((c.charCodeAt(0) + k) % 2)}px`; return s; }));
  const svg = (dove: HTMLElement, html: string) => {
    dove.innerHTML = html;
    if (fermo) dove.querySelectorAll('svg').forEach(s => s.pauseAnimations());
  };
  const metti = (t: { x: number; y: number; a: number; ok: boolean }, nuovo: boolean) => {
    const v = o.voli[corrente]!, s = el('div', `timbro${t.ok ? ' ok' : ''}${nuovo && !fermo ? ' cade' : ''}`);
    s.innerHTML = timbro(t.ok, quando, v.codice, Math.round(t.x * 37 + t.y * 11) % 97);
    s.style.left = `${t.x}%`; s.style.top = `${t.y}%`; s.style.setProperty('--a', `${t.a}deg`);
    timbri.append(s);
  };
  const retroDi = (v: Volo) => {
    const t = p.tentativi[v.indice]!;
    svg(quadro, disegnaStile(v, t > 1).dietro);
    foglie = [...scheda.querySelectorAll('.foglia-svg')];
    tele = [...scheda.querySelectorAll<HTMLCanvasElement>('canvas[data-ascii]')];
    esito.textContent = `${String(v.indice + 1).padStart(2, '0')} · ${t <= 1 ? 'cleared at the first try' : `cleared after ${t} tries`}`;
    termineR.textContent = v.voce.termine;
    sezioneR.textContent = `${v.nome}, ${v.voce.sotto.toLowerCase()}`;
    definizione.replaceChildren(...v.voce.definizione.map(x => el('p', '', x)));
    if (v.voce.punti.length) {
      const lista = el('ul');
      v.voce.punti.map(dividi).forEach(q => {
        const li = el('li');
        if (q.nome) li.append(el('strong', '', `${q.nome}: `));
        li.append(q.testo);
        lista.append(li);
      });
      definizione.append(lista);
    }
    definizione.scrollTop = 0;
    requestAnimationFrame(segnaAltro);
    serialeR.textContent = `No. ${v.seriale}`;
    statoR.textContent = o.riassunto();
  };
  const scriviGira = () => { gira.textContent = carta.classList.contains('girata') ? 'back to the question ↺' : 'turn over ↻'; };
  const bottoni = () => {
    const v = o.voli[corrente]!, fatto = p.fatto[corrente]!;
    gira.hidden = !fatto;
    scriviGira();
    prossimo.hidden = !fatto;
    prossimo.textContent = o.testoProssimo?.() ?? 'next flight →';
    if (!fatto) nota.textContent = p.sbagliate[corrente]!.length ? 'Delayed. Try again.' : `Clear ${v.codice} for take-off.`;
    else nota.textContent = 'Cleared for take-off.';
  };
  const rispondi = (b: HTMLButtonElement) => {
    const i = corrente, v = o.voli[i]!;
    if (p.fatto[i] || b.disabled) return;
    const giusto = b.dataset.testo === v.voce.domanda.risposte[0];
    p.tentativi[i]!++;
    // Il timbro cade in un punto a caso del lato con la domanda. Può cadere a cavallo del bordo: si stampa solo la parte
    // sulla carta, perché la faccia ritaglia tutto quello che esce
    const t = { x: -4 + Math.random() * 76, y: -16 + Math.random() * 66, a: Math.round(Math.random() * 56 - 28), ok: giusto };
    p.timbri[i]!.push(t);
    if (giusto) {
      p.fatto[i] = true;
      opzioni.forEach(x => { x.disabled = true; });
      b.classList.add('giusta');
    } else {
      p.sbagliate[i]!.push(b.dataset.testo!);
      b.disabled = true;
      b.classList.add('sbagliata');
      if (!fermo) { carta.classList.remove('scossa'); void carta.offsetWidth; carta.classList.add('scossa'); }
    }
    metti(t, true);
    o.dopo(i, giusto);
    bottoni();
    if (giusto) {
      retroDi(v);
      attesa = window.setTimeout(() => { carta.classList.add('girata'); scriviGira(); }, fermo ? 0 : 1200);
    }
  };
  window.addEventListener('keydown', e => {
    if (scheda.hidden || corrente < 0) return;
    if (e.key === 'Escape') { o.chiudi(); return; }
    const b = opzioni[Number(e.key) - 1];
    if (b) rispondi(b);
  });

  return {
    get aperto() { return scheda.hidden ? -1 : corrente; },
    mostra(i: number) {
      clearTimeout(attesa);
      corrente = i;
      const v = o.voli[i]!, n = String(i + 1).padStart(2, '0'), l = livelloDi(v), tp = tipo(v.sezione);
      carta.dataset.livello = l;
      carta.dataset.sezione = String(v.sezione);
      const ds = disegnaStile(v, false);
      variabiliMesse.forEach(k => carta.style.removeProperty(k));
      variabiliMesse = Object.keys(ds.variabili);
      for (const [k, x] of Object.entries(ds.variabili)) carta.style.setProperty(k, x);
      carta.dataset.stile = ds.st.id;
      carta.style.setProperty('--trama', `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='44' height='9'><g fill='none' stroke='${tp.trama}' stroke-width='.6'><path d='M0 2.5 Q5.5 0 11 2.5 T22 2.5 T33 2.5 T44 2.5'/><path d='M0 6.5 Q5.5 9 11 6.5 T22 6.5 T33 6.5 T44 6.5'/></g></svg>`)}")`);
      carta.classList.add('subito');
      carta.classList.toggle('girata', p.fatto[i]!);
      requestAnimationFrame(() => requestAnimationFrame(() => carta.classList.remove('subito')));
      svg(arte, ds.davanti);
      banda.className = `banda ${FOGLIA[l]}`;
      motto.textContent = `${tp.motto} · ${n}`;
      riga.textContent = `${NOME_STILE[ds.st.id] ?? ds.st.id} · ${v.nome.toLowerCase()} · ${l} class`;
      termine.textContent = v.voce.termine;
      sezione.textContent = v.voce.sotto.toLowerCase();
      domanda.textContent = v.voce.domanda.testo;
      numeroF.textContent = n;
      serialeT.textContent = v.seriale;
      // Il posto 42 è sempre degli altri termini
      const posto = v.sezione === 5 ? '42' : `${i + 1}${'ABCDEF'[hash(v.voce.id) % 6]}`;
      fine.replaceChildren(...[`valid ${quando.slice(0, 6)}`, `flight ${v.codice} · gate G${i + 1}`, `seat ${posto} · one way`].map(x => el('span', '', x)));
      barre(codice, `${v.voce.termine}${v.voce.id}${v.codice}`);
      const sbagliate = p.sbagliate[i]!;
      opzioni = v.risposte.map((testoR, k) => {
        const b = el('button', 'opzione');
        b.type = 'button';
        b.dataset.testo = testoR;
        b.append(el('span', 'mono', `0${k + 1}`), testoR);
        if (sbagliate.includes(testoR)) { b.disabled = true; b.classList.add('sbagliata'); }
        if (p.fatto[i]) { b.disabled = true; if (testoR === v.voce.domanda.risposte[0]) b.classList.add('giusta'); }
        b.addEventListener('click', () => rispondi(b));
        return b;
      });
      opzioniEl.replaceChildren(...opzioni);
      timbri.replaceChildren();
      p.timbri[i]!.forEach(t => metti(t, false));
      if (p.fatto[i]) retroDi(v); else { quadro.replaceChildren(); }
      foglie = [...scheda.querySelectorAll('.foglia-svg')];
      tele = [...scheda.querySelectorAll<HTMLCanvasElement>('canvas[data-ascii]')];
      bottoni();
      scheda.hidden = false;
      avvia();
      (p.fatto[i] ? (prossimo.hidden ? chiudi : prossimo) : opzioni.find(b => !b.disabled))?.focus({ preventScroll: true });
    },
    nascondi() { clearTimeout(attesa); scheda.hidden = true; },
  };
}
