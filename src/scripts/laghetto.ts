import * as THREE from 'three';
import { colori, tonoSezione, vista, type DatiCompetenze, type Punto } from './vista3d';

// Advisory come laghetto visto dall'alto: ogni competenza chiave è un branco di pesci, ogni area è un pesce.
// Ogni branco ha la sua specie e segue un capofila che vaga per il lago; i pesci nuotano in 3D, a profondità diverse.
// Intorno: riva irregolare con canne, tife e sassi, un pontile, cespugli e fiori sul prato, libellule,
// ninfee fiorite e, ogni tanto, un cerchio d'acqua. Tutto in wireframe.

function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}

// Specie: proporzioni del corpo in 3D (lungo, largo, alto), coda e pinna dorsale. Pesci piccoli, come in uno stagno.
type Specie = { lungo: number; largo: number; alto: number; coda: number; dorsale: number; velocita: number };
const SPECIE: Specie[] = [
  { lungo: 0.2, largo: 0.05, alto: 0.06, coda: 0.07, dorsale: 0.05, velocita: 0.55 },  // carpa koi
  { lungo: 0.22, largo: 0.03, alto: 0.035, coda: 0.05, dorsale: 0.02, velocita: 0.8 }, // pesce lungo e sottile
  { lungo: 0.14, largo: 0.045, alto: 0.08, coda: 0.05, dorsale: 0.04, velocita: 0.5 }, // pesce alto e tondo
  { lungo: 0.11, largo: 0.025, alto: 0.03, coda: 0.04, dorsale: 0.02, velocita: 1 },   // pesciolino veloce
  { lungo: 0.18, largo: 0.04, alto: 0.05, coda: 0.09, dorsale: 0.06, velocita: 0.65 }, // coda e pinne larghe
];

export function monta(el: HTMLElement) {
  const { competenze } = JSON.parse(el.dataset.grafo!) as DatiCompetenze;
  const c = colori(el);
  // Il verde di Projects nei cespugli e nelle ninfee e l'arancio di Knowledge nelle libellule: nelle consulenze
  // uso le competenze tecniche e quello che studio. Stessi valori di --accent nelle due sezioni (Base.astro).
  // Smorzati (verso il grigio, semitrasparenti): l'azzurro del laghetto resta il protagonista
  const SMORZA = 0.3;
  const VERDE_PROJECTS = tonoSezione('--verde').lerp(c.muted, SMORZA), ARANCIO_KNOWLEDGE = tonoSezione('--arancio').lerp(c.muted, SMORZA);
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
  // Forma a fagiolo allungato, con due insenature e un promontorio: più interessante di un cerchio
  const raggioRiva = (a: number) => 3.35 + 0.55 * Math.cos(2 * a) + 0.32 * Math.sin(3 * a + 0.9) - 0.22 * Math.max(0, Math.cos(a - 2.2)) ** 6 + 0.12 * Math.sin(7 * a + 2);
  const riva = Array.from({ length: 160 }, (_, i) => {
    const a = (i / 160) * Math.PI * 2, d = raggioRiva(a);
    return new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
  });
  // L'acqua è riempita d'azzurro tenue, a strati sempre più intensi verso il centro, come un lago che diventa profondo.
  // Sul fondo chiaro i fili sottili si perdono: lì la riva è più marcata
  const chiaro = document.documentElement.dataset.theme === 'light';
  gruppo.add(anello(riva, linea(c.accent, chiaro ? 0.9 : 0.55)));
  // Una seconda riva più interna, appena visibile: dà profondità all'acqua
  gruppo.add(anello(riva.map(p => p.clone().multiplyScalar(0.94)), linea(c.accent, chiaro ? 0.35 : 0.18)));
  {
    [1, 0.82, 0.6, 0.36].forEach((scala, k) => {
      const forma = new THREE.Shape(riva.map(p => new THREE.Vector2(p.x * scala, -p.z * scala)));
      const strato = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshBasicMaterial({ color: c.accent, transparent: true, opacity: (k === 0 ? 0.08 : 0.035) * (chiaro ? 1 : 0.9), depthWrite: false }));
      strato.rotation.x = -Math.PI / 2;
      strato.position.y = -0.03 - k * 0.001;
      strato.renderOrder = -1;
      gruppo.add(strato);
    });
  }

  // Prato intorno al lago: dischi verdi tenui a strati, più intensi verso il centro, che sfumano verso i bordi
  // come il prato del bosco (di notte appena accennati)
  for (const [raggio, op] of [[7.2, 0.07], [5.6, 0.045], [4.2, 0.045]] as const) {
    const disco = new THREE.Mesh(new THREE.CircleGeometry(raggio, 64), new THREE.MeshBasicMaterial({ color: VERDE_PROJECTS, transparent: true, opacity: op * (chiaro ? 1 : 0.45), depthWrite: false }));
    disco.rotation.x = -Math.PI / 2;
    disco.position.y = -0.04;
    disco.renderOrder = -2;
    gruppo.add(disco);
  }
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
  gruppo.add(nuvola(acqua, c.accent, 0.022, chiaro ? 0.55 : 0.35), nuvola(prato, VERDE_PROJECTS, 0.022, 0.4));

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
  // Canne verdi, come l'erba del prato: ravvivano la riva senza rubare la scena all'acqua
  const matCanne = linea(VERDE_PROJECTS, 0.6);
  gruppo.add(new THREE.LineSegments(geoCanne, matCanne));

  // Tife: canne più alte con la spiga scura a cilindro, a gruppi in tre punti della riva
  // Colori naturali e spenti, fissi: non dipendono dal colore della pagina
  const spighe = new THREE.LineBasicMaterial({ color: new THREE.Color().setHSL(0.07, 0.45, 0.42), transparent: true, opacity: 0.9 });
  for (const a0 of [0.6, 2.4, 4.3]) {
    for (let k = 0; k < 5; k++) {
      const a = a0 + (r() - 0.5) * 0.3, d = raggioRiva(a) + 0.02 + r() * 0.15;
      const x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.55 + r() * 0.3, piega = (r() - 0.5) * 0.06;
      gruppo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, z), new THREE.Vector3(x + piega, h, z)]), matCanne));
      const spiga = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 6)), spighe);
      spiga.position.set(x + piega * 0.9, h - 0.08, z);
      gruppo.add(spiga);
    }
  }

  // Sassi lungo la riva, a metà fra acqua e prato
  // Ciuffi d'erba verdi sul prato intorno al lago
  const erba: number[] = [];
  for (let k = 0; k < 130; k++) {
    const a = r() * Math.PI * 2, d = raggioRiva(a) + 0.3 + r() * 1.4;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.06 + r() * 0.08;
    for (const dx of [-0.04, 0, 0.04]) erba.push(x, 0, z, x + dx, h * (dx === 0 ? 1.3 : 1), z + dx * 0.5);
  }
  const geoErba = new THREE.BufferGeometry();
  geoErba.setAttribute('position', new THREE.Float32BufferAttribute(erba, 3));
  gruppo.add(new THREE.LineSegments(geoErba, linea(VERDE_PROJECTS, 0.5)));

  const matSassi = linea(c.muted, 0.7);
  for (let k = 0; k < 22; k++) {
    const a = r() * Math.PI * 2, d = raggioRiva(a) + (r() - 0.3) * 0.15;
    const sasso = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.DodecahedronGeometry(0.05 + r() * 0.09, 0)), matSassi);
    sasso.position.set(Math.cos(a) * d, 0.02, Math.sin(a) * d);
    sasso.scale.y = 0.55;
    sasso.rotation.y = r() * 3;
    gruppo.add(sasso);
  }

  // Pontile di legno: assi trasversali su due travi, con quattro pali che escono dall'acqua
  const pontile = new THREE.Group();
  const matLegno = linea(c.fg, 0.7);
  const assi: number[] = [];
  for (let k = 0; k <= 9; k++) { const z = k * 0.1; assi.push(-0.16, 0.06, z, 0.16, 0.06, z); }
  assi.push(-0.14, 0.06, 0, -0.14, 0.06, 0.9, 0.14, 0.06, 0, 0.14, 0.06, 0.9);
  for (const [x, z] of [[-0.14, 0.3], [0.14, 0.3], [-0.14, 0.88], [0.14, 0.88]]) assi.push(x!, -0.12, z!, x!, 0.06, z!);
  const geoAssi = new THREE.BufferGeometry();
  geoAssi.setAttribute('position', new THREE.Float32BufferAttribute(assi, 3));
  pontile.add(new THREE.LineSegments(geoAssi, matLegno));
  const aPontile = 5.6;
  pontile.position.set(Math.cos(aPontile) * (raggioRiva(aPontile) + 0.15), 0, Math.sin(aPontile) * (raggioRiva(aPontile) + 0.15));
  pontile.lookAt(0, 0, 0);
  gruppo.add(pontile);

  // Cespugli sul prato: palle sfaccettate basse, in piccoli gruppi
  const matCespi = linea(VERDE_PROJECTS, 0.5);
  for (let k = 0; k < 9; k++) {
    const a = r() * Math.PI * 2, d = raggioRiva(a) + 0.45 + r() * 0.6;
    for (let q = 0; q < 2 + Math.floor(r() * 2); q++) {
      const cespo = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.1 + r() * 0.08, 0)), matCespi);
      cespo.position.set(Math.cos(a) * d + (r() - 0.5) * 0.25, 0.06, Math.sin(a) * d + (r() - 0.5) * 0.25);
      cespo.scale.y = 0.7;
      gruppo.add(cespo);
    }
  }

  // Fiori di prato: un gambo e un puntino chiaro in cima
  const fioriPrato: number[] = [], gambi: number[] = [];
  for (let k = 0; k < 40; k++) {
    const a = r() * Math.PI * 2, d = raggioRiva(a) + 0.3 + r() * 1.1, h = 0.08 + r() * 0.08;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    gambi.push(x, 0, z, x, h, z);
    fioriPrato.push(x, h, z);
  }
  const geoGambi = new THREE.BufferGeometry();
  geoGambi.setAttribute('position', new THREE.Float32BufferAttribute(gambi, 3));
  gruppo.add(new THREE.LineSegments(geoGambi, linea(c.muted, 0.6)), nuvola(fioriPrato, c.fg, 0.045, 0.85));


  // Ninfee: foglie con lo spicchio tagliato e le nervature; quasi tutte hanno un fiore aperto,
  // con due giri di petali a punta rivolti verso l'alto e il cuore chiaro
  const petalo = (lungo: number, largo: number) => [
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(largo, lungo * 0.35, lungo * 0.45),
    new THREE.Vector3(0, lungo * 0.55, lungo), new THREE.Vector3(-largo, lungo * 0.35, lungo * 0.45),
  ];
  const ninfee = Array.from({ length: 8 }, (_, k) => {
    const raggio = 0.16 + r() * 0.12;
    const n = 28, taglio = 0.5;
    const bordo = [new THREE.Vector3(0, 0, 0), ...Array.from({ length: n + 1 }, (_, i) => {
      const a = taglio / 2 + (i / n) * (Math.PI * 2 - taglio);
      return new THREE.Vector3(Math.cos(a) * raggio, 0, Math.sin(a) * raggio);
    })];
    const foglia = new THREE.Group();
    foglia.add(anello(bordo, linea(VERDE_PROJECTS, 0.65)));
    const nervature: number[] = [];
    for (let i = 1; i < 5; i++) {
      const a = taglio / 2 + (i / 5) * (Math.PI * 2 - taglio);
      nervature.push(0, 0, 0, Math.cos(a) * raggio * 0.85, 0, Math.sin(a) * raggio * 0.85);
    }
    const geoN = new THREE.BufferGeometry();
    geoN.setAttribute('position', new THREE.Float32BufferAttribute(nervature, 3));
    foglia.add(new THREE.LineSegments(geoN, linea(VERDE_PROJECTS, 0.3)));
    if (k % 4 !== 3) {
      const fiore = new THREE.Group();
      // Petali arancioni, il colore di Knowledge: mai neri sul fondo chiaro
      const petali = tonoSezione('--arancio');
      const matPetali = linea(petali, 0.9), matInterni = linea(petali, 0.6);
      for (const [giro, quanti, lungo, inclina, mat] of [[0, 8, 0.11, 0.35, matPetali], [0.4, 6, 0.08, 0.7, matInterni]] as const) {
        for (let i = 0; i < quanti; i++) {
          const p = anello(petalo(lungo, 0.025), mat);
          p.rotation.y = giro + (i / quanti) * Math.PI * 2;
          p.rotateX(-inclina);
          fiore.add(p);
        }
      }
      const cuore = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: c.accent.clone().offsetHSL(0.12, 0, 0.1) }));
      cuore.position.y = 0.02;
      fiore.add(cuore);
      fiore.position.set(raggio * 0.15, 0.01, 0);
      fiore.scale.setScalar(0.8 + r() * 0.5);
      foglia.add(fiore);
    }
    const a = r() * Math.PI * 2, d = (0.4 + r() * 0.45) * raggioRiva(a);
    foglia.position.set(Math.cos(a) * d, 0.01, Math.sin(a) * d);
    foglia.rotation.y = r() * Math.PI * 2;
    gruppo.add(foglia);
    return { foglia, giro: (r() - 0.5) * 0.00012 };
  });

  // Cerchi d'acqua: ogni tanto un anello nasce in un punto del lago, si allarga e svanisce
  const matOnda = () => linea(c.accent, 0);
  const onde = Array.from({ length: 3 }, () => {
    const o = anello(cerchio(1, 40), matOnda());
    gruppo.add(o);
    return { o, nato: -1e9, durata: 2600 };
  });
  let prossimaOnda = 0, quale = 0;

  // Pesci in 3D: corpo a fuso sfaccettato, coda e pinna dorsale verticali, pinne laterali.
  // Il pesce guarda verso +z; la coda è un gruppo a parte che oscilla intorno al suo attacco.
  const SFUMATURE = [-0.12, -0.05, 0.04, 0.11].map(dl => c.accent.clone().offsetHSL(0, 0, dl));
  function pesce(sp: Specie, colore: THREE.Color) {
    const corpo = new THREE.Group();
    const m = linea(colore), mp = linea(colore, 0.65);
    const fuso = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(1, 7, 5)), m);
    fuso.scale.set(sp.largo, sp.alto, sp.lungo / 2);
    corpo.add(fuso);
    const coda = new THREE.Group();
    coda.position.z = -sp.lungo * 0.45;
    coda.add(anello([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, sp.coda * 0.7, -sp.coda), new THREE.Vector3(0, 0, -sp.coda * 0.7), new THREE.Vector3(0, -sp.coda * 0.7, -sp.coda)], m));
    corpo.add(coda);
    // Pinna dorsale e pinne laterali
    corpo.add(anello([new THREE.Vector3(0, sp.alto * 0.9, sp.lungo * 0.1), new THREE.Vector3(0, sp.alto + sp.dorsale, -sp.lungo * 0.05), new THREE.Vector3(0, sp.alto * 0.8, -sp.lungo * 0.25)], mp));
    for (const lato of [1, -1]) corpo.add(anello([new THREE.Vector3(lato * sp.largo * 0.9, -sp.alto * 0.3, sp.lungo * 0.15), new THREE.Vector3(lato * (sp.largo + 0.04), -sp.alto * 0.6, sp.lungo * 0.02), new THREE.Vector3(lato * sp.largo * 0.8, -sp.alto * 0.4, 0)], mp));
    return { corpo, coda, mats: [m, mp] };
  }

  // Branchi: uno per competenza. Il capofila vaga per il lago con una rotta morbida;
  // i pesci lo seguono con tre regole semplici (raggiungere il proprio posto, non urtarsi, andare nella stessa direzione).
  const branchi = competenze.map((k, i) => {
    const sp = SPECIE[i % SPECIE.length]!;
    const centro = new THREE.Object3D();
    gruppo.add(centro);
    punti.push({ id: `skill:${k.id}`, label: k.label, href: k.href, hub: true, famiglia: k.id, ancora: centro });
    const angolo = (i / competenze.length) * Math.PI * 2;
    const pesci = k.aree.map((a, j) => {
      const colore = SFUMATURE[(i + j) % SFUMATURE.length]!;
      const p = pesce(sp, colore);
      gruppo.add(p.corpo);
      punti.push({ id: `area:${a.id}`, label: a.label, href: a.href, hub: false, famiglia: k.id, ancora: p.corpo });
      const pos = new THREE.Vector3(Math.cos(angolo) * 1.75 + (r() - 0.5) * 0.4, -0.15, Math.sin(angolo) * 1.75 + (r() - 0.5) * 0.4);
      return {
        a, ...p, pos, vel: new THREE.Vector3(),
        posto: new THREE.Vector3((r() - 0.5) * 0.35, 0, -0.1 - r() * 0.3),
        fase: r() * 10, profondo: 0.1 + r() * 0.25,
        // muso: direzione in cui guarda, che gira piano; slancio: spinta breve della coda; paura: dopo un sasso vicino
        muso: new THREE.Vector3(0, 0, 1), rollio: 0, slancio: 0, prossimoSlancio: r() * 4000, paura: 0, fuga: new THREE.Vector3(),
      };
    });
    // Rotta del capofila: somma di onde lente con frequenze diverse per branco, dentro un cerchio sicuro
    const f = [0.00011 + i * 0.000013, 0.00017 + i * 0.00001, 0.00007 + i * 0.000017];
    // Casa del branco: un punto su un cerchio, in un settore tutto suo, così i branchi restano distanti
    const casa = new THREE.Vector3(Math.cos(angolo) * 1.75, 0, Math.sin(angolo) * 1.75);
    return { k, sp, centro, pesci, f, casa, fase: i * 2.1, capo: new THREE.Vector3(), rotta: new THREE.Vector3() };
  });
  const capofila = (b: (typeof branchi)[number], t: number, out: THREE.Vector3) => {
    const u = b.fase;
    const x = b.casa.x + Math.sin(t * b.f[0]! + u) * 0.6 + Math.sin(t * b.f[1]! * 1.7 + u * 2) * 0.2;
    const z = b.casa.z + Math.cos(t * b.f[2]! + u * 1.3) * 0.55 + Math.sin(t * b.f[1]! + u) * 0.2;
    out.set(x, -0.15, z);
    // Dentro la riva, con un margine
    const a = Math.atan2(z, x), max = raggioRiva(a) - 0.7, d = Math.hypot(x, z);
    if (d > max) out.multiplyScalar(max / d).setY(-0.15);
    return out;
  };
  // Pesci liberi: non sono aree e non si cliccano. Nuotano da soli per tutto il lago, così lo stagno è già popolato
  // e i branchi delle aree nuove ci si aggiungono senza cambiare l'aspetto della scena.
  const liberi = Array.from({ length: 9 }, (_, k) => {
    const p = pesce(SPECIE[(k + 2) % SPECIE.length]!, c.accent.clone().lerp(c.muted, 0.45));
    p.mats.forEach(m => { m.opacity *= 0.7; });
    gruppo.add(p.corpo);
    return { ...p, fase: r() * Math.PI * 2, vel: (0.05 + r() * 0.05) * (k % 2 ? 1 : -1), raggio: 0.6 + r() * 0.5, prof: 0.15 + r() * 0.2, colpo: r() * 6 };
  });
  const libellule = Array.from({ length: 3 }, (_, k) => {
    const corpo = new THREE.Group();
    const m = linea(ARANCIO_KNOWLEDGE, 0.75);
    corpo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.06), new THREE.Vector3(0, 0, -0.1)]), m));
    const ali = new THREE.Group();
    for (const lato of [1, -1]) for (const dz of [0.025, -0.01])
      ali.add(anello([new THREE.Vector3(0, 0, dz), new THREE.Vector3(lato * 0.09, 0, dz + 0.015), new THREE.Vector3(lato * 0.09, 0, dz - 0.01)], m));
    corpo.add(ali);
    gruppo.add(corpo);
    return { corpo, ali, da: new THREE.Vector3(), a: new THREE.Vector3(), via: -1e9, durata: 1100, sosta: 3500 + k * 1500 };
  });
  const puntoInAria = (out: THREE.Vector3) => {
    // Quasi sempre lungo la riva, fra canne e ninfee; solo una volta su sei passano sopra il centro del lago
    const a = r() * Math.PI * 2, d = raggioRiva(a) * (r() < 0.17 ? Math.sqrt(r()) * 0.6 : 0.78 + r() * 0.2);
    return out.set(Math.cos(a) * d, 0.35 + r() * 0.35, Math.sin(a) * d);
  };
  libellule.forEach(l => { puntoInAria(l.a); l.corpo.position.copy(l.a); });
  // Sasso: un clic sull'acqua, lontano dai pesci, lancia un sasso. Cade e fa "pluf": una colonna d'acqua
  // sale e ricade, le gocce schizzano a corona, tre cerchi si allargano. I pesci vicini scappano e vanno a fondo.
  const CADUTA = 420, GRAVITA = 5.5;
  type Tonfo = {
    punto: THREE.Vector3; nato: number; toccato: boolean; oggetti: THREE.Object3D[];
    sasso: THREE.LineSegments; gocce: THREE.Points; velGocce: number[]; colonna: THREE.Group; anelli: THREE.LineLoop[];
  };
  const tonfi: Tonfo[] = [];
  function lancia(punto: THREE.Vector3, t: number) {
    const sasso = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.06, 0)), linea(c.fg, 0.9));
    const gocce = nuvola(Array.from({ length: 18 * 3 }, () => 0), c.accent, 0.045, 0);
    const colonna = new THREE.Group();
    for (const dx of [-0.02, 0, 0.02]) colonna.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(dx, 0, 0), new THREE.Vector3(dx * 0.4, 1, 0)]), linea(c.accent, 0)));
    colonna.position.copy(punto).setY(0);
    colonna.scale.y = 0.001;
    const anelli = [0, 1, 2].map(() => { const o = anello(cerchio(1, 40), linea(c.accent, 0)); o.position.copy(punto).setY(0.01); return o; });
    // Gocce: partono dal punto d'impatto, in cerchio, verso l'alto e verso fuori
    const velGocce = Array.from({ length: 18 }, (_, k) => {
      const a = (k / 18) * Math.PI * 2 + r() * 0.3, v = 0.45 + r() * 0.5;
      return [Math.cos(a) * v, 1.1 + r() * 0.9, Math.sin(a) * v];
    }).flat();
    const oggetti = [sasso, gocce, colonna, ...anelli];
    gruppo.add(...oggetti);
    tonfi.push({ punto, nato: t, toccato: false, oggetti, sasso, gocce, velGocce, colonna, anelli });
  }
  function aggiornaTonfi(t: number) {
    for (let k = tonfi.length - 1; k >= 0; k--) {
      const f = tonfi[k]!, u = t - f.nato;
      // Il sasso cade accelerando, poi affonda e sparisce
      if (u < CADUTA) f.sasso.position.copy(f.punto).setY(1.8 * (1 - (u / CADUTA) ** 2));
      else {
        const v = (u - CADUTA) / 700;
        f.sasso.position.copy(f.punto).setY(-v * 0.4);
        (f.sasso.material as THREE.LineBasicMaterial).opacity = Math.max(0, 0.9 - v);
      }
      f.sasso.rotation.set(u * 0.006, u * 0.004, 0);
      if (!f.toccato && u >= CADUTA) {
        f.toccato = true;
        // I pesci entro 1.5 dal tonfo si spaventano: più sono vicini, più scappano
        branchi.forEach(b => b.pesci.forEach(p => {
          lontano.copy(p.pos).sub(f.punto).setY(0);
          const d = lontano.length();
          if (d > 1.5) return;
          if (d < 1e-3) lontano.set(r() - 0.5, 0, r() - 0.5);
          p.fuga.copy(lontano.normalize());
          p.paura = Math.max(p.paura, Math.min(1, 1.3 - d / 1.5));
        }));
      }
      if (u >= CADUTA) {
        const s = (u - CADUTA) / 1000;
        // Gocce: moto a parabola; restano a pelo d'acqua e svaniscono
        const pos = f.gocce.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let g = 0; g < 18; g++) {
          const vx = f.velGocce[g * 3]!, vy = f.velGocce[g * 3 + 1]!, vz = f.velGocce[g * 3 + 2]!;
          pos.setXYZ(g, f.punto.x + vx * s, Math.max(-0.05, vy * s - GRAVITA * s * s / 2), f.punto.z + vz * s);
        }
        pos.needsUpdate = true;
        (f.gocce.material as THREE.PointsMaterial).opacity = s < 0.5 ? 0.9 : Math.max(0, 0.9 - (s - 0.5) * 3);
        // Colonna d'acqua: sale poco dopo l'impatto e ricade
        const c2 = THREE.MathUtils.clamp((u - CADUTA - 120) / 700, 0, 1);
        f.colonna.scale.y = Math.max(0.001, Math.sin(c2 * Math.PI) * 0.45);
        f.colonna.children.forEach(l => { ((l as THREE.Line).material as THREE.LineBasicMaterial).opacity = c2 > 0 && c2 < 1 ? 0.8 : 0; });
        // Tre cerchi, uno dopo l'altro
        f.anelli.forEach((o, i) => {
          const a = (u - CADUTA - i * 220) / 1800;
          (o.material as THREE.LineBasicMaterial).opacity = a > 0 && a < 1 ? (1 - a) * 0.75 : 0;
          o.scale.setScalar(0.05 + Math.max(0, a) * 0.75);
        });
      }
      if (u > CADUTA + 2600) {
        f.oggetti.forEach(o => {
          gruppo.remove(o);
          o.traverse(x => { const m = x as THREE.Line; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose(); });
        });
        tonfi.splice(k, 1);
      }
    }
  }
  const inversa = new THREE.Matrix4(), piano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), colpito = new THREE.Vector3();

  const avanti = new THREE.Vector3(), vuole = new THREE.Vector3(), lontano = new THREE.Vector3(), mira = new THREE.Vector3(), dopo = new THREE.Vector3();
  let prima = -1;

  vista(el, gruppo, punti, {
    // Vista obliqua, meno dall'alto: il laghetto si legge come un paesaggio, non come una mappa
    camera: new THREE.Vector3(0, 5.8, 10.2),
    mira: new THREE.Vector3(0, -0.3, 0),
    inclinazione: [0.08, 0.45],
    // Clic sull'acqua: il raggio dalla camera tocca il piano dell'acqua dentro la riva, e lì cade il sasso
    clicVuoto: raggio => {
      // prima === 0: movimento ridotto, niente sasso
      if (prima === 0 || tonfi.length > 4) return;
      gruppo.updateMatrixWorld();
      const raggioLocale = raggio.ray.clone().applyMatrix4(inversa.copy(gruppo.matrixWorld).invert());
      if (!raggioLocale.intersectPlane(piano, colpito)) return;
      if (Math.hypot(colpito.x, colpito.z) > raggioRiva(Math.atan2(colpito.z, colpito.x)) - 0.12) return;
      lancia(colpito.clone(), performance.now());
    },
    aggiorna: (t, acceso) => {
      // Passo di tempo in secondi, limitato: se la scheda torna visibile i pesci non saltano
      const dt = prima < 0 || t === 0 ? 0 : Math.min(0.05, (t - prima) / 1000);
      prima = t;
      ninfee.forEach(n => { n.foglia.rotation.y += n.giro * 16; });
      // Libellule: scatto verso un nuovo punto, sosta in volo con le ali che vibrano
      libellule.forEach(l => {
        if (t === 0) return;
        if (t > l.via + l.durata + l.sosta) {
          l.da.copy(l.a); puntoInAria(l.a); l.via = t;
          l.corpo.lookAt(gruppo.localToWorld(avanti.copy(l.a)));
        }
        const u = THREE.MathUtils.clamp((t - l.via) / l.durata, 0, 1);
        l.corpo.position.lerpVectors(l.da, l.a, THREE.MathUtils.smootherstep(u, 0, 1));
        l.corpo.position.y += Math.sin(t * 0.004) * 0.01;
        l.ali.scale.x = 0.6 + Math.abs(Math.sin(t * 0.09)) * 0.4;
      });

      aggiornaTonfi(t);
      // Un cerchio d'acqua ogni 3-6 secondi, mai con prefers-reduced-motion
      if (t > 0 && t > prossimaOnda) {
        const o = onde[quale++ % onde.length]!;
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * raggioRiva(a) * 0.8;
        o.o.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
        o.nato = t;
        prossimaOnda = t + 3000 + r() * 3000;
      }
      onde.forEach(o => {
        const u = (t - o.nato) / o.durata;
        const m = o.o.material as THREE.LineBasicMaterial;
        if (u < 0 || u > 1) { m.opacity = 0; return; }
        o.o.scale.setScalar(0.04 + u * 0.4);
        m.opacity = (1 - u) * (chiaro ? 0.6 : 0.35);
      });

      // Pesci liberi: girano lenti seguendo la forma della riva, a profondità diverse
      liberi.forEach(p => {
        const a = p.fase + t * 0.001 * p.vel, d = (raggioRiva(a) - 0.6) * p.raggio;
        p.corpo.position.set(Math.cos(a) * d, -p.prof, Math.sin(a) * d);
        const a2 = a + Math.sign(p.vel) * 0.05, d2 = (raggioRiva(a2) - 0.6) * p.raggio;
        p.corpo.lookAt(gruppo.localToWorld(new THREE.Vector3(Math.cos(a2) * d2, -p.prof, Math.sin(a2) * d2)));
        p.coda.rotation.y = Math.sin(t * 0.006 + p.colpo) * 0.3;
      });
      branchi.forEach(b => {
        capofila(b, t, b.capo);
        capofila(b, t + 600, dopo);
        b.rotta.copy(dopo).sub(b.capo).setY(0);
        if (b.rotta.lengthSq() < 1e-6) b.rotta.set(0, 0, 1);
        b.rotta.normalize();
        b.centro.position.copy(b.capo).setY(0.3);
        const lb = acceso(b.k.id, `skill:${b.k.id}`);
        // Base del capofila per mettere i pesci "dietro" e "di lato" rispetto alla rotta
        const destra = new THREE.Vector3(b.rotta.z, 0, -b.rotta.x);
        b.pesci.forEach((p, n) => {
          // 1) Raggiungere il proprio posto nel branco, a una profondità che cambia piano; con la paura va più a fondo
          mira.copy(b.capo).addScaledVector(destra, p.posto.x).addScaledVector(b.rotta, p.posto.z);
          mira.y = -p.profondo - Math.sin(t * 0.0006 + p.fase) * 0.08 - p.paura * 0.2;
          vuole.copy(mira).sub(p.pos).multiplyScalar(1.5);
          // 2) Non urtarsi con gli altri del branco
          b.pesci.forEach((q, m) => {
            if (m === n) return;
            lontano.copy(p.pos).sub(q.pos);
            const d = lontano.length();
            if (d < 0.12 && d > 1e-4) vuole.addScaledVector(lontano, (0.12 - d) * 25 / d);
          });
          // 3) Andare nella direzione del branco. Il nuoto è a scatti, come nei pesci veri:
          // una spinta breve della coda ogni 2-5 secondi, poi il pesce scivola
          vuole.addScaledVector(b.rotta, 0.4);
          if (t > p.prossimoSlancio) { p.slancio = 1; p.prossimoSlancio = t + 2000 + r() * 3000; }
          p.slancio = Math.max(0, p.slancio - dt * 1.6);
          vuole.addScaledVector(p.muso, p.slancio * 0.45);
          // 4) Paura: scappa lontano dal sasso, poi si calma piano
          if (p.paura > 0) { vuole.addScaledVector(p.fuga, 3 * p.paura); p.paura = Math.max(0, p.paura - dt * 0.4); }
          p.vel.lerp(vuole, Math.min(1, dt * (1.6 + p.paura * 4)));
          const max = b.sp.velocita * (1 + p.slancio * 0.5 + p.paura * 2.5);
          if (p.vel.length() > max) p.vel.setLength(max);
          p.pos.addScaledVector(p.vel, dt);
          // Dentro la riva anche quando scappa
          const ap = Math.atan2(p.pos.z, p.pos.x), dp = Math.hypot(p.pos.x, p.pos.z), dmax = raggioRiva(ap) - 0.3;
          if (dp > dmax) { p.pos.x *= dmax / dp; p.pos.z *= dmax / dp; }
          p.corpo.position.copy(p.pos);
          // Orientamento: il muso gira piano verso la direzione di nuoto, e il pesce si inclina in curva
          let giro = 0;
          if (p.vel.lengthSq() > 1e-5) {
            avanti.copy(p.vel).normalize();
            giro = p.muso.x * avanti.z - p.muso.z * avanti.x;
            p.muso.lerp(avanti, Math.min(1, dt * (2.5 + p.paura * 6))).normalize();
          }
          p.rollio += (THREE.MathUtils.clamp(giro * 6, -0.45, 0.45) - p.rollio) * Math.min(1, dt * 3);
          p.corpo.lookAt(gruppo.localToWorld(dopo.copy(p.pos).add(p.muso)));
          p.corpo.rotateZ(p.rollio);
          // Coda e corpo ondeggiano insieme: più forte durante lo slancio e la fuga, appena durante la scivolata
          const velocita = p.vel.length();
          p.fase += dt * (4 + velocita * 12 + p.slancio * 8 + p.paura * 12);
          p.corpo.rotateY(Math.sin(p.fase + 1.3) * (0.04 + p.slancio * 0.05 + p.paura * 0.05));
          p.coda.rotation.y = Math.sin(p.fase) * (0.25 + velocita * 0.35 + p.slancio * 0.25);
          // Più in profondità, più tenue: l'acqua dà profondità alla scena
          const l = acceso(b.k.id, `area:${p.a.id}`);
          const s = l === 1 ? 1.8 : lb === 1 ? 1.3 : 1;
          p.corpo.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
          const acqua = THREE.MathUtils.clamp(1.15 - p.profondo * 1.2, 0.75, 1);
          p.mats.forEach(m => { m.opacity = Math.min(1, l * 2) * (m.userData.base ??= m.opacity) * (l === 1 ? 1 : acqua); });
        });
      });
    },
  });
}
