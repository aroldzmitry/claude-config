---
description: Convert checklist and test cases into typed tests (e2e/integration/storybook/unit) with full traceability
argument-hint: "<checklist-path> <test-cases-path>"
allowed-tools: Write, Edit, Read, Glob, Grep, Bash(yarn:*)
---

# qa:create-test — Generate Typed Tests from Test Cases

Generate Playwright/Vitest/Storybook tests from documentation with traceability (TC-ID/CL-ID via annotations/tags), automatic test type detection, hierarchical data-testid naming, network mocking for error scenarios.

## Input

**Required:** `<checklist-path>` (CL-ID, severity, expected result), `<test-cases-path>` (TC-ID, steps, test data, cleanup)

**Checklist format:** `## CL-001 | CRITICAL` with Element, Expected Result fields.

**Test Cases format:** `## TC-001: Title` with Preconditions, Test Data, Steps (with data-testid), Expected Result, Cleanup.

**Expected TC sections:** Preconditions, Test Data, Steps, Expected Result, [Cleanup], [Error Scenario]. Validate before generation — report missing/malformed as BLOCKER.

## API Endpoint Discovery (Mandatory First Step)

Before generating tests, discover real API endpoints:

1. Search frontend for endpoint enums/consts (`ApiGatewayE`, `API_ENDPOINTS`, `ROUTES`)
2. Search hooks/services for API calls (`axios.|fetch(|apiClient.|requestClient.`)
3. Search backend routes if exists (`../server/src/routes/`)
4. Build action→endpoint mapping (e.g., "login" → `/api/user/login`)
5. **Never guess endpoints** — if not found, report as BLOCKER in gaps

## Test Type Classification

| Type | Location | Criteria | Extension |
|------|----------|----------|-----------|
| E2E | `tests/e2e/<area>/` | Real API calls, multi-page flow, navigation/redirects | `.spec.ts` |
| Storybook | `tests/storybook/<mirror-src>/` | Single component isolation, field validation without API, visual states, interactions within component, accessibility (ARIA, keyboard) | `.stories.tsx` |
| Integration | `tests/integration/<mirror-src>/` | Form submission with mocked API, multi-step scenarios, error handling with mocks (409, 500, timeout) | `.spec.ts` |
| Unit | `tests/unit/<mirror-src>/` | Pure functions/utilities, no UI/API | `.test.ts` |

**Detection order:** E2E → Storybook → Integration → Unit (first match wins).

**Detection keywords in TC steps:**
- E2E: "redirect", "navigate to", "toHaveURL", multi-page journey
- Storybook: NO "page.goto", single component, "blur", "focus", "type"
- Integration: "page.route", "mock API", "network error", "server error", "409", "500"
- Unit: no UI interactions, pure function/utility

**Path mirroring:** Extract component path from data-testid (e.g., `auth.form` → Grep for component), then mirror: `src/components/auth/Form.tsx` → `tests/{type}/components/auth/Form.{ext}`

## Pre-Implementation Planning

Before writing tests, use `EnterPlanMode` to plan implementation:
1. Analyze input documents (checklist + test cases)
2. Classify each TC by test type
3. Identify components needing data-testid additions
4. Map TC steps to Playwright/Storybook actions
5. Get user approval before generating code

## Test Generation Rules

### Traceability
- Wrap in `test.describe()` with `tag: ["@TC-001"]` and `annotation: [{type: "testCase", description: "docs/testCases/area/file.md#tc-001"}, {type: "coverage", description: "CL-001, CL-002"}, {type: "testType", description: "e2e"}]`
- TC-ID in tag enables `--grep @TC-001` filtering for running specific tests
- Storybook: use CSF3 `tags`, `parameters.testCase`, `parameters.coverage`, `parameters.testType`
- No traceability comments — annotations/tags only

### data-testid
- Format: `domain.component.element` (e.g., `auth.login-form.submit-btn`)
- Extract from test case docs, add to components if missing
- Centralize in `testIds.ts`, use as: `page.locator(\`[data-testid="${testIds.auth.form.submit}"]\`)`

### Playwright (E2E/Integration)
- **Before writing:** lookup Playwright docs via Context7 MCP for current API
- Use `page.locator()` with data-testid selectors
- Assertions: `expect(locator).toBeVisible()`, `expect(page).toHaveURL()`

### Network Mocking
- Detect error scenarios in TC (e.g., "Mock API to return 409", "network error") → add mocking
- Use discovered endpoints only (from API Endpoint Discovery)
- Playwright: `page.route()` interception
- Vitest integration: MSW
- Clear routes after each test

### Test Data Fixtures
- Extract from "Test Data" section in TC
- Deterministic data, not random
- Setup/teardown per-test for isolation

### Storybook Specifics
- **Before writing:** lookup Storybook docs via Context7 MCP for current API
- CSF3 format with play functions
- Import `@storybook/test` for assertions
- Add decorators from `tests/storybook/decorators/` (QueryClientDecorator, MemoryRouter) based on component imports

### Import Paths
- Prefer aliases: `import Form from 'Components/auth/Form'`
- Or relative: `import Form from '../../../../src/components/auth/Form'`

## Output Files

- `tests/e2e/<area>/<testcase-id>.spec.ts`
- `tests/storybook/<mirror-path>/<Component>.stories.tsx`
- `tests/integration/<mirror-path>/<Component>.spec.ts`
- `tests/unit/<mirror-path>/<file>.test.ts`
- Updated components with `data-testid` attributes

## Console Output Format

After completion, output to console (no REPORT.md file):

```
API Endpoint Discovery: [source] | [count] endpoints | [action→URL list]

Summary: [status] | [count] files (e2e: X, storybook: Y, integration: Z, unit: W)
Test cases: [TC-IDs] | Checklist items: [CL-IDs]

Generated Files:
- [path] | [type] | [lines] | [classification reason]

Coverage: TC-ID → CL-IDs | CL-ID → test file

Gaps: [CRITICAL items without coverage]

Validation: [lint status] | [TypeScript errors if any]
```

## Validation & Git

After generation:
1. `yarn lint:fix` on generated files
2. `npx prettier --write` on generated/modified files
3. `npx tsc --noEmit` on generated files
4. Report unfixable validation errors in output (don't silently skip)
5. Stage: `git add tests/**/*.spec.ts tests/**/*.stories.tsx tests/**/*.test.ts`

## Test Patterns (Brief)

**E2E:** `test.describe("Title", {tag: ["@TC-001"], annotation: [...]}, () => { test("...", async ({page}) => {...}) })`

**Storybook:** `const meta = {title, component, decorators, parameters: {testCase, coverage, testType}, tags}; export const Story: Story = {play: async ({canvasElement}) => {...}}`

**Integration:** Same as E2E but with `page.route()` mocking before navigation.

**Unit:** `describe("util", {annotation: [{type: "testType", description: "unit"}]}, () => { it("...") })`

## Rules

**DO:**
- Discover real API endpoints first — mandatory
- Use exact discovered URLs in mocks
- Classify by documented criteria (check Storybook before Integration)
- Extract data-testid from TC docs, add missing attributes to components
- Add decorators for React Query/Router in Storybook
- Mirror src/ structure for test placement
- One test per TC, strict step order
- Mock network errors when TC specifies error scenario
- Run lint/prettier/tsc after generation
- Report CRITICAL gaps and classification reasons

**DON'T:**
- Hardcode/guess API endpoints
- Skip API discovery step
- Guess test type — follow algorithm
- Skip Storybook decorators
- Put tests in src/ — always use tests/
- Add traceability comments (use annotations)
- Use CSS selectors (use data-testid)
- Hardcode test data (extract from TC)
- Invent requirements not in docs
- Change expected results from documentation
- Mix multiple TCs in single test/story
- Ignore document formatting errors — report as BLOCKER
- Test backend directly unless TC explicitly requires it
