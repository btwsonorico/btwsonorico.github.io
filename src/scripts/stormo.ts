// Stormo di storni a pixel, in scala di grigi come il gioco della vita.
// Ogni uccello segue tre regole semplici: non urtare i vicini, andare nella loro direzione, restare con il gruppo.
// Un punto invisibile che vaga piano tiene unito lo stormo, che così cambia forma di continuo come gli storni veri.
// Il puntatore è un falco: gli uccelli vicini scappano e l'onda di fuga attraversa lo stormo. Un clic lo spaventa tutto.

import { avvia, type Scena } from './pixel';

const PIXEL = 3, VICINI = 42, SEPARA = 11, VEL_MIN = 70, VEL_MAX = 150, SPINTA = 260, FALCO = 140;

export function monta(canvas: HTMLCanvasElement): Scena {
  const s = avvia(canvas);
  const { ctx, dim, colori } = s;
  const r = s.casuale(19);
  const n = dim.w < 640 ? 260 : 650;
  const x = new Float32Array(n), y = new Float32Array(n), vx = new Float32Array(n), vy = new Float32Array(n);
  // Su schermi larghi lo stormo vola soprattutto a destra, lontano dal testo
  const zona = () => dim.w < 640 ? { x0: 0, x1: dim.w, y0: 0, y1: dim.h * 0.5 } : { x0: dim.w * 0.4, x1: dim.w, y0: 0, y1: dim.h };
  {
    const z = zona();
    for (let i = 0; i < n; i++) {
      // Partenza: una macchia allungata e morbida, più fitta al centro
      const a0 = r() * Math.PI * 2, d0 = Math.sqrt(r()) * (r() * 0.5 + 0.5);
      x[i] = (z.x0 + z.x1) / 2 + Math.cos(a0) * d0 * (z.x1 - z.x0) * 0.22; y[i] = (z.y0 + z.y1) / 2 + Math.sin(a0) * d0 * (z.y1 - z.y0) * 0.12;
      const a = r() * Math.PI * 2; vx[i] = Math.cos(a) * VEL_MIN; vy[i] = Math.sin(a) * VEL_MIN;
    }
  }

  // Falco: la posizione del puntatore; un clic fa scappare tutto lo stormo per un momento
  let fx = -1e4, fy = -1e4, panico = 0;
  s.ascolta('pointermove', e => { [fx, fy] = s.posizione(e); });
  s.ascolta('pointerleave', () => { fx = fy = -1e4; });
  s.ascolta('pointerdown', e => { [fx, fy] = s.posizione(e); panico = 1; });

  // Griglia per trovare i vicini senza confrontare ogni uccello con tutti gli altri
  const griglia = new Map<number, number[]>();
  const chiave = (cx: number, cy: number) => cx * 4096 + cy;

  let tempo = 0;
  s.ciclo(dt => {
    tempo += dt;
    const z = zona();
    // Il punto che tiene unito lo stormo disegna curve lente dentro la zona
    const ax = z.x0 + (z.x1 - z.x0) * (0.5 + 0.38 * Math.sin(tempo * 0.13) * Math.cos(tempo * 0.05));
    const ay = z.y0 + (z.y1 - z.y0) * (0.5 + 0.36 * Math.sin(tempo * 0.19 + 1));
    if (dt > 0) {
      griglia.clear();
      for (let i = 0; i < n; i++) {
        const k = chiave(Math.floor(x[i]! / VICINI), Math.floor(y[i]! / VICINI));
        const lista = griglia.get(k);
        if (lista) lista.push(i); else griglia.set(k, [i]);
      }
      panico = Math.max(0, panico - dt * 0.8);
      for (let i = 0; i < n; i++) {
        let sx = 0, sy = 0, mx = 0, my = 0, cx = 0, cy = 0, quanti = 0;
        const gx = Math.floor(x[i]! / VICINI), gy = Math.floor(y[i]! / VICINI);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const lista = griglia.get(chiave(gx + ox, gy + oy));
          if (!lista) continue;
          for (const j of lista) {
            if (j === i) continue;
            const dx = x[j]! - x[i]!, dy = y[j]! - y[i]!, d2 = dx * dx + dy * dy;
            if (d2 > VICINI * VICINI) continue;
            quanti++;
            mx += vx[j]!; my += vy[j]!; cx += dx; cy += dy;
            if (d2 < SEPARA * SEPARA) { const d = Math.sqrt(d2) || 1; sx -= dx / d * (SEPARA - d); sy -= dy / d * (SEPARA - d); }
          }
        }
        let fxi = 0, fyi = 0;
        if (quanti) {
          fxi += (mx / quanti - vx[i]!) * 1.1 + (cx / quanti) * 0.9;
          fyi += (my / quanti - vy[i]!) * 1.1 + (cy / quanti) * 0.9;
        }
        fxi += sx * 9; fyi += sy * 9;
        // Verso il punto che tiene unito lo stormo
        fxi += (ax - x[i]!) * 0.35; fyi += (ay - y[i]!) * 0.35;
        // Falco: più è vicino, più forte la fuga
        const hx = x[i]! - fx, hy = y[i]! - fy, hd = Math.hypot(hx, hy) || 1, raggio = FALCO + panico * 260;
        if (hd < raggio) { const f = (1 - hd / raggio) * (900 + panico * 600); fxi += hx / hd * f; fyi += hy / hd * f; }
        // Spinta limitata: le virate restano morbide
        const fl = Math.hypot(fxi, fyi);
        if (fl > SPINTA * (1 + panico)) { fxi *= SPINTA * (1 + panico) / fl; fyi *= SPINTA * (1 + panico) / fl; }
        vx[i] = vx[i]! + fxi * dt; vy[i] = vy[i]! + fyi * dt;
        const v = Math.hypot(vx[i]!, vy[i]!) || 1, max = VEL_MAX * (1 + panico * 0.6);
        if (v > max) { vx[i] = vx[i]! * max / v; vy[i] = vy[i]! * max / v; }
        if (v < VEL_MIN) { vx[i] = vx[i]! * VEL_MIN / v; vy[i] = vy[i]! * VEL_MIN / v; }
        x[i] = x[i]! + vx[i]! * dt; y[i] = y[i]! + vy[i]! * dt;
      }
    }
    // Disegno: ogni uccello è un quadratino sulla griglia di pixel; dove lo stormo è fitto i quadratini si sommano e scuriscono
    ctx.clearRect(0, 0, dim.w, dim.h);
    ctx.fillStyle = colori.fg;
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < n; i++) ctx.fillRect(Math.round(x[i]! / PIXEL) * PIXEL, Math.round(y[i]! / PIXEL) * PIXEL, PIXEL - 1, PIXEL - 1);
    ctx.globalAlpha = 1;
  });
  return s;
}
