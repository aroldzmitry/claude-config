---
description: Create a new custom agent following Claude Code best practices
argument-hint: [agent-name or purpose]
---

# Agent Creator

Create a new custom agent following Claude Code best practices.

## Workflow

0. **Select scope** — global (~/.claude/) or project (.claude/)
1. **Gather requirements** — purpose, trigger, model
2. **Check existing agents** — avoid duplication
3. **Research patterns** — /docs agents, then web if needed
4. **Agent structure** — define with YAML frontmatter
5. **Create file** — write to selected scope
6. **Validate** — run agent-lint

## Step 0: Select Scope (MANDATORY)

Use `AskUserQuestion` to ask: Global (~/.claude/agents/) or Project (.claude/agents/)?

## Step 1: Gather Requirements (MANDATORY)

Ask using `AskUserQuestion`:

- **Purpose** — what task should this agent perform?
- **Trigger** — when should it be invoked?
- **Model** — haiku (fast), sonnet (balanced), opus (complex)

Only proceed when user confirms requirements.

## Step 2: Check Existing Agents

Check selected scope for similar agents. Also check other scope to avoid name conflicts.
If similar exists → propose extending instead of creating new.

## Step 3: Research Patterns (MANDATORY)

1. Use SlashCommand tool to invoke `/docs agents` for Claude Code patterns
2. Use WebSearch for community examples and current best practices (MANDATORY)

Output before continuing:

- Key patterns found
- Pitfalls to avoid

## Step 4: Agent Structure

### Writing for Claude (not humans)

Claude doesn't need:
- Full JSON examples for built-in tools — just tool name + key params
- Multiple examples of same pattern — one clear example enough
- External links — not accessible at runtime
- Decorative formatting — `---` dividers, excessive whitespace
- "Remember:" summaries — Claude retains context

Claude benefits from:
- Explicit constraints and boundaries
- One good/bad example pair per concept
- Tables for mappings (compact, scannable)
- Bullet points over prose

```markdown
---
name: agent-name
description: When to invoke (Claude uses this to decide)
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
color: blue
---

# Agent Title

One-sentence role.

## Input Sources

- `path/to/input` — description

## Core Responsibilities

### 1. First Task

Instructions with examples.

## Output Format

Save to: `path/to/output.md`
First line: `Status: Done | Failed - reason | Needs Review - explanation`

## Rules

- DO: specific behaviors
- DON'T: anti-patterns
```

### Right Altitude

| Too Rigid                            | Optimal                          | Too Vague            |
| ------------------------------------ | -------------------------------- | -------------------- |
| "Step 1: Open X, Step 2: Find Y..." | Clear goals + flexible execution | "Do the thing well" |

### YAML Fields

| Field       | Required | Notes                               |
| ----------- | -------- | ----------------------------------- |
| name        | Yes      | lowercase, hyphens                  |
| description | Yes      | Claude uses for invocation decision |
| tools       | No       | Whitelist; omit to inherit all      |
| model       | No       | opus/sonnet/haiku/inherit           |

### Model Selection

| Model  | Use When                                |
| ------ | --------------------------------------- |
| haiku  | Fast, simple tasks (2x speed, 3x cheaper) |
| sonnet | Default, balanced                       |
| opus   | Complex reasoning, architecture         |

### Prompting Best Practices Checklist

Before creating, verify:

- [ ] **Complete world picture** — agent knows environment and capabilities
- [ ] **Consistent instructions** — no contradictions
- [ ] **No surprises** — inputs/outputs documented
- [ ] **User perspective** — focus on what user cares about
- [ ] **Varied examples** — not just happy path
- [ ] **Critical rules prominent** — important rules at beginning

### Thinking Mode Integration

For agents needing multi-step reasoning, include in prompts:
- "think step by step" — basic reasoning
- "think harder" — complex analysis
- "ultrathink" — deep architectural decisions

Budget ~2-3x tokens for thinking overhead.

## Step 5: Create File

### Before Writing

Ask yourself:
1. Would Claude behave differently without this section? If no → remove
2. Is this the same info in different words? → deduplicate
3. Is this obvious to an LLM? (JSON syntax, markdown format) → skip
4. Can this table be 3 rows instead of 10? → condense

Location: `{scope}/agents/{agent-name}.md`

Verify:

1. Valid YAML frontmatter
2. Clear description with trigger
3. Output format documented
4. Rules include DO and DON'T

## Step 6: Git Commit & Push (global scope only)

If file created in `~/.claude/`:
1. Run: `cd ~/.claude && git add -A && git commit -m "Create agent: {agent-name}" && git push`
2. If commit/push fails → log warning, continue

## Step 7: Validate with Agent Lint

Run validation before finalizing using SlashCommand:

```bash
/agent:lint {path} --r ultrathink
```

### Validation Checklist

| Check | Action if Failed |
|-------|------------------|
| Description vague | Make trigger-specific |
| Tool overreach | Remove unnecessary tools |
| Conflict detected | Rename or merge with existing |
| Missing examples | Add good/bad examples |

### Handling Validation Results

- **PASS** → Report success to user
- **WARN** → Show warnings, ask if user wants to address
- **FAIL** → Must fix before completing

Do NOT skip validation. It catches issues before they cause problems.

Apply recommendations that align with user's intent. Ask about scope expansions.

## Output

```
## Agent Created

**File:** {path}
**Purpose:** [brief]
**Trigger:** [when invoked]
**Model:** [selected]

Test by: [suggestion]
```

## Rules

- Check existing agents first
- Use sonnet as default model
- Keep descriptions specific (not "helps with code")
- Include DO and DON'T examples
- Document output format
- Never give all tools unless needed

## Anti-Patterns

| Anti-Pattern           | Why It's Bad                  | Better Approach                 |
| ---------------------- | ----------------------------- | ------------------------------- |
| Hardcoded step-by-step | Brittle, breaks on variations | Describe goals, let agent decide |
| No examples            | Agent guesses behavior        | Include good/bad examples       |
| Vague description      | Claude doesn't know when      | Specific trigger conditions     |
| Too many tools         | Security risk, confusion      | Whitelist only needed tools     |
| No output format       | Inconsistent results          | Document exact format           |

## Example: Code Reviewer Agent

```markdown
---
name: code-reviewer
description: Reviews code changes for bugs, security issues, and best practices. Use after developer completes implementation.
tools: Read, Glob, Grep
model: sonnet
---

# Code Reviewer

Review code changes and provide actionable feedback.

## Input

- File paths or git diff

## Review Checklist

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] No SQL injection risks

### Quality
- [ ] Functions under 50 lines
- [ ] Clear naming
- [ ] Error handling present

## Output Format

## Code Review: {file}

**Status:** Approved | Changes Requested

### Issues Found
1. **[Severity]** Description
   - Location: file:line
   - Suggestion: how to fix

### Positive Notes
- What's done well

## Rules

- DO: Focus on bugs and security first
- DO: Provide specific line references
- DON'T: Nitpick style if linter handles it
- DON'T: Rewrite code, just suggest
```
