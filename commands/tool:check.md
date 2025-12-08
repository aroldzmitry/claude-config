---
description: "Analyze Claude tool quality, compare with alternatives, check documentation compliance"
argument-hint: <file-path>
model: opus
allowed-tools: "Read, Glob, Grep, WebSearch, WebFetch"
---

# Tool Check

Analyze Claude tool (agent/command/skill) for quality, compare with alternatives, verify documentation compliance.

## Process

1. **Read file** — if `$ARGUMENTS` empty, ask for file path. Determine type (agent/command/skill), extract purpose
2. **WebSearch** — find 3+ similar tools/approaches: "[tool purpose] Claude Code 2025", "[tool type] LLM prompt best practices"
3. **Claude docs check** — WebFetch official docs, verify:
   - YAML frontmatter correctness
   - Required fields present
   - Tool list valid
   - Model selection appropriate
4. **Compare** — analyze this tool vs alternatives (features, structure, approach)
5. **Redundancy check** — find duplicate/verbose instructions, non-functional content
6. **Output report**

## Output Format

```
## Summary
[1-2 sentences: what tool does]

## Steps
[Numbered list of tool's workflow]

## Documentation Compliance
- [x] or [ ] YAML frontmatter valid
- [x] or [ ] Required fields present
- [x] or [ ] Tools list correct
- [x] or [ ] Model appropriate
[Issues if any]

## Comparison
| Aspect | This Tool | Alt 1 | Alt 2 | Alt 3 |
|--------|-----------|-------|-------|-------|
| [key aspect] | ... | ... | ... | ... |

## Improvements
- [What to improve] — +[benefit] / -[downside]

## Redundancy
- [Found issues or "None"]
```

## Rules

- Always WebSearch before comparing
- Always check official Claude Code docs
- Report only actionable improvements
- Keep output concise

## Error Handling

- File not found → report error, stop
- WebSearch no results → note in Comparison, continue with docs check
- WebFetch fails → note in Documentation Compliance, continue
