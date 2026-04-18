# Testing Strategy

## Default Exclusions

The following categories are excluded from test coverage by default. Test cases **must not** be written for these — their absence is correct, not a gap:

- CSS/visual appearance, layout, pixel-perfection, shadow values — require visual regression tooling; test at the behavioral outcome level instead
- Intermediate UI states: loading spinners, disabled buttons during async operations — test the observable outcome (success/error result), not the transitional state
- Animation and transition timing — fragile and environment-dependent
- Database schema shape (migrations, column definitions)
- Configuration files
- Generated code (`*.generated.*`, `*.d.ts`)
- Third-party library behavior
- Structural properties guaranteed by the data model: absence of a removed field in serialized output, silent-ignore of unknown keys during deserialization (framework-guaranteed, not custom logic)
- Framework-provided validation: whether a schema parser (Zod, Pydantic, ActiveRecord, etc.) correctly rejects invalid input — test that it is configured and called correctly, not that the library works
- Conditional rendering / show-hide: whether a UI element appears or disappears based on a boolean flag — test the downstream effect of the state change, not the conditional itself
- Language/compiler guarantees: type errors caught at compile time, type coercion, runtime type constraints enforced by the language or compiler

## Explicit Exclusions Principle

When `test-cases.md` § **Test Strategy** lists exclusion categories (e.g., under a bold "Explicit exclusions:" label or a bullet list prefixed with "not tested" or "excluded"), test coverage for behaviors in those categories is intentionally absent — not a gap.

Validators **must not** flag missing test cases for behaviors whose primary concern falls under a named exclusion category. The Test Strategy section is authoritative: an exclusion listed there overrides any requirement in `business-requirements.md` or `technical-requirements.md` regarding test coverage for that category.

## Precedence

1. Project `docs/TESTING.md` — highest; project-specific rules and level assignments
2. This document — system defaults; applies when project rules are absent or silent
