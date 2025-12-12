# visual-typography-reviewer

Analyze screenshots for typography quality including font sizes, line heights, text overflow, and readability.

## Purpose

Detect typography issues in UI screenshots including illegible text, overflow problems, truncation, and readability concerns.

## Usage

```
Use the visual-typography-reviewer skill when analyzing UI screenshots
```

Automatically invoked by `/visual:test` command or used directly for screenshot review.

## Parameters

**Input:** Screenshot image file path

## Output

Structured analysis with severity breakdown:
- **Critical:** Illegible text (< 10px desktop, < 12px mobile), text overflow breaking layout, truncated critical info, insufficient contrast
- **Warning:** Suboptimal sizes, line height issues, long lines (> 75 chars), minor truncation
- **Info:** Optimization suggestions, readability enhancements

Each finding includes:
- Location in screenshot
- Specific typography problem
- Fix suggestion

## Example

Input: `/path/to/form-page.png`

Output:
```
## Typography Analysis

**Severity Breakdown:**
- Critical: 1
- Warning: 2
- Info: 1

### Critical Issues
- **Location:** Form field labels (mobile view)
- **Issue:** Font size 10px on mobile - illegible for users with vision impairments
- **Suggestion:** Increase to minimum 14px for mobile form labels

### Warnings
- **Location:** Transaction descriptions
- **Issue:** Line height 1.2 causing cramped text, reducing readability
- **Suggestion:** Increase line-height to 1.5 for better readability

- **Location:** Help text in sidebar
- **Issue:** Text line length 85 characters - exceeds optimal 75 char maximum
- **Suggestion:** Reduce container width or increase font size to limit line length
```

## Notes

- Uses Claude's vision capability
- Device-aware (mobile vs desktop thresholds)
- Checks hierarchy: h1 > h2 > h3 > body
- Optimal line-height: 1.4-1.8 for body text
- Part of visual reviewer suite
