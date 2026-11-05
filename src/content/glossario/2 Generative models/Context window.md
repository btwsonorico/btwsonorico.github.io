---
title: "Context window"
id: context-window
order: 10
level: medium
group: "Building blocks"
question: "What is the context window?"
answers:
  - "The text a model can consider at once"
  - "The size of the chat box on screen"
  - "The time a session stays open"
---
The context window refers to the entirety of the amount of text a language model can look back on and reference when generating new text plus the new text it generates. This is different from the large corpus of data the language model was trained on and instead represents a “working memory” for the model (Anthropic).

- A larger context window allows the model to understand and respond to more complex and lengthy prompts, while a smaller context window may limit the model’s ability to handle longer prompts or maintain coherence over extended conversations (Anthropic).
- If a conversation or document exceeds the context window, the model “forgets” about the beginning of the input.
- Recent advancements in modern models have allowed increasingly larger context windows, allowing models to process thousands of pages of text, entire codebases or long videos in a single prompt. While this allows for more “freedom”, it is important to remember that larger context windows also increase computational costs and latency.
