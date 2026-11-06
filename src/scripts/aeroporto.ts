import * as THREE from 'three';
import { casuale, curveLivello, linea, mat, palco, pezzo, puntiMorbidi, sasso, SITO, tono } from './natura';

// AI terms: un'isoletta tonda con un piccolo aeroporto, nello stile di Learn: terreno a curve di livello e a punti,
// alberi a filo, colori pieni solo per le cose giocattolo (aerei, barche, mongolfiera, ombrelloni).
// Sei aerei paffuti, uno per sezione del glossario. Un aereo aspetta al suo posto finché non indovini il suo termine;
// poi rulla, decolla e gira intorno all'isola, atterra e rifà il giro. Ognuno tiene la distanza da quello davanti.
// Intorno: pecore sul colle, una pala eolica, il faro, barche a vela, la balena che spruzza, una mongolfiera, il trenino dei bagagli.

export type Fase = 'boarding' | 'at the gate' | 'taxiing' | 'taking off' | 'in the air' | 'landing';
type Tappa = { x: number; y: number; z: number; v: number; fase: Fase };

// Quota del pianoro dove stanno pista e piazzale
const H0 = 0.12, SUOLO = H0 + 0.01;
// Il giro: rullaggio verso ovest, decollo verso est, giro largo dietro l'isola, atterraggio da ovest, uscita a est
const GIRO: Tappa[] = [
  { x: 0, y: SUOLO, z: -0.05, v: 0.05, fase: 'at the gate' },
  { x: -1.5, y: SUOLO, z: -0.05, v: 0.45, fase: 'taxiing' },
  { x: -2.35, y: SUOLO, z: 0.12, v: 0.3, fase: 'taxiing' },
  { x: -2.2, y: SUOLO, z: 0.55, v: 0.3, fase: 'taking off' },
  { x: -1.2, y: SUOLO, z: 0.55, v: 1, fase: 'taking off' },
  { x: 0.4, y: SUOLO + 0.02, z: 0.55, v: 1.7, fase: 'taking off' },
  { x: 2, y: 0.4, z: 0.55, v: 2, fase: 'taking off' },
  { x: 4.2, y: 1.15, z: 0.4, v: 2.1, fase: 'in the air' },
  { x: 5.7, y: 1.7, z: -1.4, v: 2.2, fase: 'in the air' },
  { x: 4.1, y: 2.1, z: -3.7, v: 2.2, fase: 'in the air' },
  { x: 0, y: 2.3, z: -4.5, v: 2.2, fase: 'in the air' },
  { x: -4.1, y: 2.1, z: -3.7, v: 2.2, fase: 'in the air' },
  { x: -5.9, y: 1.8, z: -1.2, v: 2.1, fase: 'in the air' },
  { x: -6, y: 1.4, z: 1.5, v: 2, fase: 'landing' },
  { x: -5, y: 0.95, z: 2.6, v: 1.9, fase: 'landing' },
  { x: -4, y: 0.5, z: 0.95, v: 1.6, fase: 'landing' },
  { x: -2.4, y: SUOLO + 0.04, z: 0.55, v: 1.4, fase: 'landing' },
  { x: -0.6, y: SUOLO, z: 0.55, v: 0.9, fase: 'landing' },
  { x: 1.4, y: SUOLO, z: 0.55, v: 0.45, fase: 'landing' },
  { x: 2.3, y: SUOLO, z: 0.33, v: 0.35, fase: 'taxiing' },
  { x: 2.15, y: SUOLO, z: -0.05, v: 0.35, fase: 'taxiing' },
  { x: 1.2, y: SUOLO, z: -0.05, v: 0.4, fase: 'taxiing' },
];
// I sei posti davanti al terminal, con il muso verso la pista
const POSTI = [-2, -1.2, -0.4, 0.4, 1.2, 2].map(x => ({ x, z: -0.55 }));

export type OpzioniAeroporto = {
  tinte: string[]; partiti: boolean[];
  alClic: (i: number) => void;
  alCambio: (fasi: Fase[]) => void;
};

// La forma dell'isola: un ovale morbido con la riva un po' irregolare. forma() vale 1 sulla riva, meno dentro
const RX = 4.4, RZ = 3.1;
const forma = (x: number, z: number) => {
  const t = Math.atan2(z, x), k = 1 + 0.06 * Math.sin(3 * t + 1) + 0.04 * Math.sin(5 * t + 2);
  return Math.pow(Math.pow(Math.abs(x) / RX, 2.4) + Math.pow(Math.abs(z) / RZ, 2.4), 1 / 2.4) / k;
};
// I colli: dietro il terminal, uno grande con la pala e uno con le pecore; due piccoli davanti
const COLLI = [[2.7, -2.2, 0.85, 0.65], [-2.8, -2.1, 0.5, 0.62], [-0.5, -2.6, 0.35, 0.5], [3.2, 1.9, 0.28, 0.45], [-3.3, 1.8, 0.24, 0.42]] as const;
const altezza = (x: number, z: number) => {
  const e = forma(x, z);
  if (e >= 1) return -0.04;
  let h = H0;
  for (const [cx, cz, alto, largo] of COLLI) h += alto * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * largo * largo));
  // Verso la riva il terreno scende dolce fino alla spiaggia
  return h * (1 - THREE.MathUtils.smoothstep(e, 0.8, 1));
};
const liscio = (k: number) => k * k * (3 - 2 * k);

export function monta(el: HTMLElement, o: OpzioniAeroporto) {
  const r = casuale(11);
  // Su schermo largo il tabellone sta a sinistra: la vista guarda un po' a sinistra, così l'isola resta libera a destra
  const sx = window.innerWidth > 900 ? -1.7 : 0;
  const p = palco(el, {
    camera: new THREE.Vector3(7.4 + sx, 8.6, 11), mira: new THREE.Vector3(sx, 0.55, -0.4), fov: 36, giro: 0.014, inclina: [-0.22, 0.26], zoom: [0.5, 1.4], nebbia: [1.6, 3],
    aggiorna, clic, scena: 'aeroporto', toni: SITO,
  });
  const G = p.gruppo, C = p.colori, chiaro = p.chiaro;
  const M = {
    edificio: mat('#6a6a6a', { opacity: 0.1, fili: 0.75 }), vetro: mat(C.azzurro, { opacity: chiaro ? 0.25 : 0.2, fili: 0.6 }),
    nuvola: mat('#8a8f96', { opacity: 0.05, fili: 0.22 }), balena: mat(C.azzurro, { opacity: 0.12, fili: 0.42 }), base: mat('#6a6a6a', { opacity: 0.05, fili: 0.3 }),
  };
  // Un colore pieno, con i fili appena più scuri: per le cose giocattolo
  const pieno = (colore: string, scuro = 0.08, opacita = 1) => {
    const c = new THREE.Color(colore), m = new THREE.MeshBasicMaterial({ color: c, transparent: opacita < 1, opacity: opacita, depthWrite: opacita >= 1 });
    m.userData.linea = new THREE.LineBasicMaterial({ color: c.clone().offsetHSL(0, 0, -scuro), transparent: true, opacity: 0.9 });
    return m;
  };
  const tenue = (colore: string, op: number, fili = 0.85) => mat(colore, { grezzo: true, opacity: op, fili });
  const scatola = (w: number, h: number, d: number, x: number, y0: number, z: number, m: THREE.Material, g: THREE.Object3D = G) => { const ob = pezzo(new THREE.BoxGeometry(w, h, d), m, x, y0 + h / 2, z); g.add(ob); return ob; };
  const tubo = (a: number, b: number, h: number, x: number, y0: number, z: number, m: THREE.Material, lati = 10, g: THREE.Object3D = G) => { const ob = pezzo(new THREE.CylinderGeometry(a, b, h, lati), m, x, y0 + h / 2, z); g.add(ob); return ob; };
  const fili = (punti: number[], colore: THREE.ColorRepresentation, op: number, g: THREE.Object3D = G) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(punti, 3));
    const ob = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: op }));
    g.add(ob);
    return ob;
  };

  // --- Il terreno, come in Learn: un velo di colore che segue i colli, le curve di livello e una griglia di punti.
  // Il velo è verde dentro e color sabbia sulla spiaggia
  const ANGOLI = 120, riva: number[] = [];
  for (let k = 0; k < ANGOLI; k++) {
    const t = (k / ANGOLI) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    let a = 0, b = 7;
    for (let q = 0; q < 30; q++) { const m = (a + b) / 2; if (forma(c * m, s * m) < 1) a = m; else b = m; }
    riva.push(a);
  }
  const rivaA = (t: number) => { const f = ((t / (Math.PI * 2)) * ANGOLI % ANGOLI + ANGOLI) % ANGOLI, i = Math.floor(f), j = (i + 1) % ANGOLI; return riva[i]! + (riva[j]! - riva[i]!) * (f - i); };
  const ERBA = new THREE.Color(chiaro ? '#7cc35c' : '#6fa646'), SABBIA = new THREE.Color(chiaro ? '#e9c98a' : '#d9b77a');
  {
    const geo = new THREE.RingGeometry(0.001, 1, ANGOLI, 28).rotateX(-Math.PI / 2);
    const q = geo.attributes.position as THREE.BufferAttribute, colori: number[] = [];
    for (let i = 0; i < q.count; i++) {
      const x = q.getX(i), z = q.getZ(i), t = Math.atan2(z, x), u = Math.hypot(x, z) * 0.995, rr = u * rivaA(t);
      const X = Math.cos(t) * rr, Z = Math.sin(t) * rr;
      q.setXYZ(i, X, Math.max(0.005, altezza(X, Z)) - 0.004, Z);
      const c = u > 0.9 ? SABBIA : ERBA;
      colori.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colori, 3));
    const velo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: chiaro ? 0.45 : 0.3, depthWrite: false }));
    velo.renderOrder = -1;
    G.add(velo);
  }
  {
    const { minori, maggiori } = curveLivello(altezza, 5.2, 130, 0.07, 1.3, 4, 0.03);
    fili(minori, ERBA, chiaro ? 0.55 : 0.4);
    fili(maggiori, ERBA, chiaro ? 0.9 : 0.8);
    const punti: number[] = [];
    for (let x = -5; x <= 5; x += 0.24) for (let z = -3.6; z <= 3.6; z += 0.24) if (forma(x, z) < 0.97) punti.push(x, altezza(x, z) + 0.006, z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(punti, 3));
    G.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: C.muted, size: 0.025, transparent: true, opacity: 0.6 })));
  }
  // I fianchi di terra: un velo marrone che scende nell'acqua e strati ondulati, come una torta
  const TERRA = chiaro ? '#b98258' : '#a8774f';
  {
    const vert: number[] = [], indici: number[] = [], strati: number[] = [];
    for (let k = 0; k <= ANGOLI; k++) {
      const t = (k / ANGOLI) * Math.PI * 2, rr = rivaA(t), c = Math.cos(t), s = Math.sin(t);
      vert.push(c * rr, 0.005, s * rr, c * rr * 0.9, -0.55, s * rr * 0.9);
      if (k < ANGOLI) indici.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vert, 3));
    geo.setIndex(indici);
    const fianco = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: TERRA, transparent: true, opacity: chiaro ? 0.4 : 0.22, side: THREE.DoubleSide, depthWrite: false }));
    G.add(fianco);
    for (const [y0, f] of [[0.005, 1], [-0.12, 0.977], [-0.24, 0.955], [-0.36, 0.933]] as const) for (let k = 0; k < ANGOLI; k++) {
      const t0 = (k / ANGOLI) * Math.PI * 2, t1 = ((k + 1) / ANGOLI) * Math.PI * 2, w = (t: number) => y0 + (y0 < 0 ? Math.sin(t * 9 + y0 * 40) * 0.025 : 0);
      strati.push(Math.cos(t0) * rivaA(t0) * f, w(t0), Math.sin(t0) * rivaA(t0) * f, Math.cos(t1) * rivaA(t1) * f, w(t1), Math.sin(t1) * rivaA(t1) * f);
    }
    fili(strati, TERRA, 0.85);
  }

  // --- Pista e piazzale: una striscia chiara con gli angoli tondi, la linea di mezzo tratteggiata e le frecce in testa
  const tondo = (w: number, d: number, rr: number, x: number, z: number, m: THREE.Material) => {
    const s = new THREE.Shape(), a = w / 2 - rr, b = d / 2 - rr;
    s.moveTo(-a, -d / 2); s.lineTo(a, -d / 2); s.absarc(a, -b, rr, -Math.PI / 2, 0, false); s.lineTo(w / 2, b); s.absarc(a, b, rr, 0, Math.PI / 2, false);
    s.lineTo(-a, d / 2); s.absarc(-a, b, rr, Math.PI / 2, Math.PI, false); s.lineTo(-w / 2, -b); s.absarc(-a, -b, rr, Math.PI, Math.PI * 1.5, false);
    const g = new THREE.ShapeGeometry(s, 6).rotateX(-Math.PI / 2);
    G.add(pezzo(g, m, x, H0 + 0.004, z));
  };
  const PISTA = chiaro ? '#cfc6b4' : '#e8dcc0';
  tondo(5.2, 0.52, 0.26, 0, 0.55, tenue(PISTA, chiaro ? 0.75 : 0.3, 0.9));
  tondo(4.9, 0.2, 0.1, 0, -0.05, tenue(PISTA, chiaro ? 0.5 : 0.16, 0.6));
  tondo(4.8, 0.62, 0.2, 0, -0.62, tenue(PISTA, chiaro ? 0.35 : 0.1, 0.45));
  for (const x of [-2.32, 2.27]) tondo(0.2, 0.62, 0.1, x, 0.27, tenue(PISTA, chiaro ? 0.5 : 0.16, 0.6));
  const Y = H0 + 0.012, segni: number[] = [], frecce: number[] = [];
  for (let x = -1.9; x < 2; x += 0.4) segni.push(x, Y, 0.55, x + 0.2, Y, 0.55);
  for (const [x0, v] of [[-2.35, 1], [2.35, -1]] as const) for (let k = 0; k < 3; k++) {
    const x = x0 + v * k * 0.12;
    frecce.push(x, Y, 0.4, x + v * 0.09, Y, 0.55, x + v * 0.09, Y, 0.55, x, Y, 0.7);
  }
  fili(segni, chiaro ? '#ffffff' : '#fffaf0', 0.95);
  fili(frecce, '#f0603f', 0.95);
  const giallo: number[] = [];
  for (let x = -2.3; x < 2.3; x += 0.22) giallo.push(x, Y, -0.05, x + 0.11, Y, -0.05);
  for (const q of POSTI) giallo.push(q.x, Y, -0.05, q.x, Y, q.z);
  fili(giallo, '#f2c14e', 0.95);
  // Le luci della pista, tonde e colorate, lampeggiano in fila
  const LUCI = 26, luci = puntiMorbidi(LUCI * 2), tinteLuci = ['#f2c14e', '#8fd6b4', '#ff9fb4'].map(c => new THREE.Color(c));
  G.add(luci.punti);
  for (let i = 0; i < LUCI * 2; i++) {
    const k = i % LUCI, x = -2.5 + (k / (LUCI - 1)) * 5, z = i < LUCI ? 0.26 : 0.84, c = tinteLuci[k % 3]!;
    luci.pos.set([x, H0 + 0.04, z], i * 3); luci.col.set([c.r, c.g, c.b], i * 3); luci.dim[i] = 0.08;
  }

  // --- Il terminal: piccolo, a filo, con il tetto a onda e le bandierine dei colori delle sezioni
  scatola(4.2, 0.32, 0.46, 0, H0, -1.22, M.edificio);
  scatola(4, 0.16, 0.03, 0, H0 + 0.1, -0.98, M.vetro);
  const onda = new THREE.CylinderGeometry(0.34, 0.34, 4.4, 14, 1, true, Math.PI / 2 - 0.85, 1.7);
  onda.rotateZ(Math.PI / 2);
  G.add(pezzo(onda, mat('#6a6a6a', { opacity: 0.08, fili: 0.7, side: THREE.DoubleSide }), 0, H0 + 0.08, -1.22));
  {
    const filo: number[] = [], bandiere: number[] = [], colori: number[] = [];
    const yA = H0 + 0.52, n = 22;
    for (let k = 0; k < n; k++) {
      const x0 = -2.1 + (k / n) * 4.2, x1 = -2.1 + ((k + 1) / n) * 4.2, y = (x: number) => yA - 0.06 * Math.sin(((x + 2.1) / 4.2) * Math.PI * 3) ** 2;
      filo.push(x0, y(x0), -1.22, x1, y(x1), -1.22);
      const c = new THREE.Color(o.tinte[k % o.tinte.length]!), xm = (x0 + x1) / 2;
      bandiere.push(x0 + 0.02, y(x0), -1.22, x1 - 0.02, y(x1), -1.22, xm, y(xm) - 0.1, -1.22);
      for (let q = 0; q < 3; q++) colori.push(c.r, c.g, c.b);
    }
    fili(filo, C.muted, 0.7);
    for (const x of [-2.1, 2.1]) tubo(0.008, 0.008, 0.42, x, H0, -1.22, M.edificio, 4);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(bandiere, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colori, 3));
    G.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  }

  // --- La torre: fusto a filo, una bolla di vetro in cima, l'antenna a strisce bianche e rosse, la spia che lampeggia
  const TX = -3.05, TZ = -1.05, TY = altezza(TX, TZ);
  tubo(0.1, 0.17, 1.1, TX, TY, TZ, M.edificio, 10);
  tubo(0.2, 0.2, 0.05, TX, TY + 1.1, TZ, M.edificio, 12);
  const bolla = new THREE.IcosahedronGeometry(0.28, 1); bolla.scale(1, 0.72, 1);
  G.add(pezzo(bolla, M.vetro, TX, TY + 1.32, TZ));
  for (let k = 0; k < 4; k++) tubo(0.022, 0.022, 0.07, TX, TY + 1.52 + k * 0.07, TZ, pieno(k % 2 ? '#f4f1ea' : '#f0603f'), 8);
  const spia = pezzo(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: '#f0603f', transparent: true }), TX, TY + 1.84, TZ);
  G.add(spia);
  const radar = new THREE.Group();
  radar.position.set(TX, TY + 1.12, TZ);
  G.add(radar);
  scatola(0.05, 0.05, 0.05, 0.3, 0, 0, pieno('#f2c14e'), radar);
  tubo(0.008, 0.008, 0.3, -3.6, altezza(-3.6, 0.6), 0.6, M.edificio, 4);
  const manica = new THREE.Group();
  manica.position.set(-3.6, altezza(-3.6, 0.6) + 0.28, 0.6);
  G.add(manica);
  const geoManica = new THREE.CylinderGeometry(0.03, 0.05, 0.22, 8, 1, true);
  geoManica.rotateZ(Math.PI / 2); geoManica.translate(0.12, 0, 0);
  manica.add(pezzo(geoManica, pieno('#f2a43a')));

  // --- Il faro sulla punta a est, con il fascio di luce che gira
  const FX = 4.15, FZ = -0.95, FY = altezza(FX, FZ);
  tubo(0.18, 0.2, 0.08, FX, FY, FZ, pieno('#9a958c'), 10);
  for (let k = 0; k < 4; k++) tubo(0.13 - k * 0.012, 0.145 - k * 0.012, 0.15, FX, FY + 0.08 + k * 0.15, FZ, pieno(k % 2 ? '#f0603f' : '#f4f1ea'), 10);
  tubo(0.1, 0.1, 0.1, FX, FY + 0.68, FZ, pieno('#ffd23f', 0.15), 8);
  tubo(0.01, 0.13, 0.09, FX, FY + 0.78, FZ, pieno('#f0603f'), 8);
  const fascio = new THREE.Group();
  fascio.position.set(FX, FY + 0.73, FZ);
  G.add(fascio);
  const geoFascio = new THREE.ConeGeometry(0.28, 2.2, 16, 1, true); geoFascio.rotateZ(Math.PI / 2); geoFascio.translate(-1.1, 0, 0);
  fascio.add(new THREE.Mesh(geoFascio, new THREE.MeshBasicMaterial({ color: '#fff3a8', transparent: true, opacity: chiaro ? 0.22 : 0.12, depthWrite: false, side: THREE.DoubleSide })));

  // --- La pala eolica sul colle grande, come quelle di Learn
  const PX = 2.7, PZ = -2.2, PY = altezza(PX, PZ);
  const bianco = mat('#e8e6e0', { opacity: 0.25 });
  G.add(pezzo(new THREE.CylinderGeometry(0.015, 0.035, 1.05, 6), bianco, PX, PY + 0.52, PZ));
  G.add(pezzo(new THREE.BoxGeometry(0.09, 0.05, 0.05), bianco, PX, PY + 1.06, PZ));
  const rotore = new THREE.Group();
  rotore.position.set(PX, PY + 1.06, PZ + 0.04);
  for (let q = 0; q < 3; q++) {
    const pala = pezzo(new THREE.BoxGeometry(0.03, 0.46, 0.006).translate(0, 0.24, 0), bianco);
    pala.rotation.z = (q / 3) * Math.PI * 2;
    rotore.add(pala);
  }
  G.add(rotore);

  // --- Le pecore sul colle a ovest: palline bianche che brucano e ogni tanto si spostano
  const PECORE = 9, PCX = -2.8, PCZ = -2.05;
  const geoLana = new THREE.IcosahedronGeometry(0.06, 1); geoLana.scale(1.25, 0.9, 1);
  const geoMuso = new THREE.SphereGeometry(0.028, 8, 6);
  const lana = pieno('#f4f1ea', 0.12), muso = pieno('#3a332c', 0.05);
  const pecore = Array.from({ length: PECORE }, () => {
    const g = new THREE.Group();
    g.add(pezzo(geoLana, lana, 0, 0.06, 0));
    g.add(pezzo(geoMuso, muso, 0.075, 0.075, 0));
    G.add(g);
    const a = r() * 6.28, d = Math.sqrt(r()) * 0.55;
    return { g, x: PCX + Math.cos(a) * d, z: PCZ + Math.sin(a) * d, mx: 0, mz: 0, attesa: r() * 4, verso: r() * 6 };
  });
  pecore.forEach(q => { q.mx = q.x; q.mz = q.z; });

  // --- Ombrelloni e teli sulla spiaggia davanti
  const SPIAGGIA = [[-1.6, 2.55], [-0.7, 2.75], [0.5, 2.7], [1.5, 2.5]] as const;
  SPIAGGIA.forEach(([x, z], k) => {
    const y = Math.max(0.005, altezza(x, z)), c = o.tinte[(k * 2 + 1) % o.tinte.length]!;
    G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + 0.24, z)]), linea(chiaro ? '#3a332c' : '#e8e6e0', 0.8)));
    G.add(pezzo(new THREE.ConeGeometry(0.16, 0.07, 8), pieno(c, 0.12), x, y + 0.25, z));
    const telo = pezzo(new THREE.PlaneGeometry(0.1, 0.2).rotateX(-Math.PI / 2), pieno(o.tinte[(k * 2 + 4) % o.tinte.length]!, 0.1), x + 0.14, y + 0.004, z + 0.04);
    telo.rotation.y = 0.3 - k * 0.2;
    G.add(telo);
  });

  // --- Il trenino dei bagagli: un trattore e tre carrelli con le valigie colorate, avanti e indietro davanti al terminal
  const trenino = Array.from({ length: 4 }, (_, k) => {
    const g = new THREE.Group();
    if (!k) { g.add(pezzo(new THREE.BoxGeometry(0.12, 0.07, 0.08), pieno('#f2a43a'), 0, 0.05, 0)); g.add(pezzo(new THREE.BoxGeometry(0.05, 0.05, 0.07), M.vetro, -0.02, 0.11, 0)); }
    else {
      g.add(pezzo(new THREE.BoxGeometry(0.12, 0.02, 0.08), pieno('#9a958c'), 0, 0.025, 0));
      for (let q = 0; q < 2; q++) g.add(pezzo(new THREE.BoxGeometry(0.045, 0.04, 0.06), pieno(o.tinte[(k * 2 + q) % o.tinte.length]!, 0.12), -0.028 + q * 0.056, 0.055, 0));
    }
    G.add(g);
    return g;
  });

  // --- Alberi come quelli di Learn: il tronco è un filo, la chioma sono palle o coni a filo con un riempimento tenue
  const chiome = [mat('#6fa646'), mat('#5f9c45'), mat('#4f8a3c')];
  const fusto = linea(chiaro ? '#3a332c' : '#e8e6e0', 0.7);
  const albero = (x: number, z: number, h: number, k: number) => {
    const ob = new THREE.Group(), m = chiome[k % 3]!, f = Math.floor(r() * 3);
    ob.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, h * (f === 2 ? 0.3 : 0.55), 0)]), fusto));
    if (f === 0) {
      const larga = h * 0.26;
      for (const [px, py, pz, k2] of [[0, h * 0.55 + larga * 0.7, 0, 1], [larga * 0.6, h * 0.55 + larga * 0.45, 0.04, 0.7], [-larga * 0.55, h * 0.55 + larga * 0.45, -0.03, 0.7]] as const) ob.add(pezzo(new THREE.IcosahedronGeometry(larga * k2, 1), m, px, py, pz));
    } else if (f === 1) {
      const larga = h * 0.28;
      ob.add(pezzo(new THREE.IcosahedronGeometry(larga, 0), m, 0, h * 0.6 + larga * 0.5, 0));
      for (const a of [0.5, 2.6]) ob.add(pezzo(new THREE.IcosahedronGeometry(larga * 0.62, 0), m, Math.cos(a) * larga, h * 0.62, Math.sin(a) * larga));
    } else for (let q = 0; q < 3; q++) {
      const ff = q / 3, alto = h * 0.42;
      ob.add(pezzo(new THREE.ConeGeometry(h * 0.26 * (1 - ff * 0.45), alto, 7), m, 0, h * 0.25 + ff * h * 0.45 + alto / 2, 0));
    }
    ob.position.set(x, altezza(x, z), z);
    ob.rotation.y = r() * Math.PI;
    G.add(ob);
  };
  const vietati = (x: number, z: number) =>
    (Math.abs(x) < 2.75 && z > -1.6 && z < 1.05) || Math.hypot(x - TX, z - TZ) < 0.45 || Math.hypot(x - FX, z - FZ) < 0.45 || Math.hypot(x - PX, z - PZ) < 0.35 ||
    Math.hypot(x - PCX, z - PCZ) < 0.75 || (z > 2.15 && Math.abs(x) < 2.1) || Math.hypot(x + 3.6, z - 0.6) < 0.3;
  const posti: [number, number][] = [];
  for (let i = 0; i < 1500 && posti.length < 46; i++) {
    const x = (r() - 0.5) * 9.6, z = (r() - 0.5) * 6.8;
    if (forma(x, z) < 0.86 && !vietati(x, z) && posti.every(([u, v]) => Math.hypot(u - x, v - z) > 0.3)) posti.push([x, z]);
  }
  posti.forEach(([x, z], k) => albero(x, z, 0.32 + r() * 0.22, k));
  for (let i = 0; i < 10; i++) { const t = r() * 6.28, rr = rivaA(t) * (1.02 + r() * 0.08); G.add(pezzo(sasso(0.05 + r() * 0.06, r, 0), M.base, Math.cos(t) * rr, -0.4, Math.sin(t) * rr)); }

  // --- L'aereo paffuto: muso verso +z. Fusoliera tonda, ali a capsula, coda, finestrino, ruote ed elica che gira
  const geoCorpo = new THREE.LatheGeometry([[0, -0.3], [0.035, -0.29], [0.062, -0.2], [0.086, -0.06], [0.092, 0.05], [0.082, 0.14], [0.052, 0.2], [0, 0.225]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
  geoCorpo.rotateX(Math.PI / 2);
  const capsula = (raggio: number, lungo: number, piatta: number) => { const g = new THREE.CapsuleGeometry(raggio, lungo, 3, 8); g.rotateZ(Math.PI / 2); g.scale(1, piatta, 1); return g; };
  const geoAla = capsula(0.075, 0.5, 0.22), geoCoda = capsula(0.045, 0.16, 0.25);
  const geoDeriva = new THREE.CapsuleGeometry(0.04, 0.07, 3, 8); geoDeriva.scale(0.25, 1, 1);
  const geoVetro = new THREE.SphereGeometry(0.045, 10, 6); geoVetro.scale(0.9, 0.6, 1.2);
  const geoRuota = new THREE.SphereGeometry(0.026, 8, 6);
  const geoPala = new THREE.BoxGeometry(0.27, 0.032, 0.008), geoMozzo = new THREE.SphereGeometry(0.026, 8, 6);
  const grigio = pieno('#8a8078', 0.06), vetro = pieno(chiaro ? '#cfeefa' : '#bfe6f5', 0.12);
  // Solo la sagoma ha i fili: dentro, il colore resta pieno
  const nuovoAereo = (colore: string) => {
    const g = new THREE.Group(), dentro = new THREE.Group(), corpo = pieno(colore, 0.1), ali = pieno(new THREE.Color(colore).offsetHSL(0, 0, -0.05).getStyle(), 0.1);
    dentro.position.y = 0.12;
    g.add(dentro);
    const solo = (geo: THREE.BufferGeometry, m: THREE.MeshBasicMaterial, x = 0, y = 0, z = 0) => { const ob = new THREE.Mesh(geo, m); ob.position.set(x, y, z); return ob; };
    dentro.add(pezzo(geoCorpo, corpo));
    dentro.add(solo(geoAla, ali, 0, -0.025, 0.02));
    dentro.add(solo(geoCoda, ali, 0, 0.02, -0.25));
    const deriva = solo(geoDeriva, ali, 0, 0.1, -0.24); deriva.rotation.x = -0.35; dentro.add(deriva);
    dentro.add(solo(geoVetro, vetro, 0, 0.062, 0.08));
    for (const x of [-0.09, 0.09]) dentro.add(solo(geoRuota, grigio, x, -0.09, 0.05));
    const elica = new THREE.Group();
    elica.position.set(0, 0, 0.232);
    elica.add(solo(geoMozzo, grigio), solo(geoPala, grigio));
    dentro.add(elica);
    return { g, elica };
  };

  // --- Il giro: arco di curva per ogni tappa, per sapere a che velocità si va in ogni punto
  const curva = new THREE.CatmullRomCurve3(GIRO.map(t => new THREE.Vector3(t.x, t.y, t.z)), true, 'centripetal');
  const PASSI = GIRO.length * 40;
  curva.arcLengthDivisions = PASSI;
  const lunghezze = curva.getLengths(PASSI), LUNGO = lunghezze[PASSI]!, sTappa = GIRO.map((_, i) => lunghezze[i * 40]!);
  const dove = (s: number) => { let i = GIRO.length - 1; while (i > 0 && sTappa[i]! > s) i--; const j = (i + 1) % GIRO.length, fine = j ? sTappa[j]! : LUNGO; return { i, j, f: (s - sTappa[i]!) / Math.max(1e-4, fine - sTappa[i]!) }; };
  const SOSTA = sTappa[0]!;
  // Il punto della linea gialla davanti a ogni posto: da lì l'aereo entra nel giro
  const ingresso = POSTI.map(q => {
    let meglio = 0, dm = 9;
    for (let k = 0; k <= PASSI; k++) {
      const pt = curva.getPointAt(k / PASSI);
      if (pt.y > SUOLO + 0.01 || Math.abs(pt.z + 0.05) > 0.04) continue;
      const dd = Math.abs(pt.x - q.x);
      if (dd < dm) { dm = dd; meglio = k; }
    }
    return (meglio / PASSI) * LUNGO;
  });

  type Aereo = { g: THREE.Group; elica: THREE.Group; ombra: THREE.Mesh; s: number; v: number; attesa: number; rollio: number; volo: boolean; esce: number; fase: Fase };
  const quanti = o.partiti.filter(Boolean).length;
  let giaInVolo = 0;
  const aerei: Aereo[] = o.tinte.map((t, i) => {
    const { g, elica } = nuovoAereo(t);
    g.userData.indice = i;
    G.add(g);
    const ombra = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: chiaro ? 0.14 : 0.3, depthWrite: false }));
    ombra.rotation.x = -Math.PI / 2; ombra.scale.set(1.3, 0.6, 1);
    G.add(ombra);
    const q = POSTI[i % POSTI.length]!;
    g.position.set(q.x, SUOLO, q.z);
    // Chi è già partito oggi vola subito, distanziato dagli altri
    const volo = !!o.partiti[i];
    const s = volo ? (LUNGO * ((giaInVolo++ + 0.3) / Math.max(1, quanti))) % LUNGO : 0;
    return { g, elica, ombra, s, v: volo ? 1.5 : 0, attesa: 0, rollio: 0, volo, esce: volo ? 1 : 0, fase: (volo ? 'in the air' : 'boarding') as Fase };
  });

  // Clic su un aereo: apre il suo biglietto
  function clic(raggio: THREE.Raycaster) {
    const colpo = raggio.intersectObjects(aerei.map(a => a.g), true)[0];
    if (!colpo) return;
    let x: THREE.Object3D | null = colpo.object;
    while (x && x.userData.indice === undefined) x = x.parent;
    if (x) o.alClic(x.userData.indice as number);
  }

  // --- L'acqua: la griglia di punti azzurri di sempre, che ondeggia e sfuma lontano dall'isola
  const PASSO = p.telefono ? 0.26 : 0.19, celle: { x: number; z: number; d: number }[] = [];
  for (let x = -10; x <= 10; x += PASSO) for (let z = -7.5; z <= 7.5; z += PASSO) {
    const d = forma(x, z);
    if (d < 1.02 || d > 2.1) continue;
    celle.push({ x, z, d });
  }
  const acqua = puntiMorbidi(celle.length), blu = new THREE.Color(C.azzurro);
  G.add(acqua.punti);
  celle.forEach((c, i) => {
    acqua.col.set([blu.r, blu.g, blu.b], i * 3);
    acqua.dim[i] = 0.055;
    acqua.alfa[i] = (1 - THREE.MathUtils.smoothstep(c.d, 1.55, 2.1)) * (chiaro ? 0.85 : 0.72);
    acqua.pos.set([c.x, -0.42, c.z], i * 3);
  });
  const inAcqua = (x: number, z: number) => forma(x, z) > 1;

  // --- Barche a vela: girano larghe intorno all'isola, ondeggiando, con la vela nel colore di una sezione
  const barche = [0, 1, 2].map(k => {
    const g = new THREE.Group(), scafo = new THREE.CylinderGeometry(0.09, 0.09, 0.32, 10, 1, false, 0, Math.PI);
    scafo.rotateX(Math.PI / 2); scafo.rotateZ(Math.PI); scafo.scale(1, 0.7, 1);
    g.add(pezzo(scafo, pieno(chiaro ? '#f4f1ea' : '#e8e6e0', 0.15), 0, 0.03, 0));
    const vela = new THREE.BufferGeometry();
    vela.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.05, -0.1, 0, 0.36, -0.02, 0, 0.05, 0.11], 3));
    g.add(pezzo(vela, pieno(o.tinte[(k * 2 + 2) % o.tinte.length]!, 0.12, 1)));
    (g.children[1] as THREE.Mesh).material = Object.assign(((g.children[1] as THREE.Mesh).material as THREE.MeshBasicMaterial).clone(), { side: THREE.DoubleSide });
    G.add(g);
    return { g, fase: k * 2.1, rx: 6.1 + k * 0.5, rz: 4.4 + k * 0.4, vel: 0.05 + k * 0.012 };
  });

  // --- La balena: nuota intorno all'isola e ogni tanto spruzza
  const balena = new THREE.Group();
  const corpoB = new THREE.SphereGeometry(0.3, 10, 6); corpoB.scale(0.62, 0.42, 2.1);
  balena.add(pezzo(corpoB, M.balena));
  const pinna = new THREE.BufferGeometry();
  pinna.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.6, 0.26, 0, -0.86, 0, 0, -0.74, -0.26, 0, -0.86], 3));
  pinna.setIndex([0, 1, 2, 0, 2, 3, 2, 1, 0, 3, 2, 0]);
  const coda = pezzo(pinna, M.balena);
  balena.add(coda);
  G.add(balena);
  const GOCCE = 26, spruzzo = puntiMorbidi(GOCCE), gocce = Array.from({ length: GOCCE }, () => ({ x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0, vita: 0 }));
  G.add(spruzzo.punti);
  for (let i = 0; i < GOCCE; i++) { spruzzo.col.set([0.85, 0.94, 1], i * 3); spruzzo.dim[i] = 0.07; spruzzo.alfa[i] = 0; }
  let prossimoSpruzzo = 3;

  // --- La mongolfiera, come quelle di Learn: gira lenta e alta intorno all'isola
  const profilo = Array.from({ length: 12 }, (_, k) => {
    const t = k / 11, a = t * Math.PI;
    return new THREE.Vector2(Math.max(0.06, Math.sin(a * 0.92 + 0.12) * (0.3 + 0.12 * Math.sin(a * 0.5))) * (t < 0.3 ? 0.5 + t * 1.6 : 1), -0.38 + t * 0.78);
  });
  const geoPallone = new THREE.LatheGeometry(profilo, 12);
  const mongolfiera = new THREE.Group();
  {
    const c = new THREE.Color('#ff9fb4');
    mongolfiera.add(new THREE.Mesh(geoPallone, new THREE.MeshBasicMaterial({ color: c })));
    mongolfiera.add(new THREE.LineSegments(new THREE.EdgesGeometry(geoPallone, 20), new THREE.LineBasicMaterial({ color: c.clone().offsetHSL(0, 0, -0.18) })));
    mongolfiera.add(pezzo(new THREE.BoxGeometry(0.1, 0.08, 0.1), pieno('#a07a50'), 0, -0.62, 0));
    const funi: THREE.Vector3[] = [];
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) funi.push(new THREE.Vector3(x! * 0.05, -0.58, z! * 0.05), new THREE.Vector3(x! * 0.09, -0.4, z! * 0.09));
    mongolfiera.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(funi), new THREE.LineBasicMaterial({ color: '#a07a50' })));
    mongolfiera.scale.setScalar(0.75);
    G.add(mongolfiera);
  }

  // --- Nuvole a filo e gabbiani
  const nuvole = [[-4.5, 3.4, -3.4, 0.85], [3.8, 3.7, -4.6, 0.7], [6.4, 3.2, 2.8, 0.6]].map(([x, y, z, k]) => {
    const g = new THREE.Group();
    for (const [a, b, c, d] of [[0, 0, 0, 0.45], [0.46, -0.05, 0.08, 0.32], [-0.46, -0.07, -0.05, 0.34], [0.14, 0.17, -0.1, 0.28]] as const) g.add(pezzo(sasso(d, r, 1), M.nuvola, a, b, c));
    g.position.set(x!, y!, z!); g.scale.setScalar(k!);
    G.add(g);
    return g;
  });
  const GABBIANI = 7, vGabbiani = new Float32Array(GABBIANI * 4 * 3), gGabbiani = new THREE.BufferGeometry();
  gGabbiani.setAttribute('position', new THREE.BufferAttribute(vGabbiani, 3));
  const lGabbiani = new THREE.LineSegments(gGabbiani, new THREE.LineBasicMaterial({ color: tono(chiaro ? '#23201b' : '#d9dde3'), transparent: true, opacity: 0.8 }));
  lGabbiani.frustumCulled = false;
  G.add(lGabbiani);
  const fGabbiani = Array.from({ length: GABBIANI }, () => ({ a: (r() - 0.5) * 0.7, q: (r() - 0.5) * 0.5, y: (r() - 0.5) * 0.4, f: r() * 6 }));

  // --- Ogni fotogramma
  const q = new THREE.Vector3(), d = new THREE.Vector3(), su = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), zero = new THREE.Vector3(), rot = new THREE.Quaternion(), asse = new THREE.Vector3(0, 0, 1), rol = new THREE.Quaternion(), fermo = new THREE.Quaternion();
  let ultimo = '', tempoLista = 0, treninoX = 0;
  function aggiorna(s: number, dt: number) {
    radar.rotation.y = s * 1.6;
    rotore.rotation.z = s * 1.3;
    fascio.rotation.y = s * 0.9;
    manica.rotation.y = 0.4 + Math.sin(s * 0.7) * 0.25;
    (spia.material as THREE.MeshBasicMaterial).opacity = Math.floor(s * 1.4) % 2 ? 1 : 0.15;
    for (let i = 0; i < LUCI * 2; i++) luci.alfa[i] = Math.max(0.3, 1 - ((s * 9 - (i % LUCI)) % LUCI + LUCI) % LUCI / 6);
    luci.aggiorna();
    celle.forEach((c, i) => { acqua.pos[i * 3 + 1] = -0.42 + Math.sin(c.x * 1.25 + s * 0.9) * 0.028 + Math.sin(c.z * 1.7 - s * 0.7 + c.x * 0.4) * 0.024; });
    acqua.aggiorna();

    // Gli aerei al posto aspettano con l'elica lenta. Quelli partiti guardano l'aereo davanti: se è troppo vicino rallentano
    const inVolo = aerei.filter(a => a.volo);
    aerei.forEach((a, i) => {
      a.elica.rotation.z += dt * (a.volo ? 26 : 5);
      if (!a.volo) {
        const pp = POSTI[i]!;
        a.g.position.set(pp.x, SUOLO, pp.z);
        a.g.rotation.set(0, 0, 0);
        a.ombra.position.set(pp.x + 0.02, H0 + 0.008, pp.z + 0.01);
        a.ombra.rotation.z = Math.PI / 2;
        a.fase = 'boarding';
        return;
      }
      const { i: t0, j: t1, f } = dove(a.s), A = GIRO[t0]!, B = GIRO[t1]!;
      let voluta = A.v + (B.v - A.v) * f;
      let gap = LUNGO;
      inVolo.forEach(b => { if (b !== a) gap = Math.min(gap, (b.s - a.s + LUNGO) % LUNGO); });
      voluta = Math.min(voluta, Math.max(0, (gap - 0.7) * 1.4));
      const prima = (SOSTA - a.s + LUNGO) % LUNGO;
      if (a.attesa > 0) { a.attesa -= dt; voluta = 0; }
      else {
        if (prima < 0.7) voluta = Math.min(voluta, 0.08 + prima * 0.55);
        if (prima < 0.02) a.attesa = 3;
      }
      if (a.esce < 1) { a.esce = Math.min(1, a.esce + dt / 1.6); voluta = Math.min(voluta, 0.15); }
      a.v += (voluta - a.v) * Math.min(1, dt * 2.5);
      a.s = (a.s + a.v * dt + LUNGO) % LUNGO;
      curva.getPointAt(a.s / LUNGO, q); curva.getTangentAt(a.s / LUNGO, d);
      q.y = Math.max(SUOLO, q.y);
      m4.lookAt(d, zero, su);
      rot.setFromRotationMatrix(m4);
      // Si inclina nelle curve, solo in volo
      const dx = d.x, dz = d.z;
      curva.getTangentAt(((a.s + 0.25) % LUNGO) / LUNGO, d);
      const volta = dx * d.z - dz * d.x, inAria = q.y > 0.45;
      a.rollio += ((inAria ? THREE.MathUtils.clamp(volta * 3.2, -0.6, 0.6) : 0) - a.rollio) * Math.min(1, dt * 3);
      rol.setFromAxisAngle(asse, a.rollio);
      rot.multiply(rol);
      // L'uscita dal posto: dalla posa al posto si passa piano alla posa sulla linea gialla
      if (a.esce < 1) {
        const k = liscio(a.esce), pp = POSTI[i]!;
        q.set(pp.x + (q.x - pp.x) * k, q.y, pp.z + (q.z - pp.z) * k);
        a.g.quaternion.copy(fermo.identity().slerp(rot, k));
      } else a.g.quaternion.copy(rot);
      a.g.position.copy(q);
      const x = q.x, z = q.z, h = q.y;
      const sotto = inAcqua(x, z) ? -0.4 : Math.max(0.005, altezza(x, z)) + 0.008;
      a.ombra.position.set(x + (h - sotto) * 0.12, sotto, z + (h - sotto) * 0.08);
      a.ombra.rotation.z = Math.atan2(dx, dz) + Math.PI / 2;
      (a.ombra.material as THREE.MeshBasicMaterial).opacity = (chiaro ? 0.14 : 0.3) * Math.max(0.3, 1 - (h - sotto) * 0.25);
      a.fase = a.attesa > 0 || prima < 0.4 ? 'at the gate' : A.fase;
    });

    // Le pecore brucano; ogni tanto una fa qualche passo verso un punto vicino
    pecore.forEach(pc => {
      pc.attesa -= dt;
      if (pc.attesa <= 0) {
        const a = r() * 6.28, dd = Math.sqrt(r()) * 0.55;
        pc.mx = PCX + Math.cos(a) * dd; pc.mz = PCZ + Math.sin(a) * dd; pc.attesa = 4 + r() * 6;
      }
      const vx = pc.mx - pc.x, vz = pc.mz - pc.z, l = Math.hypot(vx, vz);
      if (l > 0.02) { pc.x += (vx / l) * dt * 0.1; pc.z += (vz / l) * dt * 0.1; pc.verso = Math.atan2(-vz, vx); }
      pc.g.position.set(pc.x, altezza(pc.x, pc.z), pc.z);
      pc.g.rotation.y = pc.verso;
    });

    // Il trenino va avanti e indietro, e si gira alle estremità
    const tx = Math.sin(s * 0.12) * 2.1, verso = Math.cos(s * 0.12) >= 0 ? 1 : -1;
    treninoX = tx;
    trenino.forEach((g, k) => {
      const x = treninoX - verso * k * 0.15;
      g.position.set(x, H0, -0.9);
      g.rotation.y = verso > 0 ? 0 : Math.PI;
    });

    // Le barche: un'ellisse larga, con un po' di beccheggio
    barche.forEach(b => {
      const t = s * b.vel + b.fase, x = Math.cos(t) * b.rx, z = Math.sin(t) * b.rz;
      b.g.position.set(x, -0.43 + Math.sin(s * 1.3 + b.fase) * 0.02, z);
      b.g.rotation.set(Math.sin(s * 1.1 + b.fase) * 0.08, Math.atan2(-Math.sin(t) * b.rx, Math.cos(t) * b.rz), Math.sin(s * 0.9 + b.fase) * 0.1);
    });

    // Balena: un'ellisse larga, con la coda che batte; ogni tanto uno spruzzo
    const bb = -s * 0.07, bx = Math.cos(bb) * 7.2, bz = Math.sin(bb) * 5.2;
    balena.position.set(bx, -0.58 + Math.sin(s * 0.5) * 0.06, bz);
    balena.rotation.y = Math.atan2(Math.sin(bb) * 7.2, -Math.cos(bb) * 5.2);
    coda.rotation.x = Math.sin(s * 1.6) * 0.25;
    prossimoSpruzzo -= dt;
    if (prossimoSpruzzo <= 0) {
      prossimoSpruzzo = 5 + r() * 4;
      gocce.forEach(g => { const a = r() * 6.28, v = 0.15 + r() * 0.2; g.x = bx; g.y = -0.4; g.z = bz; g.vx = Math.cos(a) * v; g.vz = Math.sin(a) * v; g.vy = 1.1 + r() * 0.5; g.vita = 1.4; });
    }
    gocce.forEach((g, i) => {
      if (g.vita > 0) { g.vita -= dt; g.vy -= dt * 1.8; g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; }
      spruzzo.pos.set([g.x, g.vita > 0 ? g.y : -9, g.z], i * 3);
      spruzzo.alfa[i] = g.vita > 0 ? Math.min(1, g.vita) * 0.9 : 0;
    });
    spruzzo.aggiorna();

    // La mongolfiera gira lenta, sale e scende un poco
    const mt = s * 0.03 + 1.2;
    mongolfiera.position.set(Math.cos(mt) * 6.6, 3.4 + Math.sin(s * 0.4) * 0.15, Math.sin(mt) * 2.6 - 3.2);
    for (const [i, n] of nuvole.entries()) { n.position.x += dt * (0.05 + i * 0.015); if (n.position.x > 10) n.position.x = -10; }
    const c0 = s * 0.22, cx = Math.cos(c0) * 5.4, cz = Math.sin(c0) * 3.6 + 0.4;
    fGabbiani.forEach((u, i) => {
      const x = cx + Math.cos(c0 + u.a) * 0.8 + u.q, z = cz + Math.sin(c0 + u.a) * 0.8, y = 1.1 + u.y, batte = Math.sin(s * 7 + u.f) * 0.04, l = 0.075, k = i * 12;
      vGabbiani.set([x - l, y + batte, z, x, y, z, x, y, z, x + l, y + batte, z], k);
    });
    (gGabbiani.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Il tabellone cambia di rado: non si riscrive a ogni fotogramma
    if (s - tempoLista > 0.25) {
      tempoLista = s;
      const firma = aerei.map(a => a.fase).join();
      if (firma !== ultimo) { ultimo = firma; o.alCambio(aerei.map(a => a.fase)); }
    }
  }
  return {
    palco: p,
    // Il volo è stato indovinato: l'aereo esce dal suo posto e parte
    decolla(i: number) {
      const a = aerei[i];
      if (!a || a.volo) return;
      a.volo = true; a.esce = 0; a.v = 0; a.attesa = 0; a.s = ingresso[i]!;
    },
  };
}
