---
description: "Quick fix orchestrator. Takes a description, coordinates agents (planner → plan-validator → [test-writer] → coder → self-checker → validators → fix loop → improvement analyzer), produces staged git diff."
argument-hint: "[description?]: what needs to be fixed"
allowed-tools: "Task, Read, Glob, Grep, Bash, Write, Edit, AskUserQuestion"
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

- `SPEC_DIR` = `temp/_fix-{YYYYMMDD-HHmmss}` — timestamp set once at Phase 0 start.
- Every agent prompt includes: `feature: _fix`, `spec_dir: SPEC_DIR`.
- CLI validation commands stored as CLI_LINT, CLI_TYPECHECK, CLI_TEST (any may be empty).
- `unresolved_steps` = [] — initialized at start of Phase 2. When coder returns `UNRESOLVED`, append `"Step N: {title} — {coder error summary}"`. Pass as `unresolved_summary` to improvement-analyzer.
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

<!-- Phases 0-5. Phase 2 (test-writing) is omitted vs feature-implement (Phases 0-6). Phase 1a is test-writing (optional). -->

## Phase 0: Setup

1. If `$ARGUMENTS` empty → analyze the conversation context (recent messages, errors, user complaints) to determine what likely needs fixing. Present your understanding to the user and ask to confirm or correct. Use confirmed description as the fix description.
2. Set SPEC_DIR timestamp (`temp/_fix-{YYYYMMDD-HHmmss}/`), create directory.
3. Write description to `SPEC_DIR/technical-requirements.md`:
   ```
   # Fix Description

   <user's description>
   ```
4. Detect CLI commands: `docs/WORKFLOW.md` → extract lint/typecheck/test. Fallback: detect from package.json / Makefile / Cargo.toml / pyproject.toml.

## Phase 1: Planning

Spawn `planner` with prompt:

    feature: _fix
    spec_dir: SPEC_DIR

After: verify `SPEC_DIR/implementation-plan.md` created. Extract test decision (skip/write + reason).

Spawn `plan-validator` with prompt:

    feature: _fix
    spec_dir: SPEC_DIR

After: log result (CLEAN or FIXED: N issues). Re-read `SPEC_DIR/implementation-plan.md` and re-extract test decision before Phase 1a.

## Phase 1a: Test Writing (optional)

Planner skipped tests → `[Tests: skipped — {reason}]`, go to Phase 2.

Otherwise spawn `test-writer` with prompt:

    feature: _fix
    spec_dir: SPEC_DIR

If test-writer returns ERROR → log `[Tests: error — {reason}]`, skip tests, continue to Phase 2.

## Phase 2: Implementation

Read `SPEC_DIR/implementation-plan.md`. For each `### Step N: <title>`, extract the full step block (header + **Files** + **Action** + description until next `### Step` or end of file).

For each step in order:

1. `[Step {N}/{total}: {title}]`
2. Spawn new `coder` with prompt:

        mode: implement
        feature: _fix
        spec_dir: SPEC_DIR
        cli_lint: CLI_LINT
        cli_typecheck: CLI_TYPECHECK
        cli_test: CLI_TEST
        step_number: N
        step_total: TOTAL
        step_body: <full step block text>

3. If coder returns `UNRESOLVED` → record, continue to next step.
4. If coder returns `DONE` → run `git status --porcelain` to get actually changed files (strip the 2-char status prefix, exclude lines starting with `D` for deletions). Spawn `self-checker` with prompt:

        feature: _fix
        spec_dir: SPEC_DIR
        changed_files: <newline-separated file paths from git diff>
        cli_lint: CLI_LINT
        cli_typecheck: CLI_TYPECHECK
        cli_test: CLI_TEST

5. Log self-checker result (CLEAN or FIXED: N issues). Continue to next step.

## Phase 3: Validation Cycle

Initialize `cli_iter = 0`, `ai_iter = 0` before starting.

### 3a: CLI Loop (max 5)

Run CLI_LINT, CLI_TYPECHECK, CLI_TEST via Bash (skip empty).

All pass → 3b.
Fail + `cli_iter >= 5` → append "CLI: validation failed after {cli_iter} iterations" to unresolved_steps, Phase 4.
Fail + `cli_iter < 5` → `mkdir -p SPEC_DIR/cli-errors/`, write full error output to `SPEC_DIR/cli-errors/iter-{cli_iter}.txt`. Spawn new `coder` with prompt:

    mode: fix-cli
    feature: _fix
    spec_dir: SPEC_DIR
    cli_lint: CLI_LINT
    cli_typecheck: CLI_TYPECHECK
    cli_test: CLI_TEST
    cli_error_file: cli-errors/iter-{cli_iter}.txt

Increment `cli_iter`. Re-run 3a.

### 3b: AI Loop (max 2)

`git status --porcelain` → parse file paths, exclude deletions (`D`), exclude non-source files (lock files, images, fonts, videos, `.min.*`, `.map`, `.d.ts`, `.generated.*`, `.snap`, `dist/`, `build/`, `vendor/`, `node_modules/`, `temp/`) → `CHANGED_FILES` (newline-separated).

`mkdir -p SPEC_DIR/validation/iter-{ai_iter}/`

<!-- validator-spec omitted: fix description is not a full spec, spec-gap detection is inapplicable -->
Spawn 3 validators using separate Task calls in the same response (parallel execution): `validator-structural`, `validator-file`, `validator-security`. Each with prompt:

    feature: _fix
    spec_dir: SPEC_DIR
    files: CHANGED_FILES

Each: return `[error|warning] file:line — description` or `NO_ISSUES`.

Write each validator's output to `SPEC_DIR/validation/iter-{ai_iter}/{name}.md` (structural.md, file.md, security.md).

All NO_ISSUES → Phase 4.

Otherwise spawn `aggregator` with prompt:

    feature: _fix
    spec_dir: SPEC_DIR
    ai_iteration: {ai_iter}

Aggregator reads reports from `validation/iter-{ai_iter}/`, writes `aggregated.md` and `false-positives.md` to the same directory. Returns one-line status: `DONE: N verified, M false positives` or `NO_ISSUES`.

Check aggregator status (do NOT parse report contents):
- `NO_ISSUES` → Phase 4.
- Has issues + `ai_iter >= 2` → append "AI: {aggregator status} after {ai_iter} fix cycles" to unresolved_steps, Phase 4.
- Has issues + `ai_iter < 2` → spawn new `coder` with prompt:

        mode: fix-ai
        feature: _fix
        spec_dir: SPEC_DIR
        cli_lint: CLI_LINT
        cli_typecheck: CLI_TYPECHECK
        cli_test: CLI_TEST
        report_file: validation/iter-{ai_iter}/aggregated.md

Increment `ai_iter`. Re-run from 3a (counters continue, do not reset).

## Phase 4: Improvement Analysis

Spawn `improvement-analyzer` with prompt:

    feature: _fix
    spec_dir: SPEC_DIR
    cli_iterations: <count>
    ai_iterations: <count>
    issues_found: <count>
    issues_fixed: <count>
    issues_remaining: <count>
    unresolved_summary: <list of unresolved issues, or "none">
    compactions: <compaction_log formatted as "agent:count, ...", or "none">

## Phase 4a: Auto-Apply Regressions

1. If `SPEC_DIR/improvement-suggestions.md` not found → skip auto-apply phase, proceed to Phase 5.
2. Read `SPEC_DIR/improvement-suggestions.md`.
3. If `## Regressions` section exists with items:
   a. For each regression: Read the target file → apply the action via Edit → record in `~/.claude/agent-memory/improvement-analyzer/decisions.md` under `## Accepted` with date and `(auto-applied regression)`.
   b. Count auto-applied regressions.
   c. Collect changed .md file paths. If any: spawn `validator-doc-system` with changed_files list. If `ISSUES` → log warning, do not block.
4. Remaining suggestions (non-regression) → left for manual `/system-improve`.

## Phase 5: Finalize

1. `git status --porcelain` → changed files
2. `git add` implementation files
3. `git diff --cached --stat` → stats
4. Output report

# Edge Cases

- Run interrupted mid-implementation → changes already applied to app files persist; re-run starts a new plan from scratch.

# Report

```
## Fix Complete

**Description:** <fix description>
**Files changed:** N
**Tests:** M passed (or "skipped")
**Validation:** CLI {N}/5, AI {N}/2

### Unresolved Issues
- [error|warning] file:line — description

### Improvements
- Regressions auto-fixed: N
- New suggestions: N (high: X, medium: Y, low: Z) → `/system-improve SPEC_DIR`

### Next Steps
- Review: `git diff --cached`
- Commit: `git commit -m "fix: <description>"`
```

Omit **Unresolved Issues** if none. Omit **Improvements** section if no suggestions and no regressions.
