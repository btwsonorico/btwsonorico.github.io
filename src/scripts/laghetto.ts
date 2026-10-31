import * as THREE from 'three';
import { colori, vista, type DatiCompetenze, type Punto } from './vista3d';

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
  const VERDE_PROJECTS = new THREE.Color('#3fb950').lerp(c.muted, SMORZA), ARANCIO_KNOWLEDGE = new THREE.Color('#ffa45e').lerp(c.muted, SMORZA);
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
      const matPetali = linea(c.fg, 0.9), matInterni = linea(c.fg, 0.6);
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
      // Alone sull'acqua sopra il pesce: si vede dove nuota anche quando è in profondità
      const alone = anello(cerchio(0.07, 18), linea(colore, 0.4));
      gruppo.add(alone);
      punti.push({ id: `area:${a.id}`, label: a.label, href: a.href, hub: false, famiglia: k.id, ancora: p.corpo });
      const pos = new THREE.Vector3(Math.cos(angolo) * 1.75 + (r() - 0.5) * 0.4, -0.15, Math.sin(angolo) * 1.75 + (r() - 0.5) * 0.4);
      return {
        a, ...p, alone, pos, vel: new THREE.Vector3(),
        posto: new THREE.Vector3((r() - 0.5) * 0.35, 0, -0.1 - r() * 0.3),
        fase: r() * 10, profondo: 0.1 + r() * 0.25, colpo: 0,
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
  const avanti = new THREE.Vector3(), vuole = new THREE.Vector3(), lontano = new THREE.Vector3(), mira = new THREE.Vector3(), dopo = new THREE.Vector3();
  let prima = -1;

  vista(el, gruppo, punti, {
    // Vista obliqua, meno dall'alto: il laghetto si legge come un paesaggio, non come una mappa
    camera: new THREE.Vector3(0, 4.6, 7.4),
    mira: new THREE.Vector3(0, -0.3, 0),
    inclinazione: [0.08, 0.45],
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
        m.opacity = (1 - u) * 0.35;
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
          // 1) Raggiungere il proprio posto nel branco, a una profondità che cambia piano
          mira.copy(b.capo).addScaledVector(destra, p.posto.x).addScaledVector(b.rotta, p.posto.z);
          mira.y = -p.profondo - Math.sin(t * 0.0006 + p.fase) * 0.08;
          vuole.copy(mira).sub(p.pos).multiplyScalar(2.2);
          // 2) Non urtarsi con gli altri del branco
          b.pesci.forEach((q, m) => {
            if (m === n) return;
            lontano.copy(p.pos).sub(q.pos);
            const d = lontano.length();
            if (d < 0.12 && d > 1e-4) vuole.addScaledVector(lontano, (0.12 - d) * 25 / d);
          });
          // 3) Andare nella direzione del branco, con un guizzo ogni tanto
          vuole.addScaledVector(b.rotta, 0.4);
          if (Math.sin(t * 0.0013 + p.fase * 7) > 0.995) p.colpo = 1;
          p.colpo = Math.max(0, p.colpo - dt * 1.5);
          p.vel.lerp(vuole, Math.min(1, dt * 2.5));
          const max = b.sp.velocita * (1 + p.colpo * 0.8);
          if (p.vel.length() > max) p.vel.setLength(max);
          p.pos.addScaledVector(p.vel, dt);
          p.corpo.position.copy(p.pos);
          p.alone.position.set(p.pos.x, 0.005, p.pos.z);
          // Orientamento: il muso segue la velocità, con un po' di inclinazione in curva
          if (p.vel.lengthSq() > 1e-5) {
            avanti.copy(p.vel).normalize();
            p.corpo.lookAt(gruppo.localToWorld(dopo.copy(p.pos).add(avanti)));
          }
          // La coda batte più forte quando il pesce va veloce
          const velocita = p.vel.length();
          p.fase += dt * (6 + velocita * 18);
          p.coda.rotation.y = Math.sin(p.fase) * (0.35 + velocita * 0.4);
          // Più in profondità, più tenue: l'acqua dà profondità alla scena
          const l = acceso(b.k.id, `area:${p.a.id}`);
          const s = l === 1 ? 1.8 : lb === 1 ? 1.3 : 1;
          p.corpo.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
          const acqua = THREE.MathUtils.clamp(1.15 - p.profondo * 1.2, 0.75, 1);
          p.mats.forEach(m => { m.opacity = Math.min(1, l * 2) * (m.userData.base ??= m.opacity) * (l === 1 ? 1 : acqua); });
          (p.alone.material as THREE.LineBasicMaterial).opacity = l === 1 ? 0.9 : Math.min(1, l * 2) * 0.4;
          p.alone.scale.setScalar(l === 1 ? 1.6 : 1);
        });
      });
    },
  });
}
