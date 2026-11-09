import { monta as montaReef } from './barriera';

// Fishing timeline, il gioco della timeline (src/pages/learn/fishing-timeline.astro; il nome gioca su fishing line, la lenza). Una partita sono 7 pesci, cioè 7 eventi della storia dell'AI con
// anni tutti diversi. Si lancia l'amo nel reef; il primo pesce va sulla linea da solo, con la sua data. Ogni pesce dopo arriva
// senza data: lo metti prima, dopo o in mezzo a quelli già messi, poi la data si scopre. Se il posto è sbagliato, la carta va
// comunque al posto giusto, in arancio: così la linea resta sempre in ordine e il pesce dopo si confronta con date vere.
// La scheda del pesce si trascina nella linea, o si tocca una fessura. Punteggio, pausa e fine partita sono le carte arcade
// di AI terms (src/pages/learn/airport.astro).

type Evento = { id: string; titolo: string; chi: string; anno: number; data: string; t: number; kind: string; tipo: string; perche: string };
type Messo = Evento & { esito: 'primo' | 'giusta' | 'sbagliata' };
const PESCI = 7;
// Il pesce di ogni scheda: lo stesso disegno della scheda all'amo, nel colore del tipo di evento
const PESCE = '<svg class="pesce" viewBox="0 0 40 22" aria-hidden="true"><path d="M3 11c5-8 17-10 25-3l9-6v18l-9-6c-8 7-20 5-25-3z"/><circle cx="11" cy="9.5" r="1.8"/></svg>';

export function monta(radice: HTMLElement, scena: HTMLElement) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const tutti = JSON.parse(radice.dataset.eventi ?? '[]') as Evento[];
  const stato = $<HTMLElement>('.stato'), conto = $<HTMLElement>('.punteggio'), linea = $<HTMLOListElement>('.linea'), striscia = $<HTMLElement>('.striscia');
  const preso = $<HTMLElement>('.preso'), fine = $<HTMLElement>('.fine');

  let mano: Evento[] = [], messi: Messo[] = [], allAmo: Evento | null = null, rilascia: (() => void) | null = null;
  let fase: 'lancia' | 'piazza' | 'fine' = 'lancia', giuste = 0, nuovo = '', serie = 0, serieMax = 0;

  // Sette eventi a caso, con anni tutti diversi: così ogni posto ha una sola risposta giusta
  function nuovaPartita() {
    const urna = [...tutti].sort(() => Math.random() - 0.5), anni = new Set<number>();
    mano = urna.filter(e => !anni.has(e.anno) && anni.add(e.anno)).slice(0, PESCI);
    messi = []; allAmo = null; giuste = 0; nuovo = ''; fase = 'lancia'; serie = 0; serieMax = 0;
    fine.hidden = true; preso.hidden = true; menuPausa.hidden = true;
    stato.textContent = 'Tap the water to cast. Your first fish goes straight on the line.';
    disegna();
  }

  // La scena chiede se si può lanciare; a pesce tirato su ci passa il modo per rilasciarlo
  montaReef(scena, {
    gioco: {
      puo: () => fase === 'lancia',
      preso: ril => { rilascia = ril; pescato(); },
    },
  });

  function pescato() {
    const e = mano[messi.length]!;
    if (!messi.length) {
      // Il primo pesce: va sulla linea da solo, con la sua data
      messi.push({ ...e, esito: 'primo' }); nuovo = e.id;
      stato.textContent = `First fish: ${e.titolo}, ${e.data}. Tap the water for the next one.`;
      disegna();
      setTimeout(() => { rilascia?.(); rilascia = null; }, 900);
      return;
    }
    allAmo = e; fase = 'piazza';
    preso.querySelector<HTMLElement>('.corpo')!.dataset.kind = e.kind;
    $<HTMLElement>('.preso .tipo-k').textContent = e.tipo;
    $<HTMLElement>('.titolo').textContent = e.titolo;
    $<HTMLElement>('.preso .perche').textContent = e.perche;
    $<HTMLElement>('.preso .chi').textContent = e.chi;
    preso.hidden = false;
    stato.textContent = messi.length === 1 ? 'Before or after the first one?' : 'Before, after, or in between?';
    disegna();
    linea.querySelector<HTMLButtonElement>('.posto')?.focus({ preventScroll: true });
  }

  // Il posto i va fra messi[i-1] e messi[i]. È giusto se la data sta fra le due
  function piazza(i: number) {
    if (fase !== 'piazza' || !allAmo) return;
    const e = allAmo, prima = messi[i - 1], dopo = messi[i];
    const ok = (!prima || prima.t <= e.t) && (!dopo || e.t <= dopo.t);
    if (ok) { giuste++; serie++; serieMax = Math.max(serieMax, serie); } else serie = 0;
    // La carta va sempre al posto giusto: la linea resta in ordine
    const vero = messi.findIndex(m => m.t > e.t);
    messi.splice(vero < 0 ? messi.length : vero, 0, { ...e, esito: ok ? 'giusta' : 'sbagliata' });
    nuovo = e.id; allAmo = null; preso.hidden = true;
    rilascia?.(); rilascia = null;
    const fatte = messi.length - 1;
    if (messi.length === PESCI) {
      fase = 'fine';
      stato.textContent = ok ? `Right: ${e.data}.` : `Not quite: it was ${e.data}.`;
      // La carta di fine partita: il numero grande e i numeri della partita
      $<HTMLElement>('.fine-titolo').textContent = giuste === fatte ? 'Perfect line' : 'Line complete';
      $<HTMLElement>('.fine-numero').textContent = `${giuste}/${fatte}`;
      $<HTMLElement>('.fine-giuste').textContent = String(giuste);
      $<HTMLElement>('.fine-serie').textContent = String(serieMax);
      $<HTMLElement>('.commento').textContent = giuste === fatte ? 'You know your AI history.' : 'Close it to read your line: the orange cards moved to their real place.';
      setTimeout(() => { fine.hidden = false; $<HTMLButtonElement>('.ancora').focus({ preventScroll: true }); }, 900);
    } else {
      fase = 'lancia';
      stato.textContent = `${ok ? `Right: ${e.data}.` : `Not quite: it was ${e.data}.`} Tap the water for the next fish.`;
    }
    disegna();
  }

  function disegna() {
    const pezzi: HTMLElement[] = [];
    const posto = (i: number) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'posto';
      const prima = messi[i - 1], dopo = messi[i];
      b.setAttribute('aria-label', !prima ? `Put it before ${dopo!.titolo}` : !dopo ? `Put it after ${prima.titolo}` : `Put it between ${prima.titolo} and ${dopo.titolo}`);
      b.dataset.i = String(i);
      b.addEventListener('click', () => piazza(i));
      const li = document.createElement('li'); li.append(b);
      return li;
    };
    messi.forEach((m, i) => {
      if (fase === 'piazza') pezzi.push(posto(i));
      // La scheda chiusa della AI timeline: data e tipo, poi il titolo
      const li = document.createElement('li');
      li.className = `${m.esito === 'primo' ? '' : m.esito}${m.id === nuovo ? ' nuova' : ''}`;
      const corpo = document.createElement('div'); corpo.className = 'corpo'; corpo.dataset.kind = m.kind;
      const riga = document.createElement('p'); riga.className = 'mono riga';
      const data = document.createElement('span'); data.innerHTML = PESCE; data.append(m.data);
      const tipo = document.createElement('span'); tipo.className = 'tipo-k'; tipo.textContent = m.tipo;
      const titolo = document.createElement('h2'); titolo.textContent = m.titolo;
      riga.append(data, tipo); corpo.append(riga, titolo);
      if (m.esito === 'sbagliata') { const n = document.createElement('p'); n.className = 'mono nota'; n.textContent = 'moved here'; corpo.append(n); }
      li.append(corpo);
      pezzi.push(li);
    });
    if (fase === 'piazza') pezzi.push(posto(messi.length));
    linea.replaceChildren(...pezzi);
    // Il punteggio: pesci, giuste e serie, come i riquadri di AI terms
    const riquadro = (classe: string, etichetta: string, valore: string) => { const d = document.createElement('div'); d.className = `hud ${classe}`; const sm = document.createElement('small'); sm.textContent = etichetta; const v = document.createElement('b'); v.textContent = valore; d.append(sm, v); return d; };
    conto.replaceChildren(
      riquadro('hud-pesci', 'fish', `${Math.min(PESCI, messi.length + (allAmo ? 1 : 0))}/${PESCI}`),
      riquadro('hud-giuste', 'right', String(giuste)),
      riquadro(`hud-serie${serie > 1 ? ' attiva' : ''}`, 'streak', `x${serie}`),
    );
    // La carta nuova, o i posti, al centro della striscia
    const centro = linea.querySelector<HTMLElement>('.nuova') ?? linea.querySelector<HTMLElement>('.posto');
    if (centro) striscia.scrollTo({ left: centro.offsetLeft - striscia.clientWidth / 2 + centro.offsetWidth / 2, behavior: 'smooth' });
  }

  // Trascinare la scheda del pesce nella linea: una copia segue il dito; la fessura sotto si apre larga quanto una scheda, per
  // dire che il pesce può andare lì; lasciandola lì, è messa
  const scheda = preso.querySelector<HTMLElement>('.corpo')!;
  let fantasma: HTMLElement | null = null, sopra: HTMLElement | null = null, scorri = 0;
  const posa = (x: number, y: number) => {
    fantasma!.style.left = `${x}px`; fantasma!.style.top = `${y}px`;
    const p = document.elementsFromPoint(x, y).map(e => e.closest<HTMLElement>('.posto')).find(Boolean) ?? null;
    if (p !== sopra) { sopra?.classList.remove('sopra'); p?.classList.add('sopra'); sopra = p; }
    // Vicino ai bordi della striscia la linea scorre da sola, per arrivare alle fessure fuori schermo
    const b = striscia.getBoundingClientRect();
    scorri = y > b.top - 40 ? (x < 60 ? -12 : x > innerWidth - 60 ? 12 : 0) : 0;
  };
  const scorriLinea = () => { if (!fantasma) return; if (scorri) striscia.scrollLeft += scorri; requestAnimationFrame(scorriLinea); };
  scheda.addEventListener('pointerdown', e => {
    if (fase !== 'piazza') return;
    e.preventDefault(); scheda.setPointerCapture(e.pointerId);
    fantasma = scheda.cloneNode(true) as HTMLElement; fantasma.classList.add('fantasma');
    fantasma.querySelectorAll('.perche, .chi, .aiuto, .lenza').forEach(x => x.remove());
    radice.append(fantasma); preso.classList.add('in-volo'); linea.classList.add('trascino'); posa(e.clientX, e.clientY); scorriLinea();
  });
  scheda.addEventListener('pointermove', e => { if (fantasma) posa(e.clientX, e.clientY); });
  const lascia = () => {
    if (!fantasma) return;
    const dove = sopra?.dataset.i;
    fantasma.remove(); fantasma = null; sopra?.classList.remove('sopra'); sopra = null; preso.classList.remove('in-volo'); linea.classList.remove('trascino');
    if (dove !== undefined) piazza(Number(dove));
  };
  scheda.addEventListener('pointerup', lascia);
  scheda.addEventListener('pointercancel', lascia);

  // La pausa: un tasto ⏸ nella barra in alto, come in AI terms. Il menu ha «resume» e «new game»
  const menuPausa = $<HTMLElement>('.pausa-menu'); document.body.append(menuPausa);
  const tastoPausa = document.createElement('button');
  tastoPausa.type = 'button'; tastoPausa.className = 'mono tasto-pausa'; tastoPausa.textContent = '⏸'; tastoPausa.setAttribute('aria-label', 'pause the game');
  document.querySelector('.barra nav')?.prepend(tastoPausa);
  tastoPausa.addEventListener('click', () => { menuPausa.hidden = false; menuPausa.querySelector<HTMLButtonElement>('.riprendi')!.focus(); });
  menuPausa.querySelector('.riprendi')!.addEventListener('click', () => { menuPausa.hidden = true; });
  menuPausa.querySelector('.ricomincia')!.addEventListener('click', nuovaPartita);
  // La fine partita: la ✕ chiude la carta e lascia leggere la linea; il tasto copia il risultato
  $('.fine-chiudi').addEventListener('click', () => { fine.hidden = true; stato.textContent = 'Read your line. Press ⏸ for a new game.'; });
  $('.copia').addEventListener('click', async e => {
    const b = e.currentTarget as HTMLButtonElement;
    try { await navigator.clipboard.writeText(`Fishing timeline 🎣 ${giuste}/${messi.length - 1} in the right place · best streak ${serieMax}\nhttps://btwsonorico.github.io/learn/fishing-timeline/`); b.textContent = 'copied ✓'; } catch { b.textContent = 'copy failed'; }
    setTimeout(() => { b.textContent = 'copy result'; }, 1800);
  });
  $<HTMLButtonElement>('.ancora').addEventListener('click', nuovaPartita);
  nuovaPartita();
}
