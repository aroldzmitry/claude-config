# visual-responsive-reviewer

Analyze screenshots for responsive design quality including mobile/desktop layouts, touch targets, and overflow.

## Purpose

Detect responsive design issues in UI screenshots including touch target violations, overflow problems, layout breaks, and mobile/desktop inconsistencies.

## Usage

```
Use the visual-responsive-reviewer skill when analyzing UI screenshots
```

Automatically invoked by `/visual:test` command or used directly for screenshot review.

## Parameters

**Input:** Screenshot image file path

## Output

Structured analysis with severity breakdown:
- **Critical:** Touch targets < 44x44px on mobile, horizontal overflow, broken layouts, hidden critical content
- **Warning:** Touch targets 44-48px, minor overflow, suboptimal layouts, tight spacing
- **Info:** Layout optimizations, spacing improvements, image optimization

Each finding includes:
- Location in screenshot
- Specific responsive problem with measurements
- Fix suggestion

## Example

Input: `/path/to/mobile-dashboard.png`

Output:
```
## Responsive Analysis

**Severity Breakdown:**
- Critical: 2
- Warning: 1
- Info: 1

### Critical Issues
- **Location:** Action buttons in transaction list (mobile)
- **Issue:** Button height is 32px, below WCAG 2.1 minimum of 44px for touch targets
- **Suggestion:** Increase button height to 44px minimum for mobile touch accessibility

- **Location:** Main content area
- **Issue:** Horizontal overflow - content extends 50px beyond viewport causing horizontal scroll
- **Suggestion:** Reduce container width or enable text wrapping to fit viewport

### Warnings
- **Location:** Filter chips at top
- **Issue:** Touch targets are 44px (minimal) with no spacing between - risk of mis-taps
- **Suggestion:** Increase to 48px height and add 8px gap between chips
```

## Notes

- Uses Claude's vision capability
- Device-aware analysis (mobile vs desktop)
- WCAG 2.1 touch target requirement: 44x44px
- Checks layout adaptation and spacing
- Part of visual reviewer suite
