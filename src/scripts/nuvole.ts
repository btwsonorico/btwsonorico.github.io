import * as THREE from 'three';
import { casuale, mat, pezzo, sasso, linea, tono, terreno, puntiMorbidi, palco, SITO, type Palco } from './natura';

// Una valle di colline vista da un drone, nello stile del sito: le colline sono curve di livello, fra le curve la
// griglia di punti. Un fiume scende fra le colline, si allarga in un laghetto davanti al mulino ad acqua (la ruota
// gira con la corrente) ed esce dall'altra parte; un ponticello di legno lo attraversa. Accanto al mulino un campo
// di grano ondeggia col vento; sulle colline girano le pale eoliche, sui pendii boschetti e cespugli.
// Un gregge di pecore minuscole pascola e si muove come una massa; un clic manda il cane in quel punto e il gregge
// si sposta insieme, gira intorno a ostacoli, fiume e campo e passa sul ponte. Quando smetti, il pastore fischia e il
// cane torna. Sopra passano nuvole fatte di migliaia di punti, con le ombre che scorrono sulle colline; il puntatore
// le spinge piano via, poi tornano sulla loro strada. Il giorno gira: alba e tramonto lunghi, di notte la valle si
// scurisce e si accendono le luci; abbassando lo sguardo verso l'orizzonte si vedono poche stelle, le costellazioni,
// qualche stella cadente e la luna.

const GIORNO = 'misc-giorno';
const L = 8;

export function monta(el: HTMLElement) {
  const r = casuale(23);
  const p = palco(el, {
    camera: new THREE.Vector3(0, 13.4, 11.2), mira: new THREE.Vector3(0, 0.4, 0.3), giro: 0.006, inclina: [-0.62, 0.3], nebbia: [1.0, 2.1], zoom: [0.3, 1.2], aggiorna, clic,
    scena: 'nuvole', toni: SITO,
  });
  const g = p.gruppo, c = p.colori;
  const morbido = (da: number, a: number, k: number) => da + (a - da) * Math.min(1, k);
  const angolo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

  // --- Fiume: una curva dolce dal bordo nord-ovest al laghetto del mulino, poi fuori verso sud-est
  const LAGO = new THREE.Vector2(-0.6, 2.3);
  const fiume = new THREE.CatmullRomCurve3([[-8.2, -3.8], [-6.2, -2.2], [-4.3, -1.6], [-2.6, -0.4], [-1.6, 1.0], [LAGO.x, LAGO.y], [0.6, 3.4], [2.4, 4.2], [4.4, 4.0], [6.2, 5.0], [8.4, 5.6]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const lungoFiume = fiume.getSpacedPoints(160);
  // Distanza di un punto dal fiume (sul piano), cercata fra i punti della curva
  const dalFiume = (x: number, z: number) => {
    let d = 99;
    for (let i = 0; i < lungoFiume.length; i += 2) { const q = lungoFiume[i]!; d = Math.min(d, (q.x - x) ** 2 + (q.z - z) ** 2); }
    return Math.sqrt(d);
  };
  const rivaLago = (a: number) => 0.85 * (1 + 0.18 * Math.sin(a * 2 + 1) + 0.1 * Math.sin(a * 5 + 2));
  const nelLago = (x: number, z: number, margine = 0) => {
    const ex = (x - LAGO.x) / 1.25, ez = (z - LAGO.y) / 0.9;
    return Math.hypot(ex, ez) < rivaLago(Math.atan2(ez, ex)) + margine;
  };

  // --- Colline: somma di colli dolci più un'ondulazione leggera; il fiume scava il suo letto
  const COLLI = [[-4, -3.6, 1.9, 2.1], [3.3, -4, 2.2, 2.3], [5.2, 1.4, 1.5, 1.9], [-4.9, 3.6, 1.6, 2.0], [0.3, -6.4, 1.4, 2.0], [1.4, 6.4, 1.1, 1.6], [6.6, -1.6, 1.1, 1.6], [-7, 0.4, 1.2, 1.6]] as const;
  const altezza = (x: number, z: number, conFiume = true) => {
    let h = 0.08 * Math.sin(x * 0.9 + 1) * Math.cos(z * 0.75) + 0.04 * Math.sin(x * 2 - z * 1.6) + 0.15;
    for (const [cx, cz, alto, largo] of COLLI) h += alto * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * largo * largo));
    if (conFiume) {
      const d = dalFiume(x, z);
      h -= 0.22 * Math.exp(-(d * d) / 0.18) * Math.min(1, h / 0.3 + 0.3);
      if (nelLago(x, z, 0.3)) h = Math.min(h, 0.12);
    }
    return h;
  };
  terreno(g, c.verde, L + 0.5, altezza);
  // Curve di livello (marching squares sulla griglia delle altezze): una ogni 0,2 di quota, più marcata ogni 1
  {
    const N = 150, passo = (L * 2) / N, H: number[] = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) H.push(altezza(-L + i * passo, -L + j * passo));
    const minori: number[] = [], maggiori: number[] = [];
    for (let livello = 0.2, n = 1; livello < 3.5; livello += 0.2, n++) {
      const dove = n % 5 === 0 ? maggiori : minori;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x0 = -L + i * passo, z0 = -L + j * passo;
        if (Math.hypot(x0, z0) > L) continue;
        const v = [H[j * (N + 1) + i]!, H[j * (N + 1) + i + 1]!, H[(j + 1) * (N + 1) + i + 1]!, H[(j + 1) * (N + 1) + i]!];
        const angoli = [[x0, z0], [x0 + passo, z0], [x0 + passo, z0 + passo], [x0, z0 + passo]];
        const tagli: number[][] = [];
        for (let k = 0; k < 4; k++) {
          const a = v[k]!, b = v[(k + 1) % 4]!;
          if ((a < livello) !== (b < livello)) {
            const t = (livello - a) / (b - a), [ax, az] = angoli[k]!, [bx, bz] = angoli[(k + 1) % 4]!;
            tagli.push([ax! + (bx! - ax!) * t, az! + (bz! - az!) * t]);
          }
        }
        for (let k = 0; k + 1 < tagli.length; k += 2) dove.push(tagli[k]![0]!, livello + 0.01, tagli[k]![1]!, tagli[k + 1]![0]!, livello + 0.01, tagli[k + 1]![1]!);
      }
    }
    for (const [xyz, op] of [[minori, 0.32], [maggiori, 0.75]] as const) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
      g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: c.verde, transparent: true, opacity: op })));
    }
  }
  const ostacoli: { x: number; z: number; r: number }[] = [];
  const posa = <T extends THREE.Object3D>(o: T, x: number, z: number, raggio = 0) => {
    o.position.set(x, altezza(x, z), z);
    g.add(o);
    if (raggio) ostacoli.push({ x, z, r: raggio });
    return o;
  };

  // --- Acqua: il fiume è un nastro azzurro con le due rive a filo; trattini chiari scorrono con la corrente
  const azzurro = tono('#5fb6d9');
  const LARGO_FIUME = 0.3;
  const acquaY = (q: THREE.Vector3) => Math.max(0.1, altezza(q.x, q.z)) + 0.02;
  {
    const pos: number[] = [], A: THREE.Vector3[] = [], B: THREE.Vector3[] = [];
    lungoFiume.forEach((q, i) => {
      const t = fiume.getTangentAt(i / (lungoFiume.length - 1)), nx = -t.z, nz = t.x, y = acquaY(q);
      A.push(new THREE.Vector3(q.x + nx * LARGO_FIUME / 2, y, q.z + nz * LARGO_FIUME / 2));
      B.push(new THREE.Vector3(q.x - nx * LARGO_FIUME / 2, y, q.z - nz * LARGO_FIUME / 2));
    });
    // Il nastro: due triangoli per ogni tratto fra le due rive
    for (let i = 0; i + 1 < A.length; i++) pos.push(...A[i]!.toArray(), ...B[i]!.toArray(), ...A[i + 1]!.toArray(), ...B[i]!.toArray(), ...B[i + 1]!.toArray(), ...A[i + 1]!.toArray());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: azzurro, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })));
    // Le rive si interrompono dove entrano nel laghetto
    const rivaA = A.filter(q => !nelLago(q.x, q.z)), rivaB = B.filter(q => !nelLago(q.x, q.z));
    for (const riva of [rivaA, rivaB]) {
      // Le rive si interrompono dove entrano nel laghetto: due pezzi per riva
      let pezzoRiva: THREE.Vector3[] = [];
      riva.forEach((q, i) => {
        if (i && q.distanceTo(riva[i - 1]!) > 0.3) { g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pezzoRiva), linea('#5fb6d9', 0.85))); pezzoRiva = []; }
        pezzoRiva.push(q);
      });
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pezzoRiva), linea('#5fb6d9', 0.85)));
    }
  }
  // Laghetto davanti al mulino
  const geoLago = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
  const pl = geoLago.attributes.position as THREE.BufferAttribute, riva: THREE.Vector3[] = [];
  for (let i = 1; i < pl.count; i++) {
    const a = Math.atan2(-pl.getZ(i), pl.getX(i)), d = rivaLago(a);
    pl.setXYZ(i, Math.cos(a) * d * 1.25, 0, -Math.sin(a) * d * 0.9);
    riva.push(new THREE.Vector3(pl.getX(i), 0.002, pl.getZ(i)));
  }
  const lago = new THREE.Mesh(geoLago, new THREE.MeshBasicMaterial({ color: azzurro, transparent: true, opacity: 0.22, depthWrite: false }));
  lago.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(riva), linea('#5fb6d9', 0.85)));
  lago.position.set(LAGO.x, 0.13, LAGO.y);
  g.add(lago);
  // Trattini della corrente: corrono lungo il fiume e rallentano nel laghetto
  const TRATTI = 60, tratti = Array.from({ length: TRATTI }, () => ({ t: r(), lato: (r() - 0.5) * 0.7, vel: 0.012 + r() * 0.008 }));
  const posTratti = new Float32Array(TRATTI * 6), geoTratti = new THREE.BufferGeometry();
  geoTratti.setAttribute('position', new THREE.BufferAttribute(posTratti, 3));
  const segnoTratti = new THREE.LineSegments(geoTratti, new THREE.LineBasicMaterial({ color: azzurro.clone().lerp(c.fg, 0.5), transparent: true, opacity: 0.7 }));
  segnoTratti.frustumCulled = false;
  g.add(segnoTratti);

  // --- Ponticello di legno sul fiume: assi e corrimano; il gregge lo usa per passare
  const PONTE = 0.32, puntoPonte = fiume.getPointAt(PONTE), versoPonte = fiume.getTangentAt(PONTE);
  const ponte = new THREE.Group(), legno = mat('#a07a50', { opacity: 0.5 });
  ponte.add(pezzo(new THREE.BoxGeometry(0.7, 0.03, 0.26), legno, 0, 0.05, 0));
  for (const z of [-0.12, 0.12]) ponte.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.35, 0.05, z), new THREE.Vector3(-0.3, 0.13, z), new THREE.Vector3(0.3, 0.13, z), new THREE.Vector3(0.35, 0.05, z)]), linea('#a07a50', 0.9)));
  ponte.position.set(puntoPonte.x, acquaY(puntoPonte), puntoPonte.z);
  ponte.rotation.y = -Math.atan2(versoPonte.x, versoPonte.z);
  g.add(ponte);

  // --- Mulino ad acqua sulla riva ovest del laghetto: casa in pietra, tetto a due falde, ruota a pale che gira
  const mulino = new THREE.Group();
  mulino.add(pezzo(new THREE.BoxGeometry(0.55, 0.42, 0.45), mat('#d8cfba'), 0, 0.21, 0));
  mulino.add(pezzo(new THREE.CylinderGeometry(0.34, 0.34, 0.6, 3, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).scale(1, 0.55, 1), mat('#e08a3a'), 0, 0.5, 0));
  const finestre = [[-0.12, 0.25], [0.12, 0.25]].map(([x, y]) => pezzo(new THREE.BoxGeometry(0.08, 0.1, 0.02), mat('#f2b62f', { opacity: 0.2 }), x!, y!, 0.23));
  finestre.forEach(f => { f.renderOrder = 12; mulino.add(f); });
  const ruota = new THREE.Group();
  ruota.position.set(0.36, 0.22, 0);
  const raggi: THREE.Vector3[] = [], cerchi2: THREE.Vector3[][] = [[], []];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2, x = Math.cos(a) * 0.25, y = Math.sin(a) * 0.25;
    raggi.push(new THREE.Vector3(0, 0, -0.06), new THREE.Vector3(x, y, -0.06), new THREE.Vector3(0, 0, 0.06), new THREE.Vector3(x, y, 0.06));
    raggi.push(new THREE.Vector3(x, y, -0.07), new THREE.Vector3(x, y, 0.07), new THREE.Vector3(x * 1.2, y * 1.2, -0.07), new THREE.Vector3(x * 1.2, y * 1.2, 0.07), new THREE.Vector3(x, y, 0.07), new THREE.Vector3(x * 1.2, y * 1.2, 0.07));
  }
  for (let k = 0; k <= 32; k++) { const a = (k / 32) * Math.PI * 2; cerchi2[0]!.push(new THREE.Vector3(Math.cos(a) * 0.25, Math.sin(a) * 0.25, -0.06)); cerchi2[1]!.push(new THREE.Vector3(Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0.06)); }
  ruota.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(raggi), linea('#a07a50', 0.95)));
  cerchi2.forEach(q => ruota.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(q), linea('#a07a50', 0.95))));
  ruota.rotation.y = Math.PI / 2;
  const perno = new THREE.Group();
  perno.position.copy(ruota.position);
  ruota.position.set(0, 0, 0);
  perno.add(ruota);
  mulino.add(perno);
  mulino.scale.setScalar(1.3);
  posa(mulino, LAGO.x - 1.6, LAGO.y + 0.15, 0.5);
  mulino.position.y = Math.max(mulino.position.y, 0.14);

  // --- Campo di grano accanto al mulino: tante spighe che si piegano a onde col vento
  const CAMPO = { x: -2.9, z: 4.4, largo: 2.0, alto: 1.2, giro: 0.35 };
  const nelCampo = (x: number, z: number, margine = 0) => {
    const dx = x - CAMPO.x, dz = z - CAMPO.z, c2 = Math.cos(CAMPO.giro), s2 = Math.sin(CAMPO.giro);
    const u = dx * c2 - dz * s2, v = dx * s2 + dz * c2;
    return Math.abs(u) < CAMPO.largo / 2 + margine && Math.abs(v) < CAMPO.alto / 2 + margine;
  };
  const SPIGHE = p.telefono ? 700 : 1400, spighe: { x: number; z: number; y: number; h: number }[] = [];
  for (let k = 0; k < SPIGHE; k++) {
    const u = (r() - 0.5) * CAMPO.largo, v = (r() - 0.5) * CAMPO.alto, c2 = Math.cos(CAMPO.giro), s2 = Math.sin(CAMPO.giro);
    const x = CAMPO.x + u * c2 + v * s2, z = CAMPO.z - u * s2 + v * c2;
    spighe.push({ x, z, y: altezza(x, z), h: 0.1 + r() * 0.05 });
  }
  const posSpighe = new Float32Array(SPIGHE * 6), geoSpighe = new THREE.BufferGeometry();
  geoSpighe.setAttribute('position', new THREE.BufferAttribute(posSpighe, 3));
  const grano = new THREE.LineSegments(geoSpighe, linea('#e6c26a', 0.75));
  grano.frustumCulled = false;
  g.add(grano);
  {
    const c2 = Math.cos(CAMPO.giro), s2 = Math.sin(CAMPO.giro), bordo: THREE.Vector3[] = [];
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]) {
      const uu = u! * CAMPO.largo / 2, vv = v! * CAMPO.alto / 2, x = CAMPO.x + uu * c2 + vv * s2, z = CAMPO.z - uu * s2 + vv * c2;
      bordo.push(new THREE.Vector3(x, altezza(x, z) + 0.06, z));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bordo), linea('#a07a50', 0.7)));
  }

  // --- Pale eoliche sulle colline: torre sottile, gondola, tre pale lunghe; di notte una luce rossa in cima
  const eoliche = ([[3.3, -4], [5.2, 1.4], [-4.9, 3.6], [6.6, -1.6], [2.4, -5.3]] as const).map(([x, z], k) => {
    const o = new THREE.Group(), bianco = mat('#e8e6e0', { opacity: 0.25 });
    o.add(pezzo(new THREE.CylinderGeometry(0.02, 0.045, 1.4, 6), bianco, 0, 0.7, 0));
    o.add(pezzo(new THREE.BoxGeometry(0.12, 0.06, 0.06), bianco, 0, 1.42, 0));
    const rotore = new THREE.Group();
    rotore.position.set(0, 1.42, 0.05);
    for (let q = 0; q < 3; q++) {
      const pala = pezzo(new THREE.BoxGeometry(0.035, 0.62, 0.008).translate(0, 0.32, 0), bianco);
      pala.rotation.z = (q / 3) * Math.PI * 2;
      rotore.add(pala);
    }
    o.add(rotore);
    o.rotation.y = 0.4;
    posa(o, x, z, 0.15);
    return { rotore, vel: 0.9 + k * 0.17, fase: r() * 6 };
  });
  const luciEoliche = puntiMorbidi(eoliche.length);
  eoliche.forEach((e, k) => {
    e.rotore.parent!.updateMatrixWorld();
    const q = new THREE.Vector3(0, 1.48, 0).applyMatrix4(e.rotore.parent!.matrixWorld);
    luciEoliche.pos.set(q.toArray(), k * 3);
    luciEoliche.dim[k] = 0.28;
    luciEoliche.col.set([1, 0.2, 0.15], k * 3);
    luciEoliche.alfa[k] = 0;
  });
  luciEoliche.punti.renderOrder = 12;
  g.add(luciEoliche.punti);

  // --- Boschetti sui pendii e cespugli sparsi: il gregge ci gira intorno
  const chiome = [mat('#6fa646'), mat('#5f9c45'), mat('#4f8a3c')], tronco = mat('#7a5230');
  ([[2.3, -1.6, 8], [-2.6, -3.0, 9], [5.6, -3.2, 6], [-3, -6, 6], [3.6, 2.6, 6], [-6.2, 2.2, 6], [4.4, 5.8, 5]] as const).forEach(([cx, cz, n]) => {
    for (let k = 0; k < n; k++) {
      const a = r() * 6, d = Math.sqrt(r()) * 0.9, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, h = 0.26 + r() * 0.18;
      if (dalFiume(x, z) < 0.4) continue;
      const o = new THREE.Group();
      o.add(pezzo(new THREE.CylinderGeometry(0.014, 0.022, h * 0.5, 4), tronco, 0, h * 0.25, 0));
      if (r() < 0.5) o.add(pezzo(new THREE.ConeGeometry(h * 0.33, h * 0.8, 6), chiome[k % 3]!, 0, h * 0.75, 0));
      else o.add(pezzo(sasso(h * 0.3, r), chiome[k % 3]!, 0, h * 0.7, 0));
      posa(o, x, z, 0.14);
    }
  });
  for (let k = 0; k < 30; k++) {
    const a = r() * 6, d = 1.5 + r() * 5.5, x = Math.cos(a) * d, z = Math.sin(a) * d, rr = 0.05 + r() * 0.06;
    if (dalFiume(x, z) < 0.4 || nelCampo(x, z, 0.2) || nelLago(x, z, 0.3)) continue;
    posa(pezzo(sasso(rr, r), chiome[k % 3]!), x, z, rr + 0.04).scale.y = 0.7;
  }

  // --- Pastore vicino al mulino; il fischio sono tre archi che si allargano
  const PASTORE = new THREE.Vector2(-2.6, 1.9);
  const pastore = new THREE.Group();
  pastore.add(pezzo(new THREE.CapsuleGeometry(0.04, 0.12, 3, 6), mat('#6f9c4a', { opacity: 0.5 }), 0, 0.1, 0));
  pastore.add(pezzo(new THREE.IcosahedronGeometry(0.035, 0), mat('#d8cfba'), 0, 0.23, 0));
  pastore.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.06, 0, 0), new THREE.Vector3(0.07, 0.32, 0)]), linea('#7a5230', 0.9)));
  posa(pastore, PASTORE.x, PASTORE.y);
  const fischi = [0, 1, 2].map(() => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 9 }, (_, q) => new THREE.Vector3(Math.cos(-0.7 + q * 0.175) * 0.12, Math.sin(-0.7 + q * 0.175) * 0.12, 0))), linea('#fbf8ef', 0));
    l.position.set(PASTORE.x, pastore.position.y + 0.3, PASTORE.y);
    g.add(l);
    return l;
  });

  // --- Gregge: tante pecore minuscole (corpo chiaro, testa scura), tutte in due forme sole
  const PECORE = p.telefono ? 70 : 110;
  const corpi = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4).scale(0.075, 0.045, 0.05), mat(p.chiaro ? '#fbf9f4' : '#f2efe8', { grezzo: true, opacity: p.chiaro ? 1 : 0.9, fili: 0 }), PECORE);
  const teste = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 3).scale(0.03, 0.025, 0.025), mat('#3a332c', { grezzo: true, opacity: 0.9, fili: 0 }), PECORE);
  corpi.frustumCulled = teste.frustumCulled = false;
  g.add(corpi, teste);
  type Pecora = { x: number; z: number; vx: number; vz: number; verso: number; calma: number; timer: number; voglia: number; testa: number; fase: number };
  const pecore: Pecora[] = Array.from({ length: PECORE }, () => {
    const a = r() * 6, d = Math.sqrt(r()) * 1.1;
    return { x: 1.6 + Math.cos(a) * d, z: 0.6 + Math.sin(a) * d * 0.8, vx: 0, vz: 0, verso: r() * 6, calma: 1, timer: r() * 6, voglia: 0, testa: 1, fase: r() * 6 };
  });

  // --- Cane: piccolo e arancio, corre dove clicchi; dopo 8 secondi senza clic torna dal pastore
  const cane = new THREE.Group();
  cane.add(pezzo(new THREE.CapsuleGeometry(0.03, 0.09, 2, 5).rotateZ(Math.PI / 2), mat('#e08a3a', { opacity: 0.8 }), 0, 0.05, 0));
  cane.add(pezzo(new THREE.IcosahedronGeometry(0.028, 0), mat('#e08a3a', { opacity: 0.8 }), 0.085, 0.075, 0));
  g.add(cane);
  const statoCane = { x: PASTORE.x + 0.3, z: PASTORE.y + 0.2, verso: 0, vel: 0, passo: 0 };
  const metaCane = new THREE.Vector2(statoCane.x, statoCane.z);
  let ultimoClic = -99, fischio = -99, richiamato = true, ora = 0;
  const punto = new THREE.Vector3();
  // Il clic cade sul terreno: cerco il punto del raggio che tocca le colline, a piccoli passi
  const sulTerreno = (raggio: THREE.Raycaster) => {
    const o = raggio.ray.origin, d = raggio.ray.direction;
    for (let t = 0; t < 60; t += 0.04) {
      punto.copy(o).addScaledVector(d, t);
      if (punto.y <= altezza(punto.x, punto.z)) return true;
    }
    return false;
  };
  function clic(raggio: THREE.Raycaster) {
    if (!sulTerreno(raggio) || Math.hypot(punto.x, punto.z) > L - 1) return;
    metaCane.set(punto.x, punto.z);
    ultimoClic = ora;
    richiamato = false;
  }

  // --- Nuvole: point cloud densa sopra la valle. Ogni nuvola resta intera: il puntatore la spinge piano via,
  // poi lei torna sulla sua strada.
  type Nuvola = { x: number; y: number; z: number; vel: number; da: number; n: number; largo: number; ox: number; oz: number; vx: number; vz: number };
  const nuvole: Nuvola[] = [];
  const QUANTE = 6, PER = p.telefono ? 1200 : 2600, N = QUANTE * PER;
  const base = new Float32Array(N * 3), posNuvole = new Float32Array(N * 3), colNuvole = new Float32Array(N * 3), luceNuvole = new Float32Array(N);
  for (let k = 0; k < QUANTE; k++) {
    const largo = 1.4 + r() * 1.2;
    const nv: Nuvola = { x: -11 + k * 3.8 + r() * 1.2, y: 4.2 + r() * 1.1, z: -3.5 + r() * 8, vel: 0.1 + r() * 0.08, da: k * PER, n: PER, largo, ox: 0, oz: 0, vx: 0, vz: 0 };
    nuvole.push(nv);
    const quante = 5 + Math.floor(r() * 3);
    const sfere = Array.from({ length: quante }, (_, q) => {
      const t = q / (quante - 1) - 0.5;
      return { x: t * largo * 2 + (r() - 0.5) * 0.4, y: (0.5 - Math.abs(t)) * 0.5 * largo, z: (r() - 0.5) * largo * 0.6, raggio: (0.5 + (0.5 - Math.abs(t)) * 0.9) * (0.45 + largo * 0.3) };
    });
    const volume = sfere.reduce((a, s) => a + s.raggio ** 3, 0), pancia = -0.25 * (0.45 + largo * 0.3);
    for (let i = 0; i < PER; i++) {
      let u = r() * volume, s = sfere[0]!;
      for (const q of sfere) { u -= q.raggio ** 3; if (u <= 0) { s = q; break; } }
      const a = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), d = s.raggio * (0.55 + 0.45 * Math.cbrt(r()));
      const x = s.x + Math.sin(v) * Math.cos(a) * d, z = s.z + Math.sin(v) * Math.sin(a) * d;
      let y = s.y + Math.cos(v) * d * 0.7;
      if (y < pancia) y = pancia - r() * 0.05;
      const j = nv.da + i;
      base.set([x, y, z], j * 3);
      luceNuvole[j] = THREE.MathUtils.clamp((y - pancia) / (largo * 0.9), 0, 1);
    }
  }
  const geoNuvole = new THREE.BufferGeometry();
  geoNuvole.setAttribute('position', new THREE.BufferAttribute(posNuvole, 3));
  geoNuvole.setAttribute('color', new THREE.BufferAttribute(colNuvole, 3));
  const puntiNuvole = new THREE.Points(geoNuvole, new THREE.PointsMaterial({ size: 0.04, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
  puntiNuvole.frustumCulled = false;
  g.add(puntiNuvole);
  // Ombre delle nuvole: un velo sul terreno, più scuro sotto ogni nuvola, spostato un po' dalla luce del sole
  const ombre = Array.from({ length: QUANTE }, () => new THREE.Vector4());
  const geoOmbra = new THREE.PlaneGeometry(L * 2.2, L * 2.2, 70, 70).rotateX(-Math.PI / 2);
  const po = geoOmbra.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < po.count; i++) po.setY(i, Math.max(0.14, altezza(po.getX(i), po.getZ(i))) + 0.03);
  const matOmbra = new THREE.ShaderMaterial({
    uniforms: { ombre: { value: ombre }, colore: { value: p.chiaro ? new THREE.Color('#3a3530') : c.bg.clone() }, forza: { value: 0 } },
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vXZ; void main() { vXZ = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform vec4 ombre[${QUANTE}]; uniform vec3 colore; uniform float forza; varying vec2 vXZ;
      void main() {
        float a = 0.0;
        for (int i = 0; i < ${QUANTE}; i++) {
          vec2 d = (vXZ - ombre[i].xy) / ombre[i].zw;
          a = max(a, smoothstep(1.0, 0.35, length(d)));
        }
        float bordo = smoothstep(${L.toFixed(1)}, ${(L - 1.5).toFixed(1)}, length(vXZ));
        gl_FragColor = vec4(colore, a * forza * bordo);
      }`,
  });
  const ombra = new THREE.Mesh(geoOmbra, matOmbra);
  ombra.renderOrder = 5;
  g.add(ombra);

  // --- Mongolfiere: palloni pieni di colore, gli spicchi segnati da fili più scuri; cesta e funi
  const profilo = Array.from({ length: 12 }, (_, k) => {
    const t = k / 11, a = t * Math.PI;
    return new THREE.Vector2(Math.max(0.06, Math.sin(a * 0.92 + 0.12) * (0.3 + 0.12 * Math.sin(a * 0.5))) * (t < 0.3 ? 0.5 + t * 1.6 : 1), -0.38 + t * 0.78);
  });
  const geoPallone = new THREE.LatheGeometry(profilo, 12);
  const spicchi = new THREE.EdgesGeometry(geoPallone, 20);
  const mongolfiere = (['#e08a3a', '#5fb6d9', '#6fa646'] as const).map((tinta, k) => {
    const o = new THREE.Group(), colore = tono(tinta);
    o.add(new THREE.Mesh(geoPallone, new THREE.MeshBasicMaterial({ color: colore })));
    o.add(new THREE.LineSegments(spicchi, new THREE.LineBasicMaterial({ color: colore.clone().offsetHSL(0, 0, -0.18) })));
    o.add(pezzo(new THREE.BoxGeometry(0.1, 0.08, 0.1), mat('#a07a50', { opacity: 0.9 }), 0, -0.62, 0));
    const funi: THREE.Vector3[] = [];
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) funi.push(new THREE.Vector3(x! * 0.05, -0.58, z! * 0.05), new THREE.Vector3(x! * 0.09, -0.4, z! * 0.09));
    o.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(funi), linea('#a07a50', 0.8)));
    const fiamma = pezzo(new THREE.ConeGeometry(0.025, 0.07, 5), mat('#f2b62f', { opacity: 0 }), 0, -0.49, 0);
    o.add(fiamma);
    o.scale.setScalar(0.85);
    g.add(o);
    const y = [3.2, 3.9, 2.8][k]!;
    return { o, fiamma, cx: [-2.6, 3.2, 0.6][k]!, cz: [1.2, -1.4, -4][k]!, y, fase: k * 2.1, quota: y };
  });

  // --- Cielo minimale: poche stelle piccole, le costellazioni, qualche stella cadente, una luna semplice.
  // Si vede abbassando lo sguardo verso l'orizzonte.
  const CUPOLA = 30;
  const sullaCupola = (az: number, el: number, fuori = new THREE.Vector3()) => fuori.set(Math.sin(az) * Math.cos(el) * CUPOLA, Math.sin(el) * CUPOLA - 1, -Math.cos(az) * Math.cos(el) * CUPOLA);
  const inchiostro = p.chiaro ? c.fg.clone() : new THREE.Color('#fbf8ef');
  const STELLE = 150, stelle = puntiMorbidi(STELLE), brillio = new Float32Array(STELLE * 2);
  for (let i = 0; i < STELLE; i++) {
    const az = Math.PI + (r() - 0.5) * Math.PI * 1.4, el = 0.04 + Math.asin(r()) * 0.7;
    stelle.pos.set(sullaCupola(az, el).toArray(), i * 3);
    stelle.dim[i] = 0.16;
    stelle.col.set(inchiostro.toArray(), i * 3);
    stelle.alfa[i] = 0;
    brillio[i * 2] = 0.25 + r() * 0.5; brillio[i * 2 + 1] = r() * 6;
  }
  stelle.punti.renderOrder = 12;
  g.add(stelle.punti);
  // Costellazioni vere, semplificate (Grande Carro, Cassiopea, Orione), basse sull'orizzonte; stelle in gradi
  const COSTELLAZIONI: { az: number; el: number; stelle: number[][]; righe: number[][] }[] = [
    { az: Math.PI - 0.5, el: 0.22, stelle: [[0, 0], [5, 0.6], [9.5, 0.2], [14, 1.4], [15.5, 6], [21.5, 6.5], [21.5, 1.5]], righe: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    { az: Math.PI + 0.45, el: 0.3, stelle: [[0, 0], [4, -3.5], [8, 0], [12, -4], [16, 0.5]], righe: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { az: Math.PI + 0.05, el: 0.12, stelle: [[0, 9], [9, 8], [3.5, 1], [5, 0.5], [6.5, 0], [1, -8], [9.5, -7.5]], righe: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1]] },
  ];
  const posCost: number[] = [], stelleCost: THREE.Vector3[] = [];
  COSTELLAZIONI.forEach(k => {
    const punti = k.stelle.map(([x, y]) => sullaCupola(k.az + (x! * Math.PI) / 180, k.el + (y! * Math.PI) / 180));
    stelleCost.push(...punti);
    k.righe.forEach(([a, b]) => posCost.push(...punti[a!]!.toArray(), ...punti[b!]!.toArray()));
  });
  const geoCost = new THREE.BufferGeometry();
  geoCost.setAttribute('position', new THREE.Float32BufferAttribute(posCost, 3));
  const matCost = new THREE.LineBasicMaterial({ color: inchiostro, transparent: true, opacity: 0, fog: false });
  const linee = new THREE.LineSegments(geoCost, matCost);
  linee.renderOrder = 12;
  g.add(linee);
  const stelleForti = puntiMorbidi(stelleCost.length);
  stelleCost.forEach((q, i) => { stelleForti.pos.set(q.toArray(), i * 3); stelleForti.dim[i] = 0.26; stelleForti.col.set(inchiostro.toArray(), i * 3); stelleForti.alfa[i] = 0; });
  stelleForti.punti.renderOrder = 12;
  g.add(stelleForti.punti);
  const matCadente = new THREE.LineBasicMaterial({ color: inchiostro, transparent: true, opacity: 0, fog: false });
  const cadente = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), matCadente);
  cadente.frustumCulled = false;
  cadente.renderOrder = 12;
  g.add(cadente);
  const scia = { t: 1, da: new THREE.Vector3(), dir: new THREE.Vector3(), attesa: 8 };
  const cerchioDi = (raggio: number) => Array.from({ length: 33 }, (_, k) => new THREE.Vector3(Math.cos(k / 32 * Math.PI * 2) * raggio, Math.sin(k / 32 * Math.PI * 2) * raggio, 0));
  const sole = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cerchioDi(0.9)), new THREE.LineBasicMaterial({ color: c.arancio, transparent: true, opacity: 0.9, fog: false }));
  g.add(sole);
  // Luna: un cerchio sottile con la parte illuminata appena piena; la fase cambia ogni notte
  const luna = new THREE.Group();
  luna.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cerchioDi(0.7)), new THREE.LineBasicMaterial({ color: inchiostro, transparent: true, opacity: 0.8, fog: false })));
  const parteLuna = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: inchiostro, transparent: true, opacity: 0.3, fog: false, side: THREE.DoubleSide, depthWrite: false }));
  luna.add(parteLuna);
  luna.traverse(o => { o.renderOrder = 12; });
  g.add(luna);
  const faseLuna = (f: number) => {
    const e = Math.cos(f * Math.PI * 2), lato = f < 0.5 ? 1 : -1, forma = new THREE.Shape();
    for (let k = 0; k <= 16; k++) { const a = Math.PI / 2 - (k / 16) * Math.PI, x = Math.cos(a) * 0.7 * lato, y = Math.sin(a) * 0.7; if (k) forma.lineTo(x, y); else forma.moveTo(x, y); }
    for (let k = 0; k <= 16; k++) { const a = -Math.PI / 2 + (k / 16) * Math.PI; forma.lineTo(Math.cos(a) * 0.7 * e * lato, Math.sin(a) * 0.7); }
    parteLuna.geometry.dispose();
    parteLuna.geometry = new THREE.ShapeGeometry(forma);
  };
  let notteLuna = -1;

  // --- Notte e tramonto: un velo davanti alla camera scurisce la valle (o la scalda); finestre, luci e cielo restano sopra
  p.scena.add(p.camera);
  const matVelo = new THREE.MeshBasicMaterial({ color: c.bg.clone(), transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false });
  const velo = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), matVelo);
  velo.position.z = -0.5;
  velo.renderOrder = 10;
  p.camera.add(velo);

  // --- Durata del giorno: 3 minuti, cambiabile dallo slider della pagina (in minuti)
  let minuti = 3;
  try { minuti = Number(localStorage.getItem(GIORNO)) || 3; } catch { /* niente */ }
  const cambiaGiorno = (e: Event) => { minuti = (e as CustomEvent<number>).detail; };
  window.addEventListener('misc:giorno', cambiaGiorno);
  const distruggi = p.distruggi;
  p.distruggi = () => { window.removeEventListener('misc:giorno', cambiaGiorno); distruggi(); };
  // Il giorno in quattro parti, con alba e tramonto più lunghi del vero: giorno, tramonto, notte, alba
  const GIORNO_FINE = 0.3, TRAMONTO_FINE = 0.5, NOTTE_FINE = 0.8;
  const liscio = (x: number) => x * x * (3 - 2 * x);
  let u = 0.05, notti = 0;

  // --- Ciclo
  const tmp = new THREE.Vector3(), via = new THREE.Vector3(), dummy = new THREE.Object3D();
  const nuvolaColore = new THREE.Color(), chiaroNuvola = new THREE.Color(), scuroNuvola = new THREE.Color();
  const biancoGiorno = new THREE.Color(p.chiaro ? '#fbf9f4' : '#e8e6e0'), ombraGiorno = new THREE.Color(p.chiaro ? '#b9b2a4' : '#8d8a84');
  const notteChiaro = new THREE.Color(p.chiaro ? '#8a90a0' : '#5b6476'), notteScuro = new THREE.Color(p.chiaro ? '#6a7080' : '#2e3442');
  const griglia = new Map<number, number[]>();
  const cella = (x: number, z: number) => Math.floor((x + L) / 0.5) * 100 + Math.floor((z + L) / 0.5);
  // Acqua per le pecore: fiume e laghetto sono vietati, tranne sul ponte
  const sulPonte = (x: number, z: number) => Math.hypot(x - puntoPonte.x, z - puntoPonte.z) < 0.4;
  function aggiorna(s: number, dt: number, p: Palco) {
    ora = s;
    const prima = u;
    u = (u + dt / (minuti * 60)) % 1;
    if (u < prima) notti++;
    const luce = u < GIORNO_FINE ? 1 : u < TRAMONTO_FINE ? 1 - liscio((u - GIORNO_FINE) / (TRAMONTO_FINE - GIORNO_FINE)) : u < NOTTE_FINE ? 0 : liscio((u - NOTTE_FINE) / (1 - NOTTE_FINE));
    const calore = u >= GIORNO_FINE && u < TRAMONTO_FINE ? Math.sin(((u - GIORNO_FINE) / (TRAMONTO_FINE - GIORNO_FINE)) * Math.PI) : u >= NOTTE_FINE ? Math.sin(((u - NOTTE_FINE) / (1 - NOTTE_FINE)) * Math.PI) : 0;
    const buio = 1 - luce;
    matVelo.color.copy(c.bg).lerp(c.arancio, calore * (1 - buio * 0.6) * 0.5);
    matVelo.opacity = Math.max(buio * 0.5, calore * 0.14);

    // Sole e luna sull'orizzonte; poche stelle che brillano piano; costellazioni a buio pieno; stella cadente rara
    const sullArco = (w: number, alto: number) => sullaCupola(Math.PI - 1.3 + w * 2.6, Math.sin(w * Math.PI) * alto + 0.01, tmp).multiplyScalar(0.8);
    const wSole = ((u - NOTTE_FINE + 1) % 1) / (1 - NOTTE_FINE + TRAMONTO_FINE);
    sole.visible = wSole <= 1;
    if (sole.visible) { sole.position.copy(sullArco(wSole, 0.5)); sole.lookAt(p.camera.position); }
    const wLuna = (u - GIORNO_FINE) / (1 - GIORNO_FINE);
    luna.visible = wLuna >= 0;
    if (luna.visible) {
      luna.position.copy(sullArco(wLuna, 0.4));
      luna.lookAt(p.camera.position);
      if (notti !== notteLuna) { notteLuna = notti; faseLuna(0.08 + ((notti % 8) / 8) * 0.84); }
    }
    for (let i = 0; i < STELLE; i++) stelle.alfa[i] = buio * (0.4 + 0.5 * Math.max(0, Math.sin(s * brillio[i * 2]! + brillio[i * 2 + 1]!)));
    stelle.aggiorna();
    matCost.opacity = Math.max(0, buio - 0.6) / 0.4 * 0.3;
    stelleForti.alfa.fill(buio * 0.85);
    stelleForti.aggiorna();
    scia.attesa -= dt;
    if (scia.attesa <= 0 && buio > 0.8) {
      scia.attesa = 12 + r() * 18; scia.t = 0;
      sullaCupola(Math.PI + (r() - 0.5) * 1.6, 0.2 + r() * 0.35, scia.da);
      scia.dir.set(-0.6 - r() * 0.4, -0.3 - r() * 0.2, (r() - 0.5) * 0.2).normalize();
    }
    if (scia.t < 1) {
      scia.t = Math.min(1, scia.t + dt / 0.9);
      cadente.geometry.setFromPoints([scia.da.clone().addScaledVector(scia.dir, Math.max(0, scia.t * 9 - 3)), scia.da.clone().addScaledVector(scia.dir, scia.t * 9)]);
      matCadente.opacity = Math.sin(scia.t * Math.PI) * 0.8;
    }
    // Ruota del mulino e pale eoliche; di notte finestre accese e luci rosse che lampeggiano in cima alle pale
    ruota.rotation.z -= dt * 0.8;
    eoliche.forEach(e => { e.rotore.rotation.z -= dt * e.vel; });
    finestre.forEach(f => { (f.material as THREE.MeshBasicMaterial).opacity = 0.15 + buio * 0.75; });
    eoliche.forEach((e, k) => { luciEoliche.alfa[k] = buio * (Math.sin(s * 2.2 + e.fase) > 0.3 ? 0.95 : 0.15); });
    luciEoliche.aggiorna();
    // Fiume: i trattini corrono lungo la corrente
    tratti.forEach((q, k) => {
      const lento = nelLago(fiume.getPointAt(q.t).x, fiume.getPointAt(q.t).z) ? 0.35 : 1;
      q.t = (q.t + q.vel * lento * dt) % 1;
      const a = fiume.getPointAt(q.t), t = fiume.getTangentAt(q.t), lato = q.lato * LARGO_FIUME * (lento < 1 ? 3 : 1);
      const x = a.x - t.z * lato, z = a.z + t.x * lato, y = Math.max(0.1, altezza(a.x, a.z)) + 0.035;
      posTratti.set([x, y, z, x - t.x * 0.12, y, z - t.z * 0.12], k * 6);
    });
    geoTratti.attributes.position!.needsUpdate = true;
    // Grano: onde di vento che attraversano il campo
    spighe.forEach((q, k) => {
      const onda = Math.sin(s * 1.6 - q.x * 2.2 - q.z * 1.4) * 0.5 + Math.sin(s * 0.7 + q.x) * 0.3;
      posSpighe.set([q.x, q.y, q.z, q.x + onda * 0.035, q.y + q.h, q.z + onda * 0.02], k * 6);
    });
    geoSpighe.attributes.position!.needsUpdate = true;

    // Nuvole: il colore segue l'ora; i punti ondeggiano piano; il puntatore spinge via tutta la nuvola, che poi torna
    chiaroNuvola.copy(biancoGiorno).lerp(notteChiaro, buio).lerp(c.arancio, calore * 0.45);
    scuroNuvola.copy(ombraGiorno).lerp(notteScuro, buio).lerp(c.arancio, calore * 0.25);
    const raggio = p.raggio;
    nuvole.forEach((nv, q) => {
      nv.x += nv.vel * dt;
      if (nv.x > 12) nv.x -= 24;
      if (raggio) {
        tmp.set(nv.x + nv.ox, nv.y, nv.z + nv.oz);
        raggio.ray.closestPointToPoint(tmp, via);
        const dx = tmp.x - via.x, dz = tmp.z - via.z, d = Math.hypot(dx, dz);
        if (d < nv.largo * 1.1 && d > 1e-3) { const k = (1 - d / (nv.largo * 1.1)) * dt * 1.2; nv.vx += (dx / d) * k; nv.vz += (dz / d) * k; }
      }
      nv.vx += -nv.ox * dt * 0.15; nv.vz += -nv.oz * dt * 0.15;
      nv.vx *= 1 - dt * 0.8; nv.vz *= 1 - dt * 0.8;
      nv.ox += nv.vx * dt; nv.oz += nv.vz * dt;
      const cx = nv.x + nv.ox, cz = nv.z + nv.oz;
      ombre[q]!.set(cx + 0.8, cz + 0.6, nv.largo * 1.2, nv.largo * 0.75);
      const respiro = 1 + Math.sin(s * 0.11 + nv.da) * 0.04;
      for (let i = 0; i < nv.n; i++) {
        const j = nv.da + i, k = j * 3, bx = base[k]!, by = base[k + 1]!, bz = base[k + 2]!;
        posNuvole[k] = cx + bx * respiro + Math.sin(by * 1.5 + s * 0.2 + bz * 0.6) * 0.08;
        posNuvole[k + 1] = nv.y + by * respiro + Math.sin(bx * 1.1 + s * 0.17) * 0.05;
        posNuvole[k + 2] = cz + bz * respiro + Math.cos(bx * 1 + by * 1.3 + s * 0.19) * 0.08;
        nuvolaColore.copy(scuroNuvola).lerp(chiaroNuvola, luceNuvole[j]!);
        colNuvole[k] = nuvolaColore.r; colNuvole[k + 1] = nuvolaColore.g; colNuvole[k + 2] = nuvolaColore.b;
      }
    });
    geoNuvole.attributes.position!.needsUpdate = true;
    geoNuvole.attributes.color!.needsUpdate = true;
    matOmbra.uniforms.forza!.value = luce * (p.chiaro ? 0.16 : 0.55);

    // Mongolfiere: un lento giro largo, su e giù; la fiammella si accende quando salgono
    mongolfiere.forEach(m => {
      const voluta = m.y + Math.sin(s * 0.1 + m.fase) * 0.5, prima2 = m.quota;
      m.quota = morbido(m.quota, voluta, dt * 0.3);
      const a = s * 0.02 + m.fase;
      m.o.position.set(m.cx + Math.sin(a) * 2, m.quota, m.cz + Math.cos(a * 0.8) * 1.3);
      m.o.rotation.y += dt * 0.04;
      const fm = m.fiamma.material as THREE.MeshBasicMaterial;
      fm.opacity = morbido(fm.opacity, m.quota - prima2 > 0.0003 ? 0.9 : 0, dt * 4);
    });

    // Cane: corre dove hai cliccato; dopo 8 secondi senza clic il pastore fischia e il cane torna
    if (!richiamato && s - ultimoClic > 8) { richiamato = true; fischio = s; metaCane.set(PASTORE.x + 0.3, PASTORE.y + 0.2); }
    fischi.forEach((l, k) => {
      const t = s - fischio - k * 0.25;
      (l.material as THREE.LineBasicMaterial).opacity = t > 0 && t < 1.2 ? (1 - t / 1.2) * 0.8 : 0;
      l.scale.setScalar(1 + Math.max(0, t) * 1.5);
      l.lookAt(p.camera.position);
    });
    {
      const k = statoCane, dx = metaCane.x - k.x, dz = metaCane.y - k.z, d = Math.hypot(dx, dz);
      k.vel = morbido(k.vel, d < 0.08 ? 0 : Math.min(2, 0.3 + d * 1.5), dt * 3);
      if (d > 0.05) k.verso += angolo(Math.atan2(-dz, dx) - k.verso) * Math.min(1, dt * 6);
      k.x += Math.cos(k.verso) * k.vel * dt; k.z -= Math.sin(k.verso) * k.vel * dt;
      k.passo += k.vel * dt;
      cane.position.set(k.x, Math.max(0.14, altezza(k.x, k.z)) + Math.abs(Math.sin(k.passo * 25)) * 0.012, k.z);
      cane.rotation.y = k.verso;
    }

    // Gregge: ogni pecora si tiene a distanza dalle vicine, resta col gruppo, scappa dal cane; quando è calma bruca
    // e fa due passi. Acqua e campo sono vietati (sul ponte si passa); il gregge ci gira intorno come una massa.
    griglia.clear();
    pecore.forEach((q, i) => { const k = cella(q.x, q.z); (griglia.get(k) ?? griglia.set(k, []).get(k)!).push(i); });
    pecore.forEach((q, i) => {
      let ax = 0, az = 0, mx = 0, mz = 0, cx = 0, cz = 0, n = 0, paura = 0;
      const k0 = cella(q.x, q.z);
      for (const k of [k0, k0 + 1, k0 - 1, k0 + 100, k0 - 100, k0 + 101, k0 - 101, k0 + 99, k0 - 99]) for (const j of griglia.get(k) ?? []) {
        if (j === i) continue;
        const o = pecore[j]!, dx = q.x - o.x, dz = q.z - o.z, d = Math.hypot(dx, dz);
        if (d > 0.8 || d < 1e-4) continue;
        n++; mx += o.vx; mz += o.vz; cx += o.x; cz += o.z;
        if (d < 0.16) { ax += (dx / d) * (0.16 - d) * 22; az += (dz / d) * (0.16 - d) * 22; }
        paura = Math.max(paura, (1 - o.calma) * (1 - d / 0.8));
      }
      const dc = Math.hypot(q.x - statoCane.x, q.z - statoCane.z) || 1e-3;
      if (dc < 2) { ax += ((q.x - statoCane.x) / dc) * (2 - dc) * 2.8; az += ((q.z - statoCane.z) / dc) * (2 - dc) * 2.8; paura = Math.max(paura, 1 - dc / 2); }
      q.calma = morbido(q.calma, 1 - Math.min(1, paura * 1.6), dt * (paura > 1 - q.calma ? 4 : 0.35));
      const agitata = 1 - q.calma;
      if (n) {
        ax += ((mx / n) - q.vx) * 1.5 * (0.3 + agitata);
        az += ((mz / n) - q.vz) * 1.5 * (0.3 + agitata);
        ax += ((cx / n) - q.x) * (0.15 + agitata * 0.8);
        az += ((cz / n) - q.z) * (0.15 + agitata * 0.8);
      }
      q.timer -= dt;
      if (q.timer <= 0) { q.voglia = q.voglia ? 0 : 1; q.timer = q.voglia ? 1 + r() * 2 : 4 + r() * 9; if (q.voglia) q.verso += (r() - 0.5) * 2; }
      if (q.voglia && agitata < 0.3) { ax += Math.cos(q.verso) * 0.5; az -= Math.sin(q.verso) * 0.5; }
      for (const o of ostacoli) {
        const dx = q.x - o.x, dz = q.z - o.z, d = Math.hypot(dx, dz), raggio2 = o.r + 0.07;
        if (d < raggio2 && d > 1e-4) { ax += (dx / d) * (raggio2 - d) * 30; az += (dz / d) * (raggio2 - d) * 30; }
      }
      // Fiume, laghetto e campo: spinta verso fuori, guardando un passo avanti
      const avanti = 0.12, fx = q.x + Math.cos(q.verso) * avanti, fz = q.z - Math.sin(q.verso) * avanti;
      if (!sulPonte(fx, fz) && (dalFiume(fx, fz) < LARGO_FIUME * 0.9 || nelLago(fx, fz, 0.1))) { ax -= Math.cos(q.verso) * 6; az += Math.sin(q.verso) * 6; }
      if (nelCampo(fx, fz, 0.05)) { const dx = q.x - CAMPO.x, dz = q.z - CAMPO.z, d = Math.hypot(dx, dz) || 1; ax += (dx / d) * 5; az += (dz / d) * 5; }
      const dr = Math.hypot(q.x, q.z);
      if (dr > L - 1.8) { ax -= (q.x / dr) * (dr - L + 1.8) * 4; az -= (q.z / dr) * (dr - L + 1.8) * 4; }
      q.vx += ax * dt; q.vz += az * dt;
      const attrito = Math.exp(-dt * (agitata > 0.2 ? 1.2 : 3.5));
      q.vx *= attrito; q.vz *= attrito;
      const v = Math.hypot(q.vx, q.vz), vMax = 0.11 + agitata * 1.1;
      if (v > vMax) { q.vx *= vMax / v; q.vz *= vMax / v; }
      q.x += q.vx * dt; q.z += q.vz * dt;
      if (v > 0.03) q.verso += angolo(Math.atan2(-q.vz, q.vx) - q.verso) * Math.min(1, dt * 4);
      q.testa = morbido(q.testa, v < 0.04 ? 1 : 0, dt * 2);
      const y = sulPonte(q.x, q.z) && dalFiume(q.x, q.z) < LARGO_FIUME ? ponte.position.y + 0.04 : altezza(q.x, q.z), passo = v > 0.03 ? Math.abs(Math.sin(s * 14 + q.fase)) * 0.01 : 0;
      dummy.position.set(q.x, y + 0.045 + passo, q.z);
      dummy.rotation.set(0, q.verso, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      corpi.setMatrixAt(i, dummy.matrix);
      const giu = q.testa * (0.025 + Math.abs(Math.sin(s * 3 + q.fase)) * 0.008);
      dummy.position.set(q.x + Math.cos(q.verso) * 0.085, y + 0.06 - giu, q.z - Math.sin(q.verso) * 0.085);
      dummy.updateMatrix();
      teste.setMatrixAt(i, dummy.matrix);
    });
    corpi.instanceMatrix.needsUpdate = true;
    teste.instanceMatrix.needsUpdate = true;
  }
  return p;
}
