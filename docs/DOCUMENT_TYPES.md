# Document Types

## Output Rule

Before generating or updating any document: read `~/.claude/docs/DOC_PRINCIPLES.md` and comply.

## Validator-Doc Loop

Use after generating or editing any document. Initialize `cycle = 0`, max 10 cycles.

1. Spawn `validator-doc` with prompt:

       document_type: <DOC_TYPE>
       document_draft: |
         <full document text>

2. Validator only reports — apply fixes:
   - **Violations** → fix each one
   - **Comprehension** → compare with intent: unexpected takeaway → remove noise; missing takeaway → rework section; "no actionable rules" → informational (OK for ARCHITECTURE overview) or fluff (remove)
3. `NO_VIOLATIONS` + comprehension matches intent → done
4. Fixes made → increment `cycle`, re-run from step 1
5. After 10 cycles with remaining violations → proceed with note about unresolved issues

## Document Categories

### ARCHITECTURE.md

1. **System Overview** — How system components connect and interact
2. **Project Structure** — Directory tree with one-line descriptions per folder
3. **Tech Stack** — Table: component | stack
4. **Core Rules** — 3-5 fundamental architectural constraints (e.g., "Admin never accesses DB directly")
5. **Data Flow** — Request lifecycle or state flow (only if non-trivial)
6. **External Dependencies** — Services, APIs, databases (only if not obvious from tech stack)

### CODE_RULES.md

1. **General rules** — Project-wide coding conventions (naming suffixes, file organization, SRP, etc.)
2. **Linter-enforced rules** — Brief list of non-obvious linter rules that affect how code is written
3. **Error Handling** — Error propagation pattern, where to catch, error types
4. **State Management** — Where state lives, patterns used (only if applicable)
5. **Testing** — test-code style and file organization only; what-to-test policy lives in TESTING.md (link, don't restate)

### CONVENTIONS.md

1. **File Naming** — Patterns for different file types (components, hooks, utils, types, etc.)
2. **Naming** — Variables, functions, classes, constants naming patterns
3. **Domain Naming** — Naming patterns per domain/module (pages, hooks, forms, routes, etc.)
4. **Imports** — Organization, grouping rules
5. **Git** — Branch naming, commit messages (only if project has conventions)

### DESIGN_SYSTEM.md

1. **Stack** — Component library, icon library, font, styling approach
2. **Colors** — Table: scale/semantic | purpose. Rule: use tokens, not hex
3. **Layout** — Spacing, breakpoints, border radius (only non-default values)
4. **Rules** — Bullet list of constraints (e.g., "Tailwind only, no inline styles", "compose via className, don't fork components")

### WORKFLOW.md

1. **Setup** — Numbered steps to get running
2. **Commands** — Table: command | scope | description
3. **Testing** — Test commands per level (unit, integration, e2e); special setup required for e2e (simulators, devices, config files, credentials). Only if project has tests.
4. **Pre-commit / CI** — What runs automatically
5. **Environment** — Table: variable | description (only if non-trivial)

### TESTING.md

Only if the project has tests. Holds testing POLICY — commands live in WORKFLOW.md § Testing, test-code style in CODE_RULES.md § Testing (link, don't restate). Takes precedence over `~/.claude/docs/TESTING_STRATEGY.md` defaults.

1. **Levels** — which test levels the project uses (unit/widget/integration/e2e) and what belongs to each
2. **Exclusions** — project-specific categories intentionally not tested (extends the system defaults in `~/.claude/docs/TESTING_STRATEGY.md` § Default Exclusions; list only additions/overrides)
3. **Mock strategy** — what is mocked vs real, where shared fixtures/factories live
4. **Level assignment** — table: code layer | test level (only if non-obvious)

### ARCHITECTURE_\<module\>.md

1. **Folder Structure** — Bullet list: folder → purpose
2. **Layer Rules** — What can import/depend on what, boundaries
3. **Key Patterns** — Module-specific patterns (state management, routing, error handling, etc.)
4. **Testing** — Table: layer | test type | what to mock

Start with a one-line description of the module's purpose if the module name alone does not convey its scope. Only document what's specific to this module.

### UI_PATTERNS.md

1. **Page type selection** — When to use each page pattern (flow, standalone, modal, etc.)
2. **Loading states** — Loading level types and when to use each
3. **Error handling** — How errors surface in UI (snackbar, inline, redirect)
4. **Form patterns** — Validation, submission, and input patterns
5. **Navigation** — Forward/back/swipe navigation patterns and state restoration

### CODE_RULES_\<module\>.md

Start with: `Common rules: [CODE_RULES.md](CODE_RULES.md)`. Only document rules that differ from or extend the parent. If no differences — state that explicitly (1 line).