# visual-consistency-reviewer

Analyze screenshots for design system consistency including component matching, pattern adherence, and style cohesion.

## Purpose

Detect design system drift in UI screenshots including component style variations, pattern inconsistencies, visual hierarchy breaks, and design token violations.

## Usage

```
Use the visual-consistency-reviewer skill when analyzing UI screenshots
```

Automatically invoked by `/visual:test` command or used directly for screenshot review.

## Parameters

**Input:** Screenshot image file path

## Output

Structured analysis with severity breakdown:
- **Critical:** Primary button style drift, heading hierarchy breaks, mixed icon styles, brand color violations
- **Warning:** Secondary component variations, minor shadow/border inconsistencies, pattern drift
- **Info:** Standardization opportunities, design system improvements

Each finding includes:
- Location in screenshot
- Specific inconsistency with examples
- Standardization suggestion

## Example

Input: `/path/to/app-interface.png`

Output:
```
## Consistency Analysis

**Severity Breakdown:**
- Critical: 2
- Warning: 3
- Info: 1

### Critical Issues
- **Location:** Primary action buttons (header and footer)
- **Issue:** Button style drift - "Save" button has 8px border radius, "Submit" button has 12px border radius
- **Suggestion:** Standardize all primary buttons to 8px border radius per design system

- **Location:** Navigation icons
- **Issue:** Mixed icon styles - "Home" uses outlined style, "Settings" uses filled style
- **Suggestion:** Use consistent outlined icon style throughout navigation

### Warnings
- **Location:** Transaction cards
- **Issue:** Shadow inconsistency - first two cards have 4px blur, third card has 8px blur
- **Suggestion:** Apply consistent elevation-1 shadow (4px blur) to all cards

- **Location:** Section headers
- **Issue:** Visual hierarchy break - "Recent Activity" is 18px, "Transactions" is 16px (both h2)
- **Suggestion:** Standardize all h2 headers to 18px font size
```

## Notes

- Uses Claude's vision capability
- Compares similar components for style matching
- References design system principles
- Part of visual reviewer suite
