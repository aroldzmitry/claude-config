---
description: Convert checklist and test cases into typed tests (e2e/integration/storybook/unit) with full traceability
argument-hint: "<task-folder-or-file>"
allowed-tools: Write, Edit, Read, Glob, Grep, Bash(yarn:*)
model: opus
---

# qa:create-test — Generate Typed Tests from Test Cases

Generate Playwright/Vitest/Storybook tests from documentation with traceability (TC-ID/CL-ID via annotations/tags), automatic test type detection, hierarchical data-testid naming, network mocking for error scenarios.

## Input

`$ARGUMENTS` contains either:
- Task folder path: `docs/34-create-category/`
- Any file from task folder: `docs/34-create-category/testCases.md`

### File Discovery

From input path, derive task folder and auto-discover files:
1. If path is directory → use as task folder
2. If path is file → extract parent directory as task folder

Required files (in task folder):
- `checkList.md` — CL-IDs, severity, expected results
- `testCases.md` — TC-IDs, steps, test data

Optional files:
- `userFlows.md` — context for understanding flow
- `workPlan.md` — implementation status

If required files missing → report as BLOCKER and exit.

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

## Test Type Classification (CRITICAL — Read Carefully)

**STOP. For each TC, ask these questions IN ORDER:**

1. **Unit?** → Pure function/utility, no UI, no API → `tests/unit/`
2. **Storybook?** → Visual state or component interaction, NO API at all → `tests/storybook/`
3. **E2E?** → Critical happy path (1-2 per feature max), real API → `tests/e2e/`
4. **Integration?** → Everything else with API (mocked) → `tests/integration/`

| Type | Location | Criteria | Extension |
|------|----------|----------|-----------|
| Unit | `tests/unit/<mirror-src>/` | Pure functions/utilities, no UI/API | `.test.ts` |
| Storybook | `tests/storybook/<mirror-src>/` | Visual states catalog (error, loading, disabled, empty). Component interactions (blur→error). NO API. Answer: "How does it look?" | `.stories.tsx` |
| Integration | `tests/integration/<mirror-src>/` | Playwright + mocked API. Validation flows, form submission logic, API error handling (409, 500, timeout), non-critical paths. Answer: "Does it work correctly?" | `.spec.ts` |
| E2E | `tests/e2e/<area>/` | Playwright + real API. ONLY critical happy path (1-2 per feature). Answer: "Critical business flow?" | `.spec.ts` |

**Detection order:** Unit → Storybook → E2E → Integration (Integration is default for API-related tests).

**Key questions:**
- "How does this STATE look?" → Storybook (visual catalog)
- "Does this WORK correctly?" → Integration (mocked API)
- "Is this the CRITICAL business path?" → E2E (real API, max 1-2 per feature)

**Classification rules:**
- Validation tests → Integration (functional verification), Storybook (visual state only)
- API error handling (409, 500, timeout) → Integration (mocked)
- Form submission logic → Integration (mocked)
- Success notification appearance → Storybook
- Success flow creates real data → E2E (if critical path)
- Loading states, disabled states, error appearances → Storybook

**Most tests should be Integration.** E2E is expensive — reserve for critical paths only.

**Path mirroring:** Extract component path from data-testid (e.g., `auth.form` → Grep for component), then mirror: `src/components/auth/Form.tsx` → `tests/{type}/components/auth/Form.{ext}`

## Pre-Implementation Planning (MANDATORY — DO NOT SKIP)

**STOP. Do NOT write any test code until this section is complete.**

Before writing tests:

1. Read ALL test cases completely
2. For EACH TC, apply classification checklist (Unit → Storybook → Integration → E2E)
3. Create classification table and show to user:

```
| TC-ID | Type | Reason (1 sentence) |
|-------|------|---------------------|
| TC-001 | E2E | Creates category via real API |
| TC-002 | Storybook | Client-side validation, no API |
```

4. **ASK USER:** "Classification complete. Proceed with generation?"
5. Only after user confirms → start writing tests

**If unsure about any TC classification → ask user before proceeding.**

## Test Generation Rules

### Traceability
- Wrap in `test.describe()` with `tag: ["@TC-001"]` and `annotation: [{type: "testCase", description: "docs/{task-name}/testCases.md#tc-001"}, {type: "coverage", description: "CL-001, CL-002"}, {type: "testType", description: "e2e"}]`
- TC-ID in tag enables `--grep @TC-001` filtering for running specific tests
- Storybook: use CSF3 `tags`, `parameters.testCase`, `parameters.coverage`, `parameters.testType`
- No traceability comments — annotations/tags only

### data-testid & testIds.ts
- Format: `domain.component.element` (e.g., `auth.login-form.submit-btn`)
- Extract from test case docs, add to components if missing
- **testIds.ts workflow:**
  1. Check if `tests/testIds.ts` exists; if not, create with nested object structure
  2. Add new IDs extracted from TC docs: `export const testIds = { auth: { form: { submit: "auth.form.submit" } } }`
  3. Import in tests: `import { testIds } from "../testIds"`
  4. Use as: `page.locator(\`[data-testid="${testIds.auth.form.submit}"]\`)`

### Playwright (E2E/Integration)
- **Context7 lookup:** Before first test generation, fetch Playwright docs via `mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs` for: locators, assertions, route mocking
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
- **Context7 lookup:** Before first story generation, fetch Storybook docs via Context7 for: CSF3 format, play functions, `@storybook/test` assertions
- CSF3 format with play functions
- Import `@storybook/test` for assertions (`within`, `userEvent`, `expect`)
- Add decorators from `tests/storybook/decorators/` (QueryClientDecorator, MemoryRouter) based on component imports

### Import Paths
- Prefer aliases: `import Form from 'Components/auth/Form'`
- Or relative: `import Form from '../../../../src/components/auth/Form'`

## Output Files

- `tests/e2e/<area>/<testcase-id>.spec.ts`
- `tests/storybook/<mirror-path>/<Component>.stories.tsx`
- `tests/integration/<mirror-path>/<Component>.spec.ts`
- `tests/unit/<mirror-path>/<file>.test.ts`
- `tests/testIds.ts` — centralized test ID constants (created/updated)
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
