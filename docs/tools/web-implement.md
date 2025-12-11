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

0. Analyze context (modify existing only) → 0.5. Check existing stories (Storybook mode only) → 1. Clarify + extract AC + learn project patterns → 1.5. Research solutions (when needed) → 2. Write tests (red) + stories matching project pattern → 3. Implement (green) → 4. Quality (Prettier → ESLint → TypeScript → Build) → 5. Review vs AC + stories → 5.5. Technical debt report → 6. Stage files

When modifying existing components (not creating new): analyzes component usage via Grep, reads parent components, checks if parents add classes via cloneElement (like AuField pattern), reads parent CSS to identify inherited styles that must be preserved. Documents conflicts and includes preservation strategy in plan. Prevents CSS regressions from parent-child style inheritance. Agent extracts ALL acceptance criteria from task file before planning. For non-trivial problems (styling issues, multiple valid approaches), researches solutions via WebSearch and presents 2-3 options with trade-offs before implementation. Detects Storybook presence and reads 2-3 existing stories to learn project patterns (story structure, exports, argTypes usage). **Phase 0.5 (Storybook mode only)**: Before creating new stories, searches existing stories via Grep to check if components already documented in dedicated or aggregate stories (Icons.stories.tsx, MissingComponents.stories.tsx). Lists which components need new stories vs already covered. Skips story creation for already-documented components. If Storybook exists and creating new components, adds stories before tests **matching existing project pattern** (same export structure, argTypes, decorators) with **Desktop and Mobile viewport variants required**. **Component creation rules**: New components must be extracted to separate files in `src/components/[name]/` with SCSS file before use. Never define inline. Create Storybook story first (if Storybook mode). **Styling rules**: NEVER use inline styles (`style={{...}}`). All styling in SCSS files using className. **Enum/type pattern detection**: Never creates types inline. Detects project's enum/type pattern by searching target directory and common locations (`*E.ts` files, `types/` subdirs, `src/types/`, `PATTERNS.md`). Reads examples to understand naming, structure, placement. Follows discovered pattern exactly. If multiple patterns found or none discovered, asks user which to follow. Quality phase runs from parent directory with: `yarn app:format:fix`, `yarn lint:client`, `npx tsc --noEmit`, `yarn web:build`. Reviews each AC and verifies all new components have stories matching project pattern including Mobile variant. After implementation, scans for technical debt (patterns differing from best practices, refactoring opportunities). Uses AskUserQuestion multi-select for which items to create refactoring tasks, then asks whether to save as task file or output to console. Enforces no hardcoded values (colors, spacing, breakpoints) — uses CSS variables, design tokens, or config constants. **Mobile-first CSS required**: base styles for mobile, `min-width` media queries for larger screens. Stages modified files with git add (user commits manually).

## Example

```
/web:implement Add export button to dashboard
/web:implement .claude/tasks/20241208-export-button.md
```
