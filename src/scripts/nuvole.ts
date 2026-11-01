import * as THREE from 'three';
import { casuale, mat, pezzo, sasso, linea, terreno, nastri, puntiMorbidi, palco, SITO, type Nastro, type Palco } from './natura';

// Una piccola valle sotto un cielo grande, nello stile del bosco. In basso: un mulino che gira piano sulla collina,
// un lago dalla riva irregolare, alberi, un pastore e il suo cane, un gregge di pecore. In alto: nuvole fatte di
// migliaia di punti che si gonfiano e cambiano forma; il puntatore le scava, poi si richiudono. Mongolfiere fra le
// nuvole e la valle, a volte un po' di pioggia sul lago.
// Il giorno gira: alba e tramonto lunghi, poi la notte con le stelle che brillano, le costellazioni, le stelle
// cadenti e la luna con la sua fase. Un clic sul prato manda il cane lì: le pecore si allontanano insieme, poi si
// calmano e tornano a brucare. Quando smetti, il pastore fischia e il cane torna da lui.

const GIORNO = 'misc-giorno';

export function monta(el: HTMLElement) {
  const r = casuale(23);
  const p = palco(el, {
    camera: new THREE.Vector3(0, 1.7, 11.5), mira: new THREE.Vector3(0, 3.3, 0), giro: 0.006, inclina: [-0.08, 0.2], nebbia: [1.1, 2.6], aggiorna, clic,
    scena: 'nuvole', toni: SITO,
  });
  const g = p.gruppo, c = p.colori;
  const morbido = (da: number, a: number, k: number) => da + (a - da) * Math.min(1, k);
  const angolo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

  // --- Valle: prato con colline basse, una più alta per il mulino
  const COLLE = new THREE.Vector2(-1.5, -1.3), LAGO = new THREE.Vector2(1.5, 0.3), PASTORE = new THREE.Vector2(-0.7, -0.4);
  const altezza = (x: number, z: number) => {
    const bordo = Math.max(0, Math.min(1, (4.6 - Math.hypot(x, z)) / 1.4));
    return bordo * (0.08 + 0.08 * Math.sin(x * 0.7 + 1) * Math.cos(z * 0.6) + 0.5 * Math.exp(-((x - COLLE.x) ** 2 + (z - COLLE.y) ** 2) / 1.2));
  };
  terreno(g, c.verde, 4.8, altezza);

  // --- Mulino: torre di pietra a otto lati, tetto a cono, quattro pale a graticcio; finestre che di notte si accendono
  const mulino = new THREE.Group();
  mulino.add(pezzo(new THREE.CylinderGeometry(0.3, 0.44, 1.5, 8), mat('#d8cfba'), 0, 0.75, 0));
  mulino.add(pezzo(new THREE.ConeGeometry(0.4, 0.5, 8), mat('#e08a3a'), 0, 1.75, 0));
  mulino.add(pezzo(new THREE.BoxGeometry(0.18, 0.3, 0.04), mat('#7a5230'), 0, 0.15, 0.42));
  const finestre = ([[0.8, 0.35], [1.15, 0.33]] as const).map(([y, z]) => pezzo(new THREE.BoxGeometry(0.1, 0.13, 0.03), mat('#f2b62f', { opacity: 0.2 }), 0, y, z));
  finestre.forEach(f => mulino.add(f));
  const mozzo = new THREE.Group();
  mozzo.position.set(0, 1.5, 0.44);
  mozzo.add(pezzo(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 8).rotateX(Math.PI / 2), mat('#7a5230')));
  for (let k = 0; k < 4; k++) {
    const pala = new THREE.Group();
    pala.rotation.z = (k / 4) * Math.PI * 2;
    pala.add(pezzo(new THREE.BoxGeometry(0.03, 1.1, 0.025), mat('#7a5230'), 0, 0.6, 0.03));
    pala.add(pezzo(new THREE.BoxGeometry(0.22, 0.84, 0.01), mat('#fbf8ef', { opacity: 0.12 }), 0.13, 0.69, 0.04));
    const graticcio: THREE.Vector3[] = [];
    for (let q = 0; q <= 6; q++) { const y = 0.27 + q * 0.14; graticcio.push(new THREE.Vector3(0.02, y, 0.05), new THREE.Vector3(0.24, y, 0.05)); }
    pala.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(graticcio), linea('#7a5230', 0.8)));
    mozzo.add(pala);
  }
  mulino.add(mozzo);
  mulino.position.set(COLLE.x, altezza(COLLE.x, COLLE.y) - 0.05, COLLE.y);
  mulino.rotation.y = 0.45;
  g.add(mulino);

  // --- Lago dalla riva irregolare: bordo a filo e riempimento tenue; i cerchi della pioggia si allargano
  const rivaDi = (a: number) => 0.9 * (1 + 0.22 * Math.sin(a * 2 + 1) + 0.12 * Math.sin(a * 5 + 2) + 0.06 * Math.sin(a * 9));
  const nelLago = (x: number, z: number, margine = 0) => {
    const ex = (x - LAGO.x) / 1.3, ez = (z - LAGO.y) / 0.85;
    return Math.hypot(ex, ez) < rivaDi(Math.atan2(ez, ex)) + margine;
  };
  const geoLago = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
  const pl = geoLago.attributes.position as THREE.BufferAttribute, riva: THREE.Vector3[] = [];
  for (let i = 1; i < pl.count; i++) {
    const a = Math.atan2(-pl.getZ(i), pl.getX(i)), d = rivaDi(a);
    pl.setXYZ(i, Math.cos(a) * d * 1.3, 0, -Math.sin(a) * d * 0.85);
    riva.push(new THREE.Vector3(pl.getX(i), 0.002, pl.getZ(i)));
  }
  const lago = pezzo(geoLago, mat('#5fb6d9', { opacity: 0.2, fili: 0 }));
  lago.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(riva), linea('#5fb6d9', 0.85)));
  lago.position.set(LAGO.x, altezza(LAGO.x, LAGO.y) + 0.02, LAGO.y);
  g.add(lago);
  const cerchioGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 32 }, (_, k) => new THREE.Vector3(Math.cos(k / 32 * Math.PI * 2), 0, Math.sin(k / 32 * Math.PI * 2))));
  const cerchi = Array.from({ length: 12 }, () => {
    const l = new THREE.LineLoop(cerchioGeo, linea('#5fb6d9', 0));
    l.position.y = lago.position.y + 0.005;
    g.add(l);
    return { l, t: 1 };
  });
  let prossimoCerchio = 0;
  const cerchio = (x: number, z: number) => { const q = cerchi[prossimoCerchio++ % cerchi.length]!; q.l.position.x = x; q.l.position.z = z; q.t = 0; };

  // --- Alberi e ciuffi d'erba
  const alberi: THREE.Group[] = [];
  ([[-3.2, -1.6, 1, 1.3], [-3.6, -0.3, 0, 1], [3.3, -1.9, 1, 1.2], [3.8, -0.4, 1, 1], [-2.6, 1.9, 0, 0.9], [0.6, -3.1, 0, 1.1], [3.2, 2.0, 0, 0.8], [-0.4, -3.6, 1, 1.3]] as const).forEach(([x, z, abete, h]) => {
    const o = new THREE.Group();
    o.add(pezzo(new THREE.CylinderGeometry(0.035, 0.05, h * 0.4, 5), mat('#7a5230'), 0, h * 0.2, 0));
    if (abete) for (let k = 0; k < 3; k++) o.add(pezzo(new THREE.ConeGeometry(0.3 - k * 0.07, 0.4, 7), mat(k % 2 ? '#5f9c45' : '#4f8a3c'), 0, h * 0.36 + k * 0.22, 0));
    else o.add(pezzo(sasso(0.32 * h, r, 1), mat('#6fa646'), 0, h * 0.68, 0));
    o.position.set(x, altezza(x, z), z);
    g.add(o);
    alberi.push(o);
  });
  const fili: Nastro[] = [];
  const erbe = ['#6fa646', '#88b94f', '#5c9140'].map(x => new THREE.Color(x));
  for (let k = 0; k < (p.telefono ? 30 : 50); k++) {
    const a = r() * Math.PI * 2, d = 1.2 + Math.sqrt(r()) * 3.2, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (nelLago(x, z, 0.3)) continue;
    for (let q = 0; q < 4; q++) {
      const fx = x + (r() - 0.5) * 0.14, fz = z + (r() - 0.5) * 0.14;
      fili.push({ x: fx, z: fz, y: altezza(fx, fz), alto: 0.08 + r() * 0.12, largo: 0.02, angolo: r() * 6, fase: r() * 6, colore: erbe[q % 3]! });
    }
  }
  const erba = nastri(fili, 4);
  g.add(erba.mesh);

  // --- Animali a quattro zampe: corpo, collo con la testa, quattro zampe con anca e ginocchio (come i cervi)
  type Zampa = { anca: THREE.Group; ginocchio: THREE.Group; fase: number };
  type Bestia = { o: THREE.Group; corpo: THREE.Group; collo: THREE.Group; zampe: Zampa[]; coda?: THREE.Object3D; x: number; z: number; verso: number; vel: number; giro: number; passo: number; falcata: number; alto: number };
  const bestia = (corpo: THREE.Group, testa: THREE.Object3D, alto: number, lungo: number, largo: number, zampa: number, tinta: string, falcata: number): Bestia => {
    const o = new THREE.Group(), pancia = new THREE.Group(), collo = new THREE.Group();
    pancia.position.y = alto;
    pancia.add(corpo);
    collo.position.set(lungo * 0.5, 0.02, 0);
    collo.add(testa);
    pancia.add(collo);
    o.add(pancia);
    const m = mat(tinta, { opacity: 0.6 });
    const sopra = new THREE.CylinderGeometry(zampa * 0.18, zampa * 0.12, zampa * 0.5, 5).translate(0, -zampa * 0.25, 0);
    const sotto = new THREE.CylinderGeometry(zampa * 0.11, zampa * 0.08, zampa * 0.5, 5).translate(0, -zampa * 0.25, 0);
    // Passo: posteriore sinistra, anteriore sinistra, posteriore destra, anteriore destra
    const zampe = ([[-1, -1, 0], [1, -1, 0.25], [-1, 1, 0.5], [1, 1, 0.75]] as const).map(([dx, dz, fase]) => {
      const anca = new THREE.Group(), ginocchio = new THREE.Group();
      anca.position.set(dx * lungo * 0.36, -0.01, dz * largo);
      anca.add(pezzo(sopra, m));
      ginocchio.position.y = -zampa * 0.5;
      ginocchio.add(pezzo(sotto, m));
      anca.add(ginocchio);
      pancia.add(anca);
      return { anca, ginocchio, fase };
    });
    g.add(o);
    return { o, corpo: pancia, collo, zampe, x: 0, z: 0, verso: 0, vel: 0, giro: 0, passo: 0, falcata, alto };
  };
  // Muove una bestia verso una direzione voluta, con velocità e virate che cambiano piano; poi posa le zampe
  const muovi = (b: Bestia, hx: number, hz: number, voluta: number, dt: number, svelta = 1) => {
    b.vel = morbido(b.vel, voluta, dt * 1.6 * svelta);
    const diff = angolo(Math.atan2(-hz, hx) - b.verso);
    b.giro = morbido(b.giro, b.vel > 0.02 ? THREE.MathUtils.clamp(diff * 1.8, -1.4 * svelta, 1.4 * svelta) : 0, dt * 3);
    b.verso += b.giro * dt;
    let nx = b.x + Math.cos(b.verso) * b.vel * dt, nz = b.z - Math.sin(b.verso) * b.vel * dt;
    if (Math.hypot(nx, nz) > 4 || nelLago(nx, nz, 0.15) || Math.hypot(nx - COLLE.x, nz - COLLE.y) < 0.55) { b.verso += dt * 2.5; b.vel *= 0.6; nx = b.x; nz = b.z; }
    b.x = nx; b.z = nz;
    b.passo += (b.vel * dt) / b.falcata;
    const amp = THREE.MathUtils.clamp(b.vel / (b.falcata * 1.4), 0, 1.4), giro2 = Math.PI * 2 * b.passo;
    b.o.position.set(b.x, altezza(b.x, b.z), b.z);
    b.o.rotation.y = b.verso;
    b.corpo.position.y = b.alto + Math.sin(giro2 * 2) * 0.006 * amp;
    b.corpo.rotation.x = Math.sin(giro2 * 2 + 0.6) * 0.015 * amp - b.giro * 0.05;
    b.zampe.forEach(z => {
      const fase = Math.PI * 2 * (b.passo + z.fase);
      z.anca.rotation.z = Math.sin(fase) * 0.45 * amp;
      z.ginocchio.rotation.z = -(Math.max(0, Math.cos(fase)) ** 1.5) * 0.7 * amp;
    });
  };

  // --- Pecore: lana a sbuffi, muso scuro; brucano a testa bassa, fanno due passi, restano vicine al gregge
  const lana = mat(p.chiaro ? '#fbf9f4' : '#f2efe8', { grezzo: true, opacity: p.chiaro ? 0.7 : 0.3, fili: p.chiaro ? 0.5 : 0.85 }), muso = mat('#5a5048', { opacity: 0.7 });
  type Pecora = Bestia & { stato: 'bruca' | 'passeggia' | 'fugge'; timer: number; paura: number; testa: number };
  const pecore: Pecora[] = Array.from({ length: 8 }, (_, k) => {
    const corpo = new THREE.Group();
    for (let q = 0; q < 6; q++) corpo.add(pezzo(new THREE.IcosahedronGeometry(0.075, 0), lana, (q % 3 - 1) * 0.07, 0.03 + (q > 2 ? 0.03 : 0), (q % 2 ? 1 : -1) * 0.03));
    const testa = new THREE.Group();
    testa.add(pezzo(new THREE.CapsuleGeometry(0.03, 0.05, 2, 5).rotateZ(Math.PI / 2 - 0.4), muso, 0.05, 0.02, 0));
    testa.add(pezzo(new THREE.IcosahedronGeometry(0.04, 0), lana, 0.02, 0.05, 0));
    const b = bestia(corpo, testa, 0.17, 0.22, 0.045, 0.16, '#5a5048', 0.12) as Pecora;
    const a = r() * 6, d = r() * 0.8;
    Object.assign(b, { x: 1 + Math.cos(a) * d, z: -1.6 + Math.sin(a) * d, verso: r() * 6, stato: 'bruca', timer: r() * 6, paura: 0, testa: 0 });
    b.o.scale.setScalar(k === 7 ? 0.65 : 0.9 + r() * 0.2);
    return b;
  });

  // --- Cane: snello e veloce, coda che scodinzola; il pastore col bastone vicino al mulino
  const cane = (() => {
    const corpo = new THREE.Group(), pelo = mat('#e08a3a', { opacity: 0.35 });
    corpo.add(pezzo(new THREE.CapsuleGeometry(0.05, 0.16, 3, 6).rotateZ(Math.PI / 2), pelo));
    const testa = new THREE.Group();
    testa.add(pezzo(new THREE.IcosahedronGeometry(0.05, 0), pelo, 0.03, 0.07, 0), pezzo(new THREE.ConeGeometry(0.025, 0.07, 5).rotateZ(-Math.PI / 2), pelo, 0.09, 0.06, 0));
    testa.add(pezzo(new THREE.ConeGeometry(0.018, 0.04, 4), pelo, 0.02, 0.12, 0.025), pezzo(new THREE.ConeGeometry(0.018, 0.04, 4), pelo, 0.02, 0.12, -0.025));
    const b = bestia(corpo, testa, 0.16, 0.24, 0.04, 0.16, '#a0602a', 0.16);
    const coda = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.1, 0.07, 0)]), linea('#e08a3a', 0.9));
    coda.position.set(-0.12, 0.02, 0);
    b.corpo.add(coda);
    b.coda = coda;
    b.x = PASTORE.x + 0.3; b.z = PASTORE.y + 0.2;
    return b;
  })();
  const pastore = new THREE.Group();
  pastore.add(pezzo(new THREE.CapsuleGeometry(0.06, 0.2, 3, 6), mat('#6f9c4a', { opacity: 0.4 }), 0, 0.18, 0));
  pastore.add(pezzo(new THREE.IcosahedronGeometry(0.05, 0), mat('#d8cfba'), 0, 0.38, 0));
  pastore.add(pezzo(new THREE.ConeGeometry(0.08, 0.06, 7), mat('#7a5230'), 0, 0.44, 0));
  pastore.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.09, 0, 0), new THREE.Vector3(0.11, 0.5, 0), new THREE.Vector3(0.07, 0.55, 0)]), linea('#7a5230', 0.9)));
  pastore.position.set(PASTORE.x, altezza(PASTORE.x, PASTORE.y), PASTORE.y);
  g.add(pastore);
  // Fischio: tre archi che si allargano dalla testa del pastore
  const fischi = [0, 1, 2].map(() => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 9 }, (_, q) => new THREE.Vector3(Math.cos(-0.7 + q * 0.175) * 0.1, Math.sin(-0.7 + q * 0.175) * 0.1, 0))), linea('#fbf8ef', 0));
    l.position.set(PASTORE.x + 0.06, pastore.position.y + 0.4, PASTORE.y);
    g.add(l);
    return l;
  });
  const metaCane = new THREE.Vector2(PASTORE.x + 0.3, PASTORE.y + 0.2);
  let ultimoClic = -99, fischio = -99, richiamato = true, ora = 0;
  const suolo = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1), punto = new THREE.Vector3();
  function clic(raggio: THREE.Raycaster) {
    if (!raggio.ray.intersectPlane(suolo, punto) || Math.hypot(punto.x, punto.z) > 4 || nelLago(punto.x, punto.z)) return;
    metaCane.set(punto.x, punto.z);
    ultimoClic = ora;
    richiamato = false;
  }

  // --- Nuvole: point cloud densa. Ogni nuvola è l'unione di qualche sfera, riempita di punti più fitti verso il bordo
  // (così la sagoma è netta); ogni punto ricorda il suo posto, ondeggia piano e torna dopo la spinta del puntatore.
  type Nuvola = { x: number; y: number; z: number; vel: number; da: number; n: number; largo: number };
  const nuvole: Nuvola[] = [];
  const QUANTE = 7, PER = p.telefono ? 1100 : 2600, N = QUANTE * PER;
  const base = new Float32Array(N * 3), spinta = new Float32Array(N * 3), posNuvole = new Float32Array(N * 3), colNuvole = new Float32Array(N * 3), luceNuvole = new Float32Array(N);
  for (let k = 0; k < QUANTE; k++) {
    const largo = 1.2 + r() * 1.4;
    const nv: Nuvola = { x: -11 + k * 3.3 + r() * 1.2, y: 4.8 + r() * 2.4, z: -6 + r() * 4.5, vel: 0.06 + r() * 0.05, da: k * PER, n: PER, largo };
    nuvole.push(nv);
    const quante = 5 + Math.floor(r() * 3);
    const sfere = Array.from({ length: quante }, (_, q) => {
      const t = q / (quante - 1) - 0.5;
      return { x: t * largo * 2 + (r() - 0.5) * 0.3, y: (0.5 - Math.abs(t)) * 0.5 * largo + (r() - 0.3) * 0.2, z: (r() - 0.5) * 0.5, raggio: (0.5 + (0.5 - Math.abs(t)) * 0.9) * (0.5 + largo * 0.3) };
    });
    const volume = sfere.reduce((a, s) => a + s.raggio ** 3, 0), pancia = -0.25 * (0.5 + largo * 0.3);
    for (let i = 0; i < PER; i++) {
      let u = r() * volume, s = sfere[0]!;
      for (const q of sfere) { u -= q.raggio ** 3; if (u <= 0) { s = q; break; } }
      const a = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), d = s.raggio * (0.55 + 0.45 * Math.cbrt(r()));
      const x = s.x + Math.sin(v) * Math.cos(a) * d, z = s.z + Math.sin(v) * Math.sin(a) * d * 0.75;
      let y = s.y + Math.cos(v) * d * 0.8;
      // Pancia piatta: sotto la nuvola i punti si schiacciano su un piano
      if (y < pancia) y = pancia - r() * 0.04;
      const j = nv.da + i;
      base.set([x, y, z], j * 3);
      luceNuvole[j] = THREE.MathUtils.clamp((y - pancia) / (largo * 0.9), 0, 1);
    }
  }
  const geoNuvole = new THREE.BufferGeometry();
  geoNuvole.setAttribute('position', new THREE.BufferAttribute(posNuvole, 3));
  geoNuvole.setAttribute('color', new THREE.BufferAttribute(colNuvole, 3));
  const matNuvole = new THREE.PointsMaterial({ size: p.telefono ? 0.035 : 0.028, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const puntiNuvole = new THREE.Points(geoNuvole, matNuvole);
  puntiNuvole.frustumCulled = false;
  g.add(puntiNuvole);

  // --- Pioggia leggera: a turno da una nuvola, righe azzurre che cadono e fanno cerchi sul lago
  const GOCCE = 90, gocce = Array.from({ length: GOCCE }, () => ({ x: 0, y: -1, z: 0, v: 2.5 + r() }));
  const posPioggia = new Float32Array(GOCCE * 6), geoPioggia = new THREE.BufferGeometry();
  geoPioggia.setAttribute('position', new THREE.BufferAttribute(posPioggia, 3));
  const matPioggia = linea('#5fb6d9', 0);
  const pioggia = new THREE.LineSegments(geoPioggia, matPioggia);
  pioggia.frustumCulled = false;
  g.add(pioggia);

  // --- Mongolfiere: pallone a spicchi, cesta, funi; lontane, fra le nuvole e la valle
  const profilo = Array.from({ length: 12 }, (_, k) => {
    const t = k / 11, a = t * Math.PI;
    return new THREE.Vector2(Math.max(0.06, Math.sin(a * 0.92 + 0.12) * (0.3 + 0.12 * Math.sin(a * 0.5))) * (t < 0.3 ? 0.5 + t * 1.6 : 1), -0.38 + t * 0.78);
  });
  const geoPallone = new THREE.LatheGeometry(profilo, 12);
  const mongolfiere = (['#e08a3a', '#5fb6d9', '#6fa646'] as const).map((tinta, k) => {
    const o = new THREE.Group();
    o.add(pezzo(geoPallone, mat(tinta, { opacity: 0.22 })));
    o.add(pezzo(new THREE.BoxGeometry(0.1, 0.08, 0.1), mat('#a07a50', { opacity: 0.5 }), 0, -0.62, 0));
    const funi: THREE.Vector3[] = [];
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) funi.push(new THREE.Vector3(x! * 0.05, -0.58, z! * 0.05), new THREE.Vector3(x! * 0.09, -0.4, z! * 0.09));
    o.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(funi), linea('#a07a50', 0.7)));
    const fiamma = pezzo(new THREE.ConeGeometry(0.025, 0.07, 5), mat('#f2b62f', { opacity: 0 }), 0, -0.49, 0);
    o.add(fiamma);
    o.scale.setScalar([0.8, 0.6, 0.7][k]!);
    g.add(o);
    const y = [3.2, 4.1, 2.6][k]!;
    return { o, fiamma, cx: [-3.5, 3.8, 0.8][k]!, cz: [-4, -6, -8][k]!, y, fase: k * 2.1, quota: y };
  });

  // --- Cielo di notte: stelle su una cupola lontana, costellazioni, stelle cadenti, luna con la fase; di giorno il sole
  const CUPOLA = 30;
  const sullaCupola = (az: number, el: number, fuori = new THREE.Vector3()) => fuori.set(Math.sin(az) * Math.cos(el) * CUPOLA, Math.sin(el) * CUPOLA - 2, -Math.cos(az) * Math.cos(el) * CUPOLA);
  const inchiostro = p.chiaro ? c.fg.clone() : new THREE.Color('#fbf8ef');
  const STELLE = p.telefono ? 500 : 1000, stelle = puntiMorbidi(STELLE), brillio = new Float32Array(STELLE * 2);
  for (let i = 0; i < STELLE; i++) {
    const az = (r() - 0.5) * Math.PI * 1.6, el = 0.06 + Math.asin(r()) * 1.1;
    stelle.pos.set(sullaCupola(az, el).toArray(), i * 3);
    stelle.dim[i] = r() < 0.08 ? 0.32 + r() * 0.2 : 0.1 + r() * 0.14;
    stelle.col.set(inchiostro.clone().lerp(c.azzurro, r() * 0.3).toArray(), i * 3);
    stelle.alfa[i] = 0;
    brillio[i * 2] = 0.5 + r() * 2.5; brillio[i * 2 + 1] = r() * 6;
  }
  g.add(stelle.punti);
  // Costellazioni vere, semplificate: Grande Carro, Cassiopea, Orione; ogni stella in gradi rispetto al centro
  const COSTELLAZIONI: { az: number; el: number; stelle: number[][]; righe: number[][] }[] = [
    { az: -0.55, el: 0.62, stelle: [[0, 0], [5, 0.6], [9.5, 0.2], [14, 1.4], [15.5, 6], [21.5, 6.5], [21.5, 1.5]], righe: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    { az: 0.5, el: 0.8, stelle: [[0, 0], [4, -3.5], [8, 0], [12, -4], [16, 0.5]], righe: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { az: 0.15, el: 0.32, stelle: [[0, 9], [9, 8], [3.5, 1], [5, 0.5], [6.5, 0], [1, -8], [9.5, -7.5]], righe: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1]] },
  ];
  const posCost: number[] = [], stelleCost: THREE.Vector3[] = [];
  COSTELLAZIONI.forEach(k => {
    const punti = k.stelle.map(([x, y]) => sullaCupola(k.az + (x! * Math.PI) / 180, k.el + (y! * Math.PI) / 180));
    stelleCost.push(...punti);
    k.righe.forEach(([a, b]) => posCost.push(...punti[a!]!.toArray(), ...punti[b!]!.toArray()));
  });
  const geoCost = new THREE.BufferGeometry();
  geoCost.setAttribute('position', new THREE.Float32BufferAttribute(posCost, 3));
  const matCost = new THREE.LineBasicMaterial({ color: c.azzurro.clone().lerp(inchiostro, 0.4), transparent: true, opacity: 0, fog: false });
  g.add(new THREE.LineSegments(geoCost, matCost));
  const stelleForti = puntiMorbidi(stelleCost.length);
  stelleCost.forEach((q, i) => { stelleForti.pos.set(q.toArray(), i * 3); stelleForti.dim[i] = 0.5; stelleForti.col.set(inchiostro.toArray(), i * 3); stelleForti.alfa[i] = 0; });
  g.add(stelleForti.punti);
  // Stella cadente: una riga che corre e sparisce
  const matCadente = new THREE.LineBasicMaterial({ color: inchiostro, transparent: true, opacity: 0, fog: false });
  const cadente = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), matCadente);
  cadente.frustumCulled = false;
  g.add(cadente);
  const scia = { t: 1, da: new THREE.Vector3(), dir: new THREE.Vector3(), attesa: 4 };
  // Sole e luna: cerchi a filo che salgono e scendono su un arco; la luna mostra la parte illuminata
  const cerchioDi = (raggio: number) => Array.from({ length: 33 }, (_, k) => new THREE.Vector3(Math.cos(k / 32 * Math.PI * 2) * raggio, Math.sin(k / 32 * Math.PI * 2) * raggio, 0));
  const sole = new THREE.Group();
  sole.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cerchioDi(0.7)), new THREE.LineBasicMaterial({ color: c.arancio, transparent: true, opacity: 0.9, fog: false })));
  const raggiSole: THREE.Vector3[] = [];
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; raggiSole.push(new THREE.Vector3(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0), new THREE.Vector3(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0)); }
  sole.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(raggiSole), new THREE.LineBasicMaterial({ color: c.arancio, transparent: true, opacity: 0.7, fog: false })));
  g.add(sole);
  const luna = new THREE.Group();
  const matLuna = new THREE.LineBasicMaterial({ color: inchiostro, transparent: true, opacity: 0.9, fog: false });
  luna.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cerchioDi(0.55)), matLuna));
  const parteLuna = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: inchiostro, transparent: true, opacity: 0.25, fog: false, side: THREE.DoubleSide, depthWrite: false }));
  const terminatore = new THREE.Line(new THREE.BufferGeometry(), matLuna);
  luna.add(parteLuna, terminatore);
  g.add(luna);
  // Parte illuminata: fra il bordo e il terminatore (un'ellisse); fase 0 luna nuova, 0.5 piena
  const faseLuna = (f: number) => {
    const e = Math.cos(f * Math.PI * 2), lato = f < 0.5 ? 1 : -1, forma = new THREE.Shape(), arco: THREE.Vector3[] = [];
    for (let k = 0; k <= 16; k++) { const a = Math.PI / 2 - (k / 16) * Math.PI, x = Math.cos(a) * 0.55 * lato, y = Math.sin(a) * 0.55; if (k) forma.lineTo(x, y); else forma.moveTo(x, y); }
    for (let k = 0; k <= 16; k++) { const a = -Math.PI / 2 + (k / 16) * Math.PI, x = Math.cos(a) * 0.55 * e * lato, y = Math.sin(a) * 0.55; forma.lineTo(x, y); arco.push(new THREE.Vector3(x, y, 0)); }
    parteLuna.geometry.dispose();
    parteLuna.geometry = new THREE.ShapeGeometry(forma);
    terminatore.geometry.dispose();
    terminatore.geometry = new THREE.BufferGeometry().setFromPoints(arco);
  };
  let notteLuna = -1;
  // Bagliore all'orizzonte all'alba e al tramonto
  const alone = (() => {
    const tela = document.createElement('canvas');
    tela.width = tela.height = 128;
    const ctx = tela.getContext('2d')!, v = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.5, 'rgba(255,255,255,0.3)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(tela);
  })();
  const matAlone = new THREE.MeshBasicMaterial({ map: alone, color: c.arancio, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: p.chiaro ? THREE.NormalBlending : THREE.AdditiveBlending });
  const bagliore = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), matAlone);
  bagliore.position.set(0, 0, -20);
  g.add(bagliore);

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
  const tmp = new THREE.Vector3(), via = new THREE.Vector3();
  const nuvolaColore = new THREE.Color(), chiaroNuvola = new THREE.Color(), scuroNuvola = new THREE.Color();
  const biancoGiorno = new THREE.Color(p.chiaro ? '#fbf9f4' : '#e8e6e0'), ombraGiorno = new THREE.Color(p.chiaro ? '#b9b2a4' : '#8d8a84');
  const notteChiaro = new THREE.Color(p.chiaro ? '#8a90a0' : '#5b6476'), notteScuro = new THREE.Color(p.chiaro ? '#6a7080' : '#2e3442');
  function aggiorna(s: number, dt: number, p: Palco) {
    ora = s;
    const prima = u;
    u = (u + dt / (minuti * 60)) % 1;
    if (u < prima) notti++;
    // luce: 1 di giorno, 0 di notte; calore: picco a metà di alba e tramonto
    const luce = u < GIORNO_FINE ? 1 : u < TRAMONTO_FINE ? 1 - liscio((u - GIORNO_FINE) / (TRAMONTO_FINE - GIORNO_FINE)) : u < NOTTE_FINE ? 0 : liscio((u - NOTTE_FINE) / (1 - NOTTE_FINE));
    const calore = u >= GIORNO_FINE && u < TRAMONTO_FINE ? Math.sin(((u - GIORNO_FINE) / (TRAMONTO_FINE - GIORNO_FINE)) * Math.PI) : u >= NOTTE_FINE ? Math.sin(((u - NOTTE_FINE) / (1 - NOTTE_FINE)) * Math.PI) : 0;
    const buio = 1 - luce;

    // Sole: dall'inizio dell'alba alla fine del tramonto attraversa il cielo; luna: dal tramonto alla fine dell'alba
    const sullArco = (w: number, alto: number) => sullaCupola(-1.3 + w * 2.6, Math.sin(w * Math.PI) * alto + 0.01, tmp).multiplyScalar(0.7);
    const wSole = ((u - NOTTE_FINE + 1) % 1) / (1 - NOTTE_FINE + TRAMONTO_FINE);
    sole.visible = wSole <= 1;
    if (sole.visible) { sole.position.copy(sullArco(wSole, 0.75)); sole.lookAt(p.camera.position); }
    const wLuna = (u - GIORNO_FINE) / (1 - GIORNO_FINE);
    luna.visible = wLuna >= 0;
    if (luna.visible) {
      luna.position.copy(sullArco(wLuna, 0.6));
      luna.lookAt(p.camera.position);
      // Una fase nuova ogni notte, in otto notti
      if (notti !== notteLuna) { notteLuna = notti; faseLuna(0.08 + ((notti % 8) / 8) * 0.84); }
    }
    matAlone.opacity = calore * (p.chiaro ? 0.3 : 0.45);
    bagliore.position.x = u < 0.6 ? 9 : -9;
    // Stelle: brillano di notte; le costellazioni compaiono quando è buio pieno
    for (let i = 0; i < STELLE; i++) stelle.alfa[i] = buio * (0.35 + 0.65 * Math.max(0, Math.sin(s * brillio[i * 2]! + brillio[i * 2 + 1]!)) ** 2);
    stelle.aggiorna();
    matCost.opacity = Math.max(0, buio - 0.6) / 0.4 * 0.35;
    stelleForti.alfa.fill(buio * 0.9);
    stelleForti.aggiorna();
    // Stella cadente ogni tanto, solo di notte
    scia.attesa -= dt;
    if (scia.attesa <= 0 && buio > 0.8) {
      scia.attesa = 5 + r() * 10; scia.t = 0;
      sullaCupola((r() - 0.5) * 2, 0.5 + r() * 0.5, scia.da);
      scia.dir.set(-0.6 - r() * 0.4, -0.35 - r() * 0.2, (r() - 0.5) * 0.2).normalize();
    }
    if (scia.t < 1) {
      scia.t = Math.min(1, scia.t + dt / 0.9);
      cadente.geometry.setFromPoints([scia.da.clone().addScaledVector(scia.dir, Math.max(0, scia.t * 9 - 3)), scia.da.clone().addScaledVector(scia.dir, scia.t * 9)]);
      matCadente.opacity = Math.sin(scia.t * Math.PI) * 0.9;
    }
    // Mulino: pale lente; di notte le finestre si accendono
    mozzo.rotation.z -= dt * 0.3;
    finestre.forEach(f => { (f.material as THREE.MeshBasicMaterial).opacity = 0.15 + buio * 0.7; });
    erba.aggiorna((q, t, fuori) => { const k = t * t * q.alto; fuori.set((Math.sin(s * 1.3 + q.fase + q.x * 0.8) * 0.2 + 0.25) * k, Math.cos(s * 1.1 + q.fase) * 0.1 * k); }, s);
    alberi.forEach((a, k) => { a.rotation.z = Math.sin(s * 0.7 + k) * 0.015; });

    // Nuvole: il colore segue l'ora (chiare di giorno, calde al tramonto, blu scuro di notte); i punti ondeggiano
    chiaroNuvola.copy(biancoGiorno).lerp(notteChiaro, buio).lerp(c.arancio, calore * 0.45);
    scuroNuvola.copy(ombraGiorno).lerp(notteScuro, buio).lerp(c.arancio, calore * 0.25);
    const raggio = p.raggio;
    nuvole.forEach(nv => {
      nv.x += nv.vel * dt;
      if (nv.x > 13) nv.x -= 26;
      const respiro = 1 + Math.sin(s * 0.11 + nv.da) * 0.04;
      for (let i = 0; i < nv.n; i++) {
        const j = nv.da + i, k = j * 3, bx = base[k]!, by = base[k + 1]!, bz = base[k + 2]!;
        const x = nv.x + bx * respiro + Math.sin(by * 1.7 + s * 0.23 + bz) * 0.07;
        const y = nv.y + by * respiro + Math.sin(bx * 1.3 + s * 0.19) * 0.05;
        const z = nv.z + bz * respiro + Math.cos(bx * 1.1 + by * 1.5 + s * 0.21) * 0.07;
        if (raggio) {
          tmp.set(x + spinta[k]!, y + spinta[k + 1]!, z + spinta[k + 2]!);
          const d2 = raggio.ray.distanceSqToPoint(tmp);
          if (d2 < 0.36) {
            raggio.ray.closestPointToPoint(tmp, via);
            via.subVectors(tmp, via).normalize().multiplyScalar((1 - Math.sqrt(d2) / 0.6) * dt * 3);
            spinta[k] = spinta[k]! + via.x; spinta[k + 1] = spinta[k + 1]! + via.y; spinta[k + 2] = spinta[k + 2]! + via.z;
          }
        }
        const torna = 1 - dt * 0.4;
        spinta[k] = spinta[k]! * torna; spinta[k + 1] = spinta[k + 1]! * torna; spinta[k + 2] = spinta[k + 2]! * torna;
        posNuvole[k] = x + spinta[k]!; posNuvole[k + 1] = y + spinta[k + 1]!; posNuvole[k + 2] = z + spinta[k + 2]!;
        nuvolaColore.copy(scuroNuvola).lerp(chiaroNuvola, luceNuvole[j]!);
        colNuvole[k] = nuvolaColore.r; colNuvole[k + 1] = nuvolaColore.g; colNuvole[k + 2] = nuvolaColore.b;
      }
    });
    geoNuvole.attributes.position!.needsUpdate = true;
    geoNuvole.attributes.color!.needsUpdate = true;

    // Pioggia: per 10 secondi ogni 40, dalla nuvola più vicina al lago
    const piove = (s % 40) > 26 && (s % 40) < 36;
    matPioggia.opacity = morbido(matPioggia.opacity, piove ? 0.5 : 0, dt * 1.5);
    let chi = nuvole[0]!;
    for (const nv of nuvole) if (Math.abs(nv.x - LAGO.x) < Math.abs(chi.x - LAGO.x)) chi = nv;
    gocce.forEach((q, k) => {
      q.y -= q.v * dt;
      if (q.y < altezza(q.x, q.z)) {
        if (piove && nelLago(q.x, q.z) && r() < 0.6) cerchio(q.x, q.z);
        q.x = chi.x + (r() - 0.5) * chi.largo * 1.8; q.z = chi.z + r() * 6; q.y = chi.y - 0.3 - r() * 0.5;
      }
      posPioggia.set([q.x, q.y, q.z, q.x - 0.02, q.y - 0.14, q.z], k * 6);
    });
    geoPioggia.attributes.position!.needsUpdate = true;
    if (r() < dt * 0.25) { const a = r() * 6; cerchio(LAGO.x + Math.cos(a) * 0.6, LAGO.y + Math.sin(a) * 0.35); }
    cerchi.forEach(q => {
      if (q.t >= 1) return;
      q.t = Math.min(1, q.t + dt / 2.5);
      q.l.scale.setScalar(0.03 + q.t * 0.28);
      (q.l.material as THREE.LineBasicMaterial).opacity = (1 - q.t) * 0.8;
    });

    // Mongolfiere: un lento giro largo, su e giù; la fiammella si accende quando salgono
    mongolfiere.forEach(m => {
      const voluta = m.y + Math.sin(s * 0.1 + m.fase) * 0.6, prima2 = m.quota;
      m.quota = morbido(m.quota, voluta, dt * 0.3);
      const a = s * 0.025 + m.fase;
      m.o.position.set(m.cx + Math.sin(a) * 1.5, m.quota, m.cz + Math.cos(a * 0.8) * 0.8);
      m.o.rotation.y += dt * 0.04;
      const fm = m.fiamma.material as THREE.MeshBasicMaterial;
      fm.opacity = morbido(fm.opacity, m.quota - prima2 > 0.0003 ? 0.9 : 0, dt * 4);
    });

    // Cane: corre dove hai cliccato; dopo 8 secondi senza clic il pastore fischia e il cane torna, poi si siede
    if (!richiamato && s - ultimoClic > 8) { richiamato = true; fischio = s; metaCane.set(PASTORE.x + 0.3, PASTORE.y + 0.2); }
    fischi.forEach((l, k) => {
      const t = s - fischio - k * 0.25;
      (l.material as THREE.LineBasicMaterial).opacity = t > 0 && t < 1.2 ? (1 - t / 1.2) * 0.8 : 0;
      l.scale.setScalar(1 + Math.max(0, t) * 1.5);
      l.lookAt(p.camera.position);
    });
    {
      const dx = metaCane.x - cane.x, dz = metaCane.y - cane.z, d = Math.hypot(dx, dz);
      muovi(cane, dx, dz, d < 0.12 ? 0 : Math.min(1.5, 0.2 + d * 1.2), dt, 1.8);
      const seduto = cane.vel < 0.03 && richiamato && d < 0.2;
      cane.corpo.rotation.z = morbido(cane.corpo.rotation.z, seduto ? 0.35 : 0, dt * 3);
      cane.coda!.rotation.x = Math.sin(s * (seduto ? 6 : 14)) * 0.6;
      cane.collo.rotation.z = seduto ? 0.15 : -0.05;
    }
    // Pecore: brucano e passeggiano; se il cane è vicino scappano insieme, poi si calmano piano
    const cx = pecore.reduce((a, q) => a + q.x, 0) / pecore.length, cz = pecore.reduce((a, q) => a + q.z, 0) / pecore.length;
    pecore.forEach((q, k) => {
      const dc = Math.hypot(q.x - cane.x, q.z - cane.z) || 1e-3;
      let hx = 0, hz = 0;
      if (dc < 1.5) { hx += ((q.x - cane.x) / dc) * (1.5 - dc) * 3; hz += ((q.z - cane.z) / dc) * (1.5 - dc) * 3; q.paura = Math.min(1, q.paura + dt * 3); }
      else q.paura = Math.max(0, q.paura - dt * 0.25);
      // Gregge: verso il centro se lontane, via dalle vicine se troppo vicine
      const gc = Math.hypot(cx - q.x, cz - q.z);
      if (gc > 0.7) { hx += ((cx - q.x) / gc) * 0.5; hz += ((cz - q.z) / gc) * 0.5; }
      pecore.forEach((o, j) => {
        if (j === k) return;
        const ox = q.x - o.x, oz = q.z - o.z, od = Math.hypot(ox, oz);
        if (od < 0.32 && od > 1e-3) { hx += (ox / od) * (0.32 - od) * 4; hz += (oz / od) * (0.32 - od) * 4; }
      });
      q.timer -= dt;
      if (q.paura > 0.2) q.stato = 'fugge';
      else if (q.stato === 'fugge') { q.stato = 'bruca'; q.timer = 3 + r() * 4; }
      else if (q.timer <= 0) {
        q.stato = q.stato === 'bruca' ? 'passeggia' : 'bruca';
        q.timer = q.stato === 'bruca' ? 4 + r() * 7 : 1.5 + r() * 2.5;
      }
      if (q.stato === 'passeggia') { hx += Math.cos(q.verso + Math.sin(s * 0.3 + k)) * 0.4; hz -= Math.sin(q.verso + Math.sin(s * 0.3 + k)) * 0.4; }
      const forza = Math.hypot(hx, hz);
      const voluta = q.stato === 'fugge' ? Math.min(0.8, 0.25 + forza * 0.25) : q.stato === 'passeggia' ? 0.1 : forza > 0.3 ? 0.08 : 0;
      muovi(q, forza ? hx : Math.cos(q.verso), forza ? hz : -Math.sin(q.verso), voluta, dt, q.stato === 'fugge' ? 1.4 : 0.8);
      // Testa: giù a brucare (con i piccoli strappi), su quando cammina o ha paura
      const giu = q.stato === 'bruca' && q.vel < 0.03;
      q.testa = morbido(q.testa, giu ? 1 : 0, dt * 2);
      q.collo.rotation.z = -q.testa * 0.9 + (giu ? Math.abs(Math.sin(s * 4 + k)) * 0.12 : 0);
      q.collo.position.y = 0.02 - q.testa * 0.04;
    });
  }
  return p;
}
