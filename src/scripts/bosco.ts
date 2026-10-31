import * as THREE from 'three';
import { colori, vista, type DatiCompetenze, type Punto } from './vista3d';

// Projects come bosco: ogni area è un albero, sparso sul terreno. Ogni competenza chiave ha il suo
// tipo di albero e la sua zona, segnata da un palo con il nome della competenza.
// Altezza dell'albero: quante tecnologie usa l'area. Ricchezza della chioma: quanti punti ha.
// Quando la scena appare, il bosco cresce da zero; poi arrivano gli uccelli, che volano da un albero all'altro.
// Intorno: ciuffi d'erba e sassi, solo decorazione.

// Numeri casuali ripetibili: il bosco è uguale a ogni visita
function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}

type Specie = 'palma' | 'quercia' | 'acacia' | 'abete';
const SPECIE: Specie[] = ['palma', 'quercia', 'acacia', 'abete'];
// Quanto sale il tronco dritto, per specie (la palma disegna da sola il suo tronco curvo)
const TRONCO: Record<Specie, number> = { palma: 0, quercia: 0.8, acacia: 0.45, abete: 0.4 };

export function monta(el: HTMLElement) {
  const { competenze } = JSON.parse(el.dataset.grafo!) as DatiCompetenze;
  const c = colori(el);
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const r = casuale(11);
  const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
  const spigoli = (geo: THREE.BufferGeometry, mat: THREE.LineBasicMaterial) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
  const segmento = (a: THREE.Vector3, b: THREE.Vector3, mat: THREE.LineBasicMaterial) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat);

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

  // Una specie per competenza. Ogni funzione aggiunge la chioma all'albero e restituisce i suoi pezzi.
  function chioma(albero: THREE.Group, specie: Specie, altezza: number, ricchezza: number, peso: number, colore: THREE.Color) {
    const pezzi: THREE.Object3D[] = [];
    const m = linea(colore);
    const add = (o: THREE.Object3D) => { albero.add(o); pezzi.push(o); };
    if (specie === 'palma') {
      // Tronco curvo a segmenti e foglie lunghe che ricadono
      const piega = 0.18 + r() * 0.1;
      const tronco = Array.from({ length: 7 }, (_, k) => {
        const u = k / 6;
        return new THREE.Vector3(Math.sin(u * 1.6) * piega, u * altezza * 0.95, 0);
      });
      add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tronco), linea(c.fg)));
      const cima = tronco.at(-1)!;
      const foglie = THREE.MathUtils.clamp(ricchezza + 2, 5, 8);
      const lungo = 0.3 + peso * 0.02;
      for (let k = 0; k < foglie; k++) {
        const a = (k / foglie) * Math.PI * 2 + r() * 0.3;
        add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 7 }, (_, q) => {
          const u = q / 6;
          return new THREE.Vector3(cima.x + Math.cos(a) * u * lungo, cima.y + (u * 0.35 - u * u * 0.75) * lungo, Math.sin(a) * u * lungo);
        })), m));
      }
      // Due noci di cocco sotto le foglie
      for (const dx of [-0.04, 0.05]) {
        const noce = spigoli(new THREE.IcosahedronGeometry(0.035, 0), m);
        noce.position.set(cima.x + dx, cima.y - 0.05, 0.02);
        add(noce);
      }
    } else if (specie === 'quercia') {
      // Chioma a nuvola: una palla centrale sulla cima del tronco e altre intorno,
      // ognuna legata al tronco da un ramo, così la chioma è tutta collegata
      const attacco = new THREE.Vector3(0, altezza * 0.8, 0);
      const n = THREE.MathUtils.clamp(ricchezza - 1, 2, 5);
      const centrale = 0.26 + peso * 0.025;
      const palla0 = spigoli(new THREE.IcosahedronGeometry(centrale, 0), m);
      palla0.position.set(0, attacco.y + centrale * 0.55, 0);
      add(palla0);
      for (let k = 1; k < n; k++) {
        const a = (k / (n - 1)) * Math.PI * 2 + r() * 0.4;
        const raggio = 0.17 + peso * 0.02;
        const centro = new THREE.Vector3(Math.cos(a) * centrale * 0.95, attacco.y + 0.02 + r() * 0.12, Math.sin(a) * centrale * 0.95);
        const palla = spigoli(new THREE.IcosahedronGeometry(raggio, 0), m);
        palla.position.copy(centro);
        palla.rotation.set(r() * 3, r() * 3, 0);
        add(palla);
        add(segmento(new THREE.Vector3(0, altezza * 0.62, 0), centro, linea(c.fg)));
      }
    } else if (specie === 'acacia') {
      // Tronco che si biforca e una chioma larga e piatta, come nella savana
      const forca = new THREE.Vector3(0, altezza * 0.45, 0);
      const chiome = THREE.MathUtils.clamp(ricchezza - 2, 1, 2);
      for (let k = 0; k < chiome; k++) {
        const dx = chiome === 1 ? 0 : (k === 0 ? -0.2 : 0.22);
        const y = altezza * (0.85 + k * 0.1);
        const larga = (0.42 + peso * 0.03) * (k === 0 ? 1 : 0.75);
        const piatta = spigoli(new THREE.IcosahedronGeometry(larga, 1), m);
        piatta.scale.y = 0.26;
        piatta.position.set(dx, y, 0);
        add(piatta);
        add(segmento(forca, new THREE.Vector3(dx * 0.8 - 0.08, y - larga * 0.2, 0.05), linea(c.fg)));
        add(segmento(forca, new THREE.Vector3(dx * 0.8 + 0.1, y - larga * 0.2, -0.06), linea(c.fg)));
      }
    } else {
      // Abete: coni sovrapposti, più stretti verso la cima
      const piani = THREE.MathUtils.clamp(ricchezza - 1, 2, 4);
      for (let p = 0; p < piani; p++) {
        const f = p / piani, h = (altezza * 0.75) / piani * 1.5;
        const cono = spigoli(new THREE.ConeGeometry(0.32 * (1 - f * 0.45) * (0.8 + peso * 0.08), h, 7), m);
        cono.position.y = altezza * 0.3 + f * altezza * 0.62 + h / 2;
        add(cono);
      }
    }
    return pezzi;
  }

  // Sfumature dello stesso colore d'accento (in Projects il verde di GitHub): ogni albero ne prende una
  const SFUMATURE = [-0.14, -0.07, 0, 0.07, 0.13].map((dl, k) => c.accent.clone().offsetHSL((k - 2) * 0.012, 0, dl));

  let ordine = 0;
  const zone = competenze.map((k, i) => {
    const settore = (Math.PI * 2) / competenze.length;
    const centro = i * settore + Math.PI / 4;
    const specie = SPECIE[i % SPECIE.length]!;
    const alberi = k.aree.map(a => {
      const pos = posto(centro, settore * 0.85);
      const albero = new THREE.Group();
      albero.position.set(pos.x, 0, pos.y);
      albero.rotation.y = r() * Math.PI;
      // Le palme restano più basse degli altri alberi
      const altezza = specie === 'palma' ? 0.5 + a.peso * 0.14 : 0.75 + a.peso * 0.28;
      const tronco = segmento(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, altezza * Math.max(TRONCO[specie], 0.001), 0), linea(c.fg));
      albero.add(tronco);
      const pezzi = chioma(albero, specie, altezza, a.punti, a.peso, SFUMATURE[Math.floor(r() * SFUMATURE.length)]!);
      // Punto d'ancora in cima: lì compaiono etichetta e clic, e lì si posano gli uccelli
      const cima = new THREE.Object3D();
      cima.position.y = altezza * 1.15;
      albero.add(cima);
      albero.scale.setScalar(0.001);
      gruppo.add(albero);
      punti.push({ id: `area:${a.id}`, label: a.label, href: a.href, hub: false, famiglia: k.id, ancora: cima });
      return { a, albero, cima, pezzi: [tronco, ...pezzi], altezza, fase: r() * 10, ritardo: ordine++ * 140 + r() * 120 };
    });

    // Palo della competenza, nel mezzo dei suoi alberi
    const medio = alberi.reduce((s, x) => s.add(new THREE.Vector3(x.albero.position.x, 0, x.albero.position.z)), new THREE.Vector3()).divideScalar(alberi.length);
    const alto = Math.max(...alberi.map(x => x.altezza * 1.15)) + 0.7;
    const palo = segmento(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, alto, 0), linea(c.accent, 0.5));
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
  const tutti = zone.flatMap(z => z.alberi);

  // Erba e sassi: ciuffi a tre fili e piccoli sassi sfaccettati, sparsi fra gli alberi
  const erba: number[] = [];
  for (let k = 0; k < 160; k++) {
    const a = r() * Math.PI * 2, d = 0.6 + Math.sqrt(r()) * 5.6;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.06 + r() * 0.08;
    for (const dx of [-0.04, 0, 0.04]) erba.push(x, 0, z, x + dx, h * (dx === 0 ? 1.3 : 1), z + dx * 0.5);
  }
  const geoErba = new THREE.BufferGeometry();
  geoErba.setAttribute('position', new THREE.Float32BufferAttribute(erba, 3));
  const prato = new THREE.LineSegments(geoErba, linea(c.muted, 0.7));
  prato.scale.y = 0.001;
  gruppo.add(prato);
  const matSassi = linea(c.muted, 0.6);
  for (let k = 0; k < 14; k++) {
    const sasso = spigoli(new THREE.DodecahedronGeometry(0.05 + r() * 0.07, 0), matSassi);
    const a = r() * Math.PI * 2, d = 0.8 + Math.sqrt(r()) * 5;
    sasso.position.set(Math.cos(a) * d, 0.02, Math.sin(a) * d);
    sasso.scale.y = 0.6;
    gruppo.add(sasso);
  }

  // Uccelli: una V stilizzata che sbatte le ali. Volano su un arco da una cima all'altra, poi si posano.
  const geoUccello = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.11, 0.05, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.11, 0.05, 0)]);
  const matUccello = linea(c.fg, 0.9);
  const cimaDi = (i: number) => tutti[i]!.cima.getWorldPosition(new THREE.Vector3()).applyMatrix4(new THREE.Matrix4().copy(gruppo.matrixWorld).invert());
  const uccelli = Array.from({ length: Math.min(6, tutti.length) }, (_, k) => {
    const corpo = new THREE.Line(geoUccello, matUccello);
    corpo.visible = false;
    gruppo.add(corpo);
    return { corpo, da: k * 2 % tutti.length, a: (k * 2 + 1) % tutti.length, partenza: 2600 + k * 900, durata: 2600 + r() * 1800, sosta: 800 + r() * 2200 };
  });
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), pc = new THREE.Vector3(), pos = new THREE.Vector3(), dopo = new THREE.Vector3();
  const arco = (u: number, out: THREE.Vector3) => {
    // Curva di Bézier quadratica, con il punto di controllo alto sopra il centro
    const v = 1 - u;
    return out.copy(p0).multiplyScalar(v * v).addScaledVector(pc, 2 * v * u).addScaledVector(p1, u * u);
  };

  // Crescita: parte la prima volta che la scena è visibile. ease: veloce all'inizio, con un piccolo rimbalzo.
  let inizio = -1;
  const ease = (x: number) => { const s = 1.4; x -= 1; return x * x * ((s + 1) * x + s) + 1; };

  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 5.6, 10),
    mira: new THREE.Vector3(0, 0.4, 0),
    inclinazione: [0.05, 0.35],
    aggiorna: (t, acceso) => {
      if (inizio < 0) inizio = t;
      // Con prefers-reduced-motion t resta 0: il bosco è già cresciuto e gli uccelli restano posati
      const tempo = t === 0 ? Infinity : t - inizio;
      prato.scale.y = Math.max(0.001, THREE.MathUtils.clamp(tempo / 1500, 0, 1));
      zone.forEach(z => {
        const lz = acceso(z.k.id, `skill:${z.k.id}`);
        (z.palo.material as THREE.LineBasicMaterial).opacity = Math.min(1, lz * 1.6);
        z.base.scale.y = Math.max(0.001, ease(THREE.MathUtils.clamp((tempo - 900) / 700, 0, 1)));
        z.alberi.forEach(x => {
          const l = acceso(z.k.id, `area:${x.a.id}`);
          const g = THREE.MathUtils.clamp((tempo - x.ritardo) / 900, 0, 1);
          // Il vento: le chiome oscillano appena; l'albero in primo piano cresce un po'
          x.albero.rotation.z = Math.sin(t * 0.0012 + x.fase) * 0.025;
          const s = Math.max(0.001, (g < 1 ? ease(g) : 1) * (l === 1 ? 1.18 : 1));
          x.albero.scale.lerp(new THREE.Vector3(s, s, s), g < 1 ? 1 : 0.15);
          const o = Math.min(1, l * 2);
          x.pezzi.forEach(p => { ((p as THREE.Line).material as THREE.LineBasicMaterial).opacity = o; });
        });
      });

      gruppo.updateMatrixWorld();
      uccelli.forEach(u => {
        if (tempo < u.partenza) return;
        u.corpo.visible = true;
        let fase = tempo === Infinity ? u.durata + 1 : tempo - u.partenza;
        // Ciclo: volo, poi sosta sulla cima; alla fine del ciclo sceglie un nuovo albero
        while (fase > u.durata + u.sosta) {
          fase -= u.durata + u.sosta;
          u.da = u.a;
          u.a = (u.a + 1 + Math.floor(r() * (tutti.length - 1))) % tutti.length;
          u.partenza += u.durata + u.sosta;
        }
        p0.copy(cimaDi(u.da)); p1.copy(cimaDi(u.a));
        pc.copy(p0).add(p1).multiplyScalar(0.5).setY(Math.max(p0.y, p1.y) + 0.6 + p0.distanceTo(p1) * 0.2);
        if (fase < u.durata) {
          const v = THREE.MathUtils.smootherstep(fase / u.durata, 0, 1);
          arco(v, pos);
          arco(Math.min(1, v + 0.02), dopo);
          u.corpo.position.copy(pos);
          if (dopo.distanceToSquared(pos) > 1e-6) u.corpo.lookAt(dopo.applyMatrix4(gruppo.matrixWorld));
          u.corpo.scale.set(1, Math.sin(t * 0.025 + u.durata) * 1.6, 1);
        } else {
          // Posato: ali quasi chiuse
          u.corpo.position.copy(p1).setY(p1.y - 0.05);
          u.corpo.scale.set(0.8, 0.3, 1);
        }
      });
    },
  });
}
