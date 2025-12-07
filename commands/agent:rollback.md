---
description: "Rollback an agent, command, or file to a previous git version"
argument-hint: <file-path>
---

# Agent Rollback

Rollback a file in `~/.claude/` to a previous git version.

## Usage

```
/agent:rollback <file-path>
```

Example: `/agent:rollback agents/developer.md`

## Workflow

1. **Validate file path** - ensure file is in `~/.claude/`
2. **Show git history** - list recent commits for the file
3. **Ask user** - which version to restore
4. **Preview diff** - show what will change
5. **Confirm and apply** - restore the file
6. **Commit** - with message `Rollback: {filename} - reverted to {commit}`

## Step 1: Validate Path

```bash
cd ~/.claude
# If path doesn't start with ~/.claude, prepend it
```

Accept formats:
- `agents/developer.md`
- `~/.claude/agents/developer.md`
- Full absolute path

## Step 2: Show History

Run:
```bash
git log --oneline -10 -- {relative_path}
```

Display to user:
```
Recent versions of {filename}:

1. abc1234 - Update: developer.md - Added new section (2 hours ago)
2. def5678 - Update: developer.md - Fixed typo (yesterday)
3. 789abcd - Add: developer.md (3 days ago)

Which version to restore? [1-10 or commit hash]
```

## Step 3: Preview Changes

After user selects version:
```bash
git diff {selected_commit} HEAD -- {relative_path}
```

Show preview and ask: "Apply this rollback? [Yes/No]"

## Step 4: Apply Rollback

```bash
git show {commit}:{relative_path} > {file_path}
```

## Step 5: Commit

```bash
git add {relative_path}
git commit -m "Rollback: {filename} - reverted to {commit_hash}"
git push
```

## Step 6: Report

```
Done: Rolled back {filename} to commit {commit_hash}
Git: committed and pushed
```

## Error Handling

| Scenario | Action |
|----------|--------|
| File not in ~/.claude/ | "Error: Only files in ~/.claude/ can be rolled back" |
| No git history | "Error: No previous versions found for {file}" |
| Commit not found | "Error: Commit {hash} not found in history" |
| File doesn't exist in commit | "Error: File didn't exist at commit {hash}" |

## Rules

- Only works with files in `~/.claude/`
- Always show preview before applying
- Always commit after rollback
- Use git as the source of truth
