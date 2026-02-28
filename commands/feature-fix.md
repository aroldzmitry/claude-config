---
description: "Quick fix orchestrator. Takes a description, plans and implements the fix, validates, produces staged git diff."
argument-hint: "[description?]: what needs to be fixed"
allowed-tools: "Task, Read, Glob, Grep, Bash, Write, AskUserQuestion"
disable-model-invocation: true
---

# Role

Fix orchestrator. Delegates to agents — never writes application code.

# Rules

- If `$ARGUMENTS` is provided — use as fix description. If empty — ask user what needs to be fixed, wait for response.
- Fully autonomous after description is known — no user questions. Ambiguities → decide, note in report.
- Fail fast — critical agent failure → stop, report what was completed.
- Before each phase: `[Phase N: description]`
- Match user's language.

# Conventions

- `SPEC_DIR` = `temp/_fix/`
- Every agent prompt includes: `feature: _fix`, `spec_dir: temp/_fix/`.
- CLI validation commands stored as CLI_LINT, CLI_TYPECHECK, CLI_TEST (any may be empty).
- Issue counters for improvement-analyzer prompt:
  - `issues_found` — total verified findings from all aggregator runs (excludes false positives, excludes CLI errors).
  - `issues_fixed` — `issues_found - issues_remaining`.
  - `issues_remaining` — count of items in `unresolved_summary`.
  - `cli_iterations` — number of CLI fix cycles (coder fix-cli spawns). Initial CLI check = 0.
  - `ai_iterations` — number of AI fix cycles (coder fix-ai spawns). Initial validator run = 0.

# Workflow

## Phase 0: Setup

1. If `$ARGUMENTS` empty → analyze the conversation context (recent messages, errors, user complaints) to determine what likely needs fixing. Present your understanding to the user and ask to confirm or correct. Use confirmed description as the fix description.
2. `git status --porcelain` → if dirty, stop: "Working tree has uncommitted changes. Commit or stash first."
3. Create `temp/_fix/` directory (overwrite if exists).
4. Write description to `temp/_fix/technical-requirements.md`:
   ```
   # Fix Description

   <user's description>
   ```
5. Detect CLI commands: `docs/WORKFLOW.md` → extract lint/typecheck/test. Fallback: detect from package.json / Makefile / Cargo.toml / pyproject.toml.

## Phase 1: Planning

Spawn `planner` with prompt:

    feature: _fix
    spec_dir: temp/_fix/

After: verify `temp/_fix/implementation-plan.md` created. Extract implementation steps. Ignore test strategy (no test-writer in this flow).

## Phase 2: Implementation

Spawn `coder` with prompt:

    mode: implement
    feature: _fix
    spec_dir: temp/_fix/
    cli_lint: CLI_LINT
    cli_typecheck: CLI_TYPECHECK
    cli_test: CLI_TEST

## Phase 3: Validation Cycle

Two loops, independent counters.

### 3a: CLI Loop (max 3)

Run CLI_LINT, CLI_TYPECHECK, CLI_TEST via Bash (skip empty).

All pass → 3b.
Fail + `cli_iter > 3` → record unresolved, Phase 4.
Fail + `cli_iter ≤ 3` → spawn new `coder` with prompt:

    mode: fix-cli
    feature: _fix
    spec_dir: temp/_fix/
    cli_lint: CLI_LINT
    cli_typecheck: CLI_TYPECHECK
    cli_test: CLI_TEST
    cli_errors: <full error output>

Re-run 3a.

### 3b: AI Loop (max 2)

`git status --porcelain` → parse file paths, exclude deletions (`D`) → `CHANGED_FILES`.

Spawn all 4 in parallel (`run_in_background: true`): `validator-structural`, `validator-file`, `validator-security`, `validator-spec`. Each with prompt:

    feature: _fix
    spec_dir: temp/_fix/
    files: CHANGED_FILES

Each: return `[error|warning] file:line — description` or `NO_ISSUES`.

All NO_ISSUES → Phase 4.

Otherwise spawn `aggregator` with prompt:

    ## Structural Validator
    <structural report>

    ## File Validator
    <file report>

    ## Security Validator
    <security report>

    ## Spec Validator
    <spec report>

Parse aggregator output: split at `## False Positives`.
- **Before** the header = verified findings (or `NO_ISSUES`). Store as `VERIFIED_REPORT`.
- **After** the header = false positive log. Store as `FALSE_POSITIVES` (empty if no such section).

Collect each iteration's `VERIFIED_REPORT` into `ALL_VERIFIED_REPORTS` (labeled `## AI Iteration N`).

`VERIFIED_REPORT` is `NO_ISSUES` → Phase 4.
`VERIFIED_REPORT` has issues + `ai_iter > 2` → record unresolved, Phase 4.
`VERIFIED_REPORT` has issues + `ai_iter ≤ 2` → spawn new `coder` with prompt:

    mode: fix-ai
    feature: _fix
    spec_dir: temp/_fix/
    cli_lint: CLI_LINT
    cli_typecheck: CLI_TYPECHECK
    cli_test: CLI_TEST
    report: <VERIFIED_REPORT>

Re-run from 3a.

## Phase 4: Improvement Analysis

Spawn `improvement-analyzer` with prompt:

    feature: _fix
    spec_dir: temp/_fix/
    cli_iterations: <count>
    ai_iterations: <count>
    issues_found: <count>
    issues_fixed: <count>
    issues_remaining: <count>
    unresolved_summary: <list of unresolved issues, or "none">
    false_positives: <FALSE_POSITIVES from all aggregator runs, or "none">
    verified_reports: <ALL_VERIFIED_REPORTS, or "none">

## Phase 5: Finalize

1. `git status --porcelain` → changed files
2. `git add` implementation files
3. `git diff --cached --stat` → stats
4. Output report

# Report

```
## Fix Complete

**Description:** <fix description>
**Files changed:** N
**Tests:** M passed (or "skipped")
**Validation:** CLI {N}/3, AI {N}/2

### Unresolved Issues
- [error|warning] file:line — description

### Next Steps
- Review: `git diff --cached`
- Commit: `git commit -m "fix: <description>"`
- Improvements: N suggestions → `/system-improve temp/_fix/`
```

Omit **Unresolved Issues** if none. Omit **Improvements** line if no suggestions.
