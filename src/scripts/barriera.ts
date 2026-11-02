import * as THREE from 'three';
import { casuale, mat as matSito, pezzo, scuoti, sasso, unisci, terreno, nastri, puntiMorbidi, palco, tema, type Extra, type Nastro, type Palco } from './natura';

// Barriera corallina: un fondale aperto, tutto sott'acqua, nello stile del laghetto. Al centro una torre di rocce a
// terrazze; intorno, da ogni lato, alghe, coralli, anemoni, ricci, vongole, un forziere e due colonne antiche:
// girando piano si scopre tutto. Dall'alto scendono i raggi del sole, l'acqua è piena di particelle sospese.
// Tutto si muove con la stessa corrente: la risacca va e viene, le alghe ondeggiano, la neve marina scorre.
// Banchi di pesciolini nuotano insieme e scappano dal puntatore; un clic sull'acqua fa cadere il mangime.

const LATO = 3, ACQUA = 4.8;
const SU = new THREE.Vector3(0, 1, 0);

export function monta(el: HTMLElement) {
  const r = casuale(11);
  const chiaro = tema();
  const p = palco(el, {
    camera: new THREE.Vector3(0, 3.6, 9.6), mira: new THREE.Vector3(0, 1.9, 0), giro: 0.02, inclina: [-0.12, 0.3], aggiorna, clic,
    scena: 'barriera', toni: [getComputedStyle(document.documentElement).getPropertyValue('--azzurro').trim(), chiaro ? '#8f8272' : '#a89a88', chiaro ? '#e0352a' : '#ff4a3d'],
  });
  const g = p.gruppo;

  // --- Tavolozza a tre colori: 60% blu-azzurro (acqua, alghe, rocce, meduse, quasi tutti i pesci), 30% grigio terra
  // un po' aranciato (sabbia, pietre, colonne, coralli duri, forziere), 10% rosso acceso (un banco, i pesci
  // pagliaccio, il granchio, una stella, un corallo, un ventaglio, un anemone, il mangime).
  // Ogni colore della scena ha la sua famiglia e una sfumatura (più chiaro o più scuro della base).
  const BASE = { b: p.toni[0]!.clone(), t: p.toni[1]!.clone(), r: p.toni[2]!.clone() };
  const CATALOGO: Record<string, ['b' | 't' | 'r', number]> = {
    // Blu-azzurro
    '#4f7cad': ['b', 0], '#3e6795': ['b', -0.08], '#6d97c4': ['b', 0.07], '#6f8db0': ['b', -0.03],
    '#5aa65a': ['b', 0], '#4a8f5c': ['b', -0.07], '#7cbf5f': ['b', 0.07], '#e7a83c': ['b', 0.12],
    '#9b72d6': ['r', -0.1], '#4fb3c9': ['r', 0.06], '#c3d36a': ['r', 0.1], '#c38bff': ['r', 0.04],
    '#5e2f8f': ['b', -0.14], '#3b1a5e': ['b', -0.18], '#d9c3e8': ['b', 0.14], '#35587f': ['b', -0.1],
    '#ff9ec7': ['b', 0.12], '#ffc2a0': ['b', 0.05], '#c9a6ff': ['b', 0.16], '#d9ecf2': ['b', 0.16], '#f7cf4f': ['b', 0.04],
    // Grigio terra
    '#9aa6b2': ['t', 0], '#c9b48a': ['t', 0.06], '#dcd0b2': ['t', 0.1], '#86a85a': ['t', -0.06],
    '#ff9fb4': ['r', 0.1], '#f6b24a': ['r', 0.14], '#f07aa0': ['r', -0.04], '#e7a6c9': ['r', 0.12],
    '#f08a4b': ['r', -0.08], '#ffb36b': ['r', 0.08], '#d9774f': ['r', -0.16], '#f0c9a8': ['t', 0.08],
    '#fffaf0': ['t', 0.2], '#f08a3c': ['t', 0], '#f6c14a': ['t', 0.08], '#8a5a2b': ['t', -0.12],
    '#f2c14e': ['t', 0.12], '#ffd75e': ['t', 0.16],
    // Rosso acceso
    '#f0603f': ['r', 0], '#ff7a1a': ['r', 0.04], '#e0583a': ['r', -0.02], '#b8442a': ['r', -0.12],
    '#e8505b': ['r', 0.02], '#f2836b': ['r', 0.05], '#e3566f': ['r', 0], '#ff8fb1': ['r', 0.08],
  };
  // Il rosso dei coralli varia un poco anche di tinta (verso il corallo e verso il lampone), così non sono tutti uguali
  const colore = (hex: string) => {
    const [f, dl] = CATALOGO[hex] ?? ['b', 0];
    return BASE[f].clone().offsetHSL(f === 'r' ? dl * 0.15 : 0, 0, dl * (p.chiaro ? 0.7 : 1));
  };
  // Fili in primo piano, riempimenti leggeri: si vede la trama delle forme
  const mat = (hex: string, extra: Extra = {}) => matSito(colore(hex), { grezzo: true, opacity: p.chiaro ? 0.2 : 0.16, fili: 0.45, ...extra });
  const linea = (hex: string, opacita = 0.9) => new THREE.LineBasicMaterial({ color: colore(hex), transparent: true, opacity: opacita });
  // --- Corrente del mare: una direzione che cambia piano e una risacca che va e viene, uguale per tutti
  const corrente = new THREE.Vector2();
  const mare = (s: number) => {
    const a = 0.6 + Math.sin(s * 0.02) * 0.5;
    const spinta = 0.13 + 0.05 * Math.sin(s * 0.42) + 0.015 * Math.sin(s * 1.07);
    return corrente.set(Math.cos(a) * spinta, Math.sin(a) * spinta);
  };

  // --- Fondale: dune basse e una collinetta sotto le rocce; verso il bordo il fondo torna piano
  const altezza = (x: number, z: number) => {
    const bordo = Math.max(0, Math.min(1, (4.4 - Math.hypot(x, z)) / 1.2));
    return bordo * (0.06 + 0.07 * Math.sin(x * 1.6 + 1) * Math.cos(z * 1.2) + 0.04 * Math.sin(x * 3.3 + z * 2.1)
      + 0.45 * Math.exp(-(x * x + z * z) / 1.4));
  };
  terreno(g, BASE.b, 4.6, altezza);
  // Sassi sparsi sul fondo
  const sassi = [mat('#9aa6b2'), mat('#c9b48a'), mat('#6f8db0')];
  for (let k = 0; k < 16; k++) {
    const x = (r() - 0.5) * 5.6, z = (r() - 0.5) * 5.6, raggio = 0.03 + r() * 0.06;
    if (Math.hypot(x, z) < 1.7) continue;
    const s = pezzo(sasso(raggio, r), sassi[k % 3]!, x, altezza(x, z) + raggio * 0.3, z);
    s.scale.y = 0.6;
    g.add(s);
  }

  // --- Scoglio al centro: una roccia sola, modellata con onde di rumore e strati orizzontali, piena e ombreggiata
  // (più chiara dove guarda la luce, più scura in basso); poche linee solo dove la roccia piega di netto.
  // Due massi più piccoli dello stesso tipo ai lati.
  const scoglio = (scala: number, seme: number, x: number, z: number, giro: number) => {
    const geo = new THREE.IcosahedronGeometry(1, 4), q = geo.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
    const rumore = (a: number, b: number, c: number) => Math.sin(a * 2.1 + b * 1.3 + seme) * Math.cos(c * 1.7 - a * 0.6 + seme) * 0.5 + Math.sin(a * 4.3 - c * 3.1 + b * 2.7 + seme * 2) * 0.25 + Math.sin(b * 7 + a * 2 + seme) * 0.08;
    for (let i = 0; i < q.count; i++) {
      v.fromBufferAttribute(q, i).normalize();
      const k = 1 + rumore(v.x * 1.5, v.y * 1.5, v.z * 1.5) * 0.38;
      v.multiplyScalar(k);
      v.x *= 1.25;
      v.y = v.y > 0 ? v.y * 1.5 : v.y * 0.25;
      v.y += Math.sin(v.y * 11) * 0.025;
      q.setXYZ(i, v.x * scala, v.y * scala, v.z * scala);
    }
    geo.computeVertexNormals();
    // Ombreggiatura finta: luce dall'alto e di lato, più scuro verso il fondo
    const n = geo.attributes.normal as THREE.BufferAttribute, colori: number[] = [], luce = new THREE.Vector3(0.4, 1, 0.3).normalize(), base = colore('#3e6795').lerp(BASE.t, 0.45).offsetHSL(0, -0.15, 0), tinta = new THREE.Color();
    for (let i = 0; i < q.count; i++) {
      const l = Math.max(0, n.getX(i) * luce.x + n.getY(i) * luce.y + n.getZ(i) * luce.z), alto = THREE.MathUtils.clamp(q.getY(i) / (1.4 * scala), 0, 1);
      tinta.copy(base).multiplyScalar(0.38 + l * 0.42 + alto * 0.2);
      colori.push(tinta.r, tinta.g, tinta.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colori, 3));
    const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
    o.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 32), new THREE.LineBasicMaterial({ color: colore('#6d97c4'), transparent: true, opacity: 0.25 })));
    o.position.set(x, altezza(x, z) - 0.12 * scala, z);
    o.rotation.y = giro;
    g.add(o);
    return o;
  };
  scoglio(1, 0.7, 0, 0, 0.4);
  scoglio(0.42, 2.3, -2.5, -0.9, 1.2);
  scoglio(0.32, 4.1, 2.2, 1.6, 2.2);

  // --- Colonna antica in piedi, con un po' di muschio
  const pietra = mat('#dcd0b2'), muschio = mat('#86a85a');
  const colonna = new THREE.Group();
  colonna.add(pezzo(new THREE.BoxGeometry(0.5, 0.12, 0.5), pietra, 0, 0.06, 0));
  for (let k = 0; k < 3; k++) {
    const rocchio = pezzo(new THREE.CylinderGeometry(0.17, 0.18, 0.42, 8), pietra, 0, 0.33 + k * 0.43, 0);
    rocchio.rotation.y = k * 0.3;
    colonna.add(rocchio);
  }
  colonna.add(pezzo(new THREE.CylinderGeometry(0.26, 0.18, 0.14, 8), pietra, 0, 1.45, 0), pezzo(new THREE.BoxGeometry(0.52, 0.1, 0.52), pietra, 0, 1.57, 0));
  for (let k = 0; k < 7; k++) colonna.add(pezzo(sasso(0.06, r), muschio, (r() - 0.5) * 0.36, 0.15 + r() * 1.3, 0.17 * (r() > 0.5 ? 1 : -1)));
  colonna.position.set(2.15, altezza(2.15, -1.7), -1.7);
  colonna.rotation.set(0.06, 0.4, -0.05);
  g.add(colonna);
  // --- Kelp dorato sul fondo e alghe verdi basse sparse: tutti nastri mossi dalla corrente
  const fili: Nastro[] = [];
  const kelp = ['#5aa65a', '#4a8f5c', '#7cbf5f', '#e7a83c'].map(colore);
  const verdi = ['#5aa65a', '#4a8f5c', '#7cbf5f'].map(colore);
  for (let k = 0; k < 24; k++) {
    let x = 0, z = 0;
    const a = r() * Math.PI * 2, d = 1.8 + Math.sqrt(r()) * 2.2;
    x = Math.cos(a) * d; z = Math.sin(a) * d;
    fili.push({ x, z, y: altezza(x, z), alto: 0.8 + r() * 0.8, largo: 0.14 + r() * 0.08, angolo: r() * 6, fase: r() * 6, colore: kelp[k % 4]!, foglie: true });
  }
  for (let k = 0; k < 16; k++) {
    const x = -2.8 + r() * 5.6, z = -2.8 + r() * 5.6;
    if (Math.hypot(x, z) < 1.7) continue;
    fili.push({ x, z, y: altezza(x, z), alto: 0.22 + r() * 0.4, largo: 0.04 + r() * 0.03, angolo: r() * 6, fase: r() * 6, colore: verdi[k % 3]! });
  }
  const alghe = nastri(fili, 12, true);
  (alghe.mesh.material as THREE.MeshBasicMaterial).opacity = 0.07;
  ((alghe.mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.3;
  g.add(alghe.mesh);

  // --- Coralli
  const posa = <T extends THREE.Object3D>(o: T, x: number, z: number) => { o.position.set(x, altezza(x, z) - 0.02, z); g.add(o); return o; };
  // Corallo ramificato: rami che si dividono, uniti in una sola forma
  const ramificato = (colore: string, seme: number) => {
    const rr = casuale(seme), pezzi: THREE.BufferGeometry[] = [];
    const ramo = (da: THREE.Vector3, dir: THREE.Vector3, lungo: number, raggio: number, livello: number) => {
      const geo = new THREE.CylinderGeometry(raggio * 0.7, raggio, lungo, 5).translate(0, lungo / 2, 0);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(SU, dir)).translate(da.x, da.y, da.z);
      pezzi.push(geo);
      const fine = da.clone().addScaledVector(dir, lungo);
      if (livello === 0) { pezzi.push(new THREE.IcosahedronGeometry(raggio * 1.1, 0).translate(fine.x, fine.y, fine.z)); return; }
      for (let k = 0; k < 3; k++) {
        const nuova = dir.clone().add(new THREE.Vector3((rr() - 0.5) * 1.3, rr() * 0.5, (rr() - 0.5) * 1.3)).normalize();
        ramo(fine, nuova, lungo * 0.78, raggio * 0.72, livello - 1);
      }
    };
    ramo(new THREE.Vector3(), SU, 0.28, 0.06, 3);
    return pezzo(unisci(pezzi), mat(colore));
  };
  // Coralli a canne: tubi aperti di altezze diverse
  const canne = (colore: string, n: number) => {
    const pezzi: THREE.BufferGeometry[] = [];
    for (let k = 0; k < n; k++) {
      const h = 0.2 + r() * 0.45, a = k * 2.4, d = Math.sqrt(k / n) * 0.2;
      pezzi.push(new THREE.CylinderGeometry(0.055, 0.07, h, 7, 1, true).translate(Math.cos(a) * d, h / 2, Math.sin(a) * d));
    }
    return pezzo(unisci(pezzi), mat(colore, { side: THREE.DoubleSide }));
  };
  const colore2 = colore;
  // Corallo cervello: una cupola piena con le pieghe
  const cervello = (colore: string, raggio: number) => {
    const geo = new THREE.IcosahedronGeometry(raggio, 3);
    const q = geo.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
    for (let i = 0; i < q.count; i++) {
      v.fromBufferAttribute(q, i);
      v.multiplyScalar(1 + 0.08 * Math.sin(v.x * 40) * Math.sin(v.z * 40));
      q.setXYZ(i, v.x, Math.max(0, v.y) * 0.65, v.z);
    }
    geo.computeVertexNormals();
    // Pieno: ombreggiato a mano come lo scoglio, così si stacca dai coralli a filo
    const n = geo.attributes.normal as THREE.BufferAttribute, tinte: number[] = [], base = colore2(colore), t = new THREE.Color();
    for (let i = 0; i < q.count; i++) { t.copy(base).multiplyScalar(0.55 + Math.max(0, n.getY(i) * 0.8 + n.getX(i) * 0.3) * 0.5); tinte.push(t.r, t.g, t.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(tinte, 3));
    const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
    o.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 40), new THREE.LineBasicMaterial({ color: base, transparent: true, opacity: 0.3 })));
    return o;
  };
  // Ventaglio di gorgonia: un mezzo disco sottile e irregolare
  const ventaglio = (colore: string) => pezzo(scuoti(new THREE.CircleGeometry(0.42, 10, 0, Math.PI), 0.06, r), mat(colore, { side: THREE.DoubleSide }));
  posa(ramificato('#f2836b', 3), 1.75, 1.1);
  posa(ramificato('#ff9fb4', 8), -2.0, 1.25).scale.setScalar(0.8);
  posa(ramificato('#f6b24a', 21), 0.3, -2.0).scale.setScalar(0.7);
  posa(canne('#9b72d6', 9), 2.0, -0.8);
  posa(canne('#4fb3c9', 6), -1.75, -1.6);
  posa(cervello('#c3d36a', 0.38), -1.1, 2.1);
  const ventagli = [posa(ventaglio('#e3566f'), -1.3, -1.35), posa(ventaglio('#f08a4b'), 1.3, 1.8)];
  ventagli[1]!.rotation.y = 1.2;

  // --- Anemoni: tentacoli che ondeggiano con la corrente; il primo ha due pesci pagliaccio
  const anemoni = ([[0.45, 1.75, '#ff8fb1'], [-2.2, 0.25, '#ffb36b'], [1.55, -1.55, '#c38bff']] as const).map(([x, z, c]) => {
    const o = new THREE.Group(), m = mat(c), cono = new THREE.ConeGeometry(0.02, 0.24, 4).translate(0, 0.12, 0);
    o.add(pezzo(new THREE.CylinderGeometry(0.11, 0.14, 0.12, 8), mat('#d9774f'), 0, 0.06, 0));
    const tentacoli = Array.from({ length: 20 }, (_, k) => {
      const t = pezzo(cono, m, Math.cos(k * 2.4) * 0.08 * Math.sqrt(k / 20), 0.12, Math.sin(k * 2.4) * 0.08 * Math.sqrt(k / 20));
      t.userData.fase = r() * 6;
      o.add(t);
      return t;
    });
    posa(o, x, z);
    return { o, tentacoli };
  });

  // --- Ricci viola con gli aculei
  const aculei: number[] = [];
  const corpoRiccio = mat('#5e2f8f');
  for (let k = 0; k < 4; k++) {
    const ar = r() * Math.PI * 2, dr = 1.7 + r() * 1.5, x = Math.cos(ar) * dr, z = Math.sin(ar) * dr, y = altezza(x, z) + 0.05;
    g.add(pezzo(new THREE.IcosahedronGeometry(0.07, 0), corpoRiccio, x, y, z));
    for (let q = 0; q < 22; q++) {
      const d = new THREE.Vector3(r() - 0.5, r() * 0.8, r() - 0.5).normalize().multiplyScalar(0.12 + r() * 0.05);
      aculei.push(x, y, z, x + d.x, y + d.y, z + d.z);
    }
  }
  const geoAculei = new THREE.BufferGeometry();
  geoAculei.setAttribute('position', new THREE.Float32BufferAttribute(aculei, 3));
  g.add(new THREE.LineSegments(geoAculei, linea('#3b1a5e')));

  // --- Vongole che si aprono piano e mostrano la perla
  const conchiglia = new THREE.SphereGeometry(0.13, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1);
  const vongole = ([[2.4, 1.6], [-2.2, 1.6], [0.4, -2.6]] as const).map(([x, z], k) => {
    const o = new THREE.Group(), m = mat(k === 1 ? '#f0c9a8' : '#d9c3e8', { side: THREE.DoubleSide });
    const sotto = pezzo(conchiglia, m);
    sotto.rotation.x = Math.PI;
    const cerniera = new THREE.Group();
    cerniera.position.z = -0.13;
    cerniera.add(pezzo(conchiglia, m, 0, 0, 0.13));
    o.add(sotto, cerniera, pezzo(new THREE.SphereGeometry(0.035, 8, 6), mat('#fffaf0', { opacity: 0.6 }), 0, 0.02, 0));
    o.rotation.y = r() * 6;
    posa(o, x, z).position.y += 0.05;
    return { cerniera, fase: r() * 6 };
  });

  // --- Stelle marine sulle rocce e sulla sabbia
  const stella = (() => {
    const forma = new THREE.Shape();
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, d = k % 2 ? 0.035 : 0.1; if (k) forma.lineTo(Math.cos(a) * d, Math.sin(a) * d); else forma.moveTo(d, 0); }
    return new THREE.ExtrudeGeometry(forma, { depth: 0.025, bevelEnabled: false }).rotateX(-Math.PI / 2);
  })();
  ([[0.6, 2.3, '#e8505b', 0.02], [-1.2, -2.3, '#f6c14a', 0.02]] as const).forEach(([x, z, c, su]) => {
    const s = pezzo(stella, mat(c), x, altezza(x, z) + su, z);
    s.rotation.y = r() * 6;
    g.add(s);
  });

  // --- Forziere mezzo sepolto: ogni tanto si apre, luccica e libera bolle
  const forziere = new THREE.Group();
  const legno = mat('#8a5a2b'), oro = mat('#f2c14e', { opacity: 0.5 });
  forziere.add(pezzo(new THREE.BoxGeometry(0.5, 0.26, 0.32), legno, 0, 0.13, 0));
  [-0.17, 0.17].forEach(x => forziere.add(pezzo(new THREE.BoxGeometry(0.04, 0.27, 0.33), oro, x, 0.13, 0)));
  const monete = pezzo(new THREE.BoxGeometry(0.44, 0.04, 0.26), mat('#ffd75e', { opacity: 0.4 }), 0, 0.25, 0);
  forziere.add(monete);
  const coperchio = new THREE.Group();
  coperchio.position.set(0, 0.26, -0.16);
  const geoCop = new THREE.CylinderGeometry(0.16, 0.16, 0.5, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2);
  coperchio.add(pezzo(geoCop, legno, 0, 0, 0.16));
  forziere.add(coperchio);
  forziere.rotation.set(0.12, -0.6, 0.08);
  posa(forziere, -0.5, 2.7).position.y -= 0.06;

  // --- Raggi di luce dall'alto: lame calde e morbide che si accendono e si spengono piano
  const lama = (() => {
    const tela = document.createElement('canvas');
    tela.width = 32; tela.height = 128;
    const ctx = tela.getContext('2d')!;
    const v = ctx.createLinearGradient(0, 0, 0, 128);
    v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 32, 128);
    ctx.globalCompositeOperation = 'destination-in';
    const o = ctx.createLinearGradient(0, 0, 32, 0);
    o.addColorStop(0, 'rgba(0,0,0,0)'); o.addColorStop(0.5, 'rgba(0,0,0,1)'); o.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = o; ctx.fillRect(0, 0, 32, 128);
    return new THREE.CanvasTexture(tela);
  })();
  // Di notte (tema scuro) la luce si somma e brilla; di giorno (tema chiaro) è un velo azzurro
  const luce = BASE.b.clone().offsetHSL(0, 0, p.chiaro ? -0.05 : 0.18);
  const somma = p.chiaro ? THREE.NormalBlending : THREE.AdditiveBlending;
  const raggi = Array.from({ length: 9 }, (_, k) => {
    const perno = new THREE.Group();
    const a = (k / 9) * Math.PI * 2 + r(), d = 0.4 + r() * 2.4;
    perno.position.set(Math.cos(a) * d, ACQUA * 0.5 + 0.4, Math.sin(a) * d);
    const m = new THREE.MeshBasicMaterial({ map: lama, color: luce, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false, blending: somma });
    const piano = new THREE.Mesh(new THREE.PlaneGeometry(0.7 + r() * 1.1, ACQUA + 1), m);
    perno.add(piano);
    g.add(perno);
    return { perno, piano, m, fase: r() * 6, vel: 0.06 + r() * 0.08, forza: 0.6 + r() * 0.4 };
  });
  // Bagliore della superficie in alto, e una pozza di luce morbida sul fondo
  const alone = (() => {
    const tela = document.createElement('canvas');
    tela.width = tela.height = 128;
    const ctx = tela.getContext('2d')!, v = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.4, 'rgba(255,255,255,0.35)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(tela);
  })();
  const cielo = new THREE.Mesh(new THREE.PlaneGeometry(12, 12).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ map: alone, color: luce, transparent: true, opacity: p.chiaro ? 0.35 : 0.5, depthWrite: false, fog: false, blending: somma, side: THREE.DoubleSide }));
  cielo.position.y = ACQUA + 0.8;
  g.add(cielo);
  const pozza = new THREE.Mesh(new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: alone, color: luce, transparent: true, opacity: p.chiaro ? 0.18 : 0.22, depthWrite: false, fog: false, blending: somma }));
  pozza.position.y = 0.03;
  g.add(pozza);

  // --- Pesci: tutti dalla stessa forma piccola (corpo a rombo e coda), in banchi
  const coda = new THREE.BufferGeometry();
  coda.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.055, 0, 0.035, -0.105, 0, -0.035, -0.105], 3));
  const geoPesce = unisci([new THREE.OctahedronGeometry(1, 0).scale(0.022, 0.034, 0.07), coda]).scale(1.15, 1.15, 1.15);
  type Banco = { mesh: THREE.InstancedMesh; n: number; pos: Float32Array; vel: Float32Array; meta: THREE.Vector3; fase: number; paura: number; scala: Float32Array };
  const quanti = p.telefono ? [40, 32, 26] : [72, 58, 44];
  const banchi: Banco[] = (['#d9ecf2', '#f7cf4f', '#f0603f'] as const).map((c, b) => {
    const n = quanti[b]!, mesh = new THREE.InstancedMesh(geoPesce, matSito('#ffffff', { side: THREE.DoubleSide, grezzo: true, opacity: 0.85, fili: 0 }), n);
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), scala = new Float32Array(n);
    const base = colore(c);
    for (let i = 0; i < n; i++) {
      pos.set([(r() - 0.5) * 1.2 + (b - 1) * 1.5, 2.2 + b * 0.5 + r() * 0.8, (r() - 0.5) * 1.2], i * 3);
      vel.set([(r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4], i * 3);
      scala[i] = (b === 2 ? 1.25 : 1) * (0.8 + r() * 0.4);
      mesh.setColorAt(i, base.clone().offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.12));
    }
    mesh.frustumCulled = false;
    g.add(mesh);
    return { mesh, n, pos, vel, meta: new THREE.Vector3(), fase: b * 2.1, paura: 0, scala };
  });
  // Due pesci pagliaccio intorno al primo anemone
  const pagliacci = [0, 1].map(k => {
    const o = pezzo(geoPesce, mat('#ff7a1a', { side: THREE.DoubleSide }));
    o.scale.setScalar(1.3);
    g.add(o);
    return { o, fase: k * 3 };
  });

  // --- Meduse: campana che pulsa e spinge in su, tentacoli che seguono in ritardo
  const geoCampana = new THREE.SphereGeometry(0.17, 12, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const meduse = [0, 1, 2].map(k => {
    const o = new THREE.Group(), tinta = ['#ff9ec7', '#ffc2a0', '#c9a6ff'][k]!;
    const campana = pezzo(geoCampana, mat(tinta, { opacity: 0.3, side: THREE.DoubleSide }));
    campana.add(pezzo(new THREE.SphereGeometry(0.08, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(tinta, { opacity: 0.45 })));
    o.add(campana);
    o.position.set(-1.4 + k * 1.3, 2.6 + k * 0.6, 0.4 - k * 0.6);
    g.add(o);
    const lineaMat = linea(tinta, 0.75);
    const fili = Array.from({ length: 8 }, (_, q) => {
      const nodi = Array.from({ length: 10 }, (_, i) => o.position.clone().add(new THREE.Vector3(0, -i * 0.06, 0)));
      const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints(nodi), lineaMat);
      linea.frustumCulled = false;
      g.add(linea);
      return { nodi, linea, a: (q / 8) * Math.PI * 2 };
    });
    return { o, campana, v: new THREE.Vector3(), fase: k * 0.37, fili, casa: o.position.clone() };
  });

  // --- Manta: un corpo pieno e spesso al centro, ali a punta spinte indietro che si piegano a onda dal corpo alle
  // punte; dorso scuro, ventre chiaro; due pinne cefaliche davanti e la coda lunga
  const manta = (() => {
    const geo = new THREE.SphereGeometry(1, 32, 12), q = geo.attributes.position as THREE.BufferAttribute, base: number[] = [], spalla: number[] = [];
    for (let i = 0; i < q.count; i++) {
      const x = q.getX(i) * 0.62, y = q.getY(i) * 0.075, z = q.getZ(i) * 0.3, u = Math.abs(x) / 0.62;
      const zz = z * (1 - 0.6 * u ** 1.2) - 0.1 * u * u, yy = y * (1 - 0.75 * u);
      base.push(x, yy, zz);
      spalla.push(u);
      q.setXYZ(i, x, yy, zz);
    }
    const dorso = colore('#35587f'), ventre = colore('#d9ecf2'), colori: number[] = [], t = new THREE.Color();
    for (let i = 0; i < q.count; i++) { t.copy(q.getY(i) >= 0 ? dorso : ventre).multiplyScalar(0.8 + (1 - spalla[i]!) * 0.25); colori.push(t.r, t.g, t.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colori, 3));
    const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    const pinna = new THREE.ConeGeometry(0.025, 0.1, 5).rotateX(Math.PI / 2);
    for (const l of [-1, 1]) o.add(pezzo(pinna, mat('#35587f', { opacity: 0.9 }), l * 0.08, 0, 0.3));
    o.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.26), new THREE.Vector3(0, 0.01, -0.55), new THREE.Vector3(0, 0, -0.8)]), linea('#35587f')));
    g.add(o);
    return { o, pos: q, base, spalla };
  })();

  // --- Granchio che cammina di lato sulla sabbia
  const granchio = new THREE.Group();
  const rosso = mat('#e0583a');
  granchio.add(pezzo(new THREE.SphereGeometry(0.07, 7, 4).scale(1.3, 0.55, 1), rosso, 0, 0.04, 0));
  [-1, 1].forEach(s => granchio.add(pezzo(new THREE.IcosahedronGeometry(0.03, 0), rosso, s * 0.1, 0.05, 0.06)));
  const zampe: number[] = [];
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) zampe.push(s * 0.06, 0.04, (k - 1) * 0.04, s * 0.13, 0, (k - 1) * 0.06);
  const geoZampe = new THREE.BufferGeometry();
  geoZampe.setAttribute('position', new THREE.Float32BufferAttribute(zampe, 3));
  granchio.add(new THREE.LineSegments(geoZampe, linea('#b8442a')));
  g.add(granchio);

  // --- Bolle, neve marina e mangime: particelle morbide
  const BOLLE = 90, FISSE = 45, bolle = puntiMorbidi(BOLLE);
  const fonti = [new THREE.Vector3(0.9, 0.55, 0.9), new THREE.Vector3(2.1, 0.3, 0.55), new THREE.Vector3(-0.4, 0.2, 1.0)];
  const statoBolle = Array.from({ length: BOLLE }, (_, i) => ({ vel: 0.25 + r() * 0.25, fase: r() * 6, viva: i < FISSE, fonte: i % 3 }));
  for (let i = 0; i < BOLLE; i++) {
    const f = fonti[i % 3]!;
    bolle.pos.set([f.x, f.y + r() * (ACQUA - f.y), f.z], i * 3);
    bolle.dim[i] = 0.035 + r() * 0.05;
    bolle.col.set(BASE.b.clone().lerp(p.colori.fg, 0.4).toArray(), i * 3);
    bolle.alfa[i] = statoBolle[i]!.viva ? 0.75 : 0;
  }
  g.add(bolle.punti);
  const NEVE = p.telefono ? 380 : 900, neve = puntiMorbidi(NEVE), luccica = new Float32Array(NEVE);
  for (let i = 0; i < NEVE; i++) {
    neve.pos.set([(r() - 0.5) * 7.6, 0.1 + r() * (ACQUA + 0.4), (r() - 0.5) * 7.6], i * 3);
    neve.dim[i] = 0.01 + r() * 0.022;
    const brilla = r() < 0.25;
    luccica[i] = brilla ? 0.5 + r() * 2 : 0;
    neve.col.set((brilla ? luce : BASE.t.clone().lerp(BASE.b, 0.5)).toArray(), i * 3);
    neve.alfa[i] = 0.3 + r() * 0.4;
  }
  g.add(neve.punti);
  const MANGIME = 40, mangime = puntiMorbidi(MANGIME);
  const scaglie = Array.from({ length: MANGIME }, () => ({ viva: false, v: new THREE.Vector3(), vita: 0 }));
  for (let i = 0; i < MANGIME; i++) { mangime.dim[i] = 0.05; mangime.col.set(BASE.r.toArray(), i * 3); mangime.alfa[i] = 0; }
  g.add(mangime.punti);
  let prossima = 0;

  // Clic nell'acqua: una manciata di mangime cade dall'alto e i banchi vengono a mangiare
  const pianoAcqua = new THREE.Plane(SU, -ACQUA), dove = new THREE.Vector3();
  function clic(raggio: THREE.Raycaster) {
    if (!raggio.ray.intersectPlane(pianoAcqua, dove) || Math.abs(dove.x) > LATO - 0.2 || Math.abs(dove.z) > LATO - 0.2) return;
    for (let k = 0; k < 10; k++) {
      const i = prossima++ % MANGIME, q = scaglie[i]!;
      q.viva = true; q.vita = 0;
      q.v.set((r() - 0.5) * 0.15, -0.06 - r() * 0.05, (r() - 0.5) * 0.15);
      mangime.pos.set([dove.x + (r() - 0.5) * 0.3, ACQUA - 0.05, dove.z + (r() - 0.5) * 0.3], i * 3);
      mangime.alfa[i] = 0.95;
    }
  }

  // --- Corrente: fili sottili che scorrono nell'acqua seguendo il flusso, a tutte le altezze; mostrano il mare che si muove
  const SCIE = p.telefono ? 14 : 26, PASSI = 6;
  const scie = Array.from({ length: SCIE }, () => ({ x: 0, y: 0, z: 0, vita: r(), lungo: 0.3 + r() * 0.35 }));
  const nuovaScia = (q: (typeof scie)[number]) => {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 4;
    q.x = Math.cos(a) * d; q.z = Math.sin(a) * d; q.y = 0.4 + r() * 4.2; q.vita = 0;
  };
  scie.forEach(nuovaScia);
  const posScie = new Float32Array(SCIE * PASSI * 6), colScie = new Float32Array(SCIE * PASSI * 6);
  const geoScie = new THREE.BufferGeometry();
  geoScie.setAttribute('position', new THREE.BufferAttribute(posScie, 3));
  geoScie.setAttribute('color', new THREE.BufferAttribute(colScie, 3));
  const scia = new THREE.LineSegments(geoScie, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: p.chiaro ? 0.22 : 0.16, depthWrite: false }));
  scia.frustumCulled = false;
  g.add(scia);
  // Il flusso in un punto: la corrente di fondo più due vortici lenti
  const flusso = (x: number, y: number, z: number, s: number, cur: THREE.Vector2, fuori: THREE.Vector3) =>
    fuori.set(cur.x * 2 + Math.sin(z * 0.5 + s * 0.05) * 0.06, Math.sin(x * 0.4 + y * 0.6 + s * 0.08) * 0.03, cur.y * 2 + Math.cos(x * 0.5 - s * 0.04) * 0.06);
  const fondoScia = p.colori.bg;

  // --- Ciclo
  const tmp = new THREE.Vector3(), acc = new THREE.Vector3(), vicino = new THREE.Vector3(), via = new THREE.Vector3(), cibo = new THREE.Vector3();
  const media = new THREE.Vector3(), centro = new THREE.Vector3(), separa = new THREE.Vector3(), dummy = new THREE.Object3D();
  function aggiorna(s: number, dt: number, p: Palco) {
    const cur = mare(s);
    // Alghe e kelp: la risacca le piega tutte insieme, un'onda sale lungo il filo
    alghe.aggiorna((q, t, fuori) => {
      const k = t ** 1.4 * q.alto * 0.55;
      const onda = Math.sin(s * 0.9 + q.fase - t * 2.8) * 0.12 + Math.sin(s * 0.37 + q.fase * 1.7 - t * 1.6) * 0.07;
      fuori.set(cur.x * k * 2 + Math.cos(q.fase) * onda * k, cur.y * k * 2 + Math.sin(q.fase) * onda * k);
    }, s);
    raggi.forEach(q => {
      q.perno.rotation.y = Math.atan2(p.camera.position.x - q.perno.position.x, p.camera.position.z - q.perno.position.z);
      q.piano.rotation.z = 0.16 + Math.sin(s * 0.11 + q.fase) * 0.05;
      q.m.opacity = (p.chiaro ? 0.12 : 0.16) * q.forza * (0.35 + 0.65 * Math.sin(s * q.vel + q.fase) ** 2);
    });
    // Scie della corrente: ogni filo è un pezzo di traiettoria nel flusso, chiaro al centro e sfumato ai capi
    const fl = new THREE.Vector3();
    scie.forEach((q, n) => {
      q.vita += dt / 12;
      if (q.vita > 1 || Math.hypot(q.x, q.z) > 4.4) nuovaScia(q);
      flusso(q.x, q.y, q.z, s, cur, fl);
      q.x += fl.x * dt * 0.6; q.y += fl.y * dt * 0.6; q.z += fl.z * dt * 0.6;
      let x = q.x, y = q.y, z = q.z;
      const luce = Math.sin(q.vita * Math.PI);
      for (let i = 0; i < PASSI; i++) {
        flusso(x, y, z, s, cur, fl);
        const k = fl.length() || 1, passo = q.lungo / PASSI / k;
        const x2 = x - fl.x * passo, y2 = y - fl.y * passo, z2 = z - fl.z * passo;
        const j = (n * PASSI + i) * 6, a = luce * (1 - i / PASSI), b2 = luce * (1 - (i + 1) / PASSI);
        posScie.set([x, y, z, x2, y2, z2], j);
        const c1 = fondoScia.clone().lerp(BASE.b, a), c2 = fondoScia.clone().lerp(BASE.b, b2);
        colScie.set([c1.r, c1.g, c1.b, c2.r, c2.g, c2.b], j);
        x = x2; y = y2; z = z2;
      }
    });
    geoScie.attributes.position!.needsUpdate = true;
    geoScie.attributes.color!.needsUpdate = true;
    // Coralli morbidi e anemoni seguono la corrente; quelli duri stanno fermi
    ventagli.forEach((v, k) => { v.rotation.x = Math.sin(s * 0.42 + k) * 0.08 + cur.x * 0.3; });
    anemoni.forEach(a => a.tentacoli.forEach(t => {
      const f = t.userData.fase as number;
      t.rotation.x = cur.y * 2 + Math.sin(s * 1.2 + f) * 0.25;
      t.rotation.z = -cur.x * 2 + Math.cos(s * 1.0 + f) * 0.25;
    }));
    vongole.forEach(v => { v.cerniera.rotation.x = -(0.08 + 0.45 * Math.max(0, Math.sin(s * 0.25 + v.fase)) ** 3); });
    // Forziere: si apre ogni 16 secondi e libera una nuvola di bolle
    const ciclo = (s % 16) / 16, apre = ciclo > 0.7 ? Math.sin(((ciclo - 0.7) / 0.3) * Math.PI) : 0;
    coperchio.rotation.x = -apre * 0.7;
    (monete.material as THREE.MeshBasicMaterial).opacity = 0.4 + apre * 0.5;

    // Bolle: salgono ondeggiando; quelle del forziere partono solo quando si apre
    forziere.getWorldPosition(tmp);
    for (let i = 0; i < BOLLE; i++) {
      const b = statoBolle[i]!, k = i * 3;
      if (!b.viva) {
        if (apre > 0.5 && r() < 0.05) { b.viva = true; bolle.pos.set([tmp.x + (r() - 0.5) * 0.3, tmp.y + 0.3, tmp.z + (r() - 0.5) * 0.2], k); bolle.alfa[i] = 0.8; }
        continue;
      }
      bolle.pos[k] = bolle.pos[k]! + Math.sin(s * 3 + b.fase) * 0.003 + cur.x * dt * 0.5;
      bolle.pos[k + 1] = bolle.pos[k + 1]! + b.vel * dt;
      bolle.pos[k + 2] = bolle.pos[k + 2]! + Math.cos(s * 2.6 + b.fase) * 0.003 + cur.y * dt * 0.5;
      if (bolle.pos[k + 1]! > ACQUA) {
        if (i < FISSE) { const f = fonti[b.fonte]!; bolle.pos.set([f.x, f.y, f.z], k); } else { b.viva = false; bolle.alfa[i] = 0; }
      }
    }
    bolle.aggiorna();
    // Neve marina: scivola con la corrente e scende piano; chi esce dal cubo rientra dall'altra parte
    for (let i = 0; i < NEVE; i++) {
      const k = i * 3;
      let x = neve.pos[k]! + cur.x * dt * 0.8, y = neve.pos[k + 1]! - dt * 0.02, z = neve.pos[k + 2]! + cur.y * dt * 0.8;
      if (x > 3.8) x -= 7.6; if (x < -3.8) x += 7.6; if (z > 3.8) z -= 7.6; if (z < -3.8) z += 7.6; if (y < 0.1) y = ACQUA + 0.3;
      neve.pos[k] = x; neve.pos[k + 1] = y + Math.sin(s * 0.7 + i) * 0.0015; neve.pos[k + 2] = z;
      if (luccica[i]) neve.alfa[i] = 0.25 + 0.6 * Math.max(0, Math.sin(s * luccica[i]! + i)) ** 3;
    }
    neve.aggiorna();
    // Mangime: scende e si sparge; i pesci lo mangiano, il resto si posa e sparisce
    let trovato = false;
    for (let i = 0; i < MANGIME; i++) {
      const q = scaglie[i]!, k = i * 3;
      if (!q.viva) continue;
      q.vita += dt;
      const x = mangime.pos[k]! + (q.v.x + cur.x * 0.3) * dt, z = mangime.pos[k + 2]! + (q.v.z + cur.y * 0.3) * dt;
      const y = Math.max(altezza(x, z) + 0.03, mangime.pos[k + 1]! + q.v.y * dt);
      mangime.pos[k] = x; mangime.pos[k + 1] = y; mangime.pos[k + 2] = z;
      if (q.vita > 14) { mangime.alfa[i] = Math.max(0, mangime.alfa[i]! - dt); if (!mangime.alfa[i]) q.viva = false; }
      // Chi arriva sul mangime lo mangia
      for (const b of banchi) for (let j = 0; j < b.n; j += 2) {
        if (Math.abs(b.pos[j * 3]! - x) + Math.abs(b.pos[j * 3 + 1]! - y) + Math.abs(b.pos[j * 3 + 2]! - z) < 0.12) { q.viva = false; mangime.alfa[i] = 0; break; }
      }
      if (q.viva && !trovato) { cibo.set(x, y, z); trovato = true; }
    }
    mangime.aggiorna();

    // Banchi: ogni pesce segue i vicini (stessa direzione, non troppo vicini, non troppo lontani), il banco va verso
    // una meta che vaga piano, o verso il mangime. Vicino al puntatore scappano e tutto il banco si allarma.
    const raggio = p.raggio;
    banchi.forEach(b => {
      const f = b.fase;
      if (trovato) b.meta.copy(cibo);
      else b.meta.set(2.2 * Math.sin(s * 0.09 + f), 2.1 + f * 0.45 + 0.9 * Math.sin(s * 0.13 + f * 2), 2.2 * Math.sin(s * 0.071 + f * 3));
      b.paura = Math.max(0, b.paura - dt * 0.5);
      const vMax = 0.75 + b.paura * 1.3, vMin = 0.3;
      for (let i = 0; i < b.n; i++) {
        const k = i * 3;
        tmp.set(b.pos[k]!, b.pos[k + 1]!, b.pos[k + 2]!);
        media.set(0, 0, 0); centro.set(0, 0, 0); separa.set(0, 0, 0);
        let vicini = 0;
        for (let j = 0; j < b.n; j++) {
          if (j === i) continue;
          const dx = b.pos[j * 3]! - tmp.x, dy = b.pos[j * 3 + 1]! - tmp.y, dz = b.pos[j * 3 + 2]! - tmp.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > 0.16) continue;
          vicini++;
          media.x += b.vel[j * 3]!; media.y += b.vel[j * 3 + 1]!; media.z += b.vel[j * 3 + 2]!;
          centro.x += dx; centro.y += dy; centro.z += dz;
          if (d2 < 0.012) { const d = Math.sqrt(d2) + 1e-4; separa.x -= dx / d; separa.y -= dy / d; separa.z -= dz / d; }
        }
        acc.set(0, 0, 0);
        if (vicini) {
          acc.addScaledVector(media.divideScalar(vicini).sub(vicino.set(b.vel[k]!, b.vel[k + 1]!, b.vel[k + 2]!)), 1.2);
          acc.addScaledVector(centro.divideScalar(vicini), 1.2);
          acc.addScaledVector(separa, 0.9);
        }
        acc.addScaledVector(vicino.copy(b.meta).sub(tmp), trovato ? 0.9 : 0.35);
        // Bordi della scena, fondale e soffitto: spinte morbide verso l'interno
        const fondo = altezza(tmp.x, tmp.z) + 1.0 + Math.max(0, 1 - Math.hypot(tmp.x, tmp.z) / 1.6) * 1.4, M = LATO - 0.35;
        if (tmp.x > M) acc.x -= (tmp.x - M) * 8; if (tmp.x < -M) acc.x -= (tmp.x + M) * 8;
        if (tmp.z > M) acc.z -= (tmp.z - M) * 8; if (tmp.z < -M) acc.z -= (tmp.z + M) * 8;
        if (tmp.y < fondo) acc.y += (fondo - tmp.y) * 8; if (tmp.y > ACQUA - 0.25) acc.y -= (tmp.y - ACQUA + 0.25) * 8;
        if (raggio) {
          const d2 = raggio.ray.distanceSqToPoint(tmp);
          if (d2 < 0.55) {
            raggio.ray.closestPointToPoint(tmp, vicino);
            via.copy(tmp).sub(vicino).normalize();
            acc.addScaledVector(via, 9 * (1 - Math.sqrt(d2) / 0.74));
            b.paura = Math.min(1, b.paura + dt * 2);
          }
        }
        acc.y *= 0.6;
        let vx = b.vel[k]! + acc.x * dt, vy = b.vel[k + 1]! + acc.y * dt, vz = b.vel[k + 2]! + acc.z * dt;
        const v = Math.hypot(vx, vy, vz) || 1e-4, vv = Math.min(vMax, Math.max(vMin, v));
        vx *= vv / v; vy *= vv / v; vz *= vv / v;
        b.vel[k] = vx; b.vel[k + 1] = vy; b.vel[k + 2] = vz;
        // La corrente porta il banco avanti e indietro, e un'onda lenta lo fa salire e scendere: un movimento sinuoso
        const onda = Math.sin(s * 0.7 + tmp.x * 0.9 + f) * 0.18;
        b.pos[k] = tmp.x + (vx + cur.x * 1.1) * dt; b.pos[k + 1] = tmp.y + (vy + onda) * dt; b.pos[k + 2] = tmp.z + (vz + cur.y * 1.1) * dt;
        // Il pesce guarda dove va e muove la coda: più veloce va, più la muove
        dummy.position.set(b.pos[k]!, b.pos[k + 1]!, b.pos[k + 2]!);
        dummy.lookAt(vicino.set(b.pos[k]! + vx, b.pos[k + 1]! + vy, b.pos[k + 2]! + vz));
        dummy.rotateY(Math.sin(s * (8 + vv * 10) + i * 1.3) * 0.18);
        dummy.scale.setScalar(b.scala[i]!);
        dummy.updateMatrix();
        b.mesh.setMatrixAt(i, dummy.matrix);
      }
      b.mesh.instanceMatrix.needsUpdate = true;
    });
    // Pesci pagliaccio: giri brevi intorno all'anemone
    anemoni[0]!.o.getWorldPosition(tmp);
    pagliacci.forEach(q => {
      const a = s * 0.7 + q.fase, d = 0.18 + Math.sin(s * 1.3 + q.fase) * 0.06;
      q.o.position.set(tmp.x + Math.cos(a) * d, tmp.y + 0.2 + Math.sin(s * 2 + q.fase) * 0.05, tmp.z + Math.sin(a) * d);
      q.o.lookAt(tmp.x + Math.cos(a + 0.4) * d, q.o.position.y, tmp.z + Math.sin(a + 0.4) * d);
      q.o.rotateY(Math.sin(s * 14 + q.fase) * 0.2);
    });

    // Meduse: un battito ogni 2,6 secondi; fra un battito e l'altro scendono piano e vanno con la corrente
    meduse.forEach(m => {
      const fase = (s * 0.38 + m.fase) % 1;
      const stringe = fase < 0.22 ? Math.sin((fase / 0.22) * Math.PI) : 0;
      m.campana.scale.set(1 - stringe * 0.22, 1 + stringe * 0.2, 1 - stringe * 0.22);
      if (fase < 0.22) m.v.y += dt * 0.55;
      m.v.y -= dt * 0.05;
      m.v.x += (cur.x * 1.1 + Math.sin(s * 0.23 + m.fase * 9) * 0.08 + (m.casa.x - m.o.position.x) * 0.04) * dt;
      m.v.z += (cur.y * 1.1 + Math.cos(s * 0.19 + m.fase * 7) * 0.08 + (m.casa.z - m.o.position.z) * 0.04) * dt;
      if (m.o.position.y > ACQUA - 0.5) m.v.y -= dt * 0.4;
      if (m.o.position.y < 2.2) m.v.y += dt * 0.3;
      m.v.multiplyScalar(1 - dt * 0.9);
      m.o.position.addScaledVector(m.v, dt);
      m.o.rotation.z = m.v.x * 0.8; m.o.rotation.x = -m.v.z * 0.8;
      // Ogni tentacolo: il primo nodo sta sul bordo della campana, gli altri lo seguono come una corda nell'acqua
      const rb = 0.14 * (1 - stringe * 0.22);
      m.fili.forEach(f => {
        f.nodi[0]!.set(Math.cos(f.a) * rb, 0, Math.sin(f.a) * rb).applyEuler(m.o.rotation).add(m.o.position);
        for (let i = 1; i < f.nodi.length; i++) {
          const n = f.nodi[i]!, prima = f.nodi[i - 1]!;
          n.x += cur.x * dt * 0.6 + Math.sin(s * 1.5 + i * 0.6 + f.a) * 0.0015;
          n.z += cur.y * dt * 0.6 + Math.cos(s * 1.3 + i * 0.6 + f.a) * 0.0015;
          n.y -= dt * 0.25;
          tmp.copy(n).sub(prima);
          n.copy(prima).addScaledVector(tmp, 0.065 / (tmp.length() || 1));
        }
        f.linea.geometry.setFromPoints(f.nodi);
      });
    });

    // Manta: gira largo e si inclina in curva; le punte delle ali battono, la parte vicina al corpo le segue
    const am = s * 0.11;
    manta.o.position.set(Math.cos(am) * 2.3, 3.7 + Math.sin(s * 0.3) * 0.35, Math.sin(am) * 2.3);
    manta.o.lookAt(Math.cos(am + 0.1) * 2.1, manta.o.position.y, Math.sin(am + 0.1) * 2.1);
    manta.o.rotateZ(-0.25);
    for (let i = 0; i < manta.pos.count; i++) {
      const u = manta.spalla[i]!;
      manta.pos.setY(i, manta.base[i * 3 + 1]! + Math.sin(s * 1.6 - u * 1.6) * 0.2 * u ** 1.6);
    }
    manta.pos.needsUpdate = true;
    // Granchio: va avanti e indietro di lato, piano, e si ferma alle estremità
    const gx = 0.4 + Math.sin(s * 0.25) * 0.9, gz = 2.6;
    granchio.position.set(gx, altezza(gx, gz) + Math.abs(Math.sin(s * 8)) * 0.012 * Math.abs(Math.cos(s * 0.25)), gz);
  }
  return p;
}
