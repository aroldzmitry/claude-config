# visual-spacing-reviewer

Analyze screenshots for spacing, margin, and padding issues with strict token validation.

## Purpose

Detect spacing quality issues in UI screenshots including crowding, inconsistent gaps, non-token values, and whitespace imbalance. Validates against project-specific spacing tokens.

## Usage

```
Use the visual-spacing-reviewer skill when analyzing UI screenshots
```

The skill is automatically invoked by the `/visual:test` command or can be used directly when reviewing screenshots.

## Parameters

**Input:** Screenshot image file path

**Approved spacing tokens:** 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 26, 32, 40px

## Output

Structured analysis with severity breakdown:
- **Critical:** Crowding (< 4px gaps), major token violations, broken visual rhythm
- **Warning:** Minor token violations, inconsistent gaps, padding asymmetry
- **Info:** Whitespace improvements, optimization suggestions

Each finding includes:
- Location in screenshot
- Issue description with exact px values
- Fix suggestion using approved tokens

## Example

Input: `/path/to/transaction-page-desktop.png`

Output:
```
## Spacing Analysis

**Severity Breakdown:**
- Critical: 2
- Warning: 3
- Info: 1

### Critical Issues
- **Location:** Header and main content area
- **Issue:** 13px margin detected between header and content (non-token value)
- **Suggestion:** Change to 12px or 16px from approved tokens

- **Location:** Filter buttons in toolbar
- **Issue:** 3px gap between buttons (crowding, touch target issue)
- **Suggestion:** Increase to minimum 4px or preferably 8px

### Warnings
- **Location:** Transaction cards
- **Issue:** Inconsistent padding - first card has 16px, second has 12px
- **Suggestion:** Standardize to 16px for all cards
```

## Notes

- Uses Claude's vision capability to analyze screenshots
- Token list is project-specific (based on Zephyr Budget App spacing.scss)
- Estimates px values when exact measurements unclear from screenshot
- Part of suite: visual-spacing-reviewer, visual-alignment-reviewer, visual-consistency-reviewer, visual-typography-reviewer, visual-color-reviewer, visual-responsive-reviewer
