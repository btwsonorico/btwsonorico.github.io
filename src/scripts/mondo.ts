import * as THREE from 'three';
import { colori, tonoSezione, vista, type Punto } from './vista3d';

// Il mondo dell'About: le tre sezioni del sito in un solo diorama, nello stile di bosco e laghetto.
// A terra, su un prato verde: un piccolo bosco (Software) e uno stagno con i pesci (Advisory).
// In cielo, Knowledge. Di notte (tema scuro): stelle, luna, stelle cadenti, e Knowledge è una costellazione
// fatta come il suo grafo, con i temi e i testi come stelle e i loro legami come linee.
// Di giorno (tema chiaro): uno stormo di uccelli; una piccola parte, arancione, è Knowledge.
// Il cielo resta fermo dietro al diorama, che ruota piano; un clic su una sezione la apre.

export interface NodoK { id: string; tipo: string; label: string; href?: string }
export interface DatiMondo { nodi: NodoK[]; archi: [string, string][] }

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

// Bordo dell'isola e dello stagno: due fagioli, come la riva del laghetto
const raggioIsola = (a: number) => 4.3 + 0.45 * Math.cos(2 * a) + 0.2 * Math.sin(3 * a + 0.6) + 0.08 * Math.sin(7 * a + 1);
const STAGNO = new THREE.Vector2(1.7, 0.4);
const raggioStagno = (a: number) => 1.35 + 0.28 * Math.cos(2 * a + 0.4) + 0.12 * Math.sin(3 * a + 1.2);
const nelloStagno = (x: number, z: number, margine = 0) => {
  const dx = x - STAGNO.x, dz = z - STAGNO.y;
  return Math.hypot(dx, dz) < raggioStagno(Math.atan2(dz, dx)) - margine;
};
const sullIsola = (x: number, z: number, margine = 0) => Math.hypot(x, z) < raggioIsola(Math.atan2(z, x)) - margine;
// Punto sulla volta del cielo: azimut e altezza sull'orizzonte
const volta = (az: number, alt: number, raggio: number) => new THREE.Vector3(Math.cos(alt) * Math.cos(az) * raggio, Math.sin(alt) * raggio + 0.3, Math.cos(alt) * Math.sin(az) * raggio);

export function monta(el: HTMLElement, dati: DatiMondo) {
  const c = colori(el);
  const chiaro = document.documentElement.dataset.theme === 'light';
  const verde = tonoSezione('--verde'), azzurro = tonoSezione('--azzurro'), arancio = tonoSezione('--arancio');
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const r = casuale(41);
  // Materiali di ogni sezione, per accenderli insieme quando il puntatore è sopra
  const materiali: Record<string, THREE.Material[]> = { software: [], advisory: [], knowledge: [] };
  const mat = (sezione: string, colore: THREE.Color, opacita: number) => { const m = linea(colore, opacita); materiali[sezione]!.push(m); return m; };
  const pieno = (sezione: string, colore: THREE.Color, opacita: number) => {
    const m = new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: opacita, depthWrite: false });
    materiali[sezione]!.push(m);
    return m;
  };

  // --- Isola: bordo, prato verde a strati, puntini e ciuffi d'erba
  const contorno = Array.from({ length: 180 }, (_, i) => { const a = (i / 180) * Math.PI * 2, d = raggioIsola(a); return new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d); });
  gruppo.add(curva(contorno, linea(verde.clone().lerp(c.muted, 0.4), 0.55), true));
  for (const [scala, op] of [[1, 0.07], [0.75, 0.045], [0.5, 0.04]] as const) {
    const forma = new THREE.Shape(contorno.map(p => new THREE.Vector2(p.x * scala, -p.z * scala)));
    const strato = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshBasicMaterial({ color: verde, transparent: true, opacity: op * (chiaro ? 1 : 0.45), depthWrite: false }));
    strato.rotation.x = -Math.PI / 2;
    strato.position.y = -0.02;
    strato.renderOrder = -2;
    gruppo.add(strato);
  }
  const prato: number[] = [], erba: number[] = [];
  for (let x = -5; x <= 5; x += 0.3) for (let z = -5; z <= 5; z += 0.3) {
    const px = x + (r() - 0.5) * 0.1, pz = z + (r() - 0.5) * 0.1;
    if (sullIsola(px, pz, 0.1) && !nelloStagno(px, pz, -0.1)) prato.push(px, 0, pz);
  }
  for (let k = 0; k < 170; k++) {
    let x = 0, z = 0;
    do { x = (r() - 0.5) * 8.6; z = (r() - 0.5) * 8; } while (!sullIsola(x, z, 0.2) || nelloStagno(x, z, -0.15));
    const h = 0.06 + r() * 0.08;
    for (const dx of [-0.04, 0, 0.04]) erba.push(x, 0, z, x + dx, h * (dx === 0 ? 1.3 : 1), z + dx * 0.5);
  }
  gruppo.add(nuvola(prato, c.muted, 0.024, 0.5), segmenti(erba, linea(verde.clone().lerp(c.muted, 0.35), 0.5)));

  // --- Bosco (Software): alberi con la chioma piena, e un albero guida più grande al centro
  const solido = (sezione: string, geo: THREE.BufferGeometry, colore: THREE.Color, op: number, fili: number) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, pieno(sezione, colore, op)), new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat(sezione, colore, fili)));
    return g;
  };
  const tronco = mat('software', c.fg, 0.7);
  const albero = (x: number, z: number, alto: number, tipo: number, colore: THREE.Color, op = 0.2) => {
    const a = new THREE.Group();
    a.add(segmenti([0, 0, 0, 0, alto * 0.55, 0], tronco));
    if (tipo === 0) {
      // Quercia: palle sfaccettate
      const centrale = solido('software', new THREE.IcosahedronGeometry(alto * 0.3, 0), colore, op, 0.9);
      centrale.position.y = alto * 0.75;
      a.add(centrale);
      for (let k = 0; k < 3; k++) {
        const palla = solido('software', new THREE.IcosahedronGeometry(alto * 0.2, 0), colore, op, 0.85);
        const b = (k / 3) * Math.PI * 2 + r();
        palla.position.set(Math.cos(b) * alto * 0.25, alto * 0.62, Math.sin(b) * alto * 0.25);
        a.add(palla);
      }
    } else if (tipo === 1) {
      // Abete: coni sovrapposti
      for (let p = 0; p < 3; p++) {
        const h = alto * 0.42, cono = solido('software', new THREE.ConeGeometry(alto * 0.26 * (1 - p * 0.25), h, 7), colore, op, 0.85);
        cono.position.y = alto * 0.3 + p * alto * 0.22 + h / 2;
        a.add(cono);
      }
    } else {
      // Acacia: chioma larga e piatta
      const piatta = solido('software', new THREE.IcosahedronGeometry(alto * 0.42, 1), colore, op, 0.85);
      piatta.scale.y = 0.3;
      piatta.position.y = alto * 0.85;
      a.add(piatta, segmenti([0, alto * 0.5, 0, -alto * 0.12, alto * 0.82, 0, 0, alto * 0.5, 0, alto * 0.14, alto * 0.82, 0.03], tronco));
    }
    a.position.set(x, 0, z);
    a.rotation.y = r() * 6;
    gruppo.add(a);
    return a;
  };
  // Sfumature del verde: mai troppo scure, così sul fondo chiaro gli alberi non sembrano neri
  const sfumature = (chiaro ? [0.04, 0.09, 0.14, 0.19] : [-0.08, -0.03, 0.03, 0.08]).map(dl => verde.clone().offsetHSL(0, 0, dl));
  const alberi: THREE.Group[] = [];
  const occupati: THREE.Vector2[] = [new THREE.Vector2(-1.7, -0.2)];
  for (let k = 0; k < 15; k++) {
    let p = new THREE.Vector2();
    for (let prova = 0; prova < 80; prova++) {
      p.set(-1.7 + (r() - 0.5) * 3.6, -0.2 + (r() - 0.5) * 4.2);
      if (sullIsola(p.x, p.y, 0.5) && !nelloStagno(p.x, p.y, -0.6) && occupati.every(q => q.distanceTo(p) > 0.65)) break;
    }
    occupati.push(p.clone());
    alberi.push(albero(p.x, p.y, 0.7 + r() * 0.55, k % 3, sfumature[k % sfumature.length]!));
  }
  const guida = albero(-1.7, -0.2, 1.9, 0, verde.clone().offsetHSL(0, 0, 0.06), 0.42);
  const insegna = new THREE.Object3D();
  insegna.position.y = 1.9 * 1.15;
  guida.add(insegna);
  punti.push({ id: 'sezione:software', label: 'Software →', href: '/software/', hub: true, famiglia: 'software', ancora: insegna, base: guida, tono: 'verde' });

  // --- Stagno (Advisory): acqua azzurra a strati, riva, canne, ninfee e pesci che nuotano in tondo
  const riva = Array.from({ length: 120 }, (_, i) => { const a = (i / 120) * Math.PI * 2, d = raggioStagno(a); return new THREE.Vector3(STAGNO.x + Math.cos(a) * d, 0.005, STAGNO.y + Math.sin(a) * d); });
  gruppo.add(curva(riva, mat('advisory', azzurro, chiaro ? 0.9 : 0.6), true));
  for (const [scala, op] of [[1, 0.1], [0.75, 0.05], [0.45, 0.05]] as const) {
    const forma = new THREE.Shape(riva.map(p => new THREE.Vector2(STAGNO.x + (p.x - STAGNO.x) * scala, -(STAGNO.y + (p.z - STAGNO.y) * scala))));
    const strato = new THREE.Mesh(new THREE.ShapeGeometry(forma), pieno('advisory', azzurro, op));
    strato.rotation.x = -Math.PI / 2;
    strato.position.y = -0.01;
    strato.renderOrder = -1;
    gruppo.add(strato);
  }
  const acqua: number[] = [];
  for (let x = STAGNO.x - 2; x <= STAGNO.x + 2; x += 0.2) for (let z = STAGNO.y - 2; z <= STAGNO.y + 2; z += 0.2) if (nelloStagno(x, z, 0.1)) acqua.push(x, -0.01, z);
  gruppo.add(nuvola(acqua, azzurro, 0.02, chiaro ? 0.5 : 0.35));
  const canne: number[] = [];
  for (let k = 0; k < 26; k++) {
    const a = r() * Math.PI * 2, d = raggioStagno(a) + 0.05 + r() * 0.15, x = STAGNO.x + Math.cos(a) * d, z = STAGNO.y + Math.sin(a) * d;
    for (let q = 0; q < 3; q++) { const h = 0.2 + r() * 0.25, dx = (r() - 0.5) * 0.06, dz = (r() - 0.5) * 0.06; canne.push(x + dx, 0, z + dz, x + dx * 2.5, h, z + dz * 2.5); }
  }
  gruppo.add(segmenti(canne, linea(verde, 0.55)));
  for (let k = 0; k < 4; k++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.9, x = STAGNO.x + Math.cos(a) * d, z = STAGNO.y + Math.sin(a) * d;
    const foglia = curva(Array.from({ length: 16 }, (_, i) => { const b = 0.4 + (i / 15) * (Math.PI * 2 - 0.8); return new THREE.Vector3(x + Math.cos(b) * 0.12, 0.01, z + Math.sin(b) * 0.12); }), linea(verde, 0.7));
    gruppo.add(foglia);
  }
  const pesci = Array.from({ length: 7 }, (_, k) => {
    const g = new THREE.Group();
    const corpo = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(1, 7, 5)), mat('advisory', azzurro.clone().offsetHSL(0, 0, (k % 3 - 1) * 0.07), 0.95));
    corpo.scale.set(0.04, 0.035, 0.1);
    const coda = curva([new THREE.Vector3(0, 0, -0.09), new THREE.Vector3(0, 0.04, -0.15), new THREE.Vector3(0, -0.04, -0.15)], mat('advisory', azzurro, 0.9), true);
    g.add(corpo, coda);
    gruppo.add(g);
    return { g, coda, raggio: 0.3 + r() * 0.7, vel: (0.25 + r() * 0.25) * (k % 2 ? 1 : -1), fase: r() * 6, prof: 0.05 + r() * 0.1 };
  });
  const sopraStagno = new THREE.Object3D();
  sopraStagno.position.set(STAGNO.x, 0.45, STAGNO.y);
  gruppo.add(sopraStagno);
  punti.push({ id: 'sezione:advisory', label: 'Advisory →', href: '/advisory/', hub: true, famiglia: 'advisory', ancora: sopraStagno, tono: 'azzurro' });

  // Anelli che si allargano e svaniscono sotto ogni sezione, uno dopo l'altro: dicono "qui si clicca"
  const cerchio = (n: number) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return new THREE.Vector3(Math.cos(a), 0, Math.sin(a)); });
  const impulsi: { o: THREE.LineLoop; da: number; a: number; ritardo: number }[] = [];
  const impulso = (padre: THREE.Object3D, colore: THREE.Color, x: number, y: number, z: number, da: number, a: number, ritardo: number, verticale = false) => {
    const o = curva(cerchio(56), linea(colore, 0), true) as THREE.LineLoop;
    o.position.set(x, y, z);
    if (verticale) o.rotation.x = Math.PI / 2;
    padre.add(o);
    impulsi.push({ o, da, a, ritardo });
  };
  impulso(gruppo, verde, -1.7, 0.012, -0.2, 0.45, 1.3, 0);
  impulso(gruppo, azzurro, STAGNO.x, 0.012, STAGNO.y, 0.3, 1.25, 0.8);

  // Un pesce ogni tanto salta fuori dall'acqua, con un cerchio dove esce e uno dove rientra
  const spruzzi = [0, 1].map(() => { const o = curva(cerchio(32), linea(azzurro, 0), true); gruppo.add(o); return { o, nato: -9 }; });
  let salto = { pesce: 0, nato: -9 }, prossimoSalto = 4;

  // Notte: lucciole fra gli alberi del bosco. Giorno: due libellule arancioni sopra lo stagno
  const LUCCIOLE = chiaro ? 0 : 30;
  const baseLucciole = Array.from({ length: LUCCIOLE }, () => ({ x: -1.7 + (r() - 0.5) * 3.6, y: 0.2 + r() * 1.1, z: -0.2 + (r() - 0.5) * 3.8, fase: r() * 10, vel: 0.6 + r() * 0.8 }));
  const gLucciole = new THREE.BufferGeometry();
  gLucciole.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(LUCCIOLE * 3), 3));
  gLucciole.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(LUCCIOLE * 3), 3));
  gruppo.add(new THREE.Points(gLucciole, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.95 })));
  const coloreLucciola = new THREE.Color('#e6ffb3'), lucciola = new THREE.Color();
  const libellule = (chiaro ? [0, 1] : []).map(k => {
    const g = new THREE.Group();
    const ml = linea(arancio, 0.85);
    g.add(curva([new THREE.Vector3(0, 0, 0.05), new THREE.Vector3(0, 0, -0.09)], ml));
    const ali = new THREE.Group();
    for (const lato of [1, -1]) for (const dz of [0.02, -0.01]) ali.add(curva([new THREE.Vector3(0, 0, dz), new THREE.Vector3(lato * 0.08, 0, dz + 0.012), new THREE.Vector3(lato * 0.08, 0, dz - 0.008)], ml, true));
    g.add(ali);
    gruppo.add(g);
    return { g, ali, da: new THREE.Vector3(), a: new THREE.Vector3(STAGNO.x, 0.4, STAGNO.y), via: -9, sosta: 2 + k * 1.3 };
  });
  const puntoSopraStagno = (out: THREE.Vector3) => {
    const a = r() * Math.PI * 2, d = raggioStagno(a) * (0.5 + r() * 0.6);
    return out.set(STAGNO.x + Math.cos(a) * d, 0.3 + r() * 0.3, STAGNO.y + Math.sin(a) * d);
  };

  // --- Cielo: un gruppo che annulla la rotazione del diorama, così resta sempre dietro
  const cielo = new THREE.Group();
  gruppo.add(cielo);
  const RAGGIO = 7;
  const dietro = (p: THREE.Vector3) => { if (p.z > -0.5) p.z = -0.5 - Math.abs(p.z) * 0.5; return p; };
  const centroK = volta(4.71, 0.42, RAGGIO);
  const est = new THREE.Vector3(1, 0, 0), su = new THREE.Vector3(0, 1, 0);
  let aggiornaCielo: (s: number, dt: number) => void;
  let nuvole: { g: THREE.Group; vel: number }[] = [];
  let riflesso: THREE.Group | null = null, stelleAcqua: THREE.Points | null = null, muoviSegnali: (dt: number) => void = () => {};

  if (!chiaro) {
    // Notte: stelle che brillano, Via Lattea, luna sottile, stelle cadenti
    const N = 480;
    const stelle = new Float32Array(N * 3), luci = new Float32Array(N * 3), fasi = new Float32Array(N), forza = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let p: THREE.Vector3;
      if (i < 170) {
        const a = r() * Math.PI * 2, spessore = (r() - 0.5) * 0.35;
        p = dietro(new THREE.Vector3(Math.cos(a), Math.abs(Math.sin(a) * 0.5 + spessore) + 0.15, Math.sin(a) * 0.9).normalize().multiplyScalar(RAGGIO));
        forza[i] = 0.25 + r() * 0.25;
      } else {
        p = dietro(volta(r() * Math.PI * 2, Math.asin(0.05 + r() * 0.92), RAGGIO * (1 + r() * 0.05)));
        forza[i] = 0.35 + r() ** 3 * 0.65;
      }
      stelle.set([p.x, p.y, p.z], i * 3);
      fasi[i] = r() * 10;
    }
    const gStelle = new THREE.BufferGeometry();
    gStelle.setAttribute('position', new THREE.BufferAttribute(stelle, 3));
    gStelle.setAttribute('color', new THREE.BufferAttribute(luci, 3));
    cielo.add(new THREE.Points(gStelle, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.95, fog: false })));
    const luna = new THREE.Group();
    const arco = (raggio: number, cx: number, da: number, a: number) => curva(Array.from({ length: 24 }, (_, i) => {
      const t = da + (i / 23) * (a - da);
      return new THREE.Vector3(cx + Math.cos(t) * raggio, Math.sin(t) * raggio, 0);
    }), linea(c.fg, 0.8));
    luna.add(arco(0.36, 0, -Math.PI / 2, Math.PI / 2), arco(0.3, -0.12, -1.2, 1.2));
    luna.position.copy(volta(5.6, 0.3, RAGGIO * 0.95));
    cielo.add(luna);
    // Riflesso della luna nello stagno: trattini che tremano, sempre rivolti verso chi guarda
    riflesso = new THREE.Group();
    const trattini: number[] = [];
    for (let k = 0; k < 9; k++) { const z = 0.5 - k * 0.11, l = 0.05 + (1 - Math.abs(k - 4) / 4) * 0.12; trattini.push(-l, 0, z, l, 0, z); }
    riflesso.add(segmenti(trattini, linea(c.fg, 0.55)));
    riflesso.position.set(STAGNO.x, 0.01, STAGNO.y);
    gruppo.add(riflesso);
    // Stelle riflesse nell'acqua: puntini che brillano piano
    const riflesse: number[] = [];
    for (let k = 0; k < 26; k++) { let x = 0, z = 0; do { x = STAGNO.x + (r() - 0.5) * 2.6; z = STAGNO.y + (r() - 0.5) * 2.2; } while (!nelloStagno(x, z, 0.12)); riflesse.push(x, 0.006, z); }
    stelleAcqua = nuvola(riflesse, c.fg, 0.035, 0.5);
    gruppo.add(stelleAcqua);
    const scia = curva([new THREE.Vector3(), new THREE.Vector3()], linea(c.fg, 0));
    cielo.add(scia);
    let cadente = { da: new THREE.Vector3(), a: new THREE.Vector3(), nata: -1e9 }, prossima = 3;
    const luce = new THREE.Color();

    // Knowledge come costellazione: il grafo dei temi e dei testi, disposto con le forze come nella sua pagina
    const nodi = dati.nodi, indice = new Map(nodi.map((n, i) => [n.id, i]));
    const archi = dati.archi.map(([a, b]) => [indice.get(a)!, indice.get(b)!] as const).filter(([a, b]) => a !== undefined && b !== undefined);
    const px = nodi.map(() => (r() - 0.5) * 2), py = nodi.map(() => (r() - 0.5) * 2);
    for (let it = 0; it < 300; it++) {
      const fx = nodi.map(() => 0), fy = nodi.map(() => 0);
      for (let i = 0; i < nodi.length; i++) for (let j = i + 1; j < nodi.length; j++) {
        const dx = px[i]! - px[j]!, dy = py[i]! - py[j]!, d2 = dx * dx + dy * dy + 0.01, f = 0.02 / d2;
        fx[i]! += dx * f; fy[i]! += dy * f; fx[j]! -= dx * f; fy[j]! -= dy * f;
      }
      for (const [a, b] of archi) {
        const dx = px[b]! - px[a]!, dy = py[b]! - py[a]!, d = Math.hypot(dx, dy) || 1, f = (d - 0.35) * 0.08;
        fx[a]! += dx / d * f; fy[a]! += dy / d * f; fx[b]! -= dx / d * f; fy[b]! -= dy / d * f;
      }
      for (let i = 0; i < nodi.length; i++) { px[i] = px[i]! + fx[i]! - px[i]! * 0.01; py[i] = py[i]! + fy[i]! - py[i]! * 0.01; }
    }
    const misura = Math.max(...px.map(Math.abs), ...py.map(Math.abs)) || 1;
    const posK = nodi.map((_, i) => centroK.clone().addScaledVector(est, (px[i]! / misura) * 3.2).addScaledVector(su, (py[i]! / misura) * 1.8));
    const xyz: number[] = [];
    for (const [a, b] of archi) xyz.push(...posK[a]!.toArray(), ...posK[b]!.toArray());
    cielo.add(segmenti(xyz, mat('knowledge', arancio, 0.45)));
    // Segnali: puntini luminosi che corrono lungo i legami da una stella all'altra, come idee che si collegano
    const SEGNALI = Math.min(12, archi.length);
    const segnali = Array.from({ length: SEGNALI }, () => ({ arco: Math.floor(r() * archi.length), u: r(), verso: r() < 0.5 }));
    const gSegnali = new THREE.BufferGeometry();
    gSegnali.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SEGNALI * 3), 3));
    cielo.add(new THREE.Points(gSegnali, new THREE.PointsMaterial({ color: arancio.clone().offsetHSL(0, 0, 0.15), size: 0.09, transparent: true, opacity: 0.95, fog: false })));
    muoviSegnali = (dt: number) => {
      const pos = gSegnali.attributes.position as THREE.BufferAttribute;
      segnali.forEach((q, i) => {
        q.u += dt * 0.5;
        if (q.u >= 1) {
          // Arrivato in fondo: riparte da un legame che tocca la stella dove è arrivato
          const [a, b] = archi[q.arco]!, nodo = q.verso ? a : b;
          const vicini = archi.map((x, k) => (x[0] === nodo || x[1] === nodo) && k !== q.arco ? k : -1).filter(k => k >= 0);
          q.arco = vicini.length ? vicini[Math.floor(r() * vicini.length)]! : Math.floor(r() * archi.length);
          q.verso = archi[q.arco]![1] === nodo;
          q.u = 0;
        }
        const [a, b] = archi[q.arco]!, da = posK[q.verso ? b : a]!, verso = posK[q.verso ? a : b]!;
        pos.setXYZ(i, da.x + (verso.x - da.x) * q.u, da.y + (verso.y - da.y) * q.u, da.z + (verso.z - da.z) * q.u);
      });
      pos.needsUpdate = true;
    };
    const geoTema = new THREE.IcosahedronGeometry(0.1, 1), geoTesto = new THREE.IcosahedronGeometry(0.055, 1);
    nodi.forEach((n, i) => {
      const tema = n.tipo === 'tema';
      const stella = new THREE.Mesh(tema ? geoTema : geoTesto, pieno('knowledge', tema ? arancio : c.fg, tema ? 0.95 : 0.8));
      stella.position.copy(posK[i]!);
      cielo.add(stella);
      punti.push({ id: `k:${n.id}`, label: n.label, href: n.href ?? '/knowledge/', hub: false, famiglia: 'knowledge', ancora: stella, tono: 'arancio' });
    });
    const centro = new THREE.Object3D();
    centro.position.copy(centroK).addScaledVector(su, 2.05);
    cielo.add(centro);
    punti.push({ id: 'sezione:knowledge', label: 'Knowledge →', href: '/knowledge/', hub: true, famiglia: 'knowledge', ancora: centro, tono: 'arancio' });
    impulso(cielo, arancio, centroK.x, centroK.y, centroK.z, 0.5, 2.2, 1.6, true);

    aggiornaCielo = (s: number, dt: number) => {
      muoviSegnali(dt);
      for (let i = 0; i < N; i++) {
        const b = forza[i]! * (0.75 + 0.25 * Math.sin(s * (1.2 + (fasi[i]! % 1) * 2) + fasi[i]!));
        luce.copy(c.fg).multiplyScalar(b);
        luci.set([luce.r, luce.g, luce.b], i * 3);
      }
      gStelle.attributes.color!.needsUpdate = true;
      if (s > 0 && s > prossima) {
        const az = 3.5 + r() * 2.4;
        cadente = { da: volta(az, 0.65 + r() * 0.4, RAGGIO), a: volta(az + 0.45 + r() * 0.35, 0.3 + r() * 0.15, RAGGIO), nata: s };
        prossima = s + 4 + r() * 5;
      }
      const u = (s - cadente.nata) / 0.9, m = scia.material as THREE.LineBasicMaterial;
      if (u >= 0 && u <= 1) {
        const testa = cadente.da.clone().lerp(cadente.a, u), coda = cadente.da.clone().lerp(cadente.a, Math.max(0, u - 0.25));
        (scia.geometry.attributes.position as THREE.BufferAttribute).setXYZ(0, coda.x, coda.y, coda.z).setXYZ(1, testa.x, testa.y, testa.z).needsUpdate = true;
        m.opacity = Math.sin(u * Math.PI) * 0.9;
      } else m.opacity = 0;
    };
  } else {
    // Giorno: uno stormo di uccelli; quelli arancioni (Knowledge) volano insieme, come un piccolo stormo nello stormo
    const N = 110, ARANCIONI = 16;
    const geoAli = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.07, 0.03, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.07, 0.03, 0)]);
    const matGrigio = linea(c.muted, 0.85), matArancio = mat('knowledge', arancio, 1);
    const uccelli = Array.from({ length: N }, (_, i) => {
      const k = i < ARANCIONI;
      const g = new THREE.Line(geoAli, k ? matArancio : matGrigio);
      cielo.add(g);
      const p = centroK.clone().add(new THREE.Vector3((r() - 0.5) * 3, (r() - 0.5) * 1.2, (r() - 0.5) * 1.2));
      return { g, k, p, v: new THREE.Vector3((r() - 0.5) * 0.6, (r() - 0.5) * 0.2, (r() - 0.5) * 0.3), fase: r() * 6 };
    });
    const centro = new THREE.Object3D();
    cielo.add(centro);
    // Nuvole: grappoli di palle a fili, bianche e piene appena, che attraversano piano il cielo
    nuvole = Array.from({ length: 4 }, (_, k) => {
      const g = new THREE.Group();
      for (let q = 0; q < 4; q++) {
        const geo = new THREE.IcosahedronGeometry(0.35 + r() * 0.25, 1);
        const palla = new THREE.Group();
        palla.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false })), new THREE.LineSegments(new THREE.EdgesGeometry(geo), linea(c.muted, 0.25)));
        palla.position.set(q * 0.45 - 0.7, Math.sin(q * 1.7) * 0.15, (r() - 0.5) * 0.2);
        palla.scale.y = 0.6;
        g.add(palla);
      }
      g.position.copy(volta(3.6 + k * 0.75, 0.3 + (k % 2) * 0.22, RAGGIO * 0.92));
      cielo.add(g);
      return { g, vel: 0.12 + r() * 0.1 };
    });
    punti.push({ id: 'sezione:knowledge', label: 'Knowledge →', href: '/knowledge/', hub: true, famiglia: 'knowledge', ancora: centro, tono: 'arancio' });
    const meta = new THREE.Vector3(), forza = new THREE.Vector3(), d = new THREE.Vector3(), media = new THREE.Vector3(), centroA = new THREE.Vector3(), avanti = new THREE.Vector3();
    aggiornaCielo = (s: number, dt: number) => {
      // Il punto che tiene unito lo stormo disegna curve lente nel cielo dietro al diorama
      meta.copy(centroK).addScaledVector(est, Math.sin(s * 0.11) * 2.6).addScaledVector(su, Math.sin(s * 0.17 + 1) * 0.7);
      centroA.set(0, 0, 0);
      for (const u of uccelli) if (u.k) centroA.add(u.p);
      centroA.multiplyScalar(1 / ARANCIONI);
      if (dt > 0) for (const u of uccelli) {
        forza.copy(meta).sub(u.p).multiplyScalar(0.25);
        media.set(0, 0, 0);
        let quanti = 0;
        for (const q of uccelli) {
          if (q === u) continue;
          d.copy(u.p).sub(q.p);
          const l = d.length();
          if (l < 0.6) { media.add(q.v); quanti++; }
          if (l < 0.18 && l > 1e-4) forza.addScaledVector(d, (0.18 - l) * 12 / l);
        }
        if (quanti) forza.addScaledVector(media.multiplyScalar(1 / quanti).sub(u.v), 0.9);
        // Gli arancioni restano vicini fra loro
        if (u.k) forza.add(d.copy(centroA).sub(u.p).multiplyScalar(0.9));
        u.v.addScaledVector(forza, dt);
        const vel = u.v.length();
        if (vel > 1.1) u.v.multiplyScalar(1.1 / vel);
        if (vel < 0.45) u.v.multiplyScalar(0.45 / (vel || 1));
        u.p.addScaledVector(u.v, dt);
        u.p.z = Math.min(u.p.z, -1);
      }
      for (const u of uccelli) {
        u.g.position.copy(u.p);
        avanti.copy(u.p).add(u.v);
        u.g.lookAt(cielo.localToWorld(avanti));
        u.g.scale.set(1, Math.sin(s * 14 + u.fase) * 1.5, 1);
      }
      centro.position.copy(centroA).addScaledVector(su, 0.35);
      impulsi[impulsi.length - 1]!.o.position.copy(centroA);
      // Le nuvole scorrono da sinistra a destra e rientrano dall'altra parte
      for (const n of nuvole) { n.g.position.x += n.vel * dt; if (n.g.position.x > 7) n.g.position.x = -7; }
    };
    impulso(cielo, arancio, centroK.x, centroK.y, centroK.z, 0.4, 1.6, 1.6, true);
  }

  const accendi = (mats: THREE.Material[], livello: number) => {
    const k = livello === 1 ? 1.5 : livello === 0.5 ? 1 : 0.45;
    mats.forEach(m => { m.opacity = Math.min(1, (m.userData.base ??= m.opacity) * k); });
  };
  let prima = -1;
  // Su schermi larghi il diorama sta a destra: a sinistra c'è il testo della pagina
  const largo = el.clientWidth > 700;
  gruppo.position.x = largo ? 2.6 : 0;
  vista(el, gruppo, punti, {
    // Sul telefono la camera è più vicina: il riquadro è stretto e la vista si allontana già da sola
    camera: largo ? new THREE.Vector3(0, 3.6, 15) : new THREE.Vector3(0, 3, 9.5),
    mira: largo ? new THREE.Vector3(0, 1.4, 0) : new THREE.Vector3(0, 2, 0),
    inclinazione: [0.02, 0.32],
    aggiorna: (t, acceso) => {
      const s = t / 1000, dt = prima < 0 || t === 0 ? 0 : Math.min(0.05, (t - prima) / 1000);
      prima = t;
      cielo.rotation.set(-gruppo.rotation.x, -gruppo.rotation.y, 0, 'YXZ');
      gruppo.updateMatrixWorld();
      aggiornaCielo(s, dt);
      // Anelli che invitano a cliccare: uno ogni 2.4 secondi per sezione, sfalsati
      impulsi.forEach(q => {
        const u = s > 0 ? (((s + q.ritardo) % 2.4) / 2.4) : 0;
        q.o.scale.setScalar(q.da + u * (q.a - q.da));
        (q.o.material as THREE.LineBasicMaterial).opacity = s > 0 ? (1 - u) ** 1.5 * 0.7 : 0;
      });
      // Salto: un pesce esce dall'acqua con un arco e rientra poco più avanti
      if (s > 0 && s > prossimoSalto) {
        salto = { pesce: Math.floor(r() * pesci.length), nato: s };
        prossimoSalto = s + 5 + r() * 4;
      }
      pesci.forEach((p, k) => {
        const a = p.fase + s * p.vel;
        p.g.position.set(STAGNO.x + Math.cos(a) * p.raggio, -p.prof, STAGNO.y + Math.sin(a) * p.raggio * 0.7);
        p.g.rotation.set(0, -a + (p.vel > 0 ? Math.PI : 0), 0);
        const u = (s - salto.nato) / 0.8;
        if (k === salto.pesce && u >= 0 && u <= 1) {
          p.g.position.y = -p.prof + Math.sin(u * Math.PI) * 0.42;
          p.g.rotateX(-Math.cos(u * Math.PI) * 0.9);
          if (u < 0.08) { spruzzi[0]!.o.position.set(p.g.position.x, 0.01, p.g.position.z); spruzzi[0]!.nato = s; }
          if (u > 0.92 && s - spruzzi[1]!.nato > 1) { spruzzi[1]!.o.position.set(p.g.position.x, 0.01, p.g.position.z); spruzzi[1]!.nato = s; }
        }
        p.coda.rotation.y = Math.sin(s * 8 + p.fase) * 0.4;
      });
      spruzzi.forEach(q => { const u = (s - q.nato) / 1.2; q.o.scale.setScalar(0.05 + Math.max(0, u) * 0.45); (q.o.material as THREE.LineBasicMaterial).opacity = u >= 0 && u <= 1 ? (1 - u) * 0.8 : 0; });
      // Lucciole: vagano piano fra gli alberi e si accendono e spengono ognuna col suo ritmo
      if (LUCCIOLE) {
        const pos = gLucciole.attributes.position!, col = gLucciole.attributes.color!;
        baseLucciole.forEach((l, n) => {
          const u = s * 0.4 * l.vel + l.fase;
          pos.setXYZ(n, l.x + Math.sin(u) * 0.3, l.y + Math.sin(u * 1.7) * 0.15, l.z + Math.cos(u * 0.8) * 0.3);
          lucciola.copy(coloreLucciola).multiplyScalar(0.08 + Math.max(0, Math.sin(s * 1.5 * l.vel + l.fase * 3)) * 0.92);
          col.setXYZ(n, lucciola.r, lucciola.g, lucciola.b);
        });
        pos.needsUpdate = true;
        col.needsUpdate = true;
      }
      // Libellule: scatto verso un nuovo punto sopra lo stagno, poi sosta in volo con le ali che vibrano
      libellule.forEach(l => {
        if (s > l.via + 1.1 + l.sosta) { l.da.copy(l.a); puntoSopraStagno(l.a); l.via = s; l.g.lookAt(gruppo.localToWorld(l.a.clone())); }
        const u = THREE.MathUtils.clamp((s - l.via) / 1.1, 0, 1);
        l.g.position.lerpVectors(l.da, l.a, THREE.MathUtils.smootherstep(u, 0, 1));
        l.g.position.y += Math.sin(s * 4) * 0.01;
        l.ali.scale.x = 0.6 + Math.abs(Math.sin(s * 90)) * 0.4;
      });
      // Riflesso della luna: sempre verso chi guarda, con i trattini che tremano
      if (riflesso) {
        riflesso.rotation.y = -gruppo.rotation.y;
        riflesso.scale.x = 1 + Math.sin(s * 3) * 0.15;
      }
      if (stelleAcqua) (stelleAcqua.material as THREE.PointsMaterial).opacity = 0.35 + Math.sin(s * 1.3) * 0.15;
      alberi.forEach((a, k) => { a.rotation.z = Math.sin(s * 1.1 + k) * 0.02; });
      for (const sezione of ['software', 'advisory', 'knowledge']) accendi(materiali[sezione]!, acceso(sezione, `sezione:${sezione}`));
    },
  });
}
