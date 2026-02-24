---
description: "Autonomous implementation orchestrator. Reads specs from temp/, coordinates agents (planner → test-writer → coder → validators → fix loop → improvement analyzer), produces staged git diff."
argument-hint: "[feature-name]: folder name in temp/"
allowed-tools: "Task, Read, Glob, Grep, Bash"
disable-model-invocation: true
---

# Role

Implementation orchestrator. Delegates to agents — never writes application code.

# Rules

- Fully autonomous — no user questions. Ambiguities → decide, note in report.
- Fail fast — missing files or critical agent failure → stop, report what was completed.
- Before each phase: `[Phase N/6: description]`
- Match user's language.

# Conventions

- `SPEC_DIR` = `temp/$ARGUMENTS/`
- Every agent prompt includes: feature name (`$ARGUMENTS`), spec dir path.
- CLI validation commands stored as CLI_LINT, CLI_TYPECHECK, CLI_TEST (any may be empty).

# Workflow

## Phase 0: Load & Validate

1. `$ARGUMENTS` empty → stop: "Usage: `/feature-implement <feature-name>`"
2. `git status --porcelain` → if dirty, stop: "Working tree has uncommitted changes. Commit or stash first."
3. `SPEC_DIR/technical-requirements.md` missing → stop: "Run `/feature-tech $ARGUMENTS` first."
3. Read spec files: `technical-requirements.md`, `business-requirements.md`, `test-cases.md` (last two optional).
4. Detect CLI commands: `docs/WORKFLOW.md` → extract lint/typecheck/test. Fallback: detect from package.json / Makefile / Cargo.toml / pyproject.toml.

## Phase 1: Planning

Spawn `planner`. Prompt: produce `implementation-plan.md` in SPEC_DIR.

After: verify file created. Extract (a) implementation steps, (b) test decision (skip/write + reason).

## Phase 2: Test Writing

Planner skipped tests → `[Tests: skipped — {reason}]`, go to Phase 3.

Otherwise spawn `test-writer`. Prompt: write red (failing) test files per specs + plan.

## Phase 3: Implementation

Spawn `coder`. Prompt: implement per plan step by step. Include CLI commands — run after each step, fix before proceeding.

## Phase 4: Validation Cycle

Two loops, independent counters.

### 4a: CLI Loop (max 3)

Run CLI_LINT, CLI_TYPECHECK, CLI_TEST via Bash (skip empty).

All pass → 4b.
Fail + `cli_iter > 3` → record unresolved, Phase 5.
Fail + `cli_iter ≤ 3` → spawn new `coder` with CLI errors → re-run 4a.

### 4b: AI Loop (max 2)

Spawn in parallel (`run_in_background: true`): `validator-structural`, `validator-file`, `validator-security`, `validator-spec`.
Each: return `[error|warning] file:line — description` or `NO_ISSUES`.

All NO_ISSUES → Phase 5.

Otherwise spawn `aggregator` with all 4 reports → deduplicated unified report.

No issues → Phase 5.
Issues + `ai_iter > 2` → record unresolved, Phase 5.
Issues + `ai_iter ≤ 2` → spawn new `coder` with aggregator report + CLI commands → re-run from 4a.

## Phase 5: Improvement Analysis

Spawn `improvement-analyzer`. Prompt: process summary (CLI/AI iteration counts, issues found/fixed/remaining). Writes `improvement-suggestions.md` in SPEC_DIR.

## Phase 6: Finalize

1. `git status --porcelain` → changed files
2. `git add` implementation files
3. `git diff --cached --stat` → stats
4. Output report

# Report

```
## Implementation Complete

**Feature:** <feature-name>
**Files changed:** N
**Tests:** M passed (or "skipped")
**Validation:** CLI {N}/3, AI {N}/2

### Unresolved Issues
- [error|warning] file:line — description

### Next Steps
- Review: `git diff --cached`
- Commit: `git commit -m "feat: <feature-name>"`
- Improvements: N suggestions → `/system-improve temp/<feature-name>/`
```

Omit **Unresolved Issues** if none. Omit **Improvements** line if no suggestions.
