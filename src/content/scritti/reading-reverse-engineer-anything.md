---
title: Reverse Engineer Anything
date: 2026-10-25
kind: source
lang: en
topics: [open]
summary: A viral repository that lets an agent copy how any software works. If closed code no longer protects anything, software will drift toward open source.
sources:
  - type: repo
    title: "REA: Reverse Engineer Anything"
    author: morluto, 2026
    url: https://github.com/morluto/rea
    role: main
  - type: site
    title: Reverse Engineer Anything project brings AI agents to binary analysis
    author: InfoQ, 2026
    url: https://www.infoq.com/news/2026/10/reverse-engineer-anything/
    role: secondary
---

## What it is

An open-source MCP server (MIT licence). It connects coding agents such as Claude Code and Codex to reverse engineering tools: Ghidra, Hopper, IDA. The agent reads the binary of a program, follows its functions and tests hypotheses on it. Every finding is labelled seen, inferred or unknown, and the tool does not claim to recover the original source.

## What I take from it

**A repository that went viral for a reason.** It lets you copy how any piece of software works. Put inside the right app, it tries to reproduce whole applications.

**A huge problem for copyright.** The implications are very strong for how software is protected today.

**Software will become more and more open source.** If an agent can read the binary, there is no real competitive value left in keeping the code closed. Users will be more and more inclined to use a general-purpose model, plus skills that reproduce the single functions they need, instead of buying the whole product.

**Rewriting is not copying, interfaces are borderline.** Rewriting a piece of software in another language often does not, by itself, infringe copyright. Reproducing an interface in full is a more borderline question.

## Where it is weak

- **The law is not simple.** Copyright protects the expression of code, not what it does. But many licences forbid reverse engineering, and in the EU decompiling is allowed mainly to make programs work together.
- **Reading a binary is not having the product.** Data, servers, network effects and support stay with the original company.
- **Real value is debated.** Some ask what REA adds over an agent that uses Ghidra directly.
