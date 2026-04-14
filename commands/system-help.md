---
description: "System help: shows FDL workflow, command reference, and usage guide. With argument — detailed help for a specific command."
model: sonnet
argument-hint: "[command-name?]: command name for detailed help (e.g., feature-implement)"
disable-model-invocation: true
allowed-tools: "Read, Glob"
---

# Role

FDL system reference. Output information about the Feature Development Lifecycle system.

# Rules

- Match the user's language.
- Output only the reference — no extra commentary, no preambles.
- For per-command help: read the actual command .md file, don't rely on memorized content.

# Full Guide (no arguments)

Output this reference (translated to user's language):

---

## FDL — Feature Development Lifecycle

### Main workflow

/docs-init                    → project onboarding, create docs/
/feature [name]               → business requirements dialog
/feature-ui [name]            → UI/UX requirements dialog (optional, for features with UI)
/feature-tech [name]          → technical spec
/feature-implement [name]     → autonomous: plan → code → [test] → validate → stage

### Additional commands

/bug [description]            → interactive bug diagnosis: gather symptoms → investigate code → produce fix requirements
/feature-fix <folder>         → autonomous: plan → code → [test] → validate → PR (accepts /bug output folder)
/feature-merge [name]         → update branch + pre-merge validate + merge PR + validate master + cleanup worktree and branch
/patch [description]          → quick code fix without planning overhead (no spec needed)
/docs-sync [doc-name?]        → sync docs/ with code changes
/system-find-improve [scope?]  → session analysis: find system improvements from conversation
/system-audit [scope?]        → deep system audit: 7 validators → review → fix (scope: all/commands/agents/docs/settings)
/system-help [command?]       → this help

### Command reference

| Command | Produces | Prerequisites |
|---------|----------|---------------|
| `/docs-init` | `docs/*.md` | — |
| `/feature` | `temp/<name>/business-requirements.md` | — |
| `/feature-ui` | `temp/<name>/ui-requirements.md` | Optional: `business-requirements.md` |
| `/feature-tech` | `temp/<name>/technical-requirements.md` + `test-cases.md` | Optional: `business-requirements.md`, `ui-requirements.md` |
| `/feature-implement` | Worktree + branch + draft PR (ready to merge) | `technical-requirements.md`, clean git |
| `/bug` | `temp/BUG-<slug>/technical-requirements.md` (with diagnosis) | — |
| `/feature-fix` | Worktree + branch + draft PR (ready to merge) | — (or `/bug` output folder) |
| `/feature-merge` | Merged PR, validated pre+post, deleted branch + worktree | Open PR from `/feature-implement` or `/feature-fix` |
| `/patch` | Edited files (no commit) | — |
| `/system-find-improve` | Updated system files + `agent-memory/system-find-improve/observations.md` | Any conversation |
| `/system-audit` | Fixed system files + `agent-memory/system-audit/observations.md` | — |
| `/docs-sync` | Updated `docs/*.md` | Existing `docs/` |
| `/system-help` | Printed help text | — |

### Scenarios

**New project:** `/docs-init`

**New feature (API-only):** `/feature` → `/feature-tech` → `/feature-implement`

**New feature (with UI):** `/feature` → `/feature-ui` → `/feature-tech` → `/feature-implement`

**Large feature:** `/feature` (offers to split large features) → `/feature-ui` (if UI) → `/feature-tech` (per part) → `/feature-implement` (per part)

**Bug (unknown cause):** `/bug 409 on user creation` → `/feature-fix BUG-409-create-user` → `/feature-merge BUG-409-create-user`

**Quick fix (known cause):** `/bug fix the login button` → `/feature-fix BUG-fix-login-button` → `/feature-merge BUG-fix-login-button`

**Tiny one-file fix (no planning):** `/patch fix the login button color`

**After any session:** `/system-find-improve`

**System self-audit:** `/system-audit`

**Docs outdated:** `/docs-sync`

### How it works

- Each feature lives in `temp/<name>/` (gitignored)
- Implementation is fully autonomous: runs in a git worktree (`.worktrees/<name>/`) on a `feat/<name>` branch, produces a draft PR; use `/feature-merge` to merge
- Validators run in parallel, never see each other's work
- `docs/` files are loaded by agents automatically — keep them current with `/docs-sync`

---

# Per-Command Help (with argument)

1. Find command file: Glob `~/.claude/commands/$ARGUMENTS.md`
   - Not found → try `~/.claude/commands/*$ARGUMENTS*.md`
   - Still not found → "Command `$ARGUMENTS` not found." + list available commands from Full Guide
2. Read the file
3. Present:
   - **Description** — from frontmatter `description`
   - **Usage** — `/command-name` + `argument-hint` from frontmatter
   - **Prerequisites** — what must exist before running (extract from Phase 0 / Load / Validate steps)
   - **Produces** — output files and artifacts (extract from final phase or Output section)
   - **Workflow** — numbered list of main phases (1-line summary each)
   - **Next step** — what command to run after (extract from final phase suggestions)

# Start

If `$ARGUMENTS` is provided → Per-Command Help.
Otherwise → Full Guide.
