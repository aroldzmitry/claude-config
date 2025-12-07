# Fix Critical Issues in Agent Ecosystem

## Scope: Only Critical (user choice)

---

## Fix 1: Add Frontmatter to `agent:improve.md`

**File:** `~/.claude/commands/agent:improve.md`

**Change:** Add at the beginning of file:
```yaml
---
description: "Analyze what went wrong and generate improvement recommendations. Does not apply changes."
argument-hint: [issue-context]
---
```

---

## Fix 2: Unify Suggestion Format in `agent-lint.md`

**File:** `~/.claude/agents/agent-lint.md`

**Current format (lines 114-122):**
```markdown
## [date] - [file-name]

### Suggestion: {title}
**Severity:** Low | Medium | High
**Description:** {what to improve}
**Status:** Pending | Implemented | Rejected
```

**Change to match agent:improve format:**
```markdown
## [date] - Recommendations for [file-name]

**Issue:** [what to improve]
**Severity:** [level]
**Selected:** Pending

[recommendations]
```

**Also update reference at lines 99-100** to match new format.

---

## Files to Modify

1. `~/.claude/commands/agent:improve.md` — add frontmatter
2. `~/.claude/agents/agent-lint.md` — update suggestion format (lines 114-122)
