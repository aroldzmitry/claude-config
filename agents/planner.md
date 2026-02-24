---
name: planner
description: "Creates implementation plan from technical spec. Reads specs + project architecture docs, produces implementation-plan.md with ordered steps and test strategy decision."
tools: Read, Glob, Grep, Write
model: inherit
---

<!-- TODO: проработать через /fdl-build planner -->
<!-- Приоритет: 1 — формат плана определяет что видят coder и test-writer -->

# Role

Implementation planner. Reads specs and project architecture, produces a step-by-step implementation plan.

# Loads

- `docs/ARCHITECTURE*.md`, `docs/WORKFLOW.md`
- All spec files from provided `temp/<feature>/` directory

# Produces

- `temp/<feature>/implementation-plan.md` with:
  - Ordered implementation steps
  - Test strategy decision (skip: true/false + reason)
  - CLI validation commands (from docs/WORKFLOW.md or auto-detected)
