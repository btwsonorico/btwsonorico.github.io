import * as THREE from 'three';
import { casuale, mat, pezzo, sasso, linea, tono, terreno, puntiMorbidi, palco, SITO, type Palco } from './natura';

// Una valle di colline vista da un drone, nello stile del sito: le colline sono curve di livello con un velo verde
// che le segue, fra le curve la griglia di punti. Sulle colline girano le pale eoliche, boschi e cespugli stanno
// tutto intorno, sui pendii; il fondovalle resta libero per il pascolo. Tre piccole mandrie di mucche coi vitelli
// pascolano, si sdraiano a ruminare, guardano il cane. Un gregge di pecore minuscole si muove come una massa: il cane
// segue il puntatore sul prato e lo raduna; un clic sul cane lo fa sedere, un altro clic lo fa ripartire.
// Sopra passano nuvole morbide: dentro hanno una rete invisibile di nodi e molle, fuori una nuvola leggera di punti
// che nascono e svaniscono come vapore. Il puntatore che passa le scosta; si possono afferrare e tirare: si allungano,
// poi tornano; intanto cambiano forma da sole.
// Sopra le nuvole, le mongolfiere.

const L = 8;

export function monta(el: HTMLElement) {
  const r = casuale(23);
  const p = palco(el, {
    camera: new THREE.Vector3(0, 15.6, 13), mira: new THREE.Vector3(0, 0.4, 0.3), giro: 0.006, inclina: [-0.62, 0.3], nebbia: [1.0, 2.0], zoom: [0.3, 1.15], aggiorna,
    afferra, trascina, rilascia, clic,
    scena: 'nuvole', toni: SITO,
  });
  const g = p.gruppo, c = p.colori;
  const morbido = (da: number, a: number, k: number) => da + (a - da) * Math.min(1, k);
  const angolo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

  // --- Colline: un anello di colli intorno a un fondovalle largo e dolce
  const COLLI = [[-4, -3.6, 1.9, 2.1], [3.3, -4, 2.2, 2.3], [5.2, 1.4, 1.5, 1.9], [-4.9, 3.6, 1.6, 2.0], [0.3, -6.4, 1.4, 2.0], [1.4, 6.4, 1.1, 1.6], [6.6, -1.6, 1.1, 1.6], [-7, 0.4, 1.2, 1.6]] as const;
  const altezza = (x: number, z: number) => {
    let h = 0.08 * Math.sin(x * 0.9 + 1) * Math.cos(z * 0.75) + 0.04 * Math.sin(x * 2 - z * 1.6) + 0.15;
    for (const [cx, cz, alto, largo] of COLLI) h += alto * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * largo * largo));
    return h;
  };
  // Pendenza: quanto è ripido il terreno in un punto (per mettere i boschi sui pendii)
  const pendenza = (x: number, z: number) => Math.hypot(altezza(x + 0.1, z) - altezza(x - 0.1, z), altezza(x, z + 0.1) - altezza(x, z - 0.1)) / 0.2;
  terreno(g, c.verde, L + 0.5, altezza, false);
  // Velo verde che segue le colline (non un disco piatto sotto)
  {
    const geo = new THREE.RingGeometry(0.01, L + 0.3, 96, 40).rotateX(-Math.PI / 2);
    const q = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < q.count; i++) q.setY(i, altezza(q.getX(i), q.getZ(i)) - 0.01);
    const velo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c.verde, transparent: true, opacity: p.chiaro ? 0.08 : 0.04, depthWrite: false }));
    velo.renderOrder = -1;
    g.add(velo);
  }
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
  const libero = (x: number, z: number, margine: number) => !ostacoli.some(o => Math.hypot(x - o.x, z - o.z) < o.r + margine);
  const posa = <T extends THREE.Object3D>(o: T, x: number, z: number, raggio = 0) => {
    o.position.set(x, altezza(x, z), z);
    g.add(o);
    if (raggio) ostacoli.push({ x, z, r: raggio });
    return o;
  };

  // --- Pale eoliche sulle cime: torre sottile, gondola, tre pale lunghe
  const eoliche = ([[3.3, -4], [5.2, 1.4], [-4.9, 3.6], [6.6, -1.6], [-4, -3.6], [0.3, -6.4]] as const).map(([x, z], k) => {
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
    posa(o, x, z, 0.18);
    return { rotore, vel: 0.9 + k * 0.17 };
  });

  // --- Boschi e cespugli: macchie di alberi sui pendii, tutto intorno al pascolo; i cespugli stanno al margine dei
  // boschi (dove il bosco finisce e comincia il prato) e in fila lungo le siepi; il pascolo al centro resta libero
  const chiome = [mat('#6fa646'), mat('#5f9c45'), mat('#4f8a3c')];
  const PASCOLO = 2;
  const cespuglio = (x: number, z: number, rr: number, k: number) => {
    if (Math.hypot(x, z) < PASCOLO || Math.hypot(x, z) > L - 0.6 || !libero(x, z, 0.03)) return;
    const o = pezzo(sasso(rr, r), chiome[k % 3]!);
    o.scale.y = 0.75;
    posa(o, x, z, rr + 0.03).position.y += rr * 0.5;
  };
  // Alberi stilizzati come nel bosco di Software: il tronco è un filo, la chioma sono palle o coni a filo
  // con un riempimento tenue. Tre forme: tondo (tre palle), quercia (una palla grande e due piccole), abete (coni).
  const fusto = linea(p.chiaro ? '#3a332c' : '#e8e6e0', 0.7);
  const albero = (x: number, z: number, h: number, k: number) => {
    const o = new THREE.Group(), m = chiome[k % 3]!, forma = Math.floor(r() * 3);
    o.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, h * (forma === 2 ? 0.3 : 0.55), 0)]), fusto));
    if (forma === 0) {
      const larga = h * 0.26;
      [[0, h * 0.55 + larga * 0.7, 0, 1], [larga * 0.6, h * 0.55 + larga * 0.45, 0.04, 0.7], [-larga * 0.55, h * 0.55 + larga * 0.45, -0.03, 0.7]].forEach(([px, py, pz, k2]) => o.add(pezzo(new THREE.IcosahedronGeometry(larga * k2!, 1), m, px!, py!, pz!)));
    } else if (forma === 1) {
      const larga = h * 0.28;
      o.add(pezzo(new THREE.IcosahedronGeometry(larga, 0), m, 0, h * 0.6 + larga * 0.5, 0));
      for (const a of [0.5, 2.6]) o.add(pezzo(new THREE.IcosahedronGeometry(larga * 0.62, 0), m, Math.cos(a) * larga, h * 0.62, Math.sin(a) * larga));
    } else for (let q = 0; q < 3; q++) {
      const f = q / 3, alto = h * 0.42;
      o.add(pezzo(new THREE.ConeGeometry(h * 0.26 * (1 - f * 0.45), alto, 7), m, 0, h * 0.25 + f * h * 0.45 + alto / 2, 0));
    }
    posa(o, x, z, h * 0.28);
  };
  for (let m = 0; m < 11; m++) {
    // Centro della macchia: su un anello largo, dove il terreno pende; macchie diverse per forma e densità
    let cx = 0, cz = 0, prova = 0;
    do { const a = (m / 11) * Math.PI * 2 + (r() - 0.5) * 0.5, d = 2.3 + r() * 3; cx = Math.cos(a) * d; cz = Math.sin(a) * d; } while ((pendenza(cx, cz) < 0.12 || !libero(cx, cz, 0.6)) && ++prova < 25);
    const n = 4 + Math.floor(r() * 6), allunga = 0.6 + r() * 0.9, giro = r() * 6;
    const punto2 = (u: number, v: number) => [cx + u * Math.cos(giro) - v * Math.sin(giro), cz + u * Math.sin(giro) + v * Math.cos(giro)] as const;
    for (let k = 0; k < n; k++) {
      const a = r() * 6, d = Math.sqrt(r()) * 0.6, [x, z] = punto2(Math.cos(a) * d * (1 + allunga), Math.sin(a) * d);
      if (Math.hypot(x, z) < PASCOLO || Math.hypot(x, z) > L - 0.5 || !libero(x, z, 0.02)) continue;
      albero(x, z, 0.5 + r() * 0.25, k);
    }
    // Cespugli sul margine del bosco, dal lato del pascolo
    const verso = Math.atan2(-cz, -cx);
    for (let k = 0; k < 3 + Math.floor(r() * 3); k++) {
      const a = verso + (r() - 0.5) * 1.6, d = 0.75 + r() * 0.35;
      cespuglio(cx + Math.cos(a) * d * (1 + allunga * 0.5), cz + Math.sin(a) * d, 0.05 + r() * 0.04, k);
    }
  }
  // Alberi isolati nel pascolo, che danno ombra alle mucche
  for (const [x, z] of [[1.6, -1.8], [-0.6, 2.6], [3.2, 2.9]]) if (libero(x!, z!, 0.3)) albero(x!, z!, 0.7, 1);
  // Siepi: archi di cespugli lungo il bordo della valle, come confini fra i pascoli
  for (const [da, a2, raggio] of [[2.6, 3.3, 5.6], [5.2, 5.8, 5.2], [0.4, 1.0, 6.0]] as const) {
    for (let t = 0; t <= 1; t += 0.06) {
      const a = da + (a2 - da) * t, d = raggio + Math.sin(t * 7) * 0.12;
      cespuglio(Math.cos(a) * d, Math.sin(a) * d, 0.055 + r() * 0.03, Math.floor(t * 30));
    }
  }

  // --- Mucche: tre mandrie con i vitelli. Brucano, camminano piano vicine fra loro, si sdraiano a ruminare,
  // girano la testa verso il cane; se arriva troppo vicino si alzano e si spostano con calma.
  type Mucca = { o: THREE.Group; corpo: THREE.Group; collo: THREE.Group; coda: THREE.Object3D; zampe: THREE.Group; x: number; z: number; verso: number; vel: number; timer: number; stato: 'bruca' | 'cammina' | 'sdraiata'; mandria: number; vitello: boolean; mamma: number; fase: number; giu: number };
  const MANDRIE = [new THREE.Vector2(1.6, -2.4), new THREE.Vector2(-1.6, 3.2), new THREE.Vector2(3.4, 1.8)];
  const mucche: Mucca[] = [];
  MANDRIE.forEach((m, mi) => {
    const adulte = 3 + (mi % 2), vitelli = 1 + (mi === 0 ? 1 : 0);
    for (let k = 0; k < adulte + vitelli; k++) {
      const vitello = k >= adulte, scala = vitello ? 0.6 : 1;
      const o = new THREE.Group(), corpo = new THREE.Group(), collo = new THREE.Group();
      const bianco = p.chiaro ? '#fbf9f4' : '#f2efe8';
      const pelo = mat(bianco, { grezzo: true, opacity: p.chiaro ? 0.9 : 0.55, fili: 0.9 }), scuro = mat('#2a2622', { grezzo: true, opacity: 0.85, fili: 0 });
      const linee = linea(p.chiaro ? '#3a332c' : '#cfcac0', 0.9);
      corpo.position.y = 0.1;
      // Corpo: un parallelepipedo un po' smussato, con il dorso dritto
      corpo.add(pezzo(new THREE.BoxGeometry(0.2, 0.085, 0.09), pelo));
      // Macchie scure sui fianchi e sul dorso
      for (let q = 0; q < 4; q++) {
        const lato = q % 2 ? 1 : -1, sopra = q > 1;
        const macchia = pezzo(new THREE.CircleGeometry(0.018 + r() * 0.016, 7), scuro, (r() - 0.5) * 0.13, sopra ? 0.0431 : (r() - 0.5) * 0.04, sopra ? (r() - 0.5) * 0.05 : lato * 0.0451);
        if (sopra) macchia.rotation.x = -Math.PI / 2; else macchia.rotation.y = lato > 0 ? 0 : Math.PI;
        corpo.add(macchia);
      }
      // Testa: muso chiaro, corna e orecchie; sta su un collo che si abbassa per brucare
      collo.position.set(0.1, 0.02, 0);
      collo.add(pezzo(new THREE.BoxGeometry(0.06, 0.05, 0.05), scuro, 0.035, 0, 0));
      collo.add(pezzo(new THREE.BoxGeometry(0.022, 0.032, 0.042), pelo, 0.072, -0.008, 0));
      const corna: THREE.Vector3[] = [], orecchie: THREE.Vector3[] = [];
      for (const l of [-1, 1]) {
        corna.push(new THREE.Vector3(0.03, 0.025, l * 0.018), new THREE.Vector3(0.03, 0.045, l * 0.032));
        orecchie.push(new THREE.Vector3(0.02, 0.012, l * 0.025), new THREE.Vector3(0.012, 0.016, l * 0.05));
      }
      collo.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(corna), linee), new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(orecchie), linea('#2a2622', 0.9)));
      corpo.add(collo);
      // Coda col ciuffo in fondo
      const coda = new THREE.Group();
      coda.position.set(-0.1, 0.035, 0);
      coda.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.012, -0.07, 0)]), linee));
      coda.add(pezzo(new THREE.SphereGeometry(0.008, 4, 3), scuro, -0.012, -0.072, 0));
      corpo.add(coda);
      // Zampe: quattro colonne sottili sotto gli angoli del corpo
      const zampe = new THREE.Group(), geoZampa = new THREE.CylinderGeometry(0.009, 0.008, 0.06, 5).translate(0, 0.03, 0);
      for (const [x, z] of [[-0.075, -0.032], [-0.075, 0.032], [0.075, -0.032], [0.075, 0.032]]) zampe.add(pezzo(geoZampa, pelo, x!, 0, z!));
      o.add(corpo, zampe);
      o.scale.setScalar(scala);
      g.add(o);
      const a = r() * 6, d = 0.2 + r() * 0.5;
      mucche.push({ o, corpo, collo, coda, zampe, x: m.x + Math.cos(a) * d, z: m.y + Math.sin(a) * d, verso: r() * 6, vel: 0, timer: r() * 8, stato: r() < 0.3 ? 'sdraiata' : 'bruca', mandria: mi, vitello, mamma: -1, fase: r() * 6, giu: 0 });
    }
  });
  mucche.forEach((m, i) => { if (m.vitello) m.mamma = mucche.findIndex((q, j) => j < i && q.mandria === m.mandria && !q.vitello); });

  // --- Gregge: tante pecore minuscole (corpo chiaro, testa scura), tutte in due forme sole
  const PECORE = p.telefono ? 110 : 180;
  const corpi = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4).scale(0.07, 0.042, 0.047), mat(p.chiaro ? '#fbf9f4' : '#f2efe8', { grezzo: true, opacity: p.chiaro ? 1 : 0.9, fili: 0 }), PECORE);
  const teste = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 3).scale(0.028, 0.023, 0.023), mat('#3a332c', { grezzo: true, opacity: 0.9, fili: 0 }), PECORE);
  corpi.frustumCulled = teste.frustumCulled = false;
  g.add(corpi, teste);
  type Pecora = { x: number; z: number; vx: number; vz: number; verso: number; calma: number; timer: number; voglia: number; testa: number; fase: number };
  const pecore: Pecora[] = Array.from({ length: PECORE }, () => {
    const a = r() * 6, d = Math.sqrt(r()) * 1.3;
    return { x: -0.2 + Math.cos(a) * d, z: 0.2 + Math.sin(a) * d * 0.8, vx: 0, vz: 0, verso: r() * 6, calma: 1, timer: r() * 6, voglia: 0, testa: 1, fase: r() * 6 };
  });

  // --- Cane: un quadrupede vero, arancio. Corpo, petto, testa col muso e le orecchie, coda; quattro zampe con anca e
  // ginocchio. Al passo muove le zampe una alla volta; quando corre galoppa: zampe anteriori e posteriori a coppie,
  // schiena che si flette, coda tesa dietro.
  const cane = (() => {
    const o = new THREE.Group(), corpo = new THREE.Group(), collo = new THREE.Group();
    const pelo = mat('#e08a3a', { opacity: 0.55 }), chiaro2 = mat('#f2d2a8', { opacity: 0.6 });
    corpo.position.y = 0.105;
    corpo.add(pezzo(new THREE.CapsuleGeometry(0.035, 0.11, 3, 6).rotateZ(Math.PI / 2), pelo));
    corpo.add(pezzo(new THREE.SphereGeometry(0.038, 6, 4), chiaro2, 0.055, -0.005, 0));
    collo.position.set(0.075, 0.03, 0);
    collo.add(pezzo(new THREE.IcosahedronGeometry(0.03, 0), pelo, 0.025, 0.02, 0));
    collo.add(pezzo(new THREE.ConeGeometry(0.016, 0.045, 5).rotateZ(-Math.PI / 2), chiaro2, 0.06, 0.012, 0));
    for (const l of [-1, 1]) collo.add(pezzo(new THREE.ConeGeometry(0.01, 0.028, 4), pelo, 0.018, 0.05, l * 0.016));
    corpo.add(collo);
    const coda = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.04, 0.03, 0), new THREE.Vector3(-0.08, 0.04, 0)]), linea('#e08a3a', 0.95));
    coda.position.set(-0.085, 0.015, 0);
    corpo.add(coda);
    const sopra = new THREE.CylinderGeometry(0.011, 0.008, 0.05, 5).translate(0, -0.025, 0), sotto = new THREE.CylinderGeometry(0.007, 0.005, 0.05, 5).translate(0, -0.025, 0);
    // Zampe: posteriore sinistra, anteriore sinistra, posteriore destra, anteriore destra
    const zampe = ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([dx, dz]) => {
      const anca = new THREE.Group(), ginocchio = new THREE.Group();
      anca.position.set(dx * 0.055, -0.015, dz * 0.022);
      anca.add(pezzo(sopra, pelo));
      ginocchio.position.y = -0.05;
      ginocchio.add(pezzo(sotto, pelo));
      anca.add(ginocchio);
      corpo.add(anca);
      return { anca, ginocchio, avanti: dx > 0 };
    });
    o.add(corpo);
    o.scale.setScalar(0.72);
    g.add(o);
    return { o, corpo, collo, coda, zampe, x: -1.8, z: 0.6, verso: 0, vel: 0, passo: 0, giro: 0, seduto: false, siede: 0 };
  })();
  // Fasi delle zampe: al passo una alla volta, al galoppo a coppie (anteriori vicine, posteriori vicine)
  const PASSO = [0, 0.25, 0.5, 0.75], GALOPPO = [0.55, 0, 0.65, 0.1];
  const metaCane = new THREE.Vector2(cane.x, cane.z);
  const punto = new THREE.Vector3();
  // Dove il raggio del puntatore tocca le colline: lo cerco a passi, prima larghi poi fini
  const sulTerreno = (raggio: THREE.Raycaster) => {
    const o = raggio.ray.origin, d = raggio.ray.direction;
    for (let t = 0; t < 60; t += 0.25) {
      punto.copy(o).addScaledVector(d, t);
      if (punto.y <= altezza(punto.x, punto.z)) {
        for (let k = t - 0.25; k <= t; k += 0.02) { punto.copy(o).addScaledVector(d, k); if (punto.y <= altezza(punto.x, punto.z)) return true; }
        return true;
      }
    }
    return false;
  };

  // --- Nuvole morbide: una rete di nodi e molle (il filo che si vede) e sopra una nuvola di punti legati ai nodi.
  // I punti nascono, si allontanano appena e svaniscono, poi rinascono altrove nella nuvola: il vapore si rinnova.
  type Nodo = { x: number; y: number; z: number; vx: number; vy: number; vz: number; rx: number; ry: number; rz: number; fase: number };
  type Sfera = { x: number; y: number; z: number; raggio: number };
  type Nuvola = { cx: number; cy: number; cz: number; vel: number; largo: number; nodi: Nodo[]; molle: [number, number, number][]; sfere: Sfera[]; da: number; n: number; preso: number };
  const nuvole: Nuvola[] = [];
  const QUANTE = 6, PER = p.telefono ? 600 : 1100, N = QUANTE * PER;
  const nuvola = puntiMorbidi(N);
  const legami = new Uint8Array(N * 3), pesi = new Float32Array(N * 3), offset = new Float32Array(N * 9), vita = new Float32Array(N), ritmo = new Float32Array(N), luceNuvole = new Float32Array(N);
  // Un punto a caso dentro la nuvola: più fitto verso il bordo degli sbuffi, la pancia piatta
  const campione = (nv: Nuvola, fuori: THREE.Vector3) => {
    const volume = nv.sfere.reduce((a, s) => a + s.raggio ** 3, 0);
    let u = r() * volume, s = nv.sfere[0]!;
    for (const q of nv.sfere) { u -= q.raggio ** 3; if (u <= 0) { s = q; break; } }
    const a = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), d = s.raggio * (r() < 0.15 ? 1 + r() * 0.5 : Math.cbrt(r()));
    fuori.set(s.x + Math.sin(v) * Math.cos(a) * d, s.y + Math.cos(v) * d * 0.75, s.z + Math.sin(v) * Math.sin(a) * d * 0.85);
    fuori.y = Math.max(fuori.y, -0.2 * nv.largo - r() * r() * 0.08);
    return fuori;
  };
  // Lega un punto ai tre nodi più vicini (a riposo), con pesi che scendono con la distanza
  const tmpL = new THREE.Vector3();
  const lega = (nv: Nuvola, j: number) => {
    campione(nv, tmpL);
    const vicini = nv.nodi.map((q, i) => ({ i, d: (q.rx - tmpL.x) ** 2 + (q.ry - tmpL.y) ** 2 + (q.rz - tmpL.z) ** 2 })).sort((a, b) => a.d - b.d).slice(0, 3);
    let somma = 0;
    vicini.forEach((q, k) => { const w = 1 / (q.d + 0.02); pesi[j * 3 + k] = w; somma += w; legami[j * 3 + k] = q.i; });
    vicini.forEach((q, k) => {
      pesi[j * 3 + k]! /= somma;
      const nodo = nv.nodi[q.i]!;
      offset.set([tmpL.x - nodo.rx, tmpL.y - nodo.ry, tmpL.z - nodo.rz], j * 9 + k * 3);
    });
    luceNuvole[j] = THREE.MathUtils.clamp((tmpL.y + 0.2 * nv.largo) / (nv.largo * 0.8), 0, 1);
  };
  for (let k = 0; k < QUANTE; k++) {
    const largo = 1.3 + r() * 1.2;
    const sfere: Sfera[] = [];
    const grandi = 4 + Math.floor(r() * 3);
    for (let q = 0; q < grandi; q++) {
      const t = q / (grandi - 1) - 0.5;
      sfere.push({ x: t * largo * 1.9 + (r() - 0.5) * 0.3, y: (0.5 - Math.abs(t)) * 0.4 * largo, z: (r() - 0.5) * largo * 0.5, raggio: (0.45 + (0.5 - Math.abs(t)) * 0.8) * largo * 0.42 });
    }
    for (let q = 0; q < 8; q++) {
      const m = sfere[Math.floor(r() * grandi)]!, a = r() * Math.PI * 2;
      sfere.push({ x: m.x + Math.cos(a) * m.raggio * 0.7, y: m.y + (0.3 + r() * 0.6) * m.raggio * 0.8, z: m.z + Math.sin(a) * m.raggio * 0.6, raggio: m.raggio * (0.35 + r() * 0.25) });
    }
    // Nodi: il centro di ogni sbuffo e qualche punto sul bordo degli sbuffi grandi
    const nodi: Nodo[] = [];
    const nodo = (x: number, y: number, z: number) => nodi.push({ x, y, z, vx: 0, vy: 0, vz: 0, rx: x, ry: y, rz: z, fase: r() * 6 });
    sfere.forEach(s => nodo(s.x, s.y, s.z));
    sfere.slice(0, grandi).forEach(s => { for (let q = 0; q < 4; q++) { const a = (q / 4) * Math.PI * 2 + r(), e = (r() - 0.3) * 1.2; nodo(s.x + Math.cos(a) * Math.cos(e) * s.raggio * 0.9, Math.max(-0.2 * largo, s.y + Math.sin(e) * s.raggio * 0.7), s.z + Math.sin(a) * Math.cos(e) * s.raggio * 0.8); } });
    // Molle: ogni nodo con i suoi vicini più prossimi
    const molle: [number, number, number][] = [], viste = new Set<string>();
    nodi.forEach((a, i) => {
      nodi.map((b, j) => ({ j, d: Math.hypot(a.rx - b.rx, a.ry - b.ry, a.rz - b.rz) })).filter(q => q.j !== i).sort((x, y) => x.d - y.d).slice(0, 5).forEach(q => {
        const chiave = i < q.j ? `${i}-${q.j}` : `${q.j}-${i}`;
        if (!viste.has(chiave)) { viste.add(chiave); molle.push([i, q.j, q.d]); }
      });
    });
    const cx = -12 + k * 4.2 + r() * 1.2, cy = 4.3 + r() * 1, cz = -3.5 + r() * 8;
    nodi.forEach(q => { q.x += cx; q.y += cy; q.z += cz; });
    const nv: Nuvola = { cx, cy, cz, vel: 0.1 + r() * 0.08, largo, nodi, molle, sfere, da: k * PER, n: PER, preso: -1 };
    nuvole.push(nv);
    for (let i = 0; i < PER; i++) {
      const j = nv.da + i;
      lega(nv, j);
      vita[j] = r(); ritmo[j] = 1 / (7 + r() * 12);
      nuvola.dim[j] = 0.05 + r() * 0.07;
    }
  }
  g.add(nuvola.punti);
  // Ombre delle nuvole: un velo sul terreno, più scuro sotto ogni nuvola, spostato un po' dalla luce del sole
  const ombre = Array.from({ length: QUANTE }, () => new THREE.Vector4());
  const geoOmbra = new THREE.PlaneGeometry(L * 2.2, L * 2.2, 70, 70).rotateX(-Math.PI / 2);
  const po = geoOmbra.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < po.count; i++) po.setY(i, altezza(po.getX(i), po.getZ(i)) + 0.03);
  const matOmbra = new THREE.ShaderMaterial({
    uniforms: { ombre: { value: ombre }, colore: { value: p.chiaro ? new THREE.Color('#3a3530') : c.bg.clone() }, forza: { value: p.chiaro ? 0.16 : 0.55 } },
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
  // Presa: si afferra il nodo più vicino al raggio; lo si tira su un piano orizzontale alla sua quota
  const presa = { nuvola: -1, meta: new THREE.Vector3(), piano: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) };
  function afferra(raggio: THREE.Raycaster) {
    let meglio = 0.75, chi = -1, quale = -1;
    nuvole.forEach((nv, k) => nv.nodi.forEach((q, i) => { const d = raggio.ray.distanceToPoint(tmpL.set(q.x, q.y, q.z)); if (d < meglio) { meglio = d; chi = k; quale = i; } }));
    if (chi < 0) return false;
    const q = nuvole[chi]!.nodi[quale]!;
    nuvole[chi]!.preso = quale;
    presa.nuvola = chi;
    presa.piano.constant = -q.y;
    presa.meta.set(q.x, q.y, q.z);
    el.style.cursor = 'grabbing';
    return true;
  }
  function trascina(raggio: THREE.Raycaster) {
    const nv = nuvole[presa.nuvola];
    if (!nv || !raggio.ray.intersectPlane(presa.piano, tmpL)) return;
    // Non oltre tre volte la sua larghezza dal centro: si allunga, non si strappa
    const dx = tmpL.x - nv.cx, dz = tmpL.z - nv.cz, d = Math.hypot(dx, dz), max = nv.largo * 3;
    presa.meta.set(nv.cx + dx * Math.min(1, max / d), tmpL.y, nv.cz + dz * Math.min(1, max / d));
  }
  function rilascia() {
    const nv = nuvole[presa.nuvola];
    if (nv) nv.preso = -1;
    presa.nuvola = -1;
    el.style.cursor = '';
  }

  // --- Mongolfiere: palloni pieni di colore, gli spicchi segnati da fili più scuri; volano sopra le nuvole
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
    const y = [6.4, 7.2, 6.0][k]!;
    return { o, fiamma, cx: [-2.6, 3.2, 0.6][k]!, cz: [1.2, -1.4, -4][k]!, y, fase: k * 2.1, quota: y };
  });

  // Clic: sul cane lo fa sedere (o ripartire)
  function clic(raggio: THREE.Raycaster) {
    if (raggio.ray.distanceToPoint(tmp.set(cane.x, altezza(cane.x, cane.z) + 0.06, cane.z)) < 0.25) cane.seduto = !cane.seduto;
  }

  // --- Ciclo
  const tmp = new THREE.Vector3(), dummy = new THREE.Object3D();
  const chiaroNuvola = new THREE.Color(p.chiaro ? '#fbf9f4' : '#e8e6e0'), scuroNuvola = new THREE.Color(p.chiaro ? '#b9b2a4' : '#8d8a84'), colNuvola = new THREE.Color();
  const griglia = new Map<number, number[]>();
  const cella = (x: number, z: number) => Math.floor((x + L) / 0.5) * 100 + Math.floor((z + L) / 0.5);
  function aggiorna(s: number, dt: number, p: Palco) {
    eoliche.forEach(e => { e.rotore.rotation.z -= dt * e.vel; });

    // Nuvole: il centro va col vento; ogni nodo è tirato verso il suo posto (che cambia piano), dalle molle verso i
    // vicini e, se afferrato, verso il puntatore. I punti seguono i nodi, nascono e svaniscono.
    const raggio = p.raggio;
    let sopraNuvola = false;
    nuvole.forEach((nv, q) => {
      nv.cx += nv.vel * dt;
      if (nv.cx > 12) { nv.cx -= 24; nv.nodi.forEach(n => { n.x -= 24; }); }
      const passi = 2, h = dt / passi;
      for (let pp = 0; pp < passi; pp++) {
        nv.nodi.forEach((n, i) => {
          const forma = 1 + 0.08 * Math.sin(s * 0.21 + n.fase), ondaX = Math.sin(s * 0.17 + n.fase * 2) * 0.08, ondaY = Math.sin(s * 0.13 + n.fase) * 0.05;
          let fx = (nv.cx + n.rx * forma + ondaX - n.x) * 0.9, fy = (nv.cy + n.ry * forma + ondaY - n.y) * 0.9, fz = (nv.cz + n.rz * forma - n.z) * 0.9;
          if (i === nv.preso) { fx += (presa.meta.x - n.x) * 30; fy += (presa.meta.y - n.y) * 30; fz += (presa.meta.z - n.z) * 30; }
          else if (raggio && presa.nuvola < 0) {
            tmp.set(n.x, n.y, n.z);
            const d = raggio.ray.distanceToPoint(tmp);
            if (d < 0.9) { raggio.ray.closestPointToPoint(tmp, tmpL); const k = ((0.9 - d) / 0.9) * 3 / (d || 1); fx += (n.x - tmpL.x) * k; fy += (n.y - tmpL.y) * k * 0.5; fz += (n.z - tmpL.z) * k; }
          }
          n.vx += fx * h; n.vy += fy * h; n.vz += fz * h;
        });
        for (const [a, b, riposo] of nv.molle) {
          const A = nv.nodi[a]!, B = nv.nodi[b]!, dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z, d = Math.hypot(dx, dy, dz) || 1e-4;
          const f = (d - riposo) * 9 * h / d;
          A.vx += dx * f; A.vy += dy * f; A.vz += dz * f;
          B.vx -= dx * f; B.vy -= dy * f; B.vz -= dz * f;
        }
        const attrito = Math.exp(-h * 2.6);
        nv.nodi.forEach(n => { n.vx *= attrito; n.vy *= attrito; n.vz *= attrito; n.x += n.vx * h; n.y += n.vy * h; n.z += n.vz * h; });
      }
      // Centro per l'ombra: la media dei nodi
      let mx = 0, mz = 0;
      nv.nodi.forEach(n => { mx += n.x; mz += n.z; });
      ombre[q]!.set(mx / nv.nodi.length + 0.8, mz / nv.nodi.length + 0.6, nv.largo * 1.2, nv.largo * 0.75);
      if (raggio && presa.nuvola < 0 && !sopraNuvola) sopraNuvola = nv.nodi.some(n => raggio.ray.distanceToPoint(tmp.set(n.x, n.y, n.z)) < 0.75);
      // Punti: posizione dai tre nodi legati; la vita li fa comparire, salire appena e svanire
      for (let i = 0; i < nv.n; i++) {
        const j = nv.da + i;
        vita[j] = vita[j]! + dt * ritmo[j]!;
        if (vita[j]! >= 1) { vita[j] = 0; lega(nv, j); }
        const v = vita[j]!, cresce = 1 + v * 0.18;
        let x = 0, y = 0, z = 0;
        for (let k = 0; k < 3; k++) {
          const w = pesi[j * 3 + k]!, n = nv.nodi[legami[j * 3 + k]!]!, o = j * 9 + k * 3;
          x += w * (n.x + offset[o]! * cresce); y += w * (n.y + offset[o + 1]! * cresce); z += w * (n.z + offset[o + 2]! * cresce);
        }
        nuvola.pos[j * 3] = x; nuvola.pos[j * 3 + 1] = y + v * 0.08; nuvola.pos[j * 3 + 2] = z;
        nuvola.alfa[j] = Math.sin(v * Math.PI) ** 0.7 * (p.chiaro ? 0.6 : 0.45);
        colNuvola.copy(scuroNuvola).lerp(chiaroNuvola, luceNuvole[j]!);
        nuvola.col[j * 3] = colNuvola.r; nuvola.col[j * 3 + 1] = colNuvola.g; nuvola.col[j * 3 + 2] = colNuvola.b;
      }
    });
    nuvola.aggiorna();
    if (presa.nuvola < 0) el.style.cursor = sopraNuvola ? 'grab' : '';
    // Mongolfiere: un lento giro largo, su e giù; la fiammella si accende quando salgono
    mongolfiere.forEach(m => {
      const voluta = m.y + Math.sin(s * 0.1 + m.fase) * 0.5, prima = m.quota;
      m.quota = morbido(m.quota, voluta, dt * 0.3);
      const a = s * 0.02 + m.fase;
      m.o.position.set(m.cx + Math.sin(a) * 2, m.quota, m.cz + Math.cos(a * 0.8) * 1.3);
      m.o.rotation.y += dt * 0.04;
      const fm = m.fiamma.material as THREE.MeshBasicMaterial;
      fm.opacity = morbido(fm.opacity, m.quota - prima > 0.0003 ? 0.9 : 0, dt * 4);
    });

    // Cane: segue il puntatore sul prato (non mentre tiri una nuvola); seduto resta dov'è e guarda il gregge
    if (!cane.seduto && raggio && presa.nuvola < 0 && !sopraNuvola && sulTerreno(raggio) && Math.hypot(punto.x, punto.z) < L - 0.8) metaCane.set(punto.x, punto.z);
    if (cane.seduto) metaCane.set(cane.x, cane.z);
    {
      const k = cane, dx = metaCane.x - k.x, dz = metaCane.y - k.z, d = Math.hypot(dx, dz);
      // Velocità: al passo vicino alla meta, al galoppo quando è lontana; mai troppo veloce, per radunare con calma
      k.vel = morbido(k.vel, d < 0.08 ? 0 : Math.min(1.05, 0.12 + d * 0.9), dt * 2.2);
      const diff = d > 0.05 ? angolo(Math.atan2(-dz, dx) - k.verso) : 0;
      k.giro = morbido(k.giro, THREE.MathUtils.clamp(diff * 3, -3.5, 3.5), dt * 6);
      k.verso += k.giro * dt;
      k.x += Math.cos(k.verso) * k.vel * dt; k.z -= Math.sin(k.verso) * k.vel * dt;
      const galoppo = THREE.MathUtils.clamp((k.vel - 0.45) / 0.45, 0, 1), falcata = (0.09 + galoppo * 0.13) * 0.72;
      k.passo += (k.vel * dt) / falcata;
      const amp = THREE.MathUtils.clamp(k.vel / 0.15, 0, 1), giro2 = Math.PI * 2 * k.passo;
      k.o.position.set(k.x, altezza(k.x, k.z) + Math.max(0, Math.sin(giro2)) * 0.014 * galoppo, k.z);
      k.o.rotation.y = k.verso;
      // Schiena che si flette al galoppo; il corpo si inclina in curva
      k.corpo.rotation.z = Math.sin(giro2 + 0.5) * 0.14 * galoppo;
      k.corpo.rotation.x = -k.giro * 0.06 * amp;
      k.zampe.forEach((z, q) => {
        const fase = Math.PI * 2 * (k.passo + THREE.MathUtils.lerp(PASSO[q]!, GALOPPO[q]!, galoppo));
        const ampiezza = (0.45 + galoppo * 0.5) * amp;
        z.anca.rotation.z = Math.sin(fase) * ampiezza;
        z.ginocchio.rotation.z = (z.avanti ? 1 : -1) * Math.max(0, Math.cos(fase)) ** 1.5 * (0.6 + galoppo * 0.6) * amp;
      });
      // Testa bassa da cane da pastore quando corre; coda tesa al galoppo, scodinzola da fermo
      k.collo.rotation.z = -0.15 * amp + (amp < 0.1 ? Math.sin(s * 0.8) * 0.08 : 0);
      k.coda.rotation.z = galoppo * -0.5 + (amp < 0.1 ? 0.3 : 0);
      k.coda.rotation.x = amp < 0.3 ? Math.sin(s * 12) * 0.5 : Math.sin(giro2) * 0.15;
      // Seduto: posteriori piegati, corpo inclinato all'indietro, testa alta verso il gregge
      k.siede = morbido(k.siede, k.seduto ? 1 : 0, dt * 4);
      if (k.siede > 0.01) {
        k.corpo.rotation.z += k.siede * 0.55;
        k.corpo.position.y = 0.105 - k.siede * 0.02;
        k.zampe.forEach(z => { if (!z.avanti) { z.anca.rotation.z = -k.siede * 1.1; z.ginocchio.rotation.z = k.siede * 1.6; } else z.anca.rotation.z -= k.siede * 0.5; });
        k.collo.rotation.z = k.siede * -0.3;
        let cx2 = 0, cz2 = 0;
        pecore.forEach(q => { cx2 += q.x; cz2 += q.z; });
        const guarda = angolo(Math.atan2(-(cz2 / pecore.length - k.z), cx2 / pecore.length - k.x) - k.verso);
        if (k.seduto) k.verso += guarda * Math.min(1, dt * 1.5);
      } else k.corpo.position.y = 0.105;
    }
    // Mucche: brucano, fanno passi lenti restando con la mandria, si sdraiano; i vitelli stanno vicino alla mamma
    mucche.forEach(m => {
      const dc = Math.hypot(m.x - cane.x, m.z - cane.z);
      m.timer -= dt;
      if (dc < 0.8 && m.stato === 'sdraiata') { m.stato = 'cammina'; m.timer = 3; }
      if (m.timer <= 0) {
        const tira = r();
        m.stato = m.stato === 'sdraiata' ? 'bruca' : tira < 0.2 && !m.vitello ? 'sdraiata' : tira < 0.6 ? 'bruca' : 'cammina';
        m.timer = m.stato === 'sdraiata' ? 15 + r() * 20 : m.stato === 'bruca' ? 5 + r() * 10 : 2 + r() * 3;
        // Camminando, la mucca va verso il centro della sua mandria (o verso la mamma), con un po' di libertà
        if (m.stato === 'cammina') {
          const m0 = m.vitello ? mucche[m.mamma]! : null, cx = m0 ? m0.x : MANDRIE[m.mandria]!.x, cz = m0 ? m0.z : MANDRIE[m.mandria]!.y;
          m.verso = Math.atan2(-(cz - m.z), cx - m.x) + (r() - 0.5) * 1.6;
        }
      }
      let voluta = m.stato === 'cammina' ? (m.vitello ? 0.09 : 0.06) : 0;
      if (dc < 0.7) { voluta = 0.2; m.verso += angolo(Math.atan2(-(m.z - cane.z), m.x - cane.x) - m.verso) * Math.min(1, dt * 2); }
      m.vel = morbido(m.vel, voluta, dt * 1.5);
      const nx = m.x + Math.cos(m.verso) * m.vel * dt, nz = m.z - Math.sin(m.verso) * m.vel * dt;
      if (Math.hypot(nx, nz) > L - 1.6 || !libero(nx, nz, 0.1)) m.verso += dt * 2; else { m.x = nx; m.z = nz; }
      // Sdraiata: corpo basso, zampe nascoste; in piedi: guarda il cane se è vicino, altrimenti bruca a testa bassa
      m.giu = morbido(m.giu, m.stato === 'sdraiata' ? 1 : 0, dt * 1.2);
      m.o.position.set(m.x, altezza(m.x, m.z), m.z);
      m.o.rotation.y = m.verso;
      m.corpo.position.y = 0.1 - m.giu * 0.055;
      m.zampe.visible = m.giu < 0.6;
      const guarda = dc < 2 ? THREE.MathUtils.clamp(angolo(Math.atan2(-(cane.z - m.z), cane.x - m.x) - m.verso), -0.9, 0.9) : 0;
      m.collo.rotation.y = morbido(m.collo.rotation.y, guarda, dt * 2);
      const bruca = m.stato === 'bruca' && dc > 2;
      m.collo.position.y = morbido(m.collo.position.y, bruca ? -0.05 + Math.abs(Math.sin(s * 1.4 + m.fase)) * 0.008 : 0.01, dt * 2);
      m.collo.rotation.z = m.stato === 'sdraiata' ? Math.sin(s * 2.5 + m.fase) * 0.06 : 0;
      m.coda.rotation.x = Math.sin(s * 1.7 + m.fase) * 0.5 * (Math.sin(s * 0.3 + m.fase) > 0 ? 1 : 0.2);
      // Camminando, un piccolo dondolio del corpo
      m.corpo.rotation.x = m.vel > 0.02 ? Math.sin(s * 9 + m.fase) * 0.03 : 0;
    });

    // Pascolo del gregge: un punto che gira lento nella valle; le pecore calme ci vanno piano, così il gregge si sposta
    const pascolo = tmp.set(Math.sin(s * 0.025) * 2.4, 0, Math.sin(s * 0.019 + 1) * 2);
    // Gregge: ogni pecora si tiene a distanza dalle vicine, resta col gruppo, scappa dal cane; quando è calma bruca
    // e fa due passi. Chi scappa trascina le vicine: il gregge si muove come una massa e gira intorno agli ostacoli.
    griglia.clear();
    pecore.forEach((q, i) => { const k = cella(q.x, q.z); (griglia.get(k) ?? griglia.set(k, []).get(k)!).push(i); });
    pecore.forEach((q, i) => {
      let ax = 0, az = 0, mx = 0, mz = 0, cx = 0, cz = 0, n = 0, paura = 0;
      const k0 = cella(q.x, q.z);
      for (const k of [k0, k0 + 1, k0 - 1, k0 + 100, k0 - 100, k0 + 101, k0 - 101, k0 + 99, k0 - 99]) for (const j of griglia.get(k) ?? []) {
        if (j === i) continue;
        const o = pecore[j]!, dx = q.x - o.x, dz = q.z - o.z, d = Math.hypot(dx, dz);
        if (d > 0.7 || d < 1e-4) continue;
        n++; mx += o.vx; mz += o.vz; cx += o.x; cz += o.z;
        if (d < 0.15) { ax += (dx / d) * (0.15 - d) * 22; az += (dz / d) * (0.15 - d) * 22; }
        paura = Math.max(paura, (1 - o.calma) * (1 - d / 0.7));
      }
      const dc = Math.hypot(q.x - cane.x, q.z - cane.z) || 1e-3;
      if (dc < 1.6) { ax += ((q.x - cane.x) / dc) * (1.6 - dc) * 2.6; az += ((q.z - cane.z) / dc) * (1.6 - dc) * 2.6; paura = Math.max(paura, 1 - dc / 1.6); }
      q.calma = morbido(q.calma, 1 - Math.min(1, paura * 1.6), dt * (paura > 1 - q.calma ? 4 : 0.35));
      const agitata = 1 - q.calma;
      if (n) {
        ax += ((mx / n) - q.vx) * 1.5 * (0.3 + agitata);
        az += ((mz / n) - q.vz) * 1.5 * (0.3 + agitata);
        ax += ((cx / n) - q.x) * (0.15 + agitata * 0.8);
        az += ((cz / n) - q.z) * (0.15 + agitata * 0.8);
      }
      q.timer -= dt;
      if (q.timer <= 0) { q.voglia = q.voglia ? 0 : 1; q.timer = q.voglia ? 1.5 + r() * 2.5 : 2.5 + r() * 5; if (q.voglia) q.verso += (r() - 0.5) * 2; }
      if (q.voglia && agitata < 0.3) { ax += Math.cos(q.verso) * 0.6; az -= Math.sin(q.verso) * 0.6; }
      // Verso il pascolo, piano, solo da calme
      if (agitata < 0.3) { const px = pascolo.x - q.x, pz = pascolo.z - q.z, d = Math.hypot(px, pz) || 1; ax += (px / d) * Math.min(1, d) * 0.12; az += (pz / d) * Math.min(1, d) * 0.12; }
      for (const o of ostacoli) {
        const dx = q.x - o.x, dz = q.z - o.z, d = Math.hypot(dx, dz), giro = o.r + 0.07;
        if (d < giro && d > 1e-4) { ax += (dx / d) * (giro - d) * 30; az += (dz / d) * (giro - d) * 30; }
      }
      for (const m of mucche) {
        const dx = q.x - m.x, dz = q.z - m.z, d = Math.hypot(dx, dz);
        if (d < 0.2 && d > 1e-4) { ax += (dx / d) * (0.2 - d) * 30; az += (dz / d) * (0.2 - d) * 30; }
      }
      const dr = Math.hypot(q.x, q.z);
      if (dr > L - 1.8) { ax -= (q.x / dr) * (dr - L + 1.8) * 4; az -= (q.z / dr) * (dr - L + 1.8) * 4; }
      q.vx += ax * dt; q.vz += az * dt;
      const attrito = Math.exp(-dt * (agitata > 0.2 ? 1.2 : 3.5));
      q.vx *= attrito; q.vz *= attrito;
      const v = Math.hypot(q.vx, q.vz), vMax = 0.15 + agitata * 0.9;
      if (v > vMax) { q.vx *= vMax / v; q.vz *= vMax / v; }
      q.x += q.vx * dt; q.z += q.vz * dt;
      if (v > 0.03) q.verso += angolo(Math.atan2(-q.vz, q.vx) - q.verso) * Math.min(1, dt * 4);
      q.testa = morbido(q.testa, v < 0.04 ? 1 : 0, dt * 2);
      const y = altezza(q.x, q.z), passo = v > 0.03 ? Math.abs(Math.sin(s * 14 + q.fase)) * 0.01 : 0;
      dummy.position.set(q.x, y + 0.042 + passo, q.z);
      dummy.rotation.set(0, q.verso, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      corpi.setMatrixAt(i, dummy.matrix);
      const giu = q.testa * (0.025 + Math.abs(Math.sin(s * 3 + q.fase)) * 0.008);
      dummy.position.set(q.x + Math.cos(q.verso) * 0.08, y + 0.056 - giu, q.z - Math.sin(q.verso) * 0.08);
      dummy.updateMatrix();
      teste.setMatrixAt(i, dummy.matrix);
    });
    corpi.instanceMatrix.needsUpdate = true;
    teste.instanceMatrix.needsUpdate = true;
  }
  return p;
}
