---
description: Sync design tokens and components from Figma to code. Detects inconsistencies, auto-consolidates majorities, asks for ambiguous cases. Use after design updates or to generate UI kit.
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch, AskUserQuestion
model: sonnet
argument-hint: [figma-file-key | "auto" to use cached JSON]
---

# UI Kit Sync

Synchronize design tokens and components from Figma to production code with intelligent consolidation.

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

1. **Scan existing codebase:**
   - Read `src/app/styles/variables.scss` for current tokens
   - Glob `src/shared/ui/**/*.tsx` for existing components
   - Extract patterns: naming, structure, imports

2. **Build inventory:**
   - Colors: hex, usage count, semantic context
   - Typography: fonts, sizes, weights, line heights
   - Spacing: gaps, paddings, margins
   - Radii, shadows

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

- **Color drift**: ΔE < 5 → consolidate
- **Spacing anomalies**: 15px among 16px → normalize to grid
- **Typography drift**: weight 500 vs 600 same context → consolidate
- **Radius inconsistencies**: 6px vs 8px similar components → normalize

**ΔE (color difference):**
```
ΔE = sqrt((R1-R2)² + (G1-G2)² + (B1-B2)²) / 4.42
```
- < 1: imperceptible
- 1-2: barely noticeable
- 2-5: noticeable on inspection
- > 5: clearly different

### Phase 4: Resolve

1. **Auto-fix** items >65% majority
2. **Ask user** for ambiguous (40-65%):

```
Color inconsistency:
  #f3f7ff (557 uses)
  #f2f7ff (60 uses)
  ΔE = 0.8 (imperceptible)

Options:
  [1] Use #f3f7ff (recommended)
  [2] Use #f2f7ff
  [3] Keep both separate
```

3. Build consolidated token set

### Phase 5: Generate

**Token outputs:**

| File | Content |
|------|---------|
| `src/app/styles/variables.scss` | CSS custom properties |
| `src/shared/design-tokens/tokens.ts` | TypeScript constants (if exists) |

**Component outputs:**

| Location | Content |
|----------|---------|
| `src/shared/ui/{component}/` | React component matching project patterns |

**Pattern matching:**
- Check existing components for import/export style
- Match folder structure and file naming
- Follow existing TypeScript interfaces
- Include all variants and states from Figma

### Phase 6: Report

```markdown
## UI Kit Sync Complete

### Tokens
- Colors: {count} ({new} new, {changed} updated)
- Typography: {count}
- Spacing: {count}
- Radii: {count}

### Auto-Consolidated
| Original | Normalized | Reason |
|----------|------------|--------|
| #f2f7ff (60×) | #f3f7ff | 90% majority |
| 15px gap | 16px | 8px grid |

### User Decisions
| Issue | Choice |
|-------|--------|
| Primary blue | #2563eb |

### Files Modified
- src/app/styles/variables.scss
- src/shared/ui/Button/Button.tsx
```

## Token JSON Schema

```json
{
  "source": "Figma API",
  "file_key": "...",
  "extracted_at": "YYYY-MM-DD",
  "colors": [{ "hex": "#000000", "usage_count": 100, "semantic": "text-primary" }],
  "fonts": { "primary": "Poppins", "secondary": "Inter" },
  "font_sizes_px": [12, 14, 16, 20, 24, 32],
  "font_weights": [400, 500, 600],
  "line_heights_percent": [120, 130, 155],
  "border_radii_px": [4, 8, 12, 16],
  "spacing": { "gaps_px": [], "paddings_px": [] },
  "shadows": [{ "name": "shadow-soft", "css": "..." }],
  "typography": { "h1": {}, "body": {} }
}
```

## Token Naming Convention

```scss
// Colors
--color-primary-500: #2563eb;
--color-gray-100: #f3f4f6;

// Typography
--font-family-primary: 'Poppins', sans-serif;
--font-size-sm: 14px;
--font-weight-medium: 500;

// Spacing (8px grid)
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-4: 16px;

// Radii
--radius-sm: 4px;
--radius-md: 8px;
```

## Rules

### DO
- Ask for Figma token if not provided
- Auto-fix when >65% favors one value
- Ask user for 40-65% splits
- Preserve existing semantic names
- Sort colors by usage_count descending
- Follow existing code patterns exactly

### DON'T
- Store Figma token in any file
- Create tokens for one-off values
- Invent new naming conventions
- Modify files without showing diff
- Skip confirmation for ambiguous cases

## Error Handling

| Error | Cause | Action |
|-------|-------|--------|
| 403 Forbidden | Invalid token or no access | Ask for valid token |
| 404 Not Found | Wrong file key | Ask user to verify key |
| 429 Rate Limit | Too many requests | Wait and retry |
| No design data | Missing JSON | Prompt for Figma key |
| Pattern conflict | Codebase inconsistent | Ask user which to follow |
