---
description: "Generate/update project index optimized for Claude"
model: haiku
allowed-tools: "Read, Write, Edit, Glob, Grep, Bash"
---

# Project Index

Generate/update `.claude/proj_index/` docs optimized for LLM consumption (c7score).

## Process

1. **Discover project structure**: Glob all code files, detect languages/extensions, group by export patterns
   - Scan: `**/*.{ts,tsx,js,jsx,py,go,rs,java,rb,php}` etc.
   - Group by pattern: exported functions → API.md, exported classes → MODULES.md, types → TYPES.md
   - Detect config files: package.json, go.mod, Cargo.toml, pyproject.toml, etc.
   - Build path maps: `{symbol → file:line}` for references
2. **Decide what to document**: Keep ONLY what Claude needs for code generation/understanding
   - ALWAYS: ARCHITECTURE.md (stack, commands, structure), PATTERNS.md (how to X?)
   - IF found: API.md (exported functions), MODULES.md (classes/modules), TYPES.md (interfaces/types)
   - SKIP: implementation details, private code, tests (unless test patterns are critical)
3. Generate/update files using path maps from step 1
4. Validate file references (check existence, auto-fix where possible)
5. Optimize existing docs (remove duplicates, file paths over code snippets)
6. Create 00-INDEX.md with generated doc list
7. Report (langs detected, docs created, broken refs)

## Frontmatter

Each generated file includes:
```yaml
---
generated: 2024-12-08
---
```

## Generated Files (Dynamic)

Generated docs vary by project. Always create:

### 00-INDEX.md

Main navigation listing ONLY created docs:
```markdown
# {Project}

{One sentence from README or inferred}

## Read Order

1. **[ARCHITECTURE](./ARCHITECTURE.md)** — Stack, structure, commands
2. **[PATTERNS](./PATTERNS.md)** — How to create/modify code
{3-N. Generated docs based on discovery}

## Languages

{Detected: TypeScript 45%, Python 30%, Go 25%}

## Key Directories

{Top 5-10 dirs by file count}

## Commands

{From package.json scripts, Makefile, etc.}
```

### ARCHITECTURE.md (ALWAYS)

**Auto-detect from**:
- Config files: package.json, go.mod, Cargo.toml, pyproject.toml, etc.
- Folders: src/, cmd/, pkg/, app/, lib/, etc.
- Build tools: vite.config, webpack, tsconfig, etc.

**Contains**: Languages, frameworks, build tools, project structure, commands, aliases

### PATTERNS.md (ALWAYS)

**Auto-detect from**: Code analysis (exported functions, common patterns, file naming)

**c7score Q&A format**:
- Q: How to add new {detected pattern}? → file ref
- Q: How to {common task}? → file ref

**Rules**: 1-2 sentences max, file paths only, no code

### API.md (IF public exports found)

**Trigger**: Exported functions in `**/*.{ts,js,py,go,rs}`

**Contains**: Function signatures, grouped by file/module, file refs

### MODULES.md (IF classes/modules found)

**Trigger**: `export class`, `class`, `module`, `package` in code

**Contains**: Class/module list, public methods, file refs

### TYPES.md (IF types/interfaces found)

**Trigger**: `interface`, `type`, `struct`, `dataclass` in TypeScript/Go/Rust/Python

**Contains**: Type definitions table, file refs

### BUSINESS_RULES.md (NEVER auto-generated)

Empty template if missing, user fills manually.

## File Reference Validation

After generating/updating docs (step 5), validate all file path references:

1. Scan docs for file paths: `src/path/file.ext` or `src/path/file.ext:line-range`
2. Check each path exists using Glob
3. Auto-fix broken paths:
   - Search for similar filenames with Glob
   - Update if single match found
   - Flag for manual review if multiple/no matches
4. Report validation results

## Optimization Pass

Before generating 00-INDEX.md, optimize existing `.claude/proj_index/` docs:

1. Read each file
2. Replace ALL code snippets with file paths (project-relative)
3. Remove duplicate content
4. Remove prose, keep minimal descriptions
5. Convert lists to tables where applicable
6. Remove unused entries
7. Rewrite with optimized content
8. Preserve frontmatter/structure

File path format: `src/path/file.ts` or `src/path/file.ts:25-40`

## c7score Principles

- Question-based headers
- File paths instead of code (5x token reduction)
- Clear hierarchy (H1 → H2 → H3)
- Tables over lists
- Project-relative paths: `src/path/file.ts:line-range`

## Full Scan

Always scans entire project and regenerates all docs. No git tracking, no incremental updates.

## Output

```
proj:create-index complete

Languages: TypeScript 60%, JavaScript 25%, Python 15%
Structure: 145 code files, 23 exports detected
Created: 00-INDEX.md, ARCHITECTURE.md, PATTERNS.md, API.md, TYPES.md
Skipped: MODULES.md (no classes found), BUSINESS_RULES.md (manual)
Validated: 32 file references
  - Fixed: 2 auto-corrected paths
  - Broken: 1 (see below)

Broken references:
- API.md:14 → utils/deprecated.ts (not found)

Total: 5 docs
```

## Error Handling

- No code files found → error, stop
- Docs without frontmatter → add frontmatter

## Rules

- **Universal**: Works for ANY language/framework — no hardcoded assumptions
- **Structure-first**: Step 3 discovery is MANDATORY — scan before generating
- **Claude-focused**: Document ONLY what helps Claude generate/understand code — skip implementation details
- **Dynamic docs**: Generate only relevant docs (skip MODULES.md if no classes, etc.)
- Optimize for tokens, not human readability
- No dialogs — auto-detect everything
- Preserve manual edits in BUSINESS_RULES.md only
- File paths over code, tables over prose, no duplicates
- c7score: question-driven, file-reference-first, minimal
- Always run optimization pass
- Generate 00-INDEX.md (NOT llms.txt)
- NEVER embed code snippets — project-relative paths with optional lines
- NEVER guess paths — use lookup maps from structure scan
