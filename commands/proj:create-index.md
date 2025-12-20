---
description: "Generate/update project index optimized for Claude"
model: haiku
allowed-tools: "Read, Write, Edit, Glob, Grep, Bash"
---

# Project Index

Generate/update `.claude/proj_index/` docs using c7score format (question-based headers, file paths over code, tables over lists, clear hierarchy H1→H2→H3, 5x token reduction).

**Full scan**: Always regenerate all docs from scratch. No git tracking, no incremental updates.

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

## Generated Files

| File | When | Contains |
|------|------|----------|
| **00-INDEX.md** | Always | Navigation with read order, detected languages %, key directories, commands from package.json/Makefile |
| **ARCHITECTURE.md** | Always | Languages, frameworks, build tools, structure (auto-detect from config files, folders, build configs) |
| **PATTERNS.md** | Always | Q&A format: "How to add new X?" → file ref. 1-2 sentences max, file paths only |
| **API.md** | If exports found | Function signatures grouped by file/module |
| **MODULES.md** | If classes found | Class/module list with public methods |
| **TYPES.md** | If types found | Type definitions table (interface, type, struct, dataclass) |
| **BUSINESS_RULES.md** | Never auto | Empty template if missing, user fills manually |

## File Reference Validation

1. Scan docs for file paths (`src/path/file.ts` or `src/path/file.ts:25-40`)
2. Check each path exists using Glob
3. Auto-fix: search similar filenames, update if single match, flag if multiple/none
4. Report validation results

## Optimization Pass

Before generating 00-INDEX.md, optimize existing `.claude/proj_index/` docs:
- Replace ALL code snippets with project-relative file paths
- Remove duplicate content and prose
- Convert lists to tables where applicable
- Preserve frontmatter/structure

## Output

One-line per category: Languages (with %), Structure (file/export counts), Created/Skipped docs, Validated refs (fixed count, broken list with file:line → missing path).

## Error Handling

- No code files found → output "Error: No code files found in project" → stop
- Docs without frontmatter → add frontmatter automatically

## Rules

- **Universal**: Works for ANY language/framework — no hardcoded assumptions
- **Structure-first**: Step 1 discovery is MANDATORY — scan before generating
- **Claude-focused**: Document ONLY what helps Claude generate/understand code
- **Dynamic docs**: Generate only relevant docs (skip MODULES.md if no classes, etc.)
- **Auto-detect**: No user dialogs — infer everything from codebase analysis
- Optimize for tokens, not human readability
- Preserve manual edits in BUSINESS_RULES.md only
- File path format: `src/path/file.ts:line-range` (project-relative)
- NEVER embed code snippets
- NEVER guess paths — use lookup maps from structure scan
- Always run optimization pass
- Generate 00-INDEX.md (NOT llms.txt)
