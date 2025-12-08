---
description: "Show what an agent/command/skill does and how (brief)"
argument-hint: <name>
---

# Agent Info

Show brief info about an agent, command, or skill.

## Instructions

1. If "$ARGUMENTS" is empty, use `AskUserQuestion`: "What agent, command, or skill would you like info about?"

2. Find "$ARGUMENTS" in `.claude/` and `~/.claude/` (agents, commands, skills)

3. Output format:

```
## {name} ({type})

**Purpose:** {description from frontmatter}

**How it works:**
1. {step 1}
2. {step 2}
3. {step 3}
```

4. Extract 2-4 main steps from the file content

## Rules

- MAX 5 lines after purpose
- No metadata (tools, model, file path) unless user asks
- If not found, list available items in that category
