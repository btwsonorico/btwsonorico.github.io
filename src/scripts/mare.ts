import * as THREE from 'three';
import { colori, tonoSezione, vista, type Punto } from './vista3d';

// Riva del mare in wireframe, nello stile di bosco e laghetto. Il mare sta a destra: le onde arrivano da destra,
// salgono sulla sabbia e si ritirano. Tre oggetti mossi dalle onde, uno per sezione del sito:
// una barchetta di carta (SW engineering: costruire), una boa (Advisory: indicare la rotta),
// una conchiglia sulla battigia (Knowledge: quello che il mare porta a riva). Un clic su un oggetto apre la sezione.

export interface Sezione { id: string; label: string; href: string; tono: string }

const PERIODO = 7.5, RIVA = -0.4, RISALITA = 1.3, LARGO = 5.5, FIANCO = 2.8;

const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
const segmenti = (xyz: number[], mat: THREE.LineBasicMaterial) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.LineSegments(g, mat);
};
const spezzata = (n: number, mat: THREE.LineBasicMaterial) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  return new THREE.Line(g, mat);
};
const anello = (punti: THREE.Vector3[], mat: THREE.LineBasicMaterial) => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(punti), mat);
const cerchio = (raggio: number, n: number, y = 0) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a) * raggio, y, Math.sin(a) * raggio);
});
function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}

// Risalita dell'onda in una fase da 0 a 1: sale in fretta, poi si ritira piano
const risalita = (f: number) => f < 0.3 ? 1 - (1 - f / 0.3) ** 3 : 0.5 + 0.5 * Math.cos(((f - 0.3) / 0.7) * Math.PI);
// Bordo dell'acqua sulla sabbia: ogni tratto di riva è un po' in ritardo sul vicino, così l'onda arriva di sbieco
const fase = (z: number, s: number) => ((((s / PERIODO) - z * 0.05 - Math.sin(z * 0.9) * 0.03) % 1) + 1) % 1;
const bordo = (z: number, s: number) => RIVA - risalita(fase(z, s)) * RISALITA + Math.sin(z * 1.7 + s * 0.5) * 0.05;
// Altezza dell'acqua: onde che corrono verso la riva (verso -x), piatte sulla battigia
function altezza(x: number, z: number, s: number) {
  const vicino = THREE.MathUtils.clamp((x - bordo(z, s)) / 0.9, 0, 1);
  return (0.07 * Math.sin(2.2 * x + 2.6 * s + 0.4 * Math.sin(0.8 * z)) + 0.03 * Math.sin(3.7 * x + 1.3 * z + 3.3 * s)) * vicino;
}

export function monta(el: HTMLElement, sezioni: Sezione[]) {
  const c = colori(el);
  const toni = sezioni.map(s => tonoSezione(`--${s.tono}`));
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const r = casuale(17);
  const chiaro = document.documentElement.dataset.theme === 'light';
  const acqua = tonoSezione('--azzurro');

  // Sabbia: puntini radi a sinistra, come lo sfondo del sito; qualche sasso e una stella marina
  const sabbia: number[] = [];
  for (let x = -LARGO; x < RIVA + 0.4; x += 0.22) for (let z = -FIANCO; z <= FIANCO; z += 0.22) sabbia.push(x + (r() - 0.5) * 0.1, 0, z + (r() - 0.5) * 0.1);
  const gs = new THREE.BufferGeometry();
  gs.setAttribute('position', new THREE.Float32BufferAttribute(sabbia, 3));
  gruppo.add(new THREE.Points(gs, new THREE.PointsMaterial({ color: c.muted, size: 0.025, transparent: true, opacity: chiaro ? 0.6 : 0.45 })));
  const matSassi = linea(c.muted, 0.6);
  for (let k = 0; k < 9; k++) {
    const sasso = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.05 + r() * 0.06, 0)), matSassi);
    sasso.position.set(-LARGO * 0.8 + r() * 3.5, 0.02, (r() - 0.5) * FIANCO * 1.8);
    sasso.scale.y = 0.6;
    gruppo.add(sasso);
  }
  const stellaMarina = anello(Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2, d = i % 2 ? 0.07 : 0.2;
    return new THREE.Vector3(Math.cos(a) * d, 0.01, Math.sin(a) * d);
  }), linea(c.fg, 0.55));
  stellaMarina.position.set(-2.6, 0, 1.3);
  gruppo.add(stellaMarina);

  // Mare: linee parallele alla riva, più fitte vicino alla battigia, che seguono il bordo dell'acqua e le onde;
  // poche linee trasversali danno la trama della superficie
  const N = 20, M = 56, T = 13, Q = 24;
  const matAcqua = linea(acqua, chiaro ? 0.55 : 0.45), matTrama = linea(acqua, chiaro ? 0.22 : 0.16);
  const lungo = Array.from({ length: N }, () => { const l = spezzata(M, matAcqua); gruppo.add(l); return l; });
  const traverso = Array.from({ length: T }, () => { const l = spezzata(Q, matTrama); gruppo.add(l); return l; });
  const schiuma = spezzata(M, linea(c.fg, 0.9)), schiuma2 = spezzata(M, linea(c.fg, 0.35));
  const segno = spezzata(M, linea(c.muted, 0.35)); // segno dell'acqua sulla sabbia, dove arriva l'onda più alta
  gruppo.add(schiuma, schiuma2, segno);
  {
    const pos = segno.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let m = 0; m < M; m++) { const z = -FIANCO + (m / (M - 1)) * FIANCO * 2; pos.setXYZ(m, RIVA - RISALITA * 1.02 + Math.sin(z * 2.3) * 0.06, 0.005, z); }
  }
  const xLinea = (j: number, z: number, s: number) => { const b = bordo(z, s), u = (j / (N - 1)) ** 1.5; return b + u * (LARGO - b); };

  // Oggetti delle sezioni
  const materiali: THREE.LineBasicMaterial[][] = sezioni.map(() => []);
  const mat = (k: number, opacita = 0.9) => { const m = linea(toni[k]!, opacita); materiali[k]!.push(m); return m; };

  // Barchetta di carta: fondo, due fianchi a punta e la vela al centro
  const barca = new THREE.Group();
  barca.add(segmenti([
    -0.28, 0, 0, 0.28, 0, 0,
    -0.28, 0, 0, -0.42, 0.16, -0.1, -0.28, 0, 0, -0.42, 0.16, 0.1,
    0.28, 0, 0, 0.42, 0.16, -0.1, 0.28, 0, 0, 0.42, 0.16, 0.1,
    -0.42, 0.16, -0.1, 0.42, 0.16, -0.1, -0.42, 0.16, 0.1, 0.42, 0.16, 0.1,
    -0.16, 0.16, 0, 0, 0.42, 0, 0.16, 0.16, 0, 0, 0.42, 0, 0, 0.42, 0, 0, 0, 0,
  ], mat(0)));
  // Boa: corpo a cilindro con due fasce, cono sopra, asta e luce
  const boa = new THREE.Group();
  boa.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.16, 0.18, 0.2, 14, 1, true)), mat(1, 0.8)));
  const cono = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(0.13, 0.32, 8, 1, true)), mat(1));
  cono.position.y = 0.26;
  boa.add(cono, anello(cerchio(0.17, 18, 0.05), mat(1, 0.6)), segmenti([0, 0.42, 0, 0, 0.62, 0], mat(1)));
  const luce = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.05)), mat(1));
  luce.position.y = 0.66;
  boa.add(luce);
  // Conchiglia a ventaglio: costole che partono dal cardine, bordo ondulato e le due orecchie
  const conchiglia = new THREE.Group();
  const costole: number[] = [], bordoC: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = -1.15 + (i / 10) * 2.3, d = 0.34 + Math.cos(i * Math.PI) * 0.015;
    const p = new THREE.Vector3(Math.sin(a) * d, 0.04 * Math.cos(a * 2), Math.cos(a) * d);
    costole.push(0, 0, 0, p.x, p.y, p.z);
    bordoC.push(p);
  }
  conchiglia.add(segmenti(costole, mat(2, 0.75)));
  conchiglia.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bordoC), mat(2)));
  conchiglia.add(segmenti([-0.1, 0, -0.02, 0.1, 0, -0.02, -0.1, 0, -0.02, -0.06, 0, 0.06, 0.1, 0, -0.02, 0.06, 0, 0.06], mat(2)));

  // Dove galleggiano: barca e boa al largo; la conchiglia sulla battigia, spinta su e giù dalle onde
  const oggetti = [
    { g: barca, x: 1.3, z: -0.8, deriva: 0.3, fase: 0.3 },
    { g: boa, x: 2.2, z: 0.9, deriva: 0.12, fase: 1.7 },
    { g: conchiglia, x: 0, z: 0.9, deriva: 0, fase: 0 },
  ];
  oggetti.forEach((o, k) => {
    o.g.scale.setScalar(1.5);
    gruppo.add(o.g);
    punti.push({ id: `sezione:${sezioni[k]!.id}`, label: sezioni[k]!.label, href: sezioni[k]!.href, hub: true, famiglia: sezioni[k]!.id, ancora: o.g, tono: sezioni[k]!.tono });
  });

  const accendi = (mats: THREE.Material[], livello: number) => {
    const k = livello === 1 ? 1.4 : livello === 0.5 ? 1 : 0.4;
    mats.forEach(m => { m.opacity = Math.min(1, (m.userData.base ??= m.opacity) * k); });
  };

  // Scena spostata a destra: a sinistra, sulla sabbia, c'è spazio per il testo della pagina
  gruppo.position.x = 1.1;
  vista(el, gruppo, punti, {
    // Vista di fronte, un po' dall'alto: la sabbia a sinistra, il mare a destra
    camera: new THREE.Vector3(0, 4.4, 8.8),
    mira: new THREE.Vector3(0, -0.4, 0),
    inclinazione: [0.12, 0.5],
    giro: 0,
    ruotaDaSola: false,
    aggiorna: (t, acceso) => {
      const s = t / 1000;
      lungo.forEach((l, j) => {
        const pos = l.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let m = 0; m < M; m++) {
          const z = -FIANCO + (m / (M - 1)) * FIANCO * 2, x = xLinea(j, z, s);
          pos.setXYZ(m, x, altezza(x, z, s), z);
        }
        pos.needsUpdate = true;
        // Le linee lontane sfumano: il mare si perde verso l'orizzonte
        (l.material as THREE.LineBasicMaterial).opacity = (chiaro ? 0.55 : 0.45) * (1 - (j / N) * 0.6);
      });
      traverso.forEach((l, k) => {
        const z = -FIANCO + (k / (T - 1)) * FIANCO * 2, b = bordo(z, s);
        const pos = l.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let q = 0; q < Q; q++) { const x = b + ((q / (Q - 1)) ** 1.5) * (LARGO - b); pos.setXYZ(q, x, altezza(x, z, s), z); }
        pos.needsUpdate = true;
      });
      // Schiuma: il bordo dell'acqua, più bianca mentre l'onda sale; una seconda riga di schiuma poco più al largo
      [schiuma, schiuma2].forEach((l, k) => {
        const pos = l.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let m = 0; m < M; m++) {
          const z = -FIANCO + (m / (M - 1)) * FIANCO * 2;
          pos.setXYZ(m, bordo(z, s) + k * (0.12 + Math.sin(z * 5 + s * 3) * 0.04), 0.01, z);
        }
        pos.needsUpdate = true;
      });
      (schiuma.material as THREE.LineBasicMaterial).opacity = fase(0, s) < 0.35 ? 0.95 : 0.6;

      // Oggetti: galleggiano sull'onda, si inclinano con lei e vanno avanti e indietro
      oggetti.forEach((o, k) => {
        let x = o.x + Math.sin(s * 0.9 + o.fase) * o.deriva + Math.sin(2.2 * o.x + 2.6 * s) * 0.08;
        if (o.g === conchiglia) x = Math.min(RIVA - 0.2, bordo(o.z, s) + 0.15); // la battigia la spinge su e giù
        const y = Math.max(0, altezza(x, o.z, s));
        const dx = (altezza(x + 0.05, o.z, s) - altezza(x - 0.05, o.z, s)) / 0.1;
        const dz = (altezza(x, o.z + 0.05, s) - altezza(x, o.z - 0.05, s)) / 0.1;
        o.g.position.set(x, y + (o.g === conchiglia ? 0.02 : 0), o.z);
        o.g.rotation.set(Math.atan(dz) * 0.8, o.g === conchiglia ? 0.4 : Math.sin(s * 0.3 + o.fase) * 0.4, -Math.atan(dx) * 0.8);
        accendi(materiali[k]!, acceso(sezioni[k]!.id, `sezione:${sezioni[k]!.id}`));
      });
      luce.scale.setScalar(1 + Math.max(0, Math.sin(s * 3)) * 0.4);
    },
  });
}
