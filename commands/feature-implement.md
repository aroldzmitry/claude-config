---
description: "Autonomous implementation orchestrator. Reads specs from temp/, coordinates agents (planner → plan-validator → test-writer → coder → self-checker → validators → fix loop → improvement analyzer), produces staged git diff."
argument-hint: "[feature-name]: folder name in temp/"
allowed-tools: "Task, Read, Glob, Grep, Bash, Write, Edit"
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

- `SPEC_DIR` = `temp/$ARGUMENTS`
- Every agent prompt includes: feature name (`$ARGUMENTS`), spec dir path.
- CLI validation commands stored as CLI_LINT, CLI_TYPECHECK, CLI_TEST (any may be empty).
- Issue counters for improvement-analyzer prompt:
  - `issues_found` — sum of N from each aggregator `DONE: N verified` (excludes false positives, excludes CLI errors).
  - `issues_fixed` — `issues_found - issues_remaining`.
  - `issues_remaining` — count of items in `unresolved_summary`.
  - `cli_iterations` — number of CLI fix cycles (coder fix-cli spawns). Initial CLI check = 0.
  - `ai_iterations` — number of AI fix cycles (coder fix-ai spawns). Initial validator run = 0.
  - `compaction_log` — tracks agents that reported context compaction. Format: `{agent}:{count}, ...`. After each Task agent spawn, check return for `COMPACTED: true` — if present, increment that agent's count. If orchestrator itself experiences compaction, add `orchestrator:1`.
- Heavy data stored in files, not in orchestrator variables:
  - CLI errors → `SPEC_DIR/cli-errors/iter-{N}.txt`
  - Validator reports → `SPEC_DIR/validation/iter-{N}/{name}.md`
  - Aggregated findings → `SPEC_DIR/validation/iter-{N}/aggregated.md`
  - False positives → `SPEC_DIR/validation/iter-{N}/false-positives.md`

# Workflow

## Phase 0: Load & Validate

1. `$ARGUMENTS` empty → stop: "Usage: `/feature-implement <feature-name>`"
2. `git status --porcelain` → if dirty, stop: "Working tree has uncommitted changes. Commit or stash first."
3. `SPEC_DIR/technical-requirements.md` missing → stop: "Run `/feature-tech $ARGUMENTS` first."
4. Verify spec files exist via Glob: `technical-requirements.md` (required), `business-requirements.md`, `test-cases.md` (optional). Do NOT read contents — agents read specs from `SPEC_DIR` themselves.
5. Clean stale iteration data: `cd SPEC_DIR && rm -rf cli-errors/ validation/`
6. Detect CLI commands: `docs/WORKFLOW.md` → extract lint/typecheck/test. Fallback: detect from package.json / Makefile / Cargo.toml / pyproject.toml.

## Phase 1: Planning

Spawn `planner` with prompt:

    feature: $ARGUMENTS
    spec_dir: SPEC_DIR

After: verify `SPEC_DIR/implementation-plan.md` created. Extract test decision (skip/write + reason). Step details loaded in Phase 3.

Spawn `plan-validator` with prompt:

    feature: $ARGUMENTS
    spec_dir: SPEC_DIR

After: log result (CLEAN or FIXED: N issues).

## Phase 2: Test Writing

Planner skipped tests → `[Tests: skipped — {reason}]`, go to Phase 3.

Otherwise spawn `test-writer` with prompt:

    feature: $ARGUMENTS
    spec_dir: SPEC_DIR

## Phase 3: Implementation

Read `SPEC_DIR/implementation-plan.md`. For each `### Step N: <title>`, extract the full step block (header + **Files** + **Action** + description until next `### Step` or end of file).

For each step in order:

1. `[Step {N}/{total}: {title}]`
2. Spawn new `coder` with prompt:

        mode: implement
        feature: $ARGUMENTS
        spec_dir: SPEC_DIR
        cli_lint: CLI_LINT
        cli_typecheck: CLI_TYPECHECK
        cli_test: CLI_TEST
        step_number: N
        step_total: TOTAL
        step_body: <full step block text>

3. If coder returns `UNRESOLVED` → record, continue to next step.
4. If coder returns `DONE` → run `git diff --name-only` to get actually changed files. Spawn `self-checker` with prompt:

        feature: $ARGUMENTS
        spec_dir: SPEC_DIR
        changed_files: <newline-separated file paths from git diff>
        cli_lint: CLI_LINT
        cli_typecheck: CLI_TYPECHECK
        cli_test: CLI_TEST

5. Log self-checker result (CLEAN or FIXED: N issues). Continue to next step.

## Phase 4: Validation Cycle

Initialize `cli_iter = 0`, `ai_iter = 0` before starting.

### 4a: CLI Loop (max 5)

Run CLI_LINT, CLI_TYPECHECK, CLI_TEST via Bash (skip empty).

All pass → 4b.
Fail + `cli_iter >= 5` → record unresolved, Phase 5.
Fail + `cli_iter < 5` → `mkdir -p SPEC_DIR/cli-errors/`, write full error output to `SPEC_DIR/cli-errors/iter-{cli_iter}.txt`. Spawn new `coder` with prompt:

    mode: fix-cli
    feature: $ARGUMENTS
    spec_dir: SPEC_DIR
    cli_lint: CLI_LINT
    cli_typecheck: CLI_TYPECHECK
    cli_test: CLI_TEST
    cli_error_file: cli-errors/iter-{cli_iter}.txt

Increment `cli_iter`. Re-run 4a.

### 4b: AI Loop (max 2)

`git status --porcelain` → parse file paths, exclude deletions (`D`), exclude non-source files (lock files, images, fonts, videos, `.min.*`, `.map`, `.d.ts`, `.generated.*`, `.snap`, `dist/`, `build/`, `vendor/`, `node_modules/`, `temp/`) → `CHANGED_FILES` (newline-separated).

`mkdir -p SPEC_DIR/validation/iter-{ai_iter}/`

Spawn all 4 in parallel (`run_in_background: true`): `validator-structural`, `validator-file`, `validator-security`, `validator-spec`. Each with prompt:

    feature: $ARGUMENTS
    spec_dir: SPEC_DIR
    files: CHANGED_FILES

Each: return `[error|warning] file:line — description` or `NO_ISSUES`.

Write each validator's output to `SPEC_DIR/validation/iter-{ai_iter}/{name}.md` (structural.md, file.md, security.md, spec.md).

All NO_ISSUES → Phase 5.

Otherwise spawn `aggregator` with prompt:

    feature: $ARGUMENTS
    spec_dir: SPEC_DIR
    ai_iteration: N

Aggregator reads reports from `validation/iter-{N}/`, writes `aggregated.md` and `false-positives.md` to the same directory. Returns one-line status: `DONE: N verified, M false positives` or `NO_ISSUES`.

Check aggregator status (do NOT parse report contents):
- `NO_ISSUES` → Phase 5.
- Has issues + `ai_iter >= 2` → record unresolved, Phase 5.
- Has issues + `ai_iter < 2` → spawn new `coder` with prompt:

        mode: fix-ai
        feature: $ARGUMENTS
        spec_dir: SPEC_DIR
        cli_lint: CLI_LINT
        cli_typecheck: CLI_TYPECHECK
        cli_test: CLI_TEST
        report_file: validation/iter-{ai_iter}/aggregated.md

Increment `ai_iter`. Re-run from 4a (counters continue, do not reset).

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
    compactions: <compaction_log formatted as "agent:count, ...", or "none">

## Phase 5a: Auto-Apply Regressions

1. Read `SPEC_DIR/improvement-suggestions.md`.
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
**Validation:** CLI {N}/5, AI {N}/2

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
