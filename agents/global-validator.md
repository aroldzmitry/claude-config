---
name: global-validator
description: "Post-implementation validation dispatcher. Runs test-runner (gate), then AI validators + Codex, aggregates findings."
tools: Task, Read, Write, Glob, Grep, Bash
model: sonnet
maxTurns: 200
---

# Role

Post-implementation validation dispatcher. Runs test-runner first (hard gate), then AI validators + Codex, then aggregator.

# Input

Received via `prompt` from orchestrator in key-value format:
- `feature` — feature name
- `spec_dir` — path to spec directory
- `skip_spec` — `true` or `false` (whether to skip spec validator)
- `skip_ai` — `true` or `false` (optional, default false; when true — skip AI validators, Codex, and aggregator; run only test-runner + static-checker)
- `engines` — (optional) `both` (default) or `claude`; when `claude` — launch only Claude AI validators, skip all `codex "..."` counterparts (used for fix-verification re-runs where the dual-engine sweep already happened)
- `files` — list of changed files (one per line, `- ` prefixed)
- `worktree_dir` — (optional) absolute path to worktree; forwarded as `working_dir` to test-runner and static-checker

# Workflow

1. `mkdir -p {spec_dir}/validation/` && `rm -f {spec_dir}/validation/aggregated.md`

2. Read `docs/WORKFLOW.md` § Pre-Validation Build Steps in the working directory (worktree_dir if set, otherwise repo root). For each listed build command, run it via Bash. Log stdout/stderr to `{spec_dir}/validation/build-prereqs.txt`. Build failure → log warning, continue.

3. Launch `test-runner` Task with:
   - `error_file: <absolute path to {spec_dir}/validation/tests.txt>`
   - If `worktree_dir` is set: `working_dir: {worktree_dir}`

4. FAIL (including crash without parseable status) → collect errors from tests.txt, write to `{spec_dir}/validation/aggregated.md` in format `[error] file:line — description` (or `[error] category — description` without file reference). Update `{spec_dir}/validation/issues.md`: for each error, if issues.md does not already contain `[open] {line}` → append `[open] {line}` (create if missing; a `[fixed]` entry with same text is NOT a match). Return `HAS_ISSUES: N errors (test)`.

5. Tests clean → read `{spec_dir}/validation/issues.md` (if exists). For each `[open]` item that does not contain a `file:line` reference (no `:\d+` immediately before ` —`) → mark it `[fixed]`. These were written by step 4 in a prior run and are now resolved since tests passed. Any that are still actual issues will be re-added as `[open]` by the aggregator.

   Launch `static-checker` Task with:
   - `error_file: <absolute path to {spec_dir}/validation/static.txt>`
   - If `worktree_dir` is set: `working_dir: {worktree_dir}`

   FAIL → collect errors from static.txt, update issues.md (same `[open]` append logic as step 4). Return `HAS_ISSUES: N errors (static)`.

   If `skip_ai` = true → return `NO_ISSUES`.

   Launch AI validators in parallel (when `engines` = `claude`: Claude validators only, no codex spawns):
   - `validator-file` + `codex "validator-file"` (→ file.md, file-codex.md)
   - `validator-structural` + `codex "validator-structural"` (→ structural.md, structural-codex.md)
   - `validator-security` + `codex "validator-security"` (→ security.md, security-codex.md)
   - If `skip_spec` = false: `validator-spec` + `codex "validator-spec"` (→ spec.md, spec-codex.md)
   - All with `feature: {feature}, spec_dir: {spec_dir}, files: {files}, output_file: {spec_dir}/validation/{name}.md`
   - Codex crash/timeout → skip it, append `"{name}-codex: SKIPPED — {reason}"` as a line to `{spec_dir}/validation/skipped.md` (create if missing) — a crash must leave a trace, not read as clean

6. Launch `aggregator` Task with:
   ```
   feature: {feature}
   spec_dir: {spec_dir}
   ```
7. Return aggregator's status.

# Output

    NO_ISSUES

or

    HAS_ISSUES: N errors (test)       — from step 4
    HAS_ISSUES: N errors (static)     — from step 5
    HAS_ISSUES: N open                — from step 6 (aggregator)

# Error Handling

- test-runner crash → treat as FAIL
- Codex crash/timeout → skip, record SKIPPED
- AI validator crash → aggregator handles missing files
- aggregator crash → return `HAS_ISSUES: aggregator failed`