import { caricaModello, D, LATO, passo, quotaRumore, rumorePuro, tempiDi, type Modello } from '../lib/cifre';

// Vista del modello sulle cifre: ogni pixel è un blocco, alto e chiaro quanto il suo valore.
// Il rumore è un terreno a caso; a ogni passo i blocchi si avvicinano all'ipotesi della rete, finché resta la cifra in rilievo.
const ALTEZZA = 0.1, GIRO_MAX = 1, PIATTO = 0.78, DURATA_MIN = 1600, RICORDI = 6;
const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };
const misto = (a: string, b: string, t: number) => { const A = rgb(a), B = rgb(b); return `#${A.map((v, i) => Math.round(v + (B[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`; };
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Generazione = { stati: Float32Array[]; ipotesi: Float32Array[]; rumori: Float32Array[]; rumore: number[]; tempi: number[]; cifra: number };

export function monta(radice: HTMLElement) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const scrivi = (el: Element, t: string) => { if (el.textContent !== t) el.textContent = t; };
  const BG = tono('--bg'), LINE = tono('--line'), ARANCIO = tono('--arancio');
  const [bR, bG, bB] = rgb(BG), [oR, oG, oB] = rgb(ARANCIO);
  const SOPRA = Array.from({ length: 16 }, (_, k) => misto(misto(BG, LINE, 0.7), ARANCIO, k / 15)), LATI = SOPRA.map(c => misto(c, BG, 0.55));
  const tela = $<HTMLCanvasElement>('.tela-griglia'), t = tela.getContext('2d')!;
  const telaOra = $<HTMLCanvasElement>('.mini-ora'), telaIpotesi = $<HTMLCanvasElement>('.mini-ipotesi'), telaRumore = $<HTMLCanvasElement>('.mini-rumore'), formulaOra = $<HTMLElement>('.f-ora'), formulaDopo = $<HTMLElement>('.f-dopo');
  const gioca = $<HTMLButtonElement>('.gioca'), cursore = $<HTMLInputElement>('.cursore-tempo'), lettura = $<HTMLElement>('.lettura'), ricordi = $<HTMLElement>('.ricordi');
  const passiB = radice.querySelectorAll<HTMLButtonElement>('[data-passi]'), cifreB = radice.querySelectorAll<HTMLButtonElement>('[data-cifra]');
  const tagPunto = $<HTMLElement>('.tag-punto'), tagConsiglio = $<HTMLElement>('.tag-consiglio'), pannello = $<HTMLElement>('.pannello'), notaTel = $<HTMLElement>('.nota-tel');

  let modello: Modello | null = null, gen: Generazione | null = null, passi = 20, cifra = 7, pos = 0, inMoto = false, prossimo = 0, sporco = true, giro = 0.14, gira = false, xPrima = 0, spiegaEl: HTMLElement | null = null, visibile = false;
  let usatoCursore = false, generate = 0, attesa = 100;
  let attuale = rumorePuro(), ipotesi = new Float32Array(D).fill(-1), trovato = attuale.slice();

  // --- Griglia
  let W = 0, H = 0, Wp = 0;
  const piano = () => {
    const sinistra = innerWidth > 760 ? Wp : 0, libero = W - sinistra - (innerWidth > 760 ? 24 : 0);
    const S = Math.min(libero / 2.95, H / (2 * Math.SQRT2 * PIATTO + ALTEZZA * 1.5));
    return { S, cx: sinistra + libero / 2, cy: H / 2 + (S * ALTEZZA) / 2, co: Math.cos(giro), si: Math.sin(giro) };
  };
  const profondo = new Float32Array(D), ordine = Array.from({ length: D }, (_, i) => i);
  function disegnaGriglia() {
    const { S, cx, cy, co, si } = piano(), M = 1 / LATO;
    t.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    t.clearRect(0, 0, W, H);
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
  // Mini-immagine: dal nero all'arancio. Per il rumore conta solo la forza: nero vuol dire nessun rumore
  const foglio = document.createElement('canvas');
  foglio.width = foglio.height = LATO;
  const cf = foglio.getContext('2d')!, img = cf.createImageData(LATO, LATO);
  function mini(c: HTMLCanvasElement, dati: Float32Array, soloForza = false) {
    const w = c.clientWidth, d = devicePixelRatio;
    if (c.width !== w * d) { c.width = c.height = w * d; }
    for (let k = 0; k < D; k++) {
      const a = (soloForza ? Math.min(1, Math.abs(dati[k]!) / 1.6) : Math.max(0, Math.min(1, (dati[k]! + 1) / 2))) * 0.95;
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
    const u = Math.min(pos * passi, gen.stati.length - 1);
    miscela(gen.stati, u, attuale);
    miscela(gen.ipotesi, Math.min(u, gen.ipotesi.length - 1), ipotesi);
    miscela(gen.rumori, Math.min(u, gen.rumori.length - 1), trovato);
    cursore.value = String(Math.round(pos * 1000));
    sporco = true;
  };
  const scriviTempo = () => {
    if (!gen) { scrivi(lettura, 'pure noise'); scrivi(formulaOra, 'now  = 0.00 × guess + 1.00 × noise'); scrivi(formulaDopo, 'next: press generate'); return; }
    const u = pos * passi, q = Math.min(passi, Math.round(u)), adesso = gen.rumore[q]!, dopo = gen.rumore[Math.min(passi, q + 1)]!, riga = (n: string, r: number) => `${n} = ${Math.sqrt(1 - r * r).toFixed(2)} × guess + ${r.toFixed(2)} × noise`;
    scrivi(lettura, `step ${q} of ${passi} · noise ${Math.round(adesso * 100)}%`);
    scrivi(formulaOra, riga('now ', adesso));
    scrivi(formulaDopo, riga('next', dopo));
  };
  const metti = (si: boolean) => { inMoto = si; scrivi(gioca, si ? 'generating' : `generate a ${cifra}`); gioca.disabled = si || !modello; cursore.disabled = si; };
  const avanzaPasso = () => {
    const k = gen!.stati.length - 1, { pulita, rumore, nuovo } = passo(modello!, gen!.stati[k]!, gen!.tempi[k]!, gen!.tempi[k + 1]!, gen!.cifra);
    gen!.ipotesi.push(pulita);
    gen!.rumori.push(rumore);
    gen!.stati.push(nuovo);
  };
  const chiudi = () => {
    gen!.ipotesi.push(gen!.stati[passi]!);
    gen!.rumori.push(new Float32Array(D));
    vaiA(1);
    metti(false);
    ricorda();
  };
  const nuova = (partenza: Float32Array, c: number) => {
    if (!modello) return;
    const tempi = tempiDi(passi);
    gen = { stati: [partenza], ipotesi: [], rumori: [], rumore: tempi.map(quotaRumore), tempi, cifra: c };
    attesa = Math.max(40, DURATA_MIN / passi);
    generate++;
    if (calmo) { for (let k = 0; k < passi; k++) avanzaPasso(); chiudi(); return; }
    avanzaPasso();
    vaiA(0);
    prossimo = performance.now();
    metti(true);
  };
  gioca.addEventListener('click', () => nuova(rumorePuro(), cifra));
  const scegliPassi = (n: number) => {
    passi = n;
    passiB.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.passi) === n)));
    // Stesso rumore di prima con un altro numero di passi: si vede cosa cambia
    if (gen && !inMoto) nuova(gen.stati[0]!, gen.cifra);
  };
  const scegliCifra = (n: number) => {
    cifra = n;
    cifreB.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.cifra) === n)));
    if (!inMoto && modello) scrivi(gioca, `generate a ${n}`);
  };
  passiB.forEach(b => b.addEventListener('click', () => scegliPassi(Number(b.dataset.passi))));
  cifreB.forEach(b => b.addEventListener('click', () => scegliCifra(Number(b.dataset.cifra))));
  cursore.addEventListener('input', () => { usatoCursore = true; vaiA(Number(cursore.value) / 1000); });

  // Le ultime immagini: un clic rifà la stessa generazione dallo stesso rumore
  const storia: Float32Array[] = [];
  function ricorda() {
    if (!gen) return;
    const partenza = gen.stati[0]!, finale = gen.stati[gen.stati.length - 1]!, c = gen.cifra;
    if (storia.includes(partenza)) return;
    storia.unshift(partenza);
    storia.splice(RICORDI);
    const b = document.createElement('button'), tl = document.createElement('canvas');
    b.type = 'button';
    b.setAttribute('aria-label', `Replay this ${c}`);
    b.dataset.spiega = 'Replays this image from the same noise. Same noise, same image.';
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
    let testo = '', el: HTMLElement | null = null;
    if (modello && !generate) { testo = 'pick a digit, then generate it from pure noise'; el = gioca; }
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
  tela.addEventListener('pointermove', e => { if (gira) { giro = Math.max(-GIRO_MAX, Math.min(GIRO_MAX, giro - (e.clientX - xPrima) * 0.008)); xPrima = e.clientX; sporco = true; } });
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
  caricaModello('/learn/cifre.bin').then(m => { modello = m; metti(false); sporco = true; }).catch(() => { scrivi(gioca, 'could not load'); });
  document.fonts?.ready.then(() => { sporco = true; });

  const ciclo = (ora: number) => {
    requestAnimationFrame(ciclo);
    // Un passo della rete alla volta, così la pagina resta viva e si vede l'immagine pulirsi davvero
    if (inMoto && ora >= prossimo) {
      const k = gen!.stati.length - 1;
      vaiA(k / passi);
      if (k >= passi) chiudi();
      else { avanzaPasso(); prossimo = ora + attesa; }
    }
    if (W && visibile) aggiornaTag();
    if (!sporco || !W || !visibile) return;
    sporco = false;
    disegnaGriglia();
    mini(telaOra, attuale);
    mini(telaIpotesi, ipotesi);
    mini(telaRumore, trovato, true);
    scriviTempo();
  };
  requestAnimationFrame(ciclo);
}
