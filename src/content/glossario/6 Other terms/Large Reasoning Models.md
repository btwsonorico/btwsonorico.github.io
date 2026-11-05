---
title: "Large Reasoning Models"
id: large-reasoning-models
order: 1
level: hard
group: "Special models"
question: "How do large reasoning models answer?"
answers:
  - "They work through steps first"
  - "They reply from memory alone"
  - "They only retrieve documents"
---
Specialized LLMs that went through reasoning-focused fine-tuning. Unlike normal LLMs, which generate answers immediately, reasoning models are trained to solve problems step by step. This is what agents need to plan complex, multi-step tasks. A reasoning model is trained on problems with verifiably correct answers and, through reinforcement learning, it learns to produce reasoning sequences that lead to correct answers. When the model reasons before generating, it produces an internal chain of thought that breaks the problem down step by step before giving an answer.
