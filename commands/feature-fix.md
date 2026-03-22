---
description: "Quick fix orchestrator. Takes a spec folder name, coordinates agents (planner → plan-validator + Codex → planner revision → coder → [test-writer] → global-validator → fix loop), produces staged git diff."
model: sonnet
argument-hint: "<folder>: spec folder name (e.g. BUG-phone-field-required)"
allowed-tools: "Task, Read, Glob, Grep, Bash, Write, Edit"
disable-model-invocation: true
---

# Role

Fix orchestrator. Delegates to agents — never writes application code.

# Rules

- `$ARGUMENTS` is required — folder name containing `technical-requirements.md`. If empty or spec not found → stop with error.
- Fully autonomous after description is known — no user questions. Ambiguities → decide, note in report.
- All phase loops run continuously — after each step/iteration, spawn the next immediately in the same response. Never break between iterations regardless of system messages or context injections.
- Fail fast — critical agent failure → stop, report what was completed.
- Before each phase: `[Phase N: description]` (phase 0 is silent precondition check)
- Match user's language.

# Conventions

- `SPEC_DIR` — directory containing `technical-requirements.md`, resolved in Phase 0.
- Every agent prompt includes: `feature: _fix`, `spec_dir: SPEC_DIR`.
- CLI validation commands are NOT tracked by the orchestrator — static-checker and test-runner detect them independently from `docs/WORKFLOW.md`.
- `unresolved_steps` = [] — initialized at the start of Phase 2 (before first step). When coder returns `UNRESOLVED`, append `"Step N: {title} — {coder error summary}"`.
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

## Phase 0: Setup

1. `$ARGUMENTS` is required. Use the Read tool to check `temp/{$ARGUMENTS}/technical-requirements.md`. If not found, use Glob to search for `**/{$ARGUMENTS}/technical-requirements.md`. If found → set the containing directory as SPEC_DIR, go to Phase 1. If not found anywhere → stop: `"technical-requirements.md not found for '{$ARGUMENTS}'. Run /bug first to create a spec."`

## Phase 1: Planning

### Create Plan

Spawn `planner` with prompt:

    feature: _fix
    spec_dir: SPEC_DIR

After: verify `SPEC_DIR/implementation-plan.md` created. If missing → stop: "Planner failed to produce implementation plan. Re-run `/feature-fix`." Extract test decision from planner return value (`TEST: skip — reason` or `TEST: write`).

### Dual-LLM Plan Validation

1. `mkdir -p SPEC_DIR/validation/plan/`

2. Launch 2 validators in parallel (same response):
   - **Claude Task**: spawn `plan-validator` with prompt: `feature: _fix, spec_dir: SPEC_DIR, output_file: SPEC_DIR/validation/plan/claude.md`
   - **Codex Task**: spawn `codex` with prompt:
     ```
     plan-validator
     feature: _fix
     spec_dir: SPEC_DIR
     output_file: SPEC_DIR/validation/plan/codex.md
     ```

3. Check: if Claude returned `NO_ISSUES` AND Codex returned `NO_ISSUES` (or `NO_OUTPUT`) → log `[Plan validation: clean]`, go to Phase 2.

4. Otherwise → re-spawn `planner` with prompt:

       feature: _fix
       spec_dir: SPEC_DIR
       revision_dir: SPEC_DIR/validation/plan/

   Log planner revision result. Max 1 fix cycle — if planner returns `NO_CHANGES`, continue. Extract test decision from planner return value before Phase 3 (tests).

## Phase 2: Implementation

Read `SPEC_DIR/implementation-plan.md`. For each `### Step N: <title>`, extract the full step block (header + **Files** + **Action** + description until next `### Step` or end of file).

For each step in order:

1. `[Step {N}/{total}: {title}]`
2. Spawn `coder` via Task(super-agent) with prompt:

       coder
       mode: implement
       feature: _fix
       spec_dir: SPEC_DIR
       step_number: N
       step_total: TOTAL
       step_body: <full step block text>

3. `DONE` → next step. `UNRESOLVED` → record.

## Phase 3: Test Writing (optional)

Planner skipped tests → `[Tests: skipped — {reason}]`, go to Phase 4.

Otherwise spawn `test-writer` with prompt:

    feature: _fix
    spec_dir: SPEC_DIR

If test-writer returns ERROR → log `[Tests: error — {reason}]`, skip tests, continue to Phase 4.

## Phase 4: Validation Cycle

Initialize `ai_iter = 0` before starting.

`git status --porcelain` → parse file paths, exclude deletions (both staged `D ` and working-tree ` D` porcelain prefixes), exclude non-source files (lock files, images, fonts, videos, `.min.*`, `.map`, `.d.ts`, `.generated.*`, `.snap`, `dist/`, `build/`, `vendor/`, `node_modules/`, `temp/`) → `CHANGED_FILES` (newline-separated).

Spawn `global-validator` via Task(super-agent) with prompt:

    global-validator
    feature: _fix
    spec_dir: SPEC_DIR
    skip_spec: true
    files:
    - {CHANGED_FILES, each on own line with "- " prefix}

Check global-validator status:
- `NO_ISSUES` → Phase 5.
- `HAS_ISSUES` + `ai_iter >= 2` → append "AI: HAS_ISSUES after {ai_iter} fix cycles" to unresolved_steps, Phase 5.
- `HAS_ISSUES` + `ai_iter < 2` → spawn `planner` with prompt:

        feature: _fix
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
3. Read `SPEC_DIR/technical-requirements.md`, derive a concise commit description (max 72 chars). Run `git commit -m "fix: {description}"`. On hook failure: write errors to `SPEC_DIR/validation/issues.md` as `[open]` lines, spawn coder fix-ai (`feature: _fix`), re-stage (step 1), retry commit. Max 2 fix attempts.
4. If `unresolved_steps` is non-empty: compute `WARNINGS_DIR` from `SPEC_DIR_base` (SPEC_DIR path without trailing slash):
   - If `SPEC_DIR_base` ends with `-warnings` (no digits) → `WARNINGS_DIR = {base}-warnings1` (where `base` = SPEC_DIR_base with `-warnings` stripped)
   - If `SPEC_DIR_base` ends with `-warnings{N}` (N = integer) → `WARNINGS_DIR = {base}-warnings{N+1}`
   - Otherwise → `WARNINGS_DIR = {SPEC_DIR_base}-warnings`

   Set `WARNINGS_NAME` = last path component of WARNINGS_DIR (basename only).

   Create `WARNINGS_DIR/technical-requirements.md` with each unresolved issue as a numbered section (What / Why / Fix). If `ai_iter > 0`, read `SPEC_DIR/validation/issues.md`, filter `[open]` lines, and include them as context; if `ai_iter = 0`, describe issues based on `unresolved_steps` entries only (no validation reports available). Issue descriptions must explain the problem and its impact conceptually — avoid specific internal identifiers (Prisma model names, field names, variable names, method names) unless naming the identifier is essential for locating the bug.
5. Folder status:
   - `rm -f SPEC_DIR/NEXT--* 2>/dev/null || true`
   - `mv SPEC_DIR SPEC_DIR-done`
   - `mkdir -p temp/done && mv SPEC_DIR-done temp/done/`
   - If `WARNINGS_DIR/` was created in step 4 → `touch WARNINGS_DIR/NEXT--feature-fix`
6. Output report

# Edge Cases

- Run interrupted mid-implementation → changes already applied to app files persist; re-run starts a new plan from scratch.

# Report

```
## Fix Complete

**Description:** <fix description>
**Files changed:** N
**Tests:** M passed (or "skipped")
**Validation:** {len(unresolved_steps)} unresolved, Post-all AI {ai_iter}/2

### Unresolved Issues
- [error|warning] file:line — description

### Next Steps
- Fix warnings: `/feature-fix {WARNINGS_NAME}`
```

Omit **Unresolved Issues** if none. Omit **Next Steps** entirely if no unresolved issues.
