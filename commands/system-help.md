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
/feature-ui [name]            → UI/UX requirements dialog (optional, for features with admin UI)
/feature-tech [name]          → technical spec + test cases
/feature-implement [name]     → autonomous: plan → test → code → validate → stage

### Additional commands

/bug [description]            → interactive bug diagnosis: gather symptoms → investigate code → produce fix requirements
/feature-split [name]         → split large feature into independent sub-features
/feature-fix [description|folder] → autonomous: plan → [test] → code → validate → stage (accepts description or /bug output folder)
/docs-sync [doc-name?]        → sync docs/ with code changes
/system-find-improve [scope?]  → session analysis: find system improvements from conversation
/system-help [command?]       → this help

### Command reference

| Command | Produces | Prerequisites |
|---------|----------|---------------|
| `/docs-init` | `docs/*.md` | — |
| `/feature` | `temp/<name>/business-requirements.md` | — |
| `/feature-ui` | `temp/<name>/ui-requirements.md` | Optional: `business-requirements.md` |
| `/feature-split` | `temp/<sub-name>/business-requirements.md` per part | `business-requirements.md` |
| `/feature-tech` | `temp/<name>/technical-requirements.md` + `test-cases.md` | Optional: `business-requirements.md`, `ui-requirements.md` |
| `/feature-implement` | Staged git diff | `technical-requirements.md`, clean git |
| `/bug` | `temp/_fix-<ts>/technical-requirements.md` (with diagnosis) | — |
| `/feature-fix` | Staged git diff | — (or `/bug` output folder) |
| `/system-find-improve` | Updated system files + `agent-memory/system-find-improve/observations.md` | Any conversation |
| `/docs-sync` | Updated `docs/*.md` | Existing `docs/` |

### Scenarios

**New project:** `/docs-init`

**New feature (API-only):** `/feature` → `/feature-tech` → `/feature-implement`

**New feature (with UI):** `/feature` → `/feature-ui` → `/feature-tech` → `/feature-implement`

**Large feature:** `/feature` → `/feature-split` → `/feature-ui` (if UI) → `/feature-tech` (per part) → `/feature-implement` (per part)

**Bug (unknown cause):** `/bug 409 при создании юзера` → `/feature-fix _fix-20260307-120000`

**Quick fix (known cause):** `/feature-fix fix the login button`

**After any session:** `/system-find-improve`

**Docs outdated:** `/docs-sync`

### How it works

- Each feature lives in `temp/<name>/` (gitignored)
- Implementation is fully autonomous: planner → plan-validator + Codex → planner revision → test-writer → coder (per step) → CLI loop (max 5) → validators + Codex (8 for feature-implement / 6 for feature-fix) → aggregator → AI fix loop (max 2)
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
