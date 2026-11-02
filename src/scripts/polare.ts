import * as THREE from 'three';
import { casuale, filo, scuoti, terreno, curveLivello, puntiMorbidi, palco, tema, type Palco } from './natura';

// Diorama polare ravvicinato, a filo come il bosco e il laghetto: una banchisa a più livelli (riva bassa, altopiano, una piccola cima di neve), uno scivolo
// che scende in mare, una pozza nel ghiaccio, iceberg e lastre che galleggiano. I pinguini camminano ondeggiando, si
// buttano sulla pancia giù per lo scivolo, nuotano a salti e risalgono; le foche riposano e alzano la testa, una spunta
// dalla pozza. Sotto la superficie passa un'orca: emerge, soffia, e ogni tanto salta. Il puntatore increspa l'acqua;
// un clic chiama l'orca in quel punto.

export function monta(el: HTMLElement) {
  const r = casuale(41);
  const chiaro = tema();
  const azzurroSito = getComputedStyle(document.documentElement).getPropertyValue('--azzurro').trim();
  const p = palco(el, {
    camera: new THREE.Vector3(0, 5.6, 8.4), mira: new THREE.Vector3(0, 0.1, 0.2), giro: 0.012, inclina: [-0.3, 0.35], nebbia: [1.3, 2.3], zoom: [0.45, 1.2], aggiorna, clic,
    scena: 'polare', famiglie: false, toni: [chiaro ? '#5f7f94' : '#d7e6ef', azzurroSito, chiaro ? '#d9651a' : '#ffa45e'],
  });
  const g = p.gruppo, c = p.colori;
  const [GHIACCIO, ACQUA, ACCENTO] = p.toni as [THREE.Color, THREE.Color, THREE.Color];
  const morbido = (da: number, a: number, k: number) => da + (a - da) * Math.min(1, k);
  const angolo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const liscio = THREE.MathUtils.smoothstep;
  const NERO = chiaro ? new THREE.Color('#22262c') : c.fg.clone(), BIANCO = chiaro ? new THREE.Color('#fbf9f4') : new THREE.Color('#f3f5f4');
  // Ogni pezzo è a filo: i parametri di ombra del vecchio solido non servono più
  const pieno = (geo: THREE.BufferGeometry, base: THREE.Color, _fili = 0, soglia = 28, _ombra = 0, _luce = 0) => filo(geo, base, 0.85, soglia);

  // --- Banchisa: un campo che vale più di zero sul ghiaccio; la quota sale a gradini dolci
  const CENTRO = new THREE.Vector2(-0.8, -0.5);
  const campo = (x: number, z: number) => {
    const onde = 0.1 * Math.sin(x * 2.3 + z * 1.1) + 0.06 * Math.sin(x * 5.1 - z * 3.7) + 0.03 * Math.sin(x * 9 + z * 8);
    const blocco = Math.max(1 - Math.hypot(x - CENTRO.x, z - CENTRO.y) / 3.3, 1 - Math.hypot(x - 2.0, z + 1.5) / 1.8, 1 - Math.hypot(x + 2.5, z - 1.5) / 1.5);
    const pozza = 1 - Math.hypot((x - 0.75) / 0.62, (z - 0.45) / 0.46);
    return blocco + onde * 0.55 - Math.max(0, pozza) * 1.1;
  };
  // Scivolo: un corridoio dolce dall'altopiano al mare; rampa: un corridoio fra riva e altopiano alto
  const SCIVOLO_X = -0.9;
  const quota = (x: number, z: number) => {
    const f = campo(x, z);
    if (f <= 0) return Math.max(-0.6, f * 3);
    const corridoio = 1 - liscio(Math.abs(x - SCIVOLO_X), 0.42, 0.75);
    const sulLatoMare = liscio(z, 0.7, 1.3);
    const scogliera = liscio(f, 0, 0.05), dolce = liscio(f, 0, 0.3);
    let h = 0.28 * THREE.MathUtils.lerp(scogliera, dolce, corridoio * sulLatoMare);
    const rampa = 1 - liscio(Math.abs(z + 1.2), 0.3, 0.6);
    h += 0.3 * THREE.MathUtils.lerp(liscio(f, 0.42, 0.47), liscio(f, 0.2, 0.62), rampa);
    h += 0.22 * liscio(f, 0.72, 0.84) + 0.015 * Math.sin(x * 7) * Math.cos(z * 6);
    return h;
  };
  {
    // Superficie tenue: solo sopra l'acqua
    const N = 110, LATO = 6, passo = (LATO * 2) / N, pos: number[] = [], falesia: number[] = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x0 = -LATO + i * passo, z0 = -LATO + j * passo, x1 = x0 + passo, z1 = z0 + passo;
      const a = quota(x0, z0), b = quota(x1, z0), c2 = quota(x1, z1), d = quota(x0, z1);
      if (Math.max(a, b, c2, d) <= 0.005) continue;
      pos.push(x0, Math.max(a, 0), z0, x0, Math.max(d, 0), z1, x1, Math.max(b, 0), z0, x1, Math.max(b, 0), z0, x0, Math.max(d, 0), z1, x1, Math.max(c2, 0), z1);
      // Falesia: tratti verticali dove il ghiaccio cade in mare, uno ogni due celle
      if ((i + j) % 2 === 0 && a > 0.12 && Math.min(b, c2, d) < 0.03) falesia.push(x0, a, z0, x0, 0, z0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: GHIACCIO, transparent: true, opacity: chiaro ? 0.16 : 0.09, depthWrite: false, side: THREE.DoubleSide })));
    const linee = (xyz: number[], op: number) => {
      const q = new THREE.BufferGeometry();
      q.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
      g.add(new THREE.LineSegments(q, new THREE.LineBasicMaterial({ color: GHIACCIO, transparent: true, opacity: op })));
    };
    // Curve di livello: la riva, le terrazze e la cima; più la falesia
    const { minori, maggiori } = curveLivello(quota, LATO, 170, 0.1, 1, 3, 0.015);
    linee(minori, 0.55); linee(maggiori, 0.95); linee(falesia, 0.5);
  }

  // --- Mare: griglia di punti come nelle altre scene, velo azzurro che sfuma verso il bordo
  terreno(g, ACQUA, 7.6, () => 0.005);
  const veloMare = (() => {
    const tela = document.createElement('canvas');
    tela.width = tela.height = 128;
    const ctx = tela.getContext('2d')!, v = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
    v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.75, 'rgba(255,255,255,0.75)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(tela);
  })();
  const mare = new THREE.Mesh(new THREE.CircleGeometry(8, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: veloMare, color: ACQUA, transparent: true, opacity: chiaro ? 0.14 : 0.1, depthWrite: false }));
  mare.renderOrder = 1;
  g.add(mare);
  // Trattini chiari che scorrono piano sull'acqua
  const CRESTE = p.telefono ? 50 : 100, creste = Array.from({ length: CRESTE }, () => { const a = r() * 6.28, d = 2 + Math.sqrt(r()) * 5.2; return { x: Math.cos(a) * d, z: Math.sin(a) * d, f: r() * 6, l: 0.1 + r() * 0.16 }; });
  const posCreste = new Float32Array(CRESTE * 6), geoCreste = new THREE.BufferGeometry();
  geoCreste.setAttribute('position', new THREE.BufferAttribute(posCreste, 3));
  const lineeCreste = new THREE.LineSegments(geoCreste, new THREE.LineBasicMaterial({ color: ACQUA.clone().lerp(c.fg, 0.45), transparent: true, opacity: 0.45, depthWrite: false }));
  lineeCreste.frustumCulled = false;
  lineeCreste.renderOrder = 2;
  g.add(lineeCreste);
  // Cerchi sull'acqua: pinguini che si tuffano, orca, puntatore
  const geoAnello = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 28 }, (_, k) => new THREE.Vector3(Math.cos(k / 28 * Math.PI * 2), 0, Math.sin(k / 28 * Math.PI * 2))));
  const anelli = Array.from({ length: 18 }, () => {
    const m = new THREE.LineBasicMaterial({ color: ACQUA.clone().lerp(c.fg, 0.5), transparent: true, opacity: 0, depthWrite: false }), l = new THREE.LineLoop(geoAnello, m);
    l.position.y = 0.012; l.renderOrder = 2; g.add(l);
    return { l, m, t: 1, largo: 0.3 };
  });
  let prossimoAnello = 0;
  const anello = (x: number, z: number, largo = 0.3) => { const q = anelli[prossimoAnello++ % anelli.length]!; q.l.position.x = x; q.l.position.z = z; q.t = 0; q.largo = largo; };
  // Spruzzi: gocce che salgono e ricadono
  const SPRUZZI = 90, spruzzi = puntiMorbidi(SPRUZZI), gocce = Array.from({ length: SPRUZZI }, () => ({ vx: 0, vy: 0, vz: 0, vita: 0 }));
  for (let i = 0; i < SPRUZZI; i++) { spruzzi.dim[i] = 0.05 + r() * 0.05; spruzzi.col.set(chiaro ? ACQUA.clone().lerp(c.fg, 0.2).toArray() : [0.92, 0.97, 1], i * 3); spruzzi.alfa[i] = 0; }
  g.add(spruzzi.punti);
  let prossimaGoccia = 0;
  const spruzza = (x: number, y: number, z: number, n: number, forza: number) => {
    for (let k = 0; k < n; k++) {
      const i = prossimaGoccia++ % SPRUZZI, q = gocce[i]!, a = r() * 6.28, d = r() * forza * 0.35;
      spruzzi.pos.set([x, y, z], i * 3);
      q.vx = Math.cos(a) * d; q.vz = Math.sin(a) * d; q.vy = forza * (0.5 + r() * 0.6); q.vita = 1;
    }
  };

  // --- Iceberg: blocchi sfaccettati e bassi nel mare; lastre piatte che dondolano
  const blocco = (raggio: number, alto: number) => {
    const geo = scuoti(new THREE.IcosahedronGeometry(raggio, 1), raggio * 0.4, r).scale(1.25, alto, 1);
    return pieno(geo, GHIACCIO.clone().lerp(ACQUA, 0.12), 0.35, 25, 0.58, 0.48);
  };
  const galleggia: { o: THREE.Object3D; x: number; z: number; y: number; f: number }[] = [];
  ([[4.3, -3.2, 0.95, 1.05], [-5, -2.8, 0.7, 0.95], [4.7, 2.2, 0.5, 0.8], [-1.6, -5.1, 0.55, 0.85]] as const).forEach(([x, z, raggio, alto]) => {
    const o = blocco(raggio, alto);
    o.position.set(x, raggio * 0.2, z);
    o.rotation.y = r() * 6;
    g.add(o);
    galleggia.push({ o, x, z, y: raggio * 0.2, f: r() * 6 });
  });
  const lastra = (raggio: number) => pieno(scuoti(new THREE.CylinderGeometry(raggio, raggio * 0.92, 0.16, 9), 0.08, r), GHIACCIO, 0.3, 25, 0.62, 0.42);
  const lastre = ([[2.9, 2.8, 0.62], [-3.9, 2.9, 0.5], [3.7, 0.3, 0.42], [1.7, 4.1, 0.34], [-4.5, 0.2, 0.36]] as const).map(([x, z, raggio]) => {
    const o = lastra(raggio);
    o.position.set(x, 0.03, z);
    o.rotation.y = r() * 6;
    g.add(o);
    const q = { o, x, z, y: 0.03, f: r() * 6 };
    galleggia.push(q);
    return q;
  });

  // --- Pinguini: corpo scuro, pancia bianca, becco e piedi nel colore d'accento; pinne che si muovono
  const modelloPinguino = (() => {
    const o = new THREE.Group();
    const corpo = pieno(new THREE.SphereGeometry(0.075, 10, 7).scale(1, 1.55, 0.9), NERO, 0, 30, 0.75, 0.5);
    corpo.position.y = 0.135; corpo.name = 'corpo';
    const pancia = pieno(new THREE.SphereGeometry(0.058, 8, 6).scale(0.95, 1.5, 0.75), BIANCO, 0, 30, 0.72, 0.35);
    pancia.position.set(0, 0.125, 0.024);
    const testa = new THREE.Group();
    testa.name = 'testa'; testa.position.y = 0.26;
    testa.add(pieno(new THREE.SphereGeometry(0.047, 8, 6), NERO, 0, 30, 0.75, 0.5));
    const becco = pieno(new THREE.ConeGeometry(0.014, 0.05, 5).rotateX(Math.PI / 2), ACCENTO, 0, 30, 0.9, 0.2);
    becco.position.set(0, -0.004, 0.058);
    testa.add(becco);
    for (const l of [-1, 1]) {
      const macchia = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), new THREE.MeshBasicMaterial({ color: BIANCO }));
      macchia.position.set(l * 0.026, 0.016, 0.034);
      testa.add(macchia);
      const pinna = new THREE.Group();
      pinna.name = l < 0 ? 'pinnaS' : 'pinnaD';
      pinna.position.set(l * 0.07, 0.19, 0);
      const lama = pieno(new THREE.BoxGeometry(0.012, 0.1, 0.035).translate(0, -0.05, 0), NERO, 0, 30, 0.75, 0.5);
      pinna.add(lama);
      o.add(pinna);
      const piede = pieno(new THREE.BoxGeometry(0.03, 0.01, 0.05), ACCENTO, 0, 30, 0.9, 0.2);
      piede.position.set(l * 0.032, 0.006, 0.018);
      o.add(piede);
    }
    o.add(corpo, pancia, testa);
    return o;
  })();
  type Stato = 'fermo' | 'cammina' | 'allo_scivolo' | 'scivola' | 'nuota' | 'torna' | 'esce';
  type Pinguino = { o: THREE.Group; testa: THREE.Object3D; pinnaS: THREE.Object3D; pinnaD: THREE.Object3D; x: number; z: number; y: number; vy: number; verso: number; vel: number; stato: Stato; timer: number; mx: number; mz: number; fase: number; passo: number; piega: number; scala: number };
  const sopraGhiaccio = (dove: { x: number; z: number }) => {
    for (let k = 0; k < 40; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * 3, x = CENTRO.x + Math.cos(a) * d, z = CENTRO.y + Math.sin(a) * d; if (quota(x, z) > 0.26) { dove.x = x; dove.z = z; return; } }
  };
  const PINGUINI = p.telefono ? 12 : 20;
  const pinguini: Pinguino[] = Array.from({ length: PINGUINI }, (_, k) => {
    const o = modelloPinguino.clone(true), scala = k % 6 === 5 ? 0.7 : 0.92 + r() * 0.2;
    o.scale.setScalar(scala);
    g.add(o);
    const q = { x: 0, z: 0 };
    sopraGhiaccio(q);
    return { o, testa: o.getObjectByName('testa')!, pinnaS: o.getObjectByName('pinnaS')!, pinnaD: o.getObjectByName('pinnaD')!, x: q.x, z: q.z, y: quota(q.x, q.z), vy: 0, verso: r() * 6, vel: 0, stato: 'fermo', timer: r() * 5, mx: q.x, mz: q.z, fase: r() * 6, passo: 0, piega: 0, scala };
  });

  // --- Foche: corpo affusolato, testa, pinne; riposano, alzano la testa, ogni tanto strisciano un poco
  const modelloFoca = (() => {
    const o = new THREE.Group(), tinta = new THREE.Color(chiaro ? '#7c8892' : '#8f9ba6');
    const geo = new THREE.SphereGeometry(1, 14, 8), q = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < q.count; i++) {
      const x = q.getX(i), t = (x + 1) / 2, k = 0.35 + Math.sin(t * Math.PI) ** 0.7 * 0.65;
      q.setXYZ(i, x * 0.23, q.getY(i) * 0.075 * k + 0.07, q.getZ(i) * 0.085 * k);
    }
    const corpo = pieno(geo, tinta, 0, 30, 0.7, 0.55);
    corpo.name = 'corpo';
    o.add(corpo);
    for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.012 + r() * 0.012, 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: tinta.clone().multiplyScalar(0.62) })); m.position.set((r() - 0.5) * 0.3, 0.138, (r() - 0.5) * 0.06); o.add(m); }
    const testa = new THREE.Group();
    testa.name = 'testa'; testa.position.set(0.2, 0.09, 0);
    testa.add(pieno(new THREE.SphereGeometry(0.05, 8, 6).scale(1.2, 0.9, 0.9), tinta, 0, 30, 0.75, 0.5));
    for (const l of [-1, 1]) { const occhio = new THREE.Mesh(new THREE.SphereGeometry(0.008, 5, 4), new THREE.MeshBasicMaterial({ color: '#16181c' })); occhio.position.set(0.035, 0.018, l * 0.03); testa.add(occhio); }
    o.add(testa);
    for (const l of [-1, 1]) { const pinna = pieno(new THREE.BoxGeometry(0.07, 0.008, 0.035), tinta, 0, 30, 0.6, 0.4); pinna.position.set(0.09, 0.02, l * 0.08); pinna.rotation.y = l * 0.5; o.add(pinna); }
    const coda = new THREE.Group();
    coda.name = 'coda'; coda.position.set(-0.22, 0.07, 0);
    coda.add(pieno(new THREE.ConeGeometry(0.04, 0.09, 4).rotateZ(Math.PI / 2).scale(1, 0.25, 1), tinta, 0, 30, 0.6, 0.4));
    o.add(coda);
    return o;
  })();
  type Foca = { o: THREE.Group; testa: THREE.Object3D; coda: THREE.Object3D; corpo: THREE.Object3D; x: number; z: number; verso: number; timer: number; alza: number; striscia: number; fase: number };
  const foca = (x: number, z: number, verso: number, padre: THREE.Object3D = g, y = quota(x, z)): Foca => {
    const o = modelloFoca.clone(true);
    o.position.set(x, y, z);
    o.rotation.y = verso;
    padre.add(o);
    return { o, testa: o.getObjectByName('testa')!, coda: o.getObjectByName('coda')!, corpo: o.getObjectByName('corpo')!, x, z, verso, timer: r() * 8, alza: 0, striscia: 0, fase: r() * 6 };
  };
  const foche: Foca[] = [foca(1.55, -2.55, 0.8), foca(2.45, -0.8, -0.6), foca(-3.05, 2.15, 2.4), foca(-2.75, -2.65, 2.0), foca(0.6, 1.25, 1.7)];
  foche.push(foca(0, 0, 1.2, lastre[0]!.o, 0.08));
  // Foca nella pozza: la testa spunta, guarda intorno, torna giù
  const pozzaFoca = modelloFoca.clone(true);
  pozzaFoca.position.set(0.75, -0.3, 0.45);
  pozzaFoca.rotation.set(0, 0.8, Math.PI / 2 - 0.25);
  g.add(pozzaFoca);

  // --- Orca: corpo a fuso a poche facce, a filo; ventre e macchia dietro l'occhio chiari, pinna dorsale alta, pettorali e coda
  const orca = (() => {
    const o = new THREE.Group(), linea2 = chiaro ? new THREE.Color('#22262c') : c.fg.clone(), chiara = chiaro ? new THREE.Color('#fbf9f4') : new THREE.Color('#f3f5f4');
    const fuso = (larga: number, alta: number, lunga: number) => {
      const geo = new THREE.SphereGeometry(1, 12, 8).rotateX(Math.PI / 2), q = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < q.count; i++) {
        const nz = q.getZ(i), rx = q.getX(i), ry = q.getY(i), coda2 = nz < 0 ? 0.55 + 0.45 * (1 + nz) : 1;
        q.setXYZ(i, rx * larga * coda2, ry * alta * coda2, nz * lunga);
      }
      return geo;
    };
    o.add(filo(fuso(0.17, 0.19, 0.72), linea2, 0.9, 10, chiaro ? 0.45 : 0.14));
    const ventre = filo(fuso(0.11, 0.08, 0.5), chiara, 0.7, 14, chiaro ? 0.5 : 0.35);
    ventre.position.set(0, -0.11, 0.1);
    o.add(ventre);
    for (const l of [-1, 1]) { const m = filo(new THREE.SphereGeometry(0.05, 6, 4).scale(0.25, 0.6, 1.2), chiara, 0.8, 20, 0.7); m.position.set(l * 0.135, 0.06, 0.44); o.add(m); }
    const forma = new THREE.Shape();
    forma.moveTo(-0.11, 0); forma.quadraticCurveTo(-0.08, 0.2, 0.05, 0.34); forma.quadraticCurveTo(0.03, 0.16, 0.11, 0);
    const dorsale = filo(new THREE.ShapeGeometry(forma, 5).rotateY(Math.PI / 2), linea2, 0.95, 28, chiaro ? 0.45 : 0.18);
    dorsale.position.set(0, 0.16, 0.02);
    o.add(dorsale);
    for (const l of [-1, 1]) {
      const p2 = filo(new THREE.SphereGeometry(1, 6, 3).scale(0.17, 0.012, 0.07), linea2, 0.8, 20);
      p2.position.set(l * 0.21, -0.1, 0.28);
      p2.rotation.set(0, l * 0.3, l * -0.45);
      o.add(p2);
    }
    const coda = new THREE.Group();
    coda.position.z = -0.62;
    const geoCoda = new THREE.BufferGeometry();
    geoCoda.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.05, 0.24, 0, -0.14, 0.05, 0, -0.06, 0, 0, 0.05, 0.05, 0, -0.06, -0.05, 0, -0.06, 0, 0, 0.05, -0.05, 0, -0.06, -0.24, 0, -0.14], 3));
    coda.add(filo(geoCoda, linea2, 0.9, 5));
    o.add(coda);
    g.add(o);
    return { o, coda, x: 5, y: -0.38, z: 0, verso: 0, vel: 0.55, t: 6, salto: 0, conta: 0, soffio: 0, vy: 0, mx: 0, mz: 0, chiamata: 0 };
  })();

  // Neve leggera
  const NEVE = p.telefono ? 110 : 220, neve = puntiMorbidi(NEVE);
  for (let i = 0; i < NEVE; i++) {
    neve.pos.set([(r() - 0.5) * 13, r() * 5, (r() - 0.5) * 13], i * 3);
    neve.dim[i] = 0.02 + r() * 0.03;
    neve.col.set(chiaro ? c.muted.toArray() : [0.95, 0.97, 1], i * 3);
    neve.alfa[i] = 0.3 + r() * 0.5;
  }
  g.add(neve.punti);

  const pianoAcqua = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), punto = new THREE.Vector3();
  function clic(raggio: THREE.Raycaster) {
    if (!raggio.ray.intersectPlane(pianoAcqua, punto) || quota(punto.x, punto.z) > -0.02) return;
    anello(punto.x, punto.z, 0.6);
    // L'orca arriva in quel punto, fuori dal ghiaccio
    orca.mx = punto.x; orca.mz = punto.z; orca.chiamata = 7;
  }

  // Punto d'ingresso dello scivolo e di uscita dal mare
  const CIMA_SCIVOLO = new THREE.Vector2(SCIVOLO_X, 0.9), USCITA = new THREE.Vector2(SCIVOLO_X, 3.05);
  let ultimoAnello = 0;

  function aggiorna(s: number, dt: number, p: Palco) {
    // Acqua: trattini, cerchi, gocce; il puntatore increspa
    creste.forEach((q, k) => {
      const x = q.x + Math.sin(s * 0.22 + q.f) * 0.18, z = q.z + Math.cos(s * 0.17 + q.f) * 0.14, a = q.f + Math.sin(s * 0.3 + q.f) * 0.2;
      const su = quota(x, z) > -0.03 ? -5 : 0.01;
      posCreste.set([x, su, z, x + Math.cos(a) * q.l, su, z + Math.sin(a) * q.l], k * 6);
    });
    geoCreste.attributes.position!.needsUpdate = true;
    if (p.raggio && s - ultimoAnello > 0.35 && p.raggio.ray.intersectPlane(pianoAcqua, punto) && quota(punto.x, punto.z) < -0.02) { anello(punto.x, punto.z, 0.22); ultimoAnello = s; }
    anelli.forEach(q => {
      if (q.t >= 1) return;
      q.t = Math.min(1, q.t + dt / 2.2);
      q.l.scale.setScalar(0.03 + q.t * q.largo);
      q.m.opacity = (1 - q.t) * 0.75;
    });
    for (let i = 0; i < SPRUZZI; i++) {
      const q = gocce[i]!, k = i * 3;
      if (q.vita <= 0) { spruzzi.alfa[i] = 0; continue; }
      q.vita -= dt / 1.3; q.vy -= dt * 2.2;
      spruzzi.pos[k] = spruzzi.pos[k]! + q.vx * dt; spruzzi.pos[k + 1] = spruzzi.pos[k + 1]! + q.vy * dt; spruzzi.pos[k + 2] = spruzzi.pos[k + 2]! + q.vz * dt;
      spruzzi.alfa[i] = spruzzi.pos[k + 1]! < 0 ? 0 : Math.min(1, q.vita * 1.6) * 0.85;
    }
    spruzzi.aggiorna();
    galleggia.forEach(q => {
      q.o.position.set(q.x + Math.sin(s * 0.07 + q.f) * 0.12, q.y + Math.sin(s * 0.7 + q.f) * 0.018, q.z + Math.cos(s * 0.06 + q.f) * 0.1);
      q.o.rotation.x = Math.sin(s * 0.6 + q.f) * 0.018; q.o.rotation.z = Math.cos(s * 0.5 + q.f) * 0.018;
    });
    for (let i = 0; i < NEVE; i++) {
      const k = i * 3;
      let y = neve.pos[k + 1]! - dt * (0.12 + (i % 5) * 0.03), x = neve.pos[k]! + Math.sin(s * 0.4 + i) * dt * 0.08 + dt * 0.04;
      if (y < 0) y = 5;
      if (x > 6.5) x = -6.5;
      neve.pos[k] = x; neve.pos[k + 1] = y;
    }
    neve.aggiorna();

    // Pinguini
    pinguini.forEach((q, i) => {
      q.timer -= dt;
      let voluta = 0, svolta = 3;
      // Distanza dalle vicine: nessuno si sovrappone
      let sx = 0, sz = 0;
      if (q.stato === 'cammina' || q.stato === 'fermo' || q.stato === 'allo_scivolo') pinguini.forEach((o, j) => { if (j === i) return; const dx = q.x - o.x, dz = q.z - o.z, d = Math.hypot(dx, dz); if (d < 0.2 && d > 1e-3) { sx += (dx / d) * (0.2 - d); sz += (dz / d) * (0.2 - d); } });
      if (q.stato === 'fermo') {
        if (q.timer <= 0) {
          const v = r();
          if (v < 0.3) { q.stato = 'allo_scivolo'; q.mx = CIMA_SCIVOLO.x + (r() - 0.5) * 0.18; q.mz = CIMA_SCIVOLO.y; }
          else if (v < 0.8) { q.stato = 'cammina'; const m = { x: q.x, z: q.z }; const a = r() * 6.28, d = 0.4 + r() * 1.1; m.x += Math.cos(a) * d; m.z += Math.sin(a) * d; if (quota(m.x, m.z) < 0.26) sopraGhiaccio(m); q.mx = m.x; q.mz = m.z; }
          else q.timer = 2 + r() * 5;
        }
      } else if (q.stato === 'cammina' || q.stato === 'allo_scivolo') {
        voluta = 0.17;
        if (Math.hypot(q.mx - q.x, q.mz - q.z) < 0.08) {
          if (q.stato === 'allo_scivolo') { q.stato = 'scivola'; q.verso = 0; }
          else { q.stato = 'fermo'; q.timer = 2 + r() * 6; }
        }
      } else if (q.stato === 'scivola') {
        // Sulla pancia, giù per lo scivolo verso il mare
        voluta = 0.85; q.mx = SCIVOLO_X; q.mz = q.z + 1; svolta = 2;
        if (quota(q.x, q.z) < 0.015) {
          q.stato = 'nuota'; q.timer = 8 + r() * 12; q.vy = 0; q.y = -0.05;
          anello(q.x, q.z, 0.4); spruzza(q.x, 0.02, q.z, 8, 0.8);
          const a = 0.8 + r() * 1.5; q.mx = q.x + Math.cos(a) * 2; q.mz = q.z + Math.sin(a) * 2;
        }
      } else if (q.stato === 'nuota' || q.stato === 'torna') {
        voluta = 0.55; svolta = 2.2;
        if (q.stato === 'nuota') {
          if (Math.hypot(q.mx - q.x, q.mz - q.z) < 0.3 || Math.hypot(q.mx, q.mz) > 5.6 || quota(q.mx, q.mz) > -0.1) { const a = r() * 6.28, d = 3.9 + r() * 1.5; q.mx = Math.cos(a) * d; q.mz = Math.sin(a) * d; }
          if (q.timer <= 0) { q.stato = 'torna'; q.mx = USCITA.x + (r() - 0.5) * 0.3; q.mz = USCITA.y; }
        } else if (Math.hypot(q.mx - q.x, q.mz - q.z) < 0.25) { q.stato = 'esce'; q.vy = 1.1; q.verso = Math.PI; q.mx = SCIVOLO_X; q.mz = 1.5; anello(q.x, q.z, 0.3); }
      } else {
        // Risale: un balzo fuori dall'acqua, poi cammina su per lo scivolo
        voluta = 0.3; q.mx = SCIVOLO_X; q.mz = 0.9;
        if (q.y <= quota(q.x, q.z) + 0.001 && q.vy <= 0 && quota(q.x, q.z) > 0.02) { q.stato = 'cammina'; q.mx = q.x + (r() - 0.5); q.mz = 0.6 - r() * 0.6; }
      }
      q.vel = morbido(q.vel, voluta, dt * 3);
      const hx = q.mx - q.x + sx * 6, hz = q.mz - q.z + sz * 6;
      if (q.vel > 0.01) q.verso += angolo(Math.atan2(hx, hz) - q.verso) * Math.min(1, dt * svolta);
      let nx = q.x + Math.sin(q.verso) * q.vel * dt + sx * dt, nz = q.z + Math.cos(q.verso) * q.vel * dt + sz * dt;
      const inAcqua = q.stato === 'nuota' || q.stato === 'torna';
      // A piedi non si cade in mare; a nuoto si gira intorno al ghiaccio
      if (!inAcqua && q.stato !== 'scivola' && q.stato !== 'esce' && quota(nx, nz) < 0.2) { q.mx = CENTRO.x; q.mz = CENTRO.y; nx = q.x; nz = q.z; }
      if (inAcqua && quota(nx, nz) > -0.12 && !(q.stato === 'torna' && Math.hypot(q.mx - nx, q.mz - nz) < 0.5)) {
        const dx = nx - CENTRO.x, dz = nz - CENTRO.y, d = Math.hypot(dx, dz) || 1;
        q.verso += angolo(Math.atan2(-dz / d, dx / d) - q.verso) * Math.min(1, dt * 5);
        nx = q.x + (dx / d) * dt * 0.4; nz = q.z + (dz / d) * dt * 0.4;
      }
      q.x = nx; q.z = nz;
      q.passo += q.vel * dt;
      // Quota e posa
      const suolo = quota(q.x, q.z);
      let inclina = 0, ondeggia = 0;
      if (inAcqua) {
        // Nuoto a balzi: ogni tanto esce dall'acqua in un piccolo arco
        const fase = q.passo * 2.2 + q.fase, balzo = Math.max(0, Math.sin(fase)) ** 3;
        q.y = -0.09 + balzo * 0.2;
        inclina = Math.PI / 2 - Math.cos(fase) * 0.5 * balzo;
        if (balzo < 0.02 && Math.sin(fase) > 0 && Math.sin(fase) < 0.25 && r() < dt * 3) anello(q.x, q.z, 0.14);
      } else if (q.stato === 'esce') {
        q.vy -= dt * 3.2; q.y += q.vy * dt;
        if (q.y < suolo) { q.y = suolo; q.vy = 0; }
        inclina = 0.4;
      } else if (q.stato === 'scivola') { q.y = Math.max(suolo, 0.01) + 0.05; inclina = Math.PI / 2 - 0.1; }
      else { q.y = suolo + Math.abs(Math.sin(q.passo * 32)) * 0.012; ondeggia = Math.sin(q.passo * 32) * 0.16 * Math.min(1, q.vel / 0.1); }
      q.piega = morbido(q.piega, inclina, dt * 6);
      q.o.position.set(q.x, q.y, q.z);
      q.o.rotation.set(q.piega, q.verso, ondeggia, 'YXZ');
      // Pinne: battono nuotando, aperte in scivolata; fermo, ogni tanto si scrolla. Testa che si gira.
      const batte = inAcqua ? Math.sin(s * 11 + q.fase) * 0.8 : q.stato === 'scivola' ? 0.5 : Math.sin(q.passo * 32) * 0.25 + (q.stato === 'fermo' && Math.sin(s * 0.5 + q.fase) > 0.97 ? Math.sin(s * 22) * 0.7 : 0);
      q.pinnaS.rotation.z = -0.15 - batte; q.pinnaD.rotation.z = 0.15 + batte;
      q.testa.rotation.y = Math.sin(s * 0.5 + q.fase) * 0.6;
      q.testa.rotation.x = q.stato === 'scivola' ? -0.9 : 0;
    });

    // Foche: alzano la testa e la coda, respirano; ogni tanto strisciano un poco
    foche.forEach((f, k) => {
      f.timer -= dt;
      if (f.timer <= 0) { f.timer = 5 + r() * 9; f.alza = r() < 0.6 ? 1 : 0; if (r() < 0.25 && k < 5) f.striscia = 3; }
      f.testa.rotation.z = morbido(f.testa.rotation.z, f.alza ? 0.75 : 0, dt * 1.5);
      f.testa.rotation.x = f.alza ? Math.sin(s * 0.8 + f.fase) * 0.35 : 0;
      f.coda.rotation.z = Math.sin(s * 0.4 + f.fase) * 0.15 + (f.alza ? -0.35 : 0);
      f.corpo.scale.y = 1 + Math.sin(s * 0.9 + f.fase) * 0.03;
      if (f.striscia > 0 && k < 5) {
        f.striscia -= dt;
        const onda = Math.sin(s * 5 + f.fase), nx = f.x + Math.cos(f.verso) * Math.max(0, onda) * dt * 0.08, nz = f.z - Math.sin(f.verso) * Math.max(0, onda) * dt * 0.08;
        if (quota(nx, nz) > 0.2) { f.x = nx; f.z = nz; f.o.position.set(nx, quota(nx, nz), nz); } else f.verso += 2;
        f.o.rotation.y = f.verso;
        f.corpo.scale.y = 1 + onda * 0.14;
      }
    });
    const pp = (s % 16) / 16, spunta = pp > 0.55 && pp < 0.9 ? Math.sin(((pp - 0.55) / 0.35) * Math.PI) : 0;
    pozzaFoca.position.y = -0.34 + Math.min(1, spunta * 2) * 0.27;
    pozzaFoca.rotation.y = 0.8 + Math.sin(s * 0.7) * 0.5;
    if (spunta > 0 && spunta < 0.08) anello(0.75, 0.45, 0.22);

    // Orca: gira larga intorno alla banchisa sott'acqua; ogni tanto sale a soffiare, ogni tre volte salta
    const o = orca;
    o.t -= dt;
    o.chiamata = Math.max(0, o.chiamata - dt);
    const ang = Math.atan2(o.z, o.x), giroX = Math.cos(ang + 0.35) * 5.2, giroZ = Math.sin(ang + 0.35) * 5;
    const mx = o.chiamata > 0 ? o.mx : giroX, mz = o.chiamata > 0 ? o.mz : giroZ;
    let quotaVoluta = -0.42, pendio = 0;
    if (o.salto <= 0 && o.t <= 0) {
      o.conta++;
      if (o.conta % 3 === 0) { o.salto = 0.001; o.vy = 2.55; spruzza(o.x, 0.02, o.z, 16, 1.1); anello(o.x, o.z, 0.9); }
      o.t = 13 + r() * 8;
    }
    if (o.salto > 0) {
      // Salto: esce tutta in un arco e ricade con uno spruzzo
      o.salto += dt; o.vy -= dt * 3.2; o.y += o.vy * dt; pendio = Math.atan2(o.vy, o.vel + 0.7);
      if (o.y < -0.3 && o.vy < 0) { o.salto = 0; spruzza(o.x, 0.02, o.z, 24, 1.3); anello(o.x, o.z, 1.2); anello(o.x + 0.2, o.z, 0.7); }
    } else {
      // Risalita per respirare: la schiena e la pinna escono, soffia
      const respiro = o.t < 3.2 ? Math.sin((o.t / 3.2) * Math.PI) : 0;
      quotaVoluta = -0.42 + respiro * 0.42;
      const prima = o.y;
      o.y = morbido(o.y, quotaVoluta + Math.sin(s * 0.8) * 0.02, dt * 1.4);
      pendio = (o.y - prima) / Math.max(dt, 0.001) * 0.5;
      if (respiro > 0.92 && o.soffio <= 0) { spruzza(o.x + Math.sin(o.verso) * 0.3, 0.2, o.z + Math.cos(o.verso) * 0.3, 14, 1.25); anello(o.x, o.z, 0.5); o.soffio = 2; }
      o.soffio = Math.max(0, o.soffio - dt);
    }
    o.verso += angolo(Math.atan2(mx - o.x, mz - o.z) - o.verso) * Math.min(1, dt * 0.8);
    let ox = o.x + Math.sin(o.verso) * o.vel * dt, oz = o.z + Math.cos(o.verso) * o.vel * dt;
    if (quota(ox, oz) > -0.5) { const dx = ox - CENTRO.x, dz = oz - CENTRO.y, d = Math.hypot(dx, dz) || 1; ox += (dx / d) * dt * 0.6; oz += (dz / d) * dt * 0.6; o.verso += angolo(Math.atan2(dx, dz) - o.verso) * Math.min(1, dt * 2); }
    o.x = ox; o.z = oz;
    o.o.position.set(o.x, o.y, o.z);
    o.o.rotation.set(-THREE.MathUtils.clamp(pendio, -1.2, 1.2), o.verso, 0, 'YXZ');
    o.coda.rotation.x = Math.sin(s * 2.4) * 0.35;
  }
  return p;
}
