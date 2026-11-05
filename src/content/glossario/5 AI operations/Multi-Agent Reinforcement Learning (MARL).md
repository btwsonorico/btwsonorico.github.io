---
title: "Multi-Agent Reinforcement Learning (MARL)"
id: multi-agent-reinforcement-learning-marl
order: 6
level: hard
group: "Agents and orchestration"
question: "Why is MARL harder than single-agent learning?"
answers:
  - "Each agent changes what the others face"
  - "Each agent needs its own labeled dataset"
  - "Each agent must use a different language"
---
Reinforcement learning with several agents that learn at the same time. Each agent changes the environment of the others, so what worked yesterday may stop working today. This makes training less stable than with a single agent.
