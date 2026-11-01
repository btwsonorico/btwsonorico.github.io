import * as THREE from 'three';
import { casuale, mat, pezzo, sasso, linea, terreno, puntiMorbidi, palco, SITO, type Palco } from './natura';

// Una valle ampia di colline vista da un drone, nello stile del sito: le colline sono curve di livello, fra le
// curve la griglia di punti. Su una collina un mulino, su altre le pale eoliche; boschetti e cespugli sui pendii.
// Un gregge di pecore minuscole pascola e si muove come una massa; un clic manda il cane in quel punto e il gregge
// si sposta insieme, si apre intorno agli ostacoli e si richiude. Quando smetti, il pastore fischia e il cane torna.
// Sopra passano nuvole fatte di migliaia di punti, e le loro ombre scorrono sulle colline. Il giorno gira:
// alba e tramonto lunghi, di notte la valle si scurisce, si accendono le finestre e le luci delle pale; abbassando
// lo sguardo verso l'orizzonte si vedono stelle, costellazioni, stelle cadenti e la luna con la sua fase.

const GIORNO = 'misc-giorno';
const L = 12;

export function monta(el: HTMLElement) {
  const r = casuale(23);
  const p = palco(el, {
    camera: new THREE.Vector3(0, 14.6, 12.2), mira: new THREE.Vector3(0, 0.6, 0.5), giro: 0.006, inclina: [-0.62, 0.3], nebbia: [1.0, 2.1], zoom: [0.35, 1.25], aggiorna, clic,
    scena: 'nuvole', toni: SITO,
  });
  const g = p.gruppo, c = p.colori;
  const morbido = (da: number, a: number, k: number) => da + (a - da) * Math.min(1, k);
  const angolo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

  // --- Colline: somma di colli dolci più un'ondulazione leggera; il fondovalle è al centro
  const COLLI = [[-6, -5, 2.4, 3.2], [5, -6, 2.8, 3.6], [7.5, 3, 2.0, 3], [-7, 4.5, 2.2, 3.3], [0.5, -10, 1.8, 3.2], [1.5, 8.5, 1.6, 2.8], [-1.5, -1.5, 0.5, 2.2], [10, -2, 1.4, 2.5], [-10.5, -1, 1.6, 2.6]] as const;
  const altezza = (x: number, z: number) => {
    let h = 0.12 * Math.sin(x * 0.6 + 1) * Math.cos(z * 0.5) + 0.06 * Math.sin(x * 1.3 - z * 1.1) + 0.15;
    for (const [cx, cz, alto, largo] of COLLI) h += alto * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * largo * largo));
    return h;
  };
  terreno(g, c.verde, L + 0.5, altezza);
  // Curve di livello (marching squares sulla griglia delle altezze): una ogni 0,2 di quota, più marcata ogni 1
  {
    const N = 170, passo = (L * 2) / N, H: number[] = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) H.push(altezza(-L + i * passo, -L + j * passo));
    const minori: number[] = [], maggiori: number[] = [];
    for (let livello = 0.2, n = 1; livello < 4; livello += 0.2, n++) {
      const dove = n % 5 === 0 ? maggiori : minori;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x0 = -L + i * passo, z0 = -L + j * passo;
        if (Math.hypot(x0, z0) > L) continue;
        const v = [H[j * (N + 1) + i]!, H[j * (N + 1) + i + 1]!, H[(j + 1) * (N + 1) + i + 1]!, H[(j + 1) * (N + 1) + i]!];
        const angoli = [[x0, z0], [x0 + passo, z0], [x0 + passo, z0 + passo], [x0, z0 + passo]];
        // Lati attraversati dal livello: punto di passaggio interpolato su ogni lato
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

  // --- Mulino sul colle a ovest: torre a otto lati, tetto a cono, pale a graticcio; finestre che di notte si accendono
  const mulino = new THREE.Group();
  mulino.add(pezzo(new THREE.CylinderGeometry(0.3, 0.44, 1.5, 8), mat('#d8cfba'), 0, 0.75, 0));
  mulino.add(pezzo(new THREE.ConeGeometry(0.4, 0.5, 8), mat('#e08a3a'), 0, 1.75, 0));
  const finestre = ([[0.8, 0.35], [1.15, 0.33]] as const).map(([y, z]) => pezzo(new THREE.BoxGeometry(0.1, 0.13, 0.03), mat('#f2b62f', { opacity: 0.2 }), 0, y, z));
  finestre.forEach(f => { f.renderOrder = 12; mulino.add(f); });
  const mozzo = new THREE.Group();
  mozzo.position.set(0, 1.5, 0.44);
  for (let k = 0; k < 4; k++) {
    const pala = new THREE.Group();
    pala.rotation.z = (k / 4) * Math.PI * 2;
    pala.add(pezzo(new THREE.BoxGeometry(0.03, 1.1, 0.025), mat('#7a5230'), 0, 0.6, 0.03));
    const graticcio: THREE.Vector3[] = [];
    for (let q = 0; q <= 6; q++) { const y = 0.27 + q * 0.14; graticcio.push(new THREE.Vector3(0.02, y, 0.05), new THREE.Vector3(0.24, y, 0.05)); }
    pala.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(graticcio), linea('#7a5230', 0.8)));
    mozzo.add(pala);
  }
  mulino.add(mozzo);
  mulino.scale.setScalar(0.75);
  posa(mulino, -6, -5, 0.45).rotation.y = 0.6;
  mulino.position.y -= 0.05;

  // --- Pale eoliche sulle colline: torre alta e sottile, gondola, tre pale lunghe; di notte una luce rossa in cima
  const eoliche = ([[5, -6], [7.5, 3], [-7, 4.5], [10, -2], [4.2, -7.6]] as const).map(([x, z], k) => {
    const o = new THREE.Group(), bianco = mat('#e8e6e0', { opacity: 0.25 });
    o.add(pezzo(new THREE.CylinderGeometry(0.025, 0.06, 1.8, 6), bianco, 0, 0.9, 0));
    o.add(pezzo(new THREE.BoxGeometry(0.15, 0.08, 0.08), bianco, 0, 1.83, 0));
    const rotore = new THREE.Group();
    rotore.position.set(0, 1.83, 0.06);
    for (let q = 0; q < 3; q++) {
      const pala = pezzo(new THREE.BoxGeometry(0.045, 0.8, 0.01).translate(0, 0.42, 0), bianco);
      pala.rotation.z = (q / 3) * Math.PI * 2;
      rotore.add(pala);
    }
    o.add(rotore);
    o.rotation.y = 0.4;
    posa(o, x, z, 0.2);
    return { rotore, vel: 0.9 + k * 0.17, fase: r() * 6 };
  });
  const luciEoliche = puntiMorbidi(eoliche.length);
  eoliche.forEach((e, k) => {
    e.rotore.parent!.updateMatrixWorld();
    const q = new THREE.Vector3(0, 1.9, 0).applyMatrix4(e.rotore.parent!.matrixWorld);
    luciEoliche.pos.set(q.toArray(), k * 3);
    luciEoliche.dim[k] = 0.35;
    luciEoliche.col.set([1, 0.2, 0.15], k * 3);
    luciEoliche.alfa[k] = 0;
  });
  luciEoliche.punti.renderOrder = 12;
  g.add(luciEoliche.punti);

  // --- Boschetti sui pendii e cespugli sparsi: il gregge ci gira intorno
  const chiome = [mat('#6fa646'), mat('#5f9c45'), mat('#4f8a3c')], tronco = mat('#7a5230');
  ([[3, -2, 10], [-3.5, 3.5, 12], [8.5, -4.5, 8], [-4, -8.5, 9], [2.5, 4.5, 7], [-9, 1.5, 8], [6, 7, 6]] as const).forEach(([cx, cz, n]) => {
    for (let k = 0; k < n; k++) {
      const a = r() * 6, d = Math.sqrt(r()) * 1.3, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, h = 0.28 + r() * 0.2;
      const o = new THREE.Group();
      o.add(pezzo(new THREE.CylinderGeometry(0.015, 0.025, h * 0.5, 4), tronco, 0, h * 0.25, 0));
      if (r() < 0.5) o.add(pezzo(new THREE.ConeGeometry(h * 0.35, h * 0.8, 6), chiome[k % 3]!, 0, h * 0.75, 0));
      else o.add(pezzo(sasso(h * 0.32, r), chiome[k % 3]!, 0, h * 0.7, 0));
      posa(o, x, z, 0.16);
    }
  });
  for (let k = 0; k < 45; k++) {
    const a = r() * 6, d = 2 + r() * 8.5, x = Math.cos(a) * d, z = Math.sin(a) * d, rr = 0.06 + r() * 0.07;
    posa(pezzo(sasso(rr, r), chiome[k % 3]!), x, z, rr + 0.05).scale.y = 0.7;
  }

  // --- Pastore vicino al mulino; il fischio sono tre archi che si allargano
  const PASTORE = new THREE.Vector2(-4.4, -3.4);
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
  const PECORE = p.telefono ? 80 : 130;
  const corpi = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4).scale(0.075, 0.045, 0.05), mat(p.chiaro ? '#fbf9f4' : '#f2efe8', { grezzo: true, opacity: p.chiaro ? 1 : 0.9, fili: 0 }), PECORE);
  const teste = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 3).scale(0.03, 0.025, 0.025), mat('#3a332c', { grezzo: true, opacity: 0.9, fili: 0 }), PECORE);
  corpi.frustumCulled = teste.frustumCulled = false;
  g.add(corpi, teste);
  type Pecora = { x: number; z: number; vx: number; vz: number; verso: number; calma: number; timer: number; voglia: number; testa: number; fase: number };
  const pecore: Pecora[] = Array.from({ length: PECORE }, () => {
    const a = r() * 6, d = Math.sqrt(r()) * 1.6;
    return { x: 0.5 + Math.cos(a) * d, z: 2.5 + Math.sin(a) * d * 0.8, vx: 0, vz: 0, verso: r() * 6, calma: 1, timer: r() * 6, voglia: 0, testa: 1, fase: r() * 6 };
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
    for (let t = 0; t < 80; t += 0.05) {
      punto.copy(o).addScaledVector(d, t);
      if (punto.y <= altezza(punto.x, punto.z)) return true;
    }
    return false;
  };
  function clic(raggio: THREE.Raycaster) {
    if (!sulTerreno(raggio) || Math.hypot(punto.x, punto.z) > L - 1.5) return;
    metaCane.set(punto.x, punto.z);
    ultimoClic = ora;
    richiamato = false;
  }

  // --- Nuvole: point cloud densa, in alto sopra la valle; ogni punto ricorda il suo posto e torna dopo la spinta
  type Nuvola = { x: number; y: number; z: number; vel: number; da: number; n: number; largo: number };
  const nuvole: Nuvola[] = [];
  const QUANTE = 8, PER = p.telefono ? 1400 : 3200, N = QUANTE * PER;
  const base = new Float32Array(N * 3), spinta = new Float32Array(N * 3), posNuvole = new Float32Array(N * 3), colNuvole = new Float32Array(N * 3), luceNuvole = new Float32Array(N);
  for (let k = 0; k < QUANTE; k++) {
    const largo = 2 + r() * 1.8;
    const nv: Nuvola = { x: -16 + k * 4.2 + r() * 1.5, y: 6 + r() * 1.6, z: -5 + r() * 12, vel: 0.12 + r() * 0.1, da: k * PER, n: PER, largo };
    nuvole.push(nv);
    const quante = 5 + Math.floor(r() * 3);
    const sfere = Array.from({ length: quante }, (_, q) => {
      const t = q / (quante - 1) - 0.5;
      return { x: t * largo * 2 + (r() - 0.5) * 0.6, y: (0.5 - Math.abs(t)) * 0.5 * largo, z: (r() - 0.5) * largo * 0.6, raggio: (0.5 + (0.5 - Math.abs(t)) * 0.9) * (0.5 + largo * 0.3) };
    });
    const volume = sfere.reduce((a, s) => a + s.raggio ** 3, 0), pancia = -0.25 * (0.5 + largo * 0.3);
    for (let i = 0; i < PER; i++) {
      let u = r() * volume, s = sfere[0]!;
      for (const q of sfere) { u -= q.raggio ** 3; if (u <= 0) { s = q; break; } }
      const a = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), d = s.raggio * (0.55 + 0.45 * Math.cbrt(r()));
      const x = s.x + Math.sin(v) * Math.cos(a) * d, z = s.z + Math.sin(v) * Math.sin(a) * d;
      let y = s.y + Math.cos(v) * d * 0.7;
      if (y < pancia) y = pancia - r() * 0.06;
      const j = nv.da + i;
      base.set([x, y, z], j * 3);
      luceNuvole[j] = THREE.MathUtils.clamp((y - pancia) / (largo * 0.9), 0, 1);
    }
  }
  const geoNuvole = new THREE.BufferGeometry();
  geoNuvole.setAttribute('position', new THREE.BufferAttribute(posNuvole, 3));
  geoNuvole.setAttribute('color', new THREE.BufferAttribute(colNuvole, 3));
  const puntiNuvole = new THREE.Points(geoNuvole, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
  puntiNuvole.frustumCulled = false;
  g.add(puntiNuvole);
  // Ombre delle nuvole: un velo sul terreno, più scuro sotto ogni nuvola, spostato un po' dalla luce del sole
  const ombre = Array.from({ length: QUANTE }, () => new THREE.Vector4());
  const geoOmbra = new THREE.PlaneGeometry(L * 2.2, L * 2.2, 80, 80).rotateX(-Math.PI / 2);
  const po = geoOmbra.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < po.count; i++) po.setY(i, altezza(po.getX(i), po.getZ(i)) + 0.03);
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
        float bordo = smoothstep(${L.toFixed(1)}, ${(L - 2).toFixed(1)}, length(vXZ));
        gl_FragColor = vec4(colore, a * forza * bordo);
      }`,
  });
  const ombra = new THREE.Mesh(geoOmbra, matOmbra);
  ombra.renderOrder = 5;
  g.add(ombra);

  // --- Mongolfiere: pallone a spicchi, cesta, funi; fra le nuvole e le colline
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
    o.scale.setScalar(1.3);
    g.add(o);
    const y = [5, 6.2, 4.4][k]!;
    return { o, fiamma, cx: [-4, 5, 1][k]!, cz: [2, -2, -6][k]!, y, fase: k * 2.1, quota: y };
  });

  // --- Cielo: stelle su una cupola lontana, costellazioni, stelle cadenti, sole e luna. Si vedono abbassando lo sguardo.
  const CUPOLA = 40;
  const sullaCupola = (az: number, el: number, fuori = new THREE.Vector3()) => fuori.set(Math.sin(az) * Math.cos(el) * CUPOLA, Math.sin(el) * CUPOLA - 1, -Math.cos(az) * Math.cos(el) * CUPOLA);
  const inchiostro = p.chiaro ? c.fg.clone() : new THREE.Color('#fbf8ef');
  const STELLE = p.telefono ? 600 : 1200, stelle = puntiMorbidi(STELLE), brillio = new Float32Array(STELLE * 2);
  for (let i = 0; i < STELLE; i++) {
    const az = r() * Math.PI * 2, el = 0.02 + Math.asin(r()) * 1.2;
    stelle.pos.set(sullaCupola(az, el).toArray(), i * 3);
    stelle.dim[i] = r() < 0.08 ? 0.45 + r() * 0.25 : 0.14 + r() * 0.18;
    stelle.col.set(inchiostro.clone().lerp(c.azzurro, r() * 0.3).toArray(), i * 3);
    stelle.alfa[i] = 0;
    brillio[i * 2] = 0.5 + r() * 2.5; brillio[i * 2 + 1] = r() * 6;
  }
  stelle.punti.renderOrder = 12;
  g.add(stelle.punti);
  // Costellazioni vere, semplificate (Grande Carro, Cassiopea, Orione), basse sull'orizzonte; stelle in gradi
  const COSTELLAZIONI: { az: number; el: number; stelle: number[][]; righe: number[][] }[] = [
    { az: Math.PI - 0.5, el: 0.25, stelle: [[0, 0], [5, 0.6], [9.5, 0.2], [14, 1.4], [15.5, 6], [21.5, 6.5], [21.5, 1.5]], righe: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    { az: Math.PI + 0.45, el: 0.32, stelle: [[0, 0], [4, -3.5], [8, 0], [12, -4], [16, 0.5]], righe: [[0, 1], [1, 2], [2, 3], [3, 4]] },
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
  const matCost = new THREE.LineBasicMaterial({ color: c.azzurro.clone().lerp(inchiostro, 0.4), transparent: true, opacity: 0, fog: false });
  const linee = new THREE.LineSegments(geoCost, matCost);
  linee.renderOrder = 12;
  g.add(linee);
  const stelleForti = puntiMorbidi(stelleCost.length);
  stelleCost.forEach((q, i) => { stelleForti.pos.set(q.toArray(), i * 3); stelleForti.dim[i] = 0.7; stelleForti.col.set(inchiostro.toArray(), i * 3); stelleForti.alfa[i] = 0; });
  stelleForti.punti.renderOrder = 12;
  g.add(stelleForti.punti);
  const matCadente = new THREE.LineBasicMaterial({ color: inchiostro, transparent: true, opacity: 0, fog: false });
  const cadente = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), matCadente);
  cadente.frustumCulled = false;
  cadente.renderOrder = 12;
  g.add(cadente);
  const scia = { t: 1, da: new THREE.Vector3(), dir: new THREE.Vector3(), attesa: 4 };
  const cerchioDi = (raggio: number) => Array.from({ length: 33 }, (_, k) => new THREE.Vector3(Math.cos(k / 32 * Math.PI * 2) * raggio, Math.sin(k / 32 * Math.PI * 2) * raggio, 0));
  const sole = new THREE.Group();
  sole.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cerchioDi(1.2)), new THREE.LineBasicMaterial({ color: c.arancio, transparent: true, opacity: 0.9, fog: false })));
  const raggiSole: THREE.Vector3[] = [];
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; raggiSole.push(new THREE.Vector3(Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0), new THREE.Vector3(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0)); }
  sole.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(raggiSole), new THREE.LineBasicMaterial({ color: c.arancio, transparent: true, opacity: 0.7, fog: false })));
  g.add(sole);
  const luna = new THREE.Group();
  const matLuna = new THREE.LineBasicMaterial({ color: inchiostro, transparent: true, opacity: 0.9, fog: false });
  luna.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cerchioDi(0.9)), matLuna));
  const parteLuna = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: inchiostro, transparent: true, opacity: 0.25, fog: false, side: THREE.DoubleSide, depthWrite: false }));
  const terminatore = new THREE.Line(new THREE.BufferGeometry(), matLuna);
  luna.add(parteLuna, terminatore);
  luna.traverse(o => { o.renderOrder = 12; });
  g.add(luna);
  // Parte illuminata della luna: fra il bordo e il terminatore (un'ellisse); fase 0 luna nuova, 0.5 piena
  const faseLuna = (f: number) => {
    const e = Math.cos(f * Math.PI * 2), lato = f < 0.5 ? 1 : -1, forma = new THREE.Shape(), arco: THREE.Vector3[] = [];
    for (let k = 0; k <= 16; k++) { const a = Math.PI / 2 - (k / 16) * Math.PI, x = Math.cos(a) * 0.9 * lato, y = Math.sin(a) * 0.9; if (k) forma.lineTo(x, y); else forma.moveTo(x, y); }
    for (let k = 0; k <= 16; k++) { const a = -Math.PI / 2 + (k / 16) * Math.PI, x = Math.cos(a) * 0.9 * e * lato, y = Math.sin(a) * 0.9; forma.lineTo(x, y); arco.push(new THREE.Vector3(x, y, 0)); }
    parteLuna.geometry.dispose();
    parteLuna.geometry = new THREE.ShapeGeometry(forma);
    terminatore.geometry.dispose();
    terminatore.geometry = new THREE.BufferGeometry().setFromPoints(arco);
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

    // Sole: dall'alba alla fine del tramonto attraversa il cielo; luna: dal tramonto alla fine dell'alba
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
    for (let i = 0; i < STELLE; i++) stelle.alfa[i] = buio * (0.35 + 0.65 * Math.max(0, Math.sin(s * brillio[i * 2]! + brillio[i * 2 + 1]!)) ** 2);
    stelle.aggiorna();
    matCost.opacity = Math.max(0, buio - 0.6) / 0.4 * 0.4;
    stelleForti.alfa.fill(buio * 0.9);
    stelleForti.aggiorna();
    scia.attesa -= dt;
    if (scia.attesa <= 0 && buio > 0.8) {
      scia.attesa = 5 + r() * 10; scia.t = 0;
      sullaCupola(Math.PI + (r() - 0.5) * 2, 0.2 + r() * 0.4, scia.da);
      scia.dir.set(-0.6 - r() * 0.4, -0.35 - r() * 0.2, (r() - 0.5) * 0.2).normalize();
    }
    if (scia.t < 1) {
      scia.t = Math.min(1, scia.t + dt / 0.9);
      cadente.geometry.setFromPoints([scia.da.clone().addScaledVector(scia.dir, Math.max(0, scia.t * 12 - 4)), scia.da.clone().addScaledVector(scia.dir, scia.t * 12)]);
      matCadente.opacity = Math.sin(scia.t * Math.PI) * 0.9;
    }
    // Mulino e pale: girano piano; di notte finestre accese e luci rosse che lampeggiano in cima alle pale
    mozzo.rotation.z -= dt * 0.3;
    eoliche.forEach(e => { e.rotore.rotation.z -= dt * e.vel; });
    finestre.forEach(f => { (f.material as THREE.MeshBasicMaterial).opacity = 0.15 + buio * 0.75; });
    eoliche.forEach((e, k) => { luciEoliche.alfa[k] = buio * (Math.sin(s * 2.2 + e.fase) > 0.3 ? 0.95 : 0.15); });
    luciEoliche.aggiorna();

    // Nuvole: il colore segue l'ora; i punti ondeggiano e il puntatore li scava. Le ombre seguono le nuvole.
    chiaroNuvola.copy(biancoGiorno).lerp(notteChiaro, buio).lerp(c.arancio, calore * 0.45);
    scuroNuvola.copy(ombraGiorno).lerp(notteScuro, buio).lerp(c.arancio, calore * 0.25);
    const raggio = p.raggio;
    nuvole.forEach((nv, q) => {
      nv.x += nv.vel * dt;
      if (nv.x > 17) nv.x -= 34;
      ombre[q]!.set(nv.x + 1.2, nv.z + 0.8, nv.largo * 1.2, nv.largo * 0.75);
      const respiro = 1 + Math.sin(s * 0.11 + nv.da) * 0.04;
      for (let i = 0; i < nv.n; i++) {
        const j = nv.da + i, k = j * 3, bx = base[k]!, by = base[k + 1]!, bz = base[k + 2]!;
        const x = nv.x + bx * respiro + Math.sin(by * 1.2 + s * 0.2 + bz * 0.5) * 0.12;
        const y = nv.y + by * respiro + Math.sin(bx * 0.9 + s * 0.17) * 0.08;
        const z = nv.z + bz * respiro + Math.cos(bx * 0.8 + by * 1.1 + s * 0.19) * 0.12;
        if (raggio) {
          tmp.set(x + spinta[k]!, y + spinta[k + 1]!, z + spinta[k + 2]!);
          const d2 = raggio.ray.distanceSqToPoint(tmp);
          if (d2 < 1.2) {
            raggio.ray.closestPointToPoint(tmp, via);
            via.subVectors(tmp, via).normalize().multiplyScalar((1 - Math.sqrt(d2) / 1.1) * dt * 5);
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
    matOmbra.uniforms.forza!.value = luce * (p.chiaro ? 0.16 : 0.55);

    // Mongolfiere: un lento giro largo, su e giù; la fiammella si accende quando salgono
    mongolfiere.forEach(m => {
      const voluta = m.y + Math.sin(s * 0.1 + m.fase) * 0.8, prima2 = m.quota;
      m.quota = morbido(m.quota, voluta, dt * 0.3);
      const a = s * 0.02 + m.fase;
      m.o.position.set(m.cx + Math.sin(a) * 3, m.quota, m.cz + Math.cos(a * 0.8) * 2);
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
      k.vel = morbido(k.vel, d < 0.08 ? 0 : Math.min(2.2, 0.3 + d * 1.5), dt * 3);
      if (d > 0.05) k.verso += angolo(Math.atan2(-dz, dx) - k.verso) * Math.min(1, dt * 6);
      k.x += Math.cos(k.verso) * k.vel * dt; k.z -= Math.sin(k.verso) * k.vel * dt;
      k.passo += k.vel * dt;
      cane.position.set(k.x, altezza(k.x, k.z) + Math.abs(Math.sin(k.passo * 25)) * 0.012, k.z);
      cane.rotation.y = k.verso;
    }

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
        if (d > 0.9 || d < 1e-4) continue;
        n++; mx += o.vx; mz += o.vz; cx += o.x; cz += o.z;
        if (d < 0.17) { ax += (dx / d) * (0.17 - d) * 22; az += (dz / d) * (0.17 - d) * 22; }
        paura = Math.max(paura, (1 - o.calma) * (1 - d / 0.9));
      }
      const dc = Math.hypot(q.x - statoCane.x, q.z - statoCane.z) || 1e-3;
      if (dc < 2.4) { ax += ((q.x - statoCane.x) / dc) * (2.4 - dc) * 2.6; az += ((q.z - statoCane.z) / dc) * (2.4 - dc) * 2.6; paura = Math.max(paura, 1 - dc / 2.4); }
      q.calma = morbido(q.calma, 1 - Math.min(1, paura * 1.6), dt * (paura > 1 - q.calma ? 4 : 0.35));
      const agitata = 1 - q.calma;
      if (n) {
        ax += ((mx / n) - q.vx) * 1.5 * (0.3 + agitata);
        az += ((mz / n) - q.vz) * 1.5 * (0.3 + agitata);
        ax += ((cx / n) - q.x) * (0.15 + agitata * 0.8);
        az += ((cz / n) - q.z) * (0.15 + agitata * 0.8);
      }
      // Calma: bruca a lungo, ogni tanto fa due passi in una direzione
      q.timer -= dt;
      if (q.timer <= 0) { q.voglia = q.voglia ? 0 : 1; q.timer = q.voglia ? 1 + r() * 2 : 4 + r() * 9; if (q.voglia) q.verso += (r() - 0.5) * 2; }
      if (q.voglia && agitata < 0.3) { ax += Math.cos(q.verso) * 0.5; az -= Math.sin(q.verso) * 0.5; }
      for (const o of ostacoli) {
        const dx = q.x - o.x, dz = q.z - o.z, d = Math.hypot(dx, dz), raggio = o.r + 0.08;
        if (d < raggio && d > 1e-4) { ax += (dx / d) * (raggio - d) * 30; az += (dz / d) * (raggio - d) * 30; }
      }
      const dr = Math.hypot(q.x, q.z);
      if (dr > L - 2.5) { ax -= (q.x / dr) * (dr - L + 2.5) * 4; az -= (q.z / dr) * (dr - L + 2.5) * 4; }
      // Velocità: attrito forte da calme, scatto da agitate; massimo dipende dall'agitazione
      q.vx += ax * dt; q.vz += az * dt;
      const attrito = Math.exp(-dt * (agitata > 0.2 ? 1.2 : 3.5));
      q.vx *= attrito; q.vz *= attrito;
      const v = Math.hypot(q.vx, q.vz), vMax = 0.12 + agitata * 1.3;
      if (v > vMax) { q.vx *= vMax / v; q.vz *= vMax / v; }
      q.x += q.vx * dt; q.z += q.vz * dt;
      // Direzione: gira piano verso dove va; testa giù quando bruca ferma
      if (v > 0.03) q.verso += angolo(Math.atan2(-q.vz, q.vx) - q.verso) * Math.min(1, dt * 4);
      q.testa = morbido(q.testa, v < 0.04 ? 1 : 0, dt * 2);
      const y = altezza(q.x, q.z), passo = v > 0.03 ? Math.abs(Math.sin(s * 14 + q.fase)) * 0.01 : 0;
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
