# improve-tools (Skill)

Wrapper skill that delegates to `/tool:improve` command. Automatically invokes `/tool:improve` when user requests improvements to agents, commands, or skills in `~/.claude/` directory.

## Usage

The skill auto-triggers when user mentions:
- Improving/fixing/enhancing existing command/agent/skill
- Issues with tool execution
- Corrections to tool behavior
- Phrases like "improve X tool", "fix Y command", "enhance Z agent"

## How it Works

1. Detects user request for tool improvement
2. Extracts tool name if provided (e.g., "web:implement" from "improve web:implement")
3. Invokes `/tool:improve` command via SlashCommand tool
4. Passes full control to `/tool:improve` for:
   - Problem analysis
   - Solution research
   - Implementation
   - Validation
   - Git commit/push
5. Returns results from `/tool:improve`

## Examples

**User:** "улучши web:implement команду"
**Skill:** `SlashCommand('/tool:improve web:implement')`

**User:** "нужно пофиксить баги в claude-config-save skill"
**Skill:** `SlashCommand('/tool:improve claude-config-save')`

**User:** "есть проблема с tool:create, улучши его"
**Skill:** `SlashCommand('/tool:improve tool:create')`

## When to Use

- User explicitly asks to improve/fix/enhance a tool
- Conversation reveals issues/bugs in existing agents/commands/skills
- User suggests improvements to `~/.claude/` files
- Multiple issues found that need systematic fixing via `/tool:improve`

## Design

Pure delegation pattern — wrapper adds no additional logic, simply triggers `/tool:improve` with appropriate context.

## Related

- `/tool:improve` — The wrapped command that handles all improvement logic
- `claude-config-save` — Complementary skill that commits changes after files are modified
