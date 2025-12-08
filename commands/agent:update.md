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
   - `--skip-research` — Skip research for trivial changes

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
| `--skip-research developer fix typo` | developer | direct (no research) |

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

## Step 4: Research & Analysis

Analyze the requested change and research best practices:

1. **Understand intent** — what is the user trying to achieve?
2. **Search for patterns:**
   - WebSearch: `"Claude Code agent" {change type} best practices`
   - Check claude-code-guide for official patterns
3. **Evaluate approaches:**
   - Direct edit vs restructure
   - Single change vs multiple related changes
   - Impact on existing workflow

### Present Analysis

```
## Change Analysis

### What You Want
[Summarize user's intent]

### Current Agent Behavior
[How the agent works now]

### Recommended Approach
**Option A:** [approach] — [pros/cons]
**Option B:** [approach] — [pros/cons]

### Suggestion
[Best path to achieve the result with reasoning]
```

**Ask user:** "Which approach do you prefer? (A / B / Other)"

## Step 5: Show Change Summary

Based on change description and chosen approach:
1. Identify which section(s) to modify
2. Generate proposed changes
3. Calculate lines added/removed

### Summary Format (for changes >50 lines)

```markdown
## Proposed Changes

**File:** [path]
**Change type:** [Full redesign / Add section / Modify rule / Fix typo]

### What was
[2-3 sentence summary of current behavior]

### What will be
[2-3 sentence summary of new behavior]

### Key changes
- [change 1]
- [change 2]
- [change 3]

**Lines affected:** +X / -Y
```

### Inline Diff (for changes <50 lines)

For small changes, show git-style inline diff:

```diff
 unchanged line
-removed line
+added line
```

## Step 6: Confirm with User

Use `AskUserQuestion`: "Apply changes?"

Options:
- **Yes** → proceed to Step 7
- **Clarify details** → show more info, then re-confirm
- **Cancel** → stop

## Change Size Guidelines

| Size | Description | Action |
|------|-------------|--------|
| Small | Fix typo, add one line | Show diff, apply on confirm |
| Medium | Add section, modify rule | Show diff, explain impact, confirm |
| Large | Restructure, rewrite | Suggest `/agent:create` instead |

If change is **Large** → stop and suggest creating new agent/command instead.

## Step 7: Apply Changes

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

## Research Notes

Research is performed by default in Step 4. Use `--skip-research` flag for trivial changes (typos, small fixes).

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

**Final report format (after applying):**
```
Done. [1 sentence: what changed].

Commit: [hash]
```

Do NOT include: tables, "Key New Capabilities", "Usage Examples", detailed breakdowns.
