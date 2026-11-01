import * as THREE from 'three';
import { casuale, mat, pezzo, scuoti, sasso, unisci, linea, terreno, nastri, puntiMorbidi, palco, tema, type Nastro, type Palco } from './natura';

// Tre colonie rivali viste dall'alto, su un prato aperto nello stile del bosco: formiche rosse, bianche (nere di
// giorno) e verdi. Escono dal formicaio, cercano cibo, lo riportano a casa lasciando una scia di odore che le
// compagne seguono; le scie si vedono come puntini del colore della colonia. Ogni colonia evita l'odore delle altre,
// così nascono i territori; quando due formiche nemiche si incontrano combattono, e chi perde diventa cibo.
// Una colonia che mangia cresce. Un clic lascia cibo (aiuti chi è vicino); il puntatore è un dito: spaventa le
// formiche e cancella le scie, che poi si riformano. Sul prato vivono anche lumache, coccinelle, uno scarabeo,
// cavallette e farfalle.

const R = 4.4, G = 64, CELLA = (R * 2) / G, MAX = 90;
const COLORI_CIBO = ['#d8314a', '#e6c26a', '#79b84a', '#f3e6c8'];

export function monta(el: HTMLElement) {
  const r = casuale(5);
  const chiaro = tema();
  const p = palco(el, {
    camera: new THREE.Vector3(0, 9.4, 5.4), mira: new THREE.Vector3(0, 0, 0.35), giro: 0.008, inclina: [-0.3, 0.12], aggiorna, clic,
    scena: 'formicaio', famiglie: false,
    toni: [chiaro ? '#d63a2c' : '#ff5a48', chiaro ? '#1c1a17' : '#f2efe8', getComputedStyle(document.documentElement).getPropertyValue('--verde').trim()],
  });
  const g = p.gruppo, c = p.colori;

  // --- Prato: dischi verdi, griglia di punti, collinette appena accennate
  const altezza = (x: number, z: number) => {
    const bordo = Math.max(0, Math.min(1, (R + 0.6 - Math.hypot(x, z)) / 0.8));
    return bordo * (0.04 + 0.05 * Math.sin(x * 0.9 + 1) * Math.cos(z * 1.1));
  };
  terreno(g, c.verde, R + 1.2, altezza);

  // --- Colonie: formicaio a cumulo con l'entrata, tinta della colonia, scorte di cibo
  type Colonia = { casa: THREE.Vector2; tinta: THREE.Color; cumulo: THREE.Group; scorte: number; vivi: number; nascita: number };
  const colonie: Colonia[] = p.toni.map((tinta, k) => {
    const a = -Math.PI / 2 + (k / 3) * Math.PI * 2, casa = new THREE.Vector2(Math.cos(a) * 2.5, Math.sin(a) * 2.5 + 0.2);
    const profilo = [[0, 0.22], [0.07, 0.23], [0.15, 0.2], [0.3, 0.12], [0.45, 0.04], [0.55, 0]].map(([x, y]) => new THREE.Vector2(x, y));
    const cumulo = new THREE.Group();
    cumulo.add(pezzo(scuoti(new THREE.LatheGeometry(profilo, 14), 0.03, r, true), mat('#b88a55')));
    cumulo.add(pezzo(new THREE.CircleGeometry(0.07, 8).rotateX(-Math.PI / 2), mat(tinta, { grezzo: true, opacity: 0.9 }), 0, 0.235, 0));
    // Un anello del colore della colonia intorno al cumulo: si capisce di chi è
    const anello = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 40 }, (_, q) => new THREE.Vector3(Math.cos(q / 40 * Math.PI * 2) * 0.62, 0.01, Math.sin(q / 40 * Math.PI * 2) * 0.62))), new THREE.LineBasicMaterial({ color: tinta, transparent: true, opacity: 0.6 }));
    cumulo.add(anello);
    cumulo.position.set(casa.x, altezza(casa.x, casa.y), casa.y);
    g.add(cumulo);
    return { casa, tinta, cumulo, scorte: 0, vivi: 0, nascita: 0 };
  });

  // --- Ostacoli fermi: sassi, funghi, rametto, pozza, cespuglio
  const ostacoli: { x: number; z: number; r: number }[] = [];
  const posa = <T extends THREE.Object3D>(o: T, x: number, z: number, raggio = 0) => {
    o.position.set(x, altezza(x, z), z);
    g.add(o);
    if (raggio) ostacoli.push({ x, z, r: raggio });
    return o;
  };
  const grigi = [mat('#a7a39a'), mat('#8f8b84'), mat('#bdb5a4')];
  ([[0.2, 0.3, 0.34], [-1.6, -1.6, 0.28], [1.9, -1.2, 0.24], [-2.9, 1.1, 0.3], [3.2, 1.4, 0.26], [0.4, 3.3, 0.22], [-0.9, 1.4, 0.18]] as const).forEach(([x, z, rr], k) => {
    const s = posa(pezzo(sasso(rr, r, 1), grigi[k % 3]!), x, z, rr * 1.05);
    s.scale.y = 0.6;
    s.rotation.y = r() * 6;
  });
  const fungo = (alto: number, raggio: number, cappello: string) => {
    const o = new THREE.Group();
    o.add(pezzo(new THREE.CylinderGeometry(raggio * 0.28, raggio * 0.36, alto, 7), mat('#efe6d2'), 0, alto / 2, 0));
    o.add(pezzo(new THREE.SphereGeometry(raggio, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1), mat(cappello), 0, alto * 0.95, 0));
    return o;
  };
  posa(fungo(0.32, 0.2, '#d9443a'), -3.3, -0.8, 0.1);
  posa(fungo(0.22, 0.13, '#d9443a'), -3.1, -1.05, 0.07);
  posa(fungo(0.26, 0.15, '#9a6a3f'), 2.6, 2.9, 0.08);
  const legno = mat('#7a5230');
  const ramo = pezzo(new THREE.CylinderGeometry(0.045, 0.055, 1.6, 6).rotateZ(Math.PI / 2), legno);
  posa(ramo, 1.2, 1.6).rotation.y = 0.5;
  ramo.position.y += 0.05;
  for (let k = -4; k <= 4; k++) ostacoli.push({ x: 1.2 + Math.cos(0.5) * k * 0.18, z: 1.6 - Math.sin(0.5) * k * 0.18, r: 0.07 });
  const forma = scuoti(new THREE.CircleGeometry(0.5, 16), 0.16, r).rotateX(-Math.PI / 2);
  posa(pezzo(forma, mat('#8fd0e6', { opacity: 0.3 })), -1.3, -0.1, 0.48).position.y += 0.015;
  const cespuglio = new THREE.Group();
  const verdi = [mat('#4f8a3c'), mat('#5f9c45'), mat('#3f7535')];
  for (let k = 0; k < 6; k++) cespuglio.add(pezzo(sasso(0.24 - (k ? 0.06 : 0), r, 1), verdi[k % 3]!, Math.cos(k) * (k ? 0.22 : 0), 0.22, Math.sin(k) * (k ? 0.22 : 0)));
  posa(cespuglio, 3.4, -1.7, 0.4);
  // Foglie cadute e fiori: le formiche ci passano sopra o accanto
  const fogliaForma = new THREE.Shape();
  fogliaForma.moveTo(0, 0); fogliaForma.quadraticCurveTo(0.14, 0.14, 0, 0.36); fogliaForma.quadraticCurveTo(-0.14, 0.14, 0, 0);
  const geoFoglia = new THREE.ShapeGeometry(fogliaForma, 4).rotateX(-Math.PI / 2);
  for (let k = 0; k < 9; k++) {
    const a = r() * 6, d = 1 + r() * 3.2;
    const f = posa(pezzo(geoFoglia, mat(['#e2a13b', '#d8743a', '#c9b440', '#b8c24a'][k % 4]!, { side: THREE.DoubleSide })), Math.cos(a) * d, Math.sin(a) * d);
    f.position.y += 0.012;
    f.rotation.y = r() * 6;
  }
  const fiori: THREE.Group[] = [];
  for (let k = 0; k < 12; k++) {
    const a = r() * 6, d = 3.3 + r() * 1.2, o = new THREE.Group(), alto = 0.2 + r() * 0.15;
    o.add(pezzo(new THREE.CylinderGeometry(0.008, 0.01, alto, 4), mat('#5f9c45'), 0, alto / 2, 0));
    const petalo = new THREE.SphereGeometry(0.03, 5, 3).scale(1.8, 0.3, 0.7).translate(0.05, 0, 0);
    for (let q = 0; q < 7; q++) { const pp = pezzo(petalo, mat(k % 3 ? '#fbf8ef' : '#b48be0'), 0, alto, 0); pp.rotation.y = (q / 7) * Math.PI * 2; o.add(pp); }
    o.add(pezzo(new THREE.IcosahedronGeometry(0.03, 0), mat('#f2b62f'), 0, alto, 0));
    fiori.push(posa(o, Math.cos(a) * d, Math.sin(a) * d));
  }
  const fili: Nastro[] = [];
  const erbe = ['#6fa646', '#88b94f', '#5c9140'].map(x => new THREE.Color(x));
  for (let k = 0; k < (p.telefono ? 40 : 70); k++) {
    const a = r() * 6, d = 1.2 + Math.sqrt(r()) * 3.6, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (colonie.some(q => Math.hypot(x - q.casa.x, z - q.casa.y) < 0.8)) continue;
    for (let q = 0; q < 5; q++) {
      const fx = x + (r() - 0.5) * 0.14, fz = z + (r() - 0.5) * 0.14;
      fili.push({ x: fx, z: fz, y: altezza(fx, fz), alto: 0.1 + r() * 0.16, largo: 0.025, angolo: r() * 6, fase: r() * 6, colore: erbe[q % 3]! });
    }
  }
  const erba = nastri(fili, 4);
  // Erba tenue: le formiche verdi devono staccarsi dal prato
  (erba.mesh.material as THREE.MeshBasicMaterial).opacity = 0.08;
  ((erba.mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.28;
  g.add(erba.mesh);
  const libero = (x: number, z: number, margine = 0.1) => Math.hypot(x, z) < R - 0.3 && !ostacoli.some(o => Math.hypot(x - o.x, z - o.z) < o.r + margine);

  // --- Cibo: mucchietti di pezzi; ogni formica ne prende uno. Ne spuntano di nuovi quando ce ne sono pochi.
  type Fonte = { x: number; z: number; tipo: number; pezzi: THREE.Mesh[]; resto: number };
  const geoCibo = [new THREE.IcosahedronGeometry(0.035, 0), new THREE.SphereGeometry(0.025, 5, 3).scale(1.6, 0.8, 1), new THREE.CircleGeometry(0.045, 3).rotateX(-Math.PI / 2), new THREE.BoxGeometry(0.035, 0.03, 0.035), new THREE.SphereGeometry(0.03, 5, 3).scale(1.5, 0.6, 0.8)];
  const matCibo = [...COLORI_CIBO.map(x => mat(x, { side: THREE.DoubleSide, opacity: 0.7 })), mat('#8f8b84', { opacity: 0.6 })];
  const fonti: Fonte[] = [];
  const nuovaFonte = (x: number, z: number, tipo: number, quanti: number) => {
    const pezzi = Array.from({ length: quanti }, () => {
      const a = r() * 6, d = Math.sqrt(r()) * (quanti > 1 ? 0.15 : 0);
      const m = pezzo(geoCibo[tipo]!, matCibo[tipo]!, x + Math.cos(a) * d, 0, z + Math.sin(a) * d);
      m.position.y = altezza(m.position.x, m.position.z) + 0.02;
      m.rotation.y = r() * 6;
      g.add(m);
      return m;
    });
    fonti.push({ x, z, tipo, pezzi, resto: quanti });
  };
  const fonteCasuale = () => {
    for (let prova = 0; prova < 30; prova++) {
      const a = r() * 6, d = 0.6 + r() * 3.4, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (libero(x, z, 0.2) && !colonie.some(q => Math.hypot(x - q.casa.x, z - q.casa.y) < 0.9)) { nuovaFonte(x, z, Math.floor(r() * 4), 14 + Math.floor(r() * 10)); return; }
    }
  };
  for (let k = 0; k < 7; k++) fonteCasuale();

  // --- Formiche: un'unica forma rivolta verso +x; le tinte vengono dalla colonia
  const zampa = (x: number, lato: number, avanti: number) => new THREE.BoxGeometry(0.006, 0.006, 0.07).translate(0, 0, lato * 0.035).rotateX(lato * 0.45).rotateY(avanti).translate(x, 0.014, 0);
  const geoFormica = unisci([
    new THREE.SphereGeometry(1, 6, 4).scale(0.04, 0.026, 0.029).translate(-0.047, 0.03, 0),
    new THREE.SphereGeometry(1, 5, 3).scale(0.024, 0.015, 0.015).translate(0.004, 0.028, 0),
    new THREE.SphereGeometry(1, 6, 4).scale(0.02, 0.017, 0.02).translate(0.04, 0.032, 0),
    ...[-1, 1].flatMap(l => [zampa(-0.012, l, -0.5 * l), zampa(0.004, l, 0), zampa(0.017, l, 0.5 * l)]),
    ...[-1, 1].map(l => new THREE.BoxGeometry(0.05, 0.005, 0.005).translate(0.025, 0, 0).rotateZ(0.5).rotateY(-l * 0.55).translate(0.052, 0.035, 0)),
  ]);
  const N = MAX * 3;
  const corpi = new THREE.InstancedMesh(geoFormica, mat('#ffffff', { grezzo: true, opacity: 0.95, fili: 0 }), N);
  const carichi = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0), mat('#ffffff', { grezzo: true, opacity: 0.95, fili: 0 }), N);
  corpi.frustumCulled = carichi.frustumCulled = false;
  g.add(corpi, carichi);
  type Stato = 'cerca' | 'torna' | 'lotta' | 'scappa' | 'dentro' | 'morta';
  type Formica = { x: number; z: number; a: number; col: number; stato: Stato; carico: number; t: number; cerca: number; passo: number; fase: number; nemico: number };
  const formiche: Formica[] = Array.from({ length: N }, (_, i) => {
    const col = Math.floor(i / MAX);
    corpi.setColorAt(i, colonie[col]!.tinta.clone().offsetHSL(0, 0, (r() - 0.5) * 0.08));
    carichi.setColorAt(i, new THREE.Color('#ffffff'));
    return { x: 0, z: 0, a: 0, col, stato: 'morta', carico: -1, t: 0, cerca: 0, passo: 0, fase: r() * 6, nemico: -1 };
  });
  const nasce = (col: number, fuori = false) => {
    const i = formiche.findIndex((f, k) => Math.floor(k / MAX) === col && f.stato === 'morta');
    if (i < 0) return;
    const f = formiche[i]!, casa = colonie[col]!.casa, a = r() * Math.PI * 2, d = fuori ? 0.3 + r() * 1.2 : 0;
    Object.assign(f, { x: casa.x + Math.cos(a) * d, z: casa.y + Math.sin(a) * d, a, stato: fuori ? 'cerca' : 'dentro', t: r() * 3, carico: -1, cerca: 0, nemico: -1 });
    if (!libero(f.x, f.z, 0)) { f.x = casa.x; f.z = casa.y; }
    colonie[col]!.vivi++;
  };
  colonie.forEach((_, k) => { for (let q = 0; q < 40; q++) nasce(k, q < 28); });

  // --- Odore: una griglia per colonia. Chi torna col cibo la rinforza, chi cerca la segue ed evita quella dei nemici.
  const odore = [0, 1, 2].map(() => new Float32Array(G * G));
  const cella = (x: number, z: number) => {
    const i = Math.floor((x + R) / CELLA), j = Math.floor((z + R) / CELLA);
    return i < 0 || j < 0 || i >= G || j >= G ? -1 : j * G + i;
  };
  const annusa = (col: number, x: number, z: number) => {
    const q = cella(x, z);
    if (q < 0) return -9;
    let nemici = 0;
    for (let k = 0; k < 3; k++) if (k !== col) nemici = Math.max(nemici, odore[k]![q]!);
    return odore[col]![q]! - nemici * 0.7;
  };
  // Le scie si vedono: un puntino per cella, del colore della colonia più forte lì
  const scie = puntiMorbidi(G * G);
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const q = j * G + i, x = -R + (i + 0.5) * CELLA, z = -R + (j + 0.5) * CELLA;
    scie.pos.set([x, altezza(x, z) + 0.008, z], q * 3);
    scie.dim[q] = 0.05;
    scie.alfa[q] = 0;
  }
  g.add(scie.punti);

  // --- Il dito: un cerchio sottile dove sta il puntatore
  const dito = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 36 }, (_, q) => new THREE.Vector3(Math.cos(q / 36 * Math.PI * 2) * 0.5, 0, Math.sin(q / 36 * Math.PI * 2) * 0.5))), new THREE.LineBasicMaterial({ color: c.fg, transparent: true, opacity: 0 }));
  g.add(dito);
  const suolo = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05), punto = new THREE.Vector3();

  // --- Altri abitanti del prato
  // Lumache: lentissime, lasciano una scia lucida; le formiche le aggirano
  const lumache = [0, 1].map(k => {
    const o = new THREE.Group();
    o.add(pezzo(new THREE.CapsuleGeometry(0.04, 0.16, 3, 6).rotateZ(Math.PI / 2), mat('#d9c9a3'), 0, 0.035, 0));
    o.add(pezzo(new THREE.TorusGeometry(0.055, 0.04, 6, 10), mat('#b8743a'), -0.02, 0.1, 0));
    const occhi: THREE.Vector3[] = [];
    for (const l of [-1, 1]) occhi.push(new THREE.Vector3(0.09, 0.04, 0), new THREE.Vector3(0.14, 0.12, l * 0.03));
    o.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(occhi), linea('#8a7a5a')));
    g.add(o);
    return { o, x: k ? 2.2 : -2.6, z: k ? 0.2 : 2.0, a: r() * 6, fase: r() * 6 };
  });
  const BAVA = 300, bava = puntiMorbidi(BAVA), vitaBava = new Float32Array(BAVA);
  for (let i = 0; i < BAVA; i++) { bava.alfa[i] = 0; bava.dim[i] = 0.07; bava.col.set(c.fg.toArray(), i * 3); }
  g.add(bava.punti);
  let prossimaBava = 0, orologioBava = 0;
  // Coccinelle: camminano piano; ogni tanto aprono le elitre e volano in un altro punto
  const coccinelle = [0, 1, 2].map(() => {
    const o = new THREE.Group();
    const corpo = pezzo(new THREE.SphereGeometry(0.06, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e0352a', { grezzo: true, opacity: 0.55 }));
    o.add(corpo, pezzo(new THREE.SphereGeometry(0.025, 6, 4), mat('#1c1a17', { grezzo: true, opacity: 0.8 }), 0.06, 0.01, 0));
    for (let q = 0; q < 5; q++) o.add(pezzo(new THREE.CircleGeometry(0.011, 6).rotateX(-Math.PI / 2), mat('#1c1a17', { grezzo: true, opacity: 0.9, fili: 0 }), (r() - 0.5) * 0.07, 0.061, (r() - 0.5) * 0.07));
    g.add(o);
    const a = r() * 6, d = 1 + r() * 3;
    return { o, corpo, x: Math.cos(a) * d, z: Math.sin(a) * d, a: r() * 6, vola: 0, da: new THREE.Vector2(), a2: new THREE.Vector2(), prossimo: 8 + r() * 20 };
  });
  // Scarabeo: più svelto, le formiche lo evitano
  const scarabeo = (() => {
    const o = new THREE.Group();
    o.add(pezzo(new THREE.SphereGeometry(0.08, 8, 5).scale(1.4, 0.6, 1), mat('#3e6795'), 0, 0.05, 0));
    o.add(pezzo(new THREE.SphereGeometry(0.04, 6, 4), mat('#35587f'), 0.12, 0.04, 0));
    const zampe: THREE.Vector3[] = [];
    for (const l of [-1, 1]) for (let q = -1; q <= 1; q++) zampe.push(new THREE.Vector3(q * 0.05, 0.04, l * 0.05), new THREE.Vector3(q * 0.08, 0, l * 0.13));
    o.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(zampe), linea('#35587f')));
    g.add(o);
    return { o, x: -0.5, z: -2.6, a: 0.3 };
  })();
  // Cavallette: ferme, poi un salto ad arco
  const cavallette = [0, 1].map(k => {
    const o = new THREE.Group();
    o.add(pezzo(new THREE.CapsuleGeometry(0.025, 0.12, 3, 5).rotateZ(Math.PI / 2), mat('#79b84a'), 0, 0.04, 0));
    const zampe = [new THREE.Vector3(-0.02, 0.05, 0.02), new THREE.Vector3(-0.1, 0.09, 0.04), new THREE.Vector3(-0.1, 0.09, 0.04), new THREE.Vector3(-0.12, 0, 0.05),
      new THREE.Vector3(-0.02, 0.05, -0.02), new THREE.Vector3(-0.1, 0.09, -0.04), new THREE.Vector3(-0.1, 0.09, -0.04), new THREE.Vector3(-0.12, 0, -0.05)];
    o.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(zampe), linea('#5f9c45')));
    g.add(o);
    return { o, x: k ? 3.0 : -1.8, z: k ? -0.4 : 3.1, a: r() * 6, salto: 0, attesa: 2 + r() * 4, da: new THREE.Vector2(), a2: new THREE.Vector2() };
  });
  // Farfalle: volano alte sopra il prato, si posano sui fiori
  const farfalle = ['#f2a03d', '#7fb3e8'].map((tinta, k) => {
    const o = new THREE.Group(), m = mat(tinta, { side: THREE.DoubleSide, opacity: 0.45 });
    const ala = new THREE.Shape();
    ala.moveTo(0, 0); ala.bezierCurveTo(0.06, 0.12, 0.16, 0.1, 0.15, 0.02); ala.bezierCurveTo(0.15, -0.04, 0.07, -0.1, 0, 0);
    const geoAla = new THREE.ShapeGeometry(ala, 4).rotateX(-Math.PI / 2);
    const ali = [1, -1].map(l => { const q = new THREE.Group(); const w = pezzo(geoAla, m); w.scale.x = l; q.add(w); o.add(q); return { q, l }; });
    g.add(o);
    return { o, ali, fase: k * 7 };
  });

  // Clic: una manciata di cibo dove clicchi; aiuta la colonia più vicina
  function clic(raggio: THREE.Raycaster) {
    if (!raggio.ray.intersectPlane(suolo, punto) || !libero(punto.x, punto.z, 0)) return;
    nuovaFonte(punto.x, punto.z, Math.floor(r() * 4), 16);
  }

  // --- Ciclo
  const dummy = new THREE.Object3D(), nascosto = new THREE.Matrix4().makeScale(0, 0, 0);
  const vicini = new Map<number, number[]>();
  const differenza = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const amici = (f: Formica) => (vicini.get(cella(f.x, f.z)) ?? []).filter(j => formiche[j]!.col === f.col).length;
  let fotogramma = 0, attesaCibo = 0;
  const mischia = new THREE.Color();
  function aggiorna(s: number, dt: number, p: Palco) {
    fotogramma++;
    erba.aggiorna((q, t, fuori) => { const k = t * t * q.alto; fuori.set(Math.sin(s * 1.5 + q.fase + q.x) * 0.22 * k, Math.cos(s * 1.2 + q.fase) * 0.12 * k); }, s);
    fiori.forEach((f, k) => { f.rotation.z = Math.sin(s * 1.3 + k) * 0.05; });

    // Il dito: dove il puntatore tocca il prato
    let dx = 9, dz = 9;
    const dm = dito.material as THREE.LineBasicMaterial;
    if (p.raggio && p.raggio.ray.intersectPlane(suolo, punto) && Math.hypot(punto.x, punto.z) < R + 0.5) {
      dx = punto.x; dz = punto.z;
      dito.position.set(dx, 0.06, dz);
      dm.opacity += (0.6 - dm.opacity) * 0.2;
      // Le scie sotto il dito si cancellano
      for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) {
        const q = cella(dx + i * CELLA, dz + j * CELLA);
        if (q >= 0 && i * i + j * j <= 25) for (const o of odore) o[q] = 0;
      }
    } else dm.opacity *= 0.85;

    // Odore che sbiadisce piano
    const sbiadisce = Math.exp(-dt * 0.05);
    for (const o of odore) for (let i = 0; i < o.length; i++) if (o[i]) o[i] = o[i]! * sbiadisce < 0.01 ? 0 : o[i]! * sbiadisce;
    if (fotogramma % 3 === 0) {
      for (let q = 0; q < G * G; q++) {
        let meglio = -1, v = 0;
        for (let k = 0; k < 3; k++) if (odore[k]![q]! > v) { v = odore[k]![q]!; meglio = k; }
        scie.alfa[q] = meglio < 0 ? 0 : Math.min(1, v / 3) * (chiaro ? 0.55 : 0.4);
        if (meglio >= 0) { mischia.copy(colonie[meglio]!.tinta); scie.col.set([mischia.r, mischia.g, mischia.b], q * 3); }
      }
      scie.aggiorna();
    }

    // Ostacoli che si muovono: lumache e scarabeo
    const mobili = [...lumache.map(l => ({ x: l.x, z: l.z, r: 0.14 })), { x: scarabeo.x, z: scarabeo.z, r: 0.17 }];

    vicini.clear();
    formiche.forEach((f, i) => {
      if (f.stato === 'morta' || f.stato === 'dentro') return;
      const q = cella(f.x, f.z);
      (vicini.get(q) ?? vicini.set(q, []).get(q)!).push(i);
    });

    formiche.forEach((f, i) => {
      if (f.stato === 'morta') { corpi.setMatrixAt(i, nascosto); carichi.setMatrixAt(i, nascosto); return; }
      const col = colonie[f.col]!, casa = col.casa;
      if (f.stato === 'dentro') {
        f.t -= dt;
        if (f.t <= 0) { f.stato = 'cerca'; f.x = casa.x; f.z = casa.y; f.a = r() * Math.PI * 2; f.carico = -1; f.cerca = 0; }
        corpi.setMatrixAt(i, nascosto); carichi.setMatrixAt(i, nascosto);
        return;
      }
      let vel = 0;
      // Il dito spaventa: chi è vicino scappa dritto via
      if (f.stato !== 'lotta' && Math.hypot(f.x - dx, f.z - dz) < 0.5) { f.stato = 'scappa'; f.t = 1 + r(); f.a = Math.atan2(f.z - dz, f.x - dx); }
      if (f.stato === 'scappa') {
        vel = 0.75;
        f.t -= dt;
        f.a += (r() - 0.5) * 4 * dt;
        if (f.t <= 0) f.stato = f.carico >= 0 ? 'torna' : 'cerca';
      } else if (f.stato === 'lotta') {
        f.t -= dt;
        const o = formiche[f.nemico];
        if (o) f.a = Math.atan2(o.z - f.z, o.x - f.x) + Math.sin(s * 30 + i) * 0.4;
        if (f.t <= 0) {
          // Chi ha più compagne vicine vince più spesso; a volte finisce senza morti
          if (o && o.stato === 'lotta' && i < f.nemico && r() < 0.6) {
            const fi = amici(f), fo = amici(o), perde = r() < (fo + 1) / (fi + fo + 2) ? f : o;
            perde.stato = 'morta';
            colonie[perde.col]!.vivi--;
            nuovaFonte(perde.x, perde.z, 4, 1);
            if (perde.carico >= 0) nuovaFonte(perde.x + 0.04, perde.z, perde.carico, 1);
          }
          if (f.stato === 'lotta') { f.stato = f.carico >= 0 ? 'torna' : 'cerca'; f.a += Math.PI; }
          if (o && o.stato === 'lotta' && o.nemico === i) { o.stato = o.carico >= 0 ? 'torna' : 'cerca'; o.a += Math.PI; o.t = 0; }
        }
      } else if (f.stato === 'cerca') {
        vel = 0.34;
        f.cerca += dt;
        f.a += (Math.sin(s * 1.9 + f.fase) * 1.1 + (r() - 0.5) * 3) * dt;
        const sx = (d: number) => annusa(f.col, f.x + Math.cos(f.a + d) * 0.22, f.z + Math.sin(f.a + d) * 0.22);
        const sin = sx(-0.55), dritto = sx(0), des = sx(0.55);
        if (Math.max(sin, des, dritto) > 0.05 || Math.min(sin, des, dritto) < -0.3) f.a += (des > sin && des > dritto ? 1 : sin > des && sin > dritto ? -1 : 0) * 3 * dt;
        let meglio: Fonte | null = null, dmin = 0.65;
        for (const fo of fonti) { if (!fo.resto) continue; const d = Math.hypot(fo.x - f.x, fo.z - f.z); if (d < dmin) { dmin = d; meglio = fo; } }
        if (meglio) {
          f.a += differenza(f.a, Math.atan2(meglio.z - f.z, meglio.x - f.x)) * 4 * dt;
          if (dmin < 0.1) {
            meglio.resto--;
            meglio.pezzi[meglio.resto]!.visible = false;
            f.carico = meglio.tipo;
            carichi.setColorAt(i, (matCibo[meglio.tipo] as THREE.MeshBasicMaterial).color);
            carichi.instanceColor!.needsUpdate = true;
            f.stato = 'torna';
            f.a += Math.PI;
          }
        }
        if (f.cerca > 50) f.stato = 'torna';
      } else {
        vel = 0.3;
        f.a += (differenza(f.a, Math.atan2(casa.y - f.z, casa.x - f.x)) * 2.5 + (r() - 0.5) * 2) * dt;
        if (f.carico >= 0) { const q = cella(f.x, f.z); if (q >= 0) odore[f.col]![q] = Math.min(4, odore[f.col]![q]! + 0.6); }
        if (Math.hypot(casa.x - f.x, casa.y - f.z) < 0.1) {
          f.stato = 'dentro';
          f.t = 1 + r() * 3;
          if (f.carico >= 0) col.scorte++;
        }
      }
      // Incontro con una nemica: si fermano e lottano
      if (f.stato === 'cerca' || f.stato === 'torna') for (const j of vicini.get(cella(f.x, f.z)) ?? []) {
        const o = formiche[j]!;
        if (o.col === f.col || (o.stato !== 'cerca' && o.stato !== 'torna')) continue;
        if (Math.hypot(o.x - f.x, o.z - f.z) < 0.08) {
          f.stato = o.stato = 'lotta';
          f.t = o.t = 1 + r() * 0.8;
          f.nemico = j; o.nemico = i;
          break;
        }
      }
      if (vel) {
        let nx = f.x + Math.cos(f.a) * vel * dt, nz = f.z + Math.sin(f.a) * vel * dt;
        if (Math.hypot(nx, nz) > R - 0.15) { f.a += differenza(f.a, Math.atan2(-f.z, -f.x)) * 0.3 + 0.2; nx = f.x; nz = f.z; }
        for (const o of ostacoli.concat(mobili)) {
          const ex = nx - o.x, ez = nz - o.z;
          if (ex * ex + ez * ez < o.r * o.r) {
            const lato = Math.sign(Math.cos(f.a) * ez - Math.sin(f.a) * ex) || 1;
            f.a += lato * 4 * dt + lato * 0.15;
            nx = f.x; nz = f.z;
            break;
          }
        }
        f.x = nx; f.z = nz;
        f.passo += vel * dt;
      }
      const y = altezza(f.x, f.z) + (f.stato === 'lotta' ? Math.abs(Math.sin(s * 25 + i)) * 0.01 : Math.abs(Math.sin(f.passo * 60)) * 0.004);
      dummy.position.set(f.x, y, f.z);
      dummy.rotation.set(Math.sin(f.passo * 60) * 0.06, -f.a, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      corpi.setMatrixAt(i, dummy.matrix);
      if (f.carico >= 0) {
        dummy.position.set(f.x + Math.cos(f.a) * 0.085, y + 0.045, f.z + Math.sin(f.a) * 0.085);
        dummy.updateMatrix();
        carichi.setMatrixAt(i, dummy.matrix);
      } else carichi.setMatrixAt(i, nascosto);
    });
    corpi.instanceMatrix.needsUpdate = true;
    carichi.instanceMatrix.needsUpdate = true;

    // Colonie: con le scorte nascono formiche nuove; una colonia piccola ne fa nascere una ogni tanto anche senza
    colonie.forEach((col, k) => {
      col.nascita += dt;
      if (col.scorte >= 2 && col.vivi < MAX) { col.scorte -= 2; nasce(k); }
      else if (col.vivi < 10 && col.nascita > 12) { col.nascita = 0; nasce(k); }
      col.cumulo.scale.setScalar(0.8 + Math.sqrt(col.vivi / MAX) * 0.6);
    });
    // Cibo: quando ci sono pochi mucchi ne spunta uno nuovo; i mucchi vuoti si tolgono
    for (let k = fonti.length - 1; k >= 0; k--) if (!fonti[k]!.resto) { fonti[k]!.pezzi.forEach(m => { g.remove(m); }); fonti.splice(k, 1); }
    attesaCibo += dt;
    if (fonti.filter(f => f.tipo !== 4).length < 6 && attesaCibo > 8) { attesaCibo = 0; fonteCasuale(); }

    // Lumache: avanti pianissimo, curve lente; lasciano una bava lucida che sbiadisce
    orologioBava += dt;
    lumache.forEach(l => {
      l.a += Math.sin(s * 0.13 + l.fase) * 0.15 * dt;
      const nx = l.x + Math.cos(l.a) * 0.035 * dt, nz = l.z + Math.sin(l.a) * 0.035 * dt;
      if (!libero(nx, nz, 0.15)) l.a += dt * 0.8; else { l.x = nx; l.z = nz; }
      l.o.position.set(l.x, altezza(l.x, l.z), l.z);
      l.o.rotation.y = -l.a;
      l.o.scale.x = 1 + Math.sin(s * 1.2 + l.fase) * 0.06;
      if (orologioBava > 0.6) {
        const q = prossimaBava++ % BAVA;
        bava.pos.set([l.x - Math.cos(l.a) * 0.1, altezza(l.x, l.z) + 0.005, l.z - Math.sin(l.a) * 0.1], q * 3);
        vitaBava[q] = 1;
      }
    });
    if (orologioBava > 0.6) orologioBava = 0;
    for (let q = 0; q < BAVA; q++) if (vitaBava[q]) { vitaBava[q] = Math.max(0, vitaBava[q]! - dt / 60); bava.alfa[q] = vitaBava[q]! * 0.25; }
    bava.aggiorna();
    // Scarabeo: cammina deciso, gira quando trova un ostacolo
    {
      scarabeo.a += Math.sin(s * 0.4) * 0.5 * dt;
      const nx = scarabeo.x + Math.cos(scarabeo.a) * 0.14 * dt, nz = scarabeo.z + Math.sin(scarabeo.a) * 0.14 * dt;
      if (!libero(nx, nz, 0.15) || colonie.some(q => Math.hypot(nx - q.casa.x, nz - q.casa.y) < 0.6)) scarabeo.a += dt * 2.5; else { scarabeo.x = nx; scarabeo.z = nz; }
      scarabeo.o.position.set(scarabeo.x, altezza(scarabeo.x, scarabeo.z) + Math.abs(Math.sin(s * 12)) * 0.005, scarabeo.z);
      scarabeo.o.rotation.y = -scarabeo.a;
    }
    // Coccinelle: camminano; ogni tanto volano ad arco in un altro punto
    coccinelle.forEach(b => {
      if (b.vola > 0) {
        b.vola = Math.min(1, b.vola + dt / 2.5);
        const t = b.vola, x = THREE.MathUtils.lerp(b.da.x, b.a2.x, t), z = THREE.MathUtils.lerp(b.da.y, b.a2.y, t);
        b.o.position.set(x, altezza(x, z) + Math.sin(t * Math.PI) * 0.9, z);
        b.corpo.scale.set(1, 1, 1 + Math.sin(s * 40) * 0.25);
        if (t >= 1) { b.vola = 0; b.x = b.a2.x; b.z = b.a2.y; b.prossimo = 15 + r() * 20; b.corpo.scale.set(1, 1, 1); }
        return;
      }
      b.prossimo -= dt;
      b.a += (r() - 0.5) * 2 * dt;
      const nx = b.x + Math.cos(b.a) * 0.06 * dt, nz = b.z + Math.sin(b.a) * 0.06 * dt;
      if (!libero(nx, nz, 0.05)) b.a += 1; else { b.x = nx; b.z = nz; }
      b.o.position.set(b.x, altezza(b.x, b.z), b.z);
      b.o.rotation.y = -b.a;
      if (b.prossimo <= 0) {
        const a = r() * 6, d = 0.8 + r() * 3.2;
        b.da.set(b.x, b.z); b.a2.set(Math.cos(a) * d, Math.sin(a) * d); b.vola = 0.001;
        b.a = Math.atan2(b.a2.y - b.z, b.a2.x - b.x); b.o.rotation.y = -b.a;
      }
    });
    // Cavallette: ferme qualche secondo, poi un salto lungo
    cavallette.forEach(h => {
      if (h.salto > 0) {
        h.salto = Math.min(1, h.salto + dt / 0.55);
        const t = h.salto, x = THREE.MathUtils.lerp(h.da.x, h.a2.x, t), z = THREE.MathUtils.lerp(h.da.y, h.a2.y, t);
        h.o.position.set(x, altezza(x, z) + Math.sin(t * Math.PI) * 0.35, z);
        if (t >= 1) { h.salto = 0; h.x = h.a2.x; h.z = h.a2.y; h.attesa = 2 + r() * 5; }
        return;
      }
      h.attesa -= dt;
      h.o.position.set(h.x, altezza(h.x, h.z), h.z);
      if (h.attesa <= 0) {
        let a = h.a + (r() - 0.5) * 1.5, x = h.x + Math.cos(a) * 0.7, z = h.z + Math.sin(a) * 0.7;
        if (Math.hypot(x, z) > R - 0.5) { a = Math.atan2(-h.z, -h.x); x = h.x + Math.cos(a) * 0.7; z = h.z + Math.sin(a) * 0.7; }
        h.a = a; h.da.set(h.x, h.z); h.a2.set(x, z); h.salto = 0.001;
        h.o.rotation.y = -a;
      }
    });
    // Farfalle: giri larghi in alto, poi si posano su un fiore per qualche secondo
    farfalle.forEach(b => {
      const ciclo = (s + b.fase) % 16, f = fiori[Math.floor((s + b.fase) / 16 + b.fase) % fiori.length]!;
      const fy = f.position.y + 0.3;
      let battito: number;
      if (ciclo < 11) {
        const k = ciclo / 11, a = s * 0.3 + b.fase, vola = Math.sin(k * Math.PI);
        const x = f.position.x + Math.cos(a) * 2 * vola, z = f.position.z + Math.sin(a * 1.2) * 1.6 * vola;
        b.o.lookAt(f.position.x + Math.cos(a + 0.2) * 2 * vola, fy + vola * 1.2, f.position.z + Math.sin((a + 0.2) * 1.2) * 1.6 * vola);
        b.o.position.set(x, fy + vola * (1.2 + Math.sin(s * 1.7 + b.fase) * 0.2), z);
        battito = Math.sin(s * 16 + b.fase) * 1.1;
      } else {
        b.o.position.set(f.position.x, fy, f.position.z);
        battito = 0.4 + Math.sin(s * 2 + b.fase) * 0.5;
      }
      b.ali.forEach(a => { a.q.rotation.z = a.l * battito; });
    });
  }
  return p;
}
