---
description: Run all tests and generate concise failure report (no fixes)
argument-hint: "[--fail-fast]"
allowed-tools: Bash(yarn:*), Bash(npm:*), Read
model: sonnet
---

# Algorithm

MUST follow these steps in exact order:

1. Read `package.json` in current directory
2. Read `package.json` in parent directory (monorepo root)
3. Extract available test commands from both files' "scripts" sections
4. Map commands to test types:
   - E2E: `test:e2e`, `web:test:e2e`
   - Integration: `test:integration`, `server:test:integration`
   - Unit: `test:unit`, `test`, `web:test:unit`, `server:test:unit`
   - Storybook: `test:storybook`
5. Run each detected command with `yarn <command>` sequentially
6. If `$ARGUMENTS` contains `--fail-fast`, stop after first failure
7. Parse output for failures
8. Output colored report showing only failures

# Output Format

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
```

Colors: `\x1b[31m` (red/failures), `\x1b[32m` (green/passes), `\x1b[0m` (reset)

# Rules

DO:
- Read both package.json files before running any tests
- Extract actual script names from "scripts" section
- Run only commands that exist
- Run sequentially: e2e → integration → unit → storybook
- Show only failures (summary count for passes)
- Use colored ANSI output
- Parse test output for file:line and error messages

DON'T:
- Fix tests or suggest code changes
- Run tests in parallel
- Show full stack traces
- Create report files
