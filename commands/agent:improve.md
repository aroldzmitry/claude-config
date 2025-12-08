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
10. Save to suggestions.md

## Step 1: Select Scope

Auto-detect by priority:

1. Explicit path (`~/.claude/` or `.claude/`)
2. Keyword ("global" or "project")
3. File name → search project first, then global
4. Ambiguous → use `AskUserQuestion`

## Step 2: Check History & Duplicates

Read `~/.claude/.improvements/history.md` and `suggestions.md`:

- Similar issue addressed before? → Show user, ask "Re-analyze anyway?"
- Recurring pattern (3+ times)? → may need systemic solution
- Skip issues already pending or recently applied

## Step 3: Find User Corrections

Look for patterns in conversation:

- "This should be X, not Y"
- "Missing X", "Wrong X", "Forgot to X"
- Direct edits user requested after agent output
- User provided their own solution

## Step 4: Clarify if Unclear

**MANDATORY:** If ANY of these are unclear, use AskUserQuestion BEFORE analyzing:

- What exactly went wrong?
- Which specific behavior to change?
- What is the expected behavior?

**Signs you need to clarify:**
- User uses vague terms: "too long", "not working", "wrong"
- User mentions multiple issues in one message
- You're not 100% sure what user means

**Do NOT:**
- Guess what user means
- Invent interpretations
- Add specific values user didn't mention

## Step 5: Impact Analysis

When REMOVING or MODIFYING existing code/config:

1. Use Grep to find all references
2. List affected files
3. Ask confirmation: "This affects X files. Update all?"

## Step 6: Map Issue to Agent

| Issue Type | Agent |
|------------|-------|
| UI/styling/responsive | Developer |
| Missing functionality | Developer |
| Wrong business logic | BA or Developer |
| Missing tests | Tester |
| Missed edge cases | Tester |
| Unclear requirements | BA |
| Documentation | Documenter |

## Step 7: Assess Severity

| Severity | Description | Action |
|----------|-------------|--------|
| Critical | Broken, security issue | Immediate fix + checklist |
| High | Missing common pattern | Add to checklist |
| Medium | Edge case missed | Add to examples |
| Low | Style/preference | Document only, no rule |

## Step 8: Research (High+ Severity)

Search for Claude Code patterns, community solutions, best practices.
Skip for Low severity or well-known patterns.

## Step 9: Self-Critique

Before presenting, verify:
- Root cause or just symptom?
- Could cause false positives?
- Minimal change needed?
- Conflicts with existing rules?

## Step 10: Output & Save

Output format:
```markdown
## Analysis
**Issue:** [what user had to correct]
**Severity:** [level]
**Root cause:** [why missed]
**Agent:** [name]

## Recommendations
### 1. [Title]
**Section:** [name]
**Type:** Add | Modify | Remove
**Change:** [exact text]
**Rationale:** [why this prevents the issue]
```

Use `AskUserQuestion`: Apply All / Select specific / None

Save selected to `~/.claude/.improvements/suggestions.md`
Report: "Saved. Run /agent:update to apply."

## Rules

- **Analysis only** — NEVER use Edit tool
- **Delegate changes** — via `/agent:update`
- Maximum 5 recommendations per session
- Read full agent file before proposing
- Self-test: would this change have prevented the original issue?
- **NEVER invent specific values** — if user says "too long", do NOT add "max 10 lines". Only use values user explicitly stated.
- If recommendation needs a specific number/limit, use `AskUserQuestion` to ask user what value they want

**FORBIDDEN:** Edit, NotebookEdit
**ALLOWED:** Write ONLY to `~/.claude/.improvements/suggestions.md`

If you catch yourself about to use Edit — STOP and save to suggestions.md instead.
