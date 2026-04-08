---
description: "Quick fix orchestrator. Takes a spec folder name, coordinates agents (planner → coder → [test-writer] → global-validator → fix attempt → commit), produces staged git diff."
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
  - Step raw → `SPEC_DIR/validation/step-{N}/static.txt`
  - Validator reports → `SPEC_DIR/validation/{name}.md` (flat, overwritten each iteration)
  - Open/fixed issue tracking → `SPEC_DIR/validation/issues.md`
  - False positives → `SPEC_DIR/validation/false-positives.md`

# Workflow

## Phase 0: Setup

1. `$ARGUMENTS` is required. Use the Read tool to check `temp/{$ARGUMENTS}/technical-requirements.md`. If not found, use Glob to search for `**/{$ARGUMENTS}/technical-requirements.md`. If found → set the containing directory as SPEC_DIR, go to Phase 1. If not found anywhere → stop: `"technical-requirements.md not found for '{$ARGUMENTS}'. Run /bug first to create a spec."`

## Phase 1: Planning

Spawn `planner` with prompt:

    feature: _fix
    spec_dir: SPEC_DIR

After: verify `SPEC_DIR/implementation-plan.md` created. If missing → stop: "Planner failed to produce implementation plan. Re-run `/feature-fix`."

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

## Phase 3: Test Writing

If `SPEC_DIR/test-cases.md` exists → spawn `test-writer` via Task with prompt:

    feature: _fix
    spec_dir: SPEC_DIR

ERROR → log `[Tests: error — {reason}]`, continue. Otherwise log `[Tests: written]`.

## Phase 4: Validation

`git status --porcelain` → parse file paths, exclude deletions (both staged `D ` and working-tree ` D` porcelain prefixes), exclude non-source files (lock files, images, fonts, videos, `.min.*`, `.map`, `.d.ts`, `.generated.*`, `.snap`, `dist/`, `build/`, `vendor/`, `node_modules/`, `temp/`) → `CHANGED_FILES` (newline-separated).

Spawn `global-validator` via Task(super-agent) with prompt:

    global-validator
    feature: _fix
    spec_dir: SPEC_DIR
    skip_ai: true
    skip_spec: true
    files:
    - {CHANGED_FILES, each on own line with "- " prefix}

Check global-validator status:
- `NO_ISSUES` → Phase 5.
- `HAS_ISSUES` →
  1. Spawn `coder` via Task(super-agent) with prompt:

         coder
         mode: fix-ai
         feature: _fix
         spec_dir: SPEC_DIR
         report_file: validation/issues.md

     `UNRESOLVED` → record in `unresolved_steps`.
  2. Recompute `CHANGED_FILES` (same filtering rules). Re-run `global-validator` once with updated `CHANGED_FILES`.
  3. `NO_ISSUES` → Phase 5. `HAS_ISSUES` → append `"Validation: HAS_ISSUES after fix attempt"` to `unresolved_steps`, Phase 5.

## Phase 5: Finalize

1. `git status --porcelain` → parse entries, exclude non-source files (same list as Phase 4). Stage by status:
   - Working-tree deletions (second char `D`): `git rm --cached`.
   - Already-staged deletions (first char `D`, second char ` `): skip.
   - Everything else: `git add`.
2. `git diff --cached --stat` → stats.
3. Read `SPEC_DIR/technical-requirements.md`, derive a concise commit description (max 72 chars). Run `git commit -m "fix: {description}"`. On hook failure: re-stage formatter output (`git diff --cached --name-only | xargs -r git add 2>/dev/null || true`), retry commit once. If commit still fails: write errors to `SPEC_DIR/validation/issues.md` as `[open]` lines, spawn coder fix-ai (`mode: fix-ai, feature: _fix, spec_dir: SPEC_DIR, report_file: validation/issues.md`), re-stage (step 1), retry commit. If commit still fails: spawn coder fix-ai once more, re-stage (step 1), retry commit. Stop after 2 coder fix-ai spawns.
4. If `unresolved_steps` is non-empty: compute `WARNINGS_DIR` from `SPEC_DIR`:
   - If `SPEC_DIR` ends with `-warnings` (no digits) → `WARNINGS_DIR = {base}-warnings1` (where `base` = SPEC_DIR with `-warnings` stripped)
   - If `SPEC_DIR` ends with `-warnings{N}` (N = integer) → `WARNINGS_DIR = {base}-warnings{N+1}`
   - Otherwise → `WARNINGS_DIR = {SPEC_DIR}-warnings`

   Set `WARNINGS_NAME` = last path component of WARNINGS_DIR (basename only).

   Create `WARNINGS_DIR/technical-requirements.md` with each unresolved issue as a numbered section (What / Why / Fix). Read `SPEC_DIR/validation/issues.md` (if exists), filter `[open]` lines, include as context. Issue descriptions must explain the problem and its impact conceptually — avoid specific internal identifiers (Prisma model names, field names, variable names, method names) unless naming the identifier is essential for locating the bug.
5. Folder status:
   - `rm -f SPEC_DIR/NEXT--* 2>/dev/null || true`
   - `mv SPEC_DIR SPEC_DIR-done`
   - `mkdir -p temp/done && mv SPEC_DIR-done temp/done/`
   - If `WARNINGS_DIR/` was created in step 4 → `touch WARNINGS_DIR/NEXT--feature-fix`
6. Output report

# Report

```
## Fix Complete

**Description:** <fix description>
**Files changed:** N
**Validation:** {len(unresolved_steps)} unresolved

### Unresolved Issues
- [error|warning] file:line — description

### Next Steps
- Fix warnings: `/feature-fix {WARNINGS_NAME}`
```

Omit **Unresolved Issues** if none. Omit **Next Steps** entirely if no unresolved issues.