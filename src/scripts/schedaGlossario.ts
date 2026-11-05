import { dividi, TINTE_SEZIONI, VOCI, type Voce } from '../lib/glossario';

// Il biglietto del glossario. Davanti: il termine, il suo gruppo e il livello, la domanda e tre risposte.
// Quando rispondi si gira; dietro c'è la definizione, con una grafica da biglietto stampato.
// Se indovini, il tagliando a destra si stacca: il termine è tuo. Il colore è quello del banco di pesci della sua sezione.
// Muovendo il puntatore il biglietto si inclina e un riflesso gli scorre sopra. Il testo arriva dal glossario e si scrive sempre come testo, mai come HTML.
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', testo?: string) => {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (testo !== undefined) e.textContent = testo;
  return e;
};
// Inchiostro scuro sui colori chiari, chiaro sui colori scuri: il testo si legge sempre
const inchiostro = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#121417' : '#f4f1ea';
};

export function nuovaScheda(contenitore: HTMLElement, azione: string, alClic: () => void, alRisposta: (giusto: boolean) => void = () => {}) {
  const scheda = el('aside', 'scheda-glossario');
  scheda.hidden = true;
  const biglietto = el('div', 'biglietto'), carta = el('div', 'carta');
  // Davanti
  const fronte = el('section', 'faccia fronte'), corpoF = el('div', 'corpo-biglietto');
  const testa = el('p', 'mono testa'), gruppo = el('p', 'mono gruppo'), termine = el('h2', 'termine'), domanda = el('p', 'domanda'), opzioniEl = el('div', 'opzioni'), retinoF = el('div', 'retino');
  corpoF.append(retinoF, testa, gruppo, termine, domanda, opzioniEl);
  const tagliando = el('div', 'tagliando'), tagSu = el('p', 'mono', 'AI TERMS'), tagNumero = el('p', 'mono numero'), tagGiu = el('p', 'mono', 'admit one');
  tagliando.append(tagSu, tagNumero, tagGiu);
  fronte.append(corpoF, tagliando);
  // Dietro
  const retro = el('section', 'faccia retro'), grafica = el('div', 'grafica'), cerchio = el('div', 'cerchio'), grande = el('p', 'mono grande'), esito = el('p', 'mono esito'), termineR = el('h2', 'termine'), definizione = el('div', 'definizione'), piede = el('div', 'piede-biglietto'), codice = el('div', 'codice'), seriale = el('p', 'mono seriale');
  grafica.append(cerchio, grande);
  piede.append(codice, seriale);
  retro.append(grafica, esito, termineR, definizione, piede);
  carta.append(fronte, retro);
  biglietto.append(carta);
  const bottone = el('button', 'mono rilascia', azione);
  bottone.type = 'button';
  bottone.addEventListener('click', alClic);
  scheda.append(biglietto, bottone);
  contenitore.appendChild(scheda);

  // risposto: finché è false la scheda aspetta una risposta e il pesce non si può rilasciare
  const stato = { sopra: false, risposto: true };
  scheda.addEventListener('pointerenter', () => { stato.sopra = true; });
  scheda.addEventListener('pointerleave', () => { stato.sopra = false; carta.style.setProperty('--rx', '0deg'); carta.style.setProperty('--ry', '0deg'); });
  // L'inclinazione segue il puntatore; il riflesso si sposta con lui
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  biglietto.addEventListener('pointermove', e => {
    if (fermo || e.pointerType !== 'mouse') return;
    const r = biglietto.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    carta.style.setProperty('--rx', `${(-y * 9).toFixed(2)}deg`);
    carta.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
    carta.style.setProperty('--lx', `${((x + 0.5) * 100).toFixed(1)}%`);
  });

  let opzioni: HTMLButtonElement[] = [], attesa = 0;
  const gira = (v: Voce, giusto: boolean, giusta: string) => {
    esito.className = `mono esito${giusto ? ' giusto' : ''}`;
    esito.textContent = giusto ? 'right: caught' : `it got away. the answer: ${giusta.toLowerCase()}`;
    termineR.textContent = v.termine;
    definizione.replaceChildren(...v.definizione.map(t => el('p', '', t)));
    if (v.punti.length) {
      const lista = el('ul');
      v.punti.map(dividi).forEach(q => {
        const li = el('li');
        if (q.nome) li.append(el('strong', '', `${q.nome}: `));
        li.append(q.testo);
        lista.append(li);
      });
      definizione.append(lista);
    }
    definizione.scrollTop = 0;
    carta.classList.add('girata');
    if (giusto) carta.classList.add('strappato');
    bottone.hidden = false;
  };
  // Prima si vede quale risposta era giusta, poi il biglietto si gira
  const rispondi = (v: Voce, scelta: HTMLButtonElement, giusta: string) => {
    if (stato.risposto) return;
    stato.risposto = true;
    const giusto = scelta.dataset.testo === giusta;
    opzioni.forEach(b => {
      b.disabled = true;
      if (b.dataset.testo === giusta) b.classList.add('giusta');
      else if (b === scelta) b.classList.add('sbagliata');
    });
    alRisposta(giusto);
    const pausa = fermo ? 0 : giusto ? 600 : 1300;
    attesa = window.setTimeout(() => gira(v, giusto, giusta), pausa);
  };
  let corrente: Voce | null = null;
  // Su computer si risponde anche coi tasti 1, 2 e 3
  const tasti = (e: KeyboardEvent) => {
    const b = opzioni[Number(e.key) - 1];
    if (b && corrente && !stato.risposto && !scheda.hidden) rispondi(corrente, b, corrente.domanda.risposte[0]!);
  };
  window.addEventListener('keydown', tasti);
  return {
    stato,
    // Il biglietto nuovo, dritto: termine, domanda e tre risposte mescolate
    mostra(v: Voce) {
      corrente = v;
      stato.risposto = false;
      const n = VOCI.indexOf(v) + 1, numero = `${String(n).padStart(2, '0')}/${VOCI.length}`, tinta = TINTE_SEZIONI[v.indiceSezione % TINTE_SEZIONI.length]!;
      carta.style.setProperty('--tinta', tinta);
      carta.style.setProperty('--inchiostro', inchiostro(tinta));
      carta.classList.remove('girata', 'strappato');
      testa.textContent = `#${numero} · ${v.sezione}`;
      gruppo.textContent = `${v.sotto} · ${v.livello}`;
      termine.textContent = v.termine;
      domanda.textContent = v.domanda.testo;
      tagNumero.textContent = `N° ${String(n).padStart(2, '0')}`;
      grande.textContent = String(n).padStart(2, '0');
      seriale.textContent = `${v.id.slice(0, 18)} · ${v.livello}`;
      // Il codice a barre viene dalle lettere del termine: ogni biglietto ha il suo
      codice.replaceChildren(...[...v.termine.replace(/\s+/g, '')].slice(0, 26).map((c, i) => { const s = el('span'); s.style.width = `${1 + (c.charCodeAt(0) % 3)}px`; s.style.marginRight = `${1 + ((c.charCodeAt(0) + i) % 2)}px`; return s; }));
      bottone.hidden = true;
      const giusta = v.domanda.risposte[0]!;
      opzioni = [...v.domanda.risposte].sort(() => Math.random() - 0.5).map((testoR, i) => {
        const b = el('button', 'mono opzione');
        b.type = 'button';
        b.dataset.testo = testoR;
        b.append(el('span', '', String(i + 1)), testoR);
        b.addEventListener('click', () => rispondi(v, b, giusta));
        return b;
      });
      opzioniEl.replaceChildren(...opzioni);
      scheda.hidden = false;
    },
    nascondi() { clearTimeout(attesa); scheda.hidden = true; stato.sopra = false; },
    togli() { clearTimeout(attesa); window.removeEventListener('keydown', tasti); scheda.remove(); },
  };
}
