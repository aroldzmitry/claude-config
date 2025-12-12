---
description: Run automated visual testing using Playwright screenshots and 6 specialized reviewer skills
argument-hint: "[optional: page/component filter]"
model: sonnet
allowed-tools: "Read, Bash, Glob, Skill"
---

# Visual Test Runner

Automated visual testing workflow: capture Playwright screenshots, analyze with 6 reviewer skills, aggregate findings.

## Phase 1: Capture Screenshots

Run Playwright visual tests to generate screenshots.

```bash
yarn test:e2e tests/visual-tests.spec.ts
```

If screenshots already exist and user wants to use them, skip to Phase 2.

## Phase 2: Locate Screenshots

Find all screenshots in `tests/screenshots/` directory.

```bash
find tests/screenshots -name "*.png" -type f
```

If filter argument provided, filter screenshots matching pattern.

## Phase 3: Analyze Each Screenshot

For each screenshot file:

1. Read screenshot using Read tool
2. Invoke all 6 reviewer skills using Skill tool:
   - `visual-spacing-reviewer`
   - `visual-alignment-reviewer`
   - `visual-consistency-reviewer`
   - `visual-typography-reviewer`
   - `visual-color-reviewer`
   - `visual-responsive-reviewer`
3. Collect findings from each skill's output
4. Parse findings by severity (Critical/Warning/Info)

## Phase 4: Aggregate Findings

Group all findings:
- By severity (Critical, Warning, Info)
- By screenshot
- By reviewer type

Count totals:
- Total screenshots analyzed
- Critical issues count
- Warnings count
- Info count

## Phase 5: Output Report

Present consolidated inline report:

```
═══════════════════════════════════════════════════
📊 VISUAL TEST REPORT
═══════════════════════════════════════════════════

## Summary
- Screenshots analyzed: X
- Critical issues: X
- Warnings: X
- Info: X

## Critical Issues

### screenshot-name.png
**Spacing:** [issue] → [suggestion]
**Alignment:** [issue] → [suggestion]
**Color:** [issue] → [suggestion]

## Warnings

### screenshot-name.png
**Typography:** [issue] → [suggestion]
**Consistency:** [issue] → [suggestion]

## Info

### screenshot-name.png
**Responsive:** [observation] → [improvement]

═══════════════════════════════════════════════════
```

## Rules

- Run all 6 reviewers on every screenshot (comprehensive analysis)
- Parse each skill's output to extract findings
- Group findings by severity first, then by screenshot
- Include reviewer name (Spacing, Alignment, etc.) with each finding
- If no issues found in a severity level, note "None"
- Do not save report to file (inline output only)
- Report exact screenshot count and issue totals
