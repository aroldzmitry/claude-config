# Plan: Convert agent-creator to Global Command

## Task
Convert the `agent-creator` subagent to a regular global slash command.

## Current State
- **Subagent file**: `/Users/dmitry/.claude/agents/agent-creator.md`
- **Existing commands folder**: `/Users/dmitry/.claude/commands/`

## Steps

### 1. Create new command file
Create `/Users/dmitry/.claude/commands/agent-creator.md` with the content from the subagent, adapted to slash command format:
- Remove YAML frontmatter (name, description, tools, model, color)
- Keep the prompt content as-is

### 2. Delete old agent file
Delete `/Users/dmitry/.claude/agents/agent-creator.md`

## Result
The command will be available as `/agent-creator` globally instead of being auto-triggered as a subagent.
