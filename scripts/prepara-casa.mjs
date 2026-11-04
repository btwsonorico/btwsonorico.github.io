// Prepara le frasi della casa di /learn/decision/ per scripts/allena-decisore.py (SET=casa): per ogni frase le parole, l'intento,
// la lingua (inglese o italiano), quanto spingere (un po', normale, molto, fino in fondo) e per ogni parola un'etichetta (stanza, colore, numero o niente).
// Dati, in ordine di peso:
//   MASSIVE 1.1 (Amazon, CC BY 4.0, https://github.com/alexa/massive): comandi veri ad Alexa, in en-US e it-IT, con stanze e colori marcati
//   Home Assistant intents (CC BY 4.0, https://github.com/home-assistant/intents): modelli di frase della domotica, campionati da scripts/campiona-ha.py
//   CLINC150 (CC BY 3.0, https://github.com/clinc/oos-eval): le frasi da casa, rimappate a mano sui nostri intenti, solo inglese, peso basso
//   frasi a modello scritte qui, per quello che le tre fonti non coprono (scene, annulla, caffè, intensità)
// La prova usa il test ufficiale di MASSIVE, il test di CLINC150 rimappato e frasi scritte a mano, mai viste in allenamento.
// Si lancia con: DATI=<uscita> HA=<frasi di campiona-ha.py> CLINC=<clinc_full.json> node scripts/prepara-casa.mjs <cartella con en-US.jsonl e it-IT.jsonl di MASSIVE 1.1>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [cartella] = process.argv.slice(2);
if (!cartella || !process.env.DATI || !process.env.HA || !process.env.CLINC) { console.error('uso: DATI=<file> HA=<file> CLINC=<file> node scripts/prepara-casa.mjs <cartella MASSIVE>'); process.exit(1); }

let seme = 11;
const caso = () => { seme = (seme * 1103515245 + 12345) % 2147483648; return seme / 2147483648; };
const scegli = a => a[Math.floor(caso() * a.length)];
const mescola = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(caso() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Le stesse regole del browser (src/lib/decisore.ts): minuscole, lettere accentate tenute, apostrofi e segni diventano spazi
const parole = t => t.toLowerCase().normalize('NFC').replace(/[^a-z0-9àèéìíòóùú]+/g, ' ').split(' ').filter(Boolean);

export const INTENTI = ['luce_accendi', 'luce_spegni', 'luce_su', 'luce_giu', 'luce_livello', 'luce_colore', 'tapparelle_apri', 'tapparelle_chiudi', 'tapparelle_livello',
  'caldo_su', 'caldo_giu', 'temperatura', 'ventilatore_on', 'ventilatore_off', 'musica_play', 'musica_stop', 'musica_avanti', 'volume_su', 'volume_giu', 'volume_livello', 'muto',
  'tv_accendi', 'tv_spegni', 'pulisci', 'pulisci_stop', 'tosaerba', 'tosaerba_stop', 'caffe', 'timer', 'timer_stop', 'scena_notte', 'scena_esco', 'scena_film', 'scena_arrivo', 'annulla', 'anche', 'fuori'];
const ETICHETTE = ['O', 'STANZA', 'COLORE', 'NUMERO'];
export const QUANTO = ['poco', 'normale', 'molto', 'tutto'];
// Gli intenti dove conta quanto: la luce, il caldo, il volume e le tapparelle
const DOSABILI = new Set(['luce_su', 'luce_giu', 'caldo_su', 'caldo_giu', 'volume_su', 'volume_giu', 'tapparelle_apri', 'tapparelle_chiudi']);
const MODO = {
  en: { poco: ['a bit', 'a little', 'slightly', 'just a touch', 'a tiny bit', 'a little bit', 'just a bit'], molto: ['a lot', 'much more', 'way more', 'loads', 'really a lot', 'quite a bit'],
        tutto: ['all the way', 'fully', 'completely'], tuttoSu: ['to the max', 'as much as possible', 'to the maximum', 'all the way up'], tuttoGiu: ['to the minimum', 'all the way down', 'as low as possible'] },
  it: { poco: ['un po', 'un pochino', 'un filo', 'leggermente', 'appena', 'un pelo', 'un attimo'], molto: ['molto', 'tanto', 'parecchio', 'un sacco', 'di brutto', 'molto di più'],
        tutto: ['del tutto', 'completamente', 'fino in fondo'], tuttoSu: ['al massimo', 'a palla', 'tutto su', 'più che puoi'], tuttoGiu: ['al minimo', 'tutto giù', 'il più possibile giù'] },
};
// Quanto chiede una frase già scritta: si guarda la frase intera, dal più forte al più debole
const tutti = (q, l) => q === 'tutto' ? [...MODO[l].tutto, ...MODO[l].tuttoSu, ...MODO[l].tuttoGiu] : MODO[l][q];
const RE_QUANTO = Object.fromEntries(['tutto', 'molto', 'poco'].map(q => [q, new RegExp(`(^| )(${[...tutti(q, 'en'), ...tutti(q, 'it')].map(m => parole(m).join(' ')).join('|')})( |$)`)]));
// "fino in fondo" va nella direzione dell'intento: al massimo per alzare, al minimo per abbassare
const GIU = /_giu$|chiudi$/;
const quanto = (ws, y) => { if (!DOSABILI.has(y)) return null; const f = ws.join(' '); return RE_QUANTO.tutto.test(f) ? 'tutto' : RE_QUANTO.molto.test(f) ? 'molto' : RE_QUANTO.poco.test(f) ? 'poco' : 'normale'; };

// --- Frasi a modello. {s} è una stanza, {c} un colore, {n} un numero, {m} un "quanto": diventano parole con la loro etichetta
const STANZE = {
  en: ['kitchen', 'living room', 'lounge', 'sitting room', 'bedroom', 'bathroom', 'garden', 'backyard', 'study', 'office', 'hall', 'garage', 'attic', 'cellar', 'kids room', 'laundry', 'dining room'],
  it: ['cucina', 'soggiorno', 'salotto', 'sala', 'camera', 'camera da letto', 'bagno', 'giardino', 'studio', 'ufficio', 'ingresso', 'corridoio', 'garage', 'soffitta', 'cantina', 'cameretta', 'lavanderia'],
};
const COLORI = { en: ['red', 'blue', 'green', 'warm', 'cold', 'white', 'yellow', 'purple', 'pink', 'orange', 'soft white', 'cool white'], it: ['rossa', 'rosso', 'blu', 'verde', 'calda', 'fredda', 'bianca', 'gialla', 'viola', 'rosa', 'arancione', 'azzurra'] };
// I numeri anche in lettere: le persone dicono "cinque minuti" più spesso di "5 minuti"
const NUMERI = { gradi: ['16', '17', '18', '19', '20', '21', '22', '23', '24', '19.5', '20.5', '21.5', '68', '70', '72'], perc: ['10', '20', '25', '30', '40', '50', '60', '70', '75', '80', '90', '100'], minuti: ['1', '2', '3', '5', '8', '10', '12', '15', '20', '25', '30', '45'],
  en: ['two', 'three', 'five', 'ten', 'fifteen', 'twenty', 'thirty', 'forty'], it: ['due', 'tre', 'cinque', 'dieci', 'quindici', 'venti', 'trenta', 'quaranta'] };
const M = {
  en: {
    luce_accendi: ['turn on the light', 'turn on the lights in the {s}', 'switch the {s} light on', 'lights on in the {s}', 'can you put the light on', 'light up the {s}', 'i need some light in the {s}', 'it is dark in the {s}', 'turn the {s} lamp on', 'switch on the garden lanterns', 'put the {s} lights on'],
    luce_spegni: ['turn off the light', 'turn off the lights in the {s}', 'switch the {s} light off', 'lights off in the {s}', 'kill the lights', 'turn the {s} lamp off', 'please switch off all the lights', 'no more light in the {s}', 'shut off the lights in the {s}', 'lights out'],
    luce_su: ['brighter please', 'make the {s} {m} brighter', 'turn the lights up {m} in the {s}', 'more light in the {s}', 'increase the brightness {m}', 'raise the lights {m}', 'the {s} is too dim', 'brighten the {s} lights {m}', 'i can barely see, more light'],
    luce_giu: ['dim the lights', 'dim the {s} lights {m}', 'make it {m} darker in the {s}', 'lower the brightness {m}', 'turn the lights down {m}', 'less light in the {s}', 'the {s} is too bright', 'soften the lights in the {s}', 'the light hurts my eyes'],
    luce_livello: ['lights to {n} percent', 'set the {s} light to {n} percent', 'brightness at {n}', 'put the lamp at {n} percent in the {s}', 'i want the lights at {n} percent', 'lights at half', 'set the brightness to {n}'],
    luce_colore: ['make the light {c}', 'set the {s} lights to {c}', 'change the light colour to {c}', 'i want {c} light in the {s}', '{c} lights please', 'turn the {s} {c}', 'switch the lamp to {c}', 'can the lights be {c}'],
    tapparelle_apri: ['open the blinds {m}', 'open the blinds in the {s}', 'raise the shutters {m}', 'pull up the {s} blinds', 'let some sunlight in', 'open the shutters in the {s} {m}', 'blinds up', 'let the light in the {s}'],
    tapparelle_chiudi: ['close the blinds {m}', 'close the blinds in the {s}', 'lower the shutters {m}', 'pull down the {s} blinds', 'there is too much sun', 'close the shutters in the {s} {m}', 'blinds down', 'block the sunlight in the {s}'],
    tapparelle_livello: ['blinds at {n} percent', 'open the {s} blinds to {n} percent', 'set the shutters to {n}', 'blinds halfway', 'put the blinds at half in the {s}', 'shutters {n} percent open'],
    caldo_su: ['i am cold', 'it is freezing in here', 'turn up the heating {m}', 'make it {m} warmer', 'raise the temperature {m}', 'warm the house up', 'it is chilly', 'turn the heat up {m}', 'more heating please', 'light the stove', 'brr', 'my feet are cold in the {s}'],
    caldo_giu: ['i am hot', 'it is too warm in here', 'turn down the heating {m}', 'make it {m} cooler', 'lower the temperature {m}', 'it is boiling in here', 'cool the house down', 'less heating please'],
    temperatura: ['set the temperature to {n}', 'heating to {n} degrees', 'make it {n} degrees', 'set the thermostat to {n}', 'i want {n} degrees in the house', 'put the heating on {n}', 'keep the house at {n} degrees'],
    ventilatore_on: ['turn on the fan', 'start the fan in the {s}', 'i need some air', 'fan on please', 'switch the ceiling fan on', 'get the fan going in the {s}', 'set the fan to {n} percent', 'it is muggy in the {s}, some air please', 'some fresh air in here'],
    ventilatore_off: ['turn off the fan', 'stop the fan in the {s}', 'fan off', 'switch the ceiling fan off', 'enough with the fan', 'kill the fan'],
    musica_play: ['play some music', 'play music in the {s}', 'put on some jazz', 'i want to listen to music', 'start the music', 'play my playlist', 'some background music please', 'play something relaxing', 'resume the music'],
    musica_stop: ['stop the music', 'pause the music', 'turn off the music', 'enough music', 'stop playing', 'silence the speakers', 'no more music please', 'pause'],
    musica_avanti: ['next song', 'skip this song', 'play the next track', 'skip', 'i do not like this song, next', 'another song please', 'change song'],
    volume_su: ['louder', 'turn it up {m}', 'volume up', 'increase the volume {m}', 'i cannot hear the music', 'make it {m} louder', 'raise the volume {m}'],
    volume_giu: ['quieter', 'turn it down {m}', 'volume down', 'lower the volume {m}', 'the music is too loud', 'make it {m} quieter', 'not so loud please'],
    volume_livello: ['volume to {n}', 'set the volume to {n} percent', 'volume at {n}', 'put the speaker at {n} percent', 'volume {n}'],
    muto: ['mute', 'mute the speakers', 'silence please', 'mute everything', 'mute the sound'],
    tv_accendi: ['turn on the tv', 'switch the television on', 'put the tv on', 'i want to watch tv', 'tv on', 'turn on the tv in the {s}'],
    tv_spegni: ['turn off the tv', 'switch the television off', 'tv off', 'enough tv', 'shut down the tv', 'turn off the tv in the {s}'],
    pulisci: ['start the vacuum', 'vacuum the {s}', 'clean the {s}', 'send the robot to clean the {s}', 'the floor is dirty', 'run the hoover', 'clean the floors', 'hoover the {s}'],
    pulisci_stop: ['stop the vacuum', 'send the robot back to its base', 'robot go home', 'stop cleaning', 'the vacuum is too noisy, stop it', 'dock the vacuum'],
    tosaerba: ['mow the lawn', 'start the lawn mower', 'the grass is too long', 'cut the grass', 'send the mower out', 'mow the garden', 'the grass is getting really tall', 'the garden needs a trim', 'time to mow', 'the lawn is a mess, sort it out'],
    tosaerba_stop: ['stop the mower', 'send the mower back', 'stop mowing', 'mower go home', 'park the lawn mower'],
    caffe: ['make me a coffee', 'i need coffee', 'start the coffee machine', 'brew a coffee', 'an espresso please', 'coffee time', 'make a cappuccino'],
    timer: ['set a timer for {n} minutes', 'timer {n} minutes', 'start a {n} minute timer', 'remind me in {n} minutes', 'count down {n} minutes', 'pasta timer {n} minutes'],
    timer_stop: ['cancel the timer', 'stop the timer', 'delete the timer', 'no more timer', 'cancel all timers'],
    scena_notte: ['good night', 'i am going to bed', 'time to sleep', 'night mode', 'put the house to sleep', 'bedtime', 'we are going to sleep'],
    scena_esco: ['i am leaving', 'i am going out', 'bye house', 'leaving the house now', 'away mode', 'nobody is home', 'we are off to work'],
    scena_film: ['movie mode', 'movie time', 'we are watching a film', 'set up the room for a film', 'cinema mode', 'let us watch a movie'],
    scena_arrivo: ['i am home', 'i am back', 'welcome me home', 'we just got home', 'home mode', 'hello house', 'good morning'],
    annulla: ['undo', 'cancel that', 'go back', 'undo the last thing', 'never mind, put it back', 'revert that', 'no, undo it'],
    anche: ['also in the {s}', 'the {s} too', 'same in the {s}', 'and the {s}', 'do the {s} as well', 'also the {s}', 'in the {s} too'],
  },
  it: {
    luce_accendi: ['accendi la luce', 'accendi le luci in {s}', 'accendi la luce della {s}', 'luci accese in {s}', 'puoi accendere la luce', 'illumina il {s}', 'mi serve luce in {s}', 'è buio in {s}', 'accendi la lampada in {s}', 'accendi le lanterne in giardino', 'fai luce in {s}'],
    luce_spegni: ['spegni la luce', 'spegni le luci in {s}', 'spegni la luce del {s}', 'luci spente in {s}', 'spegni tutte le luci', 'spegni la lampada in {s}', 'niente più luce in {s}', 'buio in {s}', 'via le luci'],
    luce_su: ['più luce per favore', 'alza le luci {m} in {s}', 'aumenta {m} la luminosità', 'rendi la {s} {m} più luminosa', 'il {s} è troppo buio', 'alza {m} la luce', 'più luminoso in {s}', 'non vedo niente, più luce'],
    luce_giu: ['abbassa le luci', 'abbassa {m} la luce in {s}', 'meno luce in {s}', 'diminuisci {m} la luminosità', 'la {s} è troppo luminosa', 'luce soffusa in {s}', 'abbassa {m} le luci', 'la luce mi dà fastidio'],
    luce_livello: ['luci al {n} per cento', 'metti la luce della {s} al {n} per cento', 'luminosità a {n}', 'lampada al {n} per cento in {s}', 'voglio le luci al {n} per cento', 'luci a metà', 'imposta la luminosità a {n}'],
    luce_colore: ['luce {c}', 'metti la luce {c}', 'luci {c} in {s}', 'cambia il colore della luce in {c}', 'voglio la luce {c} in {s}', 'fai la {s} {c}', 'imposta le luci sul {c}', 'colora la luce di {c}'],
    tapparelle_apri: ['apri {m} le tapparelle', 'alza le tapparelle in {s}', 'apri le persiane {m}', 'tira su le tapparelle della {s}', 'fai entrare il sole', 'apri {m} le tapparelle in {s}', 'su le tapparelle', 'fai entrare luce in {s}'],
    tapparelle_chiudi: ['chiudi {m} le tapparelle', 'abbassa le tapparelle in {s}', 'chiudi le persiane {m}', 'tira giù le tapparelle della {s}', 'c\'è troppo sole', 'chiudi {m} le tapparelle in {s}', 'giù le tapparelle', 'blocca il sole in {s}'],
    tapparelle_livello: ['tapparelle al {n} per cento', 'apri le tapparelle della {s} al {n} per cento', 'metti le persiane a {n}', 'tapparelle a metà', 'porta le tapparelle a metà in {s}', 'tapparelle aperte al {n} per cento'],
    caldo_su: ['ho freddo', 'si gela qui', 'alza {m} il riscaldamento', 'fa freddo', 'aumenta {m} la temperatura', 'scalda la casa', 'fai {m} più caldo', 'alza {m} il caldo', 'più riscaldamento', 'accendi la stufa', 'brr che gelo', 'che freddo in {s}'],
    caldo_giu: ['ho caldo', 'fa troppo caldo qui', 'abbassa {m} il riscaldamento', 'rinfresca la casa', 'diminuisci {m} la temperatura', 'si soffoca qui', 'fai {m} più fresco', 'meno riscaldamento'],
    temperatura: ['imposta la temperatura a {n}', 'riscaldamento a {n} gradi', 'metti {n} gradi', 'termostato a {n}', 'voglio {n} gradi in casa', 'porta la casa a {n} gradi', 'tieni la casa a {n} gradi'],
    ventilatore_on: ['accendi il ventilatore', 'accendi la ventola in {s}', 'mi serve un po\' d\'aria', 'ventilatore acceso per favore', 'fai partire il ventilatore a soffitto', 'aria in {s}', 'ventilatore al {n} per cento'],
    ventilatore_off: ['spegni il ventilatore', 'ferma la ventola in {s}', 'ventilatore spento', 'basta ventilatore', 'spegni il ventilatore a soffitto', 'via il ventilatore'],
    musica_play: ['metti un po\' di musica', 'metti musica in {s}', 'fai partire del jazz', 'voglio ascoltare musica', 'avvia la musica', 'metti la mia playlist', 'un po\' di musica di sottofondo', 'suona qualcosa di rilassante', 'riprendi la musica'],
    musica_stop: ['ferma la musica', 'metti in pausa la musica', 'spegni la musica', 'basta musica', 'smetti di suonare', 'stop alla musica', 'niente più musica', 'pausa'],
    musica_avanti: ['prossima canzone', 'salta questa canzone', 'metti il brano dopo', 'avanti', 'questa canzone non mi piace, la prossima', 'cambia canzone', 'un\'altra canzone'],
    volume_su: ['più forte', 'alza {m} il volume', 'volume su', 'aumenta {m} il volume', 'non sento la musica', 'alza {m}', 'alza {m} la musica'],
    volume_giu: ['più piano', 'abbassa {m} il volume', 'volume giù', 'diminuisci {m} il volume', 'la musica è troppo alta', 'abbassa {m}', 'non così forte'],
    volume_livello: ['volume a {n}', 'metti il volume al {n} per cento', 'volume al {n}', 'cassa al {n} per cento', 'volume {n}'],
    muto: ['muto', 'silenzia le casse', 'silenzio per favore', 'togli l\'audio', 'disattiva l\'audio'],
    tv_accendi: ['accendi la tv', 'accendi la televisione', 'metti la tv', 'voglio guardare la tv', 'tv accesa', 'accendi la tv in {s}'],
    tv_spegni: ['spegni la tv', 'spegni la televisione', 'tv spenta', 'basta tv', 'chiudi la tv', 'spegni la tv in {s}'],
    pulisci: ['avvia l\'aspirapolvere', 'pulisci la {s}', 'passa l\'aspirapolvere in {s}', 'manda il robot a pulire il {s}', 'il pavimento è sporco', 'fai partire il robot', 'pulisci i pavimenti', 'aspira in {s}'],
    pulisci_stop: ['ferma l\'aspirapolvere', 'manda il robot alla base', 'robot torna a casa', 'smetti di pulire', 'l\'aspirapolvere fa troppo rumore, fermalo', 'rimetti il robot in carica'],
    tosaerba: ['taglia l\'erba', 'avvia il tosaerba', 'l\'erba è troppo alta', 'falcia il prato', 'manda fuori il tosaerba', 'taglia il prato in giardino', 'il prato è altissimo', 'bisogna tagliare l\'erba', 'il giardino ha bisogno di una sistemata', 'l\'erba è cresciuta troppo'],
    tosaerba_stop: ['ferma il tosaerba', 'manda il tosaerba alla base', 'smetti di tagliare l\'erba', 'tosaerba torna a casa', 'parcheggia il tosaerba'],
    caffe: ['fammi un caffè', 'ho bisogno di un caffè', 'accendi la macchina del caffè', 'prepara un caffè', 'un espresso per favore', 'è ora del caffè', 'fammi un cappuccino'],
    timer: ['metti un timer di {n} minuti', 'timer {n} minuti', 'avvia un timer da {n} minuti', 'avvisami tra {n} minuti', 'conto alla rovescia di {n} minuti', 'timer per la pasta {n} minuti'],
    timer_stop: ['cancella il timer', 'ferma il timer', 'elimina il timer', 'basta timer', 'cancella tutti i timer'],
    scena_notte: ['buonanotte', 'vado a letto', 'è ora di dormire', 'modalità notte', 'metti a dormire la casa', 'andiamo a dormire', 'notte casa'],
    scena_esco: ['esco', 'sto uscendo', 'ciao casa', 'esco di casa adesso', 'modalità fuori casa', 'non c\'è nessuno in casa', 'andiamo al lavoro'],
    scena_film: ['modalità film', 'è ora del film', 'guardiamo un film', 'prepara la stanza per un film', 'modalità cinema', 'facciamo serata film'],
    scena_arrivo: ['sono a casa', 'sono tornato', 'sono tornata', 'bentornato a me', 'siamo appena arrivati', 'modalità casa', 'ciao casa sono io', 'buongiorno'],
    annulla: ['annulla', 'annulla l\'ultima cosa', 'torna indietro', 'rimetti com\'era', 'no, annulla', 'lascia stare, rimetti tutto', 'disfa'],
    anche: ['anche in {s}', 'anche la {s}', 'lo stesso in {s}', 'e il {s}', 'fai anche il {s}', 'pure in {s}', 'anche nel {s}'],
  },
};
// Parole intorno al comando, come le dice una persona: le frasi vere sono raramente pulite
const PRIMA = { en: ['hey', 'ok', 'um', 'so', 'hey house', 'please', 'could you', 'ugh', 'right', 'oh', 'can you'], it: ['ehi', 'allora', 'uff', 'dai', 'senti', 'casa', 'per favore', 'mi fai un favore', 'ok', 'ehm', 'puoi'] };
const DOPO = { en: ['please', 'thanks', 'now', 'right now', 'for me', 'thank you'], it: ['grazie', 'per favore', 'adesso', 'subito', 'dai', 'grazie mille'] };
const sporca = (ws, tag, l) => {
  if (caso() < 0.25) { const p = parole(scegli(PRIMA[l])); ws = [...p, ...ws]; tag = [...p.map(() => 'O'), ...tag]; }
  if (caso() < 0.2) { const p = parole(scegli(DOPO[l])); ws = [...ws, ...p]; tag = [...tag, ...p.map(() => 'O')]; }
  return { ws, tag };
};

// Frasi scritte a mano, con parole e giri di frase che i modelli non contengono. Metà calibra, metà è la prova
const A_MANO = {
  en: [['could you brighten up the place', 'luce_su'], ['the reading lamp in the bedroom, on please', 'luce_accendi'], ['nobody needs the bathroom light now', 'luce_spegni'], ['give the bedroom a warm glow', 'luce_colore'], ['bring the kitchen lights down', 'luce_giu'],
    ['i can barely see in the bathroom', 'luce_accendi'], ['let the morning in', 'tapparelle_apri'], ['the sun is in my eyes', 'tapparelle_chiudi'], ['my hands are frozen', 'caldo_su'], ['i am sweating', 'caldo_giu'], ['twenty two degrees would be nice, set it to 22', 'temperatura'],
    ['some music for cooking', 'musica_play'], ['that song is awful, stop it', 'musica_stop'], ['crank it up', 'volume_su'], ['the neighbours are complaining, turn it down', 'volume_giu'], ['quiet', 'muto'], ['crumbs everywhere in the kitchen', 'pulisci'],
    ['i could really use an espresso', 'caffe'], ['the match starts now, tv please', 'tv_accendi'], ['nobody is watching the tv', 'tv_spegni'], ['lights out, i am off to sleep', 'scena_notte'], ['heading to the office, see you tonight', 'scena_esco'],
    ['popcorn is ready', 'scena_film'], ['honey i am home', 'scena_arrivo'], ['oops, put it back', 'annulla'], ['and in the bedroom', 'anche'], ['what is the weather tomorrow', 'fuori'], ['book a table for two', 'fuori'], ['who won the match last night', 'fuori'],
    ['set an alarm for seven', 'fuori'], ['tell me a joke', 'fuori'], ['open the front door for everyone', 'fuori'], ['order a pizza', 'fuori'], ['switch everything off in the living room', 'luce_spegni'], ['paint the lounge blue', 'luce_colore'], ['shutters down in the bedroom', 'tapparelle_chiudi'],
    ['ugh it is so stuffy in the bedroom, get some air moving', 'ventilatore_on'], ['the fan is making me cold', 'ventilatore_off'], ['skip this one', 'musica_avanti'], ['the lawn looks like a jungle', 'tosaerba'], ['eggs need ten minutes, start a timer', 'timer'], ['forget the timer', 'timer_stop'],
    ['blinds half open in the living room', 'tapparelle_livello'], ['lamp at thirty percent', 'luce_livello'], ['music at forty', 'volume_livello'], ['robot, back to your base', 'pulisci_stop'], ['the mower is too loud, park it', 'tosaerba_stop'], ['just a tiny bit warmer please', 'caldo_su']],
  it: [['potresti illuminare un po\' la stanza', 'luce_su'], ['la lampada della camera, accesa per favore', 'luce_accendi'], ['in bagno la luce non serve più', 'luce_spegni'], ['dai alla camera una luce calda', 'luce_colore'], ['abbassa un filo le luci in cucina', 'luce_giu'],
    ['in bagno non vedo niente', 'luce_accendi'], ['fai entrare la mattina', 'tapparelle_apri'], ['ho il sole negli occhi', 'tapparelle_chiudi'], ['ho le mani congelate', 'caldo_su'], ['sto sudando', 'caldo_giu'], ['ventidue gradi sarebbero perfetti, mettila a 22', 'temperatura'],
    ['un po\' di musica per cucinare', 'musica_play'], ['questa canzone è orribile, fermala', 'musica_stop'], ['alza a palla', 'volume_su'], ['i vicini si lamentano, abbassa', 'volume_giu'], ['zitto', 'muto'], ['ci sono briciole ovunque in cucina', 'pulisci'],
    ['mi ci vorrebbe proprio un espresso', 'caffe'], ['inizia la partita, la tv per favore', 'tv_accendi'], ['nessuno guarda la tv', 'tv_spegni'], ['luci spente, io vado a dormire', 'scena_notte'], ['vado in ufficio, ci vediamo stasera', 'scena_esco'],
    ['i popcorn sono pronti', 'scena_film'], ['amore sono a casa', 'scena_arrivo'], ['ops, rimettilo com\'era', 'annulla'], ['e in camera', 'anche'], ['che tempo fa domani', 'fuori'], ['prenota un tavolo per due', 'fuori'], ['chi ha vinto la partita ieri sera', 'fuori'],
    ['metti una sveglia alle sette', 'fuori'], ['raccontami una barzelletta', 'fuori'], ['apri la porta di casa a chiunque', 'fuori'], ['ordina una pizza', 'fuori'], ['spegni tutto in soggiorno', 'luce_spegni'], ['colora il salotto di blu', 'luce_colore'], ['giù le tapparelle in camera', 'tapparelle_chiudi'],
    ['uff si muore in camera, fammi un po\' d\'aria', 'ventilatore_on'], ['il ventilatore mi fa venire freddo', 'ventilatore_off'], ['salta questa', 'musica_avanti'], ['il prato sembra una giungla', 'tosaerba'], ['le uova vogliono dieci minuti, metti un timer', 'timer'], ['lascia perdere il timer', 'timer_stop'],
    ['tapparelle a metà in soggiorno', 'tapparelle_livello'], ['lampada al trenta per cento', 'luce_livello'], ['musica a quaranta', 'volume_livello'], ['robot, torna alla base', 'pulisci_stop'], ['il tosaerba fa troppo rumore, parcheggialo', 'tosaerba_stop'], ['appena un pelo più caldo per favore', 'caldo_su']],
};

// Una frase a modello diventa parole ed etichette
function componi(modello, lingua, y) {
  const ws = [], tag = [];
  const numeri = y === 'temperatura' ? NUMERI.gradi : y === 'timer' ? [...NUMERI.minuti, ...NUMERI[lingua]] : caso() < 0.2 ? NUMERI[lingua] : NUMERI.perc;
  // Il "quanto" si sceglie in modo da avere tutti e quattro i casi, anche "normale" (nessuna parola)
  const q = scegli(['', '', 'poco', 'molto', 'tutto']);
  for (const pezzo of modello.split(/(\{[scnm]\})/)) {
    const tipo = { '{s}': 'STANZA', '{c}': 'COLORE', '{n}': 'NUMERO', '{m}': 'O' }[pezzo];
    const testo = pezzo === '{s}' ? scegli(STANZE[lingua]) : pezzo === '{c}' ? scegli(COLORI[lingua]) : pezzo === '{n}' ? scegli(numeri) : pezzo === '{m}' ? (q === 'tutto' ? scegli([...MODO[lingua].tutto, ...MODO[lingua][GIU.test(y) ? 'tuttoGiu' : 'tuttoSu']]) : q ? scegli(MODO[lingua][q]) : '') : pezzo;
    for (const w of parole(testo)) { ws.push(w); tag.push(tipo ?? 'O'); }
  }
  return sporca(ws, tag, lingua);
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
    out[r.partition].push({ ...daMassive(r), y, lingua, fonte: 'massive' });
  }
  return out;
}

// CLINC150, solo inglese: le frasi da casa rimappate a mano, il resto come "non per la casa". Senza etichette per parola
const CASA_CLINC = { play_music: 'musica_play', next_song: 'musica_avanti', timer: 'timer' };
const CLINC_FUORI = new Set(['alarm', 'reminder', 'reminder_update', 'shopping_list', 'shopping_list_update', 'todo_list', 'todo_list_update', 'weather', 'time', 'date', 'calendar', 'calendar_update', 'what_song', 'update_playlist', 'order', 'recipe', 'cook_time', 'oos']);
function daClinc(t, k) {
  if (CASA_CLINC[k]) return CASA_CLINC[k];
  if (k === 'change_volume') return /\b(to|at) \d/.test(t) ? 'volume_livello' : /\b(up|raise|increase|louder|higher)\b/.test(t) ? 'volume_su' : /\b(down|lower|decrease|quieter|softer|reduce)\b/.test(t) ? 'volume_giu' : null;
  if (k === 'smart_home') {
    if (/\b(oven|car|vehicle|door|doors|lock|locked|locks|knock|knocking|dishwasher|microwave|who)\b/.test(t)) return 'fuori';
    if (/\blights?\b|\blamps?\b/.test(t)) return /\b(dim|dimmer|down|low|darker|less bright)\b/.test(t) ? 'luce_giu' : /\boff\b/.test(t) ? 'luce_spegni' : 'luce_accendi';
    if (/\btv\b/.test(t)) return 'tv_accendi';
    if (/\bfans?\b/.test(t)) return 'ventilatore_on';
    if (/\bfurnace\b/.test(t)) return 'caldo_su';
    if (/\b(temp|temperature|temperaure)\b/.test(t) && /\d/.test(t) && !/\bac\b|what/.test(t)) return 'temperatura';
    if (/\bac\b/.test(t)) return 'fuori';
    return null;
  }
  return CLINC_FUORI.has(k) ? 'fuori' : null;
}
function clinc() {
  const c = JSON.parse(readFileSync(process.env.CLINC, 'utf8')), out = { train: [], val: [], test: [] }, fuori = { train: 0, val: 0, test: 0 };
  for (const parte of ['train', 'val', 'test']) for (const [t, k] of mescola([...c[parte], ...c[`oos_${parte}`].slice(0, 60)])) {
    const y = daClinc(t, k);
    if (!y) continue;
    if (y === 'fuori' && fuori[parte]++ >= { train: 300, val: 60, test: 150 }[parte]) continue;
    out[parte].push({ ws: parole(t), tag: null, y, lingua: 'en', fonte: 'clinc' });
  }
  return out;
}

// --- Dati
const allena = [], calibra = [], prova = { massive: [], mano: [], clinc: [] };
// Home Assistant: al massimo 220 frasi per intento e lingua, così i timer (che hanno molti modelli) non pesano troppo
const ha = mescola(JSON.parse(readFileSync(process.env.HA, 'utf8'))), contaHa = {};
for (const e of ha) {
  const k = `${e.lingua}:${e.y}`; if ((contaHa[k] = (contaHa[k] ?? 0) + 1) > 220) continue;
  const { ws, tag } = sporca(e.ws, e.tag, e.lingua);
  (contaHa[k] % 12 === 0 ? calibra : allena).push({ ws, tag, y: e.y, lingua: e.lingua, fonte: 'ha' });
}
for (const l of ['en', 'it']) {
  const ms = massive(l);
  // MASSIVE è la base: le sue frasi vere entrano due volte in allenamento
  allena.push(...ms.train, ...ms.train); calibra.push(...ms.dev); prova.massive.push(...ms.test);
  for (const y of INTENTI) for (let i = 0; i < (y === 'fuori' ? 0 : 150); i++) allena.push({ ...componi(scegli(M[l][y]), l, y), y, lingua: l, fonte: 'modello' });
  A_MANO[l].forEach(([t, y], i) => (i % 2 ? prova.mano : calibra).push({ ws: parole(t), tag: null, y, lingua: l, fonte: 'mano' }));
}
const cl = clinc();
allena.push(...cl.train); calibra.push(...cl.val); prova.clinc.push(...cl.test);
mescola(allena);
// Scrive le frasi preparate. Il "quanto" vale solo per gli intenti dove si può dosare
{
  const via = e => ({ ws: e.ws, tag: e.tag ?? null, y: e.y, lingua: e.lingua, fonte: e.fonte, quanto: quanto(e.ws, e.y) });
  writeFileSync(process.env.DATI, JSON.stringify({ intenti: INTENTI, etichette: ETICHETTE, quanto: QUANTO, allena: allena.map(via), calibra: calibra.map(via), prova_massive: prova.massive.map(via), prova_mano: prova.mano.map(via), prova_clinc: prova.clinc.map(via) }));
  const per = {}; for (const e of allena) per[e.fonte] = (per[e.fonte] ?? 0) + 1;
  const q = {}; for (const e of allena.map(via)) if (e.quanto) q[e.quanto] = (q[e.quanto] ?? 0) + 1;
  console.log('frasi scritte in', process.env.DATI, { allena: allena.length, calibra: calibra.length, massive: prova.massive.length, mano: prova.mano.length, clinc: prova.clinc.length }, per, q);
}
