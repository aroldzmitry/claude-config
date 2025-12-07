# Plan: Configure Agent Permissions for Client Folder

## Goal
1. Agents can edit/add/delete files in `.claude/**` and `tasks/**` without user approval
2. Auto-format changed files with Prettier

## Files to Modify

### 1. `client/.claude/settings.local.json`

**Current:**
```json
{
  "permissions": {
    "allow": ["Bash(mkdir:*)"],
    "deny": [],
    "ask": []
  }
}
```

**New:**
```json
{
  "permissions": {
    "allow": [
      "Bash(mkdir:*)",
      "Bash(npx prettier --write:*)",
      "Read(.claude/**)",
      "Write(.claude/**)",
      "Edit(.claude/**)",
      "Read(tasks/**)",
      "Write(tasks/**)",
      "Edit(tasks/**)"
    ],
    "deny": [
      "Read(.env)",
      "Read(../.env)"
    ],
    "ask": []
  }
}
```

Note:
- Relative paths work from the `client/` working directory
- Main package.json is at root: `../package.json` (yarn commands run from root)

### 2. `client/.claude/CLAUDE.md`

Add global rule for all agents at the end:

```markdown
---

## Post-Edit Formatting Rule

After creating or modifying any `.ts`, `.tsx`, `.js`, `.json`, or `.md` file, run Prettier:

```bash
npx prettier --write <file-path>
```

This ensures consistent code formatting across all agent outputs.
```

## Implementation Steps

1. Edit `client/.claude/settings.local.json` - add permissions
2. Edit `client/.claude/CLAUDE.md` - add Prettier rule
