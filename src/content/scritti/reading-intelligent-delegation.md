---
title: Delegation is more than task splitting
date: 2026-10-25
kind: source
lang: en
topics: [hmi, agents]
summary: A cookbook for delegation between humans and AI, in every direction. For companies, eleven task characteristics that say how delegable a task is.
sources:
  - type: paper
    title: Intelligent AI delegation
    author: Tomašev, Franklin, Osindero, 2026
    url: https://arxiv.org/abs/2602.11865
    role: main
---

## What it is

A framework from Google DeepMind. Today, agent systems split tasks with simple rules: they do not adapt when the context changes and they handle failures badly. The paper treats delegation as a sequence of decisions: who does the task, with what authority, under which limits, how the result is checked, and who answers for it.

## What I take from it

**A cookbook for delegation in every direction**: human to human, human to AI, AI to human. The same questions apply whoever delegates and whoever receives the task.

**It prepares for abundant intelligence.** When agents and intelligence are cheap and everywhere, the bottleneck is no longer doing the work but organising it. That needs:

- **logging** of what each agent did,
- **rules, roles and limits**,
- **verification** of the result,
- **trust** in the system, earned over time.

**The most useful part for companies: task characteristics.** The paper describes a task with eleven variables. Together they say how delegable it is, before anyone writes a line of code:

| Characteristic | The question it asks |
|---|---|
| Complexity | How many steps and how much reasoning? |
| Criticality | How bad is a failure? |
| Uncertainty | How ambiguous are inputs and environment? |
| Duration | Seconds or weeks? |
| Cost | Tokens, fees, energy? |
| Resource requirements | Which tools, data, people? |
| Constraints | Which legal, ethical, operational limits? |
| Verifiability | How hard is it to check the result? |
| Reversibility | Can the effects be undone? |
| Contextuality | How much history and context does it need? |
| Subjectivity | Is success a fact or a preference? |

A task that is critical, irreversible and hard to verify should stay with a person, or be delegated only with close monitoring. A task that is cheap, reversible and easy to check is a good first candidate for an agent.
