---
# Modello per una nota di Knowledge. Copialo in src/content/scritti/reading-<nome>.md.
# Sta fuori da scritti/, quindi non viene pubblicato.
title: Titolo breve, con la tesi se c'è
date: 2026-01-31
kind: source            # essay, thought o source
lang: en                # it o en
topics: [llms]          # lista chiusa in src/content.config.ts. Aggiungi defining se è fra i paper e le notizie più influenti
summary: Una o due frasi con la tesi. È il testo che appare nelle liste e nelle anteprime.
sources:
  - type: paper         # paper, video, site, book, talk, podcast, repo
    title: Titolo della fonte
    author: Autore, anno
    url: https://example.com
    role: main          # main in cima al testo; secondary nella lista in fondo
draft: true             # togli quando la nota è pronta
---

## What it is

Due o tre frasi: cos'è e chi l'ha fatto.

## What I take from it

**Prima idea.** Perché conta, con un fatto o un numero.

**Seconda idea.** Una o due idee in più, non di più.

<!--
Domande per finire la nota in una volta. Rispondi e cancella questo blocco:
1. Cosa ti ha fatto cambiare idea, se qualcosa?
2. Dove lo hai applicato o lo applicheresti?
3. È fra i paper o le notizie più influenti (#defining)?
-->
