---
description: "Optimize Claude tools by removing redundancy while preserving all functionality"
argument-hint: "[tool-path-or-name]: path to tool or tool name to optimize"
model: sonnet
allowed-tools: "Read, Glob, Grep, Write, AskUserQuestion, WebSearch, Bash"
---

# Tool Optimizer

Analyzes and optimizes existing Claude tools (commands, agents, skills). Removes verbosity, redundancy, and unnecessary examples while ensuring 100% functionality preservation.

## Input

`$ARGUMENTS` contains tool path or name. If empty → ask user once.

## Process

1. **Load tool** — Read target tool file
2. **Extract functions** — List all functional components and critical rules
3. **Pre-optimization analysis** — Identify and tag protected specificity elements
4. **Check official docs** — WebSearch for official Claude Code documentation for this tool type
5. **Analyze redundancy** — Identify verbose sections, duplicate patterns, unnecessary examples
6. **Optimize** — Remove non-critical verbosity, condense examples, deduplicate sections (respecting protected elements)
7. **Validate** — Check all functional components preserved
8. **Restore if needed** — If any functionality lost, restore it and re-validate (iterate until 100% preserved)
9. **Commit and push** — Stage changes with git add, commit with optimization summary, push to remote
10. **Report** — Output optimization report

## Functionality Extraction

Extract all functional components:
- Core concepts/purposes
- Process steps and algorithms
- Decision trees and conditional logic
- Rules and constraints (MUST/MUST NOT/SHOULD)
- Examples that illustrate critical behavior
- Dialog flows and interactions
- Output formats that tools depend on
- Integration points with other tools

## Pre-Optimization Analysis (Step 3)

Before optimizing, identify and tag PROTECTED specificity elements:

1. **Behavioral directives** — Scan for action verbs: "ask if", "understand before", "recurse", "iterate", "check", "verify"
2. **Formatting constraints** — Scan for prohibitions: "never tables", "never skip", "always", "only", "must not"
3. **Detailed breakdowns** — Identify multi-item lists where each item has explanatory text (e.g., "Purpose: what problem...", "Input: what triggers...")
4. **Specificity modifiers** — Words that add precision: "context", "file", "full", "complete", "all", "entire"

Tag these as **PROTECTED** — they can be reformatted for brevity but NEVER removed or collapsed into single phrases.

## Output Format

```markdown
## Optimization Report

**File**: {path}
**Original**: {lines} lines
**Optimized**: {lines} lines
**Reduction**: {percent}%

### Optimizations Applied
- {optimization 1}
- {optimization 2}
- ...

### Functionality Check
✅ All {count} functional components preserved

### Restored Items (if any)
- {item 1}
- {item 2}

### Git Operations
✅ Changes staged and committed
✅ Pushed to remote

**Commit message**: "Optimize {tool-name}: reduce by {percent}% while preserving all functionality"

**Status**: ✅ Optimization complete | ⚠️ No optimizations found
```

## Dialog (Optional)

If tool path not provided, ask once:
- **Type**: text input
- **Question**: "Enter path or name of tool to optimize (e.g., `/docs:user-flow` or `~/.claude/commands/docs:user-flow.md`)"
- **Exit if empty**: No further dialog, exit gracefully

## Optimization Rules

**DO**:
- Remove duplicate sections with identical content
- Condense verbose explanations (multi-paragraph → 1-2 sentences)
- Replace full code block examples with structural descriptions
- Combine similar rules into single statements
- Remove unnecessary parenthetical explanations
- Extract common patterns to reusable templates
- Minimize example listings (keep only critical ones)

**DON'T**:
- Remove rules or constraints (MUST/MUST NOT/SHOULD statements)
- Remove core process steps or algorithms
- Remove critical examples that illustrate unique behavior
- Remove integration points or dependencies
- Remove output specifications that other tools depend on
- Remove dialog definitions or interaction patterns
- Remove specificity modifiers (like "context" in "conversation context", "file" in "tool file")
- Remove behavioral action directives (like "ask if unclear", "understand before changing")
- Collapse detailed breakdowns into single lines when each item has explanatory text
- Remove formatting constraints (like "never tables", "compact lists")
- Simplify beyond clarity (if it becomes unclear, restore)

## Validation Checklist

After optimization, verify:
1. All original process steps intact?
2. All rules and constraints preserved?
3. All critical examples present?
4. Output format specifications unchanged?
5. Dialog flows unchanged?
6. Tool still independently executable?
7. No contradictions or circular dependencies?

If ANY check fails → restore that section immediately → re-validate → iterate until all pass.

## Documentation Check

Before optimization, WebSearch for official documentation:
- For commands: "Claude Code slash commands official docs"
- For agents: "Claude Code agents official documentation"
- For skills: "Claude Code skills official documentation"

Compare against official patterns. If tool violates official docs → note as issue but optimize anyway.

## Git Operations

After successful optimization:

1. **Stage changes**: `git add {tool-path}`
2. **Commit**: Use commit message: "Optimize {tool-name}: reduce by {percent}% while preserving all functionality"
3. **Push**: `git push origin {current-branch}`

If git operations fail:
- Report error in Optimization Report
- Do NOT continue if push fails
- Suggest user manually push changes

## Rules

- If tool path not provided, ask once (text input only)
- Always extract functionality before optimizing
- Validation is mandatory, not optional
- Iterate restoration until 100% functionality confirmed
- If nothing to optimize → output "⚠️ No optimizations found" only, skip git operations
- Preserve all rule priority and ordering
- Keep output report concise but complete
- Git operations are mandatory after successful optimization
- Never skip git validation (check branch, remote status)
