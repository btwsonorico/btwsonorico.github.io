---
title: "Quantization"
id: quantization
order: 7
level: hard
group: "Efficiency"
question: "What does quantization reduce?"
answers:
  - "The bits used for each weight"
  - "The number of possible users"
  - "The length of each prompt"
---
Storing the weights of a model with fewer bits, for example 8 instead of 32. The model takes less memory and runs faster, often with a small loss in quality. It is a common way to run large models on ordinary hardware.
