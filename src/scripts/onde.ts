// Onde a pixel: la riva del mare vista dall'alto, in scala di grigi come il gioco della vita.
// Il mare sta a destra. Le onde arrivano da destra, salgono sulla sabbia e si ritirano; ogni tratto di riva
// è un po' in ritardo sul vicino, così l'onda arriva di sbieco come sulle spiagge vere.
// Effetti: creste che corrono verso la riva, schiuma sul bordo, sabbia bagnata che si asciuga piano,
// luccichii sull'acqua. Il puntatore lascia cerchi nell'acqua; un clic fa un tonfo.

import { avvia, type Scena } from './pixel';

const CELLA = 10;
const PERIODO = 7.5; // secondi fra un'onda e la successiva

type Cerchio = { c: number; g: number; nato: number; forza: number };

export function monta(canvas: HTMLCanvasElement): Scena {
  const s = avvia(canvas);
  const { ctx, dim, colori } = s;
  const r = s.casuale(13);
  let colonne = 0, righe = 0, bagnato = new Float32Array(0), luccichio = new Float32Array(0);
  const prepara = () => {
    colonne = Math.ceil(dim.w / CELLA); righe = Math.ceil(dim.h / CELLA);
    bagnato = new Float32Array(colonne * righe);
    luccichio = new Float32Array(colonne * righe);
  };
  prepara();
  s.ridimensiona(prepara);

  // Risalita dell'onda in una fase da 0 a 1: sale in fretta (prima parte), poi si ritira piano
  const risalita = (f: number) => f < 0.3 ? 1 - (1 - f / 0.3) ** 3 : 0.5 + 0.5 * Math.cos(((f - 0.3) / 0.7) * Math.PI);

  const cerchi: Cerchio[] = [];
  let ultimo = 0;
  const cella = (e: PointerEvent) => { const [x, y] = s.posizione(e); return [Math.floor(x / CELLA), Math.floor(y / CELLA)] as const; };
  s.ascolta('pointermove', e => {
    const ora = performance.now();
    if (ora - ultimo < 140) return;
    ultimo = ora;
    const [c, g] = cella(e);
    cerchi.push({ c, g, nato: ora, forza: 0.5 });
  });
  s.ascolta('pointerdown', e => {
    const [c, g] = cella(e);
    const ora = performance.now();
    for (let k = 0; k < 3; k++) cerchi.push({ c, g, nato: ora + k * 260, forza: 1 });
  });

  let tempo = 0;
  s.ciclo((dt, ora) => {
    tempo += dt;
    ctx.clearRect(0, 0, dim.w, dim.h);
    ctx.fillStyle = colori.fg;
    const fondo = colonne * 0.38; // dove arriva il mare quando è calmo, misurato da destra
    for (let k = cerchi.length - 1; k >= 0; k--) if (ora - cerchi[k]!.nato > 1600) cerchi.splice(k, 1);

    for (let g = 0; g < righe; g++) {
      // Fase dell'onda in questa riga: ritardo che cambia lungo la riva, più una piccola irregolarità
      const ritardo = g * 0.012 + Math.sin(g * 0.11) * 0.05;
      const f = (((tempo / PERIODO - ritardo) % 1) + 1) % 1;
      const bordo = fondo + risalita(f) * colonne * 0.16 + Math.sin(g * 0.35 + tempo * 0.6) * 0.8 + Math.sin(g * 0.13) * 1.5;
      for (let c = 0; c < colonne; c++) {
        const i = g * colonne + c;
        const u = colonne - c; // distanza dal bordo destro, in celle
        let a = 0;
        if (u < bordo) {
          // Acqua: più profonda (più piena) verso destra, con creste che corrono verso la riva
          const profondo = Math.min(1, (bordo - u) / 18);
          const cresta = Math.max(0, Math.sin(u * 0.32 - tempo * 2.2 + Math.sin(g * 0.08) * 1.5)) ** 6;
          a = 0.05 + profondo * 0.06 + cresta * 0.1 * profondo;
          // Schiuma sul bordo dell'onda: più forte mentre sale, quasi niente mentre si ritira
          const schiuma = bordo - u;
          if (schiuma < 2.2) a = Math.max(a, (f < 0.35 ? 0.4 : 0.22) * (1 - schiuma / 2.2) + (r() < 0.25 ? 0.1 : 0));
          bagnato[i] = 1;
          // Luccichii: ogni tanto una cella d'acqua si accende e si spegne
          if (dt > 0 && r() < 0.0004) luccichio[i] = 1;
        } else {
          // Sabbia bagnata: si asciuga piano dopo che l'onda si è ritirata
          bagnato[i] = Math.max(0, bagnato[i]! - dt * 0.25);
          a = bagnato[i]! * 0.06;
          luccichio[i] = 0;
        }
        if (luccichio[i]! > 0) { a = Math.max(a, luccichio[i]! * 0.45); luccichio[i] = Math.max(0, luccichio[i]! - dt * 1.5); }
        // Cerchi del puntatore: anelli che si allargano nell'acqua
        for (const q of cerchi) {
          const eta = (ora - q.nato) / 1600;
          if (eta < 0 || u >= bordo) continue;
          const d = Math.hypot(c - q.c, g - q.g), raggio = eta * 9;
          if (Math.abs(d - raggio) < 0.7) a = Math.max(a, (1 - eta) * 0.35 * q.forza);
        }
        if (a < 0.02) continue;
        ctx.globalAlpha = Math.min(0.6, Math.round(a * 20) / 20);
        ctx.fillRect(c * CELLA + 0.5, g * CELLA + 0.5, CELLA - 1, CELLA - 1);
      }
    }
    ctx.globalAlpha = 1;
  });
  return s;
}
