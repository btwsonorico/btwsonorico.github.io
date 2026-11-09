import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { casuale, curveLivello, linea, mat, pezzo, puntiMorbidi, palco, sasso, SITO, tema, type Palco } from './natura';
import { CASSE, DENTRO, NOMI, STANZE, type Stanza, type Stato } from '../lib/casa';

// La casa di /learn/decision/: una casetta tonda e simpatica su un'isola, come la mappa di AI terms (src/scripts/aeroporto.ts).
// Il terreno, gli alberi e le nuvole sono quelli di AI terms: veli tenui, curve di livello, forme a filo. La casa e le cose
// giocattolo sono piene, con ombre a bande, come in un cartone. La casa ha il tetto: a riposo è chiusa. Quando scrivi un comando
// il tetto si alza, i muri si abbassano e la vista si avvicina un poco. Il tetto si alza anche col mouse sulla casa. Quando arriva un comando la vista va sulla cosa comandata,
// con lo stesso movimento di «follow the dog» (src/scripts/nuvole.ts). Se il comando riguarda il giardino, il tetto resta giù.
// Gli oggetti che il decision model comanda hanno il bordo arancio, si accendono quando lavorano e fanno un piccolo salto:
// lampade e lanterne, tapparelle, stufa, ventilatore, casse, TV, robot aspirapolvere, tosaerba, macchina del caffè e timer.
// In casa vive un gatto bianco e nero: gira per le stanze, si siede, si lecca, si stira, dorme nei suoi posti e scappa dal robot.
// La scena mostra soltanto lo stato della casa (src/lib/casa.ts): quello che succede lo decide il modello.

const PAV = 0.12, MURO = 1.05, SP = 0.14;
type Box = { x0: number; x1: number; z0: number; z1: number };
export const PIANTA: Record<Exclude<Stanza, 'giardino'>, Box> = {
  soggiorno: { x0: -3.1, x1: 0.3, z0: -0.6, z1: 2.3 },
  cucina: { x0: 0.3, x1: 3.1, z0: -0.6, z1: 2.3 },
  camera: { x0: -3.1, x1: 0.3, z0: -3.5, z1: -0.6 },
  bagno: { x0: 0.3, x1: 3.1, z0: -3.5, z1: -0.6 },
};
const centro = (s: Stanza) => { if (s === 'giardino') return new THREE.Vector3(1.8, 0, 3.9); const b = PIANTA[s]; return new THREE.Vector3((b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2); };
const quota = (s: Stanza) => (s === 'giardino' ? 0 : PAV);
// Porte fra le stanze e verso il giardino: il robot e il gatto passano da qui
const PORTE: [Stanza, Stanza, number, number][] = [['soggiorno', 'cucina', 0.3, 1.15], ['soggiorno', 'camera', -0.25, -0.6], ['cucina', 'bagno', 0.9, -0.6], ['camera', 'bagno', 0.3, -1.3], ['soggiorno', 'giardino', -0.1, 2.3]];
const BASE_ROBOT = new THREE.Vector3(-0.75, PAV + 0.02, 2.0);
const stanzaDi = (x: number, z: number): Stanza => DENTRO.find(s => { const b = PIANTA[s as keyof typeof PIANTA]; return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1; }) ?? 'giardino';

// L'isola: un ovale morbido con la riva un po' irregolare e una baia davanti, dove arriva il vialetto. forma() vale 1 sulla riva
const RX = 7.0, RZ = 6.4, CZ = 0.5, BAIA = 1.55;
const scarto = (t: number) => Math.abs(Math.atan2(Math.sin(t - BAIA), Math.cos(t - BAIA)));
const forma = (x: number, z0: number) => {
  const z = z0 - CZ, t = Math.atan2(z, x), b = scarto(t), k = (1 + 0.05 * Math.sin(3 * t + 1) + 0.035 * Math.sin(5 * t + 2)) * (1 - 0.075 * Math.exp(-(b * b) / (2 * 0.3 * 0.3)));
  return Math.pow(Math.pow(Math.abs(x) / RX, 2.4) + Math.pow(Math.abs(z) / RZ, 2.4), 1 / 2.4) / k;
};
// I colli stanno dietro e di lato: la casa e il giardino restano in piano
const COLLI = [[-5.0, -3.4, 1.15, 1.05], [4.9, -3.6, 1.45, 1.15], [0.2, -5.3, 0.75, 0.95], [-5.5, 2.0, 0.42, 0.65], [5.7, 0.9, 0.5, 0.7]] as const;
const fuoriRett = (x: number, z: number, x0: number, x1: number, z0: number, z1: number) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
const altezza = (x: number, z: number) => {
  const e = forma(x, z);
  if (e >= 1) return -0.04;
  let h = 0;
  for (const [cx, cz, alto, largo] of COLLI) h += alto * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * largo * largo));
  const piano = Math.min(fuoriRett(x, z, -3.5, 3.5, -3.9, 2.7), fuoriRett(x, z, -5.2, 4.9, 2.3, 7.5));
  return h * THREE.MathUtils.smoothstep(piano, 0.15, 1.5) * (1 - THREE.MathUtils.smoothstep(e, 0.78, 1));
};
const liscio = THREE.MathUtils.smoothstep;

export type Vista = {
  imposta: (s: Stato) => void;
  // Vista su una stanza scelta col clic
  fuoco: (s: Stanza, durata?: number) => void;
  // Vista sulla cosa che un comando ha mosso. I pezzi di uno stesso comando si mostrano uno dopo l'altro
  comando: (intento: string, stanza: Stanza | null, fatto: boolean) => void;
  // Un comando nuovo: toglie le viste ancora in coda
  azzera: () => void;
  // Il cursore entra o esce dalla casella del comando: il tetto si alza o si richiude
  scrive: (v: boolean) => void;
  dove: (s: Stanza) => void;
};
type Fuoco = { chiave: string; punto: (v: THREE.Vector3) => void; zoom: number; aperto: boolean; durata: number };

export function montaCasa(el: HTMLElement, etichette: HTMLElement, alClic: (s: Stanza) => void): Vista {
  const r = casuale(21), chiaro = tema();
  // Il punto che la camera guarda: fermo sull'isola, o sulla cosa comandata. Si muove come in «follow the dog»
  const MIRA0 = new THREE.Vector3(0, 0.3, 0.9), MIRA = MIRA0.clone();
  const p = palco(el, {
    camera: new THREE.Vector3(8.1, 11.6, 17.2), mira: MIRA, fov: 34, giro: 0.008, inclina: [-0.3, 0.22], zoom: [0.22, 1.3], nebbia: [1.6, 3],
    aggiorna, clic, scena: 'casa', toni: SITO,
  });
  const casa = new THREE.Group();
  p.gruppo.add(casa);
  const C = p.colori;

  // --- Luce e materiali: colori pieni con tre bande d'ombra, come in un cartone
  p.scena.add(new THREE.AmbientLight('#ffffff', 1.65));
  const sole = new THREE.DirectionalLight('#fff4e0', 1.75); sole.position.set(5, 9, 6); p.scena.add(sole);
  const bande = new THREE.DataTexture(new Uint8Array([120, 185, 255]), 3, 1, THREE.RedFormat);
  bande.minFilter = bande.magFilter = THREE.NearestFilter; bande.needsUpdate = true;
  const nuovoToon = (c: THREE.ColorRepresentation, extra: THREE.MeshToonMaterialParameters = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: bande, ...extra });
  const tinte = new Map<string, THREE.MeshToonMaterial>();
  const toon = (c: string) => tinte.get(c) ?? tinte.set(c, nuovoToon(c)).get(c)!;
  const CREMA = '#fff1d6', BIANCO = '#fdfaf2', LEGNO = '#c98f58', LEGNO2 = '#a56c3d', TEAL = '#3fb5a8', ROSSO = '#e8604c', GIALLO = '#f7cf4f', LILLA = '#b79ce0', ROSA = '#f5a6b8', CIELO = '#7cc7e8', GRIGIO = '#8f8c88', SCURO = '#3a3640';

  const sol = (geo: THREE.BufferGeometry, m: THREE.Material | string, x = 0, y = 0, z = 0, g: THREE.Object3D = casa) => { const o = new THREE.Mesh(geo, typeof m === 'string' ? toon(m) : m); o.position.set(x, y, z); g.add(o); return o; };
  const rbox = (w: number, h: number, d: number, rr = 0.04) => new RoundedBoxGeometry(w, h, d, 3, Math.min(rr, Math.min(w, h, d) * 0.49));
  // Un cilindro con gli spigoli tondi. Parte da y = 0
  const botte = (ra: number, rb: number, h: number, rr = 0.02) => {
    const q = Math.min(rr, h * 0.49, Math.min(ra, rb) * 0.9), pt = [new THREE.Vector2(0.0001, 0)];
    for (let k = 0; k <= 4; k++) { const a = (k / 4) * Math.PI / 2; pt.push(new THREE.Vector2(rb - q + Math.sin(a) * q, q - Math.cos(a) * q)); }
    for (let k = 0; k <= 4; k++) { const a = (k / 4) * Math.PI / 2; pt.push(new THREE.Vector2(ra - q + Math.cos(a) * q, h - q + Math.sin(a) * q)); }
    pt.push(new THREE.Vector2(0.0001, h));
    return new THREE.LatheGeometry(pt, 18);
  };
  const scatola = (w: number, h: number, d: number, x: number, y0: number, z: number, c: string, rr = 0.04, g: THREE.Object3D = casa) => sol(rbox(w, h, d, rr), c, x, y0 + h / 2, z, g);
  const tubo = (ra: number, rb: number, h: number, x: number, y0: number, z: number, c: string, g: THREE.Object3D = casa, rr = 0.02) => sol(botte(ra, rb, h, rr), c, x, y0, z, g);
  const geoPalla = new THREE.SphereGeometry(1, 20, 14);
  const palla = (ra: number, x: number, y: number, z: number, c: string, g: THREE.Object3D = casa, sy = 1, sz = 1) => { const o = sol(geoPalla, c, x, y, z, g); o.scale.set(ra, ra * sy, ra * sz); return o; };
  const luminoso = (c: THREE.ColorRepresentation, op = 0) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });

  // --- Oggetti comandabili: colori vivi e un bordo arancio. Una scatola invisibile serve per il passaggio del mouse.
  // Il bordo è la stessa forma, gonfiata lungo le normali e vista dal retro
  type Oggetto = { nome: [string, string]; g: THREE.Group; presa: THREE.Mesh; mats: THREE.MeshToonMaterial[]; bordo: THREE.ShaderMaterial; attivo: number; prima: number; colore: THREE.Color | null; pop: number; dentro: boolean };
  const oggetti: Oggetto[] = [];
  const nuovoBordo = () => new THREE.ShaderMaterial({
    uniforms: { colore: { value: C.arancio.clone() }, spess: { value: 0.012 } }, side: THREE.BackSide,
    vertexShader: 'uniform float spess; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * spess, 1.0); }',
    fragmentShader: 'uniform vec3 colore; void main() { gl_FragColor = vec4(colore, 1.0); }',
  });
  function oggetto(nome: [string, string], x: number, base: number, z: number, w: number, h: number, d: number, padre: THREE.Object3D = casa, dentro = true) {
    const g = new THREE.Group(); g.position.set(x, base, z); padre.add(g);
    const presa = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    presa.position.y = h / 2; g.add(presa);
    const o: Oggetto = { nome, g, presa, mats: [], bordo: nuovoBordo(), attivo: 0, prima: 0, colore: null, pop: 0, dentro };
    oggetti.push(o);
    return o;
  }
  function parte(o: Oggetto, geo: THREE.BufferGeometry, c: string, x = 0, y = 0, z = 0, padre: THREE.Object3D = o.g) {
    const m = nuovoToon(c, { emissive: c, emissiveIntensity: 0 }); m.userData.base = new THREE.Color(c);
    o.mats.push(m);
    const ob = sol(geo, m, x, y, z, padre);
    ob.add(new THREE.Mesh(geo, o.bordo));
    return ob;
  }

  // --- L'isola, come quella di AI terms: prato e spiaggia, curve di livello sui colli, una griglia di punti, i fianchi di terra
  const ANGOLI = 200, riva: number[] = [];
  for (let k = 0; k < ANGOLI; k++) {
    const t = (k / ANGOLI) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    let a = 0, b = 10;
    for (let q = 0; q < 30; q++) { const m = (a + b) / 2; if (forma(c * m, CZ + s * m) < 1) a = m; else b = m; }
    riva.push(a);
  }
  const rivaA = (t: number) => { const f = ((t / (Math.PI * 2)) * ANGOLI % ANGOLI + ANGOLI) % ANGOLI, i = Math.floor(f), j = (i + 1) % ANGOLI; return riva[i]! + (riva[j]! - riva[i]!) * (f - i); };
  const ERBA = new THREE.Color(chiaro ? '#7cc35c' : '#6fa646'), SABBIA = new THREE.Color(chiaro ? '#f2dfb0' : '#efe0b8'), cTmp = new THREE.Color();
  const velo = (() => {
    const geo = new THREE.RingGeometry(0.001, 1, ANGOLI, 56).rotateX(-Math.PI / 2);
    const q = geo.attributes.position as THREE.BufferAttribute, colori: number[] = [];
    for (let i = 0; i < q.count; i++) {
      const x = q.getX(i), z = q.getZ(i), t = Math.atan2(z, x), u = Math.hypot(x, z) * 0.998, rr = u * rivaA(t);
      const X = Math.cos(t) * rr, Z = CZ + Math.sin(t) * rr;
      q.setXYZ(i, X, Math.max(0, altezza(X, Z)) - 0.006, Z);
      const b = scarto(t), limite = 0.935 + 0.012 * Math.sin(t * 9) - 0.12 * Math.exp(-(b * b) / (2 * 0.26 * 0.26));
      cTmp.copy(ERBA).lerp(SABBIA, liscio(u, limite - 0.009, limite + 0.009));
      colori.push(cTmp.r, cTmp.g, cTmp.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colori, 3));
    geo.computeVertexNormals();
    const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: chiaro ? 0.66 : 0.7, depthWrite: false }));
    o.renderOrder = -1; casa.add(o);
    return o;
  })();
  const fili = (punti: number[], colore: THREE.ColorRepresentation, op: number) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(punti, 3));
    const ob = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: op }));
    casa.add(ob);
  };
  {
    const { minori, maggiori } = curveLivello(altezza, 8, 130, 0.13, 2.2, 4, 0.07);
    fili(minori, ERBA, chiaro ? 0.55 : 0.4);
    fili(maggiori, ERBA, chiaro ? 0.9 : 0.8);
    const punti: number[] = [];
    for (let x = -7; x <= 7; x += 0.34) for (let z = -6; z <= 7; z += 0.34) if (forma(x, z) < 0.9 && fuoriRett(x, z, -3.3, 3.3, -3.7, 2.5) > 0) punti.push(x, altezza(x, z) + 0.008, z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(punti, 3));
    casa.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: C.muted, size: 0.025, transparent: true, opacity: 0.6 })));
  }
  {
    const vert: number[] = [], indici: number[] = [], strati: number[] = [], TERRA = chiaro ? '#a88a6a' : '#8f7a62';
    for (let k = 0; k <= ANGOLI; k++) {
      const t = (k / ANGOLI) * Math.PI * 2, rr = rivaA(t), c = Math.cos(t), s = Math.sin(t);
      vert.push(c * rr, -0.005, CZ + s * rr, c * rr * 0.92, -0.62, CZ + s * rr * 0.92);
      if (k < ANGOLI) indici.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vert, 3));
    geo.setIndex(indici);
    { const f = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: TERRA, transparent: true, opacity: chiaro ? 0.18 : 0.08, side: THREE.DoubleSide, depthWrite: false })); f.renderOrder = -3; casa.add(f); }
    for (const [y0, f] of [[-0.17, 0.975], [-0.36, 0.95]] as const) for (let k = 0; k < ANGOLI; k++) {
      const t0 = (k / ANGOLI) * Math.PI * 2, t1 = ((k + 1) / ANGOLI) * Math.PI * 2, w = (t: number) => y0 + Math.sin(t * 11 + y0 * 40) * 0.03;
      strati.push(Math.cos(t0) * rivaA(t0) * f, w(t0), CZ + Math.sin(t0) * rivaA(t0) * f, Math.cos(t1) * rivaA(t1) * f, w(t1), CZ + Math.sin(t1) * rivaA(t1) * f);
    }
    fili(strati, TERRA, 0.4);
  }
  const pavimenti = new Map<THREE.Object3D, Stanza>([[velo, 'giardino']]);

  // --- Il mare: un cerchio di punti che ondeggia e sfuma, come in AI terms
  const MARE = 11.5, AZZURRO = new THREE.Color(C.azzurro);
  {
    const geo = new THREE.RingGeometry(0.01, MARE, 96, 24).rotateX(-Math.PI / 2);
    const q = geo.attributes.position as THREE.BufferAttribute, colori: number[] = [], op = chiaro ? 0.2 : 0.13;
    for (let i = 0; i < q.count; i++) { const d = Math.hypot(q.getX(i), q.getZ(i)); colori.push(AZZURRO.r, AZZURRO.g, AZZURRO.b, op * (1 - liscio(d, MARE * 0.45, MARE))); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colori, 4));
    const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
    o.position.y = -0.47; o.renderOrder = -2; casa.add(o);
  }
  const PASSO_MARE = p.telefono ? 0.34 : 0.25, celle: { x: number; z: number }[] = [];
  for (let x = -MARE; x <= MARE; x += PASSO_MARE) for (let z = -MARE; z <= MARE; z += PASSO_MARE) if (forma(x, z) >= 1.01 && Math.hypot(x, z) <= MARE) celle.push({ x, z });
  const acqua = puntiMorbidi(celle.length);
  casa.add(acqua.punti);
  celle.forEach((c, i) => { acqua.col.set([AZZURRO.r, AZZURRO.g, AZZURRO.b], i * 3); acqua.dim[i] = 0.065; acqua.alfa[i] = (1 - liscio(Math.hypot(c.x, c.z), MARE - 4, MARE)) * (chiaro ? 0.85 : 0.72); });
  const ondeMare = (s: number) => {
    celle.forEach((c, i) => acqua.pos.set([c.x, -0.42 + Math.sin(c.x * 0.9 + s * 0.7) * 0.085 + Math.sin(c.z * 1.2 - s * 0.55 + c.x * 0.35) * 0.065, c.z], i * 3));
    acqua.aggiorna();
  };

  // --- La base di pietra e i pavimenti: ogni stanza ha il suo. Il bordo del pavimento della stanza scelta diventa arancio
  scatola(6.62, PAV, 6.12, 0, 0, -0.6, '#cfc5b4', 0.05);
  const disegno = (f: (g: CanvasRenderingContext2D) => void) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; f(cv.getContext('2d')!);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  const a_tasselli = (a: string, b: string, n: number) => (g: CanvasRenderingContext2D) => { const q = 256 / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * q, j * q, q, q); } };
  const TRAME: Record<string, (g: CanvasRenderingContext2D) => void> = {
    soggiorno: g => { g.fillStyle = '#d9a66c'; g.fillRect(0, 0, 256, 256); for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#d09a60' : '#dfae76'; g.fillRect(0, k * 32, 256, 30); g.fillStyle = '#b98650'; g.fillRect(((k * 97) % 200) + 20, k * 32, 3, 30); } },
    cucina: a_tasselli('#f7efe0', '#e8a79a', 7),
    camera: g => { g.fillStyle = '#c9b6e8'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#d8c9f0'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.beginPath(); g.arc(16 + i * 32, 16 + j * 32 + (i % 2) * 8, 5, 0, 7); g.fill(); } },
    bagno: a_tasselli('#e8f6fb', '#b3e0ee', 8),
  };
  const bordi = new Map<Stanza, THREE.LineBasicMaterial>(), matPav = new Map<Stanza, THREE.MeshToonMaterial>();
  for (const s of DENTRO) {
    const b = PIANTA[s as keyof typeof PIANTA], mm = nuovoToon('#ffffff', { map: disegno(TRAME[s]!) });
    const f = sol(new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0), mm, (b.x0 + b.x1) / 2, PAV + 0.006, (b.z0 + b.z1) / 2);
    f.rotation.x = -Math.PI / 2; pavimenti.set(f, s); matPav.set(s, mm);
    const w = (b.x1 - b.x0) / 2 - 0.12, d = (b.z1 - b.z0) / 2 - 0.12, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const lb = new THREE.LineBasicMaterial({ color: C.arancio, transparent: true, opacity: 0 });
    casa.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-w, -d], [w, -d], [w, d], [-w, d]].map(([x, z]) => new THREE.Vector3(cx + x!, PAV + 0.016, cz + z!))), lb));
    bordi.set(s, lb);
  }

  // --- I muri: stanno in un gruppo che si abbassa quando il tetto si alza, così dentro si vede bene
  const guscio = new THREE.Group(); guscio.position.y = PAV; casa.add(guscio);
  type Finestra = { stanza: Stanza; tapparella: THREE.Object3D; vetro: THREE.MeshBasicMaterial; ogg: Oggetto };
  const finestre: Finestra[] = [];
  type Apertura = { c: number; w: number; tipo: 'porta' | 'finestra'; stanza?: Stanza };
  const DAV = 0.32, ARC = 0.8, ARCO = 0.84;
  function muro(x0: number, z0: number, x1: number, z1: number, aperture: Apertura[] = [], colore = CREMA) {
    const lungoX = z0 === z1, a = Math.min(lungoX ? x0 : z0, lungoX ? x1 : z1), b = Math.max(lungoX ? x0 : z0, lungoX ? x1 : z1), fisso = lungoX ? z0 : x0;
    const X = (u: number) => (lungoX ? u : fisso), Z = (u: number) => (lungoX ? fisso : u);
    const pezzoMuro = (da: number, al: number, y0: number, y1: number) => {
      if (al - da < 0.02 || y1 - y0 < 0.02) return;
      const c = (da + al) / 2, L = al - da;
      sol(new THREE.BoxGeometry(lungoX ? L : SP, y1 - y0, lungoX ? SP : L), colore, X(c), (y0 + y1) / 2, Z(c), guscio);
    };
    let t = a;
    for (const ap of [...aperture].sort((u, v) => u.c - v.c)) {
      const da = ap.c - ap.w / 2, al = ap.c + ap.w / 2;
      pezzoMuro(t, da, 0, MURO);
      if (ap.tipo === 'finestra') {
        pezzoMuro(da, al, 0, DAV); pezzoMuro(da, al, ARC, MURO);
        const altaF = ARC - DAV, vetro = new THREE.MeshBasicMaterial({ color: '#5f7f9a', side: THREE.DoubleSide });
        const v = new THREE.Mesh(new THREE.PlaneGeometry(ap.w, altaF), vetro);
        v.position.set(X(ap.c), (DAV + ARC) / 2, Z(ap.c)); if (!lungoX) v.rotation.y = Math.PI / 2;
        guscio.add(v);
        // La cornice bianca, tonda, sporge dal muro da entrambi i lati
        for (const [u, y, lw, lh] of [[ap.c, ARC + 0.02, ap.w + 0.12, 0.07], [ap.c, DAV - 0.02, ap.w + 0.16, 0.08], [da - 0.02, (DAV + ARC) / 2, 0.07, altaF + 0.08], [al + 0.02, (DAV + ARC) / 2, 0.07, altaF + 0.08], [ap.c, (DAV + ARC) / 2, 0.035, altaF]] as const)
          sol(rbox(lungoX ? lw : SP + 0.05, lh, lungoX ? SP + 0.05 : lw, 0.02), BIANCO, X(u), y, Z(u), guscio);
        // La tapparella scende dall'alto: la sua altezza segue lo stato
        const perno = new THREE.Group(); perno.position.set(X(ap.c), ARC, Z(ap.c)); guscio.add(perno);
        const ogg = oggetto(['blinds', 'tapparelle'], X(ap.c), PAV + DAV - 0.05, Z(ap.c), lungoX ? ap.w : 0.28, altaF + 0.1, lungoX ? 0.28 : ap.w);
        parte(ogg, rbox(lungoX ? ap.w - 0.02 : 0.07, altaF, lungoX ? 0.07 : ap.w - 0.02, 0.02), '#f0a35a', 0, -altaF / 2, 0, perno);
        finestre.push({ stanza: ap.stanza!, tapparella: perno, vetro, ogg });
      } else pezzoMuro(da, al, ARCO, MURO);
      t = al;
    }
    pezzoMuro(t, b, 0, MURO);
  }
  muro(-3.1, -3.5, 3.1, -3.5);
  muro(-3.1, 2.3, 3.1, 2.3, [{ c: -0.1, w: 0.62, tipo: 'porta' }, { c: 1.9, w: 1.0, tipo: 'finestra', stanza: 'cucina' }]);
  muro(-3.1, -3.5, -3.1, 2.3, [{ c: -2.0, w: 0.9, tipo: 'finestra', stanza: 'camera' }, { c: 0.85, w: 1.0, tipo: 'finestra', stanza: 'soggiorno' }]);
  muro(3.1, -3.5, 3.1, 2.3, [{ c: -1.9, w: 0.8, tipo: 'finestra', stanza: 'bagno' }]);
  muro(0.3, -3.5, 0.3, 2.3, [{ c: -1.3, w: 0.6, tipo: 'porta' }, { c: 1.15, w: 0.7, tipo: 'porta' }], '#ffe8c2');
  muro(-3.1, -0.6, 0.3, -0.6, [{ c: -0.25, w: 0.6, tipo: 'porta' }], '#ffe8c2');
  muro(0.3, -0.6, 3.1, -0.6, [{ c: 0.9, w: 0.6, tipo: 'porta' }], '#ffe8c2');
  // Le travi di legno: quattro colonne tonde agli angoli e una trave in alto, come una casetta di legno
  for (const [x, z] of [[-3.1, -3.5], [3.1, -3.5], [-3.1, 2.3], [3.1, 2.3]] as const) tubo(0.11, 0.12, MURO + 0.02, x, 0, z, LEGNO, guscio, 0.04);
  for (const [w, d, x, z] of [[6.3, 0.2, 0, 2.3], [6.3, 0.2, 0, -3.5], [0.2, 5.9, -3.1, -0.6], [0.2, 5.9, 3.1, -0.6]] as const) scatola(w, 0.12, d, x, MURO - 0.08, z, LEGNO, 0.05, guscio);
  // La porta di casa: un arco di legno, l'anta aperta, lo zerbino e la tettoia
  for (const v of [-1, 1]) scatola(0.08, ARCO, 0.22, -0.1 + v * 0.35, 0, 2.3, LEGNO2, 0.03, guscio);
  scatola(0.82, 0.09, 0.24, -0.1, ARCO - 0.02, 2.3, LEGNO2, 0.04, guscio);
  { const anta = new THREE.Group(); anta.position.set(-0.4, 0, 2.38); anta.rotation.y = -1.9; guscio.add(anta); scatola(0.56, 0.8, 0.05, 0.28, 0.01, 0, TEAL, 0.03, anta); palla(0.03, 0.48, 0.42, 0.04, GIALLO, anta); palla(0.09, 0.28, 0.6, 0.02, BIANCO, anta, 1, 0.3); }
  scatola(0.7, 0.012, 0.36, -0.1, 0, 2.62, '#c7574a', 0.005, casa);
  scatola(0.95, 0.06, 0.48, -0.1, MURO - 0.14, 2.56, ROSSO, 0.03, guscio);
  // Le fioriere sotto le finestre davanti e di lato
  const fioriera = (x: number, z: number, lungo: number, sulX: boolean) => {
    scatola(sulX ? lungo : 0.16, 0.1, sulX ? 0.16 : lungo, x, DAV - 0.15, z, LEGNO, 0.03, guscio);
    for (let k = 0; k < 6; k++) { const u = (k / 5 - 0.5) * lungo * 0.85; palla(0.055, x + (sulX ? u : 0), DAV - 0.01, z + (sulX ? 0 : u), k % 2 ? ROSA : k % 3 ? GIALLO : BIANCO, guscio); }
  };
  fioriera(1.9, 2.42, 0.95, true); fioriera(3.22, -1.9, 0.75, false); fioriera(-3.22, 0.85, 0.95, false); fioriera(-3.22, -2.0, 0.85, false);

  // --- Il tetto: un coperchio tondo e rosso con le file di tegole, il camino e l'abbaino tondo sul timpano.
  // Tutti i suoi materiali sanno sfumare, perché vicino alla stanza non deve coprire la vista
  const tettoG = new THREE.Group(); tettoG.position.y = PAV + MURO - 0.02; casa.add(tettoG);
  const matTetto = (c: string) => nuovoToon(c, { transparent: true });
  const M_TETTO = { base: matTetto('#d9503f'), chiara: matTetto(ROSSO), scura: matTetto('#c94636'), crema: matTetto('#ffe8c2'), legno: matTetto(LEGNO2), camino: matTetto('#c9b8a4'), vetro: new THREE.MeshBasicMaterial({ color: '#5f7f9a', transparent: true }) };
  const L_T = 3.62, H_T = 1.72, ZF = 2.92, ZB = -4.12;
  const curvaS = new THREE.QuadraticBezierCurve(new THREE.Vector2(-L_T, 0), new THREE.Vector2(-L_T * 0.62, H_T * 0.5), new THREE.Vector2(-0.5, H_T * 0.9));
  const curvaD = new THREE.QuadraticBezierCurve(new THREE.Vector2(0.5, H_T * 0.9), new THREE.Vector2(L_T * 0.62, H_T * 0.5), new THREE.Vector2(L_T, 0));
  const profilo = (k: number, y0: number) => {
    const s = new THREE.Shape(); s.moveTo(-L_T * k, y0);
    s.quadraticCurveTo(-L_T * 0.62 * k, H_T * 0.5 * k, -0.5 * k, H_T * 0.9 * k); s.quadraticCurveTo(0, H_T * k, 0.5 * k, H_T * 0.9 * k); s.quadraticCurveTo(L_T * 0.62 * k, H_T * 0.5 * k, L_T * k, y0);
    s.lineTo(-L_T * k, y0);
    return s;
  };
  {
    const forma0 = profilo(1, 0); forma0.holes.push(new THREE.Path(profilo(0.86, 0.04).getPoints(14).reverse()));
    const guscioT = new THREE.ExtrudeGeometry(forma0, { depth: ZF - ZB, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 14 });
    guscioT.translate(0, 0, ZB);
    sol(toCreasedNormals(guscioT, 0.8), M_TETTO.base, 0, 0, 0, tettoG);
    // Il timpano davanti e il fondo dietro, rientrati
    const piatto = new THREE.ShapeGeometry(profilo(0.87, 0.02), 14);
    sol(piatto, M_TETTO.crema, 0, 0, 2.38, tettoG); sol(piatto, M_TETTO.crema, 0, 0, -3.56, tettoG).rotation.y = Math.PI;
    // Un soffitto opaco: chiude il coperchio dal basso
    const sotto = sol(new THREE.PlaneGeometry(L_T * 1.72, ZF - ZB - 0.04), M_TETTO.crema, 0, 0.03, (ZF + ZB) / 2, tettoG); sotto.rotation.x = Math.PI / 2;
    // Le file di tegole: capsule lunghe posate sulla curva
    const geoFila = new THREE.CapsuleGeometry(0.1, ZF - ZB - 0.1, 3, 10).rotateX(Math.PI / 2);
    for (const [curva, inizio] of [[curvaS, 0.04], [curvaD, 0.96]] as const) for (let k = 0; k < 7; k++) {
      const t = inizio < 0.5 ? 0.04 + k * 0.145 : 0.96 - k * 0.145, q = curva.getPoint(t), n = curva.getTangent(t);
      const lato = inizio < 0.5 ? 1 : -1;
      sol(geoFila, k % 2 ? M_TETTO.chiara : M_TETTO.scura, q.x + -n.y * 0.03 * lato, q.y + n.x * 0.03 * lato, (ZF + ZB) / 2, tettoG);
    }
    sol(new THREE.CapsuleGeometry(0.16, ZF - ZB - 0.1, 3, 12).rotateX(Math.PI / 2), M_TETTO.chiara, 0, H_T * 0.96, (ZF + ZB) / 2, tettoG);
    // Il camino, dietro a destra
    sol(rbox(0.42, 0.7, 0.42, 0.06), M_TETTO.camino, 1.75, 1.38, -2.1, tettoG);
    sol(rbox(0.54, 0.12, 0.54, 0.05), M_TETTO.legno, 1.75, 1.76, -2.1, tettoG);
    // L'abbaino tondo sul timpano
    const anello = sol(new THREE.TorusGeometry(0.25, 0.05, 10, 28), M_TETTO.legno, 0, 0.66, 2.42, tettoG); void anello;
    sol(new THREE.CircleGeometry(0.23, 28), M_TETTO.vetro, 0, 0.66, 2.4, tettoG);
  }
  const fiancoTetto = new THREE.Vector3();
  const CAMINO = new THREE.Vector3(1.75, 1.86, -2.1);
  // La sagoma della casa: col mouse sopra il tetto si alza
  const sagoma = new THREE.Mesh(new THREE.BoxGeometry(6.6, MURO + PAV + 1.1, 6.1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  sagoma.position.set(0, (MURO + PAV + 1.1) / 2, -0.6); casa.add(sagoma);
  let topoFino = 0;

  // --- Luci: una lampada per stanza, tre lanterne in giardino. Sul pavimento, una pozza di luce del suo colore
  const lampade = new Map<Stanza, { ogg: Oggetto[]; punti: THREE.Vector3[] }>(STANZE.map(s => [s, { ogg: [], punti: [] }]));
  const lampada = (s: Stanza, nome: [string, string], x: number, base: number, z: number, fa: (o: Oggetto) => void, fuori = false) => {
    const o = oggetto(nome, x, base, z, 0.36, 0.36, 0.36, casa, !fuori);
    fa(o);
    lampade.get(s)!.ogg.push(o); lampade.get(s)!.punti.push(new THREE.Vector3(x, base + 0.14, z));
    return o;
  };
  const pozze = new Map<Stanza, THREE.MeshBasicMaterial>();
  {
    const tex = new THREE.CanvasTexture((() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return cv; })());
    for (const s of STANZE) {
      const mm = new THREE.MeshBasicMaterial({ map: tex, color: '#ffd9a6', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const c = s === 'giardino' ? new THREE.Vector3(-0.2, 0, 4.0) : centro(s), d = s === 'giardino' ? 3.8 : 3.2;
      const o = new THREE.Mesh(new THREE.PlaneGeometry(d, d), mm);
      o.rotation.x = -Math.PI / 2; o.position.set(c.x, quota(s) + 0.024, c.z); o.renderOrder = 2;
      casa.add(o); pozze.set(s, mm);
    }
  }
  const tappeto = (ra: number, x: number, z: number, c: string, c2: string, sz = 0.72) => {
    for (const [k, col, dy] of [[1, c, 0.012], [0.72, c2, 0.016], [0.44, c, 0.02]] as const) { const t = sol(new THREE.CircleGeometry(ra * k, 36), col, x, PAV + dy, z); t.rotation.x = -Math.PI / 2; t.scale.y = sz; }
  };
  const pianta = (x: number, y0: number, z: number, g: THREE.Object3D = casa) => {
    tubo(0.1, 0.08, 0.15, x, y0, z, '#d9775a', g, 0.03);
    for (const [dx, dy, dz, q] of [[0, 0.3, 0, 0.13], [0.08, 0.24, 0.03, 0.09], [-0.08, 0.25, -0.03, 0.09], [0, 0.4, 0.02, 0.08]] as const) palla(q, x + dx, y0 + dy, z + dz, '#5fb548', g);
  };

  // --- Soggiorno: divano, tappeto, TV, stufa, lampada a stelo, cassa
  tappeto(1.0, -1.5, 0.85, '#f0c98a', '#e8a86a');
  scatola(1.56, 0.2, 0.62, -1.5, PAV + 0.01, 1.85, TEAL, 0.08); scatola(1.56, 0.34, 0.2, -1.5, PAV + 0.14, 2.1, '#35a397', 0.09);
  for (const x of [-2.3, -0.7]) scatola(0.2, 0.26, 0.64, x, PAV + 0.08, 1.85, '#35a397', 0.09);
  for (const x of [-1.86, -1.14]) scatola(0.62, 0.08, 0.5, x, PAV + 0.19, 1.82, '#6fd0c4', 0.04);
  scatola(1.3, 0.26, 0.38, -1.5, PAV, -0.34, LEGNO, 0.05);
  const tv = oggetto(['TV', 'TV'], -1.5, PAV + 0.26, -0.36, 1.0, 0.6, 0.2);
  parte(tv, rbox(1.0, 0.56, 0.07, 0.035), SCURO, 0, 0.3, 0);
  for (const v of [-1, 1]) parte(tv, new THREE.CapsuleGeometry(0.008, 0.16, 2, 6), SCURO, v * 0.07, 0.64, 0).rotation.z = -v * 0.45;
  const schermo = luminoso(C.fg);
  { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.44), schermo); o.position.set(0, 0.3, 0.04); tv.g.add(o); }
  const stufa = oggetto(['stove (heating)', 'stufa (riscaldamento)'], -2.7, PAV, -0.15, 0.6, 0.95, 0.6);
  parte(stufa, botte(0.2, 0.26, 0.5, 0.06), '#d9654a', 0, 0.03, 0);
  parte(stufa, botte(0.055, 0.055, 0.42, 0.015), SCURO, 0, 0.52, 0);
  for (const a of [0, 2.1, 4.2]) parte(stufa, rbox(0.05, 0.05, 0.05, 0.02), SCURO, Math.cos(a) * 0.2, 0.02, Math.sin(a) * 0.2);
  const fiamma = luminoso('#ffb347');
  { const o = new THREE.Mesh(new THREE.CircleGeometry(0.1, 18), fiamma); o.position.set(0, 0.24, 0.24); stufa.g.add(o); }
  tubo(0.016, 0.016, 0.74, -2.75, PAV, 1.95, GRIGIO); tubo(0.12, 0.13, 0.03, -2.75, PAV, 1.95, GRIGIO);
  lampada('soggiorno', ['lamp', 'lampada'], -2.75, PAV + 0.68, 1.95, o => { parte(o, botte(0.12, 0.2, 0.22, 0.03), GIALLO); });
  const casse = new Map<Stanza, { ogg: Oggetto; bocca: THREE.Vector3 }>();
  const cassa = (s: Stanza, x: number, y: number, z: number, verso = 0) => {
    const o = oggetto(['speaker', 'cassa'], x, y, z, 0.3, 0.38, 0.3);
    parte(o, rbox(0.22, 0.34, 0.2, 0.05), '#e8a13c', 0, 0.17, 0);
    const f = palla(0.065, Math.sin(verso) * 0.09, 0.14, Math.cos(verso) * 0.09, SCURO, o.g, 1, 0.4); f.rotation.y = verso;
    casse.set(s, { ogg: o, bocca: new THREE.Vector3(x, y + 0.36, z) });
  };
  cassa('soggiorno', 0.0, PAV, -0.3);
  pianta(-2.75, PAV, 1.2);

  // --- Cucina: piano di lavoro, frigo, macchina del caffè, timer, tavolo tondo, la ciotola del gatto
  scatola(0.55, 0.42, 1.7, 2.78, PAV, 0.55, '#7fc8b8', 0.04); scatola(0.6, 0.05, 1.74, 2.77, PAV + 0.41, 0.55, BIANCO, 0.02);
  scatola(0.55, 0.92, 0.5, 2.78, PAV, -0.28, '#d7efe8', 0.08); scatola(0.03, 0.2, 0.04, 2.49, PAV + 0.5, -0.12, GRIGIO, 0.012);
  const caffe = oggetto(['coffee machine', 'macchina del caffè'], 2.8, PAV + 0.45, 1.15, 0.36, 0.42, 0.36);
  parte(caffe, rbox(0.22, 0.3, 0.22, 0.05), ROSSO, 0, 0.15, 0);
  parte(caffe, rbox(0.07, 0.05, 0.1, 0.02), SCURO, -0.14, 0.2, 0);
  const tazza = tubo(0.042, 0.034, 0.06, 2.64, PAV + 0.46, 1.15, BIANCO);
  const timer = oggetto(['kitchen timer', 'timer da cucina'], 2.8, PAV + 0.45, 0.65, 0.3, 0.3, 0.3);
  parte(timer, botte(0.09, 0.1, 0.11, 0.03), GIALLO);
  const lancetta = new THREE.Group(); lancetta.position.y = 0.12; timer.g.add(lancetta);
  sol(rbox(0.018, 0.018, 0.08, 0.008), SCURO, 0, 0, 0.04, lancetta);
  cassa('cucina', 2.8, PAV + 0.45, 0.2, -Math.PI / 2);
  tappeto(0.75, 1.55, 0.85, '#f4d9a0', '#efc47c', 1);
  tubo(0.48, 0.48, 0.05, 1.55, PAV + 0.42, 0.85, LEGNO, casa, 0.024); tubo(0.04, 0.12, 0.42, 1.55, PAV, 0.85, LEGNO2);
  for (const x of [0.95, 2.15]) { tubo(0.15, 0.13, 0.05, x, PAV + 0.24, 0.85, ROSA, casa, 0.024); tubo(0.03, 0.08, 0.25, x, PAV, 0.85, LEGNO2); }
  lampada('cucina', ['lamp', 'lampada'], 1.55, PAV + 0.47, 0.85, o => { parte(o, botte(0.025, 0.04, 0.1, 0.01), LEGNO2); const c = parte(o, new THREE.SphereGeometry(0.15, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), GIALLO, 0, 0.09, 0); c.scale.y = 0.9; });
  tubo(0.1, 0.07, 0.05, 2.2, PAV + 0.01, 1.98, CIELO, casa, 0.02);

  // --- Camera: letto, comodino con l'abat-jour, armadio, ventilatore, cassa
  tappeto(0.85, -1.5, -1.3, '#efe0ff', '#dcc8f6');
  scatola(1.34, 0.18, 1.9, -1.45, PAV + 0.02, -2.55, LEGNO, 0.05); scatola(1.34, 0.56, 0.1, -1.45, PAV, -3.44, LEGNO2, 0.05);
  scatola(1.24, 0.14, 1.78, -1.45, PAV + 0.16, -2.5, BIANCO, 0.06); scatola(1.28, 0.1, 1.2, -1.45, PAV + 0.22, -2.14, LILLA, 0.05);
  for (const x of [-1.76, -1.14]) scatola(0.5, 0.12, 0.32, x, PAV + 0.26, -3.14, BIANCO, 0.05);
  scatola(0.36, 0.32, 0.34, -2.45, PAV, -3.22, LEGNO, 0.05);
  lampada('camera', ['bedside lamp', 'abat-jour'], -2.45, PAV + 0.32, -3.22, o => { parte(o, botte(0.02, 0.05, 0.08, 0.01), LEGNO2); parte(o, botte(0.08, 0.13, 0.13, 0.025), ROSA, 0, 0.08, 0); });
  scatola(0.5, 0.82, 0.94, -2.8, PAV, -1.15, LEGNO, 0.05); palla(0.025, -2.54, PAV + 0.46, -1.05, GIALLO); palla(0.025, -2.54, PAV + 0.46, -1.25, GIALLO);
  cassa('camera', -0.15, PAV, -3.25);
  const ventola = oggetto(['fan', 'ventilatore'], -0.15, PAV, -1.0, 0.44, 0.74, 0.44);
  parte(ventola, botte(0.12, 0.15, 0.04, 0.015), CIELO);
  parte(ventola, botte(0.017, 0.017, 0.47, 0.006), BIANCO, 0, 0.03, 0);
  const pale = new THREE.Group(); pale.position.set(0, 0.54, 0.05); ventola.g.add(pale);
  parte(ventola, new THREE.TorusGeometry(0.17, 0.012, 8, 28), CIELO, 0, 0.54, 0.05);
  for (let k = 0; k < 4; k++) { const b = sol(geoPalla, BIANCO, Math.cos(k * Math.PI / 2) * 0.085, Math.sin(k * Math.PI / 2) * 0.085, 0, pale); b.scale.set(k % 2 ? 0.045 : 0.085, k % 2 ? 0.085 : 0.045, 0.012); }
  palla(0.03, 0, 0, 0.012, CIELO, pale);

  // --- Bagno: vasca, lavandino con lo specchio tondo che fa da lampada
  tappeto(0.5, 1.7, -1.8, BIANCO, '#cfeaf3', 0.72);
  scatola(1.44, 0.34, 0.74, 2.25, PAV, -3.0, BIANCO, 0.13);
  { const a = sol(new THREE.PlaneGeometry(1.14, 0.46), CIELO, 2.25, PAV + 0.345, -3.0); a.rotation.x = -Math.PI / 2; }
  palla(0.05, 2.84, PAV + 0.42, -3.0, GRIGIO, casa, 0.5, 0.6);
  scatola(0.42, 0.3, 0.34, 0.58, PAV, -2.6, '#7fc8b8', 0.05); tubo(0.15, 0.1, 0.05, 0.58, PAV + 0.3, -2.6, BIANCO, casa, 0.02);
  lampada('bagno', ['mirror light', 'luce dello specchio'], 0.42, PAV + 0.5, -2.6, o => { const a = parte(o, new THREE.TorusGeometry(0.15, 0.024, 8, 26), GIALLO, 0, 0.16, 0); a.rotation.y = Math.PI / 2; const v = sol(new THREE.CircleGeometry(0.135, 24), '#d7eef8', 0.004, 0.16, 0, o.g); v.rotation.y = Math.PI / 2; });

  // --- Giardino: alberi a filo come quelli di AI terms (il tronco è un filo, la chioma sono palle o coni con un riempimento tenue),
  // sassi, fiori, il vialetto, lo stagno con la papera, il pontile con la barca
  const chiome: { g: THREE.Group; fase: number }[] = [];
  const verdi = [mat('#6fa646'), mat('#5f9c45'), mat('#4f8a3c')], fusto = linea(chiaro ? '#3a332c' : '#e8e6e0', 0.7);
  const albero = (x: number, z: number, h: number, k: number, f = Math.floor(r() * 2)) => {
    const ob = new THREE.Group(), m = verdi[k % 3]!;
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
    ob.position.set(x, altezza(x, z), z); ob.rotation.y = r() * Math.PI;
    casa.add(ob); chiome.push({ g: ob, fase: r() * 6 });
  };
  ([[-4.5, 1.2, 1.5, 0], [-5.5, -0.6, 1.25, 1], [-4.2, -3.9, 1.3, 2], [-2.3, -4.8, 1.2, 0], [1.6, -5.0, 1.1, 1], [4.1, -1.0, 1.35, 2], [5.3, 2.6, 1.05, 0], [-5.3, 4.9, 0.95, 1], [5.4, -0.8, 1.0, 1]] as const).forEach(([x, z, a, k]) => albero(x, z, a * 1.15, k));
  ([[4.9, -3.6, 1.0], [4.2, -3.2, 0.72], [5.6, -3.0, 0.8], [-5.1, -3.3, 0.95], [-5.8, -2.6, 0.7], [0.1, -5.5, 0.8], [-0.9, -5.4, 0.62]] as const).forEach(([x, z, a], k) => albero(x, z, a * 1.2, k, 2));
  // Sassi tondi e ciuffi di fiori
  for (const [x, z, q] of [[-3.7, 2.9, 0.16], [3.6, 3.0, 0.0], [-6.0, 1.0, 0.2], [6.0, -0.4, 0.17], [-1.9, 6.0, 0.17], [2.4, 6.0, 0.13], [-3.3, 5.9, 0.12]] as const) if (q) { const o = palla(q, x, altezza(x, z) + q * 0.3, z, '#b7b2a8', casa, 0.65, 0.85); o.rotation.y = x; }
  {
    const geo = new THREE.SphereGeometry(0.05, 10, 7), TINTE = [ROSA, BIANCO, GIALLO, '#e88a5a', LILLA], posti: [number, number][] = [];
    for (let k = 0; k < 70; k++) { const x = -3.1 + (k / 69) * 2.4 + (r() - 0.5) * 0.1; if (k < 30) posti.push([x, 2.56 + r() * 0.18]); }
    for (let k = 0; k < 150 && posti.length < 110; k++) {
      const a = r() * 6.283, d = 3.4 + r() * 3.2, x = Math.cos(a) * d * 1.1, z = CZ + Math.sin(a) * d;
      if (forma(x, z) < 0.88 && fuoriRett(x, z, -3.5, 3.5, -3.9, 2.6) > 0.1 && fuoriRett(x, z, 0.9, 4.9, 2.6, 5.6) > 0.15 && Math.abs(x + 0.1) > 0.6 && Math.hypot(x + 3.9, z - 4.2) > 1.5) posti.push([x, z]);
    }
    const fiori = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ gradientMap: bande }), posti.length), M4 = new THREE.Matrix4();
    posti.forEach(([x, z], i) => { M4.makeTranslation(x, altezza(x, z) + 0.05, z); fiori.setMatrixAt(i, M4); fiori.setColorAt(i, cTmp.set(TINTE[i % 5]!)); });
    casa.add(fiori);
  }
  // Il vialetto di sassi piatti, dalla porta alla spiaggia
  for (let k = 0; k < 7; k++) { const z = 2.95 + k * 0.5, x = -0.1 + Math.sin(k * 0.9) * 0.16; const s = sol(botte(0.2, 0.22, 0.03, 0.012), '#d7cfbf', x, 0, z); s.scale.z = 0.8; }
  for (const [x, z] of [[-0.85, 3.1], [0.65, 4.0], [-0.85, 4.9]] as const) {
    tubo(0.018, 0.024, 0.55, x, 0, z, SCURO); tubo(0.06, 0.07, 0.03, x, 0, z, SCURO);
    lampada('giardino', ['lantern', 'lanterna'], x, 0.5, z, o => { parte(o, rbox(0.15, 0.18, 0.15, 0.05), GIALLO, 0, 0.09, 0); parte(o, botte(0.03, 0.11, 0.06, 0.02), SCURO, 0, 0.18, 0); }, true);
  }
  // Lo stagno con le ninfee e una papera che gira
  const STAGNO = new THREE.Vector3(-3.9, 0, 4.2);
  {
    const a = sol(new THREE.CircleGeometry(1.05, 40), '#6bbfe4', STAGNO.x, 0.012, STAGNO.z); a.rotation.x = -Math.PI / 2; a.scale.y = 0.78; a.material = new THREE.MeshBasicMaterial({ color: '#6bbfe4' });
    for (let k = 0; k < 16; k++) { const t = (k / 16) * 6.283; palla(0.1 + (k % 3) * 0.022, STAGNO.x + Math.cos(t) * 1.08, 0.03, STAGNO.z + Math.sin(t) * 0.84, '#c8c2b5', casa, 0.6); }
    for (const [dx, dz] of [[0.42, 0.24], [-0.3, -0.36], [0.05, 0.42]] as const) { const n = sol(new THREE.CircleGeometry(0.12, 16), '#5fb548', STAGNO.x + dx, 0.018, STAGNO.z + dz); n.rotation.x = -Math.PI / 2; palla(0.03, STAGNO.x + dx, 0.03, STAGNO.z + dz, ROSA, casa, 0.7); }
  }
  const papera = new THREE.Group(); papera.scale.setScalar(0.85); casa.add(papera);
  palla(0.1, 0, 0.07, 0, BIANCO, papera, 0.72, 1.3); palla(0.06, 0, 0.17, 0.09, BIANCO, papera); palla(0.03, 0, 0.16, 0.16, '#f7a13c', papera, 0.45, 1.1); for (const v of [-1, 1]) palla(0.011, v * 0.042, 0.19, 0.14, SCURO, papera);
  // La cassetta delle lettere, la panchina e lo steccato bianco del prato
  { const g = new THREE.Group(); g.position.set(0.72, 0, 2.86); casa.add(g); tubo(0.02, 0.025, 0.42, 0, 0, 0, LEGNO2, g); scatola(0.2, 0.15, 0.3, 0, 0.4, 0, CIELO, 0.07, g); scatola(0.015, 0.14, 0.05, 0.11, 0.47, -0.05, ROSSO, 0.006, g); }
  { const g = new THREE.Group(); g.position.set(-2.55, 0, 5.45); g.rotation.y = -2.6; casa.add(g); scatola(0.8, 0.04, 0.24, 0, 0.2, 0, LEGNO, 0.018, g); scatola(0.8, 0.2, 0.04, 0, 0.26, -0.11, LEGNO, 0.018, g); for (const v of [-1, 1]) scatola(0.05, 0.2, 0.2, v * 0.33, 0, 0, LEGNO2, 0.018, g); }
  {
    const geoP = rbox(0.07, 0.3, 0.05, 0.024), geoS = rbox(1, 0.035, 0.02, 0.012), steccati: [number, number, number, number][] = [[1.0, 3.25, 1.0, 5.5], [1.0, 5.5, 4.75, 5.5]];
    for (const [x0, z0, x1, z1] of steccati) {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 0.3), a = Math.atan2(z1 - z0, x1 - x0);
      for (let k = 0; k <= n; k++) { const f = k / n, q = sol(geoP, BIANCO, x0 + (x1 - x0) * f, 0.15, z0 + (z1 - z0) * f); q.rotation.y = -a; }
      for (const y of [0.1, 0.21]) { const q = sol(geoS, BIANCO, (x0 + x1) / 2, y, (z0 + z1) / 2); q.scale.x = L; q.rotation.y = -a; }
    }
  }
  // Il pontile e la barchetta, nella baia
  const barca = new THREE.Group(); barca.position.set(1.05, -0.3, 7.15); barca.rotation.y = -1.1; casa.add(barca);
  {
    for (let k = 0; k < 8; k++) scatola(0.72, 0.035, 0.17, -0.1, -0.05, 5.55 + k * 0.22, k % 2 ? LEGNO : '#b67e49', 0.015);
    for (const [x, z] of [[-0.44, 5.7], [0.24, 5.7], [-0.44, 7.0], [0.24, 7.0]] as const) tubo(0.035, 0.04, 0.5, x, -0.48, z, LEGNO2);
    palla(0.17, 0, 0.03, 0, BIANCO, barca, 0.72, 2.6);
    palla(0.175, 0, 0.0, 0, TEAL, barca, 0.45, 2.62);
    palla(0.12, 0, 0.09, 0, LEGNO, barca, 0.22, 2.75);
    tubo(0.012, 0.012, 0.75, 0, 0.08, -0.03, LEGNO2, barca);
    const vela = new THREE.Shape(); vela.moveTo(0, 0); vela.lineTo(0, 0.62); vela.quadraticCurveTo(0.26, 0.26, 0.38, 0); vela.lineTo(0, 0);
    const v = sol(new THREE.ShapeGeometry(vela, 12), new THREE.MeshToonMaterial({ color: ROSSO, gradientMap: bande, side: THREE.DoubleSide }), 0, 0.16, -0.03, barca); v.rotation.y = -Math.PI / 2;
  }
  // Ciuffi d'erba nel prato davanti: il tosaerba li accorcia dove passa, poi ricrescono piano
  const PRATO = { x0: 1.3, x1: 4.4, z0: 2.8, z1: 5.2 };
  const ciuffi: { x: number; z: number; h: number; ora: number; disegnata: number }[] = [];
  for (let x = PRATO.x0; x <= PRATO.x1; x += 0.2) for (let z = PRATO.z0; z <= PRATO.z1; z += 0.2) if (forma(x, z) < 0.94) ciuffi.push({ x: x + (r() - 0.5) * 0.1, z: z + (r() - 0.5) * 0.1, h: 0.11 + r() * 0.07, ora: 0, disegnata: -1 });
  ciuffi.forEach(c => { c.ora = c.h; });
  const erba = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 1, 6).translate(0, 0.5, 0), new THREE.MeshToonMaterial({ color: '#4fa33f', gradientMap: bande }), ciuffi.length);
  erba.frustumCulled = false; casa.add(erba);
  const M4 = new THREE.Matrix4();
  const disegnaErba = () => {
    let cambiata = false;
    ciuffi.forEach((c, i) => { if (Math.abs(c.ora - c.disegnata) < 0.002) return; c.disegnata = c.ora; M4.makeScale(1, c.ora, 1).setPosition(c.x, 0, c.z); erba.setMatrixAt(i, M4); cambiata = true; });
    if (cambiata) erba.instanceMatrix.needsUpdate = true;
  };
  disegnaErba();
  // La casetta del tosaerba, sorella piccola della casa
  scatola(0.74, 0.42, 0.62, 4.65, 0, 2.75, CREMA, 0.05);
  { const t = sol(botte(0.03, 0.58, 0.32, 0.03), ROSSO, 4.65, 0.42, 2.75); t.scale.z = 0.82; scatola(0.34, 0.3, 0.02, 4.32, 0, 2.75, SCURO, 0.008).rotation.y = Math.PI / 2; }
  const BASE_TOSA = new THREE.Vector3(4.0, 0, 2.75);
  const tosa = new THREE.Group(); tosa.position.copy(BASE_TOSA); casa.add(tosa);
  const tosaO = oggetto(['lawn mower', 'tosaerba'], 0, 0, 0, 0.5, 0.42, 0.5, tosa, false);
  parte(tosaO, rbox(0.36, 0.15, 0.3, 0.06), ROSSO, 0, 0.13, 0);
  parte(tosaO, botte(0.07, 0.09, 0.08, 0.02), GIALLO, 0, 0.2, 0);
  parte(tosaO, new THREE.CapsuleGeometry(0.012, 0.3, 2, 6), SCURO, 0, 0.32, -0.2).rotation.x = -0.75;
  for (const [x, z] of [[-0.17, 0.12], [0.17, 0.12], [-0.17, -0.12], [0.17, -0.12]] as const) { const w = sol(botte(0.05, 0.05, 0.03, 0.01), SCURO, x + (x > 0 ? -0.015 : 0.015), 0.05, z, tosaO.g); w.rotation.z = Math.PI / 2; w.position.x = x > 0 ? x + 0.015 : x - 0.015; }

  // --- Robot aspirapolvere: va di stanza in stanza passando dalle porte, poi torna alla base. Ha due occhietti davanti
  const robot = new THREE.Group(); robot.position.copy(BASE_ROBOT); casa.add(robot);
  const robotO = oggetto(['robot vacuum', 'robot aspirapolvere'], 0, 0, 0, 0.44, 0.22, 0.44, robot);
  parte(robotO, botte(0.17, 0.18, 0.07, 0.025), '#4d6e9e', 0, 0.005, 0);
  parte(robotO, botte(0.07, 0.08, 0.025, 0.01), '#f0a35a', 0, 0.07, -0.03);
  for (const v of [-1, 1]) { palla(0.024, v * 0.055, 0.065, 0.125, BIANCO, robot); palla(0.012, v * 0.055, 0.067, 0.145, SCURO, robot); }
  let percorso: THREE.Vector3[] = [], stanzaRobot: Stanza = 'soggiorno';

  // --- Il gatto: forme piene e lisce, come il cane di /learn/, ma snello: schiena lunga, zampe alte e sottili, testa piccola,
  // coda lunga e fine. Bianco e nero: pelo nero, petto, muso, zampe e punta della coda bianchi, gli occhi gialli.
  // Il corpo è fatto di ovali lunghi che si sovrappongono (petto, ventre, fianchi): camminando petto e fianchi ondeggiano
  // in versi opposti, così la schiena si piega come quella dei cervi. La coda è una catena con un'onda dalla base alla punta.
  const nero = nuovoToon('#2b2b33'), bianco = nuovoToon('#fbf7ee');
  const occhi = new THREE.MeshBasicMaterial({ color: '#e8e05a', transparent: true, opacity: 1 });
  const ovale = (mm: THREE.Material, rx: number, ry: number, rz: number, x: number, y: number, z: number, padre: THREE.Object3D) => {
    const g = new THREE.Mesh(geoPalla, mm);
    g.scale.set(rx, ry, rz); g.position.set(x, y, z); padre.add(g);
    return g;
  };
  const ALTO = 0.165;
  const gatto = new THREE.Group(); gatto.scale.setScalar(1.25); casa.add(gatto);
  // Il corpo guarda verso +z. corpo: l'altezza e l'inclinazione; petto e fianchi si girano un po' per piegare la schiena
  const corpo = new THREE.Group(); corpo.position.y = ALTO; gatto.add(corpo);
  const ventre = ovale(nero, 0.04, 0.042, 0.115, 0, -0.004, 0, corpo);
  const petto = new THREE.Group(); petto.position.z = 0.065; corpo.add(petto);
  ovale(nero, 0.043, 0.05, 0.07, 0, 0.004, 0.015, petto);
  ovale(bianco, 0.028, 0.04, 0.03, 0, -0.018, 0.058, petto);
  const fianchi = new THREE.Group(); fianchi.position.z = -0.065; corpo.add(fianchi);
  ovale(nero, 0.046, 0.05, 0.075, 0, 0.006, -0.025, fianchi);
  // Collo e testa: il collo sale dal petto, inclinato in avanti; la testa piccola in cima, col muso a punta
  const collo = new THREE.Group(); collo.position.set(0, 0.03, 0.065); petto.add(collo);
  { const c = ovale(nero, 0.025, 0.045, 0.028, 0, 0.03, 0.012, collo); c.rotation.x = 0.45; }
  { const c = sol(new THREE.TorusGeometry(0.026, 0.006, 8, 20), ROSSO, 0, 0.022, 0.012, collo); c.rotation.x = Math.PI / 2 - 0.45; }
  const testa = new THREE.Group(); testa.position.set(0, 0.07, 0.035); collo.add(testa);
  ovale(nero, 0.048, 0.042, 0.048, 0, 0, 0, testa);
  ovale(nero, 0.03, 0.026, 0.03, 0, -0.012, 0.032, testa);
  ovale(bianco, 0.024, 0.017, 0.022, 0, -0.018, 0.044, testa);
  ovale(bianco, 0.012, 0.024, 0.008, 0, 0.008, 0.046, testa);
  ovale(toon(ROSA), 0.006, 0.005, 0.004, 0, -0.01, 0.064, testa);
  const orecchie = [-1, 1].map(lato => {
    const o = new THREE.Group(); o.position.set(lato * 0.028, 0.034, -0.004); testa.add(o);
    o.add(new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.042, 14).translate(0, 0.016, 0), nero));
    o.rotation.z = -lato * 0.32;
    const e = new THREE.Mesh(geoPalla, occhi); e.scale.set(0.011, 0.008, 0.005); e.position.set(lato * 0.021, 0.008, 0.042); e.rotation.set(-0.2, lato * 0.5, lato * 0.25); testa.add(e);
    return o;
  });
  // Le zampe: lunghe e sottili, con anca, coscia, ginocchio, stinco e la zampetta bianca. Passo a quattro tempi, come i cervi
  const ZAMPE_GATTO = [{ x: -0.03, z: -0.095, fase: 0, davanti: false }, { x: -0.028, z: 0.095, fase: 0.25, davanti: true }, { x: 0.03, z: -0.095, fase: 0.5, davanti: false }, { x: 0.028, z: 0.095, fase: 0.75, davanti: true }];
  const geoCosciaD = new THREE.CapsuleGeometry(0.017, 0.055, 4, 10), geoCosciaA = new THREE.CapsuleGeometry(0.013, 0.06, 4, 10), geoStinco = new THREE.CapsuleGeometry(0.0085, 0.065, 4, 8);
  const zampe = ZAMPE_GATTO.map(q => {
    const anca = new THREE.Group(); anca.position.set(q.x, ALTO, q.z); gatto.add(anca);
    anca.add(new THREE.Mesh(q.davanti ? geoCosciaA : geoCosciaD, nero).translateY(-0.04));
    const ginocchio = new THREE.Group(); ginocchio.position.y = -0.082; anca.add(ginocchio);
    ginocchio.add(new THREE.Mesh(geoStinco, nero).translateY(-0.04));
    ovale(bianco, 0.012, 0.008, 0.017, 0, -0.08, 0.005, ginocchio);
    return { ...q, anca, ginocchio };
  });
  // La coda: quattordici pezzi fini, ognuno figlio del precedente; la punta è bianca
  const coda: THREE.Group[] = [], PEZZI_CODA = 14, kc = 9 / PEZZI_CODA;
  {
    let padre: THREE.Object3D = fianchi;
    for (let k = 0; k < PEZZI_CODA; k++) {
      const g = new THREE.Group(); g.position.set(0, k ? 0.019 : 0.03, k ? 0 : -0.092); padre.add(g);
      ovale(k > PEZZI_CODA - 3 ? bianco : nero, 0.0095 - k * 0.0002, 0.013, 0.0095 - k * 0.0002, 0, 0.0095, 0, g);
      coda.push(g); padre = g;
    }
  }
  const zzz = document.createElement('span'); zzz.className = 'etichetta-zzz'; zzz.textContent = 'z z z'; etichette.append(zzz);

  // I posti del gatto: dove si siede, dove mangia, dove dorme. y è l'altezza della superficie
  type Posto = { stanza: Stanza; x: number; z: number; y: number; fa: 'dorme' | 'siede' | 'mangia'; verso: number; peso: (st: Stato, caldo: boolean) => number };
  const POSTI: Posto[] = [
    { stanza: 'camera', x: -1.65, z: -2.2, y: PAV + 0.32, fa: 'dorme', verso: 0.6, peso: () => 2.5 },
    { stanza: 'soggiorno', x: -1.8, z: 1.8, y: PAV + 0.27, fa: 'dorme', verso: 1.6, peso: st => (st.tv ? 3 : 1.5) },
    { stanza: 'soggiorno', x: -2.25, z: 0.3, y: PAV, fa: 'dorme', verso: -0.4, peso: (_, caldo) => (caldo ? 7 : 0.4) },
    { stanza: 'soggiorno', x: -2.8, z: 0.85, y: PAV, fa: 'siede', verso: -Math.PI / 2, peso: st => 2 * st.stanze.soggiorno.tapparelle },
    { stanza: 'cucina', x: 2.2, z: 1.82, y: PAV, fa: 'mangia', verso: 0, peso: () => 1.5 },
    { stanza: 'cucina', x: 1.0, z: 1.75, y: PAV, fa: 'siede', verso: 2.4, peso: st => (st.caffe ? 1.2 : 0.6) },
    { stanza: 'bagno', x: 1.5, z: -1.7, y: PAV, fa: 'siede', verso: -2.4, peso: () => 0.6 },
    { stanza: 'giardino', x: 0.55, z: 3.35, y: 0, fa: 'siede', verso: 0.5, peso: st => (st.tosaerba ? 0 : 3) },
    { stanza: 'giardino', x: -2.3, z: 3.7, y: 0, fa: 'dorme', verso: 2, peso: st => (st.tosaerba ? 0 : 2.2) },
  ];
  type Fare = 'cammina' | 'dorme' | 'siede' | 'lecca' | 'stira' | 'mangia' | 'salta';
  // All'apertura il gatto è fuori, davanti alla porta: con il tetto chiuso si vede subito
  const micio = {
    fare: 'siede' as Fare, fino: 9, posto: POSTI[7]!, via: [] as THREE.Vector3[], veloce: false, salto: null as null | { da: THREE.Vector3; a: THREE.Vector3; t: number },
    verso: 0.5, giro: 0, vel: 0, passo: 0, pose: { sedere: 1, sdraio: 0, testaGiu: 0, stira: 0, lecca: 0 }, paura: 0, sguardo: 0, orecchio: 0,
  };
  gatto.position.set(0.55, 0, 3.35);

  // --- Particelle: alone delle lampade, dello schermo e della stufa; vapore del caffè, note della musica, fumo del camino, polvere del tetto
  const nLampade = [...lampade.values()].reduce((a, l) => a + l.punti.length, 0), VAP = 10, NOTE = 24, FUMO = 9, POLVERE = 14;
  const alone = puntiMorbidi(nLampade + 2), part = puntiMorbidi(VAP + NOTE), fumo = puntiMorbidi(FUMO + POLVERE);
  casa.add(alone.punti, part.punti, fumo.punti);
  const vita = Array.from({ length: VAP + NOTE }, (_, i) => i / (VAP + NOTE));
  const vitaFumo = Array.from({ length: FUMO }, (_, i) => i / FUMO);
  const polvere = Array.from({ length: POLVERE }, (_, i) => { const t = (i / POLVERE) * Math.PI * 2; return { x: Math.cos(t) * 3.7, z: -0.6 + Math.sin(t) * 3.5, a: t, v: 1 }; });

  // --- Nuvole a filo come quelle di AI terms: sbuffi tenui che il vento porta piano; al bordo del cielo svaniscono e rinascono
  const VENTO = new THREE.Vector3(1, 0, 0.35).normalize(), RAGGIO_CIELO = 12;
  const nuvole = Array.from({ length: 7 }, () => {
    const g = new THREE.Group(), m = mat('#8a8f96', { opacity: 0.05, fili: 0.22 }), fili0 = m.userData.linea as THREE.LineBasicMaterial;
    const n = 3 + Math.floor(r() * 5), largo = 0.5 + r() * 0.7;
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) - 0.5 : 0, d = (0.2 + r() * 0.28) * (1 - Math.abs(t) * 0.6);
      g.add(pezzo(sasso(d, r, 1), m, t * largo * 2 + (r() - 0.5) * 0.2, (r() - 0.2) * 0.16 + (0.5 - Math.abs(t)) * 0.12, (r() - 0.5) * 0.45));
    }
    const a = r() * Math.PI * 2, dd = Math.sqrt(r()) * RAGGIO_CIELO * 0.95;
    g.position.set(Math.cos(a) * dd, 4.6 + r() * 1.4, CZ + Math.sin(a) * dd); g.rotation.y = r() * Math.PI; g.scale.setScalar(0.5 + r() * 0.45);
    casa.add(g);
    return { g, m, fili0, vel: 0.08 + r() * 0.08, vista: 0 };
  });
  // Due farfalle sul prato
  const farfalle = [ROSA, GIALLO].map((c, i) => {
    const g = new THREE.Group(); casa.add(g);
    const ali = [-1, 1].map(v => { const a = new THREE.Group(); g.add(a); const m = sol(new THREE.CircleGeometry(0.055, 12), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }), v * 0.05, 0, 0, a); m.rotation.x = -Math.PI / 2; return { a, v }; });
    return { g, ali, cx: i ? 2.6 : -2.2, cz: i ? 4.2 : 3.3, fase: i * 2 };
  });

  // --- Etichette HTML: le stanze, i gradi sulla stufa, il timer, e il nome dell'oggetto sotto il mouse
  const nomiEl = new Map<Stanza, HTMLElement>();
  for (const s of STANZE) { const e = document.createElement('span'); e.className = 'etichetta-stanza'; e.textContent = NOMI[s].en; etichette.append(e); nomiEl.set(s, e); }
  const gradiEl = document.createElement('span'); gradiEl.className = 'etichetta-gradi'; etichette.append(gradiEl);
  const timerEl = document.createElement('span'); timerEl.className = 'etichetta-timer'; etichette.append(timerEl);
  const sopraEl = document.createElement('span'); sopraEl.className = 'etichetta-oggetto'; etichette.append(sopraEl);

  // Il tasto per tornare subito alla vista larga, come «see everything» nella pagina del cane
  const tastoLargo = document.createElement('button');
  tastoLargo.type = 'button'; tastoLargo.textContent = 'see the whole island';
  tastoLargo.style.cssText = `position:absolute;right:8px;bottom:8px;padding:${p.telefono ? '7px 12px' : '6px 12px'};border:1px solid var(--line);border-radius:999px;background:var(--bg);color:var(--fg);font:12px var(--mono);cursor:pointer;opacity:0;pointer-events:none;transition:opacity .25s`;
  tastoLargo.addEventListener('pointerdown', e => e.stopPropagation());
  tastoLargo.addEventListener('click', () => azzera());
  el.appendChild(tastoLargo);

  // --- Stato
  let stato: Stato | null = null, prima: Stato | null = null, caffeFino = 0, gradi = 20.5, sTempo = 0, angoloPale = 0, pausaTosa = 0, dove: Stanza = 'soggiorno';
  const luci = new Map<Stanza, { v: number; c: THREE.Color }>(STANZE.map(s => [s, { v: 0, c: new THREE.Color('#ffd9a6') }]));
  const tapp = new Map<Stanza, number>(STANZE.map(s => [s, 1]));
  let percorsoTosa: THREE.Vector3[] = [];
  // Il tetto: 0 chiuso, 1 alzato, con una molla che lo fa rimbalzare. scrive: il cursore è nella casella del comando
  let tetto = 0, velTetto = 0, schiaccia = 0, sfumaTetto = 1, scrive = false, zoomScelto = 1;
  // Mentre scrivi la vista guarda la casa un po' più da vicino
  const MIRA_CASA = new THREE.Vector3(0, 0.3, -0.35), ZOOM_CASA = 0.74;
  // Le viste in coda: una per ogni pezzo del comando. attuale è quella sullo schermo
  const coda2Fuochi: Fuoco[] = [];
  let attuale: Fuoco | null = null, attualeFino = 0, vicino = false;
  const ora = () => performance.now() / 1000;

  function azzera() { coda2Fuochi.length = 0; attuale = null; }
  function accoda(f: Fuoco) {
    const ultimo = coda2Fuochi[coda2Fuochi.length - 1] ?? attuale;
    // Due pezzi sulla stessa cosa: una vista sola, un po' più lunga
    if (ultimo?.chiave === f.chiave) { ultimo.durata += 1.5; if (ultimo === attuale) attualeFino += 1.5; return; }
    coda2Fuochi.push(f);
  }
  const suCosa = (o: Oggetto, aperto = true, zoom = 0.26, durata = 6): Fuoco => ({ chiave: o.nome[0] + o.g.id, punto: v => { o.presa.getWorldPosition(v); }, zoom, aperto, durata });
  const suStanza = (s: Stanza, durata = 6): Fuoco => ({ chiave: s, punto: v => { v.copy(centro(s)); v.y = s === 'giardino' ? 0.2 : 0.35; }, zoom: s === 'giardino' ? 0.42 : 0.36, aperto: s !== 'giardino', durata });
  const LARGA: Fuoco = { chiave: 'larga', punto: v => { v.copy(MIRA0); }, zoom: 1, aperto: true, durata: 7 };
  const seguendo = (g: THREE.Object3D, aperto: boolean, durata: number): Fuoco => ({ chiave: `segue${g.id}`, punto: v => { v.copy(g.position); v.y = 0.2; }, zoom: 0.32, aperto, durata });

  function comando(intento: string, stanza: Stanza | null, fatto: boolean) {
    const unaCassa = () => { const k = stanza && casse.has(stanza) ? stanza : stato?.musica.length === 1 ? stato.musica[0]! : null; return k ? casse.get(k)!.ogg : null; };
    let f: Fuoco | null = null;
    switch (intento) {
      case 'caffe': f = suCosa(caffe); break;
      case 'timer': case 'timer_stop': f = suCosa(timer); break;
      case 'tv_accendi': case 'tv_spegni': f = suCosa(tv, true, 0.3); break;
      case 'caldo_su': case 'caldo_giu': case 'temperatura': f = suCosa(stufa); break;
      case 'ventilatore_on': case 'ventilatore_off': f = suCosa(ventola); break;
      case 'pulisci': case 'pulisci_stop': f = fatto ? seguendo(robot, true, 11) : null; break;
      case 'tosaerba': case 'tosaerba_stop': f = seguendo(tosa, false, 10); break;
      case 'musica_play': case 'musica_stop': case 'musica_avanti': case 'volume_su': case 'volume_giu': case 'volume_livello': case 'muto': { const o = unaCassa(); f = o ? suCosa(o) : fatto ? { ...LARGA } : null; break; }
      default: f = stanza ? suStanza(stanza) : fatto ? { ...LARGA } : null;
    }
    if (f) accoda(f);
  }

  // La strada fra due stanze, di porta in porta. Il robot non esce in giardino
  function strada(da: Stanza, a: Stanza, giardino = true): THREE.Vector3[] {
    const porte = PORTE.filter(q => giardino || (q[0] !== 'giardino' && q[1] !== 'giardino'));
    const vicini = (s: Stanza) => porte.filter(q => q[0] === s || q[1] === s).map(q => ({ s: q[0] === s ? q[1] : q[0], x: q[2], z: q[3] }));
    const visti = new Map<Stanza, { da: Stanza; x: number; z: number } | null>([[da, null]]), coda2: Stanza[] = [da];
    while (coda2.length) { const s = coda2.shift()!; for (const v of vicini(s)) if (!visti.has(v.s)) { visti.set(v.s, { da: s, x: v.x, z: v.z }); coda2.push(v.s); } }
    const punti: THREE.Vector3[] = [];
    for (let s = a; s !== da;) { const v = visti.get(s); if (!v) break; punti.unshift(new THREE.Vector3(v.x, PAV, v.z)); s = v.da; }
    return punti;
  }
  function pulisci(stanze: Stanza[]) {
    percorso = [];
    let qui = stanzaRobot;
    for (const s of stanze) {
      if (s === 'giardino') continue;
      percorso.push(...strada(qui, s, false).map(v => v.setY(PAV + 0.02)));
      const b = PIANTA[s as keyof typeof PIANTA], m0 = 0.5;
      for (let k = 0; k < 4; k++) { const z = b.z0 + m0 + ((b.z1 - b.z0 - 2 * m0) * k) / 3; percorso.push(new THREE.Vector3(k % 2 ? b.x1 - m0 : b.x0 + m0, PAV + 0.02, z), new THREE.Vector3(k % 2 ? b.x0 + m0 : b.x1 - m0, PAV + 0.02, z)); }
      qui = s;
    }
    percorso.push(...strada(qui, 'soggiorno', false).map(v => v.setY(PAV + 0.02)), BASE_ROBOT.clone());
  }
  function falcia() {
    percorsoTosa = [];
    for (let k = 0; k < 6; k++) { const z = PRATO.z0 + 0.2 + k * 0.42; percorsoTosa.push(new THREE.Vector3(k % 2 ? PRATO.x1 - 0.2 : PRATO.x0 + 0.2, 0, z), new THREE.Vector3(k % 2 ? PRATO.x0 + 0.2 : PRATO.x1 - 0.2, 0, z)); }
  }

  // --- Il gatto decide: un posto nuovo, scelto col suo peso (il letto e il divano per dormire, con la stufa accesa il tappeto,
  // la finestra se le tapparelle sono aperte, il prato se il tosaerba è spento)
  function vaiA(q: Posto, veloce = false) {
    micio.posto = q; micio.veloce = veloce;
    const qui = stanzaDi(gatto.position.x, gatto.position.z);
    // Se è su un mobile, prima salta giù davanti a sé
    micio.salto = gatto.position.y > quota(qui) + 0.05 ? { da: gatto.position.clone(), a: new THREE.Vector3(gatto.position.x + Math.sin(micio.verso) * 0.3, quota(qui), gatto.position.z + Math.cos(micio.verso) * 0.3), t: 0 } : null;
    micio.via = [...strada(qui, q.stanza), new THREE.Vector3(q.x, quota(q.stanza), q.z)];
    micio.fare = micio.salto ? 'salta' : 'cammina';
  }
  function scegli(st: Stato, caldo: boolean, evita?: Stanza) {
    const pesi = POSTI.map(q => (q === micio.posto || q.stanza === evita ? 0 : Math.max(0, q.peso(st, caldo))));
    let x = r() * pesi.reduce((a, b) => a + b, 0);
    for (let i = 0; i < POSTI.length; i++) { x -= pesi[i]!; if (x <= 0) return POSTI[i]!; }
    return POSTI[0]!;
  }
  const morbido = (da: number, a: number, k: number) => da + (a - da) * Math.min(1, k);
  const angolo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  function arriva(s: number) {
    const q = micio.posto;
    micio.fare = q.fa === 'dorme' ? 'dorme' : q.fa === 'mangia' ? 'mangia' : 'siede';
    micio.fino = s + (q.fa === 'dorme' ? 22 + r() * 25 : q.fa === 'mangia' ? 6 : 6 + r() * 8);
    micio.veloce = false;
  }

  function imposta(s: Stato) {
    prima = stato; stato = s;
    if (prima && s.caffe !== prima.caffe) caffeFino = sTempo + 8;
    if (prima && s.giri !== prima.giri) pulisci(s.pulizia);
    if (s.tosaerba && (!prima || !prima.tosaerba)) falcia();
    if (!s.tosaerba && prima?.tosaerba) percorsoTosa = [BASE_TOSA.clone()];
  }

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), cLuce = new THREE.Color();
  const muovi = (o: THREE.Object3D, meta: THREE.Vector3, passo: number) => { const d = tmp.copy(meta).sub(o.position), dist = d.length(); if (dist < passo) { o.position.copy(meta); return true; } o.position.addScaledVector(d.normalize(), passo); o.rotation.y = Math.atan2(d.x, d.z); return false; };

  function aggiornaGatto(s: number, dt: number, st: Stato, caldo: boolean) {
    const g = micio, P = g.pose, qui = stanzaDi(gatto.position.x, gatto.position.z);
    // Il robot o il tosaerba vicini: scappa di corsa, con la coda gonfia, in un posto di un'altra stanza
    const vicinoRobot = percorso.length && robot.position.distanceTo(gatto.position) < 0.6 && gatto.position.y < PAV + 0.05;
    const vicinoTosa = percorsoTosa.length && tosa.position.distanceTo(gatto.position) < 1.0;
    if ((vicinoRobot || vicinoTosa) && g.paura <= 0) { g.paura = 4; vaiA(scegli(st, caldo, qui), true); }
    g.paura -= dt;
    // Mentre riposa: a tempo scaduto si stira, poi va altrove. Da seduto, ogni tanto si lecca una zampa
    if (g.fare !== 'cammina' && g.fare !== 'salta' && s > g.fino) {
      if (g.fare === 'dorme' || g.fare === 'siede') { g.fare = 'stira'; g.fino = s + 2.4; }
      else vaiA(scegli(st, caldo));
    }
    if (g.fare === 'siede' && r() < dt * 0.09) { g.fare = 'lecca'; g.fino = s + 3 + r() * 2; }
    if (g.fare === 'lecca' && s > g.fino - 0.02) { g.fare = 'siede'; g.fino = s + 3 + r() * 4; }
    if (g.fare !== 'cammina' && r() < dt * 0.15) g.sguardo = (r() - 0.5) * 1.4;
    if (r() < dt * 0.5) g.orecchio = 1;
    g.orecchio = Math.max(0, g.orecchio - dt * 4);

    if (g.salto) {
      // Il salto: si accuccia un attimo, poi un arco morbido sopra o giù da un mobile
      g.salto.t = Math.min(1, g.salto.t + dt * 1.6);
      const t = g.salto.t, volo = THREE.MathUtils.clamp((t - 0.3) / 0.7, 0, 1), e = volo * volo * (3 - 2 * volo);
      gatto.position.lerpVectors(g.salto.da, g.salto.a, e); gatto.position.y += Math.sin(volo * Math.PI) * 0.18;
      g.verso = morbido(g.verso, Math.atan2(g.salto.a.x - g.salto.da.x, g.salto.a.z - g.salto.da.z), dt * 8);
      g.vel = 0;
      if (t >= 1) { g.salto = null; g.fare = g.via.length ? 'cammina' : 'siede'; if (!g.via.length) arriva(s); }
    } else if (g.fare === 'cammina') {
      const meta = g.via[0];
      if (!meta) arriva(s);
      else {
        // Velocità e virate cambiano piano, come nei cervi: rallenta arrivando, gira prima di partire se la meta è dietro
        const dx = meta.x - gatto.position.x, dz = meta.z - gatto.position.z, d = Math.hypot(dx, dz), ultimo = g.via.length === 1;
        const sopra = ultimo && g.posto.y > quota(g.posto.stanza) + 0.05;
        const diff = angolo(Math.atan2(dx, dz) - g.verso), max = g.veloce ? 0.95 : 0.3;
        const voluta = Math.abs(diff) > 1.4 ? 0.04 : ultimo ? Math.min(max, 0.05 + d * 0.9) : max;
        g.vel = morbido(g.vel, voluta, dt * (g.veloce ? 4 : 1.8));
        g.giro = morbido(g.giro, THREE.MathUtils.clamp(diff * 2.4, -2.6, 2.6), dt * 4);
        g.verso += g.giro * dt;
        gatto.position.x += Math.sin(g.verso) * g.vel * dt; gatto.position.z += Math.cos(g.verso) * g.vel * dt;
        g.passo += (g.vel * dt) / (g.veloce ? 0.2 : 0.15);
        if (sopra && d < 0.32) { g.salto = { da: gatto.position.clone(), a: new THREE.Vector3(meta.x, g.posto.y, meta.z), t: 0 }; g.via.shift(); g.fare = 'salta'; }
        else if (d < (ultimo ? 0.04 : 0.14)) { g.via.shift(); if (!g.via.length) { g.vel = 0; arriva(s); } }
        // Sul gradino della porta di casa l'altezza cambia: il gatto la segue
        gatto.position.y = morbido(gatto.position.y, quota(stanzaDi(gatto.position.x, gatto.position.z)), dt * 10);
      }
    }
    if (g.fare !== 'cammina' && g.fare !== 'salta') { g.verso += angolo(g.posto.verso - g.verso) * Math.min(1, dt * 1.2); g.giro = morbido(g.giro, 0, dt * 3); g.vel = morbido(g.vel, 0, dt * 6); }
    gatto.rotation.y = g.verso;

    // La posa: ogni parte va piano verso la posa dell'azione
    const voglio = { sedere: 0, sdraio: 0, testaGiu: 0, stira: 0, lecca: 0 };
    if (g.fare === 'siede' || g.fare === 'lecca') voglio.sedere = 1;
    if (g.fare === 'lecca') voglio.lecca = 1;
    if (g.fare === 'dorme') voglio.sdraio = 1;
    if (g.fare === 'mangia') voglio.testaGiu = 1;
    if (g.fare === 'stira') voglio.stira = 1;
    const kp = Math.min(1, dt * 2.6);
    for (const c of Object.keys(P) as (keyof typeof P)[]) P[c] += (voglio[c] - P[c]) * kp;
    const amp = THREE.MathUtils.clamp(g.vel / 0.25, 0, 1.4), giro2 = Math.PI * 2 * g.passo;
    const accuccia = g.salto ? Math.max(0, 1 - Math.abs(g.salto.t - 0.25) / 0.25) : 0;
    // Il corpo: sale e scende due volte per passo; seduto alza il petto; sdraiato tocca terra e respira
    corpo.position.y = ALTO - 0.112 * P.sdraio - 0.04 * P.sedere - 0.045 * accuccia + Math.sin(giro2 * 2) * 0.005 * amp;
    corpo.rotation.x = -0.5 * P.sedere + 0.3 * P.stira;
    corpo.rotation.z = Math.sin(giro2 + 0.6) * 0.035 * amp;
    ventre.scale.y = 0.042 * (1 + P.sdraio * 0.06 * Math.sin(s * 1.6));
    // La schiena si piega: nelle curve petto e fianchi vanno in versi opposti; camminando i fianchi ondeggiano;
    // dormendo il gatto si acciambella
    const curva = THREE.MathUtils.clamp(g.giro * 0.22, -0.4, 0.4);
    const ondeggia = Math.sin(giro2) * amp * (1 - P.sdraio);
    petto.rotation.y = curva - ondeggia * 0.07 + 0.6 * P.sdraio;
    fianchi.rotation.y = -curva * 0.9 + ondeggia * 0.13 - 0.6 * P.sdraio;
    petto.rotation.z = -ondeggia * 0.05; fianchi.rotation.z = ondeggia * 0.06;
    // Le zampe: l'anca va avanti e indietro, il ginocchio si piega solo nella fase di volo. Sedute, quelle dietro sono
    // raccolte; sdraiate, tutte piegate sotto il corpo; stirandosi, quelle davanti vanno avanti
    zampe.forEach((z, i) => {
      const fase = Math.PI * 2 * (g.passo + z.fase), volo = Math.max(0, Math.cos(fase)) ** 1.5 * amp;
      let anca = -Math.sin(fase) * 0.45 * amp, ginocchio = (z.davanti ? 1 : -1) * volo * 0.8;
      if (z.davanti) { anca += -0.95 * P.stira + 0.5 * P.sedere - 1.3 * P.sdraio; ginocchio += 1.9 * P.sdraio; }
      else { anca += -1.15 * P.sedere - 1.3 * P.sdraio + 0.35 * P.stira; ginocchio += -2.1 * P.sedere * (1 - P.sdraio) - 2.0 * P.sdraio; }
      if (i === 1) { anca -= P.lecca * (1.25 + Math.sin(s * 8) * 0.12); ginocchio += P.lecca * 1.5; }
      z.anca.rotation.x = anca; z.ginocchio.rotation.x = ginocchio;
      z.anca.position.y = corpo.position.y + (z.davanti ? 1 : -1) * Math.sin(corpo.rotation.x) * 0.1;
    });
    // Collo e testa: un piccolo cenno a ogni passo; si guarda intorno da fermo; giù per mangiare; appoggiata dormendo;
    // piegata sulla zampa mentre si lecca
    collo.rotation.x = morbido(collo.rotation.x, Math.sin(giro2 * 2 + 0.4) * 0.06 * amp + 0.95 * P.testaGiu + 0.5 * P.sedere * (1 - P.lecca) + 0.55 * P.sdraio + 0.7 * P.lecca, dt * 3);
    collo.rotation.y = morbido(collo.rotation.y, curva * 1.3 + ondeggia * 0.08 + 0.5 * P.sdraio, dt * 3);
    testa.rotation.y = morbido(testa.rotation.y, (g.fare === 'cammina' ? 0 : g.sguardo) * (1 - P.sdraio) * (1 - P.lecca) + P.lecca * 0.4, dt * 2.2);
    testa.rotation.x = morbido(testa.rotation.x, P.lecca * (0.4 + Math.sin(s * 8) * 0.15) - 0.3 * P.sedere * (1 - P.lecca), dt * 4);
    orecchie.forEach((o, n) => { o.rotation.x = (n === (Math.floor(s) % 2) ? 0.6 : 0) * g.orecchio; });
    occhi.opacity = (1 - P.sdraio) * 0.85;
    // La coda: un'onda che scorre dalla base alla punta. Camminando sta alta col ricciolo in cima; ferma scende dietro;
    // seduta o sdraiata si avvolge intorno al corpo; quando ha paura è gonfia e dritta
    const avvolta = Math.max(P.sedere, P.sdraio), ferma = (1 - Math.min(1, amp * 2)) * (1 - avvolta), alta = Math.min(1, amp * 2) * (1 - avvolta);
    coda.forEach((c, i) => {
      const t = i / coda.length, onda = Math.sin(s * (g.paura > 0 ? 7 : 1.7) + giro2 * 0.5 - i * 0.42);
      c.rotation.x = i === 0 ? -0.8 * alta - 2.3 * avvolta - 1.7 * ferma - (g.paura > 0 ? 0.5 : 0) : (alta * (t > 0.65 ? 0.34 : 0.02) + ferma * 0.13 + avvolta * 0.05) * kc;
      c.rotation.z = ((i === 0 ? 0 : avvolta * (0.33 + P.sdraio * 0.06)) + onda * (0.07 + t * 0.2) * (1 - P.sdraio * 0.7)) * (i ? kc : 1);
      c.scale.setScalar(g.paura > 0 ? 1.45 : 1);
    });
  }

  function aggiorna(s: number, dt: number, pp: Palco) {
    sTempo = s;
    // Sempre giorno: niente ciclo giorno e notte. Le luci accese brillano come in un tardo pomeriggio
    const notte = 0.3;

    const st = stato;
    if (!st) return;
    oggetti.forEach(o => { o.attivo = 0; o.colore = null; });
    // Luci: ogni stanza va piano verso la sua luce e il suo colore; la lampada prende quel colore. Una stanza spenta è più scura
    let i = 0;
    for (const k of STANZE) {
      const l = luci.get(k)!, voluta = st.stanze[k], lp = lampade.get(k)!;
      l.v += (voluta.luce - l.v) * Math.min(1, dt * 4); l.c.lerp(cLuce.set(voluta.colore), Math.min(1, dt * 4));
      tapp.set(k, tapp.get(k)! + (voluta.tapparelle - tapp.get(k)!) * Math.min(1, dt * 2.5));
      for (const o of lp.ogg) { o.attivo = l.v; o.colore = l.v > 0.05 ? l.c : null; }
      for (const q of lp.punti) {
        alone.pos.set([q.x, q.y, q.z], i * 3); alone.col.set([l.c.r, l.c.g, l.c.b], i * 3);
        alone.dim[i] = (k === 'giardino' ? 0.8 : 1.2) * (0.4 + l.v); alone.alfa[i] = l.v * (0.25 + 0.55 * notte) * (chiaro ? 0.85 : 1); i++;
      }
      const pm = pozze.get(k)!; pm.color.copy(l.c); pm.opacity = l.v * (0.12 + 0.5 * notte) * (k === 'giardino' ? 0.6 : 1) * (chiaro ? 0.8 : 1);
      matPav.get(k)?.color.setScalar(0.76 + 0.24 * Math.min(1, l.v * 1.6));
      const b = bordi.get(k); if (b) b.opacity += ((k === dove && tetto > 0.4 ? 0.9 : 0) - b.opacity) * Math.min(1, dt * 5);
    }
    // TV: un fondo che cambia colore e sfarfalla, con la sua luce davanti
    tv.attivo = st.tv ? 1 : 0;
    if (st.tv) { schermo.color.setHSL((s * 0.05) % 1, 0.5, 0.6 + 0.08 * Math.sin(s * 9)); schermo.opacity = 0.95; } else schermo.opacity = 0;
    alone.pos.set([-1.5, PAV + 0.55, -0.1], i * 3); alone.col.set([schermo.color.r, schermo.color.g, schermo.color.b], i * 3); alone.dim[i] = 1.5; alone.alfa[i] = st.tv ? 0.22 + 0.4 * notte : 0; i++;
    // Stufa: la temperatura vera segue piano quella voluta; la fiamma è viva mentre scalda
    gradi += Math.sign(st.termostato - gradi) * Math.min(Math.abs(st.termostato - gradi), dt * 0.35);
    const scalda = st.termostato - gradi > 0.05, forza = THREE.MathUtils.clamp((st.termostato - 15) / 11, 0.1, 1);
    fiamma.opacity = scalda ? (0.65 + 0.3 * Math.sin(s * 11) * Math.sin(s * 7)) * forza : 0.15 * forza;
    stufa.attivo = scalda ? 0.8 : 0.1 * forza;
    alone.pos.set([-2.7, PAV + 0.25, 0.15], i * 3); alone.col.set([C.arancio.r, C.arancio.g, C.arancio.b], i * 3); alone.dim[i] = 0.8 + forza * (scalda ? 0.8 : 0.2); alone.alfa[i] = fiamma.opacity * (0.4 + 0.4 * notte);
    alone.aggiorna();
    // Finestre: la tapparella scende; il vetro prende la luce della stanza, così si vede anche da fuori con il tetto chiuso
    for (const f of finestre) {
      const t = tapp.get(f.stanza)!, l = luci.get(f.stanza)!;
      f.tapparella.scale.y = Math.max(0.05, 1 - t);
      f.ogg.attivo = 1 - t > 0.1 ? 0.25 : 0;
      f.vetro.color.set('#5f7f9a').lerp(l.c, Math.min(1, l.v * 1.5));
    }
    M_TETTO.vetro.color.set('#5f7f9a').lerp(luci.get('soggiorno')!.c, Math.min(1, luci.get('soggiorno')!.v * 1.5) * 0.9);
    // Ventilatore, caffè e timer
    angoloPale += dt * st.ventola * 22; pale.rotation.z = angoloPale; ventola.attivo = st.ventola;
    const fa = s < caffeFino, adesso = performance.now() / 1000, resta = st.timer ? st.timerFine - adesso : 0;
    caffe.attivo = fa ? 1 : 0; tazza.visible = st.caffe > 0;
    timer.attivo = st.timer && resta > -8 ? (resta > 0 ? 0.7 : 0.6 + 0.4 * Math.sin(s * 12)) : 0;
    lancetta.rotation.y = st.timer && resta > 0 ? (resta / (st.timer * 60)) * Math.PI * 2 : 0;
    // Musica: note che salgono da ogni cassa accesa, tante quanto il volume; ogni canzone ha il suo colore
    const suona = !st.muto ? st.musica.filter(k => CASSE.includes(k)) : [];
    casse.forEach((c, k) => { c.ogg.attivo = suona.includes(k) ? 0.5 + 0.5 * st.volume : 0; });
    for (let j = 0; j < VAP + NOTE; j++) {
      const vapore = j < VAP;
      vita[j] = (vita[j]! + dt * (vapore ? 0.55 : 0.4)) % 1;
      const v = vita[j]!;
      if (vapore) {
        part.pos.set([2.8 + Math.sin(v * 9 + j) * 0.04 * v, PAV + 0.78 + v * 0.5, 1.15 + Math.cos(v * 7 + j) * 0.04 * v], j * 3);
        part.col.set([1, 1, 1], j * 3); part.dim[j] = 0.1 + v * 0.22; part.alfa[j] = fa ? (1 - v) * 0.6 : 0;
        continue;
      }
      const n = j - VAP, dov = suona[n % Math.max(1, suona.length)], b = dov ? casse.get(dov)!.bocca : null;
      const c = [C.arancio, C.azzurro, C.verde][(n + st.brano) % 3]!;
      if (b) part.pos.set([b.x + Math.sin(v * 9 + n) * 0.25 * v, b.y + v * 0.9, b.z + Math.cos(v * 7 + n) * 0.2 * v], j * 3);
      part.col.set([c.r, c.g, c.b], j * 3); part.dim[j] = 0.09;
      part.alfa[j] = b && n / NOTE < st.volume + 0.15 ? (1 - v) * 0.95 : 0;
    }
    part.aggiorna();

    // Robot: segue il percorso e gira dove va
    robotO.attivo = percorso.length ? 0.6 + 0.4 * Math.sin(s * 8) : 0;
    if (percorso.length) { if (muovi(robot, percorso[0]!, dt * 0.9)) percorso.shift(); stanzaRobot = stanzaDi(robot.position.x, robot.position.z); }
    // Tosaerba: va avanti e indietro sul prato, accorcia i ciuffi dove passa, poi torna alla casetta. L'erba ricresce piano
    tosaO.attivo = percorsoTosa.length ? 0.6 + 0.4 * Math.sin(s * 8) : 0;
    if (percorsoTosa.length) { if (muovi(tosa, percorsoTosa[0]!, dt * 0.7)) { percorsoTosa.shift(); if (!percorsoTosa.length && st.tosaerba) pausaTosa = s + 2; } }
    else {
      if (st.tosaerba && s > pausaTosa) { if (tosa.position.distanceTo(BASE_TOSA) < 0.05) falcia(); else percorsoTosa = [BASE_TOSA.clone()]; }
      if (!st.tosaerba && tosa.position.distanceTo(BASE_TOSA) > 0.05) percorsoTosa = [BASE_TOSA.clone()];
    }
    for (const c of ciuffi) {
      if (st.tosaerba && Math.hypot(c.x - tosa.position.x, c.z - tosa.position.z) < 0.25) c.ora = Math.min(c.ora, 0.035);
      else c.ora = Math.min(c.h, c.ora + dt * 0.004);
    }
    disegnaErba();

    // Il nome sotto il mouse. Con il tetto chiuso le cose di casa non si leggono
    const prese = oggetti.filter(o => !o.dentro || tetto > 0.5).map(o => o.presa);
    const colpo = pp.raggio ? pp.raggio.intersectObjects(prese, false)[0] : undefined;
    const sotto = colpo ? oggetti.find(x => x.presa === colpo.object)! : null;

    // Gli oggetti accesi brillano del loro colore (le lampade di quello della luce). All'accensione fanno un saltino
    for (const o of oggetti) {
      if (o.attivo > 0.2 && o.prima <= 0.05) o.pop = 1;
      o.prima = o.attivo;
      o.pop = Math.max(0, o.pop - dt * 1.7);
      const q = Math.sin(o.pop * Math.PI * 3) * o.pop * 0.28;
      o.g.scale.set(1 - q * 0.6, 1 + q, 1 - q * 0.6);
      for (const m of o.mats) { m.emissive.copy(o.colore ?? (m.userData.base as THREE.Color)); m.emissiveIntensity = o.attivo * 0.55; }
      (o.bordo.uniforms.colore!.value as THREE.Color).copy(o.colore ?? C.arancio);
      o.bordo.uniforms.spess!.value = o === sotto ? 0.024 : 0.012;
    }

    aggiornaGatto(s, dt, st, scalda || gradi > 21.5);

    // Vista sulla cosa comandata: come «follow the dog», la mira scivola verso la cosa e la camera si avvicina.
    // Le viste di uno stesso comando passano una alla volta; finita l'ultima, la vista torna larga
    const t0 = ora();
    if (attuale && t0 > attualeFino) attuale = null;
    if (!attuale && coda2Fuochi.length) {
      attuale = coda2Fuochi.shift()!;
      attualeFino = t0 + (coda2Fuochi.length ? Math.min(attuale.durata, 3.4) : attuale.durata);
      vicino = false;
    }
    // Prima si alza il tetto, poi la vista si avvicina: così si capisce che cosa succede
    if (attuale && !vicino && (!attuale.aperto || tetto > 0.6 || pp.ridotto)) vicino = true;
    const zoomOra = attuale && vicino ? attuale.zoom : scrive && (tetto > 0.6 || pp.ridotto) ? ZOOM_CASA : 1;
    if (zoomOra !== zoomScelto) { zoomScelto = zoomOra; p.zoom(zoomOra); }
    if (attuale && vicino) attuale.punto(tmp2); else if (scrive) tmp2.copy(MIRA_CASA); else tmp2.copy(MIRA0);
    const km = pp.ridotto ? 1 : Math.min(1, dt * 1.5);
    MIRA.x += (tmp2.x - MIRA.x) * km; MIRA.y += (tmp2.y - MIRA.y) * km; MIRA.z += (tmp2.z - MIRA.z) * km;
    tastoLargo.style.opacity = attuale ? '1' : '0'; tastoLargo.style.pointerEvents = attuale ? 'auto' : 'none';

    // Il tetto. Si alza per la vista su una cosa in casa, col mouse sulla casa, o finché il robot pulisce
    if (pp.raggio && pp.raggio.intersectObject(sagoma, false).length) topoFino = t0 + 0.6;
    const aperto = (attuale ? attuale.aperto : scrive) || t0 < topoFino || percorso.length > 0;
    if (pp.ridotto) tetto = aperto ? 1 : 0;
    else {
      velTetto += ((aperto ? 1 : 0) - tetto) * 13 * dt - velTetto * 4.8 * dt;
      tetto += velTetto * dt;
      if (tetto < 0) { if (velTetto < -0.5) { schiaccia = 1; polvere.forEach(q => { q.v = 0; }); } tetto = 0; velTetto = -velTetto * 0.28; }
    }
    schiaccia = Math.max(0, schiaccia - dt * 3);
    const su = Math.max(0, tetto);
    // Il coperchio prima sale, poi scivola indietro, dalla parte opposta alla camera
    fiancoTetto.set(-pp.camera.position.x + MIRA.x, 0, -pp.camera.position.z + MIRA.z).normalize();
    const via = liscio(su, 0.15, 1) * 5.5;
    tettoG.position.set(fiancoTetto.x * via, PAV + MURO - 0.02 + su * 0.8 + liscio(su, 0.25, 1) * 1.2, fiancoTetto.z * via);
    tettoG.rotation.z = Math.sin(Math.min(1, su) * Math.PI) * 0.09;
    tettoG.scale.set(1 + schiaccia * 0.035, 1 - Math.sin(schiaccia * Math.PI) * 0.1, 1 + schiaccia * 0.035);
    guscio.scale.y = 1 - 0.62 * liscio(su, 0.05, 0.75);
    // Da vicino il tetto non deve coprire: sfuma mentre sale, e resta visibile solo nella vista larga
    const voluta = attuale && vicino && attuale.zoom < 0.8 ? 1 - liscio(su, 0.25, 0.75) : scrive ? 1 - liscio(su, 0.45, 1) * 0.7 : 1 - liscio(su, 0.7, 1) * 0.12;
    sfumaTetto += (voluta - sfumaTetto) * (pp.ridotto ? 1 : Math.min(1, dt * 7));
    for (const m of Object.values(M_TETTO)) m.opacity = sfumaTetto;
    tettoG.visible = sfumaTetto > 0.01;

    // Il fumo del camino, quando la stufa scalda; la polvere quando il tetto si posa
    tmp2.copy(CAMINO).applyMatrix4(tettoG.matrixWorld.compose(tettoG.position, tettoG.quaternion, tettoG.scale));
    for (let j = 0; j < FUMO; j++) {
      vitaFumo[j] = (vitaFumo[j]! + dt * 0.28) % 1;
      const v = vitaFumo[j]!;
      fumo.pos.set([tmp2.x + Math.sin(v * 6 + j) * 0.12 * v + v * 0.35, tmp2.y + v * 1.5, tmp2.z + Math.cos(v * 5 + j) * 0.1 * v], j * 3);
      fumo.col.set([1, 1, 1], j * 3); fumo.dim[j] = 0.16 + v * 0.34; fumo.alfa[j] = (scalda ? (1 - v) * 0.6 : 0) * sfumaTetto;
    }
    polvere.forEach((q, j) => {
      q.v = Math.min(1, q.v + dt * 1.3);
      const d = 1 + q.v * 0.5;
      fumo.pos.set([Math.cos(q.a) * 3.7 * d, PAV + MURO * 0.9 + q.v * 0.25, -0.6 + Math.sin(q.a) * 3.5 * d], (FUMO + j) * 3);
      fumo.col.set([1, 0.97, 0.9], (FUMO + j) * 3); fumo.dim[FUMO + j] = 0.3 + q.v * 0.45; fumo.alfa[FUMO + j] = (1 - q.v) * 0.75;
    });
    fumo.aggiorna();

    // Il mare, le nuvole, la papera, le farfalle, la barca, gli alberi al vento
    ondeMare(s);
    for (const n of nuvole) {
      n.g.position.addScaledVector(VENTO, dt * n.vel);
      const lontano = Math.hypot(n.g.position.x, n.g.position.z - CZ);
      if (lontano > RAGGIO_CIELO && n.g.position.x * VENTO.x + (n.g.position.z - CZ) * VENTO.z > 0) {
        const a = Math.atan2(n.g.position.z - CZ, n.g.position.x) + Math.PI + (r() - 0.5) * 1.2;
        n.g.position.set(Math.cos(a) * RAGGIO_CIELO * 0.98, 4.6 + r() * 1.4, CZ + Math.sin(a) * RAGGIO_CIELO * 0.98); n.vista = 0;
      }
      n.vista = Math.min(1, n.vista + dt / 4);
      const vis = liscio(n.vista, 0, 1) * (1 - liscio(lontano, RAGGIO_CIELO * 0.8, RAGGIO_CIELO)) * ((attuale && vicino) || scrive ? 0.25 : 1);
      n.m.opacity = 0.05 * vis; n.fili0.opacity = 0.22 * vis;
    }
    { const a = s * 0.22; papera.position.set(STAGNO.x + Math.cos(a) * 0.6, 0.02 + Math.sin(s * 2.2) * 0.006, STAGNO.z + Math.sin(a) * 0.42); papera.rotation.y = Math.atan2(-Math.sin(a) * 0.6, Math.cos(a) * 0.42); }
    for (const f of farfalle) {
      const t = s * 0.35 + f.fase;
      f.g.position.set(f.cx + Math.sin(t) * 1.1, 0.4 + Math.sin(t * 2.3) * 0.14, f.cz + Math.sin(t * 1.7) * 0.8);
      f.g.rotation.y = Math.atan2(Math.cos(t), Math.cos(t * 1.7) * 1.3);
      f.ali.forEach(({ a, v }) => { a.rotation.z = v * (0.25 + Math.sin(s * 16 + f.fase) * 0.75); });
    }
    barca.position.y = -0.3 + Math.sin(s * 0.9) * 0.025; barca.rotation.z = Math.sin(s * 0.7) * 0.05;
    for (const c of chiome) { c.g.rotation.x = Math.sin(s * 0.8 + c.fase) * 0.012; c.g.rotation.z = Math.sin(s * 0.6 + c.fase * 2) * 0.012; }

    // Etichette. Un'etichetta fuori dall'inquadratura si nasconde. I nomi delle stanze appaiono solo a tetto alzato
    const w = el.clientWidth, h = el.clientHeight, dentro = tetto > 0.5;
    const metti = (e: HTMLElement, x: number, y: number, z: number) => {
      const q = casa.localToWorld(tmp.set(x, y, z)).project(pp.camera), inVista = q.z < 1 && Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.95;
      e.style.transform = `translate(${((q.x + 1) / 2) * w}px, ${((1 - q.y) / 2) * h}px) translate(-50%, -100%)`; e.style.visibility = inVista ? '' : 'hidden';
      return inVista;
    };
    const fuocoS = attuale && (STANZE as readonly string[]).includes(attuale.chiave) ? attuale.chiave as Stanza : null;
    for (const s2 of STANZE) {
      const e = nomiEl.get(s2)!, cc = centro(s2);
      const visibile = metti(e, cc.x, s2 === 'giardino' ? 0.5 : PAV + MURO * 0.38 + 0.25, s2 === 'giardino' ? cc.z + 0.6 : cc.z);
      e.style.opacity = visibile && (s2 === 'giardino' ? fuocoS === 'giardino' : dentro && (!attuale || attuale.zoom >= 0.8 || fuocoS === s2)) ? '1' : '0';
      e.classList.toggle('qui', s2 === dove);
    }
    metti(gradiEl, -2.7, PAV + 1.15, -0.15);
    gradiEl.textContent = `${gradi.toFixed(1)}°${Math.abs(st.termostato - gradi) > 0.05 ? ` → ${st.termostato}°` : ''}`;
    gradiEl.style.opacity = dentro ? '1' : '0';
    metti(timerEl, 2.8, PAV + 0.86, 0.65);
    timerEl.textContent = st.timer ? (resta > 0 ? `${Math.floor(resta / 60)}:${String(Math.floor(resta % 60)).padStart(2, '0')}` : resta > -8 ? 'ding!' : '') : '';
    timerEl.style.opacity = dentro && timerEl.textContent ? '1' : '0';
    metti(zzz, gatto.position.x, gatto.position.y + 0.42, gatto.position.z);
    const gattoFuori = stanzaDi(gatto.position.x, gatto.position.z) === 'giardino';
    zzz.style.opacity = micio.fare === 'dorme' && micio.pose.sdraio > 0.8 && (gattoFuori || dentro) ? String(0.5 + 0.4 * Math.sin(s * 1.7)) : '0';
    if (sotto) { sopraEl.textContent = sotto.nome[0]; sotto.presa.getWorldPosition(tmp2); casa.worldToLocal(tmp2); metti(sopraEl, tmp2.x, tmp2.y + 0.34, tmp2.z); sopraEl.style.opacity = '1'; }
    else sopraEl.style.opacity = '0';
  }

  function clic(raggio: THREE.Raycaster) {
    const colpo = raggio.intersectObjects([...pavimenti.keys()], false)[0];
    if (!colpo) { azzera(); return; }
    // I pavimenti delle stanze stanno sopra il prato: vince la stanza. Il tetto non ferma il clic
    const stanza = raggio.intersectObjects([...pavimenti.keys()].filter(o => pavimenti.get(o) !== 'giardino'), false)[0];
    alClic(pavimenti.get((stanza ?? colpo).object)!);
  }
  return {
    imposta,
    fuoco: (s, durata = 6) => { azzera(); accoda(suStanza(s, durata)); },
    comando,
    azzera,
    dove: s => { dove = s; },
    scrive: v => { scrive = v; },
  };
}
