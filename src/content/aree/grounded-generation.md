---
title: Grounded generation
summary: "Every claim points to a real passage. Quotes are matched back to the source text."
order: 4
skill: "ai-engineering"
stack: ["python", "llm-api", "mongodb"]
contexts: ["interview analysis", "event reports"]
related: []
---

- **Fuzzy anchoring.** Passages quoted by the model are matched back to the verbatim transcript, with a threshold and overlap deduplication.
- **Cite or stay silent.** Assistant prompts require a citation for every claim and forbid invention.
- **Summaries cite only real passages**: first the ones the researcher marked, then the AI's picks. Export never calls the model.
- **Read-only data API** so an external chat interface can answer on the same evidence.
