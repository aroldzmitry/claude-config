---
description: "System help: shows FDL workflow, command reference, and usage guide. With argument — detailed help for a specific command."
model: opus
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
/feature-implement [name] [--worktree] → autonomous: plan → code → [test] → validate → commit (current branch; --worktree = isolated worktree + draft PR)

### Additional commands

/bug [description]            → interactive bug diagnosis: gather symptoms → investigate code → produce fix requirements
/feature-fix <folder> [--worktree] → autonomous: plan → code → [test] → validate → commit (current branch; --worktree = isolated worktree + draft PR; auto-reuses parent worktree for -warnings specs)
/feature-merge [name]         → update branch + pre-merge validate + merge PR + cleanup worktree and branch
/patch [description]          → quick code fix without planning overhead (no spec needed)
/docs-sync [doc-name?]        → sync docs/ with code changes
/research <topic>              → deep project research: chunks → specialist agents → verify → TR (topic: performance/security/error-handling/code-quality)
/system-find-improve [scope?]  → session analysis: find system improvements from conversation
/system-audit [scope?]        → deep system audit: 7 validators → review → fix (no scope: incremental since last audit; all/commands/agents/docs/settings or filename substring)
/system-tune <name> [runs?] [solo?] → log-driven tuning of one agent/command + its child chain (default 10 recent runs; 'all' = up to 20; solo = no chain)
/system-help [command?]       → this help

### Command reference

| Command | Produces | Prerequisites |
|---------|----------|---------------|
| `/docs-init` | `docs/*.md` | — |
| `/feature` | `temp/<name>/business-requirements.md` | — |
| `/feature-ui` | `temp/<name>/ui-requirements.md` | Optional: `business-requirements.md` |
| `/feature-tech` | `temp/<name>/technical-requirements.md` + `test-cases.md` | Optional: `business-requirements.md`, `ui-requirements.md` |
| `/feature-implement` | Commit on current branch (default); `--worktree` → worktree + branch + draft PR | `technical-requirements.md`, clean git |
| `/bug` | `temp/BUG-<slug>/technical-requirements.md` (with diagnosis) | — |
| `/feature-fix` | Commit on current branch (default); `--worktree` → worktree + branch + draft PR | `temp/<folder>/technical-requirements.md` (e.g. `/bug` output folder) |
| `/feature-merge` | Merged PR, validated pre-merge, deleted branch + worktree | Open PR from `/feature-implement` or `/feature-fix` |
| `/patch` | Edited files (no commit) | — |
| `/research` | `temp/RESEARCH-<topic>/technical-requirements.md` | — |
| `/system-find-improve` | Updated system files + `agent-memory/system-find-improve/observations.md` | Any conversation |
| `/system-audit` | Fixed system files + `agent-memory/system-audit/observations.md` | — |
| `/system-tune` | Improved chain files + `agent-memory/system-tune/observations.md` | Execution history in `~/.claude/projects/` |
| `/docs-sync` | Updated `docs/*.md` | Existing `docs/` |
| `/system-help` | Printed help text | — |

### Scenarios

**New project:** `/docs-init`

**New feature (API-only):** `/feature` → `/feature-tech` → `/feature-implement`

**New feature (with UI):** `/feature` → `/feature-ui` → `/feature-tech` → `/feature-implement`

**Large feature:** `/feature` → `/feature-ui` (if UI) → `/feature-tech` (offers to split large features) → `/feature-implement` (per part)

**Bug (unknown cause):** `/bug 409 on user creation` → `/feature-fix BUG-409-create-user --worktree` → `/feature-merge BUG-409-create-user`

**Draft PR with pending decisions (implement hit a business question):** answer via `/feature-tech <name>-warnings` → `/feature-fix <name>-warnings` → `/feature-merge <name>`

**Quick fix (known cause):** `/bug fix the login button` → `/feature-fix BUG-fix-login-button --worktree` → `/feature-merge BUG-fix-login-button`

**Tiny one-file fix (no planning):** `/patch fix the login button color`

**Performance/security/quality audit:** `/research performance` → `/feature-implement RESEARCH-performance`

**After any session:** `/system-find-improve`

**System self-audit:** `/system-audit`

**Agent/command underperforms:** `/system-tune <name>`

**Docs outdated:** `/docs-sync`

### How it works

- Each feature lives in `temp/<name>/` (gitignored)
- Implementation is fully autonomous. By default it works in the current branch and commits there (pushing only if the branch has an upstream) — no PR. Pass `--worktree` to isolate the run in a git worktree (`.worktrees/<name>/`) on a `feat/<name>` branch and produce a PR (ready when clean; draft while issues or business decisions remain — see the pending-decisions scenario); use `/feature-merge` to merge. `/feature-merge` applies only to `--worktree`/PR runs
- Autonomous commands never decide business questions (`~/.claude/docs/ASK_POLICY.md`); specs with unresolved Open Questions are rejected at the implement/fix gate
- Every run appends cost metrics (questions, agent spawns, iterations) to `agent-memory/metrics/runs.md`; `/system-find-improve` reads them for trend detection
- Validators run in parallel, never see each other's work
- `docs/` files are loaded by agents automatically — keep them current with `/docs-sync`

---

# Per-Command Help (with argument)

1. Find command file: Glob `~/.claude/commands/$ARGUMENTS.md`
   - Not found → try `~/.claude/commands/*$ARGUMENTS*.md`
   - Multiple matches → show numbered list of matching commands, ask user to pick one
   - Still not found → "Command `$ARGUMENTS` not found." + list available commands from Full Guide
2. Read the matched file (or user-selected file if multiple)
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
