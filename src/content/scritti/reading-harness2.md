---
title: Harness², improving agents without touching the model
date: 2026-10-21
kind: source
lang: en
topics: [open, llms, agents]
summary: Google Research open-sources a loop that rewrites the harness around a fixed model. An open model with a better harness beats a stronger closed one.
sources:
  - type: paper
    title: "Harness²: recursive agent harnessing for an open world"
    author: Xu et al., 2026
    url: https://arxiv.org/abs/2610.14224
    role: main
  - type: repo
    title: harness2
    author: Google Research, 2026
    url: https://github.com/google-research/harness2
    role: secondary
---

Harness² keeps the model weights fixed and edits everything around them: system prompt, guardrails, memory, tool guidance, subagents, skills.

The loop is Propose, Probe, Compose. The agent proposes edits to its harness, tests them on the same task, and combines what worked. It needs no ground-truth answers. A persistent "improvement harness" keeps the adopted changes and the lessons, and reuses them on later tasks.

Reported gains: up to 11.5 points on WorkBuddy-Bench, 4.5 on JobBench, 11.8 percentage points on LAB. In the coverage, the open model GLM-5 with an improved harness beats Gemini 3.5 Flash on its standard harness.

Why it matters for open models: a large part of agent performance sits in the harness, not in the weights. License: Apache 2.0, not an officially supported Google product.
