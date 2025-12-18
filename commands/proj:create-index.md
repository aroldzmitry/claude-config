---
description: "Generate/update project index optimized for Claude"
argument-hint: "[--force]"
model: haiku
allowed-tools: "Read, Write, Edit, Glob, Grep, Bash"
---

# Project Index

Generate/update `.claude/proj_index/` docs optimized for LLM consumption (c7score).

## Process

1. Check `.claude/proj_index/`, read `last_commit` from frontmatter
2. If `last_commit` exists → `git diff {last_commit}..HEAD`, if none or `--force` → full regeneration
3. **Pre-scan structure**: Build actual path maps via Glob
   - Components: `src/components/**/*.tsx` → record all paths
   - Services: `src/services/**/*.ts` → record all paths
   - Stories: `**/stories/**/*.tsx` → record actual location
   - Repositories: `src/repositories/**/*.ts` → record all paths
   - Store hooks: `**/store/**/*.ts`, `**/hooks/**/*.ts` → record location
   - Build lookup maps: `{ComponentName → actualPath}` for reference during generation
4. Analyze codebase using path maps from step 3
5. Generate/update files (use path maps to write correct references)
6. Validate file references (check existence, auto-fix where possible)
7. Optimize existing docs (remove duplicates, file paths over code snippets)
8. Create 00-INDEX.md
9. Report (include broken reference count)

## Versioning

Frontmatter in each file:
```yaml
---
last_commit: abc1234
generated: 2024-12-08
---
```

On update: modify only sections affected by changed files.

## Generated Files

### 00-INDEX.md

Main navigation with "when to use" guidance:
```markdown
# {Project}

{One sentence}

## Read Order

1. **[ARCHITECTURE](./ARCHITECTURE.md)** — Stack, structure, paths, decisions
   - When: Tech overview, commands, path aliases
2. **[PATTERNS](./PATTERNS.md)** — Component, form, API, state patterns
   - When: Creating components, APIs, forms, state
3. **[COMPONENTS](./COMPONENTS.md)** — UI component API
   - When: Using components, checking props
4. **[SERVICES](./SERVICES.md)** — Service/repository API
   - When: Business logic, data access
5. **[DESIGN_TOKENS](./DESIGN_TOKENS.md)** — Colors, typography, spacing
   - When: Styling, design values

## Quick Reference

| Area      | Stack      |
| --------- | ---------- |
| Framework | {detected} |
| State     | {detected} |
| Styling   | {detected} |
| Testing   | {detected} |

## Key Directories

| Path     | Purpose    |
| -------- | ---------- |
| {paths}  | {purpose}  |

## Commands

```bash
{dev}    # Dev server
{test}   # Tests
{build}  # Build
```
```

### ARCHITECTURE.md

**Sources**: package.json, tsconfig.json, folders

**Contains**: Stack, structure, commands, path aliases

### PATTERNS.md

**Sources**: src/ patterns

**c7score Q&A format**:
- Q: How to create component? → 1-2 sentence pattern + file ref (`src/components/Button/Button.tsx`)
- Q: How to call API? → pattern + file ref (`src/services/apiClient.ts:25-40`)
- Q: How to handle forms? → pattern + file ref
- Q: How to manage state? → pattern + file ref

**Rules**:
- NO code snippets — file paths with optional lines (path:start-end)
- No duplicates
- 1-2 sentences max
- Project-relative paths
- **Use path maps from step 3** — never guess folder structure

### COMPONENTS.md

**Sources**: src/components/\*\*/\*.tsx, PropsT

**Contains**: Component groups, Props API, usage refs

**Rules**:
- Skip private components
- Props as TypeScript interface
- NO code snippets — usage file path
- Link to source (`PropsT: src/components/Button/Button.tsx:5-12`)
- **Use path maps from step 3** — components may be in flat or nested structure

### SERVICES.md

**Sources**: src/services/\*\*/\*.ts, exports

**Contains**: Service groups, method signatures, return types, usage refs

**Rules**:
- Skip private functions
- Signatures only
- NO code snippets — usage file path
- Link to source (`authService.login(): src/services/auth.ts:15-30`)
- **Use path maps from step 3** — services/repositories may have nested structure

### DESIGN_TOKENS.md

**Sources**: styles/, tokens/, theme

**Contains**: Colors, typography, spacing, breakpoints (tables)

**Rules**:
- Tables only
- Skip unused/deprecated
- Group semantically

### BUSINESS_RULES.md

**NOT auto-generated** — empty template if missing, user fills manually.

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

## Incremental Update

1. `git diff --name-only {last_commit}..HEAD`
2. Map to sections:
   - src/components/\* → COMPONENTS.md
   - src/services/\* → SERVICES.md
   - package.json → ARCHITECTURE.md
   - styles/\* → DESIGN_TOKENS.md
3. Regenerate affected sections only
4. Preserve unchanged sections
5. Update `last_commit`

If git unavailable → full regeneration.

## Output

```
proj:create-index complete (commit: abc1234)

Structure scan: 87 components, 15 services, 23 repositories, stories at tests/storybook/
Created: 00-INDEX.md, ARCHITECTURE.md, PATTERNS.md
Updated: COMPONENTS.md (-120 tokens), SERVICES.md (-45 tokens)
Optimized: DESIGN_TOKENS.md (-80 tokens)
Validated: 45 file references
  - Fixed: 3 auto-corrected paths
  - Broken: 2 (see report below)
Skipped: BUSINESS_RULES.md (manual)

Broken references:
- PATTERNS.md:14 → src/pages/TransactionDetailSidebar.tsx (not found)
- COMPONENTS.md:31 → src/components/form/radio/AuRadioGroup.tsx (not found)

Total reduction: -245 tokens
```

## Error Handling

- No git → full regeneration, note in output
- No src/ → error, stop
- Docs without frontmatter → add frontmatter, update

## Rules

- **Structure-first**: Step 3 pre-scan is MANDATORY — builds path maps to prevent wrong references
- Optimize for tokens, not readability
- No dialogs — auto-detect
- Preserve manual edits in BUSINESS_RULES.md only
- File paths over code, tables over prose, no duplicates
- c7score: question-driven, file-reference-first, minimal
- Always run optimization pass
- Generate 00-INDEX.md (NOT llms.txt)
- NEVER embed code snippets — project-relative paths with optional lines
- NEVER guess paths — use lookup maps from structure scan
