import * as THREE from 'three';
import { colori, vista, type DatiCompetenze, type Punto } from './vista3d';

// Advisory come sistema solare: al centro un mondo, intorno le competenze chiave come pianeti,
// ognuno sulla sua orbita. Le aree sono lune che girano intorno al loro pianeta (orbite non disegnate).
// Come nel sistema solare, i pianeti hanno grandezze e decorazioni diverse:
// la grandezza segue il numero di aree, la decorazione cambia da pianeta a pianeta.

type Decorazione = 'roccioso' | 'anelli' | 'gigante' | 'reticolo';
const DECORAZIONI: Decorazione[] = ['roccioso', 'gigante', 'anelli', 'reticolo'];

export function monta(el: HTMLElement) {
  const { competenze } = JSON.parse(el.dataset.grafo!) as DatiCompetenze;
  const c = colori(el);
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
  const cerchio = (r: number, mat: THREE.LineBasicMaterial, y = 0) => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    })),
    mat,
  );
  const filo = (geo: THREE.BufferGeometry, mat: THREE.LineBasicMaterial) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);

  // Il mondo al centro: una sfera a reticolo con un nucleo pieno
  const mondo = new THREE.Group();
  mondo.add(
    new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(0.5, 14, 10)), linea(c.muted, 0.55)),
    new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: c.fg })),
  );
  gruppo.add(mondo);

  // Ogni pianeta si costruisce con la sua decorazione; restituisce i materiali da accendere e spegnere
  function pianeta(r: number, tipo: Decorazione) {
    const corpo = new THREE.Group();
    const inclinato = new THREE.Group();
    corpo.add(inclinato);
    const mats: (THREE.LineBasicMaterial | THREE.MeshBasicMaterial)[] = [];
    const add = (o: THREE.Object3D, m: THREE.LineBasicMaterial | THREE.MeshBasicMaterial) => { inclinato.add(o); mats.push(m); };
    const cuore = new THREE.MeshBasicMaterial({ color: c.accent, transparent: true });
    add(new THREE.Mesh(new THREE.SphereGeometry(r * 0.45, 16, 12), cuore), cuore);
    if (tipo === 'roccioso') {
      // Poche facce, come una roccia
      const m = linea(c.accent);
      add(filo(new THREE.IcosahedronGeometry(r, 0), m), m);
    } else if (tipo === 'gigante') {
      // Gigante gassoso: fasce di latitudine, più un anello largo e sottile
      const m = linea(c.accent);
      const sfera = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(r, 18, 9)), m);
      add(sfera, m);
      const ma = linea(c.accent, 0.6);
      for (const k of [1.45, 1.6, 1.75]) add(cerchio(r * k, ma), ma);
      inclinato.rotation.z = 0.35;
    } else if (tipo === 'anelli') {
      // Due anelli inclinati intorno a una sfera liscia
      const m = linea(c.accent);
      add(filo(new THREE.IcosahedronGeometry(r, 2), m), m);
      const ma = linea(c.accent, 0.7);
      const anelli = new THREE.Group();
      anelli.add(cerchio(r * 1.55, ma), cerchio(r * 1.85, ma));
      anelli.rotation.x = 1.1;
      inclinato.add(anelli);
      mats.push(ma);
    } else {
      // Reticolo: meridiani e paralleli, asse inclinato, una calotta polare
      const m = linea(c.accent);
      add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(r, 10, 7)), m), m);
      const mc = linea(c.fg, 0.8);
      add(cerchio(r * 0.45, mc, r * 0.88), mc);
      inclinato.rotation.z = -0.5;
    }
    return { corpo, inclinato, mats };
  }

  // Orbite: raggi crescenti; più lontano, più lento (come le leggi di Keplero, in piccolo)
  const pianeti = competenze.map((k, i) => {
    const r = 0.16 + k.aree.length * 0.055;
    const orbita = 1.7 + i * 1.05;
    const matOrbita = linea(c.line, 1);
    gruppo.add(cerchio(orbita, matOrbita));
    const p = pianeta(r, DECORAZIONI[i % DECORAZIONI.length]!);
    gruppo.add(p.corpo);
    punti.push({ id: `skill:${k.id}`, label: k.label, href: k.href, hub: true, famiglia: k.id, ancora: p.corpo });

    // Lune: piccole sfere su piani inclinati, oltre gli anelli del pianeta
    const lune = k.aree.map((a, j) => {
      const piano = new THREE.Group();
      piano.rotation.set(0.4 + j * 0.45, j * 1.3, 0.25 * j);
      const luna = new THREE.Mesh(new THREE.SphereGeometry(0.045 + Math.min(a.punti, 5) * 0.006, 10, 8), new THREE.MeshBasicMaterial({ color: c.fg, transparent: true }));
      piano.add(luna);
      p.corpo.add(piano);
      punti.push({ id: `area:${a.id}`, label: a.label, href: a.href, hub: false, famiglia: k.id, ancora: luna });
      return { a, luna, raggio: r * 2 + 0.12 + j * 0.13, fase: j * 2.1 + i, velocita: 0.0006 / (1 + j * 0.3) };
    });
    return { k, ...p, matOrbita, lune, orbita, fase: i * 2.3, velocita: 0.00022 / Math.pow(orbita, 1.5), rotazione: 0.0004 + (i % 2) * 0.0003 };
  });

  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 5.6, 11.2),
    mira: new THREE.Vector3(0, -0.3, 0),
    inclinazione: [0.12, 0.6],
    aggiorna: (t, acceso) => {
      mondo.rotation.y = t * 0.0001;
      pianeti.forEach(p => {
        const ang = p.fase + t * p.velocita;
        p.corpo.position.set(Math.cos(ang) * p.orbita, 0, Math.sin(ang) * p.orbita);
        p.inclinato.rotation.y = t * p.rotazione;
        const lp = acceso(p.k.id, `skill:${p.k.id}`);
        const s = lp === 1 ? 1.3 : 1;
        p.corpo.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
        const o = Math.min(1, lp * 2);
        p.mats.forEach(m => { m.opacity = o * (m.userData.base ??= m.opacity); });
        p.matOrbita.opacity = lp === 1 ? 1 : lp > 0.15 ? 0.8 : 0.3;
        p.matOrbita.color.copy(lp === 1 ? c.accent : c.line);
        p.lune.forEach(l => {
          const a = l.fase + t * l.velocita;
          l.luna.position.set(Math.cos(a) * l.raggio, 0, Math.sin(a) * l.raggio);
          const ll = acceso(p.k.id, `area:${l.a.id}`);
          const sl = ll === 1 ? 2 : 1;
          l.luna.scale.lerp(new THREE.Vector3(sl, sl, sl), 0.2);
          (l.luna.material as THREE.MeshBasicMaterial).opacity = Math.min(1, ll * 2);
        });
      });
    },
  });
}
