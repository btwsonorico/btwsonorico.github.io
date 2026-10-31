---
title: The assistant axis
date: 2026-10-25
kind: source
lang: en
topics: [llms, open]
summary: One direction inside the model measures how much it is "being the assistant". Lock it, and you control behaviour. A glimpse of what access to a model's internals makes possible.
sources:
  - type: paper
    title: "The assistant axis: situating and stabilizing the default persona of language models"
    author: Lu et al., 2026
    url: https://arxiv.org/abs/2601.10387
    role: main
---

## What it is

An Anthropic paper. The authors map the personas a language model can adopt as directions in its activations. The main axis of this space measures how strongly the model is in its default role: the assistant. Steering toward it reinforces helpful, harmless behaviour; steering away makes the model present itself as other entities. Capping the activations along the axis keeps the model stable, even against persona-based jailbreaks.

## What I take from it

**What access to a model's internals makes possible.** The paper is technical, but it shows clearly what you can do when you can read and modulate what happens inside a model.

**A dial from "most assistant" to "least assistant".** Along this direction there are degrees of being an assistant. Moving along it shifts the model's behaviour from the most assistant-like to the least, through a series of personas the authors identify on the way.

**A window into the black box.** It helps to understand what these models actually do inside, even if how they really work remains largely a black box.

**Locking behaviour.** The authors were able to lock the model on this direction and stop it from drifting away. This is a strong result for safety, and also for companies: a model held in a stable role for each function.

**The mirror image of refusal.** [Abliteration](/knowledge/reading-refusal-direction/) finds the refusal direction in open models and removes it, so the model can no longer say no. Here a direction is used the other way: not to remove a behaviour, but to control it. It should be a very relevant idea for the alignment we will need.

## Where it is weak

- **Activations, not weights.** The method acts on the model's internal states while it runs. It needs deep access to the model: something the lab has, and open models allow.
- **One axis is not the whole character.** It explains a main direction, not everything a model can become.
