import * as THREE from 'three';
import { casuale, mat, pezzo, sasso, terreno, puntiMorbidi, palco, SITO, tema, tono, type Palco } from './natura';
import { CASSE, DENTRO, NOMI, STANZE, type Stanza, type Stato } from '../lib/casa';

// La casa di /learn/decision/, nello stile della home e del laghetto: tutto a filo, con un riempimento tenue.
// Una casetta senza tetto su un prato rotondo. La struttura e i mobili sono linee grigie leggere; gli oggetti che il decision
// model comanda sono arancio, il colore di Learn, e si accendono quando lavorano: lampade e lanterne, tapparelle, stufa,
// ventilatore, casse, TV, robot aspirapolvere, tosaerba, macchina del caffè e timer. Passandoci sopra si legge cosa sono.
// In casa vive un gatto bianco e nero: gira per le stanze, si siede, si lecca, si stira, dorme nei suoi posti e scappa dal robot.
// La scena mostra soltanto lo stato della casa (src/lib/casa.ts): quello che succede lo decide il modello.

const PAV = 0.12, MURO = 0.55, SP = 0.1;
type Box = { x0: number; x1: number; z0: number; z1: number };
export const PIANTA: Record<Exclude<Stanza, 'giardino'>, Box> = {
  soggiorno: { x0: -3.1, x1: 0.3, z0: -0.6, z1: 2.3 },
  cucina: { x0: 0.3, x1: 3.1, z0: -0.6, z1: 2.3 },
  camera: { x0: -3.1, x1: 0.3, z0: -3.5, z1: -0.6 },
  bagno: { x0: 0.3, x1: 3.1, z0: -3.5, z1: -0.6 },
};
const centro = (s: Stanza) => { if (s === 'giardino') return new THREE.Vector3(2.4, 0, 3.9); const b = PIANTA[s]; return new THREE.Vector3((b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2); };
const quota = (s: Stanza) => (s === 'giardino' ? 0 : PAV);
// Porte fra le stanze e verso il giardino: il robot e il gatto passano da qui
const PORTE: [Stanza, Stanza, number, number][] = [['soggiorno', 'cucina', 0.3, 1.15], ['soggiorno', 'camera', -0.25, -0.6], ['cucina', 'bagno', 0.9, -0.6], ['camera', 'bagno', 0.3, -1.3], ['soggiorno', 'giardino', -0.1, 2.3]];
const BASE_ROBOT = new THREE.Vector3(-0.75, PAV + 0.02, 2.0);
const stanzaDi = (x: number, z: number): Stanza => DENTRO.find(s => { const b = PIANTA[s as keyof typeof PIANTA]; return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1; }) ?? 'giardino';

export type Vista = { imposta: (s: Stato) => void; fuoco: (s: Stanza | null, durata?: number) => void; dove: (s: Stanza) => void };

export function montaCasa(el: HTMLElement, etichette: HTMLElement, alClic: (s: Stanza) => void): Vista {
  const r = casuale(21), chiaro = tema();
  const p = palco(el, {
    camera: new THREE.Vector3(0, 9.6, 12.6), mira: new THREE.Vector3(0, -0.3, 0.6), fov: 34, giro: 0.01, inclina: [-0.28, 0.2], zoom: [0.55, 1.3], nebbia: [1.6, 3],
    aggiorna, clic, scena: 'casa', toni: SITO,
  });
  const casa = new THREE.Group();
  p.gruppo.add(casa);
  const C = p.colori;

  // --- Materiali a filo. Tutti si attenuano di notte: si tiene l'opacità di partenza
  const scuri: { m: THREE.Material & { opacity: number }; base: number }[] = [];
  const m = (c: THREE.ColorRepresentation, riempi: number, fili: number) => {
    const x = mat(c, { opacity: riempi * (chiaro ? 1.3 : 1), fili });
    scuri.push({ m: x, base: x.opacity });
    const l = x.userData.linea as THREE.LineBasicMaterial | undefined;
    if (l) scuri.push({ m: l, base: l.opacity });
    return x;
  };
  const M = {
    muro: m('#6a6a6a', 0.07, 0.6), mobile: m('#6a6a6a', 0.04, 0.42), pavimento: m('#6a6a6a', 0.035, 0.28), verde: m(C.verde, 0.16, 0.6), foglie: m(C.verde, 0.12, 0.5),
    acqua: m(C.azzurro, 0.1, 0.45), tronco: m('#8a5a2b', 0.1, 0.5),
  };
  const scatola = (w: number, h: number, d: number, x: number, y0: number, z: number, mm: THREE.Material, g: THREE.Object3D = casa) => { const o = pezzo(new THREE.BoxGeometry(w, h, d), mm, x, y0 + h / 2, z); g.add(o); return o; };
  const tubo = (ra: number, rb: number, h: number, x: number, y0: number, z: number, mm: THREE.Material, lati = 10, g: THREE.Object3D = casa) => { const o = pezzo(new THREE.CylinderGeometry(ra, rb, h, lati), mm, x, y0 + h / 2, z); g.add(o); return o; };
  const luminoso = (c: THREE.ColorRepresentation, op = 0) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false });

  // --- Oggetti comandabili: arancio, ognuno col suo materiale, così si accende da solo. Una scatola invisibile serve per il passaggio del mouse
  type Oggetto = { nome: [string, string]; m: THREE.MeshBasicMaterial; l: THREE.LineBasicMaterial; presa: THREE.Mesh; attivo: number; colore: THREE.Color | null };
  const oggetti: Oggetto[] = [];
  function oggetto(nome: [string, string], x: number, y: number, z: number, w: number, h: number, d: number) {
    const mm = mat(C.arancio, { opacity: chiaro ? 0.12 : 0.08, fili: 0.85 }), l = mm.userData.linea as THREE.LineBasicMaterial;
    const presa = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    presa.position.set(x, y, z); casa.add(presa);
    const o: Oggetto = { nome, m: mm, l, presa, attivo: 0, colore: null };
    oggetti.push(o);
    return o;
  }

  // --- Il prato: dischi tenui e la griglia di punti, come gli altri mondi del sito, con i fili d'erba
  terreno(casa, C.verde, 5.8, () => 0, true);
  {
    const erba: number[] = [];
    for (let k = 0; k < 170; k++) {
      const a = r() * Math.PI * 2, d = 3.6 + r() * 2.1, x = Math.cos(a) * d, z = 0.3 + Math.sin(a) * d;
      if (Math.abs(x) < 3.3 && z > -3.7 && z < 2.5) continue;
      const h = 0.06 + r() * 0.08;
      for (const dx of [-0.04, 0, 0.04]) erba.push(x, 0, z, x + dx, h * (dx === 0 ? 1.3 : 1), z + dx * 0.5);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(erba, 3));
    const l = new THREE.LineBasicMaterial({ color: C.verde, transparent: true, opacity: 0.5 }); scuri.push({ m: l, base: 0.5 });
    casa.add(new THREE.LineSegments(g, l));
  }
  const prato = new THREE.Mesh(new THREE.CircleGeometry(5.8, 48), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  prato.rotation.x = -Math.PI / 2; prato.position.set(0, 0.005, 0.3); casa.add(prato);
  const pavimenti = new Map<THREE.Object3D, Stanza>([[prato, 'giardino']]);

  // --- Pavimenti e muri bassi. Il bordo del pavimento della stanza scelta diventa arancio
  scatola(6.3, PAV, 6.0, 0, 0, -0.6, M.muro);
  const bordi = new Map<Stanza, THREE.LineBasicMaterial>();
  for (const s of DENTRO) {
    const b = PIANTA[s as keyof typeof PIANTA], f = pezzo(new THREE.PlaneGeometry(b.x1 - b.x0 - 0.12, b.z1 - b.z0 - 0.12), M.pavimento, (b.x0 + b.x1) / 2, PAV + 0.004, (b.z0 + b.z1) / 2);
    f.rotation.x = -Math.PI / 2; casa.add(f); pavimenti.set(f, s);
    const w = (b.x1 - b.x0) / 2 - 0.1, d = (b.z1 - b.z0) / 2 - 0.1, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const lb = new THREE.LineBasicMaterial({ color: C.arancio, transparent: true, opacity: 0 });
    casa.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-w, -d], [w, -d], [w, d], [-w, d]].map(([x, z]) => new THREE.Vector3(cx + x!, PAV + 0.01, cz + z!))), lb));
    bordi.set(s, lb);
  }
  type Finestra = { stanza: Stanza; tapparella: THREE.Object3D; vetro: THREE.MeshBasicMaterial; ogg: Oggetto };
  const finestre: Finestra[] = [];
  type Apertura = { c: number; w: number; tipo: 'porta' | 'finestra'; stanza?: Stanza };
  const DAV = 0.2, ARC = 0.5;
  function muro(x0: number, z0: number, x1: number, z1: number, aperture: Apertura[] = []) {
    const lungoX = z0 === z1, a = Math.min(lungoX ? x0 : z0, lungoX ? x1 : z1), b = Math.max(lungoX ? x0 : z0, lungoX ? x1 : z1), fisso = lungoX ? z0 : x0;
    const pezzoMuro = (da: number, al: number, y0: number, y1: number) => {
      if (al - da < 0.02 || y1 - y0 < 0.02) return;
      const c = (da + al) / 2, L = al - da;
      scatola(lungoX ? L : SP, y1 - y0, lungoX ? SP : L, lungoX ? c : fisso, PAV + y0, lungoX ? fisso : c, M.muro);
    };
    let t = a;
    for (const ap of [...aperture].sort((u, v) => u.c - v.c)) {
      const da = ap.c - ap.w / 2, al = ap.c + ap.w / 2;
      pezzoMuro(t, da, 0, MURO);
      if (ap.tipo === 'finestra') {
        pezzoMuro(da, al, 0, DAV); pezzoMuro(da, al, ARC, MURO);
        const vetro = luminoso('#ffd9a6');
        const v = new THREE.Mesh(new THREE.PlaneGeometry(ap.w, ARC - DAV), vetro);
        v.position.set(lungoX ? ap.c : fisso, PAV + (DAV + ARC) / 2, lungoX ? fisso : ap.c);
        if (!lungoX) v.rotation.y = Math.PI / 2;
        casa.add(v);
        // La tapparella scende dall'alto: la sua altezza segue lo stato
        const perno = new THREE.Group();
        perno.position.set(lungoX ? ap.c : fisso, PAV + ARC, lungoX ? fisso : ap.c);
        casa.add(perno);
        const ogg = oggetto(['blinds', 'tapparelle'], lungoX ? ap.c : fisso, PAV + (DAV + ARC) / 2, lungoX ? fisso : ap.c, lungoX ? ap.w : 0.2, ARC - DAV + 0.1, lungoX ? 0.2 : ap.w);
        const doghe = pezzo(new THREE.BoxGeometry(lungoX ? ap.w - 0.02 : 0.03, ARC - DAV, lungoX ? 0.03 : ap.w - 0.02), ogg.m, 0, -(ARC - DAV) / 2, 0);
        perno.add(doghe);
        finestre.push({ stanza: ap.stanza!, tapparella: perno, vetro, ogg });
      }
      t = al;
    }
    pezzoMuro(t, b, 0, MURO);
  }
  muro(-3.1, -3.5, 3.1, -3.5);
  muro(-3.1, 2.3, 3.1, 2.3, [{ c: -0.1, w: 0.62, tipo: 'porta' }, { c: 1.9, w: 1.0, tipo: 'finestra', stanza: 'cucina' }]);
  muro(-3.1, -3.5, -3.1, 2.3, [{ c: -2.0, w: 0.9, tipo: 'finestra', stanza: 'camera' }, { c: 0.85, w: 1.0, tipo: 'finestra', stanza: 'soggiorno' }]);
  muro(3.1, -3.5, 3.1, 2.3, [{ c: -1.9, w: 0.8, tipo: 'finestra', stanza: 'bagno' }]);
  muro(0.3, -3.5, 0.3, 2.3, [{ c: -1.3, w: 0.6, tipo: 'porta' }, { c: 1.15, w: 0.7, tipo: 'porta' }]);
  muro(-3.1, -0.6, 0.3, -0.6, [{ c: -0.25, w: 0.6, tipo: 'porta' }]);
  muro(0.3, -0.6, 3.1, -0.6, [{ c: 0.9, w: 0.6, tipo: 'porta' }]);

  // --- Luci: una lampada per stanza, tre lanterne in giardino. Sul pavimento, una pozza di luce del suo colore
  const lampade = new Map<Stanza, { ogg: Oggetto[]; punti: THREE.Vector3[] }>(STANZE.map(s => [s, { ogg: [], punti: [] }]));
  const lampada = (s: Stanza, nome: [string, string], geo: THREE.BufferGeometry, x: number, y: number, z: number) => {
    const o = oggetto(nome, x, y, z, 0.35, 0.35, 0.35);
    casa.add(pezzo(geo, o.m, x, y, z));
    lampade.get(s)!.ogg.push(o); lampade.get(s)!.punti.push(new THREE.Vector3(x, y, z));
    return o;
  };
  const pozze = new Map<Stanza, THREE.MeshBasicMaterial>();
  {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv);
    for (const s of STANZE) {
      const mm = new THREE.MeshBasicMaterial({ map: tex, color: '#ffd9a6', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const c = s === 'giardino' ? new THREE.Vector3(-0.2, 0, 4.0) : centro(s), d = s === 'giardino' ? 3.4 : 3.2;
      const o = new THREE.Mesh(new THREE.PlaneGeometry(d, d), mm);
      o.rotation.x = -Math.PI / 2; o.position.set(c.x, quota(s) + 0.02, c.z); o.renderOrder = 2;
      casa.add(o); pozze.set(s, mm);
    }
  }

  // --- Soggiorno: divano, tappeto, TV, stufa, lampada a stelo, cassa
  { const t = pezzo(new THREE.CircleGeometry(1.0, 28), M.pavimento, -1.5, PAV + 0.01, 0.85); t.rotation.x = -Math.PI / 2; t.scale.y = 0.72; casa.add(t); }
  scatola(1.5, 0.2, 0.6, -1.5, PAV, 1.85, M.mobile); scatola(1.5, 0.22, 0.16, -1.5, PAV + 0.2, 2.1, M.mobile);
  scatola(0.16, 0.14, 0.6, -2.3, PAV + 0.2, 1.85, M.mobile); scatola(0.16, 0.14, 0.6, -0.7, PAV + 0.2, 1.85, M.mobile);
  scatola(1.3, 0.26, 0.36, -1.5, PAV, -0.34, M.mobile);
  const tv = oggetto(['TV', 'TV'], -1.5, PAV + 0.55, -0.36, 1.0, 0.55, 0.2);
  scatola(0.96, 0.52, 0.05, -1.5, PAV + 0.28, -0.36, tv.m);
  const schermo = luminoso(C.fg);
  { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.44), schermo); o.position.set(-1.5, PAV + 0.54, -0.33); casa.add(o); }
  const stufa = oggetto(['stove (heating)', 'stufa (riscaldamento)'], -2.7, PAV + 0.4, -0.15, 0.6, 0.85, 0.6);
  tubo(0.22, 0.25, 0.46, -2.7, PAV, -0.15, stufa.m, 12); tubo(0.05, 0.05, 0.4, -2.7, PAV + 0.46, -0.15, stufa.m, 6);
  const fiamma = luminoso(C.arancio);
  { const o = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14), fiamma); o.position.set(-2.7, PAV + 0.22, 0.105); casa.add(o); }
  tubo(0.015, 0.015, 0.7, -2.75, PAV, 1.95, M.mobile, 4);
  lampada('soggiorno', ['lamp', 'lampada'], new THREE.CylinderGeometry(0.11, 0.18, 0.18, 10, 1, true), -2.75, PAV + 0.78, 1.95);
  const casse = new Map<Stanza, { ogg: Oggetto; bocca: THREE.Vector3 }>();
  const cassa = (s: Stanza, x: number, y: number, z: number) => { const o = oggetto(['speaker', 'cassa'], x, y + 0.14, z, 0.3, 0.35, 0.3); scatola(0.18, 0.28, 0.16, x, y, z, o.m); casse.set(s, { ogg: o, bocca: new THREE.Vector3(x, y + 0.32, z) }); };
  cassa('soggiorno', 0.0, PAV, -0.3);
  casa.add(pezzo(sasso(0.2, r, 1), M.foglie, -2.75, PAV + 0.3, 1.25)); tubo(0.1, 0.08, 0.16, -2.75, PAV, 1.25, M.mobile, 8);

  // --- Cucina: piano di lavoro, frigo, macchina del caffè, timer, tavolo tondo, la ciotola del gatto
  scatola(0.55, 0.42, 1.7, 2.78, PAV, 0.55, M.mobile); scatola(0.55, 0.85, 0.5, 2.78, PAV, -0.28, M.mobile);
  const caffe = oggetto(['coffee machine', 'macchina del caffè'], 2.8, PAV + 0.58, 1.15, 0.35, 0.4, 0.35);
  scatola(0.22, 0.28, 0.2, 2.8, PAV + 0.42, 1.15, caffe.m);
  const tazza = tubo(0.035, 0.03, 0.05, 2.64, PAV + 0.42, 1.15, M.mobile, 8);
  const timer = oggetto(['kitchen timer', 'timer da cucina'], 2.8, PAV + 0.5, 0.65, 0.3, 0.3, 0.3);
  tubo(0.07, 0.07, 0.09, 2.8, PAV + 0.42, 0.65, timer.m, 12);
  const lancetta = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0.065)]), timer.l);
  lancetta.position.set(2.8, PAV + 0.52, 0.65); casa.add(lancetta);
  cassa('cucina', 2.8, PAV + 0.42, 0.2);
  tubo(0.46, 0.46, 0.04, 1.55, PAV + 0.44, 0.85, M.mobile, 20); tubo(0.04, 0.1, 0.44, 1.55, PAV, 0.85, M.mobile, 6);
  tubo(0.15, 0.15, 0.28, 0.95, PAV, 0.85, M.mobile, 10); tubo(0.15, 0.15, 0.28, 2.15, PAV, 0.85, M.mobile, 10);
  lampada('cucina', ['lamp', 'lampada'], new THREE.SphereGeometry(0.14, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), 1.55, PAV + 0.62, 0.85);
  tubo(0.09, 0.07, 0.04, 2.2, PAV, 1.98, M.acqua, 10);

  // --- Camera: letto, comodino con l'abat-jour, armadio, ventilatore, cassa
  scatola(1.3, 0.22, 1.85, -1.45, PAV, -2.55, M.mobile); scatola(1.3, 0.42, 0.08, -1.45, PAV, -3.44, M.mobile);
  scatola(1.2, 0.08, 1.1, -1.45, PAV + 0.22, -2.2, M.mobile); scatola(0.9, 0.1, 0.3, -1.45, PAV + 0.22, -3.15, M.mobile);
  scatola(0.34, 0.32, 0.32, -2.45, PAV, -3.22, M.mobile);
  lampada('camera', ['bedside lamp', 'abat-jour'], new THREE.CylinderGeometry(0.08, 0.12, 0.12, 10, 1, true), -2.45, PAV + 0.46, -3.22);
  scatola(0.48, 0.5, 0.9, -2.82, PAV, -1.15, M.mobile);
  cassa('camera', -0.15, PAV, -3.25);
  const ventola = oggetto(['fan', 'ventilatore'], -0.15, PAV + 0.35, -1.0, 0.4, 0.7, 0.4);
  tubo(0.12, 0.14, 0.03, -0.15, PAV, -1.0, ventola.m, 10); tubo(0.015, 0.015, 0.45, -0.15, PAV + 0.03, -1.0, ventola.m, 4);
  const pale = new THREE.Group(); pale.position.set(-0.15, PAV + 0.52, -0.95); casa.add(pale);
  pale.add(pezzo(new THREE.TorusGeometry(0.15, 0.006, 4, 18), ventola.m));
  for (let k = 0; k < 4; k++) { const b = pezzo(new THREE.BoxGeometry(0.06, 0.2, 0.01), ventola.m, Math.cos(k * Math.PI / 2) * 0.08, Math.sin(k * Math.PI / 2) * 0.08, 0); b.rotation.z = k * Math.PI / 2 - Math.PI / 2; pale.add(b); }

  // --- Bagno: vasca, lavandino con lo specchio tondo che fa da lampada
  scatola(1.4, 0.34, 0.7, 2.25, PAV, -3.0, M.mobile);
  { const a = pezzo(new THREE.PlaneGeometry(1.2, 0.5), M.acqua, 2.25, PAV + 0.3, -3.0); a.rotation.x = -Math.PI / 2; casa.add(a); }
  scatola(0.4, 0.32, 0.3, 0.55, PAV, -2.6, M.mobile);
  { const o = lampada('bagno', ['mirror light', 'luce dello specchio'], new THREE.TorusGeometry(0.14, 0.02, 5, 20), 0.42, PAV + 0.55, -2.6); void o; (casa.children[casa.children.length - 1] as THREE.Object3D).rotation.y = Math.PI / 2; }

  // --- Giardino: alberi a filo come nel bosco della home, il vialetto, tre lanterne, l'erba da tagliare e la casetta del tosaerba
  const albero = (x: number, z: number, alto: number) => {
    tubo(0.04, 0.06, alto * 0.45, x, 0, z, M.tronco, 6);
    casa.add(pezzo(sasso(alto * 0.3, r, 1), M.foglie, x, alto * 0.6, z));
  };
  [[-4.2, 3.2, 1.6], [-4.7, -1.4, 1.9], [4.5, -2.4, 1.7], [-3.2, -4.2, 1.3], [3.4, -4.1, 1.2], [-4.9, 1.0, 1.1], [4.8, -0.1, 1.0]].forEach(([x, z, a]) => albero(x!, z!, a!));
  for (let k = 0; k < 9; k++) casa.add(pezzo(sasso(0.1 + r() * 0.1, r), M.verde, (r() < 0.5 ? -1 : 1) * (3.5 + r() * 1.3), 0.06, -3 + r() * 6));
  for (let k = 0; k < 5; k++) { const s = pezzo(new THREE.CylinderGeometry(0.19, 0.2, 0.02, 9), M.mobile, -0.1 + (k % 2 ? 0.12 : -0.12), 0.01, 2.75 + k * 0.6); casa.add(s); }
  for (const [x, z] of [[-0.85, 3.1], [0.65, 4.0], [-0.85, 4.9]] as const) {
    tubo(0.015, 0.015, 0.55, x, 0, z, M.mobile, 4);
    lampada('giardino', ['lantern', 'lanterna'], new THREE.BoxGeometry(0.12, 0.15, 0.12), x, 0.63, z);
  }
  // Ciuffi d'erba nel prato davanti: il tosaerba li accorcia dove passa, poi ricrescono piano
  const PRATO = { x0: 1.3, x1: 4.4, z0: 2.8, z1: 5.2 };
  const ciuffi: { x: number; z: number; h: number; ora: number }[] = [];
  for (let x = PRATO.x0; x <= PRATO.x1; x += 0.3) for (let z = PRATO.z0; z <= PRATO.z1; z += 0.3) if (Math.hypot(x, z - 0.3) < 5.3) ciuffi.push({ x: x + (r() - 0.5) * 0.14, z: z + (r() - 0.5) * 0.14, h: 0.08 + r() * 0.05, ora: 0 });
  ciuffi.forEach(c => { c.ora = c.h; });
  const posErba = new Float32Array(ciuffi.length * 3 * 6), geoErba = new THREE.BufferGeometry();
  geoErba.setAttribute('position', new THREE.BufferAttribute(posErba, 3));
  { const l = new THREE.LineBasicMaterial({ color: C.verde, transparent: true, opacity: 0.75 }); scuri.push({ m: l, base: 0.75 }); casa.add(new THREE.LineSegments(geoErba, l)); }
  const disegnaErba = () => {
    ciuffi.forEach((c, i) => [-0.035, 0, 0.035].forEach((dx, j) => { const o = (i * 3 + j) * 6; posErba.set([c.x, 0, c.z, c.x + dx, c.ora * (dx === 0 ? 1.2 : 1), c.z + dx * 0.4], o); }));
    (geoErba.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };
  disegnaErba();
  scatola(0.62, 0.36, 0.54, 4.55, 0, 2.75, M.mobile);
  { const t = pezzo(new THREE.ConeGeometry(0.5, 0.28, 4), M.mobile, 4.55, 0.5, 2.75); t.rotation.y = Math.PI / 4; casa.add(t); }
  const BASE_TOSA = new THREE.Vector3(4.0, 0, 2.75);
  const tosa = new THREE.Group(); tosa.position.copy(BASE_TOSA); casa.add(tosa);
  const tosaO = oggetto(['lawn mower', 'tosaerba'], 0, 0.12, 0, 0.45, 0.3, 0.45);
  tosa.add(tosaO.presa);
  tosa.add(pezzo(new THREE.BoxGeometry(0.34, 0.1, 0.26), tosaO.m, 0, 0.09, 0));
  for (const [x, z] of [[-0.13, 0.14], [0.13, 0.14], [-0.13, -0.14], [0.13, -0.14]] as const) { const w = pezzo(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 8), tosaO.m, x, 0.045, z); w.rotation.x = Math.PI / 2; tosa.add(w); }

  // --- Robot aspirapolvere: va di stanza in stanza passando dalle porte, poi torna alla base
  const robot = new THREE.Group(); robot.position.copy(BASE_ROBOT); casa.add(robot);
  const robotO = oggetto(['robot vacuum', 'robot aspirapolvere'], 0, 0.06, 0, 0.4, 0.2, 0.4);
  robot.add(robotO.presa);
  robot.add(pezzo(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 14), robotO.m, 0, 0.025, 0));
  let percorso: THREE.Vector3[] = [], stanzaRobot: Stanza = 'soggiorno';

  // --- Il gatto, nello stile dei cervi della home: ovali pieni a facce con i bordi sottili, zampe col ginocchio.
  // Bianco e nero: pelo nero, petto, muso, zampe e punta della coda bianchi. In scala con la casa: il garrese arriva a metà
  // del sedile del divano, e il gatto è lungo un quinto del divano. Il corpo è fatto di tre ovali (petto, ventre, fianchi)
  // che si piegano nelle curve; la coda è una catena con un'onda che scorre dalla base alla punta.
  const bordiGatto = new THREE.LineBasicMaterial({ color: C.fg, transparent: true, opacity: chiaro ? 0.55 : 0.4 });
  const nero = new THREE.MeshBasicMaterial({ color: chiaro ? '#2a2621' : '#131313', transparent: true, opacity: 0.96 });
  const bianco = new THREE.MeshBasicMaterial({ color: chiaro ? '#f8f5ee' : '#eef1f5', transparent: true, opacity: chiaro ? 1 : 0.92 });
  const occhi = luminoso(tono('#c8e05a'), 0.85);
  const geoOvale = new THREE.SphereGeometry(1, 8, 6), bordiOvale = new THREE.EdgesGeometry(geoOvale, 25);
  const ovale = (mm: THREE.Material, rx: number, ry: number, rz: number, x: number, y: number, z: number, padre: THREE.Object3D) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geoOvale, mm), new THREE.LineSegments(bordiOvale, bordiGatto));
    g.scale.set(rx, ry, rz); g.position.set(x, y, z); padre.add(g);
    return g;
  };
  const ALTO = 0.15;
  const gatto = new THREE.Group(); gatto.scale.setScalar(0.68); casa.add(gatto);
  // Il corpo guarda verso +z. corpo: l'altezza e l'inclinazione; petto e fianchi si girano un po' per piegare la schiena
  const corpo = new THREE.Group(); corpo.position.y = ALTO; gatto.add(corpo);
  const ventre = ovale(nero, 0.068, 0.066, 0.1, 0, 0, 0, corpo);
  const petto = new THREE.Group(); petto.position.z = 0.07; corpo.add(petto);
  ovale(nero, 0.066, 0.07, 0.075, 0, 0.005, 0.02, petto);
  ovale(bianco, 0.045, 0.055, 0.04, 0, -0.022, 0.07, petto);
  const fianchi = new THREE.Group(); fianchi.position.z = -0.07; corpo.add(fianchi);
  ovale(nero, 0.07, 0.07, 0.08, 0, 0.004, -0.03, fianchi);
  // Collo e testa: il collo ruota sul petto, la testa in cima al collo
  const collo = new THREE.Group(); collo.position.set(0, 0.04, 0.08); petto.add(collo);
  ovale(nero, 0.036, 0.045, 0.04, 0, 0.03, 0.02, collo);
  const testa = new THREE.Group(); testa.position.set(0, 0.07, 0.05); collo.add(testa);
  ovale(nero, 0.06, 0.054, 0.058, 0, 0, 0, testa);
  ovale(bianco, 0.032, 0.024, 0.028, 0, -0.018, 0.048, testa);
  ovale(bianco, 0.022, 0.03, 0.012, 0, 0.012, 0.052, testa);
  const orecchie = [-1, 1].map(lato => {
    const o = new THREE.Group(); o.position.set(lato * 0.034, 0.045, -0.005); testa.add(o);
    const cono = new THREE.ConeGeometry(0.022, 0.045, 4);
    o.add(new THREE.Mesh(cono, nero), new THREE.LineSegments(new THREE.EdgesGeometry(cono), bordiGatto));
    o.rotation.z = -lato * 0.28;
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), occhi); e.position.set(lato * 0.024, 0.008, 0.052); testa.add(e);
    return o;
  });
  // Le zampe: anca, coscia, ginocchio, stinco e la zampetta bianca. Passo a quattro tempi, come i cervi
  const ZAMPE_GATTO = [{ x: -0.042, z: -0.1, fase: 0, davanti: false }, { x: -0.042, z: 0.1, fase: 0.25, davanti: true }, { x: 0.042, z: -0.1, fase: 0.5, davanti: false }, { x: 0.042, z: 0.1, fase: 0.75, davanti: true }];
  const geoCoscia = new THREE.CylinderGeometry(0.022, 0.013, 0.08, 6), geoStinco = new THREE.CylinderGeometry(0.012, 0.01, 0.07, 6);
  const bordiCoscia = new THREE.EdgesGeometry(geoCoscia, 30), bordiStinco = new THREE.EdgesGeometry(geoStinco, 30);
  const zampe = ZAMPE_GATTO.map(q => {
    const anca = new THREE.Group(); anca.position.set(q.x, ALTO, q.z); gatto.add(anca);
    anca.add(new THREE.Mesh(geoCoscia, nero).translateY(-0.04), new THREE.LineSegments(bordiCoscia, bordiGatto).translateY(-0.04));
    const ginocchio = new THREE.Group(); ginocchio.position.y = -0.078; anca.add(ginocchio);
    ginocchio.add(new THREE.Mesh(geoStinco, nero).translateY(-0.035), new THREE.LineSegments(bordiStinco, bordiGatto).translateY(-0.035));
    ovale(bianco, 0.015, 0.009, 0.02, 0, -0.07, 0.006, ginocchio);
    return { ...q, anca, ginocchio };
  });
  // La coda: nove pezzi, ognuno figlio del precedente; la punta è bianca
  const coda: THREE.Group[] = [];
  {
    let padre: THREE.Object3D = fianchi;
    for (let k = 0; k < 9; k++) {
      const g = new THREE.Group(); g.position.set(0, k ? 0.026 : 0.035, k ? 0 : -0.095); padre.add(g);
      ovale(k > 6 ? bianco : nero, 0.012 - k * 0.0004, 0.016, 0.012 - k * 0.0004, 0, 0.013, 0, g);
      coda.push(g); padre = g;
    }
  }
  const zzz = document.createElement('span'); zzz.className = 'etichetta-zzz'; zzz.textContent = 'z z z'; etichette.append(zzz);

  // I posti del gatto: dove si siede, dove mangia, dove dorme. y è l'altezza della superficie
  type Posto = { stanza: Stanza; x: number; z: number; y: number; fa: 'dorme' | 'siede' | 'mangia'; verso: number; peso: (st: Stato, caldo: boolean) => number };
  const POSTI: Posto[] = [
    { stanza: 'camera', x: -1.65, z: -2.2, y: PAV + 0.3, fa: 'dorme', verso: 0.6, peso: () => 2.5 },
    { stanza: 'soggiorno', x: -1.8, z: 1.8, y: PAV + 0.2, fa: 'dorme', verso: 1.6, peso: st => (st.tv ? 3 : 1.5) },
    { stanza: 'soggiorno', x: -2.25, z: 0.3, y: PAV, fa: 'dorme', verso: -0.4, peso: (_, caldo) => (caldo ? 7 : 0.4) },
    { stanza: 'soggiorno', x: -2.8, z: 0.85, y: PAV, fa: 'siede', verso: -Math.PI / 2, peso: st => 2 * st.stanze.soggiorno.tapparelle },
    { stanza: 'cucina', x: 2.2, z: 1.82, y: PAV, fa: 'mangia', verso: 0, peso: () => 1.5 },
    { stanza: 'cucina', x: 1.0, z: 1.75, y: PAV, fa: 'siede', verso: 2.4, peso: st => (st.caffe ? 1.2 : 0.6) },
    { stanza: 'bagno', x: 1.5, z: -1.7, y: PAV, fa: 'siede', verso: -2.4, peso: () => 0.6 },
    { stanza: 'giardino', x: 0.7, z: 3.4, y: 0, fa: 'siede', verso: 0.8, peso: st => (st.tosaerba ? 0 : 1.6) },
    { stanza: 'giardino', x: -2.3, z: 3.7, y: 0, fa: 'dorme', verso: 2, peso: st => (st.tosaerba ? 0 : 1.2) },
  ];
  type Fare = 'cammina' | 'dorme' | 'siede' | 'lecca' | 'stira' | 'mangia' | 'salta';
  const micio = {
    fare: 'dorme' as Fare, fino: 4, posto: POSTI[1]!, via: [] as THREE.Vector3[], veloce: false, salto: null as null | { da: THREE.Vector3; a: THREE.Vector3; t: number },
    verso: 1.6, giro: 0, vel: 0, passo: 0, pose: { sedere: 0, sdraio: 1, testaGiu: 0, stira: 0, lecca: 0 }, paura: 0, sguardo: 0, orecchio: 0,
  };
  gatto.position.set(-1.8, PAV + 0.2, 1.8);

  // --- Particelle: alone delle lampade, dello schermo e della stufa; vapore del caffè e note della musica
  const nLampade = [...lampade.values()].reduce((a, l) => a + l.punti.length, 0), VAP = 10, NOTE = 24;
  const alone = puntiMorbidi(nLampade + 2), part = puntiMorbidi(VAP + NOTE);
  casa.add(alone.punti, part.punti);
  const vita = Array.from({ length: VAP + NOTE }, (_, i) => i / (VAP + NOTE));

  // --- Etichette HTML: le stanze, i gradi sulla stufa, il timer, e il nome dell'oggetto sotto il mouse
  const nomiEl = new Map<Stanza, HTMLElement>();
  for (const s of STANZE) { const e = document.createElement('span'); e.className = 'etichetta-stanza'; e.textContent = NOMI[s].en; etichette.append(e); nomiEl.set(s, e); }
  const gradiEl = document.createElement('span'); gradiEl.className = 'etichetta-gradi'; etichette.append(gradiEl);
  const timerEl = document.createElement('span'); timerEl.className = 'etichetta-timer'; etichette.append(timerEl);
  const sopraEl = document.createElement('span'); sopraEl.className = 'etichetta-oggetto'; etichette.append(sopraEl);

  // --- Stato
  let stato: Stato | null = null, prima: Stato | null = null, caffeFino = 0, gradi = 20.5, sTempo = 0, angoloPale = 0, pausaTosa = 0, dove: Stanza = 'soggiorno';
  const luci = new Map<Stanza, { v: number; c: THREE.Color }>(STANZE.map(s => [s, { v: 0, c: new THREE.Color('#ffd9a6') }]));
  const tapp = new Map<Stanza, number>(STANZE.map(s => [s, 1]));
  let fuocoS: Stanza | null = null, fuocoFino = 0, percorsoTosa: THREE.Vector3[] = [];

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
    corpo.position.y = ALTO - 0.085 * P.sdraio - 0.03 * P.sedere - 0.04 * accuccia + Math.sin(giro2 * 2) * 0.004 * amp;
    corpo.rotation.x = -0.5 * P.sedere + 0.3 * P.stira;
    corpo.rotation.z = Math.sin(giro2 * 2 + 0.6) * 0.02 * amp;
    ventre.scale.y = 0.066 * (1 + P.sdraio * 0.05 * Math.sin(s * 1.6));
    // La schiena si piega: nelle curve petto e fianchi vanno in versi opposti; camminando i fianchi ondeggiano;
    // dormendo il gatto si acciambella
    const curva = THREE.MathUtils.clamp(g.giro * 0.22, -0.4, 0.4);
    petto.rotation.y = curva + 0.55 * P.sdraio;
    fianchi.rotation.y = -curva * 0.8 + Math.sin(giro2) * 0.06 * amp - 0.55 * P.sdraio;
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
    collo.rotation.y = morbido(collo.rotation.y, curva * 1.2 + 0.5 * P.sdraio, dt * 3);
    testa.rotation.y = morbido(testa.rotation.y, (g.fare === 'cammina' ? 0 : g.sguardo) * (1 - P.sdraio) * (1 - P.lecca) + P.lecca * 0.4, dt * 2.2);
    testa.rotation.x = morbido(testa.rotation.x, P.lecca * (0.4 + Math.sin(s * 8) * 0.15) - 0.3 * P.sedere * (1 - P.lecca), dt * 4);
    orecchie.forEach((o, n) => { o.rotation.x = (n === (Math.floor(s) % 2) ? 0.6 : 0) * g.orecchio; });
    occhi.opacity = (1 - P.sdraio) * 0.85;
    // La coda: un'onda che scorre dalla base alla punta. Camminando sta alta col ricciolo in cima; ferma scende dietro;
    // seduta o sdraiata si avvolge intorno al corpo; quando ha paura è gonfia e dritta
    const avvolta = Math.max(P.sedere, P.sdraio), ferma = (1 - Math.min(1, amp * 2)) * (1 - avvolta), alta = Math.min(1, amp * 2) * (1 - avvolta);
    coda.forEach((c, i) => {
      const t = i / coda.length, onda = Math.sin(s * (g.paura > 0 ? 7 : 1.7) - i * 0.6);
      c.rotation.x = i === 0 ? -0.75 * alta - 2.3 * avvolta - 1.7 * ferma - (g.paura > 0 ? 0.5 : 0) : alta * (t > 0.6 ? 0.28 : 0.05) + ferma * 0.12 + avvolta * 0.05;
      c.rotation.z = (i === 0 ? 0 : avvolta * (0.33 + P.sdraio * 0.06)) + onda * (0.05 + t * 0.14) * (1 - P.sdraio * 0.7);
      c.scale.setScalar(g.paura > 0 ? 1.45 : 1);
    });
  }

  function aggiorna(s: number, dt: number, pp: Palco) {
    sTempo = s;
    // Sempre giorno: niente ciclo giorno e notte. Le luci accese brillano come in un tardo pomeriggio
    const giorno = 1, notte = 0.3;

    const st = stato;
    if (!st) return;
    oggetti.forEach(o => { o.attivo = 0; o.colore = null; });
    // Luci: ogni stanza va piano verso la sua luce e il suo colore; la lampada prende quel colore
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
      const pm = pozze.get(k)!; pm.color.copy(l.c); pm.opacity = l.v * (0.06 + 0.26 * notte) * (k === 'giardino' ? 0.6 : 1) * (chiaro ? 0.8 : 1);
      bordi.get(k)?.color.copy(C.arancio);
      const b = bordi.get(k); if (b) b.opacity += ((k === dove ? 0.8 : 0) - b.opacity) * Math.min(1, dt * 5);
    }
    // TV: un fondo che cambia colore e sfarfalla, con la sua luce davanti
    tv.attivo = st.tv ? 1 : 0;
    if (st.tv) { schermo.color.setHSL((s * 0.05) % 1, 0.5, 0.6 + 0.08 * Math.sin(s * 9)); schermo.opacity = 0.75; } else schermo.opacity = 0;
    alone.pos.set([-1.5, PAV + 0.55, -0.1], i * 3); alone.col.set([schermo.color.r, schermo.color.g, schermo.color.b], i * 3); alone.dim[i] = 1.5; alone.alfa[i] = st.tv ? 0.22 + 0.4 * notte : 0; i++;
    // Stufa: la temperatura vera segue piano quella voluta; la fiamma è viva mentre scalda
    gradi += Math.sign(st.termostato - gradi) * Math.min(Math.abs(st.termostato - gradi), dt * 0.35);
    const scalda = st.termostato - gradi > 0.05, forza = THREE.MathUtils.clamp((st.termostato - 15) / 11, 0.1, 1);
    fiamma.opacity = scalda ? (0.55 + 0.3 * Math.sin(s * 11) * Math.sin(s * 7)) * forza : 0.1 * forza;
    stufa.attivo = scalda ? 0.8 : 0.25 * forza;
    alone.pos.set([-2.7, PAV + 0.25, 0.15], i * 3); alone.col.set([C.arancio.r, C.arancio.g, C.arancio.b], i * 3); alone.dim[i] = 0.8 + forza * (scalda ? 0.8 : 0.2); alone.alfa[i] = fiamma.opacity * (0.4 + 0.4 * notte);
    alone.aggiorna();
    // Finestre: tapparelle e vetri che di notte prendono la luce della stanza
    for (const f of finestre) {
      const t = tapp.get(f.stanza)!, l = luci.get(f.stanza)!;
      f.tapparella.scale.y = Math.max(0.04, 1 - t);
      f.ogg.attivo = 1 - t;
      f.vetro.color.copy(l.c); f.vetro.opacity = l.v * notte * 0.45 * (0.3 + 0.7 * t);
    }
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
        part.pos.set([2.8 + Math.sin(v * 9 + j) * 0.04 * v, PAV + 0.72 + v * 0.5, 1.15 + Math.cos(v * 7 + j) * 0.04 * v], j * 3);
        part.col.set([C.fg.r, C.fg.g, C.fg.b], j * 3); part.dim[j] = 0.1 + v * 0.22; part.alfa[j] = fa ? (1 - v) * 0.45 : 0;
        continue;
      }
      const n = j - VAP, dov = suona[n % Math.max(1, suona.length)], b = dov ? casse.get(dov)!.bocca : null;
      const c = [C.arancio, C.azzurro, C.verde][(n + st.brano) % 3]!;
      if (b) part.pos.set([b.x + Math.sin(v * 9 + n) * 0.25 * v, b.y + v * 0.9, b.z + Math.cos(v * 7 + n) * 0.2 * v], j * 3);
      part.col.set([c.r, c.g, c.b], j * 3); part.dim[j] = 0.08;
      part.alfa[j] = b && n / NOTE < st.volume + 0.15 ? (1 - v) * 0.9 : 0;
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

    // Gli oggetti accesi: più riempimento e linee piene; le lampade prendono il colore della loro luce
    for (const o of oggetti) {
      o.m.opacity = (chiaro ? 0.1 : 0.06) * (0.55 + 0.45 * giorno) + o.attivo * 0.22;
      o.l.opacity = (0.5 + 0.2 * giorno) + o.attivo * 0.35;
      const c = o.colore ?? C.arancio; o.m.color.copy(c); o.l.color.copy(c);
    }

    aggiornaGatto(s, dt, st, scalda || gradi > 21.5);

    // Vista su una stanza: la casa si sposta e si ingrandisce, poi torna intera
    if (fuocoS && s > fuocoFino) fuocoS = null;
    const sc = fuocoS ? 1.6 : 1, c = fuocoS ? centro(fuocoS) : tmp.set(0, 0, 0);
    const k = Math.min(1, dt * 2.6);
    casa.scale.setScalar(casa.scale.x + (sc - casa.scale.x) * k);
    p.gruppo.position.x += (-c.x * sc - p.gruppo.position.x) * k; p.gruppo.position.z += (-c.z * sc - p.gruppo.position.z) * k;

    // Etichette. Un'etichetta fuori dall'inquadratura si nasconde
    const w = el.clientWidth, h = el.clientHeight;
    const metti = (e: HTMLElement, x: number, y: number, z: number) => {
      const q = casa.localToWorld(tmp.set(x, y, z)).project(pp.camera), dentro = q.z < 1 && Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.95;
      e.style.transform = `translate(${((q.x + 1) / 2) * w}px, ${((1 - q.y) / 2) * h}px) translate(-50%, -100%)`; e.style.visibility = dentro ? '' : 'hidden';
      return dentro;
    };
    for (const s2 of STANZE) {
      const e = nomiEl.get(s2)!, cc = centro(s2);
      const visibile = metti(e, cc.x, s2 === 'giardino' ? 0.5 : PAV + MURO + 0.3, s2 === 'giardino' ? cc.z + 0.6 : cc.z);
      e.style.opacity = visibile && (!fuocoS || fuocoS === s2) ? '1' : '0';
      e.classList.toggle('qui', s2 === dove);
    }
    metti(gradiEl, -2.7, PAV + 1.0, -0.15);
    gradiEl.textContent = `${gradi.toFixed(1)}°${Math.abs(st.termostato - gradi) > 0.05 ? ` → ${st.termostato}°` : ''}`;
    metti(timerEl, 2.8, PAV + 0.78, 0.65);
    timerEl.textContent = st.timer ? (resta > 0 ? `${Math.floor(resta / 60)}:${String(Math.floor(resta % 60)).padStart(2, '0')}` : resta > -8 ? 'ding!' : '') : '';
    metti(zzz, gatto.position.x, gatto.position.y + 0.4, gatto.position.z);
    zzz.style.opacity = micio.fare === 'dorme' && micio.pose.sdraio > 0.8 ? String(0.5 + 0.4 * Math.sin(s * 1.7)) : '0';
    // Sotto il mouse: il nome dell'oggetto, nella lingua della pagina
    const colpo = pp.raggio ? pp.raggio.intersectObjects(oggetti.map(o => o.presa), false)[0] : undefined;
    if (colpo) { const o = oggetti.find(x => x.presa === colpo.object)!; sopraEl.textContent = o.nome[0]; colpo.object.getWorldPosition(tmp2); casa.worldToLocal(tmp2); metti(sopraEl, tmp2.x, tmp2.y + 0.3, tmp2.z); sopraEl.style.opacity = '1'; }
    else sopraEl.style.opacity = '0';
  }

  function clic(raggio: THREE.Raycaster) {
    const colpo = raggio.intersectObjects([...pavimenti.keys()], false)[0];
    if (!colpo) { fuocoS = null; return; }
    // I pavimenti delle stanze stanno sopra il prato: vince la stanza
    const stanza = raggio.intersectObjects([...pavimenti.keys()].filter(o => pavimenti.get(o) !== 'giardino'), false)[0];
    alClic(pavimenti.get((stanza ?? colpo).object)!);
  }
  return {
    imposta,
    fuoco: (s, durata = 5) => { fuocoS = s; fuocoFino = sTempo + durata; },
    dove: s => { dove = s; },
  };
}
