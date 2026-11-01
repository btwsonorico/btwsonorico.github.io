import * as THREE from 'three';
import { colori, tonoSezione, vista, type Punto } from './vista3d';

// Panorama del sito in 3D wireframe, nello stile di bosco e laghetto: le tre sezioni (Software, Advisory, Knowledge)
// in una sola scena. Tre varianti da confrontare:
// - stella: una stella a quattro punte, minimale, con tre mondi che le girano intorno;
// - costellazione: tre costellazioni nel cielo, una per sezione; ogni stella è una competenza o un tema;
// - scrivania: una scrivania con il laptop (Software), una lavagna a fogli (Advisory) e una pila di libri (Knowledge).
// Un clic su un mondo, una costellazione o un oggetto apre la sua sezione.

export interface Voce { id: string; label: string; href: string }
export interface Sezione { id: string; label: string; href: string; tono: string; voci: Voce[] }
export interface DatiPanorama { tipo: 'stella' | 'costellazione' | 'scrivania'; sezioni: Sezione[] }

function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}
const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
const spigoli = (geo: THREE.BufferGeometry, mat: THREE.LineBasicMaterial) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
const segmenti = (xyz: number[], mat: THREE.LineBasicMaterial) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.LineSegments(g, mat);
};
const nuvola = (xyz: number[], colore: THREE.Color, size: number, opacita: number) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: colore, size, transparent: true, opacity: opacita }));
};
const cerchio = (raggio: number, n = 96) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a) * raggio, 0, Math.sin(a) * raggio);
});
const anello = (punti: THREE.Vector3[], mat: THREE.LineBasicMaterial) => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(punti), mat);

// Stella a quattro punte, piatta: punte lunghe sugli assi, rientranze strette fra una punta e l'altra
function stellaQuattroPunte(lungo: number, stretto: number) {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2, d = i % 2 === 0 ? lungo : stretto;
    return new THREE.Vector3(Math.sin(a) * d, Math.cos(a) * d, 0);
  });
}

// Accensione degli oggetti: ogni materiale ricorda la sua opacità di base
const accendi = (mats: THREE.Material[], livello: number) => {
  const k = livello === 1 ? 1.6 : livello === 0.5 ? 1 : 0.35;
  mats.forEach(m => { m.opacity = Math.min(1, (m.userData.base ??= m.opacity) * k); });
};

export function monta(el: HTMLElement) {
  const dati = JSON.parse(el.dataset.grafo!) as DatiPanorama;
  const c = colori(el);
  const toni = dati.sezioni.map(s => tonoSezione(`--${s.tono}`));
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const r = casuale(3);
  const chiaro = document.documentElement.dataset.theme === 'light';
  // Le parti di ogni sezione, per accenderle insieme quando il puntatore è sopra
  const materiali: THREE.Material[][] = dati.sezioni.map(() => []);
  const mat = (k: number, colore: THREE.Color, opacita: number) => { const m = linea(colore, opacita); materiali[k]!.push(m); return m; };
  const hub = (s: Sezione, ancora: THREE.Object3D, base?: THREE.Object3D, k = 0) =>
    punti.push({ id: `sezione:${s.id}`, label: s.label, href: s.href, hub: true, famiglia: s.id, ancora, base, tono: dati.sezioni[k]!.tono });

  // Cielo a puntini, come lo sfondo del sito (stella e costellazione)
  const cielo = (raggio: number, n: number) => {
    const xyz: number[] = [];
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(raggio * (0.6 + r() * 0.4));
      xyz.push(v.x, v.y, v.z);
    }
    gruppo.add(nuvola(xyz, c.fg, 0.025, chiaro ? 0.45 : 0.35));
  };

  let aggiorna: (t: number, acceso: (famiglia: string, id: string) => number) => void = () => {};
  let opzioni = { camera: new THREE.Vector3(0, 3.2, 9), mira: new THREE.Vector3(0, 0, 0), inclinazione: [0.12, 0.6] as [number, number] };

  if (dati.tipo === 'stella') {
    // La stella: due sagome a quattro punte incrociate (una di fronte, una di lato) e un alone sottile
    const stella = new THREE.Group();
    const matStella = linea(c.fg, 0.95), matInterno = linea(c.fg, 0.35);
    const sagoma = stellaQuattroPunte(1.25, 0.16);
    stella.add(anello(sagoma, matStella));
    const lato = anello(sagoma, matStella);
    lato.rotation.y = Math.PI / 2;
    stella.add(lato);
    // Raggi dal centro alle punte: danno volume senza riempire
    stella.add(segmenti([0, 1.25, 0, 0, -1.25, 0, 1.25, 0, 0, -1.25, 0, 0, 0, 0, 1.25, 0, 0, -1.25], matInterno));
    stella.add(anello(cerchio(0.42, 48).map(p => new THREE.Vector3(p.x, p.z, 0)), linea(c.fg, 0.2)));
    gruppo.add(stella);
    cielo(11, 260);

    // Tre mondi su orbite di raggio e inclinazione diversi
    const mondi = dati.sezioni.map((s, k) => {
      const raggio = 2.3 + k * 0.85, inclina = [0.1, -0.16, 0.22][k]!, dim = [0.32, 0.38, 0.3][k]!;
      const orbita = new THREE.Group();
      orbita.rotation.set(inclina, 0, inclina * 0.6);
      orbita.add(anello(cerchio(raggio), mat(k, toni[k]!, 0.28)));
      const mondo = new THREE.Group();
      mondo.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(dim, 1)), mat(k, toni[k]!, 0.75)));
      // Un dettaglio per mondo: anello (Software), luna piccola (Advisory), poli (Knowledge)
      if (k === 0) { const a = anello(cerchio(dim * 1.7, 48), mat(k, toni[k]!, 0.6)); a.rotation.x = 0.5; mondo.add(a); }
      if (k === 1) { const luna = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.08, 0)), mat(k, toni[k]!, 0.7)); luna.position.set(dim * 1.9, 0, 0); luna.name = 'luna'; mondo.add(luna); }
      if (k === 2) mondo.add(segmenti([0, dim * 1.5, 0, 0, -dim * 1.5, 0], mat(k, toni[k]!, 0.6)));
      orbita.add(mondo);
      gruppo.add(orbita);
      hub(s, mondo, undefined, k);
      return { mondo, raggio, fase: k * 2.1 + 0.4, vel: 0.00011 / (1 + k * 0.45) };
    });

    aggiorna = (t, acceso) => {
      stella.rotation.y = t * 0.00025;
      stella.scale.setScalar(1 + Math.sin(t * 0.0015) * 0.03);
      mondi.forEach((m, k) => {
        const a = m.fase + t * m.vel;
        m.mondo.position.set(Math.cos(a) * m.raggio, 0, Math.sin(a) * m.raggio);
        m.mondo.rotation.y = t * 0.0006;
        const luna = m.mondo.getObjectByName('luna');
        if (luna) luna.position.set(Math.cos(t * 0.0012) * 0.7, 0.1, Math.sin(t * 0.0012) * 0.7);
        accendi(materiali[k]!, acceso(dati.sezioni[k]!.id, `sezione:${dati.sezioni[k]!.id}`));
      });
    };
  }

  if (dati.tipo === 'costellazione') {
    cielo(11, 420);
    // Ogni sezione: una stella grande (il suo nome) e una stella per voce, unite da linee in ordine di angolo
    const brillano: { stella: THREE.Object3D; fase: number }[] = [];
    dati.sezioni.forEach((s, k) => {
      const a0 = (k / dati.sezioni.length) * Math.PI * 2 + 0.3;
      const centro = new THREE.Vector3(Math.cos(a0) * 3, [0.6, -0.4, 0.2][k]!, Math.sin(a0) * 3);
      const posti = s.voci.map((_, i) => {
        const a = (i / s.voci.length) * Math.PI * 2 + r() * 0.6, d = 0.8 + r() * 0.7;
        return centro.clone().add(new THREE.Vector3(Math.cos(a) * d, Math.sin(a) * d * 0.8, (r() - 0.5) * 0.8));
      });
      // Linee della costellazione: dal centro alla prima voce, poi da una voce alla successiva
      const xyz: number[] = [];
      [centro, ...posti].forEach((p, i, tutti) => { const q = tutti[i + 1]; if (q) xyz.push(p.x, p.y, p.z, q.x, q.y, q.z); });
      gruppo.add(segmenti(xyz, mat(k, toni[k]!, 0.4)));
      // Stelle: piccole stelle a quattro punte, la più grande al centro
      const nuova = (p: THREE.Vector3, dim: number) => {
        const g = new THREE.Group();
        g.add(anello(stellaQuattroPunte(dim, dim * 0.2), mat(k, toni[k]!, 0.9)));
        g.position.copy(p);
        gruppo.add(g);
        brillano.push({ stella: g, fase: r() * 10 });
        return g;
      };
      hub(s, nuova(centro, 0.32), undefined, k);
      s.voci.forEach((v, i) => punti.push({ id: v.id, label: v.label, href: v.href, hub: false, famiglia: s.id, ancora: nuova(posti[i]!, 0.13), tono: s.tono }));
    });
    aggiorna = (t, acceso) => {
      // Le stelle guardano sempre la camera e brillano piano
      brillano.forEach(b => { b.stella.rotation.y = -gruppo.rotation.y; b.stella.scale.setScalar(1 + Math.sin(t * 0.002 + b.fase) * 0.12); });
      dati.sezioni.forEach((s, k) => accendi(materiali[k]!, acceso(s.id, `sezione:${s.id}`)));
    };
  }

  if (dati.tipo === 'scrivania') {
    opzioni = { camera: new THREE.Vector3(0, 2.6, 6.2), mira: new THREE.Vector3(0, 0.55, 0), inclinazione: [0.1, 0.55] };
    const matMobile = linea(c.fg, 0.55), matTenue = linea(c.muted, 0.6);
    // Pavimento a puntini, come lo sfondo del sito
    const xyz: number[] = [];
    for (let x = -4; x <= 4; x += 0.3) for (let z = -3; z <= 3; z += 0.3) if (Math.hypot(x, z * 1.3) < 4) xyz.push(x, 0, z);
    gruppo.add(nuvola(xyz, c.fg, 0.02, chiaro ? 0.5 : 0.3));
    // Scrivania: piano e quattro gambe
    const piano = spigoli(new THREE.BoxGeometry(3.2, 0.08, 1.5), matMobile);
    piano.position.y = 1;
    gruppo.add(piano);
    [[-1.5, -0.65], [1.5, -0.65], [-1.5, 0.65], [1.5, 0.65]].forEach(([x, z]) => gruppo.add(segmenti([x!, 0, z!, x!, 0.96, z!], matMobile)));

    // Laptop (Software): base, schermo aperto e righe di codice verdi
    const laptop = new THREE.Group();
    laptop.add(spigoli(new THREE.BoxGeometry(0.95, 0.04, 0.65), mat(0, toni[0]!, 0.8)));
    const schermo = new THREE.Group();
    schermo.add(spigoli(new THREE.BoxGeometry(0.95, 0.62, 0.03), mat(0, toni[0]!, 0.8)));
    const codice: number[] = [];
    for (let i = 0; i < 7; i++) { const x0 = -0.38 + (i % 3) * 0.06, y = 0.22 - i * 0.07; codice.push(x0, y, 0.02, x0 + 0.15 + r() * 0.4, y, 0.02); }
    schermo.add(segmenti(codice, mat(0, toni[0]!, 0.7)));
    schermo.position.set(0, 0.32, -0.33);
    schermo.rotation.x = -0.25;
    laptop.add(schermo);
    laptop.position.set(-0.2, 1.06, 0.05);
    gruppo.add(laptop);
    const cimaLaptop = new THREE.Object3D();
    cimaLaptop.position.set(0, 0.3, 0);
    schermo.add(cimaLaptop);

    // Pila di libri (Knowledge): tre libri un po' storti e uno aperto in cima
    const libri = new THREE.Group();
    [[0.62, 0.11, 0.42, 0.1], [0.55, 0.09, 0.4, -0.15], [0.5, 0.1, 0.36, 0.25]].reduce((y, [l, a, p, giro]) => {
      const libro = spigoli(new THREE.BoxGeometry(l!, a!, p!), mat(2, toni[2]!, 0.8));
      libro.position.y = y + a! / 2;
      libro.rotation.y = giro!;
      libri.add(libro);
      return y + a!;
    }, 0);
    libri.add(segmenti([-0.22, 0.32, 0, 0, 0.36, 0, 0, 0.36, 0, 0.22, 0.32, 0, -0.22, 0.32, -0.16, 0, 0.36, -0.16, 0, 0.36, -0.16, 0.22, 0.32, -0.16, 0, 0.36, 0, 0, 0.36, -0.16], mat(2, toni[2]!, 0.8)));
    libri.position.set(1.05, 1.04, 0.1);
    gruppo.add(libri);
    const cimaLibri = new THREE.Object3D();
    cimaLibri.position.y = 0.4;
    libri.add(cimaLibri);

    // Lavagna a fogli (Advisory), accanto alla scrivania: treppiede, foglio con un grafico a barre e una freccia
    const lavagna = new THREE.Group();
    lavagna.add(segmenti([-0.45, 0, 0.25, -0.35, 1.9, 0, 0.45, 0, 0.25, 0.35, 1.9, 0, 0, 0, -0.35, 0, 1.9, 0], mat(1, toni[1]!, 0.55)));
    const foglio = spigoli(new THREE.BoxGeometry(0.95, 0.75, 0.01), mat(1, toni[1]!, 0.85));
    foglio.position.y = 1.5;
    lavagna.add(foglio);
    const barre: number[] = [];
    [0.15, 0.3, 0.22, 0.45].forEach((h, i) => { const x = -0.28 + i * 0.18; barre.push(x, 1.22, 0.01, x, 1.22 + h, 0.01, x + 0.1, 1.22, 0.01, x + 0.1, 1.22 + h, 0.01, x, 1.22 + h, 0.01, x + 0.1, 1.22 + h, 0.01); });
    barre.push(-0.32, 1.7, 0.01, 0.3, 1.8, 0.01, 0.3, 1.8, 0.01, 0.24, 1.76, 0.01, 0.3, 1.8, 0.01, 0.25, 1.83, 0.01);
    lavagna.add(segmenti(barre, mat(1, toni[1]!, 0.85)));
    lavagna.position.set(-2.35, 0, -0.35);
    lavagna.rotation.y = 0.35;
    gruppo.add(lavagna);
    const cimaLavagna = new THREE.Object3D();
    cimaLavagna.position.y = 1.9;
    lavagna.add(cimaLavagna);

    // Dettagli neutri: tazza che fuma, lampada da tavolo, sedia
    const tazza = new THREE.Group();
    tazza.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.09, 0.08, 0.2, 12, 1, true)), matTenue));
    tazza.add(anello(cerchio(0.09, 16).map(p => p.setY(0.1)), matTenue), anello(cerchio(0.05, 12).map(p => new THREE.Vector3(0.12 + p.x * 0.6, p.z, 0)), matTenue));
    tazza.position.set(0.55, 1.14, 0.45);
    gruppo.add(tazza);
    const fumo = Array.from({ length: 3 }, (_, i) => {
      const f = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 8 }, (_, j) => new THREE.Vector3(Math.sin(j * 0.9 + i) * 0.03, j * 0.05, 0))), linea(c.muted, 0.35));
      f.position.set(0.55 + (i - 1) * 0.04, 1.27, 0.45);
      gruppo.add(f);
      return f;
    });
    gruppo.add(segmenti([-1.25, 1.04, -0.4, -1.25, 1.6, -0.5, -1.25, 1.6, -0.5, -0.95, 1.75, -0.35, -0.95, 1.75, -0.35, -0.85, 1.62, -0.3], matMobile));
    const paralume = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(0.14, 0.18, 10, 1, true)), matMobile);
    paralume.position.set(-0.87, 1.6, -0.3);
    paralume.rotation.z = 0.5;
    gruppo.add(paralume);
    const sedia = new THREE.Group();
    sedia.add(spigoli(new THREE.BoxGeometry(0.6, 0.05, 0.55), matTenue));
    sedia.add(segmenti([-0.27, 0, -0.25, -0.27, -0.6, -0.25, 0.27, 0, -0.25, 0.27, -0.6, -0.25, -0.27, 0, 0.25, -0.27, -0.6, 0.25, 0.27, 0, 0.25, 0.27, -0.6, 0.25, -0.27, 0, 0.27, -0.27, 0.7, 0.3, 0.27, 0, 0.27, 0.27, 0.7, 0.3, -0.27, 0.7, 0.3, 0.27, 0.7, 0.3, -0.27, 0.45, 0.29, 0.27, 0.45, 0.29], matTenue));
    sedia.position.set(-0.1, 0.6, 1.25);
    gruppo.add(sedia);

    const ancore = [cimaLaptop, cimaLavagna, cimaLibri], basi = [laptop, lavagna, libri];
    dati.sezioni.forEach((s, k) => hub(s, ancore[k]!, basi[k]!, k));
    aggiorna = (t, acceso) => {
      fumo.forEach((f, i) => { f.rotation.y = t * 0.0008 + i; f.scale.y = 1 + Math.sin(t * 0.002 + i) * 0.15; });
      dati.sezioni.forEach((s, k) => accendi(materiali[k]!, acceso(s.id, `sezione:${s.id}`)));
    };
  }

  gruppo.position.y = dati.tipo === 'scrivania' ? -0.4 : 0;
  vista(el, gruppo, punti, { ...opzioni, aggiorna });
}
