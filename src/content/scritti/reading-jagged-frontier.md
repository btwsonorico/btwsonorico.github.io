---
title: The jagged frontier
date: 2026-10-25
kind: source
lang: en
topics: [llms, defining]
summary: AI is not a uniform intelligence. The only way to know which side of the frontier a task is on is to experiment, and to ask how verifiable it is.
sources:
  - type: paper
    title: "Navigating the jagged technological frontier: field experimental evidence of the effects of AI on knowledge worker productivity and quality"
    author: Dell'Acqua et al., 2023
    url: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4573321
    role: main
  - type: site
    title: "The three ways professionals work with AI: cyborgs, centaurs and self-automators"
    author: HBS AI Institute
    url: https://aiinstitute.hbs.edu/the-three-ways-professionals-work-with-ai-which-one-are-you/
    role: secondary
---

## What it is

A field experiment with 758 BCG consultants on 18 realistic tasks, with and without GPT-4. Inside the AI frontier they completed 12.2% more tasks, 25.1% faster, with more than 40% higher quality. On a task outside the frontier they were 19 percentage points more likely to be wrong.

<figure class="jagged" aria-label="A jagged line: tasks below it are inside the AI frontier, tasks above it are outside">
<svg viewBox="0 0 640 190" role="img">
  <polyline fill="none" stroke="var(--accent)" stroke-width="1.5" points="0,120 40,95 70,130 110,60 140,105 185,40 215,115 260,85 290,140 335,50 370,95 410,30 445,120 485,70 520,135 560,55 600,100 640,75"/>
  <g fill="var(--fg)">
    <circle cx="60" cy="150" r="4"/><circle cx="150" cy="135" r="4"/><circle cx="240" cy="160" r="4"/><circle cx="410" cy="80" r="4"/><circle cx="560" cy="110" r="4"/>
  </g>
  <g fill="none" stroke="var(--muted)" stroke-width="1.5">
    <circle cx="110" cy="35" r="4"/><circle cx="290" cy="110" r="4"/><circle cx="450" cy="40" r="4"/><circle cx="520" cy="100" r="4"/>
  </g>
  <text x="0" y="16" fill="var(--muted)" font-family="var(--mono)" font-size="11">outside: looks right, is wrong</text>
  <text x="0" y="184" fill="var(--accent)" font-family="var(--mono)" font-size="11">inside: faster and better</text>
</svg>
</figure>

## What I take from it

**Picture it as a jagged line.** AI is not a uniform intelligence. It has dense areas where it excels and sparse areas where it is prone to fallacies, and two tasks of similar difficulty can fall on different sides of the line.

**The only way to know is to experiment.** You find out whether a task is inside or outside the frontier by trying it and learning its limits, and by asking how **verifiable** the task is.

**Good at the task, hard to judge the output.** Structuring a report is a good example. AI is extremely good at writing, but a report has many implicit criteria. That makes the quality of the output hard to quantify and to see, so the task can look inside the frontier while it is not.

**Centaurs and cyborgs are splitting into more modes.** The paper describes centaurs, who divide the work with the AI, and cyborgs, who mix it continuously. With so much new technology available, these two ways of working are breaking up into many different modes and ideas. A later study by the same group already adds a third: self-automators, who hand over the whole task.

## Where it is weak

- **The frontier moves.** The experiment used GPT-4 in 2023; today's models sit on a different line, and the map must be redrawn often.
- **One company, one profession.** Consultants at BCG, on tasks designed for the study.
