import * as THREE from 'three';
import { casuale, mat, pezzo, sasso, linea, terreno, nastri, puntiMorbidi, palco, SITO, type Nastro, type Palco } from './natura';

// Una campagna tranquilla sotto un cielo lento, nello stile del bosco. Su una collina un mulino a vento gira piano;
// accanto un laghetto, qualche albero, tre pecore che pascolano. In cielo nuvole fatte di puntini morbidi che si
// gonfiano e cambiano forma; il puntatore le sfilaccia e poi si richiudono. Mongolfiere salgono e scendono col
// vento, ogni tanto passa uno stormo e da una nuvola scende un po' di pioggia sul prato.

export function monta(el: HTMLElement) {
  const r = casuale(23);
  const p = palco(el, { camera: new THREE.Vector3(0, 2.4, 9.6), mira: new THREE.Vector3(0, 2.1, 0), giro: 0.012, inclina: [-0.1, 0.25], nebbia: [0.9, 2], aggiorna, clic, scena: 'nuvole', toni: SITO });
  const g = p.gruppo, c = p.colori;

  // --- Prato: colline dolci, una più alta per il mulino
  const COLLE = new THREE.Vector2(-0.9, -0.6);
  const altezza = (x: number, z: number) => {
    const bordo = Math.max(0, Math.min(1, (5.2 - Math.hypot(x, z)) / 1.5));
    return bordo * (0.12 + 0.12 * Math.sin(x * 0.7 + 1) * Math.cos(z * 0.6) + 0.55 * Math.exp(-((x - COLLE.x) ** 2 + (z - COLLE.y) ** 2) / 1.6));
  };
  terreno(g, c.verde, 5.4, altezza);

  // --- Mulino: torre di pietra a otto lati, tetto a cono, quattro pale a graticcio che girano piano
  const mulino = new THREE.Group();
  mulino.add(pezzo(new THREE.CylinderGeometry(0.34, 0.5, 1.7, 8), mat('#d8cfba'), 0, 0.85, 0));
  mulino.add(pezzo(new THREE.ConeGeometry(0.46, 0.55, 8), mat('#e08a3a'), 0, 1.97, 0));
  mulino.add(pezzo(new THREE.BoxGeometry(0.2, 0.34, 0.04), mat('#7a5230'), 0, 0.17, 0.47));
  ([[0.9, 0.39], [1.3, 0.37]] as const).forEach(([y, z]) => mulino.add(pezzo(new THREE.BoxGeometry(0.11, 0.15, 0.03), mat('#f2b62f', { opacity: 0.6 }), 0, y, z)));
  const mozzo = new THREE.Group();
  mozzo.position.set(0, 1.7, 0.5);
  mozzo.add(pezzo(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8).rotateX(Math.PI / 2), mat('#7a5230')));
  for (let k = 0; k < 4; k++) {
    const pala = new THREE.Group();
    pala.rotation.z = (k / 4) * Math.PI * 2;
    pala.add(pezzo(new THREE.BoxGeometry(0.035, 1.25, 0.03), mat('#7a5230'), 0, 0.68, 0.04));
    // Tela: un telaio con le traverse, come le pale vere
    pala.add(pezzo(new THREE.BoxGeometry(0.26, 0.95, 0.01), mat('#fbf8ef', { opacity: 0.25 }), 0.15, 0.78, 0.05));
    const graticcio: THREE.Vector3[] = [];
    for (let q = 0; q <= 6; q++) { const y = 0.3 + q * 0.158; graticcio.push(new THREE.Vector3(0.02, y, 0.06), new THREE.Vector3(0.28, y, 0.06)); }
    pala.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(graticcio), linea('#7a5230', 0.8)));
    mozzo.add(pala);
  }
  mulino.add(mozzo);
  mulino.position.set(COLLE.x, altezza(COLLE.x, COLLE.y) - 0.05, COLLE.y);
  mulino.rotation.y = 0.35;
  g.add(mulino);
  // Sentiero di sassolini che scende dal mulino al laghetto
  const LAGO = new THREE.Vector2(1.6, 0.9);
  for (let k = 0; k < 22; k++) {
    const t = k / 21, x = THREE.MathUtils.lerp(COLLE.x + 0.3, LAGO.x - 0.6, t) + Math.sin(t * 5) * 0.25, z = THREE.MathUtils.lerp(COLLE.y + 0.6, LAGO.y, t) + Math.cos(t * 4) * 0.15;
    const s = pezzo(sasso(0.05 + r() * 0.03, r), mat('#bdb5a4'), x, altezza(x, z) + 0.01, z);
    s.scale.y = 0.4;
    g.add(s);
  }

  // --- Laghetto: un disco azzurro con cerchi che si allargano
  const lago = new THREE.Mesh(new THREE.CircleGeometry(0.85, 40).rotateX(-Math.PI / 2), mat('#5fb6d9', { opacity: 0.22, fili: 0 }));
  lago.position.set(LAGO.x, altezza(LAGO.x, LAGO.y) + 0.02, LAGO.y);
  lago.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 48 }, (_, k) => new THREE.Vector3(Math.cos(k / 48 * Math.PI * 2) * 0.85, 0, Math.sin(k / 48 * Math.PI * 2) * 0.85))), linea('#5fb6d9', 0.8)));
  g.add(lago);
  const cerchioGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 32 }, (_, k) => new THREE.Vector3(Math.cos(k / 32 * Math.PI * 2), 0, Math.sin(k / 32 * Math.PI * 2))));
  const cerchi = Array.from({ length: 10 }, () => {
    const l = new THREE.LineLoop(cerchioGeo, linea('#5fb6d9', 0));
    l.position.y = lago.position.y + 0.005;
    g.add(l);
    return { l, t: 1 };
  });
  let prossimoCerchio = 0;
  const cerchio = (x: number, z: number) => {
    const q = cerchi[prossimoCerchio++ % cerchi.length]!;
    q.l.position.x = x; q.l.position.z = z; q.t = 0;
  };

  // --- Alberi: chiome tonde e abeti, sparsi sul bordo del prato
  const alberi: THREE.Group[] = [];
  const albero = (x: number, z: number, abete: boolean, h: number) => {
    const o = new THREE.Group();
    o.add(pezzo(new THREE.CylinderGeometry(0.04, 0.06, h * 0.45, 5), mat('#7a5230'), 0, h * 0.22, 0));
    if (abete) for (let k = 0; k < 3; k++) o.add(pezzo(new THREE.ConeGeometry(0.34 - k * 0.08, 0.45, 7), mat(k % 2 ? '#5f9c45' : '#4f8a3c'), 0, h * 0.4 + k * 0.25, 0));
    else o.add(pezzo(sasso(0.36 * h, r, 1), mat('#6fa646'), 0, h * 0.75, 0));
    o.position.set(x, altezza(x, z), z);
    g.add(o);
    alberi.push(o);
  };
  ([[-2.6, -1.5, 1, 1.4], [-3.1, -0.4, 0, 1], [2.8, -1.8, 1, 1.2], [3.4, -0.6, 1, 1], [-2.2, 1.6, 0, 0.9], [0.4, -2.6, 0, 1.1], [2.9, 1.9, 0, 0.8], [-0.2, -3.2, 1, 1.3]] as const)
    .forEach(([x, z, abete, h]) => albero(x, z, abete === 1, h));
  // Steccato basso davanti al mulino
  const steccato: THREE.Vector3[] = [];
  for (let k = 0; k < 9; k++) {
    const x = -2.1 + k * 0.28, z = 0.7 + Math.sin(k * 0.6) * 0.1, y = altezza(x, z);
    steccato.push(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + 0.2, z));
    if (k < 8) { const x2 = x + 0.28, z2 = 0.7 + Math.sin((k + 1) * 0.6) * 0.1, y2 = altezza(x2, z2); for (const h of [0.08, 0.16]) steccato.push(new THREE.Vector3(x, y + h, z), new THREE.Vector3(x2, y2 + h, z2)); }
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(steccato), linea('#a07a50', 0.8)));

  // --- Erba alta a ciuffi che ondeggia col vento
  const fili: Nastro[] = [];
  const erbe = ['#6fa646', '#88b94f', '#5c9140'].map(x => new THREE.Color(x));
  for (let k = 0; k < (p.telefono ? 35 : 60); k++) {
    const a = r() * Math.PI * 2, d = 1 + Math.sqrt(r()) * 3.8, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.hypot(x - LAGO.x, z - LAGO.y) < 1) continue;
    for (let q = 0; q < 5; q++) {
      const fx = x + (r() - 0.5) * 0.15, fz = z + (r() - 0.5) * 0.15;
      fili.push({ x: fx, z: fz, y: altezza(fx, fz), alto: 0.1 + r() * 0.16, largo: 0.025, angolo: r() * 6, fase: r() * 6, colore: erbe[q % 3]! });
    }
  }
  const erba = nastri(fili, 4);
  g.add(erba.mesh);

  // --- Pecore: corpo di lana a sbuffi, testa scura; brucano, alzano la testa, fanno due passi
  const pecore = [0, 1, 2].map(k => {
    const o = new THREE.Group(), lana = mat(p.chiaro ? '#fbf9f4' : c.fg, { grezzo: true, opacity: p.chiaro ? 0.8 : 0.35 });
    for (let q = 0; q < 5; q++) o.add(pezzo(new THREE.IcosahedronGeometry(0.1, 0), lana, (q - 2) * 0.05, 0.2 + (q % 2) * 0.03, (q % 2 ? 1 : -1) * 0.03));
    const testa = pezzo(new THREE.IcosahedronGeometry(0.055, 0), mat('#5a5048', { opacity: 0.6 }), 0.16, 0.2, 0);
    o.add(testa);
    const zampe: THREE.Vector3[] = [];
    for (const [x, z] of [[-0.08, -0.05], [-0.08, 0.05], [0.08, -0.05], [0.08, 0.05]]) zampe.push(new THREE.Vector3(x!, 0, z!), new THREE.Vector3(x!, 0.13, z!));
    o.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(zampe), linea('#5a5048', 0.9)));
    g.add(o);
    return { o, testa, x: 0.6 + k * 0.7, z: -1.3 + k * 0.5, a: r() * 6, fase: k * 4.3 };
  });

  // --- Nuvole: tanti puntini morbidi in sbuffi; ogni puntino ricorda il suo posto e ci torna dopo la spinta
  type Nuvola = { x: number; y: number; z: number; vel: number; da: number; n: number; largo: number };
  const nuvole: Nuvola[] = [];
  const PER = p.telefono ? 130 : 220, QUANTE = 8, N = PER * QUANTE;
  const cielo = puntiMorbidi(N);
  const base = new Float32Array(N * 3), spinta = new Float32Array(N * 3), fase = new Float32Array(N);
  const tinta = p.chiaro ? new THREE.Color('#fbf9f4') : c.fg.clone();
  const ombra = p.chiaro ? new THREE.Color('#fbf9f4').lerp(c.muted, 0.22) : c.fg.clone().lerp(c.muted, 0.6);
  for (let k = 0; k < QUANTE; k++) {
    const largo = 0.9 + r() * 1.1;
    const nv: Nuvola = { x: -7 + k * 1.9 + r() * 0.8, y: 3.5 + r() * 1.5, z: -3.5 + r() * 3.5, vel: 0.08 + r() * 0.06, da: k * PER, n: PER, largo };
    nuvole.push(nv);
    // Sbuffi lungo la nuvola: il più grande al centro, i piccoli ai lati; la pancia è piatta
    const sbuffi = Array.from({ length: 5 }, (_, q) => ({ x: (q - 2) / 2 * largo, y: 0.15 * (2 - Math.abs(q - 2)) / 2, raggio: (0.55 - Math.abs(q - 2) * 0.13) * (0.7 + largo * 0.35) }));
    for (let i = 0; i < PER; i++) {
      const s = sbuffi[Math.floor(r() * 5)]!, u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), d = Math.cbrt(r()) * s.raggio;
      const x = s.x + Math.sin(v) * Math.cos(u) * d, y = Math.max(-0.18, s.y + Math.cos(v) * d * 0.75), z = Math.sin(v) * Math.sin(u) * d * 0.8;
      const j = nv.da + i;
      base.set([x, y, z], j * 3);
      fase[j] = r() * 6;
      // Sotto più grigie, sopra più chiare
      const luce = THREE.MathUtils.clamp((y + 0.2) / 0.7, 0, 1);
      cielo.col.set(ombra.clone().lerp(tinta, luce).toArray(), j * 3);
      cielo.dim[j] = 0.16 + r() * 0.22;
      cielo.alfa[j] = (p.chiaro ? 0.8 : 0.26) * (0.6 + r() * 0.4);
    }
  }
  g.add(cielo.punti);

  // --- Pioggia leggera: a turno da una nuvola, righe azzurre che cadono e fanno cerchi sul lago
  const GOCCE = 70, gocce: { x: number; y: number; z: number; v: number }[] = [];
  const geoPioggia = new THREE.BufferGeometry();
  const posPioggia = new Float32Array(GOCCE * 6);
  geoPioggia.setAttribute('position', new THREE.BufferAttribute(posPioggia, 3));
  const matPioggia = linea('#5fb6d9', 0);
  const pioggia = new THREE.LineSegments(geoPioggia, matPioggia);
  pioggia.frustumCulled = false;
  g.add(pioggia);
  for (let k = 0; k < GOCCE; k++) gocce.push({ x: 0, y: -1, z: 0, v: 2 + r() });

  // --- Mongolfiere: pallone a spicchi (i meridiani del tornio), cesta e funi; salgono e scendono piano
  const profilo = Array.from({ length: 12 }, (_, k) => {
    const t = k / 11, a = t * Math.PI;
    return new THREE.Vector2(Math.max(0.06, Math.sin(a * 0.92 + 0.12) * (0.3 + 0.12 * Math.sin(a * 0.5))) * (t < 0.3 ? 0.5 + t * 1.6 : 1), -0.38 + t * 0.78 + (t > 0.85 ? -(t - 0.85) * 0.4 : 0));
  });
  const geoPallone = new THREE.LatheGeometry(profilo, 12);
  const mongolfiere = (['#e08a3a', '#5fb6d9', '#6fa646', '#f2b62f'] as const).map((colore, k) => {
    const o = new THREE.Group();
    o.add(pezzo(geoPallone, mat(colore, { opacity: 0.28 })));
    o.add(pezzo(new THREE.BoxGeometry(0.1, 0.08, 0.1), mat('#a07a50', { opacity: 0.5 }), 0, -0.62, 0));
    const funi: THREE.Vector3[] = [];
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) funi.push(new THREE.Vector3(x! * 0.05, -0.58, z! * 0.05), new THREE.Vector3(x! * 0.09, -0.4, z! * 0.09));
    o.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(funi), linea('#a07a50', 0.7)));
    // Fiammella del bruciatore: si accende quando il pallone sale
    const fiamma = pezzo(new THREE.ConeGeometry(0.025, 0.07, 5), mat('#f2b62f', { opacity: 0 }), 0, -0.49, 0);
    o.add(fiamma);
    o.scale.setScalar([1, 0.8, 0.65, 0.9][k]!);
    g.add(o);
    return { o, fiamma, cx: [-2.2, 2.4, 0.6, -3.6][k]!, cz: [-1.2, -2.2, -3.4, -3][k]!, y: [2.6, 3.4, 4.1, 2.1][k]!, fase: k * 1.7 };
  });

  // --- Stormo: piccole V arancioni che passano ogni tanto, battendo le ali
  const geoV = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.06, 0.025, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.06, 0.025, 0)]);
  const matV = linea('#e08a3a', 0.9);
  const uccelli = Array.from({ length: 11 }, (_, k) => {
    const v = new THREE.Line(geoV, matV);
    g.add(v);
    const fila = Math.ceil(k / 2), lato = k % 2 ? 1 : -1;
    return { v, dx: -fila * 0.16, dy: fila * 0.02 * (k ? 1 : 0), dz: lato * fila * 0.14, fase: r() * 6 };
  });

  // Clic: una mongolfiera vicina sale un po' più in alto, col bruciatore acceso
  let spinge = -1, finoA = 0;
  function clic(raggio: THREE.Raycaster) {
    let meglio = -1, dm = 1.2;
    mongolfiere.forEach((m, k) => { const d = raggio.ray.distanceToPoint(m.o.position); if (d < dm) { dm = d; meglio = k; } });
    if (meglio >= 0) { spinge = meglio; finoA = performance.now() + 4000; }
  }

  // --- Ciclo
  const tmp = new THREE.Vector3(), via = new THREE.Vector3();
  const quota = mongolfiere.map(m => m.y);
  function aggiorna(s: number, dt: number, p: Palco) {
    const vento = 0.5 + 0.5 * Math.sin(s * 0.21);
    // Mulino: pale lente, un po' più svelte quando c'è più vento
    mozzo.rotation.z -= dt * (0.25 + vento * 0.2);
    erba.aggiorna((q, t, fuori) => {
      const k = t * t * q.alto;
      fuori.set((Math.sin(s * 1.4 + q.fase + q.x * 0.8) * 0.2 + vento * 0.4) * k, Math.cos(s * 1.1 + q.fase) * 0.12 * k);
    }, s);
    alberi.forEach((a, k) => { a.rotation.z = Math.sin(s * 0.8 + k) * 0.015 * (1 + vento); });

    // Nuvole: vanno col vento da sinistra a destra e rientrano dall'altra parte; i puntini respirano;
    // vicino al puntatore si spostano, poi tornano piano al loro posto
    const raggio = p.raggio;
    nuvole.forEach(nv => {
      nv.x += nv.vel * (0.6 + vento * 0.8) * dt;
      if (nv.x > 8) nv.x -= 16;
      for (let i = 0; i < nv.n; i++) {
        const j = nv.da + i, k = j * 3, f = fase[j]!;
        const bx = base[k]! * (1 + Math.sin(s * 0.15 + nv.da) * 0.06), by = base[k + 1]!, bz = base[k + 2]!;
        let x = nv.x + bx + Math.sin(s * 0.3 + f) * 0.04, y = nv.y + by + Math.sin(s * 0.25 + f * 1.3) * 0.04, z = nv.z + bz + Math.cos(s * 0.2 + f) * 0.04;
        if (raggio) {
          tmp.set(x + spinta[k]!, y + spinta[k + 1]!, z + spinta[k + 2]!);
          const d2 = raggio.ray.distanceSqToPoint(tmp);
          if (d2 < 0.36) {
            raggio.ray.closestPointToPoint(tmp, via);
            via.subVectors(tmp, via).normalize().multiplyScalar((1 - Math.sqrt(d2) / 0.6) * dt * 2.5);
            spinta[k] = spinta[k]! + via.x; spinta[k + 1] = spinta[k + 1]! + via.y; spinta[k + 2] = spinta[k + 2]! + via.z;
          }
        }
        const torna = 1 - dt * 0.35;
        spinta[k] = spinta[k]! * torna; spinta[k + 1] = spinta[k + 1]! * torna; spinta[k + 2] = spinta[k + 2]! * torna;
        x += spinta[k]!; y += spinta[k + 1]!; z += spinta[k + 2]!;
        cielo.pos[k] = x; cielo.pos[k + 1] = y; cielo.pos[k + 2] = z;
      }
    });
    cielo.aggiorna();

    // Pioggia: a turno, per 8 secondi ogni 24, dalla nuvola più vicina al centro
    const piove = (s % 24) < 8 && s > 6;
    matPioggia.opacity += ((piove ? 0.55 : 0) - matPioggia.opacity) * Math.min(1, dt * 1.5);
    let chi = nuvole[0]!;
    for (const nv of nuvole) if (Math.abs(nv.x - 0.8) < Math.abs(chi.x - 0.8)) chi = nv;
    gocce.forEach((q, k) => {
      q.y -= q.v * dt;
      const suolo = altezza(q.x, q.z);
      if (q.y < suolo) {
        if (piove && Math.hypot(q.x - LAGO.x, q.z - LAGO.y) < 0.8 && r() < 0.5) cerchio(q.x, q.z);
        q.x = chi.x + (r() - 0.5) * chi.largo * 1.6; q.z = chi.z + (r() - 0.5) * 0.8; q.y = chi.y - 0.1 - r() * 0.3;
      }
      posPioggia.set([q.x, q.y, q.z, q.x - 0.02, q.y - 0.12, q.z], k * 6);
    });
    geoPioggia.attributes.position!.needsUpdate = true;
    // Cerchi sul lago: si allargano e sbiadiscono; ogni tanto ne nasce uno anche senza pioggia (un pesce)
    if (r() < dt * 0.3) cerchio(LAGO.x + (r() - 0.5) * 1.1, LAGO.y + (r() - 0.5) * 1.1);
    cerchi.forEach(q => {
      if (q.t >= 1) return;
      q.t = Math.min(1, q.t + dt / 2.5);
      q.l.scale.setScalar(0.03 + q.t * 0.3);
      (q.l.material as THREE.LineBasicMaterial).opacity = (1 - q.t) * 0.8;
    });

    // Mongolfiere: un lento giro largo, su e giù; quando salgono la fiammella si accende
    mongolfiere.forEach((m, k) => {
      const su = Math.sin(s * 0.12 + m.fase);
      const voluta = m.y + su * 0.5 + (spinge === k && performance.now() < finoA ? 1.2 : 0);
      const prima = quota[k]!;
      quota[k] = prima + (voluta - prima) * Math.min(1, dt * 0.4);
      const sale = quota[k]! - prima > 0.0005 * (dt / 0.016);
      const a = s * 0.03 + m.fase;
      m.o.position.set(m.cx + Math.sin(a) * 1.2 + vento * 0.3, quota[k]!, m.cz + Math.cos(a * 0.8) * 0.6);
      m.o.rotation.z = Math.sin(s * 0.5 + m.fase) * 0.03;
      m.o.rotation.y += dt * 0.05;
      const fm = m.fiamma.material as THREE.MeshBasicMaterial;
      fm.opacity += ((sale ? 0.9 : 0) - fm.opacity) * Math.min(1, dt * 4);
      m.fiamma.scale.y = 1 + Math.sin(s * 30) * 0.2;
    });

    // Stormo: attraversa il cielo ogni 40 secondi, a quote diverse
    const giro = s / 40, t = giro % 1, volta = Math.floor(giro);
    const sx = -9 + t * 18, sy = 2.8 + ((volta * 0.37) % 1) * 1.6, sz = -1.5 + ((volta * 0.61) % 1) * 2;
    uccelli.forEach(b => {
      b.v.position.set(sx + b.dx, sy + b.dy + Math.sin(s * 0.6) * 0.1, sz + b.dz);
      b.v.scale.y = Math.sin(s * 7 + b.fase) * 1.3;
      b.v.visible = t < 0.95;
    });

    // Pecore: brucano a testa bassa, poi la alzano e fanno qualche passo
    pecore.forEach(q => {
      const ciclo = (s + q.fase) % 13;
      const cammina = ciclo > 9 && ciclo < 11.5;
      if (cammina) {
        q.a += Math.sin(s * 0.7 + q.fase) * dt * 0.8;
        q.x += Math.cos(q.a) * dt * 0.12; q.z += Math.sin(q.a) * dt * 0.12;
        if (Math.hypot(q.x, q.z) > 2.6 || Math.hypot(q.x - LAGO.x, q.z - LAGO.y) < 1.1 || Math.hypot(q.x - COLLE.x, q.z - COLLE.y) < 0.8) q.a += Math.PI * dt * 2;
      }
      q.o.position.set(q.x, altezza(q.x, q.z) + (cammina ? Math.abs(Math.sin(s * 9)) * 0.01 : 0), q.z);
      q.o.rotation.y = -q.a;
      const bruca = ciclo < 9;
      q.testa.position.y += ((bruca ? 0.08 + Math.abs(Math.sin(s * 3 + q.fase)) * 0.02 : 0.22) - q.testa.position.y) * Math.min(1, dt * 3);
    });
  }
  return p;
}
