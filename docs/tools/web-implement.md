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

1. Clarify + extract AC + check Storybook → 1.5. Research solutions (when needed) → 2. Write tests (red) + stories → 3. Implement (green) → 4. Quality (Prettier → ESLint → TypeScript → Build) → 5. Review vs AC + stories → 6. Stage files

Agent extracts ALL acceptance criteria from task file before planning. For non-trivial problems (styling issues, multiple valid approaches), researches solutions via WebSearch and presents 2-3 options with trade-offs before implementation. Detects Storybook presence and searches existing stories for reusable components. If Storybook exists and creating new components, adds stories before tests. Quality phase runs from parent directory with: `yarn app:format:fix`, `yarn lint:client`, `npx tsc --noEmit`, `yarn web:build`. Reviews each AC and verifies all new components have stories. Enforces no hardcoded values (colors, spacing, breakpoints) — uses CSS variables, design tokens, or config constants. Stages modified files with git add (user commits manually).

## Example

```
/web:implement Add export button to dashboard
/web:implement .claude/tasks/20241208-export-button.md
```
