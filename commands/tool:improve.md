---
description: "Improve existing tools by analyzing conversation history for issues and corrections"
argument-hint: "[additional context]"
model: opus
---

# Tool Improver

Improve existing tools (agents, commands, skills) by analyzing conversation for issues/corrections.

## Workflow

1. Scan conversation for issues
2. Show candidates with reasoning
3. User selects tool to improve
4. Describe problem, confirm understanding
5. Research solutions
6. Present options, iterate until selected
7. Discuss output/dialog changes if needed
8. Implement solution
9. Verify changes
9a. Check cross-tool impact, resolve with user
10. Update documentation if exists
11. Git commit/push (if user level)
12. Report

## Step 1: Scan Conversation

Look for:
- Errors during tool execution (exceptions, failures)
- User corrections ("should be X not Y", "missing X", "wrong X")
- User-provided solutions (user wrote fix themselves)
- Repeated attempts (tool tried multiple times)
- User frustration signals

Scan both direct tool calls and subagents/skills.

If `$ARGUMENTS` provided — use as additional context for scanning.

## Step 2: Show Candidates

List found tools:

```
Found issues in:
1. [tool-name] — [short reason why in selection]
2. [tool-name] — [short reason]
...
n. Enter custom tool name
```

Use `AskUserQuestion` single-select.

## Step 3: User Selects

Wait for user selection. If custom — ask for tool path.

## Step 4: Describe Problem

Read the selected tool file.

Based on conversation context + tool content, describe:
- What went wrong (1-2 sentences)
- Expected vs actual behavior
- Root cause hypothesis

## Step 5: Confirm Understanding

Use `AskUserQuestion`:
- "Is this understanding correct?"
- Options: "Correct" + text field for clarifications
- Recurse until user confirms "Correct"

## Step 6: Research Solutions

WebSearch: "[problem type] Claude Code best practices 2025"

Check official docs if relevant.

Evaluate approaches, prepare 2-3 options.

## Step 7: Present Solutions

Use `AskUserQuestion`:
- Show options with brief +/- for each
- Include text field for questions or custom solution
- Recurse until user selects an option

### 7a: Dialog Changes (if applicable)

If tool has `AskUserQuestion` calls that need updating:
- Show proposed changes to dialogs
- Use multi-select for which changes to apply
- Include text field for modifications

### 7b: Output Changes (if applicable)

If tool output format needs updating:
- Show proposed changes to outputs
- Use multi-select for which changes to apply
- Include text field for modifications

## Step 8: Implement

Apply selected solution using Edit tool.

Follow Claude Tools Format:
- Write for Claude, not humans
- No decorative formatting
- Each instruction 1-2 lines
- Remove anything that doesn't change behavior

## Step 9: Verify

Run checks (like tool:create):
- File syntax valid
- No broken references
- Changes match selected solution
- No unintended side effects

## Step 9a: Cross-Tool Impact Check

Search all tools in `~/.claude/` for references to modified tool:
- Grep for tool name, file name patterns
- Check if other tools call/invoke/reference modified tool

If dependencies found:
1. List affected tools with how they reference this tool
2. Use `AskUserQuestion` to ask user how to resolve:
   - "Update dependent tools automatically"
   - "Skip — user will handle manually"
   - Custom text for specific instructions
3. If user selects auto-update — apply changes to dependent tools

## Step 10: Documentation Update

Check if documentation exists:
- Search `~/.claude/docs/tools/` for `[tool-name].md`
- Search `~/.claude/docs/` for matching patterns

If documentation found:
1. Read current docs
2. Update to reflect changes made
3. Keep format minimal, factual

If no documentation — skip this step.

## Step 11: Git Integration

If file is in `~/.claude/` (user level):
- Use `claude-config-save` skill for git commit and push

## Step 12: Report

Output:

```
Status: Done

Changed: [file path]
Changes:
- [change 1]
- [change 2]

Lines: [before] → [after]
```

## Output Format

```
Status: Done | Failed - reason | Needs Review - explanation

Changed: [path]
Changes: [bullet list]
Lines: [before] → [after]
```

## Dialogs

| Step | Dialog | Type | Recurse |
|------|--------|------|---------|
| 2 | Select tool | Single + custom | No |
| 5 | Confirm understanding | Single + text | Until "Correct" |
| 7 | Select solution | Single + text | Until selected |
| 7a | Dialog changes | Multi + text | If applicable |
| 7b | Output changes | Multi + text | If applicable |
| 9a | Resolve cross-tool impact | Single + text | If dependencies found |

## Rules

**DO:**
- Scan full conversation context
- Read tool file before proposing changes
- Research before recommending
- Iterate dialogs until user confirms
- Apply changes directly (batch confirm)

**DON'T:**
- Guess what user wants — ask if unclear
- Skip confirmation steps
- Propose changes to tools not selected
