# web:dev

TDD web developer command. Clarifies requirements, writes tests first, implements minimal code.

## Usage

```
/web:dev <task-description or file-path>
```

## Parameters

- `task-description` — what to implement
- `file-path` — path to task spec file (from planner)

## Workflow

1. Clarify → 2. Write tests (red) → 3. Implement (green) → 4. Quality checks → 5. Commit

## Example

```
/web:dev Add export button to dashboard
/web:dev .claude/tasks/20241208-export-button.md
```
