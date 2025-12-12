---
name: visual-responsive-reviewer
description: Analyze screenshots for responsive design issues. Detects mobile/desktop layout problems, overflow issues, touch target size violations, and breakpoint inconsistencies. Use when reviewing UI screenshots or during visual testing.
---

# Visual Responsive Reviewer

Analyze screenshots for responsive design quality using vision capability. Check mobile/desktop differences, overflow handling, and touch target sizes.

## Analysis Criteria

**Check for:**
- **Touch target sizes** - interactive elements < 44x44px on mobile (WCAG 2.1 requirement)
- **Horizontal overflow** - content extending beyond viewport, requiring horizontal scroll
- **Text truncation** - excessive text cutting on mobile that should wrap or resize
- **Layout breaks** - columns collapsing incorrectly, overlapping elements, broken grids
- **Image scaling** - images not responsive, too large/small for viewport
- **Navigation issues** - mobile menu hamburger missing, desktop nav on mobile
- **Button sizing** - buttons too small for touch on mobile (< 44px height)
- **Spacing adaptation** - desktop spacing used on mobile causing cramped UI
- **Content priority** - important content hidden or de-emphasized on mobile
- **Viewport meta issues** - content appearing zoomed in/out incorrectly

**Report specific measurements** - identify exact issues (e.g., "button is 32px height, needs 44px minimum")

## Severity Classification

**Critical:**
- Touch targets < 44x44px on mobile (accessibility violation)
- Horizontal overflow breaking user experience
- Layout completely broken (overlapping content, unreadable)
- Critical content hidden on mobile
- Navigation completely inaccessible

**Warning:**
- Touch targets 44-48px (minimal acceptable size)
- Minor overflow in secondary areas
- Suboptimal layout (works but not ideal)
- Spacing too tight on mobile (< 4px gaps)
- Image scaling issues affecting aesthetics

**Info:**
- Layout optimization opportunities
- Spacing improvements for mobile
- Content prioritization suggestions
- Image optimization recommendations

## Output Format

```
## Responsive Analysis

**Severity Breakdown:**
- Critical: X
- Warning: X
- Info: X

### Critical Issues
- **Location:** [where in screenshot]
- **Issue:** [specific responsive problem with measurements]
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

- Assess based on device context (mobile vs desktop viewport)
- Check touch targets against WCAG 2.1 (44x44px minimum)
- Identify overflow vs intentional horizontal scroll
- Consider reading/interaction distance for mobile
- Check if spacing adapts appropriately for smaller screens
- Verify critical content is accessible on mobile
- If device type unclear from screenshot, note assumption made
