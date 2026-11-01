import * as THREE from 'three';
import { colori, tonoSezione, vista, type Punto } from './vista3d';

// Cielo di nuvole in wireframe sopra un orizzonte di colline, per Knowledge. Ogni tema è una nuvola, grande quanto
// il numero dei suoi testi; ogni testo è uno sbuffo della nuvola. Le nuvole vanno piano col vento e cambiano forma
// appena, gli sbuffi respirano; sotto passa uno stormo di uccelli arancioni e ogni tanto da una nuvola scende pioggia.
// Un clic su una nuvola apre il tema, un clic su uno sbuffo apre il testo.

export interface DatiNuvole { nodi: { id: string; tipo: string; label: string; href?: string }[]; archi: [string, string][] }

function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}
const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
const segmenti = (xyz: number[], mat: THREE.LineBasicMaterial) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.LineSegments(g, mat);
};

export function monta(el: HTMLElement, dati: DatiNuvole) {
  const c = colori(el);
  const chiaro = document.documentElement.dataset.theme === 'light';
  const r = casuale(37);
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const arancio = tonoSezione('--arancio'), verde = tonoSezione('--verde');
  // Nuvole chiare: di giorno bianche come la carta, con i bordi grigi che le staccano dal fondo
  const bianco = chiaro ? new THREE.Color('#fbf9f4') : c.fg.clone();
  const bordoNuvola = chiaro ? c.muted.clone() : c.fg.clone();

  // --- Orizzonte: colline a curve sovrapposte, prato a puntini, qualche albero lontano
  for (let k = 0; k < 3; k++) {
    const xyz: number[] = [], z = -3 + k * 1.6;
    let prima = new THREE.Vector3(-8, 0, z);
    for (let i = 1; i <= 60; i++) {
      const x = -8 + (i / 60) * 16, y = 0.35 + Math.sin(x * (0.5 + k * 0.2) + k) * 0.25 + Math.sin(x * 1.3 + k * 2) * 0.08 - k * 0.15;
      const p = new THREE.Vector3(x, y, z);
      xyz.push(...prima.toArray(), ...p.toArray());
      prima = p;
    }
    gruppo.add(segmenti(xyz, linea(verde.clone().lerp(c.muted, 0.4 + k * 0.1), 0.6 - k * 0.12)));
  }
  const prato: number[] = [];
  for (let k = 0; k < 500; k++) prato.push((r() - 0.5) * 16, Math.max(0, r() * 0.25), -3 + r() * 6);
  const gp = new THREE.BufferGeometry();
  gp.setAttribute('position', new THREE.Float32BufferAttribute(prato, 3));
  gruppo.add(new THREE.Points(gp, new THREE.PointsMaterial({ color: verde.clone().lerp(c.muted, 0.5), size: 0.03, transparent: true, opacity: 0.5 })));

  // --- Nuvole: un tema per nuvola, uno sbuffo per testo
  const nodi = new Map(dati.nodi.map(n => [n.id, n]));
  const temi = dati.nodi.filter(n => n.tipo === 'tema');
  const testiDi = new Map(temi.map(t => [t.id, [] as typeof dati.nodi]));
  const assegnati = new Set<string>();
  for (const [a, b] of dati.archi) {
    const [tema, testo] = nodi.get(a)?.tipo === 'tema' ? [a, b] : [b, a];
    const n = nodi.get(testo);
    if (!testiDi.has(tema) || !n || n.tipo !== 'testo' || assegnati.has(n.id)) continue;
    testiDi.get(tema)!.push(n);
    assegnati.add(n.id);
  }
  const materiali = new Map<string, THREE.Material[]>();
  const registra = <T extends THREE.Material>(famiglia: string, m: T) => { (materiali.get(famiglia) ?? materiali.set(famiglia, []).get(famiglia)!).push(m); return m; };
  type Nuvola = { g: THREE.Group; base: THREE.Vector3; sbuffi: { o: THREE.Object3D; fase: number }[]; deriva: number; quanti: number; pioggia: THREE.LineSegments };
  const nuvole: Nuvola[] = [];
  const ordinati = [...temi].sort((a, b) => testiDi.get(b.id)!.length - testiDi.get(a.id)!.length);
  ordinati.forEach((tema, i) => {
    const testi = testiDi.get(tema.id)!, quanti = Math.max(1, testi.length);
    const g = new THREE.Group();
    // Le nuvole più grandi stanno davanti e al centro; le altre si spargono nel cielo
    const riga = i % 3, base = new THREE.Vector3(-4.6 + ((i * 0.618) % 1) * 9.2, 2.2 + riga * 0.85 + (r() - 0.5) * 0.3, -0.6 - riga * 1.2);
    g.position.copy(base);
    gruppo.add(g);
    const tinta = bianco.clone().lerp(arancio, chiaro ? 0.04 : 0.18);
    const sbuffi = Array.from({ length: Math.max(3, quanti) }, (_, j) => {
      const a = j * 2.4, d = Math.sqrt(j / Math.max(3, quanti)) * (0.55 + quanti * 0.08);
      const raggio = 0.32 + r() * 0.2 + Math.min(0.25, quanti * 0.03);
      const geo = new THREE.IcosahedronGeometry(raggio, 1);
      const o = new THREE.Group();
      o.add(new THREE.Mesh(geo, registra(tema.id, new THREE.MeshBasicMaterial({ color: tinta, transparent: true, opacity: chiaro ? 0.8 : 0.26, depthWrite: false }))),
        new THREE.LineSegments(new THREE.EdgesGeometry(geo), registra(tema.id, linea(chiaro ? bordoNuvola : tinta, chiaro ? 0.45 : 0.55))));
      // Sbuffi schiacciati sotto: le nuvole hanno la pancia piatta
      o.position.set(Math.cos(a) * d * 1.4, Math.abs(Math.sin(a)) * d * 0.5, Math.sin(a) * d * 0.5);
      o.scale.set(1.2, 0.85, 1);
      g.add(o);
      const testo = testi[j];
      if (testo) punti.push({ id: `k:${testo.id}`, label: testo.label, href: testo.href ?? '/knowledge/', hub: false, famiglia: tema.id, ancora: o });
      return { o, fase: r() * 6 };
    });
    const sopra = new THREE.Object3D();
    sopra.position.set(0, 0.55 + quanti * 0.05, 0);
    g.add(sopra);
    punti.push({ id: `tema:${tema.id}`, label: tema.label, href: tema.href ?? '/knowledge/', hub: true, famiglia: tema.id, ancora: sopra });
    // Pioggia: righe corte sotto la nuvola, che compaiono ogni tanto
    const gocce: number[] = [];
    for (let q = 0; q < 26; q++) { const x = (r() - 0.5) * (0.6 + quanti * 0.12), z = (r() - 0.5) * 0.5, y = -0.2 - r() * 1.8; gocce.push(x, y, z, x - 0.03, y - 0.14, z); }
    const pioggia = segmenti(gocce, linea(tonoSezione('--azzurro'), 0));
    g.add(pioggia);
    nuvole.push({ g, base, sbuffi, deriva: r() * 6, quanti, pioggia });
  });

  // --- Stormo lontano: piccole V arancioni che attraversano il cielo sotto le nuvole
  const geoV = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.07, 0.03, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.07, 0.03, 0)]);
  const matV = linea(arancio, 0.9);
  const uccelli = Array.from({ length: 9 }, (_, k) => {
    const v = new THREE.Line(geoV, matV);
    gruppo.add(v);
    return { v, dx: (k % 3) * 0.25 + r() * 0.1, dy: Math.floor(k / 3) * 0.12 + r() * 0.05, fase: r() * 6 };
  });

  const accendi = (mats: THREE.Material[], livello: number) => {
    const k = livello === 1 ? 1.7 : livello === 0.5 ? 1 : 0.4;
    mats.forEach(m => { m.opacity = Math.min(1, (m.userData.base ??= m.opacity) * k); });
  };

  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 1.3, 8.6),
    mira: new THREE.Vector3(0, 2.2, -1),
    inclinazione: [-0.05, 0.15],
    giuMax: 0.05,
    giro: 0,
    giroMax: 0.35,
    ruotaDaSola: false,
    aggiorna: (t, acceso) => {
      const s = t / 1000;
      nuvole.forEach((n, k) => {
        // Il vento le porta piano avanti e indietro; gli sbuffi si gonfiano e sgonfiano, la nuvola cambia forma
        n.g.position.set(n.base.x + Math.sin(s * 0.05 + n.deriva) * 0.9, n.base.y + Math.sin(s * 0.3 + n.deriva) * 0.05, n.base.z);
        n.sbuffi.forEach(b => b.o.scale.set(1.2 + Math.sin(s * 0.6 + b.fase) * 0.06, 0.85 + Math.sin(s * 0.5 + b.fase) * 0.05, 1));
        // Pioggia a turno dalle nuvole più grandi, per qualche secondo
        const turno = Math.floor(s / 9) % Math.max(1, Math.min(3, nuvole.length)), piove = k === turno && n.quanti >= 2;
        const m = n.pioggia.material as THREE.LineBasicMaterial;
        m.opacity += ((piove ? 0.55 : 0) - m.opacity) * 0.03;
        n.pioggia.position.y = -((s * 1.6) % 0.4);
        accendi(materiali.get(ordinati[k]!.id) ?? [], acceso(ordinati[k]!.id, `tema:${ordinati[k]!.id}`));
      });
      const u = ((s * 0.06) % 1) * 16 - 8;
      uccelli.forEach(b => {
        b.v.position.set(u - b.dx, 1.6 + b.dy + Math.sin(s * 0.5) * 0.1, 0.5);
        b.v.scale.set(1, Math.sin(s * 9 + b.fase) * 1.4, 1);
      });
    },
  });
}
