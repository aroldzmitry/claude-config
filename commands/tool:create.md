---
description: Create a new agent, command, or skill with iterative user confirmation
argument-hint: [name] [description]
model: opus
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
7. **Validate** — run /agent:lint
8. **Document** — create docs in nearest .claude/docs/
9. **Report** — file path + line count

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

Show options with +/- concisely. Iterate until user confirms approach.

## Phase 5: Create File

Write to `{scope}/agents/` or `{scope}/commands/`.

Structure: YAML frontmatter (description, tools, model) → title → instructions → Output (status + data from 2.2) → Dialogs (from 2.3) → Rules (DO/DON'T).

Principles: no decorative formatting, no redundant examples, write for Claude not humans.

## Phase 6: Requirements Check

Verify created file:
- All requirements from Phase 2.1 implemented
- All outputs from Phase 2.2 included
- All dialogs from Phase 2.3 defined
- No duplicate instructions
- No redundant sections

Fix silently if minor. Report fixes to user if significant.

## Phase 7: Validate

Run `/agent:lint {path}`. Fix if FAIL, ask user if WARN.

## Phase 8: Documentation

Create `{nearest .claude/docs}/tools/{name}.md` with: purpose, usage, parameters, one example.

## Phase 9: Report

Output: file path, line count, docs path.

## Rules

- Iterate until user confirms
- Never skip validation
- One tool at a time
- Default model: opus
