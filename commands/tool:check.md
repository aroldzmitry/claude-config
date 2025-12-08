---
description: "Analyze Claude tool quality, compare with alternatives, check documentation compliance"
argument-hint: <file-path>
model: opus
allowed-tools: "Read, Glob, Grep, WebSearch, WebFetch"
---

# Tool Check

Analyze Claude tool (agent/command/skill) for quality, compare with alternatives, verify documentation compliance.

## Process

1. **Read file** — if `$ARGUMENTS` empty, ask for file path. Determine type (agent/command/skill), extract purpose, identify scope (global/project)
2. **Scope scan** — Glob/Grep same-scope agents/commands for conflict detection
3. **Structural Checks** — run 7 checks (see table below)
4. **Quality Score** — evaluate 4 criteria (1-10 each):
   - Clarity: will another Claude understand exactly what to do?
   - Completeness: all scenarios covered?
   - Consistency: no contradicting instructions?
   - Testability: can verify success objectively?
5. **Anti-patterns scan** — detect bad patterns (see table below)
6. **Conflict detection** — check same-scope tools for:
   - Same trigger context
   - Overlapping responsibility
   - Contradicting instructions
7. **WebSearch** — find 3+ similar tools/approaches: "[tool purpose] Claude Code 2025", "[tool type] LLM prompt best practices"
8. **Claude docs check** — WebFetch official docs, verify:
   - YAML frontmatter correctness
   - Required fields present
   - Tool list valid
   - Model selection appropriate
9. **Compare** — analyze this tool vs local scope tools + external alternatives
10. **Redundancy check** — find duplicate/verbose instructions, non-functional content
11. **Output report**

## Structural Checks

| Check | What to verify |
|-------|----------------|
| Description Clarity | Specific, unambiguous, actionable? |
| Responsibility Scope | One clear purpose, boundaries defined? |
| Conflict Detection | No overlap with other agents? |
| Redundancy | Not duplicating existing functionality? |
| Tool Access | Minimal tools, Write/Edit justified? |
| Output Format | Documented and consistent? |
| Instructions Quality | Not too rigid/vague, has examples? |

## Anti-patterns

| Pattern | Why bad |
|---------|---------|
| "Remember to..." | LLM retains context |
| JSON/Markdown examples | LLM knows formats |
| Multiple same-pattern examples | One enough |
| Restating tool behavior | Tool docs exist |
| "Important:" everywhere | Dilutes importance |

## Output Format

```
## Summary
[1-2 sentences: what tool does]

## Steps
[Numbered list of tool's workflow]

## Structural Checks

| Check | Status | Notes |
|-------|--------|-------|
| Description Clarity | PASS/WARN/FAIL | ... |
| Responsibility Scope | PASS/WARN/FAIL | ... |
| Conflict Detection | PASS/WARN/FAIL | ... |
| Redundancy | PASS/WARN/FAIL | ... |
| Tool Access | PASS/WARN/FAIL | ... |
| Output Format | PASS/WARN/FAIL | ... |
| Instructions Quality | PASS/WARN/FAIL | ... |

## Quality Score: X.X/10

| Criterion | Score | Notes |
|-----------|-------|-------|
| Clarity | X/10 | ... |
| Completeness | X/10 | ... |
| Consistency | X/10 | ... |
| Testability | X/10 | ... |

## Anti-patterns Found
[List detected patterns or "None"]

## Conflicts
[Found conflicts with same-scope tools or "None"]

## Documentation Compliance
- [x] or [ ] YAML frontmatter valid
- [x] or [ ] Required fields present
- [x] or [ ] Tools list correct
- [x] or [ ] Model appropriate
[Issues if any]

## Comparison (Local Scope)
| Tool | Overlap | Differentiation |
|------|---------|-----------------|
| [tool] | ... | ... |

## Comparison (External)
| Aspect | This Tool | Alt 1 | Alt 2 | Alt 3 |
|--------|-----------|-------|-------|-------|
| [key aspect] | ... | ... | ... | ... |

## Improvements
- [What to improve] — +[benefit] / -[downside]

## Redundancy
- [Found issues or "None"]
```

## Scope Hierarchy

| Scope | Location | Compare with |
|-------|----------|--------------|
| Global | `~/.claude/` | global + system agents only |
| Project | `.claude/` | project + global + system |

System agents (built-in): `general-purpose`, `Explore`, `Plan`, `claude-code-guide`, `statusline-setup`

## Rules

- Scan same-scope tools before external comparison
- Always WebSearch before external comparing
- Always check official Claude Code docs
- Report only actionable improvements
- Keep output concise
- Quality Score < 6 = needs revision

## Error Handling

- File not found → report error, stop
- WebSearch no results → note in Comparison, continue with docs check
- WebFetch fails → note in Documentation Compliance, continue
