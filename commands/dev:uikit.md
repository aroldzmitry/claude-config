---
description: Sync design tokens and components from Figma to code. Detects inconsistencies, auto-consolidates majorities, asks for ambiguous cases. Use after design updates or to generate UI kit.
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch, AskUserQuestion
model: sonnet
argument-hint: [figma-file-key | "auto" to use cached JSON]
---

# UI Kit Sync

## Input Sources

| Source | Usage |
|--------|-------|
| Figma file key | Fetch from API (requires token) |
| `auto` | Use cached `.claude/docs/FIGMA_TOKENS.json` |
| No argument | Prompt user to choose |

## Figma API

### Authentication

Figma Personal Access Token required. Ask user if not provided.

**Header:** `X-Figma-Token: {token}`

### Endpoints

| Endpoint | Data |
|----------|------|
| `/v1/files/{key}` | File structure, components, styles |
| `/v1/files/{key}/styles` | Published styles (colors, text, effects) |

Base URL: `https://api.figma.com`

## Workflow Phases

### Phase 1: Extract

1. **Get file key** — from argument or cached `FIGMA_TOKENS.json`
2. **Ask for token** — if not provided
3. **Fetch file data** — WebFetch to Figma API
4. **Parse tokens:**

| Token Type | Source |
|------------|--------|
| Colors | `fills`, `strokes` where type is `SOLID` |
| Typography | `style.fontFamily`, `fontSize`, `fontWeight`, `lineHeight` |
| Spacing | `itemSpacing` (gaps), `padding*` properties |
| Radii | `cornerRadius` |
| Shadows | `effects` where type is `DROP_SHADOW` |

5. **Save to** `.claude/docs/FIGMA_TOKENS.json`

### Phase 2: Analyze

1. **Find existing tokens:** Glob `**/*variables*.scss` or `**/*tokens*.ts`
2. **Find UI components:** Glob `**/ui/**/*.tsx` or `**/components/**/*.tsx`
3. **Extract patterns:** naming, structure, imports
4. **Build inventory:** colors, typography, spacing, radii, shadows

### Phase 3: Detect Inconsistencies

Classify each inconsistency:

| Pattern | Threshold | Action |
|---------|-----------|--------|
| Clear majority | >80% uses value A | AUTO-FIX to A |
| Strong preference | 65-80% uses A | AUTO-FIX, note in report |
| Ambiguous | 40-65% split | ASK user |
| Outlier | <20% uses value B | AUTO-FIX to majority |
| Novel value | Not in system | ASK: add or map? |

**Detection rules:**

- **Color drift**: visually similar colors (ΔE < 5) → consolidate to majority
- **Spacing anomalies**: outliers (15px among 16px) → normalize to grid
- **Typography drift**: same context, different weights → consolidate
- **Radius inconsistencies**: similar components, different radii → normalize

### Phase 4: Resolve

1. **Auto-fix** items >65% majority
2. **Ask user** for ambiguous (40-65%) via AskUserQuestion
3. Build consolidated token set

### Phase 5: Generate

**Outputs:**
- Update token file found in Phase 2 (CSS custom properties or TS constants)
- Generate React components in existing UI directory, matching project patterns

**Pattern matching:** Check existing components for import/export style, folder structure, TypeScript interfaces. Include all variants and states from Figma.

### Phase 6: Report

Output summary with sections:
- **Tokens:** counts by category (new/updated)
- **Auto-Consolidated:** table of normalized values with reasons
- **User Decisions:** table of ambiguous cases and choices
- **Files Modified:** list of changed files

## Token Format

Save to `.claude/docs/FIGMA_TOKENS.json` with keys: `colors[]`, `fonts{}`, `font_sizes_px[]`, `spacing{}`, `shadows[]`, `typography{}`

**Naming pattern:** `--{category}-{name}[-{variant}]`
- Colors: `--color-primary-500`, `--color-gray-100`
- Spacing: `--spacing-1` (4px), `--spacing-2` (8px)
- Radii: `--radius-sm`, `--radius-md`

## Rules

- Preserve existing semantic token names
- Follow existing code patterns exactly
- Show diff before modifying files
- Never store Figma token in files
- Never create tokens for one-off values
- Never skip confirmation for ambiguous cases

## Error Handling

| Error | Cause | Action |
|-------|-------|--------|
| 403 Forbidden | Invalid token or no access | Ask for valid token |
| 404 Not Found | Wrong file key | Ask user to verify key |
| 429 Rate Limit | Too many requests | Wait and retry |
| No design data | Missing JSON | Prompt for Figma key |
| Pattern conflict | Codebase inconsistent | Ask user which to follow |
