---
title: "Machine Learning (ML)"
id: machine-learning-ml
order: 2
level: easy
group: "Foundations"
question: "What makes machine learning different from classic programming?"
answers:
  - "It learns patterns from data"
  - "It follows hand-written rules"
  - "It searches a fixed database"
---
A branch of Artificial Intelligence (AI) and computer science that focuses on the use of data and algorithms to imitate the way that a human learns, gradually improving the accuracy of the system (IBM). ML capabilities are categorized into two distinct phases:

Different learning paradigms exist when discussing Machine Learning:

Example: a significant example of the potential of Reinforcement Learning is Google DeepMind’s AlphaGo, which in 2016 was able to achieve a historical victory against the 18-time world champion Lee Sedol, proving the capability of AI to address environments with vast search spaces, generalizing knowledge from raw data and exceeding human performance. The RL architecture used for AlphaGo has since been adapted for scientific problems, such as protein folding, which was solved through AlphaFold.

- Training: The computationally intensive phase of learning patterns from data (e.g. pictures)
- Inference: The operational phase of applying those learned patterns to live, real-world data to make predictions.
- Supervised learning: It is characterized by the use of labeled datasets to train algorithms. In this approach, the machine is provided with input data, and the correct output. The model learns by comparing its generated output to this provided “ground truth” and adjusting its internal weights to reduce the discrepancy. For this reason, the success of supervised learning is strictly linked to the quality of the data labels. This creates a significant operational burden: organizations must not only collect data, but also curate and annotate it, often requiring human expertise.
- Unsupervised learning: It is characterized by the use of unlabeled data. In this paradigm, the algorithm is not provided with the correct answer or targets. Instead, it is tasked with processing raw data to discover hidden patterns, structures, or groupings without human intervention. Since labeling data is expensive and time consuming, unsupervised learning offers a path to insight that scales more effectively with raw data volumes.
- Reinforcement learning (RL): A machine learning paradigm where algorithms learn to make decisions by interacting with the environment and receiving feedback in the form of rewards or penalties. There is no fixed dataset of “correct” answers, instead the process is dynamic: the algorithm observes the current state of the environment, and chooses an action based on its current strategy. The environment provides feedback based on the outcome of the action, and the algorithm updates its strategy to maximize future rewards.
- Reinforcement Learning from Human Feedback (RLHF): A reinforcement learning paradigm where the model rewards are aligned with human values. This is a critical step in training Large Language Models, as positive rewards are tied to generating helpful, safe and coherent responses
- Deep Learning: DL is a subfield of machine learning which uses multi-layered artificial neural networks to learn from data. While traditional machine learning often requires manual feature extraction, deep learning automates this by learning a hierarchy of features.
- Input layer – receives raw pixel data
- Hidden layers – the initial layers might detect simple edges. The middle layer detects shapes. The deeper layers recognize complex objects
- Output layer – delivers the final classification
- The ability to automatically learn hierarchical representations of data is what powers modern AI models, such as LLMs and Computer Vision. Deep learning is notoriously data-hungry and computationally expensive. Furthermore, they are described as “black boxes” because the internal decision-making process within the deep layers is difficult for humans to interpret.
