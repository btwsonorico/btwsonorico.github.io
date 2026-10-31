---
title: Prompt engineering
summary: "Prompts as versioned files, with a hash saved next to every output."
order: 2
skill: "ai-engineering"
stack: ["python", "llm-api"]
contexts: ["interview analysis", "event reports"]
related: ["reading-harness2"]
---

- **Prompts live in files, never in code.** Each system and user prompt is a separate, reviewable file.
- **Every output knows its prompt.** A content hash of the prompt is saved with each result; a version number invalidates stale cached outputs.
- **Defensive parsing.** JSON answers are validated and retried; templates use explicit markers instead of string formatting.
- **Curated prompt catalogue** of reusable section prompts, with automatic tests that check the prompts stay consistent with each other.
