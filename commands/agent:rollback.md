---
description: "Rollback an agent, command, or file to a previous git version"
argument-hint: <file-path>
---

# Agent Rollback

Rollback a file in `~/.claude/` to a previous git version.

## Process

1. **Validate** — ensure file is in `~/.claude/`
2. **Show history:**
   ```bash
   cd ~/.claude && git log --oneline -10 -- {path}
   ```
3. **Ask user** — which version to restore (1-10 or commit hash)
4. **Preview diff:**
   ```bash
   git diff {commit} HEAD -- {path}
   ```
5. **Confirm** — "Apply this rollback? [Yes/No]"
6. **Apply:**
   ```bash
   git show {commit}:{path} > {file_path}
   ```

Git commit/push handled by `claude-config-save` skill.

## Path Formats

Accept: `agents/name.md`, `~/.claude/agents/name.md`, or full absolute path.

## Error Handling

| Scenario | Action |
|----------|--------|
| Not in ~/.claude/ | Error: only ~/.claude/ files |
| No git history | Error: no previous versions |
| Commit not found | Error: commit not in history |

## Rules

- Always preview before applying
- Use git as source of truth
