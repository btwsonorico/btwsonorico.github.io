# TODO — decisioni aperte

- **Aprire il sito a motori di ricerca e AI.** Oggi il sito chiede di non essere indicizzato (`INDICIZZABILE = false` in `src/lib/sito.ts`). Quando il contenuto è finale: mettere `true`, poi registrare il sito su Google Search Console e inviare la sitemap. Decide: Riccardo.
- **Statistiche delle visite.** Scelta: Cloudflare Web Analytics (gratis, senza cookie). Serve il token del sito, da creare nell'account Cloudflare. Decide e crea l'account: Riccardo.
- **Scena «via Trieste 10, Mozzate» (sospesa).** Idea: la zona intorno alla casa in wireframe 3D, vista dall'alto, in misc (pubblica). Fatto finora:
  - Dati da OpenStreetMap: Nominatim trova la via ma non il civico 10. Su Overpass ci sono gli edifici con i numeri 11 e 13, all'estremità sud della via (circa 45.6775, 8.9568).
  - Edificio scelto come civico 10 (stima): way OSM `744558504`, sul lato opposto della via rispetto all'11, a 26 m.
  - In un raggio di 300 m: 244 edifici, 87 strade, 189 alberi, ferrovia, siepi, un torrente (circa 53 KB di JSON compatto in metri). Il file non è nel repo: si rigenera con una query Overpass (`building`, `highway`, `landuse`, `natural`, `leisure`, `waterway`, `railway`, `barrier`, alberi) intorno a quel punto.
  - Da fare: confermare l'edificio giusto, poi la scena (edifici estrusi a filo, strade a doppia linea, alberi, treno e auto lente). Decide: Riccardo.
- **Link al CV.** Manca il PDF aggiornato. Quando c'è, si aggiunge accanto a email, github e linkedin. Decide e fornisce il file: Riccardo.
- **Glossario: come visualizzarlo.** Oggi è il reef da pesca in `/learn/ai-terms/`; i dati stanno in `src/data/glossario.json`. La scena «wires» è stata tolta: il codice resta nel commit `64e9e5a` (`src/scripts/cavi.ts`). Decide se recuperarla: Riccardo.
- **Glossario: bozze da rivedere.** 25 definizioni sono bozze scritte da Claude e già online: i 13 termini che erano senza testo, più Neural Network, Deep Learning, Reinforcement Learning, Overfitting, Embedding, Latent Space, Transformer, Attention, Fine-tuning, Prompt Injection, Temperature, Inference. Rivede: Riccardo.
- **Sito in italiano e in inglese.** Quando il contenuto è finale: una versione per lingua, con un comando per passare dall'una all'altra. Decide i testi italiani: Riccardo.
- **Informazioni nel grafico a destra.** Valutare se mostrare direttamente nel grafico a destra alcune informazioni che oggi stanno nelle sottopagine. Decide quali e come: Riccardo.
- **Nuvole della valle.** Tolte per ora in Learn: per rimetterle basta `CON_NUVOLE = true` in `src/scripts/nuvole.ts`. Decide se e come riprenderle: Riccardo.
- **Learn: pagine future.** Ordine: neural network, reinforcement learning, un piccolo transformer (da fare), diffusion, decision, AI terms sempre in fondo. Decide: Riccardo.
