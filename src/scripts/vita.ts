// Gioco della vita di Conway a pixel, in scala di grigi (il colore del testo, con trasparenze diverse).
// Regole classiche: una cella viva con 2 o 3 vicine resta viva, una cella vuota con 3 vicine nasce.
// Le celle appena nate sono più chiare, quelle vecchie e stabili sbiadiscono: si vede dove la vita si muove.
// Il puntatore semina celle vive; un clic lascia cadere un R-pentomino, che esplode.
// Le celle si accendono e si spengono piano invece di scattare.

import { avvia, type Scena } from './pixel';

const PASSI_AL_SECONDO = 5;
// Celle grandi e poche: la vita si vede da vicino e resta uno sfondo tranquillo
const CELLA = 16;
// R-pentomino: cinque celle che crescono per più di mille generazioni
const R_PENTOMINO = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];

export function monta(canvas: HTMLCanvasElement): Scena {
  const s = avvia(canvas);
  const { ctx, dim, colori } = s;
  const r = s.casuale(5);
  let colonne = 0, righe = 0;
  let vivo = new Uint8Array(0), dopo = new Uint8Array(0), eta = new Uint8Array(0), luce = new Float32Array(0);

  const accendi = (c: number, g: number) => {
    const i = ((g + righe) % righe) * colonne + ((c + colonne) % colonne);
    if (!vivo[i]) { vivo[i] = 1; eta[i] = 0; }
  };
  const semina = (c0: number, g0: number, lato: number, densita: number) => {
    for (let c = c0; c < c0 + lato; c++) for (let g = g0; g < g0 + lato; g++) if (r() < densita) accendi(c, g);
  };

  const prepara = () => {
    colonne = Math.ceil(dim.w / CELLA); righe = Math.ceil(dim.h / CELLA);
    const n = colonne * righe;
    vivo = new Uint8Array(n); dopo = new Uint8Array(n); eta = new Uint8Array(n); luce = new Float32Array(n);
    semina(0, 0, Math.max(colonne, righe), 0.12);
  };
  prepara();
  s.ridimensiona(prepara);

  const passo = () => {
    const C = colonne, R = righe;
    let vive = 0;
    for (let g = 0; g < R; g++) {
      const su = ((g - 1 + R) % R) * C, qui = g * C, giu = ((g + 1) % R) * C;
      for (let c = 0; c < C; c++) {
        const sx = (c - 1 + C) % C, dx = (c + 1) % C;
        const n = vivo[su + sx]! + vivo[su + c]! + vivo[su + dx]! + vivo[qui + sx]! + vivo[qui + dx]! + vivo[giu + sx]! + vivo[giu + c]! + vivo[giu + dx]!;
        const i = qui + c;
        if (vivo[i]) { dopo[i] = n === 2 || n === 3 ? 1 : 0; if (dopo[i] && eta[i]! < 255) eta[i]!++; }
        else { dopo[i] = n === 3 ? 1 : 0; if (dopo[i]) eta[i] = 0; }
        vive += dopo[i]!;
      }
    }
    [vivo, dopo] = [dopo, vivo];
    // Quando la vita si spegne quasi del tutto, una nuova macchia di celle riparte in un punto a caso
    if (vive < vivo.length * 0.01) semina(Math.floor(r() * C), Math.floor(r() * R), 8, 0.35);
  };

  const cella = (e: PointerEvent) => { const [x, y] = s.posizione(e); return [Math.floor(x / CELLA), Math.floor(y / CELLA)] as const; };
  let ultima = -1;
  s.ascolta('pointermove', e => {
    const [c, g] = cella(e);
    const qui = g * colonne + c;
    if (qui === ultima) return;
    ultima = qui;
    semina(c - 1, g - 1, 3, 0.45);
  });
  s.ascolta('pointerdown', e => {
    const [c, g] = cella(e);
    R_PENTOMINO.forEach(([dc, dg]) => accendi(c + dc! - 1, g + dg! - 1));
  });

  let accumulo = 0;
  s.ciclo(dt => {
    accumulo += dt;
    if (accumulo > 1 / PASSI_AL_SECONDO) { accumulo = 0; passo(); }
    ctx.clearRect(0, 0, dim.w, dim.h);
    const veloce = dt > 0 ? Math.min(1, dt * 10) : 1;
    ctx.fillStyle = colori.fg;
    for (let i = 0; i < luce.length; i++) {
      const l = (luce[i]! += (vivo[i]! - luce[i]!) * veloce);
      if (l < 0.06) continue;
      // Trasparenza a gradini: più chiara se la cella è giovane, più tenue se vive da molto
      const giovane = Math.max(0, 1 - eta[i]! / 12);
      ctx.globalAlpha = Math.ceil(l * 4) * (0.035 + giovane * 0.05);
      ctx.fillRect((i % colonne) * CELLA + 0.5, Math.floor(i / colonne) * CELLA + 0.5, CELLA - 1, CELLA - 1);
    }
    ctx.globalAlpha = 1;
  });
  return s;
}
