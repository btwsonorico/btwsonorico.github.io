---
title: Measurement and telemetry
summary: "Numbers, never content. AI cost measured from tokens, not estimated."
order: 11
skill: "backend"
stack: ["python", "mongodb"]
contexts: ["shared specs", "event reports", "interview analysis"]
related: ["reading-cognitive-debt"]
---

- **A common event schema**: only numbers and labels, never user content; telemetry never blocks the user's action.
- **AI cost from real token counts**, logged per call.
- **How much of the AI text people change**, measured with a word-level diff between AI draft and final text.
