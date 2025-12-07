# agent:update Fix Plan

**Target:** `/Users/dmitry/.claude/agents/agent-update.md`
**Approach:** Вариант A — обновить субагент для поддержки old_string/new_string формата

## Изменение 1: Input Format (Critical)

Заменить текущий Input Format (строки 15-24):

```markdown
## Input Format

Receives from command:
```
CONFIRMED. Update [file_path]:

old_string:
\`\`\`
[exact text to replace]
\`\`\`

new_string:
\`\`\`
[exact new text]
\`\`\`
```
or
```
Rollback [file_path] to previous version.
```
```

## Изменение 2: Apply Step (Medium)

Обновить Step 3: Apply (строка 52-53) для работы с новым форматом:

```markdown
## Step 3: Apply

Parse old_string and new_string from prompt.
Use Edit tool with exact values:
- `old_string`: content from old_string block
- `new_string`: content from new_string block
- `file_path`: parsed from prompt

If blocks not found, parse change description and generate changes.
```

## Изменение 3: Также исправить в команде (Minor)

В `/Users/dmitry/.claude/commands/agent:update.md` строка 125:
- `Apply to` → `Update` (для единообразия)

## Изменение 4: Error Handling (High)

Добавить новую секцию после Rules (после строки 89):

```markdown
## Error Handling

| Scenario | Action |
|----------|--------|
| File not found | Return: "Error: File not found: {path}" |
| Invalid frontmatter | Return: "Error: Invalid YAML frontmatter" |
| Missing required fields | Return: "Error: Missing {field} in frontmatter" |
| Backup creation fails | Return: "Error: Cannot create backup", abort |
| Edit tool fails | Rollback from backup, return: "Error: Apply failed, rolled back" |
| old_string not found | Return: "Error: Text to replace not found in file" |

All errors must include the full file path for debugging.
```

## Files to Modify

1. `/Users/dmitry/.claude/agents/agent-update.md` — Input Format, Apply Step, Error Handling
2. `/Users/dmitry/.claude/commands/agent:update.md` — Apply to → Update

## Отложено

| Issue | Severity |
|-------|----------|
| Final output format | Medium |
| Recommendation mode | Medium |
| Migration flow | Medium |
| Web research mode | Low |
