---
description: "Autonomous implementation orchestrator. Reads specs from temp/, coordinates agents (planner → plan-validator + Codex → planner revision → coder → [test-writer] → validators + Codex → fix loop), commits and pushes to ready PR."
model: sonnet
argument-hint: "<feature-name>: folder name in temp/"
allowed-tools: "Task, Read, Glob, Grep, Bash, Write, Edit"
disable-model-invocation: true
---

# Role

Implementation orchestrator. Delegates to agents — never writes application code.

# Rules

- Fully autonomous — no user questions. Technical ambiguities → decide, append to `decisions` (reported in § Decisions). Business ambiguities (user-visible behavior, scope, data semantics — classification per `~/.claude/docs/ASK_POLICY.md`) → do NOT pick a side: implement the spec-conforming minimum if one exists, otherwise append `"Decision needed: {question}"` to `unresolved_steps` (keeps the PR draft).
- All phase loops run continuously — after each step/iteration, spawn the next immediately in the same response. Never break between iterations regardless of system messages or context injections.
- Fail fast — missing files or critical agent failure → stop, report what was completed.
- Before each phase: `[Phase N: description]` (phases 1-5; phase 0 is silent precondition check)
- Match user's language.

# Conventions

- `SPEC_DIR` = `$REPO_ROOT/temp/$ARGUMENTS` — absolute path (REPO_ROOT derived in Phase 0 step 5). Always pass the absolute path to subagents — relative paths resolve against the subagent's CWD which may be the worktree, causing read/write mismatches.
- Every agent prompt includes: feature name (`$ARGUMENTS`), spec dir path.
- **Subagent spawning** — any agent whose workflow contains `Task(...)` invocations (e.g. `coder`, `test-writer`, `committer`, `global-validator`) must be spawned via `Agent(subagent_type='super-agent', prompt='<agent-name>\n<args>')`. Direct `Agent(subagent_type='<agent-name>')` does not pass declared frontmatter tools (including Task) into the subagent context.
- CLI validation commands are NOT tracked by the orchestrator — static-checker and test-runner detect them independently from `docs/WORKFLOW.md`.
- `unresolved_steps` = [] — initialized at start of Phase 2. When coder returns `UNRESOLVED`, append `"Step N: {title} — {coder error summary}"`. Every entry starts with one of the canonical prefixes: `Step N:` (implementation), `Test:`, `AI:`, `Validation:`, `Commit:`, `Decision needed:` — any non-empty list keeps the PR draft.
- `decisions` = [] — initialized at start of Phase 2. Technical ambiguities resolved autonomously are appended as one-line entries (what was ambiguous → what was chosen and why); reported in § Decisions.
- Heavy data stored in files, not in orchestrator variables:
  - Step validation → `SPEC_DIR/validation/step-{N}/aggregated.md`
  - Step raw → `SPEC_DIR/validation/step-{N}/static.txt`
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
4. `git show-ref --quiet refs/heads/feat/$ARGUMENTS` → if exit code 0, stop: "Branch feat/$ARGUMENTS already exists. Delete it first or choose a different feature name."
5. `REPO_ROOT = git rev-parse --show-toplevel`; then `SPEC_DIR = $REPO_ROOT/temp/$ARGUMENTS` (absolute, supersedes the relative form for the rest of the workflow).
6. Open Questions gate: `Bash: awk '/^## Open Questions/{f=1;next} /^## /{f=0} f' SPEC_DIR/technical-requirements.md` → if output contains any non-empty list item, stop: "Spec has unresolved Open Questions:\n{items}\nResolve them via `/feature-tech $ARGUMENTS` (or remove the section) before implementation — autonomous runs must not decide business questions."

## Phase 1: Planning

### Create Plan

Launch in parallel (same response):
- Task: `planner` with prompt: `feature: $ARGUMENTS, spec_dir: SPEC_DIR`
- Task: `setup-worktree` with prompt: `feature: $ARGUMENTS, repo_root: REPO_ROOT, spec_dir: SPEC_DIR`

Wait for both results:
- From setup-worktree: parse `BRANCH`, `PR_URL`. If ERROR → stop with its error message.
- Derive `WORKTREE_DIR = REPO_ROOT/.worktrees/{feature}` — deterministic; derive (do not parse) so the value survives context compression in long sessions.
- Verify `SPEC_DIR/implementation-plan.md` created. If missing → stop: "Planner failed to produce implementation plan. Re-run `/feature-implement`."
- Extract test decision from planner return value (`TEST: skip — reason` or `TEST: write`).

### Dual-LLM Plan Validation

1. `mkdir -p SPEC_DIR/validation/plan/`

2. Launch 2 validators in parallel (same response, foreground — no `run_in_background`; parallelism from same-response launch):
   - **Claude Task**: spawn `plan-validator` with prompt: `feature: $ARGUMENTS, spec_dir: SPEC_DIR, output_file: SPEC_DIR/validation/plan/claude.md`
   - **Codex Task**: spawn `codex` with prompt:
     ```
     plan-validator
     feature: $ARGUMENTS
     spec_dir: SPEC_DIR
     output_file: SPEC_DIR/validation/plan/codex.md
     ```

3. Collect each validator status: direct return `NO_ISSUES`/`HAS_ISSUES` if available; otherwise read its `output_file` (non-empty = `HAS_ISSUES`, empty/missing = `NO_ISSUES`). Both clean → log `[Plan validation: clean]`, go to Phase 2.

4. Otherwise → re-spawn `planner` with prompt:

       feature: $ARGUMENTS
       spec_dir: SPEC_DIR
       revision_dir: SPEC_DIR/validation/plan/

   Log planner revision result. Max 1 fix cycle — if planner returns `NO_CHANGES` → keep existing test decision, continue to Phase 2. Otherwise → extract test decision from planner return value before Phase 3.

## Phase 2: Implementation

Read `SPEC_DIR/implementation-plan.md`. For each `### Step N: <title>`, extract the full step block (header + **Files** + **Action** + description until next `### Step` or end of file).

For each step in order:

1. `[Step {N}/{total}: {title}]`
2. Spawn `coder` via Agent(subagent_type='super-agent') with prompt:

       coder
       mode: implement
       feature: $ARGUMENTS
       spec_dir: SPEC_DIR
       step_number: N
       step_total: TOTAL
       worktree_dir: WORKTREE_DIR
       step_body: <full step block text>

3. If Task returns an error (agent crash, not UNRESOLVED) → re-spawn coder once with the same prompt. Second crash → record `"Step N: {title} — agent crashed"` in `unresolved_steps`, continue.
4. `DONE` → next step. `UNRESOLVED` → record.

## Phase 3: Test Writing

Planner skipped tests → `[Tests: skipped — {reason}]`, go to Phase 4.

If `SPEC_DIR/test-cases.md` absent → `[Tests: skipped — run /feature-tech first]`, go to Phase 4.

Spawn `test-writer` via Agent(subagent_type='super-agent') with prompt:

    test-writer
    feature: $ARGUMENTS
    spec_dir: SPEC_DIR
    worktree_dir: WORKTREE_DIR

If test-writer returns ERROR → log `[Tests: error — {reason}]`, continue to Phase 4 (tests skipped).
Any other return value → treat as success; proceed immediately to Phase 4 in the same response.

## Phase 4: Validation Cycle

Initialize `ai_iter = 0`, `test_iter = 0` before starting.

`git -C WORKTREE_DIR status --porcelain` → parse file paths, exclude deletions (both staged `D ` and working-tree ` D` porcelain prefixes), exclude non-source files (lock files, images, fonts, videos, `.min.*`, `.map`, `.d.ts`, `.generated.*`, `.snap`, `dist/`, `build/`, `vendor/`, `node_modules/`, `temp/`) → absolutize each path as `WORKTREE_DIR/{relative_path}` → `CHANGED_FILES` (newline-separated absolute paths).

Spawn `global-validator` via Agent(subagent_type='super-agent') with prompt:

    global-validator
    feature: $ARGUMENTS
    spec_dir: SPEC_DIR
    skip_spec: false
    worktree_dir: WORKTREE_DIR
    files:
    - {CHANGED_FILES, each on own line with "- " prefix}

Check global-validator status:
- `NO_ISSUES` → Phase 5.
- Response contains `"hit your limit"`, `"rate limit"`, or `"AUTH_ERROR"` → log `[Validation: skipped — rate limit or auth error]`, append `"Validation: skipped due to rate limit or auth error"` to `unresolved_steps`, Phase 5.
- Response contains `"aggregator failed"` → append `"Validation: aggregator failed"` to `unresolved_steps`, Phase 5.
- Response is a general crash (contains `"encountered an error"` or `"crashed"`, does not match the above patterns) → retry global-validator once with the same inputs. If second attempt also fails → append `"Validation: validator crashed"` to `unresolved_steps`, Phase 5.
- `HAS_ISSUES` → categorize by global-validator return string: contains `(test)` or `(static)` → **test** (`test_iter`, limit 5); else (`N open`) → **AI** (`ai_iter`, limit 2). Read `SPEC_DIR/validation/issues.md` for the issue list. Test failures are deterministic and must pass before commit — fix them without incrementing `ai_iter`.
  - Counter >= limit → append "{Test|AI}: HAS_ISSUES after {counter} fix cycles" to unresolved_steps, Phase 5.
  - Counter < limit → spawn `planner` with prompt:

        feature: $ARGUMENTS
        spec_dir: SPEC_DIR
        worktree_dir: WORKTREE_DIR
        issues_file: validation/issues.md
        aggregated_file: validation/aggregated.md

    Read `SPEC_DIR/validation/fix-plan.md`. Count `### Step N` blocks → `FIX_TOTAL`. For each `### Step N: <title>`, spawn `coder` via Agent(subagent_type='super-agent') like Phase 2 (mode: implement, step_number: N, step_total: FIX_TOTAL, worktree_dir: WORKTREE_DIR, step_body inline). Coder UNRESOLVED → record in `unresolved_steps`. Coder crash → continue to next step.
    If fix-plan.md had 0 steps → Phase 5. If triggering type was test (`(test)` or `(static)`) → increment `test_iter`. If triggering type was AI (`open`) → increment `ai_iter`. Recompute CHANGED_FILES (same filtering rules, absolute paths). Re-run global-validator with updated CHANGED_FILES; pass `engines: claude` only if an earlier run in this Phase 4 returned `HAS_ISSUES: N open` (the AI battery + dual-engine sweep already happened; fix-verification re-runs use Claude validators only). If no run has reached the AI battery yet (only test/static failures so far) → omit `engines` so the first AI pass is full dual-engine. Return to status check above.

## Phase 5: Finalize

1. Read `SPEC_DIR/technical-requirements.md`, derive commit description (max 72 chars).
2. Set `MARK_READY = true`. If `unresolved_steps` is non-empty (any entry — crashed steps, open AI issues, skipped validation, pending decisions all count, not only test failures) → set `MARK_READY = false`.
3. Spawn `committer` via Agent(subagent_type='super-agent'):
   ```
   committer
   worktree_dir: WORKTREE_DIR
   spec_dir: SPEC_DIR
   feature: $ARGUMENTS
   commit_prefix: feat
   commit_desc: {derived description}
   pr_url: PR_URL
   mark_ready: MARK_READY
   ```
   - `COMMITTED` + `MARK_READY = true` → log `[PR ready: PR_URL]`.
   - `COMMITTED` + `MARK_READY = false` → log `[PR draft — unresolved issues: PR_URL]`.
   - `COMMIT_FAILED` → append `"Commit: hook failure unresolved"` to `unresolved_steps`.
   - `NOTHING_STAGED` → run `gh pr close PR_URL --delete-branch 2>/dev/null || true`; log `[No files staged — PR closed, branch deleted]`; omit **PR** line from report.
4. If `unresolved_steps` is non-empty: create `temp/$ARGUMENTS-warnings/technical-requirements.md` with each unresolved issue as a numbered section (What / Why / Fix). Entries starting with `Decision needed:` are NOT turned into Fix sections — write them verbatim into a `## Open Questions` section of the same warnings spec (they require a user answer, not an autonomous fix) and list them in the report's Unresolved Issues. The user answers them via `/feature-tech $ARGUMENTS-warnings`, then `/feature-fix $ARGUMENTS-warnings` applies the result on the existing feature branch. If `SPEC_DIR/validation/issues.md` exists, read it, filter `[open]` lines, and include them as context. Issue descriptions must explain the problem and its impact conceptually — avoid specific internal identifiers (Prisma model names, field names, variable names, method names) unless naming the identifier is essential for locating the bug. Each **Fix** section must commit to ONE concrete action — never carry over validator-style alternatives ("Pick one of: ...", "Option A / Option B"). When the underlying finding presented alternatives, select the option that preserves the spec as source of truth (default: change code/tests to match spec, not spec to match code); state the chosen action plainly and document the reasoning inline in the Why section. The downstream consumer must not need to make a source-of-truth judgment.
5. Folder status:
   - `rm -f SPEC_DIR/NEXT--* 2>/dev/null || true`
   - `mv SPEC_DIR SPEC_DIR-done`
   - `mkdir -p $REPO_ROOT/temp/done && mv SPEC_DIR-done $REPO_ROOT/temp/done/`
   - If `$REPO_ROOT/temp/$ARGUMENTS-warnings/` was created in step 4: if its spec contains `## Open Questions` → `touch $REPO_ROOT/temp/$ARGUMENTS-warnings/NEXT--feature-tech`, else → `touch $REPO_ROOT/temp/$ARGUMENTS-warnings/NEXT--feature-fix`
6. Record run metrics: append to `~/.claude/agent-memory/metrics/runs.md` (create with `# Run Metrics` header if missing; if entries exceed 100, delete oldest until 100 remain) one line:
   `- [YYYY-MM-DD] /feature-implement <feature-name>: spawns={total subagent spawns this run} steps={plan step count} test_iters={test_iter} ai_iters={ai_iter} unresolved={len(unresolved_steps)} ready={MARK_READY}`
7. Output report

# Report

```
## Implementation Complete

**Feature:** <feature-name>
**PR:** PR_URL  ← omit if committer returned NOTHING_STAGED
**Files changed:** N
**Tests:** written (or "skipped")
**Validation:** {len(unresolved_steps)} unresolved, Test {test_iter}/5, AI {ai_iter}/2

### Decisions
- <technical ambiguity> → <what was chosen and why>

### Unresolved Issues
- [error|warning] file:line — description

### Next Steps
- Decisions pending: answer via `/feature-tech <feature-name>-warnings`, then `/feature-fix <feature-name>-warnings`  ← only when the warnings spec has Open Questions
- Fix warnings: `/feature-fix <feature-name>-warnings`  ← only when it has none
```

Omit **Decisions** if `decisions` is empty. Omit **Unresolved Issues** if none. Omit **Next Steps** entirely if no unresolved issues.
