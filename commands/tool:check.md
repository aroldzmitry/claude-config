---
description: "Analyze Claude tool quality, compare with alternatives, check documentation compliance"
argument-hint: <file-path>
model: sonnet
allowed-tools: "Read, Glob, Grep, WebSearch, WebFetch"
---

# Tool Check

Analyze Claude tool (agent/command/skill) for quality, compare with alternatives, verify documentation compliance.

## Process

1. **Read file** — if `$ARGUMENTS` empty, ask for file path. Determine type (agent/command/skill), extract purpose, identify scope (global/project)
2. **Scope scan** — Glob/Grep same-scope agents/commands for conflict detection
3. **Structural Checks** — run 7 checks (see table below)
4. **Objective validation** — verify YAML syntax correct, tool names valid, required fields present
5. **Quality Score** — evaluate 4 criteria (1-10 each):
   - Clarity: will another Claude understand exactly what to do?
   - Completeness: all scenarios covered?
   - Consistency: no contradicting instructions?
   - Testability: can verify success objectively?
6. **Anti-patterns & redundancy scan** — detect bad patterns, duplicate instructions, verbose/non-functional content (see table below)
7. **Conflict detection** — check same-scope tools for:
   - Same trigger context
   - Overlapping responsibility
   - Contradicting instructions
8. **WebSearch** — find 3+ similar tools/approaches: "[tool purpose] Claude Code 2025", "[tool type] LLM prompt best practices"
9. **Claude docs check** — WebFetch official docs, verify:
   - YAML frontmatter correctness
   - Required fields present
   - Tool list valid
   - Model selection appropriate
10. **Compare** — analyze this tool vs local scope tools + external alternatives
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

Report sections: Summary (1-2 sentences), Steps (numbered workflow list), Structural Checks (table with Status/Notes columns: Description Clarity, Responsibility Scope, Conflict Detection, Redundancy, Tool Access, Output Format, Instructions Quality), Quality Score (X.X/10 table with Criterion/Score/Notes columns for: Clarity, Completeness, Consistency, Testability), Anti-patterns & Redundancy (combined list or "None"), Conflicts (list same-scope tool conflicts or "None"), Documentation Compliance (checklist: YAML valid, fields present, tools correct, model appropriate + issues), Comparison Local Scope (table: Tool, Overlap, Differentiation), Comparison External (table with Aspect rows comparing This Tool vs 3+ alternatives + Sources list with markdown links), Improvements (prioritized list with format: "item — +benefit / -downside")

## Scope Hierarchy

Global tools (`~/.claude/`) compare against global+system scope only; project tools (`.claude/`) compare against project+global+system. System agents: `general-purpose`, `Explore`, `Plan`, `claude-code-guide`, `statusline-setup`

## Rules

- Scan same-scope tools before external comparison
- Always WebSearch before external comparing
- Always check official Claude Code docs
- Report only actionable improvements
- Keep output concise
- Quality Score < 6 = needs revision
