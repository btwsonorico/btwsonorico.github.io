---
title: "Grounding"
id: grounding
order: 6
level: medium
group: "Reliability"
question: "What does grounding give a model?"
answers:
  - "Trusted facts when it answers"
  - "More data during its training"
  - "Faster chips for its inference"
---
Grounding data is information provided to a language model at inference time to help it generate responses that are more accurate and relevant to a user’s query. This process of “grounding the model” involves supplementing the model with data that was not part of its original training. This data may come from internal or external sources, and it is combined with the user’s query to construct the prompt that is sent to the model during a specific inference call (Microsoft). A “grounded” system often offers the option to cite the sources of its answers, allowing the user to verify its outputs.
