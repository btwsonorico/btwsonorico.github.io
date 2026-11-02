import { dividi, type Voce } from '../lib/glossario';

// Scheda con la definizione intera, usata dalle scene del glossario. Sta fuori dal riquadro della scena, così su telefono
// il testo lungo scorre col dito. Il testo arriva dal file del glossario e si scrive sempre come testo, mai come HTML.
export function nuovaScheda(contenitore: HTMLElement, azione: string, alClic: () => void) {
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
  // Il puntatore sopra la scheda ferma il tempo di lettura
  const stato = { sopra: false };
  scheda.addEventListener('pointerenter', () => { stato.sopra = true; });
  scheda.addEventListener('pointerleave', () => { stato.sopra = false; });
  return {
    stato,
    mostra(v: Voce) {
      sezione.textContent = `// ${v.sezione}`;
      titolo.textContent = v.termine;
      corpo.replaceChildren(...v.definizione.map(t => { const q = document.createElement('p'); q.textContent = t; return q; }));
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
      scheda.scrollTop = 0;
      scheda.hidden = false;
    },
    nascondi() { scheda.hidden = true; stato.sopra = false; },
    togli() { scheda.remove(); },
  };
}
