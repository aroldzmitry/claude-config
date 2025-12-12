# visual-color-reviewer

Analyze screenshots for color accessibility and consistency including WCAG contrast compliance.

## Purpose

Detect color and accessibility issues in UI screenshots including contrast violations, color consistency problems, and WCAG compliance failures.

## Usage

```
Use the visual-color-reviewer skill when analyzing UI screenshots
```

Automatically invoked by `/visual:test` command or used directly for screenshot review.

## Parameters

**Input:** Screenshot image file path

## Output

Structured analysis with severity breakdown:
- **Critical:** WCAG AA contrast failures (< 4.5:1 normal text, < 3:1 large text), color-only critical info, invisible focus indicators
- **Warning:** Borderline contrast, color inconsistencies, disabled state visibility, brand color variations
- **Info:** WCAG AAA opportunities (> 7:1), color palette optimization

Each finding includes:
- Location in screenshot
- Color/contrast problem with estimated ratio
- Fix suggestion

## Example

Input: `/path/to/login-page.png`

Output:
```
## Color Analysis

**Severity Breakdown:**
- Critical: 2
- Warning: 1
- Info: 1

### Critical Issues
- **Location:** Error message below password field
- **Issue:** Red text on pink background - contrast ratio ~2.8:1, needs 4.5:1 minimum
- **Suggestion:** Darken error text to #C41E3A or use white background with red text

- **Location:** Success status indicator
- **Issue:** Green color only (no text or icon) - fails accessibility for color-blind users
- **Suggestion:** Add checkmark icon and "Success" text label

### Warnings
- **Location:** Primary blue buttons
- **Issue:** Button color inconsistency - header uses #0066CC, footer uses #0052A3
- **Suggestion:** Standardize to brand primary blue #0066CC
```

## Notes

- Uses Claude's vision capability
- Estimates contrast ratios (noted as approximations)
- References WCAG 2.1 AA standards
- Checks color-only information patterns
- Part of visual reviewer suite
