---
description: Convert checklist and test cases into typed tests (e2e/integration/storybook/unit) with full traceability
argument-hint: "<checklist-path> <test-cases-path>"
allowed-tools: Write, Edit, Read, Glob, Grep, Bash(yarn:*)
---

# qa:create-test

Generate Playwright/Vitest/Storybook tests from checklist + test-cases docs.

## API Endpoint Discovery (mandatory first step)

1. Grep frontend for API enums/constants (`ApiGatewayE`, `API_ENDPOINTS`, `ROUTES`)
2. Grep hooks/services for `axios.|fetch(|apiClient.|requestClient.`
3. Check backend routes if exists (`../server/src/routes/`)
4. Map actions → endpoints (login → `/api/user/login`)
5. Never guess URLs; missing endpoint = BLOCKER

## Input

- `<checklist-path>`: CL-ID, severity, expected result
- `<test-cases-path>`: TC-ID, preconditions, test data, steps, expected result, cleanup

## Test Type Classification

| Type | Location | Criteria |
|------|----------|----------|
| e2e | `tests/e2e/<area>/<tc-id>.spec.ts` | Real API, multi-page flow, navigation/redirects |
| storybook | `tests/storybook/<mirror-src>/Component.stories.tsx` | Single component isolation, field validation, visual states, accessibility (ARIA, keyboard) |
| integration | `tests/integration/<mirror-src>/Component.spec.ts` | Mocked API, form submission, error handling (500/409/timeout) |
| unit | `tests/unit/<mirror-src>/file.test.ts` | Pure functions, no UI/API |

Detection order: e2e → storybook → integration → unit (first match wins)

## Output

- Test files at locations per classification table
- Components updated with `data-testid` if missing
- Console report: endpoint discovery, summary, files (with classification reason), coverage, gaps, validation

## Generation Rules

**Document parsing:** Validate TC structure first; expect sections: Preconditions, Test Data, Steps, Expected Result, [Cleanup], [Error Scenario]. Missing/malformed = BLOCKER.

**Imports:** Use path aliases (`Components/auth/Form`, `Shared/utils/helper`) or relative paths from tests to src

**Traceability:** `test.describe()` with `tag: ['@TC-XXX']`, `annotation: [{type: 'testCase'}, {type: 'coverage', description: 'CL-XXX'}, {type: 'testType'}]`

**Path mirroring:** `src/components/auth/Form.tsx` → `tests/{type}/components/auth/Form.{spec.ts|stories.tsx|test.ts}`

**Storybook:** CSF3 + play functions; check component imports, add decorators from `tests/storybook/decorators/` (QueryClientDecorator, MemoryRouter)

**Network mocking:** Use discovered endpoints in `page.route()`, MSW for Vitest; clear routes after each test

**Test data:** Extract from TC "Test Data" section, deterministic values, fixtures with setup/teardown, scoped per-test

**data-testid:** Format `domain.component.element`, extract from TC or add to components, centralize in testIds.ts

## Validation

Run on generated files: `yarn lint:fix` → `npx prettier --write` → `npx tsc --noEmit`

Report unfixable errors in output. Stage: `git add tests/**/*.spec.ts tests/**/*.stories.tsx tests/**/*.test.ts`

## Rules

- Discover real endpoints first, use in all mocks
- One test per TC, strict step order
- Use data-testid only (no CSS selectors)
- Report CRITICAL gaps and missing endpoints as BLOCKER
- No traceability comments (use annotations/tags)
- No header comments, no self-explanatory code comments
- Don't invent requirements or change expected results from docs
- Don't test backend directly unless TC explicitly requires it
