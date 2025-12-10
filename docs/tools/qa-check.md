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
2. **Screenshots** — changed UI pages + Storybook stories (desktop 1280x720 + mobile 375x812)
3. **Visual bugs** — broken images, layout overflow, text issues, alignment, contrast, broken components
4. **Mobile responsiveness** — text readable, no overflow, touch targets adequate (44x44px min)
5. **AC** — each acceptance criteria implemented
6. **Scope** — no unrelated changes
7. **Consistency** — follows PATTERNS.md, no duplicates
8. **Code quality** — no `any`, no console.log
9. **Storybook** — verifies new components have stories (when Storybook exists in project)

## Example

```
/qa:check Add export button to dashboard
/qa:check .claude/tasks/20241208-export-button.md
```
