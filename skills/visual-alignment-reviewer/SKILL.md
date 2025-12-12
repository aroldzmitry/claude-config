---
name: visual-alignment-reviewer
description: Analyze screenshots for element alignment issues. Detects grid misalignment, off-center elements, uneven edges, and inconsistent vertical/horizontal alignment. Use when reviewing UI screenshots or during visual testing.
---

# Visual Alignment Reviewer

Analyze screenshots for alignment quality using vision capability. Check grid structure, vertical/horizontal alignment, centering, and edge consistency.

## Analysis Criteria

**Check for:**
- **Grid misalignment** - elements not following layout grid, columns/rows misaligned
- **Vertical alignment** - elements on same horizontal line have different vertical positions
- **Horizontal alignment** - elements in same column have different horizontal positions (left/right edges)
- **Centering issues** - elements meant to be centered are off-center (horizontally or vertically)
- **Edge alignment** - container edges don't align with child elements, inconsistent margins
- **Baseline misalignment** - text elements on same line have different baselines
- **Asymmetric layout** - unintentional asymmetry in symmetric designs

**Report exact misalignments** - specify pixel offsets when detected (e.g., "button 3px lower than adjacent button")

## Severity Classification

**Critical:**
- Obvious grid breaks disrupting visual structure
- Major centering issues in hero sections or key components
- Baseline misalignment in navigation or headers (professional appearance impact)
- Asymmetry in intentionally symmetric layouts

**Warning:**
- Minor alignment drift (1-2px off) in grouped elements
- Inconsistent edge alignment across similar components
- Vertical rhythm breaks in content sections
- Off-center elements in secondary UI areas

**Info:**
- Potential grid improvements
- Micro-alignment optimizations (< 1px)
- Suggestions for better visual flow
- Baseline consistency recommendations

## Output Format

```
## Alignment Analysis

**Severity Breakdown:**
- Critical: X
- Warning: X
- Info: X

### Critical Issues
- **Location:** [where in screenshot]
- **Issue:** [specific problem with measurements]
- **Suggestion:** [how to fix alignment]

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

- Report exact pixel offsets when detectable (e.g., "3px misalignment")
- Focus on visible, user-noticeable alignment issues
- Consider responsive breakpoints (mobile vs desktop may have different alignments intentionally)
- Distinguish intentional asymmetry from mistakes
- Check both element-to-element and element-to-container alignment
- If measurements unclear from screenshot, note assumption made
