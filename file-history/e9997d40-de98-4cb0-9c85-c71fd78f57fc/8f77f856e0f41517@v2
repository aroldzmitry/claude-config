# План: Улучшение поведения business-analyst агента

## Цель
Изменить агента так, чтобы он:
1. Задавал уточняющие вопросы пользователю при неясностях (вместо "Needs Review")
2. Всегда создавал output файл, даже при ошибках

## Файл для изменения
`/Users/dmitry/WebstormProjects/zephyr-budget-app/client/.claude/agents/business-analyst.md`

---

## Изменения

### 1. Добавить инструмент AskUserQuestion
**Строка 4** — добавить `AskUserQuestion` в список tools:
```yaml
tools: Grep, Write, TodoWrite, Skill, Read, AskUserQuestion
```

### 2. Заменить секцию "Escalation Protocol" (строки 108-120)

**Было:**
```markdown
## Escalation Protocol

Use `Status: Needs Review` when:
- Requirements are unclear or ambiguous
- Documentation is insufficient to answer questions
- Behavior conflicts with documented patterns
- You need user input to proceed

Use `Status: Failed – reason` when:
- Task fundamentally cannot be completed with available information
- Requirements are contradictory with no resolution path

Never guess or invent missing business logic.
```

**Станет:**
```markdown
## Clarification Workflow

When requirements are unclear or ambiguous:
1. Use the `AskUserQuestion` tool to ask the user for clarification
2. Wait for the user's response
3. Continue with the analysis using the clarified information
4. Repeat if additional clarifications are needed

You MUST ask questions rather than guess or output "Needs Review" when:
- Requirements are unclear or ambiguous
- Documentation is insufficient to answer questions
- Behavior conflicts with documented patterns
- You need user input to proceed

## Output File Rules

**ALWAYS create the output file**, regardless of outcome:

- `Status: Done` — Requirements complete, file contains full specification
- `Status: Failed – reason` — Could not complete, file contains:
  - What was attempted
  - Why it failed
  - What information is missing
  - Any partial requirements that were gathered

Never leave the task without creating `tasks/{task-id}/business-analyst-output.md`.
```

### 3. Обновить "Documentation-First Workflow" (строка 50)

**Было:**
```markdown
- If documentation is unclear or insufficient, output `Status: Needs Review`
```

**Станет:**
```markdown
- If documentation is unclear or insufficient, use AskUserQuestion to clarify with the user
```

### 4. Добавить Failed output format в секцию Output Format (после строки 106)

Добавить пример формата для Failed статуса:
```markdown
### Output Format for Failed Status

```markdown
Status: Failed – [brief reason]

## Task Summary
Brief description of what was attempted.

## What Was Attempted
- Step 1 that was tried
- Step 2 that was tried

## Why It Failed
Detailed explanation of the blocker.

## Missing Information
- Item 1 needed to proceed
- Item 2 needed to proceed

## Partial Requirements (if any)
Any requirements that were successfully gathered before failure.
```
```

---

## Результат
После изменений агент будет:
- Интерактивно уточнять требования через вопросы пользователю
- Всегда создавать файл с результатом (даже при неудаче)
- Документировать причину неудачи структурированно
