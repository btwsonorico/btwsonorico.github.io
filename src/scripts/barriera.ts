import * as THREE from 'three';
import { colori, tonoSezione, vista, type DatiCompetenze, type Punto } from './vista3d';

// Barriera corallina in wireframe, nello stile di bosco e laghetto. Su un fondale di sabbia, ogni competenza è una
// formazione di coralli con la sua specie (ramificato, a ventaglio, a cervello, a canne, anemone) e il suo colore;
// ogni area è un corallo, più grande quanto più pesa. Intorno vive il mare: banchi di pesci tropicali, una tartaruga,
// meduse che pulsano, un granchio sulla sabbia, i pesci pagliaccio nell'anemone, bolle e raggi di luce.
// Un clic su un corallo apre la sua area.

function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}
const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
const segmenti = (xyz: number[], mat: THREE.LineBasicMaterial) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.LineSegments(g, mat);
};
const curva = (punti: THREE.Vector3[], mat: THREE.LineBasicMaterial, chiusa = false) =>
  chiusa ? new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(punti), mat) : new THREE.Line(new THREE.BufferGeometry().setFromPoints(punti), mat);
const nuvola = (xyz: number[], colore: THREE.Color, size: number, opacita: number) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: colore, size, transparent: true, opacity: opacita }));
};

type Specie = 'ramificato' | 'ventaglio' | 'cervello' | 'canne' | 'anemone';
const SPECIE: Specie[] = ['ramificato', 'ventaglio', 'cervello', 'canne', 'anemone'];

export function monta(el: HTMLElement) {
  const { competenze } = JSON.parse(el.dataset.grafo!) as DatiCompetenze;
  const c = colori(el);
  const chiaro = document.documentElement.dataset.theme === 'light';
  const r = casuale(23);
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const azzurro = tonoSezione('--azzurro'), arancio = tonoSezione('--arancio'), verde = tonoSezione('--verde');
  // Colori dei coralli: i toni del sito più un rosa e un viola, come i coralli veri
  const TINTE = [arancio, new THREE.Color(chiaro ? '#d6457a' : '#ff8fb1'), verde.clone().lerp(azzurro, 0.3), new THREE.Color(chiaro ? '#7d4fd6' : '#b79cff'), azzurro.clone().offsetHSL(0, 0, 0.08)];
  const sabbia = arancio.clone().lerp(c.muted, 0.7);

  // Pezzo pieno con i bordi delle facce, nel colore del corallo
  const materiali = new Map<string, THREE.Material[]>();
  const registra = (famiglia: string, m: THREE.Material) => { (materiali.get(famiglia) ?? materiali.set(famiglia, []).get(famiglia)!).push(m); return m; };
  const solido = (famiglia: string, geo: THREE.BufferGeometry, colore: THREE.Color, pieno = 0.22) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, registra(famiglia, new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: pieno, depthWrite: false }))),
      new THREE.LineSegments(new THREE.EdgesGeometry(geo), registra(famiglia, linea(colore, 0.9)) as THREE.LineBasicMaterial));
    return g;
  };

  // --- Fondale: sabbia a puntini, dischi che sfumano verso i bordi, sassi, conchigliette e alghe che ondeggiano
  const granelli: number[] = [];
  for (let k = 0; k < 900; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 5; granelli.push(Math.cos(a) * d, 0, Math.sin(a) * d); }
  gruppo.add(nuvola(granelli, sabbia, 0.025, chiaro ? 0.7 : 0.5));
  for (const [raggio, op] of [[5.4, 0.07], [4, 0.05], [2.6, 0.04]] as const) {
    const disco = new THREE.Mesh(new THREE.CircleGeometry(raggio, 64), new THREE.MeshBasicMaterial({ color: sabbia, transparent: true, opacity: op * (chiaro ? 1 : 0.6), depthWrite: false }));
    disco.rotation.x = -Math.PI / 2;
    disco.position.y = -0.01;
    disco.renderOrder = -2;
    gruppo.add(disco);
  }
  const matSassi = linea(c.muted, 0.6);
  for (let k = 0; k < 16; k++) {
    const a = r() * Math.PI * 2, d = 0.8 + r() * 4;
    const sasso = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.DodecahedronGeometry(0.08 + r() * 0.16, 0)), matSassi);
    sasso.position.set(Math.cos(a) * d, 0.03, Math.sin(a) * d);
    sasso.scale.y = 0.55;
    gruppo.add(sasso);
  }
  const alghe = Array.from({ length: 22 }, () => {
    const a = r() * Math.PI * 2, d = 1 + r() * 3.8, alta = 0.3 + r() * 0.5;
    const l = curva(Array.from({ length: 8 }, (_, i) => new THREE.Vector3(0, (i / 7) * alta, 0)), linea(verde.clone().lerp(c.muted, 0.3), 0.6));
    l.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    gruppo.add(l);
    return { l, alta, fase: r() * 6 };
  });

  // --- Coralli: una specie per competenza, un corallo per area
  const ondeggiano: { o: THREE.Object3D; fase: number; forza: number }[] = [];
  function corallo(specie: Specie, famiglia: string, dim: number, colore: THREE.Color) {
    const g = new THREE.Group();
    const m = registra(famiglia, linea(colore, 0.9)) as THREE.LineBasicMaterial;
    let alto = dim;
    if (specie === 'ramificato') {
      // Rami che si dividono in due o tre, con le punte tonde
      const xyz: number[] = [];
      const ramo = (da: THREE.Vector3, dir: THREE.Vector3, lungo: number, livello: number) => {
        const a = da.clone().addScaledVector(dir, lungo);
        xyz.push(...da.toArray(), ...a.toArray());
        if (livello === 0) {
          const punta = solido(famiglia, new THREE.IcosahedronGeometry(0.025 * (1 + dim), 0), colore, 0.5);
          punta.position.copy(a);
          g.add(punta);
          return;
        }
        for (let k = 0; k < 2 + (livello % 2); k++) {
          const nuova = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (k - 1) * 1.6 + r() * 0.5).applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.35 + r() * 0.2).normalize();
          nuova.y = Math.max(0.4, nuova.y);
          ramo(a, nuova.normalize(), lungo * 0.72, livello - 1);
        }
      };
      ramo(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0.22 * dim, 3);
      g.add(segmenti(xyz, m));
      alto = dim * 0.7;
    } else if (specie === 'ventaglio') {
      // Gorgonia: un ventaglio piatto di rami sottili, con una rete leggera fra un ramo e l'altro
      const raggio = 0.55 * dim, xyz: number[] = [], orlo: THREE.Vector3[] = [];
      for (let k = 0; k <= 10; k++) {
        const a = Math.PI * (0.12 + (k / 10) * 0.76), p = new THREE.Vector3(Math.cos(a) * raggio, Math.sin(a) * raggio, 0);
        xyz.push(0, 0, 0, p.x, p.y, p.z);
        orlo.push(p);
      }
      for (const f of [0.45, 0.75]) xyz.push(...orlo.flatMap((p, i) => i ? [orlo[i - 1]!.x * f, orlo[i - 1]!.y * f, 0, p.x * f, p.y * f, 0] : []));
      const forma = new THREE.Shape([new THREE.Vector2(0, 0), ...orlo.map(p => new THREE.Vector2(p.x, p.y))]);
      const velo = new THREE.Mesh(new THREE.ShapeGeometry(forma), registra(famiglia, new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })));
      g.add(velo, segmenti(xyz, m), curva(orlo, m));
      g.rotation.y = r() * Math.PI;
      ondeggiano.push({ o: g, fase: r() * 6, forza: 0.12 });
      alto = raggio;
    } else if (specie === 'cervello') {
      // Corallo cervello: una cupola piena, con i solchi che serpeggiano sopra
      const raggio = 0.22 * dim;
      g.add(solido(famiglia, new THREE.SphereGeometry(raggio, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), colore, 0.3));
      for (let k = 0; k < 4; k++) {
        const y = raggio * (0.25 + k * 0.2), rr = Math.sqrt(Math.max(0, raggio * raggio - y * y)) * 1.01;
        g.add(curva(Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2; const ond = 1 + Math.sin(a * 9 + k) * 0.06; return new THREE.Vector3(Math.cos(a) * rr * ond, y, Math.sin(a) * rr * ond); }), m, true));
      }
      alto = raggio;
    } else if (specie === 'canne') {
      // Corallo a canne: tubi aperti di altezze diverse, con l'orlo in cima
      const tubi = 4 + Math.floor(r() * 3);
      for (let k = 0; k < tubi; k++) {
        const h = (0.25 + r() * 0.35) * dim, rt = 0.035 + r() * 0.02;
        const tubo = solido(famiglia, new THREE.CylinderGeometry(rt, rt * 1.2, h, 7, 1, true), colore, 0.2);
        tubo.position.set((r() - 0.5) * 0.2 * dim, h / 2, (r() - 0.5) * 0.2 * dim);
        g.add(tubo);
        alto = Math.max(alto, h);
      }
    } else {
      // Anemone: un piede corto e tanti tentacoli che ondeggiano
      g.add(solido(famiglia, new THREE.CylinderGeometry(0.07 * dim, 0.09 * dim, 0.08 * dim, 9, 1, true), colore, 0.3));
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, t = new THREE.Group();
        t.add(curva(Array.from({ length: 6 }, (_, i) => { const u = i / 5; return new THREE.Vector3(u * 0.12 * dim, 0.04 * dim + u * 0.22 * dim, 0); }), m));
        t.rotation.y = a;
        t.position.y = 0.04 * dim;
        g.add(t);
        ondeggiano.push({ o: t, fase: k * 0.4, forza: 0.25 });
      }
      alto = 0.28 * dim;
    }
    const punta = new THREE.Object3D();
    punta.position.y = alto + 0.05;
    g.add(punta);
    return { g, punta };
  }

  const anemoni: THREE.Vector3[] = [];
  competenze.forEach((k, i) => {
    const specie = SPECIE[i % SPECIE.length]!, colore = TINTE[i % TINTE.length]!;
    const a0 = (i / competenze.length) * Math.PI * 2 + 0.3, centro = new THREE.Vector3(Math.cos(a0) * 2.1, 0, Math.sin(a0) * 2.1);
    const sopra = new THREE.Object3D();
    sopra.position.copy(centro).setY(1.25);
    gruppo.add(sopra);
    punti.push({ id: `skill:${k.id}`, label: k.label, href: k.href, hub: true, famiglia: k.id, ancora: sopra });
    k.aree.forEach((a, j) => {
      // I coralli di una competenza stanno vicini, a spirale intorno al centro della formazione
      const b = j * 2.4 + r(), d = j === 0 ? 0 : 0.25 + Math.sqrt(j) * 0.28;
      const { g, punta } = corallo(specie, k.id, 0.8 + a.peso * 0.12, colore.clone().offsetHSL((j % 3 - 1) * 0.02, 0, (j % 2) * 0.05));
      g.position.set(centro.x + Math.cos(b) * d, 0, centro.z + Math.sin(b) * d);
      g.rotation.y += r() * Math.PI;
      gruppo.add(g);
      if (specie === 'anemone') anemoni.push(g.position.clone());
      punti.push({ id: `area:${a.id}`, label: a.label, href: a.href, hub: false, famiglia: k.id, ancora: punta, base: g });
    });
  });

  // --- Pesci tropicali: banchi che girano intorno alla barriera, ognuno con il suo colore e la sua quota
  const pesce = (colore: THREE.Color, scala: number) => {
    const g = new THREE.Group();
    const m = linea(colore, 0.95);
    const corpo = new THREE.Group();
    const geo = new THREE.SphereGeometry(1, 7, 5);
    corpo.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: 0.35, depthWrite: false })), new THREE.LineSegments(new THREE.EdgesGeometry(geo), m));
    corpo.scale.set(0.025 * scala, 0.05 * scala, 0.07 * scala);
    const coda = curva([new THREE.Vector3(0, 0, -0.06 * scala), new THREE.Vector3(0, 0.04 * scala, -0.11 * scala), new THREE.Vector3(0, -0.04 * scala, -0.11 * scala)], m, true);
    g.add(corpo, coda, curva([new THREE.Vector3(0, 0.05 * scala, 0.02 * scala), new THREE.Vector3(0, 0.08 * scala, -0.02 * scala), new THREE.Vector3(0, 0.045 * scala, -0.05 * scala)], m));
    gruppo.add(g);
    return { g, coda };
  };
  const giallo = new THREE.Color(chiaro ? '#c99a00' : '#f2c94c');
  const banchi = [[giallo, 1.1, 2.9, 0.55], [azzurro, 0.8, 3.6, -0.4], [arancio, 1.5, 1.4, 0.7]].map(([colore, quota, raggio, vel], b) =>
    Array.from({ length: 8 }, (_, k) => ({ ...pesce(colore as THREE.Color, 1), quota: (quota as number) + (r() - 0.5) * 0.3, raggio: (raggio as number) + (r() - 0.5) * 0.4, vel: vel as number, fase: k * 0.12 + b * 2, ritmo: r() * 6 })));
  // Pesci pagliaccio: due per anemone, che le girano intorno da vicino
  const pagliaccio = new THREE.Color(chiaro ? '#e0661a' : '#ff8a3d');
  const pagliacci = anemoni.slice(0, 2).flatMap(p => [0, 1].map(k => ({ ...pesce(pagliaccio, 0.8), centro: p, fase: k * Math.PI })));

  // --- Tartaruga: guscio pieno e quattro pinne che remano, gira larga sopra la barriera
  const tartaruga = new THREE.Group();
  const coloreT = verde.clone().lerp(c.muted, 0.35);
  const guscio = new THREE.Group();
  const geoGuscio = new THREE.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  guscio.add(new THREE.Mesh(geoGuscio, new THREE.MeshBasicMaterial({ color: coloreT, transparent: true, opacity: 0.35, depthWrite: false })), new THREE.LineSegments(new THREE.EdgesGeometry(geoGuscio), linea(coloreT, 0.9)));
  guscio.scale.set(1, 0.45, 1.25);
  const testa = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.07, 1)), linea(coloreT, 0.9));
  testa.position.set(0, 0.03, 0.4);
  tartaruga.add(guscio, testa);
  const pinne = [[0.22, 0.18], [-0.22, 0.18], [0.18, -0.22], [-0.18, -0.22]].map(([x, z], k) => {
    const p = new THREE.Group();
    const davanti = k < 2, lato = x! > 0 ? 1 : -1;
    p.add(curva([new THREE.Vector3(0, 0, 0), new THREE.Vector3(lato * (davanti ? 0.3 : 0.15), 0, davanti ? -0.06 : -0.08), new THREE.Vector3(lato * (davanti ? 0.22 : 0.1), 0, davanti ? 0.07 : 0.02)], linea(coloreT, 0.9), true));
    p.position.set(x!, 0.02, z!);
    tartaruga.add(p);
    return { p, lato, davanti };
  });
  gruppo.add(tartaruga);

  // --- Meduse: campana che pulsa e tentacoli che seguono; salgono piano e ridiscendono
  const lilla = new THREE.Color(chiaro ? '#9a6fd6' : '#d7c4ff');
  const meduse = [0, 1].map(k => {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.16, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    const campana = new THREE.Group();
    campana.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: lilla, transparent: true, opacity: 0.25, depthWrite: false })), new THREE.LineSegments(new THREE.EdgesGeometry(geo), linea(lilla, 0.8)));
    g.add(campana);
    const tentacoli = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2;
      const t = curva(Array.from({ length: 6 }, (_, q) => new THREE.Vector3(Math.cos(a) * 0.09, -q * 0.08, Math.sin(a) * 0.09)), linea(lilla, 0.55));
      g.add(t);
      return t;
    });
    gruppo.add(g);
    return { g, campana, tentacoli, x: k ? -2.6 : 2.9, z: k ? -1.4 : 1.2, fase: k * 3 };
  });

  // --- Granchio: corpo largo, chele e zampe; cammina di lato avanti e indietro sulla sabbia
  const granchio = new THREE.Group();
  const coloreG = arancio.clone().offsetHSL(-0.02, 0, -0.05);
  const corpoG = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(1, 8, 4)), linea(coloreG, 0.95));
  corpoG.scale.set(0.11, 0.045, 0.08);
  corpoG.position.y = 0.06;
  granchio.add(corpoG);
  const zampeG = [1, -1].flatMap(lato => [0, 1, 2].map(k => {
    const z = curva([new THREE.Vector3(lato * 0.09, 0.06, -0.04 + k * 0.04), new THREE.Vector3(lato * 0.16, 0.08, -0.05 + k * 0.05), new THREE.Vector3(lato * 0.19, 0, -0.06 + k * 0.06)], linea(coloreG, 0.85));
    granchio.add(z);
    return z;
  }));
  for (const lato of [1, -1]) {
    const chela = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.035, 0)), linea(coloreG, 0.95));
    chela.position.set(lato * 0.07, 0.07, 0.11);
    granchio.add(chela);
  }
  gruppo.add(granchio);

  // --- Bolle che salgono dai coralli, e raggi di luce che scendono dall'alto e oscillano piano
  const BOLLE = 40;
  const bolle = Array.from({ length: BOLLE }, () => ({ x: (r() - 0.5) * 6, z: (r() - 0.5) * 6, y: r() * 3.5, vel: 0.15 + r() * 0.2, fase: r() * 6 }));
  const gBolle = new THREE.BufferGeometry();
  gBolle.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(BOLLE * 3), 3));
  gruppo.add(new THREE.Points(gBolle, new THREE.PointsMaterial({ color: c.fg, size: 0.035, transparent: true, opacity: 0.5 })));
  const raggi = Array.from({ length: 7 }, (_, k) => {
    const l = segmenti([0, 3.6, 0, 0, 0, 0], linea(azzurro, chiaro ? 0.12 : 0.08));
    l.position.set(-3 + k, 0, -1.5 + (k % 3) * 0.8);
    gruppo.add(l);
    return { l, fase: k * 1.3 };
  });

  const accendi = (mats: THREE.Material[], livello: number) => {
    const k = livello === 1 ? 1.5 : livello === 0.5 ? 1 : 0.35;
    mats.forEach(m => { m.opacity = Math.min(1, (m.userData.base ??= m.opacity) * k); });
  };
  const avanti = new THREE.Vector3();

  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 2.6, 7.8),
    mira: new THREE.Vector3(0, 0.55, 0),
    inclinazione: [0.04, 0.4],
    giuMax: 0.05,
    aggiorna: (t, acceso) => {
      const s = t / 1000;
      ondeggiano.forEach(o => { o.o.rotation.z = Math.sin(s * 0.9 + o.fase) * o.forza; });
      alghe.forEach(a => {
        const pos = a.l.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < 8; i++) { const u = i / 7; pos.setX(i, Math.sin(s * 1.1 + a.fase + u * 2) * 0.08 * u); }
        pos.needsUpdate = true;
      });
      // Banchi: girano intorno alla barriera, ognuno alla sua quota, con un'onda leggera
      banchi.forEach(banco => banco.forEach(p => {
        const a = p.fase + s * p.vel * 0.25, rr = p.raggio + Math.sin(s * 0.4 + p.ritmo) * 0.15;
        p.g.position.set(Math.cos(a) * rr, p.quota + Math.sin(s * 0.8 + p.ritmo) * 0.08, Math.sin(a) * rr);
        avanti.set(Math.cos(a + Math.sign(p.vel) * 0.05) * rr, p.g.position.y, Math.sin(a + Math.sign(p.vel) * 0.05) * rr);
        p.g.lookAt(gruppo.localToWorld(avanti.clone()));
        p.coda.rotation.y = Math.sin(s * 9 + p.ritmo) * 0.35;
      }));
      pagliacci.forEach((p, k) => {
        const a = p.fase + s * 0.9;
        p.g.position.set(p.centro.x + Math.cos(a) * 0.22, 0.2 + Math.sin(s * 1.5 + k) * 0.04, p.centro.z + Math.sin(a) * 0.22);
        avanti.set(p.centro.x + Math.cos(a + 0.1) * 0.22, p.g.position.y, p.centro.z + Math.sin(a + 0.1) * 0.22);
        p.g.lookAt(gruppo.localToWorld(avanti.clone()));
        p.coda.rotation.y = Math.sin(s * 12 + k) * 0.4;
      });
      // Tartaruga: un giro largo e lento, le pinne davanti remano, quelle dietro timonano
      const at = s * 0.07;
      tartaruga.position.set(Math.cos(at) * 3.4, 1.9 + Math.sin(s * 0.3) * 0.15, Math.sin(at) * 2.6);
      avanti.set(Math.cos(at + 0.05) * 3.4, tartaruga.position.y, Math.sin(at + 0.05) * 2.6);
      tartaruga.lookAt(gruppo.localToWorld(avanti.clone()));
      pinne.forEach(p => { p.p.rotation.z = p.lato * Math.sin(s * 1.6 + (p.davanti ? 0 : 1)) * (p.davanti ? 0.45 : 0.2); });
      // Meduse: la campana si stringe e si allarga, e a ogni spinta sale un po'
      meduse.forEach(m => {
        const pulsa = Math.sin(s * 2 + m.fase);
        m.campana.scale.set(1 - pulsa * 0.12, 1 + pulsa * 0.1, 1 - pulsa * 0.12);
        m.g.position.set(m.x + Math.sin(s * 0.2 + m.fase) * 0.3, 1.4 + ((s * 0.08 + m.fase) % 1.6), m.z);
        m.tentacoli.forEach((tt, i) => { tt.rotation.x = Math.sin(s * 2 + m.fase + i) * 0.15; });
      });
      // Granchio: di lato, avanti e indietro, con le zampe che si alternano
      const ag = Math.sin(s * 0.35);
      granchio.position.set(-1 + ag * 1.2, 0, 3.3);
      zampeG.forEach((z, i) => { z.rotation.x = Math.sin(s * 10 + i) * 0.2 * Math.abs(Math.cos(s * 0.35)); });
      // Bolle e raggi di luce
      const pos = gBolle.attributes.position as THREE.BufferAttribute;
      bolle.forEach((b, i) => {
        b.y += 0.016 * b.vel;
        if (b.y > 3.6) b.y = 0;
        pos.setXYZ(i, b.x + Math.sin(s * 2 + b.fase) * 0.05, b.y, b.z);
      });
      pos.needsUpdate = true;
      raggi.forEach(rg => { rg.l.rotation.z = Math.sin(s * 0.25 + rg.fase) * 0.12; });
      competenze.forEach(k => accendi(materiali.get(k.id) ?? [], acceso(k.id, `skill:${k.id}`)));
    },
  });
}
