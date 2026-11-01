import * as THREE from 'three';
import { colori, tonoSezione, vista, type DatiCompetenze, type Punto } from './vista3d';

// Projects come bosco: ogni area è un albero, sparso sul terreno. Ogni competenza chiave ha il suo
// tipo di albero e la sua zona, segnata da un palo con il nome della competenza.
// Altezza dell'albero: quante tecnologie usa l'area. Ricchezza della chioma: quanti punti ha.
// Quando la scena appare, il bosco cresce da zero; poi arrivano gli uccelli, che volano da un albero all'altro.
// Intorno: ciuffi d'erba, pochi fiori grandi azzurri e arancioni, lucciole bianche fra gli alberi.
// Ogni competenza (o progetto) ha un albero guida, grande, con il nome in cima.
// I due colori sono quelli di Advisory e Knowledge: nei progetti uso anche la consulenza e quello che studio.
// Le chiome hanno un riempimento tenue sotto i fili, così il colore del bosco è più pieno.
// Una famiglia di cervi bianchi cammina piano fra gli alberi: un cervo, una cerva e due cerbiatti che la seguono.

// Numeri casuali ripetibili: il bosco è uguale a ogni visita
function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}

type Specie = 'palma' | 'quercia' | 'acacia' | 'abete';
const SPECIE: Specie[] = ['palma', 'quercia', 'acacia', 'abete'];
// Quanto sale il tronco dritto, per specie (la palma disegna da sola il suo tronco curvo)
const TRONCO: Record<Specie, number> = { palma: 0, quercia: 0.8, acacia: 0.45, abete: 0.4 };

export function monta(el: HTMLElement) {
  const { competenze, progetti = [] } = JSON.parse(el.dataset.grafo!) as DatiCompetenze;
  const c = colori(el);
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const r = casuale(11);
  const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
  const spigoli = (geo: THREE.BufferGeometry, mat: THREE.LineBasicMaterial) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
  const segmento = (a: THREE.Vector3, b: THREE.Vector3, mat: THREE.LineBasicMaterial) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat);
  // Chioma piena: i fili della forma più un riempimento tenue dello stesso colore.
  // userData.pieno: opacità del riempimento rispetto ai fili, usata quando la scena accende e spegne gli alberi
  const chiaro = document.documentElement.dataset.theme === 'light';
  const PIENO = chiaro ? 0.24 : 0.2;
  const solido = (geo: THREE.BufferGeometry, m: THREE.LineBasicMaterial, colore: THREE.Color) => {
    const g = new THREE.Group();
    const riempimento = new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: PIENO, depthWrite: false });
    riempimento.userData.pieno = PIENO;
    g.add(new THREE.Mesh(geo, riempimento), new THREE.LineSegments(new THREE.EdgesGeometry(geo), m));
    return g;
  };
  // Opacità di un pezzo d'albero: i riempimenti restano tenui anche quando l'albero è acceso
  const opacita = (o: THREE.Object3D, valore: number) => {
    const m = (o as THREE.Mesh).material as THREE.Material;
    m.opacity = valore * (m.userData.pieno ?? 1);
  };

  // Terreno: una griglia di punti, come lo sfondo del sito
  const passo = 0.4, lato = 7.2;
  const terreno: number[] = [];
  for (let x = -lato; x <= lato; x += passo) for (let z = -lato; z <= lato; z += passo)
    if (Math.hypot(x, z) < lato) terreno.push(x, 0, z);
  const geoTerreno = new THREE.BufferGeometry();
  geoTerreno.setAttribute('position', new THREE.Float32BufferAttribute(terreno, 3));
  gruppo.add(new THREE.Points(geoTerreno, new THREE.PointsMaterial({ color: c.muted, size: 0.025, transparent: true, opacity: 0.6 })));

  // Posizioni: ogni gruppo (competenza o progetto) ha un settore del cerchio; gli alberi cadono a caso nel settore,
  // lontani almeno DISTANZA l'uno dall'altro. Ogni vista ha il suo generatore, così le posizioni sono sempre le stesse.
  const DISTANZA = 0.85;
  const posto = (rr: () => number, occupati: THREE.Vector2[], centro: number, ampiezza: number) => {
    for (let prova = 0; prova < 200; prova++) {
      const a = centro + (rr() - 0.5) * ampiezza;
      const d = 1.2 + Math.sqrt(rr()) * 3.5;
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
    // Ogni pezzo con un materiale entra nella lista: anche i fili e il riempimento dentro una chioma piena
    const add = (o: THREE.Object3D) => { albero.add(o); o.traverse(x => { if ((x as THREE.Mesh).material) pezzi.push(x); }); };
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
      const palla0 = solido(new THREE.IcosahedronGeometry(centrale, 0), m, colore);
      palla0.position.set(0, attacco.y + centrale * 0.55, 0);
      add(palla0);
      for (let k = 1; k < n; k++) {
        const a = (k / (n - 1)) * Math.PI * 2 + r() * 0.4;
        const raggio = 0.17 + peso * 0.02;
        const centro = new THREE.Vector3(Math.cos(a) * centrale * 0.95, attacco.y + 0.02 + r() * 0.12, Math.sin(a) * centrale * 0.95);
        const palla = solido(new THREE.IcosahedronGeometry(raggio, 0), m, colore);
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
        const piatta = solido(new THREE.IcosahedronGeometry(larga, 1), m, colore);
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
        const cono = solido(new THREE.ConeGeometry(0.32 * (1 - f * 0.45) * (0.8 + peso * 0.08), h, 7), m, colore);
        cono.position.y = altezza * 0.3 + f * altezza * 0.62 + h / 2;
        add(cono);
      }
    }
    return pezzi;
  }

  // Sfumature dello stesso colore d'accento (in Projects il verde di GitHub): ogni albero ne prende una
  const SFUMATURE = [-0.14, -0.07, 0, 0.07, 0.13].map((dl, k) => c.accent.clone().offsetHSL((k - 2) * 0.012, 0, dl));

  // Alberi: uno per area, con la specie della sua competenza. Nella vista per progetto le specie si mescolano.
  type Albero = { id: string; albero: THREE.Group; cima: THREE.Object3D; pezzi: THREE.Object3D[]; altezza: number; fase: number; ritardo: number; punto: Punto };
  const nuovoAlbero = (id: string, label: string, href: string, specie: Specie, altezza: number, ricchezza: number, peso: number): Albero => {
    const albero = new THREE.Group();
    albero.rotation.y = r() * Math.PI;
    const tronco = segmento(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, altezza * Math.max(TRONCO[specie], 0.001), 0), linea(c.fg));
    albero.add(tronco);
    const pezzi = chioma(albero, specie, altezza, ricchezza, peso, SFUMATURE[Math.floor(r() * SFUMATURE.length)]!);
    // Punto d'ancora in cima: lì compaiono etichetta e clic, e lì si posano gli uccelli
    const cima = new THREE.Object3D();
    cima.position.y = altezza * 1.15;
    albero.add(cima);
    albero.scale.setScalar(0.001);
    gruppo.add(albero);
    const punto: Punto = { id, label, href, hub: false, famiglia: '', ancora: cima, base: albero };
    punti.push(punto);
    return { id, albero, cima, pezzi: [tronco, ...pezzi], altezza, fase: r() * 10, ritardo: 0, punto };
  };
  const perArea = new Map<string, Albero>();
  competenze.forEach((k, i) => {
    const specie = SPECIE[i % SPECIE.length]!;
    for (const a of k.aree) {
      // Le palme restano più basse degli altri alberi
      const altezza = specie === 'palma' ? 0.5 + a.peso * 0.14 : 0.75 + a.peso * 0.28;
      perArea.set(a.id, nuovoAlbero(`area:${a.id}`, a.label, a.href, specie, altezza, a.punti, a.peso));
    }
  });
  // Alberelli: le cose che sto iniziando a imparare in un progetto. Piccoli, non cliccabili.
  const alberelli = progetti.flatMap(p => p.crescita.map((testo, k) =>
    ({ progetto: p.id, ...nuovoAlbero(`cresce:${p.id}:${k}`, testo, '', SPECIE[(k + 3) % SPECIE.length]!, 0.32, 2, 0) })));

  // Albero guida: uno per competenza e uno per progetto, molto più grande degli altri e nel verde pieno.
  // Fa da insegna (il nome compare in cima) e rende il bosco più grande. Specie: quella della competenza.
  const nuovoPalo = (id: string, label: string, href: string, specie: Specie) => {
    const base = new THREE.Group();
    base.rotation.y = r() * Math.PI;
    const altezza = specie === 'palma' ? 1.35 : 1.9;
    const tronco = segmento(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, altezza * Math.max(TRONCO[specie], 0.001), 0), linea(c.fg));
    base.add(tronco);
    const pezzi = chioma(base, specie, altezza, 5, 5, c.accent);
    const insegna = new THREE.Object3D();
    insegna.position.y = altezza * 1.15;
    base.add(insegna);
    base.scale.setScalar(0.001);
    gruppo.add(base);
    const punto: Punto = { id, label, href, hub: true, famiglia: id, ancora: insegna, base };
    punti.push(punto);
    return { id, base, pezzi: [tronco, ...pezzi], punto, fase: r() * 10 };
  };
  const gruppiCompetenza = competenze.map((k, i) => ({ ...nuovoPalo(`skill:${k.id}`, k.label, k.href, SPECIE[i % SPECIE.length]!), membri: k.aree.map(a => perArea.get(a.id)!) }));
  const gruppiProgetto = progetti
    .filter(p => p.aree.length || p.crescita.length)
    .map((p, i) => ({
      ...nuovoPalo(`progetto:${p.id}`, p.label, '', SPECIE[(i + 1) % SPECIE.length]!),
      membri: [...p.aree.map(id => perArea.get(id)).filter((x): x is Albero => !!x), ...alberelli.filter(x => x.progetto === p.id)],
    }));
  const tutti = [...perArea.values()];

  // Erba: ciuffi a tre fili sparsi fra gli alberi
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

  // Campanule azzurre nell'erba, nel colore di Advisory: un gambo piegato e un fiore a campana rivolto in basso
  // Colori delle altre sezioni smorzati (verso il grigio, semitrasparenti): il verde del bosco resta il protagonista
  const SMORZA = 0.3, OPACITA_ALTRI = 0.65;
  const AZZURRO_ADVISORY = tonoSezione('--azzurro').lerp(c.muted, SMORZA), ARANCIO_KNOWLEDGE = tonoSezione('--arancio').lerp(c.muted, SMORZA);
  const campanule = new THREE.Group();
  const matCampane = linea(AZZURRO_ADVISORY, OPACITA_ALTRI), matGambiAzzurri = linea(c.muted, 0.7);
  const geoCampana = new THREE.EdgesGeometry(new THREE.ConeGeometry(0.06, 0.09, 6, 1, true));
  for (let k = 0; k < 9; k++) {
    const a = r() * Math.PI * 2, d = 0.6 + Math.sqrt(r()) * 5.3;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.12 + r() * 0.08, piega = 0.03 + r() * 0.03;
    campanule.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0, z), new THREE.Vector3(x, h, z), new THREE.Vector3(x + piega, h + 0.02, z),
    ]), matGambiAzzurri));
    const campana = new THREE.LineSegments(geoCampana, matCampane);
    campana.position.set(x + piega, h - 0.005, z);
    campanule.add(campana);
  }
  campanule.scale.y = 0.001;
  gruppo.add(campanule);

  // Lucciole bianche: punti che si accendono e si spengono piano fra gli alberi
  const LUCCIOLE = 26;
  const baseLucciole = Array.from({ length: LUCCIOLE }, () => {
    const a = r() * Math.PI * 2, d = 0.8 + Math.sqrt(r()) * 4.6;
    return { x: Math.cos(a) * d, y: 0.2 + r() * 1.1, z: Math.sin(a) * d, fase: r() * 10, vel: 0.6 + r() * 0.8 };
  });
  const geoLucciole = new THREE.BufferGeometry();
  geoLucciole.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(LUCCIOLE * 3), 3));
  geoLucciole.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(LUCCIOLE * 3), 3));
  const lucciole = new THREE.Points(geoLucciole, new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: OPACITA_ALTRI + 0.25 }));
  lucciole.visible = false;
  gruppo.add(lucciole);
  const luce = new THREE.Color();

  // Fiori arancioni nell'erba, nel colore di Knowledge: un gambo e cinque petali a stella. Pochi e grandi.
  const gambi: number[] = [], petali: number[] = [];
  for (let k = 0; k < 14; k++) {
    const a = r() * Math.PI * 2, d = 0.9 + Math.sqrt(r()) * 5.2;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.14 + r() * 0.1, raggio = 0.08 + r() * 0.035;
    gambi.push(x, 0, z, x, h, z);
    for (let q = 0; q < 5; q++) {
      const b = (q / 5) * Math.PI * 2 + a;
      petali.push(x, h, z, x + Math.cos(b) * raggio, h + 0.01, z + Math.sin(b) * raggio);
    }
  }
  const geoGambi = new THREE.BufferGeometry();
  geoGambi.setAttribute('position', new THREE.Float32BufferAttribute(gambi, 3));
  const geoPetali = new THREE.BufferGeometry();
  geoPetali.setAttribute('position', new THREE.Float32BufferAttribute(petali, 3));
  const fiori = new THREE.Group();
  fiori.add(new THREE.LineSegments(geoGambi, linea(c.muted, 0.7)), new THREE.LineSegments(geoPetali, linea(ARANCIO_KNOWLEDGE, OPACITA_ALTRI)));
  fiori.scale.y = 0.001;
  gruppo.add(fiori);
  gruppo.add(prato);

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
  // Gli uccelli si posano solo sugli alberi visibili nella vista attuale
  const posabili = () => tutti.map((x, i) => (x.albero.visible ? i : -1)).filter(i => i >= 0);
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), pc = new THREE.Vector3(), pos = new THREE.Vector3(), dopo = new THREE.Vector3();
  const arco = (u: number, out: THREE.Vector3) => {
    // Curva di Bézier quadratica, con il punto di controllo alto sopra il centro
    const v = 1 - u;
    return out.copy(p0).multiplyScalar(v * v).addScaledVector(pc, 2 * v * u).addScaledVector(p1, u * u);
  };

  // Cervi: corpo pieno bianco con i bordi a fili, zampe che si muovono, corna a rami.
  // Camminano verso un punto a caso del bosco, si girano piano, e ogni tanto si fermano a brucare.
  const BIANCO = new THREE.Color(chiaro ? '#ffffff' : '#eef1f5');
  const matCervo = new THREE.MeshBasicMaterial({ color: BIANCO, transparent: true, opacity: chiaro ? 1 : 0.92 });
  // Sul fondo chiaro i bordi sono scuri, così il cervo bianco si stacca dallo sfondo
  const matBordiCervo = linea(c.fg, chiaro ? 0.6 : 0.55), matCorna = linea(c.fg, chiaro ? 0.75 : 0.85);
  const pezzoCervo = (geo: THREE.BufferGeometry) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, matCervo), new THREE.LineSegments(new THREE.EdgesGeometry(geo), matBordiCervo));
    return g;
  };
  // Tre tipi: il cervo è il più grande, con le corna a rami; la cerva è più snella, senza corna;
  // il cerbiatto è piccolo, con le zampe lunghe e le macchie sulla schiena
  type Tipo = 'cervo' | 'cerva' | 'cerbiatto';
  const MISURA: Record<Tipo, number> = { cervo: 0.78, cerva: 0.66, cerbiatto: 0.42 };
  const matMacchie = new THREE.PointsMaterial({ color: c.muted, size: 0.03, transparent: true, opacity: 0.9 });
  const nuovoCervo = (tipo: Tipo) => {
    const cervo = new THREE.Group();
    const snella = tipo === 'cerva' ? 0.85 : 1;
    const corpo = pezzoCervo(new THREE.BoxGeometry(0.36 * snella, 0.14 * snella, 0.13 * snella));
    corpo.position.y = 0.3;
    // Collo e testa: girano insieme quando il cervo bruca
    const collo = new THREE.Group();
    collo.position.set(0.15, 0.34, 0);
    const pezzoCollo = pezzoCervo(new THREE.BoxGeometry(0.07, 0.2, 0.07));
    pezzoCollo.position.set(0.03, 0.09, 0);
    pezzoCollo.rotation.z = -0.35;
    const testa = pezzoCervo(new THREE.BoxGeometry(0.13, 0.07, 0.07));
    testa.position.set(0.1, 0.19, 0);
    const corna: number[] = [];
    for (const lato of [1, -1]) corna.push(
      0.07, 0.22, lato * 0.02, 0.05, 0.36, lato * 0.07, 0.06, 0.29, lato * 0.04, 0.12, 0.34, lato * 0.06,
      0.05, 0.36, lato * 0.07, 0.0, 0.42, lato * 0.09, 0.05, 0.36, lato * 0.07, 0.09, 0.43, lato * 0.08,
    );
    const geoCorna = new THREE.BufferGeometry();
    geoCorna.setAttribute('position', new THREE.Float32BufferAttribute(corna, 3));
    if (tipo === 'cervo') collo.add(new THREE.LineSegments(geoCorna, matCorna));
    // Cerva e cerbiatti: orecchie grandi al posto delle corna
    else collo.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.06, 0.22, 0.03), new THREE.Vector3(0.03, 0.29, 0.07), new THREE.Vector3(0.06, 0.22, -0.03), new THREE.Vector3(0.03, 0.29, -0.07),
    ]), matCorna));
    if (tipo === 'cerbiatto') {
      const macchie: number[] = [];
      for (let q = 0; q < 8; q++) macchie.push(-0.12 + (q % 4) * 0.08, 0.375, (q < 4 ? 1 : -1) * 0.04);
      const geoMacchie = new THREE.BufferGeometry();
      geoMacchie.setAttribute('position', new THREE.Float32BufferAttribute(macchie, 3));
      cervo.add(new THREE.Points(geoMacchie, matMacchie));
    }
    collo.add(pezzoCollo, testa);
    const coda = pezzoCervo(new THREE.BoxGeometry(0.04, 0.05, 0.04));
    coda.position.set(-0.19, 0.34, 0);
    // Zampe: ognuna ruota intorno all'anca
    const geoZampa = new THREE.BoxGeometry(0.035, 0.24, 0.035);
    geoZampa.translate(0, -0.12, 0);
    const zampe = [[0.13, 0.04], [0.13, -0.04], [-0.13, 0.04], [-0.13, -0.04]].map(([x, z]) => {
      const zampa = pezzoCervo(geoZampa);
      zampa.position.set(x!, 0.25, z!);
      cervo.add(zampa);
      return zampa;
    });
    cervo.add(corpo, collo, coda);
    cervo.scale.setScalar(MISURA[tipo]);
    // Il cerbiatto ha le zampe lunghe rispetto al corpo
    if (tipo === 'cerbiatto') zampe.forEach(z => { z.scale.y = 1.25; });
    cervo.visible = false;
    gruppo.add(cervo);
    const a = r() * Math.PI * 2, d = 2 + r() * 2.5;
    return { tipo, cervo, collo, zampe, x: Math.cos(a) * d, z: Math.sin(a) * d, verso: r() * Math.PI * 2, meta: new THREE.Vector2(), passo: r() * 10, bruca: 0, lato: 0 };
  };
  const cervi = (['cervo', 'cerva', 'cerbiatto', 'cerbiatto'] as const).map(nuovoCervo);
  const mamma = cervi[1]!;
  // I cerbiatti partono vicino alla mamma, uno per lato
  cervi.slice(2).forEach((v, i) => { v.lato = i ? -1 : 1; v.x = mamma.x + 0.3; v.z = mamma.z + v.lato * 0.3; });
  const nuovaMeta = (v: (typeof cervi)[number]) => {
    const a = r() * Math.PI * 2, d = 1.2 + Math.sqrt(r()) * 4.4;
    v.meta.set(Math.cos(a) * d, Math.sin(a) * d);
  };
  cervi.forEach(nuovaMeta);
  let primaCervi = -1;

  // Vista: dispone alberi e alberi guida per competenza o per progetto, poi fa ricrescere tutto da zero
  type Modo = 'competenza' | 'progetto';
  let modo: Modo = 'competenza';
  let gruppiAttivi = gruppiCompetenza;
  function disponi(m: Modo) {
    modo = m;
    gruppiAttivi = m === 'competenza' ? gruppiCompetenza : gruppiProgetto;
    const rr = casuale(m === 'competenza' ? 11 : 29);
    const occupati: THREE.Vector2[] = [];
    const visibili = new Set<Albero>();
    let ordine = 0;
    gruppiAttivi.forEach((g, i) => {
      const settore = (Math.PI * 2) / gruppiAttivi.length;
      const centro = i * settore + Math.PI / 4;
      // L'albero guida prende per primo il suo posto, verso il mezzo del settore
      const guida = posto(rr, occupati, centro, settore * 0.3);
      g.base.position.set(guida.x, 0, guida.y);
      // Spazio libero intorno alla chioma grande: gli altri alberi restano fuori
      for (let q = 0; q < 6; q++) occupati.push(new THREE.Vector2(guida.x + Math.cos(q) * 0.45, guida.y + Math.sin(q) * 0.45));
      for (const x of g.membri) {
        const p = posto(rr, occupati, centro, settore * 0.85);
        x.albero.position.set(p.x, 0, p.y);
        x.punto.famiglia = g.id;
        x.ritardo = ordine++ * 140 + rr() * 120;
        visibili.add(x);
      }
    });
    for (const g of [...gruppiCompetenza, ...gruppiProgetto]) {
      const attivo = gruppiAttivi.includes(g);
      g.base.visible = attivo;
      g.punto.spento = !attivo;
      g.base.scale.setScalar(0.001);
    }
    for (const x of [...tutti, ...alberelli]) {
      x.albero.visible = visibili.has(x);
      x.punto.spento = !visibili.has(x);
      x.albero.scale.setScalar(0.001);
    }
    inizio = -1;
    uccelli.forEach((u, n) => { u.partenza = 2600 + n * 900; u.corpo.visible = false; });
  }
  el.addEventListener('scena:modo', e => {
    const m: Modo = (e as CustomEvent<string>).detail === 'progetto' ? 'progetto' : 'competenza';
    if (m !== modo) disponi(m);
  });

  // Crescita: parte la prima volta che la scena è visibile. ease: veloce all'inizio, con un piccolo rimbalzo.
  let inizio = -1;
  const ease = (x: number) => { const s = 1.4; x -= 1; return x * x * ((s + 1) * x + s) + 1; };
  disponi('competenza');

  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 5.6, 10),
    mira: new THREE.Vector3(0, 0.4, 0),
    inclinazione: [0.05, 0.35],
    aggiorna: (t, acceso) => {
      if (inizio < 0) inizio = t;
      // Con prefers-reduced-motion t resta 0: il bosco è già cresciuto e gli uccelli restano posati
      const tempo = t === 0 ? Infinity : t - inizio;
      prato.scale.y = Math.max(0.001, THREE.MathUtils.clamp(tempo / 1500, 0, 1));
      // Campanule e fiori sbocciano insieme all'erba
      campanule.scale.y = Math.max(0.001, THREE.MathUtils.clamp((tempo - 400) / 1500, 0, 1));
      fiori.scale.y = Math.max(0.001, THREE.MathUtils.clamp((tempo - 600) / 1500, 0, 1));
      // Lucciole: arrivano quando il bosco è cresciuto, vagano piano e pulsano ognuna col suo ritmo
      lucciole.visible = tempo > 2200;
      if (lucciole.visible) {
        const pos = geoLucciole.attributes.position!, col = geoLucciole.attributes.color!;
        baseLucciole.forEach((l, n) => {
          const u = t * 0.0004 * l.vel + l.fase;
          pos.setXYZ(n, l.x + Math.sin(u) * 0.3, l.y + Math.sin(u * 1.7) * 0.15, l.z + Math.cos(u * 0.8) * 0.3);
          const accesa = t === 0 ? 0.7 : Math.max(0, Math.sin(t * 0.0015 * l.vel + l.fase * 3));
          luce.copy(c.fg).multiplyScalar(0.12 + accesa * 0.88);
          col.setXYZ(n, luce.r, luce.g, luce.b);
        });
        pos.needsUpdate = true;
        col.needsUpdate = true;
      }
      const crescitaPali = ease(THREE.MathUtils.clamp((tempo - 900) / 700, 0, 1));
      gruppiAttivi.forEach(g => {
        const lg = acceso(g.id, g.id);
        g.pezzi.forEach(p => opacita(p, Math.min(1, lg * 2)));
        g.base.scale.setScalar(Math.max(0.001, crescitaPali * (lg === 1 ? 1.08 : 1)));
        g.base.rotation.z = Math.sin(t * 0.0009 + g.fase) * 0.015;
        g.membri.forEach(x => {
          const l = acceso(g.id, x.punto.id);
          const cresce = THREE.MathUtils.clamp((tempo - x.ritardo) / 900, 0, 1);
          // Il vento: le chiome oscillano appena; l'albero in primo piano cresce un po'
          x.albero.rotation.z = Math.sin(t * 0.0012 + x.fase) * 0.025;
          const sc = Math.max(0.001, (cresce < 1 ? ease(cresce) : 1) * (l === 1 ? 1.18 : 1));
          x.albero.scale.lerp(new THREE.Vector3(sc, sc, sc), cresce < 1 ? 1 : 0.15);
          const o = Math.min(1, l * 2);
          x.pezzi.forEach(p => opacita(p, o));
        });
      });

      // Cervi: arrivano quando il bosco è cresciuto
      const dtCervi = primaCervi < 0 || t === 0 ? 0 : Math.min(0.05, (t - primaCervi) / 1000);
      primaCervi = t;
      cervi.forEach(v => {
        v.cervo.visible = tempo > 2400;
        // I cerbiatti seguono la mamma: la meta è un punto al suo fianco, un po' dietro
        const cucciolo = v.tipo === 'cerbiatto';
        if (cucciolo) {
          const dietro = mamma.verso + Math.PI + v.lato * 0.7;
          v.meta.set(mamma.x + Math.cos(dietro) * 0.32, mamma.z - Math.sin(dietro) * 0.32);
          if (v.bruca > 0 && Math.hypot(v.meta.x - v.x, v.meta.y - v.z) > 0.4) v.bruca = 0;
        }
        if (dtCervi > 0) {
          if (v.bruca > 0) {
            // Fermo a brucare: la testa scende, poi riparte verso una nuova meta
            v.bruca -= dtCervi;
            if (v.bruca <= 0 && !cucciolo) nuovaMeta(v);
          } else {
            const dx = v.meta.x - v.x, dz = v.meta.y - v.z, d = Math.hypot(dx, dz);
            if (d < 0.15) v.bruca = cucciolo ? 0.8 + r() : 3 + r() * 4;
            else {
              // Gira piano verso la meta e cammina in avanti
              const voluto = Math.atan2(-dz, dx);
              v.verso += Math.atan2(Math.sin(voluto - v.verso), Math.cos(voluto - v.verso)) * Math.min(1, dtCervi * 1.5);
              // I cerbiatti trotterellano più veloci quando restano indietro
              const vel = cucciolo ? Math.min(0.55, 0.2 + d * 0.5) : v.tipo === 'cervo' ? 0.26 : 0.22;
              v.x += Math.cos(v.verso) * vel * dtCervi;
              v.z -= Math.sin(v.verso) * vel * dtCervi;
              v.passo += dtCervi * (cucciolo ? 11 : 7) * (vel / 0.25);
            }
          }
        }
        const cammina = v.bruca > 0 ? 0 : 1;
        v.cervo.position.set(v.x, Math.abs(Math.sin(v.passo)) * 0.012 * cammina, v.z);
        v.cervo.rotation.y = v.verso;
        v.zampe.forEach((z, i) => { z.rotation.z = Math.sin(v.passo + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.4 * cammina; });
        // Collo: giù quando bruca, su e appena oscillante quando cammina
        v.collo.rotation.z += ((v.bruca > 0 ? -1.15 : Math.sin(v.passo * 0.5) * 0.05) - v.collo.rotation.z) * Math.min(1, dtCervi * 3);
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
          const scelta = posabili().filter(i => i !== u.da);
          u.a = scelta.length ? scelta[Math.floor(r() * scelta.length)]! : u.da;
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
