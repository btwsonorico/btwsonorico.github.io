import { dividi } from '../lib/glossario';
import { salvaPartita, type Partita, type Volo } from '../lib/voloDelGiorno';
import { scena, timbro } from './scenetteVolo';

// La carta d'imbarco di AI terms, in due facce. La superficie mescola tre materiali: carta perlata con la grana, una
// sfumatura nel colore della sezione e la filigrana argentata di una banconota (rosetta e onde fitte). Una luce perlata
// tenue segue il puntatore. I titoli sono nel mono del sito; il corsivo serif è solo un accento.
// Davanti, la domanda: a sinistra il termine grande, la domanda e tre risposte; a destra il francobollo dentellato con
// la scena della sezione, la rotta, i dati del volo e il codice a barre.
// Risposta sbagliata: timbro rosso e si riprova. Risposta giusta: timbro verde, poi il biglietto si gira.
// Dietro, il premio: a sinistra la finestra a francobollo con l'illustrazione olografica (sole al primo colpo, temporale e
// arcobaleno dopo un errore, cielo stellato la sera); a destra il termine e la definizione; in fondo il tagliando.
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
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
// La rosetta della filigrana: tante ellissi sottili ruotate intorno al centro, come sulle banconote
const ROSETTA = `<svg viewBox="-70 -70 140 140" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".4">${Array.from({ length: 40 }, (_, i) => `<ellipse rx="64" ry="${20 + (i % 4) * 4}" transform="rotate(${i * 4.5})"/>`).join('')}${Array.from({ length: 7 }, (_, i) => `<circle r="${18 + i * 7}" stroke-dasharray="${1 + i} 2"/>`).join('')}</g></svg>`;
// Segni di taglio agli angoli e croci, come sulle prove di stampa
const SEGNI = () => {
  const f = document.createDocumentFragment();
  for (const c of ['ang an1', 'ang an2', 'ang an3', 'ang an4', 'croce cr1', 'croce cr2']) f.append(el('i', `segno ${c}`));
  return f;
};
// La superficie comune alle due facce: grana, sfumatura, filigrana con la rosetta
const SUPERFICIE = () => {
  const f = document.createDocumentFragment(), rosetta = el('div', 'rosetta');
  rosetta.innerHTML = ROSETTA;
  f.append(el('div', 'grana'), el('div', 'sfumatura'), el('div', 'filigrana'), rosetta);
  return f;
};

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

  // --- Davanti: la domanda a sinistra; francobollo e dati del volo a destra
  const fronte = el('section', 'faccia fronte');
  const corpo = el('div', 'corpo');
  const riga = el('p', 'mono riga'), termine = el('h2', 'mono titolo'), sezione = el('p', 'corsivo'), domanda = el('p', 'domanda'), opzioniEl = el('div', 'opzioni'), nota = el('p', 'mono nota'), timbri = el('div', 'timbri');
  nota.setAttribute('aria-live', 'polite');
  corpo.append(riga, termine, sezione, domanda, opzioniEl, nota, timbri);
  const destra = el('div', 'destra'), francobollo = el('div', 'francobollo'), scenaF = el('div', 'scena-f');
  francobollo.append(scenaF, el('div', 'foglia'));
  const info = el('div', 'info'), numeroF = el('p', 'numero'), rotta = el('p', 'mono rotta'), griglia = el('dl', 'mono griglia'), codice = el('div', 'codice'), cifre = el('p', 'mono cifre');
  info.append(numeroF, rotta, griglia, codice, cifre);
  destra.append(francobollo, info);
  fronte.append(SUPERFICIE(), corpo, destra, el('div', 'perla'), el('div', 'riflesso'), SEGNI());

  // --- Dietro: il premio
  const retro = el('section', 'faccia retro');
  const finestra = el('div', 'finestra'), grafica = el('div', 'grafica');
  finestra.append(grafica, el('div', 'foglia'));
  const testo = el('div', 'testo-retro');
  const testaR = el('div', 'testa-retro'), numeroR = el('p', 'numero'), esito = el('p', 'mono esito');
  testaR.append(numeroR, esito);
  const termineR = el('h2', 'mono titolo'), sezioneR = el('p', 'corsivo'), definizione = el('div', 'definizione');
  testo.append(testaR, termineR, sezioneR, el('p', 'mono etichetta', 'definition'), definizione);
  const tagR = el('div', 'tagliando'), tagTitolo = el('p', 'mono tag-titolo', 'AI TERMS'), tagNumero = el('p', 'numero'), grigliaR = el('dl', 'mono griglia'), collezione = el('div', 'collezione'), codiceR = el('div', 'codice'), cifreR = el('p', 'mono cifre');
  tagR.append(tagTitolo, tagNumero, grigliaR, collezione, codiceR, cifreR);
  retro.append(SUPERFICIE(), finestra, testo, tagR, el('div', 'perla'), el('div', 'riflesso'), SEGNI());
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

  // L'inclinazione segue il puntatore; la luce perlata e l'ologramma dell'immagine si spostano con lui
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // x e y vanno da -0,5 a 0,5: dove sta la luce sul biglietto
  const inclina = (x: number, y: number) => {
    x = Math.max(-0.5, Math.min(0.5, x)); y = Math.max(-0.5, Math.min(0.5, y));
    carta.classList.add('puntato');
    carta.style.setProperty('--rx', `${(-y * 18).toFixed(2)}deg`);
    carta.style.setProperty('--ry', `${(x * 22).toFixed(2)}deg`);
    carta.style.setProperty('--lx', `${((x + 0.5) * 100).toFixed(1)}%`);
    carta.style.setProperty('--ly', `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const raddrizza = () => { carta.classList.remove('puntato'); carta.style.setProperty('--rx', '0deg'); carta.style.setProperty('--ry', '0deg'); };
  // Con il mouse segue il puntatore; con il dito si inclina trascinando sul biglietto
  biglietto.addEventListener('pointermove', e => {
    if (fermo || (e.pointerType !== 'mouse' && !e.buttons)) return;
    const r = biglietto.getBoundingClientRect();
    inclina((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  });
  biglietto.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') raddrizza(); });
  let rilascio = 0;
  biglietto.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') { clearTimeout(rilascio); rilascio = window.setTimeout(() => { if (!giroscopio) raddrizza(); }, 900); } });
  // Su telefono il biglietto segue anche il giroscopio. Su iPhone il permesso si chiede al primo tocco
  let giroscopio = false, chiesto = false;
  const orientamento = (e: DeviceOrientationEvent) => {
    if (fermo || scheda.hidden || e.gamma === null || e.beta === null) return;
    giroscopio = true;
    inclina(e.gamma / 50, (e.beta - 45) / 50);
  };
  window.addEventListener('deviceorientation', orientamento);
  biglietto.addEventListener('pointerdown', e => {
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (chiesto || e.pointerType === 'mouse' || typeof D.requestPermission !== 'function') return;
    chiesto = true;
    D.requestPermission().catch(() => { /* niente: resta il dito */ });
  });

  const p = o.partita, d = o.data, quando = `${String(d.getDate()).padStart(2, '0')} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
  const isoData = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // Di sera e di notte, ora locale, il premio ha il cielo stellato
  const notte = () => { const h = new Date().getHours(); return h >= 20 || h < 6; };
  let corrente = -1, attesa = 0, opzioni: HTMLButtonElement[] = [];
  const restano = () => p.fatto.some(f => !f);
  const barre = (dove: HTMLElement, chiave: string) => dove.replaceChildren(...[...chiave.replace(/[\s-]+/g, '')].slice(0, 34).map((c, k) => { const s = el('span'); s.style.width = `${1 + (c.charCodeAt(0) % 3)}px`; s.style.marginRight = `${1 + ((c.charCodeAt(0) + k) % 2)}px`; return s; }));
  const cifreDi = (s: string) => String(hash(s)).padStart(10, '0').replace(/(\d)(\d{5})(\d{4})/, '$1 $2 $3');
  const metti = (t: { x: number; y: number; a: number; ok: boolean }, nuovo: boolean) => {
    const v = o.voli[corrente]!, s = el('div', `timbro${t.ok ? ' ok' : ''}${nuovo && !fermo ? ' cade' : ''}`);
    s.innerHTML = timbro(t.ok, quando, v.codice, Math.round(t.x * 37 + t.y * 11) % 97);
    s.style.left = `${t.x}%`; s.style.top = `${t.y}%`; s.style.setProperty('--a', `${t.a}deg`);
    timbri.append(s);
  };
  const retroDi = (v: Volo) => {
    const t = p.tentativi[v.indice]!, n = String(v.indice + 1).padStart(2, '0');
    grafica.innerHTML = scena(v.sezione, t <= 1 ? 'sole' : 'pioggia', v.tinta, v.voce.termine, notte());
    esito.textContent = t <= 1 ? 'cleared · first try' : `cleared · after ${t} tries`;
    numeroR.textContent = n;
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
    tagNumero.textContent = n;
    const righe: [string, string][] = [['flight', v.codice], ['class', v.voce.livello], ['tries', String(t)], ['day', `#${o.giorno}`]];
    grigliaR.replaceChildren(...righe.flatMap(([k, x]) => [el('dt', '', k), el('dd', '', x)]));
    // I sei voli del giorno: pieni quelli già presi, con il loro colore
    collezione.replaceChildren(...o.voli.map((w, k) => { const c = el('i', p.fatto[k] ? 'preso' : ''); c.style.setProperty('--c', w.tinta); c.title = w.codice; return c; }));
    barre(codiceR, `${v.voce.id}${v.voce.termine}`);
    cifreR.textContent = cifreDi(v.voce.id);
  };
  const scriviGira = () => { gira.textContent = carta.classList.contains('girata') ? 'back to the question ↺' : 'see your prize ↻'; };
  const bottoni = () => {
    const v = o.voli[corrente]!, fatto = p.fatto[corrente]!;
    gira.hidden = !fatto;
    scriviGira();
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
    const t = { x: 4 + Math.random() * 62, y: 4 + Math.random() * 52, a: Math.round(Math.random() * 56 - 28), ok: giusto };
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
      attesa = window.setTimeout(() => { carta.classList.add('girata'); scriviGira(); }, fermo ? 0 : 1200);
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
      const v = o.voli[i]!, n = String(i + 1).padStart(2, '0'), arrivo = CODICI[v.sezione % CODICI.length]!;
      carta.style.setProperty('--accento', v.tinta);
      // Un volo già partito si apre girato, senza animazione
      carta.classList.add('subito');
      carta.classList.toggle('girata', p.fatto[i]!);
      requestAnimationFrame(() => requestAnimationFrame(() => carta.classList.remove('subito')));
      scenaF.innerHTML = scena(v.sezione, 'neutro', v.tinta, '', false, true);
      riga.textContent = `boarding pass ✦ ai terms ✦ ${isoData}`;
      termine.textContent = v.voce.termine;
      sezione.textContent = `${v.nome}, ${v.voce.sotto.toLowerCase()}`;
      domanda.textContent = v.voce.domanda.testo;
      numeroF.textContent = n;
      rotta.replaceChildren(el('span', '', 'ASK'), el('i', '', '→'), el('span', '', arrivo));
      // Il posto 42 è sempre degli altri termini
      const posto = v.sezione === 5 ? '42' : `${i + 1}${'ABCDEF'[hash(v.voce.id) % 6]}`;
      const righe: [string, string][] = [['flight', v.codice], ['gate', `G${i + 1}`], ['seat', posto], ['class', v.voce.livello], ['date', quando.slice(0, 6)]];
      griglia.replaceChildren(...righe.flatMap(([k, x]) => [el('dt', '', k), el('dd', '', x)]));
      barre(codice, `${v.voce.termine}${v.voce.id}${v.codice}`);
      cifre.textContent = cifreDi(v.voce.termine);
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
