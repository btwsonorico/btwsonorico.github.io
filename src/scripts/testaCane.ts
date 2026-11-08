// La testa del cane, in pixel art: un cucciolo visto di fronte (orecchie giù, muso chiaro, naso e occhi scuri, lingua).
// Si usa sui prati del gregge: nella pagina /learn/reinforcement/ (greggeVista.ts) e nell'arte del biglietto (arteGregge.ts).
// La bitmap è 11×10 più un bordo di un pixel del colore del fondo; si ingrandisce senza sfumare, a multipli interi di pixel del dispositivo.
// O pelo, o orecchie (pelo più scuro), c muso, k occhi e naso, r lingua
const DISEGNO = [
  '.oo.....oo.',
  'oooOOOOOooo',
  'ooOOOOOOOoo',
  'ooOkOOOkOoo',
  'ooOOOOOOOoo',
  '.oOOcccOOo.',
  '..OcckccO..',
  '..OcccccO..',
  '...OcrcO...',
  '....OOO....',
];
const LARGO = 13, ALTO = 12;
const sprite = new Map<string, HTMLCanvasElement>();

function bitmap(colore: string, fondo: string) {
  const chiave = colore + '|' + fondo;
  let s = sprite.get(chiave);
  if (s) return s;
  s = document.createElement('canvas');
  s.width = LARGO; s.height = ALTO;
  const g = s.getContext('2d')!;
  const pieno = (x: number, y: number) => (DISEGNO[y]?.[x] ?? '.') !== '.';
  // Il bordo: ogni cella vuota accanto a una piena; così la testa si stacca dalle pecore chiare
  g.fillStyle = fondo;
  for (let y = -1; y <= DISEGNO.length; y++) for (let x = -1; x <= 11; x++) {
    if (!pieno(x, y) && (pieno(x - 1, y) || pieno(x + 1, y) || pieno(x, y - 1) || pieno(x, y + 1))) g.fillRect(x + 1, y + 1, 1, 1);
  }
  const tinte: Record<string, string> = { O: colore, o: colore, c: '#ffe6cc', k: '#16191e', r: '#ff6f7d' };
  DISEGNO.forEach((riga, y) => [...riga].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = tinte[ch]!; g.fillRect(x + 1, y + 1, 1, 1); } }));
  // Le orecchie: lo stesso arancio con un velo scuro
  g.globalAlpha = 0.3; g.fillStyle = '#000';
  DISEGNO.forEach((riga, y) => [...riga].forEach((ch, x) => { if (ch === 'o') g.fillRect(x + 1, y + 1, 1, 1); }));
  sprite.set(chiave, s);
  return s;
}

// Disegna la testa con il mento in (X, Y), in pixel CSS. cella: lato di un pixel della bitmap, in pixel CSS; d: pixel del dispositivo per pixel CSS.
// La trasformazione del contesto resta quella di prima.
export function disegnaTestaCane(g: CanvasRenderingContext2D, X: number, Y: number, cella: number, d: number, colore: string, fondo: string) {
  const s = bitmap(colore, fondo), lato = Math.max(1, Math.round(cella * d));
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.imageSmoothingEnabled = false;
  g.drawImage(s, Math.round(X * d - (LARGO / 2) * lato), Math.round(Y * d - (ALTO - 1) * lato), LARGO * lato, ALTO * lato);
  g.restore();
}
