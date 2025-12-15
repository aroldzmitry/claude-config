---
description: Convert checklist and test cases into typed tests (e2e/integration/unit) with full traceability
argument-hint: "<checklist-path> <test-cases-path>"
allowed-tools: Write, Edit, Read, Glob, Grep, Bash(yarn:*)
---

# qa:create_test — Generate Typed Tests from Test Cases

Generate Playwright/Vitest tests from documentation with automatic type classification:
- Full test-to-requirement traceability (TC-ID/CL-ID via annotations and tags)
- Automatic test type detection (e2e/integration/unit)
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

## Test Type Classification

Tests are automatically classified by analyzing test case characteristics:

### E2E Tests
**Location:** `tests/e2e/<area>/<testcase-id>.spec.ts`

**Criteria (ALL must match):**
- Contains real API calls (no mocking)
- Tests full user flow across multiple pages
- Includes navigation/redirects (`toHaveURL`, `page.goto`)
- Verifies end-to-end business scenarios

**Examples:**
- Happy path registration with redirect to login
- Complete checkout flow from cart to confirmation
- User login → dashboard → logout flow

### Integration Tests
**Location:** `tests/integration/<mirrored-source-path>/<ComponentName>.spec.ts`

**Criteria (ANY matches):**
- Uses network mocking (`page.route()`, MSW)
- Tests component with user interactions (click, fill, blur)
- Tests form validation (field states, error messages)
- Tests loading/error states with mocked responses
- Tests component behavior across multiple events

**Path Mirroring:**
- Component: `src/components/auth/RegistrationForm.tsx` → `tests/integration/components/auth/RegistrationForm.spec.ts`
- Page: `src/pages/registration/Registration.tsx` → `tests/integration/pages/registration/Registration.spec.ts`

**Examples:**
- Button disabled until fields filled (TC-REG-002)
- Empty field validation on blur (TC-REG-006, TC-REG-007)
- Network error handling with mock (TC-REG-008)
- Server error display with mock (TC-REG-009)

### Unit Tests
**Location:** `tests/unit/<mirrored-source-path>/<functionName>.spec.ts`

**Criteria:**
- Tests pure functions or utilities
- No UI rendering
- No API calls (real or mocked)
- Tests validation logic, formatters, calculators

**Path Mirroring:**
- Utility: `src/shared/validation/emailValidator.ts` → `tests/unit/shared/validation/emailValidator.spec.ts`
- Service: `src/services/auth/passwordStrength.ts` → `tests/unit/services/auth/passwordStrength.spec.ts`

**Examples:**
- Email format validation function
- Password strength calculator
- Date formatting utilities
- Business logic calculations

## Output Files

**E2E Tests:**
- `tests/e2e/<area>/<testcase-id>.spec.ts` — Full flow tests (Playwright)
- `tests/e2e/<area>/<checklist-id>.spec.ts` — Critical checklist items (Playwright)

**Integration Tests:**
- `tests/integration/<mirrored-path>/<ComponentName>.spec.ts` — Component interaction tests (Playwright or Vitest + Testing Library)

**Unit Tests:**
- `tests/unit/<mirrored-path>/<functionName>.spec.ts` — Pure function tests (Vitest)

**Modified Components:**
- Updated component files with added `data-testid` attributes

## Console Output Format

After completion, output to console (do NOT create REPORT.md file):

**Summary:**
- Status: success/partial/failed
- Test files generated: [count] (e2e: X, integration: Y, unit: Z)
- Test cases covered: [TC-IDs]
- Checklist items tested: [CL-IDs]

**Generated Files:**
- List each .spec.ts file with type, line count, and classification reason

**Test Type Distribution:**
- E2E: [count] — [TC-IDs]
- Integration: [count] — [TC-IDs]
- Unit: [count] — [TC-IDs]

**Coverage:**
- TC-ID → CL-IDs mapping
- CL-ID → test file mapping

**Gaps:**
- CRITICAL checklist items without coverage

**Validation:**
- Linting status
- TypeScript errors (if any)

## Test Generation Rules

### Test Type Detection Algorithm

For each test case, analyze in order:

1. **Check for E2E criteria:**
   - Steps mention: "redirect", "navigate to different page", "toHaveURL"
   - No network mocking mentioned
   - Covers complete user journey
   - → Classify as **e2e**

2. **Check for Integration criteria:**
   - Steps mention: "page.route", "mock API", "network error", "server error"
   - OR tests form validation: "disabled", "enabled", "blur", "focus", "error message"
   - OR tests component state changes with user interaction
   - → Classify as **integration**

3. **Default to Unit if:**
   - No UI interactions mentioned
   - Tests pure function/utility
   - No API or component rendering
   - → Classify as **unit**

### Path Mirroring for Integration/Unit

1. **Extract component path from test case:**
   - Look for data-testid format: `domain.component.element`
   - Search codebase: `Grep "component" --glob "src/**/*.tsx"`
   - Identify source file path

2. **Mirror directory structure:**
   - Source: `src/components/auth/RegistrationForm.tsx`
   - Integration: `tests/integration/components/auth/RegistrationForm.spec.ts`
   - Unit: `tests/unit/components/auth/registrationValidation.spec.ts`

3. **Create directories if missing:**
   ```bash
   mkdir -p tests/integration/components/auth
   mkdir -p tests/unit/services/validation
   ```

### Test Traceability

- Each test uses Playwright/Vitest tags (e.g., `@TC-001`) and annotations for metadata
- TC-ID in test.describe tag enables `--grep @TC-001` filtering
- CL-ID coverage tracked via annotations (type: 'coverage')
- Document paths stored in annotations (type: 'testCase')
- Test type stored in annotations (type: 'testType', description: 'e2e'/'integration'/'unit')
- No traceability comments in generated code

### data-testid Naming

- Hierarchical format: `domain.component.element` (e.g., `auth.login-form.submit-btn`)
- Extracted from test case documents
- Added to components if missing
- Centralized in testIds.ts for reuse

### Network Mocking

- Detects error scenarios in TC (e.g., "Mock API to return 409")
- Generates `page.route()` interception code for Playwright
- For Vitest integration tests, use MSW (Mock Service Worker)
- Covers: 500 errors, 409 conflicts, timeouts, network failures
- Routes cleared after each test

### Test Data Fixtures

- Extracts test data from "Test Data" section in TC
- Generates fixtures with setup (create) / teardown (delete via cleanup API)
- Uses deterministic data, not random
- Fixtures scoped per-test for isolation

### Document Parsing

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
git add tests/integration/**/*.spec.ts
git add tests/unit/**/*.spec.ts
```

## Test Execution

Run generated tests by type:
```bash
# E2E tests
yarn test:e2e
yarn test:e2e --grep "@TC-001"

# Integration tests
yarn test --grep "integration"

# Unit tests
yarn test --grep "unit"

# All tests
yarn test
```

## Example Generated Tests

### E2E Test (Playwright)
```typescript
import { test, expect } from '@playwright/test';
import testIds from '../../testIds';

const TEST_DATA = {
  name: 'John Doe',
  email: `test-${Date.now()}@example.com`
};

test.describe('User registration with valid data', {
  tag: ['@TC-REG-001', '@auth', '@registration', '@e2e'],
  annotation: [
    { type: 'testCase', description: 'docs/testCases/authentication/01-register.md#tc-reg-001' },
    { type: 'coverage', description: 'CL-001, CL-002, CL-010, CL-015' },
    { type: 'testType', description: 'e2e' }
  ]
}, () => {
  test('successful registration redirects to login', async ({ page }) => {
    await page.goto('/registration');

    await page.locator(`[data-testid="${testIds.auth.registration.nameInput}"]`).fill(TEST_DATA.name);
    await page.locator(`[data-testid="${testIds.auth.registration.emailInput}"]`).fill(TEST_DATA.email);
    await page.locator(`[data-testid="${testIds.auth.registration.submitBtn}"]`).click();

    await expect(page.locator(`[data-testid="${testIds.auth.registration.successMessage}"]`))
      .toContainText('Account created successfully', { timeout: 5000 });

    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });
});
```

### Integration Test (Playwright)
```typescript
import { test, expect } from '@playwright/test';
import testIds from '../../../testIds';

const TEST_DATA = { name: 'John Doe', email: 'test@example.com' };

test.describe('RegistrationForm - Button State', {
  tag: ['@TC-REG-002', '@integration', '@form-validation'],
  annotation: [
    { type: 'testCase', description: 'docs/testCases/authentication/01-register.md#tc-reg-002' },
    { type: 'coverage', description: 'CL-002, CL-005' },
    { type: 'testType', description: 'integration' }
  ]
}, () => {
  test('submit button disabled until both fields filled', async ({ page }) => {
    await page.goto('/registration');

    const submitBtn = page.locator(`[data-testid="${testIds.auth.registration.submitBtn}"]`);
    await expect(submitBtn).toBeDisabled();

    await page.locator(`[data-testid="${testIds.auth.registration.nameInput}"]`).fill(TEST_DATA.name);
    await expect(submitBtn).toBeDisabled();

    await page.locator(`[data-testid="${testIds.auth.registration.emailInput}"]`).fill(TEST_DATA.email);
    await expect(submitBtn).toBeEnabled();
  });
});
```

### Unit Test (Vitest)
```typescript
import { describe, it, expect } from 'vitest';
import { validateEmail } from '@client/shared/validation/emailValidator';

describe('emailValidator', {
  annotation: [
    { type: 'testType', description: 'unit' }
  ]
}, () => {
  it('returns true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('returns false for invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

## Rules

**DO:**
- Automatically classify tests based on documented criteria
- Extract data-testid from test case documents (preferred) or component code
- Add missing data-testid attributes using hierarchical naming
- Wrap tests in test.describe() with tag (TC-ID) and annotations (doc path, CL-IDs, testType)
- Mirror source directory structure for integration/unit tests
- Generate one test per test case (strict step order)
- Generate short isolated tests for checklist items
- Mock network errors when TC specifies error scenario
- Include setup/teardown (fixtures) for test data
- Run `yarn lint:fix` and `tsc --noEmit` after generation
- Report validation errors that auto-fix couldn't resolve
- Report all CRITICAL gaps
- Include classification reason in console output

**DON'T:**
- Guess test type — follow classification algorithm strictly
- Put integration tests in src/ — always use tests/integration/
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
