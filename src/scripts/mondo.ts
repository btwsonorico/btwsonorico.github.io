import * as THREE from 'three';
import { crescita, colori, tonoSezione, vista, type Punto } from './vista3d';
import { famigliaCervi } from './cervi';

// Il mondo dell'About: le tre sezioni del sito in un solo diorama, nello stile di bosco e laghetto.
// A terra, su un prato verde: un piccolo bosco (Software) e uno stagno con i pesci (Advisory).
// Sopra, Knowledge: un grande stormo di uccelli arancioni che gira sul diorama, di giorno e di notte.
// Le tre sezioni hanno lo stesso peso; un anello pulsa sotto ognuna e un clic la apre.
// Sul prato cammina una famiglia di cervi, tutta vicina: è Learn, e un clic sui cervi la apre. Di notte: lucciole nel bosco.
// Il diorama ruota piano.

function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}
const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
const segmenti = (xyz: number[], mat: THREE.LineBasicMaterial) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.LineSegments(g, mat);
};
const curva = (punti: THREE.Vector3[], mat: THREE.LineBasicMaterial, chiusa = false) =>
  chiusa ? new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(punti), mat) : new THREE.Line(new THREE.BufferGeometry().setFromPoints(punti), mat);
const nuvola = (xyz: number[], colore: THREE.Color, size: number, opacita: number) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: colore, size, transparent: true, opacity: opacita }));
};

// Bordo dell'isola e dello stagno: due fagioli, come la riva del laghetto
const raggioIsola = (a: number) => 4.3 + 0.45 * Math.cos(2 * a) + 0.2 * Math.sin(3 * a + 0.6) + 0.08 * Math.sin(7 * a + 1);
const STAGNO = new THREE.Vector2(1.7, 0.4);
const raggioStagno = (a: number) => 1.35 + 0.28 * Math.cos(2 * a + 0.4) + 0.12 * Math.sin(3 * a + 1.2);
const nelloStagno = (x: number, z: number, margine = 0) => {
  const dx = x - STAGNO.x, dz = z - STAGNO.y;
  return Math.hypot(dx, dz) < raggioStagno(Math.atan2(dz, dx)) - margine;
};
const sullIsola = (x: number, z: number, margine = 0) => Math.hypot(x, z) < raggioIsola(Math.atan2(z, x)) - margine;

export function monta(el: HTMLElement) {
  const c = colori(el);
  const chiaro = document.documentElement.dataset.theme === 'light';
  const verde = tonoSezione('--verde'), azzurro = tonoSezione('--azzurro'), arancio = tonoSezione('--arancio');
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const r = casuale(41);
  // Materiali di ogni sezione, per accenderli insieme quando il puntatore è sopra
  const materiali: Record<string, THREE.Material[]> = { software: [], advisory: [], knowledge: [] };
  const mat = (sezione: string, colore: THREE.Color, opacita: number) => { const m = linea(colore, opacita); materiali[sezione]!.push(m); return m; };
  const pieno = (sezione: string, colore: THREE.Color, opacita: number) => {
    const m = new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: opacita, depthWrite: false });
    materiali[sezione]!.push(m);
    return m;
  };

  // --- Isola: bordo, prato verde a strati, puntini e ciuffi d'erba
  const contorno = Array.from({ length: 180 }, (_, i) => { const a = (i / 180) * Math.PI * 2, d = raggioIsola(a); return new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d); });
  for (const [scala, op] of [[1, 0.07], [0.75, 0.045], [0.5, 0.04]] as const) {
    const forma = new THREE.Shape(contorno.map(p => new THREE.Vector2(p.x * scala, -p.z * scala)));
    const strato = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshBasicMaterial({ color: verde, transparent: true, opacity: op * (chiaro ? 1 : 0.45), depthWrite: false }));
    strato.rotation.x = -Math.PI / 2;
    strato.position.y = -0.03 + scala * 0.004;
    strato.renderOrder = -2;
    gruppo.add(strato);
  }
  const prato: number[] = [], erba: number[] = [];
  for (let x = -5; x <= 5; x += 0.3) for (let z = -5; z <= 5; z += 0.3) {
    const px = x + (r() - 0.5) * 0.1, pz = z + (r() - 0.5) * 0.1;
    if (sullIsola(px, pz, 0.1) && !nelloStagno(px, pz, -0.1)) prato.push(px, 0, pz);
  }
  for (let k = 0; k < 170; k++) {
    let x = 0, z = 0;
    do { x = (r() - 0.5) * 8.6; z = (r() - 0.5) * 8; } while (!sullIsola(x, z, 0.2) || nelloStagno(x, z, -0.15));
    const h = 0.06 + r() * 0.08;
    for (const dx of [-0.04, 0, 0.04]) erba.push(x, 0, z, x + dx, h * (dx === 0 ? 1.3 : 1), z + dx * 0.5);
  }
  gruppo.add(nuvola(prato, c.muted, 0.024, 0.5), segmenti(erba, linea(verde.clone().lerp(c.muted, 0.35), 0.5)));

  const nPrato = gruppo.children.length;
  // --- Bosco (Software): alberi con la chioma piena, e un albero guida più grande al centro
  const solido = (sezione: string, geo: THREE.BufferGeometry, colore: THREE.Color, op: number, fili: number) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, pieno(sezione, colore, op)), new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat(sezione, colore, fili)));
    return g;
  };
  const tronco = mat('software', c.fg, 0.7);
  const albero = (x: number, z: number, alto: number, tipo: number, colore: THREE.Color, op = 0.2) => {
    const a = new THREE.Group();
    a.add(segmenti([0, 0, 0, 0, alto * 0.55, 0], tronco));
    if (tipo === 0) {
      // Quercia: palle sfaccettate
      const centrale = solido('software', new THREE.IcosahedronGeometry(alto * 0.3, 0), colore, op, 0.9);
      centrale.position.y = alto * 0.75;
      a.add(centrale);
      for (let k = 0; k < 3; k++) {
        const palla = solido('software', new THREE.IcosahedronGeometry(alto * 0.2, 0), colore, op, 0.85);
        const b = (k / 3) * Math.PI * 2 + r();
        palla.position.set(Math.cos(b) * alto * 0.25, alto * 0.62, Math.sin(b) * alto * 0.25);
        a.add(palla);
      }
    } else if (tipo === 1) {
      // Abete: coni sovrapposti
      for (let p = 0; p < 3; p++) {
        const h = alto * 0.42, cono = solido('software', new THREE.ConeGeometry(alto * 0.26 * (1 - p * 0.25), h, 7), colore, op, 0.85);
        cono.position.y = alto * 0.3 + p * alto * 0.22 + h / 2;
        a.add(cono);
      }
    } else {
      // Acacia: chioma larga e piatta
      const piatta = solido('software', new THREE.IcosahedronGeometry(alto * 0.42, 1), colore, op, 0.85);
      piatta.scale.y = 0.3;
      piatta.position.y = alto * 0.85;
      a.add(piatta, segmenti([0, alto * 0.5, 0, -alto * 0.12, alto * 0.82, 0, 0, alto * 0.5, 0, alto * 0.14, alto * 0.82, 0.03], tronco));
    }
    a.position.set(x, 0, z);
    a.rotation.y = r() * 6;
    gruppo.add(a);
    return a;
  };
  // Sfumature del verde: mai troppo scure, così sul fondo chiaro gli alberi non sembrano neri
  const sfumature = (chiaro ? [0.04, 0.09, 0.14, 0.19] : [-0.08, -0.03, 0.03, 0.08]).map(dl => verde.clone().offsetHSL(0, 0, dl));
  const alberi: THREE.Group[] = [];
  const occupati: THREE.Vector2[] = [new THREE.Vector2(-1.7, -0.2)];
  for (let k = 0; k < 15; k++) {
    let p = new THREE.Vector2();
    for (let prova = 0; prova < 80; prova++) {
      p.set(-1.7 + (r() - 0.5) * 3.6, -0.2 + (r() - 0.5) * 4.2);
      if (sullIsola(p.x, p.y, 0.5) && !nelloStagno(p.x, p.y, -0.6) && occupati.every(q => q.distanceTo(p) > 0.65)) break;
    }
    occupati.push(p.clone());
    alberi.push(albero(p.x, p.y, 0.7 + r() * 0.55, k % 3, sfumature[k % sfumature.length]!));
  }
  const guida = albero(-1.7, -0.2, 1.9, 0, verde.clone().offsetHSL(0, 0, 0.06), 0.42);
  const insegna = new THREE.Object3D();
  insegna.position.y = 1.9 * 1.15;
  guida.add(insegna);
  punti.push({ id: 'sezione:software', label: 'Software', href: '/software/', hub: true, famiglia: 'software', ancora: insegna, base: guida, tono: 'verde' });

  const nBosco = gruppo.children.length;
  // --- Stagno (Advisory): acqua azzurra a strati, riva, canne, ninfee e pesci che nuotano in tondo
  const riva = Array.from({ length: 120 }, (_, i) => { const a = (i / 120) * Math.PI * 2, d = raggioStagno(a); return new THREE.Vector3(STAGNO.x + Math.cos(a) * d, 0.005, STAGNO.y + Math.sin(a) * d); });
  gruppo.add(curva(riva, mat('advisory', azzurro, chiaro ? 0.9 : 0.6), true));
  // Ogni strato d'acqua ha la sua quota e il suo ordine: con strati alla stessa altezza, girando la camera, il bordo sfarfallava a righe scure
  ([[1, 0.1], [0.75, 0.05], [0.45, 0.05]] as const).forEach(([scala, op], k) => {
    const forma = new THREE.Shape(riva.map(p => new THREE.Vector2(STAGNO.x + (p.x - STAGNO.x) * scala, -(STAGNO.y + (p.z - STAGNO.y) * scala))));
    const m = pieno('advisory', azzurro, op);
    m.polygonOffset = true; m.polygonOffsetFactor = -1 - k; m.polygonOffsetUnits = -1 - k;
    const strato = new THREE.Mesh(new THREE.ShapeGeometry(forma), m);
    strato.rotation.x = -Math.PI / 2;
    strato.position.y = -0.014 + k * 0.003;
    strato.renderOrder = -1 + k * 0.01;
    gruppo.add(strato);
  });
  const acqua: number[] = [];
  for (let x = STAGNO.x - 2; x <= STAGNO.x + 2; x += 0.2) for (let z = STAGNO.y - 2; z <= STAGNO.y + 2; z += 0.2) if (nelloStagno(x, z, 0.1)) acqua.push(x, -0.01, z);
  gruppo.add(nuvola(acqua, azzurro, 0.02, chiaro ? 0.5 : 0.35));
  const nAcqua = gruppo.children.length;
  const canne: number[] = [];
  for (let k = 0; k < 26; k++) {
    const a = r() * Math.PI * 2, d = raggioStagno(a) + 0.05 + r() * 0.15, x = STAGNO.x + Math.cos(a) * d, z = STAGNO.y + Math.sin(a) * d;
    for (let q = 0; q < 3; q++) { const h = 0.2 + r() * 0.25, dx = (r() - 0.5) * 0.06, dz = (r() - 0.5) * 0.06; canne.push(x + dx, 0, z + dz, x + dx * 2.5, h, z + dz * 2.5); }
  }
  gruppo.add(segmenti(canne, linea(verde, 0.55)));
  // Ninfee: foglia tonda con lo spicchio tagliato, piena appena, con tre nervature (solo foglie, niente fiori)
  const ninfee: THREE.Group[] = [];
  const posti = [[0.45, 0.3], [-0.55, 0.15], [0.1, -0.5], [-0.2, 0.55], [0.7, -0.25]];
  posti.forEach(([dx, dz], k) => {
    const foglia = new THREE.Group(), raggio = 0.12 + (k % 3) * 0.025;
    const bordo = Array.from({ length: 22 }, (_, i) => { const b = 0.35 + (i / 21) * (Math.PI * 2 - 0.7); return new THREE.Vector3(Math.cos(b) * raggio, 0, Math.sin(b) * raggio); });
    const forma = new THREE.Shape([new THREE.Vector2(0, 0), ...bordo.map(p => new THREE.Vector2(p.x, -p.z))]);
    const pienoFoglia = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshBasicMaterial({ color: verde, transparent: true, opacity: chiaro ? 0.3 : 0.22, depthWrite: false }));
    pienoFoglia.rotation.x = -Math.PI / 2;
    foglia.add(pienoFoglia, curva([new THREE.Vector3(), ...bordo], linea(verde, 0.85), true));
    foglia.add(segmenti([0, 0, 0, Math.cos(1.6) * raggio * 0.8, 0, Math.sin(1.6) * raggio * 0.8, 0, 0, 0, Math.cos(3.2) * raggio * 0.8, 0, Math.sin(3.2) * raggio * 0.8, 0, 0, 0, Math.cos(4.8) * raggio * 0.8, 0, Math.sin(4.8) * raggio * 0.8], linea(verde, 0.45)));
    foglia.position.set(STAGNO.x + dx!, 0.012, STAGNO.y + dz!);
    foglia.rotation.y = k * 1.7;
    gruppo.add(foglia);
    ninfee.push(foglia);
  });
  const pesci = Array.from({ length: 7 }, (_, k) => {
    const g = new THREE.Group();
    const corpo = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(1, 7, 5)), mat('advisory', azzurro.clone().offsetHSL(0, 0, (k % 3 - 1) * 0.07), 0.95));
    corpo.scale.set(0.04, 0.035, 0.1);
    const coda = curva([new THREE.Vector3(0, 0, -0.09), new THREE.Vector3(0, 0.04, -0.15), new THREE.Vector3(0, -0.04, -0.15)], mat('advisory', azzurro, 0.9), true);
    g.add(corpo, coda);
    gruppo.add(g);
    // Tutti nello stesso verso, su anelli diversi, con velocità simili: un giro calmo e regolare
    return { g, coda, raggio: 0.35 + (k / 6) * 0.6, vel: 0.28 + (k % 3) * 0.04, fase: (k / 7) * Math.PI * 2, prof: 0.06 + (k % 3) * 0.04 };
  });
  const sopraStagno = new THREE.Object3D();
  sopraStagno.position.set(STAGNO.x, 0.45, STAGNO.y);
  gruppo.add(sopraStagno);
  punti.push({ id: 'sezione:advisory', label: 'Advisory', href: '/advisory/', hub: true, famiglia: 'advisory', ancora: sopraStagno, tono: 'azzurro' });

  const cerchio = (n: number) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return new THREE.Vector3(Math.cos(a), 0, Math.sin(a)); });

  // Un pesce ogni tanto salta fuori dall'acqua, con un cerchio dove esce e uno dove rientra
  const spruzzi = [0, 1].map(() => { const o = curva(cerchio(32), linea(azzurro, 0), true); gruppo.add(o); return { o, nato: -9 }; });
  let salto = { pesce: 0, nato: -9 }, prossimoSalto = 4;

  // Notte: lucciole fra gli alberi del bosco
  const LUCCIOLE = chiaro ? 0 : 30;
  const baseLucciole = Array.from({ length: LUCCIOLE }, () => ({ x: -1.7 + (r() - 0.5) * 3.6, y: 0.2 + r() * 1.1, z: -0.2 + (r() - 0.5) * 3.8, fase: r() * 10, vel: 0.6 + r() * 0.8 }));
  const gLucciole = new THREE.BufferGeometry();
  gLucciole.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(LUCCIOLE * 3), 3));
  gLucciole.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(LUCCIOLE * 3), 3));
  gruppo.add(new THREE.Points(gLucciole, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.95 })));
  const coloreLucciola = new THREE.Color('#e6ffb3'), lucciola = new THREE.Color();

  // --- Stormo (Knowledge): una murmuration di storni arancioni, come quella della pagina a pixel.
  // Conta soprattutto andare nella stessa direzione dei vicini; il richiamo verso il punto che guida è debole.
  // Così lo stormo si allunga in nastri, si piega e si avvolge su se stesso. Il punto che guida salta da una tappa
  // all'altra (lo stormo vira di colpo) e un vortice, con l'asse che cambia piano, lo fa arrotolare.
  // Ogni tanto un falco invisibile attraversa lo stormo e lo apre in due; anche il puntatore spaventa gli uccelli.
  // Lo stormo resta sempre sopra la scena: sotto una certa quota gli uccelli risalgono.
  // L'etichetta sta di lato allo stormo e lo segue con un po' di ritardo, così si clicca anche quando scappano.
  // Meno uccelli sul telefono: lo stormo resta bello e il telefono non si scalda
  const UCCELLI = el.clientWidth < 700 ? 280 : 500, CENTRO_STORMO = new THREE.Vector3(0.2, 2.25, 0);
  const VICINI = 0.42, SEPARA = 0.14, VEL_MIN = 0.5, VEL_MAX = 1, QUOTA_MIN = 1.95, QUOTA_MAX = 2.55, LARGO_STORMO = 3;
  const pos = new Float32Array(UCCELLI * 3), vel = new Float32Array(UCCELLI * 3), fase = new Float32Array(UCCELLI), paura = new Float32Array(UCCELLI);
  // Posto di ogni uccello intorno alla guida, sparso in un volume largo e basso: lo stormo occupa un'area, non una fila
  const posto = new Float32Array(UCCELLI * 3);
  // Lo stormo entra volando da fuori pagina, da destra, appena la pagina si apre: le posizioni iniziali si calcolano al
  // primo fotogramma, quando si conosce l'orientamento della scena
  const caso = Math.random;
  for (let i = 0; i < UCCELLI; i++) {
    fase[i] = r() * 6;
    const b = r() * Math.PI * 2, e = Math.cbrt(r());
    posto.set([Math.cos(b) * e * 1.8, (r() - 0.5) * 0.6, Math.sin(b) * e * 1.1], i * 3);
  }
  // Ogni uccello è una V: due segmenti che partono dal corpo; tutti in un'unica geometria, aggiornata a ogni fotogramma
  const geoStormo = new THREE.BufferGeometry();
  const vertici = new Float32Array(UCCELLI * 4 * 3);
  geoStormo.setAttribute('position', new THREE.BufferAttribute(vertici, 3));
  const lineaStormo = new THREE.LineSegments(geoStormo, mat('knowledge', arancio, chiaro ? 0.95 : 0.9));
  lineaStormo.frustumCulled = false;
  gruppo.add(lineaStormo);
  const centroStormo = new THREE.Object3D();
  centroStormo.position.copy(CENTRO_STORMO).add(new THREE.Vector3(0, 0.5, 0));
  gruppo.add(centroStormo);
  // Finché lo stormo non è arrivato, l'etichetta non c'è e non si clicca
  const puntoStormo: Punto = { id: 'sezione:knowledge', label: 'Knowledge', href: '/knowledge/', hub: true, famiglia: 'knowledge', ancora: centroStormo, tono: 'arancio', spento: true };
  punti.push(puntoStormo);
  const DURATA_ARRIVO = 7, partenza = new THREE.Vector3();
  let voloInizio = -1, arrivato = false;
  // Il punto che guida: va verso una tappa a caso nel cielo sopra la scena e ogni 5-9 secondi ne sceglie un'altra
  const verso = CENTRO_STORMO.clone(), tappa = CENTRO_STORMO.clone();
  let prossimaTappa = 0;
  // Vortice: un asse che gira piano e una forza che cambia segno, così lo stormo si arrotola ora da una parte ora dall'altra
  const asse = new THREE.Vector3();
  const posizioneGuida = (t: number, dt = 0) => {
    if (t > prossimaTappa) {
      tappa.set(CENTRO_STORMO.x + (caso() - 0.5) * 3.4, QUOTA_MIN + 0.25 + caso() * (QUOTA_MAX - QUOTA_MIN - 0.5), CENTRO_STORMO.z + (caso() - 0.5) * 1.8);
      prossimaTappa = t + 5 + r() * 4;
      if (t - voloInizio < DURATA_ARRIVO * 1.7) { tappa.copy(CENTRO_STORMO); prossimaTappa = voloInizio + DURATA_ARRIVO * 1.7; }
    }
    verso.lerp(tappa, Math.min(1, dt * 0.35));
    asse.set(Math.sin(t * 0.17), 0.6 + Math.sin(t * 0.11) * 0.4, Math.cos(t * 0.13)).normalize();
  };
  // Falco: ogni 7-12 secondi attraversa lo stormo in linea retta, veloce
  const falco = { da: new THREE.Vector3(), a: new THREE.Vector3(), nato: -99, durata: 2.6 }, falcoOra = new THREE.Vector3();
  let prossimoFalco = 5;
  let raggioPuntatore: THREE.Ray | null = null;
  const inversaStormo = new THREE.Matrix4(), vicino = new THREE.Vector3(), punto = new THREE.Vector3();
  const griglia = new Map<number, number[]>();
  const chiave = (x: number, y: number, z: number) => ((Math.floor(x / VICINI) + 512) * 1024 + (Math.floor(y / VICINI) + 512)) * 1024 + (Math.floor(z / VICINI) + 512);
  const centroPrima = CENTRO_STORMO.clone(), centroLento = CENTRO_STORMO.clone(), destra = new THREE.Vector3(), rotazioneInversa = new THREE.Quaternion();
  const muoviStormo = (t: number, dt: number) => {
    // Primo fotogramma: tutti fuori pagina a destra, già in volo verso sinistra
    if (voloInizio < 0) {
      voloInizio = t;
      destra.set(1, 0, 0).applyQuaternion(rotazioneInversa.copy(gruppo.quaternion).invert());
      partenza.copy(CENTRO_STORMO).addScaledVector(destra, t === 0 ? 0 : 15);
      for (let i = 0; i < UCCELLI; i++) {
        pos.set([partenza.x + posto[i * 3]! * 1.6 + (caso() - 0.5) * 1.5, partenza.y + posto[i * 3 + 1]! + (caso() - 0.5) * 0.4, partenza.z + posto[i * 3 + 2]! * 1.6 + (caso() - 0.5) * 1.5], i * 3);
        vel.set([-destra.x * 1.5, 0, -destra.z * 1.5], i * 3);
      }
      verso.copy(partenza); centroPrima.copy(partenza); centroLento.copy(partenza);
    }
    const uArrivo = t === 0 ? 1 : THREE.MathUtils.clamp((t - voloInizio) / DURATA_ARRIVO, 0, 1), inArrivo = uArrivo < 1;
    if (inArrivo) verso.lerpVectors(partenza, CENTRO_STORMO, 1 - (1 - uArrivo) ** 2);
    else posizioneGuida(t, dt);
    // Calma: da 0 (in viaggio) a 1 (stormo normale). Sale piano, dalla seconda metà del viaggio ai secondi dopo l'arrivo:
    // velocità, richiamo, vortice e confini cambiano gradualmente, così non c'è nessuno scatto
    const calma = t === 0 ? 1 : THREE.MathUtils.smootherstep(t - voloInizio, DURATA_ARRIVO * 0.45, DURATA_ARRIVO * 1.7);
    // Arrivato: lo stormo è davvero sopra la scena. Solo allora si può cliccare
    if (!arrivato && !inArrivo && centroPrima.distanceTo(CENTRO_STORMO) < 2.5) arrivato = true;
    puntoStormo.spento = !arrivato;
    // Vortice leggero, che cambia verso piano: arrotola lo stormo senza chiuderlo in un tubo
    const vortice = Math.sin(t * 0.09) * 0.45 * calma;
    if (dt > 0) {
      // Il falco parte da un lato dello stormo e passa dall'altro, attraverso il centro
      if (calma >= 1 && t > prossimoFalco) {
        const a = r() * Math.PI * 2;
        falco.da.set(Math.cos(a), (r() - 0.5) * 0.6, Math.sin(a)).multiplyScalar(2.2).add(centroLento);
        falco.a.copy(centroLento).multiplyScalar(2).sub(falco.da);
        falco.nato = t;
        prossimoFalco = t + 10 + r() * 6;
      }
      const uf = (t - falco.nato) / falco.durata, falcoAttivo = uf >= 0 && uf <= 1;
      if (falcoAttivo) falcoOra.lerpVectors(falco.da, falco.a, uf);
      griglia.clear();
      for (let i = 0; i < UCCELLI; i++) {
        const k = chiave(pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!);
        const l = griglia.get(k);
        if (l) l.push(i); else griglia.set(k, [i]);
      }
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < UCCELLI; i++) {
        const x = pos[i * 3]!, y = pos[i * 3 + 1]!, z = pos[i * 3 + 2]!;
        // Richiamo debole verso il proprio posto intorno alla guida (il volume ruota piano): lo stormo resta largo
        const giroPosto = t * 0.05, cg = Math.cos(giroPosto), sg = Math.sin(giroPosto);
        const px = posto[i * 3]! * cg - posto[i * 3 + 2]! * sg, pz = posto[i * 3]! * sg + posto[i * 3 + 2]! * cg;
        const richiamo = THREE.MathUtils.lerp(0.7, 0.09, calma);
        let fx = (verso.x + px - x) * richiamo, fy = (verso.y + posto[i * 3 + 1]! - y) * 0.12, fz = (verso.z + pz - z) * richiamo;
        // Vortice intorno alla guida: spinge di lato rispetto all'asse, e lo stormo si avvolge su se stesso
        const rx = x - verso.x, ry = y - verso.y, rz = z - verso.z;
        fx += (asse.y * rz - asse.z * ry) * vortice; fy += (asse.z * rx - asse.x * rz) * vortice; fz += (asse.x * ry - asse.y * rx) * vortice;
        // Gruppi staccati: chi è lontano dal centro dello stormo viene richiamato piano, così i pezzi si riuniscono
        const gx0 = centroPrima.x - x, gy0 = centroPrima.y - y, gz0 = centroPrima.z - z, lontano = Math.hypot(gx0, gy0, gz0);
        if (lontano > 1.9) { const f = (lontano - 1.9) * 0.35 * calma / lontano; fx += gx0 * f; fy += gy0 * f; fz += gz0 * f; }
        // Sempre sopra la scena e non troppo lontano: sotto la quota minima risale, fuori dal cerchio rientra
        if (y < QUOTA_MIN) fy += (QUOTA_MIN - y) * 6;
        if (y > QUOTA_MAX) fy -= (y - QUOTA_MAX) * 6;
        const fuori = Math.hypot(x - CENTRO_STORMO.x, (z - CENTRO_STORMO.z) * 1.6) - LARGO_STORMO;
        if (fuori > 0) { fx -= (x - CENTRO_STORMO.x) * fuori * 1.5 * calma; fz -= (z - CENTRO_STORMO.z) * fuori * 1.5 * calma; }
        let mx = 0, my = 0, mz = 0, lx = 0, ly = 0, lz = 0, n = 0;
        const gx = Math.floor(x / VICINI), gy = Math.floor(y / VICINI), gz = Math.floor(z / VICINI);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) for (let oz = -1; oz <= 1; oz++) {
          const lista = griglia.get(((gx + ox + 512) * 1024 + (gy + oy + 512)) * 1024 + (gz + oz + 512));
          if (!lista) continue;
          for (const j of lista) {
            if (j === i) continue;
            const dx = pos[j * 3]! - x, dy = pos[j * 3 + 1]! - y, dz = pos[j * 3 + 2]! - z, d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > VICINI * VICINI) continue;
            n++;
            mx += vel[j * 3]!; my += vel[j * 3 + 1]!; mz += vel[j * 3 + 2]!;
            lx += dx; ly += dy; lz += dz;
            if (d2 < SEPARA * SEPARA) { const d = Math.sqrt(d2) || 1e-3, f = (SEPARA - d) * 45 / d; fx -= dx * f; fy -= dy * f; fz -= dz * f; }
          }
        }
        if (n) {
          // Allineamento forte, coesione locale leggera: nascono i nastri e le pieghe
          fx += (mx / n - vel[i * 3]!) * 1 + (lx / n) * 0.2;
          fy += (my / n - vel[i * 3 + 1]!) * 1 + (ly / n) * 0.2;
          fz += (mz / n - vel[i * 3 + 2]!) * 1 + (lz / n) * 0.2;
        }
        // Paura: dal falco e dal puntatore, più forte quanto più sono vicini
        const scappa = (sx: number, sy: number, sz: number, raggio: number, forza: number) => {
          const dx = x - sx, dy = y - sy, dz = z - sz, d = Math.hypot(dx, dy, dz);
          if (d < raggio && d > 1e-4) { const f = (1 - d / raggio) * forza / d; fx += dx * f; fy += dy * f; fz += dz * f; paura[i] = 1; }
        };
        if (falcoAttivo) scappa(falcoOra.x, falcoOra.y, falcoOra.z, 0.8, 8);
        if (raggioPuntatore) {
          raggioPuntatore.closestPointToPoint(punto.set(x, y, z), vicino);
          scappa(vicino.x, vicino.y, vicino.z, 0.7, 10);
        }
        paura[i] = Math.max(0, paura[i]! - dt * 0.7);
        let vx = vel[i * 3]! + fx * dt, vy = vel[i * 3 + 1]! + fy * dt, vz = vel[i * 3 + 2]! + fz * dt;
        const v = Math.hypot(vx, vy, vz) || 1, max = VEL_MAX * (1 + paura[i]! * 0.7) * THREE.MathUtils.lerp(3.2, 1, calma);
        const k = v > max ? max / v : v < VEL_MIN ? VEL_MIN / v : 1;
        vx *= k; vy *= k; vz *= k;
        vel.set([vx, vy, vz], i * 3);
        pos.set([x + vx * dt, y + vy * dt, z + vz * dt], i * 3);
        cx += x; cy += y; cz += z;
      }
      centroPrima.set(cx / UCCELLI, cy / UCCELLI, cz / UCCELLI);
      // L'etichetta segue il centro dello stormo con un po' di ritardo e sta di lato, a destra di chi guarda
      centroLento.lerp(punto.set(cx / UCCELLI, cy / UCCELLI, cz / UCCELLI), Math.min(1, dt * 1.2));
      destra.set(1, 0, 0).applyQuaternion(rotazioneInversa.copy(gruppo.quaternion).invert());
      centroStormo.position.copy(centroLento).addScaledVector(destra, 1.3).add(new THREE.Vector3(0, 0.25, 0));
    }
    // V di ogni uccello: le ali partono dal corpo, di lato rispetto alla direzione di volo, e battono
    for (let i = 0; i < UCCELLI; i++) {
      const x = pos[i * 3]!, y = pos[i * 3 + 1]!, z = pos[i * 3 + 2]!;
      const vx = vel[i * 3]!, vz = vel[i * 3 + 2]!, l = Math.hypot(vx, vz) || 1;
      const sx = -vz / l * 0.045, sz = vx / l * 0.045, alza = Math.sin(t * (9 + paura[i]! * 6) + fase[i]!) * 0.03;
      const o = i * 12;
      vertici[o] = x - sx; vertici[o + 1] = y + alza; vertici[o + 2] = z - sz;
      vertici[o + 3] = x; vertici[o + 4] = y; vertici[o + 5] = z;
      vertici[o + 6] = x; vertici[o + 7] = y; vertici[o + 8] = z;
      vertici[o + 9] = x + sx; vertici[o + 10] = y + alza; vertici[o + 11] = z + sz;
    }
    geoStormo.attributes.position!.needsUpdate = true;
  };
  const nuovoPuntatore = (raggio: THREE.Raycaster | null) => {
    if (!raggio) { raggioPuntatore = null; return; }
    gruppo.updateMatrixWorld();
    raggioPuntatore = raggio.ray.clone().applyMatrix4(inversaStormo.copy(gruppo.matrixWorld).invert());
  };

  // Prato e acqua ci sono subito; bosco, vita dello stagno e stormo nascono dopo
  // Learn: l'etichetta segue la famiglia di cervi, e appare quando i cervi sono arrivati
  const sopraCervi = new THREE.Object3D();
  gruppo.add(sopraCervi);
  const puntoCervi: Punto = { id: 'sezione:learn', label: 'Learn', href: '/learn/', hub: true, famiglia: 'learn', ancora: sopraCervi, spento: true };
  punti.push(puntoCervi);
  const nasce = crescita([...gruppo.children.slice(nPrato, nBosco), ...gruppo.children.slice(nAcqua)].filter(o => o !== lineaStormo && o !== centroStormo && o !== sopraCervi), punti.filter(q => q !== puntoStormo && q !== puntoCervi));
  let primoFotogramma = -1;
  // --- Cervi: una piccola famiglia unita che cammina sul prato, gira intorno agli alberi e allo stagno.
  // Le mete stanno fuori dal bosco: i cervi lo attraversano solo di passaggio, e restano facili da vedere e da cliccare
  const nelBosco = (x: number, z: number) => Math.hypot((x + 1.7) / 2.1, (z + 0.2) / 2.4) < 1;
  const famiglia = famigliaCervi(gruppo, {
    colori: c, chiaro, casuale: r, tipi: ['cervo', 'cerva', 'cerbiatto'], unita: true,
    meta: out => { do { out.set((r() - 0.5) * 8.4, (r() - 0.5) * 7.4); } while (!sullIsola(out.x, out.y, 0.5) || nelloStagno(out.x, out.y, -0.4) || nelBosco(out.x, out.y)); },
    ostacoli: () => [...alberi.map(a => ({ x: a.position.x, z: a.position.z, raggio: 0.4 })), { x: -1.7, z: -0.2, raggio: 0.7 }, { x: STAGNO.x, z: STAGNO.y, raggio: 1.8 }],
    // Mai nell'acqua dello stagno e mai fuori dal prato
    vietato: (x, z) => nelloStagno(x, z, -0.2) || !sullIsola(x, z, 0.25),
  });

  const accendi = (mats: THREE.Material[], livello: number) => {
    // Sotto il puntatore: la sezione si accende, le altre si spengono quasi del tutto
    const k = livello === 1 ? 1.7 : livello === 0.5 ? 1 : 0.18;
    mats.forEach(m => { m.opacity = Math.min(1, (m.userData.base ??= m.opacity) * k); });
  };
  // Zone grandi: tutto lo stagno è Advisory, ogni albero è Software, il cielo intorno allo stormo è Knowledge.
  // Così si clicca facilmente, senza dover centrare l'etichetta.
  const inversaZona = new THREE.Matrix4(), pianoZona = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), suAcqua = new THREE.Vector3();
  const piede = new THREE.Vector3(), testa = new THREE.Vector3();
  const zona = (raggio: THREE.Raycaster) => {
    gruppo.updateMatrixWorld();
    const r0 = raggio.ray.clone().applyMatrix4(inversaZona.copy(gruppo.matrixWorld).invert());
    // Cervi: hanno la precedenza su tutto, anche quando passano fra gli alberi
    if (!puntoCervi.spento && famiglia.cervi.some(v => r0.distanceSqToSegment(piede.set(v.x, 0, v.z), testa.set(v.x, 0.7, v.z)) < 0.3 * 0.3)) return 'sezione:learn';
    // Stormo: entro 1.5 dal suo centro
    if (arrivato && r0.distanceSqToPoint(centroPrima) < 1.4 * 1.4) return 'sezione:knowledge';
    // Bosco e stagno si cliccano solo quando la scena è formata
    if (primoFotogramma < 0 || performance.now() - primoFotogramma < 3750) return null;
    // Alberi: un cilindro intorno a ogni tronco, alto quanto l'albero
    const vicinoAlbero = (x: number, z: number, alto: number, largo: number) =>
      r0.distanceSqToSegment(piede.set(x, 0, z), testa.set(x, alto, z)) < largo * largo;
    if (vicinoAlbero(-1.7, -0.2, 2.3, 0.8) || alberi.some(a => vicinoAlbero(a.position.x, a.position.z, 1.4, 0.45))) return 'sezione:software';
    // Stagno: il raggio tocca l'acqua dentro la riva (con un po' di margine)
    if (r0.intersectPlane(pianoZona, suAcqua) && nelloStagno(suAcqua.x, suAcqua.z, -0.25)) return 'sezione:advisory';
    return null;
  };

  let prima = -1;
  // Su schermi larghi il diorama sta a destra: a sinistra c'è il testo della pagina
  const largo = el.clientWidth > 700;
  vista(el, gruppo, punti, {
    // Sul telefono la camera è più vicina: il riquadro è stretto e la vista si allontana già da sola
    camera: largo ? new THREE.Vector3(0, 3.6, 12.5) : new THREE.Vector3(0, 3, 9.5),
    // La camera guarda un po' più in basso: il mondo sale verso il centro dello schermo
    mira: largo ? new THREE.Vector3(0, 0.7, 0) : new THREE.Vector3(0, 2, 0),
    // L'isola entra tutta nello spazio libero, a ogni misura della finestra, anche col lato lungo davanti e alla massima
    // inclinazione; sopra deve entrare lo stormo. Sul telefono il testo sta sotto la scena: lo spazio è tutta la larghezza
    entra: {
      raggio: Math.max(...contorno.map(p => p.length())), alto: QUOTA_MAX, dietro: LARGO_STORMO / 1.6,
      sinistra: () => window.matchMedia('(max-width: 640px)').matches ? 0 : Math.max(0, ...[...document.querySelectorAll('.about > *')].map(q => q.getBoundingClientRect().right)),
    },
    // Mai di lato: la vista resta sempre un po' dall'alto, così sotto il prato non si vedono i pesci
    inclinazione: [0.16, 0.3],
    giuMax: 0,
    puntatore: nuovoPuntatore,
    zona,
    dopo: nasce,
    aggiorna: (t, acceso) => {
      const s = t / 1000, dt = prima < 0 || t === 0 ? 0 : Math.min(0.05, (t - prima) / 1000);
      prima = t;
      gruppo.updateMatrixWorld();
      muoviStormo(s, dt);
      if (primoFotogramma < 0) primoFotogramma = t;
      // I cervi arrivano quando il bosco è cresciuto
      famiglia.aggiorna(t, t === 0 || t - primoFotogramma > 2800);
      puntoCervi.spento = t !== 0 && t - primoFotogramma < 3800;
      sopraCervi.position.set(famiglia.cervi.reduce((a, v) => a + v.x, 0) / famiglia.cervi.length, 0.72, famiglia.cervi.reduce((a, v) => a + v.z, 0) / famiglia.cervi.length);
      // Salto: un pesce esce dall'acqua con un arco e rientra poco più avanti
      if (s > 0 && s > prossimoSalto) {
        salto = { pesce: Math.floor(r() * pesci.length), nato: s };
        prossimoSalto = s + 5 + r() * 4;
      }
      pesci.forEach((p, k) => {
        const a = p.fase + s * p.vel;
        p.g.position.set(STAGNO.x + Math.cos(a) * p.raggio, -p.prof, STAGNO.y + Math.sin(a) * p.raggio * 0.7);
        // Il muso (verso +z del pesce) guarda nella direzione in cui nuota
        p.g.rotation.set(0, Math.atan2(-Math.sin(a) * p.raggio, Math.cos(a) * p.raggio * 0.7), 0);
        const u = (s - salto.nato) / 0.8;
        if (k === salto.pesce && u >= 0 && u <= 1) {
          p.g.position.y = -p.prof + Math.sin(u * Math.PI) * 0.42;
          p.g.rotateX(-Math.cos(u * Math.PI) * 0.9);
          if (u < 0.08) { spruzzi[0]!.o.position.set(p.g.position.x, 0.01, p.g.position.z); spruzzi[0]!.nato = s; }
          if (u > 0.92 && s - spruzzi[1]!.nato > 1) { spruzzi[1]!.o.position.set(p.g.position.x, 0.01, p.g.position.z); spruzzi[1]!.nato = s; }
        }
        p.coda.rotation.y = Math.sin(s * 6 + p.fase) * 0.3;
      });
      spruzzi.forEach(q => { const u = (s - q.nato) / 1.2; q.o.scale.setScalar(0.05 + Math.max(0, u) * 0.45); (q.o.material as THREE.LineBasicMaterial).opacity = u >= 0 && u <= 1 ? (1 - u) * 0.8 : 0; });
      // Lucciole: vagano piano fra gli alberi e si accendono e spengono ognuna col suo ritmo
      if (LUCCIOLE) {
        const pos = gLucciole.attributes.position!, col = gLucciole.attributes.color!;
        baseLucciole.forEach((l, n) => {
          const u = s * 0.4 * l.vel + l.fase;
          pos.setXYZ(n, l.x + Math.sin(u) * 0.3, l.y + Math.sin(u * 1.7) * 0.15, l.z + Math.cos(u * 0.8) * 0.3);
          lucciola.copy(coloreLucciola).multiplyScalar(0.08 + Math.max(0, Math.sin(s * 1.5 * l.vel + l.fase * 3)) * 0.92);
          col.setXYZ(n, lucciola.r, lucciola.g, lucciola.b);
        });
        pos.needsUpdate = true;
        col.needsUpdate = true;
      }
      alberi.forEach((a, k) => { a.rotation.z = Math.sin(s * 1.1 + k) * 0.02; });
      ninfee.forEach((n, k) => { n.rotation.y = k * 1.7 + Math.sin(s * 0.2 + k) * 0.15; });
      for (const sezione of ['software', 'advisory', 'knowledge']) accendi(materiali[sezione]!, acceso(sezione, `sezione:${sezione}`));
    },
  });
}
