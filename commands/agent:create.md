---
description: Create a new custom agent following Claude Code best practices
argument-hint: [agent-name or purpose]
---

# Agent Creator

## Workflow

1. **Select scope** — ask: Global (~/.claude/) or Project (.claude/)?
2. **Gather requirements** — purpose, trigger, model (haiku/sonnet/opus)
3. **Check existing agents** — avoid duplication
4. **Research patterns** — claude-code-guide agent or web search
5. **Create file** — Write agent markdown
6. **Validate** — run /agent:lint

## Step 1: Gather Requirements

Ask using `AskUserQuestion`:
- **Purpose** — what task should this agent perform?
- **Trigger** — when should it be invoked?
- **Model** — haiku (fast), sonnet (default), opus (complex)

## Step 2: Check Existing Agents

Check both scopes for similar agents.

**If similar found**, show user:
- Found agent name and path
- What it does (from description)
- How new request differs

Then ask:
- Extend existing
- Replace
- Create separate (different name)
- Cancel

## Step 3: Research Patterns

Use Task tool with `subagent_type="claude-code-guide"` for Claude Code patterns.
Use WebSearch for community examples.

## Step 4: Agent Structure

```markdown
---
name: agent-name
description: When to invoke (Claude uses this)
tools: Read, Write, Edit, Glob, Grep
model: sonnet
---

# Agent Title

One-sentence role.

## Core Responsibilities

Instructions with examples.

## Output Format

Save to: `path/to/output.md`

## Rules

- DO: specific behaviors
- DON'T: anti-patterns
```

### YAML Fields

| Field | Required | Notes |
|-------|----------|-------|
| name | Yes | lowercase, hyphens |
| description | Yes | Trigger condition |
| tools | No | Whitelist; omit = inherit all |
| model | No | haiku/sonnet/opus |

### Right Altitude

| Too Rigid | Optimal | Too Vague |
|-----------|---------|-----------|
| "Step 1: X, Step 2: Y" | Clear goals + flexible execution | "Do it well" |

## Step 5: Create File

```
Write(file_path={scope}/agents/{name}.md, content={prepared_content})
```

Git commit/push handled by `claude-config-save` skill.

## Step 6: Validate

```
/agent:lint {path}
```

- **PASS** → Report success
- **WARN** → Show warnings, ask user
- **FAIL** → Must fix

## Output

```
## Agent Created

**File:** {path}
**Purpose:** [brief]
**Trigger:** [when invoked]
**Model:** [selected]
```

## Rules

- Check existing agents first
- Use sonnet as default model
- Keep descriptions trigger-specific
- Include DO and DON'T rules
- Document output format
- Whitelist only needed tools
- Don't add decorative formatting or external links
- One example per concept is enough

## Example: Code Reviewer Agent

```markdown
---
name: code-reviewer
description: Reviews code for bugs and security. Use after implementation.
tools: Read, Glob, Grep
model: sonnet
---

# Code Reviewer

Review code changes and provide actionable feedback.

## Checklist

- No hardcoded secrets
- Input validation present
- Functions under 50 lines

## Output

**Status:** Approved | Changes Requested

### Issues Found
1. **[Severity]** Description at file:line

## Rules

- DO: Focus on bugs and security first
- DON'T: Nitpick style if linter handles it
```
