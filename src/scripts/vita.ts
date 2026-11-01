// Gioco della vita di Conway a pixel, a tre colori (uno per sezione del sito).
// Regole classiche: una cella viva con 2 o 3 vicine resta viva, una cella vuota con 3 vicine nasce.
// La cella che nasce prende il colore più comune tra le sue vicine, così i colori si contendono lo schermo.
// Il puntatore semina celle vive del colore della sua zona; un clic lascia cadere un R-pentomino, che esplode.
// Le celle si accendono e si spengono piano invece di scattare.

import { avvia, CELLA, type Scena, type Zona } from './pixel';

const PASSI_AL_SECONDO = 9;
// R-pentomino: cinque celle che crescono per più di mille generazioni
const R_PENTOMINO = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];

export function monta(canvas: HTMLCanvasElement, zone: Zona[]): Scena {
  const s = avvia(canvas);
  const { ctx, dim } = s;
  const r = s.casuale(5);
  let vivo = new Uint8Array(0), dopo = new Uint8Array(0), colore = new Uint8Array(0), luce = new Float32Array(0);

  // Il colore della zona dipende dalla posizione orizzontale: projects a sinistra, knowledge a destra
  const zonaDi = (c: number) => Math.min(zone.length - 1, Math.floor((c / dim.colonne) * zone.length));
  const accendi = (c: number, g: number, z: number) => {
    const i = ((g + dim.righe) % dim.righe) * dim.colonne + ((c + dim.colonne) % dim.colonne);
    vivo[i] = 1; colore[i] = z;
  };
  const semina = (c0: number, g0: number, lato: number, densita: number) => {
    for (let c = c0; c < c0 + lato; c++) for (let g = g0; g < g0 + lato; g++) if (r() < densita) accendi(c, g, zonaDi(c));
  };

  const prepara = () => {
    const n = dim.colonne * dim.righe;
    vivo = new Uint8Array(n); dopo = new Uint8Array(n); colore = new Uint8Array(n); luce = new Float32Array(n);
    semina(0, 0, Math.max(dim.colonne, dim.righe), 0.1);
  };
  prepara();
  s.ridimensiona(prepara);

  const passo = () => {
    const C = dim.colonne, R = dim.righe;
    let vive = 0;
    const conta = [0, 0, 0];
    for (let g = 0; g < R; g++) {
      const su = ((g - 1 + R) % R) * C, qui = g * C, giu = ((g + 1) % R) * C;
      for (let c = 0; c < C; c++) {
        const sx = (c - 1 + C) % C, dx = (c + 1) % C;
        const vicine = [su + sx, su + c, su + dx, qui + sx, qui + dx, giu + sx, giu + c, giu + dx];
        let n = 0;
        for (const v of vicine) n += vivo[v]!;
        const i = qui + c;
        if (vivo[i]) dopo[i] = n === 2 || n === 3 ? 1 : 0;
        else if (n === 3) {
          // Nasce: prende il colore più comune tra le tre vicine vive
          conta[0] = conta[1] = conta[2] = 0;
          for (const v of vicine) if (vivo[v]) conta[colore[v]!]!++;
          colore[i] = conta[0]! >= conta[1]! && conta[0]! >= conta[2]! ? 0 : conta[1]! >= conta[2]! ? 1 : 2;
          dopo[i] = 1;
        } else dopo[i] = 0;
        vive += dopo[i]!;
      }
    }
    [vivo, dopo] = [dopo, vivo];
    // Quando la vita si spegne quasi del tutto, una nuova macchia di celle riparte in un punto a caso
    if (vive < vivo.length * 0.008) semina(Math.floor(r() * C), Math.floor(r() * R), 14, 0.35);
  };

  const cella = (e: PointerEvent) => { const [x, y] = s.posizione(e); return [Math.floor(x / CELLA), Math.floor(y / CELLA)] as const; };
  let ultima = -1;
  s.ascolta('pointermove', e => {
    const [c, g] = cella(e);
    const qui = g * dim.colonne + c;
    if (qui === ultima) return;
    ultima = qui;
    semina(c - 1, g - 1, 3, 0.45);
  });
  s.ascolta('pointerdown', e => {
    const [c, g] = cella(e);
    R_PENTOMINO.forEach(([dc, dg]) => accendi(c + dc! - 1, g + dg! - 1, zonaDi(c)));
  });

  let accumulo = 0;
  s.ciclo(dt => {
    accumulo += dt;
    if (accumulo > 1 / PASSI_AL_SECONDO) { accumulo = 0; passo(); }
    ctx.clearRect(0, 0, dim.w, dim.h);
    const veloce = dt > 0 ? Math.min(1, dt * 10) : 1;
    for (let i = 0; i < luce.length; i++) luce[i]! += (vivo[i]! - luce[i]!) * veloce;
    // Un passaggio per colore, con la trasparenza a gradini: le celle nascono e muoiono in dissolvenza
    zone.forEach((z, k) => {
      ctx.fillStyle = z.colore;
      for (let i = 0; i < luce.length; i++) {
        const l = luce[i]!;
        if (l < 0.06 || colore[i] !== k) continue;
        ctx.globalAlpha = Math.ceil(l * 4) * 0.1;
        ctx.fillRect((i % dim.colonne) * CELLA + 0.5, Math.floor(i / dim.colonne) * CELLA + 0.5, CELLA - 1, CELLA - 1);
      }
    });
    ctx.globalAlpha = 1;
  });
  return s;
}
