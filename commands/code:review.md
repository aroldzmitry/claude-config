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
7. For EACH file, go through checks 1-14 in order. Record issues found.
8. After all files: run cross-file checks 15-16
9. Aggregate issues, calculate scores, output report

## Categories (Priority Order)

Analyze each category separately with targeted focus:

| Priority | Category | Weight | Focus |
|----------|----------|--------|-------|
| 1 | Readability | 18% | naming clarity, structure, organization, self-documenting code |
| 2 | Patterns | 18% | compliance with proj_index patterns, architecture rules |
| 3 | Modularity | 18% | single abstraction level, extract hooks/helpers, single responsibility |
| 4 | Complexity | 13% | nesting depth (max 3), function length, cyclomatic complexity |
| 5 | Security | 13% | injections, XSS, data leaks, unsanitized input |
| 6 | DRY | 10% | code duplication across files, similar blocks (>80% match) |
| 7 | Performance | 10% | hook deps, memoization, re-renders, expensive operations |

### Modularity Rules

- Component >80 lines before return → extract logic to hooks
- Mixed abstraction levels (low-level DOM + high-level business logic) → extract to separate functions
- Hook/helper with multiple responsibilities → split into focused units
- Inline complex logic in useEffect/useCallback → extract to named functions

## Checklist (MANDATORY)

For EACH changed file, verify ALL items below. Record issues found.

### Per-File Checks

| # | Category | Check | What to verify |
|---|----------|-------|----------------|
| 1 | Readability | Naming | Variables, functions, types are clear and descriptive |
| 2 | Readability | Structure | Logical organization, related code grouped |
| 3 | Patterns | Conventions | Follows proj_index naming and file patterns |
| 4 | Patterns | Reuse | Uses existing utilities, not reinventing |
| 5 | Modularity | SRP | Single responsibility, one reason to change |
| 6 | Modularity | Abstraction | Consistent abstraction level, no mixing |
| 7 | Complexity | Nesting | Max depth ≤3, early returns used |
| 8 | Complexity | Length | Functions <50 lines, components <80 before return |
| 9 | Security | Injection | No SQL/XSS/command injection risks |
| 10 | Security | Validation | Input validated at system boundaries |
| 11 | Performance | Hook Deps | useEffect/useCallback/useMemo have correct dependencies |
| 12 | Performance | Memoization | Expensive calculations wrapped in useMemo, callbacks in useCallback |
| 13 | Performance | Re-renders | No inline objects/functions in JSX causing unnecessary re-renders |
| 14 | Performance | Operations | No expensive operations in render path (filters, sorts, maps without memo) |

### Cross-File Checks (after all files)

| # | Category | Check | What to verify |
|---|----------|-------|----------------|
| 15 | DRY | Duplication | No >80% similar blocks across files |
| 16 | DRY | Patterns | Similar logic extracted to shared utils |

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
  Readability: {X.X}  |  Patterns: {X.X}     |  Modularity: {X.X}
  Complexity: {X.X}   |  Security: {X.X}     |  DRY: {X.X}
  Performance: {X.X}
```

If no issues found: "No issues found. Score: 10.0/10.0"

## Rules

- BLOCKING: Must complete ALL 14 per-file checks for EACH file before moving to next
- Do NOT skip checks even if file seems simple
- Performance checks (11-14) apply to .tsx/.jsx files only
- Report file:line for every issue
- Every issue must have actionable recommendation
- DRY: show both file locations for duplicates
- Skip minified/generated files
- No false positives: only report clear violations
