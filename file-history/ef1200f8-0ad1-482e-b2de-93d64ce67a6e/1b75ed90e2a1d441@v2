# План: Улучшение агентов на основе ошибок в задаче с сайдбаром

## Проблемы, которые пришлось исправлять вручную

| # | Проблема | Причина |
|---|----------|---------|
| 1 | Medium/small на мобиле как десктопные окошки | Developer не понял "на мобиле" = ВСЕ варианты |
| 2 | Анимация закрытия улетала влево | CSS специфичность: глобальные стили > media query |
| 3 | Лишний backdrop для medium/small | Developer добавил без требования |
| 4 | Swipe только для regular | Ограничил функционал без причины |
| 5 | Захардкоженный breakpoint | Не вынес в константу/утилиту |
| 6 | TypeScript ошибки в тестах | Неправильная типизация `vi.fn()` |
| 7 | Лишние комментарии | Игнорирование правила "не комментировать очевидное" |

---

## Изменения в агентах

### 1. Developer (`.claude/agents/developer.md`)

**После строки 74 (после `- Mobile-first media queries`) добавить:**

```markdown

### Responsive Design Rules

When implementing UI that differs between mobile/desktop:

1. **"On mobile" means ALL variants** - if requirement says "on mobile", apply to all component sizes/variants
2. **CSS specificity** - global `.class--modifier` styles override styles inside `@media`. Wrap desktop-only global styles in `@media (width >= 60rem)`
3. **Test both breakpoints** - verify animations and layout at mobile (<960px) AND desktop (>=960px)
4. **Reuse breakpoint constants** - check `Shared/constants/breakpoints.ts` and `Shared/utils/isMobile.ts` before hardcoding values
```

**После строки 168 (после блока `VALIDATION`) добавить:**

```markdown

### Code Reuse

Before creating new values:
- Check `src/shared/constants/` for existing constants
- Check `src/shared/utils/` for existing utilities
- If logic is used 2+ times, extract to a utility function
```

---

### 2. Tester (`.claude/agents/tester.md`)

**После строки 78 (после Visual checks) добавить:**

```markdown

**Responsive checks:**
- ✅ Component works at mobile breakpoint (<960px)
- ✅ Component works at desktop breakpoint (>=960px)
- ✅ Animations correct on both breakpoints
- ✅ No CSS specificity conflicts (mobile styles not overridden by global)
- ✅ If requirement said "on mobile" - ALL variants tested on mobile
```

**После строки 157 (после `- API calls (mock with vi.fn())`) добавить:**

```markdown

**Test code quality:**
- Tests must compile without TypeScript errors
- Mock functions typed correctly: `vi.fn() as unknown as () => void`
- Run `yarn type-check` to verify test files
```

---

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `.claude/agents/developer.md:74` | +Responsive Design Rules (после Styles) |
| `.claude/agents/developer.md:168` | +Code Reuse (после VALIDATION) |
| `.claude/agents/tester.md:78` | +Responsive checks (после Visual checks) |
| `.claude/agents/tester.md:157` | +Test code quality (после API calls)
