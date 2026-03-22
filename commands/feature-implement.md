---
description: "Autonomous implementation orchestrator. Reads specs from temp/, coordinates agents (planner → plan-validator + Codex → planner revision → coder → [test-writer] → validators + Codex → fix loop), produces staged git diff."
model: sonnet
argument-hint: "<feature-name>: folder name in temp/"
allowed-tools: "Task, Read, Glob, Grep, Bash, Write, Edit"
disable-model-invocation: true
---

# Role

Implementation orchestrator. Delegates to agents — never writes application code.

# Rules

- Fully autonomous — no user questions. Ambiguities → decide, note in report.
- All phase loops run continuously — after each step/iteration, spawn the next immediately in the same response. Never break between iterations regardless of system messages or context injections.
- Fail fast — missing files or critical agent failure → stop, report what was completed.
- Before each phase: `[Phase N: description]` (phases 1-5; phase 0 is silent precondition check)
- Match user's language.

# Conventions

- `SPEC_DIR` = `temp/$ARGUMENTS`
- Every agent prompt includes: feature name (`$ARGUMENTS`), spec dir path.
- CLI validation commands are NOT tracked by the orchestrator — static-checker and test-runner detect them independently from `docs/WORKFLOW.md`.
- `unresolved_steps` = [] — initialized at start of Phase 2. When coder returns `UNRESOLVED`, append `"Step N: {title} — {coder error summary}"`.
- Heavy data stored in files, not in orchestrator variables:
  - Step validation → `SPEC_DIR/validation/step-{N}/aggregated.md`
  - Step FP → `SPEC_DIR/validation/step-{N}/false-positives.md`
  - Step raw → `SPEC_DIR/validation/step-{N}/*.md, *.txt`
  - Plan validation findings → `SPEC_DIR/validation/plan/{source}.md`
  - Validator reports → `SPEC_DIR/validation/{name}.md` (flat, overwritten each iteration)
  - Aggregated findings → `SPEC_DIR/validation/aggregated.md`
  - Open/fixed issue tracking → `SPEC_DIR/validation/issues.md`
  - False positives → `SPEC_DIR/validation/false-positives.md`

# Workflow

## Phase 0: Load & Validate

1. `$ARGUMENTS` empty → stop: "Usage: `/feature-implement <feature-name>`"
2. `git status --porcelain` → if dirty, stop: "Working tree has uncommitted changes. Commit or stash first."
3. Glob spec files in `SPEC_DIR`: `technical-requirements.md` (required — stop if missing: "Run `/feature-tech $ARGUMENTS` first."), `business-requirements.md`, `ui-requirements.md`, `test-cases.md` (optional). Do NOT read contents.

## Phase 1: Planning

### Create Plan

Spawn `planner` with prompt:

    feature: $ARGUMENTS
    spec_dir: SPEC_DIR

After: verify `SPEC_DIR/implementation-plan.md` created. If missing → stop: "Planner failed to produce implementation plan. Re-run `/feature-implement`." Extract test decision from planner return value (`TEST: skip — reason` or `TEST: write`).

### Dual-LLM Plan Validation

1. `mkdir -p SPEC_DIR/validation/plan/`

2. Launch 2 validators in parallel (same response):
   - **Claude Task**: spawn `plan-validator` with prompt: `feature: $ARGUMENTS, spec_dir: SPEC_DIR, output_file: SPEC_DIR/validation/plan/claude.md`
   - **Codex Task**: spawn `codex` with prompt:
     ```
     plan-validator
     feature: $ARGUMENTS
     spec_dir: SPEC_DIR
     output_file: SPEC_DIR/validation/plan/codex.md
     ```

3. Check: if Claude returned `NO_ISSUES` AND Codex returned `NO_ISSUES` (or `NO_OUTPUT`) → log `[Plan validation: clean]`, go to Phase 2.

4. Otherwise → re-spawn `planner` with prompt:

       feature: $ARGUMENTS
       spec_dir: SPEC_DIR
       revision_dir: SPEC_DIR/validation/plan/

   Log planner revision result. Max 1 fix cycle — if planner returns `NO_CHANGES`, continue. Extract test decision from planner return value before Phase 3.

## Phase 2: Implementation

Read `SPEC_DIR/implementation-plan.md`. For each `### Step N: <title>`, extract the full step block (header + **Files** + **Action** + description until next `### Step` or end of file).

For each step in order:

1. `[Step {N}/{total}: {title}]`
2. Spawn `coder` via Task(super-agent) with prompt:

       coder
       mode: implement
       feature: $ARGUMENTS
       spec_dir: SPEC_DIR
       step_number: N
       step_total: TOTAL
       step_body: <full step block text>

3. `DONE` → next step. `UNRESOLVED` → record.

## Phase 3: Test Writing

Planner skipped tests → `[Tests: skipped — {reason}]`, go to Phase 4.

Otherwise spawn `test-writer` with prompt:

    feature: $ARGUMENTS
    spec_dir: SPEC_DIR

If test-writer returns ERROR → log `[Tests: error — {reason}]`, continue to Phase 4 (tests skipped).

## Phase 4: Validation Cycle

Initialize `ai_iter = 0` before starting.

`git status --porcelain` → parse file paths, exclude deletions (both staged `D ` and working-tree ` D` porcelain prefixes), exclude non-source files (lock files, images, fonts, videos, `.min.*`, `.map`, `.d.ts`, `.generated.*`, `.snap`, `dist/`, `build/`, `vendor/`, `node_modules/`, `temp/`) → `CHANGED_FILES` (newline-separated).

Spawn `global-validator` via Task(super-agent) with prompt:

    global-validator
    feature: $ARGUMENTS
    spec_dir: SPEC_DIR
    skip_spec: false
    files:
    - {CHANGED_FILES, each on own line with "- " prefix}

Check global-validator status:
- `NO_ISSUES` → Phase 5.
- `HAS_ISSUES` + `ai_iter >= 2` → append "AI: HAS_ISSUES after {ai_iter} fix cycles" to unresolved_steps, Phase 5.
- `HAS_ISSUES` + `ai_iter < 2` → spawn `planner` with prompt:

        feature: $ARGUMENTS
        spec_dir: SPEC_DIR
        issues_file: validation/issues.md

  Read `SPEC_DIR/validation/fix-plan.md`. For each `### Step N: <title>`, spawn `coder` via Task(super-agent) like Phase 2 (mode: implement, step_number, step_total, step_body inline). Coder UNRESOLVED → record in `unresolved_steps`. Coder crash → continue to next step.
  Increment `ai_iter`. Recompute CHANGED_FILES (same filtering rules). Re-run global-validator with updated CHANGED_FILES → return to status check above.

## Phase 5: Finalize

1. `git status --porcelain` → parse entries, exclude non-source files (same list as Phase 4). Stage by status:
   - Working-tree deletions (second char `D`): `git rm --cached`.
   - Already-staged deletions (first char `D`, second char ` `): skip.
   - Everything else: `git add`.
2. `git diff --cached --stat` → stats.
3. Read `SPEC_DIR/technical-requirements.md`, derive a concise commit description (max 72 chars). Run `git commit -m "feat: {description}"`. On hook failure: write errors to `SPEC_DIR/validation/issues.md` as `[open]` lines, spawn coder fix-ai (`feature: $ARGUMENTS`), re-stage (step 1), retry commit. Max 2 fix attempts.
4. If `unresolved_steps` is non-empty: create `temp/$ARGUMENTS-warnings/technical-requirements.md` with each unresolved issue as a numbered section (What / Why / Fix). If `ai_iter > 0`, read `SPEC_DIR/validation/issues.md`, filter `[open]` lines, and include them as context; if `ai_iter = 0`, describe issues based on `unresolved_steps` entries only (no validation reports available). Issue descriptions must explain the problem and its impact conceptually — avoid specific internal identifiers (Prisma model names, field names, variable names, method names) unless naming the identifier is essential for locating the bug.
5. Folder status:
   - `rm -f SPEC_DIR/NEXT--* 2>/dev/null || true`
   - `mv SPEC_DIR SPEC_DIR-done`
   - `mkdir -p temp/done && mv SPEC_DIR-done temp/done/`
   - If `temp/$ARGUMENTS-warnings/` was created in step 4 → `touch temp/$ARGUMENTS-warnings/NEXT--feature-fix`
6. Output report

# Edge Cases

- Run interrupted mid-implementation → changes already applied to app files persist; re-run starts a new plan from scratch.

# Report

```
## Implementation Complete

**Feature:** <feature-name>
**Files changed:** N
**Tests:** written (or "skipped")
**Validation:** {len(unresolved_steps)} unresolved, Post-all AI {ai_iter}/2

### Unresolved Issues
- [error|warning] file:line — description

### Next Steps
- Fix warnings: `/feature-fix <feature-name>-warnings`
```

Omit **Unresolved Issues** if none. Omit **Next Steps** entirely if no unresolved issues.
