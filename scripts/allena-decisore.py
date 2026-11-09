# Allena il decision model di /learn/decision/ (codice nel browser: src/lib/decisore.ts). La pagina usa SET=tutto: un solo modello
# per la casa e per le due demo business, quindi un solo file da scaricare.
#   SET=tutto la casa e le demo insieme -> public/learn/decisore-tutto.bin e .json
#   SET=casa  solo la casa: intento fra 37, lingua (inglese o italiano), quanto spingere, e un'etichetta per parola (stanza, colore, numero)
#             -> public/learn/decisore-casa.bin e .json
#   SET=banca solo le due demo business, in inglese: Banking77 e CLINC150 -> public/learn/decisore-banca.bin e .json
# Hanno la forma dei decision model open (per esempio GLiNER-Decide): un encoder bidirezionale piccolo e una testa.
# Le risposte possibili arrivano con la richiesta, come testo: il modello codifica la frase e ogni etichetta con lo stesso
# encoder e sceglie l'etichetta più vicina. Così lo stesso modello risponde a più domande sulla stessa frase.
# Una seconda testa dà a ogni parola un'etichetta (stanza, colore, numero o niente), come un estrattore di entità.
#
# Dati (non nel repo):
#   Banking77, CC BY 4.0: https://github.com/PolyAI-LDN/task-specific-datasets -> banking_train.csv, banking_test.csv
#   CLINC150, CC BY 3.0: https://github.com/clinc/oos-eval -> clinc_full.json
#   Casa: frasi preparate da scripts/prepara-casa.mjs (MASSIVE 1.1, Home Assistant intents, CLINC150 rimappato, frasi a modello)
# Si lancia con:  SET=tutto python scripts/allena-decisore.py <file casa> <cartella Banking77 e CLINC150>
#                 (con SET=tutto un terzo argomento, <cartella extra>, aggiunge i dati che rendono il modello più generale:
#                  massive/en-US.jsonl e it-IT.jsonl di MASSIVE 1.1 completo, CC BY 4.0;
#                  nlupp/data di NLU++ (PolyAI), CC BY 4.0: https://github.com/PolyAI-LDN/task-specific-datasets;
#                  sgd/train e sgd/test di Schema-Guided Dialogue (Google), CC BY-SA 4.0: https://github.com/google-research-datasets/dstc8-schema-guided-dialogue;
#                  snli-train.parquet di SNLI 1.0 (Stanford), CC BY-SA 4.0)
#                 SET=casa python scripts/allena-decisore.py <file casa>
#                 SET=banca python scripts/allena-decisore.py <cartella Banking77 e CLINC150>
# PROVA=1 allena e misura senza scrivere i file.
import csv, glob, json, math, os, random, re, struct, sys, time, unicodedata
import torch, torch.nn as nn, torch.nn.functional as F

torch.manual_seed(3); random.seed(3)
torch.set_num_threads(int(os.environ.get('FILI', '2')))
SET = os.environ.get('SET')
if SET not in ('casa', 'banca', 'tutto'): sys.exit('uso: SET=tutto, SET=casa oppure SET=banca')
CARTELLA = sys.argv[2] if SET == 'tutto' else sys.argv[1]
B, D, TESTE, STRATI, FFN, LMAX = 8192, 64, 4, 2, 128, 32
# Il modello unico legge molti più dati: più pezzi di parola e vettori più lunghi, circa 1,6 milioni di pesi
if SET == 'tutto': B, D, FFN = 16384, 96, 192

# --- Lettura: le stesse regole di src/lib/decisore.ts
def parole(t):
    t = unicodedata.normalize('NFC', t.lower())
    return [w for w in re.sub(r'[^a-z0-9àèéìíòóùú]+', ' ', t).split(' ') if w][:LMAX]
def fnv(s):
    h = 2166136261
    for c in s:
        h ^= ord(c); h = (h * 16777619) & 0xffffffff
    return h
@__import__('functools').lru_cache(maxsize=None)
def pezzi(w):
    x = f'<{w}>'
    return tuple([fnv('w:' + w) % B] + [fnv(x[i:i + 3]) % B for i in range(len(x) - 2)])

# --- Dati
def leggi_csv(f):
    with open(f'{CARTELLA}/{f}', encoding='utf8', newline='') as h:
        r = list(csv.reader(h))[1:]
    return [(re.sub(r'\s+', ' ', t).strip(), c.strip()) for t, c in r]
def esempio(ws, k, tag=None):
    return {'ws': ws[:LMAX], 'k': k, 'tag': [TAG.index(x) for x in tag[:LMAX]] if tag else None}

dati, COMPITI, NOMI, pesi_compito = {}, {}, {}, {}
if SET in ('banca', 'tutto'):
    banca = leggi_csv('banking_train.csv'); random.shuffle(banca)
    classi_b = sorted({c for _, c in banca})
    clinc = json.load(open(f'{CARTELLA}/clinc_full.json', encoding='utf8'))
    classi_c = sorted({c for _, c in clinc['train']}) + ['oos']
    TAG = ['O']
    COMPITI.update({'banking77': [c.replace('_', ' ') for c in classi_b], 'clinc150': [('something else, out of scope' if c == 'oos' else c.replace('_', ' ')) for c in classi_c]})
    NOMI.update({'banking77': classi_b, 'clinc150': classi_c})
    taglio = len(banca) // 10
    dati['banking77'] = {'allena': [esempio(parole(t), classi_b.index(c)) for t, c in banca[taglio:]], 'calibra': [esempio(parole(t), classi_b.index(c)) for t, c in banca[:taglio]],
                         'prova': [esempio(parole(t), classi_b.index(c)) for t, c in leggi_csv('banking_test.csv')]}
    dati['clinc150'] = {'allena': [esempio(parole(t), classi_c.index(c)) for t, c in clinc['train'] + clinc['oos_train']], 'calibra': [esempio(parole(t), classi_c.index(c)) for t, c in clinc['val'] + clinc['oos_val']],
                        'prova': [esempio(parole(t), classi_c.index(c)) for t, c in clinc['test']], 'fuori': [esempio(parole(t), classi_c.index(c)) for t, c in clinc['oos_test']]}
    pesi_compito.update({'banking77': 1.0, 'clinc150': 1.2})
DESCRITTIVE_ALLENA = [
    ('it is dark outside', 'luce_accendi'), ('it is getting dark', 'luce_accendi'), ('it is so dark in here', 'luce_accendi'), ('it is pitch black in the kitchen', 'luce_accendi'),
    ('the sun has gone down', 'luce_accendi'), ('it is evening already', 'luce_accendi'), ('i cannot see a thing', 'luce_accendi'), ('night has fallen', 'luce_accendi'),
    ('it is a bit dark to read', 'luce_su'), ('i want more light', 'luce_su'), ('it is too dim in the bedroom', 'luce_su'), ('i need more light here', 'luce_su'),
    ('it is too bright', 'luce_giu'), ('the light is blinding me', 'luce_giu'), ('too much light in the living room', 'luce_giu'),
    ('fuori è buio', 'luce_accendi'), ('si sta facendo buio', 'luce_accendi'), ('qui è buio pesto', 'luce_accendi'), ('è già sera', 'luce_accendi'),
    ('è calato il sole', 'luce_accendi'), ('non vedo niente', 'luce_accendi'), ('è notte ormai', 'luce_accendi'), ('in cucina è buio', 'luce_accendi'),
    ('voglio più luce', 'luce_su'), ('c è poca luce per leggere', 'luce_su'), ('in camera è troppo scuro', 'luce_su'), ('mi serve più luce', 'luce_su'),
    ('c è troppa luce', 'luce_giu'), ('la luce mi acceca', 'luce_giu'), ('troppa luce in soggiorno', 'luce_giu'),
]
DESCRITTIVE_PROVA = [
    ('it is dark out there', 'luce_accendi'), ('it is already night', 'luce_accendi'), ('the room is so dark', 'luce_accendi'), ('it is a little dark here', 'luce_su'),
    ('could use more light', 'luce_su'), ('it is way too bright in here', 'luce_giu'),
    ('fuori c è buio', 'luce_accendi'), ('è già notte', 'luce_accendi'), ('la stanza è al buio', 'luce_accendi'), ('c è poca luce', 'luce_su'),
    ('vorrei un po più di luce', 'luce_su'), ('è troppo luminoso qui', 'luce_giu'),
]
if SET in ('casa', 'tutto'):
    casa = json.load(open(sys.argv[1], encoding='utf8'))
    TAG = casa['etichette']
    # Le etichette sono testo: il modello le legge come legge le frasi
    DESCRIVI = {
        'luce_accendi': 'turn the light on', 'luce_spegni': 'turn the light off', 'luce_su': 'make the light brighter', 'luce_giu': 'dim the light',
        'luce_livello': 'set the light to a percentage', 'luce_colore': 'change the colour of the light',
        'tapparelle_apri': 'open the blinds', 'tapparelle_chiudi': 'close the blinds', 'tapparelle_livello': 'set the blinds to a position',
        'caldo_su': 'make the house warmer', 'caldo_giu': 'make the house cooler', 'temperatura': 'set the thermostat to a number of degrees',
        'ventilatore_on': 'turn the fan on', 'ventilatore_off': 'turn the fan off',
        'musica_play': 'play music', 'musica_stop': 'stop or pause the music', 'musica_avanti': 'skip to the next song',
        'volume_su': 'turn the volume up', 'volume_giu': 'turn the volume down', 'volume_livello': 'set the volume to a number', 'muto': 'mute the sound',
        'tv_accendi': 'turn the tv on', 'tv_spegni': 'turn the tv off',
        'pulisci': 'start the robot vacuum cleaner', 'pulisci_stop': 'send the robot vacuum back to its base',
        'tosaerba': 'start the robot lawn mower', 'tosaerba_stop': 'send the lawn mower back to its base',
        'caffe': 'make a coffee', 'timer': 'start a kitchen timer', 'timer_stop': 'cancel the timer',
        'scena_notte': 'good night scene, going to sleep', 'scena_esco': 'leaving the house, away scene', 'scena_film': 'movie scene, watch a film', 'scena_arrivo': 'arriving home, welcome scene',
        'annulla': 'undo the last action', 'anche': 'the same again in another room', 'fuori': 'not a home command, something else',
    }
    lingue = ['en', 'it']
    COMPITI.update({'casa': [DESCRIVI[c] for c in casa['intenti']], 'lingua': ['english sentence', 'frase in italiano'],
                    'quanto': ['just a little bit', 'a normal amount', 'a lot more', 'all the way, to the limit']})
    NOMI.update({'casa': casa['intenti'], 'lingua': lingue, 'quanto': casa['quanto']})
    intento = lambda es, con_tag=False: [esempio(e['ws'], casa['intenti'].index(e['y']), e['tag'] if con_tag else None) for e in es]
    dati['casa'] = {'allena': intento(casa['allena'], True), 'calibra': intento(casa['calibra']), 'prova': intento(casa['prova_massive'], True),
                    'mano': intento(casa['prova_mano']), 'clinc': intento(casa['prova_clinc']), 'descrittive': [esempio(parole(t), casa['intenti'].index(y)) for t, y in DESCRITTIVE_PROVA],
                    'lingue': [e['lingua'] for e in casa['prova_massive']], 'lingue_mano': [e['lingua'] for e in casa['prova_mano']]}
    # Frasi che descrivono il buio o la luce invece di chiedere: una parte si allena, l'altra serve solo per la prova
    dati['casa']['allena'] += [esempio(parole(t), casa['intenti'].index(y)) for t, y in DESCRITTIVE_ALLENA for _ in range(3)]
    dati['lingua'] = {'allena': [esempio(e['ws'], lingue.index(e['lingua'])) for e in casa['allena'] if e['fonte'] != 'clinc'],
                      'prova': [esempio(e['ws'], lingue.index(e['lingua'])) for e in casa['prova_massive']]}
    dati['lingua']['calibra'] = dati['lingua']['allena'][:500]
    quanto = lambda es: [esempio(e['ws'], casa['quanto'].index(e['quanto'])) for e in es if e['quanto']]
    qa = quanto(casa['allena']); random.shuffle(qa); tq = len(qa) // 10
    dati['quanto'] = {'allena': qa[tq:], 'calibra': qa[:tq], 'prova': qa[:tq], 'mano': quanto(casa['prova_mano'])}
    pesi_compito.update({'casa': 1.0, 'lingua': 0.2 if SET == 'tutto' else 0.08, 'quanto': 0.35})
SPECIALI = set()
if SET == 'tutto':
    EXTRA = sys.argv[3]
    # MASSIVE completo: 60 intenti di un assistente vocale in 18 aree, in inglese e in italiano, con le divisioni ufficiali
    BELLO = {'iot': 'smart home', 'hue': 'lights', 'qa': 'question about', 'wemo': 'smart plug', 'lightchange': 'change the light colour', 'lightdim': 'dim the lights',
             'lightoff': 'lights off', 'lighton': 'lights on', 'lightup': 'brighter lights', 'createoradd': 'create or add', 'querycontact': 'find a contact',
             'addcontact': 'add a contact', 'sendemail': 'send an email', 'quirky': 'chit chat', 'likeness': 'i like this', 'dislikeness': 'i do not like this',
             'factoid': 'a fact', 'takeaway': 'takeaway food', 'query': 'question', 'set': 'set', 'remove': 'remove'}
    righe = [json.loads(r) for loc in ('en-US', 'it-IT') for r in open(f'{EXTRA}/massive/{loc}.jsonl', encoding='utf8')]
    classi_m = sorted({j['intent'] for j in righe})
    COMPITI['massive'] = [' '.join(BELLO.get(x, x) for x in c.split('_')) for c in classi_m]
    NOMI['massive'] = classi_m
    es_m = lambda parte: [esempio(parole(j['utt']), classi_m.index(j['intent'])) for j in righe if j['partition'] == parte]
    dati['massive'] = {'allena': es_m('train'), 'calibra': es_m('dev'), 'prova': es_m('test'), 'lingue': [j['locale'][:2] for j in righe if j['partition'] == 'test']}
    pesi_compito['massive'] = 1.0
    # Coppie di frasi con lo stesso senso: le coppie di SNLI dove la seconda frase segue dalla prima. Il modello impara a mettere
    # vicine due frasi che dicono la stessa cosa. Le coppie inglese-italiano di MASSIVE servono solo per la prova: in allenamento
    # spingevano le due lingue nello stesso punto, e il modello riconosceva la lingua molto peggio (dal 98% al 90%)
    per_id = {}
    for j in righe: per_id.setdefault((j['partition'], j['id']), {})[j['locale'][:2]] = parole(j['utt'])
    parallele = lambda parte: [{'a': v['en'], 'b': v['it']} for (q, _), v in per_id.items() if q == parte and 'en' in v and 'it' in v]
    import pyarrow.parquet as pq
    snli = [x for x in pq.read_table(f'{EXTRA}/snli-train.parquet').to_pylist() if x['label'] == 0]
    random.shuffle(snli)
    prova_coppie = parallele('test'); random.shuffle(prova_coppie)
    dati['coppie'] = {'allena': [{'a': parole(x['premise']), 'b': parole(x['hypothesis'])} for x in snli[:40000]], 'prova': prova_coppie[:1000]}
    pesi_compito['coppie'] = 0.3; SPECIALI.add('coppie')
    # SGD: frasi di dialoghi con servizi diversi; le risposte possibili sono le descrizioni degli intenti del servizio, e cambiano da
    # un servizio all'altro. La prova usa solo servizi mai visti in allenamento: è la misura per le risposte nuove
    def sgd(parte):
        sch = {x['service_name']: {i['name']: i['description'] for i in x['intents']} for x in json.load(open(f'{EXTRA}/sgd/{parte}/schema.json', encoding='utf8'))}
        out = []
        for f in sorted(glob.glob(f'{EXTRA}/sgd/{parte}/dialogues_*.json')):
            for d in json.load(open(f, encoding='utf8')):
                prima = {}
                for t in d['turns']:
                    if t['speaker'] != 'USER': continue
                    for fr in t['frames']:
                        a, sv = fr['state']['active_intent'], fr['service']
                        if a != 'NONE' and a != prima.get(sv) and len(sch[sv]) > 1:
                            ops = list(sch[sv].values())
                            out.append({'ws': parole(t['utterance']), 'ops': [parole(o) for o in ops], 'k': ops.index(sch[sv][a]), 'servizio': sv})
                        prima[sv] = a
        return out, set(sch)
    sa, servizi_a = sgd('train'); sp, _ = sgd('test')
    random.shuffle(sa); nuovi = [e for e in sp if e['servizio'] not in servizi_a]; random.shuffle(nuovi)
    dati['sgd'] = {'allena': sa[:30000], 'prova': nuovi[:3000]}
    pesi_compito['sgd'] = 0.6; SPECIALI.add('sgd')
    # NLU++: richieste a una banca e a un hotel; ogni frase ha uno o più intenti, e ogni intento è una domanda sì o no
    ont = json.load(open(f'{EXTRA}/nlupp/data/ontology.json', encoding='utf8'))['intents']
    for dom, nome in [('banking', 'nlupp_banca'), ('hotels', 'nlupp_hotel')]:
        chiavi = sorted(c for c, v in ont.items() if dom in v['domain'] or 'general' in v['domain'])
        COMPITI[nome] = [ont[c]['description'] for c in chiavi]; NOMI[nome] = chiavi
        tutte = [x for i in range(20) for x in json.load(open(f'{EXTRA}/nlupp/data/{dom}/fold{i}.json', encoding='utf8')) if x.get('intents')]
        random.shuffle(tutte); tg = len(tutte) // 10
        es_n = lambda xs: [e for e in ({'ws': parole(x['text']), 'ks': [chiavi.index(i) for i in x['intents'] if i in chiavi]} for x in xs) if e['ks']]
        dati[nome] = {'allena': es_n(tutte[tg:]), 'prova': es_n(tutte[:tg])}
        pesi_compito[nome] = 0.6; SPECIALI.add(nome)
    print({k: len(v['allena']) for k, v in dati.items()})

# Per "quanto" ogni classe esce con la stessa probabilità: le frasi "normali" sono dieci volte le altre
per_classe = {k: {} for k in dati}
for k in [k for k in dati if k not in SPECIALI]:
    for e in dati[k]['allena']: per_classe[k].setdefault(e['k'], []).append(e)

# --- Il modello
class Strato(nn.Module):
    def __init__(s):
        super().__init__()
        s.n1, s.n2 = nn.LayerNorm(D), nn.LayerNorm(D)
        s.qkv, s.o = nn.Linear(D, 3 * D), nn.Linear(D, D)
        s.f1, s.f2 = nn.Linear(D, FFN), nn.Linear(FFN, D)
    def forward(s, x, maschera):
        n, L, _ = x.shape
        q, k, v = s.qkv(s.n1(x)).view(n, L, 3, TESTE, D // TESTE).permute(2, 0, 3, 1, 4)
        a = (q @ k.transpose(-1, -2)) / math.sqrt(D // TESTE)
        a = a.masked_fill(~maschera[:, None, None, :], -1e4).softmax(-1)
        x = x + s.o((a @ v).transpose(1, 2).reshape(n, L, D))
        return x + s.f2(F.gelu(s.f1(s.n2(x)), approximate='tanh'))

class Decisore(nn.Module):
    def __init__(s):
        super().__init__()
        s.emb = nn.Embedding(B, D); nn.init.normal_(s.emb.weight, 0, 0.1)
        s.pos = nn.Embedding(LMAX, D); nn.init.normal_(s.pos.weight, 0, 0.02)
        s.strati = nn.ModuleList([Strato() for _ in range(STRATI)])
        s.fine = nn.LayerNorm(D)
        s.proietta = nn.Linear(D, D)
        s.parti = nn.Linear(D, len(TAG))
        s.scala = nn.Parameter(torch.tensor(2.5))
    def codifica(s, frasi):
        L = max(1, max(len(ws) for ws in frasi))
        idx, pesi, maschera = [], [], torch.zeros(len(frasi), L, dtype=torch.bool)
        for i, ws in enumerate(frasi):
            for j, w in enumerate(ws):
                ps = pezzi(w); maschera[i, j] = True
                idx += [(i * L + j, p) for p in ps[:1]] + [(i * L + j, p) for p in ps[1:]]
                pesi += [1.0] + [1.0 / max(1, len(ps) - 1)] * (len(ps) - 1)
        righe = torch.tensor([a for a, _ in idx]); col = torch.tensor([b for _, b in idx]); w = torch.tensor(pesi)
        x = torch.zeros(len(frasi) * L, D).index_add_(0, righe, s.emb(col) * w[:, None]).view(len(frasi), L, D)
        x = x + s.pos.weight[:L][None]
        for st in s.strati: x = st(x, maschera)
        h = s.fine(x)
        m = maschera.float()[..., None]
        v = s.proietta((h * m).sum(1) / m.sum(1).clamp(min=1))
        return F.normalize(v, dim=-1), h
    def decidi(s, frasi, etichette):
        v, h = s.codifica(frasi); e, _ = s.codifica(etichette)
        return s.scala.exp() * v @ e.T, h

modello = Decisore()
n_pesi = sum(p.numel() for p in modello.parameters())
print('pesi', n_pesi)
opt = torch.optim.AdamW(modello.parameters(), lr=2e-3, weight_decay=0.01)
etichette_ws = {k: [parole(x) for x in v] for k, v in COMPITI.items()}

# Ogni passo prende un gruppo da un compito, a turno, in proporzione alla grandezza; le parole cadono a caso al 10%, per non imparare a memoria
GRUPPO, EPOCHE = 64, int(os.environ.get('EPOCHE', '10'))
# Il numero di passi segue i dati pesati: ogni compito fa circa EPOCHE giri per il suo peso
tot = sum(len(dati[k]['allena']) * pesi_compito[k] for k in pesi_compito)
passi = int(EPOCHE * tot // GRUPPO)
nomi = list(pesi_compito); prob = [len(dati[k]['allena']) * pesi_compito[k] for k in nomi]
t0 = time.time()
for passo in range(passi):
    lr = 2e-3 * min(1, (passo + 1) / 300) * 0.5 * (1 + math.cos(math.pi * passo / passi))
    for g in opt.param_groups: g['lr'] = lr
    k = random.choices(nomi, prob)[0]
    gruppo = [random.choice(random.choice(list(per_classe[k].values()))) for _ in range(GRUPPO)] if k == 'quanto' else random.sample(dati[k]['allena'], GRUPPO)
    togli = lambda ws: [w for w in ws if random.random() > 0.1] or ws
    if k == 'coppie':
        # Ogni frase deve trovare la sua compagna fra quelle del gruppo, nei due versi
        va, _ = modello.codifica([togli(e['a']) for e in gruppo]); vb, _ = modello.codifica([togli(e['b']) for e in gruppo])
        z = modello.scala.exp() * va @ vb.T; y = torch.arange(len(gruppo))
        perdita = (F.cross_entropy(z, y) + F.cross_entropy(z.T, y)) / 2
    elif k == 'sgd':
        # Le risposte sono le descrizioni di tutti i servizi del gruppo: ogni volta un elenco diverso
        ops = list(dict.fromkeys(tuple(o) for e in gruppo for o in e['ops']))
        logit, _ = modello.decidi([togli(e['ws']) for e in gruppo], [list(o) for o in ops])
        perdita = F.cross_entropy(logit, torch.tensor([ops.index(tuple(e['ops'][e['k']])) for e in gruppo]))
    elif k in SPECIALI:
        # NLU++: più intenti giusti per frase; conta la probabilità totale di quelli giusti
        logit, _ = modello.decidi([togli(e['ws']) for e in gruppo], etichette_ws[k]); lp = logit.log_softmax(-1)
        perdita = -torch.stack([torch.logsumexp(lp[i, e['ks']], 0) for i, e in enumerate(gruppo)]).mean()
    else:
        logit, h = modello.decidi([togli(e['ws']) for e in gruppo], etichette_ws[k])
        perdita = F.cross_entropy(logit, torch.tensor([e['k'] for e in gruppo]))
    if k == 'casa':
        # La testa per parola si allena solo sulle frasi intere, con tutte le parole al loro posto
        piene = [e for e in gruppo if e['tag']]
        if piene:
            _, hp = modello.codifica([e['ws'] for e in piene])
            y = torch.full(hp.shape[:2], -100, dtype=torch.long)
            for i, e in enumerate(piene): y[i, :len(e['tag'])] = torch.tensor(e['tag'])
            perdita = perdita + F.cross_entropy(modello.parti(hp).reshape(-1, len(TAG)), y.reshape(-1), ignore_index=-100)
    opt.zero_grad(); perdita.backward(); nn.utils.clip_grad_norm_(modello.parameters(), 1.0); opt.step()
    if passo % 500 == 0: print(f'passo {passo}/{passi} {k} perdita {perdita.item():.3f} {time.time() - t0:.0f} s', flush=True)

# --- Quantizzazione: ogni riga di ogni matrice in 8 bit, con la sua scala. La prova usa i pesi quantizzati, quelli che scarica il browser
ordine = [(n, p) for n, p in modello.named_parameters()]
with torch.no_grad():
    for n, p in ordine:
        if p.dim() == 2:
            sc = p.abs().amax(1, keepdim=True).clamp(min=1e-8) / 127
            p.copy_((p / sc).round().clamp(-127, 127) * sc)
modello.eval()

@torch.no_grad()
def probabilita(k, esempi, T=1.0):
    e, _ = modello.codifica(etichette_ws[k]); out = []
    for i in range(0, len(esempi), 256):
        v, _ = modello.codifica([x['ws'] for x in esempi[i:i + 256]])
        out.append(((modello.scala.exp() * v @ e.T) / T).softmax(-1))
    return torch.cat(out)
def temperatura(k):
    with torch.no_grad():
        e, _ = modello.codifica(etichette_ws[k]); v, _ = modello.codifica([x['ws'] for x in dati[k]['calibra']])
        z = modello.scala.exp() * v @ e.T; y = torch.tensor([x['k'] for x in dati[k]['calibra']])
        return min((F.cross_entropy(z / T, y).item(), T) for T in [0.3 + 0.02 * i for i in range(186)])[1]
def misura(k, esempi, T, soglia=None, fuori=None):
    p = probabilita(k, esempi, T); top = p.argmax(-1)
    if soglia is not None: top = torch.where(p.max(-1).values < soglia, torch.full_like(top, fuori), top)
    y = torch.tensor([x['k'] for x in esempi]); tre = (p.topk(min(3, p.shape[1]), -1).indices == y[:, None]).any(-1)
    return {'frasi': len(esempi), 'giuste': int((top == y).sum()), 'percentuale': round(100 * (top == y).float().mean().item(), 1), 'tra_le_prime_tre': round(100 * tre.float().mean().item(), 1)}

esito, temp, soglie = {}, {}, {}
for k in COMPITI: temp[k] = 1.0 if k in SPECIALI else round(temperatura(k), 2)
if SET in ('banca', 'tutto'):
    esito['banking77'] = misura('banking77', dati['banking77']['prova'], temp['banking77'])
    # CLINC150: la soglia del fuori tema si sceglie sulla validazione ufficiale
    oos = classi_c.index('oos'); cal = dati['clinc150']['calibra']
    pc = probabilita('clinc150', cal, temp['clinc150']); yc = torch.tensor([x['k'] for x in cal])
    def bilancio(s):
        top = torch.where(pc.max(-1).values < s, torch.full_like(pc.argmax(-1), oos), pc.argmax(-1))
        dentro = yc != oos
        return ((top == yc)[dentro].float().mean() + (top == yc)[~dentro].float().mean()).item() / 2
    soglie['clinc150'] = max((bilancio(s / 100), s / 100) for s in range(0, 91))[1]
    esito['clinc150'] = {'senza_soglia': misura('clinc150', dati['clinc150']['prova'], temp['clinc150']), 'con_soglia': misura('clinc150', dati['clinc150']['prova'], temp['clinc150'], soglie['clinc150'], oos),
                         'fuori_tema': misura('clinc150', dati['clinc150']['fuori'], temp['clinc150'], soglie['clinc150'], oos)}
if SET in ('casa', 'tutto'):
    for nome, chiave, lingue_k in [('casa_massive', 'prova', 'lingue'), ('casa_a_mano', 'mano', 'lingue_mano')]:
        es = dati['casa'][chiave]
        esito[nome] = {l: misura('casa', [e for e, x in zip(es, dati['casa'][lingue_k]) if x == l], temp['casa']) for l in lingue}
    esito['casa_clinc'] = misura('casa', dati['casa']['clinc'], temp['casa'])
    esito['casa_descrittive'] = misura('casa', dati['casa']['descrittive'], temp['casa'])
    esito['lingua'] = misura('lingua', dati['lingua']['prova'], temp['lingua'])
    esito['quanto'] = misura('quanto', dati['quanto']['prova'], temp['quanto'])
    esito['quanto_a_mano'] = misura('quanto', dati['quanto']['mano'], temp['quanto'])
    with torch.no_grad():
        tp = fp = fn = 0
        for e in [e for e in dati['casa']['prova'] if e['tag']]:
            _, h = modello.codifica([e['ws']]); pr = modello.parti(h[0]).argmax(-1).tolist()
            for a, b in zip(pr, e['tag']):
                if b and a == b: tp += 1
                else: fp += a != 0; fn += b != 0
        esito['etichette'] = {'precisione': round(100 * tp / max(1, tp + fp), 1), 'richiamo': round(100 * tp / max(1, tp + fn), 1)}
if SET == 'tutto':
    es = dati['massive']['prova']
    esito['massive'] = {l: misura('massive', [e for e, x in zip(es, dati['massive']['lingue']) if x == l], temp['massive']) for l in ('en', 'it')}
    with torch.no_grad():
        pr = dati['coppie']['prova']; va, _ = modello.codifica([e['a'] for e in pr]); vb, _ = modello.codifica([e['b'] for e in pr])
        esito['coppie_en_it'] = {'frasi': len(pr), 'percentuale': round(100 * ((va @ vb.T).argmax(-1) == torch.arange(len(pr))).float().mean().item(), 1)}
        g = sum(int(modello.decidi([e['ws']], e['ops'])[0].argmax().item() == e['k']) for e in dati['sgd']['prova'])
        esito['sgd_servizi_nuovi'] = {'frasi': len(dati['sgd']['prova']), 'percentuale': round(100 * g / max(1, len(dati['sgd']['prova'])), 1),
                                      'a_caso': round(100 * sum(1 / len(e['ops']) for e in dati['sgd']['prova']) / max(1, len(dati['sgd']['prova'])), 1)}
        for nome in ('nlupp_banca', 'nlupp_hotel'):
            pr = dati[nome]['prova']; top = probabilita(nome, pr).argmax(-1).tolist()
            esito[nome] = {'frasi': len(pr), 'percentuale': round(100 * sum(t in e['ks'] for t, e in zip(top, pr)) / len(pr), 1)}
print(json.dumps({'temperature': temp, 'soglie': soglie, **esito}, indent=1, ensure_ascii=False))

# --- File: per ogni tensore, in ordine, le scale (float32, una per riga) e poi i valori (int8, o float32 per i vettori)
tensori, buf = [], bytearray()
for n, p in ordine:
    a = p.detach().float()
    if a.dim() == 2:
        sc = a.abs().amax(1).clamp(min=1e-8) / 127
        q = (a / sc[:, None]).round().clamp(-127, 127).to(torch.int8)
        tensori.append({'nome': n, 'forma': list(a.shape), 'scale': len(buf), 'valori': len(buf) + 4 * a.shape[0], 'tipo': 'int8'})
        buf += struct.pack(f'<{a.shape[0]}f', *sc.tolist()); buf += q.numpy().tobytes()
    else:
        tensori.append({'nome': n, 'forma': list(a.shape), 'valori': len(buf), 'tipo': 'float32'})
        buf += struct.pack(f'<{a.numel()}f', *a.flatten().tolist())
    while len(buf) % 4: buf.append(0)
if os.environ.get('PROVA'): sys.exit(0)
open(f'public/learn/decisore-{SET}.bin', 'wb').write(bytes(buf))
esempi = ({'banking77': random.sample([t for t, _ in leggi_csv('banking_test.csv')], 80),
           'clinc150': random.sample([t for t, _ in clinc['test']], 60) + random.sample([t for t, _ in clinc['oos_test']], 20)} if SET in ('banca', 'tutto') else {})
meta = {'B': B, 'D': D, 'teste': TESTE, 'strati': STRATI, 'ffn': FFN, 'lmax': LMAX, 'pesi': n_pesi, 'tag': TAG, 'tensori': tensori,
        'compiti': {k: {'etichette': COMPITI[k], 'temperatura': temp[k], 'soglia': soglie.get(k)} for k in COMPITI}, 'nomi': NOMI, 'esempi': esempi, 'esito': esito}
json.dump(meta, open(f'public/learn/decisore-{SET}.json', 'w', encoding='utf8'), ensure_ascii=False)
print('file', len(buf) // 1024, 'KB')
