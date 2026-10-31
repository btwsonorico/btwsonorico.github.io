---
title: Refusal lives in one direction
date: 2026-10-25
kind: source
lang: en
topics: [open]
summary: Remove one direction and an open model stops saying no. Good for research, alignment included; dangerous in the wrong hands.
sources:
  - type: paper
    title: Refusal in language models is mediated by a single direction
    author: Arditi et al., 2024
    url: https://arxiv.org/abs/2406.11717
    role: main
---

## What it is

The authors study 13 open chat models, up to 72B parameters. In each one, refusing a harmful request depends on a single direction in the activations. Remove it and the model stops refusing; add it and the model refuses even harmless requests. From this they build a jailbreak that keeps the model's other capabilities. Their conclusion: safety fine-tuning is fragile.

## What I take from it

**The same idea as the [assistant axis](/knowledge/reading-assistant-axis/).** There, a direction is used to control the model's persona. Here, the direction that corresponds to refusal is modified.

**Why the model then answers.** Safety training taught the model to refuse by activating this direction. Remove it, and the model answers the request: the capabilities were there all along. This is a jailbreak of the model's capabilities, and a way to get an unrestricted model without training it again (the technique is known as abliteration).

**A delicate topic, with two sides.**

- **For open source:** people should have access to unrestricted models to do research, alignment research included.
- **Against:** the same access lets bad actors do anything.

**Not only language models.** The same logic can apply to diffusion models, the ones that generate images and video: research has shown that concepts can be erased from them, and brought back.

**What is not possible yet.** Today this works only where you have the weights. Hacking the weights of a closed model is too hard to discuss for now, but it may become possible in the future.

## Where it is weak

- **Thirteen models of 2024.** Newer models may spread refusal over more than one direction.
- **Removing refusal is not free.** It can change other behaviours in ways that are hard to see.
