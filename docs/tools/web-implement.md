# /web:implement

TDD web developer command. Clarifies requirements, writes tests first, implements minimal code.

## Usage

```
/web:implement <task-description or file-path>
```

## Parameters

- `task-description` — what to implement
- `file-path` — path to task spec file (from planner)

## Workflow

**0.1. Check Project Documentation** (ALWAYS FIRST) → **0. Analyze context** (modify existing only) → **0.5. Check existing stories** (Storybook mode only) → **1. Clarify** + extract AC + learn patterns → **1.5. Research solutions** (when needed) → **2. Write tests** (red) + stories → **3. Implement** (green) → **4. Quality** (Prettier → ESLint → TypeScript → Build) → **5. Review** vs AC + stories → **5.5. Technical debt** report → **6. Stage** files

**Phase 0.1 (Check Project Documentation)**: Reads `.claude/proj_index/00-INDEX.md` first to understand project structure and documented patterns. Looks for sections about component organization, component library, styling guide, existing components. Documents findings about where to find existing components, naming conventions, where new components should go. **Critical rule**: Always prefer documented patterns over assumptions. If docs specify where to check or which pattern to use — follow exactly. Only proceeds to Phase 0 if no relevant documentation found.

When modifying existing components (not creating new): analyzes component usage via Grep, reads parent components, checks if parents add classes via cloneElement (like AuField pattern), reads parent CSS to identify inherited styles that must be preserved. Documents conflicts and includes preservation strategy in plan. Prevents CSS regressions from parent-child style inheritance. Agent extracts ALL acceptance criteria from task file before planning. For non-trivial problems (styling issues, multiple valid approaches), researches solutions using Context7 MCP tools for up-to-date library documentation (React, TypeScript, testing frameworks) and WebSearch for general patterns, then presents 2-3 options with trade-offs before implementation. Detects Storybook presence and reads 2-3 existing stories to learn project patterns (story structure, exports, argTypes usage). **Phase 0.5 (Storybook mode only)**: Before creating new stories, searches existing stories via Grep to check if components already documented in dedicated or aggregate stories (Icons.stories.tsx, MissingComponents.stories.tsx). Lists which components need new stories vs already covered. Skips story creation for already-documented components. If Storybook exists and creating new components, adds stories before tests **matching existing project pattern** (same export structure, argTypes, decorators) with **Desktop and Mobile viewport variants required**. **Component creation rules**: ALWAYS check for existing component/style first — per Phase 0.1 documentation OR via Grep search for similar components. Read 2-3 found components to understand patterns. If existing component found → use/extend it instead of creating new. Only create new if nothing found and it's genuinely new functionality. New components must be extracted to separate files in `src/components/[name]/` with SCSS file before use. Never define inline. Create Storybook story first (if Storybook mode). **Styling rules**: NEVER use inline styles (`style={{...}}`). All styling in SCSS files using className. **BEFORE creating new CSS classes**: Check if styling can be composed from existing utility/component classes. Per Phase 0.1, check if project has design tokens or existing patterns. If existing pattern found → use it (e.g., existing `.spinner` class instead of creating `.registration-loading-spinner`). Only create NEW CSS class if pattern doesn't exist and it's genuinely new functionality. **Enum/type organization**: Never creates types inline. Analyzes how project organizes similar types by checking `PATTERNS.md`, searching for enum/type files via Grep, examining common type locations, looking at naming conventions. Reads 2-3 examples to extract pattern (file naming, directory placement, export format, value casing). Follows discovered pattern exactly. If multiple patterns or none found, asks user which convention to use. Quality phase runs from parent directory with: `yarn app:format:fix`, `yarn lint:client`, `npx tsc --noEmit`, `yarn web:build`. Reviews each AC and verifies all new components have stories matching project pattern including Mobile variant. After implementation, scans for technical debt (patterns differing from best practices, refactoring opportunities). Uses AskUserQuestion multi-select for which items to create refactoring tasks, then asks whether to save as task file or output to console. Enforces no hardcoded values (colors, spacing, breakpoints) — uses CSS variables, design tokens, or config constants. **Mobile-first CSS required**: base styles for mobile, `min-width` media queries for larger screens. Stages modified files with git add (user commits manually).

## Example

```
/web:implement Add export button to dashboard
/web:implement .claude/tasks/20241208-export-button.md
```
