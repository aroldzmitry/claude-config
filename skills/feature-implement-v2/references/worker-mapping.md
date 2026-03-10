# Worker Mapping

Maps each feature-implement-v2 worker to its source agent, preserved settings, and new runtime contracts.

| Worker | Source Agent | Model | Tools | Permission Mode | Core Rules Preserved | Task Schema | Result Schema |
|--------|-------------|-------|-------|-----------------|---------------------|-------------|---------------|
| `preprocessor` | *(new — no prior agent)* | haiku | Read, Glob, Write | acceptEdits | Deterministic parsing first; LLM only as fallback. Outputs normalized JSON only. | `schemas/task/preprocessor-task.schema.json` | `schemas/result/preprocessor-result.schema.json` |
| `planner` | `agents/planner.md` | opus | Read, Glob, Grep, Write | acceptEdits | Steps must be independently executable. Step size: 1–3 files. Max 10 steps. No implementation, only plan. | `schemas/task/planner-task.schema.json` | `schemas/result/planner-result.schema.json` |
| `plan-validator` | `agents/plan-validator.md` | sonnet | Read, Glob, Grep, Edit, Write | acceptEdits | Validates plan against architecture docs. Fixes issues in-place. Returns pass/fail/fixed. | `schemas/task/plan-validator-task.schema.json` | `schemas/result/plan-validator-result.schema.json` |
| `test-writer` | `agents/test-writer.md` | sonnet | Read, Glob, Grep, Write | acceptEdits | TDD — tests must be red before implementation. One test file per coder step. No implementation code. | `schemas/task/test-writer-task.schema.json` | `schemas/result/test-writer-result.schema.json` |
| `coder-implement` | `agents/coder.md` (implement mode) | opus | Read, Glob, Grep, Write, Edit, Bash | bypassPermissions | One plan step per invocation. Idempotency check before writing. Max 3 CLI fix attempts inline. | `schemas/task/coder-implement-task.schema.json` | `schemas/result/coder-implement-result.schema.json` |
| `self-checker` | `agents/self-checker.md` | sonnet | Read, Glob, Grep, Edit, Bash | bypassPermissions | Post-step quality check only. Fixes mechanical issues. No logic changes. | `schemas/task/self-checker-task.schema.json` | `schemas/result/self-checker-result.schema.json` |
| `cli-checker` | `agents/cli-checker.md` | haiku | Bash, Read, Write | bypassPermissions | Run CLI commands only. Absorb large output. Return only errors. No code changes. | `schemas/task/cli-checker-task.schema.json` | `schemas/result/cli-checker-result.schema.json` |
| `coder-fix-cli` | `agents/coder.md` (fix-cli mode) | opus | Read, Glob, Grep, Write, Edit, Bash | bypassPermissions | Fix CLI errors only. No drive-by changes. Max 3 re-run attempts after each fix. | `schemas/task/coder-fix-cli-task.schema.json` | `schemas/result/coder-fix-cli-result.schema.json` |
| `validator-structural` | `agents/validator-structural.md` | sonnet | Read, Glob, Grep | plan | Read-only. Report findings only — never modify files. Structural issues: duplicates, naming, placement. | `schemas/task/validator-task.schema.json` | `schemas/result/validator-result.schema.json` |
| `validator-file` | `agents/validator-file.md` | sonnet | Read, Glob, Grep | plan | Read-only. Per-file logic errors, edge cases, dead code, naming, pattern violations. | `schemas/task/validator-task.schema.json` | `schemas/result/validator-result.schema.json` |
| `validator-security` | `agents/validator-security.md` | sonnet | Read, Glob, Grep | plan | Read-only. XSS, injections, hardcoded secrets, unsafe input, auth/authz issues only. | `schemas/task/validator-task.schema.json` | `schemas/result/validator-result.schema.json` |
| `validator-spec` | `agents/validator-spec.md` | sonnet | Read, Glob, Grep | plan | Read-only. All spec requirements implemented, nothing extra, test cases covered. | `schemas/task/validator-task.schema.json` | `schemas/result/validator-result.schema.json` |
| `aggregator` | `agents/aggregator.md` | sonnet | Read, Glob, Grep, Write | acceptEdits | Collect 4 validator reports. Verify findings against code. Filter false positives. Deduplicate. | `schemas/task/aggregator-task.schema.json` | `schemas/result/aggregator-result.schema.json` |
| `coder-fix-validation` | `agents/coder.md` (fix-ai mode) | opus | Read, Glob, Grep, Write, Edit, Bash | bypassPermissions | Fix only issues in aggregated report. Never read raw validator outputs. No drive-by changes. | `schemas/task/coder-fix-validation-task.schema.json` | `schemas/result/coder-fix-validation-result.schema.json` |
| `improvement-analyzer` | `agents/improvement-analyzer.md` | opus | Read, Glob, Grep, Write, Edit | acceptEdits | Systemic analysis only — never suggest code fixes for current feature. Root cause, not symptoms. | `schemas/task/improvement-analyzer-task.schema.json` | `schemas/result/improvement-analyzer-result.schema.json` |

## Notes

- All workers adapted to JSON-first runtime: read task from `task_file`, write result to `result_file` (atomic `.tmp` rename).
- `preprocessor` is a new worker with no prior agent counterpart.
- `coder-implement`, `coder-fix-cli`, `coder-fix-validation` are split from a single `agents/coder.md` (three invocation modes become three separate workers).
- All 4 validators share the same `validator-task` and `validator-result` schemas — they differ only in focus area and prompt.
- Workers in `read_only` execution mode (`plan` permission) support parallelism; all others run sequentially.
