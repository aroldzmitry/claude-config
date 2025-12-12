# Screenshot Collection Strategy Investigation

**Date:** 2025-12-11
**Topic:** How to collect screenshots for visual testing (all pages or specific pages)
**Context:** Zephyr Budget App visual testing system

## Current State

- **18 screenshots** (desktop + mobile)
- **Pages covered:** login, login-code, budget-monthly, budget-list, transactions, accounts, categories, profile
- **Helper:** `captureScreenshot()` in `tests/helpers/visual-capture.ts`
- **Naming:** `{name}-{device}-{state}.png`

## Core Problem

How to systematically capture UI screenshots for all states (sidebars, modals, errors, empty) and enable filtering to run specific page tests via `/visual:test`.

## Key Insight

Use Playwright's tag system (`@tag`) on describe blocks. This enables filtering by page while keeping tests organized. Combined with a state matrix approach, you can cover all UI states systematically.

## Research Findings

### Playwright Tags (from docs)

Tag describe blocks:
```typescript
test.describe('Visual Tests - Transactions', { tag: '@transactions' }, () => {
  // tests inherit tag
});
```

Run filtered: `npx playwright test --grep @transactions`

Multiple tags: `npx playwright test --grep "@transactions|@budgets"`

### Modal Screenshots Best Practice

Screenshot modal element only (not full page) for stability:
```typescript
await page.getByRole('dialog').screenshot({ path: 'modal.png' });
```

### Reducing Flakiness

- Use `waitFor({ state: 'visible' })` before capture
- Wait for loading spinners to be hidden
- Mask dynamic content (timestamps, avatars)
- Use `maxDiffPixels` threshold for minor variations

### Organizing Tests

Split by page:
```
tests/visual-tests/
  transactions.spec.ts  (@transactions)
  budgets.spec.ts       (@budgets)
  accounts.spec.ts      (@accounts)
  ...
```

## State Matrix

| Page | Current States | States to Add |
|------|----------------|---------------|
| transactions | loaded | sidebar-open, empty, filter-applied, bulk-selected |
| budgets | loaded | create-modal, edit-modal, empty, delete-confirm |
| accounts | loaded | info-sidebar, create-modal, delete-confirm, empty |
| categories | loaded | create-modal, edit-modal, empty |
| login | default, loaded | error, loading |
| profile | loaded | edit-mode, loading |

## Recommendations

### Quick Win: Add Tags

Add tags to existing describe blocks:
```typescript
test.describe('Visual Tests - Transactions', { tag: '@transactions' }, () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('transactions page', async ({ page }, testInfo) => {
    // existing test
  });
});
```

### Update /visual:test Command

Support grep filtering:
```bash
/visual:test                    # All tests
/visual:test @transactions      # Specific page
/visual:test @transactions @budgets  # Multiple pages
```

Modify Phase 1 to use:
```bash
yarn test:e2e --grep "<filter>"
```

### Deep Work: Add State Coverage

For each page, add tests for:
1. **Sidebar open** — Open transaction info sidebar
2. **Modal open** — Create/edit modals
3. **Empty state** — No data scenario
4. **Error state** — API error handling
5. **Loading state** — Initial load spinner

Example for transactions:
```typescript
test('transaction sidebar open', async ({ page }, testInfo) => {
  await page.goto('/transactions');
  await page.waitForLoadState('networkidle');
  // Click first transaction to open sidebar
  await page.getByTestId('transaction-item').first().click();
  await page.waitForSelector('[data-testid="transaction-sidebar"]');
  await captureScreenshot({ page, testInfo, name: 'transactions', state: 'sidebar' });
});
```

## Open Questions

1. **Empty state triggering** — Create new test user, or mock API responses?
2. **Error state triggering** — Use Playwright network mocking?
3. **Modal stability** — Screenshot modal element only, or full page?
4. **Loading capture** — How to capture reliably without flakiness?

## Sources

- [Playwright Test Annotations](https://playwright.dev/docs/test-annotations)
- [Organizing Playwright Tests Effectively](https://dev.to/playwright/organizing-playwright-tests-effectively-2hi0)
- [Visual Testing with Playwright](https://medium.com/@divyakandpal93/visual-testing-with-playwright-screenshots-snapshots-and-more-e002476bdd9c)
- [Fixing Flaky Visual Regression Tests](https://www.houseful.blog/posts/2023/fix-flaky-playwright-visual-regression-tests/)
- [Tagging Playwright Tests](https://dev.to/playwright/tagging-your-playwright-tests-3omm)
- [Create Test Sets with Tags and Grep](https://timdeschryver.dev/blog/create-and-run-playwright-test-sets-using-tags-and-grep)
