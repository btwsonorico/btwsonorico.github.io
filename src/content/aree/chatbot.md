---
title: Conversational revision
summary: "A chat on one section of a document: the model proposes, the text changes only when the person accepts."
order: 5
skill: "human-ai"
stack: ["react", "fastapi", "llm-api"]
contexts: ["event reports", "interview analysis"]
related: ["reading-assistant-axis"]
---

- **Scoped chat.** The conversation is about one section, not the whole document.
- **Propose, then accept.** The model's proposal is shown next to the current text; nothing changes until "Accept".
- **Nothing is lost.** Old conversations are archived, not deleted, and a conversation has a fixed maximum length.
- **Reuse over rebuild.** Where an existing chat interface was enough, the tool exposed its data to it instead of building a new chat.
