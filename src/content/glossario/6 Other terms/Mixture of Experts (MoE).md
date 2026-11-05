---
title: "Mixture of Experts (MoE)"
id: mixture-of-experts-moe
order: 4
level: hard
group: "Efficiency"
question: "What does a mixture of experts do?"
answers:
  - "Runs only part of the model per token"
  - "Asks human experts to check each answer"
  - "Merges models made by several companies"
---
MoE is an architecture that divides a large language model into a series of experts, which are specialized neural subnetworks (there can be hundreds). A routing mechanism activates the experts needed for a specific task. A merge process then combines the output of the active experts into a single representation that continues through the rest of the model. This is a very efficient way to scale model size without a proportional increase in compute costs, because only the necessary experts are activated, using only a fraction of the total parameters.
