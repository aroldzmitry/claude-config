---
name: visual-spacing-reviewer
description: Analyze screenshots for spacing, margin, and padding issues. Detects crowding, inconsistent gaps, and non-token spacing values. Use when reviewing UI screenshots or during visual testing.
---

# Visual Spacing Reviewer

Analyze screenshots for spacing quality using vision capability. Check margins, padding, gaps, and whitespace against project spacing tokens.

## Analysis Criteria

**Approved spacing tokens (px):** 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 26, 32, 40

**Check for:**
- **Token violations** - spacing values not in approved list (flag 5px, 7px, 11px, 13px, 17px, 18px, 48px, etc.)
- **Crowding** - elements too close (< 4px gaps), affecting touch targets and readability
- **Inconsistent gaps** - similar elements with different spacing (e.g., card A has 16px padding, card B has 12px)
- **Whitespace imbalance** - uneven spacing around sections or components
- **Padding asymmetry** - different padding on sides of same element without design intent

**Report exact measurements** - specify pixel values when detected (e.g., "13px margin between header and content")

## Severity Classification

**Critical:**
- Crowding causing touch target issues (gaps < 4px on mobile)
- Major token violations (values far from any token like 13px, 17px, 48px)
- Inconsistent spacing breaking visual rhythm across page

**Warning:**
- Minor token violations (values close to tokens like 18px vs 16px or 20px)
- Inconsistent gaps between similar elements
- Padding asymmetry without clear intent

**Info:**
- Potential whitespace improvements
- Suggestions for better visual rhythm
- Minor spacing optimizations

## Output Format

```
## Spacing Analysis

**Severity Breakdown:**
- Critical: X
- Warning: X
- Info: X

### Critical Issues
- **Location:** [where in screenshot]
- **Issue:** [specific problem with exact px value]
- **Suggestion:** [how to fix using approved tokens]

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

- Always report exact pixel measurements when detectable
- Compare spacing against approved token list
- Focus on user-impacting issues (touch targets, readability, consistency)
- Suggest specific token values for fixes (e.g., "change 13px to 12px or 16px")
- If measurements unclear from screenshot, note assumption made
