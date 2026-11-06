import { dividi } from '../lib/glossario';
import type { Partita, Volo } from '../lib/voli';
import { annullo, francobollo, poster, timbro, type Livello } from './arteBiglietti';

// La carta d'imbarco di AI terms, ispirata ai biglietti commemorativi e ai francobolli a lotteria di metà Novecento.
// Davanti: carta crema con bande nel colore della sezione. A sinistra il francobollo dentellato, con la fascia di
// sicurezza e il numero di serie rosso, l'illustrazione con la foglia e il valore; l'annullo postale ci passa sopra.
// Al centro il termine, la domanda e tre risposte. A destra il tagliando su carta di sicurezza, con la tratta grande.
// Risposta sbagliata: timbro rosso e si riprova. Risposta giusta: timbro verde, poi il biglietto si gira.
// Dietro: il poster grande a sinistra; a destra la definizione, su un pannello con la trama di sicurezza.
// Il testo delle note si scrive sempre come testo, mai come HTML.
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', testo?: string) => {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (testo !== undefined) e.textContent = testo;
  return e;
};
const MESI = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
// Il codice da aeroporto di ogni sezione: si parte sempre da ASK, la domanda
const CODICI = ['GEN', 'GNR', 'RSK', 'PRM', 'OPS', 'OTH'];
const VALORI: Record<string, string> = { easy: '1', medium: '2', hard: '3' };
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const livelloDi = (v: Volo): Livello => (['easy', 'medium', 'hard'].includes(v.voce.livello) ? v.voce.livello : 'easy') as Livello;

export type OpzioniImbarco = {
  data: Date; voli: Volo[]; partita: Partita;
  // Dopo ogni risposta. Il biglietto ha già aggiornato la partita
  dopo: (i: number, giusto: boolean) => void;
  // Una riga sullo stato del gioco, per il retro: serie e album
  riassunto: () => string;
  prossimo: () => void; chiudi: () => void;
};

export function nuovoImbarco(contenitore: HTMLElement, o: OpzioniImbarco) {
  const scheda = el('aside', 'imbarco');
  scheda.hidden = true;
  scheda.setAttribute('aria-label', 'boarding pass');
  const biglietto = el('div', 'biglietto'), carta = el('div', 'carta');

  // --- Davanti
  const fronte = el('section', 'faccia fronte');
  const bollo = el('div', 'francobollo'), fascia = el('div', 'fascia'), serialeF = el('p', 'seriale'), arte = el('div', 'arte'), valore = el('div', 'valore'), valNum = el('b', '', ''), valNome = el('span', 'mono', 'AI TERMS');
  fascia.append(serialeF);
  valore.append(valNome, valNum);
  bollo.append(fascia, arte, valore);
  const annulloEl = el('div', 'annullo');
  const corpo = el('div', 'corpo');
  const riga = el('p', 'mono riga'), termine = el('h2', 'mono titolo'), sezione = el('p', 'corsivo'), domanda = el('p', 'domanda'), opzioniEl = el('div', 'opzioni'), nota = el('p', 'mono nota'), timbri = el('div', 'timbri');
  nota.setAttribute('aria-live', 'polite');
  corpo.append(riga, termine, sezione, domanda, opzioniEl, nota, timbri);
  const tagliando = el('div', 'tagliando'), tratta = el('div', 'tratta'), numeroF = el('p', 'numero'), griglia = el('dl', 'mono griglia'), serialeT = el('p', 'seriale'), codice = el('div', 'codice');
  tagliando.append(tratta, numeroF, griglia, serialeT, codice);
  fronte.append(el('div', 'bande'), bollo, annulloEl, corpo, tagliando, el('div', 'riflesso'));

  // --- Dietro
  const retro = el('section', 'faccia retro');
  const quadro = el('div', 'poster');
  const pannello = el('div', 'pannello'), testaR = el('div', 'testa-retro'), numeroR = el('p', 'numero'), esito = el('p', 'mono esito');
  testaR.append(numeroR, esito);
  const termineR = el('h2', 'mono titolo'), sezioneR = el('p', 'corsivo'), definizione = el('div', 'definizione'), piedeR = el('div', 'piede-retro'), serialeR = el('p', 'seriale'), statoR = el('p', 'mono stato');
  piedeR.append(serialeR, statoR);
  pannello.append(testaR, termineR, sezioneR, el('p', 'mono etichetta', 'definition'), definizione, piedeR);
  retro.append(quadro, pannello, el('div', 'riflesso'));
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

  // L'inclinazione: segue il mouse; con il dito si trascina; su telefono segue anche il giroscopio
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const inclina = (x: number, y: number) => {
    x = Math.max(-0.5, Math.min(0.5, x)); y = Math.max(-0.5, Math.min(0.5, y));
    carta.classList.add('puntato');
    carta.style.setProperty('--rx', `${(-y * 18).toFixed(2)}deg`);
    carta.style.setProperty('--ry', `${(x * 22).toFixed(2)}deg`);
    carta.style.setProperty('--lx', `${((x + 0.5) * 100).toFixed(1)}%`);
    carta.style.setProperty('--ly', `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const raddrizza = () => { carta.classList.remove('puntato'); carta.style.setProperty('--rx', '0deg'); carta.style.setProperty('--ry', '0deg'); };
  biglietto.addEventListener('pointermove', e => {
    if (fermo || (e.pointerType !== 'mouse' && !e.buttons)) return;
    const r = biglietto.getBoundingClientRect();
    inclina((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  });
  biglietto.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') raddrizza(); });
  let rilascio = 0, giroscopio = false, chiesto = false;
  biglietto.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') { clearTimeout(rilascio); rilascio = window.setTimeout(() => { if (!giroscopio) raddrizza(); }, 900); } });
  window.addEventListener('deviceorientation', e => {
    if (fermo || scheda.hidden || e.gamma === null || e.beta === null) return;
    giroscopio = true;
    inclina(e.gamma / 50, (e.beta - 45) / 50);
  });
  biglietto.addEventListener('pointerdown', e => {
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (chiesto || e.pointerType === 'mouse' || typeof D.requestPermission !== 'function') return;
    chiesto = true;
    D.requestPermission().catch(() => { /* niente: resta il dito */ });
  });

  const p = o.partita, d = o.data, quando = `${String(d.getDate()).padStart(2, '0')} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
  let corrente = -1, attesa = 0, opzioni: HTMLButtonElement[] = [];
  const barre = (dove: HTMLElement, chiave: string) => dove.replaceChildren(...[...chiave.replace(/[\s-]+/g, '')].slice(0, 30).map((c, k) => { const s = el('span'); s.style.width = `${1 + (c.charCodeAt(0) % 3)}px`; s.style.marginRight = `${1 + ((c.charCodeAt(0) + k) % 2)}px`; return s; }));
  const metti = (t: { x: number; y: number; a: number; ok: boolean }, nuovo: boolean) => {
    const v = o.voli[corrente]!, s = el('div', `timbro${t.ok ? ' ok' : ''}${nuovo && !fermo ? ' cade' : ''}`);
    s.innerHTML = timbro(t.ok, quando, v.codice, Math.round(t.x * 37 + t.y * 11) % 97);
    s.style.left = `${t.x}%`; s.style.top = `${t.y}%`; s.style.setProperty('--a', `${t.a}deg`);
    timbri.append(s);
  };
  const retroDi = (v: Volo) => {
    const t = p.tentativi[v.indice]!;
    quadro.innerHTML = poster(v.sezione, livelloDi(v), t > 1);
    esito.textContent = t <= 1 ? 'cleared · first try' : `cleared · after ${t} tries`;
    numeroR.textContent = String(v.indice + 1).padStart(2, '0');
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
    serialeR.textContent = `No. ${v.seriale}`;
    statoR.textContent = o.riassunto();
  };
  const scriviGira = () => { gira.textContent = carta.classList.contains('girata') ? 'back to the question ↺' : 'turn over ↻'; };
  const bottoni = () => {
    const v = o.voli[corrente]!, fatto = p.fatto[corrente]!;
    gira.hidden = !fatto;
    scriviGira();
    prossimo.hidden = !fatto;
    prossimo.textContent = 'next flight →';
    if (!fatto) nota.textContent = p.sbagliate[corrente]!.length ? 'Delayed. Try again.' : `Clear ${v.codice} for take-off.`;
    else nota.textContent = 'Cleared for take-off.';
  };
  const rispondi = (b: HTMLButtonElement) => {
    const i = corrente, v = o.voli[i]!;
    if (p.fatto[i] || b.disabled) return;
    const giusto = b.dataset.testo === v.voce.domanda.risposte[0];
    p.tentativi[i]!++;
    // Il timbro cade in un punto a caso del lato con la domanda
    const t = { x: 22 + Math.random() * 46, y: 4 + Math.random() * 52, a: Math.round(Math.random() * 56 - 28), ok: giusto };
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
      const v = o.voli[i]!, n = String(i + 1).padStart(2, '0'), arrivo = CODICI[v.sezione % CODICI.length]!, l = livelloDi(v);
      carta.style.setProperty('--accento', v.tinta);
      carta.dataset.livello = l;
      carta.dataset.sezione = String(v.sezione);
      carta.classList.add('subito');
      carta.classList.toggle('girata', p.fatto[i]!);
      requestAnimationFrame(() => requestAnimationFrame(() => carta.classList.remove('subito')));
      arte.innerHTML = francobollo(v.sezione, l);
      serialeF.textContent = v.seriale;
      valNum.textContent = VALORI[l] ?? '1';
      annulloEl.innerHTML = annullo(quando.slice(0, 6), v.codice);
      riga.textContent = `boarding pass ✦ ai terms ✦ No. ${v.seriale}`;
      termine.textContent = v.voce.termine;
      sezione.textContent = `${v.nome}, ${v.voce.sotto.toLowerCase()}`;
      domanda.textContent = v.voce.domanda.testo;
      tratta.replaceChildren(el('span', 'mono', 'ASK'), el('i', '', '▶'), el('span', 'mono', arrivo));
      numeroF.textContent = n;
      // Il posto 42 è sempre degli altri termini
      const posto = v.sezione === 5 ? '42' : `${i + 1}${'ABCDEF'[hash(v.voce.id) % 6]}`;
      const righe: [string, string][] = [['flight', v.codice], ['gate', `G${i + 1}`], ['seat', posto], ['class', l], ['date', quando.slice(0, 6)]];
      griglia.replaceChildren(...righe.flatMap(([k, x]) => [el('dt', '', k), el('dd', '', x)]));
      serialeT.textContent = v.seriale;
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
      if (p.fatto[i]) retroDi(v);
      bottoni();
      scheda.hidden = false;
      (p.fatto[i] ? (prossimo.hidden ? chiudi : prossimo) : opzioni.find(b => !b.disabled))?.focus({ preventScroll: true });
    },
    nascondi() { clearTimeout(attesa); scheda.hidden = true; },
  };
}
