import { caricaModello, genera, LATO, rumorePuro, type Generazione, type Modello } from '../lib/diffusione';

// Vista del modello di diffusion: ogni pixel della faccia è un punto su una griglia a filo, alto quanto il suo valore.
// Il rumore è una nuvola sparsa; a ogni passo i punti si avvicinano all'ipotesi della rete, finché resta una faccia in rilievo.
const D = LATO * LATO, ALTEZZA = 0.42, PIATTO = 0.78, DURATA_PASSO = 110, DURATA_MIN = 2200, RICORDI = 6;
const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };
const misto = (a: string, b: string, t: number) => { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i]! - v) * t)).join(',')})`; };
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function monta(radice: HTMLElement) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const scrivi = (el: Element, t: string) => { if (el.textContent !== t) el.textContent = t; };
  const BG = tono('--bg'), MUTED = tono('--muted'), LINE = tono('--line'), ARANCIO = tono('--arancio');
  const [bR, bG, bB] = rgb(BG), [oR, oG, oB] = rgb(ARANCIO);
  const TINTE = Array.from({ length: 8 }, (_, k) => misto(MUTED, ARANCIO, k / 7));
  const tela = $<HTMLCanvasElement>('.tela-griglia'), t = tela.getContext('2d')!;
  const telaOra = $<HTMLCanvasElement>('.mini-ora'), telaIpotesi = $<HTMLCanvasElement>('.mini-ipotesi');
  const gioca = $<HTMLButtonElement>('.gioca'), cursore = $<HTMLInputElement>('.cursore-tempo'), lettura = $<HTMLElement>('.lettura'), ricordi = $<HTMLElement>('.ricordi');
  const passiB = radice.querySelectorAll<HTMLButtonElement>('[data-passi]');
  const tagPunto = document.querySelector<HTMLElement>('.tag-punto')!, tagConsiglio = document.querySelector<HTMLElement>('.tag-consiglio')!, pannello = $<HTMLElement>('.pannello'), notaTel = $<HTMLElement>('.nota-tel');

  let modello: Modello | null = null, gen: Generazione | null = null, passi = 20, pos = 0, inMoto = false, ultimo = 0, sporco = true, giro = 0.14, gira = false, xPrima = 0, spiegaEl: HTMLElement | null = null;
  let usatoCursore = false, generate = 0, durata = DURATA_MIN;
  let attuale = rumorePuro(), ipotesi = new Float32Array(D).fill(-1);

  // --- Griglia
  let W = 0, H = 0, Wp = 0;
  const piano = () => {
    const sinistra = innerWidth > 760 ? Wp : 0, libero = W - sinistra - (innerWidth > 760 ? 24 : 0);
    const S = Math.min(libero / 2.95, H / (2 * Math.SQRT2 * PIATTO + ALTEZZA * 1.5));
    return { S, cx: sinistra + libero / 2, cy: H / 2 + (S * ALTEZZA) / 2, co: Math.cos(giro), si: Math.sin(giro) };
  };
  const sx = new Float32Array(D), sy = new Float32Array(D), alte = new Float32Array(D);
  function disegnaGriglia() {
    const { S, cx, cy, co, si } = piano();
    t.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    t.clearRect(0, 0, W, H);
    const px = (u: number, v: number, h: number) => [cx + S * (u * co + v * si), cy - S * (-u * si + v * co) * PIATTO - S * h * ALTEZZA] as const;
    // Base: il pavimento a filo, ferma, per capire dove sta il pixel
    t.strokeStyle = LINE;
    t.lineWidth = 1;
    t.beginPath();
    for (let k = 0; k <= LATO; k++) {
      const a = -1 + (2 * k) / LATO;
      let [x, y] = px(a, 1, 0); t.moveTo(x, y); [x, y] = px(a, -1, 0); t.lineTo(x, y);
      [x, y] = px(-1, a, 0); t.moveTo(x, y); [x, y] = px(1, a, 0); t.lineTo(x, y);
    }
    t.stroke();
    for (let r = 0; r < LATO; r++) for (let q = 0; q < LATO; q++) {
      const i = r * LATO + q, u = -1 + (2 * (q + 0.5)) / LATO, v = 1 - (2 * (r + 0.5)) / LATO, h = Math.max(-0.5, Math.min(1.5, (attuale[i]! + 1) / 2)), [x, y] = px(u, v, h);
      sx[i] = x; sy[i] = y; alte[i] = h;
    }
    // Rilievo a filo: unisce i punti vicini, così la faccia si legge come una superficie
    t.strokeStyle = misto(LINE, MUTED, 0.45);
    t.beginPath();
    for (let r = 0; r < LATO; r++) for (let q = 0; q < LATO; q++) {
      const i = r * LATO + q;
      if (q < LATO - 1) { t.moveTo(sx[i]!, sy[i]!); t.lineTo(sx[i + 1]!, sy[i + 1]!); }
      if (r < LATO - 1) { t.moveTo(sx[i]!, sy[i]!); t.lineTo(sx[i + LATO]!, sy[i + LATO]!); }
    }
    t.stroke();
    // Punti: dal fondo verso chi guarda. Alti e arancio sono la faccia
    const quadrato = Math.max(3, S / 22);
    const ordine = Array.from({ length: D }, (_, i) => i).sort((a, b) => sy[a]! - sy[b]!);
    for (const i of ordine) {
      const h = Math.max(0, Math.min(1, alte[i]!)), s = quadrato * (0.65 + 0.55 * h);
      t.fillStyle = TINTE[Math.round(h * 7)]!;
      t.fillRect(sx[i]! - s / 2, sy[i]! - s / 2, s, s);
    }
  }
  // Mini-immagine: dal nero all'arancio
  const foglio = document.createElement('canvas');
  foglio.width = foglio.height = LATO;
  const cf = foglio.getContext('2d')!, img = cf.createImageData(LATO, LATO);
  function mini(c: HTMLCanvasElement, dati: Float32Array) {
    const w = c.clientWidth, d = devicePixelRatio;
    if (c.width !== w * d) { c.width = c.height = w * d; }
    for (let k = 0; k < D; k++) {
      const a = Math.max(0, Math.min(1, (dati[k]! + 1) / 2)) * 0.95;
      img.data[k * 4] = bR + (oR - bR) * a; img.data[k * 4 + 1] = bG + (oG - bG) * a; img.data[k * 4 + 2] = bB + (oB - bB) * a; img.data[k * 4 + 3] = 255;
    }
    cf.putImageData(img, 0, 0);
    const x = c.getContext('2d')!;
    x.imageSmoothingEnabled = false;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.drawImage(foglio, 0, 0, c.width, c.height);
  }

  // --- Generazione e tempo
  const miscela = (lista: Float32Array[], f: number, fuori: Float32Array) => {
    const a = Math.min(lista.length - 1, Math.floor(f)), b = Math.min(lista.length - 1, a + 1), k = f - a, p = lista[a]!, q = lista[b]!;
    for (let i = 0; i < D; i++) fuori[i] = p[i]! + (q[i]! - p[i]!) * k;
    return fuori;
  };
  const vaiA = (f: number) => {
    if (!gen) return;
    pos = Math.max(0, Math.min(1, f));
    const u = pos * passi;
    miscela(gen.stati, u, attuale);
    miscela(gen.ipotesi, u, ipotesi);
    cursore.value = String(Math.round(pos * 1000));
    sporco = true;
  };
  const scriviTempo = () => {
    if (!gen) { scrivi(lettura, 'pure noise'); return; }
    const u = pos * passi, k = Math.min(passi - 1, Math.floor(u)), rumore = u >= passi ? 0 : gen.rumore[k]! + (gen.rumore[k + 1]! - gen.rumore[k]!) * (u - k);
    scrivi(lettura, `step ${Math.round(u)} of ${passi} · noise ${Math.round(rumore * 100)}%`);
  };
  const metti = (si: boolean) => { inMoto = si; scrivi(gioca, si ? 'generating' : 'generate'); gioca.disabled = si || !modello; };
  const nuova = (partenza: Float32Array) => {
    if (!modello) return;
    gen = genera(modello, passi, partenza);
    durata = Math.max(DURATA_MIN, passi * DURATA_PASSO);
    attuale = gen.stati[0]!.slice();
    ipotesi = gen.ipotesi[0]!.slice();
    pos = 0;
    generate++;
    if (calmo) { vaiA(1); ricorda(); return; }
    vaiA(0);
    ultimo = performance.now();
    metti(true);
  };
  gioca.addEventListener('click', () => nuova(rumorePuro()));
  const scegliPassi = (n: number) => {
    passi = n;
    passiB.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.passi) === n)));
    // Stesso rumore di prima con un altro numero di passi: si vede cosa cambia
    if (gen) nuova(gen.stati[0]!);
  };
  passiB.forEach(b => b.addEventListener('click', () => scegliPassi(Number(b.dataset.passi))));
  cursore.addEventListener('input', () => { metti(false); usatoCursore = true; vaiA(Number(cursore.value) / 1000); });

  // Le ultime facce: un clic rifà la stessa generazione dallo stesso rumore
  const storia: Float32Array[] = [];
  function ricorda() {
    if (!gen) return;
    const partenza = gen.stati[0]!, finale = gen.stati[gen.stati.length - 1]!;
    if (storia.includes(partenza)) return;
    storia.unshift(partenza);
    storia.splice(RICORDI);
    const b = document.createElement('button'), c = document.createElement('canvas');
    b.type = 'button';
    b.setAttribute('aria-label', 'Replay this face');
    b.dataset.spiega = 'Replay this face from the same noise. Same noise, same face.';
    b.append(c);
    b.addEventListener('click', () => nuova(partenza));
    ricordi.prepend(b);
    while (ricordi.children.length > RICORDI) ricordi.lastElementChild!.remove();
    mini(c, finale);
  }

  // --- Tag
  const posa = (tag: HTMLElement, q: DOMRect, fuoriDa?: DOMRect) => {
    const w = tag.offsetWidth, h = tag.offsetHeight, vw = innerWidth, vh = innerHeight;
    let x: number, y: number;
    if (vw <= 760) { x = Math.max(8, Math.min(vw - w - 8, q.left)); y = q.bottom + 6 + h > vh ? q.top - h - 6 : q.bottom + 6; }
    else {
      const destra = fuoriDa ? fuoriDa.right : q.right;
      x = destra + 10 + w < vw - 8 ? destra + 10 : Math.max(8, q.left - w - 10);
      y = Math.max(8, Math.min(vh - h - 8, (q.top + q.bottom) / 2 - h / 2));
    }
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
    if (modello && !generate) { testo = 'press generate to start from pure noise'; el = gioca; }
    else if (modello && !inMoto && generate === 1 && !usatoCursore) { testo = 'drag time to go back through the steps'; el = cursore; }
    const q = el?.getBoundingClientRect(), mostra = !!testo && !!q && tagPunto.hidden && q.bottom > 0 && q.top < innerHeight;
    metti2(tagConsiglio, mostra ? testo : '');
    if (mostra) posa(tagConsiglio, q!, dalPannello(el!));
    // Su telefono i tag coprirebbero i grafici: lo stesso testo va nella riga sotto la scena
    if (matchMedia('(max-width: 760px)').matches) {
      const testoTel = !tagPunto.hidden ? tagPunto.textContent : !tagConsiglio.hidden ? tagConsiglio.textContent : '';
      if (notaTel.textContent !== testoTel) notaTel.textContent = testoTel;
    }
  }

  // --- Girare la griglia col trascinamento
  tela.addEventListener('pointerdown', e => { gira = true; xPrima = e.clientX; tela.setPointerCapture(e.pointerId); });
  tela.addEventListener('pointermove', e => { if (gira) { giro -= (e.clientX - xPrima) * 0.008; xPrima = e.clientX; sporco = true; } });
  const fine = () => { gira = false; };
  tela.addEventListener('pointerup', fine);
  tela.addEventListener('pointercancel', fine);

  const misura = () => {
    W = tela.clientWidth; H = tela.clientHeight; Wp = innerWidth > 760 ? pannello.offsetWidth : 0;
    tela.width = W * devicePixelRatio; tela.height = H * devicePixelRatio;
    sporco = true;
  };
  new ResizeObserver(misura).observe(tela);
  misura();
  scegliPassi(20);
  metti(false);
  gioca.disabled = true;
  scrivi(gioca, 'loading');
  caricaModello('/learn/facce.bin').then(m => { modello = m; metti(false); sporco = true; }).catch(() => { scrivi(gioca, 'could not load'); });
  document.fonts?.ready.then(() => { sporco = true; });

  const ciclo = (ora: number) => {
    requestAnimationFrame(ciclo);
    if (inMoto) {
      const dt = ora - ultimo;
      ultimo = ora;
      vaiA(pos + dt / durata);
      if (pos >= 1) { metti(false); ricorda(); }
    }
    if (W) aggiornaTag();
    if (!sporco || !W) return;
    sporco = false;
    disegnaGriglia();
    mini(telaOra, attuale);
    mini(telaIpotesi, ipotesi);
    scriviTempo();
  };
  requestAnimationFrame(ciclo);
}
