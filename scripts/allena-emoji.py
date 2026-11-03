# Allena l'autotagger di /learn/decision/: un encoder minuscolo che legge una frase e sceglie fra 50 emoji, con una probabilità.
# Le parole arrivano già come vettori GloVe (Stanford, PDDL 1.0), allenati su miliardi di parole: così anche una parola mai vista negli esempi ha un significato.
# Parole chiave: Unicode CLDR (Unicode License V3). Frasi: scritte a mano qui sotto. Calibrazione e prova usano altre frasi. src/lib/emoji.ts riscrive la stessa rete in TypeScript.
# Si lancia con: python scripts/allena-emoji.py <cartella per i dati> [frasi libere.json]
import gzip, json, math, os, random, re, sys, urllib.request
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
sys.stdout.reconfigure(encoding='utf-8')

N_PAROLE, VDIM, MAX_V, DIM, TESTE, POS, MAX_PAROLE, SCALA = 20000, 50, 5.0, 48, 2, 16, 16, 2048
random.seed(7); torch.manual_seed(7)

# Per ogni emoji: frasi di allenamento | due frasi di prova, che l'allenamento non vede
DATI = {
 '🍕': ('pizza night with friends|ordered a pepperoni pizza|a slice with extra cheese|italian dinner in naples|margherita from the oven|i could eat a whole pizza|takeaway for dinner tonight|the pizzeria on the corner|hot slice after the game|fast food craving', 'lets get a large pizza tonight|cheesy slice for lunch'),
 '🍣': ('sushi for lunch|fresh salmon nigiri|japanese restaurant downtown|raw fish and rice|tuna rolls and soy sauce|all you can eat sushi|chopsticks and wasabi|omakase at the bar|seafood dinner by the harbour|maki with avocado', 'we went out for sushi yesterday|i love salmon rolls'),
 '☕': ('morning coffee first|an espresso at the bar|need caffeine right now|cappuccino with friends|tea break at four|hot drink on a cold day|coffee shop on the corner|i cannot wake up without coffee|a warm mug of latte|barista made my flat white', 'one more espresso please|time for my coffee break'),
 '🍺': ('beers after work|a cold pint at the pub|drinks with the team|craft beer festival|happy hour tonight|lager on the terrace|cheers at the bar|night out drinking|ale from a local brewery|round of pints for everyone', 'lets grab a beer tonight|the pub has great ales'),
 '🍰': ('slice of chocolate cake|dessert after dinner|strawberry shortcake at the bakery|something sweet please|baking a sponge cake|a piece of cheesecake|sugar and cream dessert|pastry shop near home|i have a sweet tooth|tiramisu for dessert', 'the dessert menu looks amazing|i baked a lemon cake'),
 '✈️': ('flight to tokyo|boarding at the airport|my plane leaves at noon|layover in dubai|booked a long haul flight|passport and boarding pass|flying home tomorrow|turbulence over the atlantic|airline lost my luggage|departure gate changed', 'our plane lands at midnight|just landed at the airport'),
 '🏖️': ('beach holiday in sardinia|sand between my toes|summer vacation by the sea|sunbathing under an umbrella|swimming at the seaside|a week on the coast|relaxing on the beach|ocean waves and sunscreen|island resort in greece|flip flops and towels', 'we spent the day at the beach|a seaside holiday this summer'),
 '🗺️': ('planning our route|looking at the map|exploring a new country|backpacking across asia|travel itinerary for spring|lost in a foreign city|an atlas of the world|directions to the old town|guide book for the trip|adventure around the globe', 'mapping the route for our trip|exploring places we have never seen'),
 '🚗': ('driving to work|stuck in traffic|road trip with my brother|my car broke down|parking downtown is a nightmare|new electric car|filling up with petrol|long drive on the motorway|taking the car to the mechanic|highway at rush hour', 'we drove for six hours|the traffic on the highway is awful'),
 '🏔️': ('hiking in the alps|snow on the peak|climbing a mountain|skiing in the dolomites|summit at sunrise|trekking in the himalayas|a cabin in the mountains|altitude and thin air|high trail above the valley|mountaineering expedition', 'we reached the summit today|a weekend in the mountains'),
 '💼': ('new job interview|meeting with my boss|office work all day|back to work on monday|business trip to milan|career change next year|signed a contract with a client|working late at the office|promotion at my company|colleagues and clients', 'i start my new job on monday|another long day at the office'),
 '📊': ('quarterly sales report|charts for the presentation|data analysis in excel|numbers on the dashboard|revenue is up this quarter|a spreadsheet of results|statistics from the survey|bar chart of expenses|analytics for the website|metrics and kpis', 'the report shows growth in sales|i made a chart from the survey data'),
 '📅': ('schedule a meeting next week|calendar is full|appointment on tuesday|deadline on friday|save the date|planning the month ahead|booked for next monday|agenda for tomorrow|reminder for the event|what date works for you', 'put it on my calendar|the deadline moved to next tuesday'),
 '💰': ('saving money this year|got a big bonus|salary went up|rich and wealthy|my bank account|paying the bills|investing in stocks|cash in the wallet|it costs a fortune|budget and expenses', 'i finally got paid today|we need to save more money'),
 '📧': ('send me an email|my inbox is full|reply to that message|newsletter in my mailbox|forward the mail to the team|too many unread emails|subject line of the message|gmail is down|attach the file to the email|spam in my inbox', 'i will email you the details|still waiting for your reply in my inbox'),
 '📚': ('reading a good book|studying in the library|novels on my shelf|homework and textbooks|finished the last chapter|too many books to read|reading in bed|literature class today|bookshop on the corner|learning from a textbook', 'i just finished this novel|the library is open late'),
 '🎓': ('graduation day|finished my degree|university lectures|master thesis defence|phd student at polimi|exam at the university|finally a graduate|college campus life|professor and students|studying for my diploma', 'i failed my exam|my thesis defence is next month'),
 '🔬': ('laboratory experiment|research on cells|microscope and samples|scientific discovery|biology lab results|published a science paper|testing a hypothesis|chemistry in the lab|clinical research team|physics experiment today', 'the lab results came back|a new scientific study on cells'),
 '🧠': ('thinking really hard|my brain hurts|neural networks and the mind|learning a new skill|memory and intelligence|cognitive science lecture|deep thought all day|smart idea from my mind|psychology of decisions|mental effort', 'i cannot stop overthinking this|memory tricks for my mind'),
 '💡': ('i have a great idea|a bright idea for the project|brainstorming solutions|sudden inspiration|the light bulb moment|creative concept for a startup|i just figured it out|new invention in my garage|turn on the light|tip for saving time', 'what a clever idea|i just got an idea for an app'),
 '💻': ('coding on my laptop|writing software all night|programming in python|my computer is slow|working on a website|new macbook arrived|debugging the code|developer at a startup|keyboard and monitor|deploying the app to the server', 'my laptop needs an update|i wrote this code in typescript'),
 '📱': ('new phone arrived|text me later|scrolling on my smartphone|my iphone battery died|install the mobile app|screen cracked on my phone|call me on my cell|social media all day|android update on my device|wifi on my phone', 'my phone battery is dead|send it to my mobile'),
 '🤖': ('robot in the factory|artificial intelligence is everywhere|a chatbot answered me|machine learning model|claude and chatgpt|automation of the job|training a neural network|agents doing the work|android from a sci fi movie|llm wrote this', 'an ai model wrote the report|the robots are coming'),
 '🐛': ('found a bug in the code|the app crashes again|software error in production|fixing an issue all day|caterpillar on a leaf|insect in my salad|a glitch in the system|debugging a crash|worm in the apple|tests are failing', 'there is a bug in my soup|another crash in production'),
 '🔒': ('forgot my password|account security|locked the door|privacy and encryption|two factor login|keep this secret|hackers stole the data|safe and secure|the key to the lock|vpn for protection', 'someone hacked my account|please reset my password'),
 '😂': ('that joke made me laugh|so funny i cried|hilarious video|lol this is great|laughing out loud|the funniest meme ever|comedy night was brilliant|i cannot stop laughing|what a ridiculous joke|haha you got me', 'this meme is hilarious|we laughed all night'),
 '😭': ('i am so sad|crying all night|i miss her so much|heartbroken after the news|tears on my face|worst day of my life|my dog passed away|i feel terrible and alone|so depressed today|sobbing at the movie', 'i cried at the end of the film|i feel so sad today'),
 '😡': ('i am so angry|this makes me furious|stop yelling at me|what a rude waiter|i hate this company|mad at my brother|outraged by the decision|absolutely livid|so annoyed right now|complaint about terrible service', 'this is outrageous and i am furious|that guy made me so mad'),
 '😍': ('i am in love with this|absolutely adore her|so beautiful and perfect|what a gorgeous view|obsessed with this song|crush on my neighbour|love at first sight|that dress is stunning|i adore this place|heart eyes for that puppy', 'i am obsessed with these shoes|this place is gorgeous'),
 '😴': ('so tired today|need a nap|going to bed early|i slept all day|sleepy after lunch|good night everyone|exhausted after work|cannot keep my eyes open|deep sleep on the sofa|boring lecture put me to sleep', 'i need some sleep|time for bed i am exhausted'),
 '⚽': ('football match tonight|scored a goal|soccer with friends|world cup final|champions league game|the referee gave a penalty|my team won the derby|playing five a side|inter against milan|striker missed the shot', 'we won the match two nil|watching the soccer final'),
 '🏃': ('morning run in the park|training for a marathon|jogging before work|running five kilometres|new running shoes|sprint at the finish line|half marathon on sunday|cardio and jogging|i ran ten miles|late so i had to run', 'i went for a long run|marathon training starts today'),
 '🏋️': ('gym session today|lifting heavy weights|leg day at the gym|bench press record|personal trainer workout|building muscle|deadlift and squats|strength training tonight|protein after the workout|dumbbells in my garage', 'heavy lifting at the gym|i did a hard workout today'),
 '🩺': ('doctor appointment|visit to the hospital|the nurse checked me|medical exam results|i feel sick|flu and fever|health check this week|surgeon explained the operation|clinic was full|my blood pressure', 'i have to see my doctor|the hospital called me today'),
 '💊': ('take your medicine|painkillers for my headache|a pill every morning|prescription from the pharmacy|antibiotics for a week|vitamins and supplements|the drug has side effects|aspirin for the pain|dose twice a day|pharmacist gave me tablets', 'i forgot to take my pills|the pharmacy has my prescription'),
 '🌧️': ('rain all day|it is pouring outside|forgot my umbrella|storm clouds coming|wet and grey weather|heavy showers tonight|soaked by the rain|a rainy morning|drizzle on the window|thunder and rain', 'it has not stopped raining|i got wet in the storm'),
 '☀️': ('sunny day in milan|what lovely weather|hot and bright outside|sunshine all week|clear blue sky|summer heat today|sun is shining|good morning sunshine|warm sunny afternoon|sunglasses weather', 'such a bright and sunny morning|the sun is finally out'),
 '🌱': ('planting seeds in the garden|new growth in spring|green plants on my balcony|gardening this weekend|sustainable and eco friendly|a small seedling|growing my own herbs|climate and nature|organic farm visit|watering the plants', 'my garden is growing fast|i planted some seeds today'),
 '🐶': ('walking my dog|new puppy at home|the dog barks all day|golden retriever in the park|my pup needs a bath|dog food and treats|the vet saw my dog|good boy fetch the ball|labrador on the sofa|a loyal hound', 'my puppy chewed my shoes|taking the dog for a walk'),
 '🐱': ('my cat sleeps all day|new kitten at home|the cat knocked it over|purring on my lap|feeding the cats|tabby in the window|cat litter and toys|meow from the kitchen|whiskers and paws|a stray kitten', 'my cat scratched the sofa|this kitten purrs all day'),
 '🎬': ('watching a movie tonight|new film at the cinema|netflix and popcorn|the director won an oscar|great series on tv|trailer for the sequel|actors on the set|film festival in venice|binge watching a show|best movie of the year', 'that film was brilliant|lets go to the cinema'),
 '🎵': ('listening to music|my favourite song|concert on saturday|a new album came out|playing guitar|spotify playlist for work|singing in the shower|the band played live|headphones and a good tune|piano lesson today', 'this song is stuck in my head|the concert was amazing'),
 '🎮': ('playing video games|new console at home|gaming all night|beat the final boss|nintendo with my kids|online game with friends|playstation controller|steam sale this week|minecraft and fortnite|level up my character', 'i finally beat that game|gaming with my friends tonight'),
 '🎨': ('painting a landscape|art exhibition at the museum|drawing in my sketchbook|colours on the canvas|graphic design project|artist at work|watercolour class|brushes and paint|creative illustration|gallery opening', 'i love this painting|my art class starts today'),
 '📷': ('taking photos of the city|new camera lens|photography walk|selfie with friends|the picture came out great|instagram shot|portrait session|photographer at the wedding|snapshots from the trip|film camera and flash', 'look at this photo i took|i bought a new camera'),
 '🎉': ('we won the prize|party tonight|congratulations to you both|celebrating the launch|new year celebration|so happy we did it|confetti everywhere|great news everyone|cheers to success|a big celebration', 'we got the deal lets celebrate|congratulations on the promotion'),
 '🎂': ('happy birthday to you|my birthday is tomorrow|blowing out the candles|turning thirty today|birthday party at home|a cake with candles|gift for her birthday|anniversary of my birth|another year older|surprise birthday', 'it is my birthday today|she turns forty on friday'),
 '❤️': ('love you so much|my dear wife|thank you with all my heart|romantic dinner|valentine for my husband|you mean everything|family and love|sweet kind words|together forever|caring for each other', 'i love you very much|my heart belongs to you'),
 '🏠': ('moving to a new house|cleaning my home|rent for the apartment|mortgage and a new kitchen|staying at home|back home at last|living room renovation|landlord raised the rent|a flat in milan|building our house', 'we bought a new house|i am finally home'),
 '👶': ('we are having a baby|newborn in the family|pregnant with twins|changing diapers all night|my toddler started walking|baby shower on sunday|the kid is crying|nursery for my daughter|first words of my son|parents of a little child', 'our baby was born today|my toddler will not sleep'),
}
EMOJI = list(DATI)
NEUTRE = ['i love {}', 'talking about {}', 'all about {}', '{} today', 'so much {}', 'this {} is great', 'thinking of {}', 'we had {}', 'my {}', '{} again', 'a lot of {}', '{}']
parole = lambda t: re.findall(r"[a-z0-9]+", t.lower())[:MAX_PAROLE]

# --- Dati
cartella = sys.argv[1]
os.makedirs(cartella, exist_ok=True)
p_xml = os.path.join(cartella, 'en.xml')
if not os.path.exists(p_xml):
    urllib.request.urlretrieve('https://raw.githubusercontent.com/unicode-org/cldr/main/common/annotations/en.xml', p_xml)
p_vett = os.path.join(cartella, 'glove-wiki-gigaword-50.gz')
if not os.path.exists(p_vett):
    urllib.request.urlretrieve('https://github.com/RaRe-Technologies/gensim-data/releases/download/glove-wiki-gigaword-50/glove-wiki-gigaword-50.gz', p_vett)
xml = open(p_xml, encoding='utf-8').read()
def chiavi(e):
    m = re.search(r'<annotation cp="%s">([^<]*)</annotation>' % re.escape(e.replace('️', '')), xml)
    assert m, e
    return [k.strip().replace('&amp;', 'and') for k in m.group(1).split('|') if k.strip() not in ('face', 'smile', 'object')]
allena, cal, prova = [], [], []
for k, e in enumerate(EMOJI):
    frasi, a_mano = DATI[e]
    for f in frasi.split('|'):
        allena += [(f, k)] * 4
    for c in chiavi(e):
        for m in NEUTRE:
            allena.append((m.format(c), k))
    a, b = a_mano.split('|')
    cal.append((a, k)); prova.append((b, k))

# I vettori: le parole più comuni, più quelle degli esempi di allenamento. Il file è ordinato per frequenza
serve = {w for f, _ in allena for w in parole(f)}
voc, righe = [], []
with gzip.open(p_vett, 'rt', encoding='utf-8') as f:
    f.readline()
    for n, r in enumerate(f):
        w, _, resto = r.partition(' ')
        if not re.fullmatch(r'[a-z0-9]+', w) or (len(voc) >= N_PAROLE and w not in serve):
            continue
        voc.append(w); righe.append(np.fromstring(resto, sep=' ', dtype=np.float32))
# In numeri da -127 a 127: bastano per un vettore, e il file pesa un quarto
Q = (np.clip(np.stack(righe) / MAX_V, -1, 1) * 127).round().astype('<i1')
V = torch.from_numpy(Q.astype(np.float32) / 127 * MAX_V)
indice = {w: i for i, w in enumerate(voc)}
print('emoji', len(EMOJI), 'esempi', len(allena), 'parole', len(voc), 'mancano', len(serve - set(voc)), flush=True)

# Per ogni parola degli esempi, le parole più vicine: in allenamento a volte la sostituiscono
U = F.normalize(V, dim=1)
presenti = sorted(indice[w] for w in serve if w in indice)
vicine = {i: U[:N_PAROLE].mv(U[i]).topk(6).indices.tolist()[1:] for i in presenti}

class Encoder(nn.Module):
    def __init__(s):
        super().__init__()
        s.proj, s.pos = nn.Linear(VDIM, DIM), nn.Embedding(POS, DIM)
        nn.init.normal_(s.pos.weight, std=0.02)
        s.n1, s.qkv, s.fuori, s.n2, s.f1, s.f2, s.testa = nn.LayerNorm(DIM), nn.Linear(DIM, DIM * 3), nn.Linear(DIM, DIM), nn.LayerNorm(DIM), nn.Linear(DIM, DIM * 2), nn.Linear(DIM * 2, DIM), nn.Linear(DIM, len(EMOJI))
    def forward(s, idx, maschera, drop=0.0):
        B, L = maschera.shape
        x = s.proj(V[idx]) + s.pos(torch.arange(L))
        q, k, v = s.qkv(s.n1(x)).chunk(3, -1)
        fa = lambda t: t.view(B, L, TESTE, DIM // TESTE).transpose(1, 2)
        pesi = fa(q) @ fa(k).transpose(-1, -2) / math.sqrt(DIM / TESTE)
        pesi = pesi.masked_fill(~maschera[:, None, None, :], -1e9).softmax(-1)
        x = x + F.dropout(s.fuori((pesi @ fa(v)).transpose(1, 2).reshape(B, L, DIM)), drop, s.training)
        x = x + F.dropout(s.f2(F.relu(s.f1(s.n2(x)))), drop, s.training)
        m = maschera[:, :, None].float()
        return s.testa((x * m).sum(1) / m.sum(1).clamp(min=1))

# Le parole fuori dal vocabolario non contano
def lotto(liste):
    liste = [l or [0] for l in liste]
    L = max(map(len, liste))
    idx, masc = torch.zeros(len(liste), L, dtype=torch.long), torch.zeros(len(liste), L, dtype=torch.bool)
    for b, l in enumerate(liste):
        idx[b, :len(l)] = torch.tensor(l); masc[b, :len(l)] = True
    return idx, masc
numeri = lambda t: [indice[w] for w in parole(t) if w in indice]

rete = Encoder()
print('pesi della rete', sum(p.numel() for p in rete.parameters()), flush=True)
EPOCHE, GRUPPO = 40, 64
opt = torch.optim.AdamW(rete.parameters(), 3e-3, weight_decay=1e-3)
piano = torch.optim.lr_scheduler.OneCycleLR(opt, 3e-3, total_steps=EPOCHE * (len(allena) // GRUPPO))
def varia(t):
    l = numeri(t)
    # Toglie o scambia parole a caso: la rete non deve dipendere da una sola parola, e impara anche dai sinonimi
    if len(l) > 2: l = [x for x in l if random.random() > 0.1] or l
    return [random.choice(vicine[x]) if x in vicine and random.random() < 0.2 else x for x in l]
for ep in range(EPOCHE):
    rete.train(); random.shuffle(allena); somma = 0
    for i in range(len(allena) // GRUPPO):
        q = allena[i * GRUPPO:(i + 1) * GRUPPO]
        # Un sesto del gruppo sono parole a caso: lì la risposta giusta è non essere sicuri
        rumore = [[random.randrange(3000) for _ in range(random.randint(1, 4))] for _ in range(GRUPPO // 6)]
        o = rete(*lotto([varia(t) for t, _ in q] + rumore), drop=0.1)
        err = F.cross_entropy(o[:GRUPPO], torch.tensor([k for _, k in q]), label_smoothing=0.05) - 0.5 * F.log_softmax(o[GRUPPO:], -1).mean()
        opt.zero_grad(); err.backward(); opt.step(); piano.step(); somma += err.item()
    if (ep + 1) % 10 == 0: print(f'epoca {ep + 1}/{EPOCHE} errore {somma / (len(allena) // GRUPPO):.3f}', flush=True)

# --- Pesi in numeri interi, per un file più piccolo: la prova usa già questi
rete.eval()
with torch.no_grad():
    for p in rete.parameters():
        p.copy_((p * SCALA).round().clamp(-32768, 32767) / SCALA)
os.makedirs('public/learn', exist_ok=True)
np.concatenate([(p.detach().numpy().ravel() * SCALA).round().astype('<i2') for p in rete.parameters()]).tofile('public/learn/emoji.bin')
Q.tofile('public/learn/emoji-vettori.bin')
open('public/learn/emoji-parole.txt', 'w', encoding='utf-8', newline='\n').write('\n'.join(voc))

@torch.no_grad()
def logit(testi): return rete(*lotto([numeri(t) for t in testi]))
Lc, yc = logit([t for t, _ in cal]), torch.tensor([k for _, k in cal])
TEMP = min((F.cross_entropy(Lc / T, yc).item(), T) for T in np.arange(0.4, 6, 0.05))[1]
Lp, yp = logit([t for t, _ in prova]), [k for _, k in prova]
P = (Lp / TEMP).softmax(-1)
pr, sc = P.max(-1)
giuste = sum(int(sc[i]) == yp[i] for i in range(len(yp)))
top3 = sum(yp[i] in P[i].topk(3).indices.tolist() for i in range(len(yp)))
casi = [{'t': t, 'y': k, 's': int(sc[i]), 'p': round(float(pr[i]), 3)} for i, (t, k) in enumerate(prova)]
json.dump({'emoji': EMOJI, 'temperatura': round(float(TEMP), 2), 'casi': casi}, open('public/learn/emoji.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('temperatura', round(float(TEMP), 2), 'vettori KB', Q.size // 1024)
print(f'prova: giuste {giuste}/{len(yp)}, tra le prime tre {top3}/{len(yp)}')
if len(sys.argv) > 2:
    L = json.load(open(sys.argv[2], encoding='utf-8'))
    Q2 = (logit([t for t, _ in L]) / TEMP).softmax(-1)
    g = sum(int(Q2[i].argmax()) // 5 == c for i, (_, c) in enumerate(L))
    t3 = sum(any(x // 5 == c for x in Q2[i].topk(3).indices.tolist()) for i, (_, c) in enumerate(L))
    print(f'frasi libere: categoria giusta {g}/{len(L)}, tra le prime tre {t3}/{len(L)}')
    print('sbagliate', [(t, EMOJI[int(Q2[i].argmax())]) for i, (t, c) in enumerate(L) if int(Q2[i].argmax()) // 5 != c])
for t in ['pizza night with friends', "i'm starving", 'late flight to tokyo', 'my puppy chewed my shoes', 'a bug in my soup', 'my cat hates the rain', 'banana mountain', 'xqzt wvvk']:
    v = (logit([t]) / TEMP).softmax(-1)[0]
    print(t, [(EMOJI[i], round(float(v[i]), 3)) for i in v.topk(3).indices.tolist()])
