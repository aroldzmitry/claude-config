# Plan: Apply Optimization Recommendations

## Summary
Apply 3 recommendations from suggestions.md to agent:create.md and agent:update.md.

## Files to Modify
- `~/.claude/commands/agent:create.md`
- `~/.claude/commands/agent:update.md`
- `~/.claude/agents/.improvements/suggestions.md` (clear after apply)
- `~/.claude/agents/.improvements/history.md` (log changes)

## Changes

### 1. agent:create.md

**Add after Step 4 heading (line 44):**
```markdown
### Writing for Claude (not humans)

Claude doesn't need:
- Full JSON examples for built-in tools — just tool name + key params
- Multiple examples of same pattern — one clear example enough
- External links — not accessible at runtime
- Decorative formatting — `---` dividers, excessive whitespace
- "Remember:" summaries — Claude retains context

Claude benefits from:
- Explicit constraints and boundaries
- One good/bad example pair per concept
- Tables for mappings (compact, scannable)
- Bullet points over prose
```

**Add after Step 5 heading (line 123):**
```markdown
### Before Writing

Ask yourself:
1. Would Claude behave differently without this section? If no → remove
2. Is this the same info in different words? → deduplicate
3. Is this obvious to an LLM? (JSON syntax, markdown format) → skip
4. Can this table be 3 rows instead of 10? → condense
```

### 2. agent:update.md

**Add to Step 4 section (after line 89):**
```markdown
### Writing for Claude (not humans)

Claude doesn't need:
- Full JSON examples for built-in tools — just tool name + key params
- Multiple examples of same pattern — one clear example enough
- External links — not accessible at runtime
- Decorative formatting — `---` dividers, excessive whitespace
- "Remember:" summaries — Claude retains context

Claude benefits from:
- Explicit constraints and boundaries
- One good/bad example pair per concept
- Tables for mappings (compact, scannable)
- Bullet points over prose

### Before Writing

Ask yourself:
1. Would Claude behave differently without this section? If no → remove
2. Is this the same info in different words? → deduplicate
3. Is this obvious to an LLM? (JSON syntax, markdown format) → skip
4. Can this table be 3 rows instead of 10? → condense

### Optimization Check

Before proposing additions:
- Can existing instruction be **clarified** instead of adding new one?
- Can this be **merged** into existing section?
- Is Claude already capable of this without explicit instruction?

Prefer: Modify > Add > New Section
```

## Post-Apply Steps
1. Create backups before editing
2. Log to history.md
3. Clear recommendations from suggestions.md (mark as Implemented)
