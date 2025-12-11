---
name: lazy:ui-comprehensive-tester
description: "Launch isolated Claude instance for comprehensive UI testing. Runs unit tests, e2e tests, storybook validation, accessibility audit, performance check. Captures all component screenshots. Returns structured test report."
tools: Bash, Read
model: sonnet
---

# UI Comprehensive Tester Launcher

Launch `~/.claude/lazy/ui-comprehensive-tester` environment to test the calling project.

## Execution

1. Determine project path (priority order):
   - If argument provided: use it (resolve relative to pwd)
   - Else parse prompt for paths: extract directory paths mentioned in agent invocation prompt
   - Fallback: `pwd`
2. Validate path exists and is readable
3. Build test prompt with resolved absolute project path
4. Execute subprocess with 10-min timeout:

```bash
timeout 600 bash -c 'cd ~/.claude/lazy/ui-comprehensive-tester && claude -p "<prompt>" --max-turns 50'
```

5. Capture stdout, check exit code
6. Parse and return results

## Path Resolution Logic

**Argument parsing:**
- Check if first word/phrase is path-like (contains `/` or is known dir like `client`, `server`)
- Resolve relative paths against current `pwd`
- Convert to absolute path

**Prompt parsing (if no arg):**
- Scan invocation prompt for directory references
- Look for patterns: `client/`, `server/`, `/abs/path/`, package names
- Prefer paths closer to pwd root (monorepo packages)
- If multiple found, choose most specific (longest path)

**Validation:**
- Test if path exists: `[ -d "$path" ]`
- Test if readable: `[ -r "$path/package.json" ]` or similar marker
- If invalid, report error with path attempted

## Test Prompt

```
Test the project at: {ABSOLUTE_PROJECT_PATH}

Run ALL tests (do not skip any):
1. Unit tests (yarn test / npm test)
2. E2E tests (playwright/cypress)
3. Storybook validation (all stories render)
4. Accessibility audit (axe-core)
5. Performance check (lighthouse/bundle analysis)

IMPORTANT:
- You have 10 minutes maximum - prioritize critical tests first
- Continue on failures - collect everything
- If running out of time, return partial results immediately
- Capture screenshots for ALL components: desktop 1280x720, mobile 375x812

Return markdown report with:
- Test summary (total/passed/failed/duration)
- Component coverage
- Issues found (critical/warnings with file:line)
- Accessibility violations
- Performance metrics
- Screenshot paths
- Recommendations
- **Token usage statistics** (input tokens, output tokens, total)

At the end of report, ALWAYS include:
---
Tokens used: {input_tokens} input + {output_tokens} output = {total_tokens} total
```

## Output

```
Status: Done | Timeout | Failed - reason

{test report from subprocess}

---
Tokens used: {parsed from report or "N/A if not found"}
Execution time: {calculated from start to finish}
```

**Token extraction:**
- Parse "Tokens used: X input + Y output = Z total" from test report
- If not found in report, return "Token usage: Not reported"
- Display prominently at end of output

## Error Handling

| Exit Code | Action |
|-----------|--------|
| 0 | Return report as-is |
| 124 | Return partial results with `Status: Timeout - 10 min limit reached, partial results below` |
| Non-zero | `Status: Failed - subprocess error (exit code X)` + any partial output from stderr |
| No stdout | `Status: Failed - no output from tester` |

**Timeout handling:**
- Exit code 124 means test runner hit 10-minute limit
- Return whatever output was captured before timeout
- Parse partial results and token usage from available output
- Mark status as "Timeout" but still show all completed test results

If subprocess fails to start: report diagnostic info (path exists, claude available, permissions).

## Output Format

When reporting which project was tested, include:
```
Testing project: {RESOLVED_ABSOLUTE_PATH}
Source: {argument|prompt|pwd}
```

## Rules

- Always pass absolute project path to subprocess
- Never modify project files
- Wait for subprocess to complete fully
- Report path resolution clearly in output
