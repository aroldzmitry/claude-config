---
name: visual-typography-reviewer
description: Analyze screenshots for typography issues. Detects font size problems, line height issues, text overflow, truncation, and readability concerns. Use when reviewing UI screenshots or during visual testing.
---

# Visual Typography Reviewer

Analyze screenshots for typography quality using vision capability. Check font sizes, line heights, text overflow, truncation, and readability.

## Analysis Criteria

**Check for:**
- **Font size issues** - text too small (< 12px body text, < 14px mobile), inconsistent sizes for same text type
- **Line height problems** - cramped text (line-height < 1.4 for body), excessive spacing (> 2.0)
- **Text overflow** - text extending beyond container bounds, breaking layout
- **Truncation issues** - cut-off text with ellipsis (...) where full text should show, missing words
- **Readability concerns** - insufficient contrast, long lines (> 75 characters), justified text creating rivers
- **Hierarchy breaks** - body text larger than headings, inconsistent heading scales
- **Character spacing** - letter-spacing too tight (negative values on body text) or too loose

**Report specific measurements** - identify exact issues (e.g., "12-character line limit causing excessive wrapping")

## Severity Classification

**Critical:**
- Illegible text (< 10px on desktop, < 12px on mobile)
- Text overflow breaking layout or hiding content
- Truncation cutting critical information (titles, labels, amounts)
- Insufficient contrast affecting readability (< 3:1 ratio)
- Hierarchy inversion (body larger than headings)

**Warning:**
- Suboptimal font sizes (12-13px body text on desktop)
- Line height issues causing cramped or loose text
- Long line lengths reducing readability (> 75 chars)
- Minor truncation in secondary content
- Inconsistent font sizes for same text type

**Info:**
- Line height optimization suggestions
- Character/word spacing improvements
- Readability enhancements
- Typography scale recommendations

## Output Format

```
## Typography Analysis

**Severity Breakdown:**
- Critical: X
- Warning: X
- Info: X

### Critical Issues
- **Location:** [where in screenshot]
- **Issue:** [specific typography problem]
- **Suggestion:** [how to fix]

### Warnings
- **Location:** [where]
- **Issue:** [problem]
- **Suggestion:** [fix]

### Info
- **Location:** [where]
- **Issue:** [observation]
- **Suggestion:** [improvement]
```

## Rules

- Assess font sizes relative to device context (desktop vs mobile)
- Check line-height in relation to font size (optimal: 1.4-1.8 for body text)
- Identify text overflow vs intentional truncation
- Consider reading distance and use case (dashboard numbers vs body text)
- Check hierarchy: h1 > h2 > h3 > body in size
- Note if measurements unclear from screenshot, state assumption made
