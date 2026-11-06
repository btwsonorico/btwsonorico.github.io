import * as THREE from 'three';
import { casuale, curveLivello, linea, mat, palco, pezzo, puntiMorbidi, sasso, SITO } from './natura';

// AI terms: un'isoletta tonda nello stile di Learn: terreno a curve di livello e a punti, alberi a filo, colori pieni
// solo per le cose giocattolo (aerei, tetti, ombrelloni, faro). Il mare è un cerchio di punti che sfuma, come il laghetto.
// Sei aerei paffuti, uno per sezione del glossario. Finché il loro termine non è indovinato girano in attesa sul mare,
// uno sopra l'altro. Quando apri una domanda, il suo aereo arriva e atterra sulla pista con un avvicinamento dritto.
// Se indovini, decolla e gira intorno all'isola, ognuno con il suo percorso e la sua quota, con lo striscione del termine.
// Intorno, poco: le pecore sul colle, il faro, qualche albero, e le nuvole a filo che si scostano dal puntatore.

export type Fase = 'holding' | 'landing' | 'boarding' | 'taking off' | 'in the air';

// Quota del pianoro dove sta la pista
const H0 = 0.12, SUOLO = H0 + 0.01;
// La pista è lungo x, a z = 0,55. Si atterra da ovest verso est e ci si ferma qui
const PZ = 0.55, FERMO = new THREE.Vector3(0.5, SUOLO, PZ);

export type OpzioniAeroporto = {
  tinte: string[]; termini: string[]; partiti: boolean[];
  alClic: (i: number) => void;
  alCambio: (fasi: Fase[]) => void;
};

// La forma dell'isola: un ovale morbido con la riva un po' irregolare. forma() vale 1 sulla riva, meno dentro
const RX = 4.4, RZ = 3.1;
const forma = (x: number, z: number) => {
  const t = Math.atan2(z, x), k = 1 + 0.06 * Math.sin(3 * t + 1) + 0.04 * Math.sin(5 * t + 2);
  return Math.pow(Math.pow(Math.abs(x) / RX, 2.4) + Math.pow(Math.abs(z) / RZ, 2.4), 1 / 2.4) / k;
};
// I colli: uno grande con la pala, uno con le pecore, uno dietro il paese, due piccoli davanti
const COLLI = [[2.7, -2.2, 0.85, 0.65], [-2.8, -2.1, 0.5, 0.62], [-0.5, -2.6, 0.35, 0.5], [3.2, 1.9, 0.28, 0.45], [-3.3, 1.8, 0.24, 0.42]] as const;
const altezza = (x: number, z: number) => {
  const e = forma(x, z);
  if (e >= 1) return -0.04;
  let h = H0;
  for (const [cx, cz, alto, largo] of COLLI) h += alto * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * largo * largo));
  return h * (1 - THREE.MathUtils.smoothstep(e, 0.8, 1));
};
const liscio = (k: number) => k * k * (3 - 2 * k);

// I percorsi degli aerei già partiti: ognuno il suo, a quote diverse. dir è il verso; u la velocità
// Le orbite intorno all'isola: ellissi concentriche a quote diverse, tutte nello stesso verso, così gli aerei non si
// incrociano mai. Uno dei sei, quando fa il giro con la scritta, fa anche una giravolta
const PERCORSI = Array.from({ length: 6 }, (_, i) => {
  const r = 5.2 + i * 0.42, h = 1.3 + i * 0.3;
  return { punto: (f: number) => new THREE.Vector3(Math.cos(f) * r, h + Math.sin(f * 2 + i) * 0.1, Math.sin(f) * r * 0.78), dir: 1 as const, u: 1.55 + (i % 3) * 0.12, giravolta: i === 5 };
});

export function monta(el: HTMLElement, o: OpzioniAeroporto) {
  const r = casuale(11);
  // La vista guarda il centro dell'isola, al centro della pagina
  const sx = 0;
  const p = palco(el, {
    camera: new THREE.Vector3(7.4 + sx, 8.6, 11), mira: new THREE.Vector3(sx, 0.55, -0.4), fov: 36, giro: 0.014, inclina: [-0.22, 0.26], zoom: [0.5, 1.4], nebbia: [1.6, 3],
    aggiorna, clic, scena: 'aeroporto', toni: SITO,
  });
  const G = p.gruppo, C = p.colori, chiaro = p.chiaro;
  const M = {
    edificio: mat('#6a6a6a', { opacity: 0.1, fili: 0.75 }), vetro: mat(C.azzurro, { opacity: chiaro ? 0.25 : 0.2, fili: 0.6 }),
    base: mat('#6a6a6a', { opacity: 0.05, fili: 0.3 }), legno: mat('#a07a50', { grezzo: true, opacity: 0.25, fili: 0.85 }),
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
  const FILO = chiaro ? '#3a332c' : '#e8e6e0';

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
  const ERBA = new THREE.Color(chiaro ? '#7cc35c' : '#6fa646'), SABBIA = new THREE.Color(chiaro ? '#f2dfb0' : '#efe0b8');
  {
    const geo = new THREE.RingGeometry(0.001, 1, ANGOLI, 28).rotateX(-Math.PI / 2);
    const q = geo.attributes.position as THREE.BufferAttribute, colori: number[] = [];
    for (let i = 0; i < q.count; i++) {
      const x = q.getX(i), z = q.getZ(i), t = Math.atan2(z, x), u = Math.hypot(x, z) * 0.995, rr = u * rivaA(t);
      const X = Math.cos(t) * rr, Z = Math.sin(t) * rr;
      q.setXYZ(i, X, Math.max(0.005, altezza(X, Z)) - 0.004, Z);
      const c = u > 0.95 ? SABBIA : ERBA;
      colori.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colori, 3));
    const velo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: chiaro ? 0.5 : 0.36, depthWrite: false }));
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
  // I fianchi di terra: un velo tenue che scende nell'acqua e due strati ondulati
  const TERRA = chiaro ? '#a88a6a' : '#8f7a62';
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
    G.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: TERRA, transparent: true, opacity: chiaro ? 0.18 : 0.08, side: THREE.DoubleSide, depthWrite: false })));
    for (const [y0, f] of [[-0.14, 0.973], [-0.3, 0.946]] as const) for (let k = 0; k < ANGOLI; k++) {
      const t0 = (k / ANGOLI) * Math.PI * 2, t1 = ((k + 1) / ANGOLI) * Math.PI * 2, w = (t: number) => y0 + Math.sin(t * 9 + y0 * 40) * 0.025;
      strati.push(Math.cos(t0) * rivaA(t0) * f, w(t0), Math.sin(t0) * rivaA(t0) * f, Math.cos(t1) * rivaA(t1) * f, w(t1), Math.sin(t1) * rivaA(t1) * f);
    }
    fili(strati, TERRA, 0.4);
  }

  // --- La pista: una striscia chiara con gli angoli tondi, la linea di mezzo tratteggiata, le frecce e le luci colorate
  const tondo = (w: number, d: number, rr: number, x: number, z: number, m: THREE.Material, y = H0 + 0.004) => {
    const s = new THREE.Shape(), a = w / 2 - rr, b = d / 2 - rr;
    s.moveTo(-a, -d / 2); s.lineTo(a, -d / 2); s.absarc(a, -b, rr, -Math.PI / 2, 0, false); s.lineTo(w / 2, b); s.absarc(a, b, rr, 0, Math.PI / 2, false);
    s.lineTo(-a, d / 2); s.absarc(-a, b, rr, Math.PI / 2, Math.PI, false); s.lineTo(-w / 2, -b); s.absarc(-a, -b, rr, Math.PI, Math.PI * 1.5, false);
    const g = new THREE.ShapeGeometry(s, 6).rotateX(-Math.PI / 2);
    G.add(pezzo(g, m, x, y, z));
  };
  const PISTA = chiaro ? '#cfc6b4' : '#e8dcc0';
  tondo(5.4, 0.52, 0.26, 0, PZ, tenue(PISTA, chiaro ? 0.75 : 0.3, 0.9));
  const Y = H0 + 0.012, segni: number[] = [], frecce: number[] = [];
  for (let x = -2; x < 2.1; x += 0.4) segni.push(x, Y, PZ, x + 0.2, Y, PZ);
  for (let k = 0; k < 3; k++) { const x = -2.45 + k * 0.12; frecce.push(x, Y, PZ - 0.15, x + 0.09, Y, PZ, x + 0.09, Y, PZ, x, Y, PZ + 0.15); }
  fili(segni, chiaro ? '#ffffff' : '#fffaf0', 0.95);
  fili(frecce, '#f0603f', 0.95);
  const LUCI = 26, luci = puntiMorbidi(LUCI * 2), tinteLuci = ['#f2c14e', '#8fd6b4', '#ff9fb4'].map(c => new THREE.Color(c));
  G.add(luci.punti);
  for (let i = 0; i < LUCI * 2; i++) {
    const k = i % LUCI, x = -2.6 + (k / (LUCI - 1)) * 5.2, z = i < LUCI ? PZ - 0.29 : PZ + 0.29, c = tinteLuci[k % 3]!;
    luci.pos.set([x, H0 + 0.04, z], i * 3); luci.col.set([c.r, c.g, c.b], i * 3); luci.dim[i] = 0.08;
  }

  // --- La torre: fusto a filo, una bolla di vetro in cima, l'antenna a strisce bianche e rosse, la spia che lampeggia
  const TX = -3.05, TZ = -0.75, TY = altezza(TX, TZ);
  tubo(0.1, 0.17, 1.1, TX, TY, TZ, M.edificio, 10);
  tubo(0.2, 0.2, 0.05, TX, TY + 1.1, TZ, M.edificio, 12);
  const bolla = new THREE.IcosahedronGeometry(0.28, 1); bolla.scale(1, 0.72, 1);
  G.add(pezzo(bolla, M.vetro, TX, TY + 1.32, TZ));
  for (let k = 0; k < 4; k++) tubo(0.022, 0.022, 0.07, TX, TY + 1.52 + k * 0.07, TZ, pieno(k % 2 ? '#f4f1ea' : '#f0603f'), 8);
  const spia = pezzo(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: '#f0603f', transparent: true }), TX, TY + 1.84, TZ);
  G.add(spia);
  tubo(0.008, 0.008, 0.3, -3.6, altezza(-3.6, 0.6), 0.6, M.edificio, 4);
  const manica = new THREE.Group();
  manica.position.set(-3.6, altezza(-3.6, 0.6) + 0.28, 0.6);
  G.add(manica);
  const geoManica = new THREE.CylinderGeometry(0.03, 0.05, 0.22, 8, 1, true);
  geoManica.rotateZ(Math.PI / 2); geoManica.translate(0.12, 0, 0);
  manica.add(pezzo(geoManica, pieno('#f2a43a')));

  // --- Il faro in fondo alla pista, di lato alla traiettoria di decollo: il fascio parte stretto dalla lanterna e si allarga
  const FX = 3.35, FZ = -0.35, FY = altezza(FX, FZ);
  tubo(0.18, 0.2, 0.08, FX, FY, FZ, pieno('#9a958c'), 10);
  for (let k = 0; k < 4; k++) tubo(0.13 - k * 0.012, 0.145 - k * 0.012, 0.15, FX, FY + 0.08 + k * 0.15, FZ, pieno(k % 2 ? '#f0603f' : '#f4f1ea'), 10);
  tubo(0.1, 0.1, 0.1, FX, FY + 0.68, FZ, pieno('#ffd23f', 0.15), 8);
  tubo(0.01, 0.13, 0.09, FX, FY + 0.78, FZ, pieno('#f0603f'), 8);
  const fascio = new THREE.Group();
  fascio.position.set(FX, FY + 0.73, FZ);
  G.add(fascio);
  const geoFascio = new THREE.ConeGeometry(0.28, 2.2, 16, 1, true); geoFascio.rotateZ(Math.PI / 2); geoFascio.translate(1.1, 0, 0);
  fascio.add(new THREE.Mesh(geoFascio, new THREE.MeshBasicMaterial({ color: '#fff3a8', transparent: true, opacity: chiaro ? 0.22 : 0.12, depthWrite: false, side: THREE.DoubleSide })));

  // --- L'hangar: piccolo, ad arco, a strisce bianche e rosse, con il portone aperto verso la pista e un tondo giallo
  // sopra l'ingresso. L'aereo chiamato si ferma qui davanti mentre si risponde
  const HX = FERMO.x, HZ = -0.42;
  {
    const g = new THREE.Group(), larga = 0.94, fondo = 0.72, fette = 5;
    g.position.set(HX, H0, HZ);
    G.add(g);
    for (let k = 0; k < fette; k++) {
      const arco = new THREE.CylinderGeometry(larga / 2, larga / 2, fondo / fette, 20, 1, true, -Math.PI / 2, Math.PI);
      arco.rotateX(-Math.PI / 2);
      const m = pieno(k % 2 ? '#e85d4a' : '#f4f1ea', 0.14);
      m.side = THREE.DoubleSide;
      g.add(pezzo(arco, m, 0, 0, -fondo / 2 + (k + 0.5) * (fondo / fette)));
    }
    g.add(pezzo(new THREE.CircleGeometry(larga / 2, 20, 0, Math.PI), pieno('#3a332c', 0.05), 0, 0, -fondo / 2));
    // Il portone, aperto: due ante spinte ai lati
    for (const v of [-1, 1]) g.add(pezzo(new THREE.BoxGeometry(0.2, 0.3, 0.02), pieno('#8fa6b8', 0.12), v * (larga / 2 + 0.1), 0.15, fondo / 2));
    g.add(pezzo(new THREE.CircleGeometry(0.06, 16), pieno('#f7cf4f', 0.12), 0, larga / 2 - 0.08, fondo / 2 + 0.004));
    // Il piazzale chiaro tra l'hangar e la pista
    tondo(1.1, PZ - (HZ + fondo / 2) + 0.05, 0.08, HX, (HZ + fondo / 2 + PZ) / 2, tenue(PISTA, chiaro ? 0.5 : 0.18, 0.5));
  }

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

  // --- Alberi come quelli di Learn: il tronco è un filo, la chioma sono palle o coni a filo con un riempimento tenue
  const chiome = [mat('#6fa646'), mat('#5f9c45'), mat('#4f8a3c')];
  const fusto = linea(FILO, 0.7);
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
    (Math.abs(x) < 3 && z > 0.12 && z < 1.0) || (Math.abs(x - HX) < 0.85 && z > -1.0 && z < 0.3) || Math.hypot(x - TX, z - TZ) < 0.45 || Math.hypot(x - FX, z - FZ) < 0.45 ||
    Math.hypot(x - PCX, z - PCZ) < 0.75 || Math.hypot(x + 3.6, z - 0.6) < 0.3;
  const posti: [number, number][] = [];
  for (let i = 0; i < 1500 && posti.length < 22; i++) {
    const x = (r() - 0.5) * 9.6, z = (r() - 0.5) * 6.8;
    if (forma(x, z) < 0.86 && !vietati(x, z) && posti.every(([u, v]) => Math.hypot(u - x, v - z) > 0.45)) posti.push([x, z]);
  }
  posti.forEach(([x, z], k) => albero(x, z, 0.32 + r() * 0.22, k));
  for (let i = 0; i < 10; i++) { const t = r() * 6.28, rr = rivaA(t) * (1.02 + r() * 0.08); G.add(pezzo(sasso(0.05 + r() * 0.06, r, 0), M.base, Math.cos(t) * rr, -0.4, Math.sin(t) * rr)); }

  // --- Il mare: un cerchio intorno all'isola, come il laghetto. Sotto, un velo azzurro che sfuma piano verso il bordo,
  // senza linea di contorno; sopra, la griglia di punti che ondeggia con onde lunghe. Ogni tanto un cerchio d'acqua si allarga
  const MARE = 8.8, AZZURRO = new THREE.Color(C.azzurro);
  {
    const geo = new THREE.RingGeometry(0.01, MARE, 96, 24).rotateX(-Math.PI / 2);
    const q = geo.attributes.position as THREE.BufferAttribute, colori: number[] = [], op = chiaro ? 0.16 : 0.1;
    for (let i = 0; i < q.count; i++) {
      const d = Math.hypot(q.getX(i), q.getZ(i));
      colori.push(AZZURRO.r, AZZURRO.g, AZZURRO.b, op * (1 - THREE.MathUtils.smoothstep(d, MARE * 0.35, MARE)));
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colori, 4));
    const velo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
    velo.position.y = -0.47;
    velo.renderOrder = -2;
    G.add(velo);
  }
  const PASSO = p.telefono ? 0.26 : 0.19, celle: { x: number; z: number; d: number }[] = [];
  for (let x = -MARE; x <= MARE; x += PASSO) for (let z = -MARE; z <= MARE; z += PASSO) {
    const d = Math.hypot(x, z);
    if (forma(x, z) < 1.02 || d > MARE) continue;
    celle.push({ x, z, d });
  }
  const acqua = puntiMorbidi(celle.length);
  G.add(acqua.punti);
  celle.forEach((c, i) => {
    acqua.col.set([AZZURRO.r, AZZURRO.g, AZZURRO.b], i * 3);
    acqua.dim[i] = 0.055;
    acqua.alfa[i] = (1 - THREE.MathUtils.smoothstep(c.d, MARE - 3.4, MARE)) * (chiaro ? 0.85 : 0.72);
    acqua.pos.set([c.x, -0.42, c.z], i * 3);
  });
  // L'altezza dell'onda in un punto
  const ondaIn = (x: number, z: number, s: number) => -0.42 + Math.sin(x * 0.9 + s * 0.7) * 0.085 + Math.sin(z * 1.2 - s * 0.55 + x * 0.35) * 0.065 + Math.sin(Math.hypot(x, z) * 1.6 - s * 0.9) * 0.04;
  const anello = () => {
    const pt: THREE.Vector3[] = [];
    for (let k = 0; k <= 48; k++) { const t = (k / 48) * Math.PI * 2; pt.push(new THREE.Vector3(Math.cos(t), 0, Math.sin(t))); }
    const ob = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pt), new THREE.LineBasicMaterial({ color: AZZURRO, transparent: true, opacity: 0 }));
    G.add(ob);
    return { o: ob, t: 9, x: 0, z: 0, grande: 0.6 };
  };
  const cerchi = Array.from({ length: 5 }, anello);
  let prossimoCerchio = 1;
  const nuovoCerchio = (x: number, z: number, grande: number) => { const c = cerchi.find(q => q.t >= 2.8); if (c) { c.x = x; c.z = z; c.t = 0; c.grande = grande; } };
  const inAcqua = (x: number, z: number) => forma(x, z) > 1;

  // --- La balena: una megattera bianca come i cervi della home
  // (nera nel tema chiaro). Il corpo non è rigido: è un tubo lungo una spina che ondeggia su e giù, con l'onda che
  // passa dalla testa alla coda e cresce verso la coda, come nuotano i cetacei. Pinne pettorali lunghe che remano piano,
  // coda larga con la tacca, inclinata come la fine della spina. Ogni 20 secondi circa risale, soffia, mostra il dorso,
  // poi si immerge inarcandosi e alza la coda fuori dall'acqua.
  const BIANCO = new THREE.Color(chiaro ? '#23201b' : '#f4f1ea'), VENTRE = BIANCO.clone().lerp(new THREE.Color(chiaro ? '#5a554e' : '#9aa3ad'), 0.55);
  const LB = 1.5, NB = 40, MB = 16;
  const curvaB = (punti: number[][], t: number) => { let i = 0; while (i < punti.length - 2 && punti[i + 1]![0]! < t) i++; const [a, va] = punti[i]!, [b, vb] = punti[i + 1]!; const k = (t - a!) / (b! - a!); return va! + (vb! - va!) * liscio(Math.min(1, Math.max(0, k))); };
  // t = 0 muso, t = 1 coda: larghezza e altezza della sezione
  const LARGO = [[0, 0.02], [0.05, 0.1], [0.18, 0.165], [0.35, 0.185], [0.55, 0.15], [0.75, 0.08], [0.9, 0.04], [1, 0.025]];
  const ALTO = [[0, 0.02], [0.05, 0.075], [0.18, 0.13], [0.35, 0.145], [0.55, 0.12], [0.75, 0.075], [0.9, 0.045], [1, 0.03]];
  const balena = new THREE.Group(), posB = new Float32Array((NB + 1) * (MB + 1) * 3), colB: number[] = [], indB: number[] = [];
  for (let i = 0; i <= NB; i++) for (let j = 0; j <= MB; j++) {
    const sa = Math.sin((j / MB) * Math.PI * 2), k = THREE.MathUtils.clamp(0.5 - sa * 0.5, 0, 1), c = BIANCO.clone().lerp(VENTRE, k * k);
    colB.push(c.r, c.g, c.b);
    if (i < NB && j < MB) { const a = i * (MB + 1) + j, b = a + MB + 1; indB.push(a, a + 1, b, b, a + 1, b + 1); }
  }
  const geoB = new THREE.BufferGeometry();
  geoB.setAttribute('position', new THREE.BufferAttribute(posB, 3));
  const coloriB = new Float32Array(colB), baseB = Float32Array.from(colB);
  geoB.setAttribute('color', new THREE.BufferAttribute(coloriB, 3));
  geoB.setIndex(indB);
  const corpoB = new THREE.Mesh(geoB, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  corpoB.frustumCulled = false;
  balena.add(corpoB);
  const pelleB = new THREE.MeshBasicMaterial({ color: BIANCO, side: THREE.DoubleSide }), ventreB = new THREE.MeshBasicMaterial({ color: VENTRE, side: THREE.DoubleSide });
  // Sott'acqua la balena si sfuma nel colore del mare: resta opaca, così non tremola
  const MARE_B = new THREE.Color(chiaro ? '#d6e6ee' : '#0e2433');
  const pinne = [-1, 1].map(v => {
    const foglia = new THREE.Shape();
    foglia.moveTo(0, 0.04); foglia.bezierCurveTo(0.16, 0.05, 0.36, -0.02, 0.5, -0.1); foglia.bezierCurveTo(0.36, -0.06, 0.16, -0.05, 0, -0.04); foglia.closePath();
    const f = new THREE.Mesh(new THREE.ShapeGeometry(foglia, 10).rotateX(Math.PI / 2), ventreB);
    const g = new THREE.Group();
    g.add(f); g.scale.set(v, 1, 1);
    balena.add(g);
    return { g, v };
  });
  const codaB = new THREE.Group();
  {
    const lobo = new THREE.Shape();
    lobo.moveTo(0, 0.02); lobo.bezierCurveTo(0.1, 0, 0.22, -0.03, 0.33, -0.16); lobo.bezierCurveTo(0.25, -0.17, 0.13, -0.17, 0.03, -0.12); lobo.lineTo(0, -0.09);
    lobo.lineTo(-0.03, -0.12); lobo.bezierCurveTo(-0.13, -0.17, -0.25, -0.17, -0.33, -0.16); lobo.bezierCurveTo(-0.22, -0.03, -0.1, 0, 0, 0.02);
    codaB.add(new THREE.Mesh(new THREE.ShapeGeometry(lobo, 12).rotateX(Math.PI / 2), pelleB));
  }
  balena.add(codaB);
  G.add(balena);
  const GOCCE = 34, spruzzo = puntiMorbidi(GOCCE), gocce = Array.from({ length: GOCCE }, () => ({ x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0, vita: 0 }));
  G.add(spruzzo.punti);
  for (let i = 0; i < GOCCE; i++) { spruzzo.col.set([0.88, 0.95, 1], i * 3); spruzzo.dim[i] = 0.06; spruzzo.alfa[i] = 0; }
  let soffiato = false, schizzato = false;
  const spina = new THREE.Vector3(), spinaDopo = new THREE.Vector3();

  // --- Nuvole a filo, sparse a caso in tutto il cielo, ognuna con la sua forma. Appaiono piano; il vento le porta tutte
  // nella stessa direzione e, quando escono dal cielo, svaniscono e rinascono dall'altra parte. Il puntatore le scosta
  const VENTO = new THREE.Vector3(1, 0, 0.35).normalize(), CIELO = 10;
  const nuvole = Array.from({ length: 10 }, () => {
    const g = new THREE.Group(), m = mat('#8a8f96', { opacity: 0.05, fili: 0.22 }), linea0 = m.userData.linea as THREE.LineBasicMaterial;
    const n = 3 + Math.floor(r() * 5), largo = 0.5 + r() * 0.7;
    const sbuffi = Array.from({ length: n }, (_, i) => {
      const t = n > 1 ? i / (n - 1) - 0.5 : 0, d = (0.2 + r() * 0.28) * (1 - Math.abs(t) * 0.6);
      const ob = pezzo(sasso(d, r, 1), m, t * largo * 2 + (r() - 0.5) * 0.2, (r() - 0.2) * 0.16 + (0.5 - Math.abs(t)) * 0.12, (r() - 0.5) * 0.45);
      g.add(ob);
      return { ob, x0: ob.position.x, y0: ob.position.y, z0: ob.position.z, vx: 0, vy: 0, vz: 0 };
    });
    const a = r() * Math.PI * 2, dd = Math.sqrt(r()) * CIELO * 0.95;
    g.position.set(Math.cos(a) * dd, 3.5 + r() * 1.6, Math.sin(a) * dd);
    g.rotation.y = r() * Math.PI;
    g.scale.setScalar(0.45 + r() * 0.45);
    G.add(g);
    return { g, m, linea0, sbuffi, vista: 0, ritardo: 0.3 + r() * 5, vel: 0.06 + r() * 0.06, esce: 1 };
  });
  const tmpN = new THREE.Vector3(), vicino = new THREE.Vector3();

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

  // --- Lo striscione: il termine scritto in aria, che segue la scia dell'aereo in prospettiva, nel colore della sezione
  const SEGMENTI = 18;
  const nuovoStriscione = (testo: string, tinta: string) => {
    const tela = document.createElement('canvas');
    tela.width = 1024; tela.height = 96;
    const cx = tela.getContext('2d')!;
    // Solo il testo, senza fondo: nel colore dell'aereo con un bordo scuro, nel mono del sito, come i nomi delle mongolfiere
    const mono = getComputedStyle(document.documentElement).getPropertyValue('--mono').trim() || 'ui-monospace, monospace';
    const scrivi = (t: string) => {
      const parola = t.toUpperCase();
      cx.clearRect(0, 0, 1024, 96);
      cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.lineJoin = 'round';
      let corpo = 76;
      do { cx.font = `bold ${corpo}px ${mono}`; corpo -= 2; } while (cx.measureText(parola).width > 990 && corpo > 20);
      cx.strokeStyle = 'rgba(10,12,16,.85)'; cx.lineWidth = 10; cx.strokeText(parola, 512, 50);
      cx.fillStyle = tinta; cx.fillText(parola, 512, 50);
      return THREE.MathUtils.clamp(parola.length * 0.1, 0.9, 1.9);
    };
    const lungo = scrivi(testo);
    const mappa = new THREE.CanvasTexture(tela);
    mappa.colorSpace = THREE.SRGBColorSpace;
    mappa.anisotropy = 4;
    const geo = new THREE.BufferGeometry(), pos = new Float32Array((SEGMENTI + 1) * 2 * 3), uv: number[] = [], indici: number[] = [];
    for (let k = 0; k <= SEGMENTI; k++) {
      // Il testo si legge dalla coda dell'aereo verso il fondo dello striscione
      uv.push(k / SEGMENTI, 1, k / SEGMENTI, 0);
      if (k < SEGMENTI) indici.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(indici);
    // Una faccia sola: il testo si legge da un lato, dall'altro non si vede
    const nastro = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: mappa, side: THREE.FrontSide, transparent: true, opacity: 0, depthWrite: false }));
    nastro.frustumCulled = false;
    const fune = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: FILO, transparent: true, opacity: 0 }));
    fune.frustumCulled = false;
    G.add(nastro, fune);
    const st = { nastro, fune, pos, lungo, cambia: (t: string) => { st.lungo = scrivi(t); mappa.needsUpdate = true; } };
    return st;
  };

  // --- Gli aerei e i loro stati: attesa sul mare, arrivo e atterraggio, fermo sulla pista, decollo, giro con lo striscione
  type Stato = 'attesa' | 'arrivo' | 'fermo' | 'decollo' | 'ritorno' | 'giro';
  type Rotta = { curva: THREE.CatmullRomCurve3; lungo: number; s: number; veloce?: boolean };
  type Aereo = {
    g: THREE.Group; elica: THREE.Group; ombra: THREE.Mesh; stato: Stato; rotta: Rotta | null; f: number; v: number;
    rollio: number; via: boolean; fatto: boolean; scia: THREE.Vector3[]; striscione: ReturnType<typeof nuovoStriscione>; vista: number; prima: THREE.Vector3; dir: THREE.Vector3;
  };
  const nuovaRotta = (punti: THREE.Vector3[]): Rotta => {
    const curva = new THREE.CatmullRomCurve3(punti, false, 'centripetal');
    curva.arcLengthDivisions = 400;
    return { curva, lungo: curva.getLength(), s: 0 };
  };
  // Il punto del percorso più vicino a un punto dato, e il parametro di poco più avanti
  const aggancio = (i: number, vicinoA: THREE.Vector3) => {
    const pr = PERCORSI[i]!;
    let meglio = 0, dm = 1e9;
    for (let k = 0; k < 120; k++) { const f = (k / 120) * Math.PI * 2, dd = pr.punto(f).distanceTo(vicinoA); if (dd < dm) { dm = dd; meglio = f; } }
    return meglio;
  };
  const VELOCITA_ORBITA = 0.3;
  const aerei: Aereo[] = o.tinte.map((t, i) => {
    const { g, elica } = nuovoAereo(t);
    g.userData.indice = i;
    G.add(g);
    const ombra = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: chiaro ? 0.14 : 0.3, depthWrite: false }));
    ombra.rotation.x = -Math.PI / 2; ombra.scale.set(1.3, 0.6, 1);
    G.add(ombra);
    const fatto = !!o.partiti[i], f = (i / o.tinte.length) * Math.PI * 2;
    const inizio = PERCORSI[i % PERCORSI.length]!.punto(f);
    g.position.copy(inizio);
    return {
      g, elica, ombra, stato: 'giro', rotta: null, f, v: 0, rollio: 0, via: false, fatto,
      scia: Array.from({ length: 140 }, () => inizio.clone()), striscione: nuovoStriscione(o.termini[i] ?? '', t), vista: fatto ? 1 : 0, prima: inizio.clone(), dir: new THREE.Vector3(1, 0, 0),
    };
  });
  // Arrivo: esce dalla sua orbita, va verso ovest, poi un avvicinamento dritto e in discesa costante fino all'hangar
  const rottaArrivo = (a: Aereo) => {
    const qui = a.g.position.clone(), avanti = qui.clone().add(a.dir.clone().setY(0).normalize().multiplyScalar(1.4));
    return nuovaRotta([qui, avanti, new THREE.Vector3(-7.4, 1.4, -1.9), new THREE.Vector3(-8.2, 1.2, -0.2), new THREE.Vector3(-7.4, 1.06, PZ), new THREE.Vector3(-5.4, 0.74, PZ),
      new THREE.Vector3(-2.6, SUOLO + 0.02, PZ), new THREE.Vector3(-1.2, SUOLO, PZ), FERMO.clone()]);
  };
  // Decollo: verso est sulla pista, salita, poi si aggancia alla sua orbita
  const rottaDecollo = (a: Aereo, i: number) => {
    const uscita = [FERMO.clone(), new THREE.Vector3(1.6, SUOLO, PZ), new THREE.Vector3(2.8, SUOLO + 0.05, PZ), new THREE.Vector3(4.4, 0.6, PZ), new THREE.Vector3(6, 1.3, -0.3)];
    // Se sta ancora arrivando: in volo riattacca dal punto in cui è; sulla pista riparte da dove sta rullando
    let veloce = false;
    if (a.stato === 'arrivo' && a.g.position.y > 0.3) { uscita.splice(0, uscita.length, a.g.position.clone(), a.g.position.clone().add(a.dir.clone().multiplyScalar(1.2)).setY(a.g.position.y + 0.5)); veloce = true; }
    else if (a.stato === 'arrivo') uscita[0] = a.g.position.clone();
    const pr = PERCORSI[i]!, f0 = aggancio(i, new THREE.Vector3(7, 1.6, -1.5));
    a.f = f0 + pr.dir * 0.25;
    return { ...nuovaRotta([...uscita, pr.punto(f0), pr.punto(a.f)]), veloce };
  };
  const passo = (a: Aereo) => a.rotta!.curva.getPointAt(Math.min(1, a.rotta!.s / a.rotta!.lungo));

  // Clic su un aereo: apre il suo biglietto
  function clic(raggio: THREE.Raycaster) {
    const colpo = raggio.intersectObjects(aerei.map(a => a.g), true)[0];
    if (!colpo) return;
    let x: THREE.Object3D | null = colpo.object;
    while (x && x.userData.indice === undefined) x = x.parent;
    if (x) o.alClic(x.userData.indice as number);
  }

  // --- Ogni fotogramma
  const d = new THREE.Vector3(), su = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), zero = new THREE.Vector3(), rot = new THREE.Quaternion(), asse = new THREE.Vector3(0, 0, 1), rol = new THREE.Quaternion();
  const coda0 = new THREE.Vector3(), tmp = new THREE.Vector3();
  let ultimo = '', tempoLista = 0;
  function aggiorna(s: number, dt: number) {
    fascio.rotation.y = s * 0.9;
    manica.rotation.y = 0.4 + Math.sin(s * 0.7) * 0.25;
    (spia.material as THREE.MeshBasicMaterial).opacity = Math.floor(s * 1.4) % 2 ? 1 : 0.15;
    for (let i = 0; i < LUCI * 2; i++) luci.alfa[i] = Math.max(0.3, 1 - ((s * 9 - (i % LUCI)) % LUCI + LUCI) % LUCI / 6);
    luci.aggiorna();
    celle.forEach((c, i) => { acqua.pos[i * 3 + 1] = ondaIn(c.x, c.z, s); });
    acqua.aggiorna();
    prossimoCerchio -= dt;
    if (prossimoCerchio <= 0) {
      prossimoCerchio = 0.9 + r() * 1.4;
      for (let k = 0; k < 20; k++) {
        const t = r() * 6.28, dd = 4 + r() * 4;
        if (forma(Math.cos(t) * dd, Math.sin(t) * dd) > 1.15) { nuovoCerchio(Math.cos(t) * dd, Math.sin(t) * dd, 0.6); break; }
      }
    }
    cerchi.forEach(c => {
      c.t += dt;
      const k = Math.min(1, c.t / 2.8);
      c.o.position.set(c.x, -0.38, c.z);
      c.o.scale.setScalar(0.05 + k * c.grande);
      (c.o.material as THREE.LineBasicMaterial).opacity = (1 - k) * (chiaro ? 0.8 : 0.6);
    });

    // Gli aerei
    aerei.forEach((a, i) => {
      a.elica.rotation.z += dt * (a.stato === 'fermo' ? 6 : 28);
      a.prima.copy(a.g.position);
      const pr = PERCORSI[i]!;
      if (a.stato === 'giro') {
        // Ognuno ha il suo posto sull'orbita, a 60 gradi dagli altri, e i posti girano tutti insieme: così gli aerei non si
        // avvicinano mai. Chi rientra dopo un atterraggio accelera o rallenta piano finché raggiunge il suo posto
        const posto = s * VELOCITA_ORBITA + (i / aerei.length) * Math.PI * 2;
        const scarto = Math.atan2(Math.sin(posto - a.f), Math.cos(posto - a.f));
        a.f += (VELOCITA_ORBITA + THREE.MathUtils.clamp(scarto * 0.35, -0.12, 0.12)) * dt;
        a.g.position.copy(pr.punto(a.f));
      } else if (a.stato === 'fermo') {
        a.g.position.copy(FERMO);
        if (a.via) { a.rotta = rottaDecollo(a, i); a.stato = 'decollo'; a.via = false; }
      } else if (a.rotta) {
        const resto = a.rotta.lungo - a.rotta.s;
        let v: number;
        if (a.stato === 'arrivo') v = Math.min(2 - Math.max(0, 1 - (resto - 3) / 4) * 0.6, Math.sqrt(0.75 * Math.max(0, resto)) + 0.04);
        else v = Math.min(2, Math.sqrt(1.3 * a.rotta.s) + (a.rotta.veloce ? 1.6 : 0.12));
        a.v = v;
        a.rotta.s += v * dt;
        a.g.position.copy(passo(a));
        if (a.rotta.s >= a.rotta.lungo) {
          if (a.stato === 'arrivo') { a.stato = 'fermo'; a.rotta = null; }
          else if (a.stato === 'decollo') { a.stato = 'giro'; a.rotta = null; }
          else { a.stato = 'giro'; a.rotta = null; }
        }
      }
      // L'orientamento segue il movimento; nelle curve, in volo, l'aereo si inclina
      d.subVectors(a.g.position, a.prima);
      const mosso = d.length();
      if (mosso > 1e-5) {
        d.divideScalar(mosso);
        const volta = (a.dir.x * d.z - a.dir.z * d.x) / Math.max(1e-4, mosso) * 0.25, inAria = a.g.position.y > 0.4;
        a.rollio += ((inAria ? THREE.MathUtils.clamp(volta * 3.2, -0.65, 0.65) : 0) - a.rollio) * Math.min(1, dt * 3);
        a.dir.copy(d);
      }
      m4.lookAt(a.dir, zero, su);
      rot.setFromRotationMatrix(m4);
      let giro = a.rollio;
      // Uno dei sei fa una giravolta a ogni giro
      if (pr.giravolta && a.stato === 'giro' && a.fatto) { const fm = ((a.f % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); if (fm < 0.9) giro += liscio(fm / 0.9) * Math.PI * 2 * -pr.dir; }
      rol.setFromAxisAngle(asse, giro);
      a.g.quaternion.copy(rot).multiply(rol);
      const x = a.g.position.x, z = a.g.position.z, h = a.g.position.y;
      const sotto = inAcqua(x, z) ? -0.4 : Math.max(0.005, altezza(x, z)) + 0.008;
      a.ombra.position.set(x + (h - sotto) * 0.12, sotto, z + (h - sotto) * 0.08);
      a.ombra.rotation.z = Math.atan2(a.dir.x, a.dir.z) + Math.PI / 2;
      (a.ombra.material as THREE.MeshBasicMaterial).opacity = (chiaro ? 0.14 : 0.3) * Math.max(0.2, 1 - (h - sotto) * 0.25);

      // La scia: le ultime posizioni, per far seguire lo striscione
      if (mosso > 0.004) { const vecchio = a.scia.pop()!; vecchio.copy(a.g.position); a.scia.unshift(vecchio); }
      const st = a.striscione, mostra = a.fatto && (a.stato === 'giro' || (a.stato === 'decollo' && h > 0.5));
      a.vista = Math.max(0, Math.min(1, a.vista + (mostra ? dt : -dt * 2)));
      (st.nastro.material as THREE.MeshBasicMaterial).opacity = a.vista;
      (st.fune.material as THREE.LineBasicMaterial).opacity = a.vista * 0.8;
      st.nastro.visible = st.fune.visible = a.vista > 0.01;
      if (st.nastro.visible) {
        // Punti della scia a distanze fisse dietro l'aereo: la fune, poi lo striscione che ondeggia
        const inizioN = 0.42, campioni: THREE.Vector3[] = [];
        let k = 0, fatta = 0, cerca = inizioN;
        coda0.copy(a.g.position).addScaledVector(a.dir, -0.3);
        const lungoTot = inizioN + st.lungo, segno = st.lungo / SEGMENTI;
        while (campioni.length <= SEGMENTI && k < a.scia.length - 1) {
          const p0 = a.scia[k]!, p1 = a.scia[k + 1]!, l = p0.distanceTo(p1);
          if (fatta + l >= cerca) { campioni.push(tmp.lerpVectors(p0, p1, l > 0 ? (cerca - fatta) / l : 0).clone()); cerca += segno; if (cerca > lungoTot + 1e-4) break; continue; }
          fatta += l; k++;
        }
        while (campioni.length <= SEGMENTI) campioni.push((campioni[campioni.length - 1] ?? coda0).clone().addScaledVector(a.dir, -segno));
        const alto = 0.19;
        campioni.forEach((c, j) => {
          const sv = Math.sin(s * 9 - j * 0.6) * 0.018 * (j / SEGMENTI);
          st.pos.set([c.x, c.y + 0.05 + sv, c.z, c.x, c.y + 0.05 - alto + sv, c.z], j * 6);
        });
        (st.nastro.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        coda0.copy(a.g.position).addScaledVector(a.dir, -0.3);
        const fp = st.fune.geometry.attributes.position as THREE.BufferAttribute;
        fp.setXYZ(0, coda0.x, coda0.y + 0.1, coda0.z); fp.setXYZ(1, campioni[0]!.x, campioni[0]!.y + 0.05 - alto / 2, campioni[0]!.z);
        fp.needsUpdate = true;
      }
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

    // La balena: nuota lungo un giro largo, con un ciclo di 22 secondi
    {
      const ang = -s * 0.045, bx = Math.cos(ang) * 6.9, bz = Math.sin(ang) * 5.6, c = (s % 22) / 22;
      // Quota e inclinazione nel ciclo: sotto, risale, soffia e mostra il dorso, si immerge con la coda alta
      let quota: number, becco: number, tuffoVisto = 0;
      if (c < 0.4) { quota = -0.82; becco = 0; }
      else if (c < 0.55) { const k = liscio((c - 0.4) / 0.15); quota = -0.82 + k * 0.4; becco = 0.12 * Math.sin(k * Math.PI); }
      else if (c < 0.72) { quota = -0.42 + Math.sin(s * 1.3) * 0.012; becco = 0; }
      else { const k = (c - 0.72) / 0.28; quota = -0.42 - liscio(k) * 0.45; becco = -0.85 * Math.sin(liscio(k) * Math.PI * 0.92); tuffoVisto = Math.sin(k * Math.PI); }
      balena.position.set(bx, quota, bz);
      // Sott'acqua si intravede appena; in superficie è piena
      const visto = 0.28 + 0.72 * liscio(THREE.MathUtils.clamp((quota + 0.8) / 0.36, 0, 1));
      const k = Math.max(visto, tuffoVisto);
      for (let q = 0; q < baseB.length; q += 3) { coloriB[q] = MARE_B.r + (baseB[q]! - MARE_B.r) * k; coloriB[q + 1] = MARE_B.g + (baseB[q + 1]! - MARE_B.g) * k; coloriB[q + 2] = MARE_B.b + (baseB[q + 2]! - MARE_B.b) * k; }
      (geoB.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      pelleB.color.copy(MARE_B).lerp(BIANCO, k); ventreB.color.copy(MARE_B).lerp(VENTRE, k);
      balena.rotation.set(0, Math.atan2(Math.sin(ang) * 6.9, -Math.cos(ang) * 5.6), 0);
      balena.rotateX(-becco);
      // La spina: un'onda che va dalla testa alla coda e cresce verso la coda; durante il tuffo la coda si alza
      const tuffo = c > 0.72 ? Math.sin(((c - 0.72) / 0.28) * Math.PI) : 0;
      const ondaB = (t: number) => Math.sin(s * 2.4 - t * 4.2) * 0.07 * t * t + tuffo * 0.35 * t * t * t;
      for (let i = 0; i <= NB; i++) {
        const t = i / NB, z = LB / 2 - t * LB, y0 = ondaB(t), w = curvaB(LARGO, t), h = curvaB(ALTO, t);
        for (let j = 0; j <= MB; j++) {
          const a = (j / MB) * Math.PI * 2, sa = Math.sin(a), k = (i * (MB + 1) + j) * 3;
          posB[k] = Math.cos(a) * w; posB[k + 1] = y0 + (sa > 0 ? sa * h : sa * h * 0.8); posB[k + 2] = z;
        }
      }
      (geoB.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      // La coda segue la fine della spina, con la sua pendenza
      spina.set(0, ondaB(1), -LB / 2); spinaDopo.set(0, ondaB(0.97), -LB / 2 + LB * 0.03);
      codaB.position.copy(spina);
      codaB.rotation.set(Math.atan2(spinaDopo.y - spina.y, spinaDopo.z - spina.z) * 1.3, 0, 0);
      // Le pinne remano piano
      pinne.forEach(({ g, v }) => { g.position.set(v * 0.14, ondaB(0.3) - 0.08, LB / 2 - 0.3 * LB); g.rotation.set(0, v * -0.45, v * (-0.4 + Math.sin(s * 1.2) * 0.18)); });
      balena.scale.setScalar(0.7);
      // Il soffio quando arriva in superficie; un cerchio quando la coda entra in acqua
      if (c > 0.56 && c < 0.6 && !soffiato) {
        soffiato = true;
        tmp.set(0, 0.06, LB * 0.28).applyQuaternion(balena.quaternion).multiplyScalar(0.7).add(balena.position);
        gocce.forEach(g => { const a = r() * 6.28, v = 0.05 + r() * 0.12; g.x = tmp.x; g.y = -0.36; g.z = tmp.z; g.vx = Math.cos(a) * v; g.vz = Math.sin(a) * v; g.vy = 1.0 + r() * 0.45; g.vita = 1.5; });
        nuovoCerchio(bx, bz, 0.9);
      }
      if (c > 0.93 && !schizzato) { schizzato = true; nuovoCerchio(bx, bz, 1.2); }
      if (c < 0.5) { soffiato = false; schizzato = false; }
      gocce.forEach((g, i) => {
        if (g.vita > 0) { g.vita -= dt; g.vy -= dt * 1.7; g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; }
        spruzzo.pos.set([g.x, g.vita > 0 ? g.y : -9, g.z], i * 3);
        spruzzo.alfa[i] = g.vita > 0 ? Math.min(1, g.vita) * 0.85 : 0;
      });
      spruzzo.aggiorna();
    }

    // Le nuvole: il vento le porta; vicino al puntatore gli sbuffi si scostano e poi tornano al loro posto
    const raggio = p.raggio;
    nuvole.forEach(n => {
      n.ritardo -= dt;
      n.g.position.addScaledVector(VENTO, dt * n.vel);
      const lontano = Math.hypot(n.g.position.x, n.g.position.z);
      // Al bordo del cielo svanisce; poi rinasce dalla parte opposta e riappare piano
      if (lontano > CIELO && n.g.position.x * VENTO.x + n.g.position.z * VENTO.z > 0) {
        const a = Math.atan2(n.g.position.z, n.g.position.x) + Math.PI + (r() - 0.5) * 1.2;
        n.g.position.set(Math.cos(a) * CIELO * 0.98, 3.5 + r() * 1.6, Math.sin(a) * CIELO * 0.98);
        n.vista = 0; n.ritardo = r() * 2;
      }
      if (n.ritardo <= 0) n.vista = Math.min(1, n.vista + dt / 4);
      const vis = liscio(n.vista) * (1 - THREE.MathUtils.smoothstep(lontano, CIELO * 0.8, CIELO));
      n.sbuffi.forEach(b => {
        let fx = (b.x0 - b.ob.position.x) * 14, fy = (b.y0 - b.ob.position.y) * 14, fz = (b.z0 - b.ob.position.z) * 14;
        if (raggio && vis > 0.3) {
          b.ob.getWorldPosition(tmpN);
          raggio.ray.closestPointToPoint(tmpN, vicino);
          const dd = tmpN.distanceTo(vicino);
          if (dd < 0.8) {
            const k = ((0.8 - dd) * 9) / Math.max(0.05, dd) / n.g.scale.x;
            fx += (tmpN.x - vicino.x) * k; fy += (tmpN.y - vicino.y) * k; fz += (tmpN.z - vicino.z) * k;
          }
        }
        b.vx = (b.vx + fx * dt) * 0.9; b.vy = (b.vy + fy * dt) * 0.9; b.vz = (b.vz + fz * dt) * 0.9;
        b.ob.position.x += b.vx * dt; b.ob.position.y += b.vy * dt; b.ob.position.z += b.vz * dt;
      });
      n.m.opacity = 0.05 * vis;
      n.linea0.opacity = 0.22 * vis;
      n.g.visible = vis > 0.01;
    });

    // Il tabellone cambia di rado: non si riscrive a ogni fotogramma
    if (s - tempoLista > 0.25) {
      tempoLista = s;
      const fasi = aerei.map((a): Fase => {
        if (a.stato === 'ritorno' || (a.stato === 'giro' && !a.fatto)) return 'holding';
        if (a.stato === 'arrivo') return 'landing';
        if (a.stato === 'fermo') return a.fatto ? 'taking off' : 'boarding';
        if (a.stato === 'decollo') return 'taking off';
        return 'in the air';
      });
      const firma = fasi.join();
      if (firma !== ultimo) { ultimo = firma; o.alCambio(fasi); }
    }
  }
  return {
    palco: p,
    // Si apre la domanda di un volo: il suo aereo arriva. Un altro aereo ancora senza risposta sulla pista torna in attesa
    chiama(i: number) {
      const a = aerei[i];
      if (!a || a.fatto || a.stato === 'arrivo' || a.stato === 'fermo') return;
      aerei.forEach((b, k) => {
        if (k === i || b.fatto || (b.stato !== 'arrivo' && b.stato !== 'fermo')) return;
        b.rotta = rottaDecollo(b, k);
        b.stato = 'ritorno';
      });
      a.rotta = rottaArrivo(a);
      a.stato = 'arrivo';
    },
    // Il termine è indovinato: l'aereo riparte e prende il suo percorso con lo striscione. Se sta ancora atterrando,
    // tocca la pista e riparte subito
    decolla(i: number) {
      const a = aerei[i];
      if (!a || a.fatto) return;
      a.fatto = true;
      if (a.stato === 'fermo') { a.rotta = rottaDecollo(a, i); a.stato = 'decollo'; }
      else if (a.stato === 'arrivo') a.via = true;
      else { a.rotta = rottaDecollo(a, i); a.stato = 'decollo'; }
    },
    // Dopo il giretto con la scritta, l'aereo resta sulla sua orbita con un termine nuovo: la scritta sparisce e si riscrive
    riposa(i: number, termine: string) {
      const a = aerei[i];
      if (!a) return;
      a.fatto = false;
      a.striscione.cambia(termine);
    },
    // In volo da quanto tempo, per sapere quando farlo tornare
    inGiro(i: number) { return aerei[i]?.stato === 'giro'; },
  };
}
