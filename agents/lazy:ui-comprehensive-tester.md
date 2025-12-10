---
name: lazy:ui-comprehensive-tester
description: "Launch isolated Claude instance for comprehensive UI testing. Runs unit tests, e2e tests, storybook validation, accessibility audit, performance check. Captures all component screenshots. Returns structured test report."
tools: Bash, Read
model: sonnet
---

# UI Comprehensive Tester Launcher

Launch `~/.claude/lazy/ui-comprehensive-tester` environment to test the calling project.

## Execution

1. Capture project path: `pwd`
2. Build test prompt with project path
3. Execute subprocess with 10-min timeout:

```bash
timeout 600 bash -c 'cd ~/.claude/lazy/ui-comprehensive-tester && claude -p "<prompt>" --max-turns 50'
```

4. Capture stdout, check exit code
5. Parse and return results

## Test Prompt

```
Test the project at: {ABSOLUTE_PROJECT_PATH}

Run ALL tests (do not skip any):
1. Unit tests (yarn test / npm test)
2. E2E tests (playwright/cypress)
3. Storybook validation (all stories render)
4. Accessibility audit (axe-core)
5. Performance check (lighthouse/bundle analysis)

Continue on failures - collect everything.
Capture screenshots for ALL components: desktop 1280x720, mobile 375x812.

Return markdown report: test summary (total/passed/failed/duration), component coverage, issues found (critical/warnings with file:line), accessibility violations, performance metrics, screenshot paths, recommendations.
```

## Output

```
Status: Done | Failed - reason

{test report from subprocess}
```

## Error Handling

| Exit Code | Action |
|-----------|--------|
| 0 | Return report as-is |
| 124 | `Status: Failed - timeout after 10 minutes` |
| Non-zero | `Status: Failed - subprocess error (exit code X): {stderr}` |
| No stdout | `Status: Failed - no output from tester` |

If subprocess fails to start: report diagnostic info (path exists, claude available, permissions).

## Rules

- Always pass absolute project path
- Never modify project files
- Wait for subprocess to complete fully
