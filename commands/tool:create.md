---
description: Create a new agent, command, or skill with iterative user confirmation
argument-hint: "[name] [description]"
model: sonnet
---

# Tool Creator

Create Claude Code tools (agents, commands, skills) with step-by-step user validation.

## Workflow

1. **Input** — parse arguments, ask only missing params
2. **Confirm understanding** — show summary + flow + output + dialogs, iterate until approved
3. **Check duplicates** — find similar tools, discuss options
4. **Research** — web search, show solutions with +/-, iterate until approved
5. **Create** — write concise file optimized for Claude
6. **Requirements check** — verify file matches user requirements, check redundancy
7. **Validate** — run /tool:check
8. **Report** — file path + line count

## Phase 1: Input Collection

Parse `$ARGUMENTS`: `$1` = name, `$2+` = description

Ask if missing:
- **scope** — Global (~/.claude/) or Project (.claude/)
- **type** — agent / command / skill
- **model** — haiku/sonnet/opus (default: opus)

## Phase 2: Understanding + Flow + Interaction

### 2.1 Understanding

Show: tool name, purpose (one sentence), workflow steps (numbered list).

### 2.2 Output Design

Suggest possible outputs based on task. User selects what to include.

Define: status format, data items, markdown structure.

### 2.3 Dialog Design

Define each dialog: when it appears, type (single/multi/text), recursive until condition, options.

**Iterate all sub-sections until user confirms.**

## Phase 3: Duplicate Check

Search `~/.claude/` and `.claude/` for similar agents/commands.

If overlap: show what exists, ask — Create new / Update existing / Replace / Cancel

## Phase 4: Research

WebSearch for similar implementations and best practices.

### 4.1 Comparison Table

Show findings as table:

| Tool | Improvement | Benefit | Potential Downsides |
|------|-------------|---------|---------------------|
| tool-name | feature/approach | what it adds | risks/complexity/tradeoffs |

### 4.2 Selection

MUST invoke `AskUserQuestion` multi-select tool with improvements from 4.1 table as options. Each option label = improvement name, description = benefit + downside.

## Phase 5: Create File

Before writing, use `subagent_type="claude-code-guide"` to check official docs for correct YAML frontmatter fields and syntax.

Write to `{scope}/agents/` or `{scope}/commands/`.

Structure: YAML frontmatter (description, tools, model) → title → instructions → Output (status + data from 2.2) → Dialogs (from 2.3) → Rules (DO/DON'T).

YAML rules: quote values with special chars (`[]`, `:`, `|`).

### Minimalist Format Rules (for created files)
- Write for Claude, not humans
- No decorative formatting or verbose templates
- No code blocks with example outputs — describe in one line
- No tables where a list suffices
- No redundant examples — one per concept max
- Each instruction 1-2 lines
- Remove anything that doesn't change Claude's behavior

## Phase 6: Requirements Check

Verify created file:
- All requirements from Phase 2.1 implemented
- All outputs from Phase 2.2 included
- All dialogs from Phase 2.3 defined
- Follows **Claude Tools Format**: no verbose templates, no decorative code blocks, each instruction 1-2 lines
- No duplicate/redundant sections

Fix silently if minor. Report fixes to user if significant.

## Phase 7: Validate

Run `/tool:check {path}`. Fix if FAIL, ask user if WARN.

## Phase 8: Report

Output: file path, line count.

## Rules

- Iterate until user confirms
- Never skip validation
- One tool at a time
- Default model: opus
