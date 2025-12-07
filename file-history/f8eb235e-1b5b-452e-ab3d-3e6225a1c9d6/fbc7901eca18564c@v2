# План оптимизации multi-agent системы

## Цели
1. **Избыточность пайплайна** — добавить быстрые пути для разных типов задач
2. **Сокращение промптов** — вынести примеры в отдельные файлы

---

## Часть 1: Быстрые пути в Orchestrator

### Текущее поведение
Все задачи проходят полный цикл в зависимости от типа:
- Simple bugfix: Developer → Tester → Documenter
- New feature: BA → Architect → Developer → Tester → Documenter
- UI change: BA → Developer → Tester → Documenter
- Refactoring: Architect → Developer → Tester → Documenter

### Новое поведение
Добавить более гранулярные пути:

| Уровень | Примеры | Цепочка агентов |
|---------|---------|-----------------|
| **trivial** | typo, copy fix, 1-line change | Developer only |
| **micro** | small bugfix, style tweak | Developer → Tester |
| **simple** | bugfix with tests | Developer → Tester → Documenter |
| **medium** | new component, feature | BA → Architect → Developer → Tester → Documenter |
| **complex** | architecture change, multi-module | BA → Architect → Developer → Tester → Documenter (with reviews) |

### Изменения в orchestrator.md
- Добавить новые уровни сложности (trivial, micro)
- Обновить таблицу роутинга
- Добавить критерии выбора уровня
- Упростить формат вывода

---

## Часть 2: Сокращение промптов агентов

### Анализ текущих размеров

| Агент | Строки | Примеры в промпте |
|-------|--------|-------------------|
| business-analyst.md | ~420 | ~100 строк примеров |
| architect.md | ~340 | ~50 строк примеров |
| developer-agent.md | ~540 | ~200 строк примеров |
| tester-agent.md | ~406 | ~100 строк примеров |
| documenter-agent.md | ~590 | ~250 строк примеров |
| orchestrator.md | ~380 | ~80 строк примеров |

### Стратегия
1. Создать папку `.claude/agents/examples/`
2. Вынести примеры в отдельные файлы
3. Добавить инструкцию: "If unsure about output format, read `.claude/agents/examples/{agent}-output-example.md`"
4. Сократить core instructions до essential rules

**Примеры читаются ПО НЕОБХОДИМОСТИ** — агент обращается к файлу примера только если не уверен в формате вывода.

### Новая структура
```
.claude/agents/
├── orchestrator.md           (сокращенный)
├── business-analyst.md       (сокращенный)
├── architect.md              (сокращенный)
├── developer-agent.md        (сокращенный)
├── tester-agent.md           (сокращенный)
├── documenter-agent.md       (сокращенный)
└── examples/
    ├── ba-output-example.md
    ├── architect-output-example.md
    ├── developer-output-example.md
    ├── tester-output-example.md
    └── documenter-output-example.md
```

---

## Файлы для изменения

### Обновить:
1. `.claude/agents/orchestrator.md` — новые пути + сокращение
2. `.claude/agents/business-analyst.md` — сокращение
3. `.claude/agents/architect.md` — сокращение
4. `.claude/agents/developer-agent.md` — сокращение
5. `.claude/agents/tester-agent.md` — сокращение
6. `.claude/agents/documenter-agent.md` — сокращение

### Создать:
1. `.claude/agents/examples/ba-output-example.md`
2. `.claude/agents/examples/architect-output-example.md`
3. `.claude/agents/examples/developer-output-example.md`
4. `.claude/agents/examples/tester-output-example.md`
5. `.claude/agents/examples/documenter-output-example.md`

---

## Порядок выполнения

1. Создать папку examples и файлы примеров
2. Обновить orchestrator.md (новые пути + сокращение)
3. Обновить остальные агенты (сокращение + ссылки на примеры)
4. Проверить форматирование через Prettier

---

## Ожидаемый результат

- Промпты сокращены на ~40-50%
- Trivial/micro задачи выполняются быстрее (меньше агентов)
- Примеры доступны при необходимости, но не загружаются всегда
