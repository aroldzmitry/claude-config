---
description: Create a new agent, command, or skill with iterative user confirmation
argument-hint: [name] [description]
model: opus
---

# Tool Creator

Create Claude Code tools (agents, commands, skills) with step-by-step user validation.

## Workflow

1. **Input** — parse arguments, ask only missing params
2. **Confirm understanding** — show summary + flow, iterate until approved
3. **Check duplicates** — find similar tools, discuss options
4. **Research** — web search, show solutions with +/-, iterate until approved
5. **Create** — write concise file optimized for Claude
6. **Validate** — run /agent:lint
7. **Document** — create docs in nearest .claude/docs/
8. **Report** — file path + line count

## Phase 1: Input Collection

Parse `$ARGUMENTS`:
- `$1` = name (lowercase, hyphens)
- `$2+` = description (rest of arguments joined)

Example: `/tool:create my-tool handles code review`
- $1 = my-tool
- $2+ = handles code review

Additional params to ask if not clear from context:
- **scope** — Global (~/.claude/) or Project (.claude/)
- **type** — agent / command / skill
- **model** — haiku/sonnet/opus (for created tool, default: opus)

Use `AskUserQuestion` for multiple params at once.

## Phase 2: Understanding + Flow

Show to user:

```
## My Understanding

**Tool:** {name}
**Purpose:** {one sentence}

## How It Will Work

1. {step}
2. {step}
3. {step}

Confirm or provide corrections.
```

**Iterate:** If user has corrections, update and show again. Do not proceed until explicit confirmation.

## Phase 3: Duplicate Check

Search both scopes:
- ~/.claude/agents/*.md
- ~/.claude/commands/*.md
- .claude/agents/*.md
- .claude/commands/*.md

**If overlap found**, show:
- Tool name and path
- What it does
- How it overlaps

Ask: Create new / Update existing / Replace / Cancel

## Phase 4: Research

Use `WebSearch`:
- `"Claude Code" {purpose} agent 2025`
- `"AI agent" {task type} best practices`

Show findings concisely:

```
## Solutions Found

**Option A:** {name}
+ {advantage}
- {disadvantage}

**Option B:** {name}
+ {advantage}
- {disadvantage}

Which approach? Or questions?
```

**Iterate:** Answer questions, update recommendations until user confirms approach.

## Phase 5: Create File

Write to appropriate location:
- Agents: `{scope}/agents/{name}.md`
- Commands: `{scope}/commands/{name}.md`

### File Structure

```markdown
---
name: {name}
description: {trigger condition for Claude}
tools: {only needed tools}
model: {selected}
---

# {Title}

{One sentence role.}

## {Main Section}

{Instructions - concise, no fluff.}

## Output

{Expected format}

## Rules

- DO: {specific behavior}
- DON'T: {anti-pattern}
```

### Writing Principles

- No decorative formatting
- No redundant examples
- No external links
- One example per concept max
- Write for Claude, not humans

## Phase 6: Validate

Run: `/agent:lint {path}`

| Result | Action |
|--------|--------|
| PASS | Proceed |
| WARN | Show to user, ask to proceed or fix |
| FAIL | Fix issues, re-validate |

## Phase 7: Documentation

Create `{nearest .claude/docs}/tools/{name}.md`:

```markdown
# {name}

## Purpose
{what it does}

## Usage
{how to invoke}

## Parameters
{if any}

## Examples
{one practical example}
```

## Phase 8: Report

```
## Created

**File:** {path}
**Lines:** {count}
**Docs:** {docs path}
```

## Rules

- Iterate on each confirmation step until user approves
- Never skip validation
- Keep output concise — optimized for Claude, not human documentation
- One tool at a time for multi-tool requests
- Default model for created tools: opus (unless user specifies otherwise)
