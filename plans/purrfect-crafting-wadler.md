# Agent Responsibility Audit

## Current State Analysis

### Agents Overview

| Agent | Purpose | Modifies Files? | Key Constraint |
|-------|---------|-----------------|----------------|
| `agent:create` | Create NEW agents | ✅ Write | Calls lint at end |
| `agent:update` | Apply changes to EXISTING | ✅ Edit | Shows diff before applying |
| `agent:improve` | Analyze issues → recommendations | ❌ FORBIDDEN | Only saves to suggestions.md |
| `agent:lint` | Validate quality/structure | ❌ Read-only | Delegated via Task tool |

### Responsibility Boundaries

```
create ──────────────────► NEW file
                              │
                              ▼
                           lint (validation)

improve ──► analysis ──► suggestions.md
                              │
                              ▼
update ──────────────────► EDIT existing file
```

## Findings

### ✅ Clear Separation (No Issues)

1. **create vs update**
   - create: writes NEW files only
   - update: edits EXISTING files only
   - No overlap

2. **improve vs update**
   - improve: explicitly FORBIDDEN from using Edit/Write (lines 176-190)
   - improve saves to suggestions.md → update reads and applies
   - Clean handoff pattern

3. **improve vs lint**
   - improve: behavioral analysis (what went wrong in execution)
   - lint: structural validation (file quality, conflicts)
   - Different concerns

### ⚠️ Inconsistency Found

**`update` does not call `lint` after changes**

- `create` calls `lint` for validation (Step 6)
- `update` only does basic syntax check (Step 5) but no quality validation
- This means updates bypass quality checks that new agents go through

## Recommendations

### Option A: Add lint step to update
Add Step 6.5 to `agent:update`:
```markdown
## Step 6.5: Validate Changes (Optional)

For Medium+ changes, run validation:
```
Task(subagent_type="agent-lint", prompt="Validate {path}")
```
```

### Option B: Keep as-is (simpler)
Rationale: update is for small targeted changes where full lint may be overkill. User can manually run `/agent:lint` if needed.

## Files to Modify

- `/Users/dmitry/.claude/commands/agent:update.md` (if Option A chosen)

## Decision

Keep as-is. User can manually run `/agent:lint` if needed.

## Conclusion

**All 4 agents have clear responsibility separation:**
- `create` → new files only
- `update` → edit existing only (reads from improve's suggestions.md)
- `improve` → analysis only (FORBIDDEN from editing)
- `lint` → validation only (read-only)

**No action required.**
