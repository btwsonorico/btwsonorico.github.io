---
title: "Vector Database"
id: vector-database
order: 10
level: hard
group: "Interfaces and data"
question: "What does a vector database store?"
answers:
  - "Numbers that capture meaning"
  - "Raw files in their full format"
  - "Passwords and access tokens"
---
A vector database does not store raw data such as files or text blobs. An embedding model converts this data into a vector.

- A vector is essentially a long list of numbers that captures the semantic meaning of the content.
- In a vector database, searches run as mathematical operations that look for embedding vectors close to each other. This translates into finding semantically similar content, by finding the nearest vectors in the embedding space.
