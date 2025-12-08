---
description: "Improve existing tools by analyzing conversation history for issues and corrections"
argument-hint: "[additional context]"
model: opus
---

# Tool Improver

State machine workflow. Each step has: `requires` (input artifacts), `outputs` (produced artifacts), `waits` (pauses for user), `actions` (mandatory tools).

Cannot proceed without required artifacts. Arguments are context, not instructions.

## Workflow

```
ISSUES_LIST → USER_SELECTION(waits) → TOOL_CONTENT → INTERNAL_MODEL → PROBLEM_STATEMENT(waits) → RESEARCH → SELECTED_SOLUTION(waits) → MODIFIED_TOOL → CHANGE_SUMMARY → Git/Report
```

## Step 1: Scan Conversation
`outputs: ISSUES_LIST`

Scan for: tool errors, user corrections, user-provided fixes, repeated attempts, frustration signals.

If `$ARGUMENTS` provided — context for scanning, not implementation instructions.

## Step 2: Show Candidates
`requires: ISSUES_LIST | waits: AskUserQuestion | outputs: USER_SELECTION`

Present issues via `AskUserQuestion` single-select. Include "Enter custom tool".

## Step 3: Read Tool
`requires: USER_SELECTION | outputs: TOOL_CONTENT`

Read selected tool file.

## Step 4: Build Internal Model
`requires: TOOL_CONTENT | outputs: INTERNAL_MODEL`

Analyze: purpose, input/output, architecture, dependencies, boundaries.

Do not display to user — internal analysis only.

## Step 5: Describe Problem
`requires: INTERNAL_MODEL, ISSUES_LIST | waits: AskUserQuestion | outputs: PROBLEM_STATEMENT`

Present to user:
- What went wrong (1-2 sentences)
- Root cause hypothesis

Use `AskUserQuestion`: "Is this correct?" Options: Correct / Needs clarification.

## Step 6: Research
`requires: PROBLEM_STATEMENT | actions: WebSearch | outputs: RESEARCH`

Execute `WebSearch`: "[problem type] Claude Code best practices 2025"

Quality over speed — collect 2-3 approaches, compare trade-offs.

Do not display raw research to user.

## Step 7: Present Solutions
`requires: RESEARCH | waits: AskUserQuestion | outputs: SELECTED_SOLUTION`

Pre-filter: discard options that reduce predictability, add ambiguity, or overcomplicate.

Present 2-3 options via `AskUserQuestion` with brief +/- for each.

### If tool has AskUserQuestion calls needing changes:
Show proposed dialog changes, ask which to apply.

### If output format needs changes:
Show proposed output changes, ask which to apply.

## Step 8: Implement
`requires: SELECTED_SOLUTION, TOOL_CONTENT | outputs: MODIFIED_TOOL`

Apply using Edit tool. Follow Claude Tools Format: write for Claude, no decorative formatting, 1-2 line instructions, remove anything that doesn't change behavior.

## Step 9: Verify & Cross-tool Impact
`requires: MODIFIED_TOOL | waits: AskUserQuestion (if deps found)`

Check: syntax valid, no broken references, changes match selection.

Search `~/.claude/` for references to modified tool. If found:
- List affected tools
- Ask user: "Update automatically" / "Skip — handle manually"
- If auto-update selected — apply changes

## Step 10: Summary
`requires: MODIFIED_TOOL, TOOL_CONTENT`

Display to user:
```
Changes: [1-2 sentences what changed]
Remaining issues: [if any, else "None"]
```

## Step 11: Finalize

1. If docs exist in `~/.claude/docs/` — update
2. If file in `~/.claude/` — use `claude-config-save` skill
3. Report: `[A]` created, `[M]` updated, `[D]` deleted

## Rules

- Arguments = context, not instructions
- WebSearch mandatory before solutions
- No implementation without user selection
- User sees only: problem description, solution options, final summary
