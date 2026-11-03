import { abar, albero, allena, gauss, indietro, nuovoModello, pesce, T, type Modello } from '../lib/nuvola';

// Vista extra: lo stesso metodo su oggetti 3D, un pesce e un albero, che si allena nel browser. La scena gira da sola e col trascinamento.
// Training: i punti veri e le loro copie con il rumore. Inference: una nuvola si richiude nell'oggetto, e i punti vicini si collegano con un filo.
const N_DATI = 2048, N_VISTI = 500, N_NUOVI = 600, GRUPPO = 64, FINE = 10000, RALLENTA = 7000, PASSI = 20, DURATA = 3400, CAMBIO = 260, RAGGIO_FILO = 0.17, FILI_PER_PUNTO = 3, RUMORE_FILI = 0.45, GIRO_DA_SOLA = 0.004, INCLINA = 0.32;
const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function monta(radice: HTMLElement) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const scrivi = (el: Element, t: string) => { if (el.textContent !== t) el.textContent = t; };
  const FG = tono('--fg'), MUTED = tono('--muted'), LINE = tono('--line'), ARANCIO = tono('--arancio'), BLU = tono('--azzurro'), VERDE = tono('--verde');
  const tela = $<HTMLCanvasElement>('.tela-nuvola'), c = tela.getContext('2d')!, curva = $<HTMLCanvasElement>('.curva'), cc = curva.getContext('2d')!;
  const gioca = $<HTMLButtonElement>('.gioca'), azzera = $<HTMLButtonElement>('.azzera'), genera = $<HTMLButtonElement>('.genera'), letturaE = $<HTMLElement>('.errore'), lettura = $<HTMLElement>('.lettura-nuovi');
  const formeB = radice.querySelectorAll<HTMLButtonElement>('[data-oggetto]');

  let oggetto = 'fish', dati = pesce(N_DATI), m: Modello = nuovoModello(), inMoto = false, visibile = false, sporco = true, storia: number[] = [], somma = 0, conta = 0;
  let nuovi: Float32Array | null = null, sale = false, inizio = 0, k = 0, fili: number[] = [], giro = 0.5, gira = false, xPrima = 0, rumoreAdesso = 0, ultimoCambio = 0;
  const tempi = [...Array.from({ length: PASSI }, (_, q) => Math.round(T - (q * T) / PASSI)), 0];
  let copie = new Float32Array(N_VISTI * 3);
  const tinta = () => (oggetto === 'fish' ? BLU : VERDE);

  // Le copie con il rumore: ogni punto ha la sua quantità a caso, come in un passo vero di training
  function nuoveCopie() {
    for (let i = 0; i < N_VISTI; i++) {
      const t = 1 + Math.floor(Math.random() * T), a = Math.sqrt(abar[t]!), b = Math.sqrt(1 - abar[t]!);
      for (let q = 0; q < 3; q++) copie[i * 3 + q] = a * dati[i * 3 + q]! + b * gauss();
    }
  }
  // I fili: ogni punto si lega ai più vicini. Li disegna la pagina, il modello genera solo punti
  function calcolaFili() {
    fili = [];
    if (!nuovi) return;
    for (let i = 0; i < N_NUOVI; i++) {
      const vicini: [number, number][] = [];
      for (let j = i + 1; j < N_NUOVI; j++) {
        const dx = nuovi[i * 3]! - nuovi[j * 3]!, dy = nuovi[i * 3 + 1]! - nuovi[j * 3 + 1]!, dz = nuovi[i * 3 + 2]! - nuovi[j * 3 + 2]!, d = dx * dx + dy * dy + dz * dz;
        if (d < RAGGIO_FILO * RAGGIO_FILO) vicini.push([d, j]);
      }
      vicini.sort((a, b) => a[0] - b[0]);
      for (const v of vicini.slice(0, FILI_PER_PUNTO)) fili.push(i, v[1]);
    }
  }

  // --- Disegno
  let W = 0, H = 0;
  function disegna() {
    const d = devicePixelRatio, sinistra = innerWidth > 760 ? $<HTMLElement>('.pannello').offsetWidth + 16 : 0, destra = innerWidth > 760 ? 100 : 0, libero = W - sinistra - destra, S = Math.min(libero, H) / 3.2, cx = sinistra + libero / 2, cy = H / 2;
    const co = Math.cos(giro), si = Math.sin(giro), ci = Math.cos(INCLINA), se = Math.sin(INCLINA);
    // La vista: prima gira attorno all'asse verticale, poi si inclina. Il terzo numero è la distanza da chi guarda
    const P = (x: number, y: number, z: number) => {
      const X = x * co + z * si, Z = -x * si + z * co, Y = y * ci - Z * se, F = y * se + Z * ci;
      return [cx + S * X, cy - S * Y, F] as const;
    };
    const luce = (F: number) => Math.max(0.2, Math.min(1, 0.65 + F * 0.4));
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, W, H);
    // Il pavimento: un anello a filo sotto l'oggetto, per capire che gira
    c.strokeStyle = LINE;
    c.beginPath();
    for (let q = 0; q <= 48; q++) { const a = (q / 48) * Math.PI * 2, [x, y] = P(1.45 * Math.cos(a), -1.25, 1.45 * Math.sin(a)); if (q) c.lineTo(x, y); else c.moveTo(x, y); }
    c.stroke();
    if (nuovi) {
      if (fili.length) {
        c.strokeStyle = tinta();
        c.lineWidth = 0.75;
        c.globalAlpha = Math.max(0, 1 - rumoreAdesso / RUMORE_FILI) * 0.75;
        c.beginPath();
        for (let q = 0; q < fili.length; q += 2) {
          const a = fili[q]! * 3, b = fili[q + 1]! * 3, [x0, y0] = P(nuovi[a]!, nuovi[a + 1]!, nuovi[a + 2]!), [x1, y1] = P(nuovi[b]!, nuovi[b + 1]!, nuovi[b + 2]!);
          c.moveTo(x0, y0); c.lineTo(x1, y1);
        }
        c.stroke();
        c.globalAlpha = 1;
        c.lineWidth = 1;
      }
      c.fillStyle = FG;
      for (let i = 0; i < N_NUOVI; i++) { const [x, y, F] = P(nuovi[i * 3]!, nuovi[i * 3 + 1]!, nuovi[i * 3 + 2]!), l = 1.5 + luce(F) * 1.5; c.globalAlpha = luce(F); c.fillRect(x - l / 2, y - l / 2, l, l); }
      c.globalAlpha = 1;
      return;
    }
    c.fillStyle = tinta();
    for (let i = 0; i < N_VISTI * 2; i++) { const [x, y, F] = P(dati[i * 3]!, dati[i * 3 + 1]!, dati[i * 3 + 2]!); c.globalAlpha = luce(F); c.fillRect(x - 1, y - 1, 2, 2); }
    c.globalAlpha = 1;
    if (inMoto) {
      c.fillStyle = ARANCIO;
      for (let i = 0; i < N_VISTI; i++) { const [x, y, F] = P(copie[i * 3]!, copie[i * 3 + 1]!, copie[i * 3 + 2]!); c.globalAlpha = luce(F) * 0.85; c.fillRect(x - 1.5, y - 1.5, 3, 3); }
      c.globalAlpha = 1;
    }
  }
  function disegnaCurva() {
    const d = devicePixelRatio, w = curva.clientWidth, h = curva.clientHeight, sx = 34, giu = h - 16;
    if (!w) return;
    if (curva.width !== w * d || curva.height !== h * d) { curva.width = w * d; curva.height = h * d; }
    cc.setTransform(d, 0, 0, d, 0, 0);
    cc.clearRect(0, 0, w, h);
    cc.font = `11px ${stile.getPropertyValue('--mono') || 'monospace'}`;
    cc.fillStyle = MUTED;
    cc.textAlign = 'right';
    cc.textBaseline = 'middle';
    const alto = 0.5, basso = 0.15, y = (v: number) => 4 + ((alto - Math.min(alto, Math.max(basso, v))) / (alto - basso)) * (giu - 4);
    [0.5, 0.3, 0.15].forEach(v => {
      cc.fillText(v.toFixed(1), sx - 4, y(v));
      cc.strokeStyle = LINE;
      cc.beginPath(); cc.moveTo(sx, y(v)); cc.lineTo(w, y(v)); cc.stroke();
    });
    cc.textBaseline = 'alphabetic';
    cc.fillText(`${FINE / 1000}k training steps`, w, h - 2);
    cc.textAlign = 'left';
    cc.fillText('0', sx, h - 2);
    cc.strokeStyle = ARANCIO;
    cc.beginPath();
    storia.forEach((v, i) => { const x = sx + (((i + 1) * 100) / FINE) * (w - sx); if (i) cc.lineTo(x, y(v)); else cc.moveTo(x, y(v)); });
    cc.stroke();
  }

  // --- Comandi
  const scriviBottone = () => {
    scrivi(gioca, inMoto ? 'pause' : m.passi >= FINE ? 'done' : m.passi ? 'resume' : 'train');
    gioca.dataset.stato = inMoto ? 'pausa' : 'via';
    gioca.disabled = m.passi >= FINE;
    azzera.hidden = !m.passi;
    genera.disabled = !m.passi || sale;
  };
  const scriviErrore = () => scrivi(letturaE, m.passi ? `${m.passi.toLocaleString('en')} steps${storia.length ? ` · error ${storia[storia.length - 1]!.toFixed(2)}` : ''}` : '');
  const azzeraTutto = () => {
    inMoto = false; m = nuovoModello(); storia = []; somma = conta = 0; nuovi = null; sale = false; fili = []; scrivi(lettura, '');
    scriviBottone(); scriviErrore(); disegnaCurva(); sporco = true;
  };
  gioca.addEventListener('click', () => { inMoto = !inMoto; nuovi = null; fili = []; scrivi(lettura, ''); if (inMoto) nuoveCopie(); sporco = true; scriviBottone(); });
  azzera.addEventListener('click', azzeraTutto);
  formeB.forEach(b => b.addEventListener('click', () => {
    oggetto = b.dataset.oggetto!;
    formeB.forEach(q => q.setAttribute('aria-pressed', String(q === b)));
    dati = oggetto === 'fish' ? pesce(N_DATI) : albero(N_DATI);
    azzeraTutto();
  }));
  const scriviPasso = () => scrivi(lettura, k >= PASSI ? 'finished' : `step ${k} of ${PASSI} · ${Math.round(Math.sqrt(1 - abar[tempi[k]!]!) * 100)}% noise left`);
  const avanza = () => {
    for (let i = 0; i < N_NUOVI; i++) indietro(m, nuovi!, i * 3, tempi[k]!, tempi[k + 1]!);
    k++;
    rumoreAdesso = k >= PASSI ? 0 : Math.sqrt(1 - abar[tempi[k]!]!);
    if (rumoreAdesso < RUMORE_FILI) calcolaFili();
  };
  genera.addEventListener('click', () => {
    inMoto = false;
    nuovi = new Float32Array(N_NUOVI * 3);
    for (let i = 0; i < N_NUOVI * 3; i++) nuovi[i] = gauss();
    k = 0; rumoreAdesso = 1; fili = []; sporco = true;
    if (calmo) { while (k < PASSI) avanza(); scriviPasso(); scriviBottone(); return; }
    sale = true;
    inizio = performance.now();
    scriviBottone();
  });
  tela.addEventListener('pointerdown', e => { gira = true; xPrima = e.clientX; tela.setPointerCapture(e.pointerId); });
  tela.addEventListener('pointermove', e => { if (gira) { giro -= (e.clientX - xPrima) * 0.008; xPrima = e.clientX; sporco = true; } });
  const fine = () => { gira = false; };
  tela.addEventListener('pointerup', fine);
  tela.addEventListener('pointercancel', fine);

  const misura = () => {
    W = tela.clientWidth; H = tela.clientHeight;
    tela.width = W * devicePixelRatio; tela.height = H * devicePixelRatio;
    sporco = true;
    disegnaCurva();
  };
  new ResizeObserver(misura).observe(tela);
  new IntersectionObserver(v => { visibile = v.some(x => x.isIntersecting); if (visibile) sporco = true; }, { rootMargin: '60px' }).observe(tela);
  misura();
  formeB.forEach(q => q.setAttribute('aria-pressed', String(q.dataset.oggetto === oggetto)));
  azzeraTutto();

  const ciclo = (ora: number) => {
    requestAnimationFrame(ciclo);
    if (!visibile || !W) return;
    if (!calmo && !gira) { giro += GIRO_DA_SOLA; sporco = true; }
    if (inMoto) {
      const fineTempo = performance.now() + 12;
      do {
        somma += allena(m, dati, GRUPPO, m.passi < RALLENTA ? 3e-3 : 1e-3);
        if (++conta === 100) { storia.push(somma / conta); somma = conta = 0; }
      } while (performance.now() < fineTempo && m.passi < FINE);
      if (m.passi >= FINE) inMoto = false;
      if (ora - ultimoCambio > CAMBIO) { nuoveCopie(); ultimoCambio = ora; }
      scriviBottone(); scriviErrore(); disegnaCurva();
      sporco = true;
    }
    if (sale && nuovi) {
      const voluto = Math.min(PASSI, Math.floor(((ora - inizio) / DURATA) * PASSI) + 1);
      if (k < voluto) { avanza(); sporco = true; }
      scriviPasso();
      if (k >= PASSI) { sale = false; scriviBottone(); }
    }
    if (!sporco) return;
    sporco = false;
    disegna();
  };
  requestAnimationFrame(ciclo);
}
