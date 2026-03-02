# Documentation Principles

Project docs (`docs/`) are loaded into agent context as working instructions. Every token in a doc displaces space for the actual task.

## Principles

1. **Only what can't be inferred from code.** Agents read source files. The doc adds what reading 3-5 files won't reveal — project-wide patterns, boundaries, constraints.
2. **Every line must change agent behavior.** If removing a line wouldn't change the code an agent writes — remove it.
3. **Unambiguous.** Agents can't ask follow-up questions. Every rule must be clear enough to apply without clarification.
4. **Patterns, not instances.** `{Feature}Page` is useful. A list of all page names is not.
5. **No redundancy with tooling.** Don't document what linter/formatter already enforces.
6. **One fact, one location.** Each rule/pattern lives in exactly one document. Other docs reference it, never restate it.

## Applying the principles

- No prose, no explanations of "why", no introductory sentences, no edge cases
- No code examples unless the pattern can't be expressed as a rule
- Format follows content — pick what's most compact (table, bullets, diagram)
- Submodule docs start with a link to parent: `Common rules: [CODE_RULES.md](CODE_RULES.md)` and document **only differences**
