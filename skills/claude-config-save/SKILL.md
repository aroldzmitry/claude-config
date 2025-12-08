---
name: claude-config-save
description: Save files to ~/.claude/ with proper git commit and push. Use when creating, editing, or deleting files in ~/.claude/ directory (agents, commands, skills, settings).
---

# Claude Config Save

## When to Use
Automatically use this skill AFTER any Write/Edit/Delete on files in ~/.claude/:
- agents/, commands/, skills/
- settings.json, CLAUDE.md
- hooks/, tasks/

## Instructions

After modifying a file in ~/.claude/, run git commit and push:

1. Determine operation type:
   - New file → "Add"
   - Modified file → "Update"
   - Deleted file → "Remove"

2. Get summary from first line of file or first changed line

3. Commit and push:
   ```bash
   cd ~/.claude && git add -A && git commit -m "{Type}: {filename} - {summary}" && git push
   ```

## Examples

| Operation | Commit Message |
|-----------|---------------|
| Create agent | `Add: developer.md - Software Developer agent` |
| Edit command | `Update: tool:improve.md - Fix validation logic` |
| Delete file | `Remove: old-agent.md` |

## Important
- Always commit after file operations
- Always push to remote
- Use short summary (max 50 chars)
