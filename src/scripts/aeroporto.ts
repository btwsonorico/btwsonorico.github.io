import * as THREE from 'three';
import { casuale, mat, palco, pezzo, puntiMorbidi, sasso, SITO, tono } from './natura';

// Un piccolo aeroporto su un'isola, nello stile a filo del sito: acqua a punti, pista, torre con il radar che gira, terminal,
// hangar, alberi. Gli aerei arancio fanno tutti lo stesso giro: rullaggio, decollo, circuito, atterraggio, sosta al terminal.
// Ognuno tiene la distanza da quello davanti, quindi le code si formano da sole. Gabbiani, nuvole e una balena stanno intorno.
// Per ora è solo una scena: alCambio dice che cosa fa ogni aereo, così un domani ogni aereo può rappresentare altro.

export type Fase = 'at the gate' | 'taxiing' | 'taking off' | 'in the air' | 'landing';
type Tappa = { x: number; y: number; z: number; v: number; fase: Fase; sosta?: number };

const SUOLO = 0.07;
// Il giro, in ordine. v è la velocità in quel punto; la sosta è al terminal
const GIRO: Tappa[] = [
  { x: 0.2, y: SUOLO, z: -0.45, v: 0.05, fase: 'at the gate', sosta: 4 },
  { x: -2, y: SUOLO, z: -0.45, v: 0.5, fase: 'taxiing' },
  { x: -4.1, y: SUOLO, z: -0.45, v: 0.5, fase: 'taxiing' },
  { x: -4.75, y: SUOLO, z: 0.2, v: 0.35, fase: 'taxiing' },
  { x: -4.2, y: SUOLO, z: 0.95, v: 0.35, fase: 'taking off' },
  { x: -2.4, y: SUOLO, z: 0.95, v: 1.2, fase: 'taking off' },
  { x: 0.4, y: SUOLO + 0.02, z: 0.95, v: 2.1, fase: 'taking off' },
  { x: 2.9, y: 0.62, z: 0.95, v: 2.4, fase: 'taking off' },
  { x: 5.8, y: 1.75, z: 0.75, v: 2.4, fase: 'in the air' },
  { x: 8, y: 2.5, z: -1.4, v: 2.3, fase: 'in the air' },
  { x: 6.2, y: 2.95, z: -4.7, v: 2.2, fase: 'in the air' },
  { x: 0, y: 3.15, z: -6, v: 2.2, fase: 'in the air' },
  { x: -6.2, y: 2.9, z: -4.5, v: 2.2, fase: 'in the air' },
  { x: -8.6, y: 2.2, z: -1.3, v: 2.1, fase: 'in the air' },
  { x: -8.4, y: 1.45, z: 0.75, v: 1.9, fase: 'landing' },
  { x: -6.3, y: 0.62, z: 0.95, v: 1.7, fase: 'landing' },
  { x: -4, y: SUOLO + 0.04, z: 0.95, v: 1.5, fase: 'landing' },
  { x: -1.4, y: SUOLO, z: 0.95, v: 0.95, fase: 'landing' },
  { x: 2, y: SUOLO, z: 0.95, v: 0.45, fase: 'landing' },
  { x: 4.1, y: SUOLO, z: 0.75, v: 0.35, fase: 'taxiing' },
  { x: 4.4, y: SUOLO, z: 0.05, v: 0.35, fase: 'taxiing' },
  { x: 3.7, y: SUOLO, z: -0.45, v: 0.4, fase: 'taxiing' },
  { x: 1.6, y: SUOLO, z: -0.45, v: 0.45, fase: 'taxiing' },
];

export function monta(el: HTMLElement, alCambio?: (righe: { nome: string; fase: Fase }[]) => void) {
  const r = casuale(11);
  const p = palco(el, {
    camera: new THREE.Vector3(10, 11.6, 15), mira: new THREE.Vector3(0, 0.75, -0.6), fov: 36, giro: 0.012, inclina: [-0.22, 0.26], zoom: [0.5, 1.35], nebbia: [1.5, 2.8],
    aggiorna, scena: 'aeroporto', toni: SITO,
  });
  const G = p.gruppo, C = p.colori, chiaro = p.chiaro;
  const M = {
    isola: mat(C.verde, { opacity: chiaro ? 0.14 : 0.09, fili: 0.7 }), base: mat('#6a6a6a', { opacity: 0.05, fili: 0.34 }),
    pista: mat('#6a6a6a', { opacity: chiaro ? 0.2 : 0.17, fili: 0.5 }), piazzale: mat('#6a6a6a', { opacity: 0.08, fili: 0.32 }),
    edificio: mat('#6a6a6a', { opacity: 0.08, fili: 0.7 }), vetro: mat(C.azzurro, { opacity: chiaro ? 0.22 : 0.16, fili: 0.55 }), foglie: mat(C.verde, { opacity: chiaro ? 0.2 : 0.14, fili: 0.75 }),
    tronco: mat('#8a5a2b', { opacity: 0.2, fili: 0.5 }), aereo: mat(C.arancio, { opacity: chiaro ? 0.3 : 0.2, fili: 0.95 }), fermo: mat('#6a6a6a', { opacity: 0.1, fili: 0.75 }),
    nuvola: mat('#8a8f96', { opacity: 0.05, fili: 0.22 }), balena: mat(C.azzurro, { opacity: 0.12, fili: 0.42 }),
  };
  const scatola = (w: number, h: number, d: number, x: number, y0: number, z: number, m: THREE.Material, g: THREE.Object3D = G) => { const o = pezzo(new THREE.BoxGeometry(w, h, d), m, x, y0 + h / 2, z); g.add(o); return o; };
  const tubo = (a: number, b: number, h: number, x: number, y0: number, z: number, m: THREE.Material, lati = 10, g: THREE.Object3D = G) => { const o = pezzo(new THREE.CylinderGeometry(a, b, h, lati), m, x, y0 + h / 2, z); g.add(o); return o; };
  const fili = (punti: number[], colore: THREE.ColorRepresentation, op: number, g: THREE.Object3D = G) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(punti, 3));
    const o = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: tono(colore), transparent: true, opacity: op }));
    g.add(o);
    return o;
  };

  // --- L'isola: un rettangolo con la riva irregolare, spessa, e sotto una seconda sagoma nell'acqua
  const sagoma = (a: number, b: number, irregolare: number) => {
    const s = new THREE.Shape(), n = 56;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2, c = Math.cos(t), d = Math.sin(t), k = 1 + (Math.sin(t * 5 + 1) * 0.5 + Math.sin(t * 9) * 0.5) * irregolare;
      const x = Math.sign(c) * Math.pow(Math.abs(c), 0.42) * a * k, y = Math.sign(d) * Math.pow(Math.abs(d), 0.42) * b * k;
      if (i) s.lineTo(x, y); else s.moveTo(x, y);
    }
    s.closePath();
    return s;
  };
  const piatta = (s: THREE.Shape, alto: number, y: number, m: THREE.Material) => {
    const g = new THREE.ExtrudeGeometry(s, { depth: alto, bevelEnabled: false, curveSegments: 4 });
    g.rotateX(Math.PI / 2);
    const o = pezzo(g, m, 0, y, 0);
    G.add(o);
    return o;
  };
  piatta(sagoma(6.1, 3.5, 0.025), 0.5, 0, M.isola);
  piatta(sagoma(6.5, 3.85, 0.03), 0.02, -0.5, M.base);

  // --- Pista e piste di rullaggio, a filo sull'isola
  scatola(9.6, 0.02, 0.72, 0, 0, 0.95, M.pista);
  scatola(9, 0.015, 0.26, 0, 0, -0.45, M.piazzale);
  scatola(0.3, 0.015, 1.5, -4.62, 0, 0.2, M.piazzale);
  scatola(0.3, 0.015, 1.5, 4.32, 0, 0.2, M.piazzale);
  scatola(7.4, 0.012, 1.3, 0.3, 0, -1.25, M.piazzale);
  const segni: number[] = [], Y = 0.03;
  for (let x = -4.1; x < 4.2; x += 0.5) segni.push(x, Y, 0.95, x + 0.26, Y, 0.95);
  // Le strisce in testa alla pista
  for (const q of [-4.7, 4.5]) for (let k = -3; k <= 3; k++) { const z = 0.95 + k * 0.08; segni.push(q, Y, z, q + 0.2, Y, z); }
  fili(segni, chiaro ? '#23201b' : '#d9dde3', 0.75);
  const giallo: number[] = [];
  for (let x = -4.4; x < 4; x += 0.32) giallo.push(x, Y, -0.45, x + 0.16, Y, -0.45);
  fili(giallo, C.arancio, 0.55);

  // Le luci della pista lampeggiano in fila
  const luci = puntiMorbidi(44), tinta = new THREE.Color(C.arancio);
  G.add(luci.punti);
  for (let i = 0; i < 44; i++) {
    const k = i % 22, x = -4.8 + (k / 21) * 9.6, z = i < 22 ? 0.56 : 1.34;
    luci.pos.set([x, 0.05, z], i * 3); luci.col.set([tinta.r, tinta.g, tinta.b], i * 3); luci.dim[i] = 0.09;
  }

  // --- Il terminal: lungo, a vetrate, con il tetto curvo e i bracci verso gli aerei
  scatola(5.4, 0.4, 0.8, 0.2, 0, -2.3, M.edificio);
  scatola(5.2, 0.2, 0.05, 0.2, 0.12, -1.88, M.vetro);
  const tetto = new THREE.CylinderGeometry(0.62, 0.62, 5.6, 14, 1, true, Math.PI / 2 - 0.9, 1.8);
  tetto.rotateZ(Math.PI / 2);
  const coperta = pezzo(tetto, mat('#6a6a6a', { opacity: 0.08, fili: 0.7, side: THREE.DoubleSide }), 0.2, 0.015, -2.3);
  G.add(coperta);
  // Le vetrate hanno i montanti
  const montanti: number[] = [];
  for (let x = -2.4; x <= 2.8; x += 0.26) montanti.push(x, 0.12, -1.875, x, 0.32, -1.875);
  fili(montanti, C.azzurro, 0.5);
  for (const x of [-1.6, 0.2, 2]) { scatola(0.1, 0.1, 0.72, x, 0.15, -1.55, M.vetro); tubo(0.04, 0.04, 0.15, x, 0, -1.25, M.edificio, 6); }

  // --- La torre: fusto, sala di vetro che si allarga verso l'alto, radar che gira
  tubo(0.17, 0.26, 1.35, -3.5, 0, -2.2, M.edificio, 10);
  tubo(0.2, 0.2, 0.1, -3.5, 0.72, -2.2, M.edificio, 10);
  tubo(0.5, 0.33, 0.3, -3.5, 1.35, -2.2, M.vetro, 12);
  tubo(0.52, 0.52, 0.04, -3.5, 1.65, -2.2, M.edificio, 12);
  tubo(0.02, 0.02, 0.32, -3.5, 1.69, -2.2, M.edificio, 5);
  const radar = new THREE.Group();
  radar.position.set(-3.5, 2.03, -2.2);
  G.add(radar);
  scatola(0.46, 0.09, 0.03, 0, -0.03, 0, M.aereo, radar);
  const spia = pezzo(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: tono(C.arancio), transparent: true }), -3.5, 1.99, -2.2);
  G.add(spia);

  // --- Due hangar ad arco e i serbatoi
  for (const [x, z, w] of [[3.9, -2.1, 1.25], [4.4, -0.95, 0.85]] as const) {
    const a = new THREE.CylinderGeometry(w / 2, w / 2, w * 1.35, 12, 3, false, -Math.PI / 2, Math.PI);
    a.rotateX(-Math.PI / 2);
    G.add(pezzo(a, mat('#6a6a6a', { opacity: 0.08, fili: 0.7, side: THREE.DoubleSide }), x, 0, z));
  }
  for (const x of [-5, -4.68]) { tubo(0.15, 0.15, 0.22, x, 0, -2.05, M.edificio, 10); tubo(0.15, 0.02, 0.05, x, 0.22, -2.05, M.edificio, 10); }

  // --- Alberi sul bordo, a gruppi: tengono libera la pista
  const liberi = (x: number, z: number) => !(z > -0.8 && z < 1.55) && !(Math.abs(x - 0.2) < 3.35 && z < -0.5 && z > -2.9) && !(Math.hypot(x + 3.5, z + 2.2) < 0.75) && !(x > 3 && z < -0.3 && z > -2.9);
  const posti: [number, number][] = [];
  for (let i = 0; i < 900 && posti.length < 54; i++) {
    const a = r() * 6.28, q = 0.72 + r() * 0.22, c = Math.cos(a), d = Math.sin(a), x = Math.sign(c) * Math.pow(Math.abs(c), 0.42) * 6 * q, z = Math.sign(d) * Math.pow(Math.abs(d), 0.42) * 3.4 * q;
    if (liberi(x, z) && posti.every(([u, v]) => Math.hypot(u - x, v - z) > 0.3)) posti.push([x, z]);
  }
  for (const [x, z] of posti) {
    const h = 0.18 + r() * 0.26;
    tubo(0.015, 0.025, h * 0.35, x, 0, z, M.tronco, 5);
    if (r() < 0.55) G.add(pezzo(new THREE.ConeGeometry(h * 0.42, h, 7), M.foglie, x, h * 0.3 + h / 2, z));
    else G.add(pezzo(new THREE.IcosahedronGeometry(h * 0.46, 0), M.foglie, x, h * 0.35 + h * 0.34, z));
  }
  for (let i = 0; i < 8; i++) { const a = r() * 6.28; G.add(pezzo(sasso(0.06 + r() * 0.07, r, 0), M.base, Math.cos(a) * 6.5, -0.46, Math.sin(a) * 3.9)); }

  // --- L'aereo: muso verso +z. Fusoliera, ali a freccia, coda e due motori
  const formaAereo = () => {
    const f = new THREE.CylinderGeometry(0.052, 0.052, 0.62, 8);
    f.rotateX(Math.PI / 2);
    const muso = new THREE.ConeGeometry(0.052, 0.14, 8); muso.rotateX(Math.PI / 2); muso.translate(0, 0, 0.38);
    const coda = new THREE.ConeGeometry(0.052, 0.22, 8); coda.rotateX(-Math.PI / 2); coda.translate(0, 0.012, -0.42);
    const ala = (s: number, ap: number, in0: number, in1: number, y: number, z: number) => {
      const a = new THREE.BufferGeometry(), c = [0, y, z + in0 / 2, s * ap, y, z - in0 / 2 - 0.1, s * ap, y, z - in0 / 2 - 0.1 - in1, 0, y, z - in0 / 2];
      a.setAttribute('position', new THREE.Float32BufferAttribute(c, 3));
      a.setIndex(s > 0 ? [0, 3, 1, 1, 3, 2] : [0, 1, 3, 1, 2, 3]);
      return a;
    };
    const motore = (x: number) => { const m = new THREE.CylinderGeometry(0.024, 0.024, 0.09, 6); m.rotateX(Math.PI / 2); m.translate(x, -0.04, 0.05); return m; };
    const deriva = new THREE.BufferGeometry();
    deriva.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.04, -0.28, 0, 0.17, -0.47, 0, 0.17, -0.53, 0, 0.04, -0.44], 3));
    deriva.setIndex([0, 1, 3, 1, 2, 3, 0, 3, 1, 1, 3, 2]);
    return [f, muso, coda, ala(1, 0.37, 0.2, 0.06, -0.015, 0.05), ala(-1, 0.37, 0.2, 0.06, -0.015, 0.05), ala(1, 0.14, 0.08, 0.04, 0.02, -0.43), ala(-1, 0.14, 0.08, 0.04, 0.02, -0.43), motore(0.15), motore(-0.15), deriva];
  };
  const SIDE = { side: THREE.DoubleSide };
  const aereoDa = (base: THREE.MeshBasicMaterial) => {
    const m = base.clone(); Object.assign(m, SIDE); m.userData = base.userData;
    const g = new THREE.Group();
    for (const f of formaAereo()) g.add(pezzo(f, m));
    return g;
  };
  // Aerei fermi al terminal e davanti agli hangar: grigi
  for (const [x, z, a] of [[-1.6, -1, Math.PI], [2, -1, Math.PI], [3.25, -1.9, -2]] as const) {
    const o = aereoDa(M.fermo);
    o.position.set(x, SUOLO, z); o.rotation.y = a; G.add(o);
  }

  // --- Il giro: arco di curva per ogni tappa, per sapere a che velocità si va in ogni punto
  const curva = new THREE.CatmullRomCurve3(GIRO.map(t => new THREE.Vector3(t.x, t.y, t.z)), true, 'centripetal');
  const PASSI = GIRO.length * 40;
  curva.arcLengthDivisions = PASSI;
  const lunghezze = curva.getLengths(PASSI), LUNGO = lunghezze[PASSI]!, sTappa = GIRO.map((_, i) => lunghezze[i * 40]!);
  const dove = (s: number) => { let i = GIRO.length - 1; while (i > 0 && sTappa[i]! > s) i--; const j = (i + 1) % GIRO.length, fine = j ? sTappa[j]! : LUNGO; return { i, j, f: (s - sTappa[i]!) / Math.max(1e-4, fine - sTappa[i]!) }; };
  const SOSTA = sTappa[0]!;

  const N = p.telefono ? 3 : 4;
  const aerei = Array.from({ length: N }, (_, i) => {
    const o = aereoDa(M.aereo);
    G.add(o);
    const ombra = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), new THREE.MeshBasicMaterial({ color: chiaro ? '#23201b' : '#000000', transparent: true, opacity: chiaro ? 0.16 : 0.42, depthWrite: false }));
    ombra.rotation.x = -Math.PI / 2; ombra.scale.set(1.2, 0.5, 1);
    G.add(ombra);
    return { o, ombra, s: (LUNGO * ((i + 0.2) / N)) % LUNGO, v: 0.3, attesa: 0, rollio: 0, nome: `plane ${i + 1}`, fase: 'taxiing' as Fase };
  });

  // --- L'acqua: una griglia di punti azzurri che ondeggia e sfuma lontano dall'isola
  const PASSO = p.telefono ? 0.27 : 0.2, celle: { x: number; z: number; d: number }[] = [];
  for (let x = -12; x <= 12; x += PASSO) for (let z = -8; z <= 8; z += PASSO) {
    const fuori = Math.pow(Math.pow(Math.abs(x) / 6.3, 2.6) + Math.pow(Math.abs(z) / 3.65, 2.6), 1 / 2.6);
    if (fuori < 1 || fuori > 1.95) continue;
    celle.push({ x, z, d: fuori });
  }
  const acqua = puntiMorbidi(celle.length), blu = new THREE.Color(C.azzurro);
  G.add(acqua.punti);
  celle.forEach((c, i) => {
    acqua.col.set([blu.r, blu.g, blu.b], i * 3);
    acqua.dim[i] = 0.055;
    acqua.alfa[i] = (1 - THREE.MathUtils.smoothstep(c.d, 1.45, 1.95)) * (chiaro ? 0.85 : 0.72);
    acqua.pos.set([c.x, -0.42, c.z], i * 3);
  });

  // --- La balena: nuota intorno all'isola, sotto la superficie
  const balena = new THREE.Group();
  const corpo = new THREE.SphereGeometry(0.34, 10, 6); corpo.scale(0.62, 0.42, 2.1);
  balena.add(pezzo(corpo, M.balena));
  const pinna = new THREE.BufferGeometry();
  pinna.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.68, 0.3, 0, -0.98, 0, 0, -0.84, -0.3, 0, -0.98], 3));
  pinna.setIndex([0, 1, 2, 0, 2, 3, 2, 1, 0, 3, 2, 0]);
  const coda = pezzo(pinna, M.balena);
  balena.add(coda);
  G.add(balena);
  const inAcqua = (x: number, z: number) => Math.pow(Math.pow(Math.abs(x) / 6.3, 2.6) + Math.pow(Math.abs(z) / 3.65, 2.6), 1 / 2.6) > 1;

  // --- Nuvole e gabbiani
  const nuvole = [[-5.5, 4, -3.6, 1], [4.8, 4.3, -5.4, 0.8], [8, 3.8, 3.6, 0.65]].map(([x, y, z, k]) => {
    const g = new THREE.Group();
    for (const [a, b, c, d] of [[0, 0, 0, 0.45], [0.46, -0.05, 0.08, 0.32], [-0.46, -0.07, -0.05, 0.34], [0.14, 0.17, -0.1, 0.28]] as const) g.add(pezzo(sasso(d, r, 1), M.nuvola, a, b, c));
    g.position.set(x!, y!, z!); g.scale.setScalar(k!);
    G.add(g);
    return g;
  });
  const GABBIANI = 9, vGabbiani = new Float32Array(GABBIANI * 4 * 3), gGabbiani = new THREE.BufferGeometry();
  gGabbiani.setAttribute('position', new THREE.BufferAttribute(vGabbiani, 3));
  const lGabbiani = new THREE.LineSegments(gGabbiani, new THREE.LineBasicMaterial({ color: tono(chiaro ? '#23201b' : '#d9dde3'), transparent: true, opacity: 0.8 }));
  lGabbiani.frustumCulled = false;
  G.add(lGabbiani);
  const fGabbiani = Array.from({ length: GABBIANI }, () => ({ a: (r() - 0.5) * 0.7, q: (r() - 0.5) * 0.5, y: (r() - 0.5) * 0.4, f: r() * 6 }));

  // --- Ogni fotogramma
  const q = new THREE.Vector3(), d = new THREE.Vector3(), su = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), zero = new THREE.Vector3(), rot = new THREE.Quaternion(), asse = new THREE.Vector3(0, 0, 1), rol = new THREE.Quaternion();
  let ultimo = '', tempoLista = 0;
  function aggiorna(s: number, dt: number) {
    radar.rotation.y = s * 1.5;
    (spia.material as THREE.MeshBasicMaterial).opacity = Math.floor(s * 1.4) % 2 ? 1 : 0.15;
    for (let i = 0; i < 44; i++) luci.alfa[i] = Math.max(0.25, 1 - ((s * 11 - (i % 22)) % 22 + 22) % 22 / 7);
    luci.aggiorna();
    celle.forEach((c, i) => { acqua.pos[i * 3 + 1] = -0.42 + Math.sin(c.x * 1.25 + s * 0.9) * 0.028 + Math.sin(c.z * 1.7 - s * 0.7 + c.x * 0.4) * 0.024; });
    acqua.aggiorna();

    // Ognuno guarda l'aereo davanti: se è troppo vicino rallenta. Al terminal si ferma qualche secondo
    aerei.forEach((a, i) => {
      const { i: t0, j: t1, f } = dove(a.s), A = GIRO[t0]!, B = GIRO[t1]!;
      let voluta = A.v + (B.v - A.v) * f;
      let gap = LUNGO;
      aerei.forEach((b, k) => { if (k !== i) gap = Math.min(gap, (b.s - a.s + LUNGO) % LUNGO); });
      voluta = Math.min(voluta, Math.max(0, (gap - 0.75) * 1.4));
      const prima = (SOSTA - a.s + LUNGO) % LUNGO;
      if (a.attesa > 0) { a.attesa -= dt; voluta = 0; }
      else {
        if (prima < 0.9) voluta = Math.min(voluta, 0.08 + prima * 0.55);
        if (prima < 0.02) a.attesa = 4;
      }
      a.v += (voluta - a.v) * Math.min(1, dt * 2.5);
      a.s = (a.s + a.v * dt + LUNGO) % LUNGO;
      curva.getPointAt(a.s / LUNGO, q); curva.getTangentAt(a.s / LUNGO, d);
      q.y = Math.max(SUOLO, q.y);
      a.o.position.copy(q);
      m4.lookAt(d, zero, su);
      rot.setFromRotationMatrix(m4);
      // Si inclina nelle curve, solo in volo
      curva.getTangentAt(((a.s + 0.25) % LUNGO) / LUNGO, q);
      const volta = d.x * q.z - d.z * q.x, inAria = a.o.position.y > 0.5;
      a.rollio += ((inAria ? THREE.MathUtils.clamp(volta * 3.2, -0.6, 0.6) : 0) - a.rollio) * Math.min(1, dt * 3);
      rol.setFromAxisAngle(asse, a.rollio);
      a.o.quaternion.copy(rot).multiply(rol);
      const x = a.o.position.x, z = a.o.position.z, h = a.o.position.y;
      a.ombra.position.set(x + h * 0.14, inAcqua(x, z) ? -0.4 : 0.026, z + h * 0.09);
      a.ombra.rotation.z = Math.atan2(d.x, d.z) + Math.PI / 2;
      (a.ombra.material as THREE.MeshBasicMaterial).opacity = (chiaro ? 0.16 : 0.42) * Math.max(0.3, 1 - h * 0.2);
      a.fase = a.attesa > 0 || prima < 0.5 ? 'at the gate' : A.fase;
    });

    // Balena: un'ellisse larga, con la coda che batte
    const b = s * 0.075, bx = Math.cos(b) * 8.5, bz = Math.sin(b) * 5.5;
    balena.position.set(bx, -0.62 + Math.sin(s * 0.5) * 0.08, bz);
    balena.rotation.y = Math.atan2(-Math.sin(b) * 8.5, Math.cos(b) * 5.5);
    coda.rotation.x = Math.sin(s * 1.6) * 0.25;
    for (const [i, n] of nuvole.entries()) { n.position.x += dt * (0.05 + i * 0.015); if (n.position.x > 11) n.position.x = -11; }
    // Gabbiani: un gruppetto largo, che gira sopra la riva
    const c0 = s * 0.2, cx = Math.cos(c0) * 7, cz = Math.sin(c0) * 4.3 + 0.6;
    fGabbiani.forEach((u, i) => {
      const x = cx + Math.cos(c0 + u.a) * 0.9 + u.q, z = cz + Math.sin(c0 + u.a) * 0.9, y = 1.3 + u.y, batte = Math.sin(s * 7 + u.f) * 0.045, l = 0.085, k = i * 12;
      vGabbiani.set([x - l, y + batte, z, x, y, z, x, y, z, x + l, y + batte, z], k);
    });
    (gGabbiani.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Il testo con lo stato cambia di rado: non si riscrive a ogni fotogramma
    if (alCambio && s - tempoLista > 0.25) {
      tempoLista = s;
      const firma = aerei.map(a => a.fase).join();
      if (firma !== ultimo) { ultimo = firma; alCambio(aerei.map(({ nome, fase }) => ({ nome, fase }))); }
    }
  }
  return p;
}
