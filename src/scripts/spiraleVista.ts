import { abar, allena, daDisegno, gauss, indietro, nuovoModello, punti, stella, stima, T, type Modello } from '../lib/spirale';

// Vista della spirale: un modello di diffusion che si allena nel browser. All'inizio si vede solo la forma.
// Training: si vede il gruppo vero di ogni passo, con una linea dal punto vero al punto con il rumore, e le frecce mostrano cosa ha imparato la rete.
// Inference: punti nuovi partono dal rumore e arrivano sulla forma.
const N_DATI = 1024, N_NUOVI = 300, GRUPPO = 64, FINE = 8000, RALLENTA = 5500, FRECCE = 17, MONDO = 1.65, DURATA_NUOVI = 3200, T_FRECCE = 14, CAMBIO_GRUPPO = 220;
const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function monta(radice: HTMLElement) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const scrivi = (el: Element, t: string) => { if (el.textContent !== t) el.textContent = t; };
  const FG = tono('--fg'), MUTED = tono('--muted'), LINE = tono('--line'), ARANCIO = tono('--arancio'), BLU = tono('--azzurro');
  const tela = $<HTMLCanvasElement>('.tela-spirale'), c = tela.getContext('2d')!, curva = $<HTMLCanvasElement>('.curva'), cc = curva.getContext('2d')!;
  const gioca = $<HTMLButtonElement>('.gioca'), azzera = $<HTMLButtonElement>('.azzera'), genera = $<HTMLButtonElement>('.genera'), letturaE = $<HTMLElement>('.errore'), lettura = $<HTMLElement>('.lettura-nuovi'), passiB = radice.querySelectorAll<HTMLButtonElement>('[data-passi]');
  const tagPunto = $<HTMLElement>('.tag-punto'), tagConsiglio = $<HTMLElement>('.tag-consiglio'), pannello = $<HTMLElement>('.pannello'), notaTel = $<HTMLElement>('.nota-tel');
  const formeB = radice.querySelectorAll<HTMLButtonElement>('[data-forma]'), pulisci = $<HTMLButtonElement>('.pulisci'), forme = $<HTMLElement>('.forme');

  let dati = punti(N_DATI), forma = 'spiral', tratti: number[][] = [], corrente: number[] | null = null, visti = 0;
  let m: Modello = nuovoModello(), inMoto = false, sporco = true, visibile = false, storia: number[] = [], somma = 0, conta = 0, generati = 0, ultimaFreccia = 0, spiegaEl: HTMLElement | null = null;
  let nuovi: Float32Array | null = null, sale = false, inizioNuovi = 0, kNuovi = 0, passiNuovi = 20, tempiNuovi: number[] = [];
  let gruppoVisto = new Float32Array(GRUPPO * 4), ultimoGruppo = 0;
  const frecce = new Float32Array(FRECCE * FRECCE * 2);

  // --- Disegno
  let W = 0, H = 0, Wp = 0;
  const piano = () => {
    const sinistra = innerWidth > 760 ? Wp + 16 : 0, destra = innerWidth > 760 ? 100 : 0, libero = W - sinistra - destra, S = Math.min(libero, H) / 2 / MONDO;
    return { S, cx: sinistra + libero / 2, cy: H / 2 };
  };
  function calcolaFrecce() {
    const t = T_FRECCE, a = abar[t]!, sa = Math.sqrt(a), sb = Math.sqrt(1 - a);
    for (let r = 0; r < FRECCE; r++) for (let q = 0; q < FRECCE; q++) {
      const x = -MONDO + ((q + 0.5) * 2 * MONDO) / FRECCE, y = MONDO - ((r + 0.5) * 2 * MONDO) / FRECCE, [e0, e1] = stima(m, x, y, t), k = (r * FRECCE + q) * 2;
      // La freccia va verso il punto pulito stimato: è il verso in cui la rete toglierebbe il rumore
      frecce[k] = (x - sb * e0) / sa - x;
      frecce[k + 1] = (y - sb * e1) / sa - y;
    }
    ultimaFreccia = performance.now();
  }
  function disegna() {
    const { S, cx, cy } = piano(), d = devicePixelRatio, px = (x: number) => cx + S * x, py = (y: number) => cy - S * y;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, W, H);
    c.strokeStyle = LINE;
    c.lineWidth = 1;
    c.strokeRect(px(-MONDO), py(MONDO), 2 * MONDO * S, 2 * MONDO * S);
    // Rumore e frecce esistono solo durante il training
    const inTraining = m.passi > 0 && m.passi < FINE && !nuovi;
    if (inTraining) {
      const cella = (2 * MONDO * S) / FRECCE;
      c.strokeStyle = MUTED;
      c.beginPath();
      for (let r = 0; r < FRECCE; r++) for (let q = 0; q < FRECCE; q++) {
        const k = (r * FRECCE + q) * 2, dx = frecce[k]!, dy = frecce[k + 1]!, n = Math.hypot(dx, dy);
        if (n < 1e-4) continue;
        const lung = cella * 0.42 * (0.45 + 0.55 * Math.min(1, n / 0.6)), ux = dx / n, uy = dy / n, x0 = cx + S * (-MONDO + ((q + 0.5) * 2 * MONDO) / FRECCE), y0 = cy - S * (MONDO - ((r + 0.5) * 2 * MONDO) / FRECCE), x1 = x0 + ux * lung, y1 = y0 - uy * lung;
        c.moveTo(x0, y0); c.lineTo(x1, y1);
        c.moveTo(x1, y1); c.lineTo(x1 - (ux * 0.8 - uy * 0.5) * 3.5, y1 - (-uy * 0.8 - ux * 0.5) * 3.5);
        c.moveTo(x1, y1); c.lineTo(x1 - (ux * 0.8 + uy * 0.5) * 3.5, y1 - (-uy * 0.8 + ux * 0.5) * 3.5);
      }
      c.globalAlpha = 0.6;
      c.stroke();
      c.globalAlpha = 1;
    }
    // La forma vera. In inference sparisce: i punti nuovi nascono solo dai pesi
    if (!nuovi) {
      c.fillStyle = BLU;
      for (let i = 0; i < dati.length / 2; i++) c.fillRect(px(dati[i * 2]!) - 1, py(dati[i * 2 + 1]!) - 1, 2, 2);
    }
    // Il disegno mentre lo si traccia
    if (corrente) {
      c.strokeStyle = BLU;
      c.lineWidth = 2;
      c.lineJoin = c.lineCap = 'round';
      c.beginPath();
      for (let i = 0; i + 1 < corrente.length; i += 2) { if (i) c.lineTo(px(corrente[i]!), py(corrente[i + 1]!)); else c.moveTo(px(corrente[i]!), py(corrente[i + 1]!)); }
      c.stroke();
    }
    if (nuovi) {
      c.fillStyle = FG;
      for (let i = 0; i < N_NUOVI; i++) c.fillRect(px(nuovi[i * 2]!) - 1.5, py(nuovi[i * 2 + 1]!) - 1.5, 3, 3);
    } else if (inTraining) {
      // Il gruppo vero di questo passo: la linea è il rumore che la rete deve indovinare
      c.strokeStyle = ARANCIO;
      c.globalAlpha = 0.55;
      c.beginPath();
      for (let i = 0; i < GRUPPO; i++) { c.moveTo(px(gruppoVisto[i * 4]!), py(gruppoVisto[i * 4 + 1]!)); c.lineTo(px(gruppoVisto[i * 4 + 2]!), py(gruppoVisto[i * 4 + 3]!)); }
      c.stroke();
      c.globalAlpha = 1;
      c.fillStyle = ARANCIO;
      for (let i = 0; i < GRUPPO; i++) c.fillRect(px(gruppoVisto[i * 4 + 2]!) - 2, py(gruppoVisto[i * 4 + 3]!) - 2, 4, 4);
    }
  }
  function disegnaCurva() {
    const d = devicePixelRatio, w = curva.clientWidth, h = curva.clientHeight, sx = 34, giu = h - 16;
    if (curva.width !== w * d || curva.height !== h * d) { curva.width = w * d; curva.height = h * d; }
    cc.setTransform(d, 0, 0, d, 0, 0);
    cc.clearRect(0, 0, w, h);
    cc.font = `11px ${stile.getPropertyValue('--mono') || 'monospace'}`;
    cc.fillStyle = MUTED;
    cc.textAlign = 'right';
    cc.textBaseline = 'middle';
    const alto = 0.65, basso = 0.2, y = (v: number) => 4 + ((alto - Math.min(alto, Math.max(basso, v))) / (alto - basso)) * (giu - 4);
    [0.6, 0.4, 0.2].forEach(v => {
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

  // --- Training
  const scriviBottone = () => {
    scrivi(gioca, inMoto ? 'pause' : m.passi >= FINE ? 'done' : m.passi ? 'resume' : 'train');
    gioca.dataset.stato = inMoto ? 'pausa' : 'via';
    gioca.disabled = m.passi >= FINE || !dati.length;
    azzera.hidden = !m.passi;
    genera.disabled = !m.passi || sale;
  };
  const scriviErrore = () => scrivi(letturaE, m.passi ? `${m.passi.toLocaleString('en')} steps${storia.length ? ` · error ${storia[storia.length - 1]!.toFixed(2)}` : ''}` : '');
  const azzeraTutto = () => {
    inMoto = false; m = nuovoModello(); storia = []; somma = conta = 0; nuovi = null; sale = false; generati = 0; scrivi(lettura, '');
    calcolaFrecce(); scriviBottone(); scriviErrore(); disegnaCurva(); sporco = true;
  };
  gioca.addEventListener('click', () => { inMoto = !inMoto; nuovi = null; scrivi(lettura, ''); sporco = true; scriviBottone(); });
  azzera.addEventListener('click', azzeraTutto);

  // --- La forma: una pronta, oppure disegnata sul quadrato
  const inDisegno = () => forma === 'draw';
  function scegliForma(f: string) {
    forma = f;
    formeB.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.forma === f)));
    pulisci.hidden = !inDisegno();
    tela.style.cursor = inDisegno() ? 'crosshair' : '';
    tela.style.touchAction = inDisegno() ? 'none' : '';
    if (f !== 'draw') tratti = [];
    dati = f === 'star' ? stella(N_DATI) : f === 'draw' ? daDisegno(tratti, N_DATI) ?? new Float32Array(0) : punti(N_DATI);
    azzeraTutto();
  }
  const alMondo = (e: PointerEvent) => {
    const { S, cx, cy } = piano(), q = tela.getBoundingClientRect(), lim = (v: number) => Math.max(-MONDO, Math.min(MONDO, v));
    return [lim((e.clientX - q.left - cx) / S), lim((cy - (e.clientY - q.top)) / S)] as const;
  };
  tela.addEventListener('pointerdown', e => {
    if (!inDisegno() || sale) return;
    corrente = [...alMondo(e)];
    tela.setPointerCapture(e.pointerId);
    sporco = true;
  });
  tela.addEventListener('pointermove', e => {
    if (!corrente) return;
    corrente.push(...alMondo(e));
    sporco = true;
  });
  const fineTratto = () => {
    if (!corrente) return;
    tratti.push(corrente);
    corrente = null;
    dati = daDisegno(tratti, N_DATI) ?? new Float32Array(0);
    azzeraTutto();
  };
  tela.addEventListener('pointerup', fineTratto);
  tela.addEventListener('pointercancel', fineTratto);
  formeB.forEach(b => b.addEventListener('click', () => scegliForma(b.dataset.forma!)));
  pulisci.addEventListener('click', () => { tratti = []; scegliForma('draw'); });

  // --- Inference: punti nuovi partono dal rumore e seguono quello che la rete ha imparato
  const scriviPasso = () => {
    const t = tempiNuovi[kNuovi]!;
    scrivi(lettura, kNuovi >= passiNuovi ? 'finished' : `step ${kNuovi} of ${passiNuovi} · ${Math.round(Math.sqrt(1 - abar[t]!) * 100)}% noise left`);
  };
  const avanzaNuovi = () => {
    for (let i = 0; i < N_NUOVI; i++) [nuovi![i * 2], nuovi![i * 2 + 1]] = indietro(m, nuovi![i * 2]!, nuovi![i * 2 + 1]!, tempiNuovi[kNuovi]!, tempiNuovi[kNuovi + 1]!);
    kNuovi++;
  };
  const finisciNuovi = () => { sale = false; generati++; scriviPasso(); scriviBottone(); sporco = true; };
  const scegliPassi = (n: number) => { passiNuovi = n; passiB.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.passi) === n))); };
  passiB.forEach(b => b.addEventListener('click', () => scegliPassi(Number(b.dataset.passi))));
  scegliPassi(passiNuovi);
  genera.addEventListener('click', () => {
    inMoto = false;
    nuovi = new Float32Array(N_NUOVI * 2);
    for (let i = 0; i < N_NUOVI * 2; i++) nuovi[i] = gauss();
    tempiNuovi = [...Array.from({ length: passiNuovi }, (_, k) => Math.round(T - (k * T) / passiNuovi)), 0];
    kNuovi = 0;
    sporco = true;
    if (calmo) {
      while (kNuovi < passiNuovi) avanzaNuovi();
      finisciNuovi();
      return;
    }
    sale = true;
    inizioNuovi = performance.now();
    scriviBottone();
  });

  // --- Tag
  const posa = (tag: HTMLElement, q: DOMRect, fuoriDa?: DOMRect) => {
    const w = tag.offsetWidth, h = tag.offsetHeight, vw = innerWidth, vh = innerHeight;
    const destra = fuoriDa ? fuoriDa.right : q.right, x = destra + 10 + w < vw - 8 ? destra + 10 : Math.max(8, q.left - w - 10), y = Math.max(8, Math.min(vh - h - 8, (q.top + q.bottom) / 2 - h / 2));
    tag.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };
  const metti2 = (tag: HTMLElement, testo: string) => { tag.hidden = !testo; if (testo) scrivi(tag, testo); };
  radice.addEventListener('pointerover', e => { spiegaEl = (e.target as Element).closest?.('[data-spiega]') as HTMLElement | null; });
  radice.addEventListener('pointerleave', () => { spiegaEl = null; });
  function aggiornaTag() {
    const dalPannello = (el: Element) => (el.closest('.pannello') ? pannello.getBoundingClientRect() : undefined);
    if (spiegaEl) { metti2(tagPunto, spiegaEl.dataset.spiega ?? ''); posa(tagPunto, spiegaEl.getBoundingClientRect(), dalPannello(spiegaEl)); }
    else metti2(tagPunto, '');
    let testo = '', el: HTMLElement | null = null;
    if (inDisegno() && !dati.length) { testo = 'draw on the square'; el = forme; }
    else if (!m.passi && !inMoto) { testo = 'press train'; el = gioca; }
    else if (!inMoto && !sale && !generati && m.passi) { testo = 'now generate new points'; el = genera; }
    const q = el?.getBoundingClientRect(), mostra = !!testo && !!q && tagPunto.hidden && q.bottom > 0 && q.top < innerHeight;
    metti2(tagConsiglio, mostra ? testo : '');
    if (mostra) posa(tagConsiglio, q!, dalPannello(el!));
    if (matchMedia('(max-width: 760px)').matches) {
      const testoTel = !tagPunto.hidden ? tagPunto.textContent : !tagConsiglio.hidden ? tagConsiglio.textContent : '';
      if (notaTel.textContent !== testoTel) notaTel.textContent = testoTel;
    }
  }

  const misura = () => {
    W = tela.clientWidth; H = tela.clientHeight; Wp = innerWidth > 760 ? pannello.offsetWidth : 0;
    tela.width = W * devicePixelRatio; tela.height = H * devicePixelRatio;
    sporco = true;
    disegnaCurva();
  };
  new ResizeObserver(misura).observe(tela);
  new IntersectionObserver(v => { visibile = v.some(x => x.isIntersecting); if (visibile) sporco = true; }, { rootMargin: '60px' }).observe(tela);
  misura();
  formeB.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.forma === forma)));
  azzeraTutto();

  const ciclo = (ora: number) => {
    requestAnimationFrame(ciclo);
    // Si allena solo quando si vede: tanti passi quanti stanno in 12 ms, così la pagina resta fluida
    if (inMoto && visibile) {
      const fineTempo = performance.now() + 12;
      do {
        somma += allena(m, dati, GRUPPO, m.passi < RALLENTA ? 3e-3 : 1e-3);
        if (++conta === 100) { storia.push(somma / conta); somma = conta = 0; }
      } while (performance.now() < fineTempo && m.passi < FINE);
      if (m.passi >= FINE) inMoto = false;
      // Il gruppo vero cambia a ogni passo, troppo in fretta per l'occhio: se ne mostra uno ogni tanto
      if (ora - ultimoGruppo > CAMBIO_GRUPPO) { gruppoVisto = m.ultimo.slice(); ultimoGruppo = ora; }
      if (ora - ultimaFreccia > 250) calcolaFrecce();
      scriviBottone(); scriviErrore(); disegnaCurva();
      sporco = true;
    }
    // Inference: un passo alla volta, nello stesso tempo qualunque sia il numero di passi
    if (sale && nuovi) {
      const voluto = Math.min(passiNuovi, Math.floor(((ora - inizioNuovi) / DURATA_NUOVI) * passiNuovi) + 1);
      if (kNuovi < voluto) { avanzaNuovi(); sporco = true; }
      scriviPasso();
      if (kNuovi >= passiNuovi) finisciNuovi();
    }
    if (W && visibile) aggiornaTag();
    if (!sporco || !W || !visibile) return;
    sporco = false;
    disegna();
  };
  requestAnimationFrame(ciclo);
}
