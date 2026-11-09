// La timeline di /learn/timeline/. Su computer lo scroll verticale fa scorrere la linea in orizzontale: la pista è alta
// quanto la linea è lunga, e il palco resta fermo sullo schermo. Ogni scheda segue il suo punto come attaccata a una molla.
// La scheda più vicina al centro si apre con una molla senza rimbalzi, e l'apertura è più piccola se lo scroll è veloce: chi
// corre vede solo i titoli, chi rallenta vede le schede aprirsi. Altezza e posizione si calcolano nello stesso fotogramma,
// così il bordo verso la linea resta fermo. Ai lati restano al massimo due schede per lato, tenui, con data e titolo.
// Durante lo scroll le schede vicine al centro si piegano come un foglio di carta: la scheda diventa 14 strisce su una curva
// in 3D, e il bordo che resta indietro si piega di più. Da ferma torna la scheda vera, così il testo è nitido.
// La posizione di un evento è il suo tempo per la scala scelta; due punti non scendono mai sotto una distanza minima,
// così gli anni affollati (dal 2012 in poi) si allargano da soli. Su telefono la linea è verticale e si scorre normalmente.

import { creaArti } from './timelineArte';

type Evento = { t: number; k: string; p: number; s: boolean };
const SCALA_INIZIALE = 80, SCALA_MIN = 10, SCALA_MAX = 900;
const INIZIO = 1940;
const MAX_RANGO = 2;              // quante schede restano visibili per lato
const OPACITA = [1, 0.6, 0.28];   // quanto si vede una scheda, per distanza in eventi dalla centrale
const STRISCE = 14;               // quante strisce fanno il foglio (numero pari: la striscia a metà è il centro)
const VEL_PIENA = 700, VEL_CHIUSA = 2400; // sotto la prima velocità (px/s) la scheda si apre tutta, sopra la seconda resta chiusa
const GAP_ARTE = 16;              // px fra la scheda aperta e la sua immagine ASCII
const DURATA_VIAGGIO = 620;       // ms per andare a una scheda con le frecce o con un clic

export function monta(radice: HTMLElement) {
  const eventi = JSON.parse(radice.dataset.eventi!) as Evento[];
  const oggi = +radice.dataset.oggi!;
  const $$ = <E extends Element>(q: string) => [...radice.querySelectorAll<E>(q)];
  const pista = radice.querySelector<HTMLElement>('.pista')!, mondo = radice.querySelector<HTMLElement>('.mondo')!;
  const asse = radice.querySelector<SVGSVGElement>('.asse')!, annoGrande = radice.querySelector<HTMLElement>('.anno-grande')!, stelo = radice.querySelector<HTMLElement>('.stelo')!;
  const annoV = radice.querySelector<HTMLElement>('.anno-v')!, barra = radice.querySelector<HTMLElement>('.controlli')!;
  const punti = $$<HTMLButtonElement>('.punto'), schede = $$<HTMLElement>('.scheda'), righeV = $$<HTMLElement>('.verticale li');
  const simboli = new Map($$<HTMLElement>('.arte-pc').map(f => [+f.dataset.i!, f]));
  const arti = creaArti($$<HTMLElement>('.arte'));
  const densita = radice.querySelector<HTMLCanvasElement>('.densita')!;
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Telefono: stretto, o girato di lato (troppo basso per la linea). Stessa condizione del CSS della pagina
  const telefono = () => window.innerWidth <= 700 || window.innerHeight <= 500;
  // La larghezza senza la barra di scorrimento: il centro dello schermo è il centro di questa
  const larghezzaPagina = () => document.documentElement.clientWidth;
  const limita = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

  // --- Stato: tipi accesi e scala del tempo (in pixel per anno)
  const tipi = new Set(['idea', 'model', 'world']);
  let pxAnno = SCALA_INIZIALE, pxVoluto = SCALA_INIZIALE;
  const visibile = (e: Evento) => tipi.has(e.k);

  // --- Disposizione: x di ogni evento visibile, con una distanza minima che cresce con la scala
  // inizioX e fineX: quanta linea è passata quando il primo e l'ultimo evento sono al centro. Lo scroll va solo da uno all'altro
  let xs = new Float64Array(eventi.length), visibili: number[] = [], larghezza = 0, margine = 0, lineaY = 0, misureS: { larg: number; alt: number }[] = [], inizioX = 0, fineX = 0;
  // Per ogni scheda: larghezza, altezza da chiusa, altezza del dettaglio. Si leggono una volta: l'apertura le usa a ogni fotogramma
  let misure: { larg: number; chiusa: number; dettaglio: number }[] = [];
  const distanzaMinima = () => Math.min(240, 60 + pxAnno * 1.3);
  const leggiMisure = () => {
    misure = schede.map(sc => {
      const apri = sc.querySelector<HTMLElement>(':scope > .corpo .apri')!, dentro = apri.firstElementChild as HTMLElement;
      return { larg: sc.offsetWidth, chiusa: sc.offsetHeight - apri.offsetHeight, dettaglio: dentro.offsetHeight };
    });
    misureS = eventi.map((_, i) => { const f = simboli.get(i); return { larg: f?.offsetWidth ?? 0, alt: f?.offsetHeight ?? 0 }; });
  };
  function disponi() {
    margine = larghezzaPagina() / 2;
    visibili = eventi.map((_, i) => i).filter(i => visibile(eventi[i]!));
    const gap = distanzaMinima();
    let prima = -Infinity;
    for (const i of visibili) { const x = Math.max(margine + (eventi[i]!.t - INIZIO) * pxAnno, prima + gap); xs[i] = x; prima = x; }
    const fineOggi = xDiAnno(oggi);
    larghezza = Math.max(fineOggi, prima) + margine;
    inizioX = (xs[visibili[0] ?? 0] ?? margine) - margine;
    fineX = (xs[visibili[visibili.length - 1] ?? 0] ?? margine) - margine;
    pista.style.height = `${fineX - inizioX + window.innerHeight}px`;
    lineaY = Math.round((window.innerHeight - barra.offsetHeight) * 0.5);
    // Quanto può crescere il dettaglio: la scheda aperta non deve uscire dallo schermo o finire sotto la barra
    const spazio = Math.min(lineaY - 34, window.innerHeight - barra.offsetHeight - lineaY - 46 - 8);
    radice.style.setProperty('--alt-dettaglio', `${Math.max(90, spazio - 76)}px`);
    disegnaAsse();
    // Le misure delle schede si leggono qui, una volta: leggerle a ogni fotogramma costringe il browser a ricalcolare tutto
    leggiMisure();
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
    punti.forEach((p, i) => { p.hidden = !visibile(eventi[i]!); p.style.left = `${xs[i]}px`; p.style.top = `${lineaY}px`; });
  }

  // --- Il foglio di carta: una copia della scheda per ogni striscia, ognuna mostra la sua fetta. Si crea solo quando serve
  type Foglio = { el: HTMLElement; larg: number; strisce: HTMLElement[]; ombre: HTMLElement[] };
  const fogli = new Map<number, Foglio>();
  function creaFoglio(i: number, larg: number) {
    const sc = schede[i]!, corpo = sc.querySelector<HTMLElement>('.corpo')!;
    const el = document.createElement('div'); el.className = 'foglio'; el.setAttribute('aria-hidden', 'true');
    const lato = larg / STRISCE, strisce: HTMLElement[] = [], ombre: HTMLElement[] = [];
    for (let k = 0; k < STRISCE; k++) {
      const s = document.createElement('div'); s.className = 'striscia';
      // Un po' più larga della sua fetta: fra due strisce vicine non resta una fessura
      s.style.width = `${lato + 0.7}px`;
      const copia = corpo.cloneNode(true) as HTMLElement;
      copia.style.left = `${-k * lato}px`; copia.style.width = `${larg}px`;
      copia.querySelectorAll('a').forEach(a => { a.tabIndex = -1; });
      const ombra = document.createElement('div'); ombra.className = 'ombra';
      s.append(copia, ombra); el.append(s); strisce.push(s); ombre.push(ombra);
    }
    sc.append(el);
    const f = { el, larg, strisce, ombre };
    fogli.set(i, f);
    return f;
  }
  function togliFoglio(i: number) {
    const f = fogli.get(i);
    if (f) { f.el.remove(); fogli.delete(i); }
    schede[i]!.classList.remove('piega');
  }
  // b va da -1 a 1: quanto e da che parte si piega. Ogni striscia parte dalla fine della precedente, con un angolo che cresce
  // verso i bordi: così le strisce formano una curva. Il foglio resta fermo al centro
  function piega(i: number, b: number, larg: number) {
    let f = fogli.get(i);
    if (f && f.larg !== larg) { togliFoglio(i); f = undefined; }
    f ??= creaFoglio(i, larg);
    schede[i]!.classList.add('piega');
    const lato = larg / STRISCE, curva = Math.abs(b) * 1.3, verso = b * 0.35;
    let x = 0, z = 0, xm = 0, zm = 0;
    const pos: [number, number, number][] = [];
    for (let k = 0; k < STRISCE; k++) {
      const a = curva * ((k + 0.5) / STRISCE - 0.5) + verso;
      if (k === STRISCE / 2) { xm = x; zm = z; }
      pos.push([x, z, a]);
      x += lato * Math.cos(a); z -= lato * Math.sin(a);
    }
    const dx = larg / 2 - xm;
    pos.forEach(([px, pz, a], k) => {
      f!.strisce[k]!.style.transform = `translate3d(${(px + dx).toFixed(2)}px,0,${(pz - zm).toFixed(2)}px) rotateY(${a.toFixed(4)}rad)`;
      f!.ombre[k]!.style.opacity = Math.min(0.4, Math.abs(a) * 0.45).toFixed(3);
    });
  }

  // --- Le molle delle schede: posizione e velocità sullo schermo, una per scheda e una per simbolo.
  // y è il bordo verso la linea, o l'opacità, s la scala, b la piega, a quanto è aperta (da 0 a 1)
  type Molla = { x: number; v: number; y: number; o: number; s: number; b: number; bv: number; a: number; av: number; aScritta: number; vista: boolean; rivelata: boolean };
  const nuovaMolla = (): Molla => ({ x: NaN, v: 0, y: NaN, o: 0, s: 0.7, b: 0, bv: 0, a: 0, av: 0, aScritta: 0, vista: false, rivelata: false });
  const molle = eventi.map(nuovaMolla), molleS = eventi.map(nuovaMolla);
  // scrollPrima vuoto: alla prima lettura la velocità resta 0, così nessun salto della linea sembra uno scroll veloce
  let scroll = 0, scrollPrima = NaN, velocita = 0, attivo = -1, prima = performance.now();

  function posizione() {
    // Quanta linea è passata: lo scroll della pagina, dal primo all'ultimo evento
    const r = pista.getBoundingClientRect();
    return inizioX + limita(-r.top, 0, Math.max(0, fineX - inizioX));
  }
  // Da una posizione sulla linea allo scroll della pagina che la porta al centro dello schermo
  const topDiX = (x: number) => window.scrollY + pista.getBoundingClientRect().top + (x - margine - inizioX);
  // Apre o chiude una scheda: una sola scrittura sulla scheda, che vale anche per le copie del foglio
  function impostaApertura(i: number, a: number, dettaglio: number) {
    const sc = schede[i]!;
    sc.style.setProperty('--h', `${(a * dettaglio).toFixed(2)}px`);
    sc.style.setProperty('--a', (a * a).toFixed(3));
    sc.classList.toggle('mostra', a > 0.004);
  }

  // --- Il viaggio verso una scheda, con le frecce o con un clic: parte piano e arriva piano. Una nuova pressione lo riprende
  // da dove è, verso la scheda dopo. La rotella, il dito o il mouse sulla barra lo interrompono
  let viaggio: { da: number; a: number; inizio: number; indice: number; inCorsa: boolean } | null = null;
  const topDiScheda = (i: number) => topDiX(xs[i]!);
  function viaggia(i: number) {
    if (ridotto) { window.scrollTo({ top: topDiScheda(i), behavior: 'instant' as ScrollBehavior }); return; }
    viaggio = { da: window.scrollY, a: topDiScheda(i), inizio: performance.now(), indice: i, inCorsa: viaggio !== null };
  }
  const fermaViaggio = () => { viaggio = null; };
  window.addEventListener('wheel', fermaViaggio, { passive: true });
  window.addEventListener('touchstart', fermaViaggio, { passive: true });
  window.addEventListener('pointerdown', e => { if ((e.target as HTMLElement).closest('.scheda, .punto')) return; fermaViaggio(); });

  function fotogramma(ora: number) {
    requestAnimationFrame(fotogramma);
    if (telefono()) { prima = ora; return; }
    const dt = Math.min(0.05, (ora - prima) / 1000); prima = ora;
    // Zoom morbido: la scala va verso quella voluta tenendo fermo l'anno al centro dello schermo
    if (Math.abs(pxVoluto - pxAnno) > 0.01) {
      const centro = annoDiX(scroll + margine);
      pxAnno += (pxVoluto - pxAnno) * (ridotto ? 1 : Math.min(1, dt * 7));
      if (Math.abs(pxVoluto - pxAnno) < 0.02) pxAnno = pxVoluto;
      disponi();
      window.scrollTo({ top: topDiX(xDiAnno(centro)), behavior: 'instant' as ScrollBehavior });
      scrollPrima = NaN;
    }
    if (viaggio) {
      const p = limita((ora - viaggio.inizio) / DURATA_VIAGGIO, 0, 1);
      // Dalla ferma: parte e arriva piano. Già in corsa: continua senza frenare, poi arriva piano
      const e = viaggio.inCorsa ? 1 - (1 - p) ** 3 : p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
      window.scrollTo({ top: viaggio.da + (viaggio.a - viaggio.da) * e, behavior: 'instant' as ScrollBehavior });
      if (p >= 1) viaggio = null;
    }
    scroll = posizione();
    // La velocità è una media lenta: le tacche della rotella non si vedono come colpi sul foglio
    if (Number.isNaN(scrollPrima)) scrollPrima = scroll;
    velocita += ((scroll - scrollPrima) / Math.max(dt, 0.001) - velocita) * Math.min(1, dt * 4.5);
    scrollPrima = scroll;
    mondo.style.transform = `translate3d(${-scroll}px,0,0)`;
    const W = larghezzaPagina(), cx = W / 2, centroX = scroll + margine;
    const anno = formatta(annoDiX(centroX));
    if (annoGrande.textContent !== anno) annoGrande.textContent = anno;

    // Il punto più vicino al centro è quello attivo
    let migliore = -1, dm = Infinity;
    for (const i of visibili) { const d = Math.abs(xs[i]! - centroX); if (d < dm) { dm = d; migliore = i; } }
    if (migliore !== attivo) {
      if (attivo >= 0) { punti[attivo]!.classList.remove('attivo'); schede[attivo]!.classList.remove('attiva'); }
      attivo = migliore;
      if (attivo >= 0) { punti[attivo]!.classList.add('attivo'); schede[attivo]!.classList.add('attiva'); }
    }

    const piegaVoluta = limita(velocita / 2200, -1, 1);
    // Quanto si apre la scheda attiva: del tutto da lenti, per niente da veloci, e nel mezzo una via di mezzo
    const aperturaVoluta = 1 - limita((Math.abs(velocita) - VEL_PIENA) / (VEL_CHIUSA - VEL_PIENA), 0, 1);
    const rango = new Map(visibili.map((i, k) => [i, k])), kAttivo = rango.get(attivo) ?? 0;
    // Mentre un'immagine è aperta le schede più lontane spariscono: lo spazio accanto alla scheda è suo
    const aperturaArte = simboli.has(attivo) ? molle[attivo]!.a : 0;
    const passoO = Math.min(1, dt * 9), passoY = ridotto ? 1 : Math.min(1, dt * 11);
    eventi.forEach((_, i) => {
      const sc = schede[i]!, fs = simboli.get(i), m = molle[i]!, ms = molleS[i]!;
      const meta = xs[i]! - scroll, lontano = Math.abs(meta - cx) / (W * 0.62);
      const kr = rango.get(i), r = kr === undefined ? 99 : Math.abs(kr - kAttivo);
      const dentro = kr !== undefined && lontano < 1.15 && r <= MAX_RANGO;
      if (!dentro && m.o < 0.02) {
        if (m.vista) { sc.style.visibility = 'hidden'; togliFoglio(i); impostaApertura(i, 0, 0); m.vista = false; }
        if (fs && ms.vista) { fs.style.visibility = 'hidden'; arti.ferma(fs); ms.vista = false; }
        m.x = ms.x = m.y = NaN; m.o = ms.o = 0; m.s = 0.7; m.b = m.bv = m.a = m.av = m.aScritta = 0;
        return;
      }
      if (Number.isNaN(m.x)) { m.x = meta; m.v = 0; ms.x = meta; ms.v = 0; }
      // Molla senza rimbalzi, uguale per tutte le schede: arrivano con un piccolo ritardo e si fermano senza oscillare
      const k = 150, smorza = 2 * Math.sqrt(k), kS = 70, smorzaS = 2 * Math.sqrt(kS);
      if (ridotto) { m.x = meta; ms.x = meta; } else {
        m.v += ((meta - m.x) * k - m.v * smorza) * dt; m.x += m.v * dt;
        ms.v += ((meta - ms.x) * kS - ms.v * smorzaS) * dt; ms.x += ms.v * dt;
      }
      // Quanto è vicina al centro: la scheda aperta è piena, le vicine sono tenui e più piccole
      const d = Math.min(1, Math.abs(m.x - cx) / (W * 0.5));
      const vicino = Math.min(1 - d * 0.6, [1, 0.62, 0.4][Math.min(2, r)] ?? 0.4);
      // Scala e opacità seguono piano: quando una scheda diventa quella centrale cresce, non scatta
      m.s = ridotto ? 0.62 + 0.38 * vicino : m.s + (0.62 + 0.38 * vicino - m.s) * Math.min(1, dt * 7);
      const scala = m.s;
      const opacitaVoluta = (OPACITA[r] ?? 0) * (r >= 2 ? 1 - aperturaArte : 1) * Math.min(1, (1 - d) * 2.5);
      m.o += ((dentro ? opacitaVoluta : 0) - m.o) * passoO;

      // L'apertura: una molla senza rimbalzi, che parte piano e arriva piano
      const apriVoluta = i === attivo ? aperturaVoluta : 0;
      if (ridotto) m.a = apriVoluta; else {
        const kA = apriVoluta > m.a ? 70 : 110;
        m.av += ((apriVoluta - m.a) * kA - m.av * 2 * Math.sqrt(kA)) * dt; m.a = limita(m.a + m.av * dt, 0, 1);
        if (Math.abs(apriVoluta - m.a) < 0.002 && Math.abs(m.av) < 0.01) { m.a = apriVoluta; m.av = 0; }
      }
      const { larg = 420, chiusa = 70, dettaglio = 0 } = misure[i] ?? {};
      const alt = chiusa + m.a * dettaglio;
      if (m.a !== m.aScritta) { impostaApertura(i, m.a, dettaglio); m.aScritta = m.a; }
      // Con un'immagine, scheda e immagine fanno gruppo intorno al punto: la scheda va a sinistra e il suo gambo resta attaccato
      const spostamento = fs ? Math.min(larg / 2 - 24, ((misureS[i]?.larg ?? 0) + GAP_ARTE) / 2) * m.a : 0;
      const giro = limita((m.x - cx) / (W * 0.5), -1, 1) * -10;
      // Sopra o sotto la linea, alternando un evento sì e uno no; fra due vicini dallo stesso lato, due quote diverse.
      // Sotto la linea si parte dopo gli anni dell'asse
      const rg = kr ?? 0, sopra = rg % 2 === 0, quota = i === attivo ? 0 : (rg >> 1) % 2;
      const stacco = (sopra ? 26 : 46) + quota * 38;
      // y0: il bordo della scheda verso la linea. Si muove piano, così il cambio di quota non salta. La scheda cresce
      // allontanandosi dalla linea: altezza e posizione vengono dallo stesso calcolo, quindi quel bordo resta fermo
      const y0Voluta = sopra ? lineaY - stacco : lineaY + stacco;
      m.y = Number.isNaN(m.y) ? y0Voluta : m.y + (y0Voluta - m.y) * passoY;
      const y0 = m.y, yAlto = sopra ? y0 - alt : y0;
      sc.style.visibility = 'visible'; m.vista = true;
      sc.style.opacity = m.o.toFixed(3);
      sc.style.zIndex = String(i === attivo ? 100 : Math.round(vicino * 90));
      sc.style.transformOrigin = sopra ? '50% 100%' : '50% 0';
      sc.style.transform = `translate3d(${(m.x - larg / 2 - spostamento).toFixed(2)}px, ${yAlto.toFixed(2)}px, 0) perspective(700px) rotateY(${giro.toFixed(2)}deg) scale(${scala.toFixed(3)})`;

      // La piega: una molla senza rimbalzi, così il foglio si curva e torna piatto senza oscillare. Solo vicino al centro
      const piegabile = !ridotto && r <= 1;
      m.bv += (((piegabile ? piegaVoluta : 0) - m.b) * 60 - m.bv * 2 * Math.sqrt(60)) * dt; m.b += m.bv * dt;
      if (piegabile && Math.abs(m.b) > 0.012) piega(i, m.b, larg);
      else if (sc.classList.contains('piega')) sc.classList.remove('piega');

      if (i === attivo) {
        const a = Math.min(y0, lineaY) + (sopra ? 0 : 6), b = Math.max(y0, lineaY) - (sopra ? 6 : 0);        stelo.style.transform = `translate3d(${(xs[i]! - scroll).toFixed(2)}px, ${a}px, 0)`; stelo.style.height = `${b - a}px`;
      }
      if (fs) {
        // L'immagine accompagna solo la scheda aperta, accanto a lei e dallo stesso lato della linea. Compare quando la scheda
        // si apre, e il suo testo si rivela una volta per ogni apertura
        ms.o += ((i === attivo ? m.a * m.a : 0) - ms.o) * passoO;
        if (i === attivo && m.a > 0.35) { if (!ms.rivelata) { ms.rivelata = true; fs.classList.remove('foto-vista'); arti.avvia(fs); } }
        else if (i !== attivo && ms.rivelata) { ms.rivelata = false; arti.ferma(fs); }
        if (ms.o < 0.02) { if (ms.vista) { fs.style.visibility = 'hidden'; ms.vista = false; } return; }
        const { larg: sw = 370, alt: sh = 350 } = misureS[i] ?? {};
        // Se manca spazio l'immagine si rimpicciolisce: non esce dallo schermo e non finisce sulla barra
        const sopraLinea = y0 - 24, sottoLinea = window.innerHeight - barra.offsetHeight - y0 - 8, destra = W - (m.x - spostamento + larg / 2 + GAP_ARTE) - 12;
        const sf = limita(Math.min((sopra ? sopraLinea : sottoLinea) / sh, destra / sw), 0.35, 1);
        fs.style.visibility = 'visible'; ms.vista = true;
        fs.style.opacity = ms.o.toFixed(3);
        fs.style.zIndex = '101';
        fs.style.transform = `translate3d(${(m.x - spostamento + larg / 2 + GAP_ARTE).toFixed(2)}px, ${(sopra ? y0 - sh * sf : y0).toFixed(2)}px, 0) scale(${sf.toFixed(3)})`;
      }
    });
    disegnaDensita();
  }

  const MESI = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formatta = (a: number) => pxAnno > 260 ? `${MESI[limita(Math.floor((a % 1) * 12), 0, 11)]} ${Math.floor(a)}` : String(Math.floor(a));

  // --- La minimappa: i decenni scritti, quanti eventi per anno, la finestra dello schermo. Clic o trascina per andare a un anno
  const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let annoTelefono = eventi[0]?.t ?? INIZIO, ultimoDisegno = '';
  function disegnaDensita() {
    const r = densita.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const tel = telefono();
    // Si ridisegna solo se è cambiato qualcosa: leggere i colori a ogni fotogramma costa
    const chiave = [Math.round(r.width), tel ? annoTelefono.toFixed(2) : Math.round(scroll), visibili.length, [...tipi].join(), pxAnno.toFixed(1), document.documentElement.dataset.theme].join('|');
    if (chiave === ultimoDisegno) return;
    ultimoDisegno = chiave;
    if (densita.width !== Math.round(r.width * dpr) || densita.height !== Math.round(r.height * dpr)) { densita.width = Math.round(r.width * dpr); densita.height = Math.round(r.height * dpr); }
    const g = densita.getContext('2d')!, w = densita.width, h = densita.height, anni = Math.ceil(oggi) - INIZIO + 1;
    g.clearRect(0, 0, w, h);
    const zonaTesti = 13 * dpr, base = h - zonaTesti;
    const conta = new Array(anni).fill(0);
    for (const i of visibili) conta[Math.floor(eventi[i]!.t) - INIZIO]++;
    const max = Math.max(1, ...conta), bw = w / anni, stile = getComputedStyle(radice);
    const coloreTipo = new Map([...tipi].map(k => [k, stile.getPropertyValue(`--c-${k}`).trim() || css('--muted')]));
    // Ogni barra è fatta di pezzi, uno per evento, nel colore della sua categoria
    const passoY = (base - 3 * dpr) / max, pila = new Array(anni).fill(0);
    for (const i of visibili) {
      const k = Math.floor(eventi[i]!.t) - INIZIO;
      g.fillStyle = coloreTipo.get(eventi[i]!.k)!;
      g.fillRect(k * bw + bw * 0.15, base - (pila[k] + 1) * passoY, Math.max(1, bw * 0.7), Math.max(1, passoY - dpr * 0.5));
      pila[k]++;
    }
    // La linea di base e i decenni scritti. Se c'è poco spazio, un decennio sì e uno no
    const muted = css('--muted'), fg = css('--fg');
    g.fillStyle = css('--line'); g.fillRect(0, base, w, dpr);
    g.font = `${10 * dpr}px ${css('--mono') || 'monospace'}`; g.textBaseline = 'top'; g.fillStyle = muted;
    const passoDec = (bw * 10) / dpr > 44 ? 10 : 20;
    for (let a = INIZIO; a < INIZIO + anni; a += passoDec) { const x = (a - INIZIO) * bw; g.fillRect(x, base, dpr, 3 * dpr); g.fillText(String(a), x + 2 * dpr, base + 3 * dpr); }
    // Dove sei: la finestra dello schermo su computer, una tacca sull'anno corrente su telefono
    const a0 = tel ? annoTelefono : annoDiX(scroll), a1 = tel ? annoTelefono : annoDiX(scroll + larghezzaPagina());
    const fx = ((a0 - INIZIO) / anni) * w, fw = Math.max(3 * dpr, ((a1 - a0) / anni) * w);
    g.globalAlpha = 0.14; g.fillStyle = fg; g.fillRect(fx, 0, fw, base); g.globalAlpha = 1;
    g.strokeStyle = fg; g.lineWidth = dpr; g.strokeRect(fx + dpr / 2, dpr / 2, fw - dpr, base - dpr);
  }
  function vaiAnno(a: number, liscio = true) {
    if (telefono()) {
      const i = eventi.findIndex(e => e.t >= a && visibile(e));
      const li = i >= 0 ? righeV[i] : [...righeV].reverse().find(x => !x.hidden);
      li?.scrollIntoView({ behavior: liscio && !ridotto ? 'smooth' : 'instant', block: 'center' });
      return;
    }
    window.scrollTo({ top: topDiX(xDiAnno(a)), behavior: liscio && !ridotto ? 'smooth' : 'instant' as ScrollBehavior });
  }
  const annoDelPuntatore = (e: PointerEvent) => {
    const r = densita.getBoundingClientRect();
    return INIZIO + limita((e.clientX - r.left) / r.width, 0, 1) * (Math.ceil(oggi) - INIZIO + 1);
  };
  densita.addEventListener('pointerdown', e => { densita.setPointerCapture(e.pointerId); vaiAnno(annoDelPuntatore(e), !telefono()); });
  densita.addEventListener('pointermove', e => { if (densita.hasPointerCapture(e.pointerId)) vaiAnno(annoDelPuntatore(e), false); });
  punti.forEach((p, i) => p.addEventListener('click', () => viaggia(i)));
  // Un clic su una scheda laterale la porta al centro
  schede.forEach((sc, i) => sc.addEventListener('click', e => {
    if (i !== attivo && !(e.target as HTMLElement).closest('a')) viaggia(i);
  }));
  // Frecce: alla scheda dopo o prima. Se il viaggio è in corso si parte dalla sua meta, così due pressioni fanno due schede.
  // Destra e giù vanno avanti, sinistra e su indietro. Alla fine della linea su e giù tornano a scorrere la pagina
  window.addEventListener('keydown', e => {
    const avanti = e.key === 'ArrowRight' || e.key === 'ArrowDown', indietro = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (telefono() || (!avanti && !indietro) || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
    const base = viaggio?.indice ?? attivo, k = visibili.indexOf(base);
    const j = visibili[k + (avanti ? 1 : -1)];
    if (j === undefined) return;
    e.preventDefault();
    viaggia(j);
  });

  // --- I filtri: su computer in un menu nella barra, su telefono in cima alla pagina. I bottoni dello stesso tipo vanno insieme
  const apriFiltri = radice.querySelector<HTMLButtonElement>('.apri-filtri')!, pop = radice.querySelector<HTMLElement>('.pop')!;
  const mostraFiltri = (aperti: boolean) => { pop.hidden = !aperti; apriFiltri.setAttribute('aria-expanded', String(aperti)); };
  apriFiltri.addEventListener('click', () => mostraFiltri(pop.hidden));
  document.addEventListener('click', e => { if (!pop.hidden && !(e.target as HTMLElement).closest('.menu')) mostraFiltri(false); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') mostraFiltri(false); });
  function applicaFiltri() {
    fermaViaggio();
    const centro = annoDiX(posizione() + margine);
    disponi();
    righeV.forEach((li, i) => { li.hidden = !visibile(eventi[i]!); });
    apriFiltri.textContent = tipi.size === 3 ? 'filters' : `filters ${tipi.size}/3`;
    if (!telefono()) window.scrollTo({ top: topDiX(xDiAnno(centro)), behavior: 'instant' as ScrollBehavior });
    scrollPrima = NaN;
    disegnaDensita();
  }
  const bottoniTipo = $$<HTMLButtonElement>('button.tipo');
  bottoniTipo.forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.kind!;
    if (tipi.has(k) && tipi.size === 1) return;
    if (tipi.has(k)) tipi.delete(k); else tipi.add(k);
    bottoniTipo.filter(x => x.dataset.kind === k).forEach(x => x.setAttribute('aria-pressed', String(tipi.has(k))));
    applicaFiltri();
  }));
  // Ctrl + rotella, e il pinch sul trackpad (che arriva come ctrl + rotella), allargano o stringono la scala.
  // Lo swipe laterale del trackpad muove la linea come lo scroll verso il basso
  window.addEventListener('wheel', e => {
    if (telefono()) return;
    if (e.ctrlKey) {
      e.preventDefault();
      pxVoluto = limita(pxVoluto * Math.exp(-e.deltaY * 0.004), SCALA_MIN, SCALA_MAX);
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      window.scrollBy({ top: e.deltaX, behavior: 'instant' as ScrollBehavior });
    }
  }, { passive: false });

  // --- Telefono: l'evento che passa a metà schermo dà l'anno e la posizione nella striscia. L'immagine si rivela quando entra
  // e ruota solo finché si vede
  const ioCentro = new IntersectionObserver(voci => voci.forEach(v => {
    if (!v.isIntersecting) return;
    annoTelefono = eventi[+(v.target as HTMLElement).dataset.i!]!.t;
    annoV.textContent = String(Math.floor(annoTelefono));
    disegnaDensita();
  }), { rootMargin: '-45% 0px -55% 0px' });
  const ioArte = new IntersectionObserver(voci => voci.forEach(v => {
    if (!telefono()) return;
    const f = v.target as HTMLElement;
    if (v.isIntersecting) arti.avvia(f); else arti.ferma(f);
  }), { rootMargin: '0px 0px -15% 0px' });
  righeV.forEach(li => { ioCentro.observe(li); const f = li.querySelector<HTMLElement>('.arte-v'); if (f) ioArte.observe(f); });
  annoV.textContent = String(Math.floor(annoTelefono));

  // Si legge la posizione di adesso: quella dell'ultimo fotogramma può essere vecchia, e riporterebbe all'inizio
  window.addEventListener('resize', () => { const c = annoDiX(posizione() + margine); disponi(); if (!telefono()) vaiAnno(c, false); scrollPrima = NaN; disegnaDensita(); });
  disponi();
  // Le misure delle schede cambiano quando arriva il font mono: si rileggono
  document.fonts?.ready.then(() => { leggiMisure(); ultimoDisegno = ''; disegnaDensita(); });
  righeV.forEach((li, i) => { li.hidden = !visibile(eventi[i]!); });
  disegnaDensita();
  requestAnimationFrame(fotogramma);
}
