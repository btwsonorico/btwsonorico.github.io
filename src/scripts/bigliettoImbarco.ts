import { dividi } from '../lib/glossario';
import { salvaPartita, type Partita, type Volo } from '../lib/voloDelGiorno';
import { scena, timbro } from './scenetteVolo';

// La carta d'imbarco olografica di AI terms.
// Davanti, da sinistra: il francobollo dentellato con la scena della sezione; il corpo con la rotta, il termine, la domanda
// e tre risposte; la banda olografica con il nome in verticale; il tagliando con volo, data, posto, un piccolo codice
// quadrato e il codice a barre. Sotto tutto, una trama di sicurezza a onde e un microtesto sui bordi, con frasi nascoste.
// Una foglia iridescente segue il puntatore (su telefono luccica da sola).
// Risposta sbagliata: cade un timbro rosso e si riprova. Risposta giusta: timbro verde, poi il biglietto si gira.
// Dietro c'è il premio: l'illustrazione grande della sezione, con il meteo dell'esito; la definizione si apre a richiesta.
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
// Il codice da aeroporto di ogni sezione: si parte sempre da ASK, la domanda
const CODICI = ['GEN', 'GNR', 'RSK', 'PRM', 'OPS', 'OTH'];
// Il microtesto sui bordi: a prima vista è una riga, da vicino si leggono le frasi
const MICRO = 'AI TERMS ✦ BOARDING PASS ✦ VALID FOR ONE DAY ✦ ATTENTION IS ALL YOU NEED ✦ PLEASE DO NOT HALLUCINATE ✦ SEAT BELTS ON DURING GRADIENT DESCENT ✦ NO TOKENS LEFT BEHIND ✦ DON\'T PANIC ✦ ';
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

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
  const fronte = el('section', 'faccia fronte');
  const microSu = el('p', 'mono micro su', MICRO.repeat(3)), microGiu = el('p', 'mono micro giu', MICRO.repeat(3));
  const francobollo = el('div', 'francobollo'), scenaF = el('div', 'scena-f');
  francobollo.append(scenaF, el('div', 'foglia'));
  const corpo = el('div', 'corpo-biglietto');
  const testa = el('p', 'mono testa'), rotta = el('div', 'mono rotta'), termine = el('h2', 'termine'), domanda = el('p', 'domanda'), opzioniEl = el('div', 'opzioni'), nota = el('p', 'mono nota'), timbri = el('div', 'timbri');
  const da = el('span', 'aeroporto'), a = el('span', 'aeroporto');
  rotta.append(el('small', '', 'from'), da, el('i', 'aereoplanino', '✈'), el('small', '', 'to'), a, el('span', 'gruppo'));
  nota.setAttribute('aria-live', 'polite');
  corpo.append(testa, rotta, termine, domanda, opzioniEl, nota, timbri);
  const olo = el('div', 'olo'), oloTitolo = el('p', 'mono olo-titolo', 'AI TERMS'), oloNumero = el('p', 'mono numero'), oloMicro = el('p', 'mono olo-micro', 'GENUINE ✦ HOLOGRAM ✦ GENUINE');
  olo.append(el('div', 'foglia forte'), oloNumero, oloTitolo, oloMicro);
  const tagliando = el('div', 'tagliando'), tagCodice = el('p', 'mono tag-codice'), griglia = el('dl', 'mono griglia'), qr = el('div', 'qr'), codice = el('div', 'codice'), tagPiede = el('p', 'mono tag-piede', 'keep this stub');
  tagliando.append(tagCodice, griglia, qr, codice, tagPiede);
  fronte.append(microSu, francobollo, corpo, olo, tagliando, microGiu, el('div', 'foglia velo'), el('div', 'riflesso'));
  // Dietro: il premio
  const retro = el('section', 'faccia retro'), grafica = el('div', 'grafica');
  const retroTesta = el('div', 'retro-testa'), esito = el('p', 'mono esito'), retroNumero = el('p', 'mono retro-numero');
  retroTesta.append(esito, retroNumero);
  const retroPiede = el('div', 'retro-piede'), termineR = el('h2', 'termine'), leggi = el('button', 'mono leggi', 'read the definition ↑');
  leggi.type = 'button';
  retroPiede.append(termineR, leggi);
  const pannello = el('div', 'pannello'), chiudiP = el('button', 'mono chiudi-pannello', 'back to the picture ↓'), definizione = el('div', 'definizione'), seriale = el('p', 'mono seriale');
  chiudiP.type = 'button';
  pannello.append(definizione, seriale, chiudiP);
  retro.append(grafica, el('div', 'foglia premio'), retroTesta, retroPiede, pannello, el('div', 'riflesso'));
  leggi.addEventListener('click', () => { retro.classList.add('legge'); chiudiP.focus({ preventScroll: true }); });
  chiudiP.addEventListener('click', () => { retro.classList.remove('legge'); leggi.focus({ preventScroll: true }); });
  carta.append(fronte, retro);
  biglietto.append(carta);
  const azioni = el('div', 'azioni'), prossimo = el('button', 'mono prossimo'), chiudi = el('button', 'mono chiudi', 'close ×');
  prossimo.type = chiudi.type = 'button';
  prossimo.addEventListener('click', o.prossimo);
  chiudi.addEventListener('click', o.chiudi);
  azioni.append(prossimo, chiudi);
  scheda.append(biglietto, azioni);
  contenitore.appendChild(scheda);

  // L'inclinazione segue il puntatore; il riflesso e la foglia olografica si spostano con lui
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  biglietto.addEventListener('pointermove', e => {
    if (fermo || e.pointerType !== 'mouse') return;
    const r = biglietto.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    carta.classList.add('puntato');
    carta.style.setProperty('--rx', `${(-y * 18).toFixed(2)}deg`);
    carta.style.setProperty('--ry', `${(x * 22).toFixed(2)}deg`);
    carta.style.setProperty('--lx', `${((x + 0.5) * 100).toFixed(1)}%`);
    carta.style.setProperty('--ly', `${((y + 0.5) * 100).toFixed(1)}%`);
  });
  biglietto.addEventListener('pointerleave', () => { carta.classList.remove('puntato'); carta.style.setProperty('--rx', '0deg'); carta.style.setProperty('--ry', '0deg'); });

  const p = o.partita, d = o.data, quando = `${String(d.getDate()).padStart(2, '0')} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
  // Di sera e di notte, ora locale, il premio ha il cielo stellato
  const notte = () => { const h = new Date().getHours(); return h >= 20 || h < 6; };
  let corrente = -1, attesa = 0, opzioni: HTMLButtonElement[] = [];
  const restano = () => p.fatto.some(f => !f);
  const metti = (t: { x: number; y: number; a: number; ok: boolean }, nuovo: boolean) => {
    const v = o.voli[corrente]!, s = el('div', `timbro${t.ok ? ' ok' : ''}${nuovo && !fermo ? ' cade' : ''}`);
    s.innerHTML = timbro(t.ok, quando, v.codice, Math.round(t.x * 37 + t.y * 11) % 97);
    s.style.left = `${t.x}%`; s.style.top = `${t.y}%`; s.style.setProperty('--a', `${t.a}deg`);
    timbri.append(s);
  };
  const retroDi = (v: Volo) => {
    const t = p.tentativi[v.indice]!;
    retro.classList.remove('legge');
    grafica.innerHTML = scena(v.sezione, t <= 1 ? 'sole' : 'pioggia', v.tinta, v.voce.termine, notte());
    esito.textContent = t <= 1 ? `${v.codice} ✦ cleared ✦ first try` : `${v.codice} ✦ cleared after ${t} tries ✦ the storm has passed`;
    retroNumero.textContent = `N° ${String(v.indice + 1).padStart(2, '0')}/06`;
    termineR.textContent = v.voce.termine;
    definizione.replaceChildren(el('h3', 'mono', v.voce.termine), ...v.voce.definizione.map(x => el('p', '', x)));
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
    seriale.textContent = `${v.voce.id.slice(0, 22)} · ${v.voce.livello} · day #${o.giorno} · ${quando}`;
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
    const t = { x: 6 + Math.random() * 60, y: 4 + Math.random() * 52, a: Math.round(Math.random() * 56 - 28), ok: giusto };
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
      attesa = window.setTimeout(() => carta.classList.add('girata'), fermo ? 0 : 1200);
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
      const v = o.voli[i]!, n = i + 1;
      carta.style.setProperty('--tinta', v.tinta);
      carta.style.setProperty('--inchiostro', inchiostro(v.tinta));
      // Un volo già partito si apre girato, senza animazione
      carta.classList.add('subito');
      carta.classList.toggle('girata', p.fatto[i]!);
      requestAnimationFrame(() => requestAnimationFrame(() => carta.classList.remove('subito')));
      scenaF.innerHTML = scena(v.sezione, 'neutro', v.tinta, '', false, true);
      testa.textContent = `Boarding pass ✦ flight ${v.codice}`;
      da.textContent = 'ASK';
      a.textContent = CODICI[v.sezione % CODICI.length]!;
      (rotta.querySelector('.gruppo') as HTMLElement).textContent = `${v.nome} · ${v.voce.sotto} · ${v.voce.livello}`;
      termine.textContent = v.voce.termine;
      domanda.textContent = v.voce.domanda.testo;
      oloNumero.textContent = `N°${String(n).padStart(2, '0')}`;
      tagCodice.textContent = v.codice;
      // Il posto 42 è sempre degli altri termini
      const posto = v.sezione === 5 ? '42' : `${n}${'ABCDEF'[hash(v.voce.id) % 6]}`;
      const righe: [string, string][] = [['date', `${String(d.getDate()).padStart(2, '0')} ${MESI[d.getMonth()]}`], ['gate', `G${n}`], ['seat', posto], ['class', v.voce.livello], ['day', `#${o.giorno}`]];
      griglia.replaceChildren(...righe.flatMap(([k, x]) => [el('dt', '', k), el('dd', '', x)]));
      // Il codice quadrato e il codice a barre vengono dal termine: ogni biglietto ha i suoi
      const h = hash(v.voce.termine);
      qr.replaceChildren(...Array.from({ length: 49 }, (_, k) => { const r = Math.floor(k / 7), c = k % 7, angolo = (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2); const s = el('i'); if (angolo || (hash(`${h}${k}`) & 1)) s.className = 'pieno'; return s; }));
      codice.replaceChildren(...[...`${v.voce.termine}${v.voce.id}${v.codice}`.replace(/[\s-]+/g, '')].slice(0, 28).map((c, k) => { const s = el('span'); s.style.width = `${1 + (c.charCodeAt(0) % 3)}px`; s.style.marginRight = `${1 + ((c.charCodeAt(0) + k) % 2)}px`; return s; }));
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
