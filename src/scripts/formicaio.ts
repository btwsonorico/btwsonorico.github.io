import * as THREE from 'three';
import { colori, tonoSezione, vista, type DatiCompetenze, type Punto } from './vista3d';

// Formicaio visto di taglio, come un formicaio di vetro, in wireframe. In alto la superficie con l'erba, il cumulo
// e l'entrata; sotto la terra a puntini con sassi e radici. Ogni competenza è una galleria che parte dal pozzo
// centrale; ogni area è una camera alla fine di un cunicolo, più larga quanto più pesa, con dentro le provviste.
// In fondo c'è la camera della regina, con le uova. Le formiche scendono a portare il cibo nelle camere e risalgono;
// in superficie altre formiche portano foglie verso l'entrata. Un clic su una camera apre la sua area.

function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}
const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
const curva = (punti: THREE.Vector3[], mat: THREE.LineBasicMaterial, chiusa = false) =>
  chiusa ? new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(punti), mat) : new THREE.Line(new THREE.BufferGeometry().setFromPoints(punti), mat);
const segmenti = (xyz: number[], mat: THREE.LineBasicMaterial) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.LineSegments(g, mat);
};
const nuvola = (xyz: number[], colore: THREE.Color, size: number, opacita: number) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: colore, size, transparent: true, opacity: opacita }));
};

const LARGO = 4.4, FONDO = -4.6, Z = 0.3;

export function monta(el: HTMLElement) {
  const { competenze } = JSON.parse(el.dataset.grafo!) as DatiCompetenze;
  const c = colori(el);
  const chiaro = document.documentElement.dataset.theme === 'light';
  const r = casuale(31);
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const verde = tonoSezione('--verde'), arancio = tonoSezione('--arancio');
  const terra = arancio.clone().lerp(c.muted, 0.72);
  // Il colore del "vuoto" scavato: lo sfondo, appena più scuro o più chiaro della terra
  const scavo = c.bg.clone().lerp(terra, chiaro ? 0.12 : 0.18);
  const materiali = new Map<string, THREE.Material[]>();
  const registra = <T extends THREE.Material>(famiglia: string, m: T) => { (materiali.get(famiglia) ?? materiali.set(famiglia, []).get(famiglia)!).push(m); return m; };

  // --- Vetro e terra: la cornice del formicaio, la terra a puntini, sassi e radici
  const cornice = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(LARGO * 2, -FONDO + 0.2, Z * 2)), linea(c.muted, 0.4));
  cornice.position.y = FONDO / 2 + 0.1;
  gruppo.add(cornice);
  const granelli: number[] = [];
  for (let k = 0; k < 2200; k++) granelli.push((r() - 0.5) * LARGO * 2, FONDO * r(), Z - r() * 0.02);
  gruppo.add(nuvola(granelli, terra, 0.026, chiaro ? 0.75 : 0.55));
  const matSassi = linea(c.muted, 0.55);
  for (let k = 0; k < 14; k++) {
    const sasso = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.DodecahedronGeometry(0.07 + r() * 0.12, 0)), matSassi);
    sasso.position.set((r() - 0.5) * LARGO * 1.9, FONDO * (0.15 + r() * 0.8), Z);
    sasso.scale.set(1.3, 0.8, 0.3);
    gruppo.add(sasso);
  }
  const radici: number[] = [];
  for (let k = 0; k < 7; k++) {
    let x = (r() - 0.5) * LARGO * 1.8, y = 0;
    for (let q = 0; q < 6; q++) { const nx = x + (r() - 0.5) * 0.25, ny = y - 0.12 - r() * 0.12; radici.push(x, y, Z, nx, ny, Z); x = nx; y = ny; }
  }
  gruppo.add(segmenti(radici, linea(verde.clone().lerp(c.muted, 0.55), 0.5)));

  // --- Superficie: linea del terreno, erba, il cumulo con l'entrata al centro
  gruppo.add(segmenti([-LARGO, 0, Z, LARGO, 0, Z], linea(c.muted, 0.7)));
  const erba: number[] = [];
  for (let k = 0; k < 70; k++) {
    const x = (r() - 0.5) * LARGO * 2, h = 0.08 + r() * 0.18;
    if (Math.abs(x) < 0.5) continue;
    for (const dx of [-0.03, 0, 0.03]) erba.push(x, 0, Z, x + dx * 1.5, h * (dx === 0 ? 1.3 : 1), Z);
  }
  gruppo.add(segmenti(erba, linea(verde, 0.65)));
  const cumulo = Array.from({ length: 17 }, (_, i) => { const a = Math.PI * (i / 16); return new THREE.Vector3(Math.cos(a) * 0.5, Math.sin(a) * 0.22, Z); });
  gruppo.add(curva(cumulo, linea(terra.clone().offsetHSL(0, 0, 0.1), 0.85)));
  const granelliCumulo: number[] = [];
  for (let k = 0; k < 120; k++) { const a = r() * Math.PI, d = Math.sqrt(r()); granelliCumulo.push(Math.cos(a) * 0.48 * d, Math.sin(a) * 0.2 * d, Z); }
  gruppo.add(nuvola(granelliCumulo, terra, 0.03, 0.8));

  // --- Gallerie e camere. Un cunicolo è una striscia piena del colore dello scavo, con i due bordi disegnati.
  const matBordo = linea(terra.clone().offsetHSL(0, 0, chiaro ? -0.1 : 0.12), 0.75);
  const matScavo = new THREE.MeshBasicMaterial({ color: scavo, transparent: true, opacity: 0.92, depthWrite: false });
  const cunicolo = (curvaC: THREE.Curve<THREE.Vector3>, largo: number, materialeBordo = matBordo) => {
    const N = 40, sopra: THREE.Vector3[] = [], sotto: THREE.Vector3[] = [], vert: number[] = [];
    for (let i = 0; i <= N; i++) {
      const p = curvaC.getPoint(i / N), tg = curvaC.getTangent(i / N), n = new THREE.Vector3(-tg.y, tg.x, 0).normalize().multiplyScalar(largo);
      sopra.push(p.clone().add(n).setZ(Z + 0.005)); sotto.push(p.clone().sub(n).setZ(Z + 0.005));
    }
    for (let i = 0; i < N; i++) vert.push(...sopra[i]!.toArray(), ...sotto[i]!.toArray(), ...sopra[i + 1]!.toArray(), ...sotto[i]!.toArray(), ...sotto[i + 1]!.toArray(), ...sopra[i + 1]!.toArray());
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vert, 3));
    const pieno = new THREE.Mesh(g, matScavo);
    pieno.renderOrder = 1;
    gruppo.add(pieno, curva(sopra, materialeBordo), curva(sotto, materialeBordo));
  };
  // Pozzo centrale: dall'entrata scende fino alla camera della regina
  const pozzo = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.02, Z), new THREE.Vector3(0.08, -0.9, Z), new THREE.Vector3(-0.1, -2.2, Z), new THREE.Vector3(0.05, -3.6, Z), new THREE.Vector3(0, FONDO + 0.75, Z)]);
  cunicolo(pozzo, 0.07);

  type Camera = { id: string; famiglia: string; centro: THREE.Vector3; percorso: THREE.Vector3[]; colore: THREE.Color };
  const camere: Camera[] = [];
  const PALETTE = [verde, verde.clone().offsetHSL(0.05, 0, 0.06), verde.clone().offsetHSL(-0.06, 0, -0.04), verde.clone().lerp(arancio, 0.35), verde.clone().offsetHSL(0.1, 0, 0.1)];
  // Campiona una curva in punti, per far camminare le formiche
  const campiona = (curvaC: THREE.Curve<THREE.Vector3>, n = 24) => Array.from({ length: n + 1 }, (_, i) => curvaC.getPoint(i / n));
  const ellisse = (centro: THREE.Vector3, rx: number, ry: number) => Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2; return new THREE.Vector3(centro.x + Math.cos(a) * rx, centro.y + Math.sin(a) * ry, Z + 0.006); });

  competenze.forEach((k, i) => {
    const colore = PALETTE[i % PALETTE.length]!;
    // La galleria parte dal pozzo a una profondità diversa e va verso il suo lato, scendendo
    const lato = i % 2 ? -1 : 1, profondita = -0.7 - (i / Math.max(1, competenze.length - 1)) * 2.4;
    const attacco = pozzo.getPoint(-profondita / -FONDO);
    const fine = new THREE.Vector3(lato * (1.6 + (i % 3) * 0.6), profondita - 0.5, Z);
    const galleria = new THREE.CatmullRomCurve3([attacco, new THREE.Vector3((attacco.x + fine.x) / 2, profondita + 0.15, Z), fine]);
    cunicolo(galleria, 0.055);
    const etichetta = new THREE.Object3D();
    etichetta.position.copy(galleria.getPoint(0.5)).add(new THREE.Vector3(0, 0.25, 0));
    gruppo.add(etichetta);
    punti.push({ id: `skill:${k.id}`, label: k.label, href: k.href, hub: true, famiglia: k.id, ancora: etichetta });
    const percorsoPozzo = campiona(new THREE.CatmullRomCurve3(pozzo.points.filter(p => p.y > attacco.y - 0.01).concat([attacco])), 10);
    k.aree.forEach((a, j) => {
      // Ogni area: un cunicolo laterale che scende dalla galleria fino alla sua camera
      const t = 0.35 + (j / Math.max(1, k.aree.length)) * 0.65, da = galleria.getPoint(t);
      const rx = 0.2 + a.peso * 0.028, ry = rx * 0.55;
      const centro = new THREE.Vector3(da.x + lato * (0.15 + (j % 2) * 0.2), da.y - 0.45 - (j % 3) * 0.18, Z);
      const laterale = new THREE.CatmullRomCurve3([da, new THREE.Vector3((da.x + centro.x) / 2 + 0.1, (da.y + centro.y) / 2, Z), centro.clone().add(new THREE.Vector3(0, ry * 0.6, 0))]);
      cunicolo(laterale, 0.04, registra(k.id, linea(colore, 0.55)));
      // Camera: ovale scavato, bordo nel colore della galleria, provviste dentro
      const bordo = ellisse(centro, rx, ry);
      const forma = new THREE.Shape(bordo.map(p => new THREE.Vector2(p.x, p.y)));
      const fondo = new THREE.Mesh(new THREE.ShapeGeometry(forma), matScavo);
      fondo.position.z = Z + 0.004;
      fondo.renderOrder = 1;
      const tinta = new THREE.Mesh(new THREE.ShapeGeometry(forma), registra(k.id, new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: 0.12, depthWrite: false })));
      tinta.position.z = Z + 0.005;
      tinta.renderOrder = 2;
      gruppo.add(fondo, tinta, curva(bordo, registra(k.id, linea(colore, 0.95)), true));
      const provviste: number[] = [];
      for (let q = 0; q < 4 + a.punti * 2; q++) provviste.push(centro.x + (r() - 0.5) * rx * 1.3, centro.y - ry * 0.4 + r() * ry * 0.4, Z + 0.01);
      gruppo.add(nuvola(provviste, colore, 0.04, 0.9));
      const ancora = new THREE.Object3D();
      ancora.position.copy(centro).add(new THREE.Vector3(0, ry + 0.06, 0));
      gruppo.add(ancora);
      punti.push({ id: `area:${a.id}`, label: a.label, href: a.href, hub: false, famiglia: k.id, ancora });
      // Percorso completo dall'entrata alla camera: pozzo, galleria fino all'attacco, cunicolo laterale
      const lungoGalleria = campiona(galleria, 16).filter((_, q) => q / 16 <= t);
      camere.push({ id: a.id, famiglia: k.id, centro, colore, percorso: [...percorsoPozzo, ...lungoGalleria, ...campiona(laterale, 8), centro] });
    });
  });

  // Camera della regina: in fondo al pozzo, più grande, con la regina e le uova
  const centroRegina = new THREE.Vector3(0, FONDO + 0.5, Z);
  const bordoRegina = ellisse(centroRegina, 0.55, 0.28);
  const formaRegina = new THREE.Shape(bordoRegina.map(p => new THREE.Vector2(p.x, p.y)));
  const fondoRegina = new THREE.Mesh(new THREE.ShapeGeometry(formaRegina), matScavo);
  fondoRegina.position.z = Z + 0.004;
  fondoRegina.renderOrder = 1;
  gruppo.add(fondoRegina, curva(bordoRegina, linea(arancio, 0.85), true));
  const uova: number[] = [];
  for (let q = 0; q < 22; q++) uova.push(-0.4 + r() * 0.3, FONDO + 0.32 + r() * 0.16, Z + 0.01);
  gruppo.add(nuvola(uova, c.fg, 0.05, 0.85));

  // --- Formiche: tre puntini lungo la direzione (addome, torace, testa) e sei zampe che si muovono
  const matFormica = new THREE.MeshBasicMaterial({ color: chiaro ? c.fg : c.fg.clone().lerp(c.bg, 0.15) });
  const geoA = new THREE.SphereGeometry(0.03, 6, 4), geoT = new THREE.SphereGeometry(0.018, 5, 4), geoC = new THREE.SphereGeometry(0.022, 6, 4);
  const formica = (scala = 1) => {
    const g = new THREE.Group();
    const addome = new THREE.Mesh(geoA, matFormica), torace = new THREE.Mesh(geoT, matFormica), capo = new THREE.Mesh(geoC, matFormica);
    addome.position.x = -0.045; addome.scale.set(1.3, 0.9, 0.9);
    capo.position.x = 0.04;
    const zampe = segmenti([-0.01, 0, 0, -0.03, -0.035, 0, 0, 0, 0, 0, -0.04, 0, 0.01, 0, 0, 0.035, -0.035, 0, -0.01, 0, 0, -0.035, 0.03, 0, 0, 0, 0, 0.005, 0.035, 0, 0.01, 0, 0, 0.03, 0.03, 0], linea(c.fg, 0.8));
    const carico = new THREE.Mesh(new THREE.IcosahedronGeometry(0.022, 0), new THREE.MeshBasicMaterial({ color: verde }));
    carico.position.set(0.075, 0.01, 0.01);
    g.add(addome, torace, capo, zampe, carico);
    g.scale.setScalar(scala);
    gruppo.add(g);
    return { g, zampe, carico };
  };
  // Formiche al lavoro: scelgono una camera, scendono con una provvista, la lasciano e risalgono a prenderne un'altra
  const lavoratrici = Array.from({ length: Math.min(36, camere.length * 4 + 8) }, (_, k) => ({ ...formica(), camera: camere[k % camere.length]!, u: r(), scende: r() < 0.5, vel: 0.22 + r() * 0.1 }));
  // Formiche in superficie: camminano verso l'entrata con una foglia, poi tornano a cercarne un'altra
  const raccoglitrici = Array.from({ length: 6 }, (_, k) => {
    const f = formica(1.05);
    f.carico.geometry = new THREE.CircleGeometry(0.05, 6);
    f.carico.position.set(0.04, 0.07, 0);
    return { ...f, da: (k % 2 ? -1 : 1) * (1.4 + r() * 2.6), u: r(), vel: 0.08 + r() * 0.04 };
  });
  // La regina: più grande, ferma, con l'addome che respira
  const regina = formica(2.3);
  regina.carico.visible = false;
  regina.g.position.set(0.15, FONDO + 0.42, Z + 0.02);

  const punto = new THREE.Vector3(), dopo = new THREE.Vector3();
  const lungoPercorso = (percorso: THREE.Vector3[], u: number, out: THREE.Vector3) => {
    const f = THREE.MathUtils.clamp(u, 0, 1) * (percorso.length - 1), i = Math.min(percorso.length - 2, Math.floor(f));
    return out.lerpVectors(percorso[i]!, percorso[i + 1]!, f - i);
  };
  const accendi = (mats: THREE.Material[], livello: number) => {
    const k = livello === 1 ? 1.6 : livello === 0.5 ? 1 : 0.35;
    mats.forEach(m => { m.opacity = Math.min(1, (m.userData.base ??= m.opacity) * k); });
  };
  let prima = -1;

  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 0.4, 9.6),
    mira: new THREE.Vector3(0, -2, 0),
    inclinazione: [0, 0.2],
    giuMax: 0.08,
    giro: 0,
    giroMax: 0.45,
    ruotaDaSola: false,
    aggiorna: (t, acceso) => {
      const s = t / 1000, dt = prima < 0 || t === 0 ? 0 : Math.min(0.05, (t - prima) / 1000);
      prima = t;
      lavoratrici.forEach(f => {
        const lunghezza = f.camera.percorso.length * 0.08;
        f.u += (f.scende ? 1 : -1) * dt * f.vel / lunghezza;
        if (f.u >= 1) { f.u = 1; f.scende = false; }
        if (f.u <= 0) { f.u = 0; f.scende = true; f.camera = camere[Math.floor(r() * camere.length)]!; }
        // Scende con la provvista (nel colore della sua galleria), risale a mani vuote
        f.carico.visible = f.scende;
        (f.carico.material as THREE.MeshBasicMaterial).color = f.camera.colore;
        lungoPercorso(f.camera.percorso, f.u, punto);
        lungoPercorso(f.camera.percorso, f.u + (f.scende ? 0.02 : -0.02), dopo);
        f.g.position.copy(punto).setZ(Z + 0.02);
        f.g.rotation.z = Math.atan2(dopo.y - punto.y, dopo.x - punto.x);
        f.zampe.rotation.x = Math.sin(s * 22 + f.u * 40) * 0.5;
      });
      raccoglitrici.forEach(f => {
        f.u += dt * f.vel;
        if (f.u > 1) f.u = 0;
        const x = f.da * (1 - f.u);
        f.g.position.set(x, 0.035, Z + 0.02);
        f.g.rotation.z = f.da > 0 ? Math.PI : 0;
        f.zampe.rotation.x = Math.sin(s * 20 + f.da) * 0.5;
        f.carico.rotation.z = Math.sin(s * 3 + f.da) * 0.2;
      });
      regina.g.children[0]!.scale.set(1.3 + Math.sin(s * 1.2) * 0.06, 0.9, 0.9);
      competenze.forEach(k => accendi(materiali.get(k.id) ?? [], acceso(k.id, `skill:${k.id}`)));
    },
  });
}
