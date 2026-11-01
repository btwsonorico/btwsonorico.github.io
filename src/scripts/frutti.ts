import * as THREE from 'three';

// Frutti da far cadere nel bosco e nello stagno: mela, pera, ciliegie, arancia, tutti nei toni dell'arancione
// (il colore di Knowledge), pieni con i bordi a fili. Più una foglia, che nello stagno galleggia.

export type Frutto = 'mela' | 'pera' | 'ciliegie' | 'arancia';
export const FRUTTI: Frutto[] = ['mela', 'pera', 'ciliegie', 'arancia'];

interface Colori { arancio: THREE.Color; verde: THREE.Color; fg: THREE.Color }

const linea = (colore: THREE.Color, opacita: number) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
const segmento = (a: THREE.Vector3, b: THREE.Vector3, m: THREE.LineBasicMaterial) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), m);
// Pezzo pieno con i bordi delle facce
const pieno = (geo: THREE.BufferGeometry, colore: THREE.Color) => {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: 0.85 })), new THREE.LineSegments(new THREE.EdgesGeometry(geo), linea(colore.clone().offsetHSL(0, 0, -0.12), 0.9)));
  return g;
};
const fogliolina = (c: Colori, x: number, y: number) => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(x, y, 0), new THREE.Vector3(x + 0.035, y + 0.015, 0.01), new THREE.Vector3(x + 0.05, y, 0), new THREE.Vector3(x + 0.025, y - 0.005, -0.01),
]), linea(c.verde, 0.9));

export function frutto(tipo: Frutto, c: Colori) {
  const g = new THREE.Group();
  const picciolo = linea(c.fg, 0.8);
  if (tipo === 'mela') {
    const corpo = pieno(new THREE.IcosahedronGeometry(0.055, 1), c.arancio);
    corpo.scale.y = 0.9;
    g.add(corpo, segmento(new THREE.Vector3(0, 0.045, 0), new THREE.Vector3(0.01, 0.085, 0), picciolo), fogliolina(c, 0.01, 0.075));
  } else if (tipo === 'pera') {
    // Pancia larga in basso, collo stretto in alto
    const colore = c.arancio.clone().offsetHSL(0.04, 0, 0.08);
    const pancia = pieno(new THREE.IcosahedronGeometry(0.05, 1), colore), collo = pieno(new THREE.IcosahedronGeometry(0.032, 1), colore);
    collo.position.y = 0.05;
    g.add(pancia, collo, segmento(new THREE.Vector3(0, 0.078, 0), new THREE.Vector3(0.008, 0.11, 0), picciolo));
  } else if (tipo === 'ciliegie') {
    // Due ciliegie con i piccioli che si uniscono in alto
    const colore = c.arancio.clone().offsetHSL(-0.03, 0, -0.06);
    for (const x of [-0.032, 0.03]) {
      const ciliegia = pieno(new THREE.IcosahedronGeometry(0.03, 1), colore);
      ciliegia.position.x = x;
      g.add(ciliegia, segmento(new THREE.Vector3(x, 0.025, 0), new THREE.Vector3(0, 0.1, 0), picciolo));
    }
    g.add(fogliolina(c, 0, 0.1));
  } else {
    const corpo = pieno(new THREE.IcosahedronGeometry(0.06, 2), c.arancio.clone().offsetHSL(0.01, 0, 0.03));
    g.add(corpo, fogliolina(c, 0, 0.058));
  }
  return g;
}

// Foglia tonda e piatta, con la nervatura: cade piano e galleggia
export function foglia(c: Colori) {
  const g = new THREE.Group();
  const bordo = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.045); });
  const forma = new THREE.Shape(bordo.map(p => new THREE.Vector2(p.x, -p.z)));
  const piena = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshBasicMaterial({ color: c.verde, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  piena.rotation.x = -Math.PI / 2;
  g.add(piena, new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(bordo), linea(c.verde, 0.9)), segmento(new THREE.Vector3(-0.1, 0, 0), new THREE.Vector3(0.08, 0, 0), linea(c.verde, 0.7)));
  return g;
}
