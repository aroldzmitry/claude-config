# Анализ рефакторинга agent-update

## Сравнение: Бэкап vs Текущая версия

### Субагент `agent-update.md`

| Секция | Было (268 строк) | Сейчас (89 строк) | Статус |
|--------|------------------|-------------------|--------|
| Frontmatter tools | Read, Write, Edit, Glob, Grep, **WebSearch, AskUserQuestion** | Read, Write, Edit, Glob, Grep | ✅ Убрано правильно |
| Step 0: Detect Mode | ✅ | ❌ | ✅ Перенесено в команду |
| Step 1: Select Scope | ✅ | ❌ | ✅ Перенесено в команду |
| Step 2: Identify Target | ✅ | ❌ | ✅ Перенесено в команду |
| Step 3: Clarify Change | ✅ | ❌ | ✅ Перенесено в команду |
| Step 4: Read & Propose | ✅ | ❌ | ✅ Перенесено в команду |
| Step 5: Validate Syntax | ✅ | ✅ | ✅ Сохранено |
| Step 6: Backup & Apply | ✅ | ✅ | ✅ Сохранено |
| Rollback | ✅ | ✅ | ✅ Сохранено |
| **Migration Between Scopes** | ✅ | ❌ | ⚠️ **ПОТЕРЯНО** |
| Rules | ✅ | ✅ (упрощены) | ✅ Достаточно |
| Change Size Guidelines | ✅ | ❌ | ⚠️ Не перенесено |
| Writing for Claude | ✅ | ❌ | ⚠️ Не перенесено |
| Thinking Mode | ✅ | ❌ | ⚠️ Не перенесено |
| Anti-Patterns | ✅ | ❌ | ⚠️ Частично в Rules |
| Examples | ✅ | ❌ | ✅ Не нужны исполнителю |

### Команда `agent:update.md`

| Секция | Было (58 строк) | Сейчас (142 строки) | Статус |
|--------|-----------------|---------------------|--------|
| Argument Parsing | ✅ | ✅ | ✅ Сохранено |
| Step 1: Determine Scope | ❌ | ✅ | ✅ Добавлено |
| Step 2: Find Target File | ❌ | ✅ | ✅ Добавлено |
| Step 3: Read Current Content | ❌ | ✅ | ✅ Добавлено |
| Step 4: Generate Diff | ❌ | ✅ | ✅ Добавлено |
| Step 5: Confirm with User | ❌ | ✅ | ✅ Добавлено |
| Step 6: Delegate to Executor | ❌ | ✅ | ✅ Добавлено |
| Rollback Mode | ✅ | ✅ | ✅ Сохранено |
| Recommendation Mode | ❌ | ✅ | ✅ Добавлено |
| Web Research Mode | ❌ | ✅ | ✅ Добавлено |
| **Migration Between Scopes** | ❌ | ❌ | ⚠️ **НЕ ДОБАВЛЕНО** |
| **Writing for Claude guidelines** | ❌ | ❌ | ⚠️ **НЕ ДОБАВЛЕНО** |
| **Change Size Guidelines** | ❌ | ❌ | ⚠️ **НЕ ДОБАВЛЕНО** |
| **Anti-Patterns** | ❌ | ❌ | ⚠️ **НЕ ДОБАВЛЕНО** |

---

## ⚠️ Потерянная функциональность

### 1. Migration Between Scopes
**Было в субагенте:**
```markdown
## Migration Between Scopes

When moving files between global and project scope:

1. Create file in target scope
2. Verify new file created correctly
3. Delete old file from source scope
4. Update backups in target scope

**Never leave duplicate files** in both scopes.
```
**Нужно:** Добавить в команду `agent:update.md`

### 2. Writing for Claude guidelines
**Было в субагенте:**
```markdown
### Writing for Claude (not humans)

Claude doesn't need:
- Full JSON examples for built-in tools — just tool name + key params
- Multiple examples of same pattern — one clear example enough
- External links — not accessible at runtime
- Decorative formatting — `---` dividers, excessive whitespace
- "Remember:" summaries — Claude retains context

Claude benefits from:
- Explicit constraints and boundaries
- One good/bad example pair per concept
- Tables for mappings (compact, scannable)
- Bullet points over prose

### Before Writing

Ask yourself:
1. Would Claude behave differently without this section? If no → remove
2. Is this the same info in different words? → deduplicate
3. Is this obvious to an LLM? (JSON syntax, markdown format) → skip
4. Can this table be 3 rows instead of 10? → condense

### Optimization Check

Before proposing additions:
- Can existing instruction be **clarified** instead of adding new one?
- Can this be **merged** into existing section?
- Is Claude already capable of this without explicit instruction?

Prefer: Modify > Add > New Section
```
**Нужно:** Добавить в команду для генерации качественного diff

### 3. Change Size Guidelines
**Было в субагенте:**
```markdown
## Change Size Guidelines

| Size   | Description              | Action                             |
| ------ | ------------------------ | ---------------------------------- |
| Small  | Fix typo, add one line   | Show diff, apply on confirm        |
| Medium | Add section, modify rule | Show diff, explain impact, confirm |
| Large  | Restructure, rewrite     | Suggest `/agent:create` instead    |
```
**Нужно:** Добавить в команду для определения когда предложить `/agent:create`

### 4. Anti-Patterns
**Было в субагенте:**
```markdown
## Anti-Patterns

| Anti-Pattern          | Better Approach            |
| --------------------- | -------------------------- |
| Rewrite whole file    | Edit specific section only |
| Skip validation       | Always check syntax first  |
| Skip backup           | Always backup before edit  |
| Guess user intent     | Ask for clarification      |
| Apply without showing | Always show diff first     |
```
**Нужно:** Добавить в команду как guidance

### 5. Thinking Mode for Complex Changes
**Было в субагенте:**
```markdown
### Thinking Mode for Complex Changes

| Complexity Signal | Approach |
| ----------------- | -------- |
| Architectural patterns | "Think step by step about implications" |
| Multi-file coordination | "Analyze dependencies between files" |
| Backward compatibility | "Consider what workflows might break" |
```
**Опционально:** Полезно для сложных изменений

---

## План исправления

### Файл: `~/.claude/commands/agent:update.md`

#### 1. Добавить после Step 4 (Generate Diff):

```markdown
### Writing for Claude (not humans)

When generating changes:
- No full JSON examples — just tool name + key params
- One clear example enough — no duplicates
- No external links — not accessible at runtime
- No decorative formatting — skip `---` dividers, excessive whitespace

Prefer:
- Explicit constraints over verbose explanations
- Tables for mappings (compact, scannable)
- Bullet points over prose

Before adding content, ask:
1. Would Claude behave differently without this? If no → skip
2. Is this the same info in different words? → deduplicate
3. Can this be merged into existing section? → merge
```

#### 2. Добавить между Step 5 и Step 6:

```markdown
## Change Size Guidelines

| Size | Description | Action |
|------|-------------|--------|
| Small | Fix typo, add one line | Show diff, apply on confirm |
| Medium | Add section, modify rule | Show diff, explain impact, confirm |
| Large | Restructure, rewrite | Suggest `/agent:create` instead |

If change is **Large** → stop and suggest creating new agent/command instead.
```

#### 3. Добавить после Web Research Mode:

```markdown
## Migration Between Scopes

When user requests moving file between global ↔ project:

1. Create file in target scope
2. Verify new file created correctly
3. Delete old file from source scope
4. Update backups in target scope

**Never leave duplicate files** in both scopes.
```

#### 4. Добавить в конец (перед или вместе с Rules):

```markdown
## Anti-Patterns

| Anti-Pattern | Better Approach |
|--------------|-----------------|
| Rewrite whole file | Edit specific section only |
| Skip validation | Always check syntax first |
| Guess user intent | Ask for clarification |
| Apply without showing | Always show diff first |
```

---

## Итоговая структура команды после исправления:

1. Frontmatter
2. Argument Parsing
3. Step 1: Determine Scope
4. Step 2: Find Target File
5. Step 3: Read Current Content
6. Step 4: Generate Diff
   - **+ Writing for Claude guidelines**
7. Step 5: Confirm with User
8. **+ Change Size Guidelines** (новая секция)
9. Step 6: Delegate to Executor
10. Rollback Mode
11. Recommendation Mode
12. Web Research Mode
13. **+ Migration Between Scopes** (новая секция)
14. **+ Anti-Patterns** (новая секция)
15. Rules
