---
description: "Apply improvements to agents, commands, or skills. Supports rollback and recommendations from /agent:improve."
argument-hint: [target] [change-description]
---

# Agent Update

Apply updates to agent or command: $ARGUMENTS

## Argument Parsing

Parse `$ARGUMENTS` to extract:
1. **Target:** The file path or agent/command name (optional if applying recommendations)
2. **Change description:** What to change (optional for recommendation mode)
3. **Flags:**
   - `rollback`, `revert`, `undo` — Rollback mode
   - `--r` — Enable web research for complex changes

**Parsing rules:**
- No arguments → check for recommendations to apply
- Name only → direct update mode, ask what to change
- Name + description → direct update with specific change

**Examples:**
| Input | Target | Mode |
|-------|--------|------|
| (empty) | - | recommendations |
| `developer` | developer | direct (ask what) |
| `developer add accessibility checklist` | developer | direct update |
| `rollback developer` | developer | rollback |
| `--r agent-lint add examples` | agent-lint | direct + research |

## Step 1: Determine Scope

Auto-detect by priority:

1. **Explicit path** — `~/.claude/` → global, `.claude/` → project
2. **Keyword** — "global" or "project" in arguments
3. **File search** — search project first, then global
4. **Ambiguous** — use `AskUserQuestion` to choose

| Type | Global Path | Project Path |
|------|-------------|--------------|
| Agent | `~/.claude/agents/{name}.md` | `.claude/agents/{name}.md` |
| Command | `~/.claude/commands/{name}.md` | `.claude/commands/{name}.md` |
| Skill | `~/.claude/skills/{name}/SKILL.md` | `.claude/skills/{name}/SKILL.md` |

If file exists in **both** scopes, ask which one.

## Step 2: Find Target File

1. Use Glob to search for:
   - `{name}.md` in agents/ and commands/
   - `{name}/SKILL.md` in skills/
2. If not found → error: "File not found: {name}"
3. If found → store full path

## Step 3: Read Current Content

1. Use Read tool to get current file content
2. Store for diff generation

## Step 4: Generate Diff

Based on change description:
1. Identify which section(s) to modify
2. Generate proposed changes
3. Calculate lines added/removed

Show to user:
```
## Proposed Update

**File:** [full path]
**Section:** [name]
**Type:** Add | Modify | Remove

### Current:
[existing text]

### After:
[new text]

Lines: +X / -Y
```

## Step 5: Confirm with User

Use `AskUserQuestion`: Apply? (Yes / Edit first / No)

- **Yes** → proceed to Step 6
- **Edit first** → let user modify, then re-confirm
- **No** → stop

## Change Size Guidelines

| Size | Description | Action |
|------|-------------|--------|
| Small | Fix typo, add one line | Show diff, apply on confirm |
| Medium | Add section, modify rule | Show diff, explain impact, confirm |
| Large | Restructure, rewrite | Suggest `/agent:create` instead |

If change is **Large** → stop and suggest creating new agent/command instead.

## Step 6: Apply Changes

After user confirms, apply directly using Edit tool:

```
Edit(file_path=[full_file_path], old_string=[exact text], new_string=[new text])
```

## Rollback Mode

If `rollback`/`revert`/`undo` in arguments → use `/agent:rollback [file_path]`

## Recommendation Mode

When no arguments:

1. Read `~/.claude/.improvements/suggestions.md`
2. If has recent recommendations (<7 days) → show and ask which to apply
3. If empty/outdated → ask user what to update

## Web Research Mode

When `--r` flag present:

1. Use WebSearch for best practices before generating diff
2. Incorporate findings into proposed changes

## Migration Between Scopes

When user requests moving file between global ↔ project:

1. Create file in target scope
2. Verify new file created correctly
3. Delete old file from source scope
4. Update backups in target scope

**Never leave duplicate files** in both scopes.

## Anti-Patterns

| Anti-Pattern | Better Approach |
|--------------|-----------------|
| Rewrite whole file | Edit specific section only |
| Skip validation | Always check syntax first |
| Guess user intent | Ask for clarification |
| Apply without showing | Always show diff first |

## Rules

- **Always show diff** before applying
- **Never guess** — ask if unclear
- Git commit/push handled by `claude-config-save` skill
