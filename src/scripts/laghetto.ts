import * as THREE from 'three';
import { colori, vista, type DatiCompetenze, type Punto } from './vista3d';

// Advisory come laghetto visto dall'alto: ogni competenza chiave è un branco di pesci, ogni area è un pesce.
// Ogni branco ha la sua specie e nuota sul suo percorso a otto; i pesci lo seguono muovendo la coda.
// Intorno: riva irregolare, canne, ninfee che girano piano e cerchi d'acqua che si allargano. Tutto in wireframe.

function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}

// Specie: proporzioni del corpo (lunghezza, larghezza, coda) e un dettaglio che le distingue
type Specie = { lungo: number; largo: number; coda: number; dettaglio: 'pinne' | 'riga' | 'puntini' | 'nessuno' };
const SPECIE: Specie[] = [
  { lungo: 0.34, largo: 0.1, coda: 0.1, dettaglio: 'pinne' },    // carpa koi
  { lungo: 0.4, largo: 0.055, coda: 0.08, dettaglio: 'riga' },   // pesce lungo e sottile
  { lungo: 0.24, largo: 0.12, coda: 0.08, dettaglio: 'puntini' }, // pesce tondo
  { lungo: 0.18, largo: 0.05, coda: 0.06, dettaglio: 'nessuno' }, // pesciolino veloce
  { lungo: 0.3, largo: 0.08, coda: 0.12, dettaglio: 'pinne' },    // pesce dalla coda larga
];

export function monta(el: HTMLElement) {
  const { competenze } = JSON.parse(el.dataset.grafo!) as DatiCompetenze;
  const c = colori(el);
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const r = casuale(5);
  const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
  const anello = (punti: THREE.Vector3[], mat: THREE.LineBasicMaterial) => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(punti), mat);
  const cerchio = (raggio: number, n = 48) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * raggio, 0, Math.sin(a) * raggio);
  });

  // Riva: un anello irregolare. raggioRiva(a) serve anche per tenere dentro canne, ninfee e pesci.
  const raggioRiva = (a: number) => 3.4 + 0.28 * Math.sin(3 * a) + 0.16 * Math.sin(5 * a + 1);
  const riva = Array.from({ length: 160 }, (_, i) => {
    const a = (i / 160) * Math.PI * 2, d = raggioRiva(a);
    return new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
  });
  gruppo.add(anello(riva, linea(c.accent, 0.55)));
  // Una seconda riva più interna, appena visibile: dà profondità all'acqua
  gruppo.add(anello(riva.map(p => p.clone().multiplyScalar(0.94)), linea(c.accent, 0.18)));

  // Acqua: punti fitti dentro la riva, come lo sfondo del sito; fuori, il prato a puntini radi
  const acqua: number[] = [], prato: number[] = [];
  for (let x = -5; x <= 5; x += 0.3) for (let z = -5; z <= 5; z += 0.3) {
    const d = Math.hypot(x, z), a = Math.atan2(z, x);
    if (d < raggioRiva(a) - 0.15) acqua.push(x, -0.02, z);
    else if (d < 5) prato.push(x, 0, z);
  }
  const nuvola = (xyz: number[], colore: THREE.Color, size: number, opacita: number) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: colore, size, transparent: true, opacity: opacita }));
  };
  gruppo.add(nuvola(acqua, c.accent, 0.022, 0.35), nuvola(prato, c.muted, 0.022, 0.45));

  // Canne lungo la riva: ciuffi di steli leggermente piegati, con la punta a spiga
  const canne: number[] = [];
  for (let k = 0; k < 46; k++) {
    const a = r() * Math.PI * 2, d = raggioRiva(a) + 0.05 + r() * 0.25;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    for (let s = 0; s < 3; s++) {
      const h = 0.25 + r() * 0.35, dx = (r() - 0.5) * 0.08, dz = (r() - 0.5) * 0.08;
      canne.push(x + dx, 0, z + dz, x + dx * 2.5, h, z + dz * 2.5);
    }
  }
  const geoCanne = new THREE.BufferGeometry();
  geoCanne.setAttribute('position', new THREE.Float32BufferAttribute(canne, 3));
  const matCanne = linea(c.muted, 0.8);
  gruppo.add(new THREE.LineSegments(geoCanne, matCanne));

  // Ninfee: dischi con lo spicchio tagliato e le nervature; due hanno un fiore
  const ninfee = Array.from({ length: 6 }, (_, k) => {
    const raggio = 0.18 + r() * 0.14;
    const n = 28, taglio = 0.5;
    const bordo = [new THREE.Vector3(0, 0, 0), ...Array.from({ length: n + 1 }, (_, i) => {
      const a = taglio / 2 + (i / n) * (Math.PI * 2 - taglio);
      return new THREE.Vector3(Math.cos(a) * raggio, 0, Math.sin(a) * raggio);
    })];
    const foglia = new THREE.Group();
    foglia.add(anello(bordo, linea(c.accent, 0.7)));
    const nervature: number[] = [];
    for (let i = 1; i < 5; i++) {
      const a = taglio / 2 + (i / 5) * (Math.PI * 2 - taglio);
      nervature.push(0, 0, 0, Math.cos(a) * raggio * 0.85, 0, Math.sin(a) * raggio * 0.85);
    }
    const geoN = new THREE.BufferGeometry();
    geoN.setAttribute('position', new THREE.Float32BufferAttribute(nervature, 3));
    foglia.add(new THREE.LineSegments(geoN, linea(c.accent, 0.35)));
    if (k % 3 === 0) {
      const fiore = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.06, 0)), linea(c.fg, 0.9));
      fiore.position.y = 0.05;
      fiore.scale.y = 0.7;
      foglia.add(fiore);
    }
    const a = r() * Math.PI * 2, d = (0.45 + r() * 0.4) * raggioRiva(a);
    foglia.position.set(Math.cos(a) * d, 0.01, Math.sin(a) * d);
    foglia.rotation.y = r() * Math.PI * 2;
    gruppo.add(foglia);
    return { foglia, giro: (r() - 0.5) * 0.00012 };
  });

  // Cerchi d'acqua: ogni tanto un anello nasce in un punto del lago, si allarga e svanisce
  const matOnda = () => linea(c.accent, 0);
  const onde = Array.from({ length: 7 }, () => {
    const o = anello(cerchio(1, 40), matOnda());
    gruppo.add(o);
    return { o, nato: -1e9, durata: 2600 };
  });
  let prossimaOnda = 0, quale = 0;

  // Pesci: corpo a fuso visto dall'alto, coda che si muove, più il dettaglio della specie.
  // Il pesce guarda verso +z; la coda è un gruppo a parte che oscilla intorno al suo attacco.
  const SFUMATURE = [-0.12, -0.05, 0.04, 0.11].map(dl => c.accent.clone().offsetHSL(0, 0, dl));
  function pesce(sp: Specie, colore: THREE.Color) {
    const corpo = new THREE.Group();
    const mats: THREE.LineBasicMaterial[] = [];
    const m = linea(colore);
    mats.push(m);
    // Proporzioni della specie, ingrandite: dall'alto i pesci devono leggersi bene
    const L = sp.lungo * 1.6, W = sp.largo * 1.6;
    corpo.add(anello([
      new THREE.Vector3(0, 0, L * 0.5), new THREE.Vector3(W * 0.7, 0, L * 0.32), new THREE.Vector3(W, 0, L * 0.05),
      new THREE.Vector3(W * 0.6, 0, -L * 0.3), new THREE.Vector3(0, 0, -L * 0.45),
      new THREE.Vector3(-W * 0.6, 0, -L * 0.3), new THREE.Vector3(-W, 0, L * 0.05), new THREE.Vector3(-W * 0.7, 0, L * 0.32),
    ], m));
    const coda = new THREE.Group();
    coda.position.z = -L * 0.42;
    const C = sp.coda * 1.6;
    coda.add(anello([new THREE.Vector3(0, 0, 0), new THREE.Vector3(C * 0.8, 0, -C * 1.3), new THREE.Vector3(0, 0, -C * 0.9), new THREE.Vector3(-C * 0.8, 0, -C * 1.3)], m));
    corpo.add(coda);
    const md = linea(colore, 0.6);
    mats.push(md);
    const tratti: number[] = [];
    if (sp.dettaglio === 'pinne') tratti.push(W, 0, L * 0.05, W * 1.9, 0, -L * 0.08, -W, 0, L * 0.05, -W * 1.9, 0, -L * 0.08);
    if (sp.dettaglio === 'riga') tratti.push(0, 0, L * 0.4, 0, 0, -L * 0.4);
    if (sp.dettaglio === 'puntini') tratti.push(W * 0.3, 0, L * 0.15, W * 0.3, 0, L * 0.1, -W * 0.3, 0, -L * 0.05, -W * 0.3, 0, -L * 0.1, 0, 0, L * 0.3, 0, 0, L * 0.25);
    if (tratti.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(tratti, 3));
      corpo.add(new THREE.LineSegments(g, md));
    }
    // Occhi: due punti sul muso
    const occhi = nuvola([W * 0.35, 0.01, L * 0.33, -W * 0.35, 0.01, L * 0.33], c.fg, 0.03, 1);
    corpo.add(occhi);
    mats.push(occhi.material as unknown as THREE.LineBasicMaterial);
    return { corpo, coda, mats };
  }

  // Branchi: uno per competenza, ognuno sul suo percorso a otto dentro il lago
  const branchi = competenze.map((k, i) => {
    const sp = SPECIE[i % SPECIE.length]!;
    const centro = new THREE.Object3D();
    gruppo.add(centro);
    punti.push({ id: `skill:${k.id}`, label: k.label, href: k.href, hub: true, famiglia: k.id, ancora: centro });
    const pesci = k.aree.map((a, j) => {
      const p = pesce(sp, SFUMATURE[(i + j) % SFUMATURE.length]!);
      gruppo.add(p.corpo);
      punti.push({ id: `area:${a.id}`, label: a.label, href: a.href, hub: false, famiglia: k.id, ancora: p.corpo });
      // Posto nel branco: a V dietro al capofila, con un po' di disordine
      const fila = Math.ceil(j / 2), lato = j === 0 ? 0 : j % 2 ? 1 : -1;
      return { a, ...p, dietro: fila * 0.5 + r() * 0.1, lato: lato * fila * 0.32 + (r() - 0.5) * 0.08, fase: r() * 10, battito: 0.012 + r() * 0.006 };
    });
    return {
      k, centro, pesci,
      // Percorso a otto intorno a un centro tutto suo, così i branchi non si ammucchiano; ampiezze e velocità diverse
      cx: Math.cos((i / competenze.length) * Math.PI * 2) * 1.15, cz: Math.sin((i / competenze.length) * Math.PI * 2) * 1.15,
      ax: 0.9 + (i % 3) * 0.25, az: 0.7 + ((i + 1) % 3) * 0.2, rot: (i / competenze.length) * Math.PI * 2 + 0.6,
      vel: 0.00011 + (i % 2) * 0.00004, fase: i * 1.7,
    };
  });
  const percorso = (b: (typeof branchi)[number], t: number, out: THREE.Vector3) => {
    const u = b.fase + t * b.vel;
    const x = Math.sin(u) * b.ax, z = Math.sin(2 * u) * b.az * 0.6;
    return out.set(b.cx + x * Math.cos(b.rot) - z * Math.sin(b.rot), -0.08, b.cz + x * Math.sin(b.rot) + z * Math.cos(b.rot));
  };
  const qui = new THREE.Vector3(), poco = new THREE.Vector3(), avanti = new THREE.Vector3(), destra = new THREE.Vector3(), su = new THREE.Vector3(0, 1, 0);

  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 6.2, 6.4),
    mira: new THREE.Vector3(0, -0.2, 0),
    inclinazione: [0.1, 0.45],
    aggiorna: (t, acceso) => {
      ninfee.forEach(n => { n.foglia.rotation.y += n.giro * 16; });

      // Un nuovo cerchio d'acqua ogni 0,9-2 secondi, mai con prefers-reduced-motion
      if (t > 0 && t > prossimaOnda) {
        const o = onde[quale++ % onde.length]!;
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * raggioRiva(a) * 0.8;
        o.o.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
        o.nato = t;
        prossimaOnda = t + 900 + r() * 1100;
      }
      onde.forEach(o => {
        const u = (t - o.nato) / o.durata;
        const m = o.o.material as THREE.LineBasicMaterial;
        if (u < 0 || u > 1) { m.opacity = 0; return; }
        o.o.scale.setScalar(0.05 + u * 0.75);
        m.opacity = (1 - u) * 0.5;
      });

      branchi.forEach(b => {
        percorso(b, t, qui);
        percorso(b, t + 400, poco);
        avanti.copy(poco).sub(qui).normalize();
        if (avanti.lengthSq() < 0.5) avanti.set(0, 0, 1);
        destra.crossVectors(su, avanti).normalize();
        b.centro.position.copy(qui).setY(0.35);
        const lb = acceso(b.k.id, `skill:${b.k.id}`);
        b.pesci.forEach(p => {
          // Il pesce sta al suo posto nel branco e ondeggia un poco; la coda batte
          const ondeggia = Math.sin(t * 0.0015 + p.fase) * 0.05;
          p.corpo.position.copy(qui).addScaledVector(avanti, -p.dietro).addScaledVector(destra, p.lato + ondeggia);
          p.corpo.position.y = -0.08 + Math.sin(t * 0.001 + p.fase) * 0.02;
          // lookAt vuole un punto nel mondo: il punto davanti al pesce, portato fuori dal gruppo che ruota
          p.corpo.lookAt(gruppo.localToWorld(poco.copy(p.corpo.position).add(avanti)));
          p.coda.rotation.y = Math.sin(t * p.battito + p.fase) * 0.45;
          const l = acceso(b.k.id, `area:${p.a.id}`);
          const s = l === 1 ? 1.6 : lb === 1 ? 1.2 : 1;
          p.corpo.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
          p.mats.forEach(m => { m.opacity = Math.min(1, l * 2) * (m.userData.base ??= m.opacity); });
        });
      });
    },
  });
}
