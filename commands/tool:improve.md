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
4. Build internal model of the tool
5. Derive quality checklist for this tool
6. Describe problem, confirm understanding
7. Research and compare against best practices
8. Present options with pre-change filter, iterate until selected
9. Discuss output/dialog changes if needed
10. Implement solution
11. Verify changes
11a. Check cross-tool impact, resolve with user
12. Produce change summary
13. List remaining issues and weaknesses
14. Update documentation if exists
15. Git commit/push (if user level)
16. Report

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

## Step 4: Build Internal Model

Read the selected tool file. Before proposing changes, produce structured understanding:

- **Purpose**: What problem does this tool solve (1 sentence)
- **Input**: What triggers/arguments/context it expects
- **Output**: What it produces (files, dialogs, actions)
- **Architecture**: Key internal blocks and logic flow
- **Dependencies**: Other tools/skills/commands it calls or references
- **Integration points**: Where it connects to external systems
- **Scope boundaries**: What this tool should NOT do

This model is the foundation for all subsequent analysis. Do not skip.

## Step 5: Derive Quality Checklist

Based on tool's domain and purpose, extract criteria for its "ideal version":

- Robustness to ambiguous inputs
- Behavioral consistency
- Argument predictability
- API clarity
- No hidden logic or side effects
- Atomicity of actions
- State recoverability
- Deterministic output

Customize criteria to tool type:
- Agent: focus on workflow clarity, handoff points, failure modes
- Command: focus on argument parsing, output format, idempotency
- Skill: focus on integration, state management, composability

This checklist guides what "better" means for this specific tool.

## Step 6: Describe Problem

Based on conversation context + tool content + internal model, describe:
- What went wrong (1-2 sentences)
- Expected vs actual behavior
- Root cause hypothesis

Use `AskUserQuestion`:
- "Is this understanding correct?"
- Options: "Correct" + text field for clarifications
- Recurse until user confirms "Correct"

## Step 7: Research and Compare Against Best Practices

**MUST use WebSearch** before proposing any solution. Search: "[problem type] Claude Code best practices 2025"

Check official docs if relevant (WebFetch).

**Mandatory comparison process:**
1. Collect 2-3 external examples of similar tools/patterns
2. Build comparison table: current implementation vs best practices
3. Identify gaps between current state and industry standards
4. Use gaps as foundation for improvement proposals

**MUST NOT skip:** Summarize how external best practices differ from current implementation before proposing any fix.

**Quality over speed:** Do not stop at first solution found. Evaluate multiple approaches, compare trade-offs, select 2-3 optimal options for user to choose from.

## Step 8: Present Solutions with Pre-Change Filter

Before presenting any fix to user, verify it passes these filters:
- Does NOT reduce tool predictability
- Does NOT add logical ambiguity
- Does NOT overcomplicate API
- Does NOT make behavior less deterministic
- Does NOT introduce logical noise

If a proposed change fails any filter — discard it or revise before presenting.

Use `AskUserQuestion`:
- Show options with brief +/- for each
- Include text field for questions or custom solution
- Recurse until user selects an option

### 8a: Dialog Changes (if applicable)

If tool has `AskUserQuestion` calls that need updating:
- Show proposed changes to dialogs
- Use multi-select for which changes to apply
- Include text field for modifications

### 8b: Output Changes (if applicable)

If tool output format needs updating:
- Show proposed changes to outputs
- Use multi-select for which changes to apply
- Include text field for modifications

## Step 9: Implement

Apply selected solution using Edit tool.

Follow Claude Tools Format:
- Write for Claude, not humans
- No decorative formatting
- Each instruction 1-2 lines
- Remove anything that doesn't change behavior

## Step 10: Verify

Run checks (like tool:create):
- File syntax valid
- No broken references
- Changes match selected solution
- No unintended side effects

### Step 10a: Cross-Tool Impact Check

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

## Step 11: Produce Change Summary

Output structured comparison:

**Old version summary:** [1-2 sentences on previous behavior]

**New version summary:** [1-2 sentences on updated behavior]

**Specific improvements:**
- [improvement 1]
- [improvement 2]
- ...

**Why changes improve quality:** [based on quality checklist from Step 5]

**Risks eliminated:** [what failure modes are now prevented]

**Bugs prevented:** [what issues won't happen anymore]

**Edge cases improved:** [what scenarios now work better]

**Potential regressions:** [how changes could have made things worse — be honest]

## Step 12: List Remaining Issues

Produce two lists:

**Unresolved issues:**
- [issue that wasn't addressed]
- [known limitation that remains]

**Remaining weaknesses:**
- [weakness the new version still has]
- [area for future improvement]

If no issues remain — state explicitly: "No known remaining issues."

## Step 13: Documentation Update

Check if documentation exists:
- Search `~/.claude/docs/tools/` for `[tool-name].md`
- Search `~/.claude/docs/` for matching patterns

If documentation found:
1. Read current docs
2. Update to reflect changes made
3. Keep format minimal, factual

If no documentation — skip this step.

## Step 14: Git Integration

If file is in `~/.claude/` (user level):
- Use `claude-config-save` skill for git commit and push

## Step 15: Report

Output files list:
- `[A]` path/to/file.md — created
- `[M]` path/to/file.md — updated
- `[D]` path/to/file.md — deleted

## Rules

- MUST scan full conversation context
- MUST read tool file before proposing changes
- MUST build internal model before analyzing problems
- MUST derive quality checklist before proposing fixes
- MUST research (WebSearch) and compare against best practices before recommending
- MUST apply pre-change filter to every proposed fix
- MUST produce change summary with honest assessment of potential regressions
- MUST list remaining issues and weaknesses
- MUST iterate dialogs until user confirms
- Never guess — ask if unclear
- Never skip confirmation steps
- Never propose changes to unselected tools
