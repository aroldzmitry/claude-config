# План улучшения Task Workflow

## Решения пользователя

- **Параллельность:** Tester + Code-Reviewer вызываются параллельно (с sync point)
- **Формат:** Отдельные файлы для каждого агента (.md с JSON блоками внутри)
- **Эскалация:** После 2 итераций — завершить с warnings

---

## Итоговый Workflow

```
/task:create <description>
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Step 1: REQUIREMENTS (main thread)              │
│                                                  │
│  1. Создать tasks/{task-id}/ и context.json     │
│  2. Читать BUSINESS_RULES.md                    │
│  3. Задавать вопросы (unlimited rounds)         │
│  4. Писать business-analyst-output.md           │
│     - Нумерованные AC: AC-001, AC-002...        │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Step 2: DESIGN (designer agent)                 │
│                                                  │
│  2.1. Читать requirements + все docs            │
│  2.2. Определить архитектуру:                   │
│       - Какие файлы создать/изменить            │
│       - Какие паттерны применить                │
│       - Структура данных                        │
│  2.3. Определить UI:                            │
│       - Какие компоненты использовать           │
│       - Layout и состояния                      │
│       - Responsive поведение                    │
│  2.4. Писать designer-output.md                 │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Step 3: DEVELOPMENT (developer agent)           │
│                                                  │
│  3.1. Читать designer-output.md (план)          │
│  3.2. Реализовать код по плану                  │
│  3.3. PRE-CHECK: tsc, lint                      │
│       - Если fail → фиксить, повторить 3.3      │
│  3.4. Писать developer-output.md (с AC tracking)│
│  3.5. Вызвать ПАРАЛЛЕЛЬНО:                      │
│       ├── tester → tester-output.md             │
│       ├── code-reviewer → code-reviewer-output.md│
│       └── visual-qa → visual-qa-output.md       │
│  3.6. Получить фидбэк, фиксить issues           │
│  3.7. iteration++ (max 2)                       │
│       - Если issues остались → повтор 3.3-3.6   │
│       - Если iteration >= 2 → выход с warnings  │
│  3.8. Финальный developer-output.md             │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Step 4: DOCUMENTATION (documenter agent)        │
│                                                  │
│  - Читать все outputs                           │
│  - Обновить .claude/docs/                       │
│  - Писать documenter-output.md                  │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Step 5: FINAL REPORT (main thread)              │
│                                                  │
│  TASK {id}: COMPLETED [with warnings]           │
│  Files: X changed                               │
│  Tests: Y passed                                │
│  Acceptance: Z/N (%)                            │
│  Unresolved: [list if any]                      │
└──────────────────────────────────────────────────┘
```

---

## Task Files Structure

```
.claude/tasks/{task-id}/
├── context.json                 # Metadata + state + iteration counter
├── business-analyst-output.md   # Requirements с AC-001, AC-002...
├── designer-output.md           # Architecture + UI design plan
├── developer-output.md          # Implementation + AC tracking
├── tester-output.md             # Tests + bugs (JSON блок внутри)
├── code-reviewer-output.md      # Review issues (JSON блок внутри)
├── visual-qa-output.md          # Visual issues + screenshots
└── documenter-output.md         # Docs updated
```

---

## Улучшения по сравнению с текущим

### 1. Явный State Machine

**context.json:**
```json
{
  "taskId": "task-123",
  "state": "REVIEWING",
  "iteration": 1,
  "maxIterations": 2,
  "acceptanceCriteria": {
    "total": 5,
    "passed": 3,
    "failed": ["AC-003", "AC-005"]
  }
}
```

### 2. Структурированный фидбэк

**tester-output.md:**
```markdown
Status: Done

## Summary
Tests written: 5
Tests passed: 5/5

## Bugs
\`\`\`json
[
  {"id": "BUG-001", "severity": "high", "file": "src/X.tsx", "line": 45, "description": "...", "status": "open"}
]
\`\`\`

## Acceptance Criteria Verification
- [x] AC-001: Verified
- [ ] AC-003: FAILED — reason
```

**code-reviewer-output.md:**
```markdown
Status: Done

## Summary
Files reviewed: 3
Approved: No

## Issues
\`\`\`json
[
  {"id": "REV-001", "severity": "medium", "file": "src/Y.tsx", "line": 12, "suggestion": "...", "status": "open"}
]
\`\`\`
```

### 3. Pre-flight Checks

Developer ПЕРЕД вызовом reviewers:
```bash
yarn tsc --noEmit    # Компиляция
yarn lint            # Линтинг
```
Если fail → фиксит сам, не зовёт reviewers.

### 4. AC Tracking

Каждый агент отмечает свой прогресс по Acceptance Criteria:
- BA: создаёт AC-001, AC-002...
- Developer: отмечает что реализовал
- Tester: верифицирует независимо
- Final report: показывает % выполнения

### 5. Decision Log

Developer добавляет секцию:
```markdown
## Decisions
- **Почему X?** Потому что Y (см. PATTERNS.md)
```

---

## Файлы для изменения

| Файл | Действие | Что изменить |
|------|----------|--------------|
| `docs/WORKFLOW.md` | Edit | Обновить схему и описание |
| `commands/task:create.md` | Edit | AC нумерация, вызов designer, documenter |
| `agents/designer.md` | Create | Новый агент для arch + UI design |
| `agents/developer.md` | Edit | Читает designer output, pre-checks, iteration logic |
| `agents/tester.md` | Edit | Structured output с JSON |
| `agents/code-reviewer.md` | Create | Новый агент для ревью кода |
| `agents/visual-qa.md` | Create | Новый агент для визуального тестирования |
| `agents/documenter.md` | Edit | Без больших изменений |
| `agents/business-analyst.md` | Delete | Логика в task:create |

---

## Агенты после изменений

| Агент | Роль | Вызывается из | Output файл |
|-------|------|---------------|-------------|
| designer | Архитектура + UI план | task:create | designer-output.md |
| developer | Реализация + оркестрация | task:create | developer-output.md |
| tester | Тесты + баги | developer | tester-output.md |
| code-reviewer | Ревью кода | developer | code-reviewer-output.md |
| visual-qa | Визуальное тестирование | developer | visual-qa-output.md |
| documenter | Документация | task:create | documenter-output.md |

---

## Designer Agent Details

**Читает:**
- `business-analyst-output.md` — requirements
- `.claude/docs/PATTERNS.md` — существующие паттерны
- `.claude/docs/COMPONENTS.md` — существующие компоненты
- `.claude/docs/SERVICES.md` — существующие сервисы
- `.claude/docs/ARCHITECTURE.md` — архитектурные решения

**Определяет:**

1. **Архитектура:**
   - Какие файлы создать/изменить
   - Какие паттерны применить (из PATTERNS.md)
   - Структура данных (типы, интерфейсы)
   - Зависимости (какие сервисы использовать)

2. **UI/UX:**
   - Какие компоненты использовать (из COMPONENTS.md или создать)
   - Layout и структура
   - Состояния: loading, error, empty, success
   - Responsive поведение (mobile/desktop)

**Пишет designer-output.md:**
```markdown
Status: Done

## Technical Design

### Files to Create
- src/components/ExportButton/ExportButton.tsx
- src/services/pdfExportService.ts

### Files to Modify
- src/pages/ReportsPage.tsx — добавить кнопку

### Patterns Used
- Service pattern для pdfExportService (см. PATTERNS.md)
- Button component pattern

### Data Flow
User clicks → ExportButton → pdfExportService.export() → download

## UI Design

### Components
- ExportButton: использовать существующий Button с icon="download"
- Loading state: Spinner внутри кнопки

### States
| State | UI |
|-------|-----|
| idle | Кнопка активна |
| loading | Spinner, disabled |
| success | Toast "Downloaded" |
| error | Toast с ошибкой |

### Responsive
- Mobile: кнопка full-width
- Desktop: кнопка inline

## Dependencies
- Существующий Button из COMPONENTS.md
- Новый pdfExportService
```

---

## Visual QA Agent Details

**Метод:** Playwright скриншоты + Claude vision

**Читает:**
- `designer-output.md` — ожидаемый UI design
- `developer-output.md` — какие страницы/компоненты изменены

**Процесс:**

1. Запустить dev server (если не запущен)
2. Открыть Playwright browser
3. Для каждой страницы/компонента:
   - Сделать скриншот desktop (1920x1080)
   - Сделать скриншот mobile (375x812)
   - Проверить все состояния из designer-output.md
4. Анализировать скриншоты через Claude vision
5. Сравнить с ожидаемым UI из designer-output.md

**Проверяет:**
- Соответствие designer-output.md
- Responsive (mobile/desktop)
- Состояния (loading, error, empty, success)
- Элементы не перекрываются
- Текст читаем
- Кнопки кликабельны (визуально)

**Пишет visual-qa-output.md:**
```markdown
Status: Done

## Summary
Pages tested: 2
Screenshots taken: 8
Issues found: 1

## Screenshots
- `.claude/tasks/{task-id}/screenshots/reports-desktop.png`
- `.claude/tasks/{task-id}/screenshots/reports-mobile.png`
- `.claude/tasks/{task-id}/screenshots/reports-loading.png`

## Issues
\`\`\`json
[
  {
    "id": "VIS-001",
    "severity": "medium",
    "screenshot": "reports-mobile.png",
    "description": "Export button overlaps with table on mobile",
    "expected": "Button below table (см. designer-output.md)",
    "status": "open"
  }
]
\`\`\`

## Checklist
- [x] Desktop layout matches design
- [ ] Mobile layout matches design — VIS-001
- [x] Loading state correct
- [x] Error state correct
```
