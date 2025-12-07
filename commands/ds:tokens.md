---
description: Sync design tokens from Figma API to project. Use when design tokens need updating or after Figma changes.
allowed-tools: WebFetch, Read, Write, Edit, Glob, Grep
model: sonnet
argument-hint: [figma-file-key]
---

# Design Tokens Sync

Fetch design tokens from Figma API and save to project documentation.

## Prerequisites

Figma Personal Access Token must be provided. Ask user for token if not given.

## Input

- `$ARGUMENTS` — Figma file key (optional, uses project default if exists)
- Project default: check `.claude/docs/FIGMA_TOKENS.json` for existing `file_key`

## Figma API Endpoints

| Endpoint | Data |
|----------|------|
| `/v1/files/{key}` | File structure, components, styles |
| `/v1/files/{key}/styles` | Published styles (colors, text, effects) |

Auth header: `X-Figma-Token: {token}`

## Extraction Flow

1. **Get file key** — from argument or existing FIGMA_TOKENS.json
2. **Ask for token** — if not provided, ask user
3. **Fetch file data** — WebFetch to `https://api.figma.com/v1/files/{key}`
4. **Fetch styles** — WebFetch to `https://api.figma.com/v1/files/{key}/styles`
5. **Extract tokens**:
   - Colors (from fills, strokes)
   - Typography (font families, sizes, weights, line heights)
   - Spacing (from auto-layout gaps, paddings)
   - Border radii
   - Shadows (from effects)
   - Stroke weights
6. **Deduplicate and sort** — by usage count
7. **Save to** `.claude/docs/FIGMA_TOKENS.json`
8. **Compare with** `src/app/styles/variables.scss` if exists
9. **Report changes**

## Token Structure

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
  "spacing": { "gaps_px": [...], "paddings_px": [...] },
  "shadows": [{ "name": "shadow-soft", "css": "..." }],
  "typography": { "h1": {...}, "body": {...} },
  "components": { "total_count": 0, "list": [] }
}
```

## Parsing Rules

### Colors
- Extract from `fills` and `strokes` where type is `SOLID`
- Convert RGBA to hex
- Count occurrences for `usage_count`
- Infer `semantic` from context (text colors, backgrounds, borders)

### Typography
- Group by font family
- Extract unique sizes, weights, line heights
- Map common patterns to semantic names (h1, h2, body, etc.)

### Spacing
- Extract from `itemSpacing` (gaps) and `padding*` properties
- Deduplicate and sort ascending

## Output

Save to: `.claude/docs/FIGMA_TOKENS.json`

Report format:
```
## Tokens Synced

**File:** {figma_file_name}
**Extracted:** {date}

### Summary
- Colors: {count}
- Fonts: {list}
- Font sizes: {count}
- Border radii: {count}
- Shadows: {count}
- Components: {count}

### Changes from Previous
- Added: {list}
- Removed: {list}
- Modified: {list}

### CSS Variable Comparison
{diff with variables.scss if exists}
```

## Rules

- DO: Ask for Figma token if not provided
- DO: Preserve existing semantic names when updating
- DO: Sort colors by usage_count descending
- DO: Report differences with previous extraction
- DON'T: Store Figma token in any file
- DON'T: Overwrite without showing diff first
- DON'T: Modify variables.scss (only compare)

## Error Handling

| Error | Action |
|-------|--------|
| 403 Forbidden | Token invalid or no access to file |
| 404 Not Found | File key incorrect |
| 429 Rate Limit | Wait and retry, or ask user to try later |
