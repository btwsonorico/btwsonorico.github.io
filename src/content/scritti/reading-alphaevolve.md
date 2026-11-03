---
title: AlphaEvolve
date: 2026-10-25
kind: source
lang: en
topics: [research, agents]
summary: An LLM that rewrites an algorithm's code and keeps what works. A simple idea, already used on Google's infrastructure and on open problems in mathematics.
sources:
  - type: paper
    title: "AlphaEvolve: a coding agent for scientific and algorithmic discovery"
    author: Novikov et al., 2025
    url: https://arxiv.org/abs/2506.13131
    role: main
  - type: site
    title: Mathematical exploration and discovery at scale
    author: Terence Tao, 2025
    url: https://terrytao.wordpress.com/2025/11/05/mathematical-exploration-and-discovery-at-scale/
    role: secondary
---

## What it is

An evolutionary coding agent from Google DeepMind. A pipeline of LLMs edits the code of an algorithm; automatic evaluators score each version; the best versions go to the next round.

## What I take from it

**The evolution of an idea that started with AlphaGo**: solving wider and wider problems. AlphaGo mastered one game. AlphaEvolve is an agent that rewrites the code of an algorithm and improves it over time, round after round, to get better results.

**Real business problems, real impact.** Google has already used it internally on its own infrastructure, with large effects: a better scheduling algorithm for its data centers, which recovers about 0.7% of Google's compute worldwide, a simpler circuit for its accelerators, faster training for the model behind AlphaEvolve itself.

**Mathematics with consequences for hardware.** It found a way to multiply 4×4 complex matrices with 48 multiplications, the first improvement on Strassen's method in this setting in 56 years. Matrix multiplication is what hardware does when it computes, so these results will show up later as progress in technology.

**A simple idea.** In a sense it is a really simple concept, and it is remarkable that it works with the technology we have today.
