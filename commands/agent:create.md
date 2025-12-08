---
description: Create a new custom agent following Claude Code best practices
argument-hint: "[agent-name or purpose]"
---

# Agent Creator

## Workflow

1. **Select scope** — ask: Global (~/.claude/) or Project (.claude/)?
2. **Gather requirements** — purpose, trigger, model (haiku/sonnet/opus)
3. **Check existing agents** — avoid duplication
4. **Web research** — search for similar agents and implementations
5. **Analyze & suggest** — highlight gaps, improvements, best practices
6. **Preview agent** — show user how agent will work
7. **Confirm** — wait for explicit user approval
8. **Create file** — Write agent markdown
9. **Validate** — run /agent:lint

## Multi-Agent Requests

When user requests multiple agents in one message:

1. **List them first** — "I see you want to create: agent1, agent2, agent3"
2. **Confirm order** — "I'll create them one by one, starting with agent1"
3. **Full cycle per agent:**
   - Preview → Confirm → Create → Lint → Report
4. **Then next** — "agent1 complete. Starting agent2..."

**Never:**

- Preview multiple agents at once
- Ask confirmation for multiple agents together
- Skip lint between agents

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

## Step 4: Web Research

Use WebSearch to find similar agent implementations:

1. **Search queries:**
   - `"Claude Code agent" + {purpose keywords}`
   - `"AI agent" {task type} best practices 2025`
   - `"prompt engineering" {domain} agent`

2. **Analyze findings:**
   - Common patterns used
   - Typical tool combinations
   - Error handling approaches
   - Output formats

3. **Document insights** for next step.

## Step 5: Analysis & Suggestions

Present findings to user using this format:

```
## Pre-Creation Analysis

### What You're Building
[Summarize understanding of user's intent]

### Similar Agents Found
- **[Name]** — [what it does, link if available]
- **[Name]** — [what it does, link if available]

### Suggestions & Improvements
Based on research, consider:
1. **[Aspect]** — [recommendation]
2. **[Aspect]** — [recommendation]

### Potential Gaps
You may want to add:
- [ ] [Missing consideration 1]
- [ ] [Missing consideration 2]

### Recommended Approach
[Synthesize best practices into recommendation]
```

**Ask user:** "Would you like to incorporate any of these suggestions? (Yes / Select specific / No, proceed as-is)"

## Step 6: Preview Agent

Before creating, show user a complete preview:

```
## Agent Preview

**Name:** {name}
**Scope:** Global / Project
**Trigger:** {when this agent activates}
**Model:** {haiku/sonnet/opus}

### How It Will Work

1. User invokes: `{example invocation}`
2. Agent receives: {what context/input it gets}
3. Agent does: {step-by-step behavior}
4. Agent outputs: {expected output format}

### Example Scenario

**Input:** {example user request}
**Processing:** {what agent would do}
**Output:** {example result}
```

## Step 7: User Confirmation

Use `AskUserQuestion`:
- **Create agent** — proceed with creation
- **Modify first** — let user adjust requirements
- **Cancel** — stop without creating

**Only proceed to creation if user explicitly confirms.**

## Step 8: Agent Structure

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
First line: `Status: Done | Failed - reason | Needs Review - explanation`

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

## Step 9: Create File

```
Write(file_path={scope}/agents/{name}.md, content={prepared_content})
```

Git commit/push handled by `claude-config-save` skill.

## Step 10: Validate

Do NOT skip validation — it catches issues before they cause problems.

```
/agent:lint {path}
```

| Check | Action if Failed |
|-------|------------------|
| Description vague | Make trigger-specific |
| Tool overreach | Remove unnecessary tools |
| Conflict detected | Rename or merge |
| Missing examples | Add good/bad examples |

- **PASS** → Report success
- **WARN** → Show warnings, ask user
- **FAIL** → Must fix before completing

## Output

```
## Agent Created

**File:** {path}
**Purpose:** [brief]
**Trigger:** [when invoked]
**Model:** [selected]
```

## Rules

- **ONE AGENT AT A TIME** — if user requests multiple agents, create them sequentially (full cycle per agent before starting next)
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
