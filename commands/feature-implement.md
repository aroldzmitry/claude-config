---
description: "Autonomous implementation orchestrator. Reads specs from temp/, coordinates agents (planner → test-writer → coder → validators → fix loop → improvement analyzer), produces staged git diff."
argument-hint: "[feature-name]: folder name in temp/"
allowed-tools: "Task, Read, Glob, Grep, Bash, Edit"
disable-model-invocation: true
---

# Role

Implementation orchestrator. Delegates to agents — never writes application code.

# Rules

- Fully autonomous — no user questions. Ambiguities → decide, note in report.
- Fail fast — missing files or critical agent failure → stop, report what was completed.
- Before each phase: `[Phase N: description]` (phases 1-6; phase 0 is silent precondition check)
- Match user's language.

# Conventions

- `SPEC_DIR` = `temp/$ARGUMENTS/`
- Every agent prompt includes: feature name (`$ARGUMENTS`), spec dir path.
- CLI validation commands stored as CLI_LINT, CLI_TYPECHECK, CLI_TEST (any may be empty).
- Issue counters for improvement-analyzer prompt:
  - `issues_found` — unique verified findings across all aggregator runs, deduplicated by file:line + description (excludes false positives, excludes CLI errors).
  - `issues_fixed` — `issues_found - issues_remaining`.
  - `issues_remaining` — count of items in `unresolved_summary`.
  - `cli_iterations` — number of CLI fix cycles (coder fix-cli spawns). Initial CLI check = 0.
  - `ai_iterations` — number of AI fix cycles (coder fix-ai spawns). Initial validator run = 0.
  - `cli_error_log` — accumulated one-line summaries of CLI errors from each fix-cli cycle (e.g. "iter 1: TS2345 type mismatch in src/api.ts:42; iter 2: missing import in src/utils.ts:5"). Empty string if no CLI errors.

# Workflow

## Phase 0: Load & Validate

1. `$ARGUMENTS` empty → stop: "Usage: `/feature-implement <feature-name>`"
2. `git status --porcelain` → if dirty, stop: "Working tree has uncommitted changes. Commit or stash first."
3. `SPEC_DIR/technical-requirements.md` missing → stop: "Run `/feature-tech $ARGUMENTS` first."
4. Read spec files: `technical-requirements.md`, `business-requirements.md`, `test-cases.md` (last two optional).
5. Detect CLI commands: `docs/WORKFLOW.md` → extract lint/typecheck/test. Fallback: detect from package.json / Makefile / Cargo.toml / pyproject.toml.

## Phase 1: Planning

Spawn `planner` with prompt:

    feature: $ARGUMENTS
    spec_dir: SPEC_DIR

After: verify `SPEC_DIR/implementation-plan.md` created. Extract (a) implementation steps, (b) test decision (skip/write + reason).

## Phase 2: Test Writing

Planner skipped tests → `[Tests: skipped — {reason}]`, go to Phase 3.

Otherwise spawn `test-writer` with prompt:

    feature: $ARGUMENTS
    spec_dir: SPEC_DIR

## Phase 3: Implementation

Spawn `coder` with prompt:

    mode: implement
    feature: $ARGUMENTS
    spec_dir: SPEC_DIR
    cli_lint: CLI_LINT
    cli_typecheck: CLI_TYPECHECK
    cli_test: CLI_TEST

## Phase 4: Validation Cycle

Two loops, independent counters.

### 4a: CLI Loop (max 3)

Run CLI_LINT, CLI_TYPECHECK, CLI_TEST via Bash (skip empty).

All pass → 4b.
Fail + `cli_iter >= 3` → record unresolved, Phase 5.
Fail + `cli_iter < 3` → append one-line error summary to `cli_error_log` (e.g. "iter 1: TS2345 type mismatch in src/api.ts:42, ESLint no-unused-vars in src/utils.ts:5"). Then spawn new `coder` with prompt:

    mode: fix-cli
    feature: $ARGUMENTS
    spec_dir: SPEC_DIR
    cli_lint: CLI_LINT
    cli_typecheck: CLI_TYPECHECK
    cli_test: CLI_TEST
    cli_errors: <full error output>

Re-run 4a.

### 4b: AI Loop (max 2)

`git status --porcelain` → parse file paths, exclude deletions (`D`), exclude non-source files (lock files, images, fonts, videos, `.min.*`, `.map`, `.d.ts`, `.generated.*`, `.snap`, `dist/`, `build/`, `vendor/`, `node_modules/`) → `CHANGED_FILES`.

Spawn all 4 in parallel (`run_in_background: true`): `validator-structural`, `validator-file`, `validator-security`, `validator-spec`. Each with prompt:

    feature: $ARGUMENTS
    spec_dir: SPEC_DIR
    files: CHANGED_FILES

Each: return `[error|warning] file:line — description` or `NO_ISSUES`.

All NO_ISSUES → Phase 5.

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

`VERIFIED_REPORT` is `NO_ISSUES` → Phase 5.
`VERIFIED_REPORT` has issues + `ai_iter >= 2` → record unresolved, Phase 5.
`VERIFIED_REPORT` has issues + `ai_iter < 2` → spawn new `coder` with prompt:

    mode: fix-ai
    feature: $ARGUMENTS
    spec_dir: SPEC_DIR
    cli_lint: CLI_LINT
    cli_typecheck: CLI_TYPECHECK
    cli_test: CLI_TEST
    report: <VERIFIED_REPORT>

Re-run from 4a.

## Phase 5: Improvement Analysis

Spawn `improvement-analyzer` with prompt:

    feature: $ARGUMENTS
    spec_dir: SPEC_DIR
    cli_iterations: <count>
    ai_iterations: <count>
    issues_found: <count>
    issues_fixed: <count>
    issues_remaining: <count>
    unresolved_summary: <list of unresolved issues, or "none">
    cli_errors: <cli_error_log, or "none">
    false_positives: <FALSE_POSITIVES from last aggregator run, or "none">
    verified_reports: <ALL_VERIFIED_REPORTS, or "none">

## Phase 5a: Auto-Apply Regressions

1. Read `{SPEC_DIR}/improvement-suggestions.md`.
2. If `## Regressions` section exists with items:
   a. For each regression: Read the target file → apply the action via Edit → record in `~/.claude/agent-memory/improvement-analyzer/decisions.md` under `## Accepted` with date and `(auto-applied regression)`.
   b. Count auto-applied regressions.
3. Remaining suggestions (non-regression) → left for manual `/system-improve`.

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

### Improvements
- Regressions auto-fixed: N
- New suggestions: N (high: X, medium: Y, low: Z) → `/system-improve temp/<feature-name>/`

### Next Steps
- Review: `git diff --cached`
- Commit: `git commit -m "feat: <feature-name>"`
```

Omit **Unresolved Issues** if none. Omit **Improvements** section if no suggestions and no regressions.
