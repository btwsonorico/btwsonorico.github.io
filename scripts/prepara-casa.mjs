// Prepara le frasi della casa di /learn/decision/ per scripts/allena-decisore.py: per ogni frase le parole, l'intento fra 26,
// la lingua (inglese o italiano) e per ogni parola un'etichetta (stanza, colore, numero o niente).
// Dati: frasi vere di MASSIVE 1.1 (Amazon, CC BY 4.0, https://github.com/alexa/massive) per luci, pulizia, caffè, musica e volume, e come esempi
// di "fuori tema"; frasi composte da modelli per tapparelle, termostato, TV e scene, che MASSIVE non ha. La prova usa il test ufficiale di MASSIVE
// e frasi scritte a mano, mai viste in allenamento.
// Si lancia con: DATI=<file di uscita> node scripts/prepara-casa.mjs <cartella con en-US.jsonl e it-IT.jsonl di MASSIVE 1.1> [en|tutte]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [cartella, quali = 'tutte'] = process.argv.slice(2);
if (!cartella || !process.env.DATI) { console.error('uso: DATI=<file> node scripts/prepara-casa.mjs <cartella MASSIVE> [en|tutte]'); process.exit(1); }
const LINGUE = quali === 'en' ? ['en'] : ['en', 'it'];

let seme = 11;
const caso = () => { seme = (seme * 1103515245 + 12345) % 2147483648; return seme / 2147483648; };
const scegli = a => a[Math.floor(caso() * a.length)];
const mescola = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(caso() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Le stesse regole del browser (src/lib/casa.ts): minuscole, lettere accentate tenute, apostrofi e segni diventano spazi
const parole = t => t.toLowerCase().normalize('NFC').replace(/[^a-z0-9àèéìíòóùú]+/g, ' ').split(' ').filter(Boolean);

const INTENTI = ['luce_accendi', 'luce_spegni', 'luce_su', 'luce_giu', 'luce_colore', 'tapparelle_apri', 'tapparelle_chiudi', 'caldo_su', 'caldo_giu', 'temperatura',
  'musica_play', 'musica_stop', 'volume_su', 'volume_giu', 'muto', 'pulisci', 'caffe', 'tv_accendi', 'tv_spegni', 'scena_notte', 'scena_esco', 'scena_film', 'scena_arrivo', 'annulla', 'anche', 'fuori'];
const ETICHETTE = ['O', 'STANZA', 'COLORE', 'NUMERO'];

// --- Frasi a modello. {s} è una stanza, {c} un colore, {n} un numero: diventano parole con la loro etichetta
const STANZE = {
  en: ['kitchen', 'living room', 'lounge', 'sitting room', 'bedroom', 'bathroom', 'study', 'office', 'hall', 'hallway', 'entrance', 'garage', 'garden', 'attic', 'cellar', 'kids room', 'laundry', 'terrace', 'dining room', 'guest room'],
  it: ['cucina', 'soggiorno', 'salotto', 'sala', 'camera', 'camera da letto', 'bagno', 'studio', 'ufficio', 'ingresso', 'corridoio', 'garage', 'giardino', 'soffitta', 'cantina', 'cameretta', 'lavanderia', 'terrazzo', 'sala da pranzo', 'camera degli ospiti'],
};
const COLORI = { en: ['red', 'blue', 'green', 'warm', 'cold', 'white', 'yellow', 'purple', 'pink', 'orange', 'soft white', 'cool white'], it: ['rossa', 'rosso', 'blu', 'verde', 'calda', 'fredda', 'bianca', 'gialla', 'viola', 'rosa', 'arancione', 'azzurra'] };
const NUMERI = ['16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '19.5', '20.5', '21.5'];
const M = {
  en: {
    luce_accendi: ['turn on the light', 'turn on the lights in the {s}', 'switch the {s} light on', 'lights on in the {s}', 'can you put the light on', 'light up the {s}', 'i need some light in the {s}', 'it is dark in the {s}', 'turn the {s} lamp on', 'please switch on the lights', 'put the {s} lights on'],
    luce_spegni: ['turn off the light', 'turn off the lights in the {s}', 'switch the {s} light off', 'lights off in the {s}', 'kill the lights', 'turn the {s} lamp off', 'please switch off all the lights', 'no more light in the {s}', 'shut off the lights in the {s}', 'lights out'],
    luce_su: ['brighter please', 'make the {s} brighter', 'turn the lights up in the {s}', 'more light in the {s}', 'increase the brightness', 'raise the lights a bit', 'the {s} is too dim', 'brighten the {s} lights', 'lights up to {n} percent'],
    luce_giu: ['dim the lights', 'dim the {s} lights', 'make it darker in the {s}', 'lower the brightness', 'turn the lights down a bit', 'less light in the {s}', 'the {s} is too bright', 'soften the lights in the {s}', 'lights down to {n} percent'],
    luce_colore: ['make the light {c}', 'set the {s} lights to {c}', 'change the light colour to {c}', 'i want {c} light in the {s}', '{c} lights please', 'turn the {s} {c}', 'switch the lamp to {c}', 'can the lights be {c}'],
    tapparelle_apri: ['open the blinds', 'open the blinds in the {s}', 'raise the shutters', 'pull up the {s} blinds', 'let some sunlight in', 'open the shutters in the {s}', 'blinds up', 'let the light in the {s}'],
    tapparelle_chiudi: ['close the blinds', 'close the blinds in the {s}', 'lower the shutters', 'pull down the {s} blinds', 'there is too much sun', 'close the shutters in the {s}', 'blinds down', 'block the sunlight in the {s}'],
    caldo_su: ['i am cold', 'it is freezing in here', 'turn up the heating', 'make it warmer', 'raise the temperature', 'warm the house up', 'it is chilly', 'turn the heat up a bit', 'more heating please'],
    caldo_giu: ['i am hot', 'it is too warm in here', 'turn down the heating', 'make it cooler', 'lower the temperature', 'it is boiling in here', 'cool the house down', 'less heating please'],
    temperatura: ['set the temperature to {n}', 'heating to {n} degrees', 'make it {n} degrees', 'set the thermostat to {n}', 'i want {n} degrees in the house', 'put the heating on {n}', 'keep the house at {n} degrees'],
    musica_play: ['play some music', 'play music in the {s}', 'put on some jazz', 'i want to listen to music', 'start the music', 'play my playlist', 'some background music please', 'play something relaxing'],
    musica_stop: ['stop the music', 'pause the music', 'turn off the music', 'enough music', 'stop playing', 'silence the speakers', 'no more music please'],
    volume_su: ['louder', 'turn it up', 'volume up', 'increase the volume', 'i cannot hear the music', 'make it louder', 'raise the volume a bit'],
    volume_giu: ['quieter', 'turn it down', 'volume down', 'lower the volume', 'the music is too loud', 'make it quieter', 'not so loud please'],
    muto: ['mute', 'mute the speakers', 'silence please', 'mute everything', 'mute the sound'],
    pulisci: ['start the vacuum', 'vacuum the {s}', 'clean the {s}', 'send the robot to clean the {s}', 'the floor is dirty', 'run the hoover', 'clean the floors', 'hoover the {s}'],
    caffe: ['make me a coffee', 'i need coffee', 'start the coffee machine', 'brew a coffee', 'an espresso please', 'coffee time', 'make a cappuccino'],
    tv_accendi: ['turn on the tv', 'switch the television on', 'put the tv on', 'i want to watch tv', 'tv on', 'turn on the tv in the {s}'],
    tv_spegni: ['turn off the tv', 'switch the television off', 'tv off', 'enough tv', 'shut down the tv', 'turn off the tv in the {s}'],
    scena_notte: ['good night', 'i am going to bed', 'time to sleep', 'night mode', 'put the house to sleep', 'bedtime', 'we are going to sleep'],
    scena_esco: ['i am leaving', 'i am going out', 'bye house', 'leaving the house now', 'away mode', 'nobody is home', 'we are off to work'],
    scena_film: ['movie mode', 'movie time', 'we are watching a film', 'set up the room for a film', 'cinema mode', 'let us watch a movie'],
    scena_arrivo: ['i am home', 'i am back', 'welcome me home', 'we just got home', 'home mode', 'hello house', 'good morning'],
    annulla: ['undo', 'cancel that', 'go back', 'undo the last thing', 'never mind, put it back', 'revert that', 'no, undo it'],
    anche: ['also in the {s}', 'the {s} too', 'same in the {s}', 'and the {s}', 'do the {s} as well', 'also the {s}', 'in the {s} too'],
  },
  it: {
    luce_accendi: ['accendi la luce', 'accendi le luci in {s}', 'accendi la luce della {s}', 'luci accese in {s}', 'puoi accendere la luce', 'illumina il {s}', 'mi serve luce in {s}', 'è buio in {s}', 'accendi la lampada in {s}', 'per favore accendi le luci', 'fai luce in {s}'],
    luce_spegni: ['spegni la luce', 'spegni le luci in {s}', 'spegni la luce del {s}', 'luci spente in {s}', 'spegni tutte le luci', 'spegni la lampada in {s}', 'niente più luce in {s}', 'buio in {s}', 'via le luci'],
    luce_su: ['più luce per favore', 'alza le luci in {s}', 'aumenta la luminosità', 'rendi la {s} più luminosa', 'il {s} è troppo buio', 'alza un po\' la luce', 'più luminoso in {s}', 'luci al {n} per cento'],
    luce_giu: ['abbassa le luci', 'abbassa la luce in {s}', 'meno luce in {s}', 'diminuisci la luminosità', 'la {s} è troppo luminosa', 'luce soffusa in {s}', 'abbassa un po\' le luci', 'luci al {n} per cento'],
    luce_colore: ['luce {c}', 'metti la luce {c}', 'luci {c} in {s}', 'cambia il colore della luce in {c}', 'voglio la luce {c} in {s}', 'fai la {s} {c}', 'imposta le luci sul {c}', 'colora la luce di {c}'],
    tapparelle_apri: ['apri le tapparelle', 'alza le tapparelle in {s}', 'apri le persiane', 'tira su le tapparelle della {s}', 'fai entrare il sole', 'apri le tapparelle in {s}', 'su le tapparelle', 'fai entrare luce in {s}'],
    tapparelle_chiudi: ['chiudi le tapparelle', 'abbassa le tapparelle in {s}', 'chiudi le persiane', 'tira giù le tapparelle della {s}', 'c\'è troppo sole', 'chiudi le tapparelle in {s}', 'giù le tapparelle', 'blocca il sole in {s}'],
    caldo_su: ['ho freddo', 'si gela qui', 'alza il riscaldamento', 'fa freddo', 'aumenta la temperatura', 'scalda la casa', 'fai più caldo', 'alza un po\' il caldo', 'più riscaldamento'],
    caldo_giu: ['ho caldo', 'fa troppo caldo qui', 'abbassa il riscaldamento', 'rinfresca la casa', 'diminuisci la temperatura', 'si soffoca qui', 'fai più fresco', 'meno riscaldamento'],
    temperatura: ['imposta la temperatura a {n}', 'riscaldamento a {n} gradi', 'metti {n} gradi', 'termostato a {n}', 'voglio {n} gradi in casa', 'porta la casa a {n} gradi', 'tieni la casa a {n} gradi'],
    musica_play: ['metti un po\' di musica', 'metti musica in {s}', 'fai partire del jazz', 'voglio ascoltare musica', 'avvia la musica', 'metti la mia playlist', 'un po\' di musica di sottofondo', 'suona qualcosa di rilassante'],
    musica_stop: ['ferma la musica', 'metti in pausa la musica', 'spegni la musica', 'basta musica', 'smetti di suonare', 'stop alla musica', 'niente più musica'],
    volume_su: ['più forte', 'alza il volume', 'volume su', 'aumenta il volume', 'non sento la musica', 'alza un po\'', 'alza la musica'],
    volume_giu: ['più piano', 'abbassa il volume', 'volume giù', 'diminuisci il volume', 'la musica è troppo alta', 'abbassa un po\'', 'non così forte'],
    muto: ['muto', 'silenzia le casse', 'silenzio per favore', 'togli l\'audio', 'disattiva l\'audio'],
    pulisci: ['avvia l\'aspirapolvere', 'pulisci la {s}', 'passa l\'aspirapolvere in {s}', 'manda il robot a pulire il {s}', 'il pavimento è sporco', 'fai partire il robot', 'pulisci i pavimenti', 'aspira in {s}'],
    caffe: ['fammi un caffè', 'ho bisogno di un caffè', 'accendi la macchina del caffè', 'prepara un caffè', 'un espresso per favore', 'è ora del caffè', 'fammi un cappuccino'],
    tv_accendi: ['accendi la tv', 'accendi la televisione', 'metti la tv', 'voglio guardare la tv', 'tv accesa', 'accendi la tv in {s}'],
    tv_spegni: ['spegni la tv', 'spegni la televisione', 'tv spenta', 'basta tv', 'chiudi la tv', 'spegni la tv in {s}'],
    scena_notte: ['buonanotte', 'vado a letto', 'è ora di dormire', 'modalità notte', 'metti a dormire la casa', 'andiamo a dormire', 'notte casa'],
    scena_esco: ['esco', 'sto uscendo', 'ciao casa', 'esco di casa adesso', 'modalità fuori casa', 'non c\'è nessuno in casa', 'andiamo al lavoro'],
    scena_film: ['modalità film', 'è ora del film', 'guardiamo un film', 'prepara la stanza per un film', 'modalità cinema', 'facciamo serata film'],
    scena_arrivo: ['sono a casa', 'sono tornato', 'sono tornata', 'bentornato a me', 'siamo appena arrivati', 'modalità casa', 'ciao casa sono io', 'buongiorno'],
    annulla: ['annulla', 'annulla l\'ultima cosa', 'torna indietro', 'rimetti com\'era', 'no, annulla', 'lascia stare, rimetti tutto', 'disfa'],
    anche: ['anche in {s}', 'anche la {s}', 'lo stesso in {s}', 'e il {s}', 'fai anche il {s}', 'pure in {s}', 'anche nel {s}'],
  },
};

// Frasi scritte a mano, con parole e giri di frase che i modelli non contengono. Metà calibra, metà è la prova
const A_MANO = {
  en: [['could you brighten up the place', 'luce_su'], ['the reading lamp in the study, on please', 'luce_accendi'], ['nobody needs the hallway light now', 'luce_spegni'], ['give the bedroom a warm glow', 'luce_colore'], ['bring the kitchen lights down', 'luce_giu'],
    ['i can barely see in the bathroom', 'luce_accendi'], ['let the morning in', 'tapparelle_apri'], ['the sun is in my eyes', 'tapparelle_chiudi'], ['my hands are frozen', 'caldo_su'], ['i am sweating', 'caldo_giu'], ['twenty two degrees would be nice, set it to 22', 'temperatura'],
    ['some music for cooking', 'musica_play'], ['that song is awful, stop it', 'musica_stop'], ['crank it up', 'volume_su'], ['the neighbours are complaining, turn it down', 'volume_giu'], ['quiet', 'muto'], ['crumbs everywhere in the kitchen', 'pulisci'],
    ['i could really use an espresso', 'caffe'], ['the match starts now, tv please', 'tv_accendi'], ['nobody is watching the tv', 'tv_spegni'], ['lights out, i am off to sleep', 'scena_notte'], ['heading to the office, see you tonight', 'scena_esco'],
    ['popcorn is ready', 'scena_film'], ['honey i am home', 'scena_arrivo'], ['oops, put it back', 'annulla'], ['and in the bedroom', 'anche'], ['what is the weather tomorrow', 'fuori'], ['book a table for two', 'fuori'], ['who won the match last night', 'fuori'],
    ['set an alarm for seven', 'fuori'], ['tell me a joke', 'fuori'], ['open the front door for everyone', 'fuori'], ['order a pizza', 'fuori'], ['switch everything off in the living room', 'luce_spegni'], ['paint the lounge blue', 'luce_colore'], ['shutters down in the bedroom', 'tapparelle_chiudi']],
  it: [['potresti illuminare un po\' la stanza', 'luce_su'], ['la lampada dello studio, accesa per favore', 'luce_accendi'], ['in corridoio la luce non serve più', 'luce_spegni'], ['dai alla camera una luce calda', 'luce_colore'], ['abbassa un filo le luci in cucina', 'luce_giu'],
    ['in bagno non vedo niente', 'luce_accendi'], ['fai entrare la mattina', 'tapparelle_apri'], ['ho il sole negli occhi', 'tapparelle_chiudi'], ['ho le mani congelate', 'caldo_su'], ['sto sudando', 'caldo_giu'], ['ventidue gradi sarebbero perfetti, mettila a 22', 'temperatura'],
    ['un po\' di musica per cucinare', 'musica_play'], ['questa canzone è orribile, fermala', 'musica_stop'], ['alza a palla', 'volume_su'], ['i vicini si lamentano, abbassa', 'volume_giu'], ['zitto', 'muto'], ['ci sono briciole ovunque in cucina', 'pulisci'],
    ['mi ci vorrebbe proprio un espresso', 'caffe'], ['inizia la partita, la tv per favore', 'tv_accendi'], ['nessuno guarda la tv', 'tv_spegni'], ['luci spente, io vado a dormire', 'scena_notte'], ['vado in ufficio, ci vediamo stasera', 'scena_esco'],
    ['i popcorn sono pronti', 'scena_film'], ['amore sono a casa', 'scena_arrivo'], ['ops, rimettilo com\'era', 'annulla'], ['e in camera', 'anche'], ['che tempo fa domani', 'fuori'], ['prenota un tavolo per due', 'fuori'], ['chi ha vinto la partita ieri sera', 'fuori'],
    ['metti una sveglia alle sette', 'fuori'], ['raccontami una barzelletta', 'fuori'], ['apri la porta di casa a chiunque', 'fuori'], ['ordina una pizza', 'fuori'], ['spegni tutto in soggiorno', 'luce_spegni'], ['colora il salotto di blu', 'luce_colore'], ['giù le tapparelle in camera', 'tapparelle_chiudi']],
};

// Una frase a modello diventa parole ed etichette
function componi(modello, lingua) {
  const ws = [], tag = [];
  for (const pezzo of modello.split(/(\{[scn]\})/)) {
    const tipo = { '{s}': 'STANZA', '{c}': 'COLORE', '{n}': 'NUMERO' }[pezzo];
    const testo = tipo === 'STANZA' ? scegli(STANZE[lingua]) : tipo === 'COLORE' ? scegli(COLORI[lingua]) : tipo === 'NUMERO' ? scegli(NUMERI) : pezzo;
    for (const w of parole(testo)) { ws.push(w); tag.push(tipo ?? 'O'); }
  }
  return { ws, tag };
}

// MASSIVE: "spegni la luce del [house_place : bagno]" -> parole ed etichette
const MAPPA = { iot_hue_lighton: 'luce_accendi', iot_hue_lightoff: 'luce_spegni', iot_hue_lightup: 'luce_su', iot_hue_lightdim: 'luce_giu', iot_hue_lightchange: 'luce_colore', iot_cleaning: 'pulisci', iot_coffee: 'caffe', audio_volume_up: 'volume_su', audio_volume_down: 'volume_giu', audio_volume_mute: 'muto', play_music: 'musica_play' };
const TIENI_FUORI = new Set(['iot_wemo_on', 'iot_wemo_off', 'audio_volume_other', 'music_settings', 'music_query', 'music_likeness', 'music_dislikeness', 'iot_hue_lightother']);
const SONNO = /sleep|bed|night|dormi|letto|nott/;
function daMassive(r) {
  const ws = [], tag = [];
  for (const m of r.annot_utt.matchAll(/\[(\w+) : ([^\]]+)\]|([^[\]]+)/g)) {
    const tipo = m[1] === 'house_place' ? 'STANZA' : m[1] === 'color_type' ? 'COLORE' : 'O', testo = m[2] ?? m[3];
    for (const w of parole(testo)) { ws.push(w); tag.push(tipo); }
  }
  return { ws, tag };
}
function massive(lingua) {
  const righe = readFileSync(join(cartella, `${lingua === 'en' ? 'en-US' : 'it-IT'}.jsonl`), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const fuori = { train: 0, test: 0, dev: 0 }, out = { train: [], test: [], dev: [] };
  for (const r of mescola(righe)) {
    if (TIENI_FUORI.has(r.intent)) continue;
    let y = MAPPA[r.intent];
    if (y === 'luce_spegni' && SONNO.test(r.utt.toLowerCase())) continue;
    if (!y) { if (r.scenario === 'iot' || fuori[r.partition] >= { train: 900, test: 400, dev: 150 }[r.partition]) continue; fuori[r.partition]++; y = 'fuori'; }
    out[r.partition].push({ ...daMassive(r), y, lingua });
  }
  return out;
}

// --- Dati
const allena = [], calibra = [], prova = { massive: [], mano: [] };
for (const l of LINGUE) {
  const ms = massive(l);
  allena.push(...ms.train); calibra.push(...ms.dev); prova.massive.push(...ms.test);
  for (const y of INTENTI) for (let i = 0; i < (y === 'fuori' ? 0 : 260); i++) allena.push({ ...componi(scegli(M[l][y]), l), y, lingua: l });
  A_MANO[l].forEach(([t, y], i) => (i % 2 ? prova.mano : calibra).push({ ws: parole(t), y, lingua: l }));
}
mescola(allena);
// Scrive le frasi preparate
{
  const via = e => ({ ws: e.ws, tag: e.tag ?? null, y: e.y, lingua: e.lingua });
  writeFileSync(process.env.DATI, JSON.stringify({ intenti: INTENTI, etichette: ETICHETTE, allena: allena.map(via), calibra: calibra.map(via), prova_massive: prova.massive.map(via), prova_mano: prova.mano.map(via) }));
  console.log('frasi scritte in', process.env.DATI, allena.length, calibra.length, prova.massive.length, prova.mano.length);
}
