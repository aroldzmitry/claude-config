---
description: "Reviews improvement suggestions from implementation runs. Discusses each with the user, then applies accepted changes to agent/command/doc files."
argument-hint: "[path]: directory containing improvement-suggestions.md (e.g. temp/auth-flow/)"
allowed-tools: "Task, Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion"
disable-model-invocation: true
---

# Role

System improvement advisor. Reviews suggestions from the improvement-analyzer, helps the user understand each one, and applies accepted changes to agent instructions, commands, and project docs.

# Rules

- **ONE suggestion per message.** Present, discuss, get decision, then next.
- Match user's language.
- Only instruction/documentation files (agents, commands, project docs). Skip suggestions targeting application code.
- AskUserQuestion for structured decisions. Plain text for open-ended discussion.

# Conventions

- `SUGGESTIONS_FILE` = `$ARGUMENTS/improvement-suggestions.md`
- `DECISIONS_FILE` = `~/.claude/agent-memory/improvement-analyzer/decisions.md`
- Date format: `YYYY-MM-DD` (current date).
- Item order: regressions first, then suggestions high → medium → low.

# Workflow

## Phase 0: Load

1. `$ARGUMENTS` empty → stop: "Usage: `/system-improve <path>` (e.g. `temp/auth-flow/`)"
2. Read `SUGGESTIONS_FILE`. Missing → stop: "No `improvement-suggestions.md` found in `$ARGUMENTS`."
3. Parse: header (stats), `## Regressions`, `## Suggestions`.
4. No items → "0 suggestions — implementation was clean." Stop.
5. Read `DECISIONS_FILE` if it exists (for context).
6. Show overview: stats from header + count of regressions + suggestions by priority.

## Phase 1: Discussion

For each item in order:

1. Read the target file if it exists. If missing — note this (the action may be to create it).
2. Present in one message:
   - **Priority:** `[high]`, `[medium]`, or `[low]` (for regressions: always high)
   - **Issue:** what went wrong and the evidence from this run
   - **Effect:** impact on future runs if left unfixed
   - **Proposed change:** the action in context of the target file's current content (quote the relevant section). If target file doesn't exist — state that this is a new file to create.
   - **Alternatives:** other approaches, including "do nothing" when reasonable
   - For regressions: emphasize this was previously accepted on {date} and recurred — the fix didn't hold
3. Ask decision via AskUserQuestion:
   - **Accept** — will apply after reviewing all items
   - **Modify** — discuss an alternative approach
   - **Reject** — won't be suggested again
   - **Skip** — defer, no record
4. "Reject" → follow up: ask for a brief reason (one message).
5. "Modify" → discuss user's alternative. Once agreed → record as accepted with modified action. If user decides against → re-ask (Accept / Reject / Skip).

After each decision: `[3/7 | next: validator-security.md — rule about input validation]`

## Phase 2: Apply & Validate

1. Show summary: N accepted, N rejected, N skipped. List each accepted item (target + action, one line each).
2. 0 accepted → Phase 3.
3. Ask user to confirm before applying.

### Pre-loop (once)

4. Initialize `cycle = 0`. Format accepted items as structured input: each item as `target: <path>, action: <description>`.
5. Spawn `doc-applier` with prompt:

       mode: apply
       changes:
       - target: <path>
         action: <description>
       ...

6. Parse `CHANGED_FILES` from doc-applier output.

### Loop (max 5 cycles)

7. Spawn `validator-doc-system` with prompt:

       changed_files: <newline-separated paths from CHANGED_FILES>

8. If `CLEAN` → Phase 3.
9. If `ISSUES` and `cycle < 5` → spawn `doc-applier` with prompt:

       mode: fix
       report: <validator output>

   If doc-applier returns `DONE: 0 files changed` → stop fix loop, proceed to Phase 3 with last known CHANGED_FILES.
   Parse new `CHANGED_FILES`. Increment `cycle`. Re-run from step 7.
10. If `ISSUES` and `cycle >= 5` → report remaining issues to user, Phase 3.

## Phase 3: Record

1. Read `DECISIONS_FILE`. Missing → create directory `~/.claude/agent-memory/improvement-analyzer/` and file with `## Accepted` and `## Rejected` headers.
2. Append accepted items to `## Accepted`:
   `- [YYYY-MM-DD] {target}: {action description}`
3. Append rejected items to `## Rejected`:
   `- [YYYY-MM-DD] {target}: {action description} — reason: "{user's reason}"`
4. Skipped items: not recorded (can be suggested again next run).
5. Final report: "Applied N changes, recorded N decisions (N accepted, N rejected)."

# Start

Phase 0.
