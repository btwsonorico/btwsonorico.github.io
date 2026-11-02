import { avanti, generaDati, misura, nuovaRete, passo, type Attivazione, type Punto, type Rete, type TipoDati } from '../lib/rete';

// Vista della rete neurale: a sinistra la rete, a destra il piano con la sua decisione. Tutti i comandi sono subito liberi;
// la guida suggerisce una cosa alla volta e avanza da sola quando la fai, senza bloccare chi vuole fare altro.
const G = 48, T = 12, MAX_STRATI = 4, MAX_NEURONI = 8, GRUPPO = 16, PASSI_AL_SECONDO = 200, QUANTI_PUNTI = 200, DURATA_PASSO = 2800, LEGGI_GUIDA = 5000;
const TASSI = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3];

type Neurone = { l: number; j: number };
type Arco = Neurone & { i: number };
const f2 = (v: number) => v.toFixed(2);
const rgb = (hex: string) => { const n = parseInt(hex.trim().slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };

export function monta(radice: HTMLElement) {
  const $ = <E extends Element>(s: string) => radice.querySelector<E>(s)!;
  const tela = $<HTMLCanvasElement>('.tela-rete'), telaPiano = $<HTMLCanvasElement>('.tela-piano'), telaStoria = $<HTMLCanvasElement>('.tela-storia');
  const c = tela.getContext('2d')!, cp = telaPiano.getContext('2d')!, cs = telaStoria.getContext('2d')!;
  const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
  const BG = tono('--bg'), FG = tono('--fg'), MUTED = tono('--muted'), LINE = tono('--line'), BLU = tono('--azzurro'), ARANCIO = tono('--arancio');
  const [bR, bG, bB] = rgb(BG), [aR, aG, aB] = rgb(BLU), [oR, oG, oB] = rgb(ARANCIO);
  const FONT = "11px 'Departure Mono', ui-monospace, monospace";
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stato
  let tipo: TipoDati = 'circle', rumore = 0.02, attivazione: Attivazione = 'tanh', tasso = 3, seme = 1;
  let nascosti: number[] = [], dati: Punto[] = generaDati(tipo, QUANTI_PUNTI, rumore, 5), rete: Rete = nuovaRete(nascosti, attivazione, seme);
  let griglie: Float32Array[][] = [], massimi: number[] = [], valori: Float64Array[] = [];
  let inMoto = false, passi = 0, storia: number[] = [], errore = 0, precisione = 0, esploso = false, sporco = true, residuo = 0;
  let sonda: { x: number; y: number } | null = null, sopra: Neurone | null = null, fisso: Neurone | null = null, arco: Arco | null = null;
  let trascina: { arco: Arco; x: number; y: number } | null = null;
  let anima: { t0: number; q: Punto; p: number; gruppo: Punto[]; applicato: boolean } | null = null;
  let scelto = (): Neurone | null => sopra ?? fisso;
  let visto = false, sondato = false, passoFatto = false, passiDopoTasso = 0;

  const riservaGriglie = () => {
    griglie = rete.forma.map(n => Array.from({ length: n }, () => new Float32Array(G * G)));
    massimi = rete.forma.map(() => 1);
    valori = rete.forma.map(n => new Float64Array(n));
  };
  const nuova = () => {
    rete = nuovaRete(nascosti, attivazione, seme);
    passi = 0; storia = []; esploso = false; anima = null;
    sopra = fisso = arco = null;
    riservaGriglie();
    disegnaStrati();
    aggiornaBottoni();
    sporco = true;
  };
  const allena = (n: number) => {
    for (let k = 0; k < n; k++) {
      const gruppo: Punto[] = [];
      for (let q = 0; q < GRUPPO; q++) gruppo.push(dati[Math.floor(Math.random() * dati.length)]!);
      passo(rete, gruppo, TASSI[tasso]!);
      passi++;
    }
    if (tasso >= 6) passiDopoTasso += n;
  };

  // Valore del neurone sulla scala da -1 a 1: blu negativo, arancio positivo
  const scala = (l: number, j: number, v: number) => {
    if (l === rete.forma.length - 1) return 2 * v - 1;
    if (l > 0 && attivazione === 'relu') return v / massimi[l]!;
    return v;
  };
  const dipingi = (d: Uint8ClampedArray, k: number, v: number) => {
    const a = Math.min(1, Math.abs(v)) * 0.72, r = v < 0 ? aR : oR, g = v < 0 ? aG : oG, b = v < 0 ? aB : oB;
    d[k] = bR + (r - bR) * a; d[k + 1] = bG + (g - bG) * a; d[k + 2] = bB + (b - bB) * a; d[k + 3] = 255;
  };

  // Calcola ogni neurone su tutta la griglia del piano
  const calcolaGriglie = () => {
    const ultimo = rete.forma.length - 1;
    massimi.fill(1e-6);
    for (let r = 0; r < G; r++) for (let q = 0; q < G; q++) {
      avanti(rete, ((q + 0.5) / G) * 2 - 1, 1 - ((r + 0.5) / G) * 2);
      for (let l = 0; l <= ultimo; l++) {
        const u = rete.uscite[l]!, gl = griglie[l]!;
        for (let j = 0; j < u.length; j++) {
          gl[j]![r * G + q] = u[j]!;
          if (u[j]! > massimi[l]!) massimi[l] = u[j]!;
        }
      }
    }
    if (sonda) { avanti(rete, sonda.x, sonda.y); rete.uscite.forEach((u, l) => valori[l]!.set(u)); }
  };

  // Geometria della rete
  let W = 0, H = 0, P = 0, S = 0;
  const ALTO = 42;
  const colonna = (l: number) => {
    const ultimo = rete.forma.length - 1, largo = Math.min(W - 92, ultimo * 220), via = (W - largo) / 2;
    return via + (largo * l) / ultimo;
  };
  const riga = (l: number, j: number) => ALTO + ((H - ALTO - 8) * (j + 0.5)) / rete.forma[l]!;
  const lato = () => Math.min(38, (H - ALTO - 8) / Math.max(...rete.forma) - 6);

  const rampa = document.createElement('canvas');
  rampa.width = rampa.height = T;
  const cr = rampa.getContext('2d')!, immagineT = cr.createImageData(T, T);
  const fondo = document.createElement('canvas');
  fondo.width = fondo.height = G;
  const cf = fondo.getContext('2d')!, immagineG = cf.createImageData(G, G);

  const miniatura = (l: number, j: number, x: number, y: number, s: number) => {
    const g = griglie[l]![j]!, passoT = G / T;
    for (let r = 0; r < T; r++) for (let q = 0; q < T; q++) {
      dipingi(immagineT.data, (r * T + q) * 4, scala(l, j, g[Math.floor((r + 0.5) * passoT) * G + Math.floor((q + 0.5) * passoT)]!));
    }
    cr.putImageData(immagineT, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(rampa, x, y, s, s);
  };

  const disegnaRete = (ora: number) => {
    const { forma, pesi } = rete, ultimo = forma.length - 1, s = lato(), sel = scelto();
    c.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    c.clearRect(0, 0, W, H);
    c.font = FONT;
    c.lineCap = 'butt';
    for (let l = 1; l <= ultimo; l++) for (let j = 0; j < forma[l]!; j++) for (let i = 0; i < forma[l - 1]!; i++) {
      const w = pesi[l - 1]![j * forma[l - 1]! + i]!, forza = Math.abs(w);
      let a = Math.min(0.9, 0.14 + forza * 0.3);
      if (sonda) a = Math.min(0.95, 0.06 + Math.abs(w * valori[l - 1]![i]!) * 0.7);
      if (sel && !((l === sel.l && j === sel.j) || (l - 1 === sel.l && i === sel.j))) a *= 0.12;
      const questo = arco && arco.l === l && arco.j === j && arco.i === i;
      c.globalAlpha = questo ? 1 : a;
      c.strokeStyle = questo ? FG : w > 0 ? ARANCIO : BLU;
      c.lineWidth = Math.min(4, 0.6 + forza * 0.7);
      c.beginPath();
      c.moveTo(colonna(l - 1), riga(l - 1, i));
      c.lineTo(colonna(l), riga(l, j));
      c.stroke();
    }
    c.globalAlpha = 1;
    if (anima) disegnaImpulsi((ora - anima.t0) / DURATA_PASSO);
    c.textBaseline = 'middle';
    for (let l = 0; l <= ultimo; l++) for (let j = 0; j < forma[l]!; j++) {
      const x = colonna(l), y = riga(l, j), attivo = sel && sel.l === l && sel.j === j;
      miniatura(l, j, x - s / 2, y - s / 2, s);
      c.strokeStyle = attivo ? FG : MUTED;
      c.lineWidth = attivo ? 2 : 1;
      c.strokeRect(Math.round(x - s / 2) + 0.5, Math.round(y - s / 2) + 0.5, Math.round(s), Math.round(s));
      if (sonda) {
        const t = f2(valori[l]![j]!), tw = c.measureText(t).width;
        c.fillStyle = BG;
        c.fillRect(x - tw / 2 - 2, y - 7, tw + 4, 14);
        c.fillStyle = FG;
        c.textAlign = 'center';
        c.fillText(t, x, y);
      }
    }
    c.textAlign = 'right';
    c.fillStyle = MUTED;
    c.fillText('x1', colonna(0) - s / 2 - 6, riga(0, 0));
    c.fillText('x2', colonna(0) - s / 2 - 6, riga(0, 1));
    c.textAlign = 'left';
    c.fillText('p', colonna(ultimo) + s / 2 + 6, riga(ultimo, 0));
  };

  // Durante il passo guidato: i valori corrono in avanti, poi l'errore torna indietro
  const disegnaImpulsi = (t: number) => {
    const ultimo = rete.forma.length - 1, avantiFase = t < 0.36, indietroFase = t >= 0.58;
    if (!avantiFase && !indietroFase) return;
    const f = avantiFase ? (t / 0.36) * ultimo : ((t - 0.58) / 0.42) * ultimo;
    const k = Math.min(ultimo - 1, Math.floor(f)), frazione = f - k;
    const da = avantiFase ? k : ultimo - k, a = avantiFase ? k + 1 : ultimo - k - 1;
    c.fillStyle = avantiFase ? FG : ARANCIO;
    for (let i = 0; i < rete.forma[da]!; i++) for (let j = 0; j < rete.forma[a]!; j++) {
      const x = colonna(da) + (colonna(a) - colonna(da)) * frazione, y = riga(da, i) + (riga(a, j) - riga(da, i)) * frazione;
      c.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
    }
  };

  // Piano: colore per colore la decisione, una linea per il confine, i punti sopra
  const disegnaPiano = () => {
    const sel = scelto(), ultimo = rete.forma.length - 1, l = sel ? sel.l : ultimo, j = sel ? sel.j : 0, g = griglie[l]![j]!;
    for (let k = 0; k < G * G; k++) dipingi(immagineG.data, k * 4, scala(l, j, g[k]!));
    cf.putImageData(immagineG, 0, 0);
    cp.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    cp.imageSmoothingEnabled = false;
    cp.drawImage(fondo, 0, 0, P, P);
    const px = (x: number) => ((x + 1) / 2) * P, py = (y: number) => ((1 - y) / 2) * P;
    // Assi
    cp.strokeStyle = LINE;
    cp.lineWidth = 1;
    cp.setLineDash([3, 4]);
    cp.beginPath();
    cp.moveTo(P / 2 + 0.5, 0); cp.lineTo(P / 2 + 0.5, P);
    cp.moveTo(0, P / 2 + 0.5); cp.lineTo(P, P / 2 + 0.5);
    cp.stroke();
    cp.setLineDash([]);
    // Confine: dove il valore cambia segno
    const livello = l === ultimo ? 0.5 : l > 0 && attivazione === 'relu' ? 1e-6 : 0, passoG = P / G;
    cp.strokeStyle = FG;
    cp.lineWidth = 2;
    cp.beginPath();
    for (let r = 0; r < G - 1; r++) for (let q = 0; q < G - 1; q++) {
      const v0 = g[r * G + q]! - livello, v1 = g[r * G + q + 1]! - livello, v2 = g[(r + 1) * G + q + 1]! - livello, v3 = g[(r + 1) * G + q]! - livello;
      const pt: [number, number][] = [], x0 = (q + 0.5) * passoG, y0 = (r + 0.5) * passoG;
      if (v0 > 0 !== v1 > 0) pt.push([x0 + passoG * (v0 / (v0 - v1)), y0]);
      if (v1 > 0 !== v2 > 0) pt.push([x0 + passoG, y0 + passoG * (v1 / (v1 - v2))]);
      if (v3 > 0 !== v2 > 0) pt.push([x0 + passoG * (v3 / (v3 - v2)), y0 + passoG]);
      if (v0 > 0 !== v3 > 0) pt.push([x0, y0 + passoG * (v0 / (v0 - v3))]);
      for (let k = 0; k + 1 < pt.length; k += 2) { cp.moveTo(pt[k]![0], pt[k]![1]); cp.lineTo(pt[k + 1]![0], pt[k + 1]![1]); }
    }
    cp.stroke();
    // Punti: quadrati come tutto il sito; quelli sbagliati hanno il bordo chiaro
    const s = P < 340 ? 5 : 6;
    for (const q of dati) {
      const sbagliato = (avanti(rete, q.x, q.y) >= 0.5 ? 1 : 0) !== q.c, x = Math.round(px(q.x) - s / 2), y = Math.round(py(q.y) - s / 2);
      cp.fillStyle = sbagliato ? FG : BG;
      cp.fillRect(x - 1, y - 1, s + 2, s + 2);
      cp.fillStyle = q.c ? ARANCIO : BLU;
      cp.fillRect(x, y, s, s);
    }
    cp.font = FONT;
    cp.textBaseline = 'alphabetic';
    cp.fillStyle = MUTED;
    cp.textAlign = 'right';
    cp.fillText('x1', P - 6, P / 2 - 6);
    cp.textAlign = 'left';
    cp.fillText('x2', P / 2 + 6, 14);
    if (anima || sonda) {
      const b = anima ? anima.q : sonda!, x = px(b.x), y = py(b.y);
      cp.strokeStyle = FG;
      cp.lineWidth = 2;
      cp.strokeRect(Math.round(x) - 8, Math.round(y) - 8, 16, 16);
    }
    if (sonda && !anima) {
      const ora = sel ? valori[sel.l]![sel.j]! : valori[ultimo]![0]!, t = `${sel ? nome(sel.l, sel.j) : 'p'} = ${f2(ora)}`, tw = cp.measureText(t).width;
      const x = Math.min(P - tw - 8, px(sonda.x) + 12), y = Math.max(16, py(sonda.y) - 12);
      cp.fillStyle = BG;
      cp.fillRect(x - 3, y - 11, tw + 6, 15);
      cp.fillStyle = FG;
      cp.fillText(t, x, y);
    }
  };

  const disegnaStoria = () => {
    const w = telaStoria.clientWidth, h = telaStoria.clientHeight;
    cs.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    cs.clearRect(0, 0, w, h);
    if (storia.length < 2) return;
    const alto = Math.max(0.75, ...storia);
    cs.strokeStyle = ARANCIO;
    cs.lineWidth = 1.5;
    cs.beginPath();
    storia.forEach((v, k) => {
      const x = (k / (storia.length - 1)) * w, y = h - 2 - (Math.min(v, alto) / alto) * (h - 4);
      if (k) cs.lineTo(x, y); else cs.moveTo(x, y);
    });
    cs.stroke();
  };

  // Testi
  const nome = (l: number, j: number) => l === 0 ? `x${j + 1}` : l === rete.forma.length - 1 ? 'p' : `n${l}.${j + 1}`;
  const formula = $<HTMLElement>('.formula'), cartiglio = $<HTMLElement>('.cartiglio-piano'), numeri = $<HTMLElement>('.numeri');
  const scrivi = (el: HTMLElement, t: string) => { if (el.textContent !== t) el.textContent = t; };
  const testoFormula = () => {
    if (esploso) return 'The weights exploded: the steps were too big. Lower the learning rate, then press reset.';
    const sel = scelto();
    if (arco) {
      const w = rete.pesi[arco.l - 1]![arco.j * rete.forma[arco.l - 1]! + arco.i]!;
      return `weight ${nome(arco.l - 1, arco.i)} → ${nome(arco.l, arco.j)} = ${f2(w)}. Drag it to change it by hand.`;
    }
    if (!sel) return 'Hover or tap a square to read its formula. Drag a line to change a weight.';
    if (sel.l === 0) return `${nome(0, sel.j)} is the ${sel.j ? 'vertical' : 'horizontal'} position of the point${sonda ? ` = ${f2(valori[0]![sel.j]!)}` : ''}.`;
    const entrate = rete.forma[sel.l - 1]!, ultimo = rete.forma.length - 1, fn = sel.l === ultimo ? 'sigmoid' : attivazione;
    let t = '';
    for (let i = 0; i < entrate; i++) {
      const w = rete.pesi[sel.l - 1]![sel.j * entrate + i]!;
      t += `${i ? (w < 0 ? ' - ' : ' + ') : w < 0 ? '-' : ''}${f2(Math.abs(w))}·${nome(sel.l - 1, i)}`;
    }
    const b = rete.scarti[sel.l - 1]![sel.j]!;
    return `${nome(sel.l, sel.j)} = ${fn}(${t}${b < 0 ? ' - ' : ' + '}${f2(Math.abs(b))})${sonda ? ` = ${f2(valori[sel.l]![sel.j]!)}` : ''}`;
  };
  const aggiornaTesti = () => {
    if (!anima) scrivi(formula, testoFormula());
    const sel = scelto();
    scrivi(cartiglio, sel && sel.l < rete.forma.length - 1 ? `${nome(sel.l, sel.j)}: what this ${sel.l ? 'neuron' : 'input'} sees` : 'p: what the network decides');
    scrivi(numeri, `steps ${passi}  ·  loss ${esploso ? '∞' : errore.toFixed(3)}  ·  right ${Math.round(precisione * 100)}%`);
  };

  // Passo guidato: un punto entra, si misura l'errore, i pesi si spostano
  const fasi = radice.querySelectorAll<HTMLElement>('.fasi span');
  const segnaFase = (n: number) => fasi.forEach((f, k) => f.classList.toggle('accesa', k === n));
  const unPasso = () => {
    if (anima) return;
    gioca(false);
    const q = dati[Math.floor(Math.random() * dati.length)]!, gruppo = [q];
    for (let k = 1; k < GRUPPO; k++) gruppo.push(dati[Math.floor(Math.random() * dati.length)]!);
    const p = avanti(rete, q.x, q.y);
    passoFatto = true;
    if (calmo) {
      passo(rete, gruppo, TASSI[tasso]!);
      passi++;
      scrivi(formula, `One step done. The point had p = ${f2(p)}; every weight moved a little.`);
      sporco = true;
      return;
    }
    anima = { t0: performance.now(), q, p, gruppo, applicato: false };
    sonda = { x: q.x, y: q.y };
    sporco = true;
  };
  const avanzaAnimazione = (ora: number) => {
    if (!anima) return;
    const t = (ora - anima.t0) / DURATA_PASSO, { q, p } = anima, colore = q.c ? 'orange' : 'blue';
    if (t < 0.36) {
      segnaFase(0);
      scrivi(formula, `Predict: this point is ${colore}. The network says p(orange) = ${f2(p)}.`);
    } else if (t < 0.58) {
      segnaFase(1);
      const e = -Math.log(Math.max(1e-9, q.c ? p : 1 - p));
      scrivi(formula, `Error: -log(${q.c ? 'p' : '1 - p'}) = ${f2(e)}. Near 0 when it is sure and right, big when it is sure and wrong.`);
    } else {
      segnaFase(2);
      scrivi(formula, `Adjust: the error flows back, and each weight moves against its share. Step size = learning rate = ${TASSI[tasso]}.`);
      if (!anima.applicato) {
        passo(rete, anima.gruppo, TASSI[tasso]!);
        passi++;
        anima.applicato = true;
      }
    }
    if (t >= 1) { anima = null; sonda = null; segnaFase(-1); }
    sporco = true;
  };

  // Guida: suggerisce, non obbliga. Ogni passo avanza da solo quando quel che chiede è fatto
  const GUIDA: { testo: string; azione?: [string, () => void]; fatto?: () => boolean }[] = [
    { testo: 'No hidden layers: this network is one neuron, and one neuron can only draw a straight line. Press train and watch it try to enclose the circle.', azione: ['train', () => gioca(true)], fatto: () => passi > 500 || nascosti.length > 0 },
    { testo: 'It is stuck: no straight line can enclose a circle. Give the network a hidden layer.', azione: ['add 4 neurons', () => { nascosti = [4]; nuova(); gioca(true); }], fatto: () => nascosti.length > 0 },
    { testo: 'Now the boundary bends. Hover or tap a small square: each neuron draws one line, and the output combines them.', fatto: () => visto },
    { testo: 'Move across the plane. Every square shows its value for that point: follow the numbers from input to output.', fatto: () => sondato },
    { testo: 'How does it learn? Press step and watch one point go through: predict, measure the error, adjust the weights.', azione: ['step', () => unPasso()], fatto: () => passoFatto },
    { testo: 'Now break it. Start over with a big learning rate: big steps jump over the solution, and the loss chart turns jagged.', azione: ['restart at rate 3', () => { tasso = 7; seme++; nuova(); gioca(true); }], fatto: () => passiDopoTasso > 800 },
    { testo: 'The hard one: a spiral. Restore the rate, then add layers and neurons until the network solves it.', azione: ['try spiral', () => { tasso = 3; tipo = 'spiral'; dati = generaDati(tipo, QUANTI_PUNTI, rumore, 5); nascosti = [8, 8]; nuova(); gioca(true); }] },
    { testo: 'That is the whole idea. Everything is yours now: change the data, the noise, the activation, or drag a line to set a weight by hand.' },
  ];
  let guida = 0;
  const testoGuida = $<HTMLElement>('.guida-testo'), numeroGuida = $<HTMLElement>('.guida-numero'), azioneGuida = $<HTMLButtonElement>('.guida-azione');
  const scatola = $<HTMLElement>('.guida');
  let daQuando = 0;
  const mostraGuida = () => {
    const g = GUIDA[guida]!;
    // Vale solo quel che fai da qui in poi, e il suggerimento resta il tempo di leggerlo
    daQuando = performance.now();
    visto = sondato = passoFatto = false;
    numeroGuida.textContent = `${guida + 1}/${GUIDA.length}`;
    testoGuida.textContent = g.testo;
    azioneGuida.hidden = !g.azione;
    if (g.azione) azioneGuida.textContent = g.azione[0];
    $<HTMLButtonElement>('.guida-prima').disabled = guida === 0;
    $<HTMLButtonElement>('.guida-dopo').disabled = guida === GUIDA.length - 1;
  };
  azioneGuida.addEventListener('click', () => GUIDA[guida]!.azione?.[1]());
  $('.guida-prima').addEventListener('click', () => { guida = Math.max(0, guida - 1); passiDopoTasso = 0; mostraGuida(); });
  $('.guida-dopo').addEventListener('click', () => { guida = Math.min(GUIDA.length - 1, guida + 1); passiDopoTasso = 0; mostraGuida(); });
  $('.guida-chiudi').addEventListener('click', () => { scatola.hidden = true; });
  const controllaGuida = (ora: number) => {
    if (scatola.hidden || anima || ora - daQuando < LEGGI_GUIDA) return;
    if (GUIDA[guida]!.fatto?.() && guida < GUIDA.length - 1) { guida++; mostraGuida(); }
  };

  // Comandi
  const bottoneGioca = $<HTMLButtonElement>('.gioca');
  const gioca = (si: boolean) => {
    if (si && esploso) return;
    inMoto = si;
    bottoneGioca.textContent = si ? 'pause' : 'train';
    bottoneGioca.setAttribute('aria-pressed', String(si));
    residuo = 0;
  };
  bottoneGioca.addEventListener('click', () => gioca(!inMoto));
  $('.un-passo').addEventListener('click', unPasso);
  $('.azzera').addEventListener('click', () => { seme++; nuova(); });
  radice.querySelectorAll<HTMLButtonElement>('[data-dati]').forEach(b => b.addEventListener('click', () => {
    tipo = b.dataset.dati as TipoDati;
    dati = generaDati(tipo, QUANTI_PUNTI, rumore, 5);
    nuova();
  }));
  radice.querySelectorAll<HTMLButtonElement>('[data-attivazione]').forEach(b => b.addEventListener('click', () => {
    attivazione = b.dataset.attivazione as Attivazione;
    nuova();
  }));
  const cursoreTasso = $<HTMLInputElement>('.cursore-tasso'), cursoreRumore = $<HTMLInputElement>('.cursore-rumore');
  cursoreTasso.addEventListener('input', () => { tasso = Number(cursoreTasso.value); passiDopoTasso = 0; aggiornaBottoni(); });
  cursoreRumore.addEventListener('input', () => {
    rumore = Number(cursoreRumore.value);
    dati = generaDati(tipo, QUANTI_PUNTI, rumore, 5);
    aggiornaBottoni();
    sporco = true;
  });
  const cambiaStrati = (d: number) => {
    if (d > 0 && nascosti.length < MAX_STRATI) nascosti = [...nascosti, nascosti[nascosti.length - 1] ?? 4];
    if (d < 0) nascosti = nascosti.slice(0, -1);
    nuova();
  };
  $('.strati-meno').addEventListener('click', () => cambiaStrati(-1));
  $('.strati-piu').addEventListener('click', () => cambiaStrati(1));
  function aggiornaBottoni() {
    radice.querySelectorAll<HTMLButtonElement>('[data-dati]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dati === tipo)));
    radice.querySelectorAll<HTMLButtonElement>('[data-attivazione]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.attivazione === attivazione)));
    cursoreTasso.value = String(tasso);
    $<HTMLElement>('.valore-tasso').textContent = String(TASSI[tasso]);
    cursoreRumore.value = String(rumore);
    $<HTMLElement>('.valore-rumore').textContent = rumore.toFixed(2);
    $<HTMLElement>('.strati-numero').textContent = String(nascosti.length);
    $<HTMLButtonElement>('.strati-meno').disabled = nascosti.length === 0;
    $<HTMLButtonElement>('.strati-piu').disabled = nascosti.length === MAX_STRATI;
  }
  // Sopra ogni colonna nascosta, i comandi per togliere o aggiungere neuroni
  const contenitoreStrati = $<HTMLElement>('.colonne');
  function disegnaStrati() {
    contenitoreStrati.replaceChildren();
    if (!W) return;
    const etichetta = (l: number, testo: string) => {
      const e = document.createElement('span');
      e.className = 'colonna';
      e.style.left = `${colonna(l)}px`;
      e.textContent = testo;
      contenitoreStrati.append(e);
    };
    etichetta(0, 'input');
    etichetta(rete.forma.length - 1, 'output');
    nascosti.forEach((n, k) => {
      const e = document.createElement('span');
      e.className = 'colonna';
      e.style.left = `${colonna(k + 1)}px`;
      const bottone = (t: string, nomeAria: string, d: number, spento: boolean) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = t;
        b.disabled = spento;
        b.setAttribute('aria-label', `${nomeAria} in layer ${k + 1}`);
        b.addEventListener('click', () => { nascosti = nascosti.map((v, q) => q === k ? v + d : v); nuova(); });
        return b;
      };
      const conta = document.createElement('span');
      conta.textContent = String(n);
      e.append(bottone('−', 'Remove a neuron', -1, n <= 1), conta, bottone('+', 'Add a neuron', 1, n >= MAX_NEURONI));
      contenitoreStrati.append(e);
    });
  }

  // Puntatore sulla rete: quadrati e linee
  const trova = (x: number, y: number, dito: boolean): { n?: Neurone; a?: Arco } => {
    const { forma } = rete, s = lato() / 2 + (dito ? 6 : 1);
    for (let l = 0; l < forma.length; l++) for (let j = 0; j < forma[l]!; j++) {
      if (Math.abs(x - colonna(l)) <= s && Math.abs(y - riga(l, j)) <= s) return { n: { l, j } };
    }
    let meglio: Arco | undefined, d = dito ? 12 : 6;
    for (let l = 1; l < forma.length; l++) for (let j = 0; j < forma[l]!; j++) for (let i = 0; i < forma[l - 1]!; i++) {
      const x0 = colonna(l - 1), y0 = riga(l - 1, i), x1 = colonna(l), y1 = riga(l, j), dx = x1 - x0, dy = y1 - y0;
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
      const q = Math.hypot(x - x0 - dx * t, y - y0 - dy * t);
      if (q < d) { d = q; meglio = { l, j, i }; }
    }
    return meglio ? { a: meglio } : {};
  };
  const posizione = (e: PointerEvent, t: HTMLElement) => { const r = t.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  tela.addEventListener('pointermove', e => {
    if (trascina) {
      const { x, y } = posizione(e, tela), a = trascina.arco, k = a.j * rete.forma[a.l - 1]! + a.i, p = rete.pesi[a.l - 1]!;
      p[k] = Math.max(-6, Math.min(6, p[k]! + (x - trascina.x - (y - trascina.y)) * 0.02));
      trascina.x = x; trascina.y = y;
      sporco = true;
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const { x, y } = posizione(e, tela), v = trova(x, y, false);
    sopra = v.n ?? null;
    arco = v.a ?? null;
    if (sopra) visto = true;
    tela.style.cursor = v.a ? 'grab' : v.n ? 'pointer' : '';
    sporco = true;
  });
  tela.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !trascina) { sopra = null; arco = null; sporco = true; } });
  tela.addEventListener('pointerdown', e => {
    const { x, y } = posizione(e, tela), v = trova(x, y, e.pointerType !== 'mouse');
    if (v.a) {
      gioca(false);
      arco = v.a;
      trascina = { arco: v.a, x, y };
      tela.setPointerCapture(e.pointerId);
    } else if (v.n) {
      fisso = fisso && fisso.l === v.n.l && fisso.j === v.n.j ? null : v.n;
      visto = true;
    } else {
      fisso = null;
      arco = null;
    }
    sporco = true;
  });
  const lascia = () => { trascina = null; };
  tela.addEventListener('pointerup', lascia);
  tela.addEventListener('pointercancel', lascia);

  // Puntatore sul piano: la sonda
  const muoviSonda = (e: PointerEvent) => {
    if (anima) return;
    const { x, y } = posizione(e, telaPiano);
    sonda = { x: Math.max(-1, Math.min(1, (x / P) * 2 - 1)), y: Math.max(-1, Math.min(1, 1 - (y / P) * 2)) };
    sondato = true;
    sporco = true;
  };
  telaPiano.addEventListener('pointermove', muoviSonda);
  telaPiano.addEventListener('pointerdown', muoviSonda);
  telaPiano.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !anima) { sonda = null; sporco = true; } });
  telaPiano.addEventListener('pointercancel', () => { if (!anima) { sonda = null; sporco = true; } });

  // Le tele seguono la pagina
  const misuraTele = () => {
    W = tela.clientWidth; H = tela.clientHeight; P = telaPiano.clientWidth;
    const d = devicePixelRatio;
    tela.width = W * d; tela.height = H * d;
    telaPiano.width = telaPiano.height = P * d;
    telaStoria.width = telaStoria.clientWidth * d; telaStoria.height = telaStoria.clientHeight * d;
    disegnaStrati();
    sporco = true;
  };
  new ResizeObserver(misuraTele).observe(radice);
  document.fonts?.ready.then(() => { sporco = true; });

  let prima = performance.now(), battito = 0;
  const ciclo = (ora: number) => {
    requestAnimationFrame(ciclo);
    const dt = Math.min(0.1, (ora - prima) / 1000);
    prima = ora;
    if (inMoto) {
      residuo += dt * PASSI_AL_SECONDO;
      const n = Math.floor(residuo);
      residuo -= n;
      allena(n);
      sporco = true;
    }
    avanzaAnimazione(ora);
    controllaGuida(ora);
    if (!sporco || !W || !P) return;
    sporco = false;
    const m = misura(rete, dati);
    errore = m.errore;
    precisione = m.precisione;
    if (!Number.isFinite(errore)) { esploso = true; gioca(false); }
    if (inMoto && ++battito % 3 === 0) { storia.push(errore); if (storia.length > 320) storia.shift(); }
    calcolaGriglie();
    disegnaRete(ora);
    disegnaPiano();
    disegnaStoria();
    aggiornaTesti();
  };
  riservaGriglie();
  aggiornaBottoni();
  mostraGuida();
  misuraTele();
  requestAnimationFrame(ciclo);
}
