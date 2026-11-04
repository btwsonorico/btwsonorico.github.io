# Frasi di domotica da Home Assistant intents (CC BY 4.0, https://github.com/home-assistant/intents) per la casa di /learn/decision/.
# I modelli di frase di Home Assistant ("<turn_on> [<the>] <light> <in> {area}") diventano frasi concrete, scelte a caso, in italiano e inglese.
# Ogni frase ha l'intento della nostra casa e un'etichetta per parola: STANZA per {area}, COLORE per {color}, NUMERO per i numeri.
# Le liste dei nomi di stanza e di dispositivo sono le nostre; le stanze che la casa non ha servono a imparare a dire "non c'è".
# Si lancia con: python -I scripts/campiona-ha.py <cartella del repo intents> <file di uscita>
import glob, json, os, random, re, sys, unicodedata
import yaml
from hassil.parse_expression import parse_sentence
from hassil.expression import Alternative, ListReference, Permutation, RuleReference, Sequence, TextChunk

cartella, uscita = sys.argv[1], sys.argv[2]
random.seed(7)
PER_MODELLO = 6

# Intento di Home Assistant (e dominio) -> intento della casa. None: frase scartata. 'fuori': non è un comando per questa casa
def intento(ha, dominio, classe, valori):
    tapparella = classe in (None, 'shutter', 'blind', 'curtain', 'shade', 'awning', 'window')
    if ha == 'HassTurnOn': return {'light': 'luce_accendi', 'fan': 'ventilatore_on', 'cover': 'tapparelle_apri' if tapparella else None}.get(dominio)
    if ha == 'HassTurnOff': return {'light': 'luce_spegni', 'fan': 'ventilatore_off', 'cover': 'tapparelle_chiudi' if tapparella else None}.get(dominio)
    if ha == 'HassLightSet': return 'luce_colore' if 'color' in valori else 'luce_livello' if 'brightness' in valori else None
    if ha == 'HassSetPosition': return 'tapparelle_livello' if dominio in (None, 'cover') and tapparella else None
    if ha == 'HassSetVolumeRelative': return {'up': 'volume_su', 'down': 'volume_giu'}.get(valori.get('volume_step')) or ('volume_su' if 'volume_step_up' in valori else 'volume_giu' if 'volume_step_down' in valori else None)
    return {'HassClimateSetTemperature': 'temperatura', 'HassFanSetSpeed': 'ventilatore_on', 'HassMediaPause': 'musica_stop', 'HassMediaUnpause': 'musica_play',
            'HassMediaSearchAndPlay': 'musica_play', 'HassMediaNext': 'musica_avanti', 'HassMediaPlayerMute': 'muto', 'HassSetVolume': 'volume_livello',
            'HassVacuumStart': 'pulisci', 'HassVacuumCleanArea': 'pulisci', 'HassVacuumReturnToBase': 'pulisci_stop', 'HassLawnMowerStartMowing': 'tosaerba',
            'HassLawnMowerDock': 'tosaerba_stop', 'HassStartTimer': 'timer', 'HassCancelTimer': 'timer_stop', 'HassCancelAllTimers': 'timer_stop',
            'HassGetWeather': 'fuori', 'HassGetCurrentTime': 'fuori', 'HassGetCurrentDate': 'fuori', 'HassListAddItem': 'fuori', 'HassShoppingListAddItem': 'fuori',
            'HassBroadcast': 'fuori', 'HassTimerStatus': 'fuori'}.get(ha)

# Le nostre liste. Le stanze vere della casa vengono scelte più spesso di quelle che non ha
STANZE = {'it': (['soggiorno', 'salotto', 'cucina', 'camera', 'camera da letto', 'bagno', 'giardino'], ['studio', 'garage', 'cantina', 'soffitta', 'corridoio', 'cameretta', 'lavanderia']),
          'en': (['living room', 'lounge', 'kitchen', 'bedroom', 'bathroom', 'garden', 'backyard'], ['study', 'office', 'garage', 'basement', 'attic', 'hallway', 'kids room', 'laundry'])}
NOMI = {'it': {'light': ['lampada', 'lampadario', 'abat jour', 'luce del comodino', 'lanterne'], 'fan': ['ventilatore', 'ventola'], 'cover': ['tapparella', 'tenda', 'persiana'],
               'media_player': ['tv', 'televisione', 'cassa', 'stereo'], 'vacuum': ['robot', 'aspirapolvere', 'roomba'], 'lawn_mower': ['tosaerba', 'robot tosaerba']},
        'en': {'light': ['lamp', 'ceiling light', 'bedside lamp', 'reading lamp', 'lanterns'], 'fan': ['fan', 'ceiling fan'], 'cover': ['blind', 'shutter', 'curtain'],
               'media_player': ['tv', 'television', 'speaker', 'stereo'], 'vacuum': ['robot', 'vacuum', 'roomba'], 'lawn_mower': ['lawn mower', 'mower', 'robot mower']}}
RIEMPI = {'it': {'search_query': ['un po di jazz', 'la mia playlist', 'musica rilassante', 'i beatles', 'qualcosa di allegro'], 'shopping_list_item': ['latte', 'pane', 'uova'],
                 'todo_list_item': ['chiamare la nonna', 'pagare la bolletta'], 'message': ['la cena è pronta', 'si parte tra dieci minuti'], 'timer_name': ['pasta', 'torta'], 'zone': ['casa', 'lavoro']},
          'en': {'search_query': ['some jazz', 'my playlist', 'relaxing music', 'the beatles', 'something upbeat'], 'shopping_list_item': ['milk', 'bread', 'eggs'],
                 'todo_list_item': ['call grandma', 'pay the bill'], 'message': ['dinner is ready', 'we leave in ten minutes'], 'timer_name': ['pasta', 'cake'], 'zone': ['home', 'work']}}
NUMERI = {'brightness': (5, 100, 5), 'position': (0, 100, 10), 'volume': (5, 100, 5), 'temperature': (16, 26, 1), 'fan_speed': (10, 100, 10), 'volume_step_up': (5, 50, 5),
          'volume_step_down': (5, 50, 5), 'timer_seconds': (10, 59, 5), 'timer_minutes': (1, 45, 1), 'timer_hours': (1, 3, 1), 'timer_half': None}
TAGLIA = {'area': 'STANZA', 'color': 'COLORE'}

parole = lambda t: [w for w in re.sub(r'[^a-z0-9àèéìíòóùú]+', ' ', unicodedata.normalize('NFC', t.lower())).split(' ') if w]

def carica(lingua):
    regole, liste = {}, {}
    for f in glob.glob(f'{cartella}/rules/{lingua}/*.yaml') + [f'{cartella}/sentences/{lingua}/_common.yaml']:
        d = yaml.safe_load(open(f, encoding='utf8')) or {}
        regole.update(d.get('expansion_rules', {})); liste.update(d.get('lists', {}))
    for f in glob.glob(f'{cartella}/lists/{lingua}/*.yaml'):
        d = yaml.safe_load(open(f, encoding='utf8')) or {}
        liste.update(d.get('lists', {}))
    return {k: parse_sentence(v).expression for k, v in regole.items()}, liste

class Salta(Exception): pass

def espandi(e, regole, liste, lingua, valori, nomi_dom):
    # Restituisce una lista di (testo, etichetta) scelta a caso dentro l'espressione
    if isinstance(e, TextChunk): return [(e.original_text, 'O')]
    if isinstance(e, Alternative): return espandi(random.choice(e.items), regole, liste, lingua, valori, nomi_dom)
    if isinstance(e, Permutation):
        pezzi = list(e.items); random.shuffle(pezzi)
        return [x for p in pezzi for x in espandi(p, regole, liste, lingua, valori, nomi_dom) + [(' ', 'O')]]
    if isinstance(e, Sequence): return [x for p in e.items for x in espandi(p, regole, liste, lingua, valori, nomi_dom)]
    if isinstance(e, RuleReference):
        if e.rule_name not in regole: raise Salta
        return espandi(regole[e.rule_name], regole, liste, lingua, valori, nomi_dom)
    if isinstance(e, ListReference):
        nome, slot = e.list_name, e.slot_name
        if nome == 'area': vere, finte = STANZE[lingua]; s = random.choice(vere if random.random() < 0.8 else finte); valori['area'] = s; return [(s, 'STANZA')]
        if nome == 'name':
            if not nomi_dom: raise Salta
            return [(random.choice(NOMI[lingua][random.choice(nomi_dom)]), 'O')]
        if nome in RIEMPI[lingua]: valori[slot] = 1; return [(random.choice(RIEMPI[lingua][nome]), 'O')]
        if nome in NUMERI and NUMERI[nome]:
            a, b, p = NUMERI[nome]; n = random.randrange(a, b + 1, p); valori[slot] = n; valori[nome] = n
            return [(str(n), 'NUMERO')]
        lst = liste.get(nome)
        if not lst or 'values' not in lst:
            if e.is_inline_range:
                a, b, p = e.get_inline_range(); n = random.randrange(a, b + 1, p); valori[slot] = n; return [(str(n), 'NUMERO')]
            raise Salta
        v = random.choice(lst['values'])
        testo, out = (v['in'], v.get('out', v['in'])) if isinstance(v, dict) else (v, v)
        valori[slot] = out; valori[nome] = out
        if slot == 'device_class': valori['classe'] = out
        pezzi = espandi(parse_sentence(str(testo)).expression, regole, liste, lingua, valori, nomi_dom)
        # Le parole di una lista a testo ("al massimo", "rosso") non sono numeri: solo i colori hanno un'etichetta
        return [(t, TAGLIA.get(nome, 'O')) for t, _ in pezzi]
    raise Salta

# I pezzi si uniscono prima di dividere in parole ("accend" + "i" = "accendi"); ogni parola prende l'etichetta della sua prima lettera
def frase(pezzi):
    testo, et = '', []
    for t, e in pezzi: testo += t; et += [e] * len(t)
    testo = unicodedata.normalize('NFC', testo.lower())
    ws, tag = [], []
    for m in re.finditer(r'[a-z0-9àèéìíòóùú]+', testo): ws.append(m.group()); tag.append(et[m.start()])
    return ws, tag

out, conta = [], {}
for lingua in ['it', 'en']:
    regole, liste = carica(lingua)
    for f in sorted(glob.glob(f'{cartella}/sentences/{lingua}/Hass*/*.yaml')):
        ha = os.path.basename(os.path.dirname(f))
        for blk in (yaml.safe_load(open(f, encoding='utf8')) or {}).get('data', []):
            dominio = blk.get('inferred_domain') or (blk.get('slots') or {}).get('domain')
            nomi_dom = [d for d in (blk.get('name_domains') or ([dominio] if dominio else [])) if d in NOMI[lingua]]
            for modello in blk['sentences']:
                try: espr = parse_sentence(modello).expression
                except Exception: continue
                visti = set()
                for _ in range(PER_MODELLO * 3):
                    if len(visti) >= PER_MODELLO: break
                    valori = {}
                    try: ws, tag = frase(espandi(espr, regole, liste, lingua, valori, nomi_dom))
                    except Salta: break
                    except RecursionError: break
                    y = intento(ha, dominio, valori.get('classe'), valori)
                    if not y or not ws or ' '.join(ws) in visti: continue
                    visti.add(' '.join(ws))
                    out.append({'ws': ws, 'tag': tag, 'y': y, 'lingua': lingua, 'fonte': f'ha:{ha}'})
                    conta[(lingua, y)] = conta.get((lingua, y), 0) + 1
json.dump(out, open(uscita, 'w', encoding='utf8'), ensure_ascii=False)
print(len(out), 'frasi')
for k in sorted(conta): print(k, conta[k])
