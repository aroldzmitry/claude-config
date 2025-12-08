---
description: "Improve existing tools by analyzing conversation history for issues and corrections"
argument-hint: "[additional context]"
model: opus
---

# Tool Improver

Improve existing tools (agents, commands, skills) through structured workflow with mandatory checkpoints.

## Execution Model

This command uses a state machine. Each step:
- **requires**: artifacts from previous steps (cannot proceed without them)
- **outputs**: named artifacts (must be displayed to user)
- **waits**: user input via AskUserQuestion (execution pauses until response)
- **actions**: mandatory tool calls (WebSearch, etc.)

**If a required artifact is missing → STOP and go back to the step that produces it.**

## Workflow

```
[ISSUES_LIST] ← Step 1
       ↓
[USER_SELECTION] ← Step 2 (waits: AskUserQuestion)
       ↓
[TOOL_CONTENT] ← Step 3
       ↓
[INTERNAL_MODEL] ← Step 4 (display to user)
       ↓
[QUALITY_CHECKLIST] ← Step 5 (display to user)
       ↓
[PROBLEM_STATEMENT] ← Step 6 (waits: AskUserQuestion)
       ↓
[RESEARCH_RESULTS] ← Step 7 (actions: WebSearch)
       ↓
[SELECTED_SOLUTION] ← Step 8 (waits: AskUserQuestion)
       ↓
[MODIFIED_TOOL] ← Step 9
       ↓
[VERIFICATION_RESULT] ← Step 10
       ↓
[CHANGE_SUMMARY] ← Step 11 (display to user)
       ↓
[REMAINING_ISSUES] ← Step 12 (display to user)
       ↓
Steps 13-16: Documentation, Git, Report
```

---

## Step 1: Scan Conversation

**outputs: [ISSUES_LIST]**

Scan full conversation for:
- Errors during tool execution
- User corrections ("should be X not Y")
- User-provided solutions
- Repeated attempts
- User frustration signals

If `$ARGUMENTS` provided — use as context, NOT as implementation instructions.

**Output format:**
```
[ISSUES_LIST]
1. [tool-name] — [issue description] — [issue type]
2. [tool-name] — [issue description] — [issue type]
...
```

---

## Step 2: Show Candidates

**requires: [ISSUES_LIST]**
**waits: AskUserQuestion**
**outputs: [USER_SELECTION]**

Present issues list to user via `AskUserQuestion` single-select.
Include option "Enter custom tool name".

**⏸ EXECUTION PAUSES HERE** — Do not proceed until user responds.

---

## Step 3: Read Tool

**requires: [USER_SELECTION]**
**outputs: [TOOL_CONTENT]**

Read selected tool file. If custom path — ask user for path first.

---

## Step 4: Build Internal Model

**requires: [TOOL_CONTENT]**
**outputs: [INTERNAL_MODEL]** — MUST display to user

Produce structured understanding:

| Field | Value |
|-------|-------|
| Purpose | [1 sentence] |
| Input | [triggers, arguments, context] |
| Output | [files, dialogs, actions] |
| Architecture | [key blocks, logic flow] |
| Dependencies | [tools, skills, commands called] |
| Integration | [external systems] |
| Boundaries | [what tool should NOT do] |

**Display this table to user before proceeding.**

---

## Step 5: Derive Quality Checklist

**requires: [INTERNAL_MODEL]**
**outputs: [QUALITY_CHECKLIST]** — MUST display to user

Extract criteria for tool's "ideal version":

| Criterion | Current State | Ideal State |
|-----------|---------------|-------------|
| [criterion 1] | [current] | [ideal] |
| ... | ... | ... |

Standard criteria:
- Robustness to ambiguous inputs
- Behavioral consistency
- Argument predictability
- API clarity
- No hidden side effects
- Atomicity of actions
- Deterministic output

Customize by tool type (agent/command/skill).

**Display this table to user before proceeding.**

---

## Step 6: Describe Problem

**requires: [QUALITY_CHECKLIST], [ISSUES_LIST]**
**waits: AskUserQuestion**
**outputs: [PROBLEM_STATEMENT]**

Describe:
- What went wrong (1-2 sentences)
- Expected vs actual behavior
- Root cause hypothesis

Use `AskUserQuestion`:
- "Is this understanding correct?"
- Options: "Correct" / "Needs clarification"
- Recurse until user confirms

**⏸ EXECUTION PAUSES HERE** — Do not proceed until user confirms.

---

## Step 7: Research Best Practices

**requires: [PROBLEM_STATEMENT]**
**actions: WebSearch (MANDATORY)**
**outputs: [RESEARCH_RESULTS], [COMPARISON_TABLE]**

1. Execute `WebSearch`: "[problem type] Claude Code best practices 2025"
2. Collect 2-3 external examples
3. Build comparison table:

| Aspect | Current | Best Practice | Gap |
|--------|---------|---------------|-----|
| ... | ... | ... | ... |

4. Use gaps as foundation for solutions

**MUST NOT proceed to Step 8 without executing WebSearch.**

---

## Step 8: Present Solutions

**requires: [RESEARCH_RESULTS], [QUALITY_CHECKLIST]**
**waits: AskUserQuestion**
**outputs: [SELECTED_SOLUTION]**

Before presenting, apply pre-change filter to each option:
- Does NOT reduce predictability
- Does NOT add ambiguity
- Does NOT overcomplicate API
- Does NOT reduce determinism

Present 2-3 options via `AskUserQuestion`:
- Brief +/- for each
- Include "Other" for custom input

**⏸ EXECUTION PAUSES HERE** — Do not proceed until user selects.

---

## Step 9: Implement

**requires: [SELECTED_SOLUTION], [TOOL_CONTENT]**
**outputs: [MODIFIED_TOOL]**

Apply selected solution using Edit tool.

Follow Claude Tools Format:
- Write for Claude, not humans
- No decorative formatting
- Each instruction 1-2 lines

---

## Step 10: Verify

**requires: [MODIFIED_TOOL]**
**outputs: [VERIFICATION_RESULT]**

Check:
- File syntax valid
- No broken references
- Changes match selected solution
- No unintended side effects

Search `~/.claude/` for references to modified tool. If dependencies found:
- List affected tools
- Use `AskUserQuestion` to resolve

---

## Step 11: Change Summary

**requires: [MODIFIED_TOOL], [TOOL_CONTENT], [QUALITY_CHECKLIST]**
**outputs: [CHANGE_SUMMARY]** — MUST display to user

```
[CHANGE_SUMMARY]
Old version: [1-2 sentences]
New version: [1-2 sentences]

Improvements:
- [improvement 1]
- [improvement 2]

Quality gains: [based on checklist]
Risks eliminated: [failure modes prevented]
Edge cases improved: [scenarios now working]
Potential regressions: [honest assessment]
```

---

## Step 12: Remaining Issues

**requires: [CHANGE_SUMMARY]**
**outputs: [REMAINING_ISSUES]** — MUST display to user

```
[REMAINING_ISSUES]
Unresolved:
- [issue not addressed]

Weaknesses:
- [area for future improvement]
```

If none: "No known remaining issues."

---

## Step 13: Documentation

Check `~/.claude/docs/` for tool documentation. If exists — update.

---

## Step 14: Git

If file in `~/.claude/`: use `claude-config-save` skill.

---

## Step 15: Report

```
Files:
- [A] path — created
- [M] path — updated
- [D] path — deleted
```

---

## Rules

**State machine enforcement:**
- Cannot proceed without required artifacts
- Must display artifacts marked "display to user"
- Must pause at steps with "waits"
- Must execute mandatory actions

**Prohibited:**
- Treating arguments as implementation instructions
- Skipping WebSearch
- Implementing without user selection
- Proceeding without required artifacts
