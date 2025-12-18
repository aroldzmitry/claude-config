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
5. Never guess URLs; missing endpoint → warning in report

## Input

- `<checklist-path>`: CL-ID, severity, expected result
- `<test-cases-path>`: TC-ID, preconditions, test data, steps, expected result, cleanup

## Test Type Classification

| Type        | Location                                             | Criteria                                                                                    |
| ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| e2e         | `tests/e2e/<area>/<tc-id>.spec.ts`                   | Real API, multi-page flow, navigation/redirects                                             |
| storybook   | `tests/storybook/<mirror-src>/Component.stories.tsx` | Single component isolation, field validation, visual states, accessibility (ARIA, keyboard) |
| integration | `tests/integration/<mirror-src>/Component.spec.ts`   | Mocked API, form submission, error handling (500/409/timeout)                               |
| unit        | `tests/unit/<mirror-src>/file.test.ts`               | Pure functions, no UI/API                                                                   |

Detection order: e2e → storybook → integration → unit (first match wins)

## Output

- Test files at locations per classification table
- Console report: endpoint discovery, summary, files (with classification reason), coverage, gaps, missing dependencies, validation

## Boundaries

NEVER create/modify:

- Components, pages, hooks, services, DTOs
- API endpoints in ApiGatewayE (report if missing)
- Implementation code in `src/` (except testIds.ts)

ONLY create/modify:

- Test files in `tests/**`
- `tests/testIds.ts` (add IDs, never remove)
- `tests/.auth/auth.setup.ts` (if authenticated tests detected)
- `playwright.config.ts` (add setup project if auth tests detected and setup project missing)

Missing dependencies → warnings with file:line refs, generate tests with `// TODO: Add data-testid` comments

## Generation Rules

**Document parsing:** Validate TC structure first; expect sections: Preconditions, Test Data, Steps, Expected Result, [Cleanup], [Error Scenario]. Missing/malformed = BLOCKER.

**Imports:** Use path aliases (`Components/auth/Form`, `Shared/utils/helper`) or relative paths from tests to src

**Traceability:** `test.describe()` with `tag: ['@TC-XXX']`, `annotation: [{type: 'testCase'}, {type: 'coverage', description: 'CL-XXX'}, {type: 'testType'}]`

**Path mirroring:** `src/components/auth/Form.tsx` → `tests/{type}/components/auth/Form.{spec.ts|stories.tsx|test.ts}`

**Storybook:** CSF3 + play functions; check component imports, always add QueryClientDecorator for components using React Query hooks; add MemoryRouter for routing; add MSW handlers via parameters.msw.handlers for API calls

**Network mocking:** Use discovered endpoints in `page.route()`, MSW for Vitest; clear routes after each test

**Test data:** Extract from TC "Test Data" section, deterministic values, fixtures with setup/teardown, scoped per-test

**data-testid:** Format `domain.component.element`, add to testIds.ts; if missing in component → warning + `// TODO: Add data-testid="..." to ComponentName.tsx:line`

## Authentication Setup (for e2e/integration with auth)

**Detection:** Scan TC preconditions/steps for "logged in", "authenticated", "user session", profile access, or protected routes

**Setup generation (if auth detected and tests/.auth/ missing):**

1. Create `tests/.auth/` directory
2. Generate `tests/.auth/auth.setup.ts` with login flow (discover login endpoint, use test credentials from env: `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`)
3. Generate `tests/.auth/auth-no-image.setup.ts` for user without profile image (if profile tests detected)
4. Add `.auth/*.json` to `.gitignore`
5. Check `playwright.config.ts` for setup project; if missing, add:
   ```ts
   projects: [
     { name: 'setup', testMatch: /\.setup\.ts$/ },
     { name: 'desktop', use: { storageState: 'tests/.auth/user.json' }, dependencies: ['setup'] },
     ...
   ]
   ```
6. Update existing projects to add `dependencies: ['setup']` and `storageState: 'tests/.auth/user.json'`

**Auth file structure:**

```ts
// tests/.auth/auth.setup.ts
import { test as setup } from "@playwright/test";

setup("authenticate", async ({ page, request }) => {
  await page.goto("/login");
  // Discover login endpoint via Grep ApiGatewayE
  await page.fill('[data-testid="login.email"]', process.env.TEST_USER_EMAIL!);
  await page.fill(
    '[data-testid="login.password"]',
    process.env.TEST_USER_PASSWORD!,
  );
  await page.click('[data-testid="login.submit"]');
  await page.waitForURL("/dashboard");
  await page.context().storageState({ path: "tests/.auth/user.json" });
});
```

**Test usage:** Tests requiring auth use `test.use({ storageState: 'tests/.auth/user.json' })` at describe/file level

**Environment vars:** Add to report: "Required env vars: TEST_USER_EMAIL, TEST_USER_PASSWORD (set in .env or CI)"

## Validation

Run on generated files: `yarn lint:fix` → `npx prettier --write` → `npx tsc --noEmit`

Report unfixable errors in output. Stage: `git add tests/**/*.spec.ts tests/**/*.stories.tsx tests/**/*.test.ts`

## Dependency Discovery

Scan for missing:

- API endpoints: Grep ApiGatewayE, report if action endpoint not found
- Hooks: Grep `src/repositories/`, `src/hooks/` for `use[Feature]`
- Components: Read component file, check data-testid presence
- testIds: Read testIds.ts, check if ID exists

Report format: `⚠️ Missing: [type] [name] (referenced in TC-XXX Step N) → create in [file]:[line]`

Generate tests with TODOs where dependencies missing, skip steps requiring missing deps

## Rules

- Discover real endpoints first, use in all mocks
- One test per TC, strict step order
- Use data-testid only (no CSS selectors)
- Report missing dependencies as warnings (not blockers)
- No traceability comments (use annotations/tags)
- No header comments, no self-explanatory code comments
- Don't invent requirements or change expected results from docs
- Don't test backend directly unless TC explicitly requires it
- Never create implementation code (hooks, components, DTOs, services)
- Always wrap Storybook stories using React Query with QueryClientDecorator
- Always configure MSW handlers for Storybook stories making API calls
- Generate auth setup files when authenticated tests detected
- Update playwright.config.ts with setup project when auth infrastructure created
