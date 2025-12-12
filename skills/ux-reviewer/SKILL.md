---
name: ux-reviewer
description: "Evaluate UX/UI designs for usability, accessibility (WCAG AA), and conversion optimization. Use when reviewing interfaces, mockups, wireframes, or analyzing user flows."
---

# UX Reviewer

Evaluate interfaces and user flows for usability issues, accessibility compliance, and conversion optimization.

## Instructions

Analyze provided interface (screenshot/mockup/description) against criteria below. For each issue: describe problem, explain impact, suggest fix.

**Usability Analysis:**
- Navigation clarity: can users find what they need?
- Visual hierarchy: does design guide attention effectively?
- Consistency: do similar elements behave similarly?
- Error prevention: does design prevent mistakes?
- Feedback: does system inform users about actions/status?
- Recognition vs recall: does UI show options instead of requiring memory?

**WCAG 2.2 AA Compliance (POUR):**
- Perceivable: alt text present, color contrast ≥4.5:1 for text, text resizable, multimedia has captions
- Operable: keyboard accessible, focus visible, touch targets ≥44x44px, no time limits or provide controls
- Understandable: labels clear, navigation predictable, error messages suggest fixes, consistent terminology
- Robust: semantic HTML used, ARIA attributes where needed, assistive tech compatible

**Mobile & Touch Accessibility:**
- Touch targets: minimum 44x44px with adequate spacing
- Gesture alternatives: tap/click options for swipe/pinch actions
- Orientation: works in portrait and landscape
- Touch-specific: long-press, swipe, pinch interactions accessible

**Conversion Optimization:**
- Friction points: unnecessary steps, confusing CTAs, form complexity
- Trust signals: security indicators, social proof, clear policies
- Value proposition: is benefit immediately clear?
- CTA visibility: primary actions stand out

## Output Format

```
# UX Review: [Interface Name]

## Critical Issues
- [Issue]: [Problem]. Impact: [How it affects users]. Fix: [Specific solution].

## Usability Findings
- [Issue]: [Problem]. Impact: [User consequence]. Fix: [Action].

## Accessibility (WCAG AA)
- Perceivable: [Issues found or ✓ Compliant]
- Operable: [Issues found or ✓ Compliant]
- Understandable: [Issues found or ✓ Compliant]
- Robust: [Issues found or ✓ Compliant]

## Mobile & Touch
- [Issue]: [Problem]. Fix: [Solution].

## Conversion Optimization
- [Friction point]: [Impact]. Suggestion: [Improvement].

## Priority Recommendations
1. [Critical/High] [Action] - [Expected impact]
2. [Medium] [Action] - [Expected impact]
3. [Low] [Action] - [Nice-to-have benefit]
```

## Rules

- Focus on specific, actionable findings - not generic advice
- Explain WHY each issue matters to users
- Prioritize issues by impact on user experience
- Reference WCAG criteria when noting accessibility issues
- If compliance unclear from provided materials, note assumptions made
