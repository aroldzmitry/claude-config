---
description: "System help: shows FDL workflow, command reference, and usage guide. With argument — detailed help for a specific command."
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
/feature-tech [name]          → technical spec + test cases
/feature-implement [name]     → autonomous: plan → test → code → validate → stage
/system-improve [path]        → review & apply improvement suggestions

### Additional commands

/feature-fix [description]    → quick fix + validate + stage
/docs-sync [doc-name?]        → sync docs/ with code changes
/sys-help [command?]          → this help

### Command reference

| Command | Produces | Prerequisites |
|---------|----------|---------------|
| `/docs-init` | `docs/*.md` | Source code in project |
| `/feature` | `temp/<name>/business-requirements.md` | — |
| `/feature-tech` | `temp/<name>/technical-requirements.md` + `test-cases.md` | Optional: `business-requirements.md` |
| `/feature-implement` | Staged git diff + `improvement-suggestions.md` | `technical-requirements.md`, clean git |
| `/feature-fix` | Staged git diff | Clean git |
| `/system-improve` | Updated system files | `improvement-suggestions.md` |
| `/docs-sync` | Updated `docs/*.md` | Existing `docs/` |

### Scenarios

**New project:** `/docs-init`

**New feature:** `/feature` → `/feature-tech` → `/feature-implement`

**Quick fix:** `/feature-fix fix the login button`

**After implementation:** `/system-improve temp/<feature-name>/`

**Docs outdated:** `/docs-sync`

### How it works

- Each feature lives in `temp/<name>/` (gitignored)
- Implementation is fully autonomous: planner → test-writer → coder → 4 validators → aggregator → fix loop (max 2) → improvement analysis
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
