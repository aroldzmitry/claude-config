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

When user asks to run a slash command, use SlashCommand tool to invoke it. Do NOT implement the command's logic manually.

## Agent Commands Usage

| User Request | Command | Notes |
|--------------|---------|-------|
| Create agent/command/skill | `/tool:create` | Iterative confirmation, research, validates |
| Check agent quality | `/tool:check [path]` | Validates structure, conflicts, compares with alternatives |
| Improve existing tool | `/tool:improve [context]` | Analyzes conversation, researches, applies fix |

All commands handle git commit/push via `claude-config-save` skill.

## Agent Modification Rule

When modifying files in `~/.claude/`:
- Use `/tool:improve` for complex fixes with research
- Direct Edit is allowed for simple changes
- Git commit/push handled automatically by `claude-config-save` skill

## Git Safety Rules

**FORBIDDEN git operations:**
- `git reset --hard` - NEVER use, destructive and loses work
- `git reset --soft/--mixed` - NEVER use, rewrites history
- `git push --force` or `git push -f` - NEVER use, destructive to remote
- `git push --force-with-lease` - NEVER use without explicit user approval

**Required for rollbacks:**
- Use `git revert <commit>` to undo changes (creates new commit, preserves history)
- Use `git revert <commit1>..<commit2>` to revert range
- Always preserve commit history - never rewrite it

**If user requests rollback:**
1. Ask which commit to revert to
2. Use `git log --oneline` to show history
3. Use `git revert` to create undo commit
4. If user explicitly requests force push - warn about risks and ask confirmation

## Claude Tools Format

All agents, commands, skills must be written in **minimalist format**:
- Write for Claude, not humans
- No decorative formatting or verbose templates
- No code blocks with example outputs — describe in one line
- No tables where a list suffices
- No redundant examples — one per concept max
- Each instruction in 1-2 lines
- Remove anything that doesn't change Claude's behavior