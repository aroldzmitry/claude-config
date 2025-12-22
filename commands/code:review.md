---
description: "Deep code review of uncommitted changes with quality scoring"
model: opus
allowed-tools: Read, Glob, Grep, Bash(git diff:*), Bash(git status:*)
---

# Code Review

Analyze uncommitted changes for quality issues. Output console report with 0.0-10.0 score.

## Workflow

1. Run `git diff --name-only HEAD` to get changed files
2. If no files: output "No uncommitted changes found." and stop
3. Filter to code/style files: ts, tsx, js, jsx, css, scss, html, json
4. Read `.claude/proj_index/00-INDEX.md`, then PATTERNS.md and ARCHITECTURE.md
5. If proj_index missing: output "Project index not found at .claude/proj_index/" and stop
6. Read each changed file fully
7. Analyze each file per category (see below)
8. Compare files for code duplication (DRY category)
9. Calculate scores and output report

## Categories (Priority Order)

Analyze each category separately with targeted focus:

| Priority | Category | Weight | Focus |
|----------|----------|--------|-------|
| 1 | Readability | 25% | naming clarity, structure, organization, self-documenting code |
| 2 | Patterns | 25% | compliance with proj_index patterns, architecture rules |
| 3 | Complexity | 20% | nesting depth (max 3), function length, cyclomatic complexity |
| 4 | Security | 15% | injections, XSS, data leaks, unsanitized input |
| 5 | DRY | 15% | code duplication across files, similar blocks (>80% match) |

## Scoring

Per-category: 10.0 = perfect, 0.0 = critical issues. Deduct points per issue severity:
- Critical: -2.0
- Major: -1.0
- Minor: -0.5

Overall = weighted sum of category scores.

## Output Format

Plain text, no markdown:

```
Code Review: {N} files analyzed

Score: {X.X}/10.0

Issues ({N}):

[{Category}] {file}:{line}
  {Description}
  → {Recommendation}

Summary:
  Readability: {X.X}  |  Patterns: {X.X}  |  Complexity: {X.X}
  Security: {X.X}     |  DRY: {X.X}
```

If no issues found: "No issues found. Score: 10.0/10.0"

## Rules

- Analyze each category with separate targeted pass
- Report file:line for every issue
- Every issue must have actionable recommendation
- DRY: show both file locations for duplicates
- Skip minified/generated files
- No false positives: only report clear violations
