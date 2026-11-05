---
title: "Model Abliteration"
id: model-abliteration
order: 8
level: hard
group: "Model internals"
question: "What does model abliteration remove?"
answers:
  - "A model's safety refusals"
  - "A model's training data"
  - "A model's memory limit"
---
LLMs ship with safety alignment, which means they refuse certain prompts. The technique to remove this safety is called “Abliteration”. Abliteration consists in finding the "refusal" direction inside the model weights and mathematically erasing it.

- This works by feeding the model a set of harmful and harmless prompts (e.g. 400 good and 400 bad) -> the abliteration happens by understanding where the "refusal" lives in the weights then find the best removal patterns through optimized algorithms (Bayesian optimization)
- Before – Slow, inconsistent, required deep ML knowledge
- Now – Frameworks exist to do this automatically with a single command (Heretic is an example, but others exist)
