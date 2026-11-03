import { abar, aggiornaMedia, allena, conMedia, daDisegno, errorePiuBasso, gauss, indietro, nuovoModello, punti, stella, stima, sullaForma, T, type Modello } from '../lib/spirale';

// Vista della forma: un modello di diffusion che si allena nel browser, raccontato un punto alla volta.
// Un racconto: prendi un punto vero, sporcalo passo dopo passo, la rete indovina il punto pulito, la distanza è l'errore, i pesi si correggono.
// Inference: punti nuovi partono dal rumore e arrivano sulla forma.
const N_DATI = 1024, N_NUOVI = 300, GRUPPO = 64, FINE = 8000, MONDO = 1.65, DURATA_NUOVI = 3200, RACCONTO_LENTO = 6000, RACCONTO_VELOCE = 1100, PIATTO = 0.6, ALTEZZA = 1.1, MAGLIE = 16, N_FRECCE = 14, T_ALLENA = 12, T_FRECCE_MAX = 44, OGNI_FRECCE = 200;
// Quando inizia ogni tappa del racconto, da 0 a 1
const TAPPE = [0, 0.1, 0.5, 0.72, 0.88];
const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Racconto = { vero: [number, number]; cammino: number[]; t: number; guess: [number, number] | null; errore: number; inizio: number; durata: number; unPasso: boolean };

export function monta(radice: HTMLElement) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const scrivi = (el: Element, t: string) => { if (el.textContent !== t) el.textContent = t; };
  const FG = tono('--fg'), MUTED = tono('--muted'), LINE = tono('--line'), ARANCIO = tono('--arancio'), BLU = tono('--azzurro');
  const tela = $<HTMLCanvasElement>('.tela-spirale'), c = tela.getContext('2d')!, curva = $<HTMLCanvasElement>('.curva'), cc = curva.getContext('2d')!;
  const gioca = $<HTMLButtonElement>('.gioca'), unPasso = $<HTMLButtonElement>('.un-passo'), azzera = $<HTMLButtonElement>('.azzera'), genera = $<HTMLButtonElement>('.genera'), letturaE = $<HTMLElement>('.errore'), lettura = $<HTMLElement>('.lettura-nuovi'), passiB = radice.querySelectorAll<HTMLButtonElement>('[data-passi]');
  const cursore = $<HTMLInputElement>('.cursore-rumore'), letturaR = $<HTMLElement>('.lettura-rumore'), tappe = radice.querySelectorAll<HTMLElement>('.racconto li');
  const tagPunto = $<HTMLElement>('.tag-punto'), tagConsiglio = $<HTMLElement>('.tag-consiglio'), pannello = $<HTMLElement>('.pannello'), notaTel = $<HTMLElement>('.nota-tel');
  const formeB = radice.querySelectorAll<HTMLButtonElement>('[data-forma]'), pulisci = $<HTMLButtonElement>('.pulisci'), forme = $<HTMLElement>('.forme');

  let dati = stella(N_DATI), forma = 'star', tratti: number[][] = [], corrente: number[] | null = null, tMax = T;
  let m: Modello = nuovoModello(), media = conMedia(m), minimo = 0, buoni = -1, inMoto = false, sporco = true, visibile = false, storia: number[] = [], somma = 0, conta = 0, generati = 0, spiegaEl: HTMLElement | null = null;
  let nuovi: Float32Array | null = null, primaNuovi: Float32Array | null = null, sale = false, inizioNuovi = 0, kNuovi = 0, passiNuovi = 20, tempiNuovi: number[] = [];
  let racconto: Racconto | null = null, giro = 0.42, gira = false, xPrima = 0;
  const frecce = new Float32Array(N_FRECCE * N_FRECCE * 2);
  let tFrecce = 0, oraFrecce = 0;

  // --- Un racconto: un punto vero, il suo rumore passo dopo passo. L'ipotesi della rete arriva a metà
  function nuovoRacconto(durata: number, unP: boolean) {
    const i = Math.floor(Math.random() * (dati.length / 2)), x0 = dati[i * 2]!, y0 = dati[i * 2 + 1]!, t = 1 + Math.floor(Math.random() * tMax), cammino = [x0, y0];
    let x = x0, y = y0;
    for (let k = 1; k <= t; k++) {
      const beta = 1 - abar[k]! / abar[k - 1]!, s = Math.sqrt(1 - beta), r = Math.sqrt(beta);
      x = s * x + r * gauss(); y = s * y + r * gauss();
      cammino.push(x, y);
    }
    racconto = { vero: [x0, y0], cammino, t, guess: null, errore: 0, inizio: performance.now(), durata, unPasso: unP };
  }
  function indovina(r: Racconto) {
    const n = r.cammino.length, x = r.cammino[n - 2]!, y = r.cammino[n - 1]!, a = abar[r.t]!, sa = Math.sqrt(a), sb = Math.sqrt(1 - a), [e0, e1] = stima(media, x, y, r.t);
    const lim = (v: number) => Math.max(-MONDO, Math.min(MONDO, v));
    r.guess = [lim((x - sb * e0) / sa), lim((y - sb * e1) / sa)];
    const veri0 = (x - sa * r.vero[0]) / sb, veri1 = (y - sa * r.vero[1]) / sb;
    r.errore = ((e0 - veri0) ** 2 + (e1 - veri1) ** 2) / 2;
  }

  // L'altezza di un livello è la quota di rumore, la stessa che si legge nel testo
  const quota = (t: number) => Math.sqrt(1 - abar[t]!);

  // --- Le frecce: da ogni posizione verso il punto pulito che la rete stima a quel livello. Vengono solo dai pesi
  const lato = (2 * MONDO) / N_FRECCE;
  function calcolaFrecce(t: number) {
    const q = Math.min(t, T_FRECCE_MAX), a = abar[q]!, sa = Math.sqrt(a), sb = Math.sqrt(1 - a), lim = (v: number) => Math.max(-MONDO, Math.min(MONDO, v));
    for (let r = 0, i = 0; r < N_FRECCE; r++) for (let k = 0; k < N_FRECCE; k++, i += 2) {
      const x = -MONDO + (k + 0.5) * lato, y = -MONDO + (r + 0.5) * lato, [e0, e1] = stima(media, x, y, q);
      frecce[i] = lim((x - sb * e0) / sa) - x;
      frecce[i + 1] = lim((y - sb * e1) / sa) - y;
    }
    tFrecce = t;
    oraFrecce = performance.now();
  }

  // --- Disegno
  let W = 0, H = 0, Wp = 0;
  // Il quadrato è un piano a filo inclinato, come la griglia delle cifre. L'altezza è la quota di rumore
  const piano = () => {
    const sinistra = innerWidth > 760 ? Wp + 16 : 0, destra = innerWidth > 760 ? 100 : 0, libero = W - sinistra - destra;
    const S = Math.min(libero / (2 * MONDO * Math.SQRT2 * 0.92), (H - 24) / (2 * MONDO * Math.SQRT2 * PIATTO + ALTEZZA * 1.2));
    return { S, cx: sinistra + libero / 2, cy: H / 2 + 12 + (S * ALTEZZA) / 3, co: Math.cos(giro), si: Math.sin(giro) };
  };
  function disegna(ora: number) {
    const { S, cx, cy, co, si } = piano(), d = devicePixelRatio;
    const P = (x: number, y: number, h = 0) => [cx + S * (x * co + y * si), cy - S * ((-x * si + y * co) * PIATTO + h * ALTEZZA)] as const;
    const punto = (x: number, y: number, h: number, lato: number) => { const [a, b] = P(x, y, h); c.fillRect(a - lato / 2, b - lato / 2, lato, lato); };
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, W, H);
    // Il piano: griglia a filo
    c.strokeStyle = LINE;
    c.lineWidth = 1;
    c.beginPath();
    for (let k = 0; k <= MAGLIE; k++) {
      const q = -MONDO + (2 * MONDO * k) / MAGLIE;
      let [a, b] = P(q, -MONDO); c.moveTo(a, b); [a, b] = P(q, MONDO); c.lineTo(a, b);
      [a, b] = P(-MONDO, q); c.moveTo(a, b); [a, b] = P(MONDO, q); c.lineTo(a, b);
    }
    c.stroke();
    // La forma vera. In inference sparisce: i punti nuovi nascono solo dai pesi
    if (!nuovi) {
      c.fillStyle = BLU;
      c.globalAlpha = racconto ? 0.45 : 1;
      for (let i = 0; i < dati.length / 2; i++) punto(dati[i * 2]!, dati[i * 2 + 1]!, 0, 2);
      c.globalAlpha = 1;
    }
    if (corrente) {
      c.strokeStyle = BLU;
      c.lineWidth = 2;
      c.lineJoin = c.lineCap = 'round';
      c.beginPath();
      for (let i = 0; i + 1 < corrente.length; i += 2) { const [a, b] = P(corrente[i]!, corrente[i + 1]!); if (i) c.lineTo(a, b); else c.moveTo(a, b); }
      c.stroke();
      c.lineWidth = 1;
    }
    // Le frecce della rete stanno sempre sul piano. In inference cambiano con il rumore, e sono i punti a scendere verso il piano
    const finito = !!nuovi && !sale, conFrecce = m.passi > 0 && !finito && !racconto?.unPasso, u = sale ? Math.min(1, Math.max(0, ((ora - inizioNuovi) / DURATA_NUOVI) * passiNuovi - (kNuovi - 1))) : 1;
    const h = conFrecce && nuovi ? quota(tempiNuovi[kNuovi - 1] ?? T) + (quota(tempiNuovi[kNuovi] ?? 0) - quota(tempiNuovi[kNuovi - 1] ?? T)) * u : 0;
    if (conFrecce) {
      c.strokeStyle = MUTED;
      c.beginPath();
      for (let r = 0, i = 0; r < N_FRECCE; r++) for (let k = 0; k < N_FRECCE; k++, i += 2) {
        const x = -MONDO + (k + 0.5) * lato, y = -MONDO + (r + 0.5) * lato, dx = frecce[i]!, dy = frecce[i + 1]!, d = Math.hypot(dx, dy) || 1, l = Math.min(0.8 * lato, d * 0.6);
        const [a0, b0] = P(x, y), [a1, b1] = P(x + (dx / d) * l, y + (dy / d) * l), [a2, b2] = P(x + (dx / d) * l * 0.65 - (dy / d) * l * 0.2, y + (dy / d) * l * 0.65 + (dx / d) * l * 0.2), [a3, b3] = P(x + (dx / d) * l * 0.65 + (dy / d) * l * 0.2, y + (dy / d) * l * 0.65 - (dx / d) * l * 0.2);
        c.moveTo(a0, b0); c.lineTo(a1, b1); c.lineTo(a2, b2); c.moveTo(a1, b1); c.lineTo(a3, b3);
      }
      c.stroke();
      c.fillStyle = MUTED;
      c.font = `11px ${stile.getPropertyValue('--mono') || 'monospace'}`;
      c.textAlign = 'center';
      c.fillText(`arrows at ${Math.round(quota(tFrecce) * 100)}% noise: where points get sent`, cx, 12);
    } else {
      c.fillStyle = MUTED;
      c.font = `11px ${stile.getPropertyValue('--mono') || 'monospace'}`;
      c.textAlign = 'center';
      c.fillText('this square is a map: one result = one dot', cx, 12);
    }
    if (nuovi) {
      c.fillStyle = FG;
      const da = primaNuovi ?? nuovi;
      for (let i = 0; i < N_NUOVI * 2; i += 2) punto(da[i]! + (nuovi[i]! - da[i]!) * u, da[i + 1]! + (nuovi[i + 1]! - da[i + 1]!) * u, h, 3);
    } else if (racconto) {
      const r = racconto, f = calmo ? 1 : Math.min(1, (ora - r.inizio) / r.durata), passi = (r.cammino.length / 2) - 1, visti = Math.round(Math.min(1, Math.max(0, (f - TAPPE[1]!) / (TAPPE[2]! - TAPPE[1]!))) * passi);
      const altezzaDi = quota;
      const [vx, vy] = P(r.vero[0], r.vero[1]);
      // Il punto vero
      c.strokeStyle = FG;
      c.lineWidth = 2;
      c.beginPath(); c.ellipse(vx, vy, 7, 7 * PIATTO, 0, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 1.5;
      // Il rumore, un passo dopo l'altro: ogni passo sale un po'
      c.strokeStyle = ARANCIO;
      c.beginPath();
      for (let k = 0; k <= visti; k++) { const [a, b] = P(r.cammino[k * 2]!, r.cammino[k * 2 + 1]!, altezzaDi(k)); if (k) c.lineTo(a, b); else c.moveTo(a, b); }
      c.stroke();
      const qxm = r.cammino[visti * 2]!, qym = r.cammino[visti * 2 + 1]!, [qx, qy] = P(qxm, qym, altezzaDi(visti));
      // L'ombra rende leggibile quanto è alto
      c.fillStyle = MUTED;
      c.globalAlpha = 0.6;
      punto(qxm, qym, 0, 4);
      c.globalAlpha = 1;
      c.fillStyle = ARANCIO;
      c.fillRect(qx - 3, qy - 3, 6, 6);
      // L'ipotesi della rete: dove crede che fosse il punto pulito, sul piano
      if (f >= TAPPE[2]! && r.guess) {
        const u = Math.min(1, (f - TAPPE[2]!) / (TAPPE[3]! - TAPPE[2]!)), [gx, gy] = P(r.guess[0], r.guess[1]), ex = qx + (gx - qx) * u, ey = qy + (gy - qy) * u;
        c.strokeStyle = FG;
        c.beginPath(); c.moveTo(qx, qy); c.lineTo(ex, ey); c.stroke();
        c.fillStyle = FG;
        c.fillRect(ex - 3, ey - 3, 6, 6);
        // La distanza dal punto vero è l'errore
        if (f >= TAPPE[3]!) {
          c.setLineDash([3, 3]);
          c.beginPath(); c.moveTo(gx, gy); c.lineTo(vx, vy); c.stroke();
          c.setLineDash([]);
          c.font = `12px ${stile.getPropertyValue('--mono') || 'monospace'}`;
          c.textAlign = 'left';
          c.fillText(`error ${r.errore.toFixed(2)}`, (gx + vx) / 2 + 8, (gy + vy) / 2 - 8);
        }
      }
      c.lineWidth = 1;
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
    const alto = 0.8, basso = 0.2, y = (v: number) => 4 + ((alto - Math.min(alto, Math.max(basso, v))) / (alto - basso)) * (giu - 4);
    [0.8, 0.5, 0.2].forEach(v => {
      cc.fillText(v.toFixed(1), sx - 4, y(v));
      cc.strokeStyle = LINE;
      cc.beginPath(); cc.moveTo(sx, y(v)); cc.lineTo(w, y(v)); cc.stroke();
    });
    cc.textBaseline = 'alphabetic';
    cc.fillText(`dashed: lowest possible · ${FINE / 1000}k steps`, w, h - 2);
    cc.textAlign = 'left';
    cc.fillText('0', sx, h - 2);
    if (minimo) {
      cc.strokeStyle = FG;
      cc.setLineDash([3, 3]);
      cc.beginPath(); cc.moveTo(sx, y(minimo)); cc.lineTo(w, y(minimo)); cc.stroke();
      cc.setLineDash([]);
    }
    cc.strokeStyle = ARANCIO;
    cc.beginPath();
    storia.forEach((v, i) => { const x = sx + (((i + 1) * 100) / FINE) * (w - sx); if (i) cc.lineTo(x, y(v)); else cc.moveTo(x, y(v)); });
    cc.stroke();
  }

  // --- Training
  const allenaUno = () => {
    somma += allena(m, dati, GRUPPO, 3e-3 * (1 - m.passi / FINE) + 1e-4, tMax);
    aggiornaMedia(m, media);
    if (++conta === 100) { storia.push(somma / conta); somma = conta = 0; }
    if (m.passi % 500 === 0) buoni = sullaForma(media, dati);
  };
  const scriviBottone = () => {
    scrivi(gioca, inMoto ? 'pause' : m.passi >= FINE ? 'done' : m.passi ? 'resume' : 'train');
    gioca.dataset.stato = inMoto ? 'pausa' : 'via';
    gioca.disabled = m.passi >= FINE || !dati.length;
    unPasso.disabled = inMoto || m.passi >= FINE || !dati.length || !!racconto?.unPasso;
    azzera.hidden = !m.passi;
    genera.disabled = !m.passi || sale;
    const aMano = inDisegno() && !m.passi;
    tela.style.cursor = aMano ? 'crosshair' : 'grab';
    tela.style.touchAction = aMano ? 'none' : '';
  };
  const scriviErrore = () => scrivi(letturaE, m.passi ? `${m.passi.toLocaleString('en')} steps${storia.length ? ` · error ${storia[storia.length - 1]!.toFixed(2)}` : ''}${buoni >= 0 ? ` · on shape ${buoni}%` : ''}` : '');
  const azzeraTutto = () => {
    inMoto = false; m = nuovoModello(); media = conMedia(m); buoni = -1; minimo = dati.length ? errorePiuBasso(dati, tMax) : 0; storia = []; somma = conta = 0; nuovi = null; sale = false; generati = 0; racconto = null; scrivi(lettura, '');
    tappe.forEach(t => t.classList.remove('attiva'));
    scriviBottone(); scriviErrore(); disegnaCurva(); sporco = true;
  };
  gioca.addEventListener('click', () => { inMoto = !inMoto; nuovi = null; sale = false; calcolaFrecce(T_ALLENA); scrivi(lettura, ''); if (!inMoto) { racconto = null; tappe.forEach(t => t.classList.remove('attiva')); } sporco = true; scriviBottone(); });
  unPasso.addEventListener('click', () => { nuovi = null; sale = false; calcolaFrecce(T_ALLENA); scrivi(lettura, ''); nuovoRacconto(RACCONTO_LENTO, true); scriviBottone(); sporco = true; });
  azzera.addEventListener('click', azzeraTutto);

  // --- Quanto rumore vede la rete. Cambia cosa impara, quindi il training riparte
  const scriviRumore = () => scrivi(letturaR, `${Math.round(Math.sqrt(1 - abar[tMax]!) * 100)}%`);
  cursore.addEventListener('input', () => { tMax = Number(cursore.value); scriviRumore(); azzeraTutto(); });

  // --- La forma: una pronta, oppure disegnata sul quadrato
  const inDisegno = () => forma === 'draw';
  function scegliForma(f: string) {
    forma = f;
    formeB.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.forma === f)));
    pulisci.hidden = !inDisegno();
    if (f !== 'draw') tratti = [];
    dati = f === 'star' ? stella(N_DATI) : f === 'draw' ? daDisegno(tratti, N_DATI) ?? new Float32Array(0) : punti(N_DATI);
    azzeraTutto();
  }
  const alMondo = (e: PointerEvent) => {
    // Dallo schermo al piano: l'inverso della proiezione, ad altezza zero
    const { S, cx, cy, co, si } = piano(), q = tela.getBoundingClientRect(), lim = (v: number) => Math.max(-MONDO, Math.min(MONDO, v));
    const a = (e.clientX - q.left - cx) / S, b = (cy - (e.clientY - q.top)) / S / PIATTO;
    return [lim(a * co - b * si), lim(a * si + b * co)] as const;
  };
  tela.addEventListener('pointerdown', e => {
    // Si disegna solo prima del training. Dopo, come per le altre forme, il piano gira
    if (!inDisegno() || m.passi) { gira = true; xPrima = e.clientX; tela.setPointerCapture(e.pointerId); return; }
    if (sale) return;
    corrente = [...alMondo(e)];
    tela.setPointerCapture(e.pointerId);
    sporco = true;
  });
  tela.addEventListener('pointermove', e => {
    if (gira) { giro -= (e.clientX - xPrima) * 0.008; xPrima = e.clientX; sporco = true; return; }
    if (!corrente) return;
    corrente.push(...alMondo(e));
    sporco = true;
  });
  const fineTratto = () => {
    gira = false;
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
    scrivi(lettura, !sale && kNuovi >= passiNuovi ? 'finished' : `step ${kNuovi} of ${passiNuovi} · ${Math.round(Math.sqrt(1 - abar[t]!) * 100)}% noise left`);
  };
  const avanzaNuovi = () => {
    primaNuovi = nuovi!.slice();
    for (let i = 0; i < N_NUOVI; i++) [nuovi![i * 2], nuovi![i * 2 + 1]] = indietro(media, nuovi![i * 2]!, nuovi![i * 2 + 1]!, tempiNuovi[kNuovi]!, tempiNuovi[kNuovi + 1]!);
    kNuovi++;
    if (kNuovi < passiNuovi) calcolaFrecce(tempiNuovi[kNuovi]!);
  };
  const finisciNuovi = () => { sale = false; generati++; scriviPasso(); scriviBottone(); sporco = true; };
  const scegliPassi = (n: number) => { passiNuovi = n; passiB.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.passi) === n))); };
  passiB.forEach(b => b.addEventListener('click', () => scegliPassi(Number(b.dataset.passi))));
  scegliPassi(passiNuovi);
  genera.addEventListener('click', () => {
    inMoto = false;
    racconto = null;
    tappe.forEach(t => t.classList.remove('attiva'));
    nuovi = new Float32Array(N_NUOVI * 2);
    for (let i = 0; i < N_NUOVI * 2; i++) nuovi[i] = gauss();
    tempiNuovi = [...Array.from({ length: passiNuovi }, (_, k) => Math.round(T - (k * T) / passiNuovi)), 0];
    kNuovi = 0;
    calcolaFrecce(tempiNuovi[0]!);
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
    else if (!m.passi && !inMoto && !racconto) { testo = 'watch one step, slowly'; el = unPasso; }
    else if (!inMoto && !racconto && m.passi < 50) { testo = 'now train for thousands of steps'; el = gioca; }
    else if (!inMoto && !sale && !generati && m.passi >= 50 && !racconto) { testo = 'now generate new points'; el = genera; }
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
  cursore.value = String(tMax);
  scriviRumore();
  azzeraTutto();

  const ciclo = (ora: number) => {
    requestAnimationFrame(ciclo);
    // Si allena solo quando si vede: tanti passi quanti stanno in 12 ms, così la pagina resta fluida
    if (inMoto && visibile) {
      const fineTempo = performance.now() + 12;
      do allenaUno(); while (performance.now() < fineTempo && m.passi < FINE);
      if (m.passi >= FINE) { inMoto = false; racconto = null; tappe.forEach(t => t.classList.remove('attiva')); }
      else if (!racconto || ora - racconto.inizio > racconto.durata) nuovoRacconto(RACCONTO_VELOCE, false);
      if (ora - oraFrecce > OGNI_FRECCE || m.passi >= FINE) calcolaFrecce(T_ALLENA);
      scriviBottone(); scriviErrore(); disegnaCurva();
      sporco = true;
    }
    // Il racconto: l'ipotesi arriva alla sua tappa; alla fine del passo lento i pesi si correggono davvero
    if (racconto) {
      const r = racconto, f = calmo ? 1 : (ora - r.inizio) / r.durata;
      if (f >= TAPPE[2]! && !r.guess) indovina(r);
      let attiva = 0;
      TAPPE.forEach((q, i) => { if (f >= q) attiva = i; });
      tappe.forEach((t, i) => t.classList.toggle('attiva', i === attiva));
      sporco = true;
      if (r.unPasso && f >= 1) {
        allenaUno();
        calcolaFrecce(T_ALLENA);
        racconto = null;
        tappe.forEach(t => t.classList.remove('attiva'));
        scriviBottone(); scriviErrore(); disegnaCurva();
      }
    }
    // Inference: un passo alla volta, nello stesso tempo qualunque sia il numero di passi
    if (sale && nuovi) {
      const voluto = Math.min(passiNuovi, Math.floor(((ora - inizioNuovi) / DURATA_NUOVI) * passiNuovi) + 1);
      if (kNuovi < voluto) avanzaNuovi();
      sporco = true;
      scriviPasso();
      if (ora - inizioNuovi >= DURATA_NUOVI) finisciNuovi();
    }
    if (W && visibile) aggiornaTag();
    if (!sporco || !W || !visibile) return;
    sporco = false;
    disegna(ora);
  };
  requestAnimationFrame(ciclo);
}
