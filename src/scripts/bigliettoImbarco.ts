import { dividi } from '../lib/glossario';
import { salvaPartita, type Partita, type Volo } from '../lib/voloDelGiorno';
import { scena, timbro } from './scenetteVolo';

// La carta d'imbarco di AI terms. Davanti, da sinistra: il francobollo con la scena della sezione, la domanda con tre
// risposte, una striscia olografica e il tagliando con volo, data, posto e codice a barre.
// Risposta sbagliata: un timbro rosso cade sul biglietto e si riprova. Risposta giusta: timbro verde, poi il biglietto si gira.
// Dietro: la scena con il meteo dell'esito (sole al primo colpo, pioggia dopo un errore) e la definizione.
// Il testo delle note si scrive sempre come testo, mai come HTML.
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', testo?: string) => {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (testo !== undefined) e.textContent = testo;
  return e;
};
const inchiostro = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#121417' : '#f4f1ea';
};
const MESI = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export type OpzioniImbarco = {
  giorno: number; data: Date; voli: Volo[]; partita: Partita;
  // Dopo ogni risposta. Il biglietto ha già aggiornato e salvato la partita
  dopo: (i: number, giusto: boolean) => void;
  prossimo: () => void; chiudi: () => void;
};

export function nuovoImbarco(contenitore: HTMLElement, o: OpzioniImbarco) {
  const scheda = el('aside', 'imbarco');
  scheda.hidden = true;
  scheda.setAttribute('aria-label', 'boarding pass');
  const biglietto = el('div', 'biglietto'), carta = el('div', 'carta');
  // Davanti
  const fronte = el('section', 'faccia fronte'), francobollo = el('div', 'francobollo'), corpo = el('div', 'corpo-biglietto');
  const testa = el('p', 'mono testa'), gruppo = el('p', 'mono gruppo'), termine = el('h2', 'termine'), domanda = el('p', 'domanda'), opzioniEl = el('div', 'opzioni'), nota = el('p', 'mono nota'), timbri = el('div', 'timbri');
  nota.setAttribute('aria-live', 'polite');
  corpo.append(testa, gruppo, termine, domanda, opzioniEl, nota, timbri);
  const olo = el('div', 'olo'), oloTesto = el('p', 'mono', 'AI TERMS · BOARDING PASS'), oloNumero = el('p', 'mono numero');
  olo.append(oloTesto, oloNumero);
  const tagliando = el('div', 'tagliando'), griglia = el('dl', 'mono griglia'), codice = el('div', 'codice');
  tagliando.append(griglia, codice);
  fronte.append(francobollo, corpo, olo, tagliando);
  // Dietro
  const retro = el('section', 'faccia retro'), grafica = el('div', 'grafica'), testoR = el('div', 'testo-retro');
  const esito = el('p', 'mono esito'), termineR = el('h2', 'termine'), definizione = el('div', 'definizione'), seriale = el('p', 'mono seriale');
  testoR.append(esito, termineR, definizione, seriale);
  retro.append(grafica, testoR);
  carta.append(fronte, retro);
  biglietto.append(carta);
  const azioni = el('div', 'azioni'), prossimo = el('button', 'mono prossimo'), chiudi = el('button', 'mono chiudi', 'close ×');
  prossimo.type = chiudi.type = 'button';
  prossimo.addEventListener('click', o.prossimo);
  chiudi.addEventListener('click', o.chiudi);
  azioni.append(prossimo, chiudi);
  scheda.append(biglietto, azioni);
  contenitore.appendChild(scheda);

  // L'inclinazione segue il puntatore; il riflesso e l'ologramma si spostano con lui
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  biglietto.addEventListener('pointermove', e => {
    if (fermo || e.pointerType !== 'mouse') return;
    const r = biglietto.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    carta.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
    carta.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
    carta.style.setProperty('--lx', `${((x + 0.5) * 100).toFixed(1)}%`);
  });
  biglietto.addEventListener('pointerleave', () => { carta.style.setProperty('--rx', '0deg'); carta.style.setProperty('--ry', '0deg'); });

  const p = o.partita;
  let corrente = -1, attesa = 0, opzioni: HTMLButtonElement[] = [];
  const restano = () => p.fatto.some(f => !f);
  const metti = (t: { x: number; y: number; a: number; ok: boolean }, nuovo: boolean) => {
    const s = el('div', `timbro${t.ok ? ' ok' : ''}${nuovo && !fermo ? ' cade' : ''}`);
    s.innerHTML = timbro(t.ok);
    s.style.left = `${t.x}%`; s.style.top = `${t.y}%`; s.style.setProperty('--a', `${t.a}deg`);
    timbri.append(s);
  };
  const retroDi = (v: Volo) => {
    const t = p.tentativi[v.indice]!;
    grafica.innerHTML = scena(v.sezione, t <= 1 ? 'sole' : 'pioggia', v.tinta);
    esito.textContent = t <= 1 ? `${v.codice} cleared · first try` : `${v.codice} cleared · after ${t} tries`;
    termineR.textContent = v.voce.termine;
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
    seriale.textContent = `${v.voce.id.slice(0, 22)} · ${v.voce.livello} · #${o.giorno}`;
  };
  const bottoni = () => {
    const v = o.voli[corrente]!, fatto = p.fatto[corrente]!;
    prossimo.hidden = !fatto;
    prossimo.textContent = restano() ? 'next flight →' : 'see your day →';
    if (!fatto) nota.textContent = p.sbagliate[corrente]!.length ? 'Delayed. Try again.' : `Clear ${v.codice} for take-off.`;
    else nota.textContent = 'Cleared for take-off.';
  };
  const rispondi = (b: HTMLButtonElement) => {
    const i = corrente, v = o.voli[i]!;
    if (p.fatto[i] || b.disabled) return;
    const giusto = b.dataset.testo === v.voce.domanda.risposte[0];
    p.tentativi[i]!++;
    // Il timbro cade in un punto a caso del lato con la domanda
    const t = { x: 8 + Math.random() * 58, y: 6 + Math.random() * 50, a: Math.round(Math.random() * 56 - 28), ok: giusto };
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
    salvaPartita(p);
    metti(t, true);
    bottoni();
    o.dopo(i, giusto);
    if (giusto) {
      retroDi(v);
      attesa = window.setTimeout(() => carta.classList.add('girata'), fermo ? 0 : 1100);
    }
  };
  const tasti = (e: KeyboardEvent) => {
    if (scheda.hidden || corrente < 0) return;
    if (e.key === 'Escape') { o.chiudi(); return; }
    const b = opzioni[Number(e.key) - 1];
    if (b) rispondi(b);
  };
  window.addEventListener('keydown', tasti);

  return {
    get aperto() { return scheda.hidden ? -1 : corrente; },
    mostra(i: number) {
      clearTimeout(attesa);
      corrente = i;
      const v = o.voli[i]!, n = i + 1, d = o.data;
      carta.style.setProperty('--tinta', v.tinta);
      carta.style.setProperty('--inchiostro', inchiostro(v.tinta));
      // Un volo già partito si apre girato, senza animazione
      carta.classList.add('subito');
      carta.classList.toggle('girata', p.fatto[i]!);
      requestAnimationFrame(() => requestAnimationFrame(() => carta.classList.remove('subito')));
      francobollo.innerHTML = scena(v.sezione, 'neutro', v.tinta);
      testa.textContent = `Flight ${v.codice} · ${v.nome}`;
      gruppo.textContent = `${v.voce.sotto} · ${v.voce.livello}`;
      termine.textContent = v.voce.termine;
      domanda.textContent = v.voce.domanda.testo;
      oloNumero.textContent = `N° ${String(n).padStart(2, '0')}`;
      const righe: [string, string][] = [['flight', v.codice], ['date', `${String(d.getDate()).padStart(2, '0')} ${MESI[d.getMonth()]}`], ['gate', String(n)], ['seat', `${n}${'ABC'[v.voce.livello.length % 3]}`], ['day', `#${o.giorno}`]];
      griglia.replaceChildren(...righe.flatMap(([k, x]) => [el('dt', '', k), el('dd', '', x)]));
      // Il codice a barre viene dalle lettere del termine: ogni biglietto ha il suo
      codice.replaceChildren(...[...`${v.voce.termine}${v.voce.id}${v.codice}`.replace(/[\s-]+/g, '')].slice(0, 24).map((c, k) => { const s = el('span'); s.style.width = `${1 + (c.charCodeAt(0) % 3)}px`; s.style.marginRight = `${1 + ((c.charCodeAt(0) + k) % 2)}px`; return s; }));
      const sbagliate = p.sbagliate[i]!;
      opzioni = v.risposte.map((testoR, k) => {
        const b = el('button', 'mono opzione');
        b.type = 'button';
        b.dataset.testo = testoR;
        b.append(el('span', '', String(k + 1)), testoR);
        if (sbagliate.includes(testoR)) { b.disabled = true; b.classList.add('sbagliata'); }
        if (p.fatto[i]) { b.disabled = true; if (testoR === v.voce.domanda.risposte[0]) b.classList.add('giusta'); }
        b.addEventListener('click', () => rispondi(b));
        return b;
      });
      opzioniEl.replaceChildren(...opzioni);
      timbri.replaceChildren();
      p.timbri[i]!.forEach(t => metti(t, false));
      if (p.fatto[i]) retroDi(v);
      bottoni();
      scheda.hidden = false;
      (p.fatto[i] ? (prossimo.hidden ? chiudi : prossimo) : opzioni.find(b => !b.disabled))?.focus({ preventScroll: true });
    },
    nascondi() { clearTimeout(attesa); scheda.hidden = true; },
  };
}
