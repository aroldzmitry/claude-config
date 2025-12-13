# /web:implement

Web developer command. Clarifies requirements, implements features, validates with quality checks.

## Usage

```
/web:implement <task-description or file-path>
```

## Parameters

- `task-description` — what to implement
- `file-path` — path to task spec file (from planner)

## Workflow

**0.1. Check Project Documentation** (ALWAYS FIRST) → **0. Analyze context** (modify existing only) → **0.5. Check existing stories** (Storybook mode only) → **1. Clarify** + extract AC + learn patterns → **1.5. Research solutions** (when needed) → **2. Implement** → **3. Quality** (Prettier → ESLint → TypeScript → Build) → **4. Review** vs AC → **4.5. Technical debt** report → **5. Stage** files

**Phase 0.1 (Check Project Documentation)**: Reads `.claude/proj_index/00-INDEX.md` first to understand project structure and documented patterns. Looks for sections about component organization, component library, styling guide, existing components. Documents findings about where to find existing components, naming conventions, where new components should go. **Critical rule**: Always prefer documented patterns over assumptions. If docs specify where to check or which pattern to use — follow exactly. Only proceeds to Phase 0 if no relevant documentation found.

When modifying existing components (not creating new): analyzes component usage via Grep, reads parent components, checks if parents add classes via cloneElement (like AuField pattern), reads parent CSS to identify inherited styles that must be preserved. Documents conflicts and includes preservation strategy in plan. Prevents CSS regressions from parent-child style inheritance. Agent extracts ALL acceptance criteria from task file before planning. For non-trivial problems (styling issues, multiple valid approaches), researches solutions using Context7 MCP tools for up-to-date library documentation (React, TypeScript) and WebSearch for general patterns, then presents 2-3 options with trade-offs before implementation. Detects Storybook presence and reads 2-3 existing stories to learn project patterns (story structure, exports, argTypes usage). **Phase 0.5 (Storybook mode only)**: Searches existing stories via Grep to check if components already documented in dedicated or aggregate stories. Lists which components need new stories vs already covered. **Component creation rules**: ALWAYS check for existing component/style first — per Phase 0.1 documentation OR via Grep search for similar components. Read 2-3 found components to understand patterns. If existing component found → use/extend it instead of creating new. Only create new if nothing found and it's genuinely new functionality. New components must be extracted to separate files in `src/components/[name]/` with SCSS file before use. Never define inline. If NEW component created → note in final report: "Add component to Storybook". **Styling rules**: NEVER use inline styles (`style={{...}}`). All styling in SCSS files using className. **BEFORE creating new CSS classes**: Check if styling can be composed from existing utility/component classes. Per Phase 0.1, check if project has design tokens or existing patterns. If existing pattern found → use it (e.g., existing `.spinner` class instead of creating `.registration-loading-spinner`). Only create NEW CSS class if pattern doesn't exist and it's genuinely new functionality. **Enum/type organization**: Never creates types inline. Analyzes how project organizes similar types by checking `PATTERNS.md`, searching for enum/type files via Grep, examining common type locations, looking at naming conventions. Reads 2-3 examples to extract pattern (file naming, directory placement, export format, value casing). Follows discovered pattern exactly. If multiple patterns or none found, asks user which convention to use. **Phase 2 (Implement)**: Writes minimal code, no extra features, no over-engineering. **Phase 3 (Quality)**: Runs from parent directory with `yarn app:format:fix`, `yarn lint:client`, `npx tsc --noEmit`, `yarn web:build`. Each quality check has 2 retry attempts. If check fails, agent analyzes why, tries different fix, reruns. After 2 failed retries, skips that check, logs error, continues to next step. Continues to Phase 4 even if some checks failed (logged to error file). **Phase 4 (Review)**: Reviews each AC against implementation. If NEW components created, notes "Add to Storybook". After implementation, scans for technical debt (patterns differing from best practices, refactoring opportunities). Uses AskUserQuestion multi-select for which items to create refactoring tasks, then asks whether to save as task file or output to console. Enforces no hardcoded values (colors, spacing, breakpoints) — uses CSS variables, design tokens, or config constants. **Mobile-first CSS required**: base styles for mobile, `min-width` media queries for larger screens. **Error reporting**: If any issues skipped (failed after 2 retry attempts), creates `.claude/tasks/{task-id}-errors.md` with details: which checks failed, what was attempted, why it failed, file:line references. Stages modified files with git add (user commits manually).

## Example

```
/web:implement Add export button to dashboard
/web:implement .claude/tasks/20241208-export-button.md
```
