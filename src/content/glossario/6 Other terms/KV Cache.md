---
title: "KV Cache"
id: kv-cache
order: 5
level: hard
group: "Efficiency"
question: "What does the KV cache avoid?"
answers:
  - "Repeating work on earlier tokens"
  - "Downloading the weights each time"
  - "Sending the prompt over the network"
---
Memory that stores the keys and values a transformer has already calculated for earlier tokens. With it, each new token does not repeat that work, so generation is much faster. It uses a lot of memory on long contexts.
