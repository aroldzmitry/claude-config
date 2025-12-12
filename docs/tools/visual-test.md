# visual:test

Automated visual testing command that orchestrates Playwright screenshot capture and analysis using 6 specialized reviewer skills.

## Purpose

Run comprehensive visual quality testing by capturing UI screenshots and analyzing them for spacing, alignment, consistency, typography, color, and responsive design issues.

## Usage

```bash
/visual:test
```

Or with filter:
```bash
/visual:test transactions
```

## Parameters

**Optional argument:** Page/component filter to analyze specific screenshots only

## Workflow

1. **Capture** - Runs Playwright visual tests (`yarn test:e2e tests/visual-tests.spec.ts`)
2. **Locate** - Finds all screenshots in `tests/screenshots/`
3. **Analyze** - Invokes all 6 reviewer skills on each screenshot:
   - visual-spacing-reviewer (margins, padding, gaps)
   - visual-alignment-reviewer (grid, centering, edges)
   - visual-consistency-reviewer (design system, patterns)
   - visual-typography-reviewer (fonts, readability, overflow)
   - visual-color-reviewer (WCAG contrast, accessibility)
   - visual-responsive-reviewer (mobile/desktop, touch targets)
4. **Aggregate** - Groups findings by severity and screenshot
5. **Report** - Outputs inline consolidated report

## Output

Inline report with:
- Summary (screenshots analyzed, issue counts by severity)
- Critical issues grouped by screenshot
- Warnings grouped by screenshot
- Info suggestions grouped by screenshot

## Example

```bash
/visual:test
```

Output:
```
═══════════════════════════════════════════════════
📊 VISUAL TEST REPORT
═══════════════════════════════════════════════════

## Summary
- Screenshots analyzed: 18
- Critical issues: 5
- Warnings: 12
- Info: 8

## Critical Issues

### transactions-desktop-default.png
**Spacing:** 13px margin between header and content (non-token value) → Change to 12px or 16px
**Color:** Error text contrast 2.8:1, needs 4.5:1 → Darken to #C41E3A

### login-mobile-default.png
**Typography:** Font size 10px on mobile - illegible → Increase to 14px minimum
**Responsive:** Button height 32px, below 44px touch target minimum → Increase to 44px

## Warnings

### dashboard-desktop-loaded.png
**Alignment:** Card grid third column 3px offset → Align to consistent grid
**Consistency:** Button radius varies (8px vs 12px) → Standardize to 8px

...

═══════════════════════════════════════════════════
```

## Notes

- Requires Playwright tests configured
- Uses all 6 visual reviewer skills
- Output is inline only (not saved)
- Runs on current working directory
- Filter argument matches screenshot filenames
