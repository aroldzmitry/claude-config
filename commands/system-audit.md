---
description: "System audit: 7 parallel validators → two-pass aggregation → interactive review → audit-applier. Persists rejected decisions as skip-list for future runs."
model: sonnet
argument-hint: "[scope?]: empty = incremental since last audit; 'all' = full corpus; 'commands', 'agents', 'docs', 'settings', or filename substring (e.g. 'feature', 'planner')"
allowed-tools: "Task, Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion"
disable-model-invocation: true
---

# Role

System auditor. Coordinates validators, aggregation, review, and fixes. Never writes system files directly — delegates to audit-applier.

# Rules

- **ONE issue per message** in Phase 3 — present, discuss, decide, then next.
- Match user's language.
- AskUserQuestion for structured decisions. Plain text for open-ended discussion.

# Conventions

- `REPORTS_DIR` = `~/.claude/agent-memory/system-audit/reports/`
- `DECISIONS_FILE` = `~/.claude/agent-memory/system-audit/decisions.md`
- `DEDUP_FILE` = `{REPORTS_DIR}/08-deduplicated.md`
- `VERIFIED_FILE` = `{REPORTS_DIR}/09-verified.md`
- `OBSERVATIONS_FILE` = `~/.claude/agent-memory/system-audit/observations.md`

# Workflow

## Phase 0: Load

1. `mkdir -p ~/.claude/agent-memory/system-audit/reports/`
2. If `{REPORTS_DIR}/fix-plan.md` exists (left by a previous partially-applied run) → ask via AskUserQuestion: **Apply pending fix-plan** (run Phase 4 on it now; on success delete the consumed fix-plan.md, then continue with a fresh audit) / **Discard** (delete it). Then delete numbered reports only: `find ~/.claude/agent-memory/system-audit/reports/ -name "0*.md" -delete` — never blanket-delete `*.md` (it would wipe a retained fix-plan).
3. Build ALL_FILES via `git -C ~/.claude ls-files --cached` — only tracked files. This excludes internal Claude Code directories (cache/, debug/, plugins/, agent-memory/).
4. SCOPE from `$ARGUMENTS`:
   - Predefined scopes: `commands`, `agents`, `docs`, `settings`, `all`. Empty `$ARGUMENTS` → incremental (step 5) when a last-audit marker exists, otherwise full corpus.
   - Unrecognized → treat as filename substring filter: filter ALL_FILES to paths containing `$ARGUMENTS` as a substring (case-insensitive). Log: "Scoped to N files matching '$ARGUMENTS'.". Set SCOPE = `all`. If 0 files match → warn "No files match '$ARGUMENTS' — defaulting to all." and keep ALL_FILES unchanged.
5. Incremental scope (only when `$ARGUMENTS` is empty): read `~/.claude/agent-memory/system-audit/last-audit-commit` if it exists. If it holds a valid commit → `CHANGED = git -C ~/.claude diff --name-only {hash}..HEAD` intersected with ALL_FILES. CHANGED empty → report "No system files changed since last audit ({short-hash}). Run `/system-audit all` for a full pass." and stop. Otherwise: ALL_FILES = CHANGED, set `INCREMENTAL = true`, log `[Incremental audit: N files changed since {short-hash}; '/system-audit all' forces full]`. Explicit `all` always audits the full corpus.

## Phase 1: Validate

Spawn 7 agents (`subagent_type: general-purpose`, `model: sonnet`) in parallel:

| Agent instructions | Output file |
|---|---|
| `agents/audit-consistency.md` | `01-consistency.md` |
| `agents/audit-completeness.md` | `02-completeness.md` |
| `agents/audit-redundancy.md` | `03-redundancy.md` |
| `agents/audit-optimization.md` | `04-optimization.md` |
| `agents/audit-architecture.md` | `05-architecture.md` |
| `agents/audit-workflow.md` | `06-workflow.md` |
| `agents/audit-generality.md` | `07-generality.md` |

Each prompt:
```
Read instructions at ~/.claude/{agent_file}. Follow all rules, checks, output format.
Input:
  files: {ALL_FILES}
  scope: {SCOPE}
  output: {REPORTS_DIR}/{output_file}

Severity calibration (apply to all findings):
- CRITICAL: produces wrong output or data loss RIGHT NOW (not theoretically)
- MEDIUM: causes incorrect behavior in normal workflows
- LOW: misleading documentation or incorrect cross-references
Only report things that ARE broken — not things that COULD break.
Do NOT report: cosmetic differences, defensive coding suggestions (missing limits, bounds, guards, error handling for unlikely paths), security hardening, theoretical edge cases, intentional design choices (self-contained agents, convenience copies), improvements or best practices.
```

If `INCREMENTAL = true`, append to each prompt: `Incremental mode: 'files' lists only recently changed files — but cross-reference checks must still Grep the whole ~/.claude corpus for references to and from these files.`

Report progress as each finishes.

Wait for all 7 validators to complete before proceeding to Phase 2.

## Phase 2: Aggregate & Filter

### Pass 1: Deduplicate

Spawn `audit-deduplicator` (`subagent_type: general-purpose`, `model: sonnet`):
```
Read instructions at ~/.claude/agents/audit-deduplicator.md.
Input:
  reports_dir: {REPORTS_DIR}
  decisions_file: {DECISIONS_FILE}
```

### Pass 2: Verify

Spawn `audit-verifier` (`subagent_type: general-purpose`, `model: sonnet`):
```
Read instructions at ~/.claude/agents/audit-verifier.md.
Input:
  input_file: {DEDUP_FILE}
  output_file: {VERIFIED_FILE}
```

Read `{VERIFIED_FILE}`. If 0 verified → "System audit clean." → Phase 5.
Show overview: N verified (critical/medium/low), N low-impact, N false positives, N filtered.

## Phase 3: Review

For each verified issue (critical → medium → low):

1. Present: severity, ID, description, files, evidence, sources, recommendation.
   Read source files on-demand if user needs more context.

2. Ask via AskUserQuestion: **Fix** / **Reject** / **Skip**.

3. Fix → discuss solution, agree on approach. Before appending: read the target file section to verify the proposed action is consistent with existing structure, format, and content. Adjust if needed. Append to `REPORTS_DIR/fix-plan.md`:
   ```
   ## Fix {ID}: {title}
   - **Target:** {file path}
   - **Action:** {agreed action}
   - **Context:** {discussion summary}
   ```

4. Reject → ask brief reason. If DECISIONS_FILE missing or has no `## Rejected` header, initialize it with `## Rejected\n` first. Then append to DECISIONS_FILE:
   `- [YYYY-MM-DD] [audit] {ID} {files}: {description} — reason: "{reason}"`

5. Skip → nothing recorded.

Progress: `[3/N | next: M-02 — description]`

After all: if fix-plan.md exists → Phase 4. Otherwise → Phase 5.

## Phase 4: Apply

1. No fix-plan.md → Phase 5.
2. Spawn `audit-applier` (`subagent_type: general-purpose`, `model: sonnet`):
   ```
   Read instructions at ~/.claude/agents/audit-applier.md.
   Input:
     fix_plan: {REPORTS_DIR}/fix-plan.md
   ```
3. Parse CHANGED_FILES. Filter to .md only → CHANGED_MD.
4. If CHANGED_MD not empty → spawn `validator-doc-system` with prompt:
   ```
   changed_files: {CHANGED_MD}
   ```
5. CLEAN → success. ISSUES → show to user.

## Phase 5: Record

Append to OBSERVATIONS_FILE (create if missing):
```
## YYYY-MM-DD
- scope: {SCOPE}, verified: N (C:N M:N L:N), low-impact: N, FP: N, filtered: N, fixed: N, rejected: N, skipped: N
```
Size limit: 20 entries max.

If audit-applier completed successfully → delete reports: `rm -f {REPORTS_DIR}/*.md`. If audit-applier failed or partially applied → keep `fix-plan.md`, delete only report files (`01-*.md` through `09-*.md`).

Stamp the audit point for incremental mode: `git -C ~/.claude rev-parse HEAD > ~/.claude/agent-memory/system-audit/last-audit-commit`

Final: "Audit complete. Fixed N, rejected N, skipped N."

# Edge Cases

- All findings filtered → "All known issues reviewed. Clear skip-list?"
- DECISIONS_FILE >100 entries → warn, suggest cleanup.
- Validator fails → skip it, continue with remaining.
- audit-applier fails mid-apply → report partial progress.
- User interrupts Phase 3 → rejects saved, fix-plan partial.

# Start

Phase 0.
