import * as THREE from 'three';
import { colori, vista, type DatiCompetenze, type Punto } from './vista3d';

// Projects come bosco: ogni area è un albero, sparso sul terreno. Gli alberi di una competenza chiave
// stanno nella stessa zona larga, segnata da un palo con il nome della competenza.
// Altezza dell'albero: quante tecnologie usa l'area. Piani della chioma: quanti punti ha.
// Quando la scena appare, il bosco cresce da zero, un albero dopo l'altro.

// Numeri casuali ripetibili: il bosco è uguale a ogni visita
function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}

export function monta(el: HTMLElement) {
  const { competenze } = JSON.parse(el.dataset.grafo!) as DatiCompetenze;
  const c = colori(el);
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const r = casuale(11);
  const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });

  // Terreno: una griglia di punti, come lo sfondo del sito
  const passo = 0.4, lato = 7.2;
  const terreno: number[] = [];
  for (let x = -lato; x <= lato; x += passo) for (let z = -lato; z <= lato; z += passo)
    if (Math.hypot(x, z) < lato) terreno.push(x, 0, z);
  const geoTerreno = new THREE.BufferGeometry();
  geoTerreno.setAttribute('position', new THREE.Float32BufferAttribute(terreno, 3));
  gruppo.add(new THREE.Points(geoTerreno, new THREE.PointsMaterial({ color: c.muted, size: 0.025, transparent: true, opacity: 0.6 })));

  // Posizioni: ogni competenza ha un settore del cerchio; gli alberi cadono a caso nel settore,
  // lontani almeno DISTANZA l'uno dall'altro
  const DISTANZA = 0.85;
  const occupati: THREE.Vector2[] = [];
  const posto = (centro: number, ampiezza: number) => {
    for (let prova = 0; prova < 200; prova++) {
      const a = centro + (r() - 0.5) * ampiezza;
      const d = 1.2 + Math.sqrt(r()) * 3.5;
      const p = new THREE.Vector2(Math.cos(a) * d, Math.sin(a) * d);
      if (occupati.every(q => q.distanceTo(p) > DISTANZA)) { occupati.push(p); return p; }
    }
    const p = new THREE.Vector2(Math.cos(centro) * 3, Math.sin(centro) * 3);
    occupati.push(p);
    return p;
  };

  let ordine = 0;
  const zone = competenze.map((k, i) => {
    const settore = (Math.PI * 2) / competenze.length;
    const centro = i * settore + Math.PI / 4;
    const alberi = k.aree.map(a => {
      const pos = posto(centro, settore * 0.85);
      const albero = new THREE.Group();
      albero.position.set(pos.x, 0, pos.y);
      albero.rotation.y = r() * Math.PI;
      const altezza = 0.7 + a.peso * 0.28;
      const tronco = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, altezza * 0.4, 0)]), linea(c.fg));
      albero.add(tronco);
      // Chioma: coni sovrapposti in wireframe, uno per piano
      const piani = THREE.MathUtils.clamp(a.punti - 1, 2, 4);
      const chioma: THREE.LineSegments[] = [];
      for (let p = 0; p < piani; p++) {
        const frazione = p / piani;
        const h = (altezza * 0.75) / piani * 1.5;
        const cono = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.ConeGeometry(0.32 * (1 - frazione * 0.45) * (0.8 + a.peso * 0.08), h, 7)),
          linea(c.accent),
        );
        cono.position.y = altezza * 0.3 + frazione * altezza * 0.62 + h / 2;
        albero.add(cono);
        chioma.push(cono);
      }
      // Punto d'ancora in cima: lì compaiono etichetta e clic
      const cima = new THREE.Object3D();
      cima.position.y = altezza * 1.15;
      albero.add(cima);
      albero.scale.setScalar(0.001);
      gruppo.add(albero);
      punti.push({ id: `area:${a.id}`, label: a.label, href: a.href, hub: false, famiglia: k.id, ancora: cima });
      return { a, albero, tronco, chioma, altezza, fase: r() * 10, ritardo: ordine++ * 140 + r() * 120 };
    });

    // Palo della competenza, nel mezzo dei suoi alberi
    const medio = alberi.reduce((s, x) => s.add(new THREE.Vector3(x.albero.position.x, 0, x.albero.position.z)), new THREE.Vector3()).divideScalar(alberi.length);
    const alto = Math.max(...alberi.map(x => x.altezza * 1.15)) + 0.7;
    const palo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, alto, 0)]), linea(c.accent, 0.5));
    const insegna = new THREE.Object3D();
    insegna.position.y = alto;
    const base = new THREE.Group();
    base.position.copy(medio);
    base.add(palo, insegna);
    base.scale.set(1, 0.001, 1);
    gruppo.add(base);
    punti.push({ id: `skill:${k.id}`, label: k.label, href: k.href, hub: true, famiglia: k.id, ancora: insegna });
    return { k, base, palo, alberi };
  });

  // Crescita: parte la prima volta che la scena è visibile. ease: veloce all'inizio, con un piccolo rimbalzo.
  let inizio = -1;
  const ease = (x: number) => { const s = 1.4; x -= 1; return x * x * ((s + 1) * x + s) + 1; };

  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 5.6, 10),
    mira: new THREE.Vector3(0, 0.4, 0),
    inclinazione: [0.05, 0.35],
    aggiorna: (t, acceso) => {
      if (inizio < 0) inizio = t;
      // Con prefers-reduced-motion t resta 0: il bosco è già cresciuto
      const tempo = t === 0 ? Infinity : t - inizio;
      zone.forEach(z => {
        const lz = acceso(z.k.id, `skill:${z.k.id}`);
        (z.palo.material as THREE.LineBasicMaterial).opacity = Math.min(1, lz * 1.6);
        const crescitaPalo = THREE.MathUtils.clamp((tempo - 900) / 700, 0, 1);
        z.base.scale.y = Math.max(0.001, ease(crescitaPalo));
        z.alberi.forEach(x => {
          const l = acceso(z.k.id, `area:${x.a.id}`);
          const g = THREE.MathUtils.clamp((tempo - x.ritardo) / 900, 0, 1);
          // Il vento: le chiome oscillano appena; l'albero in primo piano cresce un po'
          x.albero.rotation.z = Math.sin(t * 0.0012 + x.fase) * 0.025;
          const s = Math.max(0.001, (g < 1 ? ease(g) : 1) * (l === 1 ? 1.18 : 1));
          x.albero.scale.lerp(new THREE.Vector3(s, s, s), g < 1 ? 1 : 0.15);
          const o = Math.min(1, l * 2);
          (x.tronco.material as THREE.LineBasicMaterial).opacity = o;
          x.chioma.forEach(cono => { (cono.material as THREE.LineBasicMaterial).opacity = o; });
        });
      });
    },
  });
}
