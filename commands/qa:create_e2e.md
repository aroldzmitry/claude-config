---
description: Convert checklist and test cases into E2E Playwright tests with full traceability
argument-hint: "<checklist-path> <test-cases-path>"
allowed-tools: Write, Edit, Read, Glob, Grep, Bash(yarn:*)
---

# qa:create_e2e — Generate E2E Tests from Test Cases

Generate Playwright E2E and checklist tests from documentation with:
- Full test-to-requirement traceability (TC-ID/CL-ID mapping in comments)
- Hierarchical data-testid naming (domain.component.element format)
- Network mocking for error scenarios (500, 409, timeouts)
- Test data fixtures with setup/teardown
- Structured document parsing

## Input Requirements

**Required Arguments:**
- `<checklist-path>` — Path to checklist.md (contains CL-ID, severity, expected result)
- `<test-cases-path>` — Path to test-cases.md (contains TC-ID, steps, test data, cleanup)

**Document Format:**

Checklist expects:
```markdown
## CL-001 | CRITICAL
Element: Login form submit button
Expected Result: Button is enabled only when email and password are filled
```

Test Cases expects:
```markdown
## TC-001: User registration with valid data
**Preconditions:** User not logged in
**Test Data:**
- Email: test-user@example.com
**Steps:**
1. Navigate to /register
2. Fill email input (data-testid: auth.register.email-input)
**Expected Result:** Redirect to /dashboard
**Cleanup:** DELETE /api/users/{userId}
```

## Output Files

- `tests/e2e/<area>/<testcase-id>.spec.ts` — E2E test files (one per test case)
- `tests/e2e/<area>/<checklist-id>.spec.ts` — Checklist test files (short isolated tests)
- Updated component files with added `data-testid` attributes

## Test Generation Rules

**Test Traceability:**
- Each test includes TC-ID or CL-ID in file name and comment header
- Comment format: `// TC-001: User registration | Maps to: docs/testCases/authentication/01-register.md`
- Enables Jira/TestRail integration for requirement tracking

**data-testid Naming:**
- Hierarchical format: `domain.component.element` (e.g., `auth.login-form.submit-btn`)
- Extracted from test case documents
- Added to components if missing
- Centralized in testIds.ts for reuse

**Network Mocking:**
- Detects error scenarios in TC (e.g., "Mock API to return 409")
- Generates `page.route()` interception code
- Covers: 500 errors, 409 conflicts, timeouts, network failures
- Routes cleared after each test

**Test Data Fixtures:**
- Extracts test data from "Test Data" section in TC
- Generates fixtures with setup (create) / teardown (delete via cleanup API)
- Uses deterministic data, not random
- Fixtures scoped per-test for isolation

**Document Parsing:**
- Expects: Preconditions, Test Data, Steps, Expected Result, [Cleanup], [Error Scenario]
- Validates document structure before generation
- Reports missing sections or malformed data as BLOCKER in gaps

## Test Execution

Run generated tests:
```bash
yarn test:e2e             # All E2E tests
yarn test:e2e --grep "TC-001"  # Specific test case
```

## Output: Status & Data

**Status:** `success` | `partial` (gaps found) | `failed` (blocker)

**Data:**
- `testFiles` — List of generated .spec.ts files with line counts
- `dataTestIdChanges` — List of components updated with new data-testid
- `coverage` — Table: TC-ID → test file, CL-ID → test file
- `gaps` — CRITICAL items without coverage + reasons
- `assumptions` — List of assumptions made during generation

## Example Generated Test

```typescript
// TC-001: User registration with valid data
// Maps to: docs/testCases/authentication/01-register.md
// Covers: CL-001 (Form submit enabled), CL-003 (Success message)

import { test, expect } from '@playwright/test';
import testIds from '@test/testIds';

const TEST_DATA = { email: 'test-user@example.com', password: 'SecurePass123!' };

test('TC-001: User registration', async ({ page, request }) => {
  // Setup: Create fixture
  const user = await request.post('/api/users/seed', { data: { email: TEST_DATA.email } });
  const userId = user.json().id;

  // Act: Navigate and fill form
  await page.goto('/register');
  await page.fill(`[data-testid="${testIds.auth.register.emailInput}"]`, TEST_DATA.email);
  await page.fill(`[data-testid="${testIds.auth.register.passwordInput}"]`, TEST_DATA.password);
  await page.click(`[data-testid="${testIds.auth.register.submitBtn}"]`);

  // Assert
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=Welcome, Test User')).toBeVisible();

  // Cleanup
  await request.delete(`/api/users/${userId}`);
});

test('TC-001-error: Registration fails with 409', async ({ page }) => {
  await page.route('**/api/register', route =>
    route.fulfill({ status: 409, body: JSON.stringify({ error: 'Email already exists' }) })
  );
  // ... test steps follow TC document
});
```

## Rules

**DO:**
- Extract data-testid from test case documents (preferred) or component code
- Add missing data-testid attributes using hierarchical naming
- Generate one test per test case (strict step order)
- Generate short isolated tests for checklist items
- Mock network errors when TC specifies error scenario
- Include setup/teardown (fixtures) for test data
- Document TC-ID/CL-ID mapping in test comments
- Report all CRITICAL gaps

**DON'T:**
- Invent new requirements not in checklist/test cases
- Change expected results from documentation
- Mix multiple test cases in single test
- Use CSS selectors or nth-child (always use data-testid)
- Hardcode test data in test steps (extract from "Test Data" section)
- Skip traceability comments
- Ignore document formatting errors (report them in gaps)
- Test backend directly unless TC explicitly requires it
