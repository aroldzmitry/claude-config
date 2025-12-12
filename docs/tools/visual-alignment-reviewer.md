# visual-alignment-reviewer

Analyze screenshots for element alignment issues including grid structure, centering, and edge consistency.

## Purpose

Detect alignment quality issues in UI screenshots including grid misalignment, off-center elements, vertical/horizontal inconsistencies, and baseline problems.

## Usage

```
Use the visual-alignment-reviewer skill when analyzing UI screenshots
```

Automatically invoked by `/visual:test` command or used directly for screenshot review.

## Parameters

**Input:** Screenshot image file path

## Output

Structured analysis with severity breakdown:
- **Critical:** Grid breaks, major centering issues, baseline misalignment in headers, asymmetry in symmetric layouts
- **Warning:** Minor drift (1-2px), inconsistent edge alignment, vertical rhythm breaks
- **Info:** Grid improvements, micro-alignments, flow suggestions

Each finding includes:
- Location in screenshot
- Issue description with pixel offsets
- Fix suggestion

## Example

Input: `/path/to/dashboard-desktop.png`

Output:
```
## Alignment Analysis

**Severity Breakdown:**
- Critical: 1
- Warning: 2
- Info: 1

### Critical Issues
- **Location:** Navigation menu items
- **Issue:** Baseline misalignment - "Dashboard" text is 2px lower than "Reports" text
- **Suggestion:** Align all navigation items to same baseline

### Warnings
- **Location:** Card grid in main content
- **Issue:** Third card column is 3px offset to the right compared to first two columns
- **Suggestion:** Align all cards to consistent grid columns

- **Location:** Sidebar section headers
- **Issue:** Inconsistent left edge - first header 16px from edge, second header 18px
- **Suggestion:** Standardize all section headers to 16px left margin
```

## Notes

- Uses Claude's vision capability
- Reports exact pixel offsets when detectable
- Considers responsive differences (mobile vs desktop)
- Distinguishes intentional vs unintentional asymmetry
- Part of visual reviewer suite
