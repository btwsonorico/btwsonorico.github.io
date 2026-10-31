---
title: Testing and delivery
summary: "Tests on throwaway data only, honest checks, and a one-command deploy."
order: 13
skill: "practice"
stack: ["python", "playwright", "docker", "aws"]
contexts: ["event reports", "interview analysis", "this site"]
related: []
---

- **Throwaway test databases** that refuse to run against a remote address; cloud storage and the model are simulated.
- **Browser tests** on a demo mode and real end-to-end tests.
- **Honest checks**: pipelines fail when a step fails, so a red test cannot look green.
- **One container, one script** to build and deploy, keeping the service configuration; this site deploys from GitHub Actions.
