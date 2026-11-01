import * as THREE from 'three';
import { colori, tonoSezione, vista, type Punto } from './vista3d';

// Spiaggia vista dall'alto, in wireframe, nello stile di bosco e laghetto. Il mare sta a destra: le onde arrivano
// da destra, salgono sulla sabbia e si ritirano. Sulla battigia tre cose, una per sezione del sito, spinte dalle onde:
// un paguro che si porta dietro la casa (SW engineering: costruire i propri strumenti), una stella marina
// (Advisory: la stella che indica la rotta) e una conchiglia (Knowledge: quello che il mare porta a riva).
// Un clic su una delle tre apre la sezione.

export interface Sezione { id: string; label: string; href: string; tono: string }

const PERIODO = 7.5, RIVA = 0.2, RISALITA = 1.5, LARGO = 6, FIANCO = 3.4;

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
const curva = (punti: THREE.Vector3[], mat: THREE.LineBasicMaterial, chiusa = false) =>
  chiusa ? new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(punti), mat) : new THREE.Line(new THREE.BufferGeometry().setFromPoints(punti), mat);
function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}

// Risalita dell'onda in una fase da 0 a 1: sale in fretta, poi si ritira piano
const risalita = (f: number) => f < 0.3 ? 1 - (1 - f / 0.3) ** 3 : 0.5 + 0.5 * Math.cos(((f - 0.3) / 0.7) * Math.PI);
// Bordo dell'acqua sulla sabbia: ogni tratto di riva è un po' in ritardo sul vicino, così l'onda arriva di sbieco
const fase = (z: number, s: number) => ((((s / PERIODO) - z * 0.05 - Math.sin(z * 0.9) * 0.03) % 1) + 1) % 1;
const bordo = (z: number, s: number) => RIVA - risalita(fase(z, s)) * RISALITA + Math.sin(z * 1.7 + s * 0.5) * 0.06;
// Dall'alto le onde si vedono come linee che si stringono sulle creste e corrono verso la riva (verso -x)
const onda = (x: number, z: number, s: number) => Math.sin(2.2 * x + 2.6 * s + 0.4 * Math.sin(0.8 * z)) + 0.4 * Math.sin(3.7 * x + 1.3 * z + 3.3 * s);

// Le tre cose sulla spiaggia. Il gruppo guarda verso +x; la scena è vista dall'alto, quindi conta la sagoma sul piano.
function paguro(m: THREE.LineBasicMaterial, mt: THREE.LineBasicMaterial) {
  const g = new THREE.Group();
  // Guscio a spirale, la casa che si porta dietro
  const spirale: THREE.Vector3[] = [];
  for (let i = 0; i <= 60; i++) { const a = i * 0.32, d = 0.2 * Math.exp(-a * 0.09); spirale.push(new THREE.Vector3(-0.12 + Math.cos(a) * d, 0.1, Math.sin(a) * d)); }
  g.add(curva(spirale, m));
  // Corpo, chele, occhi
  g.add(curva(Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return new THREE.Vector3(0.12 + Math.cos(a) * 0.08, 0.05, Math.sin(a) * 0.09); }), m, true));
  g.add(segmenti([0.18, 0.05, 0.05, 0.3, 0.05, 0.12, 0.18, 0.05, -0.05, 0.3, 0.05, -0.12, 0.17, 0.05, 0.03, 0.24, 0.05, 0.05, 0.17, 0.05, -0.03, 0.24, 0.05, -0.05], m));
  for (const lato of [1, -1]) g.add(curva(Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2; return new THREE.Vector3(0.34 + Math.cos(a) * 0.05, 0.05, lato * 0.13 + Math.sin(a) * 0.035); }), m, true));
  // Zampe: tre per lato, si muovono quando cammina
  const zampe = new THREE.Group();
  for (const lato of [1, -1]) for (const k of [0, 1, 2]) zampe.add(segmenti([0.12 - k * 0.05, 0.05, lato * 0.08, 0.1 - k * 0.07, 0.03, lato * 0.2, 0.1 - k * 0.07, 0.03, lato * 0.2, 0.06 - k * 0.07, 0.02, lato * 0.25], mt));
  g.add(zampe);
  return { g, zampe };
}
function stellaMarina(m: THREE.LineBasicMaterial, mt: THREE.LineBasicMaterial) {
  const g = new THREE.Group();
  g.add(curva(Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2, d = i % 2 ? 0.1 : 0.32; return new THREE.Vector3(Math.cos(a) * d, 0.03, Math.sin(a) * d); }), m, true));
  // Righe lungo i bracci
  const xyz: number[] = [];
  for (let b = 0; b < 5; b++) { const a = (b / 5) * Math.PI * 2; xyz.push(0, 0.035, 0, Math.cos(a) * 0.24, 0.035, Math.sin(a) * 0.24); }
  g.add(segmenti(xyz, mt));
  return { g };
}
function conchiglia(m: THREE.LineBasicMaterial, mt: THREE.LineBasicMaterial) {
  const g = new THREE.Group();
  const costole: number[] = [], orlo: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = -1.2 + (i / 12) * 2.4, d = 0.32 + (i % 2) * 0.02;
    const p = new THREE.Vector3(Math.cos(a) * d, 0.03, Math.sin(a) * d);
    costole.push(0, 0.03, 0, p.x, p.y, p.z);
    orlo.push(p);
  }
  g.add(segmenti(costole, mt), curva(orlo, m));
  g.add(segmenti([0, 0.03, -0.1, 0, 0.03, 0.1, 0, 0.03, -0.1, 0.06, 0.03, -0.07, 0, 0.03, 0.1, 0.06, 0.03, 0.07], m));
  return { g };
}

export function monta(el: HTMLElement, sezioni: Sezione[]) {
  const c = colori(el);
  const toni = sezioni.map(s => tonoSezione(`--${s.tono}`));
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const r = casuale(17);
  const chiaro = document.documentElement.dataset.theme === 'light';
  const acqua = tonoSezione('--azzurro');

  // Sabbia: puntini radi a sinistra, come lo sfondo del sito; qualche sasso, conchigliette e alghe portate dal mare
  const sabbia: number[] = [];
  for (let x = -LARGO; x < RIVA + 0.3; x += 0.24) for (let z = -FIANCO; z <= FIANCO; z += 0.24) sabbia.push(x + (r() - 0.5) * 0.12, 0, z + (r() - 0.5) * 0.12);
  const gs = new THREE.BufferGeometry();
  gs.setAttribute('position', new THREE.Float32BufferAttribute(sabbia, 3));
  gruppo.add(new THREE.Points(gs, new THREE.PointsMaterial({ color: c.muted, size: 0.03, transparent: true, opacity: chiaro ? 0.6 : 0.45 })));
  const matDecoro = linea(c.muted, 0.55);
  for (let k = 0; k < 10; k++) {
    const sasso = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.05 + r() * 0.07, 0)), matDecoro);
    sasso.position.set(-LARGO * 0.7 + r() * 4.5, 0.02, (r() - 0.5) * FIANCO * 1.8);
    sasso.scale.y = 0.5;
    gruppo.add(sasso);
  }
  for (let k = 0; k < 7; k++) {
    // Conchigliette: piccole spirali grigie
    const p: THREE.Vector3[] = [];
    for (let i = 0; i <= 30; i++) { const a = i * 0.4, d = 0.07 * Math.exp(-a * 0.1); p.push(new THREE.Vector3(Math.cos(a) * d, 0.01, Math.sin(a) * d)); }
    const piccola = curva(p, matDecoro);
    piccola.position.set(-0.6 - r() * 3.5, 0, (r() - 0.5) * FIANCO * 1.8);
    piccola.rotation.y = r() * 6;
    gruppo.add(piccola);
  }
  // Alghe sulla linea dell'onda più alta
  const alghe: number[] = [];
  for (let k = 0; k < 9; k++) {
    const z0 = (r() - 0.5) * FIANCO * 1.8, x0 = RIVA - RISALITA * 1.05;
    for (let i = 0; i < 5; i++) alghe.push(x0 + Math.sin(i + k) * 0.05, 0.01, z0 + i * 0.07, x0 + Math.sin(i + k + 1) * 0.05, 0.01, z0 + (i + 1) * 0.07);
  }
  gruppo.add(segmenti(alghe, linea(tonoSezione('--verde').lerp(c.muted, 0.5), 0.5)));

  // Mare: linee parallele alla riva, più fitte vicino alla battigia; si stringono sulle creste delle onde
  const N = 24, M = 64, T = 15, Q = 28;
  const matTrama = linea(acqua, chiaro ? 0.18 : 0.13);
  const lungo = Array.from({ length: N }, () => { const l = spezzata(M, linea(acqua, 0.4)); gruppo.add(l); return l; });
  const traverso = Array.from({ length: T }, () => { const l = spezzata(Q, matTrama); gruppo.add(l); return l; });
  const schiuma = spezzata(M, linea(c.fg, 0.9)), schiuma2 = spezzata(M, linea(c.fg, 0.35));
  const segno = spezzata(M, linea(c.muted, 0.35)); // segno dell'acqua sulla sabbia, dove arriva l'onda più alta
  gruppo.add(schiuma, schiuma2, segno);
  {
    const pos = segno.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let m = 0; m < M; m++) { const z = -FIANCO + (m / (M - 1)) * FIANCO * 2; pos.setXYZ(m, RIVA - RISALITA * 1.02 + Math.sin(z * 2.3) * 0.06, 0.005, z); }
  }
  const xAcqua = (u: number, z: number, s: number) => {
    const b = bordo(z, s), x = b + u * (LARGO - b);
    return x + 0.07 * onda(x, z, s) * Math.min(1, (x - b) / 0.8);
  };

  // Le tre cose delle sezioni: ognuna ha un posto sulla sabbia bagnata; l'onda che sale la spinge verso riva
  const materiali: THREE.LineBasicMaterial[][] = sezioni.map(() => []);
  const mat = (k: number, opacita: number) => { const m = linea(toni[k]!, opacita); materiali[k]!.push(m); return m; };
  const pg = paguro(mat(0, 0.95), mat(0, 0.6)), st = stellaMarina(mat(1, 0.95), mat(1, 0.55)), co = conchiglia(mat(2, 0.95), mat(2, 0.6));
  const cose = [
    { g: pg.g, riposo: RIVA - 0.55, z: -1.5, giro: 0.6 },
    { g: st.g, riposo: RIVA - 0.85, z: 1.4, giro: 0 },
    { g: co.g, riposo: RIVA - 0.35, z: 0.1, giro: 2.6 },
  ].map((o, k) => {
    o.g.scale.setScalar(1.8);
    gruppo.add(o.g);
    punti.push({ id: `sezione:${sezioni[k]!.id}`, label: sezioni[k]!.label, href: sezioni[k]!.href, hub: true, famiglia: sezioni[k]!.id, ancora: o.g, tono: sezioni[k]!.tono });
    return { ...o, x: o.riposo };
  });

  const accendi = (mats: THREE.Material[], livello: number) => {
    const k = livello === 1 ? 1.4 : livello === 0.5 ? 1 : 0.4;
    mats.forEach(m => { m.opacity = Math.min(1, (m.userData.base ??= m.opacity) * k); });
  };

  // Scena spostata a destra: a sinistra, sulla sabbia, c'è spazio per il testo della pagina
  gruppo.position.x = 2.2;
  let prima = -1;
  vista(el, gruppo, punti, {
    // Dall'alto, appena inclinata: la sabbia a sinistra, il mare a destra
    camera: new THREE.Vector3(0, 12.5, 3.2),
    mira: new THREE.Vector3(0, 0, 0.2),
    inclinazione: [0, 0.3],
    giro: 0,
    ruotaDaSola: false,
    aggiorna: (t, acceso) => {
      const s = t / 1000, dt = prima < 0 || t === 0 ? 0 : Math.min(0.05, (t - prima) / 1000);
      prima = t;
      lungo.forEach((l, j) => {
        const u = (j / (N - 1)) ** 1.5;
        const pos = l.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let m = 0; m < M; m++) { const z = -FIANCO + (m / (M - 1)) * FIANCO * 2; pos.setXYZ(m, xAcqua(u, z, s), 0, z); }
        pos.needsUpdate = true;
        (l.material as THREE.LineBasicMaterial).opacity = (chiaro ? 0.5 : 0.42) * (1 - u * 0.5);
      });
      traverso.forEach((l, k) => {
        const z = -FIANCO + (k / (T - 1)) * FIANCO * 2;
        const pos = l.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let q = 0; q < Q; q++) pos.setXYZ(q, xAcqua((q / (Q - 1)) ** 1.5, z, s), 0, z);
        pos.needsUpdate = true;
      });
      // Schiuma: il bordo dell'acqua, più bianca mentre l'onda sale; una seconda riga poco più al largo
      [schiuma, schiuma2].forEach((l, k) => {
        const pos = l.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let m = 0; m < M; m++) {
          const z = -FIANCO + (m / (M - 1)) * FIANCO * 2;
          pos.setXYZ(m, bordo(z, s) + k * (0.14 + Math.sin(z * 5 + s * 3) * 0.05), 0.01, z);
        }
        pos.needsUpdate = true;
      });
      (schiuma.material as THREE.LineBasicMaterial).opacity = fase(0, s) < 0.35 ? 0.95 : 0.6;

      // Le tre cose: l'onda che sale le spinge verso riva, quella che si ritira le riporta giù, più piano
      cose.forEach((o, k) => {
        const meta = Math.min(o.riposo, bordo(o.z, s) + 0.2);
        const da = o.x;
        o.x += (meta - o.x) * Math.min(1, dt * (meta < o.x ? 3 : 0.8));
        // Il paguro cammina anche da solo, di lato, avanti e indietro lungo la riva
        if (o.g === pg.g) {
          o.z = -1.5 + Math.sin(s * 0.25) * 0.8;
          pg.zampe.children.forEach((z, i) => { z.rotation.y = Math.sin(s * 9 + i) * 0.15; });
        }
        o.g.position.set(o.x, 0, o.z);
        o.giro += (o.x - da) * 1.5;
        o.g.rotation.y = o.giro;
        accendi(materiali[k]!, acceso(sezioni[k]!.id, `sezione:${sezioni[k]!.id}`));
      });
    },
  });
}
