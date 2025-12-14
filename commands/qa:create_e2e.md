---
description: Convert checklist and test cases into E2E Playwright tests with full traceability
argument-hint: "<checklist-path> <test-cases-path>"
allowed-tools: Write, Edit, Read, Glob, Grep, Bash(yarn:*)
---

# qa:create_e2e — Generate E2E Tests from Test Cases

Generate Playwright E2E and checklist tests from documentation with:
- Full test-to-requirement traceability (TC-ID/CL-ID via Playwright annotations and tags)
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

## Console Output Format

After completion, output to console (do NOT create REPORT.md file):

**Summary:**
- Status: success/partial/failed
- Test files generated: [count]
- Test cases covered: [TC-IDs]
- Checklist items tested: [CL-IDs]

**Generated Files:**
- List each .spec.ts file with line count

**Coverage:**
- TC-ID → CL-IDs mapping
- CL-ID → test file mapping

**Gaps:**
- CRITICAL checklist items without coverage

**Validation:**
- Linting status
- TypeScript errors (if any)

## Test Generation Rules

**Test Traceability:**
- Each test uses Playwright tags (e.g., `@TC-001`) and annotations for metadata
- TC-ID in test.describe tag enables `--grep @TC-001` filtering
- CL-ID coverage tracked via annotations (type: 'coverage')
- Document paths stored in annotations (type: 'testCase')
- No traceability comments in generated code

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

## Test Validation

After generating tests, run validation:
1. `yarn lint:fix` on generated test files (auto-fix eslint issues)
2. `npx tsc --noEmit` on generated files (type-check without emitting)
3. Report unfixable errors in `validationErrors` output data

## Stage for Git

After validation, stage generated test files:
```bash
git add tests/e2e/<area>/*.spec.ts
```

## Test Execution

Run generated tests:
```bash
yarn test:e2e             # All E2E tests
yarn test:e2e --grep "TC-001"  # Specific test case
```

## Final Output

Output to console only (do NOT save as file). Include:
- Status (success/partial/failed)
- Generated test files list with line counts
- Coverage mapping (TC-ID → CL-IDs, CL-ID → test files)
- CRITICAL gaps (items without coverage)
- Validation results (linting, TypeScript errors)

## Example Generated Test

```typescript
import { test, expect } from '@playwright/test';
import testIds from '@test/testIds';

const TEST_DATA = { email: 'test-user@example.com', password: 'SecurePass123!' };

test.describe('User registration with valid data', {
  tag: ['@TC-001', '@auth', '@registration'],
  annotation: [
    { type: 'testCase', description: 'docs/testCases/authentication/01-register.md' },
    { type: 'coverage', description: 'CL-001, CL-003' }
  ]
}, () => {
  test('successful registration redirects to dashboard', async ({ page, request }) => {
    const user = await request.post('/api/users/seed', { data: { email: TEST_DATA.email } });
    const userId = user.json().id;

    await page.goto('/register');
    await page.fill(`[data-testid="${testIds.auth.register.emailInput}"]`, TEST_DATA.email);
    await page.fill(`[data-testid="${testIds.auth.register.passwordInput}"]`, TEST_DATA.password);
    await page.click(`[data-testid="${testIds.auth.register.submitBtn}"]`);

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome, Test User')).toBeVisible();

    await request.delete(`/api/users/${userId}`);
  });

  test('fails with 409 when email exists', async ({ page }) => {
    await page.route('**/api/register', route =>
      route.fulfill({ status: 409, body: JSON.stringify({ error: 'Email already exists' }) })
    );
  });
});
```

## Rules

**DO:**
- Extract data-testid from test case documents (preferred) or component code
- Add missing data-testid attributes using hierarchical naming
- Wrap tests in test.describe() with tag (TC-ID) and annotations (doc path, CL-IDs)
- Generate one test per test case (strict step order)
- Generate short isolated tests for checklist items
- Mock network errors when TC specifies error scenario
- Include setup/teardown (fixtures) for test data
- Run `yarn lint:fix` and `tsc --noEmit` after generation
- Report validation errors that auto-fix couldn't resolve
- Report all CRITICAL gaps

**DON'T:**
- Add traceability comments (use annotations/tags instead)
- Add generic file header comments
- Comment self-explanatory code (project standard)
- Invent new requirements not in checklist/test cases
- Change expected results from documentation
- Mix multiple test cases in single test
- Use CSS selectors or nth-child (always use data-testid)
- Hardcode test data in test steps (extract from "Test Data" section)
- Ignore document formatting errors (report them in gaps)
- Test backend directly unless TC explicitly requires it
