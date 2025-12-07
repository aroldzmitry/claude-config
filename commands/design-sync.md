---
description: Sync design tokens and components from Figma to code. Detects inconsistencies, auto-consolidates majorities, asks for ambiguous cases. Use after design updates or to generate UI kit.
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch, AskUserQuestion
model: sonnet
argument-hint: [figma-url | "auto" to use existing JSON]
---

# Design Sync

Synchronize design tokens and components from Figma designs to production code with intelligent consolidation.

## Input Sources

| Source | Usage |
|--------|-------|
| Figma URL | Direct fetch via API (requires token) |
| `auto` | Use existing `.claude/docs/FIGMA_TOKENS.json` and `FIGMA_SCREENS.json` |
| No argument | Prompt user to choose source |

## Workflow Phases

### Phase 1: Analyze

1. **Load design data**:
   - If Figma URL: run `/ds:tokens` first, then read JSON outputs
   - If `auto`: read `.claude/docs/FIGMA_TOKENS.json` and `FIGMA_SCREENS.json`

2. **Scan existing codebase**:
   - Read `src/app/styles/variables.scss` for current tokens
   - Glob `src/shared/ui/**/*.tsx` for existing components
   - Extract patterns: naming conventions, structure, imports

3. **Build token inventory**:
   - Colors: hex values, usage counts, semantic context
   - Typography: fonts, sizes, weights, line heights
   - Spacing: gaps, paddings, margins
   - Radii: border-radius values
   - Shadows: effect definitions

### Phase 2: Detect Inconsistencies

Analyze patterns and classify each inconsistency:

| Pattern | Threshold | Action |
|---------|-----------|--------|
| Clear majority | >80% uses value A | AUTO-FIX to A |
| Strong preference | 65-80% uses A | AUTO-FIX to A, note in report |
| Ambiguous | 40-65% split | ASK user |
| Outlier | <20% uses value B | AUTO-FIX to majority |
| Novel value | Not in existing system | ASK: add or map? |

**Detection rules:**

- **Color drift**: Similar colors (ΔE < 5) → consolidate
- **Spacing anomalies**: 15px among 16px patterns → normalize
- **Typography drift**: font-weight 500 vs 600 in same context → consolidate
- **Radius inconsistencies**: 6px vs 8px in similar components → normalize

**ΔE calculation for colors:**

```
ΔE = sqrt((R1-R2)² + (G1-G2)² + (B1-B2)²) / 4.42
```

- ΔE < 1: imperceptible
- ΔE 1-2: barely noticeable
- ΔE 2-5: noticeable on close inspection
- ΔE > 5: clearly different

### Phase 3: Resolve

1. **Auto-fix** items with clear majority (>65%)
2. **Ask user** for ambiguous cases using AskUserQuestion:

```
Found color inconsistency:

  #f3f7ff (557 uses) - background-primary-light
  #f2f7ff (60 uses)  - background-primary-subtle

These colors are visually similar (ΔE = 0.8).

Options:
  [1] Use #f3f7ff everywhere (recommended)
  [2] Use #f2f7ff everywhere
  [3] Keep both as separate tokens
```

3. **Build consolidated token set**
4. **Generate change report**

### Phase 4: Generate

Create or update files following existing project patterns:

**Token outputs:**

| File | Content |
|------|---------|
| `src/app/styles/variables.scss` | CSS custom properties |
| `src/shared/design-tokens/tokens.ts` | TypeScript token constants (if pattern exists) |

**Component outputs:**

| Location | Content |
|----------|---------|
| `src/shared/ui/{component}/` | React component following project patterns |

**Follow existing patterns:**

- Import style: check existing components for absolute imports
- Export style: check for named vs default exports
- Styling approach: CSS modules, styled-components, or inline
- TypeScript: proper interfaces for props

### Phase 5: Report & Iterate

Output summary:

```markdown
## Design Sync Complete

### Tokens
- Colors: {count} ({new} new, {changed} updated, {removed} removed)
- Typography: {count}
- Spacing: {count}
- Radii: {count}

### Auto-Consolidated
| Original | Normalized To | Reason |
|----------|---------------|--------|
| #f2f7ff (60×) | #f3f7ff | 90% majority |
| 15px gap | 16px | Outlier in 8px grid |

### User Decisions
| Issue | Choice |
|-------|--------|
| Primary blue shade | Use #2563eb |

### Files Modified
- src/app/styles/variables.scss
- src/shared/ui/Button/Button.tsx

### Next Steps
{suggestions for manual review}
```

User can then provide feedback for iterative refinement.

## Token Naming Convention

Follow existing `variables.scss` patterns:

```scss
// Colors
--color-primary-500: #2563eb;
--color-gray-100: #f3f4f6;

// Typography
--font-family-primary: 'Poppins', sans-serif;
--font-size-sm: 14px;
--font-weight-medium: 500;
--line-height-normal: 1.5;

// Spacing (8px grid)
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;

// Radii
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
```

## Component Generation Rules

When generating components:

1. **Check existing patterns** in `src/shared/ui/`
2. **Match structure**: folder layout, file naming
3. **Match imports**: use same import style
4. **Match types**: follow existing interface patterns
5. **Include variants**: all Figma component variants
6. **Include states**: hover, active, disabled, focus

## Rules

### DO
- Run `/ds:tokens` first if Figma URL provided
- Auto-fix when >65% usage favors one value
- Ask user for 40-65% ambiguous splits
- Preserve semantic token names from existing system
- Follow existing code patterns exactly
- Report all changes with before/after

### DON'T
- Create tokens for one-off values
- Invent new naming conventions
- Modify files without showing diff first
- Skip user confirmation for ambiguous cases
- Generate components without checking patterns
- Add extra features not in design

## Error Handling

| Error | Action |
|-------|--------|
| No design data | Prompt user to run `/ds:tokens` first or provide Figma URL |
| No existing tokens | Create fresh token file, note as first sync |
| Pattern conflict | Ask user which pattern to follow |
| API error | Show error, suggest retry or use cached JSON |
