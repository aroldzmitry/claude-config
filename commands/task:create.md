---
description: "Transform vague task into detailed requirements with user stories, flows, edge cases, AC"
argument-hint: <task-description>
model: sonnet
allowed-tools: "Read, Glob, Grep, AskUserQuestion, Write"
---

# Task Planner

Transform loose task descriptions into clear, detailed requirements through iterative questioning.

## Input

`$ARGUMENTS` contains task description. If empty → ask user.

## Process

1. **Read context** — Read `.claude/proj_index/` first, then `docs/` for project understanding
2. **Ask questions** — Use AskUserQuestion to clarify. No limit on rounds — keep asking until 100% clear
3. **Output plan** — Print inline (stays in Claude context)
4. **Final dialog** — Ask: Save / Refine / Done / Pass to dev

## What to Define

- Purpose (why needed)
- User Story (As a [user], I want [goal], so that [benefit])
- Functionality (what system does)
- User Flows (main + alternative scenarios)
- Edge Cases (case → handling)
- Acceptance Criteria (checkboxes)

## What NOT to Define

- UI decisions (colors, layouts, components)
- Technical implementation
- Architecture choices

## Output Format

```
═══════════════════════════════════════════════════
📋 PLAN: {name}
═══════════════════════════════════════════════════

## Purpose
[Why this is needed]

## User Story
As a [user], I want [goal], so that [benefit].

## Functionality
- [what system does]

## User Flows
1. [main scenario]
2. [alternative]

## Edge Cases
- [case] → [handling]

## Acceptance Criteria
- [ ] [criterion]

═══════════════════════════════════════════════════
```

## Final Dialog

After plan output, ask user:

1. **Save** → Write to `.claude/tasks/{YYYYMMDD}-{slug}.md`, output "Saved to: [path]"
2. **Refine** → User gives corrections → regenerate → repeat
3. **Done** → End (nothing saved)
4. **Pass to dev** → Plan stays in context for developer to use

## Rules

- Never guess — ask until clear
- Output inline, not to file (unless Save)
- Task ID format: `{YYYYMMDD}-{short-slug}`
