---
title: Backend and data integrity
summary: "Background jobs, no silent overwrites, and nothing deleted without a copy."
order: 8
skill: "backend"
stack: ["python", "fastapi", "mongodb", "aws"]
contexts: ["event reports", "interview analysis", "feedback hub"]
related: []
---

- **Long jobs in the background** with phases, progress and a lock against double clicks.
- **No silent data loss.** A revision counter on each record; a write with a stale revision gets a conflict, not an overwrite.
- **Undo and redo**, and a write gate per project.
- **Recoverable deletion.** A full copy is logged before any delete; if the log fails, the delete fails.
- **Single sign-on** with tokens checked locally, and authorisation on the resource, not only on the route.
