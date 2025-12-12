---
name: visual-color-reviewer
description: Analyze screenshots for color and accessibility issues. Detects WCAG contrast violations, color consistency problems, and accessibility compliance issues. Use when reviewing UI screenshots or during visual testing.
---

# Visual Color Reviewer

Analyze screenshots for color quality and accessibility using vision capability. Check WCAG contrast ratios, color consistency, and accessibility compliance.

## Analysis Criteria

**Check for:**
- **Contrast violations** - text/background combinations below WCAG AA standards (< 4.5:1 normal text, < 3:1 large text)
- **Color consistency** - same semantic colors used differently (e.g., primary blue varying across buttons)
- **Color-only information** - critical info conveyed by color alone without text/icons (fails accessibility)
- **Link visibility** - links indistinguishable from body text without underline
- **Error states** - error messages relying only on red color without icons/text
- **Disabled states** - insufficient visual indication beyond color (low contrast)
- **Brand color drift** - colors deviating from brand palette
- **Focus indicators** - invisible or low-contrast focus states for keyboard navigation

**Report contrast ratios** - specify estimated ratios when detectable (e.g., "contrast ratio ~2.8:1, needs 4.5:1")

## Severity Classification

**Critical:**
- WCAG AA contrast failures on primary content (< 4.5:1 normal text, < 3:1 large text)
- Color-only critical information (status, errors without text)
- Invisible focus indicators (accessibility barrier)
- Links indistinguishable from text
- Error messages with insufficient contrast

**Warning:**
- Borderline contrast (4.5-5.0:1 for small text)
- Color inconsistencies in secondary UI
- Disabled state visibility issues
- Brand color variations
- Suboptimal focus indicator contrast

**Info:**
- WCAG AAA opportunities (> 7:1 contrast)
- Color palette optimization
- Semantic color suggestions
- Enhanced accessibility recommendations

## Output Format

```
## Color Analysis

**Severity Breakdown:**
- Critical: X
- Warning: X
- Info: X

### Critical Issues
- **Location:** [where in screenshot]
- **Issue:** [specific color/contrast problem with ratio]
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

- Estimate contrast ratios where possible (note as estimates)
- Check both light and dark UI elements
- Identify color-only information patterns
- Verify focus states are visible
- Compare similar elements for color consistency
- Reference WCAG 2.1 AA standards (4.5:1 normal text, 3:1 large text, 3:1 UI components)
- If exact colors/ratios unclear from screenshot, note assumption made
