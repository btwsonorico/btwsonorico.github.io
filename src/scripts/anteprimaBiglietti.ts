// Anteprima dei biglietti (solo per lo sviluppo): /learn/airport/?anteprima mostra una galleria di biglietti veri,
// fatti dallo stesso codice del gioco. Ogni biglietto pesca dal mazzo delle arti, quindi le arti escono tutte;
// l'ultimo è la carta rara Holo. Un bottone gira tutti i biglietti.
import { nuovoImbarco } from './bigliettoImbarco';
import { nuovaPartita, nuovoVolo, SEZIONI } from '../lib/voli';

const KS = 'ai-terms-serie-v2';
export function anteprima(n = 15) {
  document.body.classList.add('anteprima');
  const box = document.createElement('div'); box.className = 'galleria-biglietti';
  const testa = document.createElement('div'); testa.className = 'galleria-testa';
  testa.innerHTML = '<h1>Tickets · preview</h1><p>One standard paper ticket. Only the art (front left, back poster) and its colours change; foil elements are drawn at random, tinted by level: silver easy, gold medium, rainbow hard. The last card is the rare Holo.</p>';
  const gira = document.createElement('button'); gira.type = 'button'; gira.className = 'mono'; gira.textContent = 'turn all ↻';
  gira.addEventListener('click', () => box.querySelectorAll('.carta').forEach(c => c.classList.toggle('girata')));
  const mescola = document.createElement('button'); mescola.type = 'button'; mescola.className = 'mono'; mescola.textContent = 'new draw ⟳';
  mescola.addEventListener('click', () => location.reload());
  testa.append(gira, mescola); box.append(testa);
  document.body.append(box);
  const prima = localStorage.getItem(KS);
  for (let k = 0; k < n; k++) {
    // La serie a 5 solo per l'ultimo: così esce la carta Holo
    try { if (k === n - 1) localStorage.setItem(KS, JSON.stringify({ ora: 5, migliore: 5 })); else localStorage.setItem(KS, JSON.stringify({ ora: 0, migliore: 0 })); } catch { /* niente */ }
    const cella = document.createElement('section'); cella.className = 'galleria-cella'; box.append(cella);
    const voli = SEZIONI.map((_, i) => nuovoVolo(i)), p = nuovaPartita(voli.length), i = k % voli.length;
    p.fatto[i] = true; p.tentativi[i] = 1;
    const imb = nuovoImbarco(cella, { data: new Date(), voli, partita: p, riassunto: () => 'preview', dopo: () => {}, prossimo: () => {}, chiudi: () => {} });
    imb.mostra(i);
    // Si parte dal davanti
    const carta = cella.querySelector('.carta'); carta?.classList.remove('girata');
    const nota = document.createElement('p'); nota.className = 'mono galleria-nota';
    nota.textContent = `${carta?.getAttribute('data-stile')} · ${carta?.getAttribute('data-livello')} · ${carta?.getAttribute('data-lamina')}`;
    cella.prepend(nota);
  }
  try { if (prima === null) localStorage.removeItem(KS); else localStorage.setItem(KS, prima); } catch { /* niente */ }
}
