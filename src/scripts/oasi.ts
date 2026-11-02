import * as THREE from 'three';
import { casuale, filo, nastri, puntiMorbidi, palco, curveLivello, terreno, benDistribuiti, tema, type Nastro, type Palco } from './natura';

// Oasi ravvicinata, a filo come il bosco e il laghetto: uno specchio d'acqua fra le dune, palme, canne e ninfee. Le gazzelle camminano, bevono a testa bassa e
// saltano sul posto se il puntatore si avvicina; le rane colorate gonfiano la gola e balzano fra riva, ninfee e acqua.
// Passatempo: tieni premuto sulla sabbia e trascina per fare una palla; quando la lasci, uno scarabeo stercorario arriva,
// la spinge camminando all'indietro e la porta nella sua tana. Il vento solleva granelli dalle creste delle dune.

export function monta(el: HTMLElement) {
  const r = casuale(61);
  const chiaro = tema();
  const azzurroSito = getComputedStyle(document.documentElement).getPropertyValue('--azzurro').trim();
  const p = palco(el, {
    camera: new THREE.Vector3(0, 3.8, 6.6), mira: new THREE.Vector3(0, 0.3, 0.1), giro: 0.012, inclina: [-0.28, 0.4], nebbia: [1.35, 2.4], zoom: [0.5, 1.2], aggiorna,
    afferra, trascina, rilascia,
    scena: 'oasi', famiglie: false, toni: [chiaro ? '#a67c3d' : '#c9a66b', azzurroSito, chiaro ? '#2f8f40' : '#57b35f'],
  });
  const g = p.gruppo, c = p.colori;
  const [SABBIA, ACQUA, PALMA] = p.toni as [THREE.Color, THREE.Color, THREE.Color];
  const morbido = (da: number, a: number, k: number) => da + (a - da) * Math.min(1, k);
  const angolo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const liscio = THREE.MathUtils.smoothstep;
  const L = 6.6;
  // Ogni pezzo è a filo: i parametri di ombra del vecchio solido non servono più
  const pieno = (geo: THREE.BufferGeometry, base: THREE.Color, _fili = 0, soglia = 28, _ombra = 0, _luce = 0) => filo(geo, base, 0.85, soglia);

  // --- Sabbia: conca intorno all'acqua e dune che crescono allontanandosi, con la cresta netta da un lato
  const rivaDi = (a: number) => 1.45 * (1 + 0.16 * Math.sin(a * 2 + 0.7) + 0.09 * Math.sin(a * 3 + 2) + 0.04 * Math.sin(a * 7));
  const distRiva = (x: number, z: number) => {
    const ex = x / 1.25, ez = z / 0.95;
    return Math.hypot(ex, ez) - rivaDi(Math.atan2(ez, ex));
  };
  const nelLago = (x: number, z: number, margine = 0) => distRiva(x, z) < margine;
  const altezza = (x: number, z: number) => {
    const d = distRiva(x, z);
    if (d < 0) return Math.max(-0.14, d * 0.35);
    const u = x * 0.82 + z * 0.46 + 0.35 * Math.sin(z * 1.05 + 0.6), v = -x * 0.38 + z * 0.9 + 0.3 * Math.sin(x * 0.8);
    const cresta = (1 - Math.abs(Math.sin(u))) ** 1.6, cresta2 = (1 - Math.abs(Math.sin(v * 0.8 + 1))) ** 1.8;
    const forza = liscio(d, 0.5, 3.4) * (1 - liscio(Math.hypot(x, z), 4.4, 6.1));
    return d * 0.07 + forza * (0.22 + cresta * 0.62 + cresta2 * 0.28) + 0.008 * Math.sin(x * 15 + z * 9);
  };
  {
    // Velo di sabbia che segue le dune, griglia di punti, curve di livello: le dune si leggono dalle linee
    const geo = new THREE.RingGeometry(0.01, L * 0.92, 96, 44).rotateX(-Math.PI / 2), q = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < q.count; i++) q.setY(i, Math.max(0, altezza(q.getX(i), q.getZ(i))) - 0.008);
    const velo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: SABBIA, transparent: true, opacity: chiaro ? 0.16 : 0.07, depthWrite: false }));
    velo.renderOrder = -1;
    g.add(velo);
    terreno(g, SABBIA, L * 0.92, (x, z) => Math.max(0, altezza(x, z)), false);
    const { minori, maggiori } = curveLivello(altezza, L * 0.9, 160, 0.09, 1.8, 4, 0.09);
    for (const [xyz, op] of [[minori, chiaro ? 0.5 : 0.36], [maggiori, chiaro ? 0.95 : 0.8]] as const) {
      const lin = new THREE.BufferGeometry();
      lin.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
      g.add(new THREE.LineSegments(lin, new THREE.LineBasicMaterial({ color: SABBIA, transparent: true, opacity: op })));
    }
  }

  // --- Acqua: più profonda al centro, riva a filo, cerchi e riflessi
  {
    const geo = new THREE.CircleGeometry(1, 72).rotateX(-Math.PI / 2), q = geo.attributes.position as THREE.BufferAttribute, colori: number[] = [], riva: THREE.Vector3[] = [];
    const chiara = ACQUA.clone().lerp(new THREE.Color('#7fe0d8'), 0.45), fonda = ACQUA.clone().multiplyScalar(0.62);
    for (let i = 0; i < q.count; i++) {
      if (i) {
        const a = Math.atan2(-q.getZ(i), q.getX(i)), d = rivaDi(a);
        q.setXYZ(i, Math.cos(a) * d * 1.25, 0, -Math.sin(a) * d * 0.95);
        riva.push(new THREE.Vector3(q.getX(i), 0.003, q.getZ(i)));
      }
      const t = i ? chiara : fonda;
      colori.push(t.r, t.g, t.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colori, 3));
    const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: chiaro ? 0.3 : 0.22, depthWrite: false }));
    o.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(riva), new THREE.LineBasicMaterial({ color: ACQUA, transparent: true, opacity: 0.95 })));
    o.position.y = 0.012;
    g.add(o);
  }
  const RIFLESSI = 46, riflessi = Array.from({ length: RIFLESSI }, () => { let x = 0, z = 0; do { x = (r() - 0.5) * 3.4; z = (r() - 0.5) * 2.6; } while (!nelLago(x, z, -0.15)); return { x, z, f: r() * 6, l: 0.05 + r() * 0.12 }; });
  const posRiflessi = new Float32Array(RIFLESSI * 6), geoRiflessi = new THREE.BufferGeometry();
  geoRiflessi.setAttribute('position', new THREE.BufferAttribute(posRiflessi, 3));
  const lineeRiflessi = new THREE.LineSegments(geoRiflessi, new THREE.LineBasicMaterial({ color: ACQUA.clone().lerp(c.fg, 0.4), transparent: true, opacity: 0.6, depthWrite: false }));
  lineeRiflessi.frustumCulled = false;
  g.add(lineeRiflessi);
  const geoAnello = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 28 }, (_, k) => new THREE.Vector3(Math.cos(k / 28 * Math.PI * 2), 0, Math.sin(k / 28 * Math.PI * 2))));
  const anelli = Array.from({ length: 14 }, () => {
    const m = new THREE.LineBasicMaterial({ color: ACQUA.clone().lerp(c.fg, 0.4), transparent: true, opacity: 0, depthWrite: false }), l = new THREE.LineLoop(geoAnello, m);
    l.position.y = 0.02; g.add(l);
    return { l, m, t: 1, largo: 0.25 };
  });
  let prossimoAnello = 0;
  const anello = (x: number, z: number, largo = 0.25) => { const q = anelli[prossimoAnello++ % anelli.length]!; q.l.position.x = x; q.l.position.z = z; q.t = 0; q.largo = largo; };

  const ostacoli: { x: number; z: number; r: number }[] = [];
  const libero = (x: number, z: number, m: number) => !ostacoli.some(o => Math.hypot(x - o.x, z - o.z) < o.r + m);
  const posa = <T extends THREE.Object3D>(o: T, x: number, z: number, raggio = 0) => { o.position.set(x, altezza(x, z), z); g.add(o); if (raggio) ostacoli.push({ x, z, r: raggio }); return o; };

  // --- Palme: tronco curvo ad anelli, ciuffo di foglie ad arco che ondeggiano, datteri
  const tronco = new THREE.Color(chiaro ? '#8d6c48' : '#94744f');
  const foglia = (() => {
    const geo = new THREE.PlaneGeometry(0.17, 0.82, 1, 8).translate(0, 0.41, 0), q = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < q.count; i++) {
      const t = q.getY(i) / 0.82, larga = Math.sin(t * Math.PI) ** 0.6 * (1 - t * 0.35);
      q.setXYZ(i, q.getX(i) * larga, 0.3 * t - 0.72 * t * t, t * 0.8);
    }
    return geo;
  })();
  const palme: { chioma: THREE.Group; fase: number; foglie: THREE.Object3D[] }[] = [];
  const palma = (x: number, z: number, alta: number) => {
    const o = new THREE.Group(), pende = new THREE.Vector3((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5);
    const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.05, 0), new THREE.Vector3(pende.x * 0.25, alta * 0.4, pende.z * 0.25), new THREE.Vector3(pende.x * 0.75, alta * 0.75, pende.z * 0.75), new THREE.Vector3(pende.x, alta, pende.z)]);
    const geo = new THREE.TubeGeometry(curva, 12, 0.042, 6), q = geo.attributes.position as THREE.BufferAttribute, centri = curva.getPoints(200);
    // Anelli del tronco e base più larga
    for (let i = 0; i < q.count; i++) {
      const y = q.getY(i), t = THREE.MathUtils.clamp(y / alta, 0, 1), c0 = centri[Math.floor(t * 200)]!;
      const k = (1.45 - t * 0.55) * (1 + 0.1 * Math.sin(y * 70));
      q.setX(i, c0.x + (q.getX(i) - c0.x) * k); q.setZ(i, c0.z + (q.getZ(i) - c0.z) * k);
    }
    o.add(pieno(geo, tronco, 0, 30, 0.55, 0.65));
    const chioma = new THREE.Group();
    chioma.position.set(pende.x, alta, pende.z);
    const foglie: THREE.Object3D[] = [];
    const scala = 0.85 + alta * 0.18;
    for (let k = 0; k < 9; k++) {
      const m = pieno(foglia.clone(), PALMA.clone().offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.08), 0, 30, 0.72, 0.42);
      (m.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
      const perno = new THREE.Group();
      perno.rotation.y = (k / 9) * Math.PI * 2 + r() * 0.3;
      m.scale.setScalar(scala * (0.8 + r() * 0.3));
      m.rotation.x = (k % 2 ? -0.15 : 0.12);
      perno.add(m);
      chioma.add(perno);
      foglie.push(m);
    }
    for (let k = 0; k < 7; k++) {
      const a = r() * 6.28, d = pieno(new THREE.SphereGeometry(0.018, 5, 4), new THREE.Color('#e08a3a'), 0, 30, 0.8, 0.3);
      d.position.set(Math.cos(a) * 0.05, -0.03 - r() * 0.05, Math.sin(a) * 0.05);
      chioma.add(d);
    }
    o.add(chioma);
    posa(o, x, z, 0.13);
    palme.push({ chioma, fase: r() * 6, foglie });
  };
  ([[-2.2, -0.75, 1.55], [-2.55, 0.45, 1.25], [-1.85, -1.55, 1.15], [2.35, -0.95, 1.65], [2.75, 0.2, 1.3], [1.75, -1.75, 1.0], [2.45, 1.55, 0.95], [-2.5, 1.55, 0.85]] as const).forEach(([x, z, h]) => palma(x, z, h));

  // --- Canne lungo la riva e ciuffi radi d'erba
  const fili: Nastro[] = [];
  const verdi = [PALMA, PALMA.clone().offsetHSL(0.03, 0, 0.07), PALMA.clone().offsetHSL(-0.02, 0, -0.08)];
  for (let k = 0; k < 18; k++) {
    const a = r() * 6.28, d = rivaDi(a) + (r() - 0.4) * 0.14, x = Math.cos(a) * d * 1.25, z = Math.sin(a) * d * 0.95;
    for (let q = 0; q < 6; q++) {
      const fx = x + (r() - 0.5) * 0.16, fz = z + (r() - 0.5) * 0.16;
      fili.push({ x: fx, z: fz, y: Math.max(0, altezza(fx, fz)), alto: 0.16 + r() * 0.3, largo: 0.02, angolo: r() * 6, fase: r() * 6, colore: verdi[q % 3]! });
    }
  }
  const canne = nastri(fili, 5, true);
  g.add(canne.mesh);
  // Ninfee: dischi verdi sull'acqua, su cui le rane si posano
  const ninfee = ([[0.35, 0.28, 0.14], [-0.55, -0.3, 0.17], [0.7, -0.35, 0.12], [-0.25, 0.55, 0.12], [-0.85, 0.3, 0.11]] as const).map(([x, z, rr]) => {
    const m = pieno(new THREE.CircleGeometry(rr, 12, 0.3, Math.PI * 1.85).rotateX(-Math.PI / 2), PALMA.clone().offsetHSL(0, 0, -0.05), 0, 30, 0.72, 0.4);
    m.position.set(x, 0.022, z); g.add(m);
    return { x, z, y: 0.022 };
  });
  // Sassi radi
  for (let k = 0; k < 9; k++) {
    const q = benDistribuiti(1, 1.9, 5, r, ostacoli)[0]!, rr = 0.05 + r() * 0.09;
    const s = pieno(new THREE.IcosahedronGeometry(rr, 0), new THREE.Color(chiaro ? '#a39a86' : '#8f8878'), 0.25, 25, 0.6, 0.55);
    s.scale.y = 0.65; posa(s, q.x, q.z, rr);
  }

  // --- Rane colorate: corpo tozzo, occhi sporgenti, zampe piegate; gola che pulsa; balzi ad arco
  const COLORI_RANA = ['#e5342a', '#1f7ae0', '#f4c20d', '#28b34b', '#f0701a', '#9a4ddb', '#18b6b6', '#e83e8c'];
  const perche: { x: number; z: number; y: number }[] = [...ninfee];
  for (let k = 0; k < 14; k++) { const a = (k / 14) * 6.28 + r() * 0.2, d = rivaDi(a) + 0.09, x = Math.cos(a) * d * 1.25, z = Math.sin(a) * d * 0.95; perche.push({ x, z, y: Math.max(0.02, altezza(x, z)) }); }
  const rane = COLORI_RANA.map((tinta, k) => {
    const o = new THREE.Group(), col = new THREE.Color(tinta), pancia = new THREE.Color('#f2ecd8');
    o.add(pieno(new THREE.SphereGeometry(0.05, 8, 6).scale(1.15, 0.72, 1), col, 0, 30, 0.72, 0.55).translateY(0.036));
    const gola = pieno(new THREE.SphereGeometry(0.026, 6, 4), pancia, 0, 30, 0.85, 0.2);
    gola.position.set(0.042, 0.022, 0);
    o.add(gola);
    for (const l of [-1, 1]) {
      const occhio = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), new THREE.MeshBasicMaterial({ color: col.clone().offsetHSL(0, 0, 0.12) }));
      occhio.position.set(0.03, 0.068, l * 0.024);
      const pupilla = new THREE.Mesh(new THREE.SphereGeometry(0.007, 5, 3), new THREE.MeshBasicMaterial({ color: '#111' }));
      pupilla.position.set(0.036, 0.071, l * 0.03);
      o.add(occhio, pupilla);
      const coscia = pieno(new THREE.SphereGeometry(0.024, 6, 4).scale(1.5, 0.6, 0.8), col, 0, 30, 0.66, 0.5);
      coscia.position.set(-0.035, 0.018, l * 0.047);
      o.add(coscia);
      const piede = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 3).scale(1.6, 0.35, 1), new THREE.MeshBasicMaterial({ color: col.clone().offsetHSL(0, 0, -0.08) }));
      piede.position.set(0.03, 0.005, l * 0.042);
      o.add(piede);
    }
    g.add(o);
    const dove = perche[(k * 3) % perche.length]!;
    return { o, gola, da: dove, a2: dove, t: 1, attesa: 2 + r() * 8, verso: r() * 6, fase: r() * 6, tuffo: false };
  });
  const occupata = (q: { x: number; z: number }) => rane.some(f => f.a2 === q);

  // --- Gazzelle: snelle, dorso fulvo, pancia bianca, fascia scura sul fianco, corna ad arco; zampe con anca e ginocchio
  const fulvo = new THREE.Color(chiaro ? '#b98a50' : '#c49a62'), biancoG = new THREE.Color('#f3ecdf'), scuro = new THREE.Color('#2e241a');
  const gazzella = (x: number, z: number, scala: number) => {
    const o = new THREE.Group(), corpo = new THREE.Group(), collo = new THREE.Group();
    corpo.position.y = 0.28;
    const geoB = new THREE.CapsuleGeometry(0.05, 0.2, 4, 8).rotateZ(Math.PI / 2);
    corpo.add(pieno(geoB, fulvo, 0, 30, 0.72, 0.5));
    const panciaG = pieno(new THREE.CapsuleGeometry(0.036, 0.17, 3, 6).rotateZ(Math.PI / 2), biancoG, 0, 30, 0.85, 0.2);
    panciaG.position.y = -0.024;
    corpo.add(panciaG);
    for (const l of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.003), new THREE.MeshBasicMaterial({ color: scuro })); f.position.set(0, -0.006, l * 0.0475); corpo.add(f); }
    collo.position.set(0.14, 0.03, 0);
    const lungo = pieno(new THREE.CylinderGeometry(0.019, 0.032, 0.16, 6).translate(0, 0.08, 0), fulvo, 0, 30, 0.72, 0.5);
    lungo.rotation.z = -0.35;
    collo.add(lungo);
    const testa = new THREE.Group();
    testa.position.set(0.055, 0.15, 0);
    testa.add(pieno(new THREE.SphereGeometry(0.028, 6, 5).scale(1.5, 0.85, 0.8), fulvo, 0, 30, 0.75, 0.45));
    testa.add(pieno(new THREE.ConeGeometry(0.015, 0.04, 5).rotateZ(-Math.PI / 2), biancoG, 0, 30, 0.85, 0.2).translateX(0.042));
    const corna: THREE.Vector3[] = [], orecchie: THREE.Vector3[] = [];
    for (const l of [-1, 1]) {
      const c3 = [[-0.005, 0.02, 0.008], [-0.02, 0.06, 0.012], [-0.05, 0.095, 0.016], [-0.075, 0.11, 0.014]];
      for (let k = 0; k < 3; k++) corna.push(new THREE.Vector3(c3[k]![0], c3[k]![1], l * c3[k]![2]!), new THREE.Vector3(c3[k + 1]![0], c3[k + 1]![1], l * c3[k + 1]![2]!));
      orecchie.push(new THREE.Vector3(-0.012, 0.012, l * 0.02), new THREE.Vector3(-0.035, 0.03, l * 0.05));
    }
    testa.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(corna), new THREE.LineBasicMaterial({ color: scuro })), new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(orecchie), new THREE.LineBasicMaterial({ color: fulvo })));
    collo.add(testa);
    corpo.add(collo);
    const coda = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.04, -0.05, 0)]), new THREE.LineBasicMaterial({ color: scuro }));
    coda.position.set(-0.15, 0.02, 0);
    corpo.add(coda);
    const sopra = new THREE.CylinderGeometry(0.014, 0.008, 0.13, 5).translate(0, -0.065, 0), sotto = new THREE.CylinderGeometry(0.0065, 0.005, 0.13, 5).translate(0, -0.065, 0);
    const zampe = ([[-1, -1, 0], [1, -1, 0.25], [-1, 1, 0.5], [1, 1, 0.75]] as const).map(([dx, dz, fase]) => {
      const anca = new THREE.Group(), ginocchio = new THREE.Group();
      anca.position.set(dx * 0.105, -0.018, dz * 0.03);
      anca.add(pieno(sopra.clone(), fulvo, 0, 30, 0.7, 0.45));
      ginocchio.position.y = -0.13;
      ginocchio.add(pieno(sotto.clone(), fulvo, 0, 30, 0.7, 0.45));
      anca.add(ginocchio);
      corpo.add(anca);
      return { anca, ginocchio, fase };
    });
    o.add(corpo);
    o.scale.setScalar(scala);
    g.add(o);
    return { o, corpo, collo, testa, coda, zampe, x, z, verso: r() * 6, vel: 0, giro: 0, passo: 0, stato: 'guarda' as 'guarda' | 'cammina' | 'beve', timer: 1 + r() * 5, mx: x, mz: z, salto: 0, ySalto: 0, vy: 0, abbassa: 0, fase: r() * 6, scala };
  };
  const gazzelle = [gazzella(3.3, 1.0, 1.15), gazzella(3.7, 0.3, 1.05), gazzella(-3.4, 1.9, 1.15), gazzella(-3, -2.3, 1.1), gazzella(3.1, 1.8, 0.72), gazzella(0.3, -2.8, 1.15)];

  // --- Scarabei stercorari e tane: sabbia smossa con un buco; gli scarabei vagano finché non trovano una palla
  const tane = benDistribuiti(3, 2.8, 4.8, r, ostacoli).map(q => {
    const o = new THREE.Group();
    o.add(pieno(new THREE.CylinderGeometry(0.055, 0.17, 0.05, 10).translate(0, 0.02, 0), SABBIA.clone().multiplyScalar(0.8), 0, 30, 0.55, 0.6));
    o.add(new THREE.Mesh(new THREE.CircleGeometry(0.052, 10).rotateX(-Math.PI / 2).translate(0, 0.046, 0), new THREE.MeshBasicMaterial({ color: '#17120d' })));
    posa(o, q.x, q.z);
    return { x: q.x, z: q.z };
  });
  const corazza = chiaro ? new THREE.Color('#232027') : c.fg.clone();
  type Scarabeo = { o: THREE.Group; zampe: THREE.LineSegments; x: number; z: number; verso: number; stato: 'vaga' | 'va' | 'spinge' | 'tana'; palla: Palla | null; tana: { x: number; z: number }; timer: number; passo: number; fase: number };
  type Palla = { o: THREE.Mesh; x: number; z: number; r: number; scarabeo: Scarabeo | null; libera: boolean; affonda: number; rot: THREE.Quaternion };
  const scarabei: Scarabeo[] = Array.from({ length: 5 }, (_, k) => {
    const o = new THREE.Group();
    o.add(pieno(new THREE.SphereGeometry(0.05, 8, 5).scale(1.2, 0.5, 0.85).translate(0, 0.03, 0), corazza, 0.5, 22, 0.8, 0.7));
    o.add(pieno(new THREE.SphereGeometry(0.026, 6, 4).scale(1, 0.6, 1.1).translate(0.062, 0.022, 0), corazza, 0, 30, 0.8, 0.7));
    const seg: THREE.Vector3[] = [];
    for (const l of [-1, 1]) for (const dx of [-0.03, 0, 0.03]) seg.push(new THREE.Vector3(dx, 0.024, l * 0.038), new THREE.Vector3(dx * 1.8, 0, l * 0.075));
    const zampe = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: corazza, transparent: true, opacity: 0.9 }));
    o.add(zampe);
    o.scale.setScalar(1.15);
    g.add(o);
    const q = tane[k % 3]!, a = r() * 6.28;
    return { o, zampe, x: q.x + Math.cos(a) * 0.5, z: q.z + Math.sin(a) * 0.5, verso: r() * 6, stato: 'vaga', palla: null, tana: q, timer: 0, passo: 0, fase: r() * 6 };
  });
  // Solco lasciato sulla sabbia
  const SOLCO = 500, solco = puntiMorbidi(SOLCO), vitaSolco = new Float32Array(SOLCO);
  for (let i = 0; i < SOLCO; i++) { solco.alfa[i] = 0; solco.dim[i] = 0.035; solco.col.set((chiaro ? SABBIA.clone().multiplyScalar(0.6) : SABBIA).toArray(), i * 3); }
  g.add(solco.punti);
  let prossimoSolco = 0, orologioSolco = 0;
  const lascia = (x: number, z: number, d: number) => { const i = prossimoSolco++ % SOLCO; solco.pos.set([x, altezza(x, z) + 0.006, z], i * 3); solco.dim[i] = d; vitaSolco[i] = 1; };

  // --- Passatempo: tieni premuto sulla sabbia e trascina per fare la palla; lasciala e uno scarabeo la porta via
  const palle: Palla[] = [];
  const geoPalla = new THREE.IcosahedronGeometry(1, 1), tintaPalla = new THREE.Color(chiaro ? '#6c4c2e' : '#c49a62');
  const conta = document.createElement('span');
  conta.style.cssText = 'position:absolute;right:16px;bottom:6px;font:11px var(--mono);color:var(--muted);pointer-events:none;opacity:0;transition:opacity .6s';
  el.appendChild(conta);
  const smonta = p.distruggi;
  p.distruggi = () => { conta.remove(); smonta(); };
  let portate = 0, inMano: Palla | null = null;
  const punto = new THREE.Vector3();
  const sulTerreno = (raggio: THREE.Raycaster) => {
    const o = raggio.ray.origin, d = raggio.ray.direction;
    for (let t = 1; t < 40; t += 0.12) {
      punto.copy(o).addScaledVector(d, t);
      if (punto.y <= altezza(punto.x, punto.z)) {
        for (let k = t - 0.12; k <= t; k += 0.012) { punto.copy(o).addScaledVector(d, k); if (punto.y <= altezza(punto.x, punto.z)) return true; }
        return true;
      }
    }
    return false;
  };
  const suSabbia = (x: number, z: number) => !nelLago(x, z, 0.2) && Math.hypot(x, z) < L * 0.72;
  function afferra(raggio: THREE.Raycaster) {
    if (!sulTerreno(raggio) || !suSabbia(punto.x, punto.z) || palle.length >= 8) return false;
    const o = pieno(geoPalla.clone().scale(1, 1, 1), tintaPalla, 0.28, 18, 0.55, 0.65) as THREE.Mesh;
    g.add(o);
    inMano = { o, x: punto.x, z: punto.z, r: 0.035, scarabeo: null, libera: false, affonda: 0, rot: new THREE.Quaternion() };
    palle.push(inMano);
    el.style.cursor = 'grabbing';
    return true;
  }
  const asse = new THREE.Vector3(), giroQ = new THREE.Quaternion();
  const rotola = (q: Palla, dx: number, dz: number) => {
    const d = Math.hypot(dx, dz);
    if (d < 1e-5) return;
    asse.set(dz / d, 0, -dx / d);
    giroQ.setFromAxisAngle(asse, d / q.r);
    q.rot.premultiply(giroQ);
  };
  function trascina(raggio: THREE.Raycaster) {
    if (!inMano || !sulTerreno(raggio) || !suSabbia(punto.x, punto.z)) return;
    const dx = punto.x - inMano.x, dz = punto.z - inMano.z, d = Math.hypot(dx, dz);
    rotola(inMano, dx, dz);
    inMano.x = punto.x; inMano.z = punto.z;
    // Rotolando raccoglie sabbia e cresce
    inMano.r = Math.min(0.17, inMano.r + d * 0.05);
    if (d > 0.01) lascia(punto.x, punto.z, inMano.r * 0.9);
  }
  function rilascia() {
    if (inMano) { inMano.r = Math.max(inMano.r, 0.05); inMano.libera = true; inMano = null; }
    el.style.cursor = '';
  }

  // --- Vento: granelli che si staccano dalle creste e scivolano via
  const GRANELLI = p.telefono ? 90 : 170, granelli = puntiMorbidi(GRANELLI);
  const statoGr = Array.from({ length: GRANELLI }, () => ({ v: 0.15 + r() * 0.3, f: r() * 6 }));
  for (let i = 0; i < GRANELLI; i++) {
    const q = benDistribuiti(1, 2.2, 5.6, r)[0]!;
    granelli.pos.set([q.x, altezza(q.x, q.z) + 0.03 + r() * 0.25, q.z], i * 3);
    granelli.dim[i] = 0.012 + r() * 0.018;
    granelli.col.set(SABBIA.clone().lerp(c.fg, chiaro ? 0.25 : 0.25).toArray(), i * 3);
    granelli.alfa[i] = 0.25 + r() * 0.45;
  }
  g.add(granelli.punti);

  // --- Ciclo
  let ultimoAnello = 0;
  function aggiorna(s: number, dt: number, p: Palco) {
    // Acqua e vento
    riflessi.forEach((q, k) => {
      const a = Math.sin(s * 0.5 + q.f) * 0.35, x = q.x + Math.sin(s * 0.3 + q.f) * 0.04, l = q.l * (0.6 + 0.4 * Math.sin(s * 1.1 + q.f));
      posRiflessi.set([x, 0.018, q.z, x + Math.cos(a) * l, 0.018, q.z + Math.sin(a) * l], k * 6);
    });
    geoRiflessi.attributes.position!.needsUpdate = true;
    anelli.forEach(q => { if (q.t >= 1) return; q.t = Math.min(1, q.t + dt / 1.8); q.l.scale.setScalar(0.02 + q.t * q.largo); q.m.opacity = (1 - q.t) * 0.8; });
    const raggio = p.raggio;
    let sotto: { x: number; z: number } | null = null;
    if (raggio && sulTerreno(raggio)) {
      sotto = { x: punto.x, z: punto.z };
      if (!inMano) el.style.cursor = suSabbia(punto.x, punto.z) ? 'grab' : '';
      if (nelLago(punto.x, punto.z) && s - ultimoAnello > 0.3) { anello(punto.x, punto.z, 0.18); ultimoAnello = s; }
    }
    palme.forEach(q => {
      q.chioma.rotation.z = Math.sin(s * 0.7 + q.fase) * 0.05;
      q.chioma.rotation.x = Math.cos(s * 0.55 + q.fase) * 0.04;
      q.foglie.forEach((f, k) => { f.rotation.z = Math.sin(s * 1.1 + q.fase + k) * 0.07; });
    });
    canne.aggiorna((q, t, fuori) => { const k = t * t * q.alto; fuori.set((Math.sin(s * 1.5 + q.fase + q.x) * 0.2 + 0.12) * k, Math.cos(s * 1.2 + q.fase) * 0.12 * k); }, s);
    for (let i = 0; i < GRANELLI; i++) {
      const k = i * 3, q = statoGr[i]!;
      let x = granelli.pos[k]! + q.v * dt, z = granelli.pos[k + 2]! + Math.sin(s + q.f) * dt * 0.04;
      if (x > 5.6 || nelLago(x, z, 0.4)) { const n = benDistribuiti(1, 2.2, 5.4, r)[0]!; x = n.x; z = n.z; }
      granelli.pos[k] = x; granelli.pos[k + 1] = altezza(x, z) + 0.03 + Math.abs(Math.sin(s * 0.8 + q.f)) * 0.2; granelli.pos[k + 2] = z;
    }
    granelli.aggiorna();

    // Rane
    rane.forEach(f => {
      f.attesa -= dt;
      const allarme = !!sotto && Math.hypot(sotto.x - f.a2.x, sotto.z - f.a2.z) < 0.4;
      if (f.t >= 1 && (f.attesa <= 0 || (allarme && f.attesa < 3.5))) {
        // Sceglie un altro posto vicino; a volte si tuffa e riappare poco più in là
        const vicine = perche.filter(q => q !== f.a2 && !occupata(q) && Math.hypot(q.x - f.a2.x, q.z - f.a2.z) < 1.5);
        if (vicine.length) { f.da = f.a2; f.a2 = vicine[Math.floor(r() * vicine.length)]!; f.t = 0; f.verso = Math.atan2(-(f.a2.z - f.da.z), f.a2.x - f.da.x); f.tuffo = r() < 0.3; }
        f.attesa = 3 + r() * 10;
      }
      let y = f.a2.y, x = f.a2.x, z = f.a2.z, piega = 0;
      if (f.t < 1) {
        const prima = f.t;
        f.t = Math.min(1, f.t + dt / 0.55);
        const t = f.t;
        x = THREE.MathUtils.lerp(f.da.x, f.a2.x, t); z = THREE.MathUtils.lerp(f.da.z, f.a2.z, t);
        y = THREE.MathUtils.lerp(f.da.y, f.a2.y, t) + Math.sin(t * Math.PI) * 0.34;
        piega = (0.5 - t) * 1.1;
        // Tuffo: a metà balzo tocca l'acqua e fa un cerchio
        if (prima < 1 && t >= 1 && nelLago(x, z, 0.1)) anello(x, z, 0.2);
        if (f.tuffo && prima < 0.5 && t >= 0.5 && nelLago(x, z)) anello(x, z, 0.3);
      }
      f.o.position.set(x, y, z);
      f.o.rotation.set(0, f.verso, piega);
      f.gola.scale.setScalar(1 + Math.max(0, Math.sin(s * 3.2 + f.fase)) ** 6 * 0.9);
    });

    // Gazzelle: camminano, si fermano a guardare, vanno a bere; se il puntatore è vicino saltano sul posto e si allontanano
    gazzelle.forEach(q => {
      q.timer -= dt;
      const allarme = sotto ? Math.hypot(sotto.x - q.x, sotto.z - q.z) : 9;
      if (allarme < 0.8 && q.salto <= 0) {
        q.salto = 2; q.stato = 'cammina'; q.timer = 3;
        const a = Math.atan2(q.z - sotto!.z, q.x - sotto!.x); q.mx = q.x + Math.cos(a) * 1.5; q.mz = q.z + Math.sin(a) * 1.5;
      }
      if (q.timer <= 0 && q.salto <= 0) {
        if (q.stato === 'cammina' || q.stato === 'beve') { q.stato = 'guarda'; q.timer = 2 + r() * 5; }
        else {
          q.stato = 'cammina'; q.timer = 18;
          if (r() < 0.45) { const a = Math.atan2(q.z, q.x) + (r() - 0.5) * 0.5, d = rivaDi(a) + 0.2; q.mx = Math.cos(a) * d * 1.25; q.mz = Math.sin(a) * d * 0.95; q.fase = 100 + (q.fase % 7); }
          else { const a = r() * 6.28, d = 2.3 + r() * 2.2; q.mx = Math.cos(a) * d; q.mz = Math.sin(a) * d; q.fase = q.fase % 7; }
        }
      }
      const dx = q.mx - q.x, dz = q.mz - q.z, d = Math.hypot(dx, dz);
      if (q.stato === 'cammina' && d < 0.12) { if (q.fase >= 100) { q.stato = 'beve'; q.timer = 5 + r() * 6; } else { q.stato = 'guarda'; q.timer = 2 + r() * 5; } }
      const voluta = q.stato === 'cammina' ? (q.salto > 0 ? 0.9 : 0.24) : 0;
      q.vel = morbido(q.vel, voluta, dt * 2.2);
      let hx = dx / (d || 1), hz = dz / (d || 1);
      for (const o of ostacoli) { const ox = q.x - o.x, oz = q.z - o.z, od = Math.hypot(ox, oz); if (od < o.r + 0.3 && od > 1e-3) { hx += (ox / od) * 1.2; hz += (oz / od) * 1.2; } }
      const diff = angolo(Math.atan2(-hz, hx) - q.verso);
      q.giro = morbido(q.giro, q.vel > 0.02 || q.stato === 'beve' ? THREE.MathUtils.clamp(diff * 2, -2, 2) : 0, dt * 3);
      q.verso += q.giro * dt;
      const nx = q.x + Math.cos(q.verso) * q.vel * dt, nz = q.z - Math.sin(q.verso) * q.vel * dt;
      if (nelLago(nx, nz, 0.06) || Math.hypot(nx, nz) > 5.2) { q.verso += dt * 2.5; q.vel *= 0.6; } else { q.x = nx; q.z = nz; }
      q.passo += (q.vel * dt) / (0.18 * q.scala);
      const amp = THREE.MathUtils.clamp(q.vel / 0.2, 0, 1.3), g2 = Math.PI * 2 * q.passo;
      // Salti a zampe rigide (stotting): la gazzella rimbalza
      q.salto = Math.max(0, q.salto - dt);
      if (q.salto > 0 && q.ySalto <= 0 && q.vy <= 0) q.vy = 1.5;
      q.vy -= dt * 6;
      q.ySalto = Math.max(0, q.ySalto + q.vy * dt);
      if (q.ySalto <= 0 && q.vy < 0) q.vy = 0;
      q.o.position.set(q.x, altezza(q.x, q.z) + q.ySalto, q.z);
      q.o.rotation.y = q.verso;
      q.corpo.position.y = 0.28 + Math.sin(g2 * 2) * 0.006 * amp;
      q.corpo.rotation.z = q.ySalto > 0 ? q.vy * 0.08 : Math.sin(g2) * 0.02 * amp;
      q.zampe.forEach(z2 => {
        const fase = Math.PI * 2 * (q.passo + z2.fase), rigida = q.ySalto > 0 ? 0 : 1;
        z2.anca.rotation.z = Math.sin(fase) * 0.42 * amp * rigida;
        z2.ginocchio.rotation.z = -(Math.max(0, Math.cos(fase)) ** 1.5) * 0.7 * amp * rigida;
      });
      // Bere: il collo si abbassa fino all'acqua, con piccoli scatti; guardando, gira la testa
      q.abbassa = morbido(q.abbassa, q.stato === 'beve' ? 1 : 0, dt * 1.6);
      q.collo.rotation.z = -q.abbassa * 2 + (q.stato === 'beve' ? Math.sin(s * 3) * 0.04 : 0);
      q.testa.rotation.z = q.abbassa * 1.2;
      q.testa.rotation.y = q.stato === 'guarda' ? Math.sin(s * 0.7 + q.fase) * 0.7 : 0;
      q.coda.rotation.x = Math.sin(s * 6 + q.fase) * 0.5 * (Math.sin(s * 0.4 + q.fase) > 0.3 ? 1 : 0);
    });

    // Palle: quella in mano cresce un poco col tempo; le altre aspettano lo scarabeo più vicino
    if (inMano) inMano.r = Math.min(0.17, inMano.r + dt * 0.02);
    palle.forEach(q => {
      if (q.libera && !q.scarabeo) {
        let meglio: Scarabeo | null = null, dm = 99;
        for (const b of scarabei) { if (b.stato !== 'vaga') continue; const d = Math.hypot(b.x - q.x, b.z - q.z); if (d < dm) { dm = d; meglio = b; } }
        if (meglio) { meglio.stato = 'va'; meglio.palla = q; q.scarabeo = meglio; }
      }
      q.o.scale.setScalar(q.r);
      q.o.quaternion.copy(q.rot);
      q.o.position.set(q.x, altezza(q.x, q.z) + q.r * 0.92 - q.affonda, q.z);
    });

    // Scarabei
    orologioSolco += dt;
    const segna = orologioSolco > 0.12;
    if (segna) orologioSolco = 0;
    scarabei.forEach(b => {
      let vel = 0;
      if (b.stato === 'vaga') {
        vel = 0.1;
        b.verso += (Math.sin(s * 0.9 + b.fase) * 0.9 + (r() - 0.5) * 1.5) * dt;
        if (nelLago(b.x + Math.cos(b.verso) * 0.15, b.z - Math.sin(b.verso) * 0.15, 0.25) || Math.hypot(b.x, b.z) > L * 0.68 || !libero(b.x, b.z, 0.03)) { const a = Math.atan2(-(tane[0]!.z - b.z), tane[0]!.x - b.x); b.verso += angolo(a - b.verso) * dt * 3 + dt; }
      } else if (b.stato === 'va' && b.palla) {
        // Va dalla parte opposta rispetto alla tana, per spingere la palla verso casa
        const q = b.palla, t = b.tana, dx = t.x - q.x, dz = t.z - q.z, d = Math.hypot(dx, dz) || 1;
        const px = q.x - (dx / d) * (q.r + 0.06), pz = q.z - (dz / d) * (q.r + 0.06), ax = px - b.x, az = pz - b.z, da = Math.hypot(ax, az);
        vel = 0.42;
        b.verso += angolo(Math.atan2(-az, ax) - b.verso) * Math.min(1, dt * 6);
        if (da < 0.05) { b.stato = 'spinge'; }
      } else if (b.stato === 'spinge' && b.palla) {
        // Spinge camminando all'indietro: testa in giù, zampe posteriori sulla palla
        const q = b.palla, t = b.tana, dx = t.x - q.x, dz = t.z - q.z, d = Math.hypot(dx, dz) || 1;
        let ux = dx / d, uz = dz / d;
        // Se davanti c'è l'acqua o un ostacolo, gira intorno
        if (nelLago(q.x + ux * 0.25, q.z + uz * 0.25, 0.1)) { const ox = q.x, oz = q.z, l = Math.hypot(ox, oz) || 1; ux = ux * 0.2 + (-oz / l) * 0.8 * Math.sign(ox * uz - oz * ux || 1); uz = uz * 0.2 + (ox / l) * 0.8 * Math.sign(ox * uz - oz * ux || 1); }
        for (const o of ostacoli) { const ox = q.x - o.x, oz = q.z - o.z, od = Math.hypot(ox, oz); if (od < o.r + q.r + 0.1 && od > 1e-3) { ux += (ox / od) * 0.9; uz += (oz / od) * 0.9; } }
        const ul = Math.hypot(ux, uz) || 1, sp = (0.2 - q.r * 0.55) * (0.65 + 0.35 * Math.abs(Math.sin(s * 3 + b.fase))) * dt;
        const mx = (ux / ul) * sp, mz = (uz / ul) * sp;
        rotola(q, mx, mz);
        q.x += mx; q.z += mz;
        if (segna) lascia(q.x - (ux / ul) * q.r, q.z - (uz / ul) * q.r, q.r * 0.7);
        b.x = q.x - (ux / ul) * (q.r + 0.05); b.z = q.z - (uz / ul) * (q.r + 0.05);
        b.verso = morbido(b.verso, b.verso + angolo(Math.atan2(uz / ul, -ux / ul) - b.verso), dt * 5);
        b.passo += sp * 9;
        // Arrivati alla tana: la palla sprofonda, lo scarabeo scende con lei
        if (d < 0.1) { b.stato = 'tana'; b.timer = 4 + r() * 3; }
      } else if (b.stato === 'tana') {
        b.timer -= dt;
        if (b.palla) {
          const q = b.palla;
          q.affonda += dt * q.r * 1.2;
          q.x = morbido(q.x, b.tana.x, dt * 3); q.z = morbido(q.z, b.tana.z, dt * 3);
          if (q.affonda > q.r * 2.1) {
            g.remove(q.o); q.o.geometry.dispose();
            palle.splice(palle.indexOf(q), 1);
            b.palla = null;
            portate++;
            conta.textContent = `${portate}`;
            conta.style.opacity = '1';
          }
        }
        b.o.visible = false;
        if (b.timer <= 0 && !b.palla) { b.stato = 'vaga'; b.x = b.tana.x; b.z = b.tana.z; b.verso = r() * 6; b.o.visible = true; }
      }
      if (b.stato === 'vaga' || b.stato === 'va') {
        b.x += Math.cos(b.verso) * vel * dt; b.z -= Math.sin(b.verso) * vel * dt;
        b.passo += vel * dt * 6;
      }
      const spinge = b.stato === 'spinge';
      b.o.position.set(b.x, altezza(b.x, b.z) + (spinge ? 0.02 : 0.004), b.z);
      b.o.rotation.set(0, b.verso, spinge ? -0.75 : 0);
      b.zampe.rotation.x = Math.sin(b.passo * 22) * 0.2;
    });
    // Solco che sbiadisce
    for (let i = 0; i < SOLCO; i++) if (vitaSolco[i]) { vitaSolco[i] = Math.max(0, vitaSolco[i]! - dt / 26); solco.alfa[i] = vitaSolco[i]! * 0.5; }
    solco.aggiorna();
  }
  return p;
}
