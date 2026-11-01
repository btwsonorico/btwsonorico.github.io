// Acquario a pixel visto di lato, a tutto schermo: lo schermo stesso è l'acquario, senza vasca né fondo.
// Un clic (o un tocco) nell'acqua fa cadere del cibo: affonda piano, i pesci lo raggiungono e lo mangiano.
// Ogni pesce è disegnato a celle quadrate, come il font del sito, su una griglia che si muove con lui:
// così scorre fluido invece di saltare di cella in cella. Il corpo ondeggia e i colori sfumano a gradini.
// Opzione koi: carpe koi (più lunghe, con i baffi). Opzione zone: ogni pesce ha le macchie del colore
// di una sezione del sito e porta il suo nome; un clic sul pesce apre la sezione.

const CELLA = 8;

export type Zona = { nome: string; href: string; colore: string };
type Rgb = [number, number, number];
type Pesce = {
  x: number; y: number; vx: number; vy: number; verso: number; inclina: number;
  dir: number; vel: number; quota: number; prossimaQuota: number;
  lungo: number; alto: number; macchie: number; fase: number; pieno: number;
  tavolozza: string[][]; bordo: string; pinna: string; scuro: string | null;
  zona: Zona | null; ex: number; ey: number;
};
type Briciola = { x: number; y: number; vy: number; deriva: number; a_terra: number; colore: string };
type Bolla = { x: number; y: number; vel: number; dim: number };

const daHex = (hex: string, riserva: Rgb): Rgb => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return riserva;
  const s = m[1]!.length === 3 ? m[1]!.replace(/./g, c => c + c) : m[1]!;
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)) as Rgb;
};
const mescola = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map(i => Math.round(a[i]! + (b[i]! - a[i]!) * t)) as Rgb;
const rgb = (c: Rgb) => `rgb(${c[0]},${c[1]},${c[2]})`;

export function monta(canvas: HTMLCanvasElement, contatore?: HTMLElement | null, { koi = false, zone = [] as Zona[] } = {}) {
  const ctx = canvas.getContext('2d')!;
  const css = (nome: string) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORI = koi ? ['#ff7a2f', '#e8452c', '#f2b134', '#ff7a2f'] : [css('--verde') || '#3fb950', css('--arancio') || '#ffa45e', css('--azzurro') || '#58a6ff'];
  const bianco = daHex(css('--fg'), [217, 221, 227]), grigio = daHex(css('--muted'), [122, 130, 141]);
  const sfondo = css('--bg') || '#0d1117', occhio = css('--line') || '#1c2026';
  const SCURO: Rgb = [58, 63, 70];

  let seme = 9;
  const r = () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };

  let w = 0, h = 0, superficie = 0, fondo = 0;
  const ridimensiona = () => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    superficie = CELLA; fondo = h - CELLA * 2;
  };
  ridimensiona();
  new ResizeObserver(ridimensiona).observe(canvas);

  // Tavolozza del pesce: 3 ombre (dorso chiaro, fianco, ventre scuro) × 5 gradini dal bianco al colore della macchia
  const tavolozza = (macchia: Rgb) => [0.14, 0, -0.16].map(ombra => [0, 1, 2, 3, 4].map(l => {
    const c = mescola(bianco, macchia, l / 4);
    return rgb(ombra > 0 ? mescola(c, [255, 255, 255], ombra) : mescola(c, [13, 17, 23], -ombra));
  }));

  const quanti = zone.length ? (w < 640 ? zone.length : zone.length * 2) : (w < 640 ? 5 : 9);
  const pesci: Pesce[] = Array.from({ length: quanti }, (_, k) => {
    const zona = zone.length ? zone[k % zone.length]! : null;
    const macchia = daHex(zona ? zona.colore : COLORI[k % COLORI.length]!, [255, 164, 94]);
    const y = superficie + 40 + r() * (fondo - superficie - 80);
    const dir = r() < 0.5 ? -1 : 1, vel = 18 + r() * 14;
    return {
      x: ((k + 0.3 + r() * 0.4) / quanti) * w, y, vx: dir * vel, vy: 0, verso: dir, inclina: 0,
      dir, vel, quota: y, prossimaQuota: 0,
      lungo: (koi ? 15 + Math.floor(r() * 6) : 10 + Math.floor(r() * 6)) * CELLA,
      alto: (koi ? 5 + Math.floor(r() * 2) : 5 + Math.floor(r() * 3)) * CELLA,
      macchie: r() * 10, fase: r() * 10, pieno: 0,
      tavolozza: tavolozza(macchia), bordo: rgb(mescola(grigio, macchia, 0.3)), pinna: rgb(macchia),
      scuro: koi && k % 4 === 1 ? rgb(SCURO) : null,
      zona, ex: 0, ey: 0,
    };
  });
  pesci.forEach(p => { p.ex = p.x; p.ey = p.y - p.alto * 0.5 - 18; });

  const briciole: Briciola[] = [];
  const bolle: Bolla[] = [];
  let mangiate = 0;

  // Il pesce (o il suo nome) sotto il puntatore, solo per i pesci con una zona
  const FONT = '11px "Departure Mono", ui-monospace, monospace';
  const sotto = (x: number, y: number): Pesce | null => {
    ctx.font = FONT;
    for (const p of pesci) {
      if (!p.zona) continue;
      const mezzo = ctx.measureText(p.zona.nome).width / 2 + 8;
      if (Math.abs(x - p.ex) < mezzo && Math.abs(y - p.ey) < 11) return p;
      if (Math.abs(x - p.x) < p.lungo * 0.55 && Math.abs(y - p.y) < p.alto * 0.65) return p;
    }
    return null;
  };
  let evidenziato: Pesce | null = null;
  const posizione = (e: PointerEvent) => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] as const; };
  canvas.addEventListener('pointermove', e => {
    const [x, y] = posizione(e);
    evidenziato = sotto(x, y);
    canvas.style.cursor = evidenziato ? 'pointer' : '';
  });
  canvas.addEventListener('pointerleave', () => { evidenziato = null; });

  // Clic su un pesce con una zona: apre la sezione. Altrove: cadono quattro o cinque briciole intorno al punto
  canvas.addEventListener('pointerdown', e => {
    const [x0, y0] = posizione(e);
    const p = sotto(x0, y0);
    if (p?.zona) { location.href = p.zona.href; return; }
    const y = Math.max(superficie, Math.min(y0, fondo - CELLA * 2));
    const n = 4 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) briciole.push({
      x: x0 + (r() - 0.5) * 40, y: y - r() * 10, vy: 16 + r() * 12, deriva: r() * 6, a_terra: 0,
      colore: r() < 0.5 ? '#ffa45e' : '#c98545',
    });
    if (briciole.length > 60) briciole.splice(0, briciole.length - 60);
  });

  // Colore della cella (u lungo il corpo, verso il muso; v in alto), o null se la cella è vuota.
  // onda: quanto la coda è spostata in su o in giù; alfa: trasparenza di pinne e coda.
  let alfa = 1;
  function cella(p: Pesce, u: number, v: number, onda: number, coda: number): string | null {
    const L = p.lungo, H = p.alto;
    const t = (u + L / 2) / L; // 0 coda, 1 muso
    alfa = 1;
    if (t >= 0 && t <= 1) {
      // Il corpo ondeggia: fermo vicino alla testa, sempre di più verso la coda
      const vv = v - onda * (1 - t) ** 2;
      const meta = H * 0.5 * (t < 0.6 ? 0.35 + (t / 0.6) * 0.65 : Math.sqrt(Math.max(0, 1 - ((t - 0.6) / 0.4) ** 2)));
      if (Math.abs(vv) <= meta) {
        if (t > 0.78 && t < 0.86 && vv > meta * 0.1 && vv < meta * 0.55) return occhio;
        if (Math.abs(vv) > meta - CELLA * 0.9) return p.bordo;
        const f = Math.sin(u * 0.08 + p.macchie) + Math.cos(vv * 0.2 + p.macchie * 2);
        // Seconda serie di macchie, scure, solo per alcune koi, dove non c'è colore
        if (p.scuro && f < 0.3 && Math.sin(u * 0.13 + p.macchie * 3) + Math.sin(vv * 0.35 + p.macchie) > 1.1) return p.scuro;
        const ombra = vv > meta * 0.35 ? 0 : vv < -meta * 0.35 ? 2 : 1;
        const livello = Math.round(Math.max(0, Math.min(1, (f - 0.1) / 0.8)) * 4);
        return p.tavolozza[ombra]![livello]!;
      }
      // Pinna dorsale sopra il corpo, pinna anale sotto, un po' trasparenti
      if (t > 0.35 && t < 0.6 && vv > meta && vv < meta + CELLA * 2 * (1 - Math.abs(t - 0.45) * 4)) { alfa = 0.85; return p.pinna; }
      if (t > 0.3 && t < 0.42 && vv < -meta && vv > -meta - CELLA * 1.5) { alfa = 0.6; return p.pinna; }
    }
    // Koi: due baffi corti sotto il muso
    if (koi && u > L / 2 - CELLA * 0.5 && u < L / 2 + CELLA * 1.2 && v < -CELLA * 0.2 && v > -CELLA * 1.6) return p.bordo;
    // Coda a ventaglio: segue l'onda del corpo e sfuma verso la punta
    const uc = -(u + L / 2);
    if (uc > 0 && uc < L * 0.24) {
      const centro = onda + coda * uc * 0.6;
      if (Math.abs(v - centro) <= uc * 0.6 + CELLA * 0.4) { alfa = 0.95 - (uc / (L * 0.24)) * 0.4; return p.pinna; }
    }
    return null;
  }

  const quadrato = (x: number, y: number, colore: string) => {
    ctx.fillStyle = colore;
    ctx.fillRect(Math.round(x) + 0.5, Math.round(y) + 0.5, CELLA - 1, CELLA - 1);
  };
  const avvicina = (da: number, a: number, k: number) => da + (a - da) * Math.min(1, k);

  let prima = performance.now(), prossimaBolla = 0;
  function disegna(ora: number) {
    const dt = ridotto ? 0 : Math.min(0.05, (ora - prima) / 1000);
    prima = ora;
    ctx.clearRect(0, 0, w, h);

    // Bolle: poche, salgono dal basso in punti a caso
    if (dt > 0 && ora > prossimaBolla) {
      bolle.push({ x: r() * w, y: h, vel: 30 + r() * 30, dim: r() < 0.3 ? 2 : 1 });
      prossimaBolla = ora + 900 + r() * 1500;
    }
    for (let k = bolle.length - 1; k >= 0; k--) {
      const b = bolle[k]!;
      b.y -= b.vel * dt;
      b.x += Math.sin(ora * 0.003 + k) * 0.25;
      if (b.y < superficie) { bolle.splice(k, 1); continue; }
      ctx.globalAlpha = 0.5 * Math.min(1, (b.y - superficie) / 60);
      const c = rgb(bianco);
      quadrato(b.x, b.y, c);
      if (b.dim === 2) { quadrato(b.x + CELLA, b.y, c); quadrato(b.x, b.y - CELLA, c); quadrato(b.x + CELLA, b.y - CELLA, c); }
    }
    ctx.globalAlpha = 1;

    // Cibo: affonda ondeggiando, poi resta in fondo allo schermo per qualche secondo e svanisce
    for (let k = briciole.length - 1; k >= 0; k--) {
      const b = briciole[k]!;
      if (b.y < fondo) { b.y += b.vy * dt; b.x += Math.sin(ora * 0.003 + b.deriva) * 0.25; }
      else { b.a_terra += dt; if (b.a_terra > 8) { briciole.splice(k, 1); continue; } }
      ctx.globalAlpha = Math.min(1, (8 - b.a_terra) / 1.5);
      quadrato(b.x, b.y, b.colore);
    }
    ctx.globalAlpha = 1;

    for (const p of pesci) {
      if (dt > 0) {
        // La briciola più vicina, se c'è: il pesce ci va più veloce
        let meta: Briciola | null = null, migliore = 1e9;
        for (const b of briciole) { const d = Math.hypot(b.x - p.x, b.y - p.y); if (d < migliore) { migliore = d; meta = b; } }
        if (meta) {
          const dx = meta.x - p.x, dy = meta.y - p.y, d = Math.max(1, Math.hypot(dx, dy));
          const vel = 65 + (1 - p.pieno) * 25;
          p.vx = avvicina(p.vx, dx / d * vel, dt * 1.6);
          p.vy = avvicina(p.vy, dy / d * vel, dt * 1.6);
          if (Math.abs(p.vx) > 5) p.dir = Math.sign(p.vx);
          // Mangia: la briciola sparisce, il pesce fa un piccolo guizzo verso l'alto
          if (d < p.lungo * 0.4) {
            briciole.splice(briciole.indexOf(meta), 1);
            mangiate++;
            p.pieno = Math.min(1, p.pieno + 0.25);
            p.vy -= 18;
            if (contatore) contatore.textContent = String(mangiate);
          }
        } else {
          // Senza cibo: nuota piano nel suo verso e cambia quota ogni tanto, senza scatti
          if (ora > p.prossimaQuota) {
            p.quota = superficie + p.alto + r() * (fondo - superficie - p.alto * 2);
            p.prossimaQuota = ora + 5000 + r() * 7000;
          }
          if (r() < dt * 0.02) p.dir = -p.dir;
          p.vx = avvicina(p.vx, p.dir * p.vel, dt * 0.5);
          p.vy = avvicina(p.vy, Math.max(-10, Math.min(10, (p.quota - p.y) * 0.2)), dt * 0.6);
        }
        p.pieno = Math.max(0, p.pieno - dt * 0.02);
        // Vicino ai bordi il pesce decide di girarsi; la virata è morbida perché la velocità cambia piano
        const margine = p.lungo * 0.7;
        if (p.x < margine) p.dir = 1;
        if (p.x > w - margine) p.dir = -1;
        if (!meta) {
          if (p.x < margine * 0.5 && p.vx < 0) p.vx = avvicina(p.vx, 0, dt * 3);
          if (p.x > w - margine * 0.5 && p.vx > 0) p.vx = avvicina(p.vx, 0, dt * 3);
        }
        if (p.y < superficie + p.alto) p.vy += (superficie + p.alto - p.y) * dt * 2;
        if (p.y > fondo - p.alto) p.vy -= (p.y - fondo + p.alto) * dt * 2;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Il verso (destra o sinistra) cambia piano: il pesce si gira su se stesso invece di scattare
        const verso = Math.abs(p.vx) > 4 ? Math.sign(p.vx) : Math.sign(p.verso || 1);
        p.verso = avvicina(p.verso, verso, dt * 3);
        p.inclina = avvicina(p.inclina, Math.max(-0.35, Math.min(0.35, Math.atan2(p.vy, Math.abs(p.vx) + 8))), dt * 3);
        p.fase += dt * (3 + Math.hypot(p.vx, p.vy) * 0.07);
      }
      const forza = 0.6 + Math.min(1, Math.hypot(p.vx, p.vy) / 60) * 0.6;
      const onda = Math.sin(p.fase) * CELLA * 0.8 * forza, coda = Math.sin(p.fase - 0.9) * 0.45;
      const cos = Math.cos(p.inclina), sin = Math.sin(p.inclina);
      // Mentre si gira, il pesce si stringe in larghezza (come se ruotasse su se stesso)
      const girata = Math.max(0.15, Math.abs(p.verso));
      const lato = p.verso >= 0 ? 1 : -1;
      const ox = Math.round(p.x), oy = Math.round(p.y), n = Math.ceil((p.lungo * 0.85) / CELLA);
      for (let i = -n; i <= n; i++) {
        const sx = ox + i * CELLA;
        if (sx < -CELLA || sx > w + CELLA) continue;
        for (let j = -n; j <= n; j++) {
          const sy = oy + j * CELLA;
          if (sy < -CELLA || sy > h + CELLA) continue;
          const x = (i * CELLA) * lato / girata, y = -(j * CELLA);
          const u = x * cos + y * sin * lato, v = -x * sin * lato + y * cos;
          const colore = cella(p, u, v, onda, coda);
          if (!colore) continue;
          ctx.globalAlpha = alfa;
          ctx.fillStyle = colore;
          ctx.fillRect(sx - CELLA / 2 + 0.5, sy - CELLA / 2 + 0.5, CELLA - 1, CELLA - 1);
        }
      }
      ctx.globalAlpha = 1;

      // Nome della zona sopra il pesce: lo segue con un piccolo ritardo
      if (p.zona) {
        p.ex = dt > 0 ? avvicina(p.ex, p.x, dt * 4) : p.x;
        p.ey = dt > 0 ? avvicina(p.ey, p.y - p.alto * 0.5 - 18, dt * 4) : p.y - p.alto * 0.5 - 18;
        const acceso = evidenziato === p;
        ctx.font = FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = sfondo;
        ctx.shadowBlur = 6;
        ctx.globalAlpha = acceso ? 1 : 0.8;
        ctx.fillStyle = p.zona.colore;
        ctx.fillText(acceso ? `${p.zona.nome} →` : p.zona.nome, Math.round(p.ex), Math.round(p.ey));
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }
    requestAnimationFrame(disegna);
  }
  requestAnimationFrame(disegna);
}
