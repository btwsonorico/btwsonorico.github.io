// La timeline dell'AI vista di lato: una barca da pesca cartoon su un mare scuro e mosso, di notte. Ogni evento è una boa
// sull'acqua; scorrendo la pagina la barca va avanti e indietro da una boa all'altra. Il cielo cambia con l'era; negli
// inverni dell'AI nevica. Dal comignolo esce fumo, sull'albero c'è una lanterna che si riflette sull'acqua.
// Il disegno è su un canvas 2D; la scheda dell'evento e i filtri sono HTML (vedi src/pages/learn/ai-terms.astro).

export type Evento = { title: string; year: number; month?: number; kind: 'research' | 'system' | 'company' | 'society'; who: string; source: string; text: string };

export const COLORI_TIPO: Record<Evento['kind'], string> = { research: '#5fb6d9', system: '#f2c14e', company: '#ff9fb4', society: '#8fd6b4' };
// Le ere: anno di inizio, nome, colore del cielo in alto e all'orizzonte, neve
export const ERE = [
  { da: 1940, nome: 'Beginnings', alto: '#0b1426', basso: '#1b2a45', neve: false },
  { da: 1956, nome: 'Symbolic AI', alto: '#0d1428', basso: '#232a4f', neve: false },
  { da: 1974, nome: 'First AI winter', alto: '#121820', basso: '#2a3540', neve: true },
  { da: 1980, nome: 'Expert systems', alto: '#140f26', basso: '#2e2546', neve: false },
  { da: 1987, nome: 'Second AI winter', alto: '#121820', basso: '#2a3540', neve: true },
  { da: 1993, nome: 'Machine learning', alto: '#0a1a24', basso: '#173a48', neve: false },
  { da: 2012, nome: 'Deep learning', alto: '#0a1622', basso: '#1b3550', neve: false },
  { da: 2022, nome: 'Generative AI', alto: '#120c22', basso: '#3a2350', neve: false },
] as const;
export const eraDi = (anno: number) => { let i = 0; while (i < ERE.length - 1 && ERE[i + 1]!.da <= anno) i++; return i; };

const mix = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i]! - v) * k)).join(',')})`;
};

export function monta(cv: HTMLCanvasElement, o: { indice: () => number; eventi: () => Evento[]; boaX: () => number }) {
  const cx = cv.getContext('2d')!;
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1;
  const misura = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  };
  misura();
  new ResizeObserver(misura).observe(cv);
  const MONO = getComputedStyle(document.documentElement).getPropertyValue('--mono').trim() || 'ui-monospace, monospace';

  // Stelle fisse, fiocchi di neve, fumo
  let seme = 7;
  const r = () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
  const stelle = Array.from({ length: 140 }, () => ({ x: r(), y: r() * 0.55, s: 0.6 + r() * 1.2, f: r() * 6 }));
  const fiocchi = Array.from({ length: 160 }, () => ({ x: r(), y: r(), v: 0.03 + r() * 0.05, s: 1 + r() * 1.8, f: r() * 6 }));
  const fumo: { x: number; y: number; vx: number; vy: number; vita: number; s: number }[] = [];
  let neve = 0, eraVista = 0, eraPrima = 0, cambio = 1, camera = 0, velocita = 0, ultimo = performance.now(), tempo = 0, fumoT = 0;

  const SP = () => Math.max(260, Math.min(W * 0.42, 520));
  // Le onde: tre strati, dal fondo al davanti. Ogni strato ha il suo livello, ampiezza e velocità
  // Su telefono la scheda sta in basso: il mare sale
  const MARE = () => H * (W < 760 ? 0.44 : 0.64);
  const STRATI = [
    { y: -26, a: 0.7, par: 0.55, col: '#0b2233' },
    { y: 0, a: 1, par: 1, col: '#0e2c42' },
    { y: 30, a: 1.25, par: 1.35, col: '#113752' },
  ];
  const ampiezza = () => (fermo ? 0.35 : 1) * Math.min(1, H / 700) * 15;
  const onda = (xw: number, k: number, t: number) => {
    const A = ampiezza() * STRATI[k]!.a;
    return MARE() + STRATI[k]!.y + A * Math.sin(xw * 0.012 + t * 1.3 + k) + A * 0.55 * Math.sin(xw * 0.029 - t * 1.9 + k * 2.1) + A * 0.3 * Math.sin(xw * 0.061 + t * 2.7);
  };

  const disegnaBarca = (x: number, y: number, ang: number, t: number) => {
    cx.save();
    cx.translate(x, y);
    cx.rotate(ang);
    const k = Math.max(0.7, Math.min(1.25, W / 1100));
    cx.scale(k, k);
    cx.lineJoin = 'round'; cx.lineCap = 'round'; cx.lineWidth = 2.5; cx.strokeStyle = '#140f0c';
    // La canna da pesca a poppa, con la lenza che scende in acqua
    cx.beginPath(); cx.moveTo(-46, -12); cx.lineTo(-92, -58); cx.stroke();
    cx.lineWidth = 1; cx.strokeStyle = 'rgba(230,226,215,.7)';
    cx.beginPath(); cx.moveTo(-92, -58); cx.quadraticCurveTo(-100, -20, -104 + Math.sin(t * 1.3) * 3, 26); cx.stroke();
    cx.lineWidth = 2.5; cx.strokeStyle = '#140f0c';
    // L'albero con la lanterna
    cx.beginPath(); cx.moveTo(14, -16); cx.lineTo(14, -86); cx.stroke();
    cx.beginPath(); cx.moveTo(14, -78); cx.lineTo(48, -30); cx.stroke();
    // La cabina con la finestra accesa
    cx.fillStyle = '#f1ece0';
    cx.beginPath(); cx.roundRect(-34, -48, 40, 34, 5); cx.fill(); cx.stroke();
    cx.fillStyle = '#e85d4a';
    cx.beginPath(); cx.moveTo(-40, -46); cx.lineTo(12, -46); cx.lineTo(8, -56); cx.lineTo(-36, -56); cx.closePath(); cx.fill(); cx.stroke();
    cx.fillStyle = '#ffd56a';
    cx.beginPath(); cx.roundRect(-26, -40, 13, 12, 3); cx.fill(); cx.stroke();
    // Il comignolo
    cx.fillStyle = '#3e6795';
    cx.beginPath(); cx.roundRect(-22, -72, 10, 18, 2); cx.fill(); cx.stroke();
    cx.fillStyle = '#2b2420'; cx.fillRect(-23, -74, 12, 4);
    // Lo scafo: rosso, con la riga bianca e la prua alta
    cx.fillStyle = '#d9483b';
    cx.beginPath();
    cx.moveTo(-58, -16); cx.lineTo(56, -16); cx.quadraticCurveTo(66, -18, 70, -30); cx.quadraticCurveTo(64, 2, 44, 14);
    cx.lineTo(-40, 14); cx.quadraticCurveTo(-56, 10, -58, -16); cx.closePath(); cx.fill(); cx.stroke();
    cx.strokeStyle = '#f1ece0'; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(-54, -6); cx.lineTo(60, -6); cx.stroke();
    cx.strokeStyle = '#140f0c'; cx.lineWidth = 2.5;
    // Gli oblò
    cx.fillStyle = '#ffd56a';
    for (const ox of [-20, 4, 28]) { cx.beginPath(); cx.arc(ox, 4, 3.2, 0, Math.PI * 2); cx.fill(); cx.stroke(); }
    // La lanterna: luce che tremola, con l'alone
    const tremola = 0.85 + Math.sin(t * 7) * 0.06 + Math.sin(t * 13.3) * 0.05;
    const alone = cx.createRadialGradient(14, -88, 1, 14, -88, 46 * tremola);
    alone.addColorStop(0, 'rgba(255,214,110,.55)'); alone.addColorStop(1, 'rgba(255,214,110,0)');
    cx.fillStyle = alone; cx.beginPath(); cx.arc(14, -88, 46, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#ffd56a'; cx.beginPath(); cx.roundRect(9, -96, 10, 12, 2); cx.fill(); cx.stroke();
    cx.restore();
    return { camino: { x: x + (-17 * Math.cos(ang) - -74 * Math.sin(ang)) * k, y: y + (-17 * Math.sin(ang) + -74 * Math.cos(ang)) * k }, k };
  };

  function frame(ora: number) {
    const dt = Math.min(0.05, (ora - ultimo) / 1000);
    ultimo = ora;
    tempo += dt;
    const t = tempo;
    const eventi = o.eventi(), sp = SP();
    // La camera insegue l'indice della pagina; la barca si inclina in avanti quando va veloce
    const meta = o.indice() * sp, prima = camera;
    camera += (meta - camera) * Math.min(1, dt * 4);
    velocita += ((camera - prima) / Math.max(dt, 1e-3) - velocita) * Math.min(1, dt * 5);
    const bx = o.boaX() * W;
    const anno = (() => {
      if (!eventi.length) return 2000;
      const f = Math.max(0, Math.min(eventi.length - 1, camera / sp)), i = Math.floor(f), j = Math.min(eventi.length - 1, i + 1);
      return eventi[i]!.year + (eventi[j]!.year - eventi[i]!.year) * (f - i);
    })();
    const era = eraDi(anno);
    if (era !== eraVista) { eraPrima = eraVista; eraVista = era; cambio = 0; }
    cambio = Math.min(1, cambio + dt / 1.2);
    neve += ((ERE[era]!.neve ? 1 : 0) - neve) * Math.min(1, dt * 1.5);

    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Il cielo, con il passaggio piano da un'era all'altra
    const a = ERE[eraPrima]!, b = ERE[eraVista]!, cielo = cx.createLinearGradient(0, 0, 0, MARE());
    cielo.addColorStop(0, mix(a.alto, b.alto, cambio)); cielo.addColorStop(1, mix(a.basso, b.basso, cambio));
    cx.fillStyle = cielo; cx.fillRect(0, 0, W, H);
    // Stelle che brillano piano, e la luna
    for (const s of stelle) {
      cx.globalAlpha = (0.35 + 0.35 * Math.sin(t * 1.2 + s.f)) * (1 - neve * 0.7);
      cx.fillStyle = '#f4f1ea'; cx.fillRect(((s.x * W - camera * 0.03) % W + W) % W, s.y * MARE(), s.s, s.s);
    }
    cx.globalAlpha = 1 - neve * 0.6;
    cx.fillStyle = '#efe8d6'; cx.beginPath(); cx.arc(W * 0.8, H * 0.16, 22, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = mix(a.alto, b.alto, cambio); cx.beginPath(); cx.arc(W * 0.8 + 9, H * 0.16 - 5, 19, 0, Math.PI * 2); cx.fill();
    cx.globalAlpha = 1;
    // Il nome dell'era, grande e tenue nel cielo
    cx.font = `${Math.round(Math.min(64, W * 0.06))}px ${MONO}`;
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillStyle = `rgba(244,241,234,${0.14 * cambio})`; cx.fillText(b.nome.toUpperCase(), W / 2, MARE() * 0.42);
    if (cambio < 1) { cx.fillStyle = `rgba(244,241,234,${0.14 * (1 - cambio)})`; cx.fillText(a.nome.toUpperCase(), W / 2, MARE() * 0.42); }

    // Il riflesso della lanterna sull'acqua
    const riflesso = cx.createRadialGradient(bx, MARE() + 8, 2, bx, MARE() + 8, 120);
    riflesso.addColorStop(0, 'rgba(255,214,110,.16)'); riflesso.addColorStop(1, 'rgba(255,214,110,0)');

    // Gli strati di mare, dal fondo; le boe e la barca stanno sullo strato di mezzo
    const strato = (k: number) => {
      const S = STRATI[k]!;
      cx.fillStyle = S.col;
      cx.beginPath(); cx.moveTo(0, H);
      for (let x = 0; x <= W + 8; x += 8) cx.lineTo(x, onda(x + camera * S.par, k, t));
      cx.lineTo(W, H); cx.closePath(); cx.fill();
      // Le creste: puntini di schiuma sulle cime delle onde
      cx.fillStyle = 'rgba(220,235,245,.35)';
      for (let x = ((-camera * S.par) % 14 + 14) % 14; x <= W; x += 14) {
        const y = onda(x + camera * S.par, k, t), y2 = onda(x + 3 + camera * S.par, k, t);
        if (y < onda(x + camera * S.par - 20, k, t) && y < y2 + 0.5) cx.fillRect(x, y - 1, 2, 2);
      }
    };
    strato(0);
    cx.fillStyle = riflesso; cx.fillRect(bx - 120, MARE() - 20, 240, 160);

    // Le boe degli eventi, sullo strato di mezzo
    eventi.forEach((e, i) => {
      // La boa sta un po' davanti alla prua: la barca si ferma accanto, non sopra
      const x = bx + 105 * Math.max(0.7, Math.min(1.25, W / 1100)) + i * sp - camera;
      if (x < -80 || x > W + 80) return;
      const y = onda(x + camera, 1, t) - 4, inc = Math.atan2(onda(x + 6 + camera, 1, t) - onda(x - 6 + camera, 1, t), 12) * 0.8;
      const d = Math.abs(i - camera / sp), luce = Math.max(0, 1 - d * 1.4);
      cx.save(); cx.translate(x, y); cx.rotate(inc);
      cx.lineWidth = 2; cx.strokeStyle = '#140f0c';
      // L'asta con la bandierina e la luce in cima
      cx.beginPath(); cx.moveTo(0, -10); cx.lineTo(0, -44); cx.stroke();
      cx.fillStyle = COLORI_TIPO[e.kind];
      cx.beginPath(); cx.moveTo(0, -44); cx.lineTo(16, -38); cx.lineTo(0, -32); cx.closePath(); cx.fill(); cx.stroke();
      cx.beginPath(); cx.ellipse(0, -2, 13, 11, 0, Math.PI, 0); cx.lineTo(13, 4); cx.quadraticCurveTo(0, 10, -13, 4); cx.closePath(); cx.fill(); cx.stroke();
      cx.fillStyle = '#f1ece0'; cx.fillRect(-12, -3, 24, 4);
      if (luce > 0) {
        const g = cx.createRadialGradient(0, -46, 1, 0, -46, 26);
        g.addColorStop(0, `rgba(255,240,200,${0.6 * luce})`); g.addColorStop(1, 'rgba(255,240,200,0)');
        cx.fillStyle = g; cx.beginPath(); cx.arc(0, -46, 26, 0, Math.PI * 2); cx.fill();
      }
      cx.restore();
      // L'anno sopra la boa; il titolo solo quando la barca è vicina
      cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
      cx.font = `${Math.round(12 + luce * 4)}px ${MONO}`;
      cx.fillStyle = `rgba(244,241,234,${0.45 + luce * 0.55})`;
      cx.fillText(String(e.year), x, y - 56);
    });

    // La barca: va su e giù con l'onda di mezzo e si inclina con la pendenza, male, come su un mare grosso
    const yb = onda(bx + camera, 1, t) - 6;
    const pend = Math.atan2(onda(bx + 30 + camera, 1, t) - onda(bx - 30 + camera, 1, t), 60);
    const ang = pend * 1.35 + (fermo ? 0 : Math.sin(t * 1.7) * 0.07) - Math.max(-0.12, Math.min(0.12, velocita / 6000));
    const { camino, k } = disegnaBarca(bx, yb, ang, t);
    // La scia quando la barca si muove
    if (Math.abs(velocita) > 40) {
      cx.fillStyle = 'rgba(220,235,245,.5)';
      for (let q = 0; q < 6; q++) { const sx = bx - Math.sign(velocita) * (60 + q * 12) * k; cx.fillRect(sx, onda(sx + camera, 1, t) + Math.sin(t * 9 + q) * 2, 3, 2); }
    }
    // Il fumo: sbuffi grigi che salgono, si allargano e vanno indietro col vento
    fumoT -= dt;
    if (fumoT <= 0 && !fermo) { fumoT = 0.12; fumo.push({ x: camino.x, y: camino.y, vx: -14 - r() * 10 - velocita * 0.05, vy: -22 - r() * 8, vita: 1, s: 4 + r() * 3 }); }
    for (let i = fumo.length - 1; i >= 0; i--) {
      const f = fumo[i]!;
      f.vita -= dt / 3.2; f.x += f.vx * dt; f.y += f.vy * dt; f.s += dt * 9;
      if (f.vita <= 0) { fumo.splice(i, 1); continue; }
      cx.fillStyle = `rgba(170,170,175,${0.4 * f.vita})`;
      cx.beginPath(); cx.arc(f.x, f.y, f.s, 0, Math.PI * 2); cx.fill();
    }
    strato(2);

    // La neve negli inverni dell'AI
    if (neve > 0.02) {
      cx.fillStyle = `rgba(244,241,234,${0.8 * neve})`;
      for (const n of fiocchi) {
        n.y += n.v * dt * (fermo ? 0.3 : 1); if (n.y > 1) n.y -= 1;
        const x = ((n.x * W + Math.sin(t + n.f) * 12 - camera * 0.1) % W + W) % W;
        cx.beginPath(); cx.arc(x, n.y * H, n.s, 0, Math.PI * 2); cx.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
