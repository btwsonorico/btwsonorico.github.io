import { dividi, type Voce } from '../lib/glossario';

// Scheda delle scene del glossario: prima una domanda, poi la definizione intera. Sta fuori dal riquadro della scena, così su telefono
// il testo lungo scorre col dito. Il testo arriva dal file del glossario e si scrive sempre come testo, mai come HTML.
export function nuovaScheda(contenitore: HTMLElement, azione: string, alClic: () => void, alRisposta: (giusto: boolean) => void = () => {}) {
  const scheda = document.createElement('aside');
  scheda.className = 'scheda-glossario';
  scheda.hidden = true;
  const sezione = document.createElement('p'), titolo = document.createElement('h2'), corpo = document.createElement('div'), bottone = document.createElement('button');
  sezione.className = 'mono';
  bottone.type = 'button';
  bottone.className = 'mono';
  bottone.textContent = azione;
  bottone.addEventListener('click', alClic);
  scheda.append(sezione, titolo, corpo, bottone);
  contenitore.appendChild(scheda);
  // risposto: finché è false la scheda aspetta una risposta e il pesce non si può rilasciare
  const stato = { sopra: false, risposto: true };
  scheda.addEventListener('pointerenter', () => { stato.sopra = true; });
  scheda.addEventListener('pointerleave', () => { stato.sopra = false; });
  let opzioni: HTMLButtonElement[] = [], attesa = 0;
  const card = (v: Voce, giusto: boolean, giusta: string) => {
    const esito = document.createElement('p');
    esito.className = `mono esito${giusto ? ' giusto' : ''}`;
    esito.textContent = giusto ? 'right: caught' : `it got away. the answer: ${giusta.toLowerCase()}`;
    titolo.textContent = v.termine;
    corpo.replaceChildren(esito, ...v.definizione.map(t => { const q = document.createElement('p'); q.textContent = t; return q; }));
    if (v.punti.length) {
      const lista = document.createElement('ul');
      v.punti.map(dividi).forEach(q => {
        const li = document.createElement('li');
        if (q.nome) { const forte = document.createElement('strong'); forte.textContent = `${q.nome}: `; li.append(forte); }
        li.append(q.testo);
        lista.append(li);
      });
      corpo.append(lista);
    }
    bottone.hidden = false;
    scheda.scrollTop = 0;
  };
  // Prima si vede quale risposta era giusta, poi arriva la card
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
    const pausa = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : giusto ? 600 : 1300;
    attesa = window.setTimeout(() => card(v, giusto, giusta), pausa);
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
    // La domanda con tre risposte mescolate; dopo la risposta, l'esito e la definizione intera
    mostra(v: Voce) {
      corrente = v;
      stato.risposto = false;
      sezione.textContent = `// ${v.sezione} · ${v.livello}`;
      titolo.textContent = v.domanda.testo;
      bottone.hidden = true;
      const giusta = v.domanda.risposte[0]!;
      opzioni = [...v.domanda.risposte].sort(() => Math.random() - 0.5).map((testo, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mono opzione';
        b.dataset.testo = testo;
        const numero = document.createElement('span');
        numero.textContent = String(i + 1);
        b.append(numero, testo);
        b.addEventListener('click', () => rispondi(v, b, giusta));
        return b;
      });
      corpo.replaceChildren(...opzioni);
      scheda.scrollTop = 0;
      scheda.hidden = false;
    },
    nascondi() { clearTimeout(attesa); scheda.hidden = true; stato.sopra = false; },
    togli() { clearTimeout(attesa); window.removeEventListener('keydown', tasti); scheda.remove(); },
  };
}
