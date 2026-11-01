import * as THREE from 'three';
import { colori, tonoSezione, vista, type Punto } from './vista3d';

// Cielo stellato sopra una piccola collina, in wireframe, nello stile di bosco e laghetto.
// Sulla collina: erba, qualche abete e un cannocchiale che punta la costellazione sotto il puntatore.
// Nel cielo: stelle che brillano, la Via Lattea, una luna sottile, stelle cadenti ogni tanto.
// Tre costellazioni, una per sezione del sito e nel suo colore: la stella grande porta il nome della sezione,
// le stelle piccole sono le sue voci (competenze chiave o temi). Un clic apre la sezione o la voce.

export interface Voce { id: string; label: string; href: string }
export interface Sezione { id: string; label: string; href: string; tono: string; voci: Voce[] }

const CIELO = 5.2;

function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}
const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
const segmenti = (xyz: number[], mat: THREE.LineBasicMaterial) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.LineSegments(g, mat);
};
const anello = (punti: THREE.Vector3[], mat: THREE.LineBasicMaterial) => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(punti), mat);
const spigoli = (geo: THREE.BufferGeometry, mat: THREE.LineBasicMaterial) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
// Punto sulla volta del cielo: azimut e altezza sull'orizzonte, in radianti
const volta = (az: number, alt: number, raggio = CIELO) => new THREE.Vector3(Math.cos(alt) * Math.cos(az) * raggio, Math.sin(alt) * raggio + 0.2, Math.cos(alt) * Math.sin(az) * raggio);
// Stella a quattro punte, piatta: si gira sempre verso la camera
const sagomaStella = (lungo: number, stretto: number) => Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2, d = i % 2 === 0 ? lungo : stretto;
  return new THREE.Vector3(Math.sin(a) * d, Math.cos(a) * d, 0);
});

export function monta(el: HTMLElement, sezioni: Sezione[]) {
  const c = colori(el);
  const toni = sezioni.map(s => tonoSezione(`--${s.tono}`));
  const verde = tonoSezione('--verde').lerp(c.muted, 0.3);
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const r = casuale(31);
  const chiaro = document.documentElement.dataset.theme === 'light';

  // Collina: un cupola bassa a fili, con erba, abeti e sassi; intorno il terreno a puntini come lo sfondo del sito
  const collina = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(2.2, 18, 6, 0, Math.PI * 2, 0, 0.55)), linea(c.muted, chiaro ? 0.35 : 0.25));
  collina.position.y = -2.2 * Math.cos(0.55);
  gruppo.add(collina);
  const quota = (x: number, z: number) => Math.max(0, Math.sqrt(Math.max(0, 2.2 * 2.2 - x * x - z * z)) - 2.2 * Math.cos(0.55));
  const terreno: number[] = [];
  for (let x = -5; x <= 5; x += 0.35) for (let z = -5; z <= 5; z += 0.35) if (Math.hypot(x, z) < 5 && Math.hypot(x, z) > 1.2) terreno.push(x, quota(x, z), z);
  const gt = new THREE.BufferGeometry();
  gt.setAttribute('position', new THREE.Float32BufferAttribute(terreno, 3));
  gruppo.add(new THREE.Points(gt, new THREE.PointsMaterial({ color: c.muted, size: 0.025, transparent: true, opacity: 0.55 })));
  const erba: number[] = [];
  for (let k = 0; k < 140; k++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 3.6;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, y = quota(x, z), h = 0.06 + r() * 0.08;
    for (const dx of [-0.04, 0, 0.04]) erba.push(x, y, z, x + dx, y + h * (dx === 0 ? 1.3 : 1), z + dx * 0.5);
  }
  gruppo.add(segmenti(erba, linea(verde, 0.55)));
  // Abeti scuri a gruppi sul bordo della collina: coni pieni appena, come nel bosco
  const matAbete = linea(verde, 0.7);
  for (let k = 0; k < 9; k++) {
    const a = 2.4 + (k / 9) * 2.2 + (r() - 0.5) * 0.2, d = 1.9 + r() * 1.4;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, y = quota(x, z), alto = 0.45 + r() * 0.4;
    const abete = new THREE.Group();
    abete.add(segmenti([0, 0, 0, 0, alto * 0.35, 0], linea(c.fg, 0.6)));
    for (let p = 0; p < 3; p++) {
      const h = alto * 0.42, cono = spigoli(new THREE.ConeGeometry(0.16 * (1 - p * 0.25), h, 7), matAbete);
      const pieno = new THREE.Mesh(new THREE.ConeGeometry(0.16 * (1 - p * 0.25), h, 7), new THREE.MeshBasicMaterial({ color: verde, transparent: true, opacity: 0.18, depthWrite: false }));
      cono.position.y = pieno.position.y = alto * 0.25 + p * alto * 0.22 + h / 2;
      abete.add(pieno, cono);
    }
    abete.position.set(x, y, z);
    gruppo.add(abete);
  }
  const matSassi = linea(c.muted, 0.6);
  for (let k = 0; k < 8; k++) {
    const a = r() * Math.PI * 2, d = 0.8 + r() * 2.6, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const sasso = spigoli(new THREE.DodecahedronGeometry(0.05 + r() * 0.07, 0), matSassi);
    sasso.position.set(x, quota(x, z) + 0.02, z);
    sasso.scale.y = 0.55;
    gruppo.add(sasso);
  }

  // Cannocchiale sul treppiede in cima alla collina: il tubo punta la costellazione sotto il puntatore
  const cannocchiale = new THREE.Group();
  const matTubo = linea(c.fg, 0.85);
  cannocchiale.add(segmenti([0, 0, 0, -0.18, -0.42, 0.1, 0, 0, 0, 0.18, -0.42, 0.1, 0, 0, 0, 0, -0.42, -0.2], linea(c.fg, 0.6)));
  const tubo = new THREE.Group();
  const corpoTubo = spigoli(new THREE.CylinderGeometry(0.055, 0.045, 0.6, 10, 1, true), matTubo);
  corpoTubo.rotation.x = Math.PI / 2;
  corpoTubo.position.z = 0.12;
  const lente = anello(Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0.42); }), matTubo);
  tubo.add(corpoTubo, lente);
  cannocchiale.add(tubo);
  cannocchiale.position.set(0.1, quota(0.1, 0.2) + 0.42, 0.2);
  gruppo.add(cannocchiale);

  // Il cielo è un gruppo a parte: la collina ruota, il cielo resta fermo dietro di lei (gira solo piano su se stesso).
  // Tutto il cielo sta nella metà lontana dalla camera (z negativa), così non passa davanti al testo.
  const cielo = new THREE.Group();
  gruppo.add(cielo);
  const dietro = (p: THREE.Vector3) => { if (p.z > -0.3) p.z = -0.3 - Math.abs(p.z) * 0.5; return p; };
  // Stelle di fondo: punti sulla volta, ognuno con la sua luce; la Via Lattea è una fascia più fitta e tenue
  const N = 520;
  const stelle = new Float32Array(N * 3), luci = new Float32Array(N * 3), fasi = new Float32Array(N), forza = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let p: THREE.Vector3;
    if (i < 200) {
      // Via Lattea: un grande cerchio inclinato, con i punti sparsi intorno
      const a = r() * Math.PI * 2, spessore = (r() - 0.5) * 0.35;
      p = new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.45 + spessore, Math.sin(a) * 0.9 + spessore * 0.5).normalize().multiplyScalar(CIELO * 1.02);
      if (p.y < 0.3) p.y = Math.abs(p.y) + 0.3;
      dietro(p);
      forza[i] = 0.25 + r() * 0.25;
    } else {
      p = dietro(volta(r() * Math.PI * 2, Math.asin(r() * 0.97), CIELO * (1 + r() * 0.05)));
      forza[i] = 0.35 + r() ** 3 * 0.65;
    }
    stelle.set([p.x, p.y, p.z], i * 3);
    fasi[i] = r() * 10;
  }
  const gStelle = new THREE.BufferGeometry();
  gStelle.setAttribute('position', new THREE.BufferAttribute(stelle, 3));
  gStelle.setAttribute('color', new THREE.BufferAttribute(luci, 3));
  cielo.add(new THREE.Points(gStelle, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.95, fog: false })));

  // Luna sottile, bassa sull'orizzonte: due archi
  const luna = new THREE.Group();
  const arco = (raggio: number, cx: number, da: number, a: number) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 24 }, (_, i) => {
    const t = da + (i / 23) * (a - da);
    return new THREE.Vector3(cx + Math.cos(t) * raggio, Math.sin(t) * raggio, 0);
  })), linea(c.fg, 0.8));
  luna.add(arco(0.32, 0, -Math.PI / 2, Math.PI / 2), arco(0.27, -0.1, -1.2, 1.2));
  luna.position.copy(volta(5.5, 0.28, CIELO * 0.95));
  cielo.add(luna);

  // Costellazioni: una per sezione, in tre punti del cielo
  const materiali: THREE.LineBasicMaterial[][] = sezioni.map(() => []);
  const mat = (k: number, opacita: number) => { const m = linea(toni[k]!, opacita); materiali[k]!.push(m); return m; };
  const sagome: { g: THREE.Object3D; fase: number; k: number }[] = [];
  const centri: THREE.Vector3[] = [];
  sezioni.forEach((s, k) => {
    // Tre punti del cielo dietro la collina, da sinistra a destra
    const az = [4.1, 4.75, 5.45][k]!, alt = [0.36, 0.62, 0.34][k]!;
    const centro = volta(az, alt);
    centri.push(centro);
    // Le stelle della costellazione stanno sul piano tangente alla volta, intorno al centro
    const est = new THREE.Vector3(-Math.sin(az), 0, Math.cos(az)), su = centro.clone().normalize().cross(est).normalize().negate();
    const posti = s.voci.map((_, i) => {
      const a = (i / s.voci.length) * Math.PI * 2 + r() * 0.5, d = 0.7 + r() * 0.6;
      return centro.clone().addScaledVector(est, Math.cos(a) * d).addScaledVector(su, Math.sin(a) * d * 0.8);
    });
    // Linee: dal centro alla prima voce, poi in fila, come le figure delle costellazioni
    const xyz: number[] = [];
    [centro, ...posti].forEach((p, i, tutti) => { const q = tutti[i + 1]; if (q) xyz.push(p.x, p.y, p.z, q.x, q.y, q.z); });
    if (posti.length > 2) xyz.push(...posti[posti.length - 1]!.toArray(), ...posti[1]!.toArray());
    cielo.add(segmenti(xyz, mat(k, 0.35)));
    const nuova = (p: THREE.Vector3, dim: number) => {
      const g = new THREE.Group();
      g.add(anello(sagomaStella(dim, dim * 0.18), mat(k, 0.95)));
      g.add(anello(sagomaStella(dim * 0.45, dim * 0.1).map(v => v.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 4)), mat(k, 0.5)));
      g.position.copy(p);
      cielo.add(g);
      sagome.push({ g, fase: r() * 10, k });
      return g;
    };
    punti.push({ id: `sezione:${s.id}`, label: s.label, href: s.href, hub: true, famiglia: s.id, ancora: nuova(centro, 0.3), tono: s.tono });
    s.voci.forEach((v, i) => punti.push({ id: v.id, label: v.label, href: v.href, hub: false, famiglia: s.id, ancora: nuova(posti[i]!, 0.13), tono: s.tono }));
  });

  // Stelle cadenti: una scia che attraversa il cielo e svanisce, ogni 4-9 secondi
  const scia = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), linea(c.fg, 0));
  cielo.add(scia);
  let cadente = { da: new THREE.Vector3(), a: new THREE.Vector3(), nata: -1e9 }, prossima = 3000;

  const accendi = (mats: THREE.Material[], livello: number) => {
    const k = livello === 1 ? 1.5 : livello === 0.5 ? 1 : 0.45;
    mats.forEach(m => { m.opacity = Math.min(1, (m.userData.base ??= m.opacity) * k); });
  };
  const luce = new THREE.Color(), mira = new THREE.Vector3(), guarda = new THREE.Vector3(0, 0.6, 1);
  let prima = -1;

  // Su schermi larghi la scena sta a destra: a sinistra c'è il testo della pagina
  gruppo.position.x = el.clientWidth > 700 ? 3 : 0;
  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 1.6, 11),
    mira: new THREE.Vector3(0, 1.4, 0),
    inclinazione: [-0.05, 0.2],
    aggiorna: (t, acceso) => {
      const s = t / 1000, dt = prima < 0 || t === 0 ? 0 : Math.min(0.05, (t - prima) / 1000);
      prima = t;
      // Le stelle brillano, ognuna col suo ritmo
      for (let i = 0; i < N; i++) {
        const b = forza[i]! * (0.75 + 0.25 * Math.sin(s * (1.2 + (fasi[i]! % 1) * 2) + fasi[i]!));
        luce.copy(c.fg).multiplyScalar(b);
        luci.set([luce.r, luce.g, luce.b], i * 3);
      }
      gStelle.attributes.color!.needsUpdate = true;
      // Le stelle delle costellazioni guardano la camera e pulsano piano
      // Il cielo annulla la rotazione della collina: resta fermo davanti alla camera
      cielo.rotation.set(-gruppo.rotation.x, -gruppo.rotation.y, 0, 'YXZ');
      sagome.forEach(q => { q.g.scale.setScalar(1 + Math.sin(s * 1.6 + q.fase) * 0.1); });
      sezioni.forEach((sz, k) => accendi(materiali[k]!, acceso(sz.id, `sezione:${sz.id}`)));
      // Cannocchiale: punta la costellazione accesa, altrimenti scruta il cielo piano
      // Famiglia accesa: quella che resta a 0.5 quando le altre scendono a 0.15
      const livelli = sezioni.map(sz => acceso(sz.id, ''));
      const accesa = livelli.includes(0.15) ? livelli.indexOf(0.5) : -1;
      // Direzioni nello spazio del mondo: la costellazione sta nel cielo fermo, il cannocchiale sulla collina che ruota
      gruppo.updateMatrixWorld();
      const base = cannocchiale.getWorldPosition(new THREE.Vector3());
      if (accesa >= 0) mira.copy(cielo.localToWorld(centri[accesa]!.clone())).sub(base).normalize();
      else mira.set(Math.cos(s * 0.15) * 0.8, 0.7, -0.6 - Math.abs(Math.sin(s * 0.15)) * 0.4).normalize();
      guarda.lerp(mira, Math.min(1, dt * 2)).normalize();
      tubo.lookAt(base.add(guarda));
      // Stella cadente
      if (t > 0 && t > prossima) {
        const az = 3.4 + r() * 2.4;
        cadente = { da: volta(az, 0.6 + r() * 0.5), a: volta(az + 0.5 + r() * 0.4, 0.25 + r() * 0.2), nata: t };
        prossima = t + 4000 + r() * 5000;
      }
      const u = (t - cadente.nata) / 900;
      const m = scia.material as THREE.LineBasicMaterial;
      if (u >= 0 && u <= 1) {
        const testa = cadente.da.clone().lerp(cadente.a, u), coda = cadente.da.clone().lerp(cadente.a, Math.max(0, u - 0.25));
        (scia.geometry.attributes.position as THREE.BufferAttribute).setXYZ(0, coda.x, coda.y, coda.z).setXYZ(1, testa.x, testa.y, testa.z).needsUpdate = true;
        m.opacity = Math.sin(u * Math.PI) * 0.9;
      } else m.opacity = 0;
    },
  });
}
