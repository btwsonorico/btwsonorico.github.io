import * as THREE from 'three';
import { casuale, mat, pezzo, sasso, terreno, puntiMorbidi, palco, SITO, tema, type Palco } from './natura';
import { NOMI, STANZE, type Stanza, type Stato } from '../lib/casa';

// La casa di /learn/decision/: una casa delle bambole a filo, senza tetto, in un piccolo giardino. Sei stanze con le porte,
// i mobili, le finestre con le tapparelle, le luci a sospensione, i termosifoni, la TV, la cassa, la macchina del caffè e un robot
// aspirapolvere che va di stanza in stanza passando dalle porte. Il sole e la luna girano sopra la casa: di notte le luci
// accese brillano anche dalle finestre, di giorno il sole entra dalle tapparelle aperte. Quello che succede lo decide il
// decision model: la scena mostra soltanto lo stato della casa (src/lib/casa.ts).

const H = 1.15, SP = 0.08, DAVANZALE = 0.42, ARCHITRAVE = 0.95, PORTA = 0.9;
type Box = { x0: number; x1: number; z0: number; z1: number };
export const PIANTA: Record<Stanza, Box> = {
  camera: { x0: -4.5, x1: -1.5, z0: -3, z1: 0 },
  bagno: { x0: -1.5, x1: 0.5, z0: -3, z1: 0 },
  studio: { x0: 0.5, x1: 4.5, z0: -3, z1: 0 },
  cucina: { x0: -4.5, x1: -0.5, z0: 0, z1: 3 },
  soggiorno: { x0: -0.5, x1: 3, z0: 0, z1: 3 },
  ingresso: { x0: 3, x1: 4.5, z0: 0, z1: 3 },
};
const centro = (s: Stanza) => { const b = PIANTA[s]; return new THREE.Vector3((b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2); };
// Porte fra le stanze: il robot passa da qui
const PORTE: [Stanza, Stanza, number, number][] = [['ingresso', 'soggiorno', 3, 1.5], ['cucina', 'soggiorno', -0.5, 1.5], ['bagno', 'soggiorno', 0, 0], ['studio', 'soggiorno', 2, 0], ['camera', 'cucina', -3, 0]];

export type Vista = { imposta: (s: Stato) => void; fuoco: (s: Stanza | null, durata?: number) => void; dove: (s: Stanza) => void; ora: { valore: number; corre: boolean } };

export function montaCasa(el: HTMLElement, etichette: HTMLElement, alClic: (s: Stanza) => void): Vista {
  const r = casuale(21), chiaro = tema();
  const p = palco(el, {
    camera: new THREE.Vector3(0, 8.2, 9.6), mira: new THREE.Vector3(0, 0.2, 0.3), fov: 38, giro: 0.006, inclina: [-0.3, 0.22], zoom: [0.55, 1.35], nebbia: [1.3, 2.6],
    aggiorna, clic, scena: 'casa', toni: SITO,
  });
  const casa = new THREE.Group();
  p.gruppo.add(casa);

  // --- Materiali. Tutti si scuriscono di notte: si tiene l'opacità di partenza
  const scuri: { m: THREE.Material & { opacity: number }; base: number }[] = [];
  const m = (c: string, o: Parameters<typeof mat>[1] = {}) => {
    const x = mat(c, { opacity: chiaro ? 0.2 : 0.13, fili: 0.75, ...o });
    scuri.push({ m: x, base: x.opacity });
    const l = x.userData.linea as THREE.LineBasicMaterial | undefined;
    if (l) scuri.push({ m: l, base: l.opacity });
    return x;
  };
  const M = {
    muro: m('#a0a0a0', { fili: 0.8 }), legno: m('#c98a52'), scuro: m('#8a5a2b'), tessuto: m('#6d97c4'), lenzuola: m('#d9ecf2'), piastrelle: m('#9fc3d9', { opacity: chiaro ? 0.12 : 0.08, fili: 0.35 }),
    parquet: m('#d9a066', { opacity: chiaro ? 0.12 : 0.08, fili: 0.3 }), verde: m('#5aa65a'), foglie: m('#7cbf5f'), metallo: m('#9aa6b2'), bianco: m('#e8e2d6'), tappeto: m('#e0583a', { opacity: chiaro ? 0.16 : 0.12, fili: 0.4 }),
  };
  const box = (w: number, h: number, d: number, x: number, z: number, y0: number, mm: THREE.Material, g: THREE.Object3D = casa) => { const o = pezzo(new THREE.BoxGeometry(w, h, d), mm, x, y0 + h / 2, z); g.add(o); return o; };

  // --- Giardino: prato a punti, alberi, cespugli, il vialetto davanti alla porta
  terreno(p.gruppo, p.colori.verde, 8.6, () => 0, true);
  const albero = (x: number, z: number, alto: number) => {
    const tronco = pezzo(new THREE.CylinderGeometry(0.05, 0.07, alto * 0.45, 6), M.scuro, x, alto * 0.22, z);
    const chioma = pezzo(sasso(alto * 0.32, r, 1), M.foglie, x, alto * 0.62, z);
    p.gruppo.add(tronco, chioma);
  };
  [[-6.2, -2.5, 1.9], [-5.8, 3.6, 1.4], [6.1, -3.2, 1.7], [6.4, 2.2, 1.2], [-2.5, -5.4, 1.5], [2.2, -5.6, 2], [-6.8, 0.6, 1.1]].forEach(([x, z, a]) => albero(x!, z!, a!));
  for (let k = 0; k < 14; k++) {
    const a = r() * Math.PI * 2, d = 5.6 + r() * 2.2, x = Math.cos(a) * d * 1.05, z = Math.sin(a) * d * 0.8;
    p.gruppo.add(pezzo(sasso(0.14 + r() * 0.16, r), M.verde, x, 0.1, z));
  }
  for (let k = 0; k < 7; k++) { const s = pezzo(new THREE.BoxGeometry(0.42, 0.02, 0.28), M.metallo, 3.75 + (k % 2 ? 0.08 : -0.08), 0.01, 3.55 + k * 0.5); s.rotation.y = (r() - 0.5) * 0.3; p.gruppo.add(s); }

  // --- Pavimenti: uno per stanza, cliccabili
  const pavimenti = new Map<THREE.Object3D, Stanza>();
  for (const s of STANZE) {
    const b = PIANTA[s], f = pezzo(new THREE.PlaneGeometry(b.x1 - b.x0 - 0.02, b.z1 - b.z0 - 0.02), s === 'bagno' || s === 'cucina' ? M.piastrelle : M.parquet, (b.x0 + b.x1) / 2, 0.005, (b.z0 + b.z1) / 2);
    f.rotation.x = -Math.PI / 2;
    casa.add(f); pavimenti.set(f, s);
  }
  casa.add(pezzo(new THREE.BoxGeometry(9.3, 0.06, 6.3), m('#a89a88', { opacity: chiaro ? 0.1 : 0.06, fili: 0.5 }), 0, -0.03, 0));

  // --- Muri con porte e finestre. Ogni finestra ha la sua stanza, una tapparella, il vetro che brilla di notte e la macchia di sole
  type Finestra = { stanza: Stanza; tapparella: THREE.Object3D; vetro: THREE.MeshBasicMaterial; sole: THREE.MeshBasicMaterial; alta: number };
  const finestre: Finestra[] = [];
  type Apertura = { c: number; w: number; tipo: 'porta' | 'finestra'; stanza?: Stanza; dentro?: number };
  function muro(x0: number, z0: number, x1: number, z1: number, aperture: Apertura[] = []) {
    const lungoX = z0 === z1, a = lungoX ? x0 : z0, b = lungoX ? x1 : z1;
    const pezzoMuro = (da: number, al: number, y0: number, y1: number) => {
      if (al - da < 0.01 || y1 - y0 < 0.01) return;
      const c = (da + al) / 2, l = al - da;
      box(lungoX ? l : SP, y1 - y0, lungoX ? SP : l, lungoX ? c : x0, lungoX ? z0 : c, y0, M.muro);
    };
    let cur = a;
    for (const ap of [...aperture].sort((p, q) => p.c - q.c)) {
      const da = ap.c - ap.w / 2, al = ap.c + ap.w / 2;
      pezzoMuro(cur, da, 0, H);
      if (ap.tipo === 'porta') pezzoMuro(da, al, PORTA, H);
      else {
        pezzoMuro(da, al, 0, DAVANZALE); pezzoMuro(da, al, ARCHITRAVE, H);
        const alta = ARCHITRAVE - DAVANZALE, x = lungoX ? ap.c : x0, z = lungoX ? z0 : ap.c, rot = lungoX ? 0 : Math.PI / 2;
        const vetro = new THREE.MeshBasicMaterial({ color: '#ffd9a6', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
        const v = new THREE.Mesh(new THREE.PlaneGeometry(ap.w, alta), vetro); v.position.set(x, DAVANZALE + alta / 2, z); v.rotation.y = rot; casa.add(v);
        const tap = pezzo(new THREE.PlaneGeometry(ap.w, alta), m('#c9b48a', { opacity: chiaro ? 0.45 : 0.35, fili: 0.7, side: THREE.DoubleSide }));
        const perno = new THREE.Group(); perno.position.set(x, ARCHITRAVE, z); perno.rotation.y = rot; perno.add(tap); tap.position.y = -alta / 2; casa.add(perno);
        // Righe della tapparella
        const righe: THREE.Vector3[] = [];
        for (let k = 1; k < 6; k++) { const y = -alta / 2 + (k * alta) / 6; righe.push(new THREE.Vector3(-ap.w / 2, y, 0.001), new THREE.Vector3(ap.w / 2, y, 0.001)); }
        tap.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(righe), new THREE.LineBasicMaterial({ color: p.colori.arancio, transparent: true, opacity: 0.5 })));
        const sole = new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0, depthWrite: false });
        const macchia = new THREE.Mesh(new THREE.PlaneGeometry(ap.w * 1.05, 0.9), sole);
        macchia.rotation.x = -Math.PI / 2; macchia.rotation.z = lungoX ? 0 : Math.PI / 2;
        macchia.position.set(lungoX ? x : x + (ap.dentro ?? 1) * 0.5, 0.012, lungoX ? z + (ap.dentro ?? 1) * 0.5 : z);
        casa.add(macchia);
        finestre.push({ stanza: ap.stanza!, tapparella: perno, vetro, sole, alta });
      }
      cur = al;
    }
    pezzoMuro(cur, b, 0, H);
  }
  muro(-4.5, -3, 4.5, -3, [{ c: -3, w: 1.1, tipo: 'finestra', stanza: 'camera', dentro: 1 }, { c: -0.5, w: 0.6, tipo: 'finestra', stanza: 'bagno', dentro: 1 }, { c: 2.5, w: 1.3, tipo: 'finestra', stanza: 'studio', dentro: 1 }]);
  muro(-4.5, 3, 4.5, 3, [{ c: -2.5, w: 1.2, tipo: 'finestra', stanza: 'cucina', dentro: -1 }, { c: 1.25, w: 1.6, tipo: 'finestra', stanza: 'soggiorno', dentro: -1 }, { c: 3.75, w: 0.7, tipo: 'porta' }]);
  muro(-4.5, -3, -4.5, 3, [{ c: -1.5, w: 1, tipo: 'finestra', stanza: 'camera', dentro: 1 }, { c: 1.5, w: 1, tipo: 'finestra', stanza: 'cucina', dentro: 1 }]);
  muro(4.5, -3, 4.5, 3, [{ c: -1.5, w: 1, tipo: 'finestra', stanza: 'studio', dentro: -1 }, { c: 1.5, w: 0.6, tipo: 'finestra', stanza: 'ingresso', dentro: -1 }]);
  muro(-4.5, 0, 4.5, 0, [{ c: -3, w: 0.7, tipo: 'porta' }, { c: 0, w: 0.7, tipo: 'porta' }, { c: 2, w: 0.7, tipo: 'porta' }]);
  muro(-1.5, -3, -1.5, 0); muro(0.5, -3, 0.5, 0);
  muro(-0.5, 0, -0.5, 3, [{ c: 1.5, w: 0.8, tipo: 'porta' }]);
  muro(3, 0, 3, 3, [{ c: 1.5, w: 0.8, tipo: 'porta' }]);

  // --- Mobili
  // Camera: letto, comodini, armadio
  box(1.5, 0.28, 2, -3, -1.75, 0, M.legno); box(1.4, 0.1, 1.5, -3, -1.55, 0.28, M.lenzuola); box(0.5, 0.12, 0.32, -3.35, -2.55, 0.28, M.bianco); box(0.5, 0.12, 0.32, -2.65, -2.55, 0.28, M.bianco);
  box(0.36, 0.4, 0.36, -4.05, -2.6, 0, M.legno); box(0.36, 0.4, 0.36, -1.95, -2.6, 0, M.legno); box(1.2, 1, 0.45, -2.3, -0.32, 0, M.scuro);
  // Bagno: vasca, lavandino, wc
  box(0.75, 0.38, 1.4, -1.05, -2.2, 0, M.bianco); box(0.5, 0.6, 0.35, 0.15, -2.75, 0, M.bianco); box(0.35, 0.36, 0.45, 0.2, -1.3, 0, M.bianco);
  // Studio: scrivania, sedia, libreria, pianta
  box(1.5, 0.05, 0.6, 2.5, -2.55, 0.5, M.legno); box(0.05, 0.5, 0.55, 1.8, -2.55, 0, M.legno); box(0.05, 0.5, 0.55, 3.2, -2.55, 0, M.legno); box(0.42, 0.42, 0.42, 2.5, -1.95, 0, M.tessuto);
  box(0.35, 1.05, 1.6, 4.22, -1.55, 0, M.scuro); for (let k = 0; k < 3; k++) box(0.3, 0.02, 1.5, 4.22, -1.55, 0.3 + k * 0.3, M.legno);
  casa.add(pezzo(sasso(0.22, r, 1), M.foglie, 1.0, 0.45, -0.45)); box(0.22, 0.25, 0.22, 1.0, -0.45, 0, M.scuro);
  // Cucina: bancone, macchina del caffè, tavolo e sedie
  box(3, 0.52, 0.55, -2.8, 0.32, 0, M.legno); box(3, 0.04, 0.6, -2.8, 0.32, 0.52, M.metallo); box(0.55, 0.52, 1.6, -4.17, 1.4, 0, M.legno);
  const caffettiera = box(0.24, 0.32, 0.22, -1.65, 0.3, 0.56, M.scuro);
  const tazza = pezzo(new THREE.CylinderGeometry(0.04, 0.035, 0.06, 8), M.bianco, -1.65, 0.6, 0.47); tazza.visible = false; casa.add(tazza);
  box(1.1, 0.05, 0.75, -2.3, 2.0, 0.45, M.legno); for (const [dx, dz] of [[-0.35, -0.55], [0.35, -0.55], [-0.35, 0.55], [0.35, 0.55]]) box(0.3, 0.32, 0.3, -2.3 + dx!, 2.0 + dz!, 0, M.tessuto);
  // Soggiorno: divano, tappeto, mobile TV, TV, cassa, poltrona
  box(1.8, 0.3, 0.7, 1.25, 2.45, 0, M.tessuto); box(1.8, 0.35, 0.18, 1.25, 2.8, 0.3, M.tessuto); box(0.2, 0.22, 0.7, 0.25, 2.45, 0.3, M.tessuto); box(0.2, 0.22, 0.7, 2.25, 2.45, 0.3, M.tessuto);
  const tappeto = pezzo(new THREE.PlaneGeometry(1.9, 1.1), M.tappeto, 1.25, 0.01, 1.4); tappeto.rotation.x = -Math.PI / 2; casa.add(tappeto);
  box(1.5, 0.3, 0.35, 1.25, 0.25, 0, M.scuro);
  const schermo = new THREE.MeshBasicMaterial({ color: p.colori.fg, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.62), schermo); tv.position.set(1.25, 0.68, 0.17); casa.add(tv);
  box(1.2, 0.68, 0.04, 1.25, 0.12, 0.34, M.metallo);
  box(0.22, 0.62, 0.22, 2.7, 0.3, 0, M.scuro); casa.add(pezzo(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10), M.metallo, 2.7, 0.45, 0.42));
  // Ingresso: attaccapanni, tappetino, termostato, base del robot
  box(0.06, 1, 0.06, 4.25, 0.35, 0, M.scuro); box(0.7, 0.01, 0.4, 3.75, 2.6, 0, M.tappeto);
  const termostato = box(0.03, 0.16, 0.12, 3.06, 2.2, 0.72, M.bianco);
  box(0.4, 0.02, 0.4, 4.15, 0.45, 0, M.metallo);

  // --- Luci: lampada a sospensione, alone e pozza di luce sul pavimento. I colori delle luci restano i loro, non quelli del sito
  const lampade = puntiMorbidi(STANZE.length + 1);
  p.scena.add(lampade.punti);
  const pozze = new Map<Stanza, THREE.MeshBasicMaterial>(), alone = new Map<Stanza, number>();
  STANZE.forEach((s, i) => {
    const c = centro(s), b = PIANTA[s];
    casa.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(c.x, H + 0.35, c.z), new THREE.Vector3(c.x, 0.98, c.z)]), new THREE.LineBasicMaterial({ color: p.colori.muted, transparent: true, opacity: 0.6 })));
    const paralume = pezzo(new THREE.ConeGeometry(0.13, 0.11, 10, 1, true), M.metallo, c.x, 0.94, c.z); casa.add(paralume);
    const pm = new THREE.MeshBasicMaterial({ color: '#ffd9a6', transparent: true, opacity: 0, depthWrite: false, blending: chiaro ? THREE.NormalBlending : THREE.AdditiveBlending });
    const pozza = new THREE.Mesh(new THREE.CircleGeometry(Math.min(b.x1 - b.x0, b.z1 - b.z0) * 0.48, 40), pm); pozza.rotation.x = -Math.PI / 2; pozza.position.set(c.x, 0.015, c.z); casa.add(pozza);
    pozze.set(s, pm); alone.set(s, i);
  });
  // Termosifoni: uno per stanza, si accendono di arancio quando la casa scalda
  const caldi: THREE.MeshBasicMaterial[] = [];
  for (const [x, z, ry] of [[-4.42, -0.8, Math.PI / 2], [-0.1, -0.12, 0], [3.8, -0.12, 0], [-4.42, 2.4, Math.PI / 2], [0.1, 2.92, 0], [4.42, 0.6, Math.PI / 2]] as const) {
    const t = pezzo(new THREE.BoxGeometry(0.5, 0.28, 0.06), M.metallo, x, 0.32, z); t.rotation.y = ry; casa.add(t);
    const cm = new THREE.MeshBasicMaterial({ color: '#ff8a3d', transparent: true, opacity: 0, depthWrite: false });
    const g = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.34), cm); g.position.set(x, 0.32, z); g.rotation.y = ry; casa.add(g); caldi.push(cm);
  }

  // --- Robot aspirapolvere
  const robot = new THREE.Group();
  robot.add(pezzo(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 16), M.metallo, 0, 0.035, 0));
  const spia = new THREE.MeshBasicMaterial({ color: p.colori.verde, transparent: true, opacity: 0.9 });
  const sp = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), spia); sp.position.set(0, 0.08, 0.1); robot.add(sp);
  robot.position.set(4.15, 0.02, 0.45); casa.add(robot);
  const BASE_ROBOT = new THREE.Vector3(4.15, 0.02, 0.45);
  let percorso: THREE.Vector3[] = [], stanzaRobot: Stanza = 'ingresso';

  // --- Tu sei qui
  const tu = new THREE.Group();
  tu.add(pezzo(new THREE.CylinderGeometry(0.07, 0.1, 0.42, 10), m('#e0583a', { opacity: 0.35 }), 0, 0.21, 0), pezzo(new THREE.SphereGeometry(0.08, 10, 8), m('#e0583a', { opacity: 0.35 }), 0, 0.52, 0));
  casa.add(tu);
  let dove: Stanza = 'soggiorno';
  const posaTu = () => { const c = centro(dove); tu.position.set(c.x + (dove === 'soggiorno' ? -0.2 : 0.35), 0, c.z + (dove === 'soggiorno' ? 1.0 : 0.3)); };
  posaTu();

  // --- Particelle: vapore del caffè, note della musica
  const VAP = 18, NOTE = 26, part = puntiMorbidi(VAP + NOTE);
  p.scena.add(part.punti);
  const vita = new Float32Array(VAP + NOTE).map(() => Math.random());

  // --- Cielo: sole, luna, stelle (fuori dal gruppo: non si ingrandiscono con le stanze)
  const astri = puntiMorbidi(2);
  p.scena.add(astri.punti);
  const stelle = new THREE.BufferGeometry(), sv: number[] = [];
  for (let k = 0; k < 220; k++) { const a = r() * Math.PI * 2, e = 0.15 + r() * 1.2, d = 16; sv.push(Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d * 0.7 + 1, Math.sin(a) * Math.cos(e) * d - 4); }
  stelle.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
  const matStelle = new THREE.PointsMaterial({ color: chiaro ? '#fff6dc' : '#e8eefc', size: 0.06, transparent: true, opacity: 0, depthWrite: false });
  p.scena.add(new THREE.Points(stelle, matStelle));

  // --- Etichette HTML sopra le stanze, e il termostato
  const nomiEl = new Map<Stanza, HTMLElement>();
  for (const s of STANZE) { const e = document.createElement('span'); e.className = 'etichetta-stanza'; e.textContent = NOMI[s].en; etichette.append(e); nomiEl.set(s, e); }
  const gradiEl = document.createElement('span'); gradiEl.className = 'etichetta-gradi'; etichette.append(gradiEl);

  // --- Stato
  let stato: Stato | null = null, prima: Stato | null = null, caffeFino = 0, gradi = 20.5, sTempo = 0;
  const luci = new Map<Stanza, { v: number; c: THREE.Color }>(STANZE.map(s => [s, { v: 0, c: new THREE.Color('#ffd9a6') }]));
  const tapp = new Map<Stanza, number>(STANZE.map(s => [s, 1]));
  const ora = { valore: 18.5, corre: true };
  let fuocoS: Stanza | null = null, fuocoFino = 0;

  function strada(da: Stanza, a: Stanza): THREE.Vector3[] {
    const vicini = (s: Stanza) => PORTE.filter(q => q[0] === s || q[1] === s).map(q => ({ s: q[0] === s ? q[1] : q[0], x: q[2], z: q[3] }));
    const visti = new Map<Stanza, { da: Stanza; x: number; z: number } | null>([[da, null]]), coda: Stanza[] = [da];
    while (coda.length) { const s = coda.shift()!; for (const v of vicini(s)) if (!visti.has(v.s)) { visti.set(v.s, { da: s, x: v.x, z: v.z }); coda.push(v.s); } }
    const punti: THREE.Vector3[] = [];
    for (let s = a; s !== da;) { const v = visti.get(s)!; punti.unshift(new THREE.Vector3(v.x, 0.02, v.z)); s = v.da; }
    return punti;
  }
  function pulisci(stanze: Stanza[]) {
    percorso = [];
    let qui = stanzaRobot;
    for (const s of stanze) {
      percorso.push(...strada(qui, s));
      const b = PIANTA[s], m0 = 0.42;
      for (let k = 0; k < 4; k++) { const z = b.z0 + m0 + ((b.z1 - b.z0 - 2 * m0) * k) / 3; percorso.push(new THREE.Vector3(k % 2 ? b.x1 - m0 : b.x0 + m0, 0.02, z), new THREE.Vector3(k % 2 ? b.x0 + m0 : b.x1 - m0, 0.02, z)); }
      qui = s;
    }
    percorso.push(...strada(qui, 'ingresso'), BASE_ROBOT.clone());
    (percorso as (THREE.Vector3 & { stanza?: Stanza })[]).forEach(v => { v.stanza = stanzaDi(v.x, v.z) ?? undefined; });
  }
  const stanzaDi = (x: number, z: number) => STANZE.find(s => { const b = PIANTA[s]; return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1; }) ?? null;

  function imposta(s: Stato) {
    prima = stato; stato = s;
    if (!prima || s.caffe !== prima.caffe) { if (prima) caffeFino = sTempo + 8; }
    if (prima && s.giri !== prima.giri) pulisci(s.pulizia);
  }

  const tmp = new THREE.Vector3(), vista = new THREE.Vector3(), coloreVoluto = new THREE.Color();
  function aggiorna(s: number, dt: number, pp: Palco) {
    sTempo = s;
    if (ora.corre && !pp.ridotto) ora.valore = (ora.valore + dt / 6) % 24;
    // Giorno e notte: il sole sale dalle 6 alle 18
    const ang = ((ora.valore - 6) / 12) * Math.PI, sopra = Math.sin(ang), giorno = THREE.MathUtils.clamp(sopra * 2.4 + 0.35, 0, 1), notte = 1 - giorno;
    el.style.setProperty('--notte', notte.toFixed(3));
    scuri.forEach(x => { x.m.opacity = x.base * (0.55 + 0.45 * giorno) * (chiaro ? 1 : 0.85 + 0.15 * giorno); });
    matStelle.opacity = notte * 0.8;
    const R = 11;
    astri.pos.set([Math.cos(ang) * R, Math.sin(ang) * R * 0.6 + 0.5, -5, -Math.cos(ang) * R, -Math.sin(ang) * R * 0.6 + 0.5, -5]);
    astri.col.set([1, 0.78, 0.45, 0.86, 0.9, 1]); astri.dim.set([3.2, 2]); astri.alfa.set([sopra > -0.1 ? 0.9 : 0, sopra < 0.1 ? 0.75 : 0]);
    astri.aggiorna();

    const st = stato;
    if (st) {
      // Luci: ogni stanza va piano verso la sua luce e il suo colore
      STANZE.forEach((k, i) => {
        const l = luci.get(k)!, voluta = st.stanze[k];
        l.v += (voluta.luce - l.v) * Math.min(1, dt * 4); l.c.lerp(coloreVoluto.set(voluta.colore), Math.min(1, dt * 4));
        tapp.set(k, tapp.get(k)! + (voluta.tapparelle - tapp.get(k)!) * Math.min(1, dt * 2.5));
        const c = centro(k), wp = casa.localToWorld(tmp.set(c.x, 0.9, c.z));
        lampade.pos.set([wp.x, wp.y, wp.z], i * 3); lampade.col.set([l.c.r, l.c.g, l.c.b], i * 3);
        lampade.dim[i] = (1.1 + 1.3 * l.v) * casa.scale.x; lampade.alfa[i] = l.v * (0.3 + 0.55 * notte) * (chiaro ? 0.8 : 1);
        const pm = pozze.get(k)!; pm.color.copy(l.c); pm.opacity = l.v * (0.1 + 0.32 * notte) * (chiaro ? 0.9 : 1);
      });
      // TV: un fondo che cambia colore e sfarfalla; davanti la sua luce
      const accesa = st.tv;
      if (accesa) { schermo.color.setHSL((s * 0.05) % 1, 0.55, 0.55 + 0.08 * Math.sin(s * 9)); schermo.opacity = 0.75; }
      else { schermo.color.copy(p.colori.fg); schermo.opacity = 0.1; }
      const tvp = casa.localToWorld(tmp.set(1.25, 0.6, 0.6));
      lampade.pos.set([tvp.x, tvp.y, tvp.z], STANZE.length * 3); lampade.col.set([schermo.color.r, schermo.color.g, schermo.color.b], STANZE.length * 3);
      lampade.dim[STANZE.length] = 2.2 * casa.scale.x; lampade.alfa[STANZE.length] = accesa ? 0.25 + 0.4 * notte : 0;
      lampade.aggiorna();
      // Finestre: tapparelle, vetri illuminati di notte, sole sul pavimento di giorno
      for (const f of finestre) {
        const t = tapp.get(f.stanza)!, l = luci.get(f.stanza)!;
        f.tapparella.scale.y = Math.max(0.02, 1 - t);
        f.vetro.color.copy(l.c); f.vetro.opacity = l.v * notte * 0.55 * (0.4 + 0.6 * t);
        f.sole.opacity = giorno * t * 0.2;
      }
      // Riscaldamento: la temperatura vera segue piano quella voluta
      gradi += Math.sign(st.termostato - gradi) * Math.min(Math.abs(st.termostato - gradi), dt * 0.35);
      const scalda = st.termostato - gradi > 0.05;
      caldi.forEach(c => { c.opacity = scalda ? 0.35 + 0.15 * Math.sin(s * 2) : 0; });
      // Caffè: vapore per qualche secondo, poi la tazza resta
      const fa = s < caffeFino;
      tazza.visible = st.caffe > 0;
      // Musica: note che salgono dalla cassa, tante quanto il volume
      const suona = st.musica && !st.muto;
      for (let i = 0; i < VAP + NOTE; i++) {
        const vapore = i < VAP;
        vita[i] = (vita[i]! + dt * (vapore ? 0.55 : 0.4)) % 1;
        const v = vita[i]!, ox = vapore ? -1.65 : 2.7, oz = vapore ? 0.3 : 0.3, oy = vapore ? 0.9 : 0.65;
        const w = casa.localToWorld(tmp.set(ox + Math.sin(v * 9 + i) * (vapore ? 0.04 : 0.25) * v, oy + v * (vapore ? 0.55 : 0.9), oz + Math.cos(v * 7 + i) * (vapore ? 0.04 : 0.2) * v));
        part.pos.set([w.x, w.y, w.z], i * 3);
        if (vapore) { part.col.set([1, 1, 1], i * 3); part.dim[i] = (0.12 + v * 0.25) * casa.scale.x; part.alfa[i] = fa ? (1 - v) * 0.45 : 0; }
        else { const c = i % 3 === 0 ? p.colori.arancio : i % 3 === 1 ? p.colori.azzurro : p.colori.verde; part.col.set([c.r, c.g, c.b], i * 3); part.dim[i] = 0.1 * casa.scale.x; part.alfa[i] = suona && (i - VAP) / NOTE < st.volume + 0.1 ? (1 - v) * 0.9 : 0; }
      }
      part.aggiorna();
    }
    // Robot: segue il percorso, gira dove va, la spia lampeggia mentre lavora
    if (percorso.length) {
      const meta = percorso[0]!, d = meta.clone().sub(robot.position), dist = d.length(), passo = dt * 0.9;
      if (dist < passo) { robot.position.copy(meta); percorso.shift(); } else { robot.position.addScaledVector(d.normalize(), passo); robot.rotation.y = Math.atan2(d.x, d.z); }
      stanzaRobot = stanzaDi(robot.position.x, robot.position.z) ?? stanzaRobot;
      spia.color.copy(p.colori.arancio); spia.opacity = 0.5 + 0.5 * Math.sin(s * 8);
    } else { spia.color.copy(p.colori.verde); spia.opacity = 0.9; }

    // Vista su una stanza: la casa si sposta e si ingrandisce, poi torna intera
    if (fuocoS && s > fuocoFino) fuocoS = null;
    const sc = fuocoS ? 1.6 : 1, c = fuocoS ? centro(fuocoS) : vista.set(0, 0, 0);
    const k = Math.min(1, dt * 2.6);
    casa.scale.setScalar(casa.scale.x + (sc - casa.scale.x) * k);
    p.gruppo.position.x += (-c.x * sc - p.gruppo.position.x) * k; p.gruppo.position.z += (-c.z * sc - p.gruppo.position.z) * k;
    // Vicino a una stanza il giardino si nasconde: resta la casa
    p.gruppo.children.forEach(o => { if (o !== casa) o.visible = !fuocoS || casa.scale.x < 1.2; });
    // Etichette: sopra ogni stanza, e il termostato con i gradi
    const w = el.clientWidth, h = el.clientHeight;
    for (const st2 of STANZE) {
      const e = nomiEl.get(st2)!, cc = centro(st2), q = casa.localToWorld(tmp.set(cc.x, H + 0.25, cc.z)).project(pp.camera);
      e.style.transform = `translate(${((q.x + 1) / 2) * w}px, ${((1 - q.y) / 2) * h}px) translate(-50%, -100%)`;
      e.style.opacity = q.z < 1 && (!fuocoS || fuocoS === st2) ? '1' : '0';
      e.classList.toggle('qui', st2 === dove);
    }
    const tq = casa.localToWorld(tmp.set(3.1, 0.95, 2.2)).project(pp.camera);
    gradiEl.style.transform = `translate(${((tq.x + 1) / 2) * w}px, ${((1 - tq.y) / 2) * h}px) translate(-50%, -100%)`;
    if (stato) gradiEl.textContent = `${gradi.toFixed(1)}°${Math.abs(stato.termostato - gradi) > 0.05 ? ` → ${stato.termostato}°` : ''}`;
  }
  // Il termostato è un oggetto della scena, anche se il numero sta nell'etichetta
  void termostato; void caffettiera;

  function clic(raggio: THREE.Raycaster) {
    const colpo = raggio.intersectObjects([...pavimenti.keys()], false)[0];
    if (!colpo) { fuocoS = null; return; }
    const s = pavimenti.get(colpo.object)!;
    alClic(s);
  }
  return {
    imposta,
    fuoco: (s, durata = 5) => { fuocoS = s; fuocoFino = sTempo + durata; },
    dove: s => { dove = s; posaTu(); },
    ora,
  };
}
