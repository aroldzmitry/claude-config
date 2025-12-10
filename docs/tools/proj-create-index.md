# /proj:create_index

Generate/update project index optimized for Claude. Minimizes tokens via optimization pass on every run.

## Usage

```
/proj:create_index           # Incremental update + optimize existing index
/proj:create_index --force   # Full regeneration + optimize
```

## Process

1. Analyze codebase and generate/update index
2. **Optimization pass**: Replace code snippets with file paths, remove duplicates, convert prose to tables
3. Generate `00-INDEX.md` with "when to use" guidance for each file

## Generated Files

| File | Source | Content |
|------|--------|---------|
| 00-INDEX.md | Auto | Navigation with "when to use" guidance |
| ARCHITECTURE.md | package.json, tsconfig | Tech stack, structure (minimal) |
| PATTERNS.md | src/ analysis | Code conventions (Q&A, file references instead of examples) |
| COMPONENTS.md | src/components/ | UI components API (types + file paths for usage) |
| SERVICES.md | src/services/ | Services API (signatures + file paths for usage) |
| DESIGN_TOKENS.md | styles/, tokens/ | Design system (tables only) |
| BUSINESS_RULES.md | Template | User fills manually (preserved) |

**Token optimization**: Uses project-relative file paths (`src/components/Button.tsx:15-20`) instead of embedding code snippets. Achieves ~5x token reduction.

## Example

```
/proj:create_index

proj:create_index complete (commit: abc1234)

Created: 00-INDEX.md, ARCHITECTURE.md
Updated: COMPONENTS.md (-120 tokens)
Optimized: PATTERNS.md (-85 tokens)
Skipped: BUSINESS_RULES.md (manual)

Total reduction: -205 tokens
```
