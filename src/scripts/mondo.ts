import * as THREE from 'three';
import { colori, tonoSezione, vista, type Punto } from './vista3d';
import { famigliaCervi } from './cervi';

// Il mondo dell'About: le tre sezioni del sito in un solo diorama, nello stile di bosco e laghetto.
// A terra, su un prato verde: un piccolo bosco (Software) e uno stagno con i pesci (Advisory).
// Sopra, Knowledge: un grande stormo di uccelli arancioni che gira sul diorama, di giorno e di notte.
// Le tre sezioni hanno lo stesso peso; un anello pulsa sotto ognuna e un clic la apre.
// Sul prato cammina una famiglia di cervi. Di notte: luna con il riflesso nello stagno e lucciole nel bosco.
// Di giorno: nuvole. Il cielo resta fermo dietro al diorama, che ruota piano.

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

export function monta(el: HTMLElement) {
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

  // Notte: lucciole fra gli alberi del bosco
  const LUCCIOLE = chiaro ? 0 : 30;
  const baseLucciole = Array.from({ length: LUCCIOLE }, () => ({ x: -1.7 + (r() - 0.5) * 3.6, y: 0.2 + r() * 1.1, z: -0.2 + (r() - 0.5) * 3.8, fase: r() * 10, vel: 0.6 + r() * 0.8 }));
  const gLucciole = new THREE.BufferGeometry();
  gLucciole.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(LUCCIOLE * 3), 3));
  gLucciole.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(LUCCIOLE * 3), 3));
  gruppo.add(new THREE.Points(gLucciole, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.95 })));
  const coloreLucciola = new THREE.Color('#e6ffb3'), lucciola = new THREE.Color();
  // --- Cielo: un gruppo che annulla la rotazione del diorama, così resta sempre dietro
  const cielo = new THREE.Group();
  gruppo.add(cielo);
  const RAGGIO = 7;
  let riflesso: THREE.Group | null = null;
  const nuvole: { g: THREE.Group; vel: number }[] = [];
  if (!chiaro) {
    // Notte: una luna sottile dietro al diorama, con il suo riflesso che trema nello stagno
    const luna = new THREE.Group();
    const arco = (raggio: number, cx: number, da: number, a: number) => curva(Array.from({ length: 24 }, (_, i) => {
      const t = da + (i / 23) * (a - da);
      return new THREE.Vector3(cx + Math.cos(t) * raggio, Math.sin(t) * raggio, 0);
    }), linea(c.fg, 0.8));
    luna.add(arco(0.36, 0, -Math.PI / 2, Math.PI / 2), arco(0.3, -0.12, -1.2, 1.2));
    luna.position.copy(volta(5.6, 0.3, RAGGIO * 0.95));
    cielo.add(luna);
    riflesso = new THREE.Group();
    const trattini: number[] = [];
    for (let k = 0; k < 9; k++) { const z = 0.5 - k * 0.11, l = 0.05 + (1 - Math.abs(k - 4) / 4) * 0.12; trattini.push(-l, 0, z, l, 0, z); }
    riflesso.add(segmenti(trattini, linea(c.fg, 0.55)));
    riflesso.position.set(STAGNO.x, 0.01, STAGNO.y);
    gruppo.add(riflesso);
  } else {
    // Giorno: nuvole a grappoli di palle a fili, bianche e piene appena, che attraversano piano il cielo
    for (let k = 0; k < 4; k++) {
      const g = new THREE.Group();
      for (let q = 0; q < 4; q++) {
        const geo = new THREE.IcosahedronGeometry(0.35 + r() * 0.25, 1);
        const palla = new THREE.Group();
        palla.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false })), new THREE.LineSegments(new THREE.EdgesGeometry(geo), linea(c.muted, 0.25)));
        palla.position.set(q * 0.45 - 0.7, Math.sin(q * 1.7) * 0.15, (r() - 0.5) * 0.2);
        palla.scale.y = 0.6;
        g.add(palla);
      }
      g.position.copy(volta(3.6 + k * 0.75, 0.35 + (k % 2) * 0.2, RAGGIO * 0.92));
      cielo.add(g);
      nuvole.push({ g, vel: 0.12 + r() * 0.1 });
    }
  }

  // --- Stormo (Knowledge): uccelli arancioni con le ali piene, che girano in tondo sopra il diorama.
  // Regole degli stormi veri: non urtarsi, andare nella stessa direzione dei vicini, seguire il punto che guida.
  const UCCELLI = 64;
  const geoAla = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.05), new THREE.Vector3(0.17, 0.02, -0.02), new THREE.Vector3(0, 0, -0.06)]);
  const bordoAla = new THREE.EdgesGeometry(geoAla);
  const matAla = pieno('knowledge', arancio, chiaro ? 0.9 : 0.85);
  matAla.side = THREE.DoubleSide;
  const matBordoAla = mat('knowledge', arancio.clone().offsetHSL(0, 0, chiaro ? -0.12 : 0.1), 1);
  const guidaStormo = new THREE.Vector3();
  const posizioneGuida = (s: number, out: THREE.Vector3) => out.set(0.2 + Math.cos(s * 0.22) * 2.4, 2.6 + Math.sin(s * 0.37) * 0.35, -0.6 + Math.sin(s * 0.22) * 1.5);
  posizioneGuida(0, guidaStormo);
  const uccelli = Array.from({ length: UCCELLI }, () => {
    const g = new THREE.Group();
    const ali = [1, -1].map(lato => {
      const ala = new THREE.Group();
      ala.add(new THREE.Mesh(geoAla, matAla), new THREE.LineSegments(bordoAla, matBordoAla));
      ala.scale.x = lato;
      g.add(ala);
      return ala;
    });
    g.add(segmenti([0, 0, 0.07, 0, 0, -0.08], matBordoAla));
    gruppo.add(g);
    const p = guidaStormo.clone().add(new THREE.Vector3((r() - 0.5) * 1.6, (r() - 0.5) * 0.6, (r() - 0.5) * 1.2));
    return { g, ali, p, v: new THREE.Vector3(-0.6, 0, 0.3), fase: r() * 6 };
  });
  const centroStormo = new THREE.Object3D();
  gruppo.add(centroStormo);
  punti.push({ id: 'sezione:knowledge', label: 'Knowledge →', href: '/knowledge/', hub: true, famiglia: 'knowledge', ancora: centroStormo, tono: 'arancio' });
  // L'anello dello stormo è verticale e si gira sempre verso chi guarda
  impulso(gruppo, arancio, 0, 0, 0, 0.5, 1.6, 1.6, true);
  const anelloStormo = impulsi[impulsi.length - 1]!.o;
  const forza = new THREE.Vector3(), d = new THREE.Vector3(), media = new THREE.Vector3(), centro = new THREE.Vector3(), avanti = new THREE.Vector3();
  const muoviStormo = (s: number, dt: number) => {
    posizioneGuida(s, guidaStormo);
    centro.set(0, 0, 0);
    for (const u of uccelli) centro.add(u.p);
    centro.multiplyScalar(1 / UCCELLI);
    if (dt > 0) for (const u of uccelli) {
      forza.copy(guidaStormo).sub(u.p).multiplyScalar(0.6);
      media.set(0, 0, 0);
      let quanti = 0;
      for (const q of uccelli) {
        if (q === u) continue;
        d.copy(u.p).sub(q.p);
        const l = d.length();
        if (l < 0.55) { media.add(q.v); quanti++; }
        if (l < 0.2 && l > 1e-4) forza.addScaledVector(d, (0.2 - l) * 14 / l);
      }
      if (quanti) forza.addScaledVector(media.multiplyScalar(1 / quanti).sub(u.v), 1.1);
      u.v.addScaledVector(forza, dt);
      const vel = u.v.length();
      if (vel > 1.5) u.v.multiplyScalar(1.5 / vel);
      if (vel < 0.6) u.v.multiplyScalar(0.6 / (vel || 1));
      u.p.addScaledVector(u.v, dt);
    }
    for (const u of uccelli) {
      u.g.position.copy(u.p);
      avanti.copy(u.p).add(u.v);
      u.g.lookAt(gruppo.localToWorld(avanti));
      // Ali che battono, ognuno col suo ritmo
      const battito = Math.sin(s * 11 + u.fase) * 0.65;
      u.ali[0]!.rotation.z = battito;
      u.ali[1]!.rotation.z = -battito;
    }
    centroStormo.position.copy(centro).add(new THREE.Vector3(0, 0.45, 0));
    anelloStormo.position.copy(centro);
    anelloStormo.rotation.set(Math.PI / 2, 0, 0);
    anelloStormo.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -gruppo.rotation.y);
  };

  // --- Cervi: una piccola famiglia che cammina sul prato, gira intorno agli alberi e allo stagno
  const famiglia = famigliaCervi(gruppo, {
    colori: c, chiaro, casuale: r, tipi: ['cervo', 'cerva', 'cerbiatto'],
    meta: out => { do { out.set((r() - 0.5) * 7, (r() - 0.5) * 6.5); } while (!sullIsola(out.x, out.y, 0.5) || nelloStagno(out.x, out.y, -0.4)); },
    ostacoli: () => [...alberi.map(a => ({ x: a.position.x, z: a.position.z, raggio: 0.4 })), { x: -1.7, z: -0.2, raggio: 0.7 }, { x: STAGNO.x, z: STAGNO.y, raggio: 1.8 }],
  });

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
      muoviStormo(s, dt);
      famiglia.aggiorna(t, true);
      // Le nuvole scorrono da sinistra a destra e rientrano dall'altra parte
      for (const n of nuvole) { n.g.position.x += n.vel * dt; if (n.g.position.x > 7) n.g.position.x = -7; }
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
      // Riflesso della luna: sempre verso chi guarda, con i trattini che tremano
      if (riflesso) {
        riflesso.rotation.y = -gruppo.rotation.y;
        riflesso.scale.x = 1 + Math.sin(s * 3) * 0.15;
      }
      alberi.forEach((a, k) => { a.rotation.z = Math.sin(s * 1.1 + k) * 0.02; });
      for (const sezione of ['software', 'advisory', 'knowledge']) accendi(materiali[sezione]!, acceso(sezione, `sezione:${sezione}`));
    },
  });
}
