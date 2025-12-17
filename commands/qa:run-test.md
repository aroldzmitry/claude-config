---
description: Run all tests and generate concise failure report (no fixes)
argument-hint: "[--fail-fast]"
allowed-tools: Bash(yarn:*), Bash(npm:*), Read, Task(subagent_type=Explore)
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
8. If failures detected, launch Explore agent to analyze root cause
9. Parse agent findings and extract concise summary
10. Output plain text report with analysis section

# Output Format

Plain text only, no colors or formatting codes:

```
Test Results
============

E2E: 28/28 passed
Integration: 12/12 passed
Unit: 170/170 passed
Storybook: 66/66 passed

Total: 276/276 passed
```

If failures exist:

```
Test Results
============

E2E: 15/15 passed
Integration: 8/10 passed (2 FAILED)
Unit: 42/42 passed
Storybook: 5/6 passed (1 FAILED)

Total: 70/73 passed (3 FAILED)

FAILURES:

Integration:
- tests/integration/pages/registration/tc-reg-008.spec.ts:23
  RegistrationForm - Network Error: Expected element to be visible, but it was not

- tests/integration/pages/registration/tc-reg-009.spec.ts:23
  RegistrationForm - Server Error: Timeout waiting for element

Storybook:
- tests/storybook/Button.spec.ts:15
  Button - Click Handler: Click event not fired

FAILURE ANALYSIS:
=================

Root Cause: Email parameter URL encoding issue in AuthPage validation
Affected Files: src/pages/auth/AuthPage.tsx (validation at line 35)
Recent Changes: Commit 4e7888e added strict email validation that rejects URL-encoded emails
Pattern: Desktop tests fail, mobile pass (different URL encoding behavior)
```

# Failure Analysis

When failures detected (step 8):

1. Launch Explore agent with prompt:
   ```
   Investigate test failures. Analyze:
   - Failing test files: [list]
   - Error messages: [errors]
   - Find: recent commits affecting these files, common patterns, root cause
   - Output: 2-4 line summary with root cause, affected files, recent changes
   ```

2. Extract from agent response:
   - Root cause (1 line)
   - Affected files (comma-separated with line numbers)
   - Recent changes (commit hash if relevant)
   - Pattern (common issue across failures)

3. Format as plain text block (no markdown, no formatting codes)

# Rules

DO:
- Read both package.json files before running any tests
- Extract actual script names from "scripts" section
- Run only commands that exist
- Run sequentially: e2e → integration → unit → storybook
- Output plain text only (no ANSI codes, no formatting)
- Show test counts and failures only
- Parse test output for file:line and error messages
- Launch Explore agent only if failures exist
- Keep analysis summary to 2-5 lines max
- Include analysis as separate section after FAILURES

DON'T:
- Fix tests or suggest code changes
- Run tests in parallel
- Show full stack traces
- Create report files
- Launch agent if all tests pass
