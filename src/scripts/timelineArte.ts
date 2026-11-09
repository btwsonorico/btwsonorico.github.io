// Il movimento delle immagini della timeline, a circa 25 fotogrammi al secondo: il wireframe si disegna linea per linea, poi gira
// e le sue parti si muovono; la foto in caratteri si rivela. Un solo ciclo, attivo solo se almeno una figura è in movimento. Le figure fuori vista non costano.
// Con il movimento ridotto le immagini restano ferme. Al passaggio del mouse (o a un tocco) si vede la foto vera, dove c'è.
import { perIlTema } from '../lib/arteTimeline';
import { disegna, scena, tempoFermo, type Scena } from '../lib/arteWire';

const DURATA_RIVELAZIONE = 700, PASSO = 40, RUMORE = '.:-+*#';
type Stato = { inizio: number; angolo: number; finita: boolean; pre?: HTMLElement; base?: string; soglie?: Float32Array; g?: CanvasRenderingContext2D; s?: Scena; colore?: string };

export function creaArti(figure: HTMLElement[]) {
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chiaro = document.documentElement.dataset.theme === 'light';
  const attive = new Map<HTMLElement, Stato>();
  let inCiclo = false, ultimo = 0;
  const tela = (f: HTMLElement) => f.querySelector('canvas')?.getContext('2d') ?? null;

  figure.forEach(f => {
    const pre = f.querySelector('pre'), g = tela(f), s = scena(f.dataset.simbolo!);
    // Il wireframe è già disegnato, fermo: serve col movimento ridotto e prima che la figura diventi attiva
    if (g && s) disegna(g, s, 0.6, getComputedStyle(f).color, 1, tempoFermo(f.dataset.simbolo!));
    // Foto: nel tema chiaro la rampa è rovesciata. Un tocco la mostra o la toglie: sul telefono non c'è il passaggio del mouse
    if (pre && f.classList.contains('con-foto')) {
      pre.textContent = perIlTema(pre.textContent ?? '', chiaro);
      f.addEventListener('click', () => f.classList.toggle('foto-vista'));
    }
  });

  function testoPre(s: Stato, p: number) {
    const base = s.base!;
    if (p >= 1) return base;
    // Ogni carattere appare alla sua soglia; poco prima è un carattere a caso
    let esce = '';
    for (let i = 0; i < base.length; i++) {
      const ch = base[i]!;
      if (ch === '\n' || ch === ' ') { esce += ch; continue; }
      const q = p - s.soglie![i]!;
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
      const p = (t - s.inizio) / DURATA_RIVELAZIONE;
      if (s.g && s.s) {
        s.angolo += passo * 0.00055;
        disegna(s.g, s.s, s.angolo, s.colore!, Math.min(1, p), (t - s.inizio) / 1000);
      } else if (s.pre) {
        s.pre.textContent = testoPre(s, p);
        // Rivelazione finita: la foto ferma non chiede più lavoro
        if (p >= 1) attive.delete(f);
      }
    }
  }
  return {
    avvia(f: HTMLElement) {
      if (ridotto || attive.has(f)) return;
      const inizio = performance.now(), g = tela(f), s = scena(f.dataset.simbolo!), pre = f.querySelector('pre');
      if (g && s) attive.set(f, { inizio, angolo: 0.6, finita: false, g, s, colore: getComputedStyle(f).color });
      else if (pre) {
        const base = pre.textContent ?? '', soglie = new Float32Array(base.length);
        for (let i = 0; i < soglie.length; i++) soglie[i] = Math.random() * 0.82;
        attive.set(f, { inizio, angolo: 0, finita: false, pre, base, soglie });
      }
      if (!inCiclo) { inCiclo = true; requestAnimationFrame(ciclo); }
    },
    ferma(f: HTMLElement) { attive.delete(f); f.classList.remove('foto-vista'); },
  };
}
