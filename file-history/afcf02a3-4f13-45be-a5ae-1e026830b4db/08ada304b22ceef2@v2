# Анализ Business Analyst агента

## Проблема

Сгенерированный документ `business-analyst-output.md` содержит **критические нарушения** правил агента. Документ написан как техническая спецификация программиста, а не как бизнес-требования аналитика.

---

## Что сделано ХОРОШО ✅

1. **Status line** - присутствует корректно
2. **User Stories** - написаны правильно в формате "As a / I want / So that"
3. **Risks** - бизнес-ориентированные риски без технических деталей
4. **Структура** - логичная и читаемая
5. **Acceptance Criteria формулировки** (частично) - например "Modal shall display a user-friendly error title"

---

## Что сделано ПЛОХО ❌ (нарушения правил агента)

### Правило: "MUST NEVER mention file names, paths, components, enums, types, props, or services"

**Нарушения в документе:**

| Секция | Нарушающий текст |
|--------|------------------|
| Problem Statement | `axios interceptor`, `src/shared/requestClient/axiosClient.ts`, `notificationService.addErrorAlert()`, `line 75-77 in notificationService.ts` |
| FR-1 | `Modal component pattern` |
| FR-2 | `modalService`, `errorModalService`, `axios interceptors`, `repository hooks` |
| FR-3 | `ValidationError (400)`, `AuthorizationError (401)` |
| NFR-1 | `AuButton`, `ModalNameE`, `PATTERNS.md` |
| NFR-2 | `native dialog behavior` |
| NFR-3 | `re-renders` (React-термин) |
| Scope | `ModalNameE`, `ModalPropsT`, `ErrorModal component`, `axios interceptor`, `Error Boundary` |
| Existing Patterns | `modalService.open()`, `GlobalStoreFieldE.MODALS`, `useGlobalValue`, `<dialog>` element |
| Technical Constraints | **Вся секция не должна существовать** |
| Dependencies | Все пути к файлам и компоненты |
| Deliverables | `ModalNameE.ts`, `ModalPropsT.ts`, `ErrorModal component`, `axios interceptor` |

### Правило: "MUST NEVER describe implementation approaches or technical architecture"

**Нарушения:**
- Секция "Existing Patterns to Follow" описывает КАК реализовать (вызов сервисов, state management)
- Секция "Technical Constraints" - чисто техническая
- Acceptance Criteria содержат технические детали типа "axios interceptors"

### Правило: "Output format must follow structure"

**Нарушения:**
- Формат не соответствует шаблону из промпта агента
- Нет секции "Edge Cases" (есть в шаблоне)
- Добавлены секции которых нет в шаблоне: "Problem Statement", "Non-Functional Requirements", "Technical Constraints", "Dependencies", "Deliverables"

---

## Как должен выглядеть правильный BA-документ

```markdown
Status: Done

## Task Summary
Users need to be informed when server communication fails.

## User Story
As a user, I want to see a clear notification when an action fails due to server issues, so that I understand what happened and can decide what to do next.

## Functional Requirements
1. When a server request fails, the system shall display a notification to the user
2. The notification shall contain a clear, non-technical message explaining that an error occurred
3. The user shall be able to dismiss the notification
4. The notification shall automatically appear without user action

## Existing Patterns (from documentation)
- The application has an established pattern for displaying modal dialogs to users
- The application has a notification system for user alerts

## Scope

### In Scope
- Displaying error notifications for server communication failures
- Allowing users to dismiss error notifications

### Out of Scope
- Automatic retry of failed requests
- Detailed technical error information for users
- Offline mode functionality

## Edge Cases
- Multiple errors occurring in quick succession
- Error occurring while another notification is displayed
- Long error messages

## Acceptance Criteria
- [ ] User sees a notification when a server request fails
- [ ] Notification message is understandable to non-technical users
- [ ] User can close the notification
- [ ] Notification does not block other user interactions

## Questions for User
1. Should errors auto-dismiss after a timeout, or require user action to close?
2. Should we show different messages for different types of failures (timeout vs server error)?
```

---

## План улучшения агента

**Подход:** Усилить запреты с конкретными примерами ❌ BAD / ✅ GOOD

---

### Изменение 1: Расширить секцию "MUST NEVER" с примерами

**Где:** Секция `### You MUST NEVER:` (строки ~29-35)

**Добавить после каждого правила примеры:**

```markdown
### You MUST NEVER:
- Write, suggest, or reference code of any kind
- Mention file names, paths, components, enums, types, props, or services
  - ❌ "Update ModalNameE.ts with ERROR entry"
  - ❌ "Use modalService.open() to trigger"
  - ❌ "Integrate with axios interceptor"
  - ✅ "The system shall display a dialog"
  - ✅ "Follow established dialog patterns"
- Describe implementation approaches or technical architecture
  - ❌ "axios interceptor should catch errors"
  - ❌ "Modal state managed in GlobalStoreFieldE.MODALS"
  - ✅ "The system shall detect server communication failures"
  - ✅ "The system shall track which dialogs are open"
- Reference frameworks, languages, tests, builds, or tooling
  - ❌ "React component", "TypeScript type", "integration tests"
  - ✅ "user interface element", "data structure", "verification"
- Describe internal mechanics like state management, modal behavior, or API shapes
  - ❌ "re-renders", "useGlobalValue hook", "ValidationError (400)"
  - ✅ "performance", "state tracking", "input validation errors"
```

---

### Изменение 2: Добавить секцию "Language Translation Guide"

**Где:** После секции "MUST NEVER", перед "Documentation-First Workflow"

**Добавить:**

```markdown
## Language Translation Guide

When you encounter technical concepts in documentation, translate them to business language:

| Technical Term | Business Translation |
|----------------|---------------------|
| Component | User interface element / Screen section |
| Modal / Dialog | Pop-up window / Overlay |
| Service | System capability / Feature |
| API / Endpoint | Server communication |
| Interceptor | Automatic handling |
| State management | Tracking information |
| Validation error | Input error / Form error |
| 401/403/500 errors | Access denied / Server error |
| Props / Parameters | Settings / Options |
| Enum / Type | Category / Classification |
```

---

### Изменение 3: Обновить Output Format с примерами

**Где:** Секция "Output Format" (строки ~64-106)

**Изменить секцию "Existing Patterns" на:**

```markdown
## Existing Patterns (from documentation)
Reference patterns by their PURPOSE, not implementation:
- ❌ "Use modalService.open(ModalNameE.ERROR, { message: string })"
- ✅ "The application has a standard way to display pop-up dialogs"
- ❌ "Modal component uses HTML <dialog> element"
- ✅ "Dialogs follow an established visual and behavioral pattern"
```

---

### Изменение 4: Добавить Quality Checklist примеры

**Где:** Секция "Quality Checklist" (строки ~129-138)

**Расширить:**

```markdown
## Quality Checklist

Before finalizing output, verify:
- [ ] Status line is present and correct
- [ ] No code references, file paths, or technical terms
  - Scan for: `.ts`, `.tsx`, `Service`, `Component`, `Enum`, `Type`, camelCase names
- [ ] All requirements are in plain business language
  - Test: Could a product manager read this without asking "what does X mean?"
- [ ] Acceptance criteria are user-facing, not technical
  - ❌ "Modal shall use existing Modal component pattern"
  - ✅ "System shall display a pop-up dialog"
- [ ] Relevant documentation has been consulted
- [ ] Output is in English
- [ ] Scope boundaries are clearly defined
- [ ] No "Deliverables" section listing files or components
```

---

## Файл для изменения

`/Users/dmitry/WebstormProjects/zephyr-budget-app/client/.claude/agents/business-analyst.md`
