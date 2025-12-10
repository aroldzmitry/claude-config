# /docs:update

Generate/update project documentation optimized for Claude. Minimizes tokens via optimization pass on every run.

## Usage

```
/docs:update           # Incremental update + optimize existing docs
/docs:update --force   # Full regeneration + optimize
```

## Process

1. Analyze codebase and generate/update docs
2. **Optimization pass**: Read existing docs, remove duplicates, shorten examples (3-10 lines max), convert prose to tables
3. Generate `00-INDEX.md` with "when to use" guidance for each file

## Generated Files

| File | Source | Content |
|------|--------|---------|
| 00-INDEX.md | Auto | Navigation with "when to use" guidance |
| ARCHITECTURE.md | package.json, tsconfig | Tech stack, structure (minimal) |
| PATTERNS.md | src/ analysis | Code conventions (Q&A, 5-line examples) |
| COMPONENTS.md | src/components/ | UI components API (types only, 3-5 line examples) |
| SERVICES.md | src/services/ | Services API (signatures only, 3-5 line examples) |
| DESIGN_TOKENS.md | styles/, tokens/ | Design system (tables only) |
| BUSINESS_RULES.md | Template | User fills manually (preserved) |

## Example

```
/docs:update

docs:update complete (commit: abc1234)

Created: 00-INDEX.md, ARCHITECTURE.md
Updated: COMPONENTS.md (-120 tokens)
Optimized: PATTERNS.md (-85 tokens)
Skipped: BUSINESS_RULES.md (manual)

Total reduction: -205 tokens
```
