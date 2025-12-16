---
description: Run all tests and generate concise failure report (no fixes)
argument-hint: "[--fail-fast]"
allowed-tools: Bash(yarn:*), Bash(npm:*), Read
model: claude-3-5-haiku-20241022
---

# qa:run-test — Run All Tests with Failure Report

Execute all test types sequentially and output concise failure report to console.

## Arguments

- `--fail-fast` (optional) — Stop execution on first test suite failure

## Execution Flow

1. Detect available test commands from package.json in current directory and parent (monorepo root)
2. Determine which test commands to run based on what exists:
   - E2E: `test:e2e` or `web:test:e2e`
   - Integration: `test:integration` or `server:test:integration`
   - Unit: `test:unit`, `test`, `web:test:unit`, `server:test:unit`
   - Storybook: `test:storybook`
3. Run detected commands sequentially with JSON reporters where supported
4. Parse results from all test runners
5. Extract failure details (test name, file path, line number, error message)
6. Output colored console report

**Detection:** Read package.json scripts, check both current dir and parent (monorepo). Use commands that exist.
**Fail-fast:** If `--fail-fast` provided, stop after first suite with failures

## Output Format

Console output with colored text (red for failures, green for passes):

```
Test Results
============

Summary
-------
✓ E2E: 15/15 passed
✗ Integration: 8/10 passed (2 failed)
✓ Unit: 42/42 passed
✗ Storybook: 5/6 passed (1 failed)

Total: 70/73 passed (3 failed)

Failures
--------

Integration Tests (2 failures):
  ✗ RegistrationForm - Network Error
    File: tests/integration/pages/registration/tc-reg-008.spec.ts:23
    Error: Expected element to be visible, but it was not

  ✗ RegistrationForm - Server Error
    File: tests/integration/pages/registration/tc-reg-009.spec.ts:23
    Error: Timeout waiting for element

Storybook Tests (1 failure):
  ✗ Auth/RegistrationForm: SubmitButtonDisabled
    File: src/components/auth/RegistrationForm.stories.tsx:351
    Error: Expected button to be disabled
```

## Parsing Strategy

1. Check if test runner outputs JSON (Playwright `--reporter=json`, Vitest `--reporter=json`)
2. If JSON available: parse structured output
3. If JSON unavailable: parse text output with regex patterns
4. Extract for each failure:
   - Test name/description
   - File path with line number
   - Error message (first line only)
   - Test type (e2e/integration/unit/storybook)

## Color Codes

Use ANSI escape codes for terminal colors:
- Red: `\x1b[31m` (failures, error counts)
- Green: `\x1b[32m` (passes, success counts)
- Reset: `\x1b[0m`

## Rules

**DO:**
- Read package.json first (current dir + parent) to detect available test commands
- Use detected commands instead of hardcoded ones
- Run tests sequentially (e2e → integration → unit → storybook)
- Parse JSON output when available
- Show only failures in detail section
- Keep error messages to one line
- Use colored output for readability
- Include file path and line number for each failure
- Stop on first failure if `--fail-fast` provided
- Show summary statistics for all test types
- Skip test types with no matching commands

**DON'T:**
- Assume specific commands exist without checking
- Attempt to fix failing tests or code
- Suggest code changes or solutions
- Run tests in parallel (mixing output)
- Include passing test details (only summary count)
- Show full stack traces (only first error line)
- Modify any test files
- Create report files (console output only)
