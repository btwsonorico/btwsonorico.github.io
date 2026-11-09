// Trasforma una foto d'archivio in una griglia di caratteri per la timeline (src/lib/arteFoto.json) e in una JPG ridotta,
// mostrata al passaggio del mouse (public/learn/timeline/). Va usato solo con foto di pubblico dominio.
// Uso: node scripts/ascii-foto.mjs <foto.jpg> <nome>
// La griglia è 56x30 e ogni carattere è largo 0,6 della sua altezza: il ritaglio ha quindi proporzione 33,6:30.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const [sorgente, nome] = process.argv.slice(2);
if (!sorgente || !nome) { console.error('Uso: node scripts/ascii-foto.mjs <foto.jpg> <nome>'); process.exit(1); }
const COLONNE = 56, RIGHE = 30, RAMPA = ' .:-=+*#%@', PROPORZIONE = (COLONNE * 0.6) / RIGHE;

const meta = await sharp(sorgente).metadata();
const altezza = Math.min(meta.height, Math.round(meta.width / PROPORZIONE));
const larghezza = Math.round(altezza * PROPORZIONE);
const ritaglio = { left: Math.round((meta.width - larghezza) * 0.35), top: Math.round((meta.height - altezza) * 0.3), width: larghezza, height: altezza };

const { data } = await sharp(sorgente).extract(ritaglio).grayscale().normalise().resize(COLONNE, RIGHE, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
const righe = [];
for (let r = 0; r < RIGHE; r++) {
  let riga = '';
  for (let c = 0; c < COLONNE; c++) riga += RAMPA[Math.min(9, Math.floor(((data[r * COLONNE + c] / 255) ** 0.9) * 10))];
  righe.push(riga);
}

// Scrive con file temporaneo + rinomina: il dev server può essere aperto
const fileJson = 'src/lib/arteFoto.json';
let tutte = {};
try { tutte = JSON.parse(readFileSync(fileJson, 'utf8')); } catch {}
tutte[nome] = righe.join('\n');
writeFileSync(`${fileJson}.tmp`, `${JSON.stringify(tutte, null, 2)}\n`);
renameSync(`${fileJson}.tmp`, fileJson);

mkdirSync('public/learn/timeline', { recursive: true });
const fileJpg = `public/learn/timeline/${nome}.jpg`;
await sharp(sorgente).extract(ritaglio).resize(640).jpeg({ quality: 78, mozjpeg: true }).toFile(`${fileJpg}.tmp`);
renameSync(`${fileJpg}.tmp`, fileJpg);
console.log(righe.join('\n'));
console.log(`\n${fileJson} e ${fileJpg}: ritaglio ${larghezza}x${altezza}`);
