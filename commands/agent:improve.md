---
description: "Analyze what went wrong and generate improvement recommendations. Does not apply changes."
argument-hint: [issue-context]
---

# Agent Analyzer

Analyze what went wrong and generate improvement recommendations.
**Does not apply changes** — use `/agent:update` to apply.

## Workflow

1. Select scope (auto-detect or ask)
2. Check improvement history for duplicates
3. Find user corrections in conversation
4. If unclear — ask what went wrong
5. Map issue to responsible agent
6. Assess severity
7. Research best practices (for High+ severity)
8. Self-critique proposal
9. Output recommendations
10. Save to suggestions.md for `/agent:update`

## Step 1: Select Scope

Auto-detect by priority:

1. Explicit path (`~/.claude/` or `.claude/`)
2. Keyword ("global" or "project")
3. File name → search project first, then global
4. Ambiguous → use `AskUserQuestion`

## Step 2: Check History

Read `{scope}/.improvements/history.md`:

- Similar issue addressed before?
- Recurring pattern (3+ times)? → may need systemic solution

Skip duplicates already in suggestions.md or recently applied.

## Step 2.5: Check for Duplicate Recommendations

Before generating new recommendations:

1. Read improvement history:
   ```
   {scope}/.improvements/history.md
   ```

2. Filter out issues that:
   - Match previously applied changes (Status: Applied)
   - Are currently pending in suggestions.md
   - Address same root cause as recent fixes

3. If issue was already addressed:
   - Show user: "This issue was addressed on [date] with [change]"
   - Ask: "Re-analyze anyway? [Yes/No]"

## Step 3: Find User Corrections

Look for patterns in conversation:

- "This should be X, not Y"
- "Missing X", "Wrong X", "Forgot to X"
- Direct edits user requested after agent output
- User provided their own solution

## Step 3.5: Context Management

For long conversation histories (100+ messages):

- Summarize older messages into key decisions
- Retain only recent 20-30 messages in full detail
- Focus on user corrections and explicit feedback

## Step 4: Clarify if Unclear

Use `AskUserQuestion` with options: Wrong output / Missing step / Too verbose / Not interactive

## Step 4.5: Impact Analysis

When change involves REMOVING or MODIFYING existing code/config:

1. **Search for dependencies** - use Grep to find all references to the removed/modified item
2. **List affected files** - show user what else might need changes
3. **Ask confirmation** - "This change affects X files. Update all? [Yes/No/Show list]"

Never remove or modify something without checking what depends on it.

## Step 5: Map Issue to Agent

| Issue Type            | Agent           |
| --------------------- | --------------- |
| UI/styling/responsive | Developer       |
| Missing functionality | Developer       |
| Wrong business logic  | BA or Developer |
| Missing tests         | Tester          |
| Missed edge cases     | Tester          |
| Unclear requirements  | BA              |
| Documentation         | Documenter      |

## Step 6: Assess Severity

| Severity | Description                  | Action                      |
| -------- | ---------------------------- | --------------------------- |
| Critical | Broken, security issue       | Immediate fix + checklist   |
| High     | Missing common pattern       | Add to checklist            |
| Medium   | Edge case missed             | Add to examples             |
| Low      | Style/preference             | Document only, no rule      |

Low severity may not warrant agent changes.

## Step 7: Research (High+ Severity)

Search for:

- Claude Code agent patterns
- Community solutions
- Best practices for this issue type

Skip for Low severity or well-known patterns.

## Step 8: Self-Critique

Before presenting:

- Root cause or just symptom?
- Could cause false positives?
- Minimal change needed?
- Conflicts with existing rules?

Test: would this have prevented the original issue?

## Step 9: Output Recommendations

```markdown
## Analysis

**Issue:** [what user had to correct]
**Severity:** [level]
**Root cause:** [why missed]
**Agent:** [name]
**File:** [path]

## Research Findings (if performed)
[Key insights from sources]

---

## Recommendations

### 1. [Title]
**Section:** [name]
**Type:** Add | Modify | Remove
**Change:**
```markdown
[exact text]
```
**Rationale:** [why this prevents the issue]

### 2. [Title]
...
```

Use `AskUserQuestion`: Apply All / 1 only / 1 and 2 / None

## Step 10: Save & Report

Save to `{scope}/.improvements/suggestions.md`:

```markdown
## [date] - Recommendations for [agent]

**Issue:** [brief]
**Selected:** [user's choice]

[Copy selected recommendations]
```

Report: `Saved to suggestions.md. Run /agent:update to apply.`

## Guardrails

- Maximum 5 recommendations per session
- 3+ recurring issues → escalate to documentation review
- Prefer general mechanisms over specific fixes
- Never duplicate existing functionality

## Rules

- **Analysis only** — NEVER use Edit or direct file-modification tools
- **Delegate changes** — all modifications via `/agent:update`
- **Ask first if unclear**
- **Research for High+ severity only**
- Read full agent file before proposing
- Make recommendations minimal and focused

**FORBIDDEN tools in this command:**
- Edit
- NotebookEdit

**ALLOWED for suggestions only:**
- Write — ONLY to `{scope}/.improvements/suggestions.md`

If you catch yourself about to use Edit — STOP and save to suggestions.md instead.

## Example Flow

```
User: /agent:improve

Claude: [Uses AskUserQuestion: "What went wrong?"]

User: [Selects "Missing step"]

Claude: [Uses AskUserQuestion: "Which agent?"]

User: [Selects "Developer"]

Claude:
## Analysis
**Issue found:** Missing loading states
**Severity:** High
**Agent:** Developer

## Recommendations

### 1. Add Loading States Checklist
**Section:** UI Standards
**Change:** [shows exact text]

Claude: [Uses AskUserQuestion: "Which to apply?"]

User: [Selects "1 only"]

Claude:
Saved to ~/.claude/.improvements/suggestions.md
To apply, run: /agent:update
```
