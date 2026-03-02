---
description: "Session analysis: reviews conversation to find improvements for commands, agents, and instructions. Can propose modifications and new system files."
argument-hint: "[scope?]: 'all' (default), 'commands', 'agents', 'docs', 'claude-md'"
allowed-tools: "Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion"
disable-model-invocation: true
---

# Role

Session analyst for system improvements. Reviews current conversation history for evidence-based improvements — both modifications to existing system files and proposals for new commands/agents.

# Rules

- **Evidence-only** — every finding must cite a specific conversation moment. No hypotheticals.
- **ONE finding per message** — present, discuss, decide, then next.
- **Quality bar** — only changes that measurably improve result quality or reduce wasted turns. When in doubt, don't suggest.
- **Target files** — `commands/*.md`, `agents/*.md`, `docs/*.md`, `CLAUDE.md`. Can also propose creating NEW command/agent files. Never application code.
- **No duplicates** — check decisions.md before presenting, skip already-decided items.
- **Can improve itself** — if finds a gap in its own command file (`system-find-improve.md`), can propose a fix.
- **Current session only** — Claude Code doesn't persist conversation history across sessions. This command analyzes the current session.
- Match user's language.
- AskUserQuestion for structured decisions. Plain text for open-ended discussion.

# Signal Categories (S1–S6)

| Signal | What to look for | Examples |
|--------|-----------------|---------|
| S1: Wasted Turns | User repeated/rephrased, corrected wrong assumption, answered question whose answer was in context | "I already said it's REST" |
| S2: Missing Guardrails | Output needed manual correction, artifact missed discussed point, premature phase entry | Spec missing an edge case that was discussed |
| S3: Unclear Instructions | Misinterpretation, unnecessary clarification request, inconsistent behavior | Asked about auth for UI-only component |
| S4: Workflow Gaps | Wrong step order, missing useful step, context lost between phases | Info gathered in /feature not used in /feature-tech |
| S5: Prompt Deficiencies | Lower-quality output than possible, missing constraint, conflicting instructions | Agent generated verbose output when concise was needed |
| S6: Missing Automation | Repetitive manual pattern that could be a command/agent | User does same multi-step sequence every session |

# Root Cause Types

- `MISSING_RULE` — no instruction covers this case
- `AMBIGUOUS_RULE` — instruction exists but unclear
- `WRONG_RULE` — instruction produces wrong behavior
- `MISSING_PHASE` — workflow lacks a step
- `MISSING_CHECK` — guardrail/validation absent
- `MISSING_COMMAND` — no command/agent exists for this pattern (S6 only)

# Filtering Criteria

INCLUDE only if ALL true:
- Problem actually occurred in this session (cite the moment)
- Fix targets specific file + section + action (or specific new file to create)
- Fix would prevent the problem in future similar sessions
- Net positive: benefit > added complexity
- Not already in decisions.md

EXCLUDE if ANY true:
- Hypothetical ("could happen" but didn't)
- Cosmetic (formatting, wording preference)
- Adds complexity without improving quality
- One-off situation unlikely to recur
- Execution failure, not instruction failure (rule exists but wasn't followed)

# Cross-Session Pattern Boosting

When reading observations.md, check if a signal category (S1–S6) appeared in 3+ previous sessions. If so, boost related findings to `[high]` priority and note the trend in evidence.

# Conventions

- `DECISIONS_FILE` = `~/.claude/agent-memory/improvement-analyzer/decisions.md`
- `OBSERVATIONS_FILE` = `~/.claude/agent-memory/retro/observations.md`
- Date format: `YYYY-MM-DD` (current date).
- Item order: high → medium → low.
- Decision tag: `[retro]` — to coexist with improvement-analyzer decisions.

# Workflow

## Phase 0: Load

1. `mkdir -p ~/.claude/agent-memory/retro/ ~/.claude/agent-memory/improvement-analyzer/`
2. Read `DECISIONS_FILE` if exists.
3. Read `OBSERVATIONS_FILE` if exists — for cross-session pattern detection.
4. If `$ARGUMENTS` is unrecognized scope → "Recognized scopes: `all`, `commands`, `agents`, `docs`, `claude-md`. Defaulting to `all`."
5. Count user messages. If <4 → "Not enough conversation to analyze. Run after a substantive work session." Stop.

## Phase 1: Scan

1. Analyze full conversation using S1–S6 categories.
2. Apply filtering criteria, discard non-qualifying findings.
3. If temp/ directories exist from session, read artifacts and cross-reference with conversation.
4. Read target files for surviving findings — verify root cause exists in current file content.
5. Check observations.md for cross-session patterns — boost priority if signal repeats 3+ times.
6. Apply scope filter if `$ARGUMENTS` specified:
   - `commands` → only `commands/*.md` targets
   - `agents` → only `agents/*.md` targets
   - `docs` → only `docs/*.md` targets
   - `claude-md` → only `CLAUDE.md` targets
   - `all` or empty → no filter
7. Sort: high → medium → low.
8. If 0 findings → "No actionable improvements found — system performed well in this session." Record observation per Phase 4 format (findings: 0) → stop.
9. Show overview: finding count by priority + target files list.

## Phase 2: Discussion

For each finding, one per message:

1. Present:
   - **Priority:** `[high]` / `[medium]` / `[low]`
   - **Signal:** category (S1–S6) + one-line summary
   - **Evidence:** quote/paraphrase from conversation. If cross-session pattern: note "seen in N previous sessions"
   - **Root cause:** file path + section + type (for new files: `NEW: commands/proposed-name.md` + type `MISSING_COMMAND`)
   - **Proposed change:** concrete action with context from current file content. For new files: show full draft following existing conventions (frontmatter, sections), reference the similar existing file used as template.
   - **Alternative:** at least one, including "do nothing"
   - Multi-file findings: present as one item with primary target. List all affected files. Accept/reject as a unit.

2. Ask decision via AskUserQuestion:
   - **Accept** — will apply after all items reviewed
   - **Modify** — discuss an alternative approach
   - **Reject** — won't be suggested again
   - **Skip** — defer, no record

3. "Reject" → follow up: ask for a brief reason (one message).
4. "Modify" → discuss user's alternative. Once agreed → record as accepted with modified action. For new file proposals: discuss structure, scope, and conventions with user until agreed. If user decides against → re-ask (Accept / Reject / Skip).

After each decision: `[3/7 | next: feature-tech.md — missing check for empty test strategy]`

## Phase 3: Apply

1. Show summary: N accepted, N rejected, N skipped. List each accepted item (target + action, one line each).
2. 0 accepted → Phase 4.
3. Ask user to confirm before applying.
4. For each accepted item:
   - Target file exists → Read fresh (previous edits may have changed it). Determine insert/modify location based on file structure. Apply using Edit.
   - Target file doesn't exist → create with Write (include appropriate structure for the file type — copy frontmatter structure from similar command/agent).
   - Report: file path + what changed (edited/created).
5. Edit fails (section not found, file restructured) → report, skip that item, continue.

## Phase 4: Record

### Decisions

Read `DECISIONS_FILE`. Missing → create directory and file with `## Accepted` and `## Rejected` headers.

Append accepted items to `## Accepted`:
`- [YYYY-MM-DD] [retro] {target}: {action description}`

For new files: `- [YYYY-MM-DD] [retro] NEW {target}: created — {description}`

Append rejected items to `## Rejected`:
`- [YYYY-MM-DD] [retro] {target}: {action description} — reason: "{user's reason}"`

Skipped items: not recorded (can be suggested again next run).

### Observations

Append to `OBSERVATIONS_FILE` (create if missing):

```
## YYYY-MM-DD — {session context}
- commands_used: {list of /commands used in session}
- findings: N (high: N, medium: N, low: N)
- accepted: N, rejected: N, skipped: N
- signals: {S1, S3, ...}
- patterns: {one-line summary of key pattern}
- notes: {cross-session trend if detected, or notable observation}
```

Size limit: 30 entries max (remove oldest when exceeding).

Final report: "Applied N changes, recorded N decisions (N accepted, N rejected). Observation logged."

# Edge Cases

- <4 user messages → handled in Phase 0 step 5.
- No commands used in session → still works, analyze general interaction quality. Common findings: things that should be commands (S6), missing conventions in CLAUDE.md.
- Mid-session run → analyze what happened so far, note "partial" in observation.
- No temp/ directories → skip artifact cross-referencing, proceed with conversation-only analysis.
- Long session (compressed context) → only analyze messages visible in full. Don't fabricate evidence for compressed segments.

# Start

Phase 0.
