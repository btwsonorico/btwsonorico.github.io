import { caricaModello, D, LATO, passo, quotaRumore, rumorePuro, sporca, stima, tempiDi, type Modello } from '../lib/cifre';

// Vista delle cifre. Training: un esempio vero viene sporcato e la rete vera stima il rumore. Inference: dal puro rumore alla cifra chiesta.
// Nella griglia ogni pixel è un blocco, alto e chiaro quanto il suo valore.
const ALTEZZA = 0.1, PIATTO = 0.6, DURATA_MIN = 1600, RICORDI = 6, ESEMPI_PER_CIFRA = 3, CAMBIO_ESEMPIO = 2200;
const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };
const misto = (a: string, b: string, t: number) => { const A = rgb(a), B = rgb(b); return `#${A.map((v, i) => Math.round(v + (B[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`; };
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function monta(radice: HTMLElement) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const scrivi = (el: Element, t: string) => { if (el.textContent !== t) el.textContent = t; };
  const BG = tono('--bg'), LINE = tono('--line'), ARANCIO = tono('--arancio');
  const [bR, bG, bB] = rgb(BG), [oR, oG, oB] = rgb(ARANCIO);
  const SOPRA = Array.from({ length: 16 }, (_, k) => misto(misto(BG, LINE, 0.7), ARANCIO, k / 15)), LATI = SOPRA.map(c => misto(c, BG, 0.55));
  const tela = $<HTMLCanvasElement>('.tela-griglia'), t = tela.getContext('2d')!, telaOra = $<HTMLCanvasElement>('.mini-ora');
  const telaVera = $<HTMLCanvasElement>('.mini-vera'), telaSporca = $<HTMLCanvasElement>('.mini-sporca'), telaStima = $<HTMLCanvasElement>('.mini-stima');
  const gioca = $<HTMLButtonElement>('.gioca'), ricordi = $<HTMLElement>('.ricordi'), lettura = $<HTMLElement>('.lettura-passo'), cifreB = radice.querySelectorAll<HTMLButtonElement>('[data-cifra]'), passiB = radice.querySelectorAll<HTMLButtonElement>('[data-passi]');
  const tagPunto = $<HTMLElement>('.tag-punto'), tagConsiglio = $<HTMLElement>('.tag-consiglio'), pannello = $<HTMLElement>('.pannello'), notaTel = $<HTMLElement>('.nota-tel');

  let modello: Modello | null = null, esempi: Uint8Array | null = null, cifra = 7, inMoto = false, prossimo = 0, sporco = true, giro = 0.42, gira = false, xPrima = 0, spiegaEl: HTMLElement | null = null, visibile = false;
  let generate = 0, prossimoEsempio = 0, giroEsempio = 0, passi = 20, tempi = tempiDi(passi), stati: Float32Array[] = [], cifraGen = cifra;
  let attuale: Float32Array = new Float32Array(D).fill(-1);

  // --- Griglia
  let W = 0, H = 0, Wp = 0;
  const piano = () => {
    const sinistra = innerWidth > 760 ? Wp : 0, libero = W - sinistra - (innerWidth > 760 ? 24 : 0);
    const S = Math.min(libero / 2.95, (H - 24) / (2 * Math.SQRT2 * PIATTO + ALTEZZA * 1.5));
    return { S, cx: sinistra + libero / 2, cy: H / 2 + 12 + (S * ALTEZZA) / 2, co: Math.cos(giro), si: Math.sin(giro) };
  };
  const profondo = new Float32Array(D), ordine = Array.from({ length: D }, (_, i) => i);
  function disegnaGriglia() {
    const { S, cx, cy, co, si } = piano(), M = 1 / LATO;
    t.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    t.clearRect(0, 0, W, H);
    t.fillStyle = tono('--muted');
    t.font = `11px ${stile.getPropertyValue('--mono') || 'monospace'}`;
    t.textAlign = 'center';
    t.fillText('this whole grid is one result: 784 pixels', cx, 12);
    const px = (u: number, v: number, h: number) => [cx + S * (u * co + v * si), cy - S * (-u * si + v * co) * PIATTO - S * h * ALTEZZA] as const;
    const faccia = (p: readonly (readonly [number, number])[], colore: string) => {
      t.fillStyle = colore;
      t.beginPath();
      p.forEach(([x, y], k) => { if (k) t.lineTo(x, y); else t.moveTo(x, y); });
      t.closePath();
      t.fill();
      t.stroke();
    };
    const centro = (i: number) => [-1 + (2 * ((i % LATO) + 0.5)) / LATO, 1 - (2 * (Math.floor(i / LATO) + 0.5)) / LATO] as const;
    for (let i = 0; i < D; i++) { const [u, v] = centro(i); profondo[i] = -u * si + v * co; }
    // Dal fondo verso chi guarda: ogni blocco copre quelli dietro
    ordine.sort((a, b) => profondo[b]! - profondo[a]!);
    t.strokeStyle = BG;
    t.lineWidth = 0.5;
    t.lineJoin = 'round';
    const angoli = [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const;
    for (const i of ordine) {
      const [u, v] = centro(i), h = Math.max(0, Math.min(1, (attuale[i]! + 1) / 2)), k = Math.round(h * 15);
      const giu = angoli.map(([a, b]) => px(u + a * M, v + b * M, 0)), su = angoli.map(([a, b]) => px(u + a * M, v + b * M, h));
      for (let e = 0; e < 4; e++) { const f = (e + 1) % 4; faccia([giu[e]!, giu[f]!, su[f]!, su[e]!], LATI[k]!); }
      faccia(su, SOPRA[k]!);
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

  // --- Training: la rete vera su un esempio vero, sempre diverso
  function mostraEsempio() {
    if (!modello || !esempi) return;
    const k = (cifra * ESEMPI_PER_CIFRA + giroEsempio % ESEMPI_PER_CIFRA) * D, vera = Float32Array.from(esempi.subarray(k, k + D), v => v / 127.5 - 1);
    const passoT = 15 + (giroEsempio * 23) % 70, x = sporca(vera, passoT);
    mini(telaVera, vera);
    mini(telaSporca, x);
    mini(telaStima, stima(modello, x, passoT, cifra));
    giroEsempio++;
  }

  // --- Inference
  const scriviPasso = (k: number) => scrivi(lettura, k >= passi ? 'finished' : `step ${k} of ${passi} · ${Math.round(quotaRumore(tempi[k]!) * 100)}% noise left`);
  const metti = (si: boolean) => { inMoto = si; scrivi(gioca, si ? 'generating' : `generate a ${cifra}`); gioca.disabled = si || !modello; };
  const nuova = (partenza: Float32Array, c: number) => {
    if (!modello) return;
    tempi = tempiDi(passi);
    stati = [partenza];
    cifraGen = c;
    generate++;
    attuale = partenza;
    sporco = true;
    scriviPasso(0);
    if (calmo) { for (let k = 0; k < passi; k++) stati.push(passo(modello, stati[k]!, tempi[k]!, tempi[k + 1]!, c).nuovo); attuale = stati[passi]!; scriviPasso(passi); ricorda(); return; }
    prossimo = performance.now();
    metti(true);
  };
  gioca.addEventListener('click', () => nuova(rumorePuro(), cifra));
  const scegliPassi = (n: number) => {
    passi = n;
    passiB.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.passi) === n)));
    // Stesso rumore con un altro numero di step: si vede cosa cambia
    if (stati.length && !inMoto) nuova(stati[0]!, cifraGen);
  };
  passiB.forEach(b => b.addEventListener('click', () => scegliPassi(Number(b.dataset.passi))));
  const scegliCifra = (n: number) => {
    cifra = n;
    cifreB.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.cifra) === n)));
    if (!inMoto && modello) scrivi(gioca, `generate a ${n}`);
    prossimoEsempio = 0;
  };
  cifreB.forEach(b => b.addEventListener('click', () => scegliCifra(Number(b.dataset.cifra))));

  // Le ultime immagini: un clic rifà la stessa generazione dallo stesso rumore
  const storia: Float32Array[] = [];
  function ricorda() {
    const partenza = stati[0]!, finale = stati[stati.length - 1]!, c = cifraGen;
    if (storia.includes(partenza)) return;
    storia.unshift(partenza);
    storia.splice(RICORDI);
    const b = document.createElement('button'), tl = document.createElement('canvas');
    b.type = 'button';
    b.setAttribute('aria-label', `Replay this ${c}`);
    b.dataset.spiega = 'Same noise, same image.';
    b.append(tl);
    b.addEventListener('click', () => { if (!inMoto) nuova(partenza, c); });
    ricordi.prepend(b);
    while (ricordi.children.length > RICORDI) ricordi.lastElementChild!.remove();
    mini(tl, finale);
  }

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
    const testo = modello && !generate ? 'pick a digit and generate it' : '', q = gioca.getBoundingClientRect(), mostra = !!testo && tagPunto.hidden && q.bottom > 0 && q.top < innerHeight;
    metti2(tagConsiglio, mostra ? testo : '');
    if (mostra) posa(tagConsiglio, q, dalPannello(gioca));
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
  new IntersectionObserver(v => { visibile = v.some(x => x.isIntersecting); if (visibile) sporco = true; }, { rootMargin: '60px' }).observe(tela);
  misura();
  passiB.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.passi) === passi)));
  scegliCifra(cifra);
  gioca.disabled = true;
  scrivi(gioca, 'loading');
  Promise.all([caricaModello('/learn/cifre.bin'), fetch('/learn/cifre-esempi.bin').then(r => r.arrayBuffer())])
    .then(([m, e]) => { modello = m; esempi = new Uint8Array(e); metti(false); sporco = true; })
    .catch(() => { scrivi(gioca, 'could not load'); });
  document.fonts?.ready.then(() => { sporco = true; });

  const ciclo = (ora: number) => {
    requestAnimationFrame(ciclo);
    // Un passo della rete alla volta, così si vede l'immagine pulirsi davvero
    if (inMoto && ora >= prossimo) {
      const k = stati.length - 1;
      attuale = stati[k]!;
      sporco = true;
      scriviPasso(k);
      if (k >= passi) { metti(false); ricorda(); }
      else { stati.push(passo(modello!, stati[k]!, tempi[k]!, tempi[k + 1]!, cifraGen).nuovo); prossimo = ora + Math.max(40, DURATA_MIN / passi); }
    }
    // L'esempio di training cambia da solo, ma mai mentre la rete sta generando
    if (visibile && !inMoto && modello && esempi && ora >= prossimoEsempio) {
      mostraEsempio();
      prossimoEsempio = ora + (calmo ? 1e9 : CAMBIO_ESEMPIO);
    }
    if (W && visibile) aggiornaTag();
    if (!sporco || !W || !visibile) return;
    sporco = false;
    disegnaGriglia();
    mini(telaOra, attuale);
  };
  requestAnimationFrame(ciclo);
}
