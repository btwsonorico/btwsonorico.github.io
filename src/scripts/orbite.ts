import * as THREE from 'three';
import { colori, vista, type DatiCompetenze, type Punto } from './vista3d';

// Advisory come sistema orbitale: le competenze chiave sono pianeti intorno a un centro,
// le aree sono lune che girano intorno al loro pianeta su orbite inclinate.

export function monta(el: HTMLElement) {
  const { competenze } = JSON.parse(el.dataset.grafo!) as DatiCompetenze;
  const c = colori(el);
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const cerchio = (r: number, colore: THREE.Color, opacita: number) => {
    const g = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    }));
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita }));
  };
  const filo = (geo: THREE.BufferGeometry, colore: THREE.Color) =>
    new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: colore, transparent: true }));

  // Centro: un nucleo in wireframe, senza link
  const nucleo = filo(new THREE.IcosahedronGeometry(0.42, 1), c.muted);
  gruppo.add(nucleo);

  const R = 3.1;
  gruppo.add(cerchio(R, c.line, 0.9));
  const pianeti = competenze.map((k, i) => {
    const corpo = new THREE.Group();
    gruppo.add(corpo);
    const guscio = filo(new THREE.IcosahedronGeometry(0.3, 1), c.accent);
    const cuore = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: c.accent, transparent: true }));
    corpo.add(guscio, cuore);
    punti.push({ id: `skill:${k.id}`, label: k.label, href: k.href, hub: true, famiglia: k.id, ancora: corpo });

    // Lune: orbite di raggio crescente, ognuna con la sua inclinazione
    const lune = k.aree.map((a, j) => {
      const piano = new THREE.Group();
      piano.rotation.set(0.5 + j * 0.37, j * 1.1, 0.2 * j);
      const raggio = 0.62 + j * 0.2;
      const anello = cerchio(raggio, c.muted, 0.35);
      const luna = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.min(a.punti, 5) * 0.008, 12, 8), new THREE.MeshBasicMaterial({ color: c.fg, transparent: true }));
      piano.add(anello, luna);
      corpo.add(piano);
      punti.push({ id: `area:${a.id}`, label: a.label, href: a.href, hub: false, famiglia: k.id, ancora: luna });
      return { a, luna, anello, raggio, fase: j * 2.1 + i, velocita: 0.00045 / (1 + j * 0.35) };
    });
    return { k, corpo, guscio, cuore, lune, fase: (i / competenze.length) * Math.PI * 2 };
  });

  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 4.2, 8.6),
    mira: new THREE.Vector3(0, -0.2, 0),
    inclinazione: [0.12, 0.6],
    aggiorna: (t, acceso) => {
      nucleo.rotation.y = t * 0.0002;
      pianeti.forEach(p => {
        const ang = p.fase + t * 0.00006;
        p.corpo.position.set(Math.cos(ang) * R, 0, Math.sin(ang) * R);
        p.guscio.rotation.y = t * 0.0006;
        const lp = acceso(p.k.id, `skill:${p.k.id}`);
        const s = lp === 1 ? 1.35 : 1;
        p.corpo.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
        (p.guscio.material as THREE.LineBasicMaterial).opacity = Math.min(1, lp * 2);
        (p.cuore.material as THREE.MeshBasicMaterial).opacity = Math.min(1, lp * 2);
        p.lune.forEach(l => {
          const a = l.fase + t * l.velocita;
          l.luna.position.set(Math.cos(a) * l.raggio, 0, Math.sin(a) * l.raggio);
          const ll = acceso(p.k.id, `area:${l.a.id}`);
          const sl = ll === 1 ? 2 : 1;
          l.luna.scale.lerp(new THREE.Vector3(sl, sl, sl), 0.2);
          (l.luna.material as THREE.MeshBasicMaterial).opacity = Math.min(1, ll * 2);
          (l.anello.material as THREE.LineBasicMaterial).opacity = ll === 1 ? 0.9 : ll * 0.7;
        });
      });
    },
  });
}
