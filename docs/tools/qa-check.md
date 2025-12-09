# qa:check

Manual QA verification command. Runs tests, screenshots UI, checks AC and code consistency.

## Usage

```
/qa:check <task-description or file-path>
```

## Parameters

- `task-description` — what to verify
- `file-path` — path to task spec with AC

## What it checks

1. **Tests** — runs `yarn test`
2. **Screenshots** — changed UI pages (desktop + mobile)
3. **AC** — each acceptance criteria implemented
4. **Scope** — no unrelated changes
5. **Consistency** — follows PATTERNS.md, no duplicates
6. **Code quality** — no `any`, no console.log

## Example

```
/qa:check Add export button to dashboard
/qa:check .claude/tasks/20241208-export-button.md
```
