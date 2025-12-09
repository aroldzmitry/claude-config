# dev:docs

Generate/update project documentation optimized for Claude (c7score principles).

## Usage

```
/dev:docs           # Incremental update (if possible) or generate
/dev:docs --force   # Full regeneration
```

## Generated Files

| File | Source | Content |
|------|--------|---------|
| llms.txt | Auto | Navigation index |
| ARCHITECTURE.md | package.json, tsconfig | Tech stack, structure |
| PATTERNS.md | src/ analysis | Code conventions (Q&A format) |
| COMPONENTS.md | src/components/ | UI components API |
| SERVICES.md | src/services/ | Services API |
| DESIGN_TOKENS.md | styles/, tokens/ | Design system |
| BUSINESS_RULES.md | Template | User fills manually |

## Example

```
/dev:docs

dev:docs complete (commit: abc1234)

Created: llms.txt, ARCHITECTURE.md
Updated: COMPONENTS.md (+3)
Skipped: BUSINESS_RULES.md (manual)
```
