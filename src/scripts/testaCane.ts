// La testa del cane, in pixel art a 8 bit: un cucciolo visto di fronte, arancione, con le orecchie nere che pendono giù
// ai lati del muso, occhi e naso neri. Un contorno chiaro di un pixel lo stacca dal prato scuro e dalle pecore.
// Si usa nella pagina /learn/reinforcement/ (greggeVista.ts) e nell'arte del biglietto (arteGregge.ts).
// O pelo arancione, K orecchie nere, k occhi e naso
const DISEGNO = [
  '...OOOOO...',
  '..OOOOOOO..',
  'KKOOOOOOOKK',
  'KKOkOOOkOKK',
  'KKOOOOOOOKK',
  '.KOOOkOOOK.',
  '.K.OOOOO.K.',
  '....OOO....',
];
const LARGO = 13, ALTO = 10;
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
  g.fillStyle = '#f4ead6'; void fondo;
  for (let y = -1; y <= DISEGNO.length; y++) for (let x = -1; x <= 11; x++) {
    if (!pieno(x, y) && (pieno(x - 1, y) || pieno(x + 1, y) || pieno(x, y - 1) || pieno(x, y + 1))) g.fillRect(x + 1, y + 1, 1, 1);
  }
  DISEGNO.forEach((riga, y) => [...riga].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = ch === 'O' ? colore : '#16110d'; g.fillRect(x + 1, y + 1, 1, 1); } }));
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
