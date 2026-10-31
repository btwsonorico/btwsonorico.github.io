---
title: LLM evaluation
summary: "Checking AI work against human work, and comparing models."
order: 3
skill: "ai-engineering"
stack: ["python", "scikit-learn", "llm-api"]
contexts: ["interview analysis", "event reports"]
related: ["reading-jagged-frontier"]
---

- **Human vs AI codebook.** Agreement measured with Cohen's kappa, MCC, precision, recall and F1, and clustering metrics (ARI, NMI, V-measure).
- **Two alignment methods**, one derived from the data and one LLM-as-judge as a cross-check. An embedding-based method was dropped because it was not valid.
- **Content checks**: duplicate codes, evidence that does not match its passage, citation coverage.
- **Multi-provider benchmark** of the same generation task across closed and open models.
