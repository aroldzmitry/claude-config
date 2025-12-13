---
name: improve-tools
description: Wrapper for /tool:improve command. Improves, fixes, or enhances agents, commands, or skills in ~/.claude/ directory. Use when user asks to improve, fix, enhance, or modify custom tools.
---

# Tool Improve Skill

## When to Use

Automatically use when user mentions:
- Improving/fixing/enhancing existing command/agent/skill
- Issues with tool execution in ~/.claude/
- Corrections to tool behavior
- Requests like "improve X tool", "fix Y command", "enhance Z agent"

## Instructions

1. Parse arguments - extract tool name if provided
2. Invoke `/tool:improve` with arguments using SlashCommand tool:
   - If tool name provided: `SlashCommand('/tool:improve {tool-name}')`
   - If no tool name: `SlashCommand('/tool:improve')`
3. Let /tool:improve handle all interaction, research, implementation, validation
4. Report completion status from /tool:improve

## Examples

User: "улучши web:implement команду"
→ Invoke: `SlashCommand('/tool:improve web:implement')`

User: "нужно пофиксить баги в claude-config-save skill"
→ Invoke: `SlashCommand('/tool:improve claude-config-save')`

User: "есть проблема с tool:create, улучши его"
→ Invoke: `SlashCommand('/tool:improve tool:create')`

## Output

Delegates all output to `/tool:improve`. Reports:
- Tool being improved (if identified)
- Status from `/tool:improve` (Done / Failed)
- File changes (if any)
- Errors (if operation fails)

## Error Handling

If `/tool:improve` fails or returns errors:
- Pass error message directly to user
- No retry logic — `/tool:improve` handles its own validation/recovery
- User can manually run `/tool:improve` if needed

## Rules

- Pure delegation — no additional logic or validation
- Pass all arguments to /tool:improve unchanged
- Don't duplicate /tool:improve functionality
- Trust /tool:improve to handle all dialogs and validation
- No tool access restrictions (inherits from parent)
