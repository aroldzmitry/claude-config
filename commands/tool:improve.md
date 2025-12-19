---
description: "Improve existing tools by analyzing conversation history for issues and corrections"
argument-hint: "[additional context]"
model: sonnet
allowed-tools: "Read, Edit, Grep, Glob, WebSearch, WebFetch, AskUserQuestion, Skill"
---

# Tool Improver

Improve tools (agents, commands, skills) by analyzing conversation for issues/corrections.

## Workflow

1. Parse args: first word = tool name, rest = context; if tool specified → skip to Step 3
2. Scan conversation for: failed tool calls, user corrections ("that's wrong", "not what I meant"), manual user edits after tool output, repeated attempts at same action. Show candidates via AskUserQuestion
3. Read tool, build model (purpose, input/output, dependencies, boundaries), describe problem (what failed, expected vs actual, root cause)
4. Confirm understanding via AskUserQuestion, research via WebSearch/WebFetch, present 2-3 fix options — iterate each until approved
5. Implement with Edit
6. Validate: fix addresses original problem, syntax correct, no broken references; Grep for cross-tool impact
7. If dependencies found: ask to auto-update or skip
8. If `~/.claude/`: commit/push via `claude-config-save` skill
9. Report: `[A]` created, `[M]` modified (+N/-M, X→Y lines), `[D]` deleted

## Rules

- Iterate all confirmation dialogs until user approves
- Compress to minimal text Claude needs (not human-readable explanations)
- Scan conversation + read tool + research before proposing fixes
- Ask if unclear, never guess
- Only modify selected tool
