---
description: "Manual QA check: verifies AC, runs tests, screenshots UI, finds bugs"
argument-hint: <task-description or file-path>
model: opus
allowed-tools: "Read, Glob, Grep, Bash, AskUserQuestion"
---

# QA Check

Manual QA verification: AC compliance, scope check, visual UI review, code consistency, bug detection.

## Input

`$ARGUMENTS` contains: task description OR path to task spec file.

If file path → read AC from file. If no file → ask user for AC.

## Phase 1: Gather Context

1. Read `.claude/docs/` — all files in directory (project documentation)
2. If `$ARGUMENTS` is file path → read AC from file
3. If no file or unclear → AskUserQuestion for AC (what should work?)
4. If anything unclear → ask follow-up questions (unlimited iterations)

## Phase 2: Run Tests

```bash
yarn test
```

Record: pass/fail count, failed test names.

## Phase 3: Determine Pages to Screenshot

1. Run `git diff --name-only HEAD~1` to get changed files
2. Filter UI files: `*.tsx` in `src/components/`, `src/pages/`, `src/features/`
3. Map files to routes (check file for route path or infer from filename)
4. If no UI files changed → skip screenshots

## Phase 4: Take Screenshots

For each identified page:
1. Start app if not running
2. Navigate to route
3. Screenshot at desktop (1280x720) and mobile (375x812)
4. Save to temp folder

Use Playwright. If fails → output error, ask user to configure Playwright environment, continue without screenshots.

## Phase 5: Visual Analysis

Analyze each screenshot for:
- Layout issues (overlapping, cut off, misaligned)
- Spacing inconsistencies
- Text readability
- Mobile responsiveness
- Empty/error/loading states visible correctly

## Phase 6: Code Consistency Check

Review changed files against `.claude/docs/` (all project documentation):

### Patterns & Standards
- [ ] Follows documented conventions
- [ ] Uses existing components correctly
- [ ] Services match documented structure
- [ ] Business logic follows documented rules

### Duplicates & Consistency
- [ ] No duplicate code created (check similar files)
- [ ] No duplicate components (check existing before creating)
- [ ] Naming consistent with existing codebase
- [ ] No conflicting implementations

### Code Quality
- [ ] No `any` types
- [ ] No console.log
- [ ] No commented code
- [ ] Error handling present

## Phase 7: AC & Scope Checklist

### AC Verification
- [ ] Each AC from spec is implemented
- [ ] No AC missing

### Scope Check
- [ ] Only requested features implemented
- [ ] No unrelated changes
- [ ] No over-engineering

### UI Quality
- [ ] Layout correct on desktop
- [ ] Layout correct on mobile
- [ ] No visual bugs
- [ ] States (loading/error/empty) handled

## Phase 8: Report

Output brief summary:

```
QA Check: [PASS/FAIL]

Tests: X/Y passed
AC: X/Y verified
UI: [OK/Issues found/Skipped]
Consistency: [OK/Issues found]

Issues:
- [issue description] (severity)
```

If no issues: just status line.

## Phase 9: Save Dialog

If issues found, ask user:
1. **Save to file** → `.claude/tasks/{date}-qa-report.md`
2. **Show in console** → output full report inline, done

If no issues: output "QA Check: PASS" and done.

## Error Handling

- Playwright fails → "Screenshot failed. Configure Playwright environment: `yarn playwright install`". Continue without screenshots.
- `.claude/docs/` missing → note in report, continue with code review only
- Tests fail to run → report error, continue with other checks

## Rules

- Read docs first — verify against project standards
- Check for duplicates before reporting "new code OK"
- Ask questions if anything unclear
- Don't fix bugs — report only
- Be specific: file:line for code issues
- Be brief in output unless user asks for details
