---
title: Mixture of experts, or how to be huge and cheap
date: 2026-10-24
kind: source
lang: en
topics: [open, llms]
summary: Total parameters set the memory you need, active parameters set the cost of each token. The architecture behind trillion-parameter open models.
sources:
  - type: paper
    title: "Outrageously large neural networks: the sparsely-gated mixture-of-experts layer"
    author: Shazeer et al., 2017
    url: https://arxiv.org/abs/1701.06538
    role: main
  - type: paper
    title: "DeepSeekMoE: towards ultimate expert specialization in mixture-of-experts language models"
    author: Dai et al., 2024
    url: https://arxiv.org/abs/2401.06066
    role: main
  - type: site
    title: "Kimi K3.1 Pro tech blog: advancing open intelligence"
    author: Moonshot AI, 2026
    url: https://www.kimi.ai/blog/kimi-k3-1-pro
    role: secondary
---

## What it is

In a mixture-of-experts model, the feed-forward block of each layer is split into many smaller networks, the "experts". For every token, a router picks a few of them; the others stay idle. Attention is still shared by all tokens.

## What I take from it

**The experts are not experts.** They are not specialists in law or biology. They are sections of the model's weights, and the router learns which sections fit which kind of token. The specialisation is about patterns in the text, not about subjects.

**Two numbers, two costs.**

- **Total parameters set the memory you need.** All the experts must be loaded, even if a token uses only a few.
- **Active parameters set the compute per token.** Fewer active parameters, lower cost.

The router changes the choice token by token, so the model keeps most of its skills with far fewer activations.

**Monstrously large models, small activations.** Open models now publish both numbers, and they are getting close to 3 trillion parameters:

| Model | Total | Active per token |
|---|---|---|
| Kimi K3.1 Pro (October 2026) | 2.8T | 104B |
| DeepSeek V4-Pro | 1.6T | 49B |
| Kimi K2.6 | 1T | 32B |

Models grow faster than hardware, so activations must stay small for the model to run at all.

**An idea the Chinese labs pushed forward.** Mixture of experts is an old idea, made modern by Google in 2017. The Chinese labs have contributed a lot to it, with publications and open-source projects: many small experts plus a few "shared" ones that every token uses (DeepSeekMoE), load balancing without extra loss terms, and trillion-parameter models released with open weights, papers that explain the recipe and the real numbers on total and active parameters. Today it is the standard architecture of open frontier models.
