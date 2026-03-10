# feature-implement-v2

Implements a feature from spec documents using a JSON-first runtime pipeline.

## Invocation

```
/feature-implement-v2 <feature-name>
/feature-implement-v2 <feature-name> --preprocess-only
/feature-implement-v2 --spec-dir <path> [--preprocess-only]
```

## Requirements

- `temp/<feature-name>/technical-requirements.md` must exist (required)
- `temp/<feature-name>/business-requirements.md` (optional)
- `temp/<feature-name>/ui-requirements.md` (optional)
- `temp/<feature-name>/test-cases.md` (optional)
- Git working tree must be clean (new runs only; resuming skips this check)

## What To Do When Invoked

Run the orchestrator:

```
node ~/.claude/skills/feature-implement-v2/scripts/orchestrate.js <feature-name> [--preprocess-only]
```

Or with explicit spec directory:

```
node ~/.claude/skills/feature-implement-v2/scripts/orchestrate.js --spec-dir <path> [--preprocess-only]
```

Wait for the orchestrator to complete, then read and display the contents of the final user report at `temp/<feature>/runtime/logs/user-report.md`.

## How It Works

1. **Preprocess** — converts `.md` spec files to validated JSON in `runtime/input/`
2. **Plan** — creates ordered implementation plan (`coder-plan.json`) + test plan
3. **Test Write** — writes test files when `test_decision.skip = false`
4. **Implement** — executes plan steps one by one via `coder-implement`
5. **Self Check** — mechanical quality checks on all changed files
6. **CLI Repair** — runs project CLI tools, fixes errors (up to 3 iterations)
7. **Validate** — 4 AI validators + aggregator, fixes issues (up to 3 iterations)
8. **Improve** — post-run analysis via `improvement-analyzer`
9. **Regression Apply** — auto-applies regression fixes from improvement output
10. **Finalize** — writes final `run.json` and `logs/user-report.md`

## Preprocessing Only

`--preprocess-only` runs only the preprocess phase: converts spec `.md` files to
runtime JSON, writes `conversion-report.json`, and exits. Use this to validate
spec documents before running the full implementation pipeline.

## Runtime Artifacts

All artifacts are written under `temp/<feature>/runtime/`:

```
runtime/
  run.json                              — compact run state snapshot
  input/                                — converted JSON inputs
  tasks/                                — per-worker task files
  results/                              — per-worker result files
  artifacts/planning/                   — coder-plan.json, test-plan.json, planning-meta.json
  artifacts/cli/                        — iter-N.json per CLI iteration
  artifacts/validation/iter-N/          — aggregated.json, false-positives.json
  artifacts/improvement/                — improvement-suggestions.json
  logs/events.jsonl                     — execution audit log
  logs/user-report.md                   — final user-facing report
```

## Resume

Re-invoke the same command to resume an interrupted run. The orchestrator reads
`run.json` and `events.jsonl` to determine where to continue from. The git clean
check is skipped on resume.
