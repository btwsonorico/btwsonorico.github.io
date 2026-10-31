// Pesci a pixel per la pagina About: un canvas a tutto schermo diviso in celle quadrate.
// Ogni pesce è disegnato cella per cella: corpo a goccia, coda che batte, macchie del colore della sezione.
// I pesci vagano piano, girano lontano dai bordi e si allontanano dal puntatore.

type Pesce = {
  x: number; y: number; dir: number; vel: number; giro: number;
  lungo: number; largo: number; colore: string; macchie: number; fase: number; profondo: number;
};

const CELLA = 7;

export function monta(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const css = (nome: string) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Colori: le tre sezioni del sito, più bianco e grigio per il corpo
  const COLORI = ['#3fb950', '#ffa45e', '#58a6ff'];
  const bianco = css('--fg') || '#d9dde3', grigio = css('--muted') || '#7a828d', linea = css('--line') || '#1c2026';

  let w = 0, h = 0, colonne = 0, righe = 0;
  const ridimensiona = () => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    colonne = Math.ceil(w / CELLA); righe = Math.ceil(h / CELLA);
  };
  ridimensiona();
  new ResizeObserver(ridimensiona).observe(canvas);

  // Numeri casuali ripetibili: i pesci partono sempre dagli stessi posti
  let seme = 3;
  const r = () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
  const quanti = w < 640 ? 6 : 10;
  const pesci: Pesce[] = Array.from({ length: quanti }, (_, k) => ({
    x: r() * w, y: r() * h, dir: r() * Math.PI * 2, vel: 22 + r() * 18, giro: 0,
    lungo: (16 + Math.floor(r() * 8)) * CELLA, largo: (7 + Math.floor(r() * 3)) * CELLA,
    colore: COLORI[k % COLORI.length]!, macchie: r() * 10, fase: r() * 10, profondo: r(),
  }));

  const mouse = { x: -1e4, y: -1e4 };
  window.addEventListener('pointermove', e => { const b = canvas.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; });
  window.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });

  // Il pesce occupa questa cella? Restituisce il colore, o null. (u, v): coordinate nel sistema del pesce,
  // u lungo il corpo (muso a +L/2), v di lato.
  function cella(p: Pesce, u: number, v: number, coda: number): string | null {
    const L = p.lungo, W = p.largo;
    // Corpo a goccia: largo davanti, stretto verso la coda
    const t = (u + L / 2) / L; // 0 coda, 1 muso
    if (t >= 0 && t <= 1) {
      // Mezza larghezza: cresce dalla coda fino a due terzi del corpo, poi si arrotonda verso il muso
      const meta = W * 0.5 * (t < 0.65 ? 0.3 + (t / 0.65) * 0.7 : Math.sqrt(Math.max(0, 1 - ((t - 0.65) / 0.35) ** 2)));
      if (Math.abs(v) <= meta) {
        if (t > 0.86 && Math.abs(v) > meta * 0.3 && Math.abs(v) < meta * 0.75) return linea; // occhi
        // Macchie del colore della sezione, come le carpe koi; il resto bianco, bordi grigi
        const macchia = Math.sin(u * 0.09 + p.macchie) + Math.cos(v * 0.25 + p.macchie * 2) > 0.6;
        if (Math.abs(v) > meta - CELLA * 0.9) return grigio;
        return macchia ? p.colore : bianco;
      }
    }
    // Coda: un ventaglio dietro il corpo che oscilla di lato
    const uc = u + L / 2;
    if (uc < 0 && uc > -L * 0.32) {
      const centro = coda * (-uc) * 0.9;
      const apertura = (-uc) * 0.75 + CELLA * 0.3;
      if (Math.abs(v - centro) <= apertura * 0.5) return p.colore;
    }
    // Pinne laterali
    if (t > 0.55 && t < 0.68 && Math.abs(v) > W * 0.45 && Math.abs(v) < W * 0.85) return grigio;
    return null;
  }

  let prima = performance.now();
  function disegna(ora: number) {
    const dt = Math.min(0.05, (ora - prima) / 1000);
    prima = ora;
    ctx.clearRect(0, 0, w, h);

    for (const p of pesci) {
      if (!ridotto) {
        // Vagare: la direzione cambia piano; vicino ai bordi gira verso il centro; scappa dal puntatore
        p.giro += (Math.sin(ora * 0.0004 + p.fase) * 0.6 - p.giro) * dt;
        let dir = p.dir + p.giro * dt;
        const margine = 60;
        if (p.x < margine || p.x > w - margine || p.y < margine || p.y > h - margine) {
          const verso = Math.atan2(h / 2 - p.y, w / 2 - p.x);
          dir += Math.sin(verso - dir) * dt * 1.6;
        }
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        const paura = d < 140 ? (1 - d / 140) : 0;
        if (paura > 0) dir += Math.sin(Math.atan2(dy, dx) - dir) * dt * 6 * paura;
        p.dir = dir;
        const vel = p.vel * (1 + paura * 2.5);
        p.x += Math.cos(dir) * vel * dt;
        p.y += Math.sin(dir) * vel * dt;
        p.fase += dt * (4 + paura * 10);
      }
      const coda = Math.sin(p.fase) * 0.45;
      // Disegna cella per cella nel riquadro che contiene il pesce
      const raggio = p.lungo * 0.85;
      const c0 = Math.max(0, Math.floor((p.x - raggio) / CELLA)), c1 = Math.min(colonne, Math.ceil((p.x + raggio) / CELLA));
      const r0 = Math.max(0, Math.floor((p.y - raggio) / CELLA)), r1 = Math.min(righe, Math.ceil((p.y + raggio) / CELLA));
      const cos = Math.cos(-p.dir), sin = Math.sin(-p.dir);
      // I pesci più profondi sono più tenui
      ctx.globalAlpha = 0.55 + (1 - p.profondo) * 0.45;
      for (let cx = c0; cx < c1; cx++) for (let cy = r0; cy < r1; cy++) {
        const x = cx * CELLA + CELLA / 2 - p.x, y = cy * CELLA + CELLA / 2 - p.y;
        const colore = cella(p, x * cos - y * sin, x * sin + y * cos, coda);
        if (!colore) continue;
        ctx.fillStyle = colore;
        ctx.fillRect(cx * CELLA + 0.5, cy * CELLA + 0.5, CELLA - 1, CELLA - 1);
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(disegna);
  }
  requestAnimationFrame(disegna);
}
