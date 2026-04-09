---
description: "Session analysis: reviews conversation to find improvements for commands, agents, and instructions. Can propose modifications and new system files."
model: sonnet
argument-hint: "[scope?]: 'all' (default), 'commands', 'agents', 'docs', 'claude-md'"
allowed-tools: "Task, Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion"
disable-model-invocation: true
---

# Rules

- **Evidence-only** — every finding must cite a specific conversation moment. No hypotheticals.
- **ONE finding per message** — present, discuss, decide, then next.
- **Quality bar** — only changes that measurably improve result quality or reduce wasted turns. For findings that pass ALL filtering criteria: when in doubt, present — user can reject.
- **Root cause first** — before proposing any fix: first locate the actual failure — the earliest agent behavior that deviated from its expected output, not the downstream effect you first noticed (map events backward to find the first thing that went wrong). Then trace the invocation chain backward from that failure: identify which command/agent file governed the failing agent, read it, check if it contains a rule preventing this failure class. If not → the fix targets that file. If the rule exists but the orchestrator didn't pass sufficient inputs → fix targets the orchestrator. Walk up until finding the deepest file with a missing or wrong rule. Never propose a fix at agent-behavior level when the governing instruction is the actual gap. Each proposed fix must pass: (1) evidence it stops a recurring pattern; (2) all 3 mechanical tests; (3) dominance check — no deeper fix in the same chain also passes these tests. Read session artifacts (plans, specs, validator reports) to trace the full chain.
- **Target files** — `commands/*.md`, `agents/*.md`, `docs/*.md`, `CLAUDE.md`. Can also propose creating NEW command/agent files. Never application code.
- **No duplicates** — check decisions.md before presenting, skip already-decided items.
- **Can improve itself** — if finds a gap in its own command file (`system-find-improve.md`), can propose a fix.
- **Placement is bidirectional** — verify placement direction before presenting every fix: (1) if the pattern is universal (passes the 3-scenario test across different stacks) → fix must target `~/.claude/` system files, not project docs; (2) if the pattern is tech- or project-specific → fix must target project-level docs (ARCHITECTURE.md, CLAUDE.md, etc.), not `~/.claude/` system files. A general pattern placed in project docs is as wrong as a specific pattern placed in system files. Verify before presenting in Phase 2 and before applying in Phase 3.
- **Current session only** — Claude Code doesn't persist conversation history across sessions. This command analyzes the current session.
- **Language** — match the user's language.
- **Decisions** — AskUserQuestion for structured choices. Plain text for open-ended discussion.

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
- Proximate fix when a deeper fix in the same causal chain independently passes all 3 mechanical tests — the proximate fix is redundant

# Cross-Session Pattern Boosting

When reading observations.md, check if a signal category (S1–S6) appeared in 3+ previous sessions. If so, boost related findings to `[high]` priority and note the trend in evidence.

# Conventions

- `DECISIONS_FILE` = `~/.claude/agent-memory/system-find-improve/decisions.md`
- `OBSERVATIONS_FILE` = `~/.claude/agent-memory/system-find-improve/observations.md`
- Date format: `YYYY-MM-DD`.
- Item order: high → medium → low.
- Decision tag: `[retro]`.

# Workflow

## Phase 0: Load

1. `mkdir -p ~/.claude/agent-memory/system-find-improve/`
2. Read `DECISIONS_FILE` if exists.
3. Read `OBSERVATIONS_FILE` if exists — for cross-session pattern detection.
4. If `$ARGUMENTS` is unrecognized scope → "Recognized scopes: `all`, `commands`, `agents`, `docs`, `claude-md`. Defaulting to `all`."

## Phase 1: Scan

1. Analyze full conversation using S1–S6 categories.
2. Apply filtering criteria, discard non-qualifying findings.
3. If temp/ directories exist from session, read artifacts and cross-reference with conversation.
4. Read target files for surviving findings — verify root cause exists in current file content. Then validate each proposed fix is genuinely general using all 3 mechanical tests (a fix that fails any test is too specific — either abstract further or discard):
   - **Strip test:** remove all session-specific identifiers (filenames, function names, library names, error messages) from the proposed rule. If the rule becomes incoherent or meaningless → it's a specific fix, not a general rule.
   - **3-scenario test:** name 3 structurally different situations where this rule applies (different language, framework, or problem domain). If you cannot → it's too narrow.
   - **Subsumption test:** check whether existing rules in the target file already cover this case. If they do → don't add a duplicate; if partial coverage → extend the existing rule instead of adding a new one.

   Mechanical test results are internal filtering only — do not include them in Phase 2 finding presentations.
5. Check observations.md for cross-session patterns — boost priority if signal repeats (see Cross-Session Pattern Boosting).
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
   - **Proposed change:** concrete action with context from current file content. Before writing: (1) verify rule is language-agnostic — no stack/framework-specific terms; abstract to language-agnostic form if needed. (2) If combining with adjacent content yields a more compact result per DOC_PRINCIPLES, propose that form. For new files: show full draft following existing conventions (frontmatter, sections), reference the similar existing file used as template.
   - **Alternative:** at least one, including "do nothing"
   - Multi-file findings: present as one item with primary target. List all affected files. Accept/reject as a unit.

2. Ask decision via AskUserQuestion:
   - **Accept** — will apply after all items reviewed
   - **Modify** — discuss an alternative approach
   - **Reject** — won't be suggested again
   - **Skip** — defer, no record

3. "Reject" → follow up: ask for a brief reason (one message). If the stated reason contradicts the mechanical tests already run (e.g., user says "too rare" but 3-scenario test passed with 3 distinct domains), present the counter-evidence in one message and ask once more. Accept the second rejection unconditionally. While recording the reason — also scan for signals of an alternative problem or a differently-framed root cause. If found → present it as a new finding immediately after closing this item: "You seem to be pointing at [X]. Should we discuss that?"
4. "Modify" → discuss user's alternative. Once agreed → record as accepted with modified action. For new file proposals: discuss structure, scope, and conventions with user until agreed. If user decides against → re-ask (Accept / Reject / Skip).

After each decision: `[{current}/{total} | next: {target-file} — {finding-summary}]`

## Phase 3: Apply

1. Show summary: N accepted, N rejected, N skipped. List each accepted item (target + action, one line each).
2. 0 accepted → Phase 4.
3. Ask user to confirm before applying.
4. Quality gate — verify each accepted change before applying:
   - **Minimal:** smallest diff that fixes the issue. No "while we're at it" additions — except when combining with adjacent content yields a more compact result per DOC_PRINCIPLES.
   - **Precise:** no vague terms ("appropriately", "if needed", "etc."). Open-ended actions have a clear stopping condition — semantic ("until X") or numeric ("max N").
   - **Consistent:** matches file's formatting and style. No redundancy with existing content (frontmatter, other sections).
   - **DOC-compliant:** every added line changes agent behavior.
   - **General:** placement is bidirectional — universal patterns must go to `~/.claude/` system files; tech/project-specific patterns must go to project docs. Neither direction is optional.
   - **Safe:** no contradictions with other instructions in the file or related files. No side effects on unrelated workflows. Before Edit: show `CURRENT:` and `REPLACEMENT:` text in message — verify no original content unintentionally dropped.
   - **Verified:** re-read changed section in context. Mental replay: would this change have prevented the original problem? Verify the doc is better after the change — shorter, clearer, or more precise — than before.
   If any check fails → fix the change text before applying. If unfixable → report to user, skip that item.
5. For each accepted item:
   - Target file exists → Read fresh (previous edits may have changed it). Determine insert/modify location based on file structure. Apply using Edit.
   - Target file doesn't exist → create with Write (include appropriate structure for the file type — copy frontmatter structure from similar command/agent).
   - Report: file path + what changed (edited/created).
6. Cross-reference update: if any command was created or renamed in step 5, Grep for references to the command name across `~/.claude/commands/` and `~/.claude/agents/`. Update found references (system-help.md command list, other commands' "next step" suggestions).
7. Edit fails (section not found, file restructured) → report, skip that item, continue.
8. Initialize `val_cycle = 0`. Collect paths of all .md files written/edited in steps 5–6 → `CHANGED_MD`.
9. If `CHANGED_MD` not empty: spawn `validator-doc-system` with prompt:

       changed_files: <newline-separated paths from CHANGED_MD>

   - `CLEAN` → Phase 4.
   - `ISSUES` and `val_cycle < 3` → fix each reported issue using Edit, increment `val_cycle`, re-run step 9.
   - `ISSUES` and `val_cycle >= 3` → report remaining issues to user, Phase 4.
10. Pre-existing issues: if validator reported any issues in files NOT in `CHANGED_MD` — collect them. Present as a batch: "Validator also found N issue(s) in untouched files:" + list each (file — description). Ask user: fix these too? If yes → apply with Edit, add fixed files to `CHANGED_MD`, do one validator pass on newly changed files only. If no → note for awareness, continue to Phase 4.

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

On each write: count entries. If > 30, remove oldest until 30 remain, then append new entry.

Final report: "Applied N changes, recorded N decisions (N accepted, N rejected). Observation logged."

# Edge Cases

- Very short session (0-1 user messages) → Phase 1 scan finds 0 signals → handled by Phase 1 step 8.
- No commands used in session → still works, analyze general interaction quality. Common findings: things that should be commands (S6), missing conventions in CLAUDE.md.
- Mid-session run → analyze what happened so far, note "partial" in observation.
- No temp/ directories → skip artifact cross-referencing, proceed with conversation-only analysis.
- Long session (compressed context) → only analyze messages visible in full. Don't fabricate evidence for compressed segments.

