import * as THREE from 'three';
import { colori, vista, type DatiCompetenze, type Punto } from './vista3d';

// Advisory come sistema solare minimale: al centro un mondo, intorno le competenze chiave come pianeti,
// ognuno sulla sua orbita. Le aree sono lune che girano intorno al loro pianeta (orbite non disegnate).
// Pianeti pieni e piccoli: la grandezza segue il numero di aree; solo il più grande ha un anello.
// Intorno: una fascia di asteroidi e un cielo di stelle, solo decorazione.

function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}

export function monta(el: HTMLElement) {
  const { competenze } = JSON.parse(el.dataset.grafo!) as DatiCompetenze;
  const c = colori(el);
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const r = casuale(7);
  const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
  const cerchio = (raggio: number, mat: THREE.LineBasicMaterial) => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * raggio, 0, Math.sin(a) * raggio);
    })),
    mat,
  );
  const sfera = (raggio: number, colore: THREE.Color) => new THREE.Mesh(new THREE.SphereGeometry(raggio, 20, 14), new THREE.MeshBasicMaterial({ color: colore, transparent: true }));
  const nuvola = (xyz: number[], colore: THREE.Color, size: number, opacita: number) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: colore, size, transparent: true, opacity: opacita }));
  };

  // Il mondo al centro: una sfera piena con un alone sottile
  const mondo = sfera(0.26, c.fg);
  gruppo.add(mondo, cerchio(0.4, linea(c.muted, 0.5)));

  // Orbite a distanze crescenti; più lontano, più lento (come Keplero, in piccolo)
  const ORBITE = competenze.map((_, i) => 1.3 + i * 0.62);
  const massimo = Math.max(...competenze.map(k => k.aree.length));
  let conAnello = false;
  const pianeti = competenze.map((k, i) => {
    const raggio = 0.09 + k.aree.length * 0.028;
    const orbita = ORBITE[i]!;
    const matOrbita = linea(c.line, 1);
    gruppo.add(cerchio(orbita, matOrbita));
    const corpo = new THREE.Group();
    const pieno = sfera(raggio, c.accent);
    corpo.add(pieno);
    // Solo il primo dei pianeti più grandi ha un anello: basta un dettaglio per riconoscerli
    let anello: THREE.Line | null = null;
    if (k.aree.length === massimo && !conAnello) {
      conAnello = true;
      anello = cerchio(raggio * 1.8, linea(c.accent, 0.8));
      anello.rotation.x = 0.45;
      corpo.add(anello);
    }
    gruppo.add(corpo);
    punti.push({ id: `skill:${k.id}`, label: k.label, href: k.href, hub: true, famiglia: k.id, ancora: corpo });

    const lune = k.aree.map((a, j) => {
      const piano = new THREE.Group();
      piano.rotation.set(0.4 + j * 0.45, j * 1.3, 0.25 * j);
      const luna = sfera(0.035, c.fg);
      piano.add(luna);
      corpo.add(piano);
      punti.push({ id: `area:${a.id}`, label: a.label, href: a.href, hub: false, famiglia: k.id, ancora: luna });
      return { a, luna, raggio: raggio + 0.16 + j * 0.09, fase: j * 2.1 + i, velocita: 0.0007 / (1 + j * 0.3) };
    });
    return { k, corpo, pieno, anello, matOrbita, lune, orbita, fase: i * 2.3, velocita: 0.00022 / Math.pow(orbita, 1.5) };
  });

  // Fascia di asteroidi fra la seconda e la terza orbita, e stelle lontane
  const fascia: number[] = [];
  const dentro = ORBITE[1] ?? 2.5, fuori = ORBITE[2] ?? 3.4;
  for (let k = 0; k < 260; k++) {
    const a = r() * Math.PI * 2, d = dentro + 0.3 + r() * (fuori - dentro - 0.6);
    fascia.push(Math.cos(a) * d, (r() - 0.5) * 0.12, Math.sin(a) * d);
  }
  const asteroidi = nuvola(fascia, c.muted, 0.03, 0.7);
  const cielo: number[] = [];
  for (let k = 0; k < 220; k++) {
    const v = new THREE.Vector3(r() - 0.5, r() - 0.3, r() - 0.5).normalize().multiplyScalar(9 + r() * 4);
    cielo.push(v.x, v.y, v.z);
  }
  gruppo.add(asteroidi, nuvola(cielo, c.fg, 0.035, 0.5));

  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 4.6, 8.4),
    mira: new THREE.Vector3(0, -0.3, 0),
    inclinazione: [0.12, 0.6],
    aggiorna: (t, acceso) => {
      asteroidi.rotation.y = t * 0.00003;
      pianeti.forEach(p => {
        const ang = p.fase + t * p.velocita;
        p.corpo.position.set(Math.cos(ang) * p.orbita, 0, Math.sin(ang) * p.orbita);
        const lp = acceso(p.k.id, `skill:${p.k.id}`);
        const s = lp === 1 ? 1.4 : 1;
        p.corpo.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
        const o = Math.min(1, lp * 2);
        (p.pieno.material as THREE.MeshBasicMaterial).opacity = o;
        if (p.anello) (p.anello.material as THREE.LineBasicMaterial).opacity = o * 0.8;
        p.matOrbita.color.copy(lp === 1 ? c.accent : c.line);
        p.matOrbita.opacity = lp > 0.15 ? 1 : 0.4;
        p.lune.forEach(l => {
          const a = l.fase + t * l.velocita;
          l.luna.position.set(Math.cos(a) * l.raggio, 0, Math.sin(a) * l.raggio);
          const ll = acceso(p.k.id, `area:${l.a.id}`);
          const sl = ll === 1 ? 2.2 : 1;
          l.luna.scale.lerp(new THREE.Vector3(sl, sl, sl), 0.2);
          (l.luna.material as THREE.MeshBasicMaterial).opacity = Math.min(1, ll * 2);
        });
      });
    },
  });
}
