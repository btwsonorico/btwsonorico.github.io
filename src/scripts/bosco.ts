import * as THREE from 'three';
import { colori, vista, type DatiCompetenze, type Punto } from './vista3d';

// Projects come bosco: ogni competenza chiave è una radura, ogni area è un albero.
// Altezza dell'albero: quante tecnologie usa l'area. Piani della chioma: quanti punti ha.
// È la stessa idea di una "code city", con alberi al posto degli edifici.

export function monta(el: HTMLElement) {
  const { competenze } = JSON.parse(el.dataset.grafo!) as DatiCompetenze;
  const c = colori(el);
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });

  // Terreno: una griglia di punti, come lo sfondo del sito
  const passo = 0.4, lato = 7.2;
  const terreno: number[] = [];
  for (let x = -lato; x <= lato; x += passo) for (let z = -lato; z <= lato; z += passo)
    if (Math.hypot(x, z) < lato) terreno.push(x, 0, z);
  const geoTerreno = new THREE.BufferGeometry();
  geoTerreno.setAttribute('position', new THREE.Float32BufferAttribute(terreno, 3));
  gruppo.add(new THREE.Points(geoTerreno, new THREE.PointsMaterial({ color: c.muted, size: 0.025, transparent: true, opacity: 0.6 })));

  const radure = competenze.map((k, i) => {
    // Radure su un cerchio; alberi disposti a spirale dentro la radura
    const ang = (i / competenze.length) * Math.PI * 2 + Math.PI / 4;
    const centro = new THREE.Vector3(Math.cos(ang) * 3, 0, Math.sin(ang) * 3);
    const raggioRadura = 0.55 + Math.sqrt(k.aree.length) * 0.45;
    const bordo = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(Array.from({ length: 97 }, (_, j) => {
        const a = (j / 96) * Math.PI * 2;
        return new THREE.Vector3(centro.x + Math.cos(a) * raggioRadura, 0.01, centro.z + Math.sin(a) * raggioRadura);
      })),
      linea(c.accent, 0.35),
    );
    gruppo.add(bordo);

    const alberi = k.aree.map((a, j) => {
      const r = j === 0 ? 0 : 0.42 * Math.sqrt(j + 0.4);
      const t = j * 2.4;
      const albero = new THREE.Group();
      albero.position.set(centro.x + Math.cos(t) * r, 0, centro.z + Math.sin(t) * r);
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
      gruppo.add(albero);
      punti.push({ id: `area:${a.id}`, label: a.label, href: a.href, hub: false, famiglia: k.id, ancora: cima });
      return { a, albero, tronco, chioma, fase: i * 3 + j };
    });

    // Insegna della radura: un palo sottile con l'etichetta della competenza
    const alto = Math.max(...alberi.map(x => x.albero.children.at(-1)!.position.y)) + 0.6;
    const palo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, alto, 0)]), linea(c.accent, 0.5));
    const insegna = new THREE.Object3D();
    insegna.position.y = alto;
    const base = new THREE.Group();
    base.position.copy(centro).add(new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(raggioRadura));
    base.add(palo, insegna);
    gruppo.add(base);
    punti.push({ id: `skill:${k.id}`, label: k.label, href: k.href, hub: true, famiglia: k.id, ancora: insegna });
    return { k, bordo, palo, alberi };
  });

  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 5.2, 9.2),
    mira: new THREE.Vector3(0, 0.4, 0),
    inclinazione: [0.05, 0.35],
    aggiorna: (t, acceso) => {
      radure.forEach(r => {
        const lr = acceso(r.k.id, `skill:${r.k.id}`);
        (r.bordo.material as THREE.LineBasicMaterial).opacity = lr === 1 ? 0.9 : lr * 0.7;
        (r.palo.material as THREE.LineBasicMaterial).opacity = Math.min(1, lr * 1.6);
        r.alberi.forEach(x => {
          const l = acceso(r.k.id, `area:${x.a.id}`);
          // Il vento: le chiome oscillano appena; l'albero in primo piano cresce un po'
          x.albero.rotation.z = Math.sin(t * 0.0012 + x.fase) * 0.025;
          const s = l === 1 ? 1.18 : 1;
          x.albero.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
          const o = Math.min(1, l * 2);
          (x.tronco.material as THREE.LineBasicMaterial).opacity = o;
          x.chioma.forEach(cono => { (cono.material as THREE.LineBasicMaterial).opacity = o; });
        });
      });
    },
  });
}
