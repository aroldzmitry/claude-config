---
description: "Improve existing tools by analyzing conversation history for issues and corrections"
argument-hint: "[additional context]"
model: sonnet
---

# Tool Improver

Improve tools (agents, commands, skills) by analyzing conversation for issues/corrections.

## Workflow

1. Parse args: first word = tool name, rest = context; if tool in args → skip to Step 4
2. Scan conversation: errors, corrections, user fixes, repeated attempts
3. Show candidates via AskUserQuestion (skip if tool in args)
4. User selects tool (or custom path)
5. Read tool, build model (purpose, input, output, architecture, dependencies, boundaries); describe problem
6. Confirm understanding via AskUserQuestion; recurse until "Correct"
7. Research via WebSearch + WebFetch; compare multiple approaches
8. Present 2-3 options via AskUserQuestion; recurse until selected
9. Implement with Edit (follow global minimalist format rules from CLAUDE.md)
10. Verify: syntax, references, no side effects; Grep for cross-tool impact
11. If dependencies found: ask to auto-update or skip
12. If `~/.claude/`: commit/push via `claude-config-save` skill
13. Report: `[A]` created, `[M]` modified (+N/-M, X→Y lines), `[D]` deleted

## Step 5: Build Model

Read tool, identify: purpose, input/output, architecture, dependencies, boundaries.
Describe problem: what went wrong, expected vs actual, root cause.

## Step 6: Confirm Understanding

AskUserQuestion: "Is this understanding correct?" with "Correct" option + text field.
Recurse until confirmed.

## Step 7: Research

WebSearch "[problem] Claude Code best practices 2025" + WebFetch official docs.
Evaluate multiple approaches, compare trade-offs.

## Step 8: Present Solutions

Format: `## Option N: [Name]` | `**Benefits:** ... | **Downsides:** ... | **Risks:** ...`
AskUserQuestion with 2-3 options + text field for custom.
Recurse until selected.

## Step 11: Cross-Tool Impact

If dependencies found: AskUserQuestion with options "Update automatically" / "Skip" / custom instructions.
Apply selected resolution.

## Rules

- Complete full workflow (args are data, not execution instructions)
- Scan conversation, read tool, research before proposing
- Recurse dialogs until confirmed
- Ask if unclear, never guess
- Only modify selected tool
