---
title: Weight-space programming, or editing a model without training it
date: 2026-11-03
kind: source
lang: en
topics: [research, implications]
summary: GPT-6 Astra reads and writes the weights of other networks from a goal in plain language. One more layer of abstraction, a superhuman ability, and a building block towards recursive self-improvement.
sources:
  - type: paper
    title: "Sparks of Weight-Space Programming: LLMs can natively read & write neural network weights"
    author: Takehi, Teoh, Zhang, Khattab, 2026
    url: https://www.alphaxiv.org/abs/2611.weight-space-programming
    role: main
  - type: site
    title: The authors' post on the paper
    author: Rikiya Takehi, 2026
    url: https://rikiyat.github.io/blog/weight-space-programming/
    role: secondary
draft: true
---

## What it is

Researchers at MIT CSAIL give GPT-6 Astra the weights of other neural networks and a goal in plain language. Astra reads those weights and edits them directly, with no training loop. The authors call this weight-space programming. Some experiments use the weights alone, others add tools, forward passes or attention patterns.

## What I take from it

**One more layer of abstraction.** Programming keeps moving away from the machine, and this is the next step. It is also a strange one: with a sentence, you change the hardest part of a model to work with, its weights. And you do not have to force the model there through training. Astra does it natively.

**A superhuman ability.** For us humans, editing weights by hand is possible only on very small, very simple networks. Astra named the game a policy plays from its 17,253 weights. It named the language of a 7.16M-weight transformer, and its copying heads, from the middle blocks alone. It repaired a car policy that had never succeeded, by editing 3.5% of its weights: 1,024 successes out of 1,024 episodes. And it wrote a Breakout network starting from all zeros, with only the rules and the source code of the game. That network scores about 20 times more than PPO after 500M steps (on Seaquest it stays at about 60% of PPO).

**With activations and without.** The results are interesting from both sides. With the weights alone, Astra can already tell what a network was trained on. Activations give it a better view of what the weights are doing. To find which of two models had been trained to be sycophantic, it failed in all four attempts from the weights alone. When it could ask for attention patterns, it found the sycophant in all three pairs.

**I read it as emergent.** The paper tests only Astra, so it does not prove this. My bet is that this ability is new with the latest frontier models, and that earlier models did not have it.

**Building blocks for recursive self-improvement.** Less need for training. Open, cheaper models improved for specific tasks. Each of these is a block towards a model that modifies itself. I expect that intelligences creating better forms of themselves for specific tasks will arrive soon.

**Hacking the weights.** I would not be surprised if it soon became normal to edit precise weights to add or remove a behaviour: taking away [refusal](/knowledge/reading-refusal-direction/), or making a model perform worse. Getting dangerous behaviour out of a model this way is not hard to imagine.
