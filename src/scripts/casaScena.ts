import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { casuale, pieno, puntiMorbidi, palco, SITO, tema, tono, type Palco } from './natura';
import { CASSE, DENTRO, NOMI, STANZE, type Stanza, type Stato } from '../lib/casa';

// La casa di /learn/decision/: una casetta su un'isola d'erba, appoggiata sulla pagina come un diorama. Niente tetto e muri bassi,
// così si vede dentro. Ogni oggetto risponde a un intento del decision model: le lampade e le lanterne, le tapparelle, la stufa
// del termostato, il ventilatore, le casse, la TV, il robot aspirapolvere, il tosaerba che taglia davvero l'erba, la macchina del
// caffè e il timer. Di notte tutto si scurisce, e le stanze con la luce accesa restano calde. La scena mostra soltanto lo stato
// della casa (src/lib/casa.ts): quello che succede lo decide il modello.

const PAV = 0.14, MURO = 0.7, SP = 0.14;
type Box = { x0: number; x1: number; z0: number; z1: number };
export const PIANTA: Record<Exclude<Stanza, 'giardino'>, Box> = {
  soggiorno: { x0: -3.1, x1: 0.3, z0: -0.6, z1: 2.3 },
  cucina: { x0: 0.3, x1: 3.1, z0: -0.6, z1: 2.3 },
  camera: { x0: -3.1, x1: 0.3, z0: -3.5, z1: -0.6 },
  bagno: { x0: 0.3, x1: 3.1, z0: -3.5, z1: -0.6 },
};
const centro = (s: Stanza) => { if (s === 'giardino') return new THREE.Vector3(2.4, 0, 3.9); const b = PIANTA[s]; return new THREE.Vector3((b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2); };
// Porte fra le stanze: il robot passa da qui
const PORTE: [Stanza, Stanza, number, number][] = [['soggiorno', 'cucina', 0.3, 1.15], ['soggiorno', 'camera', -0.25, -0.6], ['cucina', 'bagno', 0.9, -0.6], ['camera', 'bagno', 0.3, -1.3]];
// Dove sta l'omino in ogni stanza
const POSTO: Record<Stanza, [number, number]> = { soggiorno: [-1.0, 0.55], cucina: [1.05, 1.75], camera: [-0.6, -1.35], bagno: [1.6, -1.5], giardino: [0.9, 3.3] };
const BASE_ROBOT = new THREE.Vector3(-0.75, PAV + 0.03, 2.0);

export type Vista = { imposta: (s: Stato) => void; fuoco: (s: Stanza | null, durata?: number) => void; dove: (s: Stanza) => void; ora: { valore: number; corre: boolean } };

export function montaCasa(el: HTMLElement, etichette: HTMLElement, alClic: (s: Stanza) => void): Vista {
  const r = casuale(21), chiaro = tema();
  const p = palco(el, {
    camera: new THREE.Vector3(0, 10.2, 13.3), mira: new THREE.Vector3(0, -0.5, 0.9), fov: 34, giro: 0.01, inclina: [-0.28, 0.2], zoom: [0.55, 1.3], nebbia: [1.6, 3],
    aggiorna, clic, scena: 'casa', toni: SITO,
  });
  const casa = new THREE.Group();
  p.gruppo.add(casa);
  const C = p.colori;

  // --- Colori: i toni del sito, più chiari o più scuri; i neutri nascono dal fondo e dal testo della pagina
  const neutro = (k: number) => C.bg.clone().lerp(C.fg, k);
  // Toni pastello: meno saturi del colore pieno delle sezioni
  const pastello = (c: string, l = 0) => tono(c).offsetHSL(0, -0.28, (chiaro ? 0.06 : 0.02) + l);
  const COL = {
    erba: pastello('#7cc26a', -0.04), erbaScura: pastello('#4f9a4a', -0.06), terra: tono('#a9744a').offsetHSL(0, -0.4, chiaro ? -0.1 : -0.08), legno: pastello('#d29a5e', 0.04), legnoScuro: pastello('#a06a3a', -0.06),
    tessuto: pastello('#7aa6d6'), tessutoChiaro: pastello('#a9cbe8', 0.06), foglie: pastello('#6fbf5f'), arancio: pastello('#ff9a5a'), crema: neutro(chiaro ? 0.08 : 0.72), muro: neutro(chiaro ? 0.04 : 0.55),
    pietra: neutro(chiaro ? 0.22 : 0.3), metallo: neutro(chiaro ? 0.35 : 0.55), scuro: neutro(chiaro ? 0.7 : 0.16),
  };

  // --- Solidi. Ogni solido appartiene a una stanza (o al giardino): di notte si scurisce, e la luce della sua stanza lo scalda
  type Solido = { m: THREE.MeshBasicMaterial; l: THREE.LineBasicMaterial | null; base: THREE.Color; stanza: Stanza | null };
  const solidi: Solido[] = [];
  const pavimenti = new Map<THREE.Object3D, Stanza>();
  function solido(geo: THREE.BufferGeometry, colore: THREE.Color, x: number, y: number, z: number, stanza: Stanza | null, g: THREE.Object3D = casa, fili = 0.22) {
    const o = pieno(geo, colore, fili, 40, chiaro ? 0.62 : 0.5, chiaro ? 0.42 : 0.55);
    o.position.set(x, y, z);
    const l = (o.children[0] as THREE.LineSegments | undefined)?.material as THREE.LineBasicMaterial | undefined;
    solidi.push({ m: o.material as THREE.MeshBasicMaterial, l: l ?? null, base: l ? l.color.clone() : new THREE.Color(), stanza });
    g.add(o);
    return o;
  }
  const tondo = (w: number, h: number, d: number, raggio = 0.06) => new RoundedBoxGeometry(w, h, d, 3, Math.min(raggio, w / 2.01, h / 2.01, d / 2.01));
  // Un blocco arrotondato appoggiato su y0
  const blocco = (w: number, h: number, d: number, x: number, y0: number, z: number, c: THREE.Color, s: Stanza | null, raggio = 0.06, g: THREE.Object3D = casa) => solido(tondo(w, h, d, raggio), c, x, y0 + h / 2, z, s, g);
  const cilindro = (ra: number, rb: number, h: number, x: number, y0: number, z: number, c: THREE.Color, s: Stanza | null, lati = 20, g: THREE.Object3D = casa) => solido(new THREE.CylinderGeometry(ra, rb, h, lati), c, x, y0 + h / 2, z, s, g);
  const palla = (ra: number, x: number, y: number, z: number, c: THREE.Color, s: Stanza | null, g: THREE.Object3D = casa) => solido(new THREE.SphereGeometry(ra, 16, 12), c, x, y, z, s, g, 0.12);
  // Un materiale che brilla da solo: paralumi, schermo, vetri, fiamma. Non si scurisce di notte
  const luminoso = (c: THREE.ColorRepresentation, op = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false });

  // --- L'isola: un disco d'erba con il bordo di terra, come un diorama
  solido(new THREE.CylinderGeometry(5.8, 5.8, 0.16, 72), COL.erba, 0, -0.08, 0.3, 'giardino', casa, 0.18);
  solido(new THREE.CylinderGeometry(5.76, 4.8, 0.9, 72), COL.terra, 0, -0.61, 0.3, 'giardino', casa, 0.12);
  const prato = new THREE.Mesh(new THREE.CircleGeometry(5.8, 48), new THREE.MeshBasicMaterial({ visible: false }));
  prato.rotation.x = -Math.PI / 2; prato.position.set(0, 0.01, 0.3); casa.add(prato); pavimenti.set(prato, 'giardino');

  // --- Pavimenti: uno per stanza, cliccabili. Legno nelle stanze, piastrelle chiare in bagno e in cucina
  blocco(6.4, PAV, 3.1 + 2.9 + 0.14, -0.0, 0, -0.6, COL.pietra, null, 0.05);
  for (const s of DENTRO) {
    const b = PIANTA[s as keyof typeof PIANTA], f = blocco(b.x1 - b.x0 - 0.16, 0.02, b.z1 - b.z0 - 0.16, (b.x0 + b.x1) / 2, PAV, (b.z0 + b.z1) / 2, s === 'bagno' || s === 'cucina' ? COL.crema : COL.legno, s, 0.01);
    pavimenti.set(f, s);
  }

  // --- Muri bassi con le porte e una finestra per stanza. Ogni finestra ha la sua tapparella e il vetro che brilla di notte
  type Finestra = { stanza: Stanza; tapparella: THREE.Object3D; vetro: THREE.MeshBasicMaterial };
  const finestre: Finestra[] = [];
  type Apertura = { c: number; w: number; tipo: 'porta' | 'finestra'; stanza?: Stanza };
  const DAV = 0.26, ARC = 0.62;
  function muro(x0: number, z0: number, x1: number, z1: number, aperture: Apertura[] = []) {
    const lungoX = z0 === z1, a = Math.min(lungoX ? x0 : z0, lungoX ? x1 : z1), b = Math.max(lungoX ? x0 : z0, lungoX ? x1 : z1), fisso = lungoX ? z0 : x0;
    const pezzo = (da: number, al: number, y0: number, y1: number) => {
      if (al - da < 0.02 || y1 - y0 < 0.02) return;
      const c = (da + al) / 2, L = al - da;
      blocco(lungoX ? L : SP, y1 - y0, lungoX ? SP : L, lungoX ? c : fisso, PAV + y0, lungoX ? fisso : c, COL.muro, null, 0.05);
    };
    let t = a;
    for (const ap of [...aperture].sort((u, v) => u.c - v.c)) {
      const da = ap.c - ap.w / 2, al = ap.c + ap.w / 2;
      pezzo(t, da, 0, MURO);
      if (ap.tipo === 'finestra') {
        pezzo(da, al, 0, DAV); pezzo(da, al, ARC, MURO);
        const vetro = luminoso('#ffd9a6', 0);
        const v = new THREE.Mesh(new THREE.PlaneGeometry(ap.w, ARC - DAV), vetro);
        v.position.set(lungoX ? ap.c : fisso, PAV + (DAV + ARC) / 2, lungoX ? fisso : ap.c);
        if (!lungoX) v.rotation.y = Math.PI / 2;
        casa.add(v);
        // La tapparella scende dall'alto: la sua altezza segue lo stato
        const perno = new THREE.Group();
        perno.position.set(lungoX ? ap.c : fisso, PAV + ARC, lungoX ? fisso : ap.c);
        casa.add(perno);
        const doghe = blocco(lungoX ? ap.w - 0.02 : 0.05, ARC - DAV, lungoX ? 0.05 : ap.w - 0.02, 0, -(ARC - DAV), 0, COL.tessutoChiaro, ap.stanza!, 0.02, perno);
        doghe.position.y = -(ARC - DAV) / 2;
        finestre.push({ stanza: ap.stanza!, tapparella: perno, vetro });
      }
      t = al;
    }
    pezzo(t, b, 0, MURO);
  }
  muro(-3.1, -3.5, 3.1, -3.5);
  muro(-3.1, 2.3, 3.1, 2.3, [{ c: -0.1, w: 0.62, tipo: 'porta' }, { c: 1.9, w: 1.0, tipo: 'finestra', stanza: 'cucina' }]);
  muro(-3.1, -3.5, -3.1, 2.3, [{ c: -2.0, w: 0.9, tipo: 'finestra', stanza: 'camera' }, { c: 0.85, w: 1.0, tipo: 'finestra', stanza: 'soggiorno' }]);
  muro(3.1, -3.5, 3.1, 2.3, [{ c: -1.9, w: 0.8, tipo: 'finestra', stanza: 'bagno' }]);
  muro(0.3, -3.5, 0.3, 2.3, [{ c: -1.3, w: 0.6, tipo: 'porta' }, { c: 1.15, w: 0.7, tipo: 'porta' }]);
  muro(-3.1, -0.6, 0.3, -0.6, [{ c: -0.25, w: 0.6, tipo: 'porta' }]);
  muro(0.3, -0.6, 3.1, -0.6, [{ c: 0.9, w: 0.6, tipo: 'porta' }]);

  // --- Luci: una lampada per stanza, tre lanterne in giardino. Il paralume brilla del colore della luce; sul pavimento una pozza di luce
  const lampade = new Map<Stanza, { paralumi: THREE.MeshBasicMaterial[]; punti: THREE.Vector3[] }>(STANZE.map(s => [s, { paralumi: [], punti: [] }]));
  const paralume = (s: Stanza, geo: THREE.BufferGeometry, x: number, y: number, z: number) => {
    const m = luminoso('#ffd9a6', 0.35), o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z); casa.add(o);
    lampade.get(s)!.paralumi.push(m); lampade.get(s)!.punti.push(new THREE.Vector3(x, y, z));
  };
  const pozze = new Map<Stanza, THREE.MeshBasicMaterial>();
  {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv);
    for (const s of STANZE) {
      const m = new THREE.MeshBasicMaterial({ map: tex, color: '#ffd9a6', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const c = s === 'giardino' ? new THREE.Vector3(-0.2, 0, 4.0) : centro(s), d = s === 'giardino' ? 3.6 : 3.2;
      const o = new THREE.Mesh(new THREE.PlaneGeometry(d, d), m);
      o.rotation.x = -Math.PI / 2; o.position.set(c.x, PAV + 0.03, c.z); o.renderOrder = 2;
      casa.add(o); pozze.set(s, m);
    }
  }

  // --- Soggiorno: divano, tappeto, TV, stufa, lampada a stelo, cassa, una pianta
  cilindro(1.05, 1.05, 0.02, -1.5, PAV + 0.02, 0.85, COL.arancio.clone().offsetHSL(0, -0.1, 0.08), 'soggiorno', 32).scale.set(1, 1, 0.72);
  blocco(1.5, 0.22, 0.6, -1.5, PAV + 0.02, 1.85, COL.tessuto, 'soggiorno', 0.1);
  blocco(1.5, 0.34, 0.2, -1.5, PAV + 0.02, 2.07, COL.tessuto, 'soggiorno', 0.09);
  blocco(0.2, 0.3, 0.62, -2.3, PAV + 0.02, 1.85, COL.tessuto, 'soggiorno', 0.09); blocco(0.2, 0.3, 0.62, -0.7, PAV + 0.02, 1.85, COL.tessuto, 'soggiorno', 0.09);
  blocco(0.5, 0.12, 0.34, -1.9, PAV + 0.24, 1.82, COL.tessutoChiaro, 'soggiorno', 0.05); blocco(0.5, 0.12, 0.34, -1.1, PAV + 0.24, 1.82, COL.tessutoChiaro, 'soggiorno', 0.05);
  blocco(1.3, 0.3, 0.38, -1.5, PAV + 0.02, -0.33, COL.legno, 'soggiorno', 0.06);
  blocco(1.0, 0.56, 0.08, -1.5, PAV + 0.32, -0.36, COL.scuro, 'soggiorno', 0.04);
  const schermo = luminoso(C.fg, 0.08);
  { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.46), schermo); o.position.set(-1.5, PAV + 0.6, -0.31); casa.add(o); }
  // La stufa: un cilindro col camino e una finestrella dove si vede la fiamma
  cilindro(0.24, 0.27, 0.5, -2.7, PAV + 0.02, -0.15, COL.scuro, 'soggiorno', 18);
  cilindro(0.06, 0.06, 0.5, -2.7, PAV + 0.52, -0.15, COL.metallo, 'soggiorno', 10);
  const fiamma = luminoso(C.arancio, 0.2);
  { const o = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), fiamma); o.position.set(-2.7, PAV + 0.25, 0.115); casa.add(o); }
  cilindro(0.025, 0.025, 0.85, -2.75, PAV + 0.02, 1.95, COL.metallo, 'soggiorno', 8);
  paralume('soggiorno', new THREE.CylinderGeometry(0.12, 0.2, 0.2, 18, 1, true), -2.75, PAV + 0.92, 1.95);
  const cassa = (s: Stanza, x: number, y: number, z: number) => { blocco(0.2, 0.3, 0.18, x, y, z, COL.legnoScuro, s, 0.05); cilindro(0.06, 0.06, 0.02, x, y + 0.14, z + 0.09, COL.scuro, s, 14).rotation.x = Math.PI / 2; return new THREE.Vector3(x, y + 0.35, z); };
  const bocche = new Map<Stanza, THREE.Vector3>([['soggiorno', cassa('soggiorno', 0.0, PAV + 0.02, -0.3)]]);
  const vaso = (s: Stanza, x: number, z: number, alto = 0.5) => { cilindro(0.13, 0.1, 0.2, x, PAV + 0.02, z, COL.arancio, s, 14); palla(alto * 0.42, x, PAV + 0.22 + alto * 0.35, z, COL.foglie, s); };
  vaso('soggiorno', -2.75, 1.25, 0.55);

  // --- Cucina: piano di lavoro, frigo, macchina del caffè, timer, tavolo tondo con due sgabelli e la lampada a fungo
  blocco(0.56, 0.42, 1.7, 2.78, PAV + 0.02, 0.55, COL.crema, 'cucina', 0.05);
  blocco(0.6, 0.05, 1.74, 2.78, PAV + 0.44, 0.55, COL.legno, 'cucina', 0.02);
  blocco(0.56, 0.95, 0.52, 2.78, PAV + 0.02, -0.28, COL.crema, 'cucina', 0.1);
  blocco(0.24, 0.3, 0.22, 2.8, PAV + 0.49, 1.15, COL.scuro, 'cucina', 0.05);
  const tazza = cilindro(0.04, 0.035, 0.06, 2.65, PAV + 0.49, 1.15, COL.crema, 'cucina', 12);
  cilindro(0.08, 0.08, 0.1, 2.8, PAV + 0.49, 0.65, COL.arancio, 'cucina', 16);
  const lancetta = blocco(0.012, 0.05, 0.012, 0, 0, 0, COL.scuro, 'cucina', 0.004);
  lancetta.position.set(2.8, PAV + 0.62, 0.65);
  bocche.set('cucina', cassa('cucina', 2.8, PAV + 0.49, 0.2));
  cilindro(0.48, 0.48, 0.06, 1.55, PAV + 0.5, 0.85, COL.legno, 'cucina', 28);
  cilindro(0.06, 0.12, 0.5, 1.55, PAV + 0.02, 0.85, COL.legnoScuro, 'cucina', 12);
  cilindro(0.17, 0.17, 0.32, 0.95, PAV + 0.02, 0.85, COL.tessuto, 'cucina', 16); cilindro(0.17, 0.17, 0.32, 2.15, PAV + 0.02, 0.85, COL.tessuto, 'cucina', 16);
  cilindro(0.02, 0.03, 0.16, 1.55, PAV + 0.56, 0.85, COL.crema, 'cucina', 8);
  paralume('cucina', new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 1.55, PAV + 0.7, 0.85);
  vaso('cucina', 0.65, 2.0, 0.4);

  // --- Camera: letto con cuscino e coperta, comodino con l'abat-jour, armadio, ventilatore, cassa, tappeto
  cilindro(0.75, 0.75, 0.02, -1.4, PAV + 0.02, -1.55, COL.tessutoChiaro, 'camera', 28).scale.set(1, 1, 0.6);
  blocco(1.3, 0.24, 1.85, -1.45, PAV + 0.02, -2.55, COL.legno, 'camera', 0.07);
  blocco(1.32, 0.48, 0.12, -1.45, PAV + 0.02, -3.4, COL.legnoScuro, 'camera', 0.05);
  blocco(1.24, 0.1, 1.2, -1.45, PAV + 0.26, -2.25, COL.arancio.clone().offsetHSL(0, -0.05, 0.1), 'camera', 0.05);
  blocco(0.95, 0.12, 0.34, -1.45, PAV + 0.26, -3.12, COL.crema, 'camera', 0.06);
  blocco(0.36, 0.36, 0.34, -2.45, PAV + 0.02, -3.22, COL.legnoScuro, 'camera', 0.05);
  cilindro(0.04, 0.06, 0.16, -2.45, PAV + 0.38, -3.22, COL.crema, 'camera', 10);
  paralume('camera', new THREE.CylinderGeometry(0.09, 0.14, 0.14, 16, 1, true), -2.45, PAV + 0.6, -3.22);
  blocco(0.5, 0.95, 0.9, -2.8, PAV + 0.02, -1.15, COL.legno, 'camera', 0.07);
  bocche.set('camera', cassa('camera', -0.15, PAV + 0.02, -3.25));
  // Il ventilatore: un piede, una testa e quattro pale che girano
  cilindro(0.14, 0.16, 0.04, -0.15, PAV + 0.02, -1.0, COL.crema, 'camera', 16);
  cilindro(0.025, 0.025, 0.5, -0.15, PAV + 0.06, -1.0, COL.metallo, 'camera', 8);
  const pale = new THREE.Group(); pale.position.set(-0.15, PAV + 0.6, -0.95); casa.add(pale);
  palla(0.06, 0, 0, 0, COL.crema, 'camera', pale);
  for (let k = 0; k < 4; k++) { const b = blocco(0.07, 0.24, 0.015, 0, 0, 0, COL.tessutoChiaro, 'camera', 0.03, pale); b.position.set(Math.cos(k * Math.PI / 2) * 0.13, Math.sin(k * Math.PI / 2) * 0.13, 0.03); b.rotation.z = k * Math.PI / 2 - Math.PI / 2; }

  // --- Bagno: vasca con la paperella, lavandino con lo specchio tondo che fa da lampada, una pianta
  blocco(1.4, 0.38, 0.72, 2.25, PAV + 0.02, -3.0, COL.crema, 'bagno', 0.16);
  blocco(1.2, 0.03, 0.52, 2.25, PAV + 0.34, -3.0, COL.tessutoChiaro, 'bagno', 0.01);
  palla(0.06, 2.0, PAV + 0.42, -2.95, tono('#ffd75e'), 'bagno'); palla(0.035, 2.05, PAV + 0.5, -2.95, tono('#ffd75e'), 'bagno');
  blocco(0.42, 0.36, 0.32, 0.55, PAV + 0.02, -2.6, COL.crema, 'bagno', 0.08);
  paralume('bagno', new THREE.TorusGeometry(0.16, 0.025, 8, 28), 0.45, PAV + 0.62, -2.6);
  (casa.children[casa.children.length - 1] as THREE.Object3D).rotation.y = Math.PI / 2;
  vaso('bagno', 2.8, -1.05, 0.45);

  // --- Giardino: alberi tondi, fiori, il vialetto, tre lanterne, l'erba da tagliare e la casetta del tosaerba
  const albero = (x: number, z: number, alto: number) => {
    cilindro(0.07, 0.1, alto * 0.4, x, 0, z, COL.legnoScuro, 'giardino', 8);
    palla(alto * 0.3, x, alto * 0.55, z, COL.foglie, 'giardino'); palla(alto * 0.22, x + alto * 0.14, alto * 0.72, z - 0.05, COL.foglie.clone().offsetHSL(0, 0, 0.05), 'giardino');
  };
  [[-4.2, 3.2, 1.6], [-4.7, -1.4, 1.9], [4.5, -2.4, 1.7], [-3.2, -4.2, 1.3], [3.4, -4.1, 1.2], [-4.9, 1.0, 1.1], [4.8, -0.1, 1.0]].forEach(([x, z, a]) => albero(x!, z!, a!));
  const FIORI = [tono('#ff8fc8'), tono('#ffd75e'), C.arancio, tono('#a9cbe8')];
  for (let k = 0; k < 26; k++) {
    const a = r() * Math.PI * 2, d = 3.9 + r() * 1.6, x = Math.cos(a) * d, z = 0.3 + Math.sin(a) * d;
    if (z > 2.6 && x > 1.2 && x < 5) continue;
    cilindro(0.008, 0.008, 0.12, x, 0, z, COL.erbaScura, 'giardino', 4);
    palla(0.045, x, 0.14, z, FIORI[k % FIORI.length]!, 'giardino');
  }
  for (let k = 0; k < 5; k++) cilindro(0.2, 0.22, 0.04, -0.1 + (k % 2 ? 0.12 : -0.12), 0, 2.75 + k * 0.6, COL.pietra, 'giardino', 14);
  for (const [x, z] of [[-0.85, 3.1], [0.65, 4.0], [-0.85, 4.9]] as const) {
    cilindro(0.035, 0.035, 0.6, x, 0, z, COL.scuro, 'giardino', 8);
    blocco(0.16, 0.06, 0.16, x, 0.6, z, COL.scuro, 'giardino', 0.02);
    paralume('giardino', tondo(0.13, 0.17, 0.13, 0.03), x, 0.75, z);
    blocco(0.18, 0.04, 0.18, x, 0.84, z, COL.scuro, 'giardino', 0.02);
  }
  // Ciuffi d'erba nel prato davanti: il tosaerba li accorcia dove passa, poi ricrescono piano
  const PRATO = { x0: 1.3, x1: 4.4, z0: 2.8, z1: 5.2 };
  const ciuffi: { o: THREE.Object3D; h: number }[] = [];
  const geoCiuffo = new THREE.SphereGeometry(0.075, 7, 5);
  for (let x = PRATO.x0; x <= PRATO.x1; x += 0.28) for (let z = PRATO.z0; z <= PRATO.z1; z += 0.28) {
    if (Math.hypot(x, z - 0.3) > 5.35) continue;
    const o = solido(geoCiuffo, COL.erba.clone().offsetHSL(0, 0.04, -0.03 + (r() - 0.5) * 0.05), x + (r() - 0.5) * 0.12, 0, z + (r() - 0.5) * 0.12, 'giardino', casa, 0);
    o.scale.y = 0.7 + r() * 0.5; ciuffi.push({ o, h: o.scale.y });
  }
  // La casetta del tosaerba, con il tetto a punta
  blocco(0.7, 0.42, 0.6, 4.55, 0, 2.75, COL.legno, 'giardino', 0.05);
  { const t = solido(new THREE.ConeGeometry(0.58, 0.32, 4), COL.arancio, 4.55, 0.58, 2.75, 'giardino'); t.rotation.y = Math.PI / 4; }
  const BASE_TOSA = new THREE.Vector3(4.0, 0, 2.75);
  const tosa = new THREE.Group(); tosa.position.copy(BASE_TOSA); casa.add(tosa);
  blocco(0.38, 0.13, 0.28, 0, 0.04, 0, C.verde.clone(), 'giardino', 0.06, tosa);
  for (const [x, z] of [[-0.14, 0.15], [0.14, 0.15], [-0.14, -0.15], [0.14, -0.15]] as const) { const w = cilindro(0.05, 0.05, 0.03, x, 0, z, COL.scuro, 'giardino', 10, tosa); w.rotation.x = Math.PI / 2; w.position.y = 0.05; }
  const spiaTosa = luminoso(C.verde, 0.9);
  { const o = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), spiaTosa); o.position.set(0, 0.2, 0); tosa.add(o); }

  // --- Robot aspirapolvere: va di stanza in stanza passando dalle porte, poi torna alla base
  const robot = new THREE.Group(); robot.position.copy(BASE_ROBOT); casa.add(robot);
  cilindro(0.17, 0.17, 0.06, 0, 0, 0, COL.crema, null, 20, robot);
  const spia = luminoso(C.verde, 0.9);
  { const o = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), spia); o.position.set(0, 0.07, 0.1); robot.add(o); }
  let percorso: THREE.Vector3[] = [], stanzaRobot: Stanza = 'soggiorno';

  // --- Tu: un omino tondo nella stanza dove sei. Cambia stanza con un saltello
  const tu = new THREE.Group(); casa.add(tu);
  cilindro(0.11, 0.14, 0.26, 0, 0, 0, C.azzurro.clone(), null, 16, tu);
  palla(0.13, 0, 0.38, 0, COL.crema, null, tu);
  for (const x of [-0.045, 0.045]) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: neutro(chiaro ? 0.85 : 0.05) })); o.position.set(x, 0.4, 0.115); tu.add(o); }
  let dove: Stanza = 'soggiorno', saltoDa = -9;
  const postoTu = new THREE.Vector3();
  const posaTu = () => { const [x, z] = POSTO[dove]; postoTu.set(x, dove === 'giardino' ? 0 : PAV + 0.02, z); };
  posaTu(); tu.position.copy(postoTu);

  // --- Il cielo: il sole e la luna girano intorno all'isola, le stelle si accendono di notte
  const astri = puntiMorbidi(2);
  p.gruppo.add(astri.punti);
  const stelle = new THREE.BufferGeometry(), sp: number[] = [];
  for (let k = 0; k < 90; k++) { const a = r() * Math.PI * 2, e = 0.25 + r() * 1.1, R = 13 + r() * 4; sp.push(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R * 0.7, Math.sin(a) * Math.cos(e) * R); }
  stelle.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const matStelle = new THREE.PointsMaterial({ color: chiaro ? C.muted : C.fg, size: 0.05, transparent: true, opacity: 0, fog: false });
  p.gruppo.add(new THREE.Points(stelle, matStelle));

  // --- Particelle: alone delle lampade, schermo, stufa; vapore del caffè e note della musica
  const nLampade = [...lampade.values()].reduce((a, l) => a + l.punti.length, 0), VAP = 10, NOTE = 24;
  const alone = puntiMorbidi(nLampade + 2), part = puntiMorbidi(VAP + NOTE);
  casa.add(alone.punti, part.punti);
  const vita = Array.from({ length: VAP + NOTE }, (_, i) => i / (VAP + NOTE));

  // --- Etichette HTML: il nome delle stanze, i gradi sulla stufa, il timer
  const nomiEl = new Map<Stanza, HTMLElement>();
  for (const s of STANZE) { const e = document.createElement('span'); e.className = 'etichetta-stanza'; e.textContent = NOMI[s].en; etichette.append(e); nomiEl.set(s, e); }
  const gradiEl = document.createElement('span'); gradiEl.className = 'etichetta-gradi'; etichette.append(gradiEl);
  const timerEl = document.createElement('span'); timerEl.className = 'etichetta-timer'; etichette.append(timerEl);

  // --- Stato
  let stato: Stato | null = null, prima: Stato | null = null, caffeFino = 0, gradi = 20.5, sTempo = 0, angoloPale = 0, pausaTosa = 0;
  const luci = new Map<Stanza, { v: number; c: THREE.Color }>(STANZE.map(s => [s, { v: 0, c: new THREE.Color('#ffd9a6') }]));
  const tapp = new Map<Stanza, number>(STANZE.map(s => [s, 1]));
  const ora = { valore: 15.5, corre: true };
  let fuocoS: Stanza | null = null, fuocoFino = 0, percorsoTosa: THREE.Vector3[] = [];

  function strada(da: Stanza, a: Stanza): THREE.Vector3[] {
    const vicini = (s: Stanza) => PORTE.filter(q => q[0] === s || q[1] === s).map(q => ({ s: q[0] === s ? q[1] : q[0], x: q[2], z: q[3] }));
    const visti = new Map<Stanza, { da: Stanza; x: number; z: number } | null>([[da, null]]), coda: Stanza[] = [da];
    while (coda.length) { const s = coda.shift()!; for (const v of vicini(s)) if (!visti.has(v.s)) { visti.set(v.s, { da: s, x: v.x, z: v.z }); coda.push(v.s); } }
    const punti: THREE.Vector3[] = [];
    for (let s = a; s !== da;) { const v = visti.get(s); if (!v) break; punti.unshift(new THREE.Vector3(v.x, PAV + 0.03, v.z)); s = v.da; }
    return punti;
  }
  const stanzaDi = (x: number, z: number): Stanza | null => (DENTRO.find(s => { const b = PIANTA[s as keyof typeof PIANTA]; return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1; }) ?? null);
  function pulisci(stanze: Stanza[]) {
    percorso = [];
    let qui = stanzaRobot;
    for (const s of stanze) {
      if (s === 'giardino') continue;
      percorso.push(...strada(qui, s));
      const b = PIANTA[s as keyof typeof PIANTA], m0 = 0.5;
      for (let k = 0; k < 4; k++) { const z = b.z0 + m0 + ((b.z1 - b.z0 - 2 * m0) * k) / 3; percorso.push(new THREE.Vector3(k % 2 ? b.x1 - m0 : b.x0 + m0, PAV + 0.03, z), new THREE.Vector3(k % 2 ? b.x0 + m0 : b.x1 - m0, PAV + 0.03, z)); }
      qui = s;
    }
    percorso.push(...strada(qui, 'soggiorno'), BASE_ROBOT.clone());
  }
  function falcia() {
    percorsoTosa = [];
    for (let k = 0; k < 6; k++) { const z = PRATO.z0 + 0.2 + k * 0.45; percorsoTosa.push(new THREE.Vector3(k % 2 ? PRATO.x1 - 0.2 : PRATO.x0 + 0.2, 0, z), new THREE.Vector3(k % 2 ? PRATO.x0 + 0.2 : PRATO.x1 - 0.2, 0, z)); }
  }

  function imposta(s: Stato) {
    prima = stato; stato = s;
    if (prima && s.caffe !== prima.caffe) caffeFino = sTempo + 8;
    if (prima && s.giri !== prima.giri) pulisci(s.pulizia);
    if (s.tosaerba && (!prima || !prima.tosaerba)) falcia();
    if (!s.tosaerba && prima?.tosaerba) percorsoTosa = [BASE_TOSA.clone()];
  }

  const tmp = new THREE.Vector3(), tinta = new THREE.Color(), cLuce = new THREE.Color(), NOTTE = new THREE.Color(chiaro ? '#7d84a6' : '#5a6290');
  const muovi = (o: THREE.Object3D, meta: THREE.Vector3, passo: number) => { const d = tmp.copy(meta).sub(o.position), dist = d.length(); if (dist < passo) { o.position.copy(meta); return true; } o.position.addScaledVector(d.normalize(), passo); o.rotation.y = Math.atan2(d.x, d.z); return false; };
  function aggiorna(s: number, dt: number, pp: Palco) {
    sTempo = s;
    if (ora.corre && !pp.ridotto) ora.valore = (ora.valore + dt / 6) % 24;
    // Giorno e notte: il sole sale dalle 6 alle 18
    const ang = ((ora.valore - 6) / 12) * Math.PI, sopra = Math.sin(ang), giorno = THREE.MathUtils.clamp(sopra * 2.4 + 0.35, 0, 1), notte = 1 - giorno;
    matStelle.opacity = notte * 0.8;
    const R = 10;
    astri.pos.set([Math.cos(ang) * R, Math.sin(ang) * R * 0.55 + 0.6, -4.5, -Math.cos(ang) * R, -Math.sin(ang) * R * 0.55 + 0.6, -4.5]);
    astri.col.set([C.arancio.r, C.arancio.g, C.arancio.b, 0.86, 0.9, 1]); astri.dim.set([2.6, 1.8]); astri.alfa.set([sopra > -0.1 ? 0.85 : 0, sopra < 0.1 ? 0.7 : 0]);
    astri.aggiorna();

    const st = stato;
    if (!st) return;
    // Luci: ogni stanza va piano verso la sua luce e il suo colore
    let i = 0;
    for (const k of STANZE) {
      const l = luci.get(k)!, voluta = st.stanze[k], lp = lampade.get(k)!;
      l.v += (voluta.luce - l.v) * Math.min(1, dt * 4); l.c.lerp(cLuce.set(voluta.colore), Math.min(1, dt * 4));
      tapp.set(k, tapp.get(k)! + (voluta.tapparelle - tapp.get(k)!) * Math.min(1, dt * 2.5));
      for (const m of lp.paralumi) { m.color.copy(l.c).lerp(COL.crema, 1 - l.v); m.opacity = 0.35 + 0.6 * l.v; }
      for (const q of lp.punti) {
        alone.pos.set([q.x, q.y, q.z], i * 3); alone.col.set([l.c.r, l.c.g, l.c.b], i * 3);
        alone.dim[i] = (k === 'giardino' ? 0.9 : 1.3) * (0.4 + l.v); alone.alfa[i] = l.v * (0.25 + 0.55 * notte) * (chiaro ? 0.85 : 1); i++;
      }
      const pm = pozze.get(k)!; pm.color.copy(l.c); pm.opacity = l.v * (0.08 + 0.3 * notte) * (chiaro ? 0.8 : 1);
    }
    // I solidi: di notte prendono il blu della notte; la luce della loro stanza li scalda col suo colore
    for (const x of solidi) {
      // Le lanterne illuminano un vialetto, non tutta l'isola: in giardino la luce scalda meno
      const l = x.stanza ? luci.get(x.stanza)! : null, lv = l ? l.v * (0.25 + 0.65 * notte) * (x.stanza === 'giardino' ? 0.3 : 1) : 0;
      tinta.setRGB(1, 1, 1).lerp(NOTTE, notte * (chiaro ? 0.7 : 0.85));
      if (l && lv > 0.01) tinta.lerp(cLuce.copy(l.c).multiplyScalar(1.05), Math.min(0.8, lv));
      x.m.color.copy(tinta);
      if (x.l) x.l.color.copy(x.base).multiply(tinta);
    }
    // TV: un fondo che cambia colore e sfarfalla, con la sua luce davanti
    if (st.tv) { schermo.color.setHSL((s * 0.05) % 1, 0.5, 0.6 + 0.08 * Math.sin(s * 9)); schermo.opacity = 0.9; } else { schermo.color.copy(C.fg); schermo.opacity = 0.06; }
    alone.pos.set([-1.5, PAV + 0.6, -0.1], i * 3); alone.col.set([schermo.color.r, schermo.color.g, schermo.color.b], i * 3); alone.dim[i] = 1.6; alone.alfa[i] = st.tv ? 0.25 + 0.4 * notte : 0; i++;
    // Stufa: la temperatura vera segue piano quella voluta; la fiamma è viva mentre scalda, piccola quando la casa è calda
    gradi += Math.sign(st.termostato - gradi) * Math.min(Math.abs(st.termostato - gradi), dt * 0.35);
    const scalda = st.termostato - gradi > 0.05, forza = THREE.MathUtils.clamp((st.termostato - 15) / 11, 0.1, 1);
    fiamma.opacity = (scalda ? 0.6 + 0.3 * Math.sin(s * 11) * Math.sin(s * 7) : 0.25) * forza + 0.08;
    alone.pos.set([-2.7, PAV + 0.3, 0.2], i * 3); alone.col.set([C.arancio.r, C.arancio.g, C.arancio.b], i * 3); alone.dim[i] = 0.9 + forza * (scalda ? 0.9 : 0.3); alone.alfa[i] = fiamma.opacity * (0.4 + 0.4 * notte);
    alone.aggiorna();
    // Finestre: tapparelle e vetri che di notte prendono la luce della stanza
    for (const f of finestre) {
      const t = tapp.get(f.stanza)!, l = luci.get(f.stanza)!;
      f.tapparella.scale.y = Math.max(0.04, 1 - t);
      f.vetro.color.copy(l.c); f.vetro.opacity = (l.v * notte * 0.6 + 0.04) * (0.3 + 0.7 * t);
    }
    // Ventilatore: le pale girano tanto quanto la velocità
    angoloPale += dt * st.ventola * 22; pale.rotation.z = angoloPale;
    // Caffè e timer: vapore per qualche secondo, la tazza resta; la lancetta del timer gira finché c'è tempo
    const fa = s < caffeFino, adesso = performance.now() / 1000, resta = st.timer ? st.timerFine - adesso : 0;
    tazza.visible = st.caffe > 0;
    lancetta.rotation.z = st.timer && resta > 0 ? -(resta / (st.timer * 60)) * Math.PI * 2 : 0;
    // Musica: note che salgono da ogni cassa accesa, tante quanto il volume; ogni canzone ha il suo colore
    const suona = !st.muto ? st.musica.filter(k => CASSE.includes(k)) : [];
    for (let j = 0; j < VAP + NOTE; j++) {
      const vapore = j < VAP;
      vita[j] = (vita[j]! + dt * (vapore ? 0.55 : 0.4)) % 1;
      const v = vita[j]!;
      if (vapore) {
        part.pos.set([2.8 + Math.sin(v * 9 + j) * 0.04 * v, PAV + 0.82 + v * 0.5, 1.15 + Math.cos(v * 7 + j) * 0.04 * v], j * 3);
        part.col.set([1, 1, 1], j * 3); part.dim[j] = 0.1 + v * 0.22; part.alfa[j] = fa ? (1 - v) * 0.5 : 0;
        continue;
      }
      const n = j - VAP, dov = suona[n % Math.max(1, suona.length)], b = dov ? bocche.get(dov)! : null;
      const c = [C.arancio, C.azzurro, C.verde][(n + st.brano) % 3]!;
      if (b) part.pos.set([b.x + Math.sin(v * 9 + n) * 0.25 * v, b.y + v * 0.9, b.z + Math.cos(v * 7 + n) * 0.2 * v], j * 3);
      part.col.set([c.r, c.g, c.b], j * 3); part.dim[j] = 0.09;
      part.alfa[j] = b && n / NOTE < st.volume + 0.15 ? (1 - v) * 0.9 : 0;
    }
    part.aggiorna();

    // Robot: segue il percorso e gira dove va; la spia lampeggia mentre lavora
    if (percorso.length) {
      if (muovi(robot, percorso[0]!, dt * 0.9)) percorso.shift();
      stanzaRobot = stanzaDi(robot.position.x, robot.position.z) ?? stanzaRobot;
      spia.color.copy(C.arancio); spia.opacity = 0.5 + 0.5 * Math.sin(s * 8);
    } else { spia.color.copy(C.verde); spia.opacity = 0.9; }
    // Tosaerba: va avanti e indietro sul prato, accorcia i ciuffi dove passa, poi torna alla casetta. L'erba ricresce piano
    if (percorsoTosa.length) {
      if (muovi(tosa, percorsoTosa[0]!, dt * 0.7)) { percorsoTosa.shift(); if (!percorsoTosa.length && st.tosaerba) { pausaTosa = s + 2; } }
      spiaTosa.color.copy(C.arancio); spiaTosa.opacity = 0.5 + 0.5 * Math.sin(s * 8);
    } else {
      spiaTosa.color.copy(C.verde); spiaTosa.opacity = 0.9;
      if (st.tosaerba && s > pausaTosa) { if (tosa.position.distanceTo(BASE_TOSA) < 0.05) falcia(); else percorsoTosa = [BASE_TOSA.clone()]; }
      if (!st.tosaerba && tosa.position.distanceTo(BASE_TOSA) > 0.05) percorsoTosa = [BASE_TOSA.clone()];
    }
    for (const c of ciuffi) {
      if (st.tosaerba && Math.hypot(c.o.position.x - tosa.position.x, c.o.position.z - tosa.position.z) < 0.26) c.o.scale.y = Math.min(c.o.scale.y, 0.25);
      else c.o.scale.y = Math.min(c.h, c.o.scale.y + dt * 0.012);
    }

    // Tu: vai verso il tuo posto con un saltello
    if (tu.position.distanceToSquared(postoTu) > 1e-4) { if (s - saltoDa > 1) saltoDa = s; tu.position.x += (postoTu.x - tu.position.x) * Math.min(1, dt * 3); tu.position.z += (postoTu.z - tu.position.z) * Math.min(1, dt * 3); }
    tu.position.y = postoTu.y + Math.max(0, Math.sin(Math.min(1, (s - saltoDa) / 0.6) * Math.PI)) * 0.25 + Math.sin(s * 2.4) * 0.01;
    tu.rotation.y = Math.sin(s * 0.7) * 0.4;

    // Vista su una stanza: la casa si sposta e si ingrandisce, poi torna intera
    if (fuocoS && s > fuocoFino) fuocoS = null;
    const sc = fuocoS ? 1.6 : 1, c = fuocoS ? centro(fuocoS) : tmp.set(0, 0, 0);
    const k = Math.min(1, dt * 2.6);
    casa.scale.setScalar(casa.scale.x + (sc - casa.scale.x) * k);
    p.gruppo.position.x += (-c.x * sc - p.gruppo.position.x) * k; p.gruppo.position.z += (-c.z * sc - p.gruppo.position.z) * k;
    // Etichette: sopra ogni stanza, i gradi sopra la stufa, il timer sopra la cucina
    const w = el.clientWidth, h = el.clientHeight;
    const metti = (e: HTMLElement, x: number, y: number, z: number) => { const q = casa.localToWorld(tmp.set(x, y, z)).project(pp.camera); e.style.transform = `translate(${((q.x + 1) / 2) * w}px, ${((1 - q.y) / 2) * h}px) translate(-50%, -100%)`; const dentro = q.z < 1 && Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.95; e.style.visibility = dentro ? '' : 'hidden'; return dentro; };
    for (const s2 of STANZE) {
      const e = nomiEl.get(s2)!, cc = centro(s2);
      const visibile = metti(e, cc.x, s2 === 'giardino' ? 0.5 : PAV + MURO + 0.35, s2 === 'giardino' ? cc.z + 0.6 : cc.z);
      e.style.opacity = visibile && (!fuocoS || fuocoS === s2) ? '1' : '0';
      e.classList.toggle('qui', s2 === dove);
    }
    metti(gradiEl, -2.7, PAV + 1.1, -0.15);
    gradiEl.textContent = `${gradi.toFixed(1)}°${Math.abs(st.termostato - gradi) > 0.05 ? ` → ${st.termostato}°` : ''}`;
    metti(timerEl, 2.8, PAV + 0.85, 0.65);
    timerEl.textContent = st.timer ? (resta > 0 ? `${Math.floor(resta / 60)}:${String(Math.floor(resta % 60)).padStart(2, '0')}` : resta > -8 ? 'ding!' : '') : '';
  }

  function clic(raggio: THREE.Raycaster) {
    const colpo = raggio.intersectObjects([...pavimenti.keys()], false)[0];
    if (!colpo) { fuocoS = null; return; }
    // I pavimenti delle stanze stanno sopra il prato: vince la stanza
    const stanze = raggio.intersectObjects([...pavimenti.keys()].filter(o => pavimenti.get(o) !== 'giardino'), false)[0];
    alClic(pavimenti.get((stanze ?? colpo).object)!);
  }
  return {
    imposta,
    fuoco: (s, durata = 5) => { fuocoS = s; fuocoFino = sTempo + durata; },
    dove: s => { dove = s; posaTu(); },
    ora,
  };
}
