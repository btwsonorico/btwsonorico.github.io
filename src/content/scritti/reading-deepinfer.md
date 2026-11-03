---
title: DeepInfer, the engine behind DeepSeek
date: 2026-10-24
kind: source
lang: en
topics: [open]
summary: DeepSeek gives away how it serves its own model. The real topic is cost, and a bid to become the standard open model.
sources:
  - type: repo
    title: "DeepInfer: high-performance, large-scale inference framework for DeepSeek models"
    author: DeepSeek, 2026
    url: https://github.com/deepseek-ai/DeepInfer
    role: main
  - type: repo
    title: "DwarfStar (ds4): local inference engine for DeepSeek V4 Flash"
    author: Salvatore Sanfilippo, 2026
    url: https://github.com/antirez/ds4
    role: secondary
---

## What it is

On 20 October 2026 DeepSeek open-sourced DeepInfer, the engine it uses to serve its models in production (Apache 2.0). It is built mainly on vLLM. This first release is narrow: one model (DeepSeek-V4.1-Flash), two chips (NVIDIA Blackwell and Huawei Ascend 950), offline inference only. The KV cache system and the split between prefill and decode are not included.

## What I take from it

**This is about real democratisation, and the lever is cost.** With the engine in the open, other countries, data centers and cloud providers can serve DeepSeek at a lower cost, with high margins on every GPU tuned for this one model.

**DeepSeek is giving away its bread and butter**: not only the weights, but how the model runs inside their own infrastructure. I read two goals in this:

1. **Become the standard.** The cheapest model to serve is the easiest one for the rest of the world, the West included, to adopt.
2. **Lead among Chinese models.** Not only good, but the best positioned to be used outside China.

**Two paths, one model.** Projects like Salvatore Sanfilippo's DwarfStar make DeepSeek run on a local machine. DeepInfer covers the other end: data centers that batch requests from many users, the way chat services do.

**It widens the gap with closed models.** For DeepSeek we now know, better than for any proprietary model, what works and what the margins on GPU use are.

## What to watch

How many other players, open and closed, will follow this example and publish how they serve their models.
