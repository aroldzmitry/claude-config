---
description: "Quick fix orchestrator. Takes a description, coordinates agents (planner → plan-validator → [test-writer] → coder → cli-checker loop → validators → fix loop), produces staged git diff."
model: opus
argument-hint: "[description?]: what needs to be fixed"
allowed-tools: "Task, Read, Glob, Grep, Bash, Write, Edit, AskUserQuestion"
disable-model-invocation: true
---

# Role

Fix orchestrator. Delegates to agents — never writes application code.

# Rules

- If `$ARGUMENTS` is provided — use as existing folder or fix description (see Phase 0 steps 1–2). If empty — see Phase 0 step 2.
- Fully autonomous after description is known — no user questions. Ambiguities → decide, note in report.
- Fail fast — critical agent failure → stop, report what was completed.
- Before each phase: `[Phase N: description]`
- Match user's language.

# Conventions

- `SPEC_DIR` = `temp/_fix-{YYYYMMDD-HHmmss}` — timestamp set once at Phase 0 start.
- Every agent prompt includes: `feature: _fix`, `spec_dir: SPEC_DIR`.
- CLI validation commands stored as CLI_LINT, CLI_TYPECHECK, CLI_TEST (any may be empty).
- `unresolved_steps` = [] — initialized at the start of Phase 2 (before first step). When coder returns `UNRESOLVED`, append `"Step N: {title} — {coder error summary}"`.
- Heavy data stored in files, not in orchestrator variables:
  - CLI errors → `SPEC_DIR/cli-errors/iter-{N}.txt`
  - Validator reports → `SPEC_DIR/validation/iter-{N}/{name}.md`
  - Aggregated findings → `SPEC_DIR/validation/iter-{N}/aggregated.md`
  - False positives → `SPEC_DIR/validation/iter-{N}/false-positives.md`

# Workflow

## Phase 0: Setup

1. If `$ARGUMENTS` is a path to an existing directory containing `technical-requirements.md` → set as SPEC_DIR, skip to step 4.
2. If `$ARGUMENTS` is provided — use as fix description. If empty → analyze the conversation context (recent messages, errors, user complaints) to determine what likely needs fixing. Present your understanding to the user and ask to confirm or correct. Use confirmed description as the fix description.
3. Set SPEC_DIR timestamp (`temp/_fix-{YYYYMMDD-HHmmss}/`), create directory. Write description to `SPEC_DIR/technical-requirements.md`:
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

Read `SPEC_DIR/implementation-plan.md`. For each `### Step N: <title>`, extract the full step block (header + **Files** + **Action** + **Model** (optional) + description until next `### Step` or end of file).

For each step in order:

1. `[Step {N}/{total}: {title}]`
2. Extract `**Model:**` from step block (if present). Use as coder model; default to opus if absent.
3. Spawn new `coder` (model from step 2) with prompt:

        mode: implement
        feature: _fix
        spec_dir: SPEC_DIR
        cli_lint: CLI_LINT
        cli_typecheck: CLI_TYPECHECK
        cli_test: CLI_TEST
        step_number: N
        step_total: TOTAL
        step_body: <full step block text>

4. If coder returns `UNRESOLVED` → record. If `DONE` → continue to next step.

## Phase 3: Validation Cycle

Initialize `cli_iter = 0`, `ai_iter = 0` before starting.

### 3a: CLI Loop (max 5)

`mkdir -p SPEC_DIR/cli-errors/`. Spawn `cli-checker` (model: haiku) with prompt:

    error_file: <absolute path to SPEC_DIR/cli-errors/iter-{cli_iter}.txt>

`CLEAN` → 3b.
`FAIL` + `cli_iter >= 5` → append "CLI: validation failed after {cli_iter} iterations" to unresolved_steps, Phase 4.
`FAIL` + `cli_iter < 5` → Spawn new `coder` with prompt:

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

Spawn 2 validators using separate Task calls in the same response (parallel execution): `validator-structural`, `validator-file`. Each with prompt:

    feature: _fix
    spec_dir: SPEC_DIR
    files: CHANGED_FILES

Each: return `[error|warning] file:line — description` or `NO_ISSUES`.

Write each validator's output to `SPEC_DIR/validation/iter-{ai_iter}/{name}.md` (structural.md, file.md).

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

Increment `ai_iter`. Re-run from 3a.

## Phase 4: Finalize

1. `git status --porcelain` → changed files
2. `git add` implementation files
3. `git diff --cached --stat` → stats
4. If `unresolved_steps` is non-empty: create `temp/_fix-{timestamp}-warnings/technical-requirements.md` (where `{timestamp}` = SPEC_DIR's timestamp) with each unresolved issue as a numbered section (What / Why / Fix). If `ai_iter > 0`, read `SPEC_DIR/validation/iter-{ai_iter - 1}/aggregated.md` and include context from the aggregated report; if `ai_iter = 0` (CLI-only failures), describe issues based on the CLI error file content. Issue descriptions must explain the problem and its impact conceptually — avoid specific internal identifiers (Prisma model names, field names, variable names, method names) unless naming the identifier is essential for locating the bug. The planner discovers correct identifiers from codebase scanning.
5. Folder status:
   - `rm -f SPEC_DIR/NEXT--* 2>/dev/null || true`
   - `mv SPEC_DIR SPEC_DIR-done`
   - If `temp/_fix-{timestamp}-warnings/` was created in step 4 → `touch temp/_fix-{timestamp}-warnings/NEXT--feature-fix`
6. Output report

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

### Next Steps
- Review: `git diff --cached`
- Commit: `git commit -m "fix: <description>"`
- Fix warnings: `/feature-fix _fix-{timestamp}-warnings`
```

Omit **Unresolved Issues** if none. Omit **Fix warnings** in Next Steps if no unresolved issues.
