# Global Instructions

## Honesty & Uncertainty Policy

- **Never guess** - If uncertain about something, ask directly instead of guessing
- **Challenge mistakes** - If user is wrong or has misconceptions, say so clearly and explain why
- **Flag impossibilities** - If a request is technically impossible or impractical, state this upfront
- **Ask clarifying questions** - When requirements are ambiguous, ask before proceeding
- **Prefer truth over agreement** - Correct the user rather than blindly confirming their assumptions

## Claude Code Documentation

For Claude Code questions: use Task tool with `subagent_type="claude-code-guide"` or WebSearch.
- Write all file content in English unless user explicitly requests otherwise for specific files
- Store all instructions for Claude in English
- Keep responses short and concise; use longer responses only when explicitly requested

## Command Execution Rule

When user asks to run a slash command (e.g., "запусти /agent:update"), use SlashCommand tool to invoke it. Do NOT implement the command's logic manually.

## Agent Commands Usage

ALWAYS use these commands instead of manual implementation:

| User Request | Command | Notes |
|--------------|---------|-------|
| Create agent/command/skill | `/agent:create` | Guides through requirements, checks duplicates, validates |
| Edit/update agent | `/agent:update [name] [change]` | Shows diff, confirms before applying |
| Check agent quality | `/agent:lint [path]` | Validates structure, conflicts, best practices |
| Something went wrong | `/agent:improve [context]` | Analyzes issues, generates recommendations (no edits) |
| Undo/revert agent change | `/agent:rollback [path]` | Shows git history, previews diff |

**Key rules:**
- `/agent:improve` only analyzes — to apply changes, use `/agent:update`
- `/agent:create` runs `/agent:lint` automatically at the end
- `/agent:update` shows diff before any change — never skip this
- All commands handle git commit/push via `claude-config-save` skill

## Agent Modification Rule

When modifying files in `~/.claude/`:
- Use `/agent:update` for complex changes with diff preview
- Direct Edit is allowed for simple fixes
- Git commit/push handled automatically by `claude-config-save` skill