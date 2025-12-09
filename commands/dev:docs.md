---
description: "Generate/update project documentation optimized for Claude"
argument-hint: "[--force]"
model: opus
allowed-tools: "Read, Write, Edit, Glob, Grep, Bash"
---

# Dev Docs

Generate and update project documentation in `.claude/docs/`, optimized for LLM consumption (c7score principles).

## Process

1. Check existing docs in `.claude/docs/`
2. Read `last_commit` from each file's frontmatter
3. If `last_commit` exists → get changes via `git diff {last_commit}..HEAD`
4. If no `last_commit` or `--force` → full regeneration
5. Analyze codebase
6. Generate/update files
7. Create llms.txt (main navigation)
8. Report

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

### llms.txt (always created)

Navigation index for LLMs. Format:
```
# Project: {name}
> {one-line description}

## Docs
- [ARCHITECTURE](./docs/ARCHITECTURE.md): Tech stack, structure
- [PATTERNS](./docs/PATTERNS.md): Code conventions
- [COMPONENTS](./docs/COMPONENTS.md): UI components API
- [SERVICES](./docs/SERVICES.md): Services API
- [DESIGN_TOKENS](./docs/DESIGN_TOKENS.md): Design system

## Quick Facts
- Framework: {detected}
- State: {detected}
- Styling: {detected}
- Testing: {detected}

## Commands
- Dev: {command}
- Test: {command}
- Build: {command}
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

Contains (c7score format — question → answer):
- Q: How to create a component? → pattern + example
- Q: How to call API? → pattern + example
- Q: How to handle forms? → pattern + example
- Q: How to manage state? → pattern + example

### COMPONENTS.md

Sources: src/components/**/*.tsx, extract PropsT

Contains:
- Component list grouped by feature
- Props API (from types)
- Usage example (from imports/usages in code)

### SERVICES.md

Sources: src/services/**/*.ts, exported functions

Contains:
- Service list
- Methods with signatures
- Return types
- Usage example

### DESIGN_TOKENS.md

Sources: styles/, tokens/, theme files

Contains:
- Colors
- Typography
- Spacing
- Breakpoints

### BUSINESS_RULES.md

**NOT auto-generated** — creates empty template if missing. User fills manually.

## c7score Optimization

Structure docs for LLM retrieval:
- Question-based headers where possible
- Runnable code examples
- Clear hierarchy (H1 → H2 → H3)
- No redundant prose

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
dev:docs complete (commit: abc1234)

Created: llms.txt, ARCHITECTURE.md, PATTERNS.md
Updated: COMPONENTS.md (+3), SERVICES.md (+1)
Unchanged: DESIGN_TOKENS.md
Skipped: BUSINESS_RULES.md (manual)
```

## Error Handling

- No git → full regeneration, note in output
- No src/ → error, stop
- Existing docs without frontmatter → add frontmatter, update

## Rules

- Optimize for Claude, not humans
- No dialogs — auto-detect best mode
- Preserve manual edits where possible
- Keep files concise
- Use c7score principles: question-driven, code-first
