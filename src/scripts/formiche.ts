// Colonia di formiche a pixel: tre formicai, uno per sezione del sito, ognuno del suo colore.
// Le formiche vanno da un formicaio all'altro e lasciano una scia (feromone) che svanisce piano.
// Un clic lascia cadere del cibo: le formiche lo trovano, lo portano a casa e la scia diventa un sentiero.
// Un clic su un formicaio apre la sua sezione.

import { avvia, CELLA, FONT, type Scena, type Zona } from './pixel';

type Formicaio = Zona & { x: number; y: number; scia: Float32Array };
type Formica = {
  x: number; y: number; a: number; vel: number; casa: number;
  meta: { x: number; y: number; cibo: Cibo | null; formicaio: number };
  porta: string | null;
};
type Cibo = { x: number; y: number; quanto: number };

const MARRONE = '#c98545';
// Posizioni dei formicai, in frazioni dello schermo: a destra del testo su schermi larghi, in alto sui telefoni
const POSTI = { largo: [[0.55, 0.22], [0.86, 0.42], [0.66, 0.74]], stretto: [[0.22, 0.2], [0.78, 0.28], [0.55, 0.5]] };

export function monta(canvas: HTMLCanvasElement, zone: Zona[]): Scena {
  const s = avvia(canvas);
  const { ctx, dim, colori } = s;
  const r = s.casuale(11);
  const formicai: Formicaio[] = zone.map(z => ({ ...z, x: 0, y: 0, scia: new Float32Array(0) }));
  const cibo: Cibo[] = [];

  const sistema = () => {
    const posti = dim.w < 640 ? POSTI.stretto : POSTI.largo;
    formicai.forEach((f, k) => {
      f.x = posti[k % 3]![0]! * dim.w; f.y = posti[k % 3]![1]! * dim.h;
      f.scia = new Float32Array(dim.colonne * dim.righe);
    });
  };
  sistema();

  // La formica sceglie dove andare: il cibo più vicino, se c'è, o un altro formicaio
  const scegli = (f: Formica) => {
    const casa = formicai[f.casa]!;
    if (cibo.length && r() < 0.7) {
      const c = cibo.reduce((a, b) => (Math.hypot(b.x - casa.x, b.y - casa.y) < Math.hypot(a.x - casa.x, a.y - casa.y) ? b : a));
      f.meta = { x: c.x, y: c.y, cibo: c, formicaio: -1 };
    } else {
      let altro = Math.floor(r() * formicai.length);
      if (altro === f.casa) altro = (altro + 1) % formicai.length;
      f.meta = { x: formicai[altro]!.x, y: formicai[altro]!.y, cibo: null, formicaio: altro };
    }
  };

  // Le formiche nascono sparse lungo il cammino, così la scena è viva da subito; rinascono se lo schermo cambia misura
  const formiche: Formica[] = [];
  const popola = () => {
    formiche.length = 0;
    const perFormicaio = dim.w < 640 ? 10 : 22;
    formicai.forEach((c, k) => {
      for (let n = 0; n < perFormicaio; n++) {
        const f: Formica = { x: c.x, y: c.y, a: r() * Math.PI * 2, vel: 34 + r() * 16, casa: k, meta: { x: 0, y: 0, cibo: null, formicaio: 0 }, porta: null };
        scegli(f);
        const t = r();
        f.x = c.x + (f.meta.x - c.x) * t + (r() - 0.5) * 40;
        f.y = c.y + (f.meta.y - c.y) * t + (r() - 0.5) * 40;
        formiche.push(f);
      }
    });
  };
  popola();
  s.ridimensiona(() => { sistema(); popola(); });

  const indice = (x: number, y: number) => {
    const c = Math.floor(x / CELLA), g = Math.floor(y / CELLA);
    return c < 0 || g < 0 || c >= dim.colonne || g >= dim.righe ? -1 : g * dim.colonne + c;
  };
  const differenza = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  // Formicaio sotto il puntatore (il cumulo o il suo nome)
  const sotto = (x: number, y: number) => formicai.find(f => Math.hypot(x - f.x, y - f.y) < CELLA * 4 || (Math.abs(x - f.x) < 50 && Math.abs(y - (f.y - CELLA * 5)) < 10)) ?? null;
  let evidenziato: Formicaio | null = null;
  s.ascolta('pointermove', e => {
    const [x, y] = s.posizione(e);
    evidenziato = sotto(x, y);
    canvas.style.cursor = evidenziato ? 'pointer' : 'crosshair';
  });
  s.ascolta('pointerleave', () => { evidenziato = null; });
  s.ascolta('pointerdown', e => {
    const [x, y] = s.posizione(e);
    const f = sotto(x, y);
    if (f) { location.href = f.href; return; }
    cibo.push({ x, y, quanto: 14 });
    if (cibo.length > 6) cibo.shift();
  });
  canvas.style.cursor = 'crosshair';

  s.ciclo((dt, ora) => {
    ctx.clearRect(0, 0, dim.w, dim.h);
    const svanisce = 1 - dt * 0.18;

    // Scie: una griglia per formicaio, disegnata con la trasparenza a gradini
    for (const f of formicai) {
      ctx.fillStyle = f.colore;
      const scia = f.scia;
      for (let i = 0; i < scia.length; i++) {
        let v = scia[i]!;
        if (v < 0.03) { if (v) scia[i] = 0; continue; }
        v *= svanisce;
        scia[i] = v;
        ctx.globalAlpha = Math.round(Math.min(1, v) * 5) * 0.06;
        ctx.fillRect((i % dim.colonne) * CELLA + 0.5, Math.floor(i / dim.colonne) * CELLA + 0.5, CELLA - 1, CELLA - 1);
      }
    }
    ctx.globalAlpha = 1;

    // Cibo: un mucchietto di celle che si rimpicciolisce mentre le formiche lo portano via
    for (const c of cibo) {
      ctx.fillStyle = MARRONE;
      for (let k = 0; k < c.quanto; k++) {
        const ang = k * 2.4, rag = Math.sqrt(k) * 4;
        ctx.fillRect(Math.round(c.x + Math.cos(ang) * rag) - 2, Math.round(c.y + Math.sin(ang) * rag) - 2, 4, 4);
      }
    }

    // Formicai: un cumulo di celle con l'entrata scura al centro, e il nome sopra
    for (const f of formicai) {
      for (let i = -4; i <= 4; i++) for (let j = -3; j <= 3; j++) {
        const d = Math.hypot(i, j * 1.3);
        if (d > 4) continue;
        ctx.globalAlpha = d < 1.2 ? 1 : 0.5 - d * 0.07;
        ctx.fillStyle = d < 1.2 ? colori.bg : f.colore;
        ctx.fillRect(Math.round(f.x) + i * CELLA - CELLA / 2 + 0.5, Math.round(f.y) + j * CELLA - CELLA / 2 + 0.5, CELLA - 1, CELLA - 1);
      }
      const acceso = evidenziato === f;
      ctx.globalAlpha = acceso ? 1 : 0.85;
      ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = colori.bg; ctx.shadowBlur = 6;
      ctx.fillStyle = f.colore;
      ctx.fillText(acceso ? `${f.nome} →` : f.nome, Math.round(f.x), Math.round(f.y - CELLA * 5));
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    for (const f of formiche) {
      const casa = formicai[f.casa]!;
      if (dt > 0) {
        // Se porta qualcosa torna a casa; se no va verso la meta (un cibo sparito fa cambiare idea)
        if (!f.porta && f.meta.cibo && !cibo.includes(f.meta.cibo)) scegli(f);
        // La posizione della meta si legge sempre dal formicaio, che si sposta quando lo schermo cambia misura
        const meta = f.porta ? casa : f.meta.cibo ?? formicai[f.meta.formicaio]!;
        let virata = differenza(Math.atan2(meta.y - f.y, meta.x - f.x), f.a) * 1.4;
        // Chi cerca cibo segue la scia di casa: tre sensori davanti, a sinistra e a destra
        if (!f.porta && f.meta.cibo) {
          const senti = (da: number) => { const i = indice(f.x + Math.cos(f.a + da) * 18, f.y + Math.sin(f.a + da) * 18); return i < 0 ? 0 : casa.scia[i]!; };
          const sx = senti(-0.6), c = senti(0), dx = senti(0.6);
          if (sx > c && sx > dx) virata -= 2; else if (dx > c && dx > sx) virata += 2;
        }
        f.a += (virata + (r() - 0.5) * 6) * dt;
        f.x += Math.cos(f.a) * f.vel * dt;
        f.y += Math.sin(f.a) * f.vel * dt;
        // Bordi: torna verso il centro
        if (f.x < 4 || f.x > dim.w - 4 || f.y < 4 || f.y > dim.h - 4) f.a = Math.atan2(dim.h / 2 - f.y, dim.w / 2 - f.x);

        // La scia: forte quando porta cibo, leggera quando va da un formicaio all'altro
        const i = indice(f.x, f.y);
        if (i >= 0 && f.porta) casa.scia[i] = Math.min(1.2, casa.scia[i]! + (f.porta === MARRONE ? 0.35 : 0.12));

        if (f.porta) {
          if (Math.hypot(casa.x - f.x, casa.y - f.y) < CELLA * 2) { f.porta = null; scegli(f); f.a += Math.PI; }
        } else if (Math.hypot(meta.x - f.x, meta.y - f.y) < CELLA * 1.5) {
          const c = f.meta.cibo;
          if (c) {
            if (cibo.includes(c)) { c.quanto--; if (c.quanto <= 0) cibo.splice(cibo.indexOf(c), 1); f.porta = MARRONE; }
            else scegli(f);
          } else f.porta = formicai[f.meta.formicaio]!.colore;
          f.a += Math.PI;
        }
      }
      // La formica: tre puntini lungo la direzione (addome, torace, testa) e quello che porta davanti
      const cx = Math.cos(f.a), sy = Math.sin(f.a), passo = Math.sin(ora * 0.02 + f.x) * 0.6;
      ctx.fillStyle = casa.colore;
      ctx.fillRect(Math.round(f.x - cx * 4) - 2, Math.round(f.y - sy * 4 + passo) - 2, 4, 4);
      ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
      ctx.fillRect(Math.round(f.x + cx * 3) - 1, Math.round(f.y + sy * 3) - 1, 3, 3);
      if (f.porta) { ctx.fillStyle = f.porta; ctx.fillRect(Math.round(f.x + cx * 7) - 2, Math.round(f.y + sy * 7) - 2, 4, 4); }
    }
  });
  return s;
}
