import * as THREE from 'three';
import { casuale, mat, pezzo, scuoti, sasso, unisci, linea, tono, terreno, nastri, puntiMorbidi, palco, SITO, type Nastro, type Palco } from './natura';

// Un prato aperto, nello stile del bosco, con tre formicai di tre colonie diverse. Le formiche escono, esplorano,
// girano intorno a sassi, funghi e pozzanghera, trovano il cibo (bacche, semi, pezzi di foglia, briciole) e lo
// riportano a casa lasciando una scia che le compagne seguono. Quando due si incontrano si fermano a toccarsi
// con le antenne. Intorno: erba che ondeggia, margherite, due farfalle, una lumaca e il polline nella luce.
// Un clic sul prato lascia un mucchietto di zucchero.

const R = 3.2, G = 72, CELLA = (R * 2) / G;
type Tipo = 0 | 1 | 2 | 3 | 4;
const COLORI_CIBO = ['#d8314a', '#e6c26a', '#79b84a', '#f3e6c8', '#ffffff'];

export function monta(el: HTMLElement) {
  const r = casuale(5);
  const p = palco(el, { camera: new THREE.Vector3(0, 3.3, 6.6), mira: new THREE.Vector3(0, 0.15, 0), giro: 0.02, inclina: [-0.2, 0.3], aggiorna, clic, scena: 'formicaio', toni: SITO });
  const g = p.gruppo;
  // --- Terreno: collinette dolci, dischi verdi e griglia di punti come il bosco
  const CASE = [new THREE.Vector2(-1.35, -0.85), new THREE.Vector2(1.45, -0.55), new THREE.Vector2(0.05, 1.45)];
  const altezza = (x: number, z: number) => {
    const d = Math.hypot(x, z), bordo = Math.max(0, Math.min(1, (R - d) / 0.4));
    return bordo * (0.1 + 0.1 * Math.sin(x * 0.9 + 1) * Math.cos(z * 1.1) + 0.05 * Math.sin(x * 2.1 - z * 1.7));
  };
  terreno(g, p.colori.verde, 4.4, altezza);

  // --- Ostacoli: chi cammina li aggira (cerchi sul piano)
  const ostacoli: { x: number; z: number; r: number }[] = [];
  const posa = <T extends THREE.Object3D>(o: T, x: number, z: number, raggio = 0) => {
    o.position.set(x, altezza(x, z), z);
    g.add(o);
    if (raggio) ostacoli.push({ x, z, r: raggio });
    return o;
  };
  // Sassi grandi
  const grigi = [mat('#a7a39a'), mat('#8f8b84'), mat('#bdb5a4')];
  ([[0.6, -1.6, 0.32], [-2.2, 0.6, 0.38], [2.3, 0.9, 0.26], [-0.7, 0.35, 0.2], [1.0, 2.3, 0.22]] as const).forEach(([x, z, rr], k) => {
    const s = posa(pezzo(sasso(rr, r, 1), grigi[k % 3]!), x, z, rr * 1.05);
    s.scale.y = 0.65;
    s.rotation.y = r() * 6;
  });
  // Funghi: gambo chiaro, cappello rosso a puntini o marrone
  const fungo = (alto: number, raggio: number, cappello: string, puntini: boolean) => {
    const o = new THREE.Group();
    o.add(pezzo(new THREE.CylinderGeometry(raggio * 0.28, raggio * 0.36, alto, 7), mat('#efe6d2'), 0, alto / 2, 0));
    o.add(pezzo(new THREE.SphereGeometry(raggio, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1), mat(cappello), 0, alto * 0.95, 0));
    if (puntini) for (let k = 0; k < 7; k++) {
      const a = r() * 6, h = 0.3 + r() * 0.5;
      o.add(pezzo(new THREE.IcosahedronGeometry(raggio * 0.12, 0), mat('#fff8ec'), Math.cos(a) * raggio * Math.sqrt(1 - h * h) * 0.95, alto * 0.95 + h * raggio * 0.7, Math.sin(a) * raggio * Math.sqrt(1 - h * h) * 0.95));
    }
    return o;
  };
  posa(fungo(0.42, 0.24, '#d9443a', true), -1.95, -1.6, 0.12);
  posa(fungo(0.26, 0.15, '#d9443a', true), -1.7, -1.85, 0.08).rotation.z = 0.12;
  posa(fungo(0.3, 0.16, '#9a6a3f', false), 2.05, -1.55, 0.08);
  posa(fungo(0.2, 0.11, '#9a6a3f', false), 2.25, -1.4, 0.06);
  // Rametto caduto con due rami corti
  const legno = mat('#7a5230');
  const ramo = new THREE.Group();
  ramo.add(pezzo(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 6).rotateZ(Math.PI / 2), legno, 0, 0.05, 0));
  const rametto = pezzo(new THREE.CylinderGeometry(0.02, 0.03, 0.5, 5).rotateZ(Math.PI / 2), legno, 0.35, 0.06, 0.18);
  rametto.rotation.y = -0.7;
  ramo.add(rametto);
  posa(ramo, -0.4, -2.35).rotation.y = 0.35;
  for (let k = -3; k <= 3; k++) ostacoli.push({ x: -0.4 + Math.cos(0.35) * k * 0.2, z: -2.35 - Math.sin(0.35) * k * 0.2, r: 0.08 });
  // Pozzanghera: le formiche ci girano intorno
  const pozza = scuoti(new THREE.CircleGeometry(0.42, 14), 0.08, r).rotateX(-Math.PI / 2);
  posa(pezzo(pozza, mat('#8fd0e6', { opacity: 0.3 })), 1.35, 1.2, 0.42).position.y += 0.02;
  // Foglie cadute: le formiche ci passano sopra
  const formaFoglia = new THREE.Shape();
  formaFoglia.moveTo(0, 0); formaFoglia.quadraticCurveTo(0.12, 0.12, 0, 0.32); formaFoglia.quadraticCurveTo(-0.12, 0.12, 0, 0);
  const geoFoglia = new THREE.ShapeGeometry(formaFoglia, 4).rotateX(-Math.PI / 2);
  ([[0.5, 0.4, '#e2a13b'], [-2.3, -0.4, '#d8743a'], [2.6, -0.2, '#c9b440'], [-1.0, 2.2, '#e08a3a'], [0.2, -0.9, '#b8c24a']] as const).forEach(([x, z, c]) => {
    const f = posa(pezzo(geoFoglia, mat(c, { side: THREE.DoubleSide })), x, z);
    f.position.y += 0.015;
    f.rotation.set(0.05, r() * 6, 0.08);
  });
  // Cespuglio di bacche: le bacche cadute sono cibo
  const cespuglio = new THREE.Group();
  const verdi = [mat('#4f8a3c'), mat('#5f9c45'), mat('#3f7535')];
  for (let k = 0; k < 7; k++) {
    const a = k * 0.9, d = k ? 0.22 : 0;
    cespuglio.add(pezzo(sasso(0.24 - d * 0.2, r, 1), verdi[k % 3]!, Math.cos(a) * d, 0.25 + (k ? 0 : 0.12), Math.sin(a) * d));
  }
  for (let k = 0; k < 14; k++) {
    const a = r() * 6, h = r() * 0.5;
    cespuglio.add(pezzo(new THREE.IcosahedronGeometry(0.035, 0), mat('#d8314a'), Math.cos(a) * 0.36, 0.15 + h * 0.4, Math.sin(a) * 0.36));
  }
  posa(cespuglio, -2.35, 1.65, 0.42);
  // Margherite e fiori viola: lo stelo è un nastro d'erba, i petali stanno sopra
  const fiori: { o: THREE.Group; fase: number }[] = [];
  const margherita = (x: number, z: number, viola = false) => {
    const o = new THREE.Group(), alto = 0.25 + r() * 0.2;
    o.add(pezzo(new THREE.CylinderGeometry(0.008, 0.01, alto, 4), mat('#5f9c45'), 0, alto / 2, 0));
    const testa = new THREE.Group();
    testa.position.y = alto;
    testa.add(pezzo(new THREE.IcosahedronGeometry(0.03, 0), mat(viola ? '#f6d26b' : '#f2b62f')));
    const petalo = new THREE.SphereGeometry(0.03, 5, 3).scale(1.8, 0.3, 0.7).translate(0.05, 0, 0);
    for (let k = 0; k < 8; k++) { const q = pezzo(petalo, mat(viola ? '#b48be0' : '#fbf8ef')); q.rotation.y = (k / 8) * Math.PI * 2; testa.add(q); }
    testa.rotation.x = -0.3;
    o.add(testa);
    posa(o, x, z);
    fiori.push({ o, fase: r() * 6 });
  };
  for (let k = 0; k < 16; k++) {
    const a = r() * Math.PI * 2, d = 1.9 + r() * 1.1;
    margherita(Math.cos(a) * d, Math.sin(a) * d, k % 3 === 0);
  }

  // --- Erba: ciuffi lontani dai formicai e dalla pozza, più fitti verso il bordo
  const fili: Nastro[] = [];
  const erbe = ['#6fa646', '#88b94f', '#5c9140', '#9cc45a'].map(c => new THREE.Color(c));
  const ciuffi = p.telefono ? 60 : 110;
  for (let k = 0; k < ciuffi; k++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (R - 0.12);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (CASE.some(c => Math.hypot(x - c.x, z - c.y) < 0.85) || Math.hypot(x - 1.35, z - 1.2) < 0.5 || Math.hypot(x, z) < 1.1 && r() < 0.7) continue;
    for (let q = 0; q < 6; q++) {
      const fx = x + (r() - 0.5) * 0.12, fz = z + (r() - 0.5) * 0.12;
      fili.push({ x: fx, z: fz, y: altezza(fx, fz), alto: 0.14 + r() * 0.2, largo: 0.025, angolo: r() * 6, fase: r() * 6, colore: erbe[q % 4]! });
    }
  }
  const erba = nastri(fili, 4);
  g.add(erba.mesh);

  // --- Formicai: cumuli di terra con l'entrata in cima e qualche granello intorno
  const TINTE = [p.colori.fg, p.colori.arancio, p.colori.fg.clone().lerp(p.colori.verde, 0.5)];
  const SUOLI = ['#a77a4b', '#b4693a', '#c8955a'];
  const cumuli = CASE.map((c, k) => {
    const profilo = [[0, 0.3], [0.06, 0.31], [0.12, 0.33], [0.22, 0.3], [0.38, 0.2], [0.52, 0.08], [0.62, 0]].map(([x, y]) => new THREE.Vector2(x, y));
    const geo = scuoti(new THREE.LatheGeometry(profilo, 14), 0.035, r, true);
    const o = new THREE.Group();
    o.add(pezzo(geo, mat(SUOLI[k]!)));
    o.add(pezzo(new THREE.CircleGeometry(0.075, 8).rotateX(-Math.PI / 2), mat('#1d140e'), 0, 0.335, 0));
    for (let q = 0; q < 26; q++) {
      const a = r() * 6, d = 0.55 + r() * 0.35;
      o.add(pezzo(new THREE.IcosahedronGeometry(0.018 + r() * 0.015, 0), mat(SUOLI[k]!), Math.cos(a) * d, 0, Math.sin(a) * d));
    }
    posa(o, c.x, c.y);
    o.position.y -= 0.02;
    return o;
  });
  const entrata = (k: number) => cumuli[k]!.position.y + 0.33;

  // --- Cibo: mucchietti di pezzi; le formiche ne prendono uno alla volta. Quando un mucchio finisce, ne nasce un altro.
  type Fonte = { x: number; z: number; tipo: Tipo; pezzi: THREE.Mesh[]; resto: number; vuota: number };
  const geoCibo: THREE.BufferGeometry[] = [
    new THREE.IcosahedronGeometry(0.035, 0),
    new THREE.SphereGeometry(0.025, 5, 3).scale(1.6, 0.8, 1),
    new THREE.CircleGeometry(0.04, 3).rotateX(-Math.PI / 2),
    new THREE.BoxGeometry(0.035, 0.03, 0.035),
    new THREE.BoxGeometry(0.03, 0.03, 0.03),
  ];
  const matCibo = COLORI_CIBO.map(c => mat(c, { side: THREE.DoubleSide }));
  const fonti: Fonte[] = [];
  const libero = (x: number, z: number) => Math.hypot(x, z) < R - 0.35 && !ostacoli.some(o => Math.hypot(x - o.x, z - o.z) < o.r + 0.15) && !CASE.some(c => Math.hypot(x - c.x, z - c.y) < 0.9);
  const nuovaFonte = (x: number, z: number, tipo: Tipo, quanti = 18) => {
    const pezzi = Array.from({ length: quanti }, () => {
      const a = r() * 6, d = Math.sqrt(r()) * 0.13;
      const m = pezzo(geoCibo[tipo]!, matCibo[tipo]!, x + Math.cos(a) * d, 0, z + Math.sin(a) * d);
      m.position.y = altezza(m.position.x, m.position.z) + 0.02 + r() * 0.02;
      m.rotation.y = r() * 6;
      g.add(m);
      return m;
    });
    const f = { x, z, tipo, pezzi, resto: quanti, vuota: 0 };
    fonti.push(f);
    return f;
  };
  nuovaFonte(-2.0, 1.25, 0);
  nuovaFonte(2.25, 0.25, 1);
  nuovaFonte(-0.2, -1.5, 2);
  nuovaFonte(0.75, 0.55, 3);

  // --- Formiche: un'unica forma (addome, torace, testa, sei zampe, due antenne), rivolta verso +x
  const zampa = (x: number, lato: number, avanti: number) => new THREE.BoxGeometry(0.005, 0.005, 0.06).translate(0, 0, lato * 0.03).rotateX(lato * 0.45).rotateY(avanti).translate(x, 0.012, 0);
  const geoFormica = unisci([
    new THREE.SphereGeometry(1, 6, 4).scale(0.034, 0.022, 0.024).translate(-0.04, 0.026, 0),
    new THREE.SphereGeometry(1, 5, 3).scale(0.02, 0.012, 0.012).translate(0.003, 0.024, 0),
    new THREE.SphereGeometry(1, 6, 4).scale(0.016, 0.014, 0.016).translate(0.034, 0.028, 0),
    ...[-1, 1].flatMap(l => [zampa(-0.01, l, -0.5 * l), zampa(0.003, l, 0), zampa(0.014, l, 0.5 * l)]),
    ...[-1, 1].map(l => new THREE.BoxGeometry(0.04, 0.004, 0.004).translate(0.02, 0, 0).rotateZ(0.6).rotateY(-l * 0.5).translate(0.045, 0.03, 0)),
  ]);
  const PER = p.telefono ? 26 : 46, N = PER * 3;
  const corpi = new THREE.InstancedMesh(geoFormica, mat('#ffffff', { grezzo: true, opacity: 0.95, fili: 0 }), N);
  const carichi = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.028, 0), mat('#ffffff', { grezzo: true, opacity: 0.95, fili: 0 }), N);
  corpi.frustumCulled = carichi.frustumCulled = false;
  g.add(corpi, carichi);
  type Stato = 'cerca' | 'torna' | 'dentro' | 'saluta';
  type Formica = { x: number; z: number; a: number; col: number; stato: Stato; prima: Stato; carico: number; t: number; cerca: number; passo: number; saluto: number; fase: number };
  const formiche: Formica[] = Array.from({ length: N }, (_, i) => {
    const col = i % 3, c = CASE[col]!, a = r() * Math.PI * 2, d = 0.4 + r() * 1.2;
    const f: Formica = { x: c.x + Math.cos(a) * d, z: c.y + Math.sin(a) * d, a: a, col, stato: 'cerca', prima: 'cerca', carico: -1, t: 0, cerca: r() * 10, passo: 0, saluto: 0, fase: r() * 6 };
    if (Math.hypot(f.x, f.z) > R - 0.3 || ostacoli.some(o => Math.hypot(f.x - o.x, f.z - o.z) < o.r)) { f.x = c.x; f.z = c.y; }
    if (r() < 0.3) { f.stato = 'dentro'; f.t = r() * 5; }
    corpi.setColorAt(i, TINTE[col]!.clone().offsetHSL(0, 0, (r() - 0.5) * 0.06));
    carichi.setColorAt(i, new THREE.Color('#ffffff'));
    return f;
  });

  // --- Scie: ogni colonia ha la sua griglia di odore; chi torna col cibo la lascia, chi cerca la segue.
  // Si vede come una fila di puntini chiari che sbiadisce.
  const odore = [0, 1, 2].map(() => new Float32Array(G * G));
  const cella = (x: number, z: number) => {
    const i = Math.floor((x + R) / CELLA), j = Math.floor((z + R) / CELLA);
    return i < 0 || j < 0 || i >= G || j >= G ? -1 : j * G + i;
  };
  const annusa = (col: number, x: number, z: number) => { const c = cella(x, z); return c < 0 ? 0 : odore[col]![c]!; };
  const TRACCE = 1400, tracce = puntiMorbidi(TRACCE), vitaTraccia = new Float32Array(TRACCE);
  for (let i = 0; i < TRACCE; i++) { tracce.alfa[i] = 0; tracce.dim[i] = 0.035; }
  g.add(tracce.punti);
  let prossimaTraccia = 0;
  const traccia = (f: Formica) => {
    const i = prossimaTraccia++ % TRACCE;
    tracce.pos.set([f.x, altezza(f.x, f.z) + 0.006, f.z], i * 3);
    const c = tono(COLORI_CIBO[f.carico] ?? '#ffffff');
    tracce.col.set([c.r, c.g, c.b], i * 3);
    vitaTraccia[i] = 1;
  };

  // --- Farfalle: volano piano fra i fiori e ogni tanto si posano ad aprire e chiudere le ali
  const farfalle = (['#f2a03d', '#7fb3e8'] as const).map((c, k) => {
    const o = new THREE.Group(), m = mat(c, { side: THREE.DoubleSide });
    const ala = new THREE.Shape();
    ala.moveTo(0, 0); ala.bezierCurveTo(0.05, 0.1, 0.13, 0.08, 0.12, 0.02); ala.bezierCurveTo(0.12, -0.03, 0.06, -0.08, 0, 0);
    const geoAla = new THREE.ShapeGeometry(ala, 4).rotateX(-Math.PI / 2);
    const ali = [1, -1].map(l => { const q = new THREE.Group(); const w = pezzo(geoAla, m); w.scale.x = l; q.add(w); o.add(q); return { q, l }; });
    o.add(pezzo(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 4).rotateX(Math.PI / 2), mat('#3a2a20')));
    g.add(o);
    return { o, ali, fase: k * 7, fiore: k * 5 };
  });

  // --- Lumaca: va pianissimo intorno alla pozza
  const lumaca = new THREE.Group();
  lumaca.add(pezzo(new THREE.CapsuleGeometry(0.035, 0.14, 3, 6).rotateZ(Math.PI / 2), mat('#d9c9a3'), 0, 0.03, 0));
  const guscio = pezzo(new THREE.TorusGeometry(0.05, 0.035, 6, 10), mat('#b8743a'), -0.02, 0.09, 0);
  lumaca.add(guscio, pezzo(new THREE.SphereGeometry(0.025, 6, 4), mat('#cf8c4a'), -0.02, 0.09, 0.02));
  const occhi: number[] = [];
  for (const l of [-1, 1]) occhi.push(0.08, 0.04, 0, 0.12, 0.11, l * 0.025);
  const geoOcchi = new THREE.BufferGeometry();
  geoOcchi.setAttribute('position', new THREE.Float32BufferAttribute(occhi, 3));
  lumaca.add(new THREE.LineSegments(geoOcchi, linea('#8a7a5a')));
  g.add(lumaca);

  // --- Polline e pulviscolo nella luce
  const POLLINE = 140, polline = puntiMorbidi(POLLINE);
  for (let i = 0; i < POLLINE; i++) {
    polline.pos.set([(r() - 0.5) * 6, 0.2 + r() * 2.2, (r() - 0.5) * 6], i * 3);
    polline.dim[i] = 0.02 + r() * 0.03;
    polline.col.set(p.colori.arancio.clone().lerp(p.colori.muted, 0.5).toArray(), i * 3);
    polline.alfa[i] = 0.4 + r() * 0.4;
  }
  g.add(polline.punti);

  // Clic sul prato: un mucchietto di zucchero
  const suolo = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1), dove = new THREE.Vector3();
  function clic(raggio: THREE.Raycaster) {
    if (!raggio.ray.intersectPlane(suolo, dove)) return;
    const x = dove.x, z = dove.z;
    if (Math.hypot(x, z) > R - 0.3 || ostacoli.some(o => Math.hypot(x - o.x, z - o.z) < o.r)) return;
    nuovaFonte(x, z, 4, 14);
  }

  // --- Ciclo
  const dummy = new THREE.Object3D(), nascosto = new THREE.Matrix4().makeScale(0, 0, 0);
  const vicini = new Map<number, number[]>();
  let orologioTracce = 0;
  const differenza = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  function aggiorna(s: number, dt: number, p: Palco) {
    // Erba e fiori: un vento leggero a raffiche
    const vento = 0.5 + 0.5 * Math.sin(s * 0.3);
    erba.aggiorna((q, t, fuori) => {
      const k = t * t * q.alto;
      fuori.set((Math.sin(s * 1.6 + q.fase + q.x) * 0.25 + vento * 0.35) * k, Math.cos(s * 1.3 + q.fase) * 0.15 * k);
    }, s);
    fiori.forEach(f => { f.o.rotation.z = -(Math.sin(s * 1.4 + f.fase) * 0.06 + vento * 0.06); f.o.rotation.x = Math.cos(s * 1.1 + f.fase) * 0.04; });

    // Odore che sbiadisce
    const sbiadisce = Math.exp(-dt * 0.06);
    for (const o of odore) for (let i = 0; i < o.length; i++) if (o[i]) o[i] = o[i]! * sbiadisce < 0.01 ? 0 : o[i]! * sbiadisce;

    // Chi è vicino a chi (griglia), per i saluti
    vicini.clear();
    formiche.forEach((f, i) => {
      if (f.stato === 'dentro') return;
      const c = cella(f.x, f.z);
      (vicini.get(c) ?? vicini.set(c, []).get(c)!).push(i);
    });

    orologioTracce += dt;
    const lascia = orologioTracce > 0.12;
    if (lascia) orologioTracce = 0;
    formiche.forEach((f, i) => {
      const casa = CASE[f.col]!;
      if (f.stato === 'dentro') {
        f.t -= dt;
        if (f.t <= 0) { f.stato = 'cerca'; f.x = casa.x; f.z = casa.y; f.a = r() * Math.PI * 2; f.carico = -1; f.cerca = 0; }
        corpi.setMatrixAt(i, nascosto);
        carichi.setMatrixAt(i, nascosto);
        return;
      }
      let vel = 0;
      if (f.stato === 'saluta') {
        f.t -= dt;
        if (f.t <= 0) f.stato = f.prima;
      } else {
        f.saluto = Math.max(0, f.saluto - dt);
        if (f.stato === 'cerca') {
          vel = 0.3;
          f.cerca += dt;
          // Passeggiata: piccole svolte morbide
          f.a += (Math.sin(s * 1.9 + f.fase) * 1.1 + (r() - 0.5) * 3) * dt;
          // Odore della colonia: tre sensori davanti, si gira verso il più forte
          const sx = (d: number) => annusa(f.col, f.x + Math.cos(f.a + d) * 0.2, f.z + Math.sin(f.a + d) * 0.2);
          const sin = sx(-0.55), dritto = sx(0), des = sx(0.55);
          if (Math.max(sin, des, dritto) > 0.05) f.a += (des > sin && des > dritto ? 1 : sin > des && sin > dritto ? -1 : 0) * 3 * dt;
          // Cibo vicino: ci va dritta; quando è sopra, prende un pezzo e torna
          let meglio: Fonte | null = null, dm = 0.6;
          for (const fo of fonti) { if (!fo.resto) continue; const d = Math.hypot(fo.x - f.x, fo.z - f.z); if (d < dm) { dm = d; meglio = fo; } }
          if (meglio) {
            f.a += differenza(f.a, Math.atan2(meglio.z - f.z, meglio.x - f.x)) * 4 * dt;
            if (dm < 0.1) {
              meglio.resto--;
              meglio.pezzi[meglio.resto]!.visible = false;
              f.carico = meglio.tipo;
              carichi.setColorAt(i, tono(COLORI_CIBO[meglio.tipo]!));
              carichi.instanceColor!.needsUpdate = true;
              f.stato = 'torna';
              f.a += Math.PI;
            }
          }
          if (f.cerca > 45) f.stato = 'torna';
        } else {
          vel = 0.26;
          f.a += (differenza(f.a, Math.atan2(casa.y - f.z, casa.x - f.x)) * 2.5 + (r() - 0.5) * 2) * dt;
          if (f.carico >= 0) {
            const c = cella(f.x, f.z);
            if (c >= 0) odore[f.col]![c] = Math.min(4, odore[f.col]![c]! + 0.5);
            if (lascia && r() < 0.6) traccia(f);
          }
          if (Math.hypot(casa.x - f.x, casa.y - f.z) < 0.09) {
            f.stato = 'dentro';
            f.t = 1 + r() * 3;
            if (f.carico >= 0) cumuli[f.col]!.scale.setScalar(Math.min(1.25, cumuli[f.col]!.scale.x + 0.002));
          }
        }
        // Saluto: due formiche che si incrociano si fermano un attimo, una davanti all'altra
        if (!f.saluto) for (const j of vicini.get(cella(f.x, f.z)) ?? []) {
          const o = formiche[j]!;
          if (j === i || o.saluto || o.stato === 'saluta' || o.stato === 'dentro') continue;
          if (Math.hypot(o.x - f.x, o.z - f.z) < 0.07) {
            for (const [x, y] of [[f, o], [o, f]] as const) { x.prima = x.stato; x.stato = 'saluta'; x.t = 0.7; x.saluto = 5; x.a = Math.atan2(y.z - x.z, y.x - x.x); }
            break;
          }
        }
      }
      if (vel) {
        // Bordo del diorama e ostacoli: se il prossimo passo ci finisce dentro, gira
        let nx = f.x + Math.cos(f.a) * vel * dt, nz = f.z + Math.sin(f.a) * vel * dt;
        if (Math.hypot(nx, nz) > R - 0.18) { f.a += differenza(f.a, Math.atan2(-f.z, -f.x)) * 0.3 + 0.2; nx = f.x; nz = f.z; }
        for (const o of ostacoli) {
          const dx = nx - o.x, dz = nz - o.z;
          if (dx * dx + dz * dz < o.r * o.r) {
            const lato = Math.sign(Math.cos(f.a) * dz - Math.sin(f.a) * dx) || 1;
            f.a += lato * 4 * dt + lato * 0.15;
            nx = f.x; nz = f.z;
            break;
          }
        }
        f.x = nx; f.z = nz;
        f.passo += vel * dt;
      }
      // Posa: sul terreno, con un dondolio del passo; chi saluta muove la testa
      const y = altezza(f.x, f.z) + (f.stato === 'saluta' ? 0 : Math.abs(Math.sin(f.passo * 70)) * 0.004);
      dummy.position.set(f.x, y, f.z);
      dummy.rotation.set(Math.sin(f.passo * 70) * 0.06, -f.a + (f.stato === 'saluta' ? Math.sin(s * 20) * 0.15 : 0), 0);
      dummy.scale.setScalar(0.8);
      dummy.updateMatrix();
      corpi.setMatrixAt(i, dummy.matrix);
      if (f.carico >= 0) {
        dummy.position.set(f.x + Math.cos(f.a) * 0.07, y + 0.04, f.z + Math.sin(f.a) * 0.07);
        dummy.scale.setScalar(f.carico === 2 ? 1.4 : 1);
        dummy.updateMatrix();
        carichi.setMatrixAt(i, dummy.matrix);
      } else carichi.setMatrixAt(i, nascosto);
    });
    corpi.instanceMatrix.needsUpdate = true;
    carichi.instanceMatrix.needsUpdate = true;

    // Cibo finito: dopo un po' ne spunta un mucchio nuovo in un posto libero (lo zucchero del clic non torna)
    fonti.forEach(fo => {
      if (fo.resto || fo.tipo === 4) return;
      fo.vuota += dt;
      if (fo.vuota < 12) return;
      let x = 0, z = 0, prova = 0;
      do { const a = r() * 6, d = 0.8 + r() * 1.9; x = Math.cos(a) * d; z = Math.sin(a) * d; } while (!libero(x, z) && ++prova < 30);
      fo.x = x; fo.z = z; fo.vuota = 0; fo.resto = fo.pezzi.length;
      fo.pezzi.forEach(m => {
        const a = r() * 6, d = Math.sqrt(r()) * 0.13;
        m.position.set(x + Math.cos(a) * d, 0, z + Math.sin(a) * d);
        m.position.y = altezza(m.position.x, m.position.z) + 0.02;
        m.visible = true;
      });
    });

    // Scie che sbiadiscono
    for (let i = 0; i < TRACCE; i++) {
      if (!vitaTraccia[i]) continue;
      vitaTraccia[i] = Math.max(0, vitaTraccia[i]! - dt / 22);
      tracce.alfa[i] = vitaTraccia[i]! * 0.55;
    }
    tracce.aggiorna();

    // Farfalle: giro lento fra un fiore e l'altro; ogni 14 secondi si posano per qualche secondo
    farfalle.forEach(b => {
      const ciclo = (s + b.fase) % 14, f = fiori[(b.fiore + Math.floor((s + b.fase) / 14) * 3) % fiori.length]!;
      const testa = f.o.children[1]!;
      const fx = f.o.position.x, fz = f.o.position.z, fy = f.o.position.y + testa.position.y + 0.03;
      let x: number, y: number, z: number, battito: number;
      if (ciclo < 10) {
        const k = ciclo / 10, a = s * 0.35 + b.fase;
        const vola = Math.sin(k * Math.PI);
        x = fx + Math.cos(a) * 1.3 * vola; z = fz + Math.sin(a * 1.3) * 1.1 * vola;
        y = fy + vola * (0.7 + Math.sin(s * 1.7 + b.fase) * 0.15);
        battito = Math.sin(s * 16 + b.fase) * 1.1;
        b.o.lookAt(fx + Math.cos(a + 0.2) * 1.3 * vola, y, fz + Math.sin((a + 0.2) * 1.3) * 1.1 * vola);
      } else {
        x = fx; y = fy; z = fz;
        battito = 0.4 + Math.sin(s * 2 + b.fase) * 0.5;
      }
      b.o.position.set(x, y, z);
      b.ali.forEach(a => { a.q.rotation.z = a.l * battito; });
    });
    // Lumaca: un giro intero intorno alla pozza in cinque minuti
    const al = s * 0.02;
    lumaca.position.set(1.35 + Math.cos(al) * 0.6, 0, 1.2 + Math.sin(al) * 0.6);
    lumaca.position.y = altezza(lumaca.position.x, lumaca.position.z);
    lumaca.rotation.y = -al - Math.PI / 2;
    guscio.scale.x = 1 + Math.sin(s * 0.8) * 0.03;
    // Polline: sale e scende piano nella luce
    for (let i = 0; i < POLLINE; i++) {
      const k = i * 3;
      polline.pos[k] = polline.pos[k]! + (Math.sin(s * 0.3 + i) * 0.03 + vento * 0.04) * dt;
      polline.pos[k + 1] = polline.pos[k + 1]! + Math.sin(s * 0.5 + i * 1.7) * 0.02 * dt;
      if (polline.pos[k]! > 3) polline.pos[k] = -3;
    }
    polline.aggiorna();
  }
  return p;
}
