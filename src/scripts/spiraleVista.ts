import { abar, allena, daDisegno, gauss, indietro, nuovoModello, punti, stella, stima, T, type Modello } from '../lib/spirale';

// Vista della forma: un modello di diffusion che si allena nel browser, raccontato un punto alla volta.
// Un racconto: prendi un punto vero, sporcalo passo dopo passo, la rete indovina il punto pulito, la distanza è l'errore, i pesi si correggono.
// Inference: punti nuovi partono dal rumore e arrivano sulla forma.
const N_DATI = 1024, N_NUOVI = 300, GRUPPO = 64, FINE = 8000, RALLENTA = 5500, MONDO = 1.65, DURATA_NUOVI = 3200, RACCONTO_LENTO = 6000, RACCONTO_VELOCE = 1100;
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

  let dati = punti(N_DATI), forma = 'spiral', tratti: number[][] = [], corrente: number[] | null = null, tMax = T;
  let m: Modello = nuovoModello(), inMoto = false, sporco = true, visibile = false, storia: number[] = [], somma = 0, conta = 0, generati = 0, spiegaEl: HTMLElement | null = null;
  let nuovi: Float32Array | null = null, sale = false, inizioNuovi = 0, kNuovi = 0, passiNuovi = 20, tempiNuovi: number[] = [];
  let racconto: Racconto | null = null;

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
    const n = r.cammino.length, x = r.cammino[n - 2]!, y = r.cammino[n - 1]!, a = abar[r.t]!, sa = Math.sqrt(a), sb = Math.sqrt(1 - a), [e0, e1] = stima(m, x, y, r.t);
    const lim = (v: number) => Math.max(-MONDO, Math.min(MONDO, v));
    r.guess = [lim((x - sb * e0) / sa), lim((y - sb * e1) / sa)];
    const veri0 = (x - sa * r.vero[0]) / sb, veri1 = (y - sa * r.vero[1]) / sb;
    r.errore = ((e0 - veri0) ** 2 + (e1 - veri1) ** 2) / 2;
  }

  // --- Disegno
  let W = 0, H = 0, Wp = 0;
  const piano = () => {
    const sinistra = innerWidth > 760 ? Wp + 16 : 0, destra = innerWidth > 760 ? 100 : 0, libero = W - sinistra - destra, S = Math.min(libero, H) / 2 / MONDO;
    return { S, cx: sinistra + libero / 2, cy: H / 2 };
  };
  function disegna(ora: number) {
    const { S, cx, cy } = piano(), d = devicePixelRatio, px = (x: number) => cx + S * x, py = (y: number) => cy - S * y;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, W, H);
    c.strokeStyle = LINE;
    c.lineWidth = 1;
    c.strokeRect(px(-MONDO), py(MONDO), 2 * MONDO * S, 2 * MONDO * S);
    // La forma vera. In inference sparisce: i punti nuovi nascono solo dai pesi
    if (!nuovi) {
      c.fillStyle = BLU;
      c.globalAlpha = racconto ? 0.4 : 1;
      for (let i = 0; i < dati.length / 2; i++) c.fillRect(px(dati[i * 2]!) - 1, py(dati[i * 2 + 1]!) - 1, 2, 2);
      c.globalAlpha = 1;
    }
    if (corrente) {
      c.strokeStyle = BLU;
      c.lineWidth = 2;
      c.lineJoin = c.lineCap = 'round';
      c.beginPath();
      for (let i = 0; i + 1 < corrente.length; i += 2) { if (i) c.lineTo(px(corrente[i]!), py(corrente[i + 1]!)); else c.moveTo(px(corrente[i]!), py(corrente[i + 1]!)); }
      c.stroke();
      c.lineWidth = 1;
    }
    if (nuovi) {
      c.fillStyle = FG;
      for (let i = 0; i < N_NUOVI; i++) c.fillRect(px(nuovi[i * 2]!) - 1.5, py(nuovi[i * 2 + 1]!) - 1.5, 3, 3);
    } else if (racconto) {
      const r = racconto, f = calmo ? 1 : Math.min(1, (ora - r.inizio) / r.durata), passi = (r.cammino.length / 2) - 1, visti = Math.round(Math.min(1, Math.max(0, (f - TAPPE[1]!) / (TAPPE[2]! - TAPPE[1]!))) * passi);
      // Il punto vero
      c.strokeStyle = FG;
      c.lineWidth = 2;
      c.beginPath(); c.arc(px(r.vero[0]), py(r.vero[1]), 6, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 1.5;
      // Il rumore, un passo dopo l'altro
      c.strokeStyle = ARANCIO;
      c.beginPath();
      for (let k = 0; k <= visti; k++) { const x = px(r.cammino[k * 2]!), y = py(r.cammino[k * 2 + 1]!); if (k) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
      const qx = px(r.cammino[visti * 2]!), qy = py(r.cammino[visti * 2 + 1]!);
      c.fillStyle = ARANCIO;
      c.fillRect(qx - 3, qy - 3, 6, 6);
      // L'ipotesi della rete: dove crede che fosse il punto pulito
      if (f >= TAPPE[2]! && r.guess) {
        const u = Math.min(1, (f - TAPPE[2]!) / (TAPPE[3]! - TAPPE[2]!)), gx = px(r.guess[0]), gy = py(r.guess[1]), ex = qx + (gx - qx) * u, ey = qy + (gy - qy) * u;
        c.strokeStyle = FG;
        c.beginPath(); c.moveTo(qx, qy); c.lineTo(ex, ey); c.stroke();
        c.fillStyle = FG;
        c.fillRect(ex - 3, ey - 3, 6, 6);
        // La distanza dal punto vero è l'errore
        if (f >= TAPPE[3]!) {
          c.setLineDash([3, 3]);
          c.beginPath(); c.moveTo(gx, gy); c.lineTo(px(r.vero[0]), py(r.vero[1])); c.stroke();
          c.setLineDash([]);
          c.font = `12px ${stile.getPropertyValue('--mono') || 'monospace'}`;
          c.textAlign = 'left';
          c.fillText(`error ${r.errore.toFixed(2)}`, (gx + px(r.vero[0])) / 2 + 8, (gy + py(r.vero[1])) / 2 - 8);
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
    cc.fillText(`${FINE / 1000}k training steps`, w, h - 2);
    cc.textAlign = 'left';
    cc.fillText('0', sx, h - 2);
    cc.strokeStyle = ARANCIO;
    cc.beginPath();
    storia.forEach((v, i) => { const x = sx + (((i + 1) * 100) / FINE) * (w - sx); if (i) cc.lineTo(x, y(v)); else cc.moveTo(x, y(v)); });
    cc.stroke();
  }

  // --- Training
  const allenaUno = () => {
    somma += allena(m, dati, GRUPPO, m.passi < RALLENTA ? 3e-3 : 1e-3, tMax);
    if (++conta === 100) { storia.push(somma / conta); somma = conta = 0; }
  };
  const scriviBottone = () => {
    scrivi(gioca, inMoto ? 'pause' : m.passi >= FINE ? 'done' : m.passi ? 'resume' : 'train');
    gioca.dataset.stato = inMoto ? 'pausa' : 'via';
    gioca.disabled = m.passi >= FINE || !dati.length;
    unPasso.disabled = inMoto || m.passi >= FINE || !dati.length || !!racconto?.unPasso;
    azzera.hidden = !m.passi;
    genera.disabled = !m.passi || sale;
  };
  const scriviErrore = () => scrivi(letturaE, m.passi ? `${m.passi.toLocaleString('en')} steps${storia.length ? ` · error ${storia[storia.length - 1]!.toFixed(2)}` : ''}` : '');
  const azzeraTutto = () => {
    inMoto = false; m = nuovoModello(); storia = []; somma = conta = 0; nuovi = null; sale = false; generati = 0; racconto = null; scrivi(lettura, '');
    tappe.forEach(t => t.classList.remove('attiva'));
    scriviBottone(); scriviErrore(); disegnaCurva(); sporco = true;
  };
  gioca.addEventListener('click', () => { inMoto = !inMoto; nuovi = null; scrivi(lettura, ''); if (!inMoto) { racconto = null; tappe.forEach(t => t.classList.remove('attiva')); } sporco = true; scriviBottone(); });
  unPasso.addEventListener('click', () => { nuovi = null; scrivi(lettura, ''); nuovoRacconto(RACCONTO_LENTO, true); scriviBottone(); sporco = true; });
  azzera.addEventListener('click', azzeraTutto);

  // --- Quanto rumore vede la rete. Cambia cosa impara, quindi il training riparte
  const scriviRumore = () => scrivi(letturaR, `up to ${Math.round(Math.sqrt(1 - abar[tMax]!) * 100)}% noise`);
  cursore.addEventListener('input', () => { tMax = Number(cursore.value); scriviRumore(); azzeraTutto(); });

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
    racconto = null;
    tappe.forEach(t => t.classList.remove('attiva'));
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
        racconto = null;
        tappe.forEach(t => t.classList.remove('attiva'));
        scriviBottone(); scriviErrore(); disegnaCurva();
      }
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
    disegna(ora);
  };
  requestAnimationFrame(ciclo);
}
