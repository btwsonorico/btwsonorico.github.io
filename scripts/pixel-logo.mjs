// Trasforma un logo SVG in una griglia di pixel accesi e spenti per la timeline (src/lib/arteLoghi.json).
// Uso: node scripts/pixel-logo.mjs <logo.svg> <nome> <larghezza in pixel>
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const [sorgente, nome, larg] = process.argv.slice(2);
if (!sorgente || !nome || !larg) { console.error('Uso: node scripts/pixel-logo.mjs <logo.svg> <nome> <larghezza>'); process.exit(1); }
const larghezza = +larg;

// Si disegna grande e poi si riduce: la soglia decide quali pixel restano accesi. Conta l'inchiostro, non il colore del logo
const grande = await sharp(sorgente, { density: 600 }).resize({ width: larghezza * 8 }).flatten({ background: '#ffffff' }).grayscale().png().toBuffer();
const { data, info } = await sharp(grande).resize({ width: larghezza, kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
const righe = [];
for (let y = 0; y < info.height; y++) {
  let r = '';
  for (let x = 0; x < info.width; x++) r += data[y * info.width * info.channels + x * info.channels] < 128 ? '#' : '.';
  righe.push(r);
}

const file = 'src/lib/arteLoghi.json';
let tutti = {};
try { tutti = JSON.parse(readFileSync(file, 'utf8')); } catch {}
tutti[nome] = righe;
writeFileSync(`${file}.tmp`, `${JSON.stringify(tutti, null, 2)}\n`);
renameSync(`${file}.tmp`, file);
console.log(righe.join('\n'));
console.log(`${nome}: ${info.width}x${info.height}`);
