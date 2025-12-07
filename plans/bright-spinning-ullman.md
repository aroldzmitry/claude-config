# Анализ агентов: что упущено для поддерживаемости кода

## Проблема

Код должен быть понятен и легко поддерживаем **обычными людьми** (не только AI-агентами). Текущие агенты оптимизированы для работы между собой, но недостаточно внимания уделено:

- Читаемости кода для людей
- Самодокументируемости
- Объяснению сложной логики
- Онбордингу новых разработчиков

---

## Найденные пробелы

### 1. Developer Agent — отсутствует

| Проблема | Почему важно |
|----------|--------------|
| Нет правил именования переменных/функций | Плохие имена = непонятный код |
| Нет указаний на размер функций | Большие функции сложно понять |
| Нет правил для комментариев сложной логики | Сложный код без объяснения = технический долг |
| Нет правил для констант | Magic numbers = неподдерживаемый код |
| Нет указаний на понятные сообщения об ошибках | Пользователи и разработчики не понимают что пошло не так |

### 2. Tester Agent — отсутствует

| Проблема | Почему важно |
|----------|--------------|
| Нет проверки читаемости кода | Работающий, но нечитаемый код — проблема |
| Нет проверки понятности имён | Тестер может отловить плохие имена |
| Нет оценки сложности функций | Cyclomatic complexity > 10 = риск |

### 3. Documenter Agent — проблемы

| Проблема | Почему важно |
|----------|--------------|
| Документация для агентов, не для людей | Люди читают иначе чем AI |
| Нет README для модулей/фич | Новый разработчик не знает с чего начать |
| Нет онбординг-документации | "Как начать работу с проектом?" |
| Нет документации по бизнес-контексту в коде | Почему код делает именно так? |

### 4. Workflow — отсутствует

| Проблема | Почему важно |
|----------|--------------|
| Нет проверки "человек поймёт этот код?" | Главный критерий поддерживаемости |
| Нет шага по упрощению сложного кода | Сложность накапливается |
| Нет метрик качества кода | Нет измерения = нет улучшения |

---

## Рекомендуемые улучшения

### Developer Agent — добавить секцию "Readability"

```markdown
## CODE READABILITY

### Naming Conventions

**Components:**
- PascalCase: `UserProfileCard`, `LoginForm`
- Suffix by type: `*Modal`, `*Button`, `*List`, `*Item`
- Props type: always `PropsT`

**Services:**
- camelCase with "Service" suffix: `authService`, `userService`
- Methods: verb + noun: `fetchUser`, `updateProfile`, `deleteSession`

**Hooks:**
- Prefix `use`: `useAuth`, `useUserProfile`
- Return type suffix: `useUserQuery`, `useLoginMutation`

**Utils/Helpers:**
- Verb describing action: `formatDate`, `validateEmail`, `parseResponse`
- Pure functions: input → output clearly named

**Types:**
- Suffix `T` for types: `UserT`, `ProductT`
- Suffix `DTO` for API response: `UserDTO`, `LoginResponseDTO`
- Suffix `SDTO` for API request: `LoginRequestSDTO`
- Suffix `E` for enums: `UserRoleE`, `OrderStatusE`

**Variables:**
- Booleans: `is*`, `has*`, `can*`, `should*`: `isLoading`, `hasPermission`
- Arrays: plural nouns: `users`, `products`, `selectedItems`
- Objects: singular nouns: `user`, `product`, `currentItem`

**Constants:**
- SCREAMING_SNAKE_CASE: `MAX_RETRY_COUNT`, `API_BASE_URL`
- Group in objects: `AUTH_CONFIG.tokenKey`, `VALIDATION.minPasswordLength`

### Function Size
- Maximum 20-30 lines per function
- If longer → extract helper functions with descriptive names
- One function = one responsibility
- If you need comments to explain WHAT → function is too complex

### Comments (When to Write)
- ❌ DON'T comment WHAT code does (code should be self-explanatory)
- ✅ DO comment WHY (business reasons, non-obvious decisions)
- ✅ DO comment complex algorithms (brief explanation at the top)
- ✅ DO comment workarounds (link to issue/ticket if exists)

Example:
```typescript
// BAD: describes WHAT
// Loop through users and filter active ones
const activeUsers = users.filter(u => u.isActive);

// GOOD: explains WHY
// Only active users can receive notifications per GDPR requirements
const activeUsers = users.filter(u => u.isActive);
```

### Error Messages
- User-facing: clear, actionable, no technical jargon
  - ✅ "Please enter a valid email address"
  - ❌ "Validation failed: email regex mismatch"
- Developer-facing (logs/errors): include context
  - ✅ "Failed to fetch user profile: API returned 404 for userId=123"
  - ❌ "Error"

### Constants & Magic Values
- No magic numbers: `const MAX_RETRY_COUNT = 3`
- No magic strings: `const STORAGE_KEY = 'auth_token'`
- Group related constants:
```typescript
const VALIDATION = {
  minPasswordLength: 8,
  maxUsernameLength: 50,
  emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;
```
```

### Tester Agent — добавить "Readability Review" секцию

Добавить в Core Responsibilities после Code Review:

```markdown
### 2. Readability Review (Non-Blocking)

After code review, check readability for human maintainers:

**Naming check:**
- [ ] Function names clearly describe what they do (verb + noun)
- [ ] Variable names are descriptive (no single letters except `i`, `j` in loops)
- [ ] Boolean variables have `is/has/can/should` prefix
- [ ] Constants are SCREAMING_SNAKE_CASE or grouped in objects
- [ ] Types follow naming convention (T, DTO, SDTO, E suffixes)

**Complexity check:**
- [ ] No functions longer than 30 lines
- [ ] No deeply nested code (max 3 levels)
- [ ] Complex logic has explanatory WHY comments
- [ ] No magic numbers or strings

**Clarity check:**
- [ ] Error messages are user-friendly (no technical jargon for users)
- [ ] Code is self-documenting (no need for WHAT comments)
- [ ] New developer could understand this in 5 minutes

**Report format:**
Add section to tester-output.md:

## Readability Review

### Passed ✅
- Clear function names
- Good variable naming

### Suggestions (Non-Blocking)
- `src/services/userService.ts:45` — function `process()` should be renamed to `processUserRegistration()`
- `src/components/Form.tsx:23` — magic number `5` should be `MAX_RETRY_COUNT`
```

### Documenter Agent — добавить человеческую документацию (English)

Добавить в Core Responsibilities:

```markdown
### 4. Human-Readable Documentation

In addition to agent docs, create/update documentation for human developers:

**Module README** (for significant new features):
Location: `src/features/{feature}/README.md` or inline in main component

Content:
- What this feature does (business context)
- How to use it (quick start example)
- Key files and their purpose
- Common modifications and where to make them

**When to create:**
- New feature module with 3+ files
- Complex business logic that needs explanation
- Integration with external services

**Language:** English only
```

### Workflow — не требуется отдельный шаг

Readability Review встроен в Tester, отдельный шаг не нужен.

---

## Итоговый план реализации

### Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `developer.md` | Добавить секцию CODE READABILITY с детальными naming conventions |
| `tester.md` | Добавить секцию Readability Review (non-blocking) |
| `documenter.md` | Добавить Human-Readable Documentation для модулей |

### Приоритеты

1. **High** — Developer: naming conventions, function size, comments rules
2. **Medium** — Tester: readability review checklist
3. **Low** — Documenter: module README guidelines
