---
title: "Latent Space"
id: latent-space
order: 13
level: hard
group: "Building blocks"
question: "Why do image models work in a latent space?"
answers:
  - "It is much smaller than the pixels"
  - "It stores every training image"
  - "It removes the need for training"
---
A compressed space where a model represents its data. Each point stands for a possible input, and nearby points look alike. Many image models run their diffusion steps in latent space because it is far smaller than the pixels.
