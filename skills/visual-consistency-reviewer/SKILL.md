---
name: visual-consistency-reviewer
description: Analyze screenshots for design system consistency. Detects component style drift, pattern inconsistencies, visual hierarchy breaks, and design token violations. Use when reviewing UI screenshots or during visual testing.
---

# Visual Consistency Reviewer

Analyze screenshots for design system consistency using vision capability. Check component matching, repeated patterns, style drift, and visual hierarchy adherence.

## Analysis Criteria

**Check for:**
- **Component style drift** - same component type with different styles (e.g., buttons with varying corner radius, shadows, or colors)
- **Pattern inconsistencies** - repeated UI patterns that differ (e.g., card layouts, list items, form fields)
- **Design token violations** - components not using standard colors, fonts, or sizing from design system
- **Visual hierarchy breaks** - inconsistent heading sizes, weight, or spacing across sections
- **Icon style mixing** - different icon styles (outlined vs filled, varying stroke widths)
- **Shadow inconsistencies** - varying elevation/shadow styles on similar components
- **Border style drift** - inconsistent border styles, widths, or colors across similar elements

**Report specific inconsistencies** - identify exact differences (e.g., "Button A has 8px radius, Button B has 12px radius")

## Severity Classification

**Critical:**
- Primary buttons with different styles across page
- Heading hierarchy breaks (h2 larger than h1)
- Mixed icon styles in same navigation/toolbar
- Color usage violating brand guidelines
- Inconsistent interactive states (hover, active, disabled)

**Warning:**
- Secondary component variations (cards, badges with slight differences)
- Minor shadow or border inconsistencies
- Pattern drift in less prominent UI areas
- Inconsistent spacing between similar component groups

**Info:**
- Potential design system improvements
- Standardization opportunities
- Minor visual hierarchy optimizations
- Suggestions for better pattern reuse

## Output Format

```
## Consistency Analysis

**Severity Breakdown:**
- Critical: X
- Warning: X
- Info: X

### Critical Issues
- **Location:** [where in screenshot]
- **Issue:** [specific inconsistency with examples]
- **Suggestion:** [how to standardize]

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

- Compare similar components and identify exact differences
- Reference design system principles (colors, typography, spacing, shadows)
- Focus on user-visible inconsistencies that affect perceived quality
- Distinguish intentional variations from mistakes
- Check both within-page and cross-section consistency
- Note if design system tokens are not being followed
- If component variations unclear from screenshot, note assumption made
