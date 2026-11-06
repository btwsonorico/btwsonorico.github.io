// La timeline di /learn/timeline/. Su computer lo scroll verticale fa scorrere la linea in orizzontale: la pista è alta
// quanto la linea è lunga, e il palco resta fermo sullo schermo. Ogni scheda segue il suo punto come attaccata a una molla:
// arriva con un piccolo ritardo, si inclina se lo scroll è veloce, ai lati è piccola, tenue e girata in prospettiva, al centro
// è dritta e piena. La scheda del simbolo, sotto la linea, segue con una molla più morbida: dà profondità.
// La posizione di un evento è il suo tempo per la scala scelta; due punti non scendono mai sotto una distanza minima,
// così gli anni affollati (dal 2012 in poi) si allargano da soli. Su telefono la linea è verticale e si scorre normalmente.

type Evento = { t: number; k: string; p: number; s: boolean };
const SCALE = { decades: 14, years: 80, months: 600 } as const;
const INIZIO = 1940;

export function monta(radice: HTMLElement) {
  const eventi = JSON.parse(radice.dataset.eventi!) as Evento[];
  const oggi = +radice.dataset.oggi!;
  const $$ = <E extends Element>(q: string) => [...radice.querySelectorAll<E>(q)];
  const pista = radice.querySelector<HTMLElement>('.pista')!, palco = radice.querySelector<HTMLElement>('.palco')!, mondo = radice.querySelector<HTMLElement>('.mondo')!;
  const asse = radice.querySelector<SVGSVGElement>('.asse')!, quando = radice.querySelector<HTMLElement>('.quando')!, stelo = radice.querySelector<HTMLElement>('.stelo')!;
  const punti = $$<HTMLButtonElement>('.punto'), schede = $$<HTMLElement>('.scheda'), righeV = $$<HTMLElement>('.verticale li');
  const simboli = new Map($$<HTMLElement>('.scheda-simbolo').map(f => [+f.dataset.i!, f]));
  const densita = radice.querySelector<HTMLCanvasElement>('.densita')!;
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const telefono = () => window.innerWidth <= 700;
  // La larghezza senza la barra di scorrimento: il centro dello schermo è il centro di questa
  const larghezzaPagina = () => document.documentElement.clientWidth;

  // --- Stato dei controlli: tipi accesi, livello di dettaglio, scala del tempo (in pixel per anno)
  const tipi = new Set(['research', 'system', 'company', 'society']);
  let livello = 2, pxAnno: number = SCALE.years, pxVoluto: number = SCALE.years;
  const visibile = (e: Evento) => tipi.has(e.k) && e.p <= livello;

  // --- Disposizione: x di ogni evento visibile, con una distanza minima che cresce con la scala
  let xs = new Float64Array(eventi.length), visibili: number[] = [], larghezza = 0, margine = 0, lineaY = 0, misure: number[][] = [], misureS: number[] = [];
  const distanzaMinima = () => Math.min(240, Math.max(44, 18 + pxAnno * 1.3));
  function disponi() {
    margine = larghezzaPagina() / 2;
    visibili = eventi.map((_, i) => i).filter(i => visibile(eventi[i]!));
    const gap = distanzaMinima();
    let prima = -Infinity;
    for (const i of visibili) { const x = Math.max(margine + (eventi[i]!.t - INIZIO) * pxAnno, prima + gap); xs[i] = x; prima = x; }
    const fineOggi = xDiAnno(oggi);
    larghezza = Math.max(fineOggi, prima) + margine;
    pista.style.height = `${larghezza - margine * 2 + window.innerHeight}px`;
    lineaY = Math.round(window.innerHeight * 0.48);
    disegnaAsse();
    // Le misure delle schede si leggono qui, una volta: leggerle a ogni fotogramma costringe il browser a ricalcolare tutto
    misure = schede.map(sc => [sc.offsetWidth, sc.offsetHeight]);
    misureS = eventi.map((_, i) => simboli.get(i)?.offsetWidth ?? 0);
  }
  // Da un anno alla x sulla linea: lineare fra un evento e il successivo (la linea si allarga dove gli eventi sono fitti)
  function xDiAnno(a: number) {
    const lin = (t: number) => margine + (t - INIZIO) * pxAnno;
    if (!visibili.length) return lin(a);
    let pa = INIZIO, px = margine;
    for (const i of visibili) {
      const t = eventi[i]!.t, x = xs[i]!;
      if (a <= t) return t === pa ? x : px + ((a - pa) / (t - pa)) * (x - px);
      pa = t; px = x;
    }
    return px + (a - pa) * pxAnno;
  }
  function annoDiX(x: number) {
    let lo = INIZIO - 5, hi = oggi + 5;
    for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (xDiAnno(m) < x) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  // --- L'asse: la linea, i decenni marcati, gli anni (e i mesi a scala alta), il punto di oggi
  const ns = 'http://www.w3.org/2000/svg';
  function disegnaAsse() {
    const y = lineaY, parti: string[] = [];
    asse.setAttribute('width', String(larghezza)); asse.setAttribute('height', String(window.innerHeight));
    parti.push(`<line class="linea" x1="${margine - 40}" y1="${y}" x2="${xDiAnno(oggi)}" y2="${y}"/>`);
    let ultimoTesto = -Infinity;
    for (let a = INIZIO; a <= Math.floor(oggi); a++) {
      const x = xDiAnno(a), decennio = a % 10 === 0, passo = xDiAnno(a + 1) - x;
      parti.push(`<line class="tacca${decennio ? ' decennio' : ''}" x1="${x}" y1="${y}" x2="${x}" y2="${y + (decennio ? 14 : 7)}"/>`);
      if ((decennio || passo > 46) && x - ultimoTesto > 40) { parti.push(`<text class="${decennio ? 'decennio' : ''}" x="${x + 3}" y="${y + 26}">${a}</text>`); ultimoTesto = x; }
      if (passo > 260) for (let m = 1; m < 12; m++) { const xm = xDiAnno(a + m / 12); parti.push(`<line class="tacca" x1="${xm}" y1="${y}" x2="${xm}" y2="${y + 4}"/>`); }
    }
    const xo = xDiAnno(oggi);
    parti.push(`<line class="oggi" x1="${xo}" y1="${y - 30}" x2="${xo}" y2="${y + 30}"/><text x="${xo + 4}" y="${y - 34}">now</text>`);
    asse.innerHTML = parti.join('');
    void ns;
    punti.forEach((p, i) => { p.hidden = !visibile(eventi[i]!); p.style.left = `${xs[i]}px`; p.style.top = `${lineaY}px`; });
  }

  // --- Le molle delle schede: posizione e velocità sullo schermo, una per scheda e una per simbolo
  type Molla = { x: number; v: number; vista: boolean };
  const molle = eventi.map(() => ({ x: NaN, v: 0, vista: false } as Molla));
  const molleS = eventi.map(() => ({ x: NaN, v: 0, vista: false } as Molla));
  let scroll = 0, scrollPrima = 0, velocita = 0, attivo = -1, prima = performance.now();

  function posizione() {
    // Quanta linea è passata: lo scroll dentro la pista, da 0 alla lunghezza della linea
    const r = pista.getBoundingClientRect();
    return Math.min(Math.max(-r.top, 0), Math.max(0, larghezza - margine * 2));
  }

  function fotogramma(ora: number) {
    requestAnimationFrame(fotogramma);
    if (telefono()) return;
    const dt = Math.min(0.05, (ora - prima) / 1000); prima = ora;
    // Zoom morbido: la scala va verso quella voluta tenendo fermo l'anno al centro dello schermo
    if (Math.abs(pxVoluto - pxAnno) > 0.01) {
      const centro = annoDiX(scroll + margine);
      pxAnno += (pxVoluto - pxAnno) * (ridotto ? 1 : Math.min(1, dt * 7));
      if (Math.abs(pxVoluto - pxAnno) < 0.02) pxAnno = pxVoluto;
      disponi();
      window.scrollTo({ top: window.scrollY + pista.getBoundingClientRect().top + (xDiAnno(centro) - margine), behavior: 'instant' as ScrollBehavior });
    }
    scroll = posizione();
    velocita += ((scroll - scrollPrima) / Math.max(dt, 0.001) - velocita) * Math.min(1, dt * 8);
    scrollPrima = scroll;
    mondo.style.transform = `translate3d(${-scroll}px,0,0)`;
    const W = larghezzaPagina(), cx = W / 2, centroX = scroll + margine;
    quando.textContent = formatta(annoDiX(centroX));
    quando.style.top = '64px';

    // Il punto più vicino al centro è quello attivo: la sua scheda è piena, il suo simbolo si disegna
    let migliore = -1, dm = Infinity;
    for (const i of visibili) { const d = Math.abs(xs[i]! - centroX); if (d < dm) { dm = d; migliore = i; } }
    if (migliore !== attivo) {
      if (attivo >= 0) { punti[attivo]!.classList.remove('attivo'); schede[attivo]!.classList.remove('attiva'); }
      attivo = migliore;
      if (attivo >= 0) { punti[attivo]!.classList.add('attivo'); schede[attivo]!.classList.add('attiva'); simboli.get(attivo)?.classList.add('disegnato'); }
    }

    const inclina = Math.max(-1, Math.min(1, velocita / 2500));
    const vis = new Set(visibili), rango = new Map(visibili.map((i, k) => [i, k])), kAttivo = rango.get(attivo) ?? 0;
    eventi.forEach((e, i) => {
      const sc = schede[i]!, fs = simboli.get(i), m = molle[i]!, ms = molleS[i]!;
      const meta = xs[i]! - scroll, lontano = Math.abs(meta - cx) / (W * 0.62);
      const dentro = vis.has(i) && lontano < 1.15;
      if (!dentro) { if (m.vista) { sc.style.visibility = 'hidden'; if (fs) fs.style.visibility = 'hidden'; m.vista = ms.vista = false; } m.x = ms.x = NaN; return; }
      if (Number.isNaN(m.x)) { m.x = meta; m.v = 0; ms.x = meta; ms.v = 0; }
      // Molla: rigidità un po' diversa per ogni scheda, così non si muovono tutte insieme
      const k = 120 + (i % 5) * 14, smorza = 2 * Math.sqrt(k) * 0.82;
      if (ridotto) { m.x = meta; ms.x = meta; } else {
        m.v += ((meta - m.x) * k - m.v * smorza) * dt; m.x += m.v * dt;
        ms.v += ((meta - ms.x) * k * 0.45 - ms.v * smorza * 0.68) * dt; ms.x += ms.v * dt;
      }
      // Quanto è vicina al centro: in pixel, e in numero di eventi. Dove gli eventi sono fitti conta il secondo,
      // così si legge bene solo la scheda al centro e le vicine restano un'ombra
      const d = Math.min(1, Math.abs(m.x - cx) / (W * 0.5)), r = Math.abs((rango.get(i) ?? 0) - kAttivo);
      const vicino = Math.min(1 - d, [1, 0.66, 0.4, 0.2][Math.min(3, r)]!);
      const scala = 0.62 + 0.38 * vicino ** 1.2, opacita = 0.08 + 0.92 * vicino ** 1.6;
      if (r <= 1) simboli.get(i)?.classList.add('disegnato');
      const giro = Math.max(-1, Math.min(1, (m.x - cx) / (W * 0.5))) * -28;
      // Sopra o sotto la linea, alternando un evento sì e uno no; fra due vicini dallo stesso lato, due quote diverse.
      // Sotto la linea si parte dopo gli anni dell'asse
      const kr = rango.get(i) ?? 0, sopra = kr % 2 === 0, quota = i === attivo ? 0 : (kr >> 1) % 2;
      const [larg = 260, alt = 160] = misure[i] ?? [];
      const stacco = (sopra ? 26 : 58) + quota * 38 + vicino * 8;
      // y0: il bordo della scheda verso la linea; la scheda cresce allontanandosi dalla linea
      const y0 = sopra ? lineaY - stacco : lineaY + stacco, yAlto = sopra ? y0 - alt : y0;
      sc.style.visibility = 'visible'; m.vista = true;
      sc.style.opacity = String(opacita);
      sc.style.zIndex = String(Math.round(vicino * 100));
      sc.style.transformOrigin = sopra ? '50% 100%' : '50% 0';
      sc.style.transform = `translate3d(${m.x - larg / 2}px, ${yAlto}px, 0) perspective(700px) rotateY(${giro}deg) rotateZ(${inclina * (sopra ? -3.5 : 3.5)}deg) scale(${scala})`;
      if (i === attivo) {
        const a = Math.min(y0, lineaY) + (sopra ? 0 : 6), b = Math.max(y0, lineaY) - (sopra ? 6 : 0);
        stelo.style.transform = `translate3d(${xs[i]! - scroll}px, ${a}px, 0)`; stelo.style.height = `${b - a}px`;
      }
      if (fs) {
        // Il simbolo fluttua accanto alla scheda, sul lato destro, a metà della sua altezza: segue con una molla più morbida
        // e ondeggia piano, così dà carattere alla scheda senza stare in un riquadro
        const ds = Math.min(1, Math.abs(ms.x - cx) / (W * 0.5)), vs = Math.min(1 - ds, [1, 0.66, 0.4, 0.2][Math.min(3, r)]!);
        const sw = misureS[i] ?? 130, sScala = 0.55 + 0.45 * vs ** 1.4, ondeggia = ridotto ? 0 : Math.sin(ora / 1100 + i) * 5;
        // Sull'angolo esterno della scheda, lontano dalla linea: sopra in alto a destra, sotto in basso a destra (senza scendere sulla barra)
        const bordoFuori = sopra ? y0 - alt * scala : y0 + alt * scala, maxY = window.innerHeight - 110 - (sw * 0.76 * sScala) / 2;
        const xs2 = ms.x + (larg / 2) * scala - sw * 0.12, yMezzo = Math.min(maxY, bordoFuori + (sopra ? -1 : 1) * sw * 0.2);
        fs.style.visibility = 'visible'; ms.vista = true;
        fs.style.opacity = String(0.08 + 0.92 * vs ** 2.2);
        fs.style.zIndex = String(Math.round(vicino * 100) + 1);
        fs.style.transform = `translate3d(${xs2 - sw / 2}px, ${yMezzo - sw * 0.38 + ondeggia}px, 0) perspective(700px) rotateY(${giro * 0.8}deg) rotateZ(${inclina * 2.5 + Math.sin(ora / 1700 + i) * 2}deg) scale(${sScala})`;
      }
    });
    disegnaDensita();
  }

  const MESI = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formatta = (a: number) => pxAnno > 260 ? `${MESI[Math.min(11, Math.max(0, Math.floor((a % 1) * 12)))]} ${Math.floor(a)}` : String(Math.floor(a));

  // --- La minimappa: quanti eventi visibili per anno, la finestra dello schermo, e il clic che porta a un anno
  const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function disegnaDensita() {
    const r = densita.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (densita.width !== Math.round(r.width * dpr)) { densita.width = Math.round(r.width * dpr); densita.height = Math.round(r.height * dpr); }
    const g = densita.getContext('2d')!, w = densita.width, h = densita.height, anni = Math.ceil(oggi) - INIZIO + 1;
    g.clearRect(0, 0, w, h);
    const conta = new Array(anni).fill(0);
    for (const i of visibili) conta[Math.floor(eventi[i]!.t) - INIZIO]++;
    const max = Math.max(1, ...conta), bw = w / anni;
    // Ogni barra è fatta di pezzi, uno per evento, nel colore della sua categoria
    const passoY = (h - 4 * dpr) / max, pila = new Array(anni).fill(0), stile = getComputedStyle(radice);
    for (const i of visibili) {
      const k = Math.floor(eventi[i]!.t) - INIZIO;
      g.fillStyle = stile.getPropertyValue(`--c-${eventi[i]!.k}`).trim() || css('--muted');
      g.fillRect(k * bw + bw * 0.15, h - (pila[k] + 1) * passoY, Math.max(1, bw * 0.7), passoY - dpr * 0.5);
      pila[k]++;
    }
    g.fillStyle = css('--line'); g.fillRect(0, h - dpr, w, dpr);
    if (!telefono()) {
      const a0 = annoDiX(scroll), a1 = annoDiX(scroll + larghezzaPagina());
      g.strokeStyle = css('--fg'); g.lineWidth = dpr;
      g.strokeRect(((a0 - INIZIO) / anni) * w, dpr, Math.max(2 * dpr, ((a1 - a0) / anni) * w), h - 2 * dpr);
    }
  }
  function vaiAnno(a: number, liscio = true) {
    if (telefono()) {
      const i = eventi.findIndex(e => e.t >= a && visibile(e));
      righeV[i >= 0 ? i : righeV.length - 1]?.scrollIntoView({ behavior: liscio && !ridotto ? 'smooth' : 'instant', block: 'center' });
      return;
    }
    window.scrollTo({ top: window.scrollY + pista.getBoundingClientRect().top + (xDiAnno(a) - margine), behavior: liscio && !ridotto ? 'smooth' : 'instant' as ScrollBehavior });
  }
  densita.addEventListener('click', e => {
    const r = densita.getBoundingClientRect();
    vaiAnno(INIZIO + ((e.clientX - r.left) / r.width) * (Math.ceil(oggi) - INIZIO + 1));
  });
  punti.forEach((p, i) => p.addEventListener('click', () => vaiAnno(eventi[i]!.t)));
  // Frecce: all'evento visibile dopo o prima di quello al centro
  window.addEventListener('keydown', e => {
    if (telefono() || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') || (e.target as HTMLElement).closest('input, textarea')) return;
    const k = visibili.indexOf(attivo), j = visibili[Math.max(0, Math.min(visibili.length - 1, k + (e.key === 'ArrowRight' ? 1 : -1)))];
    if (j !== undefined) { e.preventDefault(); vaiAnno(eventi[j]!.t); }
  });

  // --- Controlli
  const premi = (gruppo: HTMLElement[], scelto: HTMLElement) => gruppo.forEach(b => b.setAttribute('aria-pressed', String(b === scelto)));
  function applicaFiltri() {
    const centro = annoDiX(scroll + margine);
    disponi();
    righeV.forEach((li, i) => { li.hidden = !visibile(eventi[i]!); });
    if (!telefono()) window.scrollTo({ top: window.scrollY + pista.getBoundingClientRect().top + (xDiAnno(centro) - margine), behavior: 'instant' as ScrollBehavior });
  }
  const bottoniTipo = $$<HTMLButtonElement>('[data-kind]').filter(b => b.classList.contains('tipo'));
  bottoniTipo.forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.kind!;
    if (tipi.has(k) && tipi.size === 1) return;
    if (tipi.has(k)) tipi.delete(k); else tipi.add(k);
    b.setAttribute('aria-pressed', String(tipi.has(k)));
    applicaFiltri();
  }));
  const bottoniLivello = $$<HTMLButtonElement>('[data-livello]');
  bottoniLivello.forEach(b => b.addEventListener('click', () => { livello = +b.dataset.livello!; premi(bottoniLivello, b); applicaFiltri(); }));
  const bottoniScala = $$<HTMLButtonElement>('[data-scala]');
  bottoniScala.forEach(b => b.addEventListener('click', () => { pxVoluto = SCALE[b.dataset.scala as keyof typeof SCALE]; premi(bottoniScala, b); }));
  // Ctrl + rotella, e il pinch sul trackpad (che arriva come ctrl + rotella), allargano o stringono la scala
  window.addEventListener('wheel', e => {
    if (!e.ctrlKey || telefono()) return;
    e.preventDefault();
    pxVoluto = Math.min(900, Math.max(10, pxVoluto * Math.exp(-e.deltaY * 0.004)));
    const piu = Object.entries(SCALE).reduce((a, b) => (Math.abs(Math.log(b[1] / pxVoluto)) < Math.abs(Math.log(a[1] / pxVoluto)) ? b : a));
    premi(bottoniScala, bottoniScala.find(x => x.dataset.scala === piu[0])!);
  }, { passive: false });

  // --- Telefono: le schede si accendono quando entrano nello schermo, e il simbolo si disegna
  const io = new IntersectionObserver(voci => voci.forEach(v => {
    if (!v.isIntersecting) return;
    v.target.querySelector('.scheda-v')?.classList.add('vista');
    v.target.querySelector('.simbolo-v')?.classList.add('disegnato');
  }), { rootMargin: '0px 0px -15% 0px' });
  righeV.forEach(li => io.observe(li));

  window.addEventListener('resize', () => { const c = annoDiX(scroll + margine); disponi(); if (!telefono()) vaiAnno(c, false); });
  disponi();
  // Le misure delle schede cambiano quando arriva il font mono, o quando una scheda cambia testo: si rileggono
  document.fonts?.ready.then(() => { misure = schede.map(sc => [sc.offsetWidth, sc.offsetHeight]); misureS = eventi.map((_, i) => simboli.get(i)?.offsetWidth ?? 0); });
  const ro = new ResizeObserver(() => { misure = schede.map(sc => [sc.offsetWidth, sc.offsetHeight]); });
  schede.forEach(sc => ro.observe(sc));
  righeV.forEach((li, i) => { li.hidden = !visibile(eventi[i]!); });
  requestAnimationFrame(fotogramma);
  void palco;
}
