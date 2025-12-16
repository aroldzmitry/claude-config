---
description: Convert checklist and test cases into typed tests (e2e/integration/storybook/unit) with full traceability
argument-hint: "<checklist-path> <test-cases-path>"
allowed-tools: Write, Edit, Read, Glob, Grep, Bash(yarn:*)
---

# qa:create-test — Generate Typed Tests from Test Cases

Generate Playwright/Vitest/Storybook tests from documentation with automatic type classification:
- Full test-to-requirement traceability (TC-ID/CL-ID via annotations and tags)
- Automatic test type detection (e2e/integration/storybook/unit)
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

### Storybook Tests
**Location:** `src/<mirrored-component-path>/<ComponentName>.stories.tsx`

**Criteria (ANY matches):**
- Single component in isolation (no page navigation)
- Field-level validation without API calls
- Visual states (loading, error, disabled, focused)
- User interactions within single component (click, type, blur)
- Accessibility testing (ARIA, keyboard nav)

**File Structure:**
- Component: `src/components/auth/RegistrationForm.tsx` → `src/components/auth/RegistrationForm.stories.tsx`
- Uses CSF3 format with play functions for interactions
- Imports `@storybook/test` for userEvent and expect

**Examples:**
- Button disabled until fields filled
- Empty field validation on blur
- Loading spinner display during submission
- Focus/blur states

### Integration Tests
**Location:** `tests/integration/<mirrored-source-path>/<ComponentName>.spec.ts`

**Criteria (ANY matches):**
- Form submission flow with mocked API
- Multi-step component scenarios
- Network/server error handling with mocks
- Route transitions within feature
- Complex mocked responses (409, 500, timeouts)

**Path Mirroring:**
- Component: `src/components/auth/RegistrationForm.tsx` → `tests/integration/components/auth/RegistrationForm.spec.ts`
- Page: `src/pages/registration/Registration.tsx` → `tests/integration/pages/registration/Registration.spec.ts`

**Examples:**
- Multiple submit click prevention
- Network error handling with mock (TC-REG-008)
- Server error display with mock (TC-REG-009)

### Unit Tests
**Location:** `src/<same-directory-as-source>/<fileName>.test.ts`

**Criteria:**
- Tests pure functions or utilities
- No UI rendering
- No API calls (real or mocked)
- Tests validation logic, formatters, calculators

**File Placement:**
- Utility: `src/shared/validation/emailValidator.ts` → `src/shared/validation/emailValidator.test.ts`
- Service: `src/services/auth/passwordStrength.ts` → `src/services/auth/passwordStrength.test.ts`
- Uses `.test.ts` extension (Vitest convention)
- Placed in same directory as source file

**Examples:**
- Email format validation function
- Password strength calculator
- Date formatting utilities
- Business logic calculations

## Output Files

**E2E Tests:**
- `tests/e2e/<area>/<testcase-id>.spec.ts` — Full flow tests (Playwright)

**Storybook Tests:**
- `src/<mirrored-path>/<ComponentName>.stories.tsx` — Component isolation tests with play functions

**Integration Tests:**
- `tests/integration/<mirrored-path>/<ComponentName>.spec.ts` — Component integration tests (Playwright)

**Unit Tests:**
- `src/<same-path-as-source>/<fileName>.test.ts` — Pure function tests (Vitest)

**Modified Components:**
- Updated component files with added `data-testid` attributes

## Console Output Format

After completion, output to console (do NOT create REPORT.md file):

**Summary:**
- Status: success/partial/failed
- Test files generated: [count] (e2e: X, storybook: Y, integration: Z, unit: W)
- Test cases covered: [TC-IDs]
- Checklist items tested: [CL-IDs]

**Generated Files:**
- List each .spec.ts/.stories.tsx file with type, line count, and classification reason

**Test Type Distribution:**
- E2E: [count] — [TC-IDs]
- Storybook: [count] — [TC-IDs]
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
   - Covers complete user journey across pages
   - → Classify as **e2e**

2. **Check for Storybook criteria:**
   - Single component in isolation (no page.goto or navigation)
   - Tests field-level validation without API
   - Tests visual states: loading, error, disabled, focused
   - User interactions within component: click, type, blur, focus
   - No network mocking, no multi-component scenarios
   - → Classify as **storybook**

3. **Check for Integration criteria:**
   - Steps mention: "page.route", "mock API", "network error", "server error"
   - Form submission flow with mocked responses
   - Multi-step component scenarios
   - Tests component integration with mocked dependencies
   - → Classify as **integration**

4. **Default to Unit if:**
   - No UI interactions mentioned
   - Tests pure function/utility
   - No API or component rendering
   - → Classify as **unit**

### Path Mirroring

1. **Extract component/file path from test case:**
   - Look for data-testid format: `domain.component.element`
   - Search codebase: `Grep "component" --glob "src/**/*.tsx"`
   - Identify source file path

2. **Place tests based on type:**
   - Source: `src/components/auth/RegistrationForm.tsx`
   - Storybook: `src/components/auth/RegistrationForm.stories.tsx` (same directory)
   - Integration: `tests/integration/components/auth/RegistrationForm.spec.ts` (mirrored structure)
   - Unit: `src/shared/validation/emailValidator.test.ts` (same directory as source)

3. **File placement rules:**
   - E2E: `tests/e2e/<area>/` (separate directory)
   - Storybook: Same directory as component (src/)
   - Integration: Mirrored structure in `tests/integration/`
   - Unit: Same directory as source file (src/)

### Test Traceability

- Each test uses tags (e.g., `@TC-001`) and annotations for metadata
- TC-ID in test.describe/story tag enables `--grep @TC-001` filtering
- CL-ID coverage tracked via annotations (type: 'coverage')
- Document paths stored in annotations (type: 'testCase')
- Test type stored in annotations (type: 'testType', description: 'e2e'/'storybook'/'integration'/'unit')
- Storybook stories use CSF3 tags and parameters for traceability
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
git add src/**/*.stories.tsx
git add src/**/*.test.ts
git add tests/integration/**/*.spec.ts
```

## Test Execution

Run generated tests by type:
```bash
# E2E tests
yarn test:e2e
yarn test:e2e --grep "@TC-001"

# Storybook tests
yarn storybook  # View stories
yarn test:storybook  # Run test-runner (if configured)

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

### Storybook Test (CSF3 with play function)
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import RegistrationForm from './RegistrationForm';

const meta = {
  title: 'Auth/RegistrationForm',
  component: RegistrationForm,
  parameters: {
    testCase: 'docs/testCases/authentication/01-register.md#tc-reg-002',
    coverage: 'CL-002, CL-005',
    testType: 'storybook',
  },
  tags: ['@TC-REG-002', '@storybook', '@form-validation'],
} satisfies Meta<typeof RegistrationForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SubmitButtonDisabled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submitBtn = canvas.getByTestId('auth.registration.submit-btn');

    await expect(submitBtn).toBeDisabled();

    await userEvent.type(canvas.getByTestId('auth.registration.name-input'), 'John Doe');
    await expect(submitBtn).toBeDisabled();

    await userEvent.type(canvas.getByTestId('auth.registration.email-input'), 'test@example.com');
    await expect(submitBtn).toBeEnabled();
  },
};
```

### Integration Test (Playwright)
```typescript
import { test, expect } from '@playwright/test';
import testIds from '../../../testIds';

test.describe('RegistrationForm - Network Error', {
  tag: ['@TC-REG-008', '@integration', '@error-handling'],
  annotation: [
    { type: 'testCase', description: 'docs/testCases/authentication/01-register.md#tc-reg-008' },
    { type: 'coverage', description: 'CL-020, CL-022' },
    { type: 'testType', description: 'integration' }
  ]
}, () => {
  test('network error displays message and retry', async ({ page }) => {
    await page.route('**/api/users/register', route => route.abort('failed'));
    await page.goto('/registration');

    await page.locator(`[data-testid="${testIds.auth.registration.nameInput}"]`).fill('John Doe');
    await page.locator(`[data-testid="${testIds.auth.registration.emailInput}"]`).fill('test@example.com');
    await page.locator(`[data-testid="${testIds.auth.registration.submitBtn}"]`).click();

    await expect(page.getByText(/Network error/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });
});
```

### Unit Test (Vitest)
File: `src/shared/validation/emailValidator.test.ts` (next to emailValidator.ts)
```typescript
import { describe, it, expect } from 'vitest';
import { validateEmail } from './emailValidator';

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
- Automatically classify tests based on documented criteria (check Storybook before Integration)
- Extract data-testid from test case documents (preferred) or component code
- Add missing data-testid attributes using hierarchical naming
- Wrap tests in test.describe() with tag (TC-ID) and annotations (doc path, CL-IDs, testType)
- Use CSF3 format for Storybook stories with play functions
- Place Storybook files next to components in src/
- Place unit tests next to source files in src/ (use .test.ts extension)
- Mirror source directory structure for integration tests in tests/integration/
- Generate one test per test case (strict step order)
- Mock network errors when TC specifies error scenario
- Include setup/teardown (fixtures) for test data
- Run `yarn lint:fix` and `tsc --noEmit` after generation
- Report validation errors that auto-fix couldn't resolve
- Report all CRITICAL gaps
- Include classification reason in console output

**DON'T:**
- Guess test type — follow classification algorithm strictly
- Put integration tests in src/ — always use tests/integration/
- Put Storybook tests in tests/ — always use src/ next to component
- Put unit tests in tests/ — always use src/ next to source file
- Add traceability comments (use annotations/tags/parameters instead)
- Add generic file header comments
- Comment self-explanatory code (project standard)
- Invent new requirements not in checklist/test cases
- Change expected results from documentation
- Mix multiple test cases in single test/story
- Use CSS selectors or nth-child (always use data-testid)
- Hardcode test data in test steps (extract from "Test Data" section)
- Ignore document formatting errors (report them in gaps)
- Test backend directly unless TC explicitly requires it
