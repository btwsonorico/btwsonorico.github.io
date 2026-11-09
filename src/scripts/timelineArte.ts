// Il movimento delle immagini ASCII della timeline: la rivelazione a caratteri quando una figura diventa attiva e la rotazione
// degli oggetti 3D, a circa 15 fotogrammi al secondo. Un solo ciclo, attivo solo se almeno una figura è in movimento.
// Con il movimento ridotto le immagini restano ferme. Al passaggio del mouse (o a un tocco) si vede la foto vera, dove c'è.
import { fotogrammaArte, perIlTema } from '../lib/arteTimeline';

const DURATA_RIVELAZIONE = 700, PASSO = 66, RUMORE = '.:-+*#';
type Stato = { pre: HTMLElement; nome: string; rotante: boolean; base: string; inizio: number; soglie: Float32Array; angolo: number };

export function creaArti(figure: HTMLElement[]) {
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chiaro = document.documentElement.dataset.theme === 'light';
  const attive = new Map<HTMLElement, Stato>();
  let inCiclo = false, ultimo = 0;

  // Il tema si legge qui: foto e oggetti 3D nel tema chiaro hanno la rampa rovesciata. Gli schemi non cambiano
  figure.forEach(f => {
    const pre = f.querySelector('pre')!;
    if (f.dataset.rotante !== undefined) pre.textContent = fotogrammaArte(f.dataset.simbolo!, 0.6, chiaro);
    else if (f.classList.contains('con-foto')) pre.textContent = perIlTema(pre.textContent ?? '', chiaro);
    // Un tocco mostra la foto o la toglie: sul telefono non c'è il passaggio del mouse
    if (f.classList.contains('con-foto')) f.addEventListener('click', () => f.classList.toggle('foto-vista'));
  });

  function testo(s: Stato, t: number) {
    const base = s.rotante ? fotogrammaArte(s.nome, s.angolo, chiaro) : s.base, p = (t - s.inizio) / DURATA_RIVELAZIONE;
    if (p >= 1) return base;
    // Ogni carattere appare alla sua soglia; poco prima è un carattere a caso
    let esce = '';
    for (let i = 0; i < base.length; i++) {
      const ch = base[i]!;
      if (ch === '\n' || ch === ' ') { esce += ch; continue; }
      const q = p - s.soglie[i]!;
      esce += q > 0.12 ? ch : q > 0 ? RUMORE[Math.floor(Math.random() * RUMORE.length)] : ' ';
    }
    return esce;
  }
  function ciclo(t: number) {
    if (!attive.size) { inCiclo = false; return; }
    requestAnimationFrame(ciclo);
    if (t - ultimo < PASSO) return;
    const passo = Math.min(200, t - ultimo); ultimo = t;
    for (const [f, s] of attive) {
      s.angolo += passo * 0.00045;
      s.pre.textContent = testo(s, t);
      // Rivelazione finita e nessuna rotazione: la figura non chiede più lavoro
      if (!s.rotante && t - s.inizio >= DURATA_RIVELAZIONE) attive.delete(f);
    }
  }
  return {
    avvia(f: HTMLElement) {
      if (ridotto || attive.has(f)) return;
      const pre = f.querySelector('pre')!, base = pre.textContent ?? '', soglie = new Float32Array(base.length);
      for (let i = 0; i < soglie.length; i++) soglie[i] = Math.random() * 0.82;
      attive.set(f, { pre, nome: f.dataset.simbolo!, rotante: f.dataset.rotante !== undefined, base, inizio: performance.now(), soglie, angolo: 0.6 });
      if (!inCiclo) { inCiclo = true; requestAnimationFrame(ciclo); }
    },
    ferma(f: HTMLElement) { attive.delete(f); f.classList.remove('foto-vista'); },
  };
}
