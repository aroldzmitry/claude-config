---
description: "Generate/update project index optimized for Claude"
argument-hint: "[--force]"
model: haiku
allowed-tools: "Read, Write, Edit, Glob, Grep, Bash"
---

# Project Index

Generate and update project index in `.claude/proj_index/`, optimized for LLM consumption (c7score principles).

## Process

1. Check existing docs in `.claude/proj_index/`
2. Read `last_commit` from each file's frontmatter
3. If `last_commit` exists → get changes via `git diff {last_commit}..HEAD`
4. If no `last_commit` or `--force` → full regeneration
5. Analyze codebase
6. Generate/update files
7. Optimize existing docs (remove duplicates, shorten examples, minimize tokens)
8. Create 00-INDEX.md (main navigation with "when to use" guidance)
9. Report

## Versioning

Each generated file has frontmatter:
```yaml
---
last_commit: abc1234
generated: 2024-12-08
---
```

On update: only modify sections affected by changed files.

## Generated Files

### 00-INDEX.md (always created)

Minimal navigation index with "when to use" guidance. Format:
```markdown
# {Project Name}

{One sentence description}

## Read Order

Start here, then follow links as needed:

1. **[ARCHITECTURE](./ARCHITECTURE.md)** — Tech stack, project structure, path aliases, key decisions
   - When: Need tech stack overview, build commands, or path alias reference
2. **[PATTERNS](./PATTERNS.md)** — Component, form, API, state management patterns
   - When: Creating components, calling APIs, handling forms, managing state
3. **[COMPONENTS](./COMPONENTS.md)** — UI components API (forms, layouts, display)
   - When: Using existing components, checking props/API
4. **[SERVICES](./SERVICES.md)** — Services and repositories API
   - When: Calling business logic, data access methods
5. **[DESIGN_TOKENS](./DESIGN_TOKENS.md)** — Design tokens (colors, typography, spacing)
   - When: Styling components, need color/spacing/font values

## Quick Reference

| Area          | Stack                                |
| ------------- | ------------------------------------ |
| Framework     | {detected}                           |
| State         | {detected}                           |
| Styling       | {detected}                           |
| Testing       | {detected}                           |

## Key Directories

| Path                | Purpose                         |
| ------------------- | ------------------------------- |
| {detected paths}    | {detected purpose}              |

## Commands

```bash
{dev-command}      # Dev server
{test-command}     # Run tests
{build-command}    # Production build
```
```

### ARCHITECTURE.md

Sources: package.json, tsconfig.json, folder structure

Contains:
- Tech stack (framework, state, styling, testing)
- Project structure (key directories)
- Build/dev commands
- Path aliases

### PATTERNS.md

Sources: analyze src/ for repeating patterns

Contains (c7score format — question → answer with file references):
- Q: How to create a component? → pattern description + file reference (e.g., `src/components/Button/Button.tsx`)
- Q: How to call API? → pattern description + file reference (e.g., `src/services/apiClient.ts:25-40`)
- Q: How to handle forms? → pattern description + file reference
- Q: How to manage state? → pattern description + file reference

Optimization rules:
- NO code snippets — use file paths with optional line numbers (path:start-end)
- Remove duplicate patterns across sections
- Pattern description: 1-2 sentences max
- File references must be project-relative (not absolute filesystem paths)

### COMPONENTS.md

Sources: src/components/**/*.tsx, extract PropsT

Contains:
- Component list grouped by feature
- Props API (TypeScript interface extracted from file)
- Usage reference (file path where component is used, e.g., `src/pages/Dashboard.tsx:45`)

Optimization rules:
- Skip internal/private components
- Props as TypeScript interface only
- NO code snippets — reference actual usage location via file path
- Props interface: link to source file (e.g., `PropsT: src/components/Button/Button.tsx:5-12`)

### SERVICES.md

Sources: src/services/**/*.ts, exported functions

Contains:
- Service list (group by feature)
- Methods with TypeScript signatures (extract from source)
- Return types
- Usage reference (file path where service is called, e.g., `src/pages/Login.tsx:23`)

Optimization rules:
- Skip private/helper functions
- Signatures only, no implementation details
- NO code snippets — reference actual usage location via file path
- Method signature: link to source file (e.g., `authService.login(): src/services/auth.ts:15-30`)

### DESIGN_TOKENS.md

Sources: styles/, tokens/, theme files

Contains:
- Colors (name → value table)
- Typography (name → CSS properties table)
- Spacing (name → value table)
- Breakpoints (name → value table)

Optimization rules:
- Tables only, no prose
- Skip unused/deprecated tokens
- Group by semantic meaning (primary, secondary, etc.)

### BUSINESS_RULES.md

**NOT auto-generated** — creates empty template if missing. User fills manually.

## Optimization Pass (runs every time)

Before generating 00-INDEX.md, optimize existing docs in `.claude/proj_index/`:

1. Read each file (ARCHITECTURE, PATTERNS, COMPONENTS, SERVICES, DESIGN_TOKENS)
2. Apply optimization rules:
   - Replace ALL code snippets with file path references (project-relative)
   - Remove duplicate content across sections
   - Remove prose, keep only minimal descriptions
   - Convert verbose lists to tables where applicable
   - Remove unused/deprecated entries
3. Rewrite file with optimized content
4. Preserve frontmatter and structure

File path format: `src/path/to/file.ts` or `src/path/to/file.ts:25-40` (with line numbers)

## c7score Optimization

Structure docs for LLM retrieval:
- Question-based headers where possible
- File path references instead of code snippets (5x token reduction)
- Clear hierarchy (H1 → H2 → H3)
- No redundant prose, tables over lists
- Project-relative paths only: `src/path/file.ts:line-range`

## Incremental Update Logic

1. Get changed files: `git diff --name-only {last_commit}..HEAD`
2. Map to doc sections:
   - src/components/* → COMPONENTS.md
   - src/services/* → SERVICES.md
   - package.json → ARCHITECTURE.md
   - styles/* → DESIGN_TOKENS.md
3. Regenerate only affected sections
4. Preserve unchanged sections
5. Update `last_commit` in frontmatter

If incremental impossible (git not available, no commits) → full regeneration.

## Output

```
proj:create_index complete (commit: abc1234)

Created: 00-INDEX.md, ARCHITECTURE.md, PATTERNS.md
Updated: COMPONENTS.md (-120 tokens), SERVICES.md (-45 tokens)
Optimized: DESIGN_TOKENS.md (-80 tokens)
Skipped: BUSINESS_RULES.md (manual)

Total reduction: -245 tokens
```

## Error Handling

- No git → full regeneration, note in output
- No src/ → error, stop
- Existing docs without frontmatter → add frontmatter, update

## Rules

- Optimize for token efficiency, not readability
- No dialogs — auto-detect best mode
- Preserve manual edits in BUSINESS_RULES.md only
- Minimize tokens: file paths over code snippets, tables over prose, no duplicates
- Use c7score principles: question-driven, file-reference-first, minimal
- Always run optimization pass on existing files
- Generate 00-INDEX.md (NOT llms.txt)
- NEVER embed code snippets — use project-relative file paths with optional line numbers
